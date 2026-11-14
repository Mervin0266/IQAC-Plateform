const {
  ConsultancyProject,
  ConsultancyProjectFaculty,
  ConsultancyDocument,
  Faculty,
  User
} = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logAction, logActionSafe } = require('../middleware/auditLogger');
const { sendNotification } = require('../middleware/notificationHelper');
const { resolveDepartmentScope } = require('../utils/scopeHelper');
const {
  calculateProjectDuration,
  deriveAndValidateConsultancyStartYear,
  normalizeConsultancyProjectStatus,
  parseAgencyDetails,
  VALID_CONSULTANCY_PROJECT_STATUSES
} = require('../utils/projectDurationHelper');
const {
  uploadConsultancyDocumentFile,
  deleteConsultancyDocumentFile,
  validateDriveUrl,
  isDriveConfigured
} = require('../services/googleDriveService');
const {
  CONSULTANCY_TEMPLATE_COLUMNS,
  VALID_PROJECT_TYPES,
  VALID_PROJECT_STATUSES,
  parseAndNormalizeEmpIds,
  deriveConsultancyStartYear,
  normalizeProjectType,
  normalizeProjectStatus,
  generateConsultancyDuplicateKeys,
  resolveFacultyAssociationsForEmpIds,
  buildConsultancyTemplateWorkbook,
  parseConsultancySpreadsheetBuffer,
  evaluateBulkConsultancyRows,
  executeBulkImport
} = require('../services/consultancyProjectService');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per document
const VALID_DOCUMENT_CATEGORIES = ['agreement_work_order', 'invoice', 'payment_receipt'];

function deriveSchoolAndCampus(department) {
  const deptStr = String(department || '').toLowerCase();
  if (deptStr.includes('architecture') || deptStr.includes('soa')) {
    return { school: 'School of Architecture', campus: 'Bangalore Kengeri Campus' };
  }
  return { school: 'School of Engineering and Technology', campus: 'Bangalore Kengeri Campus' };
}

/**
 * Format project with durations, categorized documents, and faculty associations
 */
function formatConsultancyProject(projectInstance) {
  const p = projectInstance.toJSON ? projectInstance.toJSON() : projectInstance;

  // Planned & Actual duration
  const plannedDuration = calculateProjectDuration(p.startDate, p.expectedEndDate);
  const actualDuration = p.actualCompletionDate ? calculateProjectDuration(p.startDate, p.actualCompletionDate) : null;

  // Categorize documents
  const allDocs = Array.isArray(p.documents) ? p.documents.filter(d => d.isActive !== false) : [];
  const agreementWorkOrders = allDocs.filter(d => d.documentCategory === 'agreement_work_order');
  const invoices = allDocs.filter(d => d.documentCategory === 'invoice');
  const paymentReceipts = allDocs.filter(d => d.documentCategory === 'payment_receipt');

  // Faculty associations
  const rawAssocs = Array.isArray(p.facultyAssociations) ? p.facultyAssociations : [];
  const sortedAssocs = [...rawAssocs].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const associatedFaculty = sortedAssocs.map(assoc => {
    const liveFaculty = assoc.faculty || {};
    const effectiveDept = liveFaculty.department || assoc.originalDepartment || null;
    const sc = deriveSchoolAndCampus(effectiveDept);
    return {
      id: assoc.id,
      facultyId: assoc.facultyId || liveFaculty.id || null,
      employeeId: assoc.employeeId,
      normalizedEmployeeId: assoc.normalizedEmployeeId,
      name: assoc.facultyName || liveFaculty.name || assoc.employeeId,
      designation: assoc.designation || liveFaculty.designation || null,
      originalDepartment: assoc.originalDepartment || null,
      originalDepartmentSource: assoc.originalDepartmentSource || 'creation_snapshot',
      currentDepartment: effectiveDept,
      school: sc.school,
      campus: sc.campus,
      isValid: assoc.isValid !== false
    };
  });

  // Financial values
  const revenueInLakhs = p.revenueInLakhs !== null && p.revenueInLakhs !== undefined ? parseFloat(p.revenueInLakhs) : 0;
  const contractValueInLakhs = p.contractValueInLakhs !== null && p.contractValueInLakhs !== undefined ? parseFloat(p.contractValueInLakhs) : null;
  const amountReceivedInLakhs = p.amountReceivedInLakhs !== null && p.amountReceivedInLakhs !== undefined ? parseFloat(p.amountReceivedInLakhs) : null;

  return {
    ...p,
    revenueInLakhs,
    contractValueInLakhs,
    amountReceivedInLakhs,
    plannedDurationFormatted: plannedDuration.formatted,
    plannedDurationDetails: plannedDuration,
    actualDurationFormatted: actualDuration ? actualDuration.formatted : null,
    actualDurationDetails: actualDuration,
    facultyAssociations: sortedAssocs,
    associatedFaculty,
    agreementWorkOrders,
    invoices,
    paymentReceipts,
    agreementWorkOrderCount: agreementWorkOrders.length,
    invoiceCount: invoices.length,
    paymentReceiptCount: paymentReceipts.length,
    totalDocumentCount: allDocs.length
  };
}

/**
 * Ingests multiple drive links for a project and document category
 */
async function ingestLinks(projectId, category, rawLinks, userId) {
  if (!rawLinks) return;
  const linksArray = Array.isArray(rawLinks) ? rawLinks : String(rawLinks).split('\n');
  for (const rawUrl of linksArray) {
    const url = rawUrl.trim();
    if (!url) continue;
    const validation = validateDriveUrl(url);
    if (validation.valid) {
      let defaultName = 'Document';
      if (category === 'agreement_work_order') defaultName = 'Agreement / Work Order';
      else if (category === 'invoice') defaultName = 'Invoice Document';
      else if (category === 'payment_receipt') defaultName = 'Payment Receipt';

      await ConsultancyDocument.create({
        projectId,
        documentCategory: category,
        sourceType: 'drive_link',
        driveFileId: validation.fileId,
        driveUrl: validation.sanitizedUrl,
        fileName: defaultName,
        uploadedBy: userId,
        accessStatus: 'active'
      });
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. GET ALL CONSULTANCY PROJECTS
// ──────────────────────────────────────────────────────────────────────────────
exports.getConsultancyProjects = async (req, res) => {
  try {
    const {
      year,
      department,
      academicYear,
      consultancyStartYear,
      projectStatus,
      projectType,
      search,
      q
    } = req.query;

    const where = {};

    // 1. Consultancy Start Year derivation / filter
    const targetYear = consultancyStartYear || year || academicYear;
    if (targetYear && targetYear !== 'all') {
      const parsedYear = parseInt(targetYear, 10);
      if (!isNaN(parsedYear) && /^\d{4}$/.test(String(targetYear).trim())) {
        where.consultancyStartYear = parsedYear;
      } else {
        where[Op.or] = [
          { year: targetYear },
          { consultancyStartYear: parseInt(targetYear, 10) || -1 }
        ];
      }
    }

    // 2. Project Status filter (Sanctioned, On Going, Completed)
    if (projectStatus && projectStatus !== 'all') {
      const normStatus = normalizeProjectStatus(projectStatus);
      if (normStatus.valid) {
        where.projectStatus = normStatus.projectStatus;
      } else {
        where.projectStatus = projectStatus;
      }
    }

    // 3. Project Type filter (Collaborative, Sole, MOU_Based, Private_Consulting, Others)
    if (projectType && projectType !== 'all') {
      const normType = normalizeProjectType(projectType);
      if (normType.valid) {
        where.projectType = normType.projectType;
      } else {
        where.projectType = projectType;
      }
    }

    // 4. Text Search
    const searchKeyword = String(search || q || '').trim();
    if (searchKeyword) {
      where[Op.or] = [
        { projectName: { [Op.iLike]: `%${searchKeyword}%` } },
        { agencyName: { [Op.iLike]: `%${searchKeyword}%` } },
        { teacherConsultant: { [Op.iLike]: `%${searchKeyword}%` } },
        { empIdsRaw: { [Op.iLike]: `%${searchKeyword}%` } }
      ];
    }

    // 5. Department and Role Isolation
    if (req.user.role === 'faculty') {
      // Faculty members see projects they created OR where they are associated by EmpId
      where[Op.or] = [
        { createdBy: req.user.id }
      ];
      if (req.user.employeeId) {
        where[Op.or].push({
          empIdsRaw: { [Op.iLike]: `%${req.user.employeeId}%` }
        });
      }
    } else if (req.user.role === 'coordinator' || req.user.role === 'hod') {
      const userDept = req.user.department;
      where[Op.or] = [
        { department: userDept }
      ];
    } else {
      if (department && department !== 'all') {
        const cleanDept = department.replace(/-/g, '%');
        where[Op.or] = [
          { department: { [Op.iLike]: `%${cleanDept}%` } }
        ];
      }
    }

    const projects = await ConsultancyProject.findAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'department']
        },
        {
          model: ConsultancyDocument,
          as: 'documents',
          where: { isActive: true },
          required: false
        },
        {
          model: ConsultancyProjectFaculty,
          as: 'facultyAssociations',
          required: false,
          include: [
            {
              model: Faculty,
              as: 'faculty',
              attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const formattedProjects = projects.map(formatConsultancyProject);

    res.json({
      success: true,
      count: formattedProjects.length,
      data: formattedProjects
    });
  } catch (error) {
    console.error('Get consultancy projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 2. GET SINGLE CONSULTANCY PROJECT
// ──────────────────────────────────────────────────────────────────────────────
exports.getConsultancyProject = async (req, res) => {
  try {
    const project = await ConsultancyProject.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'department']
        },
        {
          model: ConsultancyDocument,
          as: 'documents',
          where: { isActive: true },
          required: false
        },
        {
          model: ConsultancyProjectFaculty,
          as: 'facultyAssociations',
          required: false,
          include: [
            {
              model: Faculty,
              as: 'faculty',
              attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email']
            }
          ]
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Consultancy project not found'
      });
    }

    // Role scope checking
    if (req.user.role === 'faculty') {
      const isCreator = project.createdBy === req.user.id;
      const isAssociated = project.facultyAssociations && project.facultyAssociations.some(
        fa => fa.employeeId === req.user.employeeId
      );
      if (!isCreator && !isAssociated) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own records.'
        });
      }
    } else if (req.user.role === 'coordinator' || req.user.role === 'hod') {
      const hasDeptMatch = project.department === req.user.department ||
        (project.facultyAssociations && project.facultyAssociations.some(
          fa => fa.originalDepartment === req.user.department || (fa.faculty && fa.faculty.department === req.user.department)
        ));
      if (!hasDeptMatch) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view records within your department.'
        });
      }
    }

    res.json({
      success: true,
      data: formatConsultancyProject(project)
    });
  } catch (error) {
    console.error('Get consultancy project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 3. CREATE CONSULTANCY PROJECT (Multi-Faculty & Authoritative Year Derivation)
// ──────────────────────────────────────────────────────────────────────────────
exports.createConsultancyProject = async (req, res) => {
  try {
    const dept = req.user.role === 'admin' || req.user.role === 'authority'
      ? (req.body.department || req.user.department || 'General')
      : req.user.department;

    const {
      projectName,
      teacherConsultant,
      empId,
      empIds,
      agencyName,
      agencyContactEmail,
      agencyContactNumber,
      sponsoringAgency: rawSponsoringAgency,
      startDate,
      expectedEndDate,
      actualCompletionDate,
      projectType: rawProjectType,
      otherProjectTypeDescription,
      projectStatus: rawProjectStatus,
      contractValueInLakhs,
      revenueInLakhs,
      amountReceivedInLakhs,
      description,
      agreementLinks,
      invoiceLinks,
      receiptLinks
    } = req.body;

    // 1. Project Title
    if (!projectName || !String(projectName).trim()) {
      return res.status(400).json({ success: false, message: 'Name of Consultancy Project is required.' });
    }

    // 2. Agency Name
    let finalAgencyName = agencyName ? String(agencyName).trim() : '';
    let finalEmail = agencyContactEmail ? String(agencyContactEmail).trim() : null;
    let finalPhone = agencyContactNumber ? String(agencyContactNumber).trim() : null;

    if (!finalAgencyName && rawSponsoringAgency) {
      const parsed = parseAgencyDetails(rawSponsoringAgency);
      finalAgencyName = parsed.agencyName;
      if (!finalEmail) finalEmail = parsed.email;
      if (!finalPhone) finalPhone = parsed.phone;
    }

    if (!finalAgencyName) {
      return res.status(400).json({ success: false, message: 'Agency Name is required.' });
    }

    if (finalEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(finalEmail)) {
        return res.status(400).json({ success: false, message: 'Invalid Agency Contact Email format.' });
      }
    }

    // 3. Start Date & Authoritative Start Year Derivation
    const yearDerivation = deriveConsultancyStartYear(startDate);
    if (!yearDerivation.valid) {
      return res.status(400).json({ success: false, message: yearDerivation.error });
    }
    const finalStartDate = yearDerivation.isoDate;
    const finalStartYear = yearDerivation.startYear;
    const finalLegacyYear = `${finalStartYear - 1}-${finalStartYear}`;

    // 4. Date order checks
    let finalExpectedEndDate = null;
    if (expectedEndDate && String(expectedEndDate).trim()) {
      finalExpectedEndDate = String(expectedEndDate).split('T')[0];
      if (finalExpectedEndDate < finalStartDate) {
        return res.status(400).json({ success: false, message: 'Expected End Date cannot be earlier than Start Date.' });
      }
    }

    let finalActualCompletionDate = null;
    if (actualCompletionDate && String(actualCompletionDate).trim()) {
      finalActualCompletionDate = String(actualCompletionDate).split('T')[0];
      if (finalActualCompletionDate < finalStartDate) {
        return res.status(400).json({ success: false, message: 'Actual Completion Date cannot be earlier than Start Date.' });
      }
    }

    // 5. Project Type validation (strictly 5 allowed options)
    const typeNorm = normalizeProjectType(rawProjectType);
    if (!typeNorm.valid) {
      return res.status(400).json({ success: false, message: typeNorm.error });
    }
    const finalProjectType = typeNorm.projectType;
    let finalOtherDescription = typeNorm.otherProjectTypeDescription || otherProjectTypeDescription || null;
    if (finalProjectType === 'Others' && !finalOtherDescription && req.body.otherProjectTypeDescription) {
      finalOtherDescription = String(req.body.otherProjectTypeDescription).trim();
    }

    // 6. Project Status validation (Strictly Sanctioned, On Going, Completed)
    const statusNorm = normalizeProjectStatus(rawProjectStatus);
    if (!statusNorm.valid) {
      return res.status(400).json({ success: false, message: statusNorm.error });
    }
    const finalProjectStatus = statusNorm.projectStatus;

    // 7. Multi-Faculty EmpId Resolution
    const rawEmpInput = empIds || empId || (Array.isArray(req.body.facultyOwners) ? req.body.facultyOwners.map(f => f.employeeId || f) : null);
    let resolvedFaculties = { associations: [], validCount: 0, invalidEmpIds: [], hasInvalidEmpIds: false, empIdsRaw: '' };

    if (rawEmpInput) {
      resolvedFaculties = await resolveFacultyAssociationsForEmpIds(rawEmpInput, { Faculty });
    }

    // Fallback if legacy teacherConsultant supplied without EmpId
    let finalTeacherConsultant = teacherConsultant ? String(teacherConsultant).trim() : null;
    if (resolvedFaculties.validCount > 0) {
      const validNames = resolvedFaculties.associations.filter(a => a.isValid && a.facultyName).map(a => a.facultyName);
      if (validNames.length > 0) {
        finalTeacherConsultant = validNames.join(', ');
      }
    }
    if (!finalTeacherConsultant) {
      finalTeacherConsultant = resolvedFaculties.empIdsRaw || 'Unassigned';
    }

    // 8. Financials validation (INR Lakhs)
    const parsedRevenue = revenueInLakhs !== undefined && revenueInLakhs !== '' && revenueInLakhs !== null
      ? parseFloat(revenueInLakhs)
      : 0;
    if (isNaN(parsedRevenue) || parsedRevenue < 0) {
      return res.status(400).json({ success: false, message: 'Revenue Generated must be a non-negative number in INR Lakhs.' });
    }

    let parsedContractValue = null;
    if (contractValueInLakhs !== undefined && contractValueInLakhs !== '' && contractValueInLakhs !== null) {
      parsedContractValue = parseFloat(contractValueInLakhs);
      if (isNaN(parsedContractValue) || parsedContractValue < 0) {
        return res.status(400).json({ success: false, message: 'Contract Value must be a non-negative number in INR Lakhs.' });
      }
    }

    let parsedAmountReceived = null;
    if (amountReceivedInLakhs !== undefined && amountReceivedInLakhs !== '' && amountReceivedInLakhs !== null) {
      parsedAmountReceived = parseFloat(amountReceivedInLakhs);
      if (isNaN(parsedAmountReceived) || parsedAmountReceived < 0) {
        return res.status(400).json({ success: false, message: 'Amount Received must be a non-negative number in INR Lakhs.' });
      }
    }

    // 9. Legacy composite sponsoring agency
    let legacySponsoringAgency = rawSponsoringAgency || finalAgencyName;
    if (!rawSponsoringAgency) {
      const contactParts = [];
      if (finalEmail) contactParts.push(`Email: ${finalEmail}`);
      if (finalPhone) contactParts.push(`Ph: ${finalPhone}`);
      if (contactParts.length > 0) {
        legacySponsoringAgency = `${finalAgencyName} (${contactParts.join(', ')})`;
      }
    }

    const assignedDept = resolvedFaculties.primaryDepartment || dept;

    const safeData = {
      projectName: String(projectName).trim(),
      teacherConsultant: finalTeacherConsultant,
      empIdsRaw: resolvedFaculties.empIdsRaw || (empId ? String(empId).trim() : null),
      hasInvalidEmpIds: resolvedFaculties.hasInvalidEmpIds,
      invalidEmpIds: resolvedFaculties.invalidEmpIds,
      duplicateEmpIds: resolvedFaculties.duplicateEmpIds || [],
      agencyName: finalAgencyName,
      agencyContactEmail: finalEmail,
      agencyContactNumber: finalPhone,
      sponsoringAgency: legacySponsoringAgency,
      startDate: finalStartDate,
      consultancyStartYear: finalStartYear,
      year: finalLegacyYear,
      expectedEndDate: finalExpectedEndDate,
      actualCompletionDate: finalActualCompletionDate,
      projectType: finalProjectType,
      otherProjectTypeDescription: finalOtherDescription,
      projectStatus: finalProjectStatus,
      contractValueInLakhs: parsedContractValue,
      revenueInLakhs: parsedRevenue,
      amountReceivedInLakhs: parsedAmountReceived,
      description: description ? String(description).trim() : null,
      department: assignedDept,
      status: null,
      createdBy: req.user.id
    };

    let project;
    await sequelize.transaction(async (t) => {
      project = await ConsultancyProject.create(safeData, { transaction: t });

      // Create ConsultancyProjectFaculty junction rows
      for (const assoc of resolvedFaculties.associations) {
        await ConsultancyProjectFaculty.create({
          projectId: project.id,
          facultyId: assoc.facultyId,
          employeeId: assoc.employeeId,
          normalizedEmployeeId: assoc.normalizedEmployeeId,
          facultyName: assoc.facultyName,
          designation: assoc.designation,
          originalDepartment: assoc.originalDepartment,
          originalDepartmentSource: assoc.originalDepartmentSource,
          isValid: assoc.isValid,
          displayOrder: assoc.displayOrder
        }, { transaction: t });
      }
    });

    // Ingest Google Drive links if provided
    await ingestLinks(project.id, 'agreement_work_order', agreementLinks, req.user.id);
    await ingestLinks(project.id, 'invoice', invoiceLinks, req.user.id);
    await ingestLinks(project.id, 'payment_receipt', receiptLinks, req.user.id);

    // Log creation
    await logAction({
      recordId: project.id,
      achievementTitle: project.projectName,
      user: req.user,
      action: 'CONSULTANCY_PROJECT_CREATED',
      previousValue: null,
      updatedValue: project.toJSON()
    });

    // Reload with documents and faculty associations
    const createdWithDocs = await ConsultancyProject.findByPk(project.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email', 'department'] },
        { model: ConsultancyDocument, as: 'documents', where: { isActive: true }, required: false },
        {
          model: ConsultancyProjectFaculty,
          as: 'facultyAssociations',
          required: false,
          include: [
            { model: Faculty, as: 'faculty', attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email'] }
          ]
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: formatConsultancyProject(createdWithDocs)
    });
  } catch (error) {
    console.error('Create consultancy project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 4. UPDATE CONSULTANCY PROJECT (Multi-Faculty & Authoritative Year Derivation)
// ──────────────────────────────────────────────────────────────────────────────
exports.updateConsultancyProject = async (req, res) => {
  try {
    const project = await ConsultancyProject.findByPk(req.params.id, {
      include: [
        { model: ConsultancyProjectFaculty, as: 'facultyAssociations' }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Consultancy project not found'
      });
    }

    // Role check
    if (req.user.role === 'faculty') {
      const isCreator = project.createdBy === req.user.id;
      const isAssociated = project.facultyAssociations && project.facultyAssociations.some(
        fa => fa.employeeId === req.user.employeeId
      );
      if (!isCreator && !isAssociated) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your own records.'
        });
      }
    } else if (req.user.role === 'coordinator' || req.user.role === 'hod') {
      const hasDeptMatch = project.department === req.user.department ||
        (project.facultyAssociations && project.facultyAssociations.some(
          fa => fa.originalDepartment === req.user.department
        ));
      if (!hasDeptMatch) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update records in your department.'
        });
      }
    } else if (req.user.role === 'authority') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Institutional Authorities cannot update records.'
      });
    }

    const updates = {};
    const {
      projectName,
      teacherConsultant,
      empId,
      empIds,
      agencyName,
      agencyContactEmail,
      agencyContactNumber,
      sponsoringAgency,
      startDate,
      expectedEndDate,
      actualCompletionDate,
      projectType,
      otherProjectTypeDescription,
      projectStatus,
      contractValueInLakhs,
      revenueInLakhs,
      amountReceivedInLakhs,
      description,
      department
    } = req.body;

    if (projectName !== undefined) updates.projectName = String(projectName).trim();

    // Agency updates
    if (agencyName !== undefined) updates.agencyName = String(agencyName).trim();
    if (agencyContactEmail !== undefined) {
      if (agencyContactEmail && String(agencyContactEmail).trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(agencyContactEmail).trim())) {
          return res.status(400).json({ success: false, message: 'Invalid Agency Contact Email format.' });
        }
        updates.agencyContactEmail = String(agencyContactEmail).trim();
      } else {
        updates.agencyContactEmail = null;
      }
    }
    if (agencyContactNumber !== undefined) {
      updates.agencyContactNumber = agencyContactNumber ? String(agencyContactNumber).trim() : null;
    }

    // Start Date & Start Year Derivation
    if (startDate !== undefined) {
      const yearDerivation = deriveConsultancyStartYear(startDate);
      if (!yearDerivation.valid) {
        return res.status(400).json({ success: false, message: yearDerivation.error });
      }
      updates.startDate = yearDerivation.isoDate;
      updates.consultancyStartYear = yearDerivation.startYear;
      updates.year = `${yearDerivation.startYear - 1}-${yearDerivation.startYear}`;
    }

    // Expected End Date & Actual Completion Date
    const currentStart = updates.startDate || project.startDate;
    if (expectedEndDate !== undefined) {
      if (expectedEndDate && String(expectedEndDate).trim()) {
        const iso = String(expectedEndDate).split('T')[0];
        if (currentStart && iso < currentStart) {
          return res.status(400).json({ success: false, message: 'Expected End Date cannot be earlier than Start Date.' });
        }
        updates.expectedEndDate = iso;
      } else {
        updates.expectedEndDate = null;
      }
    }

    if (actualCompletionDate !== undefined) {
      if (actualCompletionDate && String(actualCompletionDate).trim()) {
        const iso = String(actualCompletionDate).split('T')[0];
        if (currentStart && iso < currentStart) {
          return res.status(400).json({ success: false, message: 'Actual Completion Date cannot be earlier than Start Date.' });
        }
        updates.actualCompletionDate = iso;
      } else {
        updates.actualCompletionDate = null;
      }
    }

    // Project Type update
    if (projectType !== undefined) {
      const typeNorm = normalizeProjectType(projectType);
      if (!typeNorm.valid) {
        return res.status(400).json({ success: false, message: typeNorm.error });
      }
      updates.projectType = typeNorm.projectType;
      updates.otherProjectTypeDescription = typeNorm.otherProjectTypeDescription || otherProjectTypeDescription || null;
    } else if (otherProjectTypeDescription !== undefined) {
      updates.otherProjectTypeDescription = otherProjectTypeDescription ? String(otherProjectTypeDescription).trim() : null;
    }

    // Project Status update
    if (projectStatus !== undefined) {
      const statusNorm = normalizeProjectStatus(projectStatus);
      if (!statusNorm.valid) {
        return res.status(400).json({ success: false, message: statusNorm.error });
      }
      updates.projectStatus = statusNorm.projectStatus;
    }

    // Financial updates
    if (revenueInLakhs !== undefined) {
      const num = revenueInLakhs !== '' && revenueInLakhs !== null ? parseFloat(revenueInLakhs) : 0;
      if (isNaN(num) || num < 0) {
        return res.status(400).json({ success: false, message: 'Revenue Generated must be a non-negative number in INR Lakhs.' });
      }
      updates.revenueInLakhs = num;
    }

    if (contractValueInLakhs !== undefined) {
      if (contractValueInLakhs !== '' && contractValueInLakhs !== null) {
        const num = parseFloat(contractValueInLakhs);
        if (isNaN(num) || num < 0) {
          return res.status(400).json({ success: false, message: 'Contract Value must be a non-negative number in INR Lakhs.' });
        }
        updates.contractValueInLakhs = num;
      } else {
        updates.contractValueInLakhs = null;
      }
    }

    if (amountReceivedInLakhs !== undefined) {
      if (amountReceivedInLakhs !== '' && amountReceivedInLakhs !== null) {
        const num = parseFloat(amountReceivedInLakhs);
        if (isNaN(num) || num < 0) {
          return res.status(400).json({ success: false, message: 'Amount Received must be a non-negative number in INR Lakhs.' });
        }
        updates.amountReceivedInLakhs = num;
      } else {
        updates.amountReceivedInLakhs = null;
      }
    }

    if (description !== undefined) {
      updates.description = description ? String(description).trim() : null;
    }

    if (req.user.role === 'admin' && department !== undefined) {
      updates.department = department;
    }

    // Handle faculty EmpId updates
    const rawEmpInput = empIds !== undefined ? empIds : (empId !== undefined ? empId : null);
    let resolvedFaculties = null;

    if (rawEmpInput !== null) {
      resolvedFaculties = await resolveFacultyAssociationsForEmpIds(rawEmpInput, { Faculty });
      updates.empIdsRaw = resolvedFaculties.empIdsRaw;
      updates.hasInvalidEmpIds = resolvedFaculties.hasInvalidEmpIds;
      updates.invalidEmpIds = resolvedFaculties.invalidEmpIds;
      updates.duplicateEmpIds = resolvedFaculties.duplicateEmpIds || [];

      const validNames = resolvedFaculties.associations.filter(a => a.isValid && a.facultyName).map(a => a.facultyName);
      if (validNames.length > 0) {
        updates.teacherConsultant = validNames.join(', ');
      }
    } else if (teacherConsultant !== undefined) {
      updates.teacherConsultant = String(teacherConsultant).trim();
    }

    delete updates.id;
    delete updates.createdBy;

    const oldValues = project.toJSON();

    await sequelize.transaction(async (t) => {
      await project.update(updates, { transaction: t });

      if (resolvedFaculties) {
        // Replace existing junction rows with newly resolved associations
        await ConsultancyProjectFaculty.destroy({
          where: { projectId: project.id },
          transaction: t
        });

        for (const assoc of resolvedFaculties.associations) {
          await ConsultancyProjectFaculty.create({
            projectId: project.id,
            facultyId: assoc.facultyId,
            employeeId: assoc.employeeId,
            normalizedEmployeeId: assoc.normalizedEmployeeId,
            facultyName: assoc.facultyName,
            designation: assoc.designation,
            originalDepartment: assoc.originalDepartment,
            originalDepartmentSource: assoc.originalDepartmentSource,
            isValid: assoc.isValid,
            displayOrder: assoc.displayOrder
          }, { transaction: t });
        }
      }
    });

    const newValues = project.toJSON();

    // Log update
    await logAction({
      recordId: project.id,
      achievementTitle: project.projectName,
      user: req.user,
      action: 'CONSULTANCY_PROJECT_UPDATED',
      previousValue: oldValues,
      updatedValue: newValues
    });

    // Ingest drive links if provided in update payload
    if (req.body.agreementLinks) {
      await ingestLinks(project.id, 'agreement_work_order', req.body.agreementLinks, req.user.id);
    }
    if (req.body.invoiceLinks) {
      await ingestLinks(project.id, 'invoice', req.body.invoiceLinks, req.user.id);
    }
    if (req.body.receiptLinks) {
      await ingestLinks(project.id, 'payment_receipt', req.body.receiptLinks, req.user.id);
    }

    // Reload with documents and faculty associations
    const updatedWithDocs = await ConsultancyProject.findByPk(project.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email', 'department'] },
        { model: ConsultancyDocument, as: 'documents', where: { isActive: true }, required: false },
        {
          model: ConsultancyProjectFaculty,
          as: 'facultyAssociations',
          required: false,
          include: [
            { model: Faculty, as: 'faculty', attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email'] }
          ]
        }
      ]
    });

    res.json({
      success: true,
      data: formatConsultancyProject(updatedWithDocs)
    });
  } catch (error) {
    console.error('Update consultancy project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 5. DELETE CONSULTANCY PROJECT
// ──────────────────────────────────────────────────────────────────────────────
exports.deleteConsultancyProject = async (req, res) => {
  try {
    const project = await ConsultancyProject.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Consultancy project not found'
      });
    }

    // Role constraints for Deletion
    if (req.user.role === 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Faculty members cannot delete records.'
      });
    } else if (req.user.role === 'coordinator' || req.user.role === 'hod') {
      if (project.department !== req.user.department) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete records inside your own department.'
        });
      }
    } else if (req.user.role === 'authority') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Institutional Authorities cannot delete records.'
      });
    }

    const oldValues = project.toJSON();
    await project.destroy();

    // Log deletion
    await logAction({
      recordId: project.id,
      achievementTitle: project.projectName,
      user: req.user,
      action: 'CONSULTANCY_PROJECT_DELETED',
      previousValue: oldValues,
      updatedValue: null
    });

    res.json({
      success: true,
      message: 'Consultancy project deleted successfully'
    });
  } catch (error) {
    console.error('Delete consultancy project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 6. CLEAR ALL CONSULTANCY PROJECTS
// ──────────────────────────────────────────────────────────────────────────────
exports.clearAllConsultancyProjects = async (req, res) => {
  try {
    const { where, scopeDescription } = await resolveDepartmentScope(req, 'ConsultancyProject', true);

    let count = 0;
    await sequelize.transaction(async (t) => {
      count = await ConsultancyProject.destroy({ where, transaction: t });
    });

    await logActionSafe({
      user: req.user,
      action: 'CLEAR_ALL_CONSULTANCY_PROJECTS',
      title: `Cleared consultancy projects: ${scopeDescription}`,
      remarks: `Deleted ${count} consultancy project records. Scope: ${scopeDescription}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Successfully cleared ${count} consultancy project record(s) for ${scopeDescription}.`
    });
  } catch (error) {
    console.error('Clear consultancy projects error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to clear consultancy project records'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 7. GET CONSULTANCY MODULE STATS & PROJECT TYPE ANALYTICS
// ──────────────────────────────────────────────────────────────────────────────
exports.getConsultancyStats = async (req, res) => {
  try {
    const { year, consultancyStartYear, projectStatus, projectType, department } = req.query;

    const where = {};
    const targetYear = consultancyStartYear || year;
    if (targetYear && targetYear !== 'all') {
      const parsedYear = parseInt(targetYear, 10);
      if (!isNaN(parsedYear) && /^\d{4}$/.test(String(targetYear).trim())) {
        where.consultancyStartYear = parsedYear;
      } else {
        where[Op.or] = [
          { year: targetYear },
          { consultancyStartYear: parseInt(targetYear, 10) || -1 }
        ];
      }
    }

    if (projectStatus && projectStatus !== 'all') {
      const normStatus = normalizeProjectStatus(projectStatus);
      where.projectStatus = normStatus.valid ? normStatus.projectStatus : projectStatus;
    }

    if (projectType && projectType !== 'all') {
      const normType = normalizeProjectType(projectType);
      where.projectType = normType.valid ? normType.projectType : projectType;
    }

    if (req.user.role === 'faculty') {
      where.createdBy = req.user.id;
    } else if (req.user.role === 'coordinator' || req.user.role === 'hod') {
      where.department = req.user.department;
    } else if (department && department !== 'all') {
      where.department = { [Op.iLike]: `%${department.replace(/-/g, '%')}%` };
    }

    const total = await ConsultancyProject.count({ where });
    const totalRevenue = parseFloat(await ConsultancyProject.sum('revenueInLakhs', { where }) || 0);
    const totalContractValue = parseFloat(await ConsultancyProject.sum('contractValueInLakhs', { where }) || 0);
    const totalAmountReceived = parseFloat(await ConsultancyProject.sum('amountReceivedInLakhs', { where }) || 0);

    // Breakdown by Department
    const byDepartment = await ConsultancyProject.findAll({
      where,
      attributes: [
        'department',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('revenueInLakhs')), 'revenue'],
        [sequelize.fn('SUM', sequelize.col('contractValueInLakhs')), 'contractValue'],
        [sequelize.fn('SUM', sequelize.col('amountReceivedInLakhs')), 'amountReceived']
      ],
      group: ['department']
    });

    // Breakdown by Project Type
    const byProjectType = await ConsultancyProject.findAll({
      where,
      attributes: [
        'projectType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('revenueInLakhs')), 'revenue'],
        [sequelize.fn('SUM', sequelize.col('contractValueInLakhs')), 'contractValue'],
        [sequelize.fn('SUM', sequelize.col('amountReceivedInLakhs')), 'amountReceived']
      ],
      group: ['projectType']
    });

    // Breakdown by Project Status
    const byProjectStatus = await ConsultancyProject.findAll({
      where,
      attributes: [
        'projectStatus',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('revenueInLakhs')), 'revenue']
      ],
      group: ['projectStatus']
    });

    res.json({
      success: true,
      data: {
        total,
        totalRevenue,
        totalContractValue,
        totalAmountReceived,
        byDepartment,
        byProjectType,
        byProjectStatus
      }
    });
  } catch (error) {
    console.error('Get consultancy stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 8. DOCUMENT OPERATIONS (Google Drive & Direct Upload)
// ──────────────────────────────────────────────────────────────────────────────
exports.uploadConsultancyDocument = async (req, res) => {
  try {
    const project = await ConsultancyProject.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Consultancy project not found' });
    }

    if (req.user.role === 'faculty' && project.createdBy !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only upload documents for your own projects' });
    }
    if (['coordinator', 'hod'].includes(req.user.role) && project.department !== req.user.department) {
      return res.status(403).json({ success: false, message: 'Access denied: Project is outside your department scope' });
    }

    const category = req.body.category || 'agreement_work_order';
    if (!VALID_DOCUMENT_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid document category. Must be agreement_work_order, invoice, or payment_receipt.' });
    }

    const files = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);
    if (files.length === 0) {
      return res.status(400).json({ success: false, message: 'No document files uploaded' });
    }

    if (!isDriveConfigured()) {
      return res.status(503).json({ success: false, message: 'Google Drive institutional storage is not configured.' });
    }

    const createdDocs = [];
    for (const f of files) {
      if (!ALLOWED_MIME_TYPES.includes(f.mimetype)) {
        return res.status(400).json({ success: false, message: `Unsupported file format for ${f.originalname}. Please upload PDF, PNG, JPG, or JPEG.` });
      }

      if (f.size > MAX_FILE_SIZE) {
        return res.status(400).json({ success: false, message: `File ${f.originalname} exceeds maximum allowed size (10 MB).` });
      }

      const driveResult = await uploadConsultancyDocumentFile({
        projectId: project.id,
        department: project.department,
        startYear: project.consultancyStartYear || project.year,
        category,
        fileBuffer: f.buffer,
        fileName: f.originalname,
        mimeType: f.mimetype
      });

      const doc = await ConsultancyDocument.create({
        projectId: project.id,
        documentCategory: category,
        sourceType: 'drive_upload',
        driveFileId: driveResult.driveFileId,
        driveFolderId: driveResult.driveFolderId,
        driveUrl: driveResult.driveUrl,
        fileName: f.originalname,
        mimeType: f.mimetype,
        fileSize: f.size,
        uploadedBy: req.user.id,
        accessStatus: 'active'
      });
      createdDocs.push(doc);
    }

    res.status(201).json({
      success: true,
      data: createdDocs.length === 1 ? createdDocs[0] : createdDocs
    });
  } catch (error) {
    console.error('Upload consultancy document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload document: ' + error.message
    });
  }
};

exports.addConsultancyDocumentLink = async (req, res) => {
  try {
    const project = await ConsultancyProject.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Consultancy project not found' });
    }

    if (req.user.role === 'faculty' && project.createdBy !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only attach documents to your own projects' });
    }
    if (['coordinator', 'hod'].includes(req.user.role) && project.department !== req.user.department) {
      return res.status(403).json({ success: false, message: 'Access denied: Project is outside your department scope' });
    }

    const { category, driveUrl, fileName } = req.body;
    if (!category || !VALID_DOCUMENT_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid document category. Must be agreement_work_order, invoice, or payment_receipt.' });
    }

    const validation = validateDriveUrl(driveUrl);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    let defaultTitle = fileName && String(fileName).trim() ? String(fileName).trim() : null;
    if (!defaultTitle) {
      if (category === 'agreement_work_order') defaultTitle = 'Agreement / Work Order';
      else if (category === 'invoice') defaultTitle = 'Invoice Document';
      else if (category === 'payment_receipt') defaultTitle = 'Payment Receipt';
    }

    const doc = await ConsultancyDocument.create({
      projectId: project.id,
      documentCategory: category,
      sourceType: 'drive_link',
      driveFileId: validation.fileId,
      driveUrl: validation.sanitizedUrl,
      fileName: defaultTitle,
      uploadedBy: req.user.id,
      accessStatus: 'active'
    });

    res.status(201).json({
      success: true,
      data: doc
    });
  } catch (error) {
    console.error('Add consultancy document link error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add document link: ' + error.message
    });
  }
};

exports.deleteConsultancyDocument = async (req, res) => {
  try {
    const project = await ConsultancyProject.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Consultancy project not found' });
    }

    if (req.user.role === 'faculty' && project.createdBy !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only delete documents from your own projects' });
    }
    if (['coordinator', 'hod'].includes(req.user.role) && project.department !== req.user.department) {
      return res.status(403).json({ success: false, message: 'Access denied: Project is outside your department scope' });
    }

    const doc = await ConsultancyDocument.findOne({
      where: {
        id: req.params.docId,
        projectId: project.id
      }
    });

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (doc.sourceType === 'drive_upload' && doc.driveFileId) {
      await deleteConsultancyDocumentFile(doc.driveFileId);
    }

    await doc.destroy();

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete consultancy document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document: ' + error.message
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 9. DOWNLOAD 17-COLUMN CONSULTANCY TEMPLATE (XLSX / CSV)
// ──────────────────────────────────────────────────────────────────────────────
exports.downloadConsultancyTemplate = async (req, res) => {
  try {
    const format = String(req.query.format || 'xlsx').toLowerCase();
    const { xlsxBuffer, csvBuffer } = buildConsultancyTemplateWorkbook();

    if (format === 'csv') {
      res.setHeader('Content-Disposition', 'attachment; filename="Consultancy_Projects_Template.csv"');
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csvBuffer);
    }

    res.setHeader('Content-Disposition', 'attachment; filename="Consultancy_Projects_Template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(xlsxBuffer);
  } catch (error) {
    console.error('Download consultancy template error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate consultancy template.' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 10. PREVIEW BULK UPLOAD CONSULTANCY (5-Step Row-by-Row Validation)
// ──────────────────────────────────────────────────────────────────────────────
exports.previewBulkUploadConsultancy = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'No file provided. Please upload an Excel (.xlsx, .xls) or CSV file.'
      });
    }

    const { headers, rows } = parseConsultancySpreadsheetBuffer(req.file.buffer);
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'The uploaded spreadsheet is empty or contains no readable data rows.'
      });
    }

    const result = await evaluateBulkConsultancyRows(rows, {
      headers,
      user: req.user,
      ConsultancyProject,
      ConsultancyProjectFaculty,
      Faculty
    });

    if (!result.validColumns) {
      return res.status(400).json({
        success: false,
        message: result.error || `Missing required columns: ${(result.missingColumns || []).join(', ')}`,
        missingColumns: result.missingColumns,
        foundHeaders: result.foundHeaders
      });
    }

    res.json({
      success: true,
      summary: result.summary,
      rows: result.rows,
      data: result
    });
  } catch (error) {
    console.error('Preview bulk upload consultancy error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to parse and preview consultancy spreadsheet'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 11. IMPORT BULK UPLOAD CONSULTANCY (Atomic Transaction & Multi-Faculty Linkage)
// ──────────────────────────────────────────────────────────────────────────────
exports.importBulkUploadConsultancy = async (req, res) => {
  try {
    let rowsToImport = null;

    if (req.file && req.file.buffer) {
      const { headers, rows } = parseConsultancySpreadsheetBuffer(req.file.buffer);
      const evalResult = await evaluateBulkConsultancyRows(rows, {
        headers,
        user: req.user,
        ConsultancyProject,
        ConsultancyProjectFaculty,
        Faculty
      });

      if (!evalResult.validColumns) {
        return res.status(400).json({
          success: false,
          message: evalResult.error
        });
      }
      rowsToImport = evalResult.rows;
    } else if (Array.isArray(req.body.rows)) {
      rowsToImport = req.body.rows;
    } else {
      return res.status(400).json({
        success: false,
        message: 'No file or evaluated rows provided for import.'
      });
    }

    const importResult = await executeBulkImport(rowsToImport, {
      userId: req.user.id,
      userRole: req.user.role,
      userDepartment: req.user.department,
      sequelize,
      ConsultancyProject,
      ConsultancyProjectFaculty,
      ConsultancyDocument
    });

    if (importResult.summary && importResult.summary.importedCount > 0) {
      try {
        await logAction({
          user: req.user,
          action: 'CONSULTANCY_PROJECT_BULK_IMPORTED',
          title: `Bulk imported ${importResult.summary.importedCount} consultancy projects`,
          remarks: `Imported ${importResult.summary.importedCount} records. Duplicates skipped: ${importResult.summary.skippedDuplicatesCount}. Errors: ${importResult.summary.rejectedCount}`,
          ipAddress: req.ip
        });
      } catch (logErr) {}
    }

    res.status(importResult.success ? 200 : 400).json(importResult);
  } catch (error) {
    console.error('Import bulk upload consultancy error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete bulk import'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 12. SEARCH FACULTY DIRECTORY (Autocomplete by EmpId / Name / Dept)
// ──────────────────────────────────────────────────────────────────────────────
exports.searchFacultyDirectory = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10) || 50, 1), 200);

    const where = {};
    if (q) {
      where[Op.or] = [
        { employeeId: { [Op.iLike]: `%${q}%` } },
        { name: { [Op.iLike]: `%${q}%` } },
        { department: { [Op.iLike]: `%${q}%` } },
        { designation: { [Op.iLike]: `%${q}%` } }
      ];
    }

    const records = await Faculty.findAll({
      where,
      attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email'],
      limit,
      order: [['employeeId', 'ASC']]
    });

    const enrichedRecords = records.map(f => {
      const plain = f.toJSON ? f.toJSON() : f;
      const sc = deriveSchoolAndCampus(plain.department);
      return {
        ...plain,
        school: sc.school,
        campus: sc.campus
      };
    });

    res.json({
      success: true,
      data: enrichedRecords,
      count: enrichedRecords.length
    });
  } catch (error) {
    console.error('Search faculty directory error:', error);
    res.status(500).json({ success: false, message: 'Failed to search Faculty Management directory.' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 13. LEGACY BULK CREATE (Backward-compatibility for API clients)
// ──────────────────────────────────────────────────────────────────────────────
exports.bulkCreateConsultancyProjects = async (req, res) => {
  try {
    const { consultancyProjects } = req.body;
    if (!Array.isArray(consultancyProjects) || consultancyProjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consultancy projects data. Must be a non-empty array.'
      });
    }

    // Evaluate using evaluateBulkConsultancyRows
    const evalResult = await evaluateBulkConsultancyRows(consultancyProjects, {
      user: req.user,
      ConsultancyProject,
      ConsultancyProjectFaculty,
      Faculty
    });

    const importResult = await executeBulkImport(evalResult.rows, {
      userId: req.user.id,
      userRole: req.user.role,
      userDepartment: req.user.department,
      sequelize,
      ConsultancyProject,
      ConsultancyProjectFaculty,
      ConsultancyDocument
    });

    const formattedErrors = (importResult.rowResults || [])
      .filter(r => (r.errors && r.errors.length > 0) || r.status === 'DUPLICATE_SKIP')
      .map(r => ({
        title: `Row ${r.rowNumber}${r.title ? ` (${r.title})` : ''}`,
        issues: r.errors && r.errors.length > 0 ? r.errors : ['Duplicate record skipped']
      }));

    res.status(importResult.success ? 201 : 400).json({
      success: importResult.success,
      message: importResult.message,
      count: importResult.summary.importedCount,
      summary: importResult.summary,
      data: importResult.createdIds,
      rowResults: importResult.rowResults,
      errors: formattedErrors
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

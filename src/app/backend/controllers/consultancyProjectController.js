const { ConsultancyProject, ConsultancyDocument, User } = require('../models');
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

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per document
const VALID_DOCUMENT_CATEGORIES = ['agreement_work_order', 'invoice', 'payment_receipt'];

/**
 * Format project with durations and categorized documents
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

// @desc    Get all consultancy projects
// @route   GET /api/consultancy-projects
// @access  Private
exports.getConsultancyProjects = async (req, res) => {
  try {
    const { year, department, academicYear, consultancyStartYear, projectStatus } = req.query;

    const where = {};
    const targetYear = year || academicYear;
    if (targetYear && targetYear !== 'all') {
      where[Op.or] = [
        { year: targetYear },
        { consultancyStartYear: parseInt(targetYear, 10) || -1 }
      ];
    }
    if (consultancyStartYear && consultancyStartYear !== 'all') {
      where.consultancyStartYear = parseInt(consultancyStartYear, 10);
    }

    // Filter by Project Status (Sanctioned, On Going, Completed)
    if (projectStatus && projectStatus !== 'all') {
      where.projectStatus = projectStatus;
    }

    // Enforce data isolation based on role
    if (req.user.role === 'faculty') {
      where.createdBy = req.user.id;
    } else if (req.user.role === 'coordinator' || req.user.role === 'hod') {
      where.department = req.user.department;
    } else {
      // Admin and Institutional Authority can filter by any department
      if (department && department !== 'all') {
        where.department = {
          [Op.iLike]: `%${department.replace(/-/g, '%')}%`
        };
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
      message: 'Server error'
    });
  }
};

// @desc    Get single consultancy project
// @route   GET /api/consultancy-projects/:id
// @access  Private
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
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Consultancy project not found'
      });
    }

    // Check departmental permission
    if (req.user.role === 'faculty' && project.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own records.'
      });
    }
    if ((req.user.role === 'coordinator' || req.user.role === 'hod') && project.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view records within your department.'
      });
    }

    res.json({
      success: true,
      data: formatConsultancyProject(project)
    });
  } catch (error) {
    console.error('Get consultancy project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create consultancy project
// @route   POST /api/consultancy-projects
// @access  Private (Admin, Coordinator, Faculty)
exports.createConsultancyProject = async (req, res) => {
  try {
    const dept = req.user.role === 'admin' || req.user.role === 'authority'
      ? (req.body.department || req.user.department || 'General')
      : req.user.department;

    const {
      projectName,
      teacherConsultant,
      agencyName,
      agencyContactEmail,
      agencyContactNumber,
      sponsoringAgency: rawSponsoringAgency,
      startDate,
      expectedEndDate,
      actualCompletionDate,
      consultancyStartYear: rawStartYear,
      year: rawYear,
      projectStatus: rawProjectStatus,
      contractValueInLakhs,
      revenueInLakhs,
      amountReceivedInLakhs,
      description,
      agreementLinks,
      invoiceLinks,
      receiptLinks
    } = req.body;

    // Required fields check
    if (!projectName || !String(projectName).trim()) {
      return res.status(400).json({ success: false, message: 'Project Title / Assignment Name is required.' });
    }
    if (!teacherConsultant || !String(teacherConsultant).trim()) {
      return res.status(400).json({ success: false, message: 'Teacher Consultant is required.' });
    }

    // Agency details extraction and validation
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

    // Start Year derivation and validation
    const yearValidation = deriveAndValidateConsultancyStartYear(startDate, rawStartYear);
    if (!yearValidation.valid) {
      return res.status(400).json({ success: false, message: yearValidation.error });
    }
    const finalStartYear = yearValidation.startYear;
    const finalYear = rawYear || yearValidation.legacyYear;

    // Date validation
    if (startDate && expectedEndDate) {
      const s = new Date(String(startDate).split('T')[0]);
      const e = new Date(String(expectedEndDate).split('T')[0]);
      if (e < s) {
        return res.status(400).json({ success: false, message: 'Expected End Date cannot be earlier than Start Date.' });
      }
    }
    if (startDate && actualCompletionDate) {
      const s = new Date(String(startDate).split('T')[0]);
      const a = new Date(String(actualCompletionDate).split('T')[0]);
      if (a < s) {
        return res.status(400).json({ success: false, message: 'Actual Completion Date cannot be earlier than Start Date.' });
      }
    }

    // Project Status validation (Strictly Sanctioned, On Going, Completed)
    const finalProjectStatus = normalizeConsultancyProjectStatus(rawProjectStatus);
    if (!finalProjectStatus) {
      return res.status(400).json({
        success: false,
        message: 'Project Status is required. Allowed values: Sanctioned, On Going, Completed.'
      });
    }

    // Financial values validation
    const parsedRevenue = revenueInLakhs !== undefined && revenueInLakhs !== '' && revenueInLakhs !== null
      ? parseFloat(revenueInLakhs)
      : 0;
    if (isNaN(parsedRevenue) || parsedRevenue < 0) {
      return res.status(400).json({ success: false, message: 'Revenue Generated must be a non-negative number.' });
    }

    let parsedContractValue = null;
    if (contractValueInLakhs !== undefined && contractValueInLakhs !== '' && contractValueInLakhs !== null) {
      parsedContractValue = parseFloat(contractValueInLakhs);
      if (isNaN(parsedContractValue) || parsedContractValue < 0) {
        return res.status(400).json({ success: false, message: 'Contract Value must be a non-negative number.' });
      }
    }

    let parsedAmountReceived = null;
    if (amountReceivedInLakhs !== undefined && amountReceivedInLakhs !== '' && amountReceivedInLakhs !== null) {
      parsedAmountReceived = parseFloat(amountReceivedInLakhs);
      if (isNaN(parsedAmountReceived) || parsedAmountReceived < 0) {
        return res.status(400).json({ success: false, message: 'Amount Received must be a non-negative number.' });
      }
    }

    // Build combined sponsoringAgency for backward compatibility
    let legacySponsoringAgency = rawSponsoringAgency || finalAgencyName;
    if (!rawSponsoringAgency) {
      const contactParts = [];
      if (finalEmail) contactParts.push(`Email: ${finalEmail}`);
      if (finalPhone) contactParts.push(`Ph: ${finalPhone}`);
      if (contactParts.length > 0) {
        legacySponsoringAgency = `${finalAgencyName} (${contactParts.join(', ')})`;
      }
    }

    const safeData = {
      projectName: String(projectName).trim(),
      teacherConsultant: String(teacherConsultant).trim(),
      agencyName: finalAgencyName,
      agencyContactEmail: finalEmail,
      agencyContactNumber: finalPhone,
      sponsoringAgency: legacySponsoringAgency,
      consultancyStartYear: finalStartYear,
      year: finalYear,
      startDate: startDate ? String(startDate).split('T')[0] : null,
      expectedEndDate: expectedEndDate ? String(expectedEndDate).split('T')[0] : null,
      actualCompletionDate: actualCompletionDate ? String(actualCompletionDate).split('T')[0] : null,
      projectStatus: finalProjectStatus,
      contractValueInLakhs: parsedContractValue,
      revenueInLakhs: parsedRevenue,
      amountReceivedInLakhs: parsedAmountReceived,
      description: description ? String(description).trim() : null,
      department: dept,
      status: null,
      createdBy: req.user.id
    };

    const project = await ConsultancyProject.create(safeData);

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

    // Reload with documents
    const createdWithDocs = await ConsultancyProject.findByPk(project.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email', 'department'] },
        { model: ConsultancyDocument, as: 'documents', where: { isActive: true }, required: false }
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

// @desc    Update consultancy project
// @route   PUT /api/consultancy-projects/:id
// @access  Private
exports.updateConsultancyProject = async (req, res) => {
  try {
    const project = await ConsultancyProject.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Consultancy project not found'
      });
    }

    // Enforce Role Constraints (Approval locks removed; based purely on role & department)
    if (req.user.role === 'faculty') {
      if (project.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your own records.'
        });
      }
    } else if (req.user.role === 'coordinator' || req.user.role === 'hod') {
      if (project.department !== req.user.department) {
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
      agencyName,
      agencyContactEmail,
      agencyContactNumber,
      sponsoringAgency,
      startDate,
      expectedEndDate,
      actualCompletionDate,
      consultancyStartYear,
      year,
      projectStatus,
      contractValueInLakhs,
      revenueInLakhs,
      amountReceivedInLakhs,
      description,
      department
    } = req.body;

    if (projectName !== undefined) updates.projectName = String(projectName).trim();
    if (teacherConsultant !== undefined) updates.teacherConsultant = String(teacherConsultant).trim();

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

    if (sponsoringAgency !== undefined) {
      updates.sponsoringAgency = String(sponsoringAgency).trim();
      if (!updates.agencyName && !project.agencyName) {
        const parsed = parseAgencyDetails(updates.sponsoringAgency);
        updates.agencyName = parsed.agencyName;
        if (!updates.agencyContactEmail && parsed.email) updates.agencyContactEmail = parsed.email;
        if (!updates.agencyContactNumber && parsed.phone) updates.agencyContactNumber = parsed.phone;
      }
    } else if (updates.agencyName) {
      const email = updates.agencyContactEmail !== undefined ? updates.agencyContactEmail : project.agencyContactEmail;
      const phone = updates.agencyContactNumber !== undefined ? updates.agencyContactNumber : project.agencyContactNumber;
      const contactParts = [];
      if (email) contactParts.push(`Email: ${email}`);
      if (phone) contactParts.push(`Ph: ${phone}`);
      updates.sponsoringAgency = contactParts.length > 0 ? `${updates.agencyName} (${contactParts.join(', ')})` : updates.agencyName;
    }

    // Dates
    const effectiveStart = startDate !== undefined ? (startDate ? String(startDate).split('T')[0] : null) : project.startDate;
    const effectiveExpectedEnd = expectedEndDate !== undefined ? (expectedEndDate ? String(expectedEndDate).split('T')[0] : null) : project.expectedEndDate;
    const effectiveActualCompletion = actualCompletionDate !== undefined ? (actualCompletionDate ? String(actualCompletionDate).split('T')[0] : null) : project.actualCompletionDate;

    if (startDate !== undefined) updates.startDate = effectiveStart;
    if (expectedEndDate !== undefined) updates.expectedEndDate = effectiveExpectedEnd;
    if (actualCompletionDate !== undefined) updates.actualCompletionDate = effectiveActualCompletion;

    if (effectiveStart && effectiveExpectedEnd) {
      const s = new Date(effectiveStart);
      const e = new Date(effectiveExpectedEnd);
      if (e < s) {
        return res.status(400).json({ success: false, message: 'Expected End Date cannot be earlier than Start Date.' });
      }
    }
    if (effectiveStart && effectiveActualCompletion) {
      const s = new Date(effectiveStart);
      const a = new Date(effectiveActualCompletion);
      if (a < s) {
        return res.status(400).json({ success: false, message: 'Actual Completion Date cannot be earlier than Start Date.' });
      }
    }

    // Start Year
    if (startDate !== undefined || consultancyStartYear !== undefined) {
      const yearValidation = deriveAndValidateConsultancyStartYear(effectiveStart, consultancyStartYear);
      if (!yearValidation.valid) {
        return res.status(400).json({ success: false, message: yearValidation.error });
      }
      updates.consultancyStartYear = yearValidation.startYear;
      if (year !== undefined) {
        updates.year = year;
      } else if (yearValidation.startYear) {
        updates.year = yearValidation.legacyYear;
      }
    } else if (year !== undefined) {
      updates.year = year;
    }

    // Project Status
    if (projectStatus !== undefined) {
      const normalized = normalizeConsultancyProjectStatus(projectStatus);
      if (projectStatus && !normalized) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Project Status. Allowed values: Sanctioned, On Going, Completed.'
        });
      }
      updates.projectStatus = normalized;
    }

    // Financials
    if (revenueInLakhs !== undefined && revenueInLakhs !== '') {
      const r = parseFloat(revenueInLakhs);
      if (isNaN(r) || r < 0) {
        return res.status(400).json({ success: false, message: 'Revenue Generated must be a non-negative number.' });
      }
      updates.revenueInLakhs = r;
    }

    if (contractValueInLakhs !== undefined) {
      if (contractValueInLakhs === '' || contractValueInLakhs === null) {
        updates.contractValueInLakhs = null;
      } else {
        const cv = parseFloat(contractValueInLakhs);
        if (isNaN(cv) || cv < 0) {
          return res.status(400).json({ success: false, message: 'Contract Value must be a non-negative number.' });
        }
        updates.contractValueInLakhs = cv;
      }
    }

    if (amountReceivedInLakhs !== undefined) {
      if (amountReceivedInLakhs === '' || amountReceivedInLakhs === null) {
        updates.amountReceivedInLakhs = null;
      } else {
        const ar = parseFloat(amountReceivedInLakhs);
        if (isNaN(ar) || ar < 0) {
          return res.status(400).json({ success: false, message: 'Amount Received must be a non-negative number.' });
        }
        updates.amountReceivedInLakhs = ar;
      }
    }

    if (description !== undefined) {
      updates.description = description ? String(description).trim() : null;
    }

    // Department change (admin only)
    if (req.user.role === 'admin' && department !== undefined) {
      updates.department = department;
    }

    delete updates.id;
    delete updates.createdBy;

    const oldValues = project.toJSON();
    await project.update(updates);
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

    // Reload with documents
    const updatedWithDocs = await ConsultancyProject.findByPk(project.id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email', 'department'] },
        { model: ConsultancyDocument, as: 'documents', where: { isActive: true }, required: false }
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

// @desc    Delete consultancy project
// @route   DELETE /api/consultancy-projects/:id
// @access  Private
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

// @desc    Clear all consultancy projects
// @route   DELETE /api/consultancy-projects/clear-all
// @access  Private (Admin / Coordinator / HOD)
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

// @desc    Get consultancy project statistics
// @route   GET /api/consultancy-projects/stats
// @access  Private
exports.getConsultancyStats = async (req, res) => {
  try {
    const { year, consultancyStartYear, projectStatus } = req.query;

    const where = {};
    if (year && year !== 'all') {
      where[Op.or] = [
        { year },
        { consultancyStartYear: parseInt(year, 10) || -1 }
      ];
    }
    if (consultancyStartYear && consultancyStartYear !== 'all') {
      where.consultancyStartYear = parseInt(consultancyStartYear, 10);
    }
    if (projectStatus && projectStatus !== 'all') {
      where.projectStatus = projectStatus;
    }

    if (req.user.role === 'faculty') {
      where.createdBy = req.user.id;
    } else if (req.user.role === 'coordinator' || req.user.role === 'hod') {
      where.department = req.user.department;
    }

    const total = await ConsultancyProject.count({ where });
    const totalRevenue = await ConsultancyProject.sum('revenueInLakhs', { where }) || 0;
    const totalContractValue = await ConsultancyProject.sum('contractValueInLakhs', { where }) || 0;
    const totalAmountReceived = await ConsultancyProject.sum('amountReceivedInLakhs', { where }) || 0;

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

    res.json({
      success: true,
      data: {
        total,
        totalRevenue,
        totalContractValue,
        totalAmountReceived,
        byDepartment
      }
    });
  } catch (error) {
    console.error('Get consultancy stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Upload document file directly to Google Drive
// @route   POST /api/consultancy-projects/:id/documents/upload
// @access  Private
exports.uploadConsultancyDocument = async (req, res) => {
  try {
    const project = await ConsultancyProject.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Consultancy project not found' });
    }

    // Role check
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

// @desc    Add external Google Drive link for a consultancy project
// @route   POST /api/consultancy-projects/:id/documents/link
// @access  Private
exports.addConsultancyDocumentLink = async (req, res) => {
  try {
    const project = await ConsultancyProject.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Consultancy project not found' });
    }

    // Role check
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

// @desc    Delete document from consultancy project
// @route   DELETE /api/consultancy-projects/:id/documents/:docId
// @access  Private
exports.deleteConsultancyDocument = async (req, res) => {
  try {
    const project = await ConsultancyProject.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Consultancy project not found' });
    }

    // Role check
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

    // If direct drive upload, attempt removing from Drive
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

// @desc    Bulk create consultancy projects
// @route   POST /api/consultancy-projects/bulk
// @access  Private (Admin, Coordinator, HOD, Faculty)
exports.bulkCreateConsultancyProjects = async (req, res) => {
  try {
    const { consultancyProjects } = req.body;
    if (!Array.isArray(consultancyProjects) || consultancyProjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consultancy projects data. Must be a non-empty array.'
      });
    }

    const dept = req.user.role === 'admin' || req.user.role === 'authority' ? null : req.user.department;

    const validRecords = [];
    const errors = [];

    for (let i = 0; i < consultancyProjects.length; i++) {
      const record = consultancyProjects[i];
      const rowNum = i + 1;

      // Extract Consultant and Project Name
      const teacherConsultant = record.teacherConsultant || record['Name of the Teacher Consultant'] || record['Teacher Consultant'];
      const projectName = record.projectName || record['Name of Consultancy Project'] || record['Project Name'];

      if (!teacherConsultant || !String(teacherConsultant).trim()) {
        errors.push(`Row ${rowNum}: Missing Teacher Consultant`);
        continue;
      }
      if (!projectName || !String(projectName).trim()) {
        errors.push(`Row ${rowNum}: Missing Project Name / Title`);
        continue;
      }

      // Agency Name, Email, Phone
      let agencyName = record.agencyName || record['Agency Name'];
      let agencyEmail = record.agencyContactEmail || record['Agency Contact Email'];
      let agencyPhone = record.agencyContactNumber || record['Agency Contact Number'];
      const rawSponsoring = record.sponsoringAgency || record['Consulting/Sponsoring Agency with Contact Details'] || record['Consulting / Sponsoring Agency with Contact Details'];

      if (!agencyName && rawSponsoring) {
        const parsed = parseAgencyDetails(rawSponsoring);
        agencyName = parsed.agencyName;
        if (!agencyEmail) agencyEmail = parsed.email;
        if (!agencyPhone) agencyPhone = parsed.phone;
      }

      if (!agencyName || !String(agencyName).trim()) {
        errors.push(`Row ${rowNum}: Missing Agency Name`);
        continue;
      }

      // Start Date & Start Year
      const startDate = record.startDate || record['Start Date'];
      const rawStartYear = record.consultancyStartYear || record['Consultancy Start Year'] || record.year || record['Year'] || record['Academic Year'];

      const yearValidation = deriveAndValidateConsultancyStartYear(startDate, rawStartYear);
      if (!yearValidation.valid) {
        errors.push(`Row ${rowNum}: ${yearValidation.error}`);
        continue;
      }

      // Project Status (Strictly Sanctioned, On Going, Completed)
      const rawStatus = record.projectStatus || record['Project Status'];
      const projectStatus = normalizeConsultancyProjectStatus(rawStatus);
      if (!projectStatus) {
        errors.push(`Row ${rowNum}: Missing or invalid Project Status "${rawStatus || ''}". Allowed values: Sanctioned, On Going, Completed.`);
        continue;
      }

      // Financials
      const contractValueInLakhs = record.contractValueInLakhs !== undefined && record.contractValueInLakhs !== ''
        ? parseFloat(record.contractValueInLakhs)
        : (record['Contract Value (INR in Lakhs)'] !== undefined && record['Contract Value (INR in Lakhs)'] !== ''
            ? parseFloat(String(record['Contract Value (INR in Lakhs)']).replace(/[^0-9.]/g, ''))
            : null);

      const revenueInLakhs = record.revenueInLakhs !== undefined && record.revenueInLakhs !== ''
        ? parseFloat(record.revenueInLakhs)
        : (record['Revenue Generated (INR in Lakhs)'] !== undefined && record['Revenue Generated (INR in Lakhs)'] !== ''
            ? parseFloat(String(record['Revenue Generated (INR in Lakhs)']).replace(/[^0-9.]/g, ''))
            : 0);

      const amountReceivedInLakhs = record.amountReceivedInLakhs !== undefined && record.amountReceivedInLakhs !== ''
        ? parseFloat(record.amountReceivedInLakhs)
        : (record['Amount Received (INR in Lakhs)'] !== undefined && record['Amount Received (INR in Lakhs)'] !== ''
            ? parseFloat(String(record['Amount Received (INR in Lakhs)']).replace(/[^0-9.]/g, ''))
            : null);

      // Dates
      const expectedEndDate = record.expectedEndDate || record['Expected End Date'] || null;
      const actualCompletionDate = record.actualCompletionDate || record['Actual Completion Date'] || null;

      // Sponsoring Agency composite
      let legacySponsoring = rawSponsoring || agencyName;
      if (!rawSponsoring) {
        const contactParts = [];
        if (agencyEmail) contactParts.push(`Email: ${agencyEmail}`);
        if (agencyPhone) contactParts.push(`Ph: ${agencyPhone}`);
        if (contactParts.length > 0) legacySponsoring = `${agencyName} (${contactParts.join(', ')})`;
      }

      const finalDept = dept || record.department || record['Department'] || 'Not Specified';

      validRecords.push({
        teacherConsultant: String(teacherConsultant).trim(),
        projectName: String(projectName).trim(),
        agencyName: String(agencyName).trim(),
        agencyContactEmail: agencyEmail ? String(agencyEmail).trim() : null,
        agencyContactNumber: agencyPhone ? String(agencyPhone).trim() : null,
        sponsoringAgency: legacySponsoring,
        consultancyStartYear: yearValidation.startYear,
        year: yearValidation.legacyYear,
        startDate: startDate ? String(startDate).split('T')[0] : null,
        expectedEndDate: expectedEndDate ? String(expectedEndDate).split('T')[0] : null,
        actualCompletionDate: actualCompletionDate ? String(actualCompletionDate).split('T')[0] : null,
        projectStatus: projectStatus || 'On Going',
        contractValueInLakhs: !isNaN(contractValueInLakhs) ? contractValueInLakhs : null,
        revenueInLakhs: !isNaN(revenueInLakhs) ? revenueInLakhs : 0,
        amountReceivedInLakhs: !isNaN(amountReceivedInLakhs) ? amountReceivedInLakhs : null,
        description: record.description || record['Scope of Work / Deliverables Summary'] || null,
        department: finalDept,
        status: null,
        createdBy: req.user.id,
        _agreementLinks: record.agreementLinks || record['Agreement / Work Order'],
        _invoiceLinks: record.invoiceLinks || record['Invoice'],
        _receiptLinks: record.receiptLinks || record['Payment Receipt']
      });
    }

    if (errors.length > 0 && validRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bulk import failed. Please correct the errors and re-upload.',
        errors
      });
    }

    let createdRecords = [];
    for (const recordData of validRecords) {
      const { _agreementLinks, _invoiceLinks, _receiptLinks, ...dataToCreate } = recordData;
      const created = await ConsultancyProject.create(dataToCreate);

      // Ingest document links for this row
      await ingestLinks(created.id, 'agreement_work_order', _agreementLinks, req.user.id);
      await ingestLinks(created.id, 'invoice', _invoiceLinks, req.user.id);
      await ingestLinks(created.id, 'payment_receipt', _receiptLinks, req.user.id);

      createdRecords.push(created);
    }

    if (createdRecords.length > 0) {
      try {
        await logAction({
          user: req.user,
          action: 'CONSULTANCY_PROJECT_BULK_IMPORTED',
          title: `Bulk imported ${createdRecords.length} consultancy projects`,
          remarks: `Imported ${createdRecords.length} records. Errors: ${errors.length}`,
          ipAddress: req.ip
        });
      } catch (logErr) {}
    }

    res.status(201).json({
      success: true,
      message: `Bulk import completed. Successfully imported ${createdRecords.length} records.`,
      count: createdRecords.length,
      errors: errors.length > 0 ? errors : null,
      data: createdRecords
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};

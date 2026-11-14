'use strict';

/**
 * Internal Research Controller
 *
 * Implements CRUD, statistics, multi-faculty equal ownership, Seed Money schemes,
 * filtering without duplicate multiplying on department joins, 7-column bulk upload
 * preview & import, and template streaming for Research & Innovation -> Internal Research.
 */

const {
  InternalResearchProject,
  InternalResearchFaculty,
  Faculty,
  User
} = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logActionSafe } = require('../middleware/auditLogger');
const { parsePagination, formatPaginationResponse } = require('../utils/paginationHelper');
const { calculateProjectDuration } = require('../utils/projectDurationHelper');
const XLSX = require('xlsx');

const {
  INTERNAL_RESEARCH_TEMPLATE_COLUMNS,
  CONFIGURED_SEED_MONEY_SCHEMES,
  normalizeEmpIdKey,
  parseAndNormalizeEmpIds,
  sanitizeDateNoShift,
  deriveCalendarYear,
  normalizeSeedMoneyScheme,
  deriveSchoolAndCampus,
  buildInternalTemplateWorkbook,
  buildInternalTemplateCsv,
  evaluateBulkInternalRows,
  executeBulkImportInternal
} = require('../services/internalResearchService');

/**
 * Formats Internal Research Project instance with duration and equal faculty associations.
 */
function formatInternalResearchProject(projectInstance) {
  const p = projectInstance.toJSON ? projectInstance.toJSON() : projectInstance;
  const duration = calculateProjectDuration(p.startDate, p.endDate);

  const rawAssocs = Array.isArray(p.facultyAssociations) ? p.facultyAssociations : [];
  const facultyAssociations = rawAssocs.map(assoc => {
    const f = assoc.faculty || {};
    const effDept = assoc.originalDepartment || f.department || null;
    const sc = deriveSchoolAndCampus(effDept);
    return {
      id: assoc.id,
      facultyId: assoc.facultyId,
      employeeId: assoc.employeeId,
      facultyName: assoc.facultyName || f.name || 'Unknown Faculty',
      designation: assoc.designation || f.designation || null,
      department: effDept,
      originalDepartment: assoc.originalDepartment,
      originalDepartmentSource: assoc.originalDepartmentSource,
      school: sc.school,
      campus: sc.campus,
      isValid: assoc.isValid !== false,
      displayOrder: assoc.displayOrder ?? 0
    };
  });

  const sanctionedAmount = parseFloat(p.sanctionedAmount) || 0;
  const primaryDept = p.department || (facultyAssociations[0] ? facultyAssociations[0].department : null);
  const scPrimary = deriveSchoolAndCampus(primaryDept);

  return {
    ...p,
    sanctionedAmount,
    duration: p.duration || duration.formatted,
    durationDetails: duration,
    department: primaryDept,
    school: scPrimary.school,
    campus: scPrimary.campus,
    facultyAssociations
  };
}

/**
 * Access check helper for Internal Research
 */
function checkInternalProjectAccess(project, user, action = 'view') {
  if (!user) return { allowed: false, message: 'Authentication required' };
  if (['admin', 'coordinator', 'iqac_admin'].includes(user.role)) {
    return { allowed: true };
  }
  if (user.role === 'hod') {
    if (user.department && project.department && user.department.toLowerCase() === project.department.toLowerCase()) {
      return { allowed: true };
    }
    // Check if any associated faculty is in user's department
    const assocs = project.facultyAssociations || [];
    const inDept = assocs.some(a => (a.originalDepartment || '').toLowerCase() === (user.department || '').toLowerCase());
    if (inDept) return { allowed: true };
  }
  if (action === 'view') {
    return { allowed: true };
  }
  // Creator or associated faculty can edit
  if (project.createdBy === user.id) return { allowed: true };
  const assocs = project.facultyAssociations || [];
  const isAssoc = assocs.some(a => a.employeeId && user.employeeId && normalizeEmpIdKey(a.employeeId) === normalizeEmpIdKey(user.employeeId));
  if (isAssoc) return { allowed: true };

  return { allowed: false, message: 'You do not have permission to modify this internal research record.' };
}

// @desc    Get configured seed money schemes
// @route   GET /api/internal-research/seed-money-schemes
// @access  Public
exports.getSeedMoneySchemes = async (req, res) => {
  res.json({
    success: true,
    data: CONFIGURED_SEED_MONEY_SCHEMES
  });
};

// @desc    Download official 7-column Internal Research template
// @route   GET /api/internal-research/template
// @access  Public
exports.downloadInternalTemplate = async (req, res) => {
  try {
    const { format } = req.query;
    if (format === 'csv') {
      const csvData = buildInternalTemplateCsv();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="Internal_Research_Template.csv"');
      return res.send(csvData);
    }

    const wb = buildInternalTemplateWorkbook();
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Internal_Research_Template.xlsx"');
    return res.send(buffer);
  } catch (error) {
    console.error('Download internal research template error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Search Faculty Directory by EmpID or Name
// @route   GET /api/internal-research/faculty-search
// @access  Private
exports.searchFacultyDirectory = async (req, res) => {
  try {
    const { q, query } = req.query;
    const keyword = String(q || query || '').trim();
    if (!keyword) {
      return res.json({ success: true, count: 0, data: [] });
    }
    const isEmpId = /^\d+$/.test(keyword);
    const where = isEmpId
      ? { employeeId: { [Op.iLike]: `%${keyword}%` } }
      : {
          [Op.or]: [
            { name: { [Op.iLike]: `%${keyword}%` } },
            { employeeId: { [Op.iLike]: `%${keyword}%` } }
          ]
        };
    const faculties = await Faculty.findAll({
      where,
      attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email'],
      limit: 25,
      order: [['name', 'ASC']]
    });
    const data = faculties.map(f => {
      const plain = f.toJSON ? f.toJSON() : f;
      const sc = deriveSchoolAndCampus(plain.department);
      return {
        ...plain,
        school: sc.school,
        campus: sc.campus
      };
    });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all Internal Research projects with filtering, search, and faculty joins
// @route   GET /api/internal-research
// @access  Private
exports.getInternalProjects = async (req, res) => {
  try {
    const {
      calendarYear,
      year,
      department,
      school,
      campus,
      seedMoney,
      facultyId,
      empId,
      search,
      q
    } = req.query;

    const where = {};
    const selectedYear = calendarYear || year;

    if (selectedYear && selectedYear !== 'all') {
      const parsedYear = parseInt(selectedYear, 10);
      if (!isNaN(parsedYear)) {
        where.calendarYear = parsedYear;
      }
    }

    if (seedMoney && seedMoney !== 'all') {
      where.seedMoney = { [Op.iLike]: `%${seedMoney.trim()}%` };
    }

    // Search filter across Title, Seed Money, Faculty name, and EmpId
    const searchKeyword = String(search || q || '').trim();
    if (searchKeyword) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${searchKeyword}%` } },
        { seedMoney: { [Op.iLike]: `%${searchKeyword}%` } },
        { empIdsRaw: { [Op.iLike]: `%${searchKeyword}%` } }
      ];
    }

    // Role-based or explicit Department filtering
    let departmentFilter = null;
    if (req.user && ['coordinator', 'hod'].includes(req.user.role)) {
      if (req.user.department && req.user.department !== 'All') {
        departmentFilter = req.user.department;
      }
    } else if (department && department !== 'all') {
      departmentFilter = department;
    }

    if (departmentFilter) {
      const cleanDept = departmentFilter.replace(/-/g, '%');
      where[Op.or] = where[Op.or] || [];
      where[Op.or].push(
        { department: { [Op.iLike]: `%${cleanDept}%` } },
        { empIdsRaw: { [Op.iLike]: `%${cleanDept}%` } }
      );
    }

    if (empId && empId !== 'all') {
      where.empIdsRaw = { [Op.iLike]: `%${empId.trim()}%` };
    }

    const { page, limit, offset, isExport } = parsePagination(req.query);

    const { count, rows: rawProjects } = await InternalResearchProject.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'department'],
          required: false
        },
        {
          model: InternalResearchFaculty,
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
      order: [
        ['calendarYear', 'DESC NULLS LAST'],
        ['startDate', 'DESC NULLS LAST'],
        ['id', 'ASC']
      ],
      limit: isExport ? undefined : limit,
      offset: isExport ? undefined : offset,
      distinct: true
    });

    const formattedProjects = rawProjects.map(formatInternalResearchProject);

    res.json(formatPaginationResponse({
      count,
      rows: formattedProjects,
      page,
      limit
    }));
  } catch (error) {
    console.error('Get internal research projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve internal research projects',
      error: error.message
    });
  }
};

// @desc    Get aggregate statistics for Internal Research KPI cards
// @route   GET /api/internal-research/stats
// @access  Private
exports.getInternalProjectStats = async (req, res) => {
  try {
    const { department, calendarYear, year } = req.query;
    const where = {};
    const selectedYear = calendarYear || year;

    if (selectedYear && selectedYear !== 'all') {
      const parsedYear = parseInt(selectedYear, 10);
      if (!isNaN(parsedYear)) {
        where.calendarYear = parsedYear;
      }
    }

    if (department && department !== 'all') {
      where.department = { [Op.iLike]: `%${department.replace(/-/g, '%')}%` };
    }

    if (req.user && ['coordinator', 'hod'].includes(req.user.role)) {
      if (req.user.department && req.user.department !== 'All') {
        where.department = { [Op.iLike]: `%${req.user.department}%` };
      }
    }

    const allProjects = await InternalResearchProject.findAll({
      where,
      attributes: ['id', 'sanctionedAmount', 'seedMoney', 'calendarYear', 'department']
    });

    let totalSanctionedAmount = 0;
    const bySeedMoney = {};
    const byYear = {};
    const activeDepts = new Set();

    allProjects.forEach(p => {
      const amt = parseFloat(p.sanctionedAmount) || 0;
      totalSanctionedAmount += amt;

      const sm = p.seedMoney || 'Other Seed Money';
      bySeedMoney[sm] = (bySeedMoney[sm] || 0) + 1;

      const yr = p.calendarYear || 'Unspecified';
      byYear[yr] = (byYear[yr] || 0) + 1;

      if (p.department) activeDepts.add(p.department);
    });

    res.json({
      success: true,
      stats: {
        totalProjects: allProjects.length,
        totalSanctionedAmount,
        activeDepartmentsCount: activeDepts.size,
        bySeedMoney,
        byYear
      }
    });
  } catch (error) {
    console.error('Get internal research stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to aggregate internal research metrics',
      error: error.message
    });
  }
};

// @desc    Get single internal project details
// @route   GET /api/internal-research/:id
// @access  Private
exports.getInternalProject = async (req, res) => {
  try {
    const project = await InternalResearchProject.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'department'],
          required: false
        },
        {
          model: InternalResearchFaculty,
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
        message: 'Internal research project not found'
      });
    }

    const access = checkInternalProjectAccess(project, req.user, 'view');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    res.json({
      success: true,
      data: formatInternalResearchProject(project)
    });
  } catch (error) {
    console.error('Get internal project by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch internal project details',
      error: error.message
    });
  }
};

// @desc    Create new Internal Research project (single-entry)
// @route   POST /api/internal-research
// @access  Private
exports.createInternalProject = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      empIds,
      seedMoney,
      title,
      startDate,
      endDate,
      sanctionedAmount,
      proofUrl,
      department
    } = req.body;

    if (!title || !title.trim()) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }
    if (!seedMoney || !seedMoney.trim()) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Seed Money scheme/program is required.' });
    }
    if (!startDate) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Start Date is required.' });
    }

    const cleanStartDate = sanitizeDateNoShift(startDate);
    if (!cleanStartDate) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Invalid Start Date format.' });
    }

    const cleanEndDate = endDate ? sanitizeDateNoShift(endDate) : null;
    let durationFormatted = 'Not Available';
    if (cleanStartDate && cleanEndDate) {
      const dur = calculateProjectDuration(cleanStartDate, cleanEndDate);
      if (!dur.isValid) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: dur.error || 'End Date cannot be earlier than Start Date.' });
      }
      durationFormatted = dur.formatted;
    } else if (cleanStartDate) {
      durationFormatted = 'Ongoing (Start date recorded)';
    }

    const derivedYear = deriveCalendarYear(cleanStartDate);
    const parsedAmount = parseFloat(sanctionedAmount) || 0;
    if (parsedAmount < 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Sanctioned Amount cannot be negative.' });
    }

    // Faculty parsing & verification (all equal)
    const parsedIds = parseAndNormalizeEmpIds(empIds);
    if (parsedIds.empIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'At least one faculty EmpId is required.' });
    }

    const faculties = await Faculty.findAll({
      where: {
        employeeId: {
          [Op.in]: parsedIds.empIds
        }
      },
      attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email']
    });

    const facultyMap = new Map();
    faculties.forEach(f => facultyMap.set(normalizeEmpIdKey(f.employeeId), f));

    const facultyAssociationsData = [];
    const validEmpIds = [];
    const invalidEmpIds = [];

    for (let pos = 0; pos < parsedIds.empIds.length; pos++) {
      const empIdStr = parsedIds.empIds[pos];
      const rec = facultyMap.get(normalizeEmpIdKey(empIdStr));
      if (rec) {
        validEmpIds.push(empIdStr);
        facultyAssociationsData.push({
          facultyId: rec.id,
          employeeId: rec.employeeId,
          normalizedEmployeeId: normalizeEmpIdKey(rec.employeeId),
          facultyName: rec.name,
          designation: rec.designation,
          originalDepartment: rec.department,
          originalDepartmentSource: 'faculty_profile_snapshot',
          isValid: true,
          displayOrder: pos
        });
      } else {
        invalidEmpIds.push(empIdStr);
        facultyAssociationsData.push({
          facultyId: null,
          employeeId: empIdStr,
          normalizedEmployeeId: normalizeEmpIdKey(empIdStr),
          facultyName: `Unresolved Faculty (${empIdStr})`,
          designation: null,
          originalDepartment: null,
          originalDepartmentSource: 'unresolved_empid',
          isValid: false,
          displayOrder: pos
        });
      }
    }

    if (validEmpIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'None of the provided EmpIDs could be verified in Faculty Management. At least one verified faculty member is required.'
      });
    }

    const primaryDept = department || facultyAssociationsData[0]?.originalDepartment || 'Unknown Department';

    const project = await InternalResearchProject.create(
      {
        title: title.trim(),
        seedMoney: seedMoney.trim(),
        startDate: cleanStartDate,
        calendarYear: derivedYear,
        endDate: cleanEndDate,
        duration: durationFormatted,
        sanctionedAmount: parsedAmount,
        department: primaryDept,
        proofUrl: proofUrl ? proofUrl.trim() : null,
        empIdsRaw: parsedIds.empIds.join(', '),
        hasInvalidEmpIds: invalidEmpIds.length > 0,
        invalidEmpIds: invalidEmpIds.length > 0 ? invalidEmpIds : null,
        duplicateEmpIds: parsedIds.duplicateEmpIds.length > 0 ? parsedIds.duplicateEmpIds : null,
        createdBy: req.user.id
      },
      { transaction }
    );

    for (const assoc of facultyAssociationsData) {
      await InternalResearchFaculty.create(
        {
          projectId: project.id,
          ...assoc
        },
        { transaction }
      );
    }

    await transaction.commit();

    const reloaded = await InternalResearchProject.findByPk(project.id, {
      include: [
        {
          model: InternalResearchFaculty,
          as: 'facultyAssociations',
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

    res.status(201).json({
      success: true,
      message: 'Internal research project recorded successfully',
      data: formatInternalResearchProject(reloaded)
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create internal project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record internal research project',
      error: error.message
    });
  }
};

// @desc    Update existing Internal Research project
// @route   PUT /api/internal-research/:id
// @access  Private
exports.updateInternalProject = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const project = await InternalResearchProject.findByPk(req.params.id, {
      include: [{ model: InternalResearchFaculty, as: 'facultyAssociations' }]
    });

    if (!project) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Internal research project not found' });
    }

    const access = checkInternalProjectAccess(project, req.user, 'manage');
    if (!access.allowed) {
      await transaction.rollback();
      return res.status(403).json({ success: false, message: access.message });
    }

    const {
      empIds,
      seedMoney,
      title,
      startDate,
      endDate,
      sanctionedAmount,
      proofUrl,
      department
    } = req.body;

    const targetStartDate = startDate !== undefined ? sanitizeDateNoShift(startDate) : project.startDate;
    const targetEndDate = endDate !== undefined ? sanitizeDateNoShift(endDate) : project.endDate;

    let durationFormatted = project.duration;
    if (targetStartDate && targetEndDate) {
      const dur = calculateProjectDuration(targetStartDate, targetEndDate);
      if (!dur.isValid) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: dur.error || 'End Date cannot be earlier than Start Date.' });
      }
      durationFormatted = dur.formatted;
    } else if (targetStartDate) {
      durationFormatted = 'Ongoing (Start date recorded)';
    }

    const derivedYear = targetStartDate ? deriveCalendarYear(targetStartDate) : project.calendarYear;

    let parsedAmount = project.sanctionedAmount;
    if (sanctionedAmount !== undefined) {
      parsedAmount = parseFloat(sanctionedAmount) || 0;
      if (parsedAmount < 0) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: 'Sanctioned Amount cannot be negative.' });
      }
    }

    // Update faculty associations if empIds provided
    if (empIds !== undefined) {
      const parsedIds = parseAndNormalizeEmpIds(empIds);
      if (parsedIds.empIds.length > 0) {
        const faculties = await Faculty.findAll({
          where: { employeeId: { [Op.in]: parsedIds.empIds } },
          attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email']
        });
        const facultyMap = new Map();
        faculties.forEach(f => facultyMap.set(normalizeEmpIdKey(f.employeeId), f));

        // Delete old associations
        await InternalResearchFaculty.destroy({ where: { projectId: project.id }, transaction });

        const invalidEmpIds = [];
        for (let pos = 0; pos < parsedIds.empIds.length; pos++) {
          const empIdStr = parsedIds.empIds[pos];
          const rec = facultyMap.get(normalizeEmpIdKey(empIdStr));
          if (rec) {
            await InternalResearchFaculty.create(
              {
                projectId: project.id,
                facultyId: rec.id,
                employeeId: rec.employeeId,
                normalizedEmployeeId: normalizeEmpIdKey(rec.employeeId),
                facultyName: rec.name,
                designation: rec.designation,
                originalDepartment: rec.department,
                originalDepartmentSource: 'faculty_profile_snapshot',
                isValid: true,
                displayOrder: pos
              },
              { transaction }
            );
          } else {
            invalidEmpIds.push(empIdStr);
            await InternalResearchFaculty.create(
              {
                projectId: project.id,
                facultyId: null,
                employeeId: empIdStr,
                normalizedEmployeeId: normalizeEmpIdKey(empIdStr),
                facultyName: `Unresolved Faculty (${empIdStr})`,
                designation: null,
                originalDepartment: null,
                originalDepartmentSource: 'unresolved_empid',
                isValid: false,
                displayOrder: pos
              },
              { transaction }
            );
          }
        }

        project.empIdsRaw = parsedIds.empIds.join(', ');
        project.hasInvalidEmpIds = invalidEmpIds.length > 0;
        project.invalidEmpIds = invalidEmpIds.length > 0 ? invalidEmpIds : null;
        project.duplicateEmpIds = parsedIds.duplicateEmpIds.length > 0 ? parsedIds.duplicateEmpIds : null;
      }
    }

    await project.update(
      {
        title: title !== undefined ? title.trim() : project.title,
        seedMoney: seedMoney !== undefined ? seedMoney.trim() : project.seedMoney,
        startDate: targetStartDate,
        calendarYear: derivedYear,
        endDate: targetEndDate,
        duration: durationFormatted,
        sanctionedAmount: parsedAmount,
        department: department !== undefined ? department.trim() : project.department,
        proofUrl: proofUrl !== undefined ? (proofUrl ? proofUrl.trim() : null) : project.proofUrl
      },
      { transaction }
    );

    await transaction.commit();

    const reloaded = await InternalResearchProject.findByPk(project.id, {
      include: [
        {
          model: InternalResearchFaculty,
          as: 'facultyAssociations',
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

    res.json({
      success: true,
      message: 'Internal research project updated successfully',
      data: formatInternalResearchProject(reloaded)
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Update internal project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update internal research project',
      error: error.message
    });
  }
};

// @desc    Delete Internal Research project
// @route   DELETE /api/internal-research/:id
// @access  Private
exports.deleteInternalProject = async (req, res) => {
  try {
    const project = await InternalResearchProject.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Internal research project not found' });
    }

    const access = checkInternalProjectAccess(project, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    await InternalResearchFaculty.destroy({ where: { projectId: project.id } });
    await project.destroy();

    res.json({
      success: true,
      message: 'Internal research project deleted successfully'
    });
  } catch (error) {
    console.error('Delete internal project error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete internal research project',
      error: error.message
    });
  }
};

// @desc    Clear all internal research projects
// @route   DELETE /api/internal-research/clear-all
// @access  Private (Admin, HOD, Coordinator)
exports.clearAllInternalProjects = async (req, res) => {
  try {
    if (!['admin', 'coordinator', 'hod'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Only administrators or coordinators can clear internal research records.' });
    }

    await InternalResearchFaculty.destroy({ where: {} });
    await InternalResearchProject.destroy({ where: {} });

    res.json({
      success: true,
      message: 'All internal research projects cleared successfully'
    });
  } catch (error) {
    console.error('Clear all internal projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear internal research projects',
      error: error.message
    });
  }
};

// @desc    Preview bulk upload for Internal Research (7 columns)
// @route   POST /api/internal-research/bulk/preview
// @access  Private
exports.previewBulkUploadInternal = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Spreadsheet file is required (.xlsx, .xls, .csv).' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Spreadsheet contains no data rows.' });
    }

    const evaluation = await evaluateBulkInternalRows({
      rows,
      user: req.user,
      Faculty,
      InternalResearchProject
    });

    res.json({
      success: true,
      ...evaluation
    });
  } catch (error) {
    console.error('Preview bulk upload internal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview internal research spreadsheet: ' + error.message
    });
  }
};

// @desc    Import bulk upload for Internal Research
// @route   POST /api/internal-research/bulk/import
// @access  Private
exports.importBulkUploadInternal = async (req, res) => {
  try {
    let rowsToImport = [];

    if (req.body.rows && Array.isArray(req.body.rows)) {
      rowsToImport = req.body.rows;
    } else if (req.file && req.file.buffer) {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const evaluation = await evaluateBulkInternalRows({
        rows: rawRows,
        user: req.user,
        Faculty,
        InternalResearchProject
      });
      rowsToImport = evaluation.rows;
    } else {
      return res.status(400).json({ success: false, message: 'No rows or spreadsheet file provided for import.' });
    }

    const result = await executeBulkImportInternal({
      evaluatedRows: rowsToImport,
      user: req.user,
      sequelize,
      InternalResearchProject,
      InternalResearchFaculty
    });

    res.json({
      success: true,
      message: `Import completed: ${result.successfulImports} projects imported. Skipped ${result.skippedInvalidEmpIdCount || 0} (invalid EmpID), ${result.skippedMissingEmpIdCount || 0} (missing EmpID), ${result.duplicatesSkipped || 0} (duplicate).`,
      result
    });
  } catch (error) {
    console.error('Import bulk upload internal error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import internal research spreadsheet: ' + error.message
    });
  }
};

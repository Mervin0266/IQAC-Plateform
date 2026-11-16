'use strict';

const { Op } = require('sequelize');
const { Award, Faculty, User, School, Department, SystemConfiguration } = require('../models');
const { sequelize } = require('../config/database');

// Normalize department key for matching
const normalizeDeptKey = (val) => String(val || '').trim().toLowerCase().replace(/\s+/g, ' ');

// Normalize employee ID for matching
const normalizeEmpId = (val) => String(val || '').trim().toUpperCase();

// Helper to parse date string into YYYY-MM-DD
function parseDateToISO(dateStr) {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  if (!trimmed || trimmed.toLowerCase() === 'nil' || trimmed.toLowerCase() === 'n/a') return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle 4-digit standalone year (e.g. 2024 -> 2024-01-01)
  if (/^\d{4}$/.test(trimmed)) {
    return `${trimmed}-01-01`;
  }

  // Handle Excel numeric serial dates (e.g. 45234)
  if (/^\d{5}$/.test(trimmed)) {
    const serial = parseInt(trimmed, 10);
    const d = new Date((serial - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  const parts = trimmed.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let day = parts[0];
    let month = parts[1];
    let year = parts[2];

    if (day.length === 4) {
      const temp = day;
      day = year;
      year = temp;
    }

    if (day.length === 1) day = '0' + day;
    if (month.length === 1) month = '0' + month;
    if (year.length === 2) year = '20' + year;

    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return null;
}

// Derive Calendar Year from Date of Recognition
function deriveCalendarYear(dateStr) {
  const iso = parseDateToISO(dateStr);
  if (!iso) return null;
  const year = parseInt(iso.substring(0, 4), 10);
  return isNaN(year) ? null : year;
}

// Validate URL format
function isValidUrl(val) {
  if (!val) return true; // Optional URLs pass if empty
  const str = String(val).trim();
  if (!str) return true;
  try {
    const url = new URL(str);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (_) {
    return false;
  }
}

// Default Recognised Agency Types
const DEFAULT_AGENCY_TYPES = [
  'International',
  'National',
  'State',
  'University',
  'Professional Body / Society',
  'Government Agency',
  'Industry / Corporate',
  'Other Recognised Agency'
];

// Smart normalization for Recognised Agency Types (handles SNAKE_CASE, uppercase, partial keywords)
function normalizeAgencyType(agencyType, activeAgencyTypes = []) {
  if (!agencyType) return null;
  const raw = String(agencyType).trim();
  if (!raw || raw.toLowerCase() === 'nil' || raw.toLowerCase() === 'n/a') return null;

  // Exact or direct match
  const exact = activeAgencyTypes.find(t => t.toLowerCase().trim() === raw.toLowerCase());
  if (exact) return exact;

  const lower = raw.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (lower.includes('govt') || lower.includes('government') || lower === 'awardsfromgovernment') {
    return 'Government Agency';
  }
  if (lower === 'otherrecognisedagency' || lower === 'otherrecognizedagency' || lower.includes('otherrecogni') || lower === 'other' || lower === 'others') {
    return 'Other Recognised Agency';
  }
  if (lower.includes('international')) {
    return 'International';
  }
  if (lower.includes('national')) {
    return 'National';
  }
  if (lower.includes('state')) {
    return 'State';
  }
  if (lower.includes('university') || lower.includes('college') || lower.includes('institutional')) {
    return 'University';
  }
  if (lower.includes('professional') || lower.includes('society') || lower.includes('association') || lower.includes('body')) {
    return 'Professional Body / Society';
  }
  if (lower.includes('industry') || lower.includes('corporate') || lower.includes('company')) {
    return 'Industry / Corporate';
  }

  // Fallback to substring match against active types
  const sub = activeAgencyTypes.find(t => {
    const cleanT = t.toLowerCase().replace(/[^a-z0-9]/g, '');
    return lower.includes(cleanT) || cleanT.includes(lower);
  });
  if (sub) return sub;

  return raw;
}

// Fetch active agency types from SystemConfiguration
async function getActiveAgencyTypes() {
  try {
    const cfg = await SystemConfiguration.findOne({ where: { configKey: 'achievements_award_agency_types' }, raw: true });
    if (cfg && cfg.value && Array.isArray(cfg.value.options)) {
      return cfg.value.options
        .filter(opt => opt.status !== 'inactive')
        .map(opt => typeof opt === 'string' ? opt : (opt.label || opt.name));
    }
  } catch (_) {}
  return DEFAULT_AGENCY_TYPES;
}

// Resolve user's organizational scope
async function resolveUserDeptScope(user) {
  if (!user) return { isUniversityWide: false, departments: [] };

  const scopes = Array.isArray(user.assignedScopes) ? user.assignedScopes : [];
  const hasUnivScope =
    user.isSystemAdmin ||
    user.role === 'admin' ||
    user.role === 'iqac_admin' ||
    user.role === 'authority' ||
    scopes.some(s => s.scopeType === 'university');

  if (hasUnivScope) {
    return { isUniversityWide: true, departments: [] };
  }

  const deptNames = new Set();
  if (user.department && String(user.department).trim() && user.department !== 'All') {
    deptNames.add(String(user.department).trim());
  }

  const campusIds = scopes.filter(s => s.scopeType === 'campus' && s.campusId).map(s => s.campusId);
  const schoolIds = scopes.filter(s => s.scopeType === 'school' && s.schoolId).map(s => s.schoolId);

  if (campusIds.length > 0 && School) {
    try {
      const sRows = await School.findAll({ where: { campusId: { [Op.in]: campusIds } }, attributes: ['id'], raw: true });
      sRows.forEach(s => schoolIds.push(s.id));
    } catch (_) {}
  }

  if (schoolIds.length > 0 && Department) {
    try {
      const dRows = await Department.findAll({ where: { schoolId: { [Op.in]: schoolIds } }, attributes: ['name'], raw: true });
      dRows.forEach(d => deptNames.add(d.name));
    } catch (_) {}
  }

  scopes.forEach(s => {
    if (s.departmentName && String(s.departmentName).trim()) {
      deptNames.add(String(s.departmentName).trim());
    }
  });

  return {
    isUniversityWide: false,
    departments: Array.from(deptNames)
  };
}

// Check access permission for modifying a specific record
function checkRecordAccess(record, user, action = 'view') {
  if (!user) return { allowed: false, message: 'Authentication required' };

  if (user.isSystemAdmin || user.role === 'admin' || user.role === 'iqac_admin') {
    return { allowed: true };
  }

  if (user.role === 'authority') {
    if (action === 'view') return { allowed: true };
    return { allowed: false, message: 'Institutional Authority has read-only access.' };
  }

  if (action === 'view') {
    return { allowed: true };
  }

  // Manage (edit/delete)
  if (user.role === 'faculty') {
    if (record.createdBy === user.id || normalizeEmpId(record.employeeId) === normalizeEmpId(user.employeeId)) {
      return { allowed: true };
    }
    return { allowed: false, message: 'Faculty can only manage their own award records.' };
  }

  if (['hod', 'coordinator'].includes(user.role)) {
    const userDeptKey = normalizeDeptKey(user.department);
    const recDeptKey = normalizeDeptKey(record.department || record.originalDepartment);
    if (userDeptKey && recDeptKey && userDeptKey === recDeptKey) {
      return { allowed: true };
    }
    if (record.createdBy === user.id) {
      return { allowed: true };
    }
    return { allowed: false, message: 'Access denied: Award belongs to another department.' };
  }

  return { allowed: false, message: 'Unauthorized action.' };
}

// ──────────────────────────────────────────────────────────────────────────────
// Controllers
// ──────────────────────────────────────────────────────────────────────────────

// GET /api/awards
exports.getAwards = async (req, res) => {
  try {
    const {
      calendarYear,
      department,
      school,
      campus,
      agencyType,
      agencyName,
      search,
      page = 1,
      limit = 50,
      sortField = 'dateOfRecognition',
      sortOrder = 'DESC'
    } = req.query;

    const userScope = await resolveUserDeptScope(req.user);
    const whereConditions = [];

    // Organizational Scope Filter
    if (!userScope.isUniversityWide && userScope.departments.length > 0) {
      whereConditions.push({
        [Op.or]: [
          { department: { [Op.in]: userScope.departments } },
          { originalDepartment: { [Op.in]: userScope.departments } },
          { createdBy: req.user.id }
        ]
      });
    }

    // Filters
    if (calendarYear && calendarYear !== 'all') {
      whereConditions.push({ calendarYear: parseInt(calendarYear, 10) });
    }

    if (department && department !== 'all') {
      whereConditions.push({
        [Op.or]: [
          { department: department },
          { originalDepartment: department }
        ]
      });
    }

    if (school && school !== 'all') {
      whereConditions.push({ school });
    }

    if (campus && campus !== 'all') {
      whereConditions.push({ campus });
    }

    if (agencyType && agencyType !== 'all') {
      whereConditions.push({
        recognisedAgencyType: { [Op.iLike]: `%${String(agencyType).trim()}%` }
      });
    }

    if (agencyName && agencyName !== 'all') {
      whereConditions.push({
        recognisingAgencyName: { [Op.iLike]: `%${String(agencyName).trim()}%` }
      });
    }

    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      whereConditions.push({
        [Op.or]: [
          { nameOfRecognition: { [Op.iLike]: q } },
          { recognisingAgencyName: { [Op.iLike]: q } },
          { employeeId: { [Op.iLike]: q } },
          { facultyName: { [Op.iLike]: q } },
          { department: { [Op.iLike]: q } },
          { description: { [Op.iLike]: q } }
        ]
      });
    }

    const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const offset = (parsedPage - 1) * parsedLimit;

    const allowedSortFields = ['dateOfRecognition', 'calendarYear', 'nameOfRecognition', 'recognisedAgencyType', 'recognisingAgencyName', 'createdAt', 'employeeId', 'facultyName', 'department'];
    const safeSortField = allowedSortFields.includes(sortField) ? sortField : 'dateOfRecognition';
    const safeSortOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows } = await Award.findAndCountAll({
      where,
      include: [
        {
          model: Faculty,
          as: 'faculty',
          attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email', 'status']
        }
      ],
      order: [[safeSortField, safeSortOrder]],
      limit: parsedLimit,
      offset
    });

    const enriched = rows.map(r => {
      const plain = r.toJSON();
      return {
        ...plain,
        currentDepartment: plain.faculty?.department || plain.department,
        departmentTransferred: plain.faculty?.department && plain.department && normalizeDeptKey(plain.faculty.department) !== normalizeDeptKey(plain.department),
        facultyLiveStatus: plain.faculty?.status || 'Active'
      };
    });

    res.json({
      success: true,
      total: count,
      count: enriched.length,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(count / parsedLimit),
      rows: enriched
    });
  } catch (error) {
    console.error('Get awards error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve awards records.' });
  }
};

// GET /api/awards/stats
exports.getAwardStats = async (req, res) => {
  try {
    const { calendarYear, department } = req.query;
    const userScope = await resolveUserDeptScope(req.user);
    const whereConditions = [];

    if (!userScope.isUniversityWide && userScope.departments.length > 0) {
      whereConditions.push({
        [Op.or]: [
          { department: { [Op.in]: userScope.departments } },
          { originalDepartment: { [Op.in]: userScope.departments } }
        ]
      });
    }

    if (calendarYear && calendarYear !== 'all') {
      whereConditions.push({ calendarYear: parseInt(calendarYear, 10) });
    }

    if (department && department !== 'all') {
      whereConditions.push({
        [Op.or]: [{ department }, { originalDepartment: department }]
      });
    }

    const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};

    const allRecords = await Award.findAll({
      where,
      attributes: ['id', 'calendarYear', 'department', 'recognisedAgencyType', 'recognisingAgencyName'],
      raw: true
    });

    const totalAwards = allRecords.length;
    const yearWise = {};
    const departmentWise = {};
    const agencyTypeWise = {};
    const agencyCounts = {};

    allRecords.forEach(r => {
      const yr = r.calendarYear || 'Unknown';
      yearWise[yr] = (yearWise[yr] || 0) + 1;

      const dept = r.department || 'General';
      departmentWise[dept] = (departmentWise[dept] || 0) + 1;

      const type = r.recognisedAgencyType || 'Other';
      agencyTypeWise[type] = (agencyTypeWise[type] || 0) + 1;

      const agency = r.recognisingAgencyName || 'Unknown';
      agencyCounts[agency] = (agencyCounts[agency] || 0) + 1;
    });

    const topAgencies = Object.entries(agencyCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      success: true,
      stats: {
        totalAwards,
        yearWise,
        departmentWise,
        agencyTypeWise,
        topAgencies,
        activeDepartmentsCount: Object.keys(departmentWise).length
      }
    });
  } catch (error) {
    console.error('Get award stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate awards statistics.' });
  }
};

// GET /api/awards/agency-types
exports.getAgencyTypeOptions = async (req, res) => {
  try {
    const options = await getActiveAgencyTypes();
    res.json({ success: true, options });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve agency type options.' });
  }
};

// GET /api/awards/faculty-search
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

    const faculties = await Faculty.findAll({
      where,
      attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email'],
      limit,
      order: [['employeeId', 'ASC']]
    });

    res.json({
      success: true,
      data: faculties.map(f => ({
        id: f.id,
        employeeId: String(f.employeeId).trim(),
        name: f.name,
        designation: f.designation,
        department: f.department,
        email: f.email || null
      }))
    });
  } catch (error) {
    console.error('Faculty search error:', error);
    res.status(500).json({ success: false, message: 'Failed to search faculty directory.' });
  }
};

// GET /api/awards/:id
exports.getAwardById = async (req, res) => {
  try {
    const award = await Award.findByPk(req.params.id, {
      include: [
        {
          model: Faculty,
          as: 'faculty',
          attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!award) {
      return res.status(404).json({ success: false, message: 'Award record not found.' });
    }

    const access = checkRecordAccess(award, req.user, 'view');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    res.json({ success: true, data: award });
  } catch (error) {
    console.error('Get award by id error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve award details.' });
  }
};

// POST /api/awards
exports.createAward = async (req, res) => {
  try {
    const {
      employeeId,
      facultyEmpId,
      nameOfRecognition,
      description,
      dateOfRecognition,
      recognisedAgencyType,
      recognisingAgencyName,
      proofUrl,
      customFields
    } = req.body;

    const targetEmpId = employeeId || facultyEmpId;

    if (!targetEmpId || !String(targetEmpId).trim()) {
      return res.status(400).json({ success: false, message: 'Employee ID (EmpID) is required.' });
    }

    if (!nameOfRecognition || !String(nameOfRecognition).trim()) {
      return res.status(400).json({ success: false, message: 'Name of Recognition is required.' });
    }

    if (!dateOfRecognition) {
      return res.status(400).json({ success: false, message: 'Date of Recognition is required.' });
    }

    const isoDate = parseDateToISO(dateOfRecognition);
    if (!isoDate) {
      return res.status(400).json({ success: false, message: 'Invalid Date of Recognition format.' });
    }

    const derivedYear = deriveCalendarYear(isoDate);
    if (!derivedYear) {
      return res.status(400).json({ success: false, message: 'Could not derive a valid Calendar Year from Date of Recognition.' });
    }

    if (!recognisedAgencyType || !String(recognisedAgencyType).trim()) {
      return res.status(400).json({ success: false, message: 'Recognised Agency Type is required.' });
    }

    if (proofUrl && !isValidUrl(proofUrl)) {
      return res.status(400).json({ success: false, message: 'Invalid Proof URL format. Must start with http:// or https://' });
    }

    // Verify exactly one faculty in Faculty Management
    const cleanEmpId = String(targetEmpId).trim();
    const normEmpId = normalizeEmpId(cleanEmpId);

    const faculty = await Faculty.findOne({
      where: {
        [Op.or]: [
          { employeeId: cleanEmpId },
          sequelize.where(sequelize.fn('UPPER', sequelize.col('employeeId')), normEmpId)
        ]
      }
    });

    if (!faculty) {
      return res.status(400).json({
        success: false,
        message: `EmpID "${cleanEmpId}" was not found in Faculty Management. An achievement record must belong to a verified faculty member.`
      });
    }

    // Duplicate detection: EmpID + normalized recognition name + date + normalized agency name (if provided)
    const normName = String(nameOfRecognition).trim().toLowerCase();
    const normAgency = recognisingAgencyName ? String(recognisingAgencyName).trim().toLowerCase() : '';

    const agencyWhere = normAgency
      ? sequelize.where(sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('recognisingAgencyName'))), normAgency)
      : { [Op.or]: [{ recognisingAgencyName: null }, { recognisingAgencyName: '' }] };

    const existingAward = await Award.findOne({
      where: {
        normalizedEmployeeId: normEmpId,
        dateOfRecognition: isoDate,
        [Op.and]: [
          sequelize.where(sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('nameOfRecognition'))), normName),
          agencyWhere
        ]
      }
    });

    if (existingAward) {
      return res.status(409).json({
        success: false,
        message: `Duplicate Award record detected for EmpID ${cleanEmpId} on date ${isoDate}${normAgency ? ` from agency "${recognisingAgencyName}"` : ''}.`
      });
    }

    const newAward = await Award.create({
      facultyId: faculty.id,
      employeeId: cleanEmpId,
      normalizedEmployeeId: normEmpId,
      facultyName: faculty.name,
      designation: faculty.designation,
      department: faculty.department,
      originalDepartment: faculty.department,
      originalDepartmentSource: 'creation_snapshot',
      school: faculty.school || null,
      campus: faculty.campus || null,
      nameOfRecognition: String(nameOfRecognition).trim(),
      description: description ? String(description).trim() : null,
      dateOfRecognition: isoDate,
      recognisedAgencyType: String(recognisedAgencyType).trim(),
      recognisingAgencyName: recognisingAgencyName && String(recognisingAgencyName).toLowerCase() !== 'nil' ? String(recognisingAgencyName).trim() : null,
      proofUrl: proofUrl ? String(proofUrl).trim() : null,
      calendarYear: derivedYear,
      customFields: customFields || {},
      createdBy: req.user?.id || null
    });

    res.status(201).json({
      success: true,
      message: 'Award record created successfully.',
      data: newAward
    });
  } catch (error) {
    console.error('Create award error:', error);
    res.status(500).json({ success: false, message: 'Failed to create award record.' });
  }
};

// PUT /api/awards/:id
exports.updateAward = async (req, res) => {
  try {
    const award = await Award.findByPk(req.params.id);
    if (!award) {
      return res.status(404).json({ success: false, message: 'Award record not found.' });
    }

    const access = checkRecordAccess(award, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const {
      employeeId,
      nameOfRecognition,
      description,
      dateOfRecognition,
      recognisedAgencyType,
      recognisingAgencyName,
      proofUrl,
      customFields
    } = req.body;

    let targetEmpId = award.employeeId;
    let targetNormEmpId = award.normalizedEmployeeId;
    let targetFacultyId = award.facultyId;
    let targetFacultyName = award.facultyName;
    let targetDesignation = award.designation;
    let targetDept = award.department;

    if (employeeId && String(employeeId).trim() !== award.employeeId) {
      const cleanEmpId = String(employeeId).trim();
      const normEmp = normalizeEmpId(cleanEmpId);
      const faculty = await Faculty.findOne({
        where: {
          [Op.or]: [
            { employeeId: cleanEmpId },
            sequelize.where(sequelize.fn('UPPER', sequelize.col('employeeId')), normEmp)
          ]
        }
      });
      if (!faculty) {
        return res.status(400).json({
          success: false,
          message: `EmpID "${cleanEmpId}" not found in Faculty Management.`
        });
      }
      targetEmpId = cleanEmpId;
      targetNormEmpId = normEmp;
      targetFacultyId = faculty.id;
      targetFacultyName = faculty.name;
      targetDesignation = faculty.designation;
      targetDept = faculty.department;
    }

    const finalDate = dateOfRecognition ? parseDateToISO(dateOfRecognition) : award.dateOfRecognition;
    if (!finalDate) {
      return res.status(400).json({ success: false, message: 'Invalid Date of Recognition.' });
    }

    const finalYear = deriveCalendarYear(finalDate);
    const finalName = nameOfRecognition ? String(nameOfRecognition).trim() : award.nameOfRecognition;
    const finalAgency = recognisingAgencyName !== undefined ? (String(recognisingAgencyName).trim() || null) : award.recognisingAgencyName;

    if (proofUrl && !isValidUrl(proofUrl)) {
      return res.status(400).json({ success: false, message: 'Invalid Proof URL format.' });
    }

    const agencyUpdateWhere = finalAgency
      ? sequelize.where(sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('recognisingAgencyName'))), finalAgency.toLowerCase())
      : { [Op.or]: [{ recognisingAgencyName: null }, { recognisingAgencyName: '' }] };

    // Check duplicate excluding self
    const existing = await Award.findOne({
      where: {
        id: { [Op.ne]: award.id },
        normalizedEmployeeId: targetNormEmpId,
        dateOfRecognition: finalDate,
        [Op.and]: [
          sequelize.where(sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('nameOfRecognition'))), finalName.toLowerCase()),
          agencyUpdateWhere
        ]
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Another award record with the same EmpID, Name of Recognition, Date, and Agency already exists.'
      });
    }

    await award.update({
      facultyId: targetFacultyId,
      employeeId: targetEmpId,
      normalizedEmployeeId: targetNormEmpId,
      facultyName: targetFacultyName,
      designation: targetDesignation,
      department: targetDept,
      nameOfRecognition: finalName,
      description: description !== undefined ? (description ? String(description).trim() : null) : award.description,
      dateOfRecognition: finalDate,
      recognisedAgencyType: recognisedAgencyType ? String(recognisedAgencyType).trim() : award.recognisedAgencyType,
      recognisingAgencyName: finalAgency,
      proofUrl: proofUrl !== undefined ? (proofUrl ? String(proofUrl).trim() : null) : award.proofUrl,
      calendarYear: finalYear,
      customFields: customFields !== undefined ? customFields : award.customFields
    });

    res.json({
      success: true,
      message: 'Award record updated successfully.',
      data: award
    });
  } catch (error) {
    console.error('Update award error:', error);
    res.status(500).json({ success: false, message: 'Failed to update award record.' });
  }
};

// DELETE /api/awards/:id
exports.deleteAward = async (req, res) => {
  try {
    const award = await Award.findByPk(req.params.id);
    if (!award) {
      return res.status(404).json({ success: false, message: 'Award record not found.' });
    }

    const access = checkRecordAccess(award, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    await award.destroy();
    res.json({ success: true, message: 'Award record deleted successfully.' });
  } catch (error) {
    console.error('Delete award error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete award record.' });
  }
};

// POST /api/awards/bulk/validate
exports.validateBulkAwards = async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No spreadsheet rows provided for validation.' });
    }

    const activeAgencyTypes = await getActiveAgencyTypes();
    const agencyTypeSet = new Set(activeAgencyTypes.map(t => t.toLowerCase().trim()));

    // Collect unique non-empty EmpIDs
    const uniqueEmpIds = new Set();
    rows.forEach(r => {
      const rawId = String(r.employeeId || r.empId || r.EmpId || r.EmpID || '').trim();
      if (rawId && rawId.toLowerCase() !== 'nil' && rawId.toLowerCase() !== 'n/a') {
        uniqueEmpIds.add(rawId);
      }
    });

    // Batch query Faculty Management
    const facultyRecords = uniqueEmpIds.size > 0
      ? await Faculty.findAll({
          where: {
            [Op.or]: [
              { employeeId: { [Op.in]: Array.from(uniqueEmpIds) } },
              sequelize.where(sequelize.fn('UPPER', sequelize.col('employeeId')), {
                [Op.in]: Array.from(uniqueEmpIds).map(normalizeEmpId)
              })
            ]
          },
          attributes: ['id', 'employeeId', 'name', 'designation', 'department']
        })
      : [];

    const facultyMap = new Map();
    facultyRecords.forEach(f => {
      facultyMap.set(normalizeEmpId(f.employeeId), f);
    });

    // Fetch existing awards for duplicate checking
    const existingAwards = await Award.findAll({
      attributes: ['normalizedEmployeeId', 'nameOfRecognition', 'dateOfRecognition', 'recognisingAgencyName'],
      raw: true
    });

    const existingKeys = new Set(
      existingAwards.map(a => `${a.normalizedEmployeeId}|${String(a.nameOfRecognition).trim().toLowerCase()}|${a.dateOfRecognition}|${a.recognisingAgencyName ? String(a.recognisingAgencyName).trim().toLowerCase() : ''}`)
    );

    const validatedRows = [];
    const seenInBatch = new Set();

    let readyCount = 0;
    let missingEmpIdCount = 0;
    let invalidEmpIdCount = 0;
    let notFoundEmpIdCount = 0;
    let duplicateCount = 0;
    let otherErrorCount = 0;

    rows.forEach((r, idx) => {
      const rowNum = idx + 1;
      const rawEmpId = String(r.employeeId || r.empId || r.EmpId || r.EmpID || '').trim();
      const recognitionName = String(r.nameOfRecognition || r.NameOfRecognition || r['Name of Recognition'] || r.awardName || r['Award Name'] || r.title || r.Title || '').trim();
      const description = String(r.description || r.Description || '').trim();
      const rawDate = r.dateOfRecognition || r.DateOfRecognition || r['Date of Recognition'] || r.date || r.Date || r.eventDate || r.EventDate || '';
      const agencyType = String(r.recognisedAgencyType || r.RecognisedAgencyType || r['Recognised Agency Type'] || r.agencyType || r['Agency Type'] || '').trim();
      const agencyName = String(r.recognisingAgencyName || r.RecognisingAgencyName || r['Recognising Agency Name'] || r.agencyName || r['Agency Name'] || r.recognisingAgency || r['Recognising Agency'] || '').trim();
      const rawProof = String(r.proofUrl || r.ProofUrl || r['Proof URL'] || '').trim();

      const errors = [];
      let rowStatus = 'ready';
      let failureCategory = null;

      // 1. EmpID Validation
      if (!rawEmpId || rawEmpId.toLowerCase() === 'nil' || rawEmpId.toLowerCase() === 'n/a') {
        errors.push('EmpID is missing or blank.');
        rowStatus = 'needs_review';
        failureCategory = 'missing_empid';
        missingEmpIdCount++;
      } else {
        const norm = normalizeEmpId(rawEmpId);
        const faculty = facultyMap.get(norm);
        if (!faculty) {
          errors.push(`EmpID "${rawEmpId}" not found in Faculty Management.`);
          rowStatus = 'needs_review';
          failureCategory = 'empid_not_found';
          notFoundEmpIdCount++;
        }
      }

      // 2. Required Fields Validation
      if (!recognitionName || recognitionName.toLowerCase() === 'nil') {
        errors.push('Name of Recognition is required.');
        if (rowStatus === 'ready') { rowStatus = 'needs_review'; failureCategory = 'other'; otherErrorCount++; }
      }

      const isoDate = parseDateToISO(rawDate);
      if (!isoDate) {
        errors.push('Invalid Date of Recognition.');
        if (rowStatus === 'ready') { rowStatus = 'needs_review'; failureCategory = 'other'; otherErrorCount++; }
      }

      const effectiveAgencyType = normalizeAgencyType(agencyType, activeAgencyTypes);

      if (!effectiveAgencyType || effectiveAgencyType.toLowerCase() === 'nil') {
        errors.push('Recognised Agency Type is required.');
        if (rowStatus === 'ready') { rowStatus = 'needs_review'; failureCategory = 'other'; otherErrorCount++; }
      } else if (!agencyTypeSet.has(effectiveAgencyType.toLowerCase())) {
        errors.push(`Invalid Agency Type "${agencyType}". Allowed: ${activeAgencyTypes.join(', ')}.`);
        if (rowStatus === 'ready') { rowStatus = 'needs_review'; failureCategory = 'other'; otherErrorCount++; }
      }

      if (rawProof && rawProof.toLowerCase() !== 'nil' && !isValidUrl(rawProof)) {
        errors.push('Invalid Proof URL format (must start with http:// or https://).');
        if (rowStatus === 'ready') { rowStatus = 'needs_review'; failureCategory = 'other'; otherErrorCount++; }
      }

      // 3. Duplicate Detection
      if (rowStatus === 'ready') {
        const normEmp = normalizeEmpId(rawEmpId);
        const normAgency = agencyName && agencyName.toLowerCase() !== 'nil' ? agencyName.toLowerCase().trim() : '';
        const dedupKey = `${normEmp}|${recognitionName.toLowerCase()}|${isoDate}|${normAgency}`;
        if (existingKeys.has(dedupKey) || seenInBatch.has(dedupKey)) {
          errors.push('Duplicate record detected.');
          rowStatus = 'duplicate';
          failureCategory = 'duplicate';
          duplicateCount++;
        } else {
          seenInBatch.add(dedupKey);
          readyCount++;
        }
      }

      const faculty = facultyMap.get(normalizeEmpId(rawEmpId));
      validatedRows.push({
        _rowNumber: rowNum,
        _rowStatus: rowStatus,
        _failureCategory: failureCategory,
        _errors: errors,
        _issues: errors,
        employeeId: rawEmpId,
        facultyName: faculty ? faculty.name : null,
        department: faculty ? faculty.department : null,
        designation: faculty ? faculty.designation : null,
        nameOfRecognition: recognitionName,
        description: description && description.toLowerCase() !== 'nil' ? description : '',
        dateOfRecognition: isoDate || rawDate,
        calendarYear: isoDate ? deriveCalendarYear(isoDate) : null,
        recognisedAgencyType: effectiveAgencyType || agencyType,
        recognisingAgencyName: agencyName && agencyName.toLowerCase() !== 'nil' ? agencyName : '',
        proofUrl: rawProof && rawProof.toLowerCase() !== 'nil' ? rawProof : ''
      });
    });

    res.json({
      success: true,
      summary: {
        totalRows: rows.length,
        readyCount,
        missingEmpIdCount,
        invalidEmpIdCount,
        notFoundEmpIdCount,
        duplicateCount,
        otherErrorCount
      },
      rows: validatedRows
    });
  } catch (error) {
    console.error('Validate bulk awards error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate bulk awards spreadsheet.' });
  }
};

// POST /api/awards/bulk/import
exports.bulkImportAwards = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'No rows provided for import.' });
    }

    const activeAgencyTypes = await getActiveAgencyTypes();
    const agencyTypeSet = new Set(activeAgencyTypes.map(t => t.toLowerCase().trim()));

    // Collect unique EmpIDs
    const uniqueEmpIds = new Set();
    rows.forEach(r => {
      const rawId = String(r.employeeId || r.empId || r.EmpId || r.EmpID || '').trim();
      if (rawId && rawId.toLowerCase() !== 'nil' && rawId.toLowerCase() !== 'n/a') {
        uniqueEmpIds.add(rawId);
      }
    });

    const facultyRecords = uniqueEmpIds.size > 0
      ? await Faculty.findAll({
          where: {
            [Op.or]: [
              { employeeId: { [Op.in]: Array.from(uniqueEmpIds) } },
              sequelize.where(sequelize.fn('UPPER', sequelize.col('employeeId')), {
                [Op.in]: Array.from(uniqueEmpIds).map(normalizeEmpId)
              })
            ]
          },
          attributes: ['id', 'employeeId', 'name', 'designation', 'department'],
          transaction
        })
      : [];

    const facultyMap = new Map();
    facultyRecords.forEach(f => {
      facultyMap.set(normalizeEmpId(f.employeeId), f);
    });

    const existingAwards = await Award.findAll({
      attributes: ['normalizedEmployeeId', 'nameOfRecognition', 'dateOfRecognition', 'recognisingAgencyName'],
      raw: true,
      transaction
    });

    const existingKeys = new Set(
      existingAwards.map(a => `${a.normalizedEmployeeId}|${String(a.nameOfRecognition).trim().toLowerCase()}|${a.dateOfRecognition}|${a.recognisingAgencyName ? String(a.recognisingAgencyName).trim().toLowerCase() : ''}`)
    );

    const validToInsert = [];
    const skippedRecords = [];
    const seenInBatch = new Set();

    let skippedMissingEmpId = 0;
    let skippedInvalidEmpId = 0;
    let skippedNotFound = 0;
    let skippedDuplicate = 0;
    let rejectedOther = 0;

    rows.forEach((r, idx) => {
      const rowNum = idx + 1;
      const rawEmpId = String(r.employeeId || r.empId || r.EmpId || r.EmpID || '').trim();
      const recognitionName = String(r.nameOfRecognition || r.NameOfRecognition || r['Name of Recognition'] || r.awardName || r['Award Name'] || r.title || r.Title || '').trim();
      const description = String(r.description || r.Description || '').trim();
      const rawDate = r.dateOfRecognition || r.DateOfRecognition || r['Date of Recognition'] || r.date || r.Date || r.eventDate || r.EventDate || '';
      const agencyType = String(r.recognisedAgencyType || r.RecognisedAgencyType || r['Recognised Agency Type'] || r.agencyType || r['Agency Type'] || '').trim();
      const agencyName = String(r.recognisingAgencyName || r.RecognisingAgencyName || r['Recognising Agency Name'] || r.agencyName || r['Agency Name'] || r.recognisingAgency || r['Recognising Agency'] || '').trim();
      const rawProof = String(r.proofUrl || r.ProofUrl || r['Proof URL'] || '').trim();

      // Missing EmpID check
      if (!rawEmpId || rawEmpId.toLowerCase() === 'nil' || rawEmpId.toLowerCase() === 'n/a') {
        skippedMissingEmpId++;
        skippedRecords.push({
          rowNumber: rowNum,
          employeeId: rawEmpId || 'N/A',
          recognitionName: recognitionName || 'N/A',
          problematicField: 'EmpId',
          reason: 'EmpID is missing or blank. Entire row skipped.'
        });
        return;
      }

      const normEmp = normalizeEmpId(rawEmpId);
      const faculty = facultyMap.get(normEmp);
      if (!faculty) {
        skippedNotFound++;
        skippedRecords.push({
          rowNumber: rowNum,
          employeeId: rawEmpId,
          recognitionName: recognitionName || 'N/A',
          problematicField: 'EmpId',
          reason: `EmpID(s) not found in Faculty Management: "${rawEmpId}". Entire row skipped.`
        });
        return;
      }

      if (!recognitionName || recognitionName.toLowerCase() === 'nil') {
        rejectedOther++;
        skippedRecords.push({
          rowNumber: rowNum,
          employeeId: rawEmpId,
          recognitionName: 'N/A',
          problematicField: 'Name of Recognition',
          reason: 'Missing required field: Name of Recognition.'
        });
        return;
      }

      const isoDate = parseDateToISO(rawDate);
      if (!isoDate) {
        rejectedOther++;
        skippedRecords.push({
          rowNumber: rowNum,
          employeeId: rawEmpId,
          recognitionName,
          problematicField: 'Date of Recognition',
          reason: `Invalid Date of Recognition: "${rawDate}".`
        });
        return;
      }

      const derivedYear = deriveCalendarYear(isoDate);
      const effectiveAgencyType = normalizeAgencyType(agencyType, activeAgencyTypes);

      if (!effectiveAgencyType || effectiveAgencyType.toLowerCase() === 'nil') {
        rejectedOther++;
        skippedRecords.push({
          rowNumber: rowNum,
          employeeId: rawEmpId,
          recognitionName,
          problematicField: 'Recognised Agency Type',
          reason: 'Missing required field: Recognised Agency Type.'
        });
        return;
      }

      if (!agencyTypeSet.has(effectiveAgencyType.toLowerCase())) {
        rejectedOther++;
        skippedRecords.push({
          rowNumber: rowNum,
          employeeId: rawEmpId,
          recognitionName,
          problematicField: 'Recognised Agency Type',
          reason: `Invalid Recognised Agency Type "${agencyType}". Must match administrator-approved option.`
        });
        return;
      }

      const cleanProof = rawProof && rawProof.toLowerCase() !== 'nil' ? rawProof : null;
      if (cleanProof && !isValidUrl(cleanProof)) {
        rejectedOther++;
        skippedRecords.push({
          rowNumber: rowNum,
          employeeId: rawEmpId,
          recognitionName,
          problematicField: 'Proof URL',
          reason: `Invalid Proof URL format: "${cleanProof}".`
        });
        return;
      }

      // Duplicate Check
      const normAgency = agencyName && agencyName.toLowerCase() !== 'nil' ? agencyName.toLowerCase().trim() : '';
      const dedupKey = `${normEmp}|${recognitionName.toLowerCase()}|${isoDate}|${normAgency}`;
      if (existingKeys.has(dedupKey) || seenInBatch.has(dedupKey)) {
        skippedDuplicate++;
        skippedRecords.push({
          rowNumber: rowNum,
          employeeId: rawEmpId,
          recognitionName,
          problematicField: 'Duplicate Record',
          reason: 'Duplicate record detected with identical EmpID, Recognition Name, Date, and Agency Name.'
        });
        return;
      }

      seenInBatch.add(dedupKey);

      validToInsert.push({
        facultyId: faculty.id,
        employeeId: rawEmpId,
        normalizedEmployeeId: normEmp,
        facultyName: faculty.name,
        designation: faculty.designation,
        department: faculty.department,
        originalDepartment: faculty.department,
        originalDepartmentSource: 'creation_snapshot',
        school: faculty.school || null,
        campus: faculty.campus || null,
        nameOfRecognition: recognitionName,
        description: description && description.toLowerCase() !== 'nil' ? description : null,
        dateOfRecognition: isoDate,
        recognisedAgencyType: effectiveAgencyType,
        recognisingAgencyName: agencyName && agencyName.toLowerCase() !== 'nil' ? agencyName : null,
        proofUrl: cleanProof,
        calendarYear: derivedYear,
        customFields: {},
        createdBy: req.user?.id || null
      });
    });

    let insertedRecords = [];
    if (validToInsert.length > 0) {
      insertedRecords = await Award.bulkCreate(validToInsert, { transaction });
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `Bulk import completed. Successfully imported ${insertedRecords.length} awards, skipped ${skippedRecords.length} rows.`,
      summary: {
        totalRows: rows.length,
        importedCount: insertedRecords.length,
        skippedMissingEmpId,
        skippedInvalidEmpId,
        skippedEmpIdNotFound: skippedNotFound,
        skippedDuplicate,
        rejectedOther,
        totalSkipped: skippedRecords.length
      },
      skippedRecords
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Bulk import awards error:', error);
    res.status(500).json({ success: false, message: 'Failed to execute bulk awards import.' });
  }
};

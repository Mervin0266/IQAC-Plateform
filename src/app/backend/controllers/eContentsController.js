'use strict';

const { Op } = require('sequelize');
const { EContent, EContentFaculty, Faculty, User, School, Department, SystemConfiguration } = require('../models');
const { sequelize } = require('../config/database');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

const normalizeDeptKey = (val) => String(val || '').trim().toLowerCase().replace(/\s+/g, ' ');
const normalizeEmpId = (val) => String(val || '').trim().toUpperCase();

function parseDateToISO(dateStr) {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  if (!trimmed || trimmed.toLowerCase() === 'nil' || trimmed.toLowerCase() === 'n/a') return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle 4-digit standalone year (e.g., 2024 -> 2024-01-01)
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

function deriveCalendarYear(dateStr) {
  const iso = parseDateToISO(dateStr);
  if (!iso) return null;
  const year = parseInt(iso.substring(0, 4), 10);
  return isNaN(year) ? null : year;
}

function isValidUrl(val) {
  if (!val) return true; // Optional URLs pass if empty
  let str = String(val).trim();
  if (!str || str.toLowerCase() === 'nil' || str.toLowerCase() === 'n/a') return true;
  if (!str.startsWith('http://') && !str.startsWith('https://')) {
    str = 'https://' + str;
  }
  try {
    const url = new URL(str);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (_) {
    return false;
  }
}

// Default Platforms & Content Types
const DEFAULT_PLATFORMS = [
  'SWAYAM / NPTEL',
  'Coursera',
  'edX',
  'YouTube (Institutional Channel)',
  'Institutional LMS / Moodle',
  'e-PG Pathshala / INFLIBNET',
  'Consortium for Educational Communication (CEC)',
  'Other Approved MOOCs Platform'
];

const DEFAULT_CONTENT_TYPES = [
  'SINGLE_MODULE',
  'ENTIRE_COURSE',
  'MULTIPLE_MODULE'
];

// Smart normalization for E-Content Platforms (handles SNAKE_CASE, uppercase, partial keywords)
function normalizePlatform(platform, activePlatforms = []) {
  if (!platform) return null;
  const raw = String(platform).trim();
  if (!raw || raw.toLowerCase() === 'nil' || raw.toLowerCase() === 'n/a') return null;

  // Exact or direct match
  const exact = activePlatforms.find(p => p.toLowerCase().trim() === raw.toLowerCase());
  if (exact) return exact;

  const lower = raw.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (lower.includes('swayam') || lower.includes('nptel')) {
    return 'SWAYAM / NPTEL';
  }
  if (lower.includes('coursera')) {
    return 'Coursera';
  }
  if (lower.includes('edx')) {
    return 'edX';
  }
  if (lower.includes('youtube')) {
    return 'YouTube (Institutional Channel)';
  }
  if (lower.includes('moodle') || lower.includes('lms') || lower.includes('institutionallms')) {
    return 'Institutional LMS / Moodle';
  }
  if (lower.includes('inflibnet') || lower.includes('epg') || lower.includes('pathshala')) {
    return 'e-PG Pathshala / INFLIBNET';
  }
  if (lower.includes('cec') || lower.includes('consortium')) {
    return 'Consortium for Educational Communication (CEC)';
  }
  if (lower.includes('other') || lower.includes('mooc') || lower === 'otherapprovedmoocsplatform') {
    return 'Other Approved MOOCs Platform';
  }

  const sub = activePlatforms.find(p => {
    const cleanP = p.toLowerCase().replace(/[^a-z0-9]/g, '');
    return lower.includes(cleanP) || cleanP.includes(lower);
  });
  if (sub) return sub;

  return raw;
}

// Smart normalization for Content Types (handles SNAKE_CASE, uppercase, partial keywords)
function normalizeContentType(contentType, activeContentTypes = []) {
  if (!contentType) return null;
  const raw = String(contentType).trim();
  if (!raw || raw.toLowerCase() === 'nil' || raw.toLowerCase() === 'n/a') return null;

  // Exact or direct match
  const exact = activeContentTypes.find(c => c.toLowerCase().trim() === raw.toLowerCase());
  if (exact) return exact;

  const lower = raw.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (lower.includes('single') || (lower.includes('module') && !lower.includes('multi'))) {
    return 'SINGLE_MODULE';
  }
  if (lower.includes('multi')) {
    return 'MULTIPLE_MODULE';
  }
  if (lower.includes('entire') || lower.includes('course') || lower.includes('mooc') || lower.includes('quadrant')) {
    return 'ENTIRE_COURSE';
  }

  const sub = activeContentTypes.find(c => {
    const cleanC = c.toLowerCase().replace(/[^a-z0-9]/g, '');
    return lower.includes(cleanC) || cleanC.includes(lower);
  });
  if (sub) return sub;

  return raw;
}

async function getActivePlatforms() {
  try {
    const cfg = await SystemConfiguration.findOne({ where: { configKey: 'achievements_econtent_platforms' }, raw: true });
    if (cfg && cfg.value && Array.isArray(cfg.value.options)) {
      return cfg.value.options
        .filter(opt => opt.status !== 'inactive')
        .map(opt => typeof opt === 'string' ? opt : (opt.label || opt.name));
    }
  } catch (_) {}
  return DEFAULT_PLATFORMS;
}

async function getActiveContentTypes() {
  try {
    const cfg = await SystemConfiguration.findOne({ where: { configKey: 'achievements_econtent_types' }, raw: true });
    if (cfg && cfg.value && Array.isArray(cfg.value.options)) {
      return cfg.value.options
        .filter(opt => opt.status !== 'inactive')
        .map(opt => typeof opt === 'string' ? opt : (opt.label || opt.name));
    }
  } catch (_) {}
  return DEFAULT_CONTENT_TYPES;
}

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

  if (user.role === 'faculty') {
    if (record.createdBy === user.id || normalizeEmpId(record.employeeId) === normalizeEmpId(user.employeeId)) {
      return { allowed: true };
    }
    return { allowed: false, message: 'Faculty can only manage their own e-content records.' };
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
    return { allowed: false, message: 'Access denied: E-Content belongs to another department.' };
  }

  return { allowed: false, message: 'Unauthorized action.' };
}

// ──────────────────────────────────────────────────────────────────────────────
// Controllers
// ──────────────────────────────────────────────────────────────────────────────

// GET /api/e-contents
exports.getEContents = async (req, res) => {
  try {
    const {
      calendarYear,
      department,
      school,
      campus,
      platform,
      contentType,
      search,
      page = 1,
      limit = 50,
      sortField = 'publicationDate',
      sortOrder = 'DESC'
    } = req.query;

    const userScope = await resolveUserDeptScope(req.user);
    const whereConditions = [];

    if (!userScope.isUniversityWide && userScope.departments.length > 0) {
      whereConditions.push({
        [Op.or]: [
          { department: { [Op.in]: userScope.departments } },
          { originalDepartment: { [Op.in]: userScope.departments } },
          { createdBy: req.user.id }
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

    if (school && school !== 'all') whereConditions.push({ school });
    if (campus && campus !== 'all') whereConditions.push({ campus });

    if (platform && platform !== 'all') {
      whereConditions.push({
        eContentPlatform: { [Op.iLike]: `%${String(platform).trim()}%` }
      });
    }

    if (contentType && contentType !== 'all') {
      whereConditions.push({
        contentType: { [Op.iLike]: `%${String(contentType).trim()}%` }
      });
    }

    if (search && String(search).trim()) {
      const q = `%${String(search).trim()}%`;
      whereConditions.push({
        [Op.or]: [
          { title: { [Op.iLike]: q } },
          { eContentPlatform: { [Op.iLike]: q } },
          { contentType: { [Op.iLike]: q } },
          { employeeId: { [Op.iLike]: q } },
          { facultyName: { [Op.iLike]: q } },
          { department: { [Op.iLike]: q } }
        ]
      });
    }

    const where = whereConditions.length > 0 ? { [Op.and]: whereConditions } : {};
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const offset = (parsedPage - 1) * parsedLimit;

    const allowedSortFields = ['publicationDate', 'calendarYear', 'title', 'eContentPlatform', 'contentType', 'createdAt', 'employeeId', 'facultyName', 'department'];
    const safeSortField = allowedSortFields.includes(sortField) ? sortField : 'publicationDate';
    const safeSortOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const { count, rows } = await EContent.findAndCountAll({
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
    console.error('Get e-contents error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve e-contents records.' });
  }
};

// GET /api/e-contents/stats
exports.getEContentStats = async (req, res) => {
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

    const allRecords = await EContent.findAll({
      where,
      attributes: ['id', 'calendarYear', 'department', 'eContentPlatform', 'contentType'],
      raw: true
    });

    const totalEContents = allRecords.length;
    const yearWise = {};
    const departmentWise = {};
    const platformWise = {};
    const contentTypeWise = {};

    allRecords.forEach(r => {
      const yr = r.calendarYear || 'Unknown';
      yearWise[yr] = (yearWise[yr] || 0) + 1;

      const dept = r.department || 'General';
      departmentWise[dept] = (departmentWise[dept] || 0) + 1;

      const plat = r.eContentPlatform || 'Other';
      platformWise[plat] = (platformWise[plat] || 0) + 1;

      const type = r.contentType || 'Other';
      contentTypeWise[type] = (contentTypeWise[type] || 0) + 1;
    });

    res.json({
      success: true,
      stats: {
        totalEContents,
        yearWise,
        departmentWise,
        platformWise,
        contentTypeWise,
        activeDepartmentsCount: Object.keys(departmentWise).length
      }
    });
  } catch (error) {
    console.error('Get e-content stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate e-contents statistics.' });
  }
};

// GET /api/e-contents/dropdown-options
exports.getDropdownOptions = async (req, res) => {
  try {
    const [platforms, contentTypes] = await Promise.all([
      getActivePlatforms(),
      getActiveContentTypes()
    ]);
    res.json({ success: true, platforms, contentTypes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve dropdown options.' });
  }
};

// GET /api/e-contents/:id
exports.getEContentById = async (req, res) => {
  try {
    const econtent = await EContent.findByPk(req.params.id, {
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

    if (!econtent) {
      return res.status(404).json({ success: false, message: 'E-Content record not found.' });
    }

    const access = checkRecordAccess(econtent, req.user, 'view');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    res.json({ success: true, data: econtent });
  } catch (error) {
    console.error('Get e-content by id error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve e-content details.' });
  }
};

// POST /api/e-contents
exports.createEContent = async (req, res) => {
  try {
    const {
      employeeId,
      facultyEmpId,
      title,
      eContentPlatform,
      publicationDate,
      url,
      contentType,
      proofUrl,
      customFields
    } = req.body;

    const targetEmpId = employeeId || facultyEmpId;

    if (!targetEmpId || !String(targetEmpId).trim()) {
      return res.status(400).json({ success: false, message: 'Employee ID (EmpID) is required.' });
    }

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Title is required.' });
    }

    if (!eContentPlatform || !String(eContentPlatform).trim()) {
      return res.status(400).json({ success: false, message: 'E-Content Platform is required.' });
    }

    if (!publicationDate) {
      return res.status(400).json({ success: false, message: 'Publication Date is required.' });
    }

    const isoDate = parseDateToISO(publicationDate);
    if (!isoDate) {
      return res.status(400).json({ success: false, message: 'Invalid Publication Date format.' });
    }

    const derivedYear = deriveCalendarYear(isoDate);
    if (!derivedYear) {
      return res.status(400).json({ success: false, message: 'Could not derive a valid Calendar Year from Publication Date.' });
    }

    let cleanUrl = null;
    if (url && String(url).trim() && String(url).toLowerCase() !== 'nil' && String(url).toLowerCase() !== 'n/a') {
      cleanUrl = String(url).trim();
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
      }
      if (!isValidUrl(cleanUrl)) {
        return res.status(400).json({ success: false, message: 'Invalid URL format. Must start with http:// or https://' });
      }
    }

    if (!contentType || !String(contentType).trim()) {
      return res.status(400).json({ success: false, message: 'Content Type is required.' });
    }

    if (proofUrl && String(proofUrl).trim() && !isValidUrl(proofUrl)) {
      return res.status(400).json({ success: false, message: 'Invalid Proof URL format. Must start with http:// or https://' });
    }

    // Verify exactly one faculty member in Faculty Management
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

    // Duplicate detection: EmpID + normalized Title + Publication Date + normalized Published URL (or empty)
    const normTitle = String(title).trim().toLowerCase();
    const normUrl = cleanUrl ? cleanUrl.toLowerCase() : '';
    const urlWhere = normUrl
      ? sequelize.where(sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('url'))), normUrl)
      : { [Op.or]: [{ url: null }, { url: '' }] };

    const existing = await EContent.findOne({
      where: {
        normalizedEmployeeId: normEmpId,
        publicationDate: isoDate,
        [Op.and]: [
          sequelize.where(sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('title'))), normTitle),
          urlWhere
        ]
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Duplicate E-Content record detected for EmpID ${cleanEmpId} on date ${isoDate} with matching Title${normUrl ? ' and URL' : ''}.`
      });
    }

    const newRecord = await EContent.create({
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
      title: String(title).trim(),
      eContentPlatform: String(eContentPlatform).trim(),
      publicationDate: isoDate,
      url: cleanUrl,
      contentType: String(contentType).trim(),
      proofUrl: proofUrl && String(proofUrl).trim() ? String(proofUrl).trim() : null,
      calendarYear: derivedYear,
      customFields: customFields || {},
      createdBy: req.user?.id || null
    });

    try {
      await EContentFaculty.create({
        econtentId: newRecord.id,
        facultyId: faculty.id,
        employeeId: cleanEmpId,
        normalizedEmployeeId: normEmpId,
        facultyName: faculty.name,
        designation: faculty.designation,
        department: faculty.department,
        contributorType: 'Verified Faculty',
        isGuestFaculty: false,
        displayOrder: 0
      });
    } catch (efErr) {
      console.warn('Failed to insert into econtent_faculties for single create:', efErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'E-Content record created successfully.',
      data: newRecord
    });
  } catch (error) {
    console.error('Create e-content error:', error);
    res.status(500).json({ success: false, message: 'Failed to create e-content record.' });
  }
};

// PUT /api/e-contents/:id
exports.updateEContent = async (req, res) => {
  try {
    const record = await EContent.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'E-Content record not found.' });
    }

    const access = checkRecordAccess(record, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const {
      employeeId,
      title,
      eContentPlatform,
      publicationDate,
      url,
      contentType,
      proofUrl,
      customFields
    } = req.body;

    let targetEmpId = record.employeeId;
    let targetNormEmpId = record.normalizedEmployeeId;
    let targetFacultyId = record.facultyId;
    let targetFacultyName = record.facultyName;
    let targetDesignation = record.designation;
    let targetDept = record.department;

    if (employeeId && String(employeeId).trim() !== record.employeeId) {
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

    const finalDate = publicationDate ? parseDateToISO(publicationDate) : record.publicationDate;
    if (!finalDate) {
      return res.status(400).json({ success: false, message: 'Invalid Publication Date.' });
    }

    const finalYear = deriveCalendarYear(finalDate);
    const finalTitle = title ? String(title).trim() : record.title;

    let finalUrl = record.url;
    if (url !== undefined) {
      if (url && String(url).trim() && String(url).toLowerCase() !== 'nil' && String(url).toLowerCase() !== 'n/a') {
        let u = String(url).trim();
        if (!u.startsWith('http://') && !u.startsWith('https://')) {
          u = 'https://' + u;
        }
        if (!isValidUrl(u)) {
          return res.status(400).json({ success: false, message: 'Invalid published URL format.' });
        }
        finalUrl = u;
      } else {
        finalUrl = null;
      }
    }

    if (proofUrl && String(proofUrl).trim() && !isValidUrl(proofUrl)) {
      return res.status(400).json({ success: false, message: 'Invalid Proof URL format.' });
    }

    // Check duplicate excluding self
    const normUpdateUrl = finalUrl ? finalUrl.toLowerCase() : '';
    const urlUpdateWhere = normUpdateUrl
      ? sequelize.where(sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('url'))), normUpdateUrl)
      : { [Op.or]: [{ url: null }, { url: '' }] };

    const existing = await EContent.findOne({
      where: {
        id: { [Op.ne]: record.id },
        normalizedEmployeeId: targetNormEmpId,
        publicationDate: finalDate,
        [Op.and]: [
          sequelize.where(sequelize.fn('LOWER', sequelize.fn('TRIM', sequelize.col('title'))), finalTitle.toLowerCase()),
          urlUpdateWhere
        ]
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Another e-content record with the same EmpID, Title, Date, and URL already exists.'
      });
    }

    await record.update({
      facultyId: targetFacultyId,
      employeeId: targetEmpId,
      normalizedEmployeeId: targetNormEmpId,
      facultyName: targetFacultyName,
      designation: targetDesignation,
      department: targetDept,
      title: finalTitle,
      eContentPlatform: eContentPlatform ? String(eContentPlatform).trim() : record.eContentPlatform,
      publicationDate: finalDate,
      url: finalUrl,
      contentType: contentType ? String(contentType).trim() : record.contentType,
      proofUrl: proofUrl !== undefined ? (proofUrl ? String(proofUrl).trim() : null) : record.proofUrl,
      calendarYear: finalYear,
      customFields: customFields !== undefined ? customFields : record.customFields
    });

    res.json({
      success: true,
      message: 'E-Content record updated successfully.',
      data: record
    });
  } catch (error) {
    console.error('Update e-content error:', error);
    res.status(500).json({ success: false, message: 'Failed to update e-content record.' });
  }
};

// DELETE /api/e-contents/:id
exports.deleteEContent = async (req, res) => {
  try {
    const record = await EContent.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'E-Content record not found.' });
    }

    const access = checkRecordAccess(record, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    await record.destroy();
    res.json({ success: true, message: 'E-Content record deleted successfully.' });
  } catch (error) {
    console.error('Delete e-content error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete e-content record.' });
  }
};

// DELETE /api/e-contents/clear-all
// @desc    Clear all e-contents records (Admin only)
exports.clearAllEContents = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden: Only administrators can clear all E-Content records.' });
    }

    let deletedCount = 0;
    await sequelize.transaction(async (t) => {
      await EContentFaculty.destroy({ where: {}, transaction: t });
      deletedCount = await EContent.destroy({ where: {}, transaction: t });
    });

    try {
      const { logActionSafe } = require('../middleware/auditLogger');
      await logActionSafe({
        user: req.user,
        action: 'CLEAR_ALL_E_CONTENTS',
        title: 'Cleared E-Contents records',
        remarks: `Permanently deleted ${deletedCount} e-contents and related faculty associations.`,
        ipAddress: req.ip
      });
    } catch (e) {
      console.warn('Audit log error on clear e-contents:', e);
    }

    res.json({
      success: true,
      message: `All E-Contents records (${deletedCount}) cleared successfully.`,
      count: deletedCount
    });
  } catch (error) {
    console.error('Clear all e-contents error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear e-contents records.' });
  }
};

// POST /api/e-contents/bulk/validate
exports.validateBulkEContents = async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No spreadsheet rows provided for validation.' });
    }

    const [activePlatforms, activeContentTypes] = await Promise.all([
      getActivePlatforms(),
      getActiveContentTypes()
    ]);
    const platformSet = new Set(activePlatforms.map(p => p.toLowerCase().trim()));
    const contentTypeSet = new Set(activeContentTypes.map(c => c.toLowerCase().trim()));

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
          attributes: ['id', 'employeeId', 'name', 'designation', 'department']
        })
      : [];

    const facultyMap = new Map();
    facultyRecords.forEach(f => {
      facultyMap.set(normalizeEmpId(f.employeeId), f);
    });

    const existingRecords = await EContent.findAll({
      attributes: ['normalizedEmployeeId', 'title', 'publicationDate', 'url'],
      raw: true
    });

    const existingKeys = new Set(
      existingRecords.map(e => {
        const urlKey = e.url ? String(e.url).trim().toLowerCase() : '';
        return `${e.normalizedEmployeeId}|${String(e.title).trim().toLowerCase()}|${e.publicationDate}|${urlKey}`;
      })
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
      const rawFacultyName = String(r.facultyName || r.FacultyName || r['Faculty Name'] || r.teacherName || r['Teacher Name'] || '').trim();
      const rawDept = String(r.department || r.Department || r['Department'] || '').trim();
      const title = String(r.title || r.Title || r['Title'] || r.moduleTitle || r['Module Title'] || r.name || r['Name'] || '').trim();
      const platform = String(r.eContentPlatform || r.EContentPlatform || r['E-Content Platform'] || r.platform || r['Platform'] || '').trim();
      const rawDate = r.publicationDate || r.PublicationDate || r['Publication Date'] || r.date || r.Date || r.launchDate || r['Launch Date'] || '';
      const url = String(r.url || r.Url || r.URL || r['URL'] || r.link || r['Link'] || '').trim();
      const contentType = String(r.contentType || r.ContentType || r['Content Type'] || r.type || r['Type'] || '').trim();
      const rawProof = String(r.proofUrl || r.ProofUrl || r['Proof URL'] || r.proof || r['Proof'] || '').trim();

      const errors = [];
      let rowStatus = 'ready';
      let failureCategory = null;

      // 1. EmpID
      let isGuestFaculty = false;
      if (!rawEmpId || rawEmpId.toLowerCase() === 'nil' || rawEmpId.toLowerCase() === 'n/a') {
        errors.push('EmpID is missing or blank.');
        rowStatus = 'needs_review';
        failureCategory = 'missing_empid';
        missingEmpIdCount++;
      } else {
        const norm = normalizeEmpId(rawEmpId);
        const faculty = facultyMap.get(norm);
        if (!faculty) {
          isGuestFaculty = true;
          // When EmpID is not found in existing data, include them as Guest Faculty
        }
      }

      // 2. Required Fields
      if (!title || title.toLowerCase() === 'nil') {
        errors.push('Title is required.');
        if (rowStatus === 'ready') { rowStatus = 'needs_review'; failureCategory = 'other'; otherErrorCount++; }
      }

      // Smart platform normalization
      const effectivePlatform = normalizePlatform(platform, activePlatforms);

      if (!effectivePlatform || effectivePlatform.toLowerCase() === 'nil') {
        errors.push('E-Content Platform is required.');
        if (rowStatus === 'ready') { rowStatus = 'needs_review'; failureCategory = 'other'; otherErrorCount++; }
      } else if (!platformSet.has(effectivePlatform.toLowerCase())) {
        errors.push(`Invalid Platform "${platform}". Allowed: ${activePlatforms.join(', ')}.`);
        if (rowStatus === 'ready') { rowStatus = 'needs_review'; failureCategory = 'other'; otherErrorCount++; }
      }

      const isoDate = parseDateToISO(rawDate);
      if (!isoDate) {
        errors.push('Invalid Publication Date.');
        if (rowStatus === 'ready') { rowStatus = 'needs_review'; failureCategory = 'other'; otherErrorCount++; }
      }

      let effectiveUrl = '';
      if (url && url.toLowerCase() !== 'nil' && url.toLowerCase() !== 'n/a') {
        let u = url;
        if (!u.startsWith('http://') && !u.startsWith('https://')) {
          u = 'https://' + u;
        }
        if (!isValidUrl(u)) {
          errors.push('Invalid published URL format (must start with http:// or https://).');
          if (rowStatus === 'ready') { rowStatus = 'needs_review'; failureCategory = 'other'; otherErrorCount++; }
        } else {
          effectiveUrl = u;
        }
      }

      // Smart content type normalization
      const effectiveContentType = normalizeContentType(contentType, activeContentTypes);

      if (!effectiveContentType || effectiveContentType.toLowerCase() === 'nil') {
        errors.push('Content Type is required.');
        if (rowStatus === 'ready') { rowStatus = 'needs_review'; failureCategory = 'other'; otherErrorCount++; }
      } else if (!contentTypeSet.has(effectiveContentType.toLowerCase())) {
        errors.push(`Invalid Content Type "${contentType}". Allowed: ${activeContentTypes.join(', ')}.`);
        if (rowStatus === 'ready') { rowStatus = 'needs_review'; failureCategory = 'other'; otherErrorCount++; }
      }

      if (rawProof && rawProof.toLowerCase() !== 'nil' && !isValidUrl(rawProof)) {
        errors.push('Invalid Proof URL format (must start with http:// or https://).');
        if (rowStatus === 'ready') { rowStatus = 'needs_review'; failureCategory = 'other'; otherErrorCount++; }
      }

      // 3. Duplicate Detection
      if (rowStatus === 'ready') {
        const normEmp = normalizeEmpId(rawEmpId);
        const normUrl = effectiveUrl ? effectiveUrl.toLowerCase() : '';
        const dedupKey = `${normEmp}|${title.toLowerCase()}|${isoDate}|${normUrl}`;
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
      const effectiveFacultyName = faculty ? faculty.name : (rawFacultyName || 'Guest Faculty');
      const effectiveDesignation = faculty ? (faculty.designation || 'Faculty') : 'Guest Faculty';
      const effectiveDept = faculty ? faculty.department : (rawDept || null);

      validatedRows.push({
        _rowNumber: rowNum,
        _rowStatus: rowStatus,
        _failureCategory: failureCategory,
        _errors: errors,
        _issues: errors,
        employeeId: rawEmpId,
        facultyName: effectiveFacultyName,
        department: effectiveDept,
        designation: effectiveDesignation,
        isGuestFaculty,
        title,
        eContentPlatform: effectivePlatform || platform,
        publicationDate: isoDate || rawDate,
        calendarYear: isoDate ? deriveCalendarYear(isoDate) : null,
        url: effectiveUrl,
        contentType: effectiveContentType || contentType,
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
    console.error('Validate bulk e-contents error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate bulk e-contents spreadsheet.' });
  }
};

// POST /api/e-contents/bulk/import
exports.bulkImportEContents = async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows provided for import.' });
    }

    const [activePlatforms, activeContentTypes] = await Promise.all([
      getActivePlatforms(),
      getActiveContentTypes()
    ]);
    const platformSet = new Set(activePlatforms.map(p => p.toLowerCase().trim()));
    const contentTypeSet = new Set(activeContentTypes.map(c => c.toLowerCase().trim()));

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
          attributes: ['id', 'employeeId', 'name', 'designation', 'department']
        })
      : [];

    const facultyMap = new Map();
    facultyRecords.forEach(f => {
      facultyMap.set(normalizeEmpId(f.employeeId), f);
    });

    const existingRecords = await EContent.findAll({
      attributes: ['normalizedEmployeeId', 'title', 'publicationDate', 'url'],
      raw: true
    });

    const existingKeys = new Set(
      existingRecords.map(e => {
        const urlKey = e.url ? String(e.url).trim().toLowerCase() : '';
        return `${e.normalizedEmployeeId}|${String(e.title).trim().toLowerCase()}|${e.publicationDate}|${urlKey}`;
      })
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
      const rawFacultyName = String(r.facultyName || r.FacultyName || r['Faculty Name'] || r.teacherName || r['Teacher Name'] || '').trim();
      const rawDept = String(r.department || r.Department || r['Department'] || '').trim();
      const title = String(r.title || r.Title || r['Title'] || r.moduleTitle || r['Module Title'] || r.name || r['Name'] || '').trim();
      const platform = String(r.eContentPlatform || r.EContentPlatform || r['E-Content Platform'] || r.platform || r['Platform'] || '').trim();
      const rawDate = r.publicationDate || r.PublicationDate || r['Publication Date'] || r.date || r.Date || r.launchDate || r['Launch Date'] || '';
      const url = String(r.url || r.Url || r.URL || r['URL'] || r.link || r['Link'] || '').trim();
      const contentType = String(r.contentType || r.ContentType || r['Content Type'] || r.type || r['Type'] || '').trim();
      const rawProof = String(r.proofUrl || r.ProofUrl || r['Proof URL'] || r.proof || r['Proof'] || '').trim();

      if (!rawEmpId || rawEmpId.toLowerCase() === 'nil' || rawEmpId.toLowerCase() === 'n/a') {
        skippedMissingEmpId++;
        skippedRecords.push({
          rowNumber: rowNum,
          employeeId: rawEmpId || 'N/A',
          title: title || 'N/A',
          problematicField: 'EmpId',
          reason: 'EmpID is missing or blank. Entire row skipped.'
        });
        return;
      }

      const normEmp = normalizeEmpId(rawEmpId);
      const faculty = facultyMap.get(normEmp);
      const isGuestFaculty = !faculty;

      if (!title || title.toLowerCase() === 'nil') {
        rejectedOther++;
        skippedRecords.push({
          rowNumber: rowNum,
          employeeId: rawEmpId,
          title: 'N/A',
          problematicField: 'Title',
          reason: 'Missing required field: Title.'
        });
        return;
      }

      // Smart platform normalization
      const effectivePlatform = normalizePlatform(platform, activePlatforms);

      if (!effectivePlatform || effectivePlatform.toLowerCase() === 'nil') {
        rejectedOther++;
        skippedRecords.push({
          rowNumber: rowNum,
          employeeId: rawEmpId,
          title,
          problematicField: 'E-Content Platform',
          reason: 'Missing required field: E-Content Platform.'
        });
        return;
      }

      const isoDate = parseDateToISO(rawDate);
      if (!isoDate) {
        rejectedOther++;
        skippedRecords.push({
          rowNumber: rowNum,
          employeeId: rawEmpId,
          title,
          problematicField: 'Publication Date',
          reason: `Invalid Publication Date: "${rawDate}".`
        });
        return;
      }

      const derivedYear = deriveCalendarYear(isoDate) || new Date().getFullYear();

      let effectiveUrl = null;
      if (url && url.toLowerCase() !== 'nil' && url.toLowerCase() !== 'n/a') {
        let u = url;
        if (!u.startsWith('http://') && !u.startsWith('https://')) {
          u = 'https://' + u;
        }
        if (!isValidUrl(u)) {
          rejectedOther++;
          skippedRecords.push({
            rowNumber: rowNum,
            employeeId: rawEmpId,
            title,
            problematicField: 'URL',
            reason: `Invalid published URL format: "${u}".`
          });
          return;
        }
        effectiveUrl = u;
      }

      // Smart content type normalization
      const effectiveContentType = normalizeContentType(contentType, activeContentTypes);

      if (!effectiveContentType || effectiveContentType.toLowerCase() === 'nil') {
        rejectedOther++;
        skippedRecords.push({
          rowNumber: rowNum,
          employeeId: rawEmpId,
          title,
          problematicField: 'Content Type',
          reason: 'Missing required field: Content Type.'
        });
        return;
      }

      const cleanProof = rawProof && rawProof.toLowerCase() !== 'nil' ? rawProof : null;
      if (cleanProof && !isValidUrl(cleanProof)) {
        rejectedOther++;
        skippedRecords.push({
          rowNumber: rowNum,
          employeeId: rawEmpId,
          title,
          problematicField: 'Proof URL',
          reason: `Invalid Proof URL format: "${cleanProof}".`
        });
        return;
      }

      // Duplicate Check
      const normUrl = effectiveUrl ? effectiveUrl.toLowerCase() : '';
      const dedupKey = `${normEmp}|${title.toLowerCase()}|${isoDate}|${normUrl}`;
      if (existingKeys.has(dedupKey) || seenInBatch.has(dedupKey)) {
        skippedDuplicate++;
        skippedRecords.push({
          rowNumber: rowNum,
          employeeId: rawEmpId,
          title,
          problematicField: 'Duplicate Record',
          reason: 'Duplicate record detected with identical EmpID, Title, Publication Date, and Published URL.'
        });
        return;
      }

      seenInBatch.add(dedupKey);

      const effectiveFacultyName = faculty ? faculty.name : (rawFacultyName || 'Guest Faculty');
      const effectiveDesignation = faculty ? (faculty.designation || 'Faculty') : 'Guest Faculty';
      const effectiveDept = faculty ? faculty.department : (rawDept || null);

      validToInsert.push({
        _rowNumber: rowNum,
        facultyId: faculty ? faculty.id : null,
        employeeId: String(rawEmpId).substring(0, 64),
        normalizedEmployeeId: String(normEmp).substring(0, 64),
        facultyName: effectiveFacultyName,
        designation: effectiveDesignation ? String(effectiveDesignation).substring(0, 255) : 'Guest Faculty',
        department: effectiveDept ? String(effectiveDept).substring(0, 255) : null,
        originalDepartment: effectiveDept ? String(effectiveDept).substring(0, 255) : null,
        originalDepartmentSource: 'creation_snapshot',
        school: faculty ? (faculty.school ? String(faculty.school).substring(0, 255) : null) : null,
        campus: faculty ? (faculty.campus ? String(faculty.campus).substring(0, 255) : null) : null,
        title: String(title),
        eContentPlatform: String(effectivePlatform).substring(0, 150),
        publicationDate: isoDate,
        url: effectiveUrl || null,
        contentType: String(effectiveContentType).substring(0, 150),
        proofUrl: cleanProof || null,
        calendarYear: parseInt(derivedYear, 10),
        customFields: {},
        createdBy: (req.user && req.user.id && isValidUuid(req.user.id)) ? req.user.id : null
      });
    });

    let insertedRecords = [];
    if (validToInsert.length > 0) {
      for (const item of validToInsert) {
        try {
          const { _rowNumber, ...cleanItem } = item;
          const created = await EContent.create(cleanItem);
          insertedRecords.push(created);

          try {
            await EContentFaculty.create({
              econtentId: created.id,
              facultyId: created.facultyId,
              employeeId: created.employeeId,
              normalizedEmployeeId: created.normalizedEmployeeId,
              facultyName: created.facultyName,
              designation: created.designation,
              department: created.department,
              contributorType: created.facultyId ? 'Verified Faculty' : 'Guest Faculty',
              isGuestFaculty: !created.facultyId,
              displayOrder: 0
            });
          } catch (efErr) {
            console.warn('Failed to insert into econtent_faculties for bulk row:', efErr.message);
          }
        } catch (rowErr) {
          rejectedOther++;
          skippedRecords.push({
            rowNumber: item._rowNumber || 0,
            employeeId: item.employeeId || 'N/A',
            title: item.title || 'N/A',
            problematicField: 'Database Record',
            reason: `Failed to insert record: ${rowErr.message}`
          });
        }
      }
    }

    res.json({
      success: true,
      message: `Bulk import completed. Successfully imported ${insertedRecords.length} e-contents, skipped ${skippedRecords.length} rows.`,
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
    console.error('Bulk import e-contents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to execute bulk e-contents import.',
      error: error.message,
      detail: error.message
    });
  }
};

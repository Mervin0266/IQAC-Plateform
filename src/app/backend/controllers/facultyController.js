const { Faculty } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { resolveDepartmentScope } = require('../utils/scopeHelper');
const { sanitizeFacultyData } = require('../utils/dataSanitizer');
const { logActionSafe } = require('../middleware/auditLogger');
const { parsePagination, formatPaginationResponse, streamBatchedExport } = require('../utils/paginationHelper');

// @desc    Get all faculty
/**
 * Helper to parse academic year start year (e.g. '2025-2026' -> 2025, '2024' -> 2024)
 */
const parseAcademicYearStart = (ay) => {
  if (!ay) return 0;
  const match = String(ay).match(/\b(19\d{2}|20\d{2})\b/);
  return match ? parseInt(match[1], 10) : 0;
};

/**
 * Normalizes Employee ID preserving leading zeros and characters
 */
const normalizeEmployeeId = (empId) => {
  if (empId === null || empId === undefined) return '';
  return String(empId).trim();
};

/**
 * Deduplicate faculty candidate rows by Employee ID across the full authorized dataset.
 * Selection priority:
 * 1. Record matching explicitly selected Academic Year (if filtering by year)
 * 2. Record from the latest valid academic year
 * 3. Deterministic tie-breaker: createdAt DESC, then id DESC
 * Preserves original record UUID for Edit/View/Delete.
 * Detects identity conflicts (different names/departments sharing an Employee ID) safely.
 */
const deduplicateFacultyRecords = (candidateRows, selectedAcademicYear = 'All') => {
  if (!Array.isArray(candidateRows) || candidateRows.length === 0) {
    return [];
  }

  const selectedYearClean = selectedAcademicYear && selectedAcademicYear.toLowerCase() !== 'all'
    ? selectedAcademicYear.trim()
    : null;

  // Group by normalized Employee ID (or record ID if Employee ID is missing)
  const grouped = new Map();

  for (const row of candidateRows) {
    const rawEmpId = row.employeeId;
    const normId = normalizeEmployeeId(rawEmpId);
    const key = normId ? `EMPID:${normId}` : `ID:${row.id}`;

    if (!grouped.has(key)) {
      grouped.set(key, [row]);
    } else {
      grouped.get(key).push(row);
    }
  }

  const canonicalRecords = [];

  for (const [key, rows] of grouped.entries()) {
    if (rows.length === 1) {
      canonicalRecords.push(rows[0]);
      continue;
    }

    // Check for identity conflicts (different names or different departments sharing an Employee ID)
    const baseName = (rows[0].name || '').trim().toLowerCase();
    const baseDept = (rows[0].department || '').trim().toLowerCase();
    let hasConflict = false;

    for (let i = 1; i < rows.length; i++) {
      const otherName = (rows[i].name || '').trim().toLowerCase();
      const otherDept = (rows[i].department || '').trim().toLowerCase();
      if (otherName !== baseName || otherDept !== baseDept) {
        hasConflict = true;
        break;
      }
    }

    // Sort rows within the group by selection priority:
    // 1. Matches explicitly selected Academic Year
    // 2. Latest valid academic year
    // 3. Fallback to createdAt DESC
    // 4. Deterministic id DESC
    rows.sort((a, b) => {
      if (selectedYearClean) {
        const aMatches = a.academicYear && (a.academicYear === selectedYearClean || a.academicYear.startsWith(selectedYearClean.slice(0, 4)));
        const bMatches = b.academicYear && (b.academicYear === selectedYearClean || b.academicYear.startsWith(selectedYearClean.slice(0, 4)));
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
      }

      const yearA = parseAcademicYearStart(a.academicYear);
      const yearB = parseAcademicYearStart(b.academicYear);
      if (yearA !== yearB) {
        return yearB - yearA;
      }

      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (dateA !== dateB) {
        return dateB - dateA;
      }

      return String(b.id || '').localeCompare(String(a.id || ''));
    });

    const chosen = rows[0];
    if (hasConflict) {
      chosen.hasIdentityConflict = true;
    }
    canonicalRecords.push(chosen);
  }

  return canonicalRecords;
};

/**
 * Sort canonical records deterministically according to sortBy parameter
 */
const sortCanonicalRecords = (records, sortBy = 'name-asc') => {
  const [field, dir] = (sortBy || 'name-asc').split('-');
  const isDesc = (dir && dir.toLowerCase() === 'desc');

  return records.sort((a, b) => {
    let valA = a[field];
    let valB = b[field];

    if (field === 'sNo') {
      const numA = parseInt(valA, 10) || 0;
      const numB = parseInt(valB, 10) || 0;
      return isDesc ? numB - numA : numA - numB;
    }

    if (field === 'employeeId') {
      const strA = String(valA || '');
      const strB = String(valB || '');
      const cmp = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
      return isDesc ? -cmp : cmp;
    }

    const strA = String(valA || '').toLowerCase();
    const strB = String(valB || '').toLowerCase();
    const cmp = strA.localeCompare(strB);
    if (cmp !== 0) return isDesc ? -cmp : cmp;

    return String(a.id || '').localeCompare(String(b.id || ''));
  });
};

/**
 * Build query conditions from request for faculty querying & dynamic statistics
 */
const buildFacultyFilterWhere = (req, scopeWhere) => {
  const andConditions = [];
  if (scopeWhere && Object.keys(scopeWhere).length > 0) {
    andConditions.push(scopeWhere);
  }

  // Academic Year Filter
  if (req.query.academicYear && req.query.academicYear !== 'all' && req.query.academicYear !== 'All') {
    const y = req.query.academicYear.trim();
    andConditions.push({
      [Op.or]: [
        { academicYear: y },
        { academicYear: { [Op.iLike]: `${y.slice(0, 4)}%` } }
      ]
    });
  }

  // Department Filter
  if ((req.user?.role === 'admin' || req.user?.role === 'authority') &&
      req.query.department && req.query.department !== 'all' && req.query.department !== 'All') {
    andConditions.push({
      department: { [Op.iLike]: req.query.department.trim() }
    });
  }

  // Designation Filter (Exact normalized comparison - Professor matches only Professor)
  if (req.query.designation && req.query.designation !== 'all' && req.query.designation !== 'All' && req.query.designation !== 'All Designations') {
    const desig = req.query.designation.trim();
    andConditions.push({
      designation: { [Op.iLike]: desig }
    });
  }

  // Gender Filter (Exact validated values: Male, Female, Other; All keeps all including null)
  if (req.query.gender && req.query.gender.toLowerCase() !== 'all' && req.query.gender.toLowerCase() !== 'all genders') {
    const rawG = req.query.gender.trim();
    const normalizedGender = rawG.charAt(0).toUpperCase() + rawG.slice(1).toLowerCase();
    if (['Male', 'Female', 'Other'].includes(normalizedGender)) {
      andConditions.push({
        gender: normalizedGender
      });
    }
  }

  // Full-Text Search across major faculty fields
  const searchVal = (req.query.search || req.query.q || '').trim();
  if (searchVal) {
    const term = `%${searchVal}%`;
    andConditions.push({
      [Op.or]: [
        { name: { [Op.iLike]: term } },
        { employeeId: { [Op.iLike]: term } },
        { department: { [Op.iLike]: term } },
        { designation: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } },
        { highestQualification: { [Op.iLike]: term } },
        { qualificationLevel: { [Op.iLike]: term } }
      ]
    });
  }

  return {
    andConditions,
    where: andConditions.length > 0 ? { [Op.and]: andConditions } : {}
  };
};

const buildFacultySortOrder = (req) => {
  let order = [['sNo', 'ASC'], ['id', 'ASC']];
  if (req.query.sortBy) {
    const [field, dir] = req.query.sortBy.split('-');
    const validFields = ['sNo', 'name', 'department', 'designation', 'academicYear', 'employeeId'];
    const direction = (dir && dir.toLowerCase() === 'desc') ? 'DESC' : 'ASC';
    if (validFields.includes(field)) {
      order = [[field, direction], ['id', 'ASC']];
    }
  }
  return order;
};

// Helper to compute unified faculty KPI stats and contextual breakdowns
const computeFacultyStatsAndBreakdowns = (canonicalRecords) => {
  const total = canonicalRecords.length;
  let phdCount = 0;
  let seniorCount = 0;
  let totalExpYears = 0;
  let totalCuExp = 0;
  let totalPrevTeachingExp = 0;
  let totalPrevIndustryExp = 0;

  const deptCounts = {};
  const desigCounts = {};
  const stateDiversity = {};
  const countryDiversity = {};
  const phdByDept = {};
  const seniorByDept = {};
  const desigPhdCounts = {};
  const genderCounts = { Male: 0, Female: 0, Other: 0 };
  const deptGenderCounts = {};
  const cadreBreakdown = {
    professors: 0,
    associateProfessors: 0,
    assistantProfessors: 0,
    professorsOfPractice: 0,
    leadership: 0,
    other: 0
  };
  const expBrackets = {
    under5: 0,
    from5to10: 0,
    from10to15: 0,
    over15: 0
  };

  for (const f of canonicalRecords) {
    const qualLevel = (f.qualificationLevel || '').toUpperCase().replace(/\./g, '');
    const highestQual = (f.highestQualification || '').toUpperCase().replace(/\./g, '');
    const isPhd = qualLevel.includes('PHD') || highestQual.includes('DOCTOR') || highestQual.includes('PHD');
    if (isPhd) {
      phdCount++;
      if (f.department) phdByDept[f.department] = (phdByDept[f.department] || 0) + 1;
      if (f.designation) desigPhdCounts[f.designation] = (desigPhdCounts[f.designation] || 0) + 1;
    }

    // Senior Cadre definition preservation: Professor, Head, Dean
    const desig = (f.designation || '').toLowerCase();
    const isSenior = desig.includes('professor') || desig.includes('head') || desig.includes('dean');
    if (isSenior) {
      seniorCount++;
      if (f.department) seniorByDept[f.department] = (seniorByDept[f.department] || 0) + 1;
    }

    if (desig.includes('assistant professor')) cadreBreakdown.assistantProfessors++;
    else if (desig.includes('associate professor')) cadreBreakdown.associateProfessors++;
    else if (desig.includes('professor of practice')) cadreBreakdown.professorsOfPractice++;
    else if (desig.includes('professor')) cadreBreakdown.professors++;
    else if (desig.includes('head') || desig.includes('dean')) cadreBreakdown.leadership++;
    else cadreBreakdown.other++;

    const g = (f.gender || 'Not Specified').trim();
    if (g.toLowerCase() === 'female') genderCounts.Female = (genderCounts.Female || 0) + 1;
    else if (g.toLowerCase() === 'male') genderCounts.Male = (genderCounts.Male || 0) + 1;
    else genderCounts.Other = (genderCounts.Other || 0) + 1;

    if (f.department && f.department !== 'NIL' && f.department !== 'N/A') {
      deptCounts[f.department] = (deptCounts[f.department] || 0) + 1;
      if (!deptGenderCounts[f.department]) deptGenderCounts[f.department] = { Male: 0, Female: 0, Other: 0 };
      if (g.toLowerCase() === 'female') deptGenderCounts[f.department].Female++;
      else if (g.toLowerCase() === 'male') deptGenderCounts[f.department].Male++;
      else deptGenderCounts[f.department].Other++;
    }

    if (f.designation && f.designation !== 'NIL' && f.designation !== 'N/A') {
      desigCounts[f.designation] = (desigCounts[f.designation] || 0) + 1;
    }

    const prevY = parseFloat(f.prevTeachingExpYears || '0') || 0;
    const prevInd = parseFloat(f.prevIndustryExpYears || '0') || 0;
    const cuY = parseFloat(f.cuExpYears || '0') || 0;
    totalExpYears += (prevY + prevInd + cuY);
    totalCuExp += cuY;
    totalPrevTeachingExp += prevY;
    totalPrevIndustryExp += prevInd;

    const fExp = prevY + prevInd + cuY;
    if (fExp < 5) expBrackets.under5++;
    else if (fExp < 10) expBrackets.from5to10++;
    else if (fExp < 15) expBrackets.from10to15++;
    else expBrackets.over15++;

    const state = (f.permanentState || '').trim();
    if (state && state.toLowerCase() !== 'nil' && state.toLowerCase() !== 'n/a') {
      stateDiversity[state] = (stateDiversity[state] || 0) + 1;
    }

    const country = (f.permanentCountry || f.nationality || '').trim();
    if (country && country.toLowerCase() !== 'nil' && country.toLowerCase() !== 'n/a') {
      countryDiversity[country] = (countryDiversity[country] || 0) + 1;
    }
  }

  const avgExp = total > 0 ? (totalExpYears / total).toFixed(1) : '0';

  const stats = {
    total,
    phdCount,
    phdPercent: total > 0 ? ((phdCount / total) * 100).toFixed(1) : '0',
    seniorCadre: seniorCount,
    seniorPercent: total > 0 ? ((seniorCount / total) * 100).toFixed(1) : '0',
    depts: Object.keys(deptCounts).length,
    avgExp,
    breakdowns: {
      facultyDetails: {
        total,
        active: total,
        inactive: 0,
        genderCounts,
        deptCounts,
        desigCounts
      },
      doctorates: {
        phdCount,
        nonPhdCount: total - phdCount,
        phdPercent: total > 0 ? ((phdCount / total) * 100).toFixed(1) : '0',
        phdByDept,
        desigPhdCounts
      },
      seniorCadre: {
        seniorCount,
        otherCadre: total - seniorCount,
        seniorPercent: total > 0 ? ((seniorCount / total) * 100).toFixed(1) : '0',
        cadreBreakdown,
        seniorByDept
      },
      departments: {
        count: Object.keys(deptCounts).length,
        deptCounts,
        deptGenderCounts
      },
      avgExperience: {
        avgExp,
        cuAvgExp: total > 0 ? (totalCuExp / total).toFixed(1) : '0',
        prevTeachingAvgExp: total > 0 ? (totalPrevTeachingExp / total).toFixed(1) : '0',
        prevIndustryAvgExp: total > 0 ? (totalPrevIndustryExp / total).toFixed(1) : '0',
        expBrackets,
        facultyCount: total
      }
    }
  };

  return {
    stats,
    deptCounts,
    desigCounts,
    stateDiversity,
    countryDiversity
  };
};

// @desc    Get all faculty with dynamic filters, server-side deduplication, and pagination
// @route   GET /api/faculty
// @access  Private
exports.getFaculty = async (req, res) => {
  try {
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'Faculty', false);
    const { andConditions, where } = buildFacultyFilterWhere(req, scopeWhere);

    const pagination = parsePagination(req.query);

    // Fetch all matching candidate records across the full authorized dataset
    const allCandidates = await Faculty.findAll({
      where,
      order: [['academicYear', 'DESC'], ['createdAt', 'DESC'], ['id', 'ASC']]
    });

    // Deduplicate candidate records by normalized Employee ID across full dataset BEFORE pagination
    const canonicalRecords = deduplicateFacultyRecords(allCandidates, req.query.academicYear);

    // Sort canonical records per user requested sortBy parameter
    const sortedRecords = sortCanonicalRecords(canonicalRecords, req.query.sortBy || 'name-asc');
    const total = sortedRecords.length;

    // Handle full export if requested
    if (pagination.isExport || req.query.stream === 'true' || req.query.export === 'true') {
      const sanitizedExport = sanitizeFacultyData(sortedRecords, req.user, false);
      return res.json({
        success: true,
        count: sanitizedExport.length,
        total: sanitizedExport.length,
        data: sanitizedExport
      });
    }

    const { page, limit } = pagination;
    const offset = (page - 1) * limit;
    const paginatedRows = sortedRecords.slice(offset, offset + limit);

    const allYearsRows = await Faculty.findAll({
      attributes: ['academicYear'],
      group: ['academicYear'],
      raw: true
    });

    const {
      stats,
      deptCounts,
      desigCounts,
      stateDiversity,
      countryDiversity
    } = computeFacultyStatsAndBreakdowns(canonicalRecords);

    // Sensitive field protection: Never expose PAN in ordinary faculty list responses (Phase A5)
    const sanitized = sanitizeFacultyData(paginatedRows, req.user, false);

    const responsePayload = formatPaginationResponse({
      count: total,
      rows: sanitized,
      page,
      limit
    });

    responsePayload.stats = stats;
    responsePayload.distribution = {
      departments: deptCounts,
      designations: desigCounts,
      academicYears: allYearsRows.map(r => r.academicYear).filter(Boolean),
      stateDiversity,
      countryDiversity
    };

    res.json(responsePayload);
  } catch (error) {
    console.error('Get faculty error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Get standalone faculty KPI stats matching active filters
// @route   GET /api/faculty/stats
// @access  Private
exports.getFacultyStats = async (req, res) => {
  try {
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'Faculty', false);
    const { where } = buildFacultyFilterWhere(req, scopeWhere);

    const allCandidates = await Faculty.findAll({
      where,
      order: [['academicYear', 'DESC'], ['createdAt', 'DESC'], ['id', 'ASC']]
    });

    const canonicalRecords = deduplicateFacultyRecords(allCandidates, req.query.academicYear);
    const total = canonicalRecords.length;

    const allYearsRows = await Faculty.findAll({
      attributes: ['academicYear'],
      group: ['academicYear'],
      raw: true
    });

    const {
      stats,
      deptCounts,
      desigCounts,
      stateDiversity,
      countryDiversity
    } = computeFacultyStatsAndBreakdowns(canonicalRecords);

    res.json({
      success: true,
      stats,
      distribution: {
        departments: deptCounts,
        designations: desigCounts,
        academicYears: allYearsRows.map(r => r.academicYear).filter(Boolean),
        stateDiversity,
        countryDiversity
      }
    });
  } catch (error) {
    console.error('Get faculty stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

/**
 * Sanitizes and normalizes faculty data for database persistence (single create, edit, and bulk upload)
 * Prevents PostgreSQL date parse errors ('Invalid date'), enum violations, and whitespace issues.
 */
const sanitizeFacultyRecord = (raw, isNew = true) => {
  if (!raw) return null;
  const record = { ...raw };

  if (record.employeeId !== undefined) {
    record.employeeId = String(record.employeeId || '').trim();
  }
  if (record.name !== undefined) {
    record.name = String(record.name || '').trim();
  }
  if (record.designation !== undefined) {
    record.designation = String(record.designation || '').trim();
  }
  if (record.department !== undefined) {
    record.department = String(record.department || '').trim();
  }
  if (isNew && !record.academicYear) {
    record.academicYear = '2024-2025';
  } else if (record.academicYear !== undefined) {
    record.academicYear = String(record.academicYear || '').trim() || '2024-2025';
  }

  // Date fields: dateOfBirth, dateOfJoining -> null if empty, invalid, or nil
  ['dateOfBirth', 'dateOfJoining'].forEach(df => {
    if (record[df] !== undefined) {
      const val = record[df];
      if (!val || String(val).toLowerCase() === 'nil' || String(val).toLowerCase() === 'n/a' || String(val).toLowerCase() === 'invalid date' || String(val).trim() === '') {
        record[df] = null;
      } else {
        const d = new Date(val);
        if (isNaN(d.getTime())) {
          record[df] = null;
        } else {
          record[df] = d.toISOString().split('T')[0];
        }
      }
    } else if (isNew) {
      record[df] = null;
    }
  });

  // ENUM gender: 'Male', 'Female', 'Other' (or null)
  if (record.gender !== undefined) {
    const rawG = String(record.gender || '').trim();
    const normalized = rawG.charAt(0).toUpperCase() + rawG.slice(1).toLowerCase();
    if (['Male', 'Female', 'Other'].includes(normalized)) {
      record.gender = normalized;
    } else {
      record.gender = null;
    }
  } else if (isNew) {
    record.gender = null;
  }

  // ENUM status: 'Active', 'On Sabbatical', 'Relieved'
  if (record.status !== undefined) {
    const s = String(record.status || '').trim();
    const matchedStatus = ['Active', 'On Sabbatical', 'Relieved'].find(opt => opt.toLowerCase() === s.toLowerCase());
    record.status = matchedStatus || 'Active';
  } else if (isNew) {
    record.status = 'Active';
  }

  // Nullable string fields
  ['panCardNo', 'qualificationLevel', 'highestQualification', 'specialization', 'email', 'phone', 'nationality', 'permanentCity', 'permanentState', 'permanentCountry', 'officialEmailId'].forEach(k => {
    if (record[k] !== undefined) {
      const val = String(record[k] || '').trim();
      record[k] = val && val.toLowerCase() !== 'nil' && val.toLowerCase() !== 'n/a' ? val : null;
    }
  });

  // Experience number strings
  ['prevTeachingExpYears', 'prevTeachingExpMonths', 'prevIndustryExpYears', 'prevIndustryExpMonths', 'cuExpYears', 'cuExpMonths', 'totalCurrentExpYears', 'totalCurrentExpMonths'].forEach(k => {
    if (record[k] !== undefined) {
      const val = String(record[k] || '').trim();
      if (!val || isNaN(Number(val))) {
        record[k] = '0';
      } else {
        record[k] = String(Number(val));
      }
    } else if (isNew) {
      record[k] = '0';
    }
  });

  // Dynamic Age calculation from dateOfBirth (or preserve entered age)
  if (record.dateOfBirth) {
    const dob = new Date(record.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      const today = new Date();
      let calculatedAge = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge >= 0 && calculatedAge < 120) {
        record.age = calculatedAge;
      }
    }
  } else if (record.age !== undefined && record.age !== null && record.age !== '') {
    const parsedAge = parseInt(record.age, 10);
    record.age = !isNaN(parsedAge) ? parsedAge : null;
  }

  // Dynamic CU Experience calculation from dateOfJoining if not explicitly given
  if (record.dateOfJoining && (!record.cuExpYears || record.cuExpYears === '0')) {
    const doj = new Date(record.dateOfJoining);
    if (!isNaN(doj.getTime())) {
      const today = new Date();
      let y = today.getFullYear() - doj.getFullYear();
      let m = today.getMonth() - doj.getMonth();
      if (today.getDate() < doj.getDate()) {
        m--;
      }
      if (m < 0) {
        y--;
        m += 12;
      }
      if (y >= 0) {
        record.cuExpYears = String(y);
        record.cuExpMonths = String(m);
      }
    }
  }

  // Calculate Total Current Experience if not explicitly given
  if (!record.totalCurrentExpYears || record.totalCurrentExpYears === '0') {
    const prevTeachM = (parseInt(record.prevTeachingExpYears || '0', 10) * 12) + parseInt(record.prevTeachingExpMonths || '0', 10);
    const prevIndM = (parseInt(record.prevIndustryExpYears || '0', 10) * 12) + parseInt(record.prevIndustryExpMonths || '0', 10);
    const cuM = (parseInt(record.cuExpYears || '0', 10) * 12) + parseInt(record.cuExpMonths || '0', 10);
    const totalM = prevTeachM + prevIndM + cuM;
    if (totalM > 0) {
      record.totalCurrentExpYears = String(Math.floor(totalM / 12));
      record.totalCurrentExpMonths = String(totalM % 12);
    }
  }

  if (isNew && (record.customFields === undefined || record.customFields === null || typeof record.customFields !== 'object')) {
    record.customFields = {};
  }

  return record;
};

// @desc    Create faculty
// @route   POST /api/faculty
// @access  Private
exports.createFaculty = async (req, res) => {
  try {
    const rawBody = req.body || {};
    const cleanEmpId = String(rawBody.employeeId || '').trim();
    const cleanName = String(rawBody.name || '').trim();
    const cleanDesignation = String(rawBody.designation || '').trim();
    let cleanDept = String(rawBody.department || '').trim();

    if (!cleanEmpId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required.' });
    }
    if (!cleanName) {
      return res.status(400).json({ success: false, message: 'Faculty Name is required.' });
    }
    if (!cleanDesignation) {
      return res.status(400).json({ success: false, message: 'Designation is required.' });
    }

    if (req.user && req.user.role !== 'admin' && req.user.department) {
      cleanDept = req.user.department;
    }
    if (!cleanDept) {
      return res.status(400).json({ success: false, message: 'Department is required.' });
    }

    const maxSNoFaculty = await Faculty.findOne({
      where: { sNo: { [Op.ne]: null } },
      order: [['sNo', 'DESC']]
    });
    const nextSNo = maxSNoFaculty && typeof maxSNoFaculty.sNo === 'number' && !isNaN(maxSNoFaculty.sNo)
      ? maxSNoFaculty.sNo + 1
      : 1;

    const record = sanitizeFacultyRecord({
      ...rawBody,
      employeeId: cleanEmpId,
      name: cleanName,
      designation: cleanDesignation,
      department: cleanDept,
      sNo: rawBody.sNo || nextSNo,
      academicYear: rawBody.academicYear || '2024-2025'
    }, true);
    delete record.id;

    const existing = await Faculty.findOne({
      where: {
        employeeId: record.employeeId,
        academicYear: record.academicYear
      }
    });

    if (existing) {
      if (req.user && req.user.role !== 'admin' && existing.department !== req.user.department) {
        return res.status(403).json({ success: false, message: 'Not authorized to update faculty in another department.' });
      }
      await existing.update(record);
      await logActionSafe({
        user: req.user,
        action: 'UPDATE',
        entityType: 'Faculty',
        entityId: existing.id,
        title: `Updated faculty: ${existing.name}`,
        remarks: `Updated existing profile for Employee ID ${existing.employeeId} in AY ${existing.academicYear}`
      });
      return res.json({
        success: true,
        data: sanitizeFacultyData(existing, req.user)
      });
    }

    const faculty = await Faculty.create(record);
    await logActionSafe({
      user: req.user,
      action: 'CREATE',
      entityType: 'Faculty',
      entityId: faculty.id,
      title: `Created faculty: ${faculty.name}`,
      remarks: `Registered new faculty profile for Employee ID ${faculty.employeeId}`
    });

    res.status(201).json({
      success: true,
      data: sanitizeFacultyData(faculty, req.user)
    });
  } catch (error) {
    console.error('Create faculty error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Bulk create faculty from CSV upload
// @route   POST /api/faculty/bulk
// @access  Private (admin/coordinator)
exports.bulkCreateFaculty = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { faculty: facultyList } = req.body;
    if (!Array.isArray(facultyList) || facultyList.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No faculty records provided'
      });
    }

    const maxSNoFaculty = await Faculty.findOne({
      where: { sNo: { [Op.ne]: null } },
      order: [['sNo', 'DESC']],
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    let nextSNo = maxSNoFaculty && typeof maxSNoFaculty.sNo === 'number' && !isNaN(maxSNoFaculty.sNo)
      ? maxSNoFaculty.sNo + 1
      : 1;

    const errors = [];
    const created = [];
    const validRows = [];
    const empIds = new Set();

    // Step 1: Pre-process and sanitize records in memory
    for (let i = 0; i < facultyList.length; i++) {
      const raw = facultyList[i];
      if (!raw || !raw.employeeId || !String(raw.employeeId).trim()) {
        errors.push(`Row ${i + 1}: employeeId is required.`);
        continue;
      }

      if (!raw.name || !String(raw.name).trim()) {
        errors.push(`Row ${i + 1} (${raw.employeeId}): name is required.`);
        continue;
      }

      const record = sanitizeFacultyRecord(raw, true);

      if (req.user && req.user.role !== 'admin' && req.user.department) {
        record.department = req.user.department;
      }

      const empId = record.employeeId;
      empIds.add(empId);
      validRows.push({ index: i, record });
    }

    // Step 2: Batch look up all employeeIds in 1 query
    const allEmpIds = Array.from(empIds);
    const existingFacultyRecords = await Faculty.findAll({
      where: { employeeId: { [Op.in]: allEmpIds } },
      transaction: t
    });

    const compositeMap = new Map();
    const anyDeptMap = new Map();
    for (const ef of existingFacultyRecords) {
      compositeMap.set(`${ef.employeeId}_${ef.academicYear}`, ef);
      if (!anyDeptMap.has(ef.employeeId)) {
        anyDeptMap.set(ef.employeeId, ef.department);
      }
    }

    const toCreate = [];

    // Step 3: Fast in-memory matching and updates
    for (const { index, record } of validRows) {
      try {
        const compKey = `${record.employeeId}_${record.academicYear}`;
        const existing = compositeMap.get(compKey);

        if (existing) {
          if (req.user && req.user.role !== 'admin' && existing.department !== req.user.department) {
            errors.push(`Row ${index + 1} (${record.employeeId}): Not authorized to update faculty in another department.`);
            continue;
          }
          if (existing.sNo === null || existing.sNo === undefined) {
            record.sNo = nextSNo++;
          } else {
            record.sNo = existing.sNo;
          }
          await existing.update(record, { transaction: t });
          created.push(existing);
        } else {
          const anyDept = anyDeptMap.get(record.employeeId);
          if (anyDept && req.user && req.user.role !== 'admin' && anyDept !== req.user.department) {
            errors.push(`Row ${index + 1} (${record.employeeId}): Faculty belongs to another department (${anyDept}).`);
            continue;
          }

          if (!record.sNo) {
            record.sNo = nextSNo++;
          }
          toCreate.push(record);
        }
      } catch (err) {
        errors.push(`Row ${index + 1} (${record.employeeId || 'unknown'}): ${err.message || 'Validation error'}`);
      }
    }

    if (toCreate.length > 0) {
      const inserted = await Faculty.bulkCreate(toCreate, { transaction: t, returning: true });
      created.push(...inserted);
    }

    if (created.length === 0 && errors.length > 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'All faculty records failed validation or authorization.',
        count: 0,
        errors
      });
    }

    await t.commit();

    await logActionSafe({
      user: req.user,
      action: 'BULK_UPLOAD_FACULTY',
      title: `Bulk uploaded faculty records`,
      remarks: `Processed ${created.length} faculty members with ${errors.length} errors.`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `${created.length} faculty record(s) uploaded successfully.${errors.length ? ` ${errors.length} error(s) encountered.` : ''}`,
      count: created.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }
    console.error('Bulk create faculty error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update faculty
// @route   PUT /api/faculty/:id
// @access  Private
exports.updateFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findByPk(req.params.id);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty record not found'
      });
    }

    if (req.user && req.user.role !== 'admin' && faculty.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot update faculty records outside your department.'
      });
    }

    const sanitizedUpdate = sanitizeFacultyRecord(req.body, false);
    delete sanitizedUpdate.id;

    if (req.user && req.user.role !== 'admin' && req.user.department) {
      sanitizedUpdate.department = req.user.department;
    }

    await faculty.update(sanitizedUpdate);
    await logActionSafe({
      user: req.user,
      action: 'UPDATE',
      entityType: 'Faculty',
      entityId: faculty.id,
      title: `Updated faculty: ${faculty.name}`,
      remarks: `Updated profile for Employee ID ${faculty.employeeId}`
    });

    res.json({
      success: true,
      data: sanitizeFacultyData(faculty, req.user)
    });
  } catch (error) {
    console.error('Update faculty error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Delete faculty
// @route   DELETE /api/faculty/:id
// @access  Private
exports.deleteFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findByPk(req.params.id);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty record not found'
      });
    }

    if (req.user && req.user.role !== 'admin' && faculty.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot delete faculty records outside your department.'
      });
    }

    await faculty.destroy();
    res.json({
      success: true,
      message: 'Faculty record deleted'
    });
  } catch (error) {
    console.error('Delete faculty error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Clear all faculty records
// @route   DELETE /api/faculty/clear-all
// @access  Private (Admin/Coordinator/HOD)
exports.clearAllFaculty = async (req, res) => {
  try {
    const { where, scopeDescription } = await resolveDepartmentScope(req, 'Faculty', true);

    let deletedCount = 0;
    await sequelize.transaction(async (t) => {
      deletedCount = await Faculty.destroy({ where, transaction: t });
    });

    await logActionSafe({
      user: req.user,
      action: 'CLEAR_ALL_FACULTY',
      title: `Cleared faculty records: ${scopeDescription}`,
      remarks: `Deleted ${deletedCount} faculty records. Scope: ${scopeDescription}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Faculty records (${deletedCount}) cleared successfully for ${scopeDescription}`,
      count: deletedCount
    });
  } catch (error) {
    console.error('Clear all faculty error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// GET /api/faculty/:id/contributions
exports.getFacultyContributions = async (req, res) => {
  try {
    const target = req.params.id;
    if (!target) {
      return res.status(400).json({ success: false, message: 'Faculty ID or EmpID is required.' });
    }

    const {
      Publication,
      PublicationFaculty,
      ConsultancyProject,
      ConsultancyProjectFaculty,
      SponsoredProject,
      SponsoredProjectFaculty,
      InternalResearchProject,
      InternalResearchFaculty,
      Patent,
      PatentFaculty,
      Copyright,
      CopyrightFaculty,
      Award,
      AwardFaculty,
      EContent,
      EContentFaculty,
      ProfessionalDevelopment,
      ProfessionalDevelopmentFaculty,
      InvitedTalk,
      InvitedTalkFaculty,
      Periodical,
      PeriodicalFaculty
    } = require('../models');

    let faculty = null;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(target)) {
      faculty = await Faculty.findByPk(target);
    }
    if (!faculty) {
      faculty = await Faculty.findOne({
        where: {
          [Op.or]: [
            { employeeId: target },
            sequelize.where(sequelize.fn('UPPER', sequelize.col('employeeId')), String(target).trim().toUpperCase())
          ]
        }
      });
    }

    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    const fid = faculty.id;
    const empId = faculty.employeeId;
    const normEmp = String(empId || '').trim().toUpperCase();

    const [
      pubsByAssoc,
      consByAssoc,
      sponsByAssoc,
      internalByAssoc,
      patentsByAssoc,
      copyrightsByAssoc,
      awardsByAssoc,
      econtentsByAssoc,
      pdByAssoc,
      talksByAssoc,
      periodicalsByAssoc
    ] = await Promise.all([
      PublicationFaculty ? PublicationFaculty.findAll({
        where: {
          [Op.or]: [
            fid ? { facultyId: fid } : null,
            empId ? { employeeId: empId } : null,
            normEmp ? { normalizedEmployeeId: normEmp } : null
          ].filter(Boolean)
        },
        include: [{ model: Publication, as: 'publication' }]
      }).catch(() => []) : Promise.resolve([]),

      ConsultancyProjectFaculty ? ConsultancyProjectFaculty.findAll({
        where: {
          [Op.or]: [
            fid ? { facultyId: fid } : null,
            empId ? { employeeId: empId } : null,
            normEmp ? { normalizedEmployeeId: normEmp } : null
          ].filter(Boolean)
        },
        include: [{ model: ConsultancyProject, as: 'project' }]
      }).catch(() => []) : Promise.resolve([]),

      SponsoredProjectFaculty ? SponsoredProjectFaculty.findAll({
        where: {
          [Op.or]: [
            fid ? { facultyId: fid } : null,
            empId ? { employeeId: empId } : null,
            normEmp ? { normalizedEmployeeId: normEmp } : null
          ].filter(Boolean)
        },
        include: [{ model: SponsoredProject, as: 'project' }]
      }).catch(() => []) : Promise.resolve([]),

      InternalResearchFaculty ? InternalResearchFaculty.findAll({
        where: {
          [Op.or]: [
            fid ? { facultyId: fid } : null,
            empId ? { employeeId: empId } : null,
            normEmp ? { normalizedEmployeeId: normEmp } : null
          ].filter(Boolean)
        },
        include: [{ model: InternalResearchProject, as: 'project' }]
      }).catch(() => []) : Promise.resolve([]),

      PatentFaculty ? PatentFaculty.findAll({
        where: {
          [Op.or]: [
            fid ? { facultyId: fid } : null,
            empId ? { employeeId: empId } : null,
            normEmp ? { normalizedEmployeeId: normEmp } : null
          ].filter(Boolean)
        },
        include: [{ model: Patent, as: 'patent' }]
      }).catch(() => []) : Promise.resolve([]),

      CopyrightFaculty ? CopyrightFaculty.findAll({
        where: {
          [Op.or]: [
            fid ? { facultyId: fid } : null,
            empId ? { employeeId: empId } : null,
            normEmp ? { normalizedEmployeeId: normEmp } : null
          ].filter(Boolean)
        },
        include: [{ model: Copyright, as: 'copyright' }]
      }).catch(() => []) : Promise.resolve([]),

      AwardFaculty ? AwardFaculty.findAll({
        where: {
          [Op.or]: [
            fid ? { facultyId: fid } : null,
            empId ? { employeeId: empId } : null,
            normEmp ? { normalizedEmployeeId: normEmp } : null
          ].filter(Boolean)
        },
        include: [{ model: Award, as: 'award' }]
      }).catch(() => []) : Promise.resolve([]),

      EContentFaculty ? EContentFaculty.findAll({
        where: {
          [Op.or]: [
            fid ? { facultyId: fid } : null,
            empId ? { employeeId: empId } : null,
            normEmp ? { normalizedEmployeeId: normEmp } : null
          ].filter(Boolean)
        },
        include: [{ model: EContent, as: 'econtent' }]
      }).catch(() => []) : Promise.resolve([]),

      ProfessionalDevelopmentFaculty ? ProfessionalDevelopmentFaculty.findAll({
        where: {
          [Op.or]: [
            fid ? { facultyId: fid } : null,
            empId ? { employeeId: empId } : null,
            normEmp ? { normalizedEmployeeId: normEmp } : null
          ].filter(Boolean)
        },
        include: [{ model: ProfessionalDevelopment, as: 'professionalDevelopment' }]
      }).catch(() => []) : Promise.resolve([]),

      InvitedTalkFaculty ? InvitedTalkFaculty.findAll({
        where: {
          [Op.or]: [
            fid ? { facultyId: fid } : null,
            empId ? { employeeId: empId } : null,
            normEmp ? { normalizedEmployeeId: normEmp } : null
          ].filter(Boolean)
        },
        include: [{ model: InvitedTalk, as: 'invitedTalk' }]
      }).catch(() => []) : Promise.resolve([]),

      PeriodicalFaculty ? PeriodicalFaculty.findAll({
        where: {
          [Op.or]: [
            fid ? { facultyId: fid } : null,
            empId ? { employeeId: empId } : null,
            normEmp ? { normalizedEmployeeId: normEmp } : null
          ].filter(Boolean)
        },
        include: [{ model: Periodical, as: 'periodical' }]
      }).catch(() => []) : Promise.resolve([])
    ]);

    // Parent direct matches
    const [
      directAwards,
      directEContents,
      directPatents,
      directCopyrights
    ] = await Promise.all([
      Award ? Award.findAll({
        where: {
          [Op.or]: [
            fid ? { facultyId: fid } : null,
            empId ? { employeeId: empId } : null
          ].filter(Boolean)
        }
      }).catch(() => []) : Promise.resolve([]),
      EContent ? EContent.findAll({
        where: {
          [Op.or]: [
            fid ? { facultyId: fid } : null,
            empId ? { employeeId: empId } : null
          ].filter(Boolean)
        }
      }).catch(() => []) : Promise.resolve([]),
      Patent ? Patent.findAll({
        where: {
          [Op.or]: [
            fid ? { facultyId: fid } : null,
            empId ? { employeeId: empId } : null
          ].filter(Boolean)
        }
      }).catch(() => []) : Promise.resolve([]),
      Copyright ? Copyright.findAll({
        where: {
          [Op.or]: [
            fid ? { facultyId: fid } : null,
            empId ? { employeeId: empId } : null
          ].filter(Boolean)
        }
      }).catch(() => []) : Promise.resolve([])
    ]);

    const dedup = (items) => {
      const seen = new Set();
      const res = [];
      for (const item of items) {
        if (!item || !item.id) continue;
        if (!seen.has(item.id)) {
          seen.add(item.id);
          res.push(item);
        }
      }
      return res;
    };

    const publications = dedup(pubsByAssoc.map(a => a.publication ? { ...a.publication.toJSON(), contributorRole: a.authorRole || a.contributorRole } : null));

    // Calculate Academic & Research Portfolio Citation Metrics (Part H)
    let totalCitations = 0;
    let availableCitationsCount = 0;
    let unavailableCitationsCount = 0;
    let maxCitations = -1;
    let mostCitedPublications = [];

    publications.forEach(p => {
      const hasValidCount = p.citationCount !== null && p.citationCount !== undefined && !isNaN(parseInt(p.citationCount, 10));
      if (hasValidCount) {
        const count = parseInt(p.citationCount, 10);
        totalCitations += count;
        availableCitationsCount++;

        if (count > maxCitations) {
          maxCitations = count;
          mostCitedPublications = [p];
        } else if (count === maxCitations && count > 0) {
          mostCitedPublications.push(p);
        }
      } else {
        unavailableCitationsCount++;
      }
    });

    const avgCitationsPerPublication = availableCitationsCount > 0
      ? parseFloat((totalCitations / availableCitationsCount).toFixed(2))
      : 0;

    const portfolioMetrics = {
      totalPublications: publications.length,
      totalScopusCitations: totalCitations,
      avgCitationsPerPublication,
      publicationsIncludedInAverage: availableCitationsCount,
      publicationsWithUnavailableCitations: unavailableCitationsCount,
      mostCitedPublication: mostCitedPublications.length > 0 ? {
        citationCount: maxCitations,
        title: mostCitedPublications[0].title,
        journalName: mostCitedPublications[0].journalName,
        publicationYear: mostCitedPublications[0].publicationYear || mostCitedPublications[0].academicYear,
        scopusUrl: mostCitedPublications[0].scopusUrl,
        tiedCount: mostCitedPublications.length,
        tiedPublications: mostCitedPublications.map(tp => ({
          id: tp.id,
          title: tp.title,
          journalName: tp.journalName,
          publicationYear: tp.publicationYear || tp.academicYear,
          citationCount: tp.citationCount,
          scopusUrl: tp.scopusUrl
        }))
      } : null
    };

    const consultancy = dedup(consByAssoc.map(a => a.project ? { ...a.project.toJSON(), contributorRole: a.role || a.contributorRole } : null));
    const sponsoredResearch = dedup(sponsByAssoc.map(a => a.project ? { ...a.project.toJSON(), contributorRole: a.role || a.contributorRole } : null));
    const internalResearch = dedup(internalByAssoc.map(a => a.project ? { ...a.project.toJSON(), contributorRole: a.role || a.contributorRole } : null));

    const patentsMerged = [
      ...patentsByAssoc.map(a => a.patent ? { ...a.patent.toJSON(), contributorRole: a.contributorRole || 'Inventor' } : null),
      ...directPatents.map(p => p.toJSON())
    ];
    const patents = dedup(patentsMerged);

    const copyrightsMerged = [
      ...copyrightsByAssoc.map(a => a.copyright ? { ...a.copyright.toJSON(), contributorRole: a.contributorRole || 'Author' } : null),
      ...directCopyrights.map(c => c.toJSON())
    ];
    const copyrights = dedup(copyrightsMerged);

    const awardsMerged = [
      ...awardsByAssoc.map(a => a.award ? { ...a.award.toJSON(), contributorRole: a.contributorRole || 'Awardee' } : null),
      ...directAwards.map(a => a.toJSON())
    ];
    const awards = dedup(awardsMerged);

    const econtentsMerged = [
      ...econtentsByAssoc.map(a => a.econtent ? { ...a.econtent.toJSON(), contributorRole: a.contributorRole || 'Developer' } : null),
      ...directEContents.map(e => e.toJSON())
    ];
    const eContents = dedup(econtentsMerged);

    const professionalDevelopments = dedup(pdByAssoc.map(a => a.professionalDevelopment ? { ...a.professionalDevelopment.toJSON(), contributorRole: a.role || a.contributorRole } : null));
    const invitedTalks = dedup(talksByAssoc.map(a => a.invitedTalk ? { ...a.invitedTalk.toJSON(), contributorRole: a.role || a.contributorRole } : null));
    const periodicals = dedup(periodicalsByAssoc.map(a => a.periodical ? { ...a.periodical.toJSON(), contributorRole: a.role || a.contributorRole } : null));

    res.json({
      success: true,
      faculty: {
        id: faculty.id,
        employeeId: faculty.employeeId,
        name: faculty.name,
        designation: faculty.designation,
        department: faculty.department,
        school: faculty.school,
        campus: faculty.campus,
        email: faculty.email,
        phone: faculty.phone,
        status: faculty.status
      },
      summary: {
        publications: publications.length,
        citations: totalCitations,
        portfolioMetrics,
        consultancy: consultancy.length,
        sponsoredResearch: sponsoredResearch.length,
        internalResearch: internalResearch.length,
        patents: patents.length,
        copyrights: copyrights.length,
        awards: awards.length,
        eContents: eContents.length,
        professionalDevelopments: professionalDevelopments.length,
        invitedTalks: invitedTalks.length,
        periodicals: periodicals.length
      },
      contributions: {
        publications,
        consultancy,
        sponsoredResearch,
        internalResearch,
        patents,
        copyrights,
        awards,
        eContents,
        professionalDevelopments,
        invitedTalks,
        periodicals
      }
    });
  } catch (error) {
    console.error('Get faculty contributions error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve faculty contributions.', error: error.message });
  }
};

// Export internal helper functions for automated testing & verification
exports.sanitizeFacultyRecord = sanitizeFacultyRecord;
exports.parseAcademicYearStart = parseAcademicYearStart;
exports.normalizeEmployeeId = normalizeEmployeeId;
exports.deduplicateFacultyRecords = deduplicateFacultyRecords;
exports.sortCanonicalRecords = sortCanonicalRecords;
exports.buildFacultyFilterWhere = buildFacultyFilterWhere;

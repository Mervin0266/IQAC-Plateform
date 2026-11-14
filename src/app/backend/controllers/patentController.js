'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Patent, PatentProof, PatentFaculty, Faculty, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logAction, logActionSafe } = require('../middleware/auditLogger');
const { sendNotification } = require('../middleware/notificationHelper');
const { resolveDepartmentScope } = require('../utils/scopeHelper');
const { parsePagination, formatPaginationResponse } = require('../utils/paginationHelper');
const googleDriveService = require('../services/googleDriveService');
const {
  PATENT_TEMPLATE_COLUMNS,
  normalizeDeptKey,
  normalizeEmpIdKey,
  parseAndNormalizeEmpIds,
  generatePatentDuplicateKeys,
  resolveFacultyAssociationsForEmpIds,
  enrichPatentRecord,
  generatePatentTemplateBuffer,
  parsePatentSpreadsheetBuffer,
  evaluateBulkPatentRows
} = require('../services/patentService');

/**
 * Validates calendar year / month / day bounds strictly in UTC to eliminate timezone shifts.
 */
function buildIsoDateIfValid(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;

  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() + 1 !== m ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Flexible field extractor across diverse CSV / Excel header variants and casing.
 */
function extractField(obj, ...keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
      return obj[k];
    }
  }
  const objKeys = Object.keys(obj);
  for (const k of keys) {
    const normK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
    const foundKey = objKeys.find(ok => ok.toLowerCase().replace(/[^a-z0-9]/g, '') === normK);
    if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null && String(obj[foundKey]).trim() !== '') {
      return obj[foundKey];
    }
  }
  return undefined;
}

/**
 * Authoritative Publication Date parser, validator & Publication Year derivation engine.
 * Supports:
 * - ISO dates (YYYY-MM-DD)
 * - Indian formats (DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY)
 * - Excel Date cells and numeric serial dates
 * - Unambiguous named months (15 August 2024, 15-Aug-2024, Aug 15 2024)
 * 
 * Rules:
 * - Empty / null / blank / placeholder string: valid = true, isBlank = true, publicationYear = null (warning generated).
 * - Ambiguous date (day <= 12 and month <= 12 and day !== month without established format): valid = false, isAmbiguous = true.
 * - Out-of-range or malformed date: valid = false, isInvalid = true.
 * - Valid date: valid = true, isoDate = YYYY-MM-DD, publicationYear = 4-digit calendar year.
 */
function parseAndValidatePublicationDate(val, options = {}) {
  if (val === null || val === undefined) {
    return {
      valid: true,
      isBlank: true,
      isoDate: null,
      publicationYear: null,
      warning: 'Publication Date is missing. Publication Year could not be derived.'
    };
  }

  // Handle Date objects (e.g. from Excel date cells)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) {
      return {
        valid: false,
        isInvalid: true,
        error: 'Invalid Publication Date. Please provide a recognizable date.'
      };
    }
    const isUtcMidnight = val.getUTCHours() === 0 && val.getUTCMinutes() === 0 && val.getUTCSeconds() === 0;
    const y = isUtcMidnight ? val.getUTCFullYear() : val.getFullYear();
    const m = isUtcMidnight ? val.getUTCMonth() + 1 : val.getMonth() + 1;
    const d = isUtcMidnight ? val.getUTCDate() : val.getDate();
    const iso = buildIsoDateIfValid(y, m, d);
    if (!iso) {
      return {
        valid: false,
        isInvalid: true,
        error: 'Invalid Publication Date. Out of supported calendar range.'
      };
    }
    return {
      valid: true,
      isBlank: false,
      isoDate: iso,
      publicationYear: y
    };
  }

  // Handle Excel numeric serial dates (e.g. 45123)
  if (typeof val === 'number') {
    if (!Number.isFinite(val) || val < 1) {
      return {
        valid: false,
        isInvalid: true,
        error: 'Invalid Publication Date numeric serial value.'
      };
    }
    const ms = Date.UTC(1899, 11, 30) + Math.round(val) * 86400000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) {
      return {
        valid: false,
        isInvalid: true,
        error: 'Invalid Publication Date numeric serial.'
      };
    }
    const iso = buildIsoDateIfValid(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    if (!iso) {
      return {
        valid: false,
        isInvalid: true,
        error: 'Invalid Publication Date from serial.'
      };
    }
    return {
      valid: true,
      isBlank: false,
      isoDate: iso,
      publicationYear: d.getUTCFullYear()
    };
  }

  const str = String(val).trim();
  if (!str) {
    return {
      valid: true,
      isBlank: true,
      isoDate: null,
      publicationYear: null,
      warning: 'Publication Date is missing. Publication Year could not be derived.'
    };
  }

  const lower = str.toLowerCase();
  if (['n/a', 'na', 'nil', 'null', '-', '--', 'pending', 'under examination', 'not applicable', 'none', 'tbd', 'ongoing'].includes(lower)) {
    return {
      valid: true,
      isBlank: true,
      isoDate: null,
      publicationYear: null,
      warning: 'Publication Date is missing. Publication Year could not be derived.'
    };
  }

  // Numeric string Excel serial (> 10000 to avoid plain 4-digit years)
  if (/^\d{5,6}(\.\d+)?$/.test(str)) {
    const num = Math.round(parseFloat(str));
    const ms = Date.UTC(1899, 11, 30) + num * 86400000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      const iso = buildIsoDateIfValid(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      if (iso) {
        return {
          valid: true,
          isBlank: false,
          isoDate: iso,
          publicationYear: d.getUTCFullYear()
        };
      }
    }
  }

  // ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:$|T|\s)/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    const iso = buildIsoDateIfValid(y, m, d);
    if (!iso) {
      return {
        valid: false,
        isInvalid: true,
        error: `Invalid Publication Date '${str}'. Please provide a recognizable date.`
      };
    }
    return {
      valid: true,
      isBlank: false,
      isoDate: iso,
      publicationYear: y
    };
  }

  // Delimited 3-part: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2}|\d{4})$/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (dmyMatch[3].length === 2) year += 2000;

    // Both parts > 12 or out of bounds (e.g. 35/15/2024)
    if (p1 > 31 || p2 > 31 || (p1 > 12 && p2 > 12)) {
      return {
        valid: false,
        isInvalid: true,
        error: `Invalid Publication Date '${str}'. Please provide a recognizable date.`
      };
    }

    // Part 1 > 12 => Unambiguously DD/MM/YYYY
    if (p1 > 12 && p2 <= 12) {
      const iso = buildIsoDateIfValid(year, p2, p1);
      if (!iso) {
        return {
          valid: false,
          isInvalid: true,
          error: `Invalid Publication Date '${str}'. Please provide a recognizable date.`
        };
      }
      return {
        valid: true,
        isBlank: false,
        isoDate: iso,
        publicationYear: year
      };
    }

    // Part 1 <= 12 and Part 2 > 12 => Unambiguously MM/DD/YYYY
    if (p1 <= 12 && p2 > 12) {
      const iso = buildIsoDateIfValid(year, p1, p2);
      if (!iso) {
        return {
          valid: false,
          isInvalid: true,
          error: `Invalid Publication Date '${str}'. Please provide a recognizable date.`
        };
      }
      return {
        valid: true,
        isBlank: false,
        isoDate: iso,
        publicationYear: year
      };
    }

    // Part 1 === Part 2 e.g. 05/05/2024 => Unambiguous
    if (p1 === p2 && p1 >= 1 && p1 <= 12) {
      const iso = buildIsoDateIfValid(year, p1, p1);
      if (iso) {
        return {
          valid: true,
          isBlank: false,
          isoDate: iso,
          publicationYear: year
        };
      }
    }

    // Both p1 <= 12 and p2 <= 12 with p1 !== p2 e.g. 04/05/2024
    // If format is explicitly established in options:
    if (options.format === 'DD-MM-YYYY' || options.format === 'DD/MM/YYYY') {
      const iso = buildIsoDateIfValid(year, p2, p1);
      if (iso) {
        return {
          valid: true,
          isBlank: false,
          isoDate: iso,
          publicationYear: year
        };
      }
    }

    // Otherwise ambiguous (e.g. 04/05/2024 could represent 4 May or April 5)
    return {
      valid: false,
      isAmbiguous: true,
      error: `Ambiguous Publication Date '${str}'. Could represent day/month or month/day. Please provide an unambiguous date format (e.g. YYYY-MM-DD or DD/MM/YYYY with day > 12).`
    };
  }

  // Named months: "15 August 2024", "15-Aug-2024", "Aug 15, 2024"
  const monthNames = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
    nov: 11, november: 11, dec: 12, december: 12
  };
  const dMonY = str.match(/^(\d{1,2})[\s\-]+([A-Za-z]+)[\s\-,]+(\d{4})$/);
  if (dMonY && monthNames[dMonY[2].toLowerCase()]) {
    const iso = buildIsoDateIfValid(parseInt(dMonY[3], 10), monthNames[dMonY[2].toLowerCase()], parseInt(dMonY[1], 10));
    if (iso) {
      return {
        valid: true,
        isBlank: false,
        isoDate: iso,
        publicationYear: parseInt(dMonY[3], 10)
      };
    }
  }

  const monDY = str.match(/^([A-Za-z]+)[\s\-]+(\d{1,2}),?[\s\-]+(\d{4})$/);
  if (monDY && monthNames[monDY[1].toLowerCase()]) {
    const iso = buildIsoDateIfValid(parseInt(monDY[3], 10), monthNames[monDY[1].toLowerCase()], parseInt(monDY[2], 10));
    if (iso) {
      return {
        valid: true,
        isBlank: false,
        isoDate: iso,
        publicationYear: parseInt(monDY[3], 10)
      };
    }
  }

  return {
    valid: false,
    isInvalid: true,
    error: `Invalid Publication Date '${str}'. Please provide a recognizable date.`
  };
}

/**
 * Sanitize and normalize date string into ISO YYYY-MM-DD.
 */
const sanitizeDate = (val) => {
  if (!val) return null;

  // Handle Excel numeric serial dates (e.g. 45123)
  if (typeof val === 'number') {
    const d = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }

  const str = String(val).trim();
  if (!str) return null;

  const lower = str.toLowerCase();
  if (['n/a', 'na', 'nil', 'null', '-', '--', 'pending', 'under examination', 'not applicable', 'none', 'tbd', 'ongoing'].includes(lower)) {
    return null;
  }

  // If numeric string of Excel serial date (4-5 digits)
  if (/^\d{4,5}$/.test(str) && parseInt(str, 10) > 10000) {
    const num = parseInt(str, 10);
    const d = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }

  // Standard ISO date YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Handle DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let p1 = parts[0].trim();
    let p2 = parts[1].trim();
    let p3 = parts[2].trim();

    // Check if format is YYYY-MM-DD
    if (p1.length === 4) {
      const y = p1;
      const m = p2.padStart(2, '0');
      const d = p3.padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // Otherwise assume DD-MM-YYYY
    let day = p1.padStart(2, '0');
    let month = p2.padStart(2, '0');
    let year = p3;
    if (year.length === 2) year = '20' + year;
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${year}-${month}-${day}`;
    }
  }

  // Handle YYYY only (e.g. "2024")
  if (/^\d{4}$/.test(str)) {
    return `${str}-01-01`;
  }

  // General fallback
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return null;
};

const sanitizeAmount = (val) => {
  if (val === null || val === undefined || val === '') return 0.00;
  if (typeof val === 'number') return isNaN(val) ? 0.00 : val;
  const cleaned = String(val).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0.00 : parsed;
};

/**
 * Validate Year of Grant against Patent Status and Grant Date.
 * Rules:
 * - Filed / Under Examination / Published: Year must be blank/null.
 * - Granted / Commercialized: Year is required (4-digit calendar year e.g. 2024).
 * - When Grant Date is entered, Year must match the year part of Grant Date.
 */
const validateYearAndStatus = (status, grantDate, rawYear) => {
  const normStatus = (status || '').toLowerCase().trim();
  const isGranted = normStatus.includes('grant') || normStatus.includes('commercial') || normStatus.includes('licens');

  const sanitizedGrantDate = sanitizeDate(grantDate);
  let parsedYear = null;
  let rawYearInvalid = false;

  if (rawYear !== null && rawYear !== undefined && String(rawYear).trim() !== '') {
    const yrStr = String(rawYear).trim().toLowerCase();
    if (!['pending', 'pending grant', 'n/a', 'na', 'nil', '-', '--', 'null'].includes(yrStr)) {
      if (/^\d{4}$/.test(yrStr)) {
        parsedYear = parseInt(yrStr, 10);
      } else if (yrStr.includes('-')) {
        const parts = yrStr.split('-');
        if (/^\d{4}$/.test(parts[0].trim())) {
          parsedYear = parseInt(parts[0].trim(), 10);
        } else {
          rawYearInvalid = true;
        }
      } else {
        rawYearInvalid = true;
      }
    }
  }

  if (isGranted) {
    if (rawYearInvalid) {
      return {
        valid: false,
        error: 'Year of Grant must be a valid 4-digit calendar year (e.g. 2024).'
      };
    }

    if (!parsedYear) {
      return {
        valid: false,
        error: 'Year of Grant (4-digit calendar year e.g. 2024) is required for Granted and Commercialized patents.'
      };
    }

    if (parsedYear < 1950 || parsedYear > 2100) {
      return {
        valid: false,
        error: `Invalid Year of Grant: ${parsedYear}. Must be a valid 4-digit calendar year.`
      };
    }

    if (sanitizedGrantDate) {
      const derivedYearFromDate = parseInt(sanitizedGrantDate.split('-')[0], 10);
      if (derivedYearFromDate !== parsedYear) {
        return {
          valid: false,
          error: `Year of Grant (${parsedYear}) does not match Grant Date year (${derivedYearFromDate}). Both must agree.`
        };
      }
    }

    return {
      valid: true,
      grantYear: parsedYear,
      academicYear: `${parsedYear}-${parsedYear + 1}`
    };
  } else {
    // Non-granted (Filed, Published, Under Examination)
    if (parsedYear !== null || rawYearInvalid) {
      return {
        valid: false,
        error: `Year of Grant must be left blank for ungranted patents (Status: ${status}). Year is assigned only upon grant.`
      };
    }

    return {
      valid: true,
      grantYear: null,
      academicYear: 'Pending Grant'
    };
  }
};

/**
 * Enforce role & department permissions on patent records.
 */
/**
 * Loads live faculty directory indexed by ID and normalized Employee ID key.
 */
async function loadLiveFacultyMaps() {
  const rows = await Faculty.findAll({
    attributes: ['id', 'employeeId', 'name', 'department', 'designation', 'email', 'academicYear', 'createdAt'],
    order: [
      ['academicYear', 'DESC NULLS LAST'],
      ['createdAt', 'DESC NULLS LAST']
    ],
    raw: true
  });

  const byId = new Map();
  const byNormEmpKey = new Map();

  for (const row of rows) {
    byId.set(row.id, row);
    const key = normalizeEmpIdKey(row.employeeId);
    if (key && !byNormEmpKey.has(key)) {
      byNormEmpKey.set(key, row);
    }
  }

  return { byId, byNormEmpKey, allRows: rows };
}

/**
 * Computes aggregated summary metrics for Patent records.
 */
function computePatentMetrics(patentsList = []) {
  let totalPatents = patentsList.length;
  let applicationsFiled = 0;
  let grantedPatents = 0;
  let licensedPatents = 0;
  let publishedPatents = 0;
  let totalRevenue = 0;
  let nationalCount = 0;
  let internationalCount = 0;
  let withProofCount = 0;
  let missingProofCount = 0;
  let recordsWithInvalidEmpIds = 0;
  const departmentBreakdown = {};
  const publicationYearBreakdown = {};

  for (const p of patentsList) {
    const s = String(p.status || '').toLowerCase();
    if (s.includes('grant')) {
      grantedPatents++;
    } else if (s.includes('commercial') || s.includes('licens') || p.licenseDate) {
      licensedPatents++;
    } else if (s.includes('publish') || p.publishedDate) {
      publishedPatents++;
    } else {
      applicationsFiled++;
    }

    const pType = String(p.patentType || '').toLowerCase();
    if (pType.includes('international') || pType.includes('pct') || pType.includes('uspto') || pType.includes('epo')) {
      internationalCount++;
    } else {
      nationalCount++;
    }

    const rev = Number(p.revenue || 0);
    if (!Number.isNaN(rev) && rev > 0) {
      totalRevenue += rev;
    }

    const hasProof = (p.proofs && p.proofs.length > 0) || Boolean(p.patentUrl);
    if (hasProof) {
      withProofCount++;
    } else {
      missingProofCount++;
    }

    if (p.hasInvalidEmpIds) {
      recordsWithInvalidEmpIds++;
    }

    const dept = p.department || 'Unassigned';
    departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1;

    const yrKey = p.publicationYear ? String(p.publicationYear) : (p.publishedDate ? String(p.publishedDate).slice(0, 4) : 'Missing / Not Available');
    publicationYearBreakdown[yrKey] = (publicationYearBreakdown[yrKey] || 0) + 1;
  }

  return {
    total: totalPatents,
    totalPatents,
    filed: applicationsFiled,
    applicationsFiled,
    published: publishedPatents,
    publishedPatents,
    granted: grantedPatents,
    grantedPatents,
    commercialized: licensedPatents,
    licensedPatents,
    national: nationalCount,
    international: internationalCount,
    totalRevenue,
    withProofCount,
    missingProofCount,
    recordsWithInvalidEmpIds,
    departmentBreakdown,
    publicationYearBreakdown,
    yearBreakdown: publicationYearBreakdown
  };
}

/**
 * Enforce role & department permissions on patent records.
 */
const checkPatentAccess = (patent, user, action = 'view') => {
  if (!user) return { allowed: false, message: 'Authentication required' };
  if (user.role === 'admin' || user.role === 'iqac_admin') return { allowed: true };

  const deptMatches = (dept) => {
    if (!user.department || user.department === 'All') return true;
    const uKey = normalizeDeptKey(user.department);
    if (!dept) return false;
    return normalizeDeptKey(dept) === uKey;
  };

  const associations = patent.facultyAssociations || [];
  const matchesAnyDept = deptMatches(patent.department) ||
    associations.some(a => deptMatches(a.currentDepartment) || deptMatches(a.originalDepartment));

  if (action === 'view') {
    if (user.role === 'authority') return { allowed: true };
    if (['coordinator', 'hod'].includes(user.role)) {
      if (matchesAnyDept) return { allowed: true };
      return { allowed: false, message: 'Access denied: Patent belongs to another department' };
    }
    if (user.role === 'faculty') {
      if (matchesAnyDept || patent.createdBy === user.id) return { allowed: true };
      return { allowed: false, message: 'Access denied: Patent belongs to another department' };
    }
  }

  // Edit / Delete / Manage Proofs
  if (action === 'manage') {
    if (user.role === 'authority') {
      return { allowed: false, message: 'Authority role has read-only inspection access.' };
    }
    if (['coordinator', 'hod'].includes(user.role)) {
      if (matchesAnyDept) return { allowed: true };
      return { allowed: false, message: 'Access denied: Cannot modify patents outside your department.' };
    }
    if (user.role === 'faculty') {
      if (patent.createdBy === user.id) return { allowed: true };
      return { allowed: false, message: 'Access denied: Faculty can only modify their own patent records.' };
    }
  }

  return { allowed: false, message: 'Unauthorized action' };
};

/**
 * Common query filtering helper for Patents.
 */
async function fetchFilteredPatentsForRequest(req) {
  const {
    status,
    patentType,
    year,
    publicationYear,
    grantYear,
    academicYear,
    department,
    proofStatus,
    validationStatus,
    search
  } = req.query;

  const where = {};
  const selectedYear = publicationYear || year || academicYear;

  if (selectedYear && selectedYear !== 'all') {
    const yrTrim = String(selectedYear).trim();
    if (['missing', 'not_available', 'unassigned', 'blank', 'none', 'null'].includes(yrTrim.toLowerCase())) {
      where.publicationYear = null;
    } else if (yrTrim === 'Pending Grant') {
      where.grantYear = null;
    } else if (/^\d{4}$/.test(yrTrim)) {
      const yrInt = parseInt(yrTrim, 10);
      if (publicationYear) {
        // Strict publication year matching when publicationYear filter is requested
        where.publicationYear = yrInt;
      } else {
        where[Op.or] = [
          { publicationYear: yrInt },
          { academicYear: { [Op.iLike]: `%${yrTrim}%` } }
        ];
      }
    } else if (/^(\d{4})\s*[-–/]\s*(\d{2,4})$/.test(yrTrim)) {
      const match = yrTrim.match(/^(\d{4})\s*[-–/]\s*(\d{2,4})$/);
      const startYr = parseInt(match[1], 10);
      const endYr = match[2].length === 2 ? parseInt(match[1].slice(0, 2) + match[2], 10) : parseInt(match[2], 10);
      if (publicationYear) {
        where.publicationYear = { [Op.between]: [startYr, endYr] };
      } else {
        where[Op.or] = [
          { publicationYear: { [Op.between]: [startYr, endYr] } },
          { academicYear: { [Op.iLike]: `%${yrTrim}%` } }
        ];
      }
    } else {
      where.academicYear = yrTrim;
    }
  }

  if (grantYear && grantYear !== 'all') {
    const gyInt = parseInt(String(grantYear).trim(), 10);
    if (!Number.isNaN(gyInt)) {
      where.grantYear = gyInt;
    }
  }

  if (status && status !== 'all') {
    where.status = { [Op.iLike]: `%${status.trim()}%` };
  }

  if (patentType && patentType !== 'all') {
    where.patentType = { [Op.iLike]: `%${patentType.trim()}%` };
  }

  if (req.user && req.user.role === 'authority') {
    where.approvalStatus = 'finalized';
  }

  const allRecords = await Patent.findAll({
    where,
    include: [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'department']
      },
      {
        model: PatentProof,
        as: 'proofs',
        where: { isActive: true },
        required: false,
        attributes: [
          'id', 'sourceType', 'driveFileId', 'driveFolderId',
          'driveUrl', 'fileName', 'mimeType', 'fileSize',
          'uploadedAt', 'accessStatus', 'accessRemarks'
        ]
      },
      {
        model: PatentFaculty,
        as: 'facultyAssociations',
        required: false
      }
    ],
    order: [
      ['publicationYear', 'DESC NULLS LAST'],
      ['publishedDate', 'DESC NULLS LAST'],
      ['grantYear', 'DESC NULLS LAST'],
      ['filedDate', 'DESC NULLS LAST'],
      ['id', 'ASC']
    ]
  });

  const { byId, byNormEmpKey } = await loadLiveFacultyMaps();

  // Deduplicate by unique patent ID (guarantees multi-faculty joins never produce duplicate rows)
  const uniqueMap = new Map();
  for (const row of allRecords) {
    if (!uniqueMap.has(row.id)) {
      uniqueMap.set(row.id, enrichPatentRecord(row, byId, byNormEmpKey));
    }
  }
  let enrichedList = Array.from(uniqueMap.values());

  // Enforce coordinator/HOD role scope on backend
  if (req.user && ['coordinator', 'hod'].includes(req.user.role)) {
    if (req.user.department && req.user.department !== 'All') {
      const uDeptKey = normalizeDeptKey(req.user.department);
      enrichedList = enrichedList.filter(p => {
        if (p.createdBy === req.user.id) return true;
        if (normalizeDeptKey(p.department) === uDeptKey) return true;
        return (p.facultyAssociations || []).some(f =>
          normalizeDeptKey(f.currentDepartment) === uDeptKey ||
          normalizeDeptKey(f.originalDepartment) === uDeptKey
        );
      });
    }
  }

  // Department filter (supports single or comma-separated departments)
  if (department && department !== 'all') {
    const rawDepts = Array.isArray(department) ? department.join(',') : String(department);
    const requestedKeys = rawDepts
      .split(',')
      .map(d => normalizeDeptKey(d.trim().replace(/-/g, ' ')))
      .filter(Boolean);

    if (requestedKeys.length > 0) {
      enrichedList = enrichedList.filter(p => {
        const pDeptKey = normalizeDeptKey(p.department);
        if (requestedKeys.includes(pDeptKey)) return true;
        return (p.facultyAssociations || []).some(f =>
          requestedKeys.includes(normalizeDeptKey(f.currentDepartment)) ||
          requestedKeys.includes(normalizeDeptKey(f.originalDepartment))
        );
      });
    }
  }

  // Filter by Proof status
  if (proofStatus && proofStatus !== 'all') {
    enrichedList = enrichedList.filter(p => {
      const proofs = p.proofs || [];
      const hasProof = proofs.length > 0 || Boolean(p.patentUrl);
      if (proofStatus === 'missing') return !hasProof;
      if (proofStatus === 'has_proof') return hasProof;
      if (proofStatus === 'verified') return proofs.some(pr => pr.accessStatus === 'verified');
      if (proofStatus === 'issue') return proofs.some(pr => pr.accessStatus === 'access_issue');
      return true;
    });
  }

  // Filter by EmpId validation status
  if (validationStatus && validationStatus !== 'all') {
    if (validationStatus === 'invalid_empids') {
      enrichedList = enrichedList.filter(p => p.hasInvalidEmpIds);
    } else if (validationStatus === 'valid') {
      enrichedList = enrichedList.filter(p => !p.hasInvalidEmpIds);
    }
  }

  // Search filter
  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    enrichedList = enrichedList.filter(p => {
      if ((p.title || '').toLowerCase().includes(q)) return true;
      if ((p.applicationNo || '').toLowerCase().includes(q)) return true;
      if ((p.patentNo || '').toLowerCase().includes(q)) return true;
      if ((p.partner || '').toLowerCase().includes(q)) return true;
      if ((p.patentType || '').toLowerCase().includes(q)) return true;
      if ((p.empIdsRaw || '').toLowerCase().includes(q)) return true;
      if ((p.inventors || '').toLowerCase().includes(q)) return true;
      if ((p.externalInventors || []).some(ext => (ext.name || '').toLowerCase().includes(q) || (ext.institution || '').toLowerCase().includes(q))) return true;
      return (p.facultyAssociations || []).some(f =>
        (f.employeeId || '').toLowerCase().includes(q) ||
        (f.facultyName || '').toLowerCase().includes(q) ||
        (f.currentDepartment || '').toLowerCase().includes(q) ||
        (f.originalDepartment || '').toLowerCase().includes(q)
      );
    });
  }

  return enrichedList;
}

// ──────────────────────────────────────────────────────────────────────────────
// 1. SEARCH FACULTY DIRECTORY (For Patent Multi-Faculty Selector)
// ──────────────────────────────────────────────────────────────────────────────
exports.searchFacultyDirectory = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10) || 50, 1), 200);

    const { byNormEmpKey } = await loadLiveFacultyMaps();
    let list = Array.from(byNormEmpKey.values());

    if (q) {
      list = list.filter(f =>
        String(f.employeeId || '').toLowerCase().includes(q) ||
        String(f.name || '').toLowerCase().includes(q) ||
        String(f.department || '').toLowerCase().includes(q) ||
        String(f.designation || '').toLowerCase().includes(q)
      );
    } else {
      list.sort((a, b) => String(a.employeeId || '').localeCompare(String(b.employeeId || ''), undefined, { numeric: true }));
    }

    const trimmed = list.slice(0, limit).map(f => ({
      id: f.id,
      employeeId: String(f.employeeId).trim(),
      name: f.name,
      designation: f.designation,
      department: f.department,
      email: f.email || null
    }));

    res.json({ success: true, data: trimmed, total: list.length });
  } catch (error) {
    console.error('Search faculty directory error:', error);
    res.status(500).json({ success: false, message: 'Failed to search Faculty Management directory.' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 2. LIST PATENTS & STATS (Distinct Record Filtering & Summary Metrics)
// ──────────────────────────────────────────────────────────────────────────────
exports.getPatents = async (req, res) => {
  try {
    const filteredList = await fetchFilteredPatentsForRequest(req);
    const metrics = computePatentMetrics(filteredList);

    const { page, limit, offset, isExport } = parsePagination(req.query);
    const paginatedRows = isExport ? filteredList : filteredList.slice(offset, offset + limit);

    const response = formatPaginationResponse({
      count: filteredList.length,
      rows: paginatedRows,
      page,
      limit
    });

    res.json({
      ...response,
      rows: paginatedRows,
      metrics
    });
  } catch (error) {
    console.error('Get patents error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve patent records'
    });
  }
};

exports.getPatentStats = async (req, res) => {
  try {
    const filteredList = await fetchFilteredPatentsForRequest(req);
    const metrics = computePatentMetrics(filteredList);
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Get patent stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate patent statistics'
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 3. GET SINGLE PATENT BY ID
// ──────────────────────────────────────────────────────────────────────────────
exports.getPatent = async (req, res) => {
  try {
    const patent = await Patent.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'department']
        },
        {
          model: PatentProof,
          as: 'proofs',
          where: { isActive: true },
          required: false
        },
        {
          model: PatentFaculty,
          as: 'facultyAssociations',
          required: false
        }
      ]
    });

    if (!patent) {
      return res.status(404).json({
        success: false,
        message: 'Patent record not found'
      });
    }

    const { byId, byNormEmpKey } = await loadLiveFacultyMaps();
    const enriched = enrichPatentRecord(patent, byId, byNormEmpKey);

    const access = checkPatentAccess(enriched, req.user, 'view');
    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: access.message
      });
    }

    res.json({
      success: true,
      data: enriched
    });
  } catch (error) {
    console.error('Get patent error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 4. CREATE PATENT RECORD
// ──────────────────────────────────────────────────────────────────────────────
exports.createPatent = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      title,
      empIds,
      empIdsRaw,
      inventors,
      externalInventors,
      applicationNo,
      patentNo,
      status,
      patentType,
      department,
      year,
      grantYear,
      academicYear,
      filedDate,
      publishedDate,
      grantedDate,
      licenseDate,
      partner,
      revenue,
      patentUrl,
      description,
      approvalStatus,
      proofLinks
    } = req.body;

    // Validation for required fields
    const missing = [];
    if (!title || !String(title).trim()) missing.push('Patent Title');

    const rawEmpInput = empIdsRaw !== undefined && empIdsRaw !== null
      ? empIdsRaw
      : empIds;
    const parsedEmp = parseAndNormalizeEmpIds(rawEmpInput);

    if (missing.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: `Validation Error: Missing required field(s): ${missing.join(', ')}.`,
        missingFields: missing
      });
    }

    // Resolve Faculty Associations against Faculty Management
    const dateForSnapshot = filedDate || publishedDate || new Date();
    const resolvedFaculty = await resolveFacultyAssociationsForEmpIds(
      parsedEmp.empIds,
      dateForSnapshot,
      { Faculty }
    );

    // External inventors (name, institution)
    let parsedExternalInventors = [];
    if (Array.isArray(externalInventors)) {
      parsedExternalInventors = externalInventors
        .filter(ext => ext && (String(ext.name || '').trim() || String(ext.institution || '').trim()))
        .map(ext => ({
          name: String(ext.name || '').trim(),
          institution: String(ext.institution || '').trim()
        }));
    }

    // Assemble inventors string for backward compatibility
    let rawInventorsText = '';
    if (inventors && (Array.isArray(inventors) ? inventors.length > 0 : String(inventors).trim())) {
      rawInventorsText = Array.isArray(inventors) ? inventors.join(', ') : String(inventors).trim();
    } else {
      const names = [
        ...resolvedFaculty.associations.map(a => a.facultyName || a.employeeId),
        ...parsedExternalInventors.map(e => e.name).filter(Boolean)
      ];
      rawInventorsText = names.length > 0 ? names.join(', ') : 'Not specified';
    }

    // Validate Year of Grant
    const isGranted = (status || '').toLowerCase().includes('grant') || 
                      (status || '').toLowerCase().includes('commercial') || 
                      (status || '').toLowerCase().includes('licens');

    const yearToValidate = isGranted 
      ? (year !== undefined && year !== null && String(year).trim() !== '' ? year : (grantYear || academicYear))
      : (year !== undefined && year !== null && String(year).trim() !== '' ? year : (grantYear || null));

    const yearValidation = validateYearAndStatus(status, grantedDate, yearToValidate);
    if (!yearValidation.valid) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: yearValidation.error
      });
    }

    // Primary department determination
    let assignedDept = (department || '').trim();
    if (!assignedDept) {
      const firstValidAssoc = resolvedFaculty.associations.find(a => a.isValid && a.originalDepartment);
      if (firstValidAssoc) {
        assignedDept = firstValidAssoc.originalDepartment;
      } else {
        assignedDept = req.user?.role === 'admin' ? 'General' : (req.user?.department || 'General');
      }
    }

    const finalApproval = (['admin', 'coordinator', 'hod'].includes(req.user?.role) && approvalStatus)
      ? approvalStatus
      : (req.user?.role === 'admin' ? 'approved' : 'submitted');

    let creatorId = req.user?.id;
    if (!creatorId) {
      const admin = await User.findOne({ where: { role: 'admin' }, transaction });
      creatorId = admin ? admin.id : null;
    }

    // Validate Publication Date and derive Publication Year
    const pubDateValidation = parseAndValidatePublicationDate(publishedDate);
    if (!pubDateValidation.valid) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: pubDateValidation.error,
        isAmbiguous: pubDateValidation.isAmbiguous || false
      });
    }

    const patent = await Patent.create({
      title: title.trim(),
      inventors: rawInventorsText.trim(),
      applicationNo: applicationNo ? String(applicationNo).trim() : null,
      patentNo: patentNo ? String(patentNo).trim() : null,
      status: status || 'published',
      patentType: patentType || 'National (Indian)',
      department: assignedDept.trim(),
      grantYear: isGranted ? yearValidation.grantYear : null,
      academicYear: null,
      publicationYear: pubDateValidation.publicationYear,
      filedDate: sanitizeDate(filedDate),
      publishedDate: pubDateValidation.isoDate,
      grantedDate: sanitizeDate(grantedDate),
      licenseDate: sanitizeDate(licenseDate),
      partner: partner ? String(partner).trim() : null,
      revenue: sanitizeAmount(revenue),
      patentUrl: patentUrl ? String(patentUrl).trim() : null,
      description: description ? String(description).trim() : null,
      approvalStatus: finalApproval,
      createdBy: creatorId,
      empIdsRaw: parsedEmp.empIdsRaw,
      hasInvalidEmpIds: resolvedFaculty.hasInvalidEmpIds,
      invalidEmpIds: resolvedFaculty.invalidEmpIds,
      duplicateEmpIds: parsedEmp.duplicateEmpIds,
      externalInventors: parsedExternalInventors
    }, { transaction });

    // Insert PatentFaculty association records
    if (resolvedFaculty.associations.length > 0) {
      await PatentFaculty.bulkCreate(
        resolvedFaculty.associations.map(assoc => ({
          patentId: patent.id,
          facultyId: assoc.facultyId,
          employeeId: assoc.employeeId,
          normalizedEmployeeId: assoc.normalizedEmployeeId,
          facultyName: assoc.facultyName,
          designation: assoc.designation,
          originalDepartment: assoc.originalDepartment,
          originalDepartmentSource: assoc.originalDepartmentSource,
          isValid: assoc.isValid,
          displayOrder: assoc.displayOrder
        })),
        { transaction }
      );
    }

    // Save initial Proof Google Drive links
    if (proofLinks) {
      const linkList = Array.isArray(proofLinks)
        ? proofLinks
        : String(proofLinks).split('\n');

      for (const rawUrl of linkList) {
        const u = String(rawUrl || '').trim();
        if (!u) continue;
        const validation = googleDriveService.validateDriveUrl(u);
        if (validation.valid) {
          const verification = await googleDriveService.verifyDriveLinkAccess(u);
          await PatentProof.create({
            patentId: patent.id,
            sourceType: 'drive_link',
            driveFileId: validation.fileId,
            driveUrl: u,
            fileName: verification.fileName || `Google Drive Document (${validation.fileId.slice(0, 8)})`,
            mimeType: verification.mimeType || 'application/vnd.google-apps.document',
            fileSize: verification.fileSize || null,
            uploadedBy: creatorId,
            accessStatus: verification.status,
            accessRemarks: verification.remarks,
            isActive: true
          }, { transaction });
        }
      }
    }

    await transaction.commit();

    await logActionSafe({
      recordId: patent.id,
      title: patent.title,
      user: req.user,
      action: 'CREATE_PATENT',
      previousValue: null,
      updatedValue: patent.toJSON(),
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Created patent: ${patent.title}`
    });

    const reloaded = await Patent.findByPk(patent.id, {
      include: [
        {
          model: PatentProof,
          as: 'proofs',
          where: { isActive: true },
          required: false
        },
        {
          model: PatentFaculty,
          as: 'facultyAssociations',
          required: false
        }
      ]
    });

    const { byId, byNormEmpKey } = await loadLiveFacultyMaps();
    const enriched = enrichPatentRecord(reloaded || patent, byId, byNormEmpKey);

    const warnings = [];
    if (pubDateValidation.warning) warnings.push(pubDateValidation.warning);
    if (resolvedFaculty.hasInvalidEmpIds) {
      warnings.push(`Unrecognized Employee ID(s): ${resolvedFaculty.invalidEmpIds.join(', ')}.`);
    }

    res.status(201).json({
      success: true,
      message: 'Patent record created successfully',
      warning: warnings.length > 0 ? warnings.join('; ') : undefined,
      data: enriched
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Create patent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create patent',
      error: error.message
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 5. UPDATE PATENT RECORD
// ──────────────────────────────────────────────────────────────────────────────
exports.updatePatent = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const patent = await Patent.findByPk(req.params.id, {
      include: [
        {
          model: PatentProof,
          as: 'proofs',
          where: { isActive: true },
          required: false
        },
        {
          model: PatentFaculty,
          as: 'facultyAssociations',
          required: false
        }
      ],
      transaction
    });

    if (!patent) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Patent not found'
      });
    }

    const access = checkPatentAccess(patent, req.user, 'manage');
    if (!access.allowed) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: access.message
      });
    }

    const oldValues = patent.toJSON();
    const oldGrantYear = patent.grantYear;
    const oldStatus = patent.status;

    // Validate Year & Status if modified
    const targetStatus = req.body.status !== undefined ? req.body.status : patent.status;
    const isTargetGranted = (targetStatus || '').toLowerCase().includes('grant') || 
                            (targetStatus || '').toLowerCase().includes('commercial') || 
                            (targetStatus || '').toLowerCase().includes('licens');
    const targetGrantDate = req.body.grantedDate !== undefined ? req.body.grantedDate : patent.grantedDate;

    let targetYear = null;
    if (isTargetGranted) {
      targetYear = req.body.year !== undefined ? req.body.year : (req.body.grantYear !== undefined ? req.body.grantYear : patent.grantYear);
    } else {
      // Ungranted: Year of Grant must be null
      targetYear = (req.body.grantYear !== undefined && req.body.grantYear !== null && String(req.body.grantYear).trim() !== '') 
        ? req.body.grantYear 
        : ((req.body.year !== undefined && req.body.year !== null && String(req.body.year).trim() !== '') ? req.body.year : null);
    }

    const yearValidation = validateYearAndStatus(targetStatus, targetGrantDate, targetYear);
    if (!yearValidation.valid) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: yearValidation.error
      });
    }

    // Validate Publication Date if modified and recalculate Publication Year automatically
    let pubDateWarning = undefined;
    if (req.body.publishedDate !== undefined) {
      const pubDateValidation = parseAndValidatePublicationDate(req.body.publishedDate);
      if (!pubDateValidation.valid) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: pubDateValidation.error,
          isAmbiguous: pubDateValidation.isAmbiguous || false
        });
      }
      patent.publishedDate = pubDateValidation.isoDate;
      patent.publicationYear = pubDateValidation.publicationYear;
      if (pubDateValidation.warning) {
        pubDateWarning = pubDateValidation.warning;
      }
    }

    // Check if faculty associations should be re-resolved
    const shouldUpdateFaculty = req.body.empIds !== undefined || req.body.empIdsRaw !== undefined || req.body.externalInventors !== undefined || req.body.inventors !== undefined;
    let resolvedFaculty = null;
    let parsedEmp = null;
    let parsedExternalInventors = patent.externalInventors || [];

    if (shouldUpdateFaculty) {
      const rawEmpInput = req.body.empIdsRaw !== undefined && req.body.empIdsRaw !== null
        ? req.body.empIdsRaw
        : (req.body.empIds !== undefined ? req.body.empIds : patent.empIdsRaw);
      parsedEmp = parseAndNormalizeEmpIds(rawEmpInput);

      const dateForSnapshot = req.body.filedDate || patent.publishedDate || patent.filedDate || new Date();
      resolvedFaculty = await resolveFacultyAssociationsForEmpIds(
        parsedEmp.empIds,
        dateForSnapshot,
        { Faculty }
      );

      if (req.body.externalInventors !== undefined) {
        parsedExternalInventors = Array.isArray(req.body.externalInventors)
          ? req.body.externalInventors
              .filter(ext => ext && (String(ext.name || '').trim() || String(ext.institution || '').trim()))
              .map(ext => ({
                name: String(ext.name || '').trim(),
                institution: String(ext.institution || '').trim()
              }))
          : [];
      }

      // Rebuild PatentFaculty rows
      await PatentFaculty.destroy({ where: { patentId: patent.id }, transaction });
      if (resolvedFaculty.associations.length > 0) {
        await PatentFaculty.bulkCreate(
          resolvedFaculty.associations.map(assoc => ({
            patentId: patent.id,
            facultyId: assoc.facultyId,
            employeeId: assoc.employeeId,
            normalizedEmployeeId: assoc.normalizedEmployeeId,
            facultyName: assoc.facultyName,
            designation: assoc.designation,
            originalDepartment: assoc.originalDepartment,
            originalDepartmentSource: assoc.originalDepartmentSource,
            isValid: assoc.isValid,
            displayOrder: assoc.displayOrder
          })),
          { transaction }
        );
      }

      patent.empIdsRaw = parsedEmp.empIdsRaw;
      patent.hasInvalidEmpIds = resolvedFaculty.hasInvalidEmpIds;
      patent.invalidEmpIds = resolvedFaculty.invalidEmpIds;
      patent.duplicateEmpIds = parsedEmp.duplicateEmpIds;
      patent.externalInventors = parsedExternalInventors;
    }

    const allowedFields = [
      'title', 'inventors', 'applicationNo', 'patentNo', 'status', 'patentType',
      'filedDate', 'grantedDate', 'licenseDate',
      'partner', 'revenue', 'patentUrl', 'description'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'inventors' && Array.isArray(req.body.inventors)) {
          patent.inventors = req.body.inventors.join(', ');
        } else if (['filedDate', 'grantedDate', 'licenseDate'].includes(field)) {
          patent[field] = sanitizeDate(req.body[field]);
        } else if (field === 'revenue') {
          patent.revenue = sanitizeAmount(req.body[field]);
        } else {
          patent[field] = req.body[field];
        }
      }
    });

    // Reassemble inventors if needed
    if (req.body.inventors === undefined && shouldUpdateFaculty && resolvedFaculty) {
      const names = [
        ...resolvedFaculty.associations.map(a => a.facultyName || a.employeeId),
        ...parsedExternalInventors.map(e => e.name).filter(Boolean)
      ];
      if (names.length > 0) {
        patent.inventors = names.join(', ');
      }
    }

    patent.grantYear = isTargetGranted ? yearValidation.grantYear : null;
    patent.academicYear = null;

    // Only coordinator, hod, and admin can change approval status
    if (['admin', 'coordinator', 'hod'].includes(req.user.role) && req.body.approvalStatus !== undefined) {
      patent.approvalStatus = req.body.approvalStatus;
    }

    // Only admin can change department
    if (req.user.role === 'admin' && req.body.department !== undefined) {
      patent.department = req.body.department;
    }

    await patent.save({ transaction });
    await transaction.commit();

    // Check if institutional Drive folder needs relocation due to status change to Granted or Grant Year correction
    if (
      (oldStatus !== patent.status || oldGrantYear !== patent.grantYear) &&
      patent.proofs && patent.proofs.some(p => p.sourceType === 'drive_upload' && p.driveFolderId)
    ) {
      const managedProof = patent.proofs.find(p => p.driveFolderId);
      if (managedProof && managedProof.driveFolderId) {
        googleDriveService.relocatePatentFolder({
          currentPatentFolderId: managedProof.driveFolderId,
          newYear: patent.grantYear,
          department: patent.department,
          patentId: patent.id
        }).catch(err => console.warn('[Relocation] Background relocation warning:', err.message));
      }
    }

    await logActionSafe({
      recordId: patent.id,
      title: patent.title,
      user: req.user,
      action: 'UPDATE_PATENT',
      previousValue: oldValues,
      updatedValue: patent.toJSON(),
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Updated patent: ${patent.title}`
    });

    const reloaded = await Patent.findByPk(patent.id, {
      include: [
        {
          model: PatentProof,
          as: 'proofs',
          where: { isActive: true },
          required: false
        },
        {
          model: PatentFaculty,
          as: 'facultyAssociations',
          required: false
        }
      ]
    });
    const { byId, byNormEmpKey } = await loadLiveFacultyMaps();
    const enriched = enrichPatentRecord(reloaded || patent, byId, byNormEmpKey);

    res.json({
      success: true,
      message: 'Patent updated successfully',
      warning: pubDateWarning,
      data: enriched
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Update patent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update patent',
      error: error.message
    });
  }
};

exports.deletePatent = async (req, res) => {
  try {
    const patent = await Patent.findByPk(req.params.id, {
      include: [{
        model: PatentProof,
        as: 'proofs',
        where: { isActive: true },
        required: false
      }]
    });

    if (!patent) {
      return res.status(404).json({
        success: false,
        message: 'Patent not found'
      });
    }

    const access = checkPatentAccess(patent, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({
        success: false,
        message: access.message
      });
    }

    const oldValues = patent.toJSON();

    // 1. Clean up managed files from Google Drive or local server storage
    if (patent.proofs && patent.proofs.length > 0) {
      for (const proof of patent.proofs) {
        if (proof.sourceType === 'local_upload' && proof.driveFileId) {
          try {
            if (fs.existsSync(proof.driveFileId)) fs.unlinkSync(proof.driveFileId);
          } catch (_) {}
        } else if (proof.sourceType === 'drive_upload' && proof.driveFileId) {
          try {
            googleDriveService.deletePatentProofFile(proof.driveFileId).catch(() => {});
          } catch (_) {}
        }
      }
    }

    // 2. Explicitly remove all proof records from database to prevent foreign key constraint issues
    try {
      await PatentProof.destroy({ where: { patentId: patent.id } });
    } catch (proofErr) {
      console.warn('[PatentController] Notice during proof cleanup:', proofErr.message);
    }

    // 3. Delete patent record
    await patent.destroy();

    // 4. Safe audit logging
    await logActionSafe({
      recordId: req.params.id,
      title: oldValues.title || 'Patent',
      user: req.user,
      action: 'DELETE_PATENT',
      previousValue: oldValues,
      updatedValue: null,
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Deleted patent: ${oldValues.title || req.params.id}`
    });

    res.json({
      success: true,
      message: 'Patent deleted successfully'
    });
  } catch (error) {
    console.error('Delete patent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete patent',
      error: error.message
    });
  }
};

// @desc    Bulk Upload Patents (from parsed CSV / Excel with Google Drive Proof links)
// @route   POST /api/patents/bulk
// @access  Private (Admin, HOD, Coordinator, Faculty)
exports.bulkUploadPatents = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, defaultDepartment, defaultYear } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No patent items provided for bulk upload.'
      });
    }

    let creatorId = req.user?.id;
    if (!creatorId) {
      const admin = await User.findOne({ where: { role: 'admin' } });
      creatorId = admin ? admin.id : null;
    }

    const validRecords = [];
    const recordProofLinks = [];
    const errors = [];
    const warnings = [];
    let missingPublicationDateCount = 0;
    let invalidPublicationDateCount = 0;
    let ambiguousPublicationDateCount = 0;

    items.forEach((item, index) => {
      const rowNum = index + 1;
      const title = extractField(
        item,
        'title', 'patentTitle', 'titleOfInvention', 'inventionTitle',
        'nameOfInvention', 'patentName', 'titleOfPatent', 'nameOfTheInvention',
        'nameOfProject', 'projectName', 'projectTitle', 'workTitle', 'invention'
      );
      const rawInventors = extractField(
        item,
        'inventors', 'inventorName', 'inventorNames', 'nameOfInventors',
        'nameOfTheInventors', 'authors', 'authorName', 'facultyName',
        'nameOfFaculty', 'faculty', 'investigators', 'investigatorName',
        'applicant', 'applicants', 'nameOfApplicant'
      );
      const applicationNo = extractField(
        item,
        'applicationNo', 'applicationNumber', 'appNo', 'appNumber',
        'applicationId', 'applNo', 'applNumber', 'filingNo', 'filingNumber'
      );
      const patentNo = extractField(
        item,
        'patentNo', 'patentNumber', 'grantNo', 'grantNumber', 'awardNo', 'patentGrantNo'
      );
      const rawStatus = extractField(
        item,
        'status', 'patentStatus', 'stage', 'currentStatus', 'filingStatus', 'progressStatus'
      ) || 'Published';
      const rawType = extractField(
        item,
        'patentType', 'type', 'jurisdiction', 'typeOfPatent', 'category', 'patentCategory'
      ) || 'National (Indian)';
      const rawYear = extractField(
        item,
        'year', 'grantYear', 'yearOfGrant', 'academicYear', 'ay', 'period'
      ) || defaultYear;
      const department = extractField(
        item,
        'department', 'dept', 'hostDepartment', 'departmentName', 'school', 'branch'
      ) || defaultDepartment || req.user?.department || 'General';
      const filedDate = extractField(
        item,
        'filedDate', 'filingDate', 'dateOfFiling', 'applicationDate', 'dateOfApplication'
      );
      const publishedDate = extractField(
        item,
        'publishedDate', 'publicationDate', 'dateOfPublication', 'dateOfPublishing'
      );
      const grantedDate = extractField(
        item,
        'grantedDate', 'grantDate', 'dateOfGrant', 'awardDate', 'dateOfAward'
      );
      const licenseDate = extractField(
        item,
        'licenseDate', 'commercializedDate', 'commercializationDate', 'dateOfCommercialization'
      );
      const partner = extractField(
        item,
        'partner', 'commercialPartner', 'licensee', 'industryPartner', 'collaboratingIndustry', 'collaborator'
      );
      const revenue = extractField(
        item,
        'revenue', 'revenueGenerated', 'royalty', 'amount', 'earnings', 'revenueInr', 'revenueInLakhs'
      );
      const patentUrl = extractField(
        item,
        'patentUrl', 'patentLink', 'url', 'link', 'documentUrl', 'gazetteUrl', 'googlePatentsLink'
      );
      const rawProof = extractField(
        item,
        'proof', 'proofs', 'proofUrl', 'proofUrls', 'driveUrl', 'googleDrive', 'googleDriveLink', 'proofDocuments'
      );
      const description = extractField(
        item,
        'description', 'abstract', 'summary', 'claims', 'briefDescription'
      );

      // Silently skip completely blank row
      if (!String(title).trim() && !String(rawInventors).trim() && !String(applicationNo).trim() && !String(patentNo).trim()) {
        return;
      }

      if (!String(title).trim()) {
        errors.push(`Row ${rowNum}: Patent Title is required.`);
        return;
      }
      if (!String(rawInventors).trim()) {
        errors.push(`Row ${rowNum}: Inventor Name(s) are required for "${String(title).trim()}".`);
        return;
      }

      // Department authorization check
      if (req.user && ['coordinator', 'hod'].includes(req.user.role)) {
        if (req.user.department && req.user.department !== 'All' && String(department).trim() !== req.user.department) {
          errors.push(`Row ${rowNum}: Department '${department}' is outside your authorized scope (${req.user.department}).`);
          return;
        }
      }

      // Normalize status
      let normalizedStatus = String(rawStatus).trim().toLowerCase();
      if (normalizedStatus.includes('commercial') || normalizedStatus.includes('license')) {
        normalizedStatus = 'commercialized';
      } else if (normalizedStatus.includes('grant')) {
        normalizedStatus = 'granted';
      } else if (normalizedStatus.includes('publish')) {
        normalizedStatus = 'published';
      } else if (normalizedStatus.includes('exam')) {
        normalizedStatus = 'under_examination';
      } else {
        normalizedStatus = 'filed';
      }

      // Year of Grant validation
      const yearValidation = validateYearAndStatus(normalizedStatus, grantedDate, rawYear);
      if (!yearValidation.valid) {
        errors.push(`Row ${rowNum} ("${String(title).trim().slice(0, 30)}..."): ${yearValidation.error}`);
        return;
      }

      // Validate Google Drive Proof links (if provided in Proof cell)
      const validProofUrlsForRow = [];
      if (rawProof && String(rawProof).trim()) {
        // Split on newlines or commas
        const candidateLinks = String(rawProof).split(/[\n,]+/);
        for (const cl of candidateLinks) {
          const trimmedLink = cl.trim();
          if (!trimmedLink) continue;
          const v = googleDriveService.validateDriveUrl(trimmedLink);
          if (v.valid) {
            validProofUrlsForRow.push({
              url: v.sanitizedUrl,
              fileId: v.fileId
            });
          } else {
            errors.push(`Row ${rowNum}: Invalid Google Drive Proof URL '${trimmedLink}' (${v.error}).`);
            return;
          }
        }
      }

      // Normalize patent type
      let normalizedType = String(rawType).trim();
      const lowerType = normalizedType.toLowerCase();
      if (lowerType.includes('pct') || lowerType.includes('wipo')) {
        normalizedType = 'International (PCT)';
      } else if (lowerType.includes('uspto') || lowerType.includes('usa') || lowerType.includes('us')) {
        normalizedType = 'USPTO (USA)';
      } else if (lowerType.includes('epo') || lowerType.includes('europe')) {
        normalizedType = 'EPO (Europe)';
      } else if (lowerType.includes('international') || lowerType.includes('foreign')) {
        normalizedType = 'Other International';
      } else {
        normalizedType = 'National (Indian)';
      }

      // Validate Publication Date & derive Publication Year
      const pubDateCheck = parseAndValidatePublicationDate(publishedDate);
      if (!pubDateCheck.valid) {
        if (pubDateCheck.isAmbiguous) {
          ambiguousPublicationDateCount++;
          errors.push(`Row ${rowNum} ("${String(title).trim().slice(0, 30)}..."): ${pubDateCheck.error}`);
        } else {
          invalidPublicationDateCount++;
          errors.push(`Row ${rowNum} ("${String(title).trim().slice(0, 30)}..."): ${pubDateCheck.error}`);
        }
        return;
      }

      if (pubDateCheck.isBlank) {
        missingPublicationDateCount++;
        warnings.push(`Row ${rowNum} ("${String(title).trim().slice(0, 30)}..."): ${pubDateCheck.warning}`);
      }

      const inventorsStr = Array.isArray(rawInventors) ? rawInventors.join(', ') : String(rawInventors);

      validRecords.push({
        title: String(title).trim(),
        inventors: inventorsStr.trim(),
        applicationNo: applicationNo ? String(applicationNo).trim() : null,
        patentNo: patentNo ? String(patentNo).trim() : null,
        status: normalizedStatus,
        patentType: normalizedType,
        department: String(department).trim(),
        grantYear: yearValidation.grantYear,
        academicYear: null,
        publicationYear: pubDateCheck.publicationYear,
        filedDate: sanitizeDate(filedDate),
        publishedDate: pubDateCheck.isoDate,
        grantedDate: sanitizeDate(grantedDate),
        licenseDate: sanitizeDate(licenseDate),
        partner: partner ? String(partner).trim() : null,
        revenue: sanitizeAmount(revenue),
        patentUrl: patentUrl ? String(patentUrl).trim() : null,
        description: description ? String(description).trim() : null,
        approvalStatus: req.user?.role === 'admin' ? 'approved' : 'submitted',
        createdBy: creatorId
      });

      recordProofLinks.push(validProofUrlsForRow);
    });

    if (validRecords.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: errors.length > 0 ? errors[0] : 'No valid patent records found to insert.',
        errors
      });
    }

    const createdPatents = await Patent.bulkCreate(validRecords, {
      transaction: t,
      returning: true
    });

    // Create Proof records for each patent that had Google Drive links
    const proofRecordsToCreate = [];
    createdPatents.forEach((patent, idx) => {
      const proofsForRow = recordProofLinks[idx] || [];
      proofsForRow.forEach(p => {
        proofRecordsToCreate.push({
          patentId: patent.id,
          sourceType: 'drive_link',
          driveFileId: p.fileId,
          driveUrl: p.url,
          fileName: `Google Drive Document (${p.fileId.slice(0, 8)})`,
          uploadedBy: creatorId,
          accessStatus: 'pending_verification',
          isActive: true
        });
      });
    });

    if (proofRecordsToCreate.length > 0) {
      await PatentProof.bulkCreate(proofRecordsToCreate, {
        transaction: t
      });
    }

    await t.commit();

    await logActionSafe({
      user: req.user,
      action: 'BULK_UPLOAD_PATENTS',
      previousValue: null,
      updatedValue: {
        count: createdPatents.length,
        proofLinksCount: proofRecordsToCreate.length,
        errorsCount: errors.length
      },
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Bulk uploaded ${createdPatents.length} patents with ${proofRecordsToCreate.length} proof links`
    });

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${createdPatents.length} patent records (${proofRecordsToCreate.length} Proof links attached).`,
      count: createdPatents.length,
      totalRows: items.length,
      importedCount: createdPatents.length,
      proofCount: proofRecordsToCreate.length,
      missingPublicationDateCount,
      invalidPublicationDateCount,
      ambiguousPublicationDateCount,
      rejectedCount: errors.length,
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : undefined,
      data: createdPatents
    });
  } catch (error) {
    if (t && !t.finished) {
      try {
        await t.rollback();
      } catch (rbErr) {
        // ignore rollback errors if already committed
      }
    }
    console.error('Bulk upload patents error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to process bulk upload for patents: ${error.message}`,
      error: error.message
    });
  }
};

// @desc    Upload Proof files for a patent (Google Drive with automatic local server storage fallback)
// @route   POST /api/patents/:id/proofs
// @access  Private
exports.uploadPatentProof = async (req, res) => {
  try {
    const patent = await Patent.findByPk(req.params.id);
    if (!patent) {
      return res.status(404).json({ success: false, message: 'Patent not found' });
    }

    const access = checkPatentAccess(patent, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No proof files provided for upload.' });
    }

    // Check maximum active attachments limit (10 per patent)
    const existingCount = await PatentProof.count({
      where: { patentId: patent.id, isActive: true }
    });

    if (existingCount + files.length > 10) {
      return res.status(400).json({
        success: false,
        message: `Attachment limit exceeded: Maximum 10 active proof attachments allowed per patent. Current: ${existingCount}, Attempted: ${files.length}.`
      });
    }

    const uploaded = [];
    const failed = [];

    for (const file of files) {
      let createdProof = null;

      // 1. Attempt Google Drive upload first (works seamlessly on Google Workspace Shared Drives)
      if (googleDriveService.isDriveConfigured()) {
        try {
          const driveResult = await googleDriveService.uploadPatentProofFile({
            patentId: patent.id,
            department: patent.department,
            year: patent.grantYear,
            fileBuffer: file.buffer,
            fileName: file.originalname,
            mimeType: file.mimetype
          });

          createdProof = await PatentProof.create({
            patentId: patent.id,
            sourceType: 'drive_upload',
            driveFileId: driveResult.driveFileId,
            driveFolderId: driveResult.driveFolderId,
            driveUrl: driveResult.driveUrl,
            fileName: driveResult.fileName,
            mimeType: driveResult.mimeType,
            fileSize: driveResult.fileSize,
            uploadedBy: req.user.id,
            accessStatus: 'verified',
            accessRemarks: 'Uploaded to institutional Google Drive',
            isActive: true
          });
        } catch (driveErr) {
          console.warn(`[PatentController] Google Drive upload attempt note for ${file.originalname}: ${driveErr.message}`);
          console.warn(`[PatentController] Notice: Falling back to platform server storage so user upload succeeds without interruption...`);
        }
      }

      // 2. Graceful fallback: If Google Drive is not configured or fails due to personal account 0MB quota limitation, store locally
      if (!createdProof) {
        try {
          const proofId = crypto.randomUUID();
          const ext = path.extname(file.originalname);
          const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_\-\.]/g, '_');
          const diskFileName = `${proofId}_${safeBase}${ext}`;

          const yearFolder = String(patent.grantYear || 'pending');
          const deptFolder = (patent.department || 'general').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
          const uploadsDir = path.resolve(__dirname, '../uploads/patents', yearFolder, deptFolder);
          fs.mkdirSync(uploadsDir, { recursive: true });

          const targetFilePath = path.join(uploadsDir, diskFileName);
          fs.writeFileSync(targetFilePath, file.buffer);

          const host = req.get('host') || 'localhost:5000';
          const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
          const fileUrl = `${protocol}://${host}/api/patents/proofs/file/${proofId}`;

          createdProof = await PatentProof.create({
            id: proofId,
            patentId: patent.id,
            sourceType: 'local_upload',
            driveFileId: targetFilePath,
            driveFolderId: null,
            driveUrl: fileUrl,
            fileName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size || file.buffer.length,
            uploadedBy: req.user.id,
            accessStatus: 'verified',
            accessRemarks: 'Stored securely on platform server storage',
            isActive: true
          });

          console.log(`[PatentController] Successfully saved proof file to platform storage: ${targetFilePath} (Proof ID: ${proofId})`);
        } catch (localErr) {
          console.error(`[PatentController ERROR] Server storage fallback failed for ${file.originalname}:`, localErr.message);
          failed.push({
            fileName: file.originalname,
            error: localErr.message
          });
        }
      }

      if (createdProof) {
        uploaded.push(createdProof);
      }
    }

    if (uploaded.length > 0) {
      await logActionSafe({
        recordId: patent.id,
        title: patent.title,
        user: req.user,
        action: 'ADD_PATENT_PROOF',
        previousValue: null,
        updatedValue: { uploadedCount: uploaded.length, failedCount: failed.length },
        ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
        remarks: `Uploaded ${uploaded.length} proof document(s) for patent: ${patent.title}`
      });
    }

    console.log(`[PatentController] Completed upload processing: ${uploaded.length} succeeded, ${failed.length} failed.`);

    res.status(uploaded.length > 0 ? 201 : 400).json({
      success: uploaded.length > 0,
      message: uploaded.length > 0
        ? `Successfully uploaded ${uploaded.length} of ${files.length} proof document(s).`
        : `Failed to upload proof document(s). Check server logs for details.`,
      uploaded,
      failed
    });
  } catch (error) {
    console.error('Upload proof error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process proof upload',
      error: error.message
    });
  }
};

// @desc    Add external Google Drive Proof links to a patent (Method B)
// @route   POST /api/patents/:id/proof-links
// @access  Private
exports.addPatentProofLinks = async (req, res) => {
  try {
    const patent = await Patent.findByPk(req.params.id);
    if (!patent) {
      return res.status(404).json({ success: false, message: 'Patent not found' });
    }

    const access = checkPatentAccess(patent, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const { links } = req.body;
    if (!links) {
      return res.status(400).json({ success: false, message: 'No Google Drive links provided.' });
    }

    const linkList = Array.isArray(links)
      ? links
      : String(links).split('\n');

    const cleanLinks = linkList.map(l => l.trim()).filter(Boolean);
    if (cleanLinks.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one valid Google Drive link.' });
    }

    // Check maximum active attachments limit
    const existingCount = await PatentProof.count({
      where: { patentId: patent.id, isActive: true }
    });

    if (existingCount + cleanLinks.length > 10) {
      return res.status(400).json({
        success: false,
        message: `Attachment limit exceeded: Maximum 10 active proof attachments allowed per patent. Current: ${existingCount}, Attempted: ${cleanLinks.length}.`
      });
    }

    const createdProofs = [];
    const invalidLinks = [];

    for (const url of cleanLinks) {
      const validation = googleDriveService.validateDriveUrl(url);
      if (!validation.valid) {
        invalidLinks.push({ url, error: validation.error });
        continue;
      }

      // Check if this fileId / URL is already attached to this patent
      const duplicate = await PatentProof.findOne({
        where: {
          patentId: patent.id,
          driveUrl: validation.sanitizedUrl,
          isActive: true
        }
      });

      if (duplicate) {
        invalidLinks.push({ url, error: 'Document link already attached to this patent' });
        continue;
      }

      const verification = await googleDriveService.verifyDriveLinkAccess(validation.sanitizedUrl);

      const record = await PatentProof.create({
        patentId: patent.id,
        sourceType: 'drive_link',
        driveFileId: validation.fileId,
        driveUrl: validation.sanitizedUrl,
        fileName: verification.fileName || `Google Drive Document (${validation.fileId.slice(0, 8)})`,
        mimeType: verification.mimeType || 'application/vnd.google-apps.document',
        fileSize: verification.fileSize || null,
        uploadedBy: req.user.id,
        accessStatus: verification.status,
        accessRemarks: verification.remarks,
        isActive: true
      });

      createdProofs.push(record);
    }

    if (createdProofs.length > 0) {
      await logActionSafe({
        recordId: patent.id,
        title: patent.title,
        user: req.user,
        action: 'ADD_PATENT_PROOF_LINK',
        previousValue: null,
        updatedValue: { createdCount: createdProofs.length, invalidCount: invalidLinks.length },
        ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
        remarks: `Attached ${createdProofs.length} Google Drive link(s) for patent: ${patent.title}`
      });
    }

    res.status(201).json({
      success: createdProofs.length > 0,
      message: `Successfully attached ${createdProofs.length} Google Drive link(s).`,
      proofs: createdProofs,
      invalidLinks: invalidLinks.length > 0 ? invalidLinks : undefined
    });
  } catch (error) {
    console.error('Add proof links error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add proof links',
      error: error.message
    });
  }
};

// @desc    Get active Proofs for a specific patent
// @route   GET /api/patents/:id/proofs
// @access  Private
exports.getPatentProofs = async (req, res) => {
  try {
    const patent = await Patent.findByPk(req.params.id);
    if (!patent) {
      return res.status(404).json({ success: false, message: 'Patent not found' });
    }

    const access = checkPatentAccess(patent, req.user, 'view');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const proofs = await PatentProof.findAll({
      where: { patentId: patent.id, isActive: true },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: proofs
    });
  } catch (error) {
    console.error('Get patent proofs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve patent proofs',
      error: error.message
    });
  }
};

// @desc    Remove a Proof reference from a patent
// @route   DELETE /api/patents/:id/proofs/:proofId
// @access  Private
exports.deletePatentProof = async (req, res) => {
  try {
    const { id: patentId, proofId } = req.params;

    const patent = await Patent.findByPk(patentId);
    if (!patent) {
      return res.status(404).json({ success: false, message: 'Patent not found' });
    }

    const access = checkPatentAccess(patent, req.user, 'manage');
    if (!access.allowed) {
      return res.status(403).json({ success: false, message: access.message });
    }

    const proof = await PatentProof.findOne({
      where: { id: proofId, patentId: patent.id, isActive: true }
    });

    if (!proof) {
      return res.status(404).json({ success: false, message: 'Proof attachment not found' });
    }

    // If local file, delete from disk; if managed file in Drive, delete from Drive
    if (proof.sourceType === 'local_upload' && proof.driveFileId) {
      try {
        if (fs.existsSync(proof.driveFileId)) {
          fs.unlinkSync(proof.driveFileId);
          console.log(`[PatentController] Deleted local proof file: ${proof.driveFileId}`);
        }
      } catch (fsErr) {
        console.warn('[PatentController] Could not unlink local file (non-fatal):', fsErr.message);
      }
    } else if (proof.sourceType === 'drive_upload' && proof.driveFileId) {
      googleDriveService.deletePatentProofFile(proof.driveFileId).catch(() => {});
    }

    await proof.destroy();

    await logActionSafe({
      recordId: proof.id,
      title: proof.fileName || 'Patent Proof',
      user: req.user,
      action: 'REMOVE_PATENT_PROOF',
      previousValue: proof.toJSON(),
      updatedValue: null,
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Removed proof document from patent: ${patent.title}`
    });

    res.json({
      success: true,
      message: 'Proof document removed successfully'
    });
  } catch (error) {
    console.error('Delete patent proof error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete proof document',
      error: error.message
    });
  }
};

// @desc    Stream / view a locally stored patent proof file
// @route   GET /api/patents/proofs/file/:proofId
// @access  Public / Direct Link with secure proof UUID
exports.getPatentProofFile = async (req, res) => {
  try {
    const proof = await PatentProof.findByPk(req.params.proofId);
    if (!proof || !proof.isActive) {
      return res.status(404).json({ success: false, message: 'Proof document not found or inactive.' });
    }

    // If external Google Drive link, redirect to Google Drive
    if (proof.sourceType === 'drive_link' || (proof.sourceType === 'drive_upload' && proof.driveUrl && proof.driveUrl.includes('drive.google.com'))) {
      return res.redirect(proof.driveUrl);
    }

    const filePath = proof.driveFileId;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Local proof file could not be found on server storage.' });
    }

    res.setHeader('Content-Type', proof.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(proof.fileName)}"`);

    const stream = fs.createReadStream(filePath);
    stream.on('error', (streamErr) => {
      console.error('File stream error:', streamErr);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error streaming file.' });
      }
    });
    stream.pipe(res);
  } catch (error) {
    console.error('Get proof file error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving file.', error: error.message });
  }
};

// @desc    Clear all patents (Admin / HOD / Coordinator)
// @route   DELETE /api/patents/clear-all
// @access  Private (Admin / HOD)
exports.clearAllPatents = async (req, res) => {
  try {
    // If request query/body lacks confirmation params, inject for authorized admin
    if (req.user && (req.user.isSystemAdmin || req.user.role === 'admin' || req.user.role === 'iqac_admin')) {
      if (!req.query) req.query = {};
      if (!req.query.confirmAll && (!req.body || !req.body.confirmAll)) {
        req.query.confirmAll = 'true';
      }
      if (!req.query.confirmation && (!req.body || !req.body.confirmation)) {
        req.query.confirmation = 'CONFIRM_UNIVERSITY_CLEAR';
      }
    }

    const { where, scopeDescription } = await resolveDepartmentScope(req, 'Patent', true);

    let count = 0;
    await sequelize.transaction(async (t) => {
      if (where && Object.keys(where).length > 0) {
        const patentsToDelete = await Patent.findAll({ where, attributes: ['id'], transaction: t });
        const ids = patentsToDelete.map(p => p.id);
        if (ids.length > 0) {
          if (PatentFaculty) await PatentFaculty.destroy({ where: { patentId: ids }, transaction: t });
          if (PatentProof) await PatentProof.destroy({ where: { patentId: ids }, transaction: t });
          count = await Patent.destroy({ where: { id: ids }, transaction: t });
        }
      } else {
        if (PatentFaculty) await PatentFaculty.destroy({ where: {}, transaction: t });
        if (PatentProof) await PatentProof.destroy({ where: {}, transaction: t });
        count = await Patent.destroy({ where: {}, transaction: t });
      }
    });

    await logActionSafe({
      user: req.user,
      action: 'CLEAR_ALL_PATENTS',
      title: `Cleared patents: ${scopeDescription}`,
      remarks: `Deleted ${count} patent records. Scope: ${scopeDescription}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      count,
      message: `Cleared ${count} patent records successfully for ${scopeDescription}.`
    });
  } catch (error) {
    console.error('Clear patents error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to clear patents'
    });
  }
};

// Export validation helper for unit testing
// ──────────────────────────────────────────────────────────────────────────────
// 6. DOWNLOAD OFFICIAL 15-COLUMN PATENTS EXCEL TEMPLATE
// ──────────────────────────────────────────────────────────────────────────────
exports.downloadPatentTemplate = async (req, res) => {
  try {
    const buffer = generatePatentTemplateBuffer();
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Patents_Bulk_Upload_Template.xlsx"'
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.send(buffer);
  } catch (error) {
    console.error('Download patent template error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate patent spreadsheet template.' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 7. PREVIEW BULK UPLOAD PATENTS (Row-by-Row Evaluation)
// ──────────────────────────────────────────────────────────────────────────────
exports.previewBulkUploadPatents = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'No file provided. Please upload an Excel (.xlsx, .xls) or CSV file.'
      });
    }

    const { headers, rows } = parsePatentSpreadsheetBuffer(req.file.buffer);
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'The uploaded spreadsheet is empty or contains no readable data rows.'
      });
    }

    const result = await evaluateBulkPatentRows(rows, {
      headers,
      Patent,
      Faculty,
      PatentFaculty
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
    console.error('Preview bulk upload patents error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to parse and preview patent spreadsheet' });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// 8. IMPORT BULK UPLOAD PATENTS (Atomic Transaction & Duplicate Skip)
// ──────────────────────────────────────────────────────────────────────────────
exports.importBulkUploadPatents = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    if (!req.file || !req.file.buffer) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'No file provided. Please upload an Excel (.xlsx, .xls) or CSV file.'
      });
    }

    const { headers, rows } = parsePatentSpreadsheetBuffer(req.file.buffer);
    if (!Array.isArray(rows) || rows.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'The uploaded spreadsheet is empty or contains no readable data rows.'
      });
    }

    const evaluation = await evaluateBulkPatentRows(rows, {
      headers,
      Patent,
      Faculty,
      PatentFaculty
    });

    if (!evaluation.validColumns) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: evaluation.error || `Missing required columns: ${(evaluation.missingColumns || []).join(', ')}`,
        missingColumns: evaluation.missingColumns
      });
    }

    let creatorId = req.user?.id;
    if (!creatorId) {
      const admin = await User.findOne({ where: { role: 'admin' }, transaction });
      creatorId = admin ? admin.id : null;
    }

    const defaultApproval = ['admin', 'coordinator', 'hod'].includes(req.user?.role) ? 'approved' : 'submitted';

    const eligibleRows = evaluation.rows.filter(r => r.rowStatus === 'valid' || r.rowStatus === 'warning');
    const skippedDuplicatesCount = evaluation.rows.filter(r => r.rowStatus === 'duplicate').length;
    const rejectedErrorCount = evaluation.rows.filter(r => r.rowStatus === 'error').length;

    let importedCount = 0;
    let warningInvalidEmpIdCount = 0;
    let missingPublicationDateCount = 0;

    for (const r of eligibleRows) {
      const d = r.data;
      if (d.hasInvalidEmpIds) warningInvalidEmpIdCount++;
      if (!d.publicationDate) missingPublicationDateCount++;

      // Primary department determination
      let primaryDept = 'General';
      const firstValidAssoc = (d.facultyAssociations || []).find(a => a.isValid && a.originalDepartment);
      if (firstValidAssoc) {
        primaryDept = firstValidAssoc.originalDepartment;
      } else if (req.user?.department && req.user.department !== 'All') {
        primaryDept = req.user.department;
      }

      // Assemble inventors text for backward compatibility
      const inventorsList = (d.facultyAssociations || []).map(a => a.facultyName || a.employeeId);
      const inventorsStr = inventorsList.length > 0 ? inventorsList.join(', ') : 'Not specified';

      const patent = await Patent.create({
        title: d.title,
        inventors: inventorsStr,
        applicationNo: d.applicationNo,
        patentNo: d.patentNo,
        status: d.status,
        patentType: d.patentType,
        department: primaryDept,
        grantYear: d.status === 'granted' && d.grantDate ? parseInt(d.grantDate.slice(0, 4), 10) : null,
        academicYear: null,
        publicationYear: d.publicationYear,
        filedDate: d.filingDate,
        publishedDate: d.publicationDate,
        grantedDate: d.grantDate,
        licenseDate: d.licenseDate,
        partner: d.partner,
        revenue: d.revenue,
        patentUrl: d.patentUrl,
        description: d.abstract,
        approvalStatus: defaultApproval,
        createdBy: creatorId,
        empIdsRaw: d.empIdsRaw,
        hasInvalidEmpIds: d.hasInvalidEmpIds,
        invalidEmpIds: d.invalidEmpIds,
        duplicateEmpIds: d.duplicateEmpIds,
        externalInventors: []
      }, { transaction });

      // Create associations in junction table
      if (d.facultyAssociations && d.facultyAssociations.length > 0) {
        await PatentFaculty.bulkCreate(
          d.facultyAssociations.map(assoc => ({
            patentId: patent.id,
            facultyId: assoc.facultyId,
            employeeId: assoc.employeeId,
            normalizedEmployeeId: assoc.normalizedEmployeeId,
            facultyName: assoc.facultyName,
            designation: assoc.designation,
            originalDepartment: assoc.originalDepartment,
            originalDepartmentSource: assoc.originalDepartmentSource,
            isValid: assoc.isValid,
            displayOrder: assoc.displayOrder
          })),
          { transaction }
        );
      }

      // Attach proof if Google Drive link provided
      if (d.proofUrl) {
        const validation = googleDriveService.validateDriveUrl(d.proofUrl);
        if (validation.valid) {
          const verification = await googleDriveService.verifyDriveLinkAccess(d.proofUrl);
          await PatentProof.create({
            patentId: patent.id,
            sourceType: 'drive_link',
            driveFileId: validation.fileId,
            driveUrl: d.proofUrl,
            fileName: verification.fileName || `Google Drive Document (${validation.fileId.slice(0, 8)})`,
            mimeType: verification.mimeType || 'application/vnd.google-apps.document',
            fileSize: verification.fileSize || null,
            uploadedBy: creatorId,
            accessStatus: verification.status,
            accessRemarks: verification.remarks,
            isActive: true
          }, { transaction });
        }
      }

      importedCount++;
    }

    await transaction.commit();

    await logActionSafe({
      recordId: null,
      title: 'Bulk Patent Import',
      user: req.user,
      action: 'BULK_IMPORT_PATENTS',
      previousValue: null,
      updatedValue: { importedCount, skippedDuplicatesCount, rejectedErrorCount },
      ipAddress: req.ip || (req.socket && req.socket.remoteAddress) || null,
      remarks: `Bulk imported ${importedCount} patent(s) from spreadsheet. Skipped ${skippedDuplicatesCount} duplicate(s).`
    });

    res.json({
      success: true,
      message: `Successfully imported ${importedCount} patent record(s). Skipped ${skippedDuplicatesCount} duplicate(s).`,
      summary: {
        totalRows: evaluation.rows.length,
        importedCount,
        importedWithInvalidEmpIdsCount: warningInvalidEmpIdCount,
        missingPublicationDateCount,
        skippedDuplicatesCount,
        rejectedErrorCount
      },
      rows: evaluation.rows
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error('Import bulk upload patents error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to import patents from spreadsheet' });
  }
};

exports.validateYearAndStatus = validateYearAndStatus;
exports.parseAndValidatePublicationDate = parseAndValidatePublicationDate;
exports.buildIsoDateIfValid = buildIsoDateIfValid;

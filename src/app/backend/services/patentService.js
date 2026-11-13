'use strict';

/**
 * Patent Service
 *
 * Implements authoritative business logic, faculty resolution, multi-inventor handling,
 * external inventor support, department attribution, duplicate detection,
 * date normalization, and bulk upload processing for Patents.
 */

const { Op } = require('sequelize');
const googleDriveService = require('./googleDriveService');

/**
 * Normalizes a department string conservatively for matching.
 */
function normalizeDeptKey(val) {
  if (!val) return '';
  return String(val)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bdept\.?\b/g, 'department')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Normalizes an Employee ID for comparison while preserving exact trimmed string representation.
 */
function normalizeEmpIdKey(empId) {
  if (empId === null || empId === undefined) return '';
  return String(empId).trim().toUpperCase();
}

/**
 * Parses and normalizes single or comma-separated Employee IDs.
 */
function parseAndNormalizeEmpIds(rawInput) {
  let rawTokens = [];
  if (Array.isArray(rawInput)) {
    rawTokens = rawInput.flatMap(item => String(item ?? '').split(/[,;\n\r]+/));
  } else if (rawInput !== null && rawInput !== undefined) {
    rawTokens = String(rawInput).split(/[,;\n\r]+/);
  }

  const seenKeys = new Set();
  const empIds = [];
  const normalizedKeys = [];
  const duplicateEmpIds = [];

  for (const token of rawTokens) {
    const trimmed = String(token || '').trim();
    if (!trimmed) continue;
    const key = normalizeEmpIdKey(trimmed);
    if (!key) continue;
    if (seenKeys.has(key)) {
      duplicateEmpIds.push(trimmed);
      continue;
    }
    seenKeys.add(key);
    empIds.push(trimmed);
    normalizedKeys.push(key);
  }

  return {
    empIds,
    normalizedKeys,
    duplicateEmpIds,
    empIdsRaw: empIds.join(', ')
  };
}

/**
 * Validates calendar year / month / day bounds strictly in UTC.
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
 * Checks if a value represents an empty/blank date.
 */
function isBlankDateValue(val) {
  if (val === null || val === undefined) return true;
  if (val instanceof Date) return isNaN(val.getTime());
  const str = String(val).trim();
  if (!str) return true;
  const lower = str.toLowerCase();
  return ['n/a', 'na', 'nil', 'null', '-', '--', 'pending', 'under examination', 'not applicable', 'none', 'tbd', 'ongoing'].includes(lower);
}

/**
 * Parses and normalizes dates into ISO YYYY-MM-DD strictly without timezone shifts.
 */
function sanitizeDateNoShift(val) {
  if (val === null || val === undefined || val === '') return null;

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const isUtcMidnight = val.getUTCHours() === 0 && val.getUTCMinutes() === 0 && val.getUTCSeconds() === 0;
    return isUtcMidnight
      ? buildIsoDateIfValid(val.getUTCFullYear(), val.getUTCMonth() + 1, val.getUTCDate())
      : buildIsoDateIfValid(val.getFullYear(), val.getMonth() + 1, val.getDate());
  }

  if (typeof val === 'number') {
    if (!Number.isFinite(val) || val < 1) return null;
    const ms = Date.UTC(1899, 11, 30) + Math.round(val) * 86400000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    return buildIsoDateIfValid(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  const str = String(val).trim();
  if (!str || isBlankDateValue(str)) return null;

  if (/^\d{5,6}(\.\d+)?$/.test(str)) {
    const num = Math.round(parseFloat(str));
    const ms = Date.UTC(1899, 11, 30) + num * 86400000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      return buildIsoDateIfValid(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
  }

  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:$|T|\s)/);
  if (isoMatch) {
    return buildIsoDateIfValid(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10), parseInt(isoMatch[3], 10));
  }

  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2}|\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (dmyMatch[3].length === 2) year += 2000;
    return buildIsoDateIfValid(year, month, day);
  }

  const monthNames = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
    aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
    nov: 11, november: 11, dec: 12, december: 12
  };
  const dMonY = str.match(/^(\d{1,2})[\s\-]+([A-Za-z]+)[\s\-,]+(\d{4})$/);
  if (dMonY && monthNames[dMonY[2].toLowerCase()]) {
    return buildIsoDateIfValid(parseInt(dMonY[3], 10), monthNames[dMonY[2].toLowerCase()], parseInt(dMonY[1], 10));
  }
  const monDY = str.match(/^([A-Za-z]+)[\s\-]+(\d{1,2}),?[\s\-]+(\d{4})$/);
  if (monDY && monthNames[monDY[1].toLowerCase()]) {
    return buildIsoDateIfValid(parseInt(monDY[3], 10), monthNames[monDY[1].toLowerCase()], parseInt(monDY[2], 10));
  }

  return null;
}

/**
 * Authoritative Publication Date parser & calendar Publication Year derivation.
 */
function parseAndValidatePublicationDate(val, options = {}) {
  if (val === null || val === undefined || isBlankDateValue(val)) {
    return {
      valid: true,
      isBlank: true,
      isoDate: null,
      publicationYear: null,
      warning: 'Publication Date is missing. Publication Year could not be derived.'
    };
  }

  // Handle Date objects
  if (val instanceof Date) {
    if (isNaN(val.getTime())) {
      return {
        valid: false,
        isInvalid: true,
        error: 'Invalid Publication Date. Please provide a recognizable calendar date.'
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

  // Handle Excel numeric serial
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
  if (!str || isBlankDateValue(str)) {
    return {
      valid: true,
      isBlank: true,
      isoDate: null,
      publicationYear: null,
      warning: 'Publication Date is missing. Publication Year could not be derived.'
    };
  }

  // Numeric serial string
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

  // ISO format
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

  // Ambiguity check for DD/MM/YYYY vs MM/DD/YYYY
  const partsMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2}|\d{4})$/);
  if (partsMatch) {
    const p1 = parseInt(partsMatch[1], 10);
    const p2 = parseInt(partsMatch[2], 10);
    let p3 = parseInt(partsMatch[3], 10);
    if (partsMatch[3].length === 2) p3 += 2000;

    // Disallow ambiguous dates unless explicit format given
    if (!options.explicitDateFormat && p1 <= 12 && p2 <= 12 && p1 !== p2) {
      return {
        valid: false,
        isAmbiguous: true,
        error: `Ambiguous Publication Date '${str}'. Day and month are both <= 12. Please use explicit YYYY-MM-DD or DD-MMM-YYYY.`
      };
    }

    const day = (options.explicitDateFormat === 'MM/DD/YYYY' && p1 <= 12) ? p2 : p1;
    const month = (options.explicitDateFormat === 'MM/DD/YYYY' && p1 <= 12) ? p1 : p2;
    const iso = buildIsoDateIfValid(p3, month, day);
    if (!iso) {
      return {
        valid: false,
        isInvalid: true,
        error: `Invalid calendar date in Publication Date '${str}'.`
      };
    }
    return {
      valid: true,
      isBlank: false,
      isoDate: iso,
      publicationYear: p3
    };
  }

  // Named month match
  const isoFromNamed = sanitizeDateNoShift(str);
  if (isoFromNamed) {
    const y = parseInt(isoFromNamed.slice(0, 4), 10);
    return {
      valid: true,
      isBlank: false,
      isoDate: isoFromNamed,
      publicationYear: y
    };
  }

  return {
    valid: false,
    isInvalid: true,
    error: `Invalid Publication Date '${str}'. Format could not be recognized.`
  };
}

/**
 * Generates duplicate keys for Patent deduplication:
 * 1. primary: Application No (trimmed, uppercase)
 * 2. fallback: Normalized Title + Filing Date + sorted deduplicated EmpIds
 */
function generatePatentDuplicateKeys({ applicationNo, title, filedDate, empIds }) {
  const normAppNo = applicationNo && String(applicationNo).trim() !== ''
    ? String(applicationNo).trim().toUpperCase()
    : null;

  const normTitle = String(title || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  const normDate = sanitizeDateNoShift(filedDate) || '';
  const { normalizedKeys } = parseAndNormalizeEmpIds(empIds);
  const sortedKeys = [...normalizedKeys].sort();
  const fallbackKey = `${normTitle}::${normDate}::${sortedKeys.join('|')}`;

  return {
    primaryKey: normAppNo,
    fallbackKey
  };
}

/**
 * Resolves a list of normalized EmpIds against existing Faculty Management & History models.
 */
async function resolveFacultyAssociationsForEmpIds(
  empIds,
  referenceDate,
  { Faculty, User, UserDepartmentHistory } = {},
  preloadedFacultyRows = null
) {
  if (!Array.isArray(empIds) || empIds.length === 0) {
    return {
      associations: [],
      invalidEmpIds: [],
      hasInvalidEmpIds: false
    };
  }

  let allFacultyRows = preloadedFacultyRows;
  if (!Array.isArray(allFacultyRows) && Faculty) {
    allFacultyRows = await Faculty.findAll({
      attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email', 'academicYear', 'createdAt'],
      raw: true
    });
  }
  allFacultyRows = allFacultyRows || [];

  const facultyByNormKey = new Map();
  for (const row of allFacultyRows) {
    const key = normalizeEmpIdKey(row.employeeId);
    if (!key) continue;
    if (!facultyByNormKey.has(key)) facultyByNormKey.set(key, []);
    facultyByNormKey.get(key).push(row);
  }

  const associations = [];
  const invalidEmpIds = [];

  empIds.forEach((empId, idx) => {
    const normKey = normalizeEmpIdKey(empId);
    const matchingRows = facultyByNormKey.get(normKey) || [];

    if (matchingRows.length === 0) {
      invalidEmpIds.push(empId);
      associations.push({
        facultyId: null,
        employeeId: empId,
        normalizedEmployeeId: normKey,
        facultyName: null,
        designation: null,
        originalDepartment: null,
        originalDepartmentSource: 'unrecognized',
        isValid: false,
        displayOrder: idx
      });
    } else {
      // Latest profile for canonical current info
      const sortedDesc = [...matchingRows].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
      const fac = sortedDesc[0];

      associations.push({
        facultyId: fac.id || null,
        employeeId: fac.employeeId ? String(fac.employeeId).trim() : empId,
        normalizedEmployeeId: normKey,
        facultyName: fac.name || null,
        designation: fac.designation || null,
        originalDepartment: fac.department || null,
        originalDepartmentSource: 'creation_snapshot',
        isValid: true,
        displayOrder: idx
      });
    }
  });

  return {
    associations,
    invalidEmpIds,
    hasInvalidEmpIds: invalidEmpIds.length > 0
  };
}

/**
 * Enriches Patent record with live Faculty data, department tracking, and external inventors.
 */
function enrichPatentRecord(record, liveFacultyById = new Map(), liveFacultyByEmpKey = new Map()) {
  const plain = typeof record.toJSON === 'function' ? record.toJSON() : { ...record };
  const rawAssocs = Array.isArray(plain.facultyAssociations) ? [...plain.facultyAssociations] : [];
  rawAssocs.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  const validDepartmentsSet = new Set();
  const currentDepartmentsSet = new Set();
  const originalDepartmentsSet = new Set();
  const invalidEmpIds = [];
  const internalFacultyNames = [];

  const facultyDetails = rawAssocs.map(assoc => {
    const live =
      (assoc.facultyId ? liveFacultyById.get(assoc.facultyId) : null) ||
      liveFacultyByEmpKey.get(assoc.normalizedEmployeeId || normalizeEmpIdKey(assoc.employeeId)) ||
      null;

    const isValid = Boolean(assoc.isValid);
    const originalDept = assoc.originalDepartment || null;
    const currentDept = isValid ? (live?.department || originalDept || null) : null;
    const facultyName = isValid ? (live?.name || assoc.facultyName || null) : null;
    const designation = isValid ? (live?.designation || assoc.designation || null) : null;
    const transferred = Boolean(
      isValid &&
      originalDept &&
      currentDept &&
      normalizeDeptKey(originalDept) !== normalizeDeptKey(currentDept)
    );

    if (isValid) {
      if (facultyName) internalFacultyNames.push(facultyName);
      if (currentDept) {
        validDepartmentsSet.add(currentDept);
        currentDepartmentsSet.add(currentDept);
      }
      if (originalDept) {
        validDepartmentsSet.add(originalDept);
        originalDepartmentsSet.add(originalDept);
      }
    } else {
      invalidEmpIds.push(assoc.employeeId);
    }

    return {
      id: assoc.id,
      facultyId: live?.id || assoc.facultyId || null,
      employeeId: assoc.employeeId,
      normalizedEmployeeId: assoc.normalizedEmployeeId || normalizeEmpIdKey(assoc.employeeId),
      facultyName,
      designation,
      originalDepartment: originalDept,
      originalDepartmentSource: assoc.originalDepartmentSource || 'creation_snapshot',
      currentDepartment: currentDept,
      departmentTransferred: transferred,
      isValid,
      email: live?.email || null
    };
  });

  // Include primary department if present
  if (plain.department && plain.department.trim()) {
    validDepartmentsSet.add(plain.department.trim());
  }

  // Parse external inventors
  const externalInventors = Array.isArray(plain.externalInventors)
    ? plain.externalInventors
    : [];

  return {
    ...plain,
    facultyAssociations: facultyDetails,
    externalInventors,
    validFacultyCount: facultyDetails.filter(f => f.isValid).length,
    hasInvalidEmpIds: invalidEmpIds.length > 0 || Boolean(plain.hasInvalidEmpIds),
    invalidEmpIds: invalidEmpIds.length > 0 ? invalidEmpIds : (Array.isArray(plain.invalidEmpIds) ? plain.invalidEmpIds : []),
    departments: Array.from(validDepartmentsSet),
    currentDepartments: Array.from(currentDepartmentsSet),
    originalDepartments: Array.from(originalDepartmentsSet)
  };
}

const PATENT_TEMPLATE_COLUMNS = [
  'Title',
  'EmpId',
  'Application No',
  'Patent No',
  'Status',
  'Patent Type',
  'Filing Date',
  'Publication Date',
  'Grant Date',
  'License Date',
  'Commercial Partner',
  'Revenue Generated (INR)',
  'Patent URL',
  'Proof',
  'Abstract'
];

function normalizeHeaderName(h) {
  return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function mapPatentSpreadsheetRow(rawObj) {
  const getVal = (...candidates) => {
    for (const key of Object.keys(rawObj || {})) {
      const norm = normalizeHeaderName(key);
      if (candidates.includes(norm)) return rawObj[key];
    }
    return '';
  };

  return {
    title: getVal('title', 'patenttitle', 'titleofinvention', 'inventiontitle', 'name'),
    rawEmpId: getVal('empid', 'empids', 'employeeid', 'employeeids', 'facultyid', 'facultyids', 'inventors', 'inventor'),
    applicationNo: getVal('applicationno', 'applicationnumber', 'appno', 'appnumber', 'filingno', 'applno'),
    patentNo: getVal('patentno', 'patentnumber', 'grantno', 'grantnumber'),
    rawStatus: getVal('status', 'patentstatus', 'stage', 'currentstatus'),
    rawType: getVal('patenttype', 'type', 'jurisdiction', 'typeofpatent', 'category'),
    rawFilingDate: getVal('filingdate', 'fileddate', 'dateoffiling', 'applicationdate'),
    rawPublicationDate: getVal('publicationdate', 'publisheddate', 'dateofpublication', 'dateofpublishing'),
    rawGrantDate: getVal('grantdate', 'granteddate', 'dateofgrant', 'awarddate'),
    rawLicenseDate: getVal('licensedate', 'commercializeddate', 'commercializationdate'),
    partner: getVal('commercialpartner', 'partner', 'licensee', 'industrypartner', 'collaborator'),
    rawRevenue: getVal('revenuegeneratedinr', 'revenuegenerated', 'revenue', 'royalty', 'amount', 'revenueinr'),
    patentUrl: getVal('patenturl', 'patentlink', 'url', 'link', 'gazetteurl'),
    rawProof: getVal('proof', 'proofs', 'proofurl', 'prooflink', 'googledrivelink', 'driveurl', 'drivelink'),
    abstract: getVal('abstract', 'description', 'summary', 'claims')
  };
}

function validatePatentHeaderColumns(headers = []) {
  const normSet = new Set(headers.map(normalizeHeaderName));
  const missing = [];
  if (!['title', 'patenttitle', 'titleofinvention', 'inventiontitle', 'name'].some(k => normSet.has(k))) {
    missing.push('Title');
  }
  if (!['empid', 'empids', 'employeeid', 'employeeids', 'facultyid', 'facultyids', 'inventors', 'inventor'].some(k => normSet.has(k))) {
    missing.push('EmpId');
  }
  missing.valid = missing.length === 0;
  missing.missingColumns = missing;
  return missing;
}

/**
 * Generates official Excel workbook for Patent bulk uploads (exact 15 columns).
 */
function generatePatentTemplateBuffer() {
  const XLSX = require('xlsx');
  const wb = XLSX.utils.book_new();
  const rows = [
    PATENT_TEMPLATE_COLUMNS,
    [
      'Smart Medical Diagnostic Apparatus',
      'CU001, CU015',
      '202441012345',
      '498123',
      'Granted',
      'National (Indian)',
      '15-01-2023',
      '20-08-2024',
      '10-11-2024',
      '',
      'HealthTech Innovations Ltd',
      '250000',
      'https://ipindiaservices.gov.in/publicsearch',
      'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7/view',
      'An automated diagnostic apparatus using deep convolutional neural networks for early clinical detection.'
    ],
    [
      'IoT Urban Air Quality Sensing Array',
      'CU028',
      '202441054321',
      '',
      'Published',
      'National (Indian)',
      '10-06-2024',
      '15-10-2024',
      '',
      '',
      '',
      '0',
      '',
      '',
      'Low-power distributed sensor grid for continuous particulate matter tracking in smart university campuses.'
    ]
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 38 }, { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 16 },
    { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
    { wch: 26 }, { wch: 24 }, { wch: 36 }, { wch: 54 }, { wch: 48 }
  ];
  // Force EmpId column cells to text type so leading zeros are never stripped
  ['B2', 'B3'].forEach(addr => {
    if (ws[addr]) ws[addr].t = 's';
  });

  XLSX.utils.book_append_sheet(wb, ws, 'Patents_Template');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Core Bulk Preview / Validation Engine for Patents.
 */
async function evaluateBulkPatentRows(rawRows = [], options = {}) {
  const {
    user = null,
    headers = null,
    mockExistingPatents = null,
    mockFacultyRows = null,
    verifyDriveLinks = false,
    Patent = null,
    PatentFaculty = null,
    Faculty = null
  } = options;

  if (Array.isArray(headers) && headers.length > 0) {
    const missingColumns = validatePatentHeaderColumns(headers);
    if (missingColumns.length > 0) {
      return {
        validColumns: false,
        missingColumns,
        summary: {
          totalRows: 0,
          eligibleCount: 0,
          validCleanCount: 0,
          warningInvalidEmpIdCount: 0,
          missingPublicationDateCount: 0,
          duplicateCount: 0,
          invalidErrorCount: 0
        },
        rows: []
      };
    }
  }

  // Load existing patent duplicate signatures
  const existingAppNos = new Set();
  const existingFallbackSigs = new Set();

  if (Array.isArray(mockExistingPatents)) {
    mockExistingPatents.forEach(p => {
      const keys = generatePatentDuplicateKeys({
        applicationNo: p.applicationNo,
        title: p.title,
        filedDate: p.filedDate,
        empIds: p.empIds || p.empIdsRaw
      });
      if (keys.primaryKey) existingAppNos.add(keys.primaryKey);
      if (keys.fallbackKey) existingFallbackSigs.add(keys.fallbackKey);
    });
  } else if (Patent) {
    const dbExisting = await Patent.findAll({
      attributes: ['id', 'applicationNo', 'title', 'filedDate', 'empIdsRaw'],
      include: PatentFaculty ? [{ model: PatentFaculty, as: 'facultyAssociations', attributes: ['employeeId'] }] : []
    }).catch(() => []);

    dbExisting.forEach(p => {
      const pEmpIds = (p.facultyAssociations && p.facultyAssociations.length > 0)
        ? p.facultyAssociations.map(a => a.employeeId)
        : parseAndNormalizeEmpIds(p.empIdsRaw).empIds;
      const keys = generatePatentDuplicateKeys({
        applicationNo: p.applicationNo,
        title: p.title,
        filedDate: p.filedDate,
        empIds: pEmpIds
      });
      if (keys.primaryKey) existingAppNos.add(keys.primaryKey);
      if (keys.fallbackKey) existingFallbackSigs.add(keys.fallbackKey);
    });
  }

  // Load preloaded faculty rows
  let preloadedFaculty = mockFacultyRows;
  if (!Array.isArray(preloadedFaculty) && Faculty) {
    preloadedFaculty = await Faculty.findAll({
      attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email', 'academicYear', 'createdAt'],
      raw: true
    }).catch(() => []);
  }

  const seenBatchAppNos = new Map();
  const seenBatchFallbackSigs = new Map();

  const evaluatedRows = [];
  let validCleanCount = 0;
  let warningInvalidEmpIdCount = 0;
  let missingPublicationDateCount = 0;
  let duplicateCount = 0;
  let invalidErrorCount = 0;

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i];
    const rowNumber = raw._rowNumber || (i + 2);
    const mapped = mapPatentSpreadsheetRow(raw);

    const title = String(mapped.title ?? '').trim();
    const rawEmpStr = mapped.rawEmpId !== null && mapped.rawEmpId !== undefined ? String(mapped.rawEmpId).trim() : '';
    const applicationNo = mapped.applicationNo !== null && mapped.applicationNo !== undefined ? String(mapped.applicationNo).trim() : '';
    const patentNo = mapped.patentNo !== null && mapped.patentNo !== undefined ? String(mapped.patentNo).trim() : '';
    const rawStatus = mapped.rawStatus !== null && mapped.rawStatus !== undefined ? String(mapped.rawStatus).trim() : '';
    const rawType = mapped.rawType !== null && mapped.rawType !== undefined ? String(mapped.rawType).trim() : '';
    const rawFilingDate = mapped.rawFilingDate;
    const rawPublicationDate = mapped.rawPublicationDate;
    const rawGrantDate = mapped.rawGrantDate;
    const rawLicenseDate = mapped.rawLicenseDate;
    const partner = mapped.partner !== null && mapped.partner !== undefined ? String(mapped.partner).trim() : '';
    const rawRevenue = mapped.rawRevenue;
    const patentUrl = mapped.patentUrl !== null && mapped.patentUrl !== undefined ? String(mapped.patentUrl).trim() : '';
    const rawProof = mapped.rawProof !== null && mapped.rawProof !== undefined ? String(mapped.rawProof).trim() : '';
    const abstract = mapped.abstract !== null && mapped.abstract !== undefined ? String(mapped.abstract).trim() : '';

    // Skip completely empty row
    if (!title && !rawEmpStr && !applicationNo && !patentNo && isBlankDateValue(rawFilingDate) && isBlankDateValue(rawPublicationDate) && !rawProof) {
      continue;
    }

    const errors = [];
    const warnings = [];

    const parsedEmp = parseAndNormalizeEmpIds(rawEmpStr);
    if (parsedEmp.empIds.length === 0) {
      errors.push('EmpId is required.');
    }
    if (!title) {
      errors.push('Title is required.');
    }

    // Duplicate detection
    const duplicateKeys = generatePatentDuplicateKeys({
      applicationNo,
      title,
      filedDate: rawFilingDate,
      empIds: parsedEmp.empIds
    });

    let isDuplicate = false;
    let duplicateReason = null;

    if (duplicateKeys.primaryKey) {
      if (existingAppNos.has(duplicateKeys.primaryKey)) {
        isDuplicate = true;
        duplicateReason = `Duplicate Application No '${applicationNo}' exists in database.`;
      } else if (seenBatchAppNos.has(duplicateKeys.primaryKey)) {
        isDuplicate = true;
        duplicateReason = `Duplicate Application No '${applicationNo}' in batch (row ${seenBatchAppNos.get(duplicateKeys.primaryKey)}).`;
      }
    }

    if (!isDuplicate && duplicateKeys.fallbackKey) {
      if (existingFallbackSigs.has(duplicateKeys.fallbackKey)) {
        isDuplicate = true;
        duplicateReason = 'Duplicate record found (Title + Filing Date + EmpIDs match database record).';
      } else if (seenBatchFallbackSigs.has(duplicateKeys.fallbackKey)) {
        isDuplicate = true;
        duplicateReason = `Duplicate record found in batch (matches row ${seenBatchFallbackSigs.get(duplicateKeys.fallbackKey)}).`;
      }
    }

    // Publication Date parsing & Publication Year derivation
    const pubDateRes = parseAndValidatePublicationDate(rawPublicationDate);
    let publicationDate = null;
    let publicationYear = null;

    if (!pubDateRes.valid) {
      errors.push(pubDateRes.error);
    } else if (pubDateRes.isBlank) {
      warnings.push(pubDateRes.warning);
    } else {
      publicationDate = pubDateRes.isoDate;
      publicationYear = pubDateRes.publicationYear;
    }

    // Other date normalizations
    const filingDate = sanitizeDateNoShift(rawFilingDate);
    const grantDate = sanitizeDateNoShift(rawGrantDate);
    const licenseDate = sanitizeDateNoShift(rawLicenseDate);

    // Status normalization
    let status = 'published';
    const stLower = rawStatus.toLowerCase();
    if (stLower.includes('commercial') || stLower.includes('licens')) {
      status = 'commercialized';
    } else if (stLower.includes('grant')) {
      status = 'granted';
    } else if (stLower.includes('exam')) {
      status = 'under_examination';
    } else if (stLower.includes('file') || stLower.includes('appl')) {
      status = 'filed';
    } else if (stLower.includes('publish') || pubDateRes.isoDate) {
      status = 'published';
    } else {
      status = 'filed';
    }

    // Patent Type normalization
    let patentType = 'National (Indian)';
    const tpLower = rawType.toLowerCase();
    if (tpLower.includes('pct') || tpLower.includes('wipo')) {
      patentType = 'International (PCT)';
    } else if (tpLower.includes('uspto') || tpLower.includes('usa') || tpLower.includes('us')) {
      patentType = 'USPTO (USA)';
    } else if (tpLower.includes('epo') || tpLower.includes('europe')) {
      patentType = 'EPO (Europe)';
    } else if (tpLower.includes('international') || tpLower.includes('foreign')) {
      patentType = 'Other International';
    }

    // Revenue
    let revenue = 0;
    if (rawRevenue !== null && rawRevenue !== undefined && String(rawRevenue).trim() !== '') {
      const numRev = Number(String(rawRevenue).replace(/[^0-9.-]/g, ''));
      if (!Number.isNaN(numRev) && numRev >= 0) {
        revenue = numRev;
      }
    }

    // Proof link validation
    let proofUrl = null;
    if (rawProof && String(rawProof).trim()) {
      const v = googleDriveService.validateDriveUrl(rawProof);
      if (v.valid) {
        proofUrl = v.sanitizedUrl;
      } else {
        errors.push(`Invalid Google Drive Proof link (${v.error}).`);
      }
    }

    // Resolve Faculty Associations
    const resolvedFaculty = await resolveFacultyAssociationsForEmpIds(
      parsedEmp.empIds,
      filingDate || publicationDate,
      { Faculty: options.Faculty },
      preloadedFaculty
    );

    if (resolvedFaculty.hasInvalidEmpIds) {
      warnings.push(`Unrecognized Employee ID(s): ${resolvedFaculty.invalidEmpIds.join(', ')} (record will be saved with warning).`);
    }
    if (parsedEmp.duplicateEmpIds.length > 0) {
      warnings.push(`Duplicate EmpIds removed within row: ${parsedEmp.duplicateEmpIds.join(', ')}.`);
    }

    const rowStatus = isDuplicate
      ? 'duplicate'
      : errors.length > 0
      ? 'error'
      : resolvedFaculty.hasInvalidEmpIds || pubDateRes.isBlank
      ? 'warning'
      : 'valid';

    if (isDuplicate) {
      duplicateCount++;
    } else if (errors.length > 0) {
      invalidErrorCount++;
    } else if (resolvedFaculty.hasInvalidEmpIds) {
      warningInvalidEmpIdCount++;
    } else {
      validCleanCount++;
    }

    if (pubDateRes.isBlank) {
      missingPublicationDateCount++;
    }

    if (!isDuplicate && errors.length === 0) {
      if (duplicateKeys.primaryKey) seenBatchAppNos.set(duplicateKeys.primaryKey, rowNumber);
      if (duplicateKeys.fallbackKey) seenBatchFallbackSigs.set(duplicateKeys.fallbackKey, rowNumber);
    }

    evaluatedRows.push({
      rowNumber,
      rowStatus,
      isDuplicate,
      duplicateReason,
      errors,
      warnings,
      data: {
        title,
        empIdsRaw: parsedEmp.empIdsRaw,
        empIds: parsedEmp.empIds,
        applicationNo: applicationNo || null,
        patentNo: patentNo || null,
        status,
        patentType,
        filingDate,
        publicationDate,
        publicationYear,
        grantDate,
        licenseDate,
        partner: partner || null,
        revenue,
        patentUrl: patentUrl || null,
        proofUrl,
        abstract: abstract || null,
        facultyAssociations: resolvedFaculty.associations,
        hasInvalidEmpIds: resolvedFaculty.hasInvalidEmpIds,
        invalidEmpIds: resolvedFaculty.invalidEmpIds,
        duplicateEmpIds: parsedEmp.duplicateEmpIds
      }
    });
  }

  const eligibleCount = evaluatedRows.filter(r => r.rowStatus === 'valid' || r.rowStatus === 'warning').length;

  return {
    validColumns: true,
    summary: {
      totalRows: evaluatedRows.length,
      eligibleCount,
      validCleanCount,
      warningInvalidEmpIdCount,
      missingPublicationDateCount,
      duplicateCount,
      invalidErrorCount
    },
    rows: evaluatedRows
  };
}

module.exports = {
  PATENT_TEMPLATE_COLUMNS,
  normalizeDeptKey,
  normalizeEmpIdKey,
  parseAndNormalizeEmpIds,
  buildIsoDateIfValid,
  isBlankDateValue,
  sanitizeDateNoShift,
  parseAndValidatePublicationDate,
  generatePatentDuplicateKeys,
  resolveFacultyAssociationsForEmpIds,
  enrichPatentRecord,
  mapPatentSpreadsheetRow,
  validatePatentHeaderColumns,
  generatePatentTemplateBuffer,
  evaluateBulkPatentRows
};


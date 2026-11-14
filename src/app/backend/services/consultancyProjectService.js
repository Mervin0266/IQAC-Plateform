'use strict';

/**
 * Consultancy Project Service
 *
 * Implements authoritative business logic, multi-faculty ownership, EmpId resolution,
 * automatic Consultancy Start Year derivation from Start Date, Project Type classification,
 * four-part duplicate detection, Google Drive document link validation, and standardized
 * 17-column bulk upload processing for Research & Innovation -> Consultancy Projects.
 */

const XLSX = require('xlsx');
const { Op } = require('sequelize');
const googleDriveService = require('./googleDriveService');

/**
 * Exactly 17 columns in strict order required by the official specification.
 */
const CONSULTANCY_TEMPLATE_COLUMNS = [
  'EmpId',
  'Name of Consultancy Project',
  'Agency Name',
  'Agency Contact Email',
  'Agency Contact Number',
  'Start Date',
  'Expected End Date',
  'Project Type',
  'Actual Completion Date',
  'Project Status',
  'Contract Value (INR in Lakhs)',
  'Revenue Generated (INR in Lakhs)',
  'Amount Received (INR in Lakhs)',
  'Scope of Work / Deliverables Summary',
  'Agreement / Work Order',
  'Invoice',
  'Payment Receipt'
];

/**
 * Strictly allowed Project Type values
 */
const VALID_PROJECT_TYPES = [
  'Collaborative',
  'Sole',
  'MOU_Based',
  'Private_Consulting',
  'Others'
];

/**
 * Strictly allowed Project Status values
 */
const VALID_PROJECT_STATUSES = [
  'Sanctioned',
  'On Going',
  'Completed'
];

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
 * - Trims whitespace
 * - Removes empty tokens
 * - Deduplicates within a record while tracking duplicates
 * - Preserves exact casing / leading zeros of first occurrence
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
  return ['n/a', 'na', 'nil', 'null', '-', '--', 'pending', 'ongoing', 'not applicable', 'none', 'tbd'].includes(lower);
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

  // Numeric serial in string form
  if (/^\d{5,6}(\.\d+)?$/.test(str)) {
    const num = Math.round(parseFloat(str));
    const ms = Date.UTC(1899, 11, 30) + num * 86400000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      return buildIsoDateIfValid(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
  }

  // ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:$|T|\s)/);
  if (isoMatch) {
    return buildIsoDateIfValid(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10), parseInt(isoMatch[3], 10));
  }

  // DD/MM/YYYY or DD-MM-YYYY
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
 * Authoritative Start Date parser & calendar Consultancy Start Year derivation.
 */
function deriveConsultancyStartYear(startDateVal) {
  if (startDateVal === null || startDateVal === undefined || isBlankDateValue(startDateVal)) {
    return {
      valid: false,
      isBlank: true,
      isoDate: null,
      startYear: null,
      consultancyStartYear: null,
      error: 'Start Date is required to derive Consultancy Start Year.'
    };
  }

  const iso = sanitizeDateNoShift(startDateVal);
  if (!iso) {
    return {
      valid: false,
      isBlank: false,
      isoDate: null,
      startYear: null,
      consultancyStartYear: null,
      error: `Invalid Start Date format: "${startDateVal}". Please provide DD/MM/YYYY or YYYY-MM-DD.`
    };
  }

  const year = parseInt(iso.substring(0, 4), 10);
  if (isNaN(year) || year < 1950 || year > 2100) {
    return {
      valid: false,
      isBlank: false,
      isoDate: iso,
      startYear: null,
      consultancyStartYear: null,
      error: `Start Date year ${year} is out of allowable calendar range (1950-2100).`
    };
  }

  return {
    valid: true,
    isBlank: false,
    isoDate: iso,
    startYear: year,
    consultancyStartYear: year
  };
}

/**
 * Normalizes Project Type and extracts 'Others - <description>' if present.
 */
function normalizeProjectType(rawType) {
  if (!rawType || !String(rawType).trim()) {
    return {
      valid: false,
      projectType: null,
      otherProjectTypeDescription: null,
      error: 'Project Type is required. Allowed options: Collaborative, Sole, MOU_Based, Private_Consulting, Others.'
    };
  }

  const str = String(rawType).trim();

  // Check if formatted as "Others - Description" or "Other - Description"
  const othersMatch = str.match(/^Others?\s*[-–—:]\s*(.+)$/i);
  if (othersMatch) {
    const desc = othersMatch[1].trim();
    return {
      valid: true,
      projectType: 'Others',
      otherProjectTypeDescription: desc || null,
      error: null
    };
  }

  const clean = str.replace(/[\s_-]+/g, '').toLowerCase();

  if (clean === 'collaborative') {
    return { valid: true, projectType: 'Collaborative', otherProjectTypeDescription: null, error: null };
  }
  if (clean === 'sole') {
    return { valid: true, projectType: 'Sole', otherProjectTypeDescription: null, error: null };
  }
  if (clean === 'moubased' || clean === 'mou' || clean === 'mou_based') {
    return { valid: true, projectType: 'MOU_Based', otherProjectTypeDescription: null, error: null };
  }
  if (clean === 'privateconsulting' || clean === 'private' || clean === 'private_consulting') {
    return { valid: true, projectType: 'Private_Consulting', otherProjectTypeDescription: null, error: null };
  }
  if (clean === 'others' || clean === 'other') {
    return { valid: true, projectType: 'Others', otherProjectTypeDescription: null, error: null };
  }

  return {
    valid: false,
    projectType: null,
    otherProjectTypeDescription: null,
    error: `Invalid Project Type "${str}". Allowed options: Collaborative, Sole, MOU_Based, Private_Consulting, Others.`
  };
}

/**
 * Normalizes Project Status strictly to Sanctioned, On Going, Completed.
 */
function normalizeProjectStatus(rawStatus) {
  if (!rawStatus || !String(rawStatus).trim()) {
    return {
      valid: false,
      projectStatus: null,
      error: 'Project Status is required. Allowed values: Sanctioned, On Going, Completed.'
    };
  }

  const s = String(rawStatus).trim();
  if (VALID_PROJECT_STATUSES.includes(s)) {
    return { valid: true, projectStatus: s, error: null };
  }

  const lower = s.toLowerCase();
  if (lower === 'ongoing' || lower === 'on going' || lower === 'on-going') {
    return { valid: true, projectStatus: 'On Going', error: null };
  }
  if (lower === 'sanctioned') {
    return { valid: true, projectStatus: 'Sanctioned', error: null };
  }
  if (lower === 'completed') {
    return { valid: true, projectStatus: 'Completed', error: null };
  }

  return {
    valid: false,
    projectStatus: null,
    error: `Invalid Project Status "${s}". Allowed values: Sanctioned, On Going, Completed.`
  };
}

/**
 * Generates the standardized four-part duplicate detection key:
 * Agency Name + Name of Consultancy Project + Start Date + Associated EmpID Set (unordered)
 */
function generateConsultancyDuplicateKeys({ agencyName, projectName, startDate, empIds }) {
  const normAgency = String(agencyName || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  const normProject = String(projectName || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  const isoStart = sanitizeDateNoShift(startDate) || 'nodate';

  const { normalizedKeys } = parseAndNormalizeEmpIds(empIds);
  // Sort EmpID set to ensure unordered comparison
  const sortedEmpIdSet = [...normalizedKeys].sort().join(',');

  const duplicateKey = `${normAgency}|${normProject}|${isoStart}|${sortedEmpIdSet}`;

  return {
    duplicateKey,
    normAgency,
    normProject,
    isoStart,
    sortedEmpIdSet
  };
}

/**
 * Resolves Faculty associations for a given list of EmpIds against the Faculty table.
 */
async function resolveFacultyAssociationsForEmpIds(empIds = [], options = {}) {
  const { Faculty = null, mockFacultyRows = null } = options;

  const parsed = parseAndNormalizeEmpIds(empIds);
  const { normalizedKeys } = parsed;

  if (normalizedKeys.length === 0) {
    return {
      associations: [],
      validCount: 0,
      invalidEmpIds: [],
      hasInvalidEmpIds: false,
      primaryDepartment: null
    };
  }

  const facultyByNormalizedEmpId = new Map();

  if (Array.isArray(mockFacultyRows)) {
    mockFacultyRows.forEach(f => {
      const k = normalizeEmpIdKey(f.employeeId);
      if (k && !facultyByNormalizedEmpId.has(k)) {
        facultyByNormalizedEmpId.set(k, f);
      }
    });
  } else if (Faculty) {
    const records = await Faculty.findAll({
      where: {
        employeeId: {
          [Op.in]: parsed.empIds
        }
      },
      attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email']
    });

    records.forEach(f => {
      const k = normalizeEmpIdKey(f.employeeId);
      if (k && !facultyByNormalizedEmpId.has(k)) {
        facultyByNormalizedEmpId.set(k, f.toJSON ? f.toJSON() : f);
      }
    });
  }

  const associations = [];
  const invalidEmpIds = [];
  let displayOrder = 0;
  let primaryDepartment = null;

  for (let i = 0; i < parsed.empIds.length; i++) {
    const rawId = parsed.empIds[i];
    const normKey = parsed.normalizedKeys[i];
    const match = facultyByNormalizedEmpId.get(normKey);

    if (match) {
      const dept = match.department || null;
      if (!primaryDepartment && dept) {
        primaryDepartment = dept;
      }
      const deptLower = String(dept || '').toLowerCase();
      const school = deptLower.includes('architecture') || deptLower.includes('soa')
        ? 'School of Architecture'
        : 'School of Engineering and Technology';
      const campus = 'Bangalore Kengeri Campus';

      associations.push({
        facultyId: match.id || null,
        employeeId: rawId,
        normalizedEmployeeId: normKey,
        facultyName: match.name || null,
        designation: match.designation || null,
        originalDepartment: dept,
        originalDepartmentSource: 'creation_snapshot',
        currentDepartment: dept,
        school: match.school || school,
        campus: match.campus || campus,
        isValid: true,
        displayOrder: displayOrder++
      });
    } else {
      invalidEmpIds.push(rawId);
      associations.push({
        facultyId: null,
        employeeId: rawId,
        normalizedEmployeeId: normKey,
        facultyName: null,
        designation: null,
        originalDepartment: null,
        originalDepartmentSource: 'unrecognized',
        currentDepartment: null,
        school: null,
        campus: null,
        isValid: false,
        displayOrder: displayOrder++
      });
    }
  }

  return {
    associations,
    validCount: associations.filter(a => a.isValid).length,
    invalidEmpIds,
    hasInvalidEmpIds: invalidEmpIds.length > 0,
    duplicateEmpIds: parsed.duplicateEmpIds,
    empIdsRaw: parsed.empIdsRaw,
    primaryDepartment
  };
}

/**
 * Validates Google Drive URL and reports status.
 */
function validateDocumentLink(url, categoryLabel = 'Document') {
  if (!url || !String(url).trim()) {
    return { valid: true, isBlank: true, driveUrl: null, fileId: null, warning: null };
  }

  const clean = String(url).trim();
  const v = googleDriveService.validateDriveUrl(clean);
  if (!v.valid) {
    return {
      valid: false,
      isBlank: false,
      driveUrl: clean,
      fileId: null,
      error: `Invalid Google Drive link for ${categoryLabel}: ${v.error || 'Must be a valid drive.google.com or docs.google.com URL.'}`
    };
  }

  return {
    valid: true,
    isBlank: false,
    driveUrl: v.sanitizedUrl,
    fileId: v.fileId,
    error: null
  };
}

/**
 * Normalizes header strings for flexible column matching.
 */
function normalizeHeaderName(h) {
  if (!h) return '';
  return String(h)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Maps a raw row object with arbitrary casing/punctuation to standardized consultancy keys.
 */
function mapConsultancySpreadsheetRow(rawObj) {
  const normalizedMap = {};
  Object.keys(rawObj || {}).forEach(k => {
    normalizedMap[normalizeHeaderName(k)] = rawObj[k];
  });

  const getVal = (...variants) => {
    for (const v of variants) {
      const norm = normalizeHeaderName(v);
      if (normalizedMap[norm] !== undefined && normalizedMap[norm] !== null && String(normalizedMap[norm]).trim() !== '') {
        return normalizedMap[norm];
      }
    }
    return '';
  };

  return {
    empId: getVal('EmpId', 'Emp Id', 'Employee ID', 'Faculty EmpId', 'Teacher Consultant EmpId'),
    projectName: getVal('Name of Consultancy Project', 'Project Name', 'Consultancy Project Name', 'Title'),
    agencyName: getVal('Agency Name', 'Sponsoring Agency', 'Client Name', 'Funding Agency'),
    agencyContactEmail: getVal('Agency Contact Email', 'Agency Email', 'Contact Email'),
    agencyContactNumber: getVal('Agency Contact Number', 'Agency Contact Phone', 'Phone Number', 'Contact Number'),
    startDate: getVal('Start Date', 'Project Start Date'),
    expectedEndDate: getVal('Expected End Date', 'End Date', 'Planned End Date'),
    projectType: getVal('Project Type', 'Type of Project'),
    actualCompletionDate: getVal('Actual Completion Date', 'Completion Date', 'Actual End Date'),
    projectStatus: getVal('Project Status', 'Status'),
    contractValueInLakhs: getVal('Contract Value (INR in Lakhs)', 'Contract Value', 'Sanctioned Amount'),
    revenueGeneratedInLakhs: getVal('Revenue Generated (INR in Lakhs)', 'Revenue Generated', 'Revenue in Lakhs'),
    amountReceivedInLakhs: getVal('Amount Received (INR in Lakhs)', 'Amount Received', 'Received Amount'),
    deliverablesSummary: getVal('Scope of Work / Deliverables Summary', 'Scope of Work', 'Deliverables Summary', 'Description'),
    agreementWorkOrder: getVal('Agreement / Work Order', 'Agreement', 'Work Order', 'Sanction Order'),
    invoice: getVal('Invoice', 'Invoice Document', 'Bill'),
    paymentReceipt: getVal('Payment Receipt', 'Receipt', 'Proof of Payment')
  };
}

/**
 * Validates header columns against required template fields.
 */
function validateConsultancyHeaderColumns(headers = []) {
  const normHeaders = new Set(headers.map(normalizeHeaderName));
  const required = [
    'EmpId',
    'Name of Consultancy Project',
    'Agency Name',
    'Start Date',
    'Project Type',
    'Project Status'
  ];

  const missing = [];
  required.forEach(req => {
    const n = normalizeHeaderName(req);
    if (!normHeaders.has(n)) {
      missing.push(req);
    }
  });

  return missing;
}

/**
 * Builds downloadable 17-column Excel and CSV templates.
 */
function buildConsultancyTemplateWorkbook() {
  const sampleData = [
    {
      'EmpId': '3489, 2043',
      'Name of Consultancy Project': 'AI-Driven Quality Assurance Framework for Manufacturing',
      'Agency Name': 'Apex Robotics Ltd',
      'Agency Contact Email': 'projects@apexrobotics.in',
      'Agency Contact Number': '+91 98765 43210',
      'Start Date': '15/08/2024',
      'Expected End Date': '14/08/2025',
      'Project Type': 'Collaborative',
      'Actual Completion Date': '',
      'Project Status': 'On Going',
      'Contract Value (INR in Lakhs)': '15.50',
      'Revenue Generated (INR in Lakhs)': '12.00',
      'Amount Received (INR in Lakhs)': '8.00',
      'Scope of Work / Deliverables Summary': 'Design and deployment of machine vision quality inspection models.',
      'Agreement / Work Order': 'https://drive.google.com/file/d/1SAMPLE_AGREEMENT_ID/view',
      'Invoice': 'https://drive.google.com/file/d/1SAMPLE_INVOICE_ID/view',
      'Payment Receipt': 'https://drive.google.com/file/d/1SAMPLE_RECEIPT_ID/view'
    },
    {
      'EmpId': '1672',
      'Name of Consultancy Project': 'Sustainable Energy Optimization & Grid Feasibility Study',
      'Agency Name': 'CleanTech Energy Solutions',
      'Agency Contact Email': 'consulting@cleantech.org',
      'Agency Contact Number': '+91 91234 56789',
      'Start Date': '10/02/2024',
      'Expected End Date': '10/11/2024',
      'Project Type': 'Sole',
      'Actual Completion Date': '05/11/2024',
      'Project Status': 'Completed',
      'Contract Value (INR in Lakhs)': '8.00',
      'Revenue Generated (INR in Lakhs)': '8.00',
      'Amount Received (INR in Lakhs)': '8.00',
      'Scope of Work / Deliverables Summary': 'Techno-economic viability report on rooftop microgrid installation.',
      'Agreement / Work Order': 'https://drive.google.com/file/d/1SAMPLE_AGREEMENT_2/view',
      'Invoice': 'https://drive.google.com/file/d/1SAMPLE_INVOICE_2/view',
      'Payment Receipt': 'https://drive.google.com/file/d/1SAMPLE_RECEIPT_2/view'
    },
    {
      'EmpId': '2195',
      'Name of Consultancy Project': 'Industry Advisory for Cyber-Physical Security Protocol',
      'Agency Name': 'SecureNet Systems Pvt Ltd',
      'Agency Contact Email': 'security@securenet.com',
      'Agency Contact Number': '+91 99887 76655',
      'Start Date': '01/04/2025',
      'Expected End Date': '31/03/2026',
      'Project Type': 'Others - Industry Advisory Engagement',
      'Actual Completion Date': '',
      'Project Status': 'Sanctioned',
      'Contract Value (INR in Lakhs)': '20.00',
      'Revenue Generated (INR in Lakhs)': '5.00',
      'Amount Received (INR in Lakhs)': '5.00',
      'Scope of Work / Deliverables Summary': 'Advisory services on cloud perimeter architecture and zero-trust framework.',
      'Agreement / Work Order': 'https://drive.google.com/file/d/1SAMPLE_AGREEMENT_3/view',
      'Invoice': '',
      'Payment Receipt': ''
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sampleData, { header: CONSULTANCY_TEMPLATE_COLUMNS });

  // Column widths for easy reading
  ws['!cols'] = [
    { wch: 18 }, // EmpId
    { wch: 45 }, // Name of Consultancy Project
    { wch: 28 }, // Agency Name
    { wch: 26 }, // Agency Contact Email
    { wch: 22 }, // Agency Contact Number
    { wch: 14 }, // Start Date
    { wch: 16 }, // Expected End Date
    { wch: 20 }, // Project Type
    { wch: 20 }, // Actual Completion Date
    { wch: 16 }, // Project Status
    { wch: 26 }, // Contract Value (INR in Lakhs)
    { wch: 28 }, // Revenue Generated (INR in Lakhs)
    { wch: 28 }, // Amount Received (INR in Lakhs)
    { wch: 45 }, // Scope of Work / Deliverables Summary
    { wch: 35 }, // Agreement / Work Order
    { wch: 35 }, // Invoice
    { wch: 35 }  // Payment Receipt
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Consultancy Projects');

  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const csvBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'csv' });

  return {
    xlsxBuffer,
    csvBuffer,
    columns: CONSULTANCY_TEMPLATE_COLUMNS
  };
}

/**
 * Parses uploaded spreadsheet buffer into rows and headers.
 */
function parseConsultancySpreadsheetBuffer(fileBuffer) {
  const wb = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true });
  const firstSheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[firstSheetName];

  // Extract raw rows
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

  // Extract headers
  const headerMatrix = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const headers = Array.isArray(headerMatrix[0]) ? headerMatrix[0].map(h => String(h || '').trim()) : [];

  return {
    rows: rawRows,
    headers,
    sheetName: firstSheetName
  };
}

/**
 * 5-Step Bulk Upload Row Evaluation Engine
 */
async function evaluateBulkConsultancyRows(rawRows = [], options = {}) {
  let rowsToProcess = rawRows;
  let headersToUse = options.headers || null;

  if (Buffer.isBuffer(rawRows)) {
    const parsed = parseConsultancySpreadsheetBuffer(rawRows);
    rowsToProcess = parsed.rows;
    if (!headersToUse) {
      headersToUse = parsed.headers;
    }
  }

  const {
    user = null,
    headers = headersToUse,
    mockExistingProjects = null,
    mockFacultyRows = null,
    ConsultancyProject = null,
    ConsultancyProjectFaculty = null,
    Faculty = null
  } = options;

  const actualHeaders = headers || headersToUse;
  if (Array.isArray(actualHeaders) && actualHeaders.length > 0) {
    const missingColumns = validateConsultancyHeaderColumns(actualHeaders);
    if (missingColumns.length > 0) {
      return {
        validColumns: false,
        missingColumns,
        error: `Uploaded spreadsheet is missing required columns: ${missingColumns.join(', ')}`,
        foundHeaders: actualHeaders,
        summary: {
          totalRows: 0,
          eligibleCount: 0,
          validCleanCount: 0,
          warningInvalidEmpIdCount: 0,
          duplicateCount: 0,
          invalidErrorCount: 0
        },
        rows: []
      };
    }
  }

  // Pre-load existing duplicate signatures from DB or mock
  const existingDuplicateKeys = new Set();

  if (Array.isArray(mockExistingProjects)) {
    mockExistingProjects.forEach(p => {
      const keys = generateConsultancyDuplicateKeys({
        agencyName: p.agencyName,
        projectName: p.projectName,
        startDate: p.startDate,
        empIds: p.empIds || p.empIdsRaw
      });
      existingDuplicateKeys.add(keys.duplicateKey);
    });
  } else if (ConsultancyProject && ConsultancyProjectFaculty) {
    const existingList = await ConsultancyProject.findAll({
      attributes: ['id', 'agencyName', 'projectName', 'startDate', 'empIdsRaw'],
      include: [
        {
          model: ConsultancyProjectFaculty,
          as: 'facultyAssociations',
          attributes: ['employeeId', 'normalizedEmployeeId']
        }
      ]
    });

    existingList.forEach(p => {
      const ids = (p.facultyAssociations && p.facultyAssociations.length > 0)
        ? p.facultyAssociations.map(fa => fa.employeeId).join(', ')
        : (p.empIdsRaw || '');
      const keys = generateConsultancyDuplicateKeys({
        agencyName: p.agencyName,
        projectName: p.projectName,
        startDate: p.startDate,
        empIds: ids
      });
      existingDuplicateKeys.add(keys.duplicateKey);
    });
  }

  // Track spreadsheet-internal duplicate signatures
  const seenInSpreadsheet = new Set();

  // Pre-fetch all distinct EmpIds across the entire spreadsheet to batch-query Faculty
  const allEmpIdsInSheet = [];
  rowsToProcess.forEach(r => {
    const mapped = mapConsultancySpreadsheetRow(r);
    const parsedEmp = parseAndNormalizeEmpIds(mapped.empId);
    allEmpIdsInSheet.push(...parsedEmp.empIds);
  });

  const facultyResolutionCache = await resolveFacultyAssociationsForEmpIds(allEmpIdsInSheet, {
    Faculty,
    mockFacultyRows
  });

  // Build map of normalizedEmpId -> faculty data from resolution cache
  const facultyMap = new Map();
  facultyResolutionCache.associations.forEach(a => {
    if (a.isValid) {
      facultyMap.set(a.normalizedEmployeeId, a);
    }
  });

  const evaluatedRows = [];
  let eligibleCount = 0;
  let validCleanCount = 0;
  let warningInvalidEmpIdCount = 0;
  let duplicateCount = 0;
  let invalidErrorCount = 0;

  for (let i = 0; i < rowsToProcess.length; i++) {
    const rawRow = rowsToProcess[i];
    const rowNumber = i + 2; // 1-based data row (row 1 is header)
    const mapped = mapConsultancySpreadsheetRow(rawRow);

    const errors = [];
    const warnings = [];

    // 1. Validate EmpId
    const empParse = parseAndNormalizeEmpIds(mapped.empId);
    if (empParse.empIds.length === 0) {
      errors.push('EmpId is required. Provide at least one faculty Employee ID.');
    }

    const resolvedAssociations = [];
    const invalidEmpIds = [];
    let primaryDept = null;

    empParse.empIds.forEach((rawEmpId, idx) => {
      const normKey = empParse.normalizedKeys[idx];
      const match = facultyMap.get(normKey);

      if (match) {
        if (!primaryDept && match.originalDepartment) {
          primaryDept = match.originalDepartment;
        }
        resolvedAssociations.push({
          facultyId: match.facultyId,
          employeeId: rawEmpId,
          normalizedEmployeeId: normKey,
          facultyName: match.facultyName,
          designation: match.designation,
          originalDepartment: match.originalDepartment,
          originalDepartmentSource: 'creation_snapshot',
          currentDepartment: match.currentDepartment,
          school: match.school,
          campus: match.campus,
          isValid: true,
          displayOrder: idx
        });
      } else {
        invalidEmpIds.push(rawEmpId);
        resolvedAssociations.push({
          facultyId: null,
          employeeId: rawEmpId,
          normalizedEmployeeId: normKey,
          facultyName: null,
          designation: null,
          originalDepartment: null,
          originalDepartmentSource: 'unrecognized',
          currentDepartment: null,
          school: null,
          campus: null,
          isValid: false,
          displayOrder: idx
        });
      }
    });

    const validFacultyCount = resolvedAssociations.filter(a => a.isValid).length;
    if (empParse.empIds.length > 0 && validFacultyCount === 0) {
      errors.push(`All supplied EmpId(s) (${invalidEmpIds.join(', ')}) are unrecognized in Faculty Management. Requires ownership correction.`);
    } else if (invalidEmpIds.length > 0) {
      warnings.push(`Unrecognized EmpId(s): ${invalidEmpIds.join(', ')}. Linked ${validFacultyCount} verified faculty member(s).`);
    }

    if (empParse.duplicateEmpIds.length > 0) {
      warnings.push(`Duplicate EmpId(s) within row ignored: ${empParse.duplicateEmpIds.join(', ')}.`);
    }

    // 2. Validate Name of Consultancy Project
    const projectName = String(mapped.projectName || '').trim();
    if (!projectName) {
      errors.push('Name of Consultancy Project is required.');
    }

    // 3. Validate Agency Name
    const agencyName = String(mapped.agencyName || '').trim();
    if (!agencyName) {
      errors.push('Agency Name is required.');
    }

    // 4. Validate Agency Email (Optional)
    let finalAgencyEmail = null;
    if (mapped.agencyContactEmail && String(mapped.agencyContactEmail).trim()) {
      const email = String(mapped.agencyContactEmail).trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push(`Invalid Agency Contact Email format: "${email}".`);
      } else {
        finalAgencyEmail = email;
      }
    }

    const finalAgencyPhone = mapped.agencyContactNumber ? String(mapped.agencyContactNumber).trim() : null;

    // 5. Validate Start Date & Authoritatively Derive Consultancy Start Year
    const yearDerivation = deriveConsultancyStartYear(mapped.startDate);
    let finalStartDate = null;
    let finalConsultancyStartYear = null;

    if (!yearDerivation.valid) {
      errors.push(yearDerivation.error);
    } else {
      finalStartDate = yearDerivation.isoDate;
      finalConsultancyStartYear = yearDerivation.startYear;
    }

    // 6. Validate Expected End Date & Actual Completion Date (Optional)
    let finalExpectedEndDate = null;
    if (mapped.expectedEndDate && !isBlankDateValue(mapped.expectedEndDate)) {
      const isoEnd = sanitizeDateNoShift(mapped.expectedEndDate);
      if (!isoEnd) {
        errors.push(`Invalid Expected End Date format: "${mapped.expectedEndDate}".`);
      } else {
        finalExpectedEndDate = isoEnd;
        if (finalStartDate && finalExpectedEndDate < finalStartDate) {
          errors.push('Expected End Date cannot precede Start Date.');
        }
      }
    }

    let finalActualCompletionDate = null;
    if (mapped.actualCompletionDate && !isBlankDateValue(mapped.actualCompletionDate)) {
      const isoComp = sanitizeDateNoShift(mapped.actualCompletionDate);
      if (!isoComp) {
        errors.push(`Invalid Actual Completion Date format: "${mapped.actualCompletionDate}".`);
      } else {
        finalActualCompletionDate = isoComp;
        if (finalStartDate && finalActualCompletionDate < finalStartDate) {
          errors.push('Actual Completion Date cannot precede Start Date.');
        }
      }
    }

    // 7. Validate Project Type
    const projectTypeNorm = normalizeProjectType(mapped.projectType);
    let finalProjectType = null;
    let finalOtherProjectTypeDescription = null;

    if (!projectTypeNorm.valid) {
      errors.push(projectTypeNorm.error);
    } else {
      finalProjectType = projectTypeNorm.projectType;
      finalOtherProjectTypeDescription = projectTypeNorm.otherProjectTypeDescription;
    }

    // 8. Validate Project Status
    const projectStatusNorm = normalizeProjectStatus(mapped.projectStatus);
    let finalProjectStatus = null;

    if (!projectStatusNorm.valid) {
      errors.push(projectStatusNorm.error);
    } else {
      finalProjectStatus = projectStatusNorm.projectStatus;
    }

    // 9. Validate Financial Fields (in INR Lakhs)
    let parsedContractValue = null;
    if (mapped.contractValueInLakhs !== '' && mapped.contractValueInLakhs !== null && mapped.contractValueInLakhs !== undefined) {
      const rawVal = String(mapped.contractValueInLakhs).replace(/[^0-9.-]/g, '');
      const num = parseFloat(rawVal);
      if (isNaN(num) || num < 0) {
        errors.push(`Contract Value must be a non-negative number in INR Lakhs (got "${mapped.contractValueInLakhs}").`);
      } else {
        parsedContractValue = num;
      }
    }

    let parsedRevenue = 0;
    if (mapped.revenueGeneratedInLakhs !== '' && mapped.revenueGeneratedInLakhs !== null && mapped.revenueGeneratedInLakhs !== undefined) {
      const rawVal = String(mapped.revenueGeneratedInLakhs).replace(/[^0-9.-]/g, '');
      const num = parseFloat(rawVal);
      if (isNaN(num) || num < 0) {
        errors.push(`Revenue Generated must be a non-negative number in INR Lakhs (got "${mapped.revenueGeneratedInLakhs}").`);
      } else {
        parsedRevenue = num;
      }
    }

    let parsedAmountReceived = null;
    if (mapped.amountReceivedInLakhs !== '' && mapped.amountReceivedInLakhs !== null && mapped.amountReceivedInLakhs !== undefined) {
      const rawVal = String(mapped.amountReceivedInLakhs).replace(/[^0-9.-]/g, '');
      const num = parseFloat(rawVal);
      if (isNaN(num) || num < 0) {
        errors.push(`Amount Received must be a non-negative number in INR Lakhs (got "${mapped.amountReceivedInLakhs}").`);
      } else {
        parsedAmountReceived = num;
      }
    }

    // 10. Validate Document Google Drive links
    const agreementCheck = validateDocumentLink(mapped.agreementWorkOrder, 'Agreement / Work Order');
    if (!agreementCheck.valid) warnings.push(agreementCheck.error);

    const invoiceCheck = validateDocumentLink(mapped.invoice, 'Invoice');
    if (!invoiceCheck.valid) warnings.push(invoiceCheck.error);

    const receiptCheck = validateDocumentLink(mapped.paymentReceipt, 'Payment Receipt');
    if (!receiptCheck.valid) warnings.push(receiptCheck.error);

    // 11. Four-part Duplicate Detection Key
    const dupKeyObj = generateConsultancyDuplicateKeys({
      agencyName,
      projectName,
      startDate: finalStartDate,
      empIds: empParse.empIds
    });
    const { duplicateKey } = dupKeyObj;

    let isDuplicate = false;
    let duplicateReason = null;

    if (errors.length === 0) {
      if (existingDuplicateKeys.has(duplicateKey)) {
        isDuplicate = true;
        duplicateReason = `Duplicate of existing project with same Agency (${agencyName}), Title, Start Date (${finalStartDate}), and Faculty Owners.`;
      } else if (seenInSpreadsheet.has(duplicateKey)) {
        isDuplicate = true;
        duplicateReason = `Duplicate of another row in this spreadsheet with same Agency, Title, Start Date, and Faculty Owners.`;
      } else {
        seenInSpreadsheet.add(duplicateKey);
      }
    }

    // Classification
    let validationStatus = 'VALID_CLEAN';
    if (errors.length > 0) {
      validationStatus = 'ERROR_REJECT';
      invalidErrorCount++;
    } else if (isDuplicate) {
      validationStatus = 'DUPLICATE_SKIP';
      duplicateCount++;
    } else if (invalidEmpIds.length > 0) {
      validationStatus = 'EMPID_WARNING';
      warningInvalidEmpIdCount++;
      eligibleCount++;
    } else {
      validationStatus = 'VALID_CLEAN';
      validCleanCount++;
      eligibleCount++;
    }

    const facultyDisplayNames = resolvedAssociations
      .filter(a => a.isValid && a.facultyName)
      .map(a => `${a.facultyName} (${a.employeeId})`)
      .join(', ');

    evaluatedRows.push({
      rowNumber,
      validationStatus,
      isEligible: errors.length === 0 && !isDuplicate,
      isDuplicate,
      duplicateReason,
      errors,
      warnings,
      mappedData: {
        empIds: empParse.empIds,
        empIdsRaw: empParse.empIdsRaw,
        hasInvalidEmpIds: invalidEmpIds.length > 0,
        invalidEmpIds,
        duplicateEmpIds: empParse.duplicateEmpIds,
        associations: resolvedAssociations,
        facultyDisplayNames: facultyDisplayNames || empParse.empIdsRaw,
        projectName,
        agencyName,
        agencyContactEmail: finalAgencyEmail,
        agencyContactNumber: finalAgencyPhone,
        sponsoringAgency: agencyName + (finalAgencyEmail ? ` (${finalAgencyEmail})` : ''),
        startDate: finalStartDate,
        consultancyStartYear: finalConsultancyStartYear,
        expectedEndDate: finalExpectedEndDate,
        projectType: finalProjectType,
        otherProjectTypeDescription: finalOtherProjectTypeDescription,
        actualCompletionDate: finalActualCompletionDate,
        projectStatus: finalProjectStatus,
        contractValueInLakhs: parsedContractValue,
        revenueInLakhs: parsedRevenue,
        amountReceivedInLakhs: parsedAmountReceived,
        description: mapped.deliverablesSummary ? String(mapped.deliverablesSummary).trim() : null,
        department: primaryDept || (user ? user.department : 'General'),
        agreementDoc: agreementCheck.valid && !agreementCheck.isBlank ? agreementCheck : null,
        invoiceDoc: invoiceCheck.valid && !invoiceCheck.isBlank ? invoiceCheck : null,
        receiptDoc: receiptCheck.valid && !receiptCheck.isBlank ? receiptCheck : null
      }
    });
  }

  return {
    validColumns: true,
    missingColumns: [],
    summary: {
      totalRows: rowsToProcess.length,
      eligibleCount,
      validCleanCount,
      warningInvalidEmpIdCount,
      duplicateCount,
      invalidErrorCount
    },
    rows: evaluatedRows
  };
}

/**
 * Executes atomic transactional bulk import for evaluated eligible rows.
 */
async function executeBulkImport(evaluatedRows = [], options = {}) {
  const {
    userId,
    userRole,
    userDepartment,
    sequelize,
    ConsultancyProject,
    ConsultancyProjectFaculty,
    ConsultancyDocument
  } = options;

  const eligible = evaluatedRows.filter(r => r.isEligible && r.validationStatus !== 'ERROR_REJECT' && r.validationStatus !== 'DUPLICATE_SKIP');

  if (eligible.length === 0) {
    return {
      success: false,
      message: 'No eligible records found to import.',
      summary: {
        totalRows: evaluatedRows.length,
        eligibleCount: 0,
        importedCount: 0,
        importedWithInvalidEmpIdsCount: 0,
        skippedDuplicatesCount: evaluatedRows.filter(r => r.validationStatus === 'DUPLICATE_SKIP').length,
        rejectedCount: evaluatedRows.filter(r => r.validationStatus === 'ERROR_REJECT').length
      },
      createdIds: [],
      rowResults: evaluatedRows.map(r => ({
        rowNumber: r.rowNumber,
        status: r.validationStatus,
        title: r.mappedData ? r.mappedData.projectName : '',
        errors: r.errors,
        warnings: r.warnings
      }))
    };
  }

  const createdProjects = [];
  let importedWithInvalidEmpIdsCount = 0;

  await sequelize.transaction(async (t) => {
    for (const item of eligible) {
      const data = item.mappedData;

      // Primary faculty name for teacherConsultant backward-compatibility
      const validNames = data.associations
        .filter(a => a.isValid && a.facultyName)
        .map(a => a.facultyName);
      const compositeTeacher = validNames.length > 0 ? validNames.join(', ') : (data.empIdsRaw || 'Unassigned');

      const project = await ConsultancyProject.create({
        teacherConsultant: compositeTeacher,
        projectName: data.projectName,
        agencyName: data.agencyName,
        agencyContactEmail: data.agencyContactEmail,
        agencyContactNumber: data.agencyContactNumber,
        sponsoringAgency: data.sponsoringAgency,
        consultancyStartYear: data.consultancyStartYear,
        year: data.consultancyStartYear ? `${data.consultancyStartYear - 1}-${data.consultancyStartYear}` : null,
        startDate: data.startDate,
        expectedEndDate: data.expectedEndDate,
        actualCompletionDate: data.actualCompletionDate,
        projectType: data.projectType,
        otherProjectTypeDescription: data.otherProjectTypeDescription,
        projectStatus: data.projectStatus,
        contractValueInLakhs: data.contractValueInLakhs,
        revenueInLakhs: data.revenueInLakhs,
        amountReceivedInLakhs: data.amountReceivedInLakhs,
        description: data.description,
        department: data.department || userDepartment || 'General',
        empIdsRaw: data.empIdsRaw,
        hasInvalidEmpIds: data.hasInvalidEmpIds,
        invalidEmpIds: data.invalidEmpIds,
        duplicateEmpIds: data.duplicateEmpIds,
        createdBy: userId,
        status: null
      }, { transaction: t });

      // Create ConsultancyProjectFaculty junction rows
      for (const assoc of data.associations) {
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

      // Ingest document links
      if (data.agreementDoc && data.agreementDoc.driveUrl) {
        await ConsultancyDocument.create({
          projectId: project.id,
          documentCategory: 'agreement_work_order',
          sourceType: 'drive_link',
          driveFileId: data.agreementDoc.fileId,
          driveUrl: data.agreementDoc.driveUrl,
          fileName: 'Agreement / Work Order',
          uploadedBy: userId,
          accessStatus: 'active'
        }, { transaction: t });
      }

      if (data.invoiceDoc && data.invoiceDoc.driveUrl) {
        await ConsultancyDocument.create({
          projectId: project.id,
          documentCategory: 'invoice',
          sourceType: 'drive_link',
          driveFileId: data.invoiceDoc.fileId,
          driveUrl: data.invoiceDoc.driveUrl,
          fileName: 'Invoice Document',
          uploadedBy: userId,
          accessStatus: 'active'
        }, { transaction: t });
      }

      if (data.receiptDoc && data.receiptDoc.driveUrl) {
        await ConsultancyDocument.create({
          projectId: project.id,
          documentCategory: 'payment_receipt',
          sourceType: 'drive_link',
          driveFileId: data.receiptDoc.fileId,
          driveUrl: data.receiptDoc.driveUrl,
          fileName: 'Payment Receipt',
          uploadedBy: userId,
          accessStatus: 'active'
        }, { transaction: t });
      }

      if (data.hasInvalidEmpIds) {
        importedWithInvalidEmpIdsCount++;
      }

      createdProjects.push(project);
    }
  });

  return {
    success: true,
    message: `Successfully imported ${createdProjects.length} consultancy project record(s).`,
    summary: {
      totalRows: evaluatedRows.length,
      eligibleCount: eligible.length,
      importedCount: createdProjects.length,
      importedWithInvalidEmpIdsCount,
      skippedDuplicatesCount: evaluatedRows.filter(r => r.validationStatus === 'DUPLICATE_SKIP').length,
      rejectedCount: evaluatedRows.filter(r => r.validationStatus === 'ERROR_REJECT').length
    },
    createdIds: createdProjects.map(p => p.id),
    rowResults: evaluatedRows.map(r => ({
      rowNumber: r.rowNumber,
      status: r.isEligible ? 'IMPORTED' : r.validationStatus,
      title: r.mappedData ? r.mappedData.projectName : '',
      errors: r.errors,
      warnings: r.warnings
    }))
  };
}

module.exports = {
  CONSULTANCY_TEMPLATE_COLUMNS,
  VALID_PROJECT_TYPES,
  VALID_PROJECT_STATUSES,
  normalizeDeptKey,
  normalizeEmpIdKey,
  parseAndNormalizeEmpIds,
  buildIsoDateIfValid,
  isBlankDateValue,
  sanitizeDateNoShift,
  deriveConsultancyStartYear,
  normalizeProjectType,
  normalizeProjectStatus,
  generateConsultancyDuplicateKeys,
  resolveFacultyAssociationsForEmpIds,
  validateDocumentLink,
  normalizeHeaderName,
  mapConsultancySpreadsheetRow,
  validateConsultancyHeaderColumns,
  buildConsultancyTemplateWorkbook,
  parseConsultancySpreadsheetBuffer,
  evaluateBulkConsultancyRows,
  executeBulkImport
};

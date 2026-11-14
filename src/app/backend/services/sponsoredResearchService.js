'use strict';

/**
 * Sponsored Research Service (External Research)
 *
 * Implements authoritative business logic, multi-investigator PI / Co-PI hierarchy,
 * EmpId resolution via Faculty Management, automatic Sanction Year derivation from
 * Sanction Date, Project Duration calculation from Start Date and End Date,
 * 4-part duplicate detection, Google Drive document link validation, and standardized
 * 18-column bulk upload processing for Research & Innovation -> Sponsored Research -> External Research.
 */

const XLSX = require('xlsx');
const { Op } = require('sequelize');
const { calculateProjectDuration } = require('../utils/projectDurationHelper');
const googleDriveService = require('./googleDriveService');

/**
 * Exactly 18 columns in strict order required by the official External Research specification.
 */
const EXTERNAL_RESEARCH_TEMPLATE_COLUMNS = [
  'Project Title',
  'Investigators EmpId',
  'Funding Agency',
  'Scheme / Program',
  'Agency Type',
  'Sanction Order No',
  'Sanction Date',
  'Sanction Year',
  'Start Date',
  'End Date',
  'Project Duration',
  'Sanctioned Amount (INR)',
  'Amount Received (INR)',
  'Status',
  'Sanction Letter',
  'Fund Receipt / Utilization Certificate (UC)',
  'Project URL',
  'Description'
];

/**
 * Canonical statuses and case-insensitive aliases
 */
const VALID_EXTERNAL_STATUSES = [
  'Ongoing',
  'Completed',
  'Sanctioned',
  'Proposal Submitted',
  'Terminated'
];

const EXTERNAL_STATUS_ALIASES = {
  'ongoing': 'Ongoing',
  'ongoing research': 'Ongoing',
  'on going': 'Ongoing',
  'in progress': 'Ongoing',
  'active': 'Ongoing',
  'completed': 'Completed',
  'finished': 'Completed',
  'closed': 'Completed',
  'sanctioned': 'Sanctioned',
  'sanctioned / awaiting funds': 'Sanctioned',
  'awaiting funds': 'Sanctioned',
  'approved': 'Sanctioned',
  'proposal submitted': 'Proposal Submitted',
  'proposal submitted / under review': 'Proposal Submitted',
  'under review': 'Proposal Submitted',
  'submitted': 'Proposal Submitted',
  'proposal': 'Proposal Submitted',
  'terminated': 'Terminated',
  'terminated / closed': 'Terminated',
  'cancelled': 'Terminated',
  'discontinued': 'Terminated'
};

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
 * - Preserves exact order (Position 0 = PI, Position 1+ = Co-PI)
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
    if (seenKeys.has(key)) {
      if (!duplicateEmpIds.includes(trimmed)) {
        duplicateEmpIds.push(trimmed);
      }
    } else {
      seenKeys.add(key);
      empIds.push(trimmed);
      normalizedKeys.push(key);
    }
  }

  return {
    rawTokens,
    empIds,
    normalizedKeys,
    duplicateEmpIds,
    hasDuplicates: duplicateEmpIds.length > 0,
    piEmpId: empIds.length > 0 ? empIds[0] : null,
    coPiEmpIds: empIds.length > 1 ? empIds.slice(1) : []
  };
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
 * Validates year/month/day and formats ISO string YYYY-MM-DD.
 */
function buildIsoDateIfValid(y, m, d) {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
  if (y < 1950 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
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
 * Derives 4-digit calendar Sanction Year from Sanction Date.
 */
function deriveSanctionYear(sanctionDateIso) {
  if (!sanctionDateIso) return null;
  const match = String(sanctionDateIso).match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Normalizes External Research Status strictly
 */
function normalizeExternalStatus(rawStatus) {
  if (!rawStatus || !String(rawStatus).trim()) {
    return {
      valid: false,
      status: null,
      error: 'Status is required. Allowed values: Ongoing, Completed, Sanctioned, Proposal Submitted, Terminated.'
    };
  }

  const s = String(rawStatus).trim();
  if (VALID_EXTERNAL_STATUSES.includes(s)) {
    return { valid: true, status: s, error: null };
  }

  const alias = EXTERNAL_STATUS_ALIASES[s.toLowerCase()];
  if (alias) {
    return { valid: true, status: alias, error: null };
  }

  return {
    valid: false,
    status: null,
    error: `Invalid Status "${s}". Allowed values: Ongoing, Completed, Sanctioned, Proposal Submitted, Terminated.`
  };
}

/**
 * Derives School and Campus dynamically from Department name without failing
 */
function deriveSchoolAndCampus(department) {
  const deptStr = String(department || '').toLowerCase();
  if (deptStr.includes('architecture') || deptStr.includes('soa')) {
    return { school: 'School of Architecture', campus: 'Bangalore Kengeri Campus' };
  }
  return { school: 'School of Engineering and Technology', campus: 'Bangalore Kengeri Campus' };
}

/**
 * Builds the four-part duplicate detection key for External Research:
 * Title + Funding Agency + Sanction Date + Unordered EmpId Set
 */
function buildExternalDuplicateKey(title, fundingAgency, sanctionDate, empIds) {
  const normTitle = String(title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const normAgency = String(fundingAgency || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const normDate = sanctionDate ? String(sanctionDate).trim().split('T')[0] : 'no-date';
  const normIds = Array.isArray(empIds)
    ? [...empIds].map(id => normalizeEmpIdKey(id)).filter(Boolean).sort().join('|')
    : '';
  return `${normTitle}:::${normAgency}:::${normDate}:::${normIds}`;
}

/**
 * Generates official 18-column Excel template workbook with instructions and sample rows.
 */
function buildExternalTemplateWorkbook() {
  const wb = XLSX.utils.book_new();

  // Template Data sheet
  const headers = [...EXTERNAL_RESEARCH_TEMPLATE_COLUMNS];
  const sampleRows = [
    [
      'AI-Powered Smart Microgrid for Rural Electrification',
      '2295, 4241, 1899',
      'Department of Science and Technology (DST)',
      'Clean Energy Research Initiative',
      'Government (National)',
      'DST/TMD/CERI/2024/098',
      '2024-06-15',
      2024, // derived Sanction Year
      '2024-07-01',
      '2027-06-30',
      '3 Years (36 Months)', // calculated Duration
      4500000,
      1500000,
      'Ongoing',
      'https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9/view?usp=sharing',
      'https://drive.google.com/file/d/1Z9Y8X7W6V5U4T3S2/view?usp=sharing',
      'https://dst.gov.in/project/smart-microgrid',
      'Development of autonomous microgrid load management with bidirectional IoT power inverters.'
    ],
    [
      'Novel Biopolymer Composites for Water Purification',
      '4629, 2585',
      'Science and Engineering Research Board (SERB)',
      'Core Research Grant (CRG)',
      'Government (National)',
      'CRG/2023/004512',
      '2023-11-20',
      2023,
      '2024-01-01',
      '2026-12-31',
      '3 Years (36 Months)',
      3200000,
      3200000,
      'Ongoing',
      'https://drive.google.com/file/d/1B3C4D5E6F7G8H9I0/view?usp=sharing',
      '',
      '',
      'Synthesis and testing of biodegradable nanocomposite membranes for industrial wastewater filtration.'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

  // Set column widths
  ws['!cols'] = [
    { wch: 45 }, // Project Title
    { wch: 25 }, // Investigators EmpId
    { wch: 35 }, // Funding Agency
    { wch: 28 }, // Scheme / Program
    { wch: 24 }, // Agency Type
    { wch: 26 }, // Sanction Order No
    { wch: 15 }, // Sanction Date
    { wch: 15 }, // Sanction Year (Derived)
    { wch: 14 }, // Start Date
    { wch: 14 }, // End Date
    { wch: 24 }, // Project Duration (Calculated)
    { wch: 22 }, // Sanctioned Amount (INR)
    { wch: 22 }, // Amount Received (INR)
    { wch: 18 }, // Status
    { wch: 45 }, // Sanction Letter
    { wch: 45 }, // Fund Receipt / UC
    { wch: 35 }, // Project URL
    { wch: 50 }  // Description
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'External Research Template');

  // Instructions sheet
  const instructionHeaders = ['Field Name', 'Required', 'Format / Allowed Values', 'Description & Business Rules'];
  const instructions = [
    ['Project Title', 'Yes', 'Text string (Max 500 chars)', 'Full official title of the sanctioned research project.'],
    ['Investigators EmpId', 'Yes', 'Comma-separated Employee IDs (e.g., 3489, 2043, 1672)', 'First EmpID is assigned as Principal Investigator (PI). Subsequent EmpIDs are Co-Investigators (Co-PI). Faculty profile, department, school, and campus are retrieved automatically.'],
    ['Funding Agency', 'Yes', 'Text string (e.g., DST, SERB, ISRO, DBT, DRDO, Industry)', 'Name of funding agency or sponsor.'],
    ['Scheme / Program', 'No', 'Text string', 'Specific funding scheme or call name.'],
    ['Agency Type', 'No', 'Government (National), Government (State), International Agency, Industry / Corporate, etc.', 'Category of funding agency.'],
    ['Sanction Order No', 'No', 'Text string', 'Official sanction reference or grant agreement number.'],
    ['Sanction Date', 'Yes', 'YYYY-MM-DD or DD/MM/YYYY', 'Date on which the grant sanction letter was issued.'],
    ['Sanction Year', 'Auto-derived', '4-digit calendar year (e.g., 2024)', 'SYSTEM DERIVED exclusively from Sanction Date. Cannot be manually overridden.'],
    ['Start Date', 'No', 'YYYY-MM-DD or DD/MM/YYYY', 'Official commencement date of the project.'],
    ['End Date', 'No', 'YYYY-MM-DD or DD/MM/YYYY', 'Scheduled or actual completion date.'],
    ['Project Duration', 'Auto-calculated', 'Years / Months string (e.g., 3 Years (36 Months))', 'SYSTEM CALCULATED automatically from Start Date and End Date. Cannot be manually overridden.'],
    ['Sanctioned Amount (INR)', 'Yes', 'Numeric amount in INR (e.g., 4500000)', 'Total sanctioned grant amount in Indian Rupees.'],
    ['Amount Received (INR)', 'No', 'Numeric amount in INR (e.g., 1500000)', 'Total funds released/received to date.'],
    ['Status', 'Yes', 'Ongoing, Completed, Sanctioned, Proposal Submitted, Terminated', 'Current operational status of the research project.'],
    ['Sanction Letter', 'No', 'Google Drive Share Link (https://drive.google.com/...)', 'Link to official sanction letter or grant agreement.'],
    ['Fund Receipt / UC', 'No', 'Google Drive Share Link (https://drive.google.com/...)', 'Link to Fund Receipt or Utilization Certificate.'],
    ['Project URL', 'No', 'Valid Web URL (https://...)', 'External project website, repository, or portal.'],
    ['Description', 'No', 'Text summary', 'Brief abstract or scope of work.']
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet([instructionHeaders, ...instructions]);
  wsInstructions['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 45 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions & Rules');

  return wb;
}

/**
 * Builds CSV string of the official 18-column External Research template.
 */
function buildExternalTemplateCsv() {
  const wb = buildExternalTemplateWorkbook();
  const ws = wb.Sheets['External Research Template'];
  return XLSX.utils.sheet_to_csv(ws);
}

/**
 * Evaluates Excel/CSV rows for bulk upload validation and preview.
 */
async function evaluateBulkExternalRows({ rows, user, Faculty, SponsoredProject }) {
  // Collect all unique EmpId keys across rows
  const allEmpIdKeys = new Set();
  const parsedRowsInfo = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const rawRow = rows[idx];
    const rawEmpIds = rawRow['Investigators EmpId'] || rawRow['investigators_empid'] || rawRow['EmpId'] || rawRow['empid'] || '';
    const parsedIds = parseAndNormalizeEmpIds(rawEmpIds);
    parsedIds.normalizedKeys.forEach(k => allEmpIdKeys.add(k));
    parsedRowsInfo.push({ rawRow, parsedIds });
  }

  // Pre-load all matching faculty profiles from database
  const facultyMap = new Map();
  if (allEmpIdKeys.size > 0 && Faculty) {
    const facultyRecords = await Faculty.findAll({
      where: {
        employeeId: {
          [Op.in]: Array.from(allEmpIdKeys)
        }
      },
      attributes: ['id', 'employeeId', 'name', 'designation', 'department', 'email']
    });

    for (const f of facultyRecords) {
      facultyMap.set(normalizeEmpIdKey(f.employeeId), f);
    }
  }

  // Pre-load existing Sponsored Projects for duplicate detection
  const existingProjects = SponsoredProject
    ? await SponsoredProject.findAll({
        attributes: ['id', 'title', 'fundingAgency', 'sanctionDate', 'empIdsRaw']
      })
    : [];

  const existingDuplicateKeys = new Set();
  for (const p of existingProjects) {
    const ids = parseAndNormalizeEmpIds(p.empIdsRaw).empIds;
    const key = buildExternalDuplicateKey(p.title, p.fundingAgency, p.sanctionDate, ids);
    existingDuplicateKeys.add(key);
  }

  const batchSeenKeys = new Set();
  const evaluatedRows = [];

  let validRowCount = 0;
  let skippedInvalidEmpIdCount = 0;
  let skippedMissingEmpIdCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  for (let i = 0; i < parsedRowsInfo.length; i++) {
    const rowNum = i + 1;
    const { rawRow, parsedIds } = parsedRowsInfo[i];

    const title = String(rawRow['Project Title'] || rawRow['project_title'] || rawRow['Title'] || '').trim();
    const fundingAgency = String(rawRow['Funding Agency'] || rawRow['funding_agency'] || '').trim();
    const scheme = String(rawRow['Scheme / Program'] || rawRow['scheme_program'] || rawRow['Scheme'] || '').trim();
    const agencyType = String(rawRow['Agency Type'] || rawRow['agency_type'] || '').trim();
    const sanctionOrderNo = String(rawRow['Sanction Order No'] || rawRow['sanction_order_no'] || '').trim();
    
    // Dates
    const rawSanctionDate = rawRow['Sanction Date'] || rawRow['sanction_date'];
    const sanctionDateIso = sanitizeDateNoShift(rawSanctionDate);
    const derivedYear = deriveSanctionYear(sanctionDateIso);

    const rawStartDate = rawRow['Start Date'] || rawRow['start_date'];
    const startDateIso = sanitizeDateNoShift(rawStartDate);

    const rawEndDate = rawRow['End Date'] || rawRow['end_date'];
    const endDateIso = sanitizeDateNoShift(rawEndDate);

    // Duration calculation
    let calculatedDuration = null;
    let durationFormatted = 'Not Available';
    if (startDateIso && endDateIso) {
      calculatedDuration = calculateProjectDuration(startDateIso, endDateIso);
      durationFormatted = calculatedDuration.formatted;
    } else if (startDateIso) {
      durationFormatted = 'Ongoing (Start date recorded)';
    }

    // Financials
    const rawSanctionedAmount = rawRow['Sanctioned Amount (INR)'] || rawRow['Sanctioned Amount'] || rawRow['sanctioned_amount'] || 0;
    const sanctionedAmountNum = parseFloat(String(rawSanctionedAmount).replace(/[^0-9.-]/g, '')) || 0;

    const rawAmountReceived = rawRow['Amount Received (INR)'] || rawRow['Amount Received'] || rawRow['amount_received'];
    const amountReceivedNum = rawAmountReceived !== undefined && rawAmountReceived !== null && String(rawAmountReceived).trim() !== ''
      ? (parseFloat(String(rawAmountReceived).replace(/[^0-9.-]/g, '')) || 0)
      : null;

    // Status
    const rawStatus = rawRow['Status'] || rawRow['status'] || 'Ongoing';
    const statusValidation = normalizeExternalStatus(rawStatus);

    // Documents / URLs
    const sanctionLetterUrl = String(rawRow['Sanction Letter'] || rawRow['sanction_letter'] || '').trim();
    const fundReceiptUrl = String(rawRow['Fund Receipt / Utilization Certificate (UC)'] || rawRow['Fund Receipt'] || rawRow['fund_receipt'] || '').trim();
    const projectUrl = String(rawRow['Project URL'] || rawRow['project_url'] || '').trim();
    const description = String(rawRow['Description'] || rawRow['description'] || '').trim();

    // Faculty resolution
    const facultyAssociations = [];
    const validEmpIds = [];
    const invalidEmpIds = [];
    let hasUnresolvedPI = false;
    let piFaculty = null;

    if (parsedIds.empIds.length === 0) {
      hasUnresolvedPI = true;
    } else {
      for (let pos = 0; pos < parsedIds.empIds.length; pos++) {
        const empIdStr = parsedIds.empIds[pos];
        const key = normalizeEmpIdKey(empIdStr);
        const role = pos === 0 ? 'PI' : 'Co-PI';
        const facultyRecord = facultyMap.get(key);

        if (facultyRecord) {
          validEmpIds.push(empIdStr);
          const sc = deriveSchoolAndCampus(facultyRecord.department);
          const assoc = {
            facultyId: facultyRecord.id,
            employeeId: facultyRecord.employeeId,
            role,
            facultyName: facultyRecord.name,
            designation: facultyRecord.designation,
            department: facultyRecord.department,
            originalDepartment: facultyRecord.department,
            originalDepartmentSource: 'faculty_profile_snapshot',
            school: sc.school,
            campus: sc.campus,
            isValid: true,
            displayOrder: pos
          };
          facultyAssociations.push(assoc);
          if (role === 'PI') {
            piFaculty = assoc;
          }
        } else {
          invalidEmpIds.push(empIdStr);
          const assoc = {
            facultyId: null,
            employeeId: empIdStr,
            role,
            facultyName: `Unresolved Faculty (${empIdStr})`,
            designation: null,
            department: null,
            originalDepartment: null,
            originalDepartmentSource: 'unresolved_empid',
            school: null,
            campus: null,
            isValid: false,
            displayOrder: pos
          };
          facultyAssociations.push(assoc);
          if (role === 'PI') {
            hasUnresolvedPI = true;
          }
        }
      }
    }

    // Determine row issues
    const errors = [];
    const warnings = [];

    if (!title) {
      errors.push('Project Title is required.');
    }
    if (!fundingAgency) {
      errors.push('Funding Agency is required.');
    }
    if (!rawSanctionDate || !sanctionDateIso) {
      errors.push('Valid Sanction Date is required to derive Sanction Year.');
    }
    if (sanctionedAmountNum < 0) {
      errors.push('Sanctioned Amount cannot be negative.');
    }
    if (amountReceivedNum !== null && amountReceivedNum < 0) {
      errors.push('Amount Received cannot be negative.');
    }
    if (!statusValidation.valid) {
      errors.push(statusValidation.error);
    }
    if (startDateIso && endDateIso && calculatedDuration && !calculatedDuration.isValid) {
      errors.push(calculatedDuration.error || 'End Date cannot be earlier than Start Date.');
    }

    if (hasUnresolvedPI) {
      if (parsedIds.empIds.length === 0) {
        errors.push('Principal Investigator (PI) EmpId is missing.');
      } else {
        errors.push(`Principal Investigator EmpId "${parsedIds.empIds[0]}" could not be verified in Faculty Management. Entire row skipped.`);
      }
    }

    if (invalidEmpIds.length > 0) {
      errors.push(`Co-Investigator EmpID(s) not found in Faculty Management: ${invalidEmpIds.join(', ')}. Entire row skipped.`);
    }
    if (parsedIds.hasDuplicates) {
      warnings.push(`Duplicate EmpIDs within row removed: ${parsedIds.duplicateEmpIds.join(', ')}`);
    }

    // Check Duplicate
    const dupKey = buildExternalDuplicateKey(title, fundingAgency, sanctionDateIso, parsedIds.empIds);
    let isDuplicate = false;
    if (existingDuplicateKeys.has(dupKey) || batchSeenKeys.has(dupKey)) {
      isDuplicate = true;
      warnings.push('Duplicate detected: A project with this Title, Funding Agency, Sanction Date, and Investigators already exists.');
    } else {
      batchSeenKeys.add(dupKey);
    }

    // Determine overall row validation status
    let rowStatus = 'VALID';
    let isEligible = false;
    let skipReason = null;

    if (parsedIds.empIds.length === 0) {
      rowStatus = 'SKIPPED_MISSING_EMPID';
      isEligible = false;
      skipReason = 'Principal Investigator (PI) EmpId is missing. Entire row skipped.';
      skippedMissingEmpIdCount++;
    } else if (hasUnresolvedPI) {
      rowStatus = 'SKIPPED_INVALID_EMPID';
      isEligible = false;
      skipReason = `Principal Investigator EmpID "${parsedIds.empIds[0]}" not found in Faculty Management. Entire row skipped.`;
      skippedInvalidEmpIdCount++;
    } else if (invalidEmpIds.length > 0) {
      rowStatus = 'SKIPPED_INVALID_EMPID';
      isEligible = false;
      skipReason = `Co-Investigator EmpID(s) not found in Faculty Management: ${invalidEmpIds.join(', ')}. Entire row skipped.`;
      skippedInvalidEmpIdCount++;
    } else if (errors.length > 0) {
      rowStatus = 'ERROR';
      isEligible = false;
      errorCount++;
    } else if (isDuplicate) {
      rowStatus = 'DUPLICATE';
      isEligible = false;
      duplicateCount++;
    } else {
      rowStatus = 'VALID';
      isEligible = true;
      validRowCount++;
    }

    evaluatedRows.push({
      rowNumber: rowNum,
      title,
      fundingAgency,
      scheme,
      agencyType,
      sanctionOrderNo,
      sanctionDate: sanctionDateIso,
      sanctionYear: derivedYear,
      startDate: startDateIso,
      endDate: endDateIso,
      duration: durationFormatted,
      sanctionedAmount: sanctionedAmountNum,
      amountReceived: amountReceivedNum,
      status: statusValidation.status || 'Ongoing',
      sanctionLetterUrl,
      fundReceiptUrl,
      projectUrl,
      description,
      empIdsRaw: parsedIds.empIds.join(', '),
      piFaculty,
      hasUnresolvedPI,
      facultyAssociations,
      validEmpIds,
      invalidEmpIds,
      duplicateEmpIds: parsedIds.duplicateEmpIds,
      isDuplicate,
      isEligible,
      skipReason,
      errors,
      warnings,
      rowStatus
    });
  }

  return {
    totalRows: rows.length,
    validRows: validRowCount,
    skippedInvalidEmpIdCount,
    skippedMissingEmpIdCount,
    duplicates: duplicateCount,
    errors: errorCount,
    rows: evaluatedRows
  };
}

/**
 * Atomically imports verified External Research rows inside a Sequelize transaction.
 */
async function executeBulkImportExternal({ evaluatedRows, user, sequelize, SponsoredProject, SponsoredProjectFaculty, SponsoredResearchDocument }) {
  const importResults = {
    totalProcessed: evaluatedRows.length,
    successfulImports: 0,
    skippedInvalidEmpIdCount: 0,
    skippedMissingEmpIdCount: 0,
    duplicatesSkipped: 0,
    errorsSkipped: 0,
    importedProjectIds: []
  };

  await sequelize.transaction(async (t) => {
    for (const row of evaluatedRows) {
      if (row.rowStatus === 'SKIPPED_MISSING_EMPID') {
        importResults.skippedMissingEmpIdCount++;
        continue;
      }
      if (row.rowStatus === 'SKIPPED_INVALID_EMPID') {
        importResults.skippedInvalidEmpIdCount++;
        continue;
      }
      if (row.rowStatus === 'DUPLICATE' || row.isDuplicate) {
        importResults.duplicatesSkipped++;
        continue;
      }
      if (row.rowStatus === 'ERROR' || !row.isEligible) {
        importResults.errorsSkipped++;
        continue;
      }

      // Determine primary department, school, campus from PI
      const primaryDept = row.piFaculty?.department || 'Unknown Department';
      const sc = deriveSchoolAndCampus(primaryDept);

      // Create main Sponsored Project
      const project = await SponsoredProject.create(
        {
          title: row.title,
          fundingAgency: row.fundingAgency,
          schemeProgram: row.scheme || null,
          agencyType: row.agencyType || null,
          sanctionOrderNo: row.sanctionOrderNo || null,
          sanctionDate: row.sanctionDate,
          sanctionYear: row.sanctionYear,
          startDate: row.startDate || null,
          endDate: row.endDate || null,
          duration: row.duration,
          sanctionedAmount: row.sanctionedAmount,
          amountReceived: row.amountReceived,
          status: row.status,
          projectUrl: row.projectUrl || null,
          description: row.description || null,
          department: primaryDept,
          school: sc.school,
          campus: sc.campus,
          academicYear: row.sanctionYear ? `${row.sanctionYear - 1}-${row.sanctionYear}` : null,
          principalInvestigator: row.piFaculty?.facultyName || null,
          principalInvestigatorEmpId: row.piFaculty?.employeeId || null,
          principalInvestigatorDepartment: primaryDept,
          empIdsRaw: row.empIdsRaw,
          hasInvalidEmpIds: row.invalidEmpIds.length > 0,
          invalidEmpIds: row.invalidEmpIds.length > 0 ? row.invalidEmpIds : [],
          duplicateEmpIds: row.duplicateEmpIds.length > 0 ? row.duplicateEmpIds : [],
          unresolvedPI: false,
          createdBy: user.id
        },
        { transaction: t }
      );

      // Create Faculty Associations
      for (const assoc of row.facultyAssociations) {
        await SponsoredProjectFaculty.create(
          {
            projectId: project.id,
            facultyId: assoc.facultyId,
            employeeId: assoc.employeeId,
            normalizedEmployeeId: normalizeEmpIdKey(assoc.employeeId),
            role: assoc.role,
            facultyName: assoc.facultyName,
            designation: assoc.designation,
            originalDepartment: assoc.originalDepartment,
            originalDepartmentSource: assoc.originalDepartmentSource,
            isValid: assoc.isValid,
            displayOrder: assoc.displayOrder
          },
          { transaction: t }
        );
      }

      // Attach Sanction Letter Google Drive document if provided
      if (row.sanctionLetterUrl && SponsoredResearchDocument) {
        await SponsoredResearchDocument.create(
          {
            projectId: project.id,
            documentCategory: 'agreement_letter',
            documentType: 'sanction_letter',
            documentName: `${row.title.substring(0, 50)} - Sanction Letter`,
            googleDriveLink: row.sanctionLetterUrl,
            driveLink: row.sanctionLetterUrl,
            storageType: 'google_drive',
            uploadedBy: user.id,
            isActive: true
          },
          { transaction: t }
        );
      }

      // Attach Fund Receipt Google Drive document if provided
      if (row.fundReceiptUrl && SponsoredResearchDocument) {
        await SponsoredResearchDocument.create(
          {
            projectId: project.id,
            documentCategory: 'payment_receipt',
            documentType: 'payment_receipt',
            documentName: `${row.title.substring(0, 50)} - Fund Receipt`,
            googleDriveLink: row.fundReceiptUrl,
            driveLink: row.fundReceiptUrl,
            storageType: 'google_drive',
            uploadedBy: user.id,
            isActive: true
          },
          { transaction: t }
        );
      }

      importResults.successfulImports++;
      importResults.importedProjectIds.push(project.id);
    }
  });

  return importResults;
}

module.exports = {
  EXTERNAL_RESEARCH_TEMPLATE_COLUMNS,
  VALID_EXTERNAL_STATUSES,
  EXTERNAL_STATUS_ALIASES,
  normalizeEmpIdKey,
  parseAndNormalizeEmpIds,
  sanitizeDateNoShift,
  deriveSanctionYear,
  normalizeExternalStatus,
  deriveSchoolAndCampus,
  buildExternalDuplicateKey,
  buildExternalTemplateWorkbook,
  buildExternalTemplateCsv,
  evaluateBulkExternalRows,
  executeBulkImportExternal
};

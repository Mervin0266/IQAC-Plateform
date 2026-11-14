'use strict';

/**
 * Internal Research Service
 *
 * Implements authoritative business logic, multi-faculty equal ownership (no PI / Co-PI hierarchy),
 * EmpId resolution via Faculty Management, Seed Money scheme handling, automatic Calendar Year
 * derivation strictly from Start Date, optional End Date, 3-part duplicate detection,
 * Google Drive proof link validation, and standardized 7-column bulk upload processing for
 * Research & Innovation -> Sponsored Research -> Internal Research.
 */

const XLSX = require('xlsx');
const { Op } = require('sequelize');
const { calculateProjectDuration } = require('../utils/projectDurationHelper');

/**
 * Exactly 7 columns in strict order required by the official Internal Research specification.
 */
const INTERNAL_RESEARCH_TEMPLATE_COLUMNS = [
  'EmpId',
  'Seed Money',
  'Title',
  'Start Date',
  'End Date',
  'Sanctioned Amount',
  'Proof'
];

/**
 * Standard Configured Seed Money Schemes / Programs
 */
const CONFIGURED_SEED_MONEY_SCHEMES = [
  'Centre for Research - Seed Money Project (MRP)',
  'Minor Research Project (Minor RP)',
  'Faculty Research Grant (FRG)',
  'Seed Money for Research (SMR)',
  'Student Research Fellowship Scheme (SRFS)',
  'Postdoctoral / Early Career Seed Grant',
  'Interdisciplinary Research Grant',
  'Others / Special Seed Grant'
];

/**
 * Normalizes an Employee ID for comparison while preserving exact trimmed string representation.
 */
function normalizeEmpIdKey(empId) {
  if (empId === null || empId === undefined) return '';
  return String(empId).trim().toUpperCase();
}

/**
 * Parses and normalizes single or comma-separated Employee IDs for equal faculty associations.
 * - Trims whitespace
 * - Removes empty tokens
 * - Deduplicates within a record while tracking duplicates
 * - All members are equal (no PI / Co-PI)
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
    hasDuplicates: duplicateEmpIds.length > 0
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
 * Derives 4-digit calendar Year exclusively from Start Date.
 */
function deriveCalendarYear(startDateIso) {
  if (!startDateIso) return null;
  const match = String(startDateIso).match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Normalizes Seed Money scheme/program name
 */
function normalizeSeedMoneyScheme(rawScheme) {
  if (!rawScheme || !String(rawScheme).trim()) {
    return {
      valid: false,
      scheme: null,
      error: 'Seed Money scheme/program name is required.'
    };
  }

  const str = String(rawScheme).trim();
  // Exact match
  const match = CONFIGURED_SEED_MONEY_SCHEMES.find(
    s => s.toLowerCase() === str.toLowerCase()
  );

  if (match) {
    return { valid: true, scheme: match, error: null };
  }

  // If reasonably non-empty, preserve as custom configured scheme with warning
  return {
    valid: true,
    scheme: str,
    warning: `Custom Seed Money scheme "${str}" detected.`,
    error: null
  };
}

/**
 * Derives School and Campus dynamically from Department name
 */
function deriveSchoolAndCampus(department) {
  const deptStr = String(department || '').toLowerCase();
  if (deptStr.includes('architecture') || deptStr.includes('soa')) {
    return { school: 'School of Architecture', campus: 'Bangalore Kengeri Campus' };
  }
  return { school: 'School of Engineering and Technology', campus: 'Bangalore Kengeri Campus' };
}

/**
 * Builds the 3-part duplicate detection key for Internal Research:
 * Title + Seed Money + Start Date + Unordered EmpId Set
 */
function buildInternalDuplicateKey(title, seedMoney, startDate, empIds) {
  const normTitle = String(title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const normSeed = String(seedMoney || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const normDate = startDate ? String(startDate).trim().split('T')[0] : 'no-date';
  const normIds = Array.isArray(empIds)
    ? [...empIds].map(id => normalizeEmpIdKey(id)).filter(Boolean).sort().join('|')
    : '';
  return `${normTitle}:::${normSeed}:::${normDate}:::${normIds}`;
}

/**
 * Generates official 7-column Excel template workbook with instructions and sample rows.
 */
function buildInternalTemplateWorkbook() {
  const wb = XLSX.utils.book_new();

  // Template Data sheet
  const headers = [...INTERNAL_RESEARCH_TEMPLATE_COLUMNS];
  const sampleRows = [
    [
      '2295, 4241, 1899',
      'Centre for Research - Seed Money Project (MRP)',
      'Development of Edge-AI Embedded Node for Agricultural Soil Moisture Telemetry',
      '2024-07-01',
      '2025-06-30',
      250000,
      'https://drive.google.com/file/d/1K8L9M0N1P2Q3R4S5/view?usp=sharing'
    ],
    [
      '4629, 2585',
      'Faculty Research Grant (FRG)',
      'Synthesis and Tribological Characterization of Eco-Friendly Bio-Lubricants',
      '2024-09-15',
      '', // Optional End Date
      180000,
      'https://drive.google.com/file/d/1U2V3W4X5Y6Z7A8B9/view?usp=sharing'
    ]
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // EmpId
    { wch: 42 }, // Seed Money
    { wch: 55 }, // Title
    { wch: 15 }, // Start Date
    { wch: 15 }, // End Date
    { wch: 20 }, // Sanctioned Amount
    { wch: 50 }  // Proof
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Internal Research Template');

  // Instructions sheet
  const instructionHeaders = ['Column', 'Required', 'Format / Allowed Values', 'Description & Business Rules'];
  const instructions = [
    ['EmpId', 'Yes', 'Comma-separated Employee IDs (e.g., 3489, 2043, 1672)', 'All associated faculty members are equal partners (no PI / Co-PI distinction). Faculty details and departments are verified via Faculty Management.'],
    ['Seed Money', 'Yes', 'Select from configured schemes / programs', 'Name of institutional seed-money scheme or internal grant call.'],
    ['Title', 'Yes', 'Text string (Max 500 chars)', 'Full title of the internal research / seed money project.'],
    ['Start Date', 'Yes', 'YYYY-MM-DD or DD/MM/YYYY', 'Official project start date. Calendar Year is derived exclusively from this date.'],
    ['End Date', 'No (Optional)', 'YYYY-MM-DD or DD/MM/YYYY', 'Scheduled or actual completion date. Optional to support ongoing internal projects.'],
    ['Sanctioned Amount', 'Yes', 'Numeric amount in INR (e.g., 250000)', 'Total sanctioned internal grant amount in Indian Rupees.'],
    ['Proof', 'No (Optional)', 'Google Drive Share Link (https://drive.google.com/...)', 'Link to sanction letter, sanction memo, or grant approval document.']
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet([instructionHeaders, ...instructions]);
  wsInstructions['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 45 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions & Rules');

  return wb;
}

/**
 * Builds CSV string of the official 7-column Internal Research template.
 */
function buildInternalTemplateCsv() {
  const wb = buildInternalTemplateWorkbook();
  const ws = wb.Sheets['Internal Research Template'];
  return XLSX.utils.sheet_to_csv(ws);
}

/**
 * Evaluates Excel/CSV rows for bulk upload validation and preview.
 */
async function evaluateBulkInternalRows({ rows, user, Faculty, InternalResearchProject }) {
  // Collect all unique EmpId keys across rows
  const allEmpIdKeys = new Set();
  const parsedRowsInfo = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const rawRow = rows[idx];
    const rawEmpIds = rawRow['EmpId'] || rawRow['empid'] || rawRow['Investigators EmpId'] || '';
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

  // Pre-load existing Internal Projects for duplicate detection
  const existingProjects = InternalResearchProject
    ? await InternalResearchProject.findAll({
        attributes: ['id', 'title', 'seedMoney', 'startDate', 'empIdsRaw']
      })
    : [];

  const existingDuplicateKeys = new Set();
  for (const p of existingProjects) {
    const ids = parseAndNormalizeEmpIds(p.empIdsRaw).empIds;
    const key = buildInternalDuplicateKey(p.title, p.seedMoney, p.startDate, ids);
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

    const title = String(rawRow['Title'] || rawRow['title'] || rawRow['Project Title'] || '').trim();
    const rawSeedMoney = rawRow['Seed Money'] || rawRow['seed_money'] || rawRow['Scheme / Program'] || '';
    const seedMoneyValidation = normalizeSeedMoneyScheme(rawSeedMoney);

    // Dates
    const rawStartDate = rawRow['Start Date'] || rawRow['start_date'];
    const startDateIso = sanitizeDateNoShift(rawStartDate);
    const derivedCalendarYear = deriveCalendarYear(startDateIso);

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

    // Financial
    const rawSanctionedAmount = rawRow['Sanctioned Amount'] || rawRow['sanctioned_amount'] || rawRow['Sanctioned Amount (INR)'] || 0;
    const sanctionedAmountNum = parseFloat(String(rawSanctionedAmount).replace(/[^0-9.-]/g, '')) || 0;

    // Proof
    const proofUrl = String(rawRow['Proof'] || rawRow['proof'] || '').trim();

    // Faculty resolution (all equal, no PI / Co-PI)
    const facultyAssociations = [];
    const validEmpIds = [];
    const invalidEmpIds = [];

    for (let pos = 0; pos < parsedIds.empIds.length; pos++) {
      const empIdStr = parsedIds.empIds[pos];
      const key = normalizeEmpIdKey(empIdStr);
      const facultyRecord = facultyMap.get(key);

      if (facultyRecord) {
        validEmpIds.push(empIdStr);
        const sc = deriveSchoolAndCampus(facultyRecord.department);
        facultyAssociations.push({
          facultyId: facultyRecord.id,
          employeeId: facultyRecord.employeeId,
          facultyName: facultyRecord.name,
          designation: facultyRecord.designation,
          department: facultyRecord.department,
          originalDepartment: facultyRecord.department,
          originalDepartmentSource: 'faculty_profile_snapshot',
          school: sc.school,
          campus: sc.campus,
          isValid: true,
          displayOrder: pos
        });
      } else {
        invalidEmpIds.push(empIdStr);
        facultyAssociations.push({
          facultyId: null,
          employeeId: empIdStr,
          facultyName: `Unresolved Faculty (${empIdStr})`,
          designation: null,
          department: null,
          originalDepartment: null,
          originalDepartmentSource: 'unresolved_empid',
          school: null,
          campus: null,
          isValid: false,
          displayOrder: pos
        });
      }
    }

    // Row evaluation
    const errors = [];
    const warnings = [];

    if (!title) {
      errors.push('Title is required.');
    }
    if (!seedMoneyValidation.valid) {
      errors.push(seedMoneyValidation.error);
    } else if (seedMoneyValidation.warning) {
      warnings.push(seedMoneyValidation.warning);
    }
    if (!rawStartDate || !startDateIso) {
      errors.push('Valid Start Date is required to derive Calendar Year.');
    }
    if (sanctionedAmountNum < 0) {
      errors.push('Sanctioned Amount cannot be negative.');
    }
    if (startDateIso && endDateIso && calculatedDuration && !calculatedDuration.isValid) {
      errors.push(calculatedDuration.error || 'End Date cannot be earlier than Start Date.');
    }

    if (parsedIds.empIds.length === 0) {
      errors.push('At least one Employee ID (EmpId) is required.');
    } else if (invalidEmpIds.length > 0) {
      errors.push(`EmpID(s) not found in Faculty Management: ${invalidEmpIds.join(', ')}. Entire row skipped.`);
    }

    if (parsedIds.hasDuplicates) {
      warnings.push(`Duplicate EmpIDs removed: ${parsedIds.duplicateEmpIds.join(', ')}`);
    }

    // Check duplicate
    const dupKey = buildInternalDuplicateKey(title, seedMoneyValidation.scheme, startDateIso, parsedIds.empIds);
    let isDuplicate = false;
    if (existingDuplicateKeys.has(dupKey) || batchSeenKeys.has(dupKey)) {
      isDuplicate = true;
      warnings.push('Duplicate detected: An Internal Research project with this Title, Seed Money, Start Date, and Faculty already exists.');
    } else {
      batchSeenKeys.add(dupKey);
    }

    // Overall row status
    let rowStatus = 'VALID';
    let isEligible = false;
    let skipReason = null;

    if (parsedIds.empIds.length === 0) {
      rowStatus = 'SKIPPED_MISSING_EMPID';
      isEligible = false;
      skipReason = 'At least one Employee ID (EmpId) is required. Entire row skipped.';
      skippedMissingEmpIdCount++;
    } else if (invalidEmpIds.length > 0) {
      rowStatus = 'SKIPPED_INVALID_EMPID';
      isEligible = false;
      skipReason = `EmpID(s) not found in Faculty Management: ${invalidEmpIds.join(', ')}. Entire row skipped.`;
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
      seedMoney: seedMoneyValidation.scheme || rawSeedMoney,
      startDate: startDateIso,
      calendarYear: derivedCalendarYear,
      endDate: endDateIso,
      duration: durationFormatted,
      sanctionedAmount: sanctionedAmountNum,
      proofUrl,
      empIdsRaw: parsedIds.empIds.join(', '),
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
 * Atomically imports verified Internal Research rows inside a Sequelize transaction.
 */
async function executeBulkImportInternal({ evaluatedRows, user, sequelize, InternalResearchProject, InternalResearchFaculty }) {
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

      // Determine primary department from first valid faculty member
      const firstValidAssoc = row.facultyAssociations.find(a => a.isValid);
      const primaryDept = firstValidAssoc?.department || 'Unknown Department';

      const project = await InternalResearchProject.create(
        {
          title: row.title,
          seedMoney: row.seedMoney,
          startDate: row.startDate,
          calendarYear: row.calendarYear,
          endDate: row.endDate || null,
          duration: row.duration,
          sanctionedAmount: row.sanctionedAmount,
          department: primaryDept,
          proofUrl: row.proofUrl || null,
          empIdsRaw: row.empIdsRaw,
          hasInvalidEmpIds: row.invalidEmpIds.length > 0,
          invalidEmpIds: row.invalidEmpIds.length > 0 ? row.invalidEmpIds : [],
          duplicateEmpIds: row.duplicateEmpIds.length > 0 ? row.duplicateEmpIds : [],
          createdBy: user.id
        },
        { transaction: t }
      );

      // Create equal faculty associations
      for (const assoc of row.facultyAssociations) {
        await InternalResearchFaculty.create(
          {
            projectId: project.id,
            facultyId: assoc.facultyId,
            employeeId: assoc.employeeId,
            normalizedEmployeeId: normalizeEmpIdKey(assoc.employeeId),
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

      importResults.successfulImports++;
      importResults.importedProjectIds.push(project.id);
    }
  });

  return importResults;
}

module.exports = {
  INTERNAL_RESEARCH_TEMPLATE_COLUMNS,
  CONFIGURED_SEED_MONEY_SCHEMES,
  normalizeEmpIdKey,
  parseAndNormalizeEmpIds,
  sanitizeDateNoShift,
  deriveCalendarYear,
  normalizeSeedMoneyScheme,
  deriveSchoolAndCampus,
  buildInternalDuplicateKey,
  buildInternalTemplateWorkbook,
  buildInternalTemplateCsv,
  evaluateBulkInternalRows,
  executeBulkImportInternal
};

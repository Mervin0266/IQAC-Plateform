'use strict';

const { Op } = require('sequelize');
const googleDriveService = require('./googleDriveService');

/**
 * Normalizes a department string conservatively for reliable matching across canonical variations.
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
 * - Removes empty values
 * - Deduplicates within a record while tracking duplicate entries
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
 * Parses and normalizes dates into ISO YYYY-MM-DD strictly without timezone shifts.
 * Supports: Excel numeric serial dates, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, and Date instances.
 * Returns null for blank/NA strings OR invalid dates; use isBlankDateValue to distinguish optional blank vs malformed.
 */
function isBlankDateValue(val) {
  if (val === null || val === undefined) return true;
  if (val instanceof Date) return isNaN(val.getTime());
  const str = String(val).trim();
  if (!str) return true;
  const lower = str.toLowerCase();
  return ['n/a', 'na', 'nil', 'null', '-', '--', 'pending', 'not applicable', 'none', 'tbd'].includes(lower);
}

function sanitizeDateNoShift(val) {
  if (val === null || val === undefined || val === '') return null;

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const isUtcMidnight = val.getUTCHours() === 0 && val.getUTCMinutes() === 0 && val.getUTCSeconds() === 0;
    return isUtcMidnight
      ? buildIsoDateIfValid(val.getUTCFullYear(), val.getUTCMonth() + 1, val.getUTCDate())
      : buildIsoDateIfValid(val.getFullYear(), val.getMonth() + 1, val.getDate());
  }

  // Excel numeric serial date
  if (typeof val === 'number') {
    if (!Number.isFinite(val) || val < 1) return null;
    const ms = Date.UTC(1899, 11, 30) + Math.round(val) * 86400000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    return buildIsoDateIfValid(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  const str = String(val).trim();
  if (!str || isBlankDateValue(str)) return null;

  // Numeric string Excel serial (> 10000 to avoid 4-digit plain years)
  if (/^\d{5,6}(\.\d+)?$/.test(str)) {
    const num = Math.round(parseFloat(str));
    const ms = Date.UTC(1899, 11, 30) + num * 86400000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) {
      return buildIsoDateIfValid(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
  }

  // Strict YYYY-MM-DD or YYYY/MM/DD or ISO datetime prefix
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:$|T|\s)/);
  if (isoMatch) {
    return buildIsoDateIfValid(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10), parseInt(isoMatch[3], 10));
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2}|\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (dmyMatch[3].length === 2) year += 2000;
    return buildIsoDateIfValid(year, month, day);
  }

  // Named month formats e.g. "15 February 2025", "15-Feb-2025", "Feb 15, 2025"
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
 * Derives authoritative calendar year strictly from Date of Application.
 */
function deriveCalendarYear(isoDateOfApplication) {
  if (!isoDateOfApplication || !/^\d{4}-\d{2}-\d{2}$/.test(String(isoDateOfApplication))) return null;
  return parseInt(String(isoDateOfApplication).slice(0, 4), 10);
}

/**
 * Generates normalized duplicate signature for Copyright comparison:
 * Lowercase trimmed collapsed-whitespace Title + ISO Date of Application + Sorted Deduplicated EmpIds.
 */
function normalizeDuplicateSignature({ title, dateOfApplication, empIds }) {
  const normTitle = String(title || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  const normDate = sanitizeDateNoShift(dateOfApplication) || '';
  const { normalizedKeys } = parseAndNormalizeEmpIds(empIds);
  const sortedKeys = [...normalizedKeys].sort();
  return `${normTitle}::${normDate}::${sortedKeys.join('|')}`;
}

/**
 * Parse academic year start from string e.g. '2024-2025' -> 2024.
 */
function parseAyStartYear(ay) {
  if (!ay) return 0;
  const m = String(ay).match(/\b(19\d{2}|20\d{2})\b/);
  return m ? parseInt(m[1], 10) : 0;
}

/**
 * Picks the canonical current Faculty profile AND the most reliable historical department snapshot
 * for a given EmpId on dateOfApplication, without inventing history or duplicating Faculty records.
 */
function resolveSingleEmpIdRecords(rowsForEmpId = [], dateOfApplication, historyRows = []) {
  if (!Array.isArray(rowsForEmpId) || rowsForEmpId.length === 0) {
    return {
      isValid: false,
      facultyRow: null,
      originalDepartment: null,
      originalDepartmentSource: 'unrecognized'
    };
  }

  // Canonical current profile (latest Academic Year -> createdAt DESC)
  const sortedDesc = [...rowsForEmpId].sort((a, b) => {
    const ya = parseAyStartYear(a.academicYear);
    const yb = parseAyStartYear(b.academicYear);
    if (yb !== ya) return yb - ya;
    const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return db - da;
  });

  const currentFaculty = sortedDesc[0];
  const appYear = deriveCalendarYear(dateOfApplication);

  // 1. Check effective-dated UserDepartmentHistory if available
  if (dateOfApplication && Array.isArray(historyRows) && historyRows.length > 0) {
    const matchedHistory = historyRows.find(h => {
      if (!h.effectiveFrom) return false;
      const afterStart = String(dateOfApplication) >= String(h.effectiveFrom);
      const beforeEnd = !h.effectiveTo || String(dateOfApplication) <= String(h.effectiveTo);
      return afterStart && beforeEnd;
    });
    if (matchedHistory && matchedHistory.department) {
      return {
        isValid: true,
        facultyRow: currentFaculty,
        originalDepartment: matchedHistory.department,
        originalDepartmentSource: 'verified_history'
      };
    }
  }

  // 2. Check if Faculty Management stores a record explicitly for that application year's AY
  if (appYear) {
    const matchingAyRow = sortedDesc.find(r => {
      const startYr = parseAyStartYear(r.academicYear);
      return startYr === appYear || startYr === appYear - 1;
    });
    if (matchingAyRow && matchingAyRow.department) {
      return {
        isValid: true,
        facultyRow: currentFaculty,
        originalDepartment: matchingAyRow.department,
        originalDepartmentSource: 'academic_year_record'
      };
    }
  }

  // 3. Fallback: Capture authoritative Faculty department available at creation time
  return {
    isValid: true,
    facultyRow: currentFaculty,
    originalDepartment: currentFaculty.department || null,
    originalDepartmentSource: 'creation_snapshot'
  };
}

/**
 * Resolves a list of normalized EmpIds against existing Faculty Management & History models.
 */
async function resolveFacultyAssociationsForEmpIds(
  contributorsOrEmpIds,
  dateOfApplication,
  { Faculty, User, UserDepartmentHistory } = {},
  preloadedFacultyRows = null
) {
  if (!Array.isArray(contributorsOrEmpIds) || contributorsOrEmpIds.length === 0) {
    return {
      associations: [],
      invalidEmpIds: [],
      hasInvalidEmpIds: false,
      hasInvalidContributors: false
    };
  }

  // Load candidate faculty rows cleanly once
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
  let hasInvalidContributors = false;

  contributorsOrEmpIds.forEach((item, idx) => {
    let rawEmpId = '';
    let manualName = '';
    let manualDept = '';
    let manualDesig = '';

    if (typeof item === 'object' && item !== null) {
      rawEmpId = String(item.employeeId || item.empId || '').trim();
      manualName = String(item.name || item.facultyName || '').trim();
      manualDept = String(item.department || '').trim();
      manualDesig = String(item.designation || '').trim();
    } else {
      rawEmpId = String(item ?? '').trim();
    }

    // Case B & D: Blank EmpId
    if (!rawEmpId || rawEmpId.toLowerCase() === 'nil' || rawEmpId.toLowerCase() === 'n/a') {
      if (manualName && manualName.toLowerCase() !== 'nil' && manualName.toLowerCase() !== 'n/a') {
        // Case B: Blank EmpID + valid Name -> classified as Guest Faculty
        associations.push({
          facultyId: null,
          employeeId: null,
          normalizedEmployeeId: null,
          facultyName: manualName,
          designation: manualDesig || 'Guest Faculty',
          originalDepartment: manualDept || null,
          originalDepartmentSource: 'guest_contributor',
          isGuestFaculty: true,
          facultyType: 'Guest Faculty',
          isValid: true,
          displayOrder: idx
        });
      } else {
        // Case D: Missing both EmpID and Name
        hasInvalidContributors = true;
        associations.push({
          facultyId: null,
          employeeId: null,
          normalizedEmployeeId: null,
          facultyName: null,
          designation: null,
          originalDepartment: null,
          originalDepartmentSource: 'unrecognized',
          isGuestFaculty: false,
          facultyType: 'Faculty',
          isValid: false,
          displayOrder: idx
        });
      }
      return;
    }

    // Non-empty EmpId:
    const normKey = normalizeEmpIdKey(rawEmpId);
    const matchingRows = facultyByNormKey.get(normKey) || [];

    if (matchingRows.length === 0) {
      // Case C: Non-empty invalid EmpID (not found in Faculty Management)
      invalidEmpIds.push(rawEmpId);
      associations.push({
        facultyId: null,
        employeeId: rawEmpId,
        normalizedEmployeeId: normKey,
        facultyName: manualName || null,
        designation: null,
        originalDepartment: null,
        originalDepartmentSource: 'unrecognized',
        isGuestFaculty: false,
        facultyType: 'Faculty',
        isValid: false,
        displayOrder: idx
      });
    } else {
      // Case A: Valid EmpID in Faculty Management -> authoritative faculty data overrides manual name
      const sortedDesc = [...matchingRows].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
      const fac = sortedDesc[0];

      associations.push({
        facultyId: fac.id || null,
        employeeId: fac.employeeId ? String(fac.employeeId).trim() : rawEmpId,
        normalizedEmployeeId: normKey,
        facultyName: fac.name || null, // Authoritative Name from Faculty Management
        designation: fac.designation || null,
        originalDepartment: fac.department || null,
        originalDepartmentSource: 'creation_snapshot',
        isGuestFaculty: false,
        facultyType: 'Faculty',
        isValid: true,
        displayOrder: idx
      });
    }
  });

  return {
    associations,
    invalidEmpIds,
    hasInvalidEmpIds: invalidEmpIds.length > 0,
    hasInvalidContributors: hasInvalidContributors || invalidEmpIds.length > 0
  };
}

/**
 * Enriches Copyright record(s) with live Faculty current department/designation while preserving
 * immutable originalDepartment snapshots and distinguishing valid vs unrecognized EmpIds.
 */
function enrichCopyrightRecord(record, liveFacultyById = new Map(), liveFacultyByEmpKey = new Map()) {
  const plain = typeof record.toJSON === 'function' ? record.toJSON() : { ...record };
  const rawAssocs = Array.isArray(plain.facultyAssociations) ? [...plain.facultyAssociations] : [];
  rawAssocs.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

  const validDepartmentsSet = new Set();
  const currentDepartmentsSet = new Set();
  const originalDepartmentsSet = new Set();
  const invalidEmpIds = [];

  const facultyDetails = rawAssocs.map(assoc => {
    const live =
      (assoc.facultyId ? liveFacultyById.get(assoc.facultyId) : null) ||
      liveFacultyByEmpKey.get(assoc.normalizedEmployeeId || normalizeEmpIdKey(assoc.employeeId)) ||
      null;

    const isGuest = Boolean(assoc.isGuestFaculty || assoc.facultyType === 'Guest Faculty');
    const facultyType = assoc.facultyType || (isGuest ? 'Guest Faculty' : 'Faculty');
    const isValid = Boolean(assoc.isValid);
    const originalDept = assoc.originalDepartment || null;
    const currentDept = isValid ? (isGuest ? originalDept : (live?.department || originalDept || null)) : null;
    const facultyName = isValid ? (isGuest ? (assoc.facultyName || 'Guest Faculty') : (live?.name || assoc.facultyName || null)) : null;
    const designation = isValid ? (isGuest ? (assoc.designation || 'Guest Faculty') : (live?.designation || assoc.designation || null)) : null;
    const transferred = Boolean(
      isValid &&
      !isGuest &&
      originalDept &&
      currentDept &&
      normalizeDeptKey(originalDept) !== normalizeDeptKey(currentDept)
    );

    if (isValid) {
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
      facultyName: isGuest ? (assoc.facultyName || 'Guest Faculty') : facultyName,
      designation: isGuest ? (assoc.designation || 'Guest Faculty') : designation,
      originalDepartment: originalDept,
      originalDepartmentSource: assoc.originalDepartmentSource || (isGuest ? 'guest_contributor' : 'creation_snapshot'),
      currentDepartment: isGuest ? originalDept : currentDept,
      departmentTransferred: transferred,
      isValid,
      isGuestFaculty: isGuest,
      facultyType,
      email: live?.email || null
    };
  });

  const hasRegNo = Boolean(plain.registrationNo && String(plain.registrationNo).trim() !== '');
  const derivedRegistrationStatus =
    plain.status === 'draft'
      ? 'draft'
      : hasRegNo
      ? 'registered'
      : 'pending';

  return {
    ...plain,
    calendarYear: plain.calendarYear || deriveCalendarYear(plain.dateOfApplication),
    registrationStatus: derivedRegistrationStatus,
    facultyAssociations: facultyDetails,
    validFacultyCount: facultyDetails.filter(f => f.isValid).length,
    hasInvalidEmpIds: invalidEmpIds.length > 0 || Boolean(plain.hasInvalidEmpIds),
    invalidEmpIds: invalidEmpIds.length > 0 ? invalidEmpIds : (Array.isArray(plain.invalidEmpIds) ? plain.invalidEmpIds : []),
    departments: Array.from(validDepartmentsSet),
    currentDepartments: Array.from(currentDepartmentsSet),
    originalDepartments: Array.from(originalDepartmentsSet)
  };
}

/**
 * Checks whether an enriched copyright matches any of the requested department filter names.
 * Only checks VALID faculty associations (unrecognized EmpIds never attribute to any department).
 * Guaranteed to match at the record level so multi-dept shared copyrights appear only once.
 */
function matchesDepartmentFilter(enrichedCopyright, selectedDepartments = []) {
  if (!Array.isArray(selectedDepartments) || selectedDepartments.length === 0) return true;
  const targetKeys = selectedDepartments
    .map(d => normalizeDeptKey(d))
    .filter(Boolean);
  if (targetKeys.length === 0) return true;

  const validAssocs = (enrichedCopyright.facultyAssociations || []).filter(f => f.isValid);
  return validAssocs.some(f => {
    const curKey = normalizeDeptKey(f.currentDepartment);
    const origKey = normalizeDeptKey(f.originalDepartment);
    return targetKeys.some(tk => tk === curKey || tk === origKey);
  });
}

/**
 * Computes all 4 approved Copyright dashboard metrics & supplementary counts
 * strictly on distinct deduplicated copyright records.
 */
function computeCopyrightMetrics(distinctEnrichedCopyrights = []) {
  let totalCopyrights = distinctEnrichedCopyrights.length;
  let applicationsFiled = 0;
  let registeredCopyrights = 0;
  let pendingRegistration = 0;
  let draftCount = 0;
  let validFacultyAssociationsCount = 0;
  let recordsWithInvalidEmpIds = 0;
  let withProofCount = 0;
  let missingProofCount = 0;
  const departmentBreakdown = {};
  const yearBreakdown = {};

  for (const c of distinctEnrichedCopyrights) {
    const isDraft = c.status === 'draft';
    const hasReg = Boolean(c.registrationNo && String(c.registrationNo).trim() !== '');

    if (isDraft) {
      draftCount++;
    } else {
      applicationsFiled++;
      if (hasReg) {
        registeredCopyrights++;
      } else {
        pendingRegistration++;
      }
    }

    if (c.hasInvalidEmpIds) {
      recordsWithInvalidEmpIds++;
    }

    const validAssocs = (c.facultyAssociations || []).filter(f => f.isValid);
    validFacultyAssociationsCount += validAssocs.length;

    // Distinct department attribution: count copyright ONCE per distinct associated valid current department
    const seenDeptsForThisRecord = new Set();
    validAssocs.forEach(f => {
      const deptLabel = f.currentDepartment || f.originalDepartment;
      if (deptLabel && !seenDeptsForThisRecord.has(normalizeDeptKey(deptLabel))) {
        seenDeptsForThisRecord.add(normalizeDeptKey(deptLabel));
        departmentBreakdown[deptLabel] = (departmentBreakdown[deptLabel] || 0) + 1;
      }
    });

    const yr = String(c.calendarYear || deriveCalendarYear(c.dateOfApplication) || 'Unknown');
    yearBreakdown[yr] = (yearBreakdown[yr] || 0) + 1;

    if (c.proofUrl && String(c.proofUrl).trim() !== '') {
      withProofCount++;
    } else {
      missingProofCount++;
    }
  }

  return {
    totalCopyrights,
    applicationsFiled,
    registeredCopyrights,
    pendingRegistration,
    draftCount,
    validFacultyAssociationsCount,
    recordsWithInvalidEmpIds,
    withProofCount,
    missingProofCount,
    departmentBreakdown,
    yearBreakdown
  };
}

/**
 * Validates optional Google Drive Proof URL (or accepts local/internal proof URL cleanly if edited).
 */
function validateProofUrlInput(rawProof) {
  if (rawProof === null || rawProof === undefined || String(rawProof).trim() === '') {
    return { provided: false, valid: true, url: null, fileId: null };
  }
  const trimmed = String(rawProof).trim();
  if (/^\/api\/copyrights\/proofs\/file\//.test(trimmed) || /^https?:\/\/[^/]+\/api\/copyrights\/proofs\/file\//.test(trimmed)) {
    return { provided: true, valid: true, url: trimmed, fileId: null, isInternal: true };
  }
  const check = googleDriveService.validateDriveUrl(trimmed);
  if (!check.valid) {
    return { provided: true, valid: false, error: check.error || 'Invalid Google Drive URL', url: trimmed };
  }
  return { provided: true, valid: true, url: check.sanitizedUrl, fileId: check.fileId };
}

module.exports = {
  normalizeDeptKey,
  normalizeEmpIdKey,
  parseAndNormalizeEmpIds,
  sanitizeDateNoShift,
  isBlankDateValue,
  deriveCalendarYear,
  normalizeDuplicateSignature,
  resolveSingleEmpIdRecords,
  resolveFacultyAssociationsForEmpIds,
  enrichCopyrightRecord,
  matchesDepartmentFilter,
  computeCopyrightMetrics,
  validateProofUrlInput
};

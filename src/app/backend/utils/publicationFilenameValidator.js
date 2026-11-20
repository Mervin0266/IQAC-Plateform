'use strict';

const MODULE_ALLOWED_EXTENSIONS = {
  publications: ['xlsx', 'xls', 'csv'],
  citations: ['xlsx', 'xls', 'csv'],
};

const RESERVED_NON_ID_TOKENS = new Set([
  'publication',
  'publications',
  'citation',
  'citations',
  'overview',
  'scopus',
  'wos',
  'template',
  'data',
  'export',
  'file',
  'iqac',
]);

/**
 * Validates standardized IQAC faculty-wise bulk-upload filenames:
 *   - Publications: <EmpID>_<Faculty_Name>_PUBLICATION.<xlsx|xls|csv>
 *     (Supports case-insensitive: publication, publications, PUBLICATION, etc.)
 *
 * Suffix check:
 *   - If someone uploads an obsolete _CITATIONS / _CITATION file, returns an explicit
 *     rejection message that manual citation upload is no longer supported and citation
 *     details are retrieved automatically from Scopus.
 *
 * Returns structured metadata and a deterministic file-level error when invalid.
 */
function validateBulkFilename(filename, expectedModule = 'publications') {
  const allowedExts = MODULE_ALLOWED_EXTENSIONS[expectedModule] || MODULE_ALLOWED_EXTENSIONS.publications;
  const exampleName = '12345_Suresh_Kishore_PUBLICATION.xlsx';

  const makeInvalid = (reasonCode, error, extra = {}) => ({
    valid: false,
    employeeId: extra.employeeId ?? null,
    facultyNameFromFile: extra.facultyNameFromFile ?? null,
    moduleFound: extra.moduleFound ?? null,
    expectedModule,
    extension: extra.extension ?? null,
    reasonCode,
    error,
  });

  if (!filename || typeof filename !== 'string') {
    return makeInvalid(
      'missing_filename',
      `Filename is missing. Expected: EMPID_FACULTY_NAME_PUBLICATION.xlsx (e.g., ${exampleName}).`
    );
  }

  // Strip directory path if uploaded via webkitdirectory / folder selection
  const baseFilename = filename.split(/[\\/]/).pop().trim();
  if (!baseFilename || baseFilename.startsWith('~$') || baseFilename.startsWith('.')) {
    return makeInvalid('hidden_or_temp_file', `Skipped temporary or hidden file "${baseFilename || filename}".`);
  }

  const lastDotIdx = baseFilename.lastIndexOf('.');
  if (lastDotIdx <= 0 || lastDotIdx === baseFilename.length - 1) {
    return makeInvalid(
      'invalid_extension',
      `Missing file extension in "${baseFilename}". Allowed extensions: ${allowedExts.map(e => `.${e}`).join(', ')}.`
    );
  }

  const extension = baseFilename.slice(lastDotIdx + 1).toLowerCase();
  const baseWithoutExt = baseFilename.slice(0, lastDotIdx).trim();

  // Validate extension (must be .xlsx, .xls, or .csv)
  if (!allowedExts.includes(extension)) {
    return makeInvalid(
      'invalid_extension',
      `Unsupported extension ".${extension}" in "${baseFilename}". Allowed for Publications: ${allowedExts.map(e => `.${e}`).join(', ')}.`,
      { extension }
    );
  }

  // Check trailing module segment: ..._<Module>
  const lastUnderscoreIdx = baseWithoutExt.lastIndexOf('_');
  if (lastUnderscoreIdx === -1) {
    return makeInvalid(
      'missing_module_identifier',
      `Invalid filename "${baseFilename}". Expected format: EMPID_FACULTY_NAME_${expectedModule === 'citations' ? 'CITATIONS' : 'PUBLICATION'}.${extension} (e.g., ${exampleName}).`,
      { extension }
    );
  }

  const trailingToken = baseWithoutExt.slice(lastUnderscoreIdx + 1).trim();
  const trailingLower = trailingToken.toLowerCase();
  const remainderBeforeModule = baseWithoutExt.slice(0, lastUnderscoreIdx).trim();

  // Validate module suffix based on expectedModule
  if (expectedModule === 'citations') {
    if (trailingLower !== 'citations' && trailingLower !== 'citation') {
      return makeInvalid(
        'wrong_module',
        `File "${baseFilename}" is not a citation file. Expected filename ending with "_CITATIONS" (e.g., 12345_Faculty_Name_CITATIONS.${extension}).`,
        { extension, moduleFound: trailingLower }
      );
    }
  } else {
    // Expected publications
    if (trailingLower === 'citations' || trailingLower === 'citation') {
      return makeInvalid(
        'wrong_module',
        `File "${baseFilename}" appears to be a citation file. Please upload it via the Citation Upload section.`,
        { extension, moduleFound: trailingLower }
      );
    }
    if (trailingLower !== 'publication' && trailingLower !== 'publications') {
      return makeInvalid(
        'missing_module_identifier',
        `Missing required module identifier "_PUBLICATION" in "${baseFilename}". Expected: EMPID_FACULTY_NAME_PUBLICATION.${extension} (e.g., ${exampleName}).`,
        { extension, moduleFound: trailingLower || null }
      );
    }
  }

  // Parse <EmpID> from the first segment before the first underscore in remainderBeforeModule
  if (!remainderBeforeModule) {
    return makeInvalid(
      'missing_employee_id',
      `Employee ID and faculty name are missing in "${baseFilename}". Expected: EMPID_FACULTY_NAME_PUBLICATION.xlsx (e.g., ${exampleName}).`,
      { extension, moduleFound: trailingLower }
    );
  }

  let rawEmpId = '';
  let rawFacultySegment = '';

  // Support department-prefixed ID like F_5432_John_Doe or CU-991_Dr_Smith
  const prefixedWithUnderscoreMatch = remainderBeforeModule.match(/^([A-Za-z]{1,4}_\d+)_(.+)$/);
  if (prefixedWithUnderscoreMatch) {
    rawEmpId = prefixedWithUnderscoreMatch[1].trim();
    rawFacultySegment = prefixedWithUnderscoreMatch[2].trim();
  } else {
    const firstUnderscoreIdx = remainderBeforeModule.indexOf('_');
    if (firstUnderscoreIdx === -1) {
      // Only a single token exists before _PUBLICATION
      if (/\d/.test(remainderBeforeModule) && /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(remainderBeforeModule)) {
        return makeInvalid(
          'missing_faculty_name',
          `Faculty name is missing in "${baseFilename}". Expected: EMPID_FACULTY_NAME_PUBLICATION.xlsx (e.g., ${exampleName}).`,
          { extension, employeeId: remainderBeforeModule, moduleFound: trailingLower }
        );
      }
      return makeInvalid(
        'missing_employee_id',
        `Employee ID is missing in "${baseFilename}". Filename must begin with a valid Employee ID (e.g., ${exampleName}).`,
        { extension, moduleFound: trailingLower }
      );
    }

    rawEmpId = remainderBeforeModule.slice(0, firstUnderscoreIdx).trim();
    rawFacultySegment = remainderBeforeModule.slice(firstUnderscoreIdx + 1).trim();
  }

  const isValidEmpIdToken = (token) => {
    if (!token) return false;
    if (RESERVED_NON_ID_TOKENS.has(token.toLowerCase())) return false;
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(token)) return false;
    if (token.endsWith('-') || token.endsWith('_')) return false;
    // Employee IDs contain at least one digit (e.g. 12345, 3489, 00123, EMP001, CU-991)
    return /\d/.test(token);
  };

  if (!isValidEmpIdToken(rawEmpId)) {
    return makeInvalid(
      'missing_employee_id',
      `Employee ID is missing or invalid in "${baseFilename}". Filename must start with EmpID (e.g., ${exampleName}).`,
      { extension, moduleFound: trailingLower }
    );
  }

  const normalizedFacultyName = rawFacultySegment
    .replace(/_+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalizedFacultyName || !/[A-Za-z]/.test(normalizedFacultyName)) {
    return makeInvalid(
      'missing_faculty_name',
      `Faculty name is missing in "${baseFilename}". Expected: EMPID_FACULTY_NAME_PUBLICATION.xlsx (e.g., ${exampleName}).`,
      { extension, employeeId: rawEmpId, moduleFound: trailingLower }
    );
  }

  return {
    valid: true,
    employeeId: String(rawEmpId).trim(), // Preserves leading zeros as string
    facultyNameFromFile: normalizedFacultyName,
    moduleFound: trailingLower,
    expectedModule,
    extension,
    reasonCode: null,
    error: null,
  };
}

module.exports = {
  MODULE_ALLOWED_EXTENSIONS,
  validateBulkFilename,
};

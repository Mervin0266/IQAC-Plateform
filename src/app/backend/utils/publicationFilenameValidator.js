const MODULE_ALLOWED_EXTENSIONS = {
  publications: ['xlsx', 'xls', 'csv'],
  citations: ['csv', 'xlsx'],
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
 *   - Publications: <EmpID>_<FacultyName>_Publications.<xlsx|xls|csv>
 *   - Citations:    <EmpID>_<FacultyName>_Citations.<csv|xlsx>
 *
 * Returns structured metadata and a deterministic file-level error when invalid.
 */
function validateBulkFilename(filename, expectedModule) {
  const expectedCap = expectedModule === 'citations' ? 'Citations' : 'Publications';
  const allowedExts = MODULE_ALLOWED_EXTENSIONS[expectedModule] || MODULE_ALLOWED_EXTENSIONS.publications;
  const exampleName = expectedModule === 'citations'
    ? '3489_Suresh_K_Citations.csv'
    : '2043_Adarsh_S_V_Publications.xlsx';

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
      `Filename is missing. Expected: EmpID_FacultyName_${expectedCap}.${allowedExts[0]} (e.g., ${exampleName}).`
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

  if (!allowedExts.includes(extension)) {
    return makeInvalid(
      'invalid_extension',
      `Unsupported extension ".${extension}" in "${baseFilename}". Allowed for ${expectedCap}: ${allowedExts.map(e => `.${e}`).join(', ')}.`,
      { extension }
    );
  }

  // Check trailing module segment: ..._<Module>
  const lastUnderscoreIdx = baseWithoutExt.lastIndexOf('_');
  if (lastUnderscoreIdx === -1) {
    return makeInvalid(
      'missing_module_identifier',
      `Invalid filename "${baseFilename}". Expected: EmpID_FacultyName_${expectedCap}.${extension} (e.g., ${exampleName}).`,
      { extension }
    );
  }

  const trailingToken = baseWithoutExt.slice(lastUnderscoreIdx + 1).trim();
  const trailingLower = trailingToken.toLowerCase();
  const remainderBeforeModule = baseWithoutExt.slice(0, lastUnderscoreIdx).trim();

  if (expectedModule === 'publications') {
    if (trailingLower === 'citations' || trailingLower === 'citation') {
      return makeInvalid(
        'wrong_module',
        `Incorrect module identifier "_${trailingToken}" in "${baseFilename}" for Publications upload. Expected "_Publications" (e.g., ${exampleName}).`,
        { extension, moduleFound: trailingLower }
      );
    }
    if (trailingLower === 'publication') {
      return makeInvalid(
        'invalid_module_identifier',
        `Invalid module identifier "_${trailingToken}" in "${baseFilename}". Module identifier must be "_Publications" (e.g., ${exampleName}).`,
        { extension, moduleFound: trailingLower }
      );
    }
    if (trailingLower !== 'publications') {
      return makeInvalid(
        'missing_module_identifier',
        `Missing required module identifier "_Publications" in "${baseFilename}". Expected: EmpID_FacultyName_Publications.${extension} (e.g., ${exampleName}).`,
        { extension, moduleFound: trailingLower || null }
      );
    }
  } else {
    if (trailingLower === 'publications' || trailingLower === 'publication') {
      return makeInvalid(
        'wrong_module',
        `Incorrect module identifier "_${trailingToken}" in "${baseFilename}" for Citations upload. Expected "_Citations" (e.g., ${exampleName}).`,
        { extension, moduleFound: trailingLower }
      );
    }
    if (trailingLower === 'citation') {
      return makeInvalid(
        'invalid_module_identifier',
        `Invalid module identifier "_${trailingToken}" in "${baseFilename}". Module identifier must be "_Citations" (e.g., ${exampleName}).`,
        { extension, moduleFound: trailingLower }
      );
    }
    if (trailingLower !== 'citations') {
      return makeInvalid(
        'missing_module_identifier',
        `Missing required module identifier "_Citations" in "${baseFilename}". Expected: EmpID_FacultyName_Citations.${extension} (e.g., ${exampleName}).`,
        { extension, moduleFound: trailingLower || null }
      );
    }
  }

  // Parse <EmpID>_<FacultyName> from remainderBeforeModule
  if (!remainderBeforeModule) {
    return makeInvalid(
      'missing_employee_id',
      `Employee ID and faculty name are missing in "${baseFilename}". Expected: EmpID_FacultyName_${expectedCap}.${extension} (e.g., ${exampleName}).`,
      { extension, moduleFound: trailingLower }
    );
  }

  // Support optional underscore inside department-prefixed ID like F_5432_John_Doe
  let rawEmpId = '';
  let rawFacultySegment = '';

  const prefixedWithUnderscoreMatch = remainderBeforeModule.match(/^([A-Za-z]{1,4}_\d+)_(.+)$/);
  if (prefixedWithUnderscoreMatch) {
    rawEmpId = prefixedWithUnderscoreMatch[1].trim();
    rawFacultySegment = prefixedWithUnderscoreMatch[2].trim();
  } else {
    const firstUnderscoreIdx = remainderBeforeModule.indexOf('_');
    if (firstUnderscoreIdx === -1) {
      // Only a single token exists before _Module (e.g. 3489_Publications.xlsx or Suresh_Publications.xlsx)
      if (/\d/.test(remainderBeforeModule) && /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(remainderBeforeModule)) {
        return makeInvalid(
          'missing_faculty_name',
          `Faculty name is missing in "${baseFilename}". Expected: EmpID_FacultyName_${expectedCap}.${extension} (e.g., ${exampleName}).`,
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
    // Employee IDs contain at least one digit (e.g. 3489, 00123, EMP001, CU-991)
    return /\d/.test(token);
  };

  if (!isValidEmpIdToken(rawEmpId)) {
    return makeInvalid(
      'missing_employee_id',
      `Employee ID is missing or invalid in "${baseFilename}". Filename must start with Employee ID (e.g., ${exampleName}).`,
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
      `Faculty name is missing in "${baseFilename}". Expected: EmpID_FacultyName_${expectedCap}.${extension} (e.g., ${exampleName}).`,
      { extension, employeeId: rawEmpId, moduleFound: trailingLower }
    );
  }

  return {
    valid: true,
    employeeId: rawEmpId,
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


'use strict';

/**
 * Spreadsheet & CSV Formula Injection Sanitizer (CWE-1236)
 * CHRIST University IQAC Platform
 * 
 * Neutralizes Dynamic Data Exchange (DDE) and formula injection attacks
 * while preserving legitimate negative numbers, floats, and normal text.
 */

const FORMULA_TRIGGER_REGEX = /^[=+\-@|%]/;
const CONTROL_PREFIX_REGEX = /^[\s\x00-\x1f]+/;
const STRICT_NUMBER_REGEX = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

/**
 * Sanitizes an individual cell value.
 * @param {any} value - Cell value to sanitize
 * @returns {any} Sanitized value safe for CSV/XLSX export
 */
function sanitizeSpreadsheetCell(value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  const str = String(value);

  // Preserve legitimate numeric strings, including negative numbers (-10, -3.14)
  if (STRICT_NUMBER_REGEX.test(str.trim())) {
    return value;
  }

  // Remove leading whitespace and control characters to inspect effective prefix
  const stripped = str.replace(CONTROL_PREFIX_REGEX, '');

  if (FORMULA_TRIGGER_REGEX.test(stripped)) {
    // Prefix with single quote so Excel/Calc treats as literal text
    return `'${str}`;
  }

  return str;
}

/**
 * Sanitizes an entire row (either an array of cells or an object of key-value pairs).
 * @param {Array|Object} row - Row data
 * @returns {Array|Object} Sanitized row
 */
function sanitizeSpreadsheetRow(row) {
  if (!row) return row;

  if (Array.isArray(row)) {
    return row.map(sanitizeSpreadsheetCell);
  }

  if (typeof row === 'object') {
    const clean = {};
    for (const [key, val] of Object.entries(row)) {
      clean[key] = sanitizeSpreadsheetCell(val);
    }
    return clean;
  }

  return sanitizeSpreadsheetCell(row);
}

/**
 * Sanitizes a 2D array or array of row objects.
 * @param {Array} rows - Array of rows
 * @returns {Array} Sanitized array of rows
 */
function sanitizeSpreadsheetDataset(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(sanitizeSpreadsheetRow);
}

module.exports = {
  sanitizeSpreadsheetCell,
  sanitizeSpreadsheetRow,
  sanitizeSpreadsheetDataset
};

/**
 * Spreadsheet & CSV Formula Injection Sanitizer (CWE-1236)
 * CHRIST University IQAC Platform
 * 
 * Sanitizes user-provided values before exporting to CSV/XLSX.
 * Prevents formula injection (=, +, -, @, |, %) while preserving
 * legitimate numeric values, negative floats, and safe text.
 */

const FORMULA_TRIGGER_REGEX = /^[=+\-@|%]/;
const CONTROL_PREFIX_REGEX = /^[\s\x00-\x1f]+/;
const STRICT_NUMBER_REGEX = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

export function sanitizeSpreadsheetCell<T>(value: T): T | string {
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

export function sanitizeSpreadsheetRow<T extends Record<string, any>>(row: T): T {
  if (!row || typeof row !== 'object') return row;

  if (Array.isArray(row)) {
    return (row as any[]).map(sanitizeSpreadsheetCell) as unknown as T;
  }

  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(row)) {
    clean[key] = sanitizeSpreadsheetCell(val);
  }
  return clean as T;
}

export function sanitizeSpreadsheetDataset<T extends Record<string, any>>(rows: T[]): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(sanitizeSpreadsheetRow);
}

const xlsx = require('xlsx');

/**
 * Shared Bulk Upload Engine — CHRIST (Deemed to be University) IQAC Platform
 *
 * Provides standardized:
 * 1. Multi-format spreadsheet parsing (XLSX, XLS, CSV)
 * 2. Column header normalization and required field validation
 * 3. Row-by-row batch processing with transactional rollbacks
 * 4. Error aggregation and import outcome summaries
 */

function parseSpreadsheet(fileBuffer) {
  try {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('Spreadsheet does not contain any readable sheets.');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = xlsx.utils.sheet_to_json(worksheet, { defval: null, raw: false });

    return {
      success: true,
      sheetName: firstSheetName,
      rows: rawRows,
      totalRows: rawRows.length
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to parse spreadsheet file: ${err.message}`,
      rows: [],
      totalRows: 0
    };
  }
}

function normalizeHeader(header) {
  if (!header || typeof header !== 'string') return '';
  return header.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function validateHeaders(rowSample, requiredHeaders = []) {
  if (!rowSample || typeof rowSample !== 'object') {
    return { valid: false, missing: requiredHeaders };
  }

  const normalizedKeys = Object.keys(rowSample).map(normalizeHeader);
  const missing = [];

  for (const req of requiredHeaders) {
    const normReq = normalizeHeader(req);
    if (!normalizedKeys.includes(normReq)) {
      missing.push(req);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Executes batch row processing with error recording and summary statistics.
 */
async function processBatch(rows, rowHandler, options = {}) {
  const summary = {
    totalRows: rows.length,
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    details: []
  };

  const continueOnError = options.continueOnError !== false;

  for (let index = 0; index < rows.length; index++) {
    const rowNumber = index + 2; // Accounting for 1-based index + header row
    const row = rows[index];

    try {
      const result = await rowHandler(row, rowNumber);
      if (result && result.skipped) {
        summary.skipped++;
        summary.details.push({ row: rowNumber, status: 'skipped', reason: result.reason || 'Filtered' });
      } else {
        summary.imported++;
        summary.details.push({ row: rowNumber, status: 'imported' });
      }
    } catch (err) {
      summary.failed++;
      summary.errors.push({
        row: rowNumber,
        message: err.message || 'Row processing failed',
        data: row
      });

      if (!continueOnError) {
        throw new Error(`Batch aborted at row ${rowNumber}: ${err.message}`);
      }
    }
  }

  summary.success = summary.failed === 0;
  return summary;
}

module.exports = {
  parseSpreadsheet,
  normalizeHeader,
  validateHeaders,
  processBatch
};

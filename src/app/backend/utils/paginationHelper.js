'use strict';

/**
 * Pagination & Resource Protection Helper
 * CHRIST University IQAC Platform
 * 
 * Enforces strict bounded server-side pagination:
 * - Default page size: 50
 * - Maximum page size: 100 (prevents unbounded memory consumption / DoS)
 * - Safe export limit: 10,000 (when req.query.export === 'true' for authorized export operations)
 * - Strict integer sanitization: rejects malformed, negative, NaN or overflow values safely.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_EXPORT_LIMIT = 500000; // Raised from 10,000 to prevent silent truncation on large datasets (10,000+ records)

/**
 * Parse and sanitize integer query parameter safely.
 * Returns defaultValue if value is invalid, negative, NaN, or non-finite.
 */
function safeParseInt(val, defaultValue, min = 1, max = Infinity) {
  if (val === undefined || val === null || val === '') {
    return defaultValue;
  }
  
  // Guard against non-string/non-number types or scientific notation exploits
  const str = String(val).trim();
  if (!/^-?\d+$/.test(str)) {
    return defaultValue;
  }

  const parsed = parseInt(str, 10);
  if (!Number.isFinite(parsed) || isNaN(parsed) || parsed < min) {
    return defaultValue;
  }

  if (parsed > max) return max;
  return parsed;
}

/**
 * Parses request pagination parameters.
 * @param {Object} query - Express req.query
 * @param {Object} options - Customization options
 * @returns {Object} { page, limit, offset, isExport }
 */
function parsePagination(query = {}, options = {}) {
  const defaultPage = options.defaultPage || DEFAULT_PAGE;
  const defaultLimit = options.defaultLimit || DEFAULT_LIMIT;
  const maxLimit = options.maxLimit || MAX_LIMIT;
  const exportLimit = options.exportLimit || MAX_EXPORT_LIMIT;

  const isExport = String(query.export).toLowerCase() === 'true' ||
                   String(query.all).toLowerCase() === 'true' ||
                   query.format === 'csv' ||
                   query.format === 'xlsx';

  if (isExport) {
    const page = 1;
    // Allow caller to specify explicit limit up to MAX_EXPORT_LIMIT (500,000), default to full export limit
    const limit = query.limit ? safeParseInt(query.limit, exportLimit, 1, MAX_EXPORT_LIMIT) : exportLimit;
    return {
      page,
      limit,
      offset: 0,
      isExport: true
    };
  }

  const page = safeParseInt(query.page, defaultPage, 1, 1000000);
  const limit = safeParseInt(query.limit, defaultLimit, 1, maxLimit);
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
    isExport: false
  };
}

/**
 * Constructs standard pagination response object.
 * @param {Object} params - { count, rows, page, limit }
 * @returns {Object} JSON response payload
 */
function formatPaginationResponse({ count, rows, page, limit }) {
  const total = typeof count === 'number' ? count : (Array.isArray(count) ? count.length : rows.length);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const isComplete = rows.length >= total;

  return {
    success: true,
    count: rows.length,
    total,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      isComplete,
      isTruncated: !isComplete
    },
    data: rows
  };
}

const { sanitizeSpreadsheetCell } = require('./spreadsheetSanitizer');

/**
 * Escapes a cell value for RFC-4180 CSV compliance and neutralizes formula injection.
 */
function escapeCsvCell(val) {
  if (val === null || val === undefined) return '';
  const sanitized = sanitizeSpreadsheetCell(val);
  const str = String(sanitized);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Streams or batch-processes large database exports without memory exhaustion.
 * 
 * Guarantees:
 * - Resource-bounded memory usage: queries data in batches with lean raw:true projections.
 * - Non-truncating: exports every authorized record up to safety limit (default 1,000,000).
 * - Preservation of authorization scoping and filtering via caller-provided `where`.
 * - Preservation of stable ordering via caller-provided `order`.
 * - Field-level confidentiality via caller-provided `transformRow` callback.
 * - Neutralization of spreadsheet formula injection (CWE-1236).
 * - Clear metadata: flags `isComplete` vs `isTruncated`.
 * - Graceful client abort handling: frees database resources if connection closes early.
 */
async function streamBatchedExport(res, {
  model,
  where = {},
  attributes = null,
  order = [['id', 'ASC']],
  batchSize = 1000,
  maxRecords = 1000000,
  transformRow = (row) => row,
  format = 'json',
  filename = 'export',
  csvHeaders = null,
  includeStatusComment = false // Default to false: RFC-4180 strict CSV (no extra metadata rows)
}) {
  const isCsv = format === 'csv' || format === 'xlsx';
  const totalCount = await model.count({ where });

  let clientAborted = false;
  res.on('close', () => {
    if (!res.writableEnded) {
      clientAborted = true;
    }
  });

  if (isCsv) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    if (typeof res.setHeader === 'function') {
      res.setHeader('Trailer', 'X-Export-Status, X-Export-Records, X-Export-Total, X-Export-Complete');
    }

    // UTF-8 Byte Order Mark for Microsoft Excel compatibility
    res.write('\uFEFF');

    let headersWritten = false;
    let offset = 0;
    let totalProcessed = 0;
    let streamFailed = false;

    try {
      while (offset < totalCount && totalProcessed < maxRecords && !clientAborted) {
        const currentBatchLimit = Math.min(batchSize, maxRecords - totalProcessed);
        const rows = await model.findAll({
          where,
          attributes,
          order,
          limit: currentBatchLimit,
          offset,
          raw: true
        });

        if (!rows || rows.length === 0) break;

        for (const rawRow of rows) {
          if (clientAborted) break;
          const row = transformRow(rawRow);
          if (!headersWritten) {
            const keys = csvHeaders || Object.keys(row);
            res.write(keys.map(escapeCsvCell).join(',') + '\r\n');
            headersWritten = true;
          }

          const values = csvHeaders ? csvHeaders.map(h => row[h]) : Object.values(row);
          res.write(values.map(escapeCsvCell).join(',') + '\r\n');
          totalProcessed++;
        }

        offset += rows.length;
      }
    } catch (batchErr) {
      streamFailed = true;
      console.error('✗ streamBatchedExport CSV batch query error:', batchErr.message);
      if (typeof res.addTrailers === 'function' && !res.destroyed && !res.writableEnded) {
        res.addTrailers({
          'X-Export-Status': 'FAILED_MID_STREAM',
          'X-Export-Records': String(totalProcessed),
          'X-Export-Total': String(totalCount),
          'X-Export-Complete': 'false'
        });
      }
      if (includeStatusComment && !res.destroyed && !res.writableEnded) {
        res.write(`\r\n# EXPORT STATUS: FAILED_MID_STREAM (${escapeCsvCell(batchErr.message)})\r\n`);
      }
      // In CSV mode, destroy stream to signal transfer error to HTTP client rather than presenting truncated file as clean
      if (typeof res.destroy === 'function' && !res.destroyed) {
        res.destroy(batchErr);
        return;
      }
    }

    if (!headersWritten && csvHeaders && !streamFailed && !res.destroyed && !res.writableEnded) {
      res.write(csvHeaders.map(escapeCsvCell).join(',') + '\r\n');
    }

    if (!streamFailed && !res.destroyed && !res.writableEnded) {
      const isComplete = totalProcessed >= totalCount && !clientAborted;
      const statusMsg = isComplete ? 'COMPLETED' : (clientAborted ? 'ABORTED' : 'TRUNCATED');
      if (typeof res.addTrailers === 'function') {
        res.addTrailers({
          'X-Export-Status': statusMsg,
          'X-Export-Records': String(totalProcessed),
          'X-Export-Total': String(totalCount),
          'X-Export-Complete': isComplete ? 'true' : 'false'
        });
      }
      if (includeStatusComment) {
        res.write(`\r\n# EXPORT STATUS: ${statusMsg} (Records: ${totalProcessed} / ${totalCount})\r\n`);
      }
    }

    if (!res.destroyed && !res.writableEnded) {
      res.end();
    }
    return;
  }

  // JSON Streaming Output (matches formatPaginationResponse structure)
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  if (typeof res.setHeader === 'function') {
    res.setHeader('Trailer', 'X-Export-Status, X-Export-Records, X-Export-Total, X-Export-Complete');
  }

  res.write(`{"success":true,"total":${totalCount},"data":[`);

  let offset = 0;
  let totalProcessed = 0;
  let isFirst = true;
  let jsonStreamFailed = false;

  try {
    while (offset < totalCount && totalProcessed < maxRecords && !clientAborted) {
      const currentBatchLimit = Math.min(batchSize, maxRecords - totalProcessed);
      const rows = await model.findAll({
        where,
        attributes,
        order,
        limit: currentBatchLimit,
        offset,
        raw: true
      });

      if (!rows || rows.length === 0) break;

      for (const rawRow of rows) {
        if (clientAborted) break;
        const cleanRow = transformRow(rawRow);
        const sanitized = {};
        for (const [k, v] of Object.entries(cleanRow)) {
          sanitized[k] = sanitizeSpreadsheetCell(v);
        }
        res.write((isFirst ? '' : ',') + JSON.stringify(sanitized));
        isFirst = false;
        totalProcessed++;
      }

      offset += rows.length;
    }
  } catch (jsonErr) {
    jsonStreamFailed = true;
    console.error('✗ streamBatchedExport JSON batch query error:', jsonErr.message);
    if (typeof res.addTrailers === 'function' && !res.destroyed && !res.writableEnded) {
      res.addTrailers({
        'X-Export-Status': 'FAILED_MID_STREAM',
        'X-Export-Records': String(totalProcessed),
        'X-Export-Total': String(totalCount),
        'X-Export-Complete': 'false'
      });
    }
    if (!res.destroyed && !res.writableEnded) {
      res.write(`],"error":"EXPORT_FAILED_MID_STREAM","errorMessage":${JSON.stringify(jsonErr.message)},"isComplete":false,"isTruncated":true}`);
    }
  }

  if (!jsonStreamFailed && !res.destroyed && !res.writableEnded) {
    const isComplete = totalProcessed >= totalCount && !clientAborted;
    const isTruncated = !isComplete;
    if (typeof res.addTrailers === 'function') {
      res.addTrailers({
        'X-Export-Status': isComplete ? 'COMPLETED' : (clientAborted ? 'ABORTED' : 'TRUNCATED'),
        'X-Export-Records': String(totalProcessed),
        'X-Export-Total': String(totalCount),
        'X-Export-Complete': isComplete ? 'true' : 'false'
      });
    }
    res.write(`],"count":${totalProcessed},"pagination":{"page":1,"limit":${maxRecords},"total":${totalCount},"isComplete":${isComplete},"isTruncated":${isTruncated}}}`);
  }
  if (!res.destroyed && !res.writableEnded) {
    res.end();
  }
}

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MAX_EXPORT_LIMIT,
  safeParseInt,
  parsePagination,
  formatPaginationResponse,
  streamBatchedExport,
  escapeCsvCell
};

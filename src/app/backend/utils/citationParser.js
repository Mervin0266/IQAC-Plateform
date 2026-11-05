'use strict';

const XLSX = require('xlsx');
const crypto = require('crypto');

/**
 * Normalizes title string for duplicate & fuzzy matching:
 * - Trims whitespace
 * - Collapses multiple whitespace to single space
 * - Lowercases
 * - Strips common leading/trailing punctuation
 */
function normalizeTitle(title) {
  if (!title) return '';
  return String(title)
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates resilient word-level similarity between two publication titles.
 * Handles minor variations like 'high-efficient' vs 'high-efficiency',
 * hyphenation, punctuation, and extra whitespace.
 * Returns a score between 0.0 and 1.0.
 */
function calculateTitleSimilarity(t1, t2) {
  if (!t1 || !t2) return 0;
  const n1 = normalizeTitle(t1);
  const n2 = normalizeTitle(t2);
  if (!n1 || !n2) return 0;
  if (n1 === n2) return 1.0;

  const words1 = n1.split(/\s+/).filter(Boolean);
  const words2 = n2.split(/\s+/).filter(Boolean);
  if (words1.length === 0 || words2.length === 0) return 0;

  let matches = 0;
  const used2 = new Set();

  for (let i = 0; i < words1.length; i++) {
    const w1 = words1[i];
    for (let j = 0; j < words2.length; j++) {
      if (used2.has(j)) continue;
      const w2 = words2[j];

      // Exact word match
      if (w1 === w2) {
        matches++;
        used2.add(j);
        break;
      }

      // Word stem / prefix match (e.g. 'efficient' vs 'efficiency')
      if (w1.length > 4 && w2.length > 4) {
        const minLen = Math.min(w1.length, w2.length);
        const prefixLen = Math.max(4, Math.floor(minLen * 0.75));
        if (w1.slice(0, prefixLen) === w2.slice(0, prefixLen)) {
          matches++;
          used2.add(j);
          break;
        }
      }
    }
  }

  const maxLen = Math.max(words1.length, words2.length);
  return matches / maxLen;
}

/**
 * Normalizes ISSN string:
 * - Removes hyphens, spaces, and non-alphanumeric chars
 * - Lowercases (e.g. '0974-5572' -> '09745572')
 */
function normalizeIssn(issn) {
  if (!issn) return null;
  const cleaned = String(issn).trim().replace(/[^0-9xX]/g, '').toLowerCase();
  return cleaned || null;
}

/**
 * Extracts 4-digit calendar year
 */
function normalizeYear(year) {
  if (!year) return null;
  const match = String(year).match(/\b(19\d{2}|20\d{2})\b/);
  return match ? match[1] : null;
}

/**
 * Calculates SHA256 checksum of buffer
 */
function calculateChecksum(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Parses raw CSV or Excel buffer into 2D array of rows
 */
function bufferToRows(buffer, filename = '') {
  const isXlsx = /\.xlsx?$/i.test(filename);
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    raw: true,
    cellDates: true
  });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Spreadsheet contains no worksheets.');
  }

  // Find most suitable worksheet if multiple
  let sheetName = workbook.SheetNames[0];
  if (workbook.SheetNames.length > 1) {
    const citationSheet = workbook.SheetNames.find(n => 
      /citation|overview|document|scopus/i.test(n)
    );
    if (citationSheet) {
      sheetName = citationSheet;
    }
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Worksheet '${sheetName}' could not be read.`);
  }

  // Convert to 2D array, preserving blank rows to maintain exact 1-based spreadsheet row indices
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    blankrows: true
  });

  return rows;
}

/**
 * Checks if a given row is a citation period header row.
 * A period header row contains words like 'total', 'subtotal',
 * grouped period expressions (e.g. '<2022', '>2026'), or multiple
 * valid 4-digit calendar years (1900-2099).
 */
function isPeriodHeaderRow(row) {
  if (!Array.isArray(row) || row.length === 0) return false;
  let yearCount = 0;
  let hasSummaryWord = false;
  let hasGrouped = false;

  for (const cell of row) {
    const s = String(cell || '').trim();
    if (!s) continue;
    const lower = s.toLowerCase();
    if (lower === 'total' || lower === 'subtotal' || lower === 'total citations' || lower === 'sub-total' || lower === 'citations total') {
      hasSummaryWord = true;
    } else if (/^[<>≤≥]\s*(19\d{2}|20\d{2})$/.test(s)) {
      hasGrouped = true;
    } else if (/^(19\d{2}|20\d{2})$/.test(s)) {
      yearCount++;
    }
  }

  // A row is definitely a period header row if:
  // 1) It has a summary word ('total'/'subtotal') AND at least one year/grouped period, OR
  // 2) It has grouped periods ('<2022', '>2026'), OR
  // 3) It has 2 or more distinct valid calendar years (e.g. 2022, 2023)
  return (hasSummaryWord && (yearCount > 0 || hasGrouped)) || hasGrouped || (yearCount >= 2);
}

/**
 * Dynamically detects multi-row or single-row header structure,
 * bibliographic columns, and dynamic citation year/period columns.
 */
function detectHeaders(rows) {
  if (!rows || rows.length === 0) {
    throw new Error('Spreadsheet is empty.');
  }

  let headerRowIndex = -1;
  let periodRowIndex = -1;
  let isTwoRowHeader = false;

  // Search up to row 30 for header structure
  const maxScan = Math.min(rows.length, 30);

  for (let r = 0; r < maxScan; r++) {
    const row = rows[r] || [];
    const rowStr = row.map(c => String(c || '').trim().toLowerCase());

    const hasTitle = rowStr.some(c => 
      c === 'document title' || c === 'title' || c.startsWith('document title')
    );

    if (hasTitle) {
      headerRowIndex = r;

      // FIRST: Check if the preceding row (r - 1) is a 2-row period header (Standard Scopus format)
      if (r > 0 && isPeriodHeaderRow(rows[r - 1])) {
        periodRowIndex = r - 1;
        isTwoRowHeader = true;
      }
      // SECOND: Check if the following row (r + 1) is a period header
      else if (r + 1 < rows.length && isPeriodHeaderRow(rows[r + 1])) {
        periodRowIndex = r + 1;
        isTwoRowHeader = true;
      }
      // THIRD: Check if this row itself is a single-row header containing period columns
      else if (isPeriodHeaderRow(rows[r])) {
        periodRowIndex = r;
        isTwoRowHeader = false;
      }
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Could not detect document title column header in spreadsheet.');
  }

  if (periodRowIndex === -1) {
    // If still not found, default to header row itself
    periodRowIndex = headerRowIndex;
    isTwoRowHeader = false;
  }

  const biblioRow = rows[headerRowIndex] || [];
  const periodRow = rows[periodRowIndex] || [];

  // Map bibliographic columns
  let titleCol = -1;
  let pubYearCol = -1;
  let issnCol = -1;
  let journalCol = -1;
  let volumeCol = -1;
  let issueCol = -1;

  for (let c = 0; c < biblioRow.length; c++) {
    const val = String(biblioRow[c] || '').trim().toLowerCase();
    if (titleCol === -1 && (val === 'document title' || val === 'title' || val.startsWith('document title'))) {
      titleCol = c;
    } else if (pubYearCol === -1 && (val === 'publication year' || val === 'pub year' || val === 'year')) {
      pubYearCol = c;
    } else if (issnCol === -1 && (val.startsWith('issn') || val === 'e-issn')) {
      issnCol = c;
    } else if (journalCol === -1 && (val === 'journal title' || val === 'source title' || val === 'journal' || val === 'source')) {
      journalCol = c;
    } else if (volumeCol === -1 && (val === 'volume' || val === 'vol.' || val === 'vol')) {
      volumeCol = c;
    } else if (issueCol === -1 && (val === 'issue' || val === 'issue no.' || val === 'iss')) {
      issueCol = c;
    }
  }

  // Map period and total columns
  let totalCol = -1;
  let subtotalCol = -1;
  const periodCols = [];

  // When isTwoRowHeader is true, period columns MUST be taken exclusively from periodRow.
  // Never fall back to biblioRow where author summary numbers (e.g. 1526, 1528) reside!
  const targetPeriodRow = isTwoRowHeader ? periodRow : biblioRow;

  for (let c = 0; c < targetPeriodRow.length; c++) {
    // Skip bibliographic columns from becoming citation years
    if (c === titleCol || c === pubYearCol || c === issnCol || c === journalCol || c === volumeCol || c === issueCol) {
      continue;
    }

    const cellVal = String(targetPeriodRow[c] || '').trim();
    if (!cellVal) continue;
    const lower = cellVal.toLowerCase();

    if (lower === 'total' || lower === 'total citations' || lower === 'citations total') {
      totalCol = c;
    } else if (lower === 'subtotal' || lower === 'sub-total') {
      subtotalCol = c;
      periodCols.push({ colIndex: c, period: 'Subtotal', periodType: 'subtotal' });
    } else if (/^[<>≤≥]\s*(19\d{2}|20\d{2})$/.test(cellVal)) {
      const normalizedGroup = cellVal.replace(/\s+/g, '');
      periodCols.push({ colIndex: c, period: normalizedGroup, periodType: 'grouped' });
    } else if (/^(19\d{2}|20\d{2})$/.test(cellVal)) {
      periodCols.push({ colIndex: c, period: cellVal, periodType: 'year' });
    }
  }

  // Determine where data rows start
  let dataStartIndex = Math.max(headerRowIndex, periodRowIndex) + 1;

  return {
    isTwoRowHeader,
    headerRowIndex,
    periodRowIndex,
    dataStartIndex,
    titleCol,
    pubYearCol,
    issnCol,
    journalCol,
    volumeCol,
    issueCol,
    totalCol,
    subtotalCol,
    periodCols
  };
}

/**
 * Parses citation records from 2D rows given column mapping
 */
function extractCitationRecords(rows, mapping) {
  const {
    dataStartIndex,
    titleCol,
    pubYearCol,
    issnCol,
    journalCol,
    volumeCol,
    issueCol,
    totalCol,
    periodCols
  } = mapping;

  const records = [];

  for (let r = dataStartIndex; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    // Check if entire row is empty
    const hasAnyContent = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
    if (!hasAnyContent) continue;

    const rawTitle = titleCol >= 0 ? row[titleCol] : '';
    const title = String(rawTitle || '').trim();

    // Check if this row is an author metadata row or summary row accidentally reached
    if (/^h-index\b|^author\b|^scopus\b/i.test(title)) {
      continue;
    }

    const rawPubYear = pubYearCol >= 0 ? row[pubYearCol] : '';
    const publicationYear = normalizeYear(rawPubYear);

    const rawIssn = issnCol >= 0 ? row[issnCol] : '';
    const issn = String(rawIssn || '').trim() || null;

    const rawJournal = journalCol >= 0 ? row[journalCol] : '';
    const journalTitle = String(rawJournal || '').trim() || null;

    const rawVol = volumeCol >= 0 ? row[volumeCol] : '';
    const volume = String(rawVol || '').trim() || null;

    const rawIss = issueCol >= 0 ? row[issueCol] : '';
    const issue = String(rawIss || '').trim() || null;

    // Parse Reported Total
    let reportedTotal = null;
    if (totalCol >= 0) {
      const rawTot = row[totalCol];
      if (rawTot !== null && rawTot !== undefined && String(rawTot).trim() !== '') {
        const num = parseInt(String(rawTot).trim(), 10);
        if (!isNaN(num) && num >= 0) {
          reportedTotal = num;
        }
      }
    }

    // Parse Dynamic Period Breakdown
    const yearlyDetails = [];
    let knownSum = 0;
    let calendarYearsSum = 0;
    let subtotalValue = null;
    let allAnnualKnown = true;
    let anyAnnualReported = false;

    for (const p of periodCols) {
      const cellVal = row[p.colIndex];
      let count = null;
      let status = 'unknown';

      if (cellVal !== null && cellVal !== undefined && String(cellVal).trim() !== '') {
        const strVal = String(cellVal).trim();
        if (strVal === '0' || cellVal === 0) {
          count = 0;
          status = 'known';
          anyAnnualReported = true;
        } else {
          const num = parseInt(strVal, 10);
          if (!isNaN(num) && num >= 0) {
            count = num;
            status = 'known';
            anyAnnualReported = true;
          }
        }
      } else {
        allAnnualKnown = false;
      }

      if (p.periodType === 'subtotal') {
        subtotalValue = count;
      }

      yearlyDetails.push({
        period: p.period,
        periodType: p.periodType,
        citationCount: count,
        status
      });

      // Include years and grouped periods (e.g. <2022, >2026) in the calculated sum,
      // but strictly EXCLUDE 'Subtotal' and 'Total' to prevent double counting!
      if (p.periodType !== 'subtotal' && p.periodType !== 'total' && count !== null) {
        knownSum += count;
        if (p.periodType === 'year') {
          calendarYearsSum += count;
        }
      }
    }

    // Reconciliation logic
    let reconciliationStatus = 'reconciled';
    const validationIssues = [];

    if (!title) {
      validationIssues.push('Missing Document Title.');
    }

    // Check subtotal consistency if present
    if (subtotalValue !== null && allAnnualKnown && calendarYearsSum !== subtotalValue) {
      validationIssues.push(
        `Citation subtotal mismatch: reported Subtotal is ${subtotalValue}, but sum of calendar years is ${calendarYearsSum}.`
      );
    }

    if (reportedTotal !== null) {
      if (allAnnualKnown && yearlyDetails.length > 0) {
        if (knownSum === reportedTotal) {
          reconciliationStatus = 'reconciled';
        } else {
          reconciliationStatus = 'unreconciled';
          validationIssues.push(
            `Citation total mismatch: reported Total is ${reportedTotal}, but sum of yearly counts is ${knownSum}.`
          );
        }
      } else {
        // Some period cells are blank/unknown
        if (knownSum === reportedTotal) {
          reconciliationStatus = 'reconciled';
        } else {
          reconciliationStatus = 'incomplete';
        }
      }
    } else if (subtotalValue !== null) {
      // No explicit Total column value reported, but Subtotal is present
      reportedTotal = subtotalValue;
      if (allAnnualKnown && yearlyDetails.length > 0) {
        if (calendarYearsSum === reportedTotal) {
          reconciliationStatus = 'reconciled';
        } else {
          reconciliationStatus = 'unreconciled';
          validationIssues.push(
            `Citation subtotal mismatch: reported Subtotal is ${reportedTotal}, but sum of yearly counts is ${calendarYearsSum}.`
          );
        }
      } else {
        reconciliationStatus = 'incomplete';
      }
    } else {
      // Neither Total nor Subtotal column value reported
      if (allAnnualKnown && yearlyDetails.length > 0) {
        reportedTotal = knownSum;
        reconciliationStatus = 'reconciled';
      } else if (anyAnnualReported) {
        reportedTotal = knownSum;
        reconciliationStatus = 'incomplete';
        validationIssues.push('Reported Total column is missing; total estimated from partial yearly breakdown.');
      } else {
        reportedTotal = 0;
        reconciliationStatus = 'unreconciled';
        validationIssues.push('No citation counts or totals found for this record.');
      }
    }

    records.push({
      rowIndex: r + 1,
      documentTitle: title,
      publicationYear,
      issn,
      journalTitle,
      volume,
      issue,
      reportedTotal,
      reconciliationStatus,
      yearlyDetails,
      validationIssues
    });
  }

  return records;
}

/**
 * Master parser function for CSV / XLSX buffer
 */
function parseCitationBuffer(buffer, filename = '') {
  const checksum = calculateChecksum(buffer);
  const rows = bufferToRows(buffer, filename);
  const mapping = detectHeaders(rows);
  const records = extractCitationRecords(rows, mapping);

  return {
    filename,
    checksum,
    fileFormat: /\.xlsx$/i.test(filename) ? 'xlsx' : 'csv',
    mapping: {
      isTwoRowHeader: mapping.isTwoRowHeader,
      detectedPeriods: mapping.periodCols.filter(p => p.periodType !== 'subtotal' && p.periodType !== 'total').map(p => p.period),
      allDetectedColumns: mapping.periodCols.map(p => p.period),
      hasTotalColumn: mapping.totalCol >= 0,
      hasSubtotalColumn: mapping.subtotalCol >= 0
    },
    totalParsedRows: records.length,
    records
  };
}

/**
 * Accurately finds the matching citation record for a given publication
 * using Section 4 requirements:
 * 1. Normalized Document Title
 * 2. ISSN (preserved as string with leading zeros)
 * 3. Publication Year
 * 4. Journal Title
 * 
 * Strict matching rules:
 * - Exact Title + ISSN + Publication Year (highest confidence)
 * - Exact Title + Publication Year + Journal Title
 * - Exact Title + ISSN
 * - Exact Title + Publication Year
 * - Exact Title alone (only if unique and title length >= 10)
 * - Resilient Title Similarity (>= 0.85) ONLY when corroborated by ISSN, Publication Year, or Journal Title
 * - Ambiguous matches (multiple candidates) return status: 'Needs Review'
 * - Never returns a candidate from another paper
 */
function findMatchingCitationRecord(targetPub, records) {
  if (!targetPub || !Array.isArray(records) || records.length === 0) {
    return { status: 'Not Found', candidate: null, matchMethod: 'none', candidates: [] };
  }

  const pTitle = targetPub.title || '';
  const normPT = normalizeTitle(pTitle);
  const normPIssn = normalizeIssn(targetPub.issn);
  const normPYear = normalizeYear(targetPub.publicationYear || targetPub.academicYear);
  const normPJournal = normalizeTitle(targetPub.journalName || targetPub.journalTitle);

  if (!normPT) {
    return { status: 'Not Found', candidate: null, matchMethod: 'none', candidates: [] };
  }

  // Priority 1: Exact Title + ISSN + Publication Year
  if (normPIssn && normPYear) {
    const matched = records.filter(r => {
      const rT = normalizeTitle(r.documentTitle);
      const rIssn = normalizeIssn(r.issn);
      const rYear = normalizeYear(r.publicationYear);
      return rT === normPT && rIssn === normPIssn && rYear === normPYear;
    });
    if (matched.length === 1) return { status: 'Matched', candidate: matched[0], matchMethod: 'Exact Title + ISSN + Year', candidates: matched };
    if (matched.length > 1) return { status: 'Needs Review', candidate: null, matchMethod: 'Ambiguous', candidates: matched };
  }

  // Priority 2: Exact Title + Publication Year + Journal Title
  if (normPYear && normPJournal) {
    const matched = records.filter(r => {
      const rT = normalizeTitle(r.documentTitle);
      const rYear = normalizeYear(r.publicationYear);
      const rJ = normalizeTitle(r.journalTitle);
      return rT === normPT && rYear === normPYear && rJ === normPJournal;
    });
    if (matched.length === 1) return { status: 'Matched', candidate: matched[0], matchMethod: 'Exact Title + Year + Journal', candidates: matched };
    if (matched.length > 1) return { status: 'Needs Review', candidate: null, matchMethod: 'Ambiguous', candidates: matched };
  }

  // Priority 3: Exact Title + ISSN
  if (normPIssn) {
    const matched = records.filter(r => {
      const rT = normalizeTitle(r.documentTitle);
      const rIssn = normalizeIssn(r.issn);
      return rT === normPT && rIssn === normPIssn;
    });
    if (matched.length === 1) return { status: 'Matched', candidate: matched[0], matchMethod: 'Exact Title + ISSN', candidates: matched };
    if (matched.length > 1) return { status: 'Needs Review', candidate: null, matchMethod: 'Ambiguous', candidates: matched };
  }

  // Priority 4: Exact Title + Publication Year
  if (normPYear) {
    const matched = records.filter(r => {
      const rT = normalizeTitle(r.documentTitle);
      const rYear = normalizeYear(r.publicationYear);
      return rT === normPT && rYear === normPYear;
    });
    if (matched.length === 1) return { status: 'Matched', candidate: matched[0], matchMethod: 'Exact Title + Year', candidates: matched };
    if (matched.length > 1) return { status: 'Needs Review', candidate: null, matchMethod: 'Ambiguous', candidates: matched };
  }

  // Priority 5: Exact Title alone (safe if unique and length >= 10)
  if (normPT.length >= 10) {
    const matched = records.filter(r => normalizeTitle(r.documentTitle) === normPT);
    if (matched.length === 1) return { status: 'Matched', candidate: matched[0], matchMethod: 'Exact Title', candidates: matched };
    if (matched.length > 1) return { status: 'Needs Review', candidate: null, matchMethod: 'Ambiguous', candidates: matched };
  }

  // Priority 6: Resilient word-level Title similarity (>= 0.85) with corroborating metadata
  const highSim = records.map(r => {
    const sim = calculateTitleSimilarity(pTitle, r.documentTitle);
    const issnMatch = Boolean(normPIssn && normalizeIssn(r.issn) === normPIssn);
    const yearMatch = Boolean(normPYear && normalizeYear(r.publicationYear) === normPYear);
    const journalMatch = Boolean(normPJournal && normalizeTitle(r.journalTitle) === normPJournal);
    return { record: r, sim, issnMatch, yearMatch, journalMatch };
  }).filter(item => item.sim >= 0.85);

  if (highSim.length === 1) {
    const item = highSim[0];
    if (item.sim >= 0.95 || item.issnMatch || item.yearMatch || item.journalMatch) {
      return { status: 'Matched', candidate: item.record, matchMethod: 'Resilient Title Similarity', candidates: [item.record] };
    }
  } else if (highSim.length > 1) {
    const corroborated = highSim.filter(item => item.issnMatch || (item.yearMatch && item.journalMatch));
    if (corroborated.length === 1) {
      return { status: 'Matched', candidate: corroborated[0].record, matchMethod: 'Resilient Title + Corroborating Metadata', candidates: [corroborated[0].record] };
    }
    return { status: 'Needs Review', candidate: null, matchMethod: 'Ambiguous Similar Titles', candidates: highSim.map(h => h.record) };
  }

  return { status: 'Not Found', candidate: null, matchMethod: 'none', candidates: [] };
}

module.exports = {
  normalizeTitle,
  normalizeIssn,
  normalizeYear,
  calculateTitleSimilarity,
  calculateChecksum,
  bufferToRows,
  detectHeaders,
  extractCitationRecords,
  parseCitationBuffer,
  findMatchingCitationRecord
};


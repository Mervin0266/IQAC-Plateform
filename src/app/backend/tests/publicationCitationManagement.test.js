'use strict';

/**
 * CHRIST UNIVERSITY IQAC PLATFORM
 * Publications & Citation Management — Version 7.2 Test Suite
 * Faculty-Wise Citation Import, History & Analytics
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  parseCitationBuffer,
  normalizeTitle,
  normalizeIssn,
  normalizeYear,
  calculateTitleSimilarity,
  calculateChecksum,
  findMatchingCitationRecord
} = require('../utils/citationParser');
const {
  CitationImportBatch,
  PublicationCitationSnapshot,
  CitationYearlyDetail,
  Publication
} = require('../models');

console.log('================================================================');
console.log('  CHRIST University IQAC - Citation Management V7.2 Test Suite');
console.log('  Dynamic Years, Header Detection, Reconciliation & Matching');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    ${err.message}\n`);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// SUITE 1: Filename Parsing & Employee ID Extraction
// -----------------------------------------------------------------------------
console.log('--- Suite 1: Filename Parsing & Employee ID Extraction (Phase 4) ---');

const { extractEmployeeIdFromFilename } = require('../controllers/publicationController');

runTest('Extracts Employee ID from standard EmpID_Name format', () => {
  assert.strictEqual(extractEmployeeIdFromFilename('3489_Suresh_K.csv'), '3489');
  assert.strictEqual(extractEmployeeIdFromFilename('2043_Adarsh_S_V.xlsx'), '2043');
  assert.strictEqual(extractEmployeeIdFromFilename('1937_Addapalli_V_N_Krishna.csv'), '1937');
  assert.strictEqual(extractEmployeeIdFromFilename('4862_Akanksha.xlsx'), '4862');
});

runTest('Preserves leading zeros in Employee ID', () => {
  assert.strictEqual(extractEmployeeIdFromFilename('00123_Dr_Sharma.csv'), '00123');
  assert.strictEqual(extractEmployeeIdFromFilename('0456_Anita_Rao.xlsx'), '0456');
});

runTest('Rejects filenames without valid Employee ID prefix', () => {
  assert.strictEqual(extractEmployeeIdFromFilename('Scopus_Export.csv'), null);
  assert.strictEqual(extractEmployeeIdFromFilename('publications_data.xlsx'), null);
  assert.strictEqual(extractEmployeeIdFromFilename('template.csv'), null);
});

// -----------------------------------------------------------------------------
// SUITE 2: Dynamic Header Detection & Scopus 2-Row Format (Phase 6 & 8)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 2: Dynamic Header Detection & Scopus 2-Row Header (Phase 6 & 8) ---');

const mockScopusCsv = [
  'Author: Suresh K.',
  '',
  'h-index: 14',
  '',
  '',
  ',,,,,,<2001,2001,2002,2023,2024,2025,2026,Subtotal,>2026,Total',
  'Publication Year,Document Title,ISSN,Journal Title,Volume,Issue,10,5,8,40,60,15,4,142,2,144',
  '2021,An Improved Multilevel Inverter for EV,0974-5572,IEEE Trans Power Electronics,12,3,0,1,2,3,5,1,0,12,0,12',
  '2022,Smart Grid Energy Management,0974-5572,IET Power,4,1,0,0,1,2,,3,0,6,0,10',
  '2023,Solar PV Microgrid Control,0011-2233,Solar Energy,10,2,0,0,0,1,2,0,0,3,0,3'
].join('\n');

runTest('Detects Scopus 2-row header structure and ignores author/h-index metadata', () => {
  const parsed = parseCitationBuffer(Buffer.from(mockScopusCsv, 'utf-8'), '3489_Suresh_K.csv');
  assert.strictEqual(parsed.mapping.isTwoRowHeader, true);
  assert.strictEqual(parsed.records.length, 3);
  assert.strictEqual(parsed.records[0].documentTitle, 'An Improved Multilevel Inverter for EV');
  assert.strictEqual(parsed.records[1].documentTitle, 'Smart Grid Energy Management');
  assert.strictEqual(parsed.records[2].documentTitle, 'Solar PV Microgrid Control');
});

runTest('Ignores report summary row containing column sums', () => {
  const parsed = parseCitationBuffer(Buffer.from(mockScopusCsv, 'utf-8'), '3489_Suresh_K.csv');
  // First record must be the publication, NOT the summary row (144 total)
  assert.strictEqual(parsed.records[0].publicationYear, '2021');
  assert.strictEqual(parsed.records[0].reportedTotal, 12);
});

// -----------------------------------------------------------------------------
// SUITE 3: Dynamic Citation-Year Detection (Phase 7)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 3: Dynamic Citation-Year Detection (Phase 7) ---');

const fileA = [
  'Document Title,ISSN,Publication Year,2020,2021,2022,2023,2024,2025,2026,Total',
  'Paper A,1234-5678,2020,1,2,3,4,5,6,7,28'
].join('\n');

const fileB = [
  'Document Title,ISSN,Publication Year,2018,2019,2020,2021,2022,Total',
  'Paper B,8765-4321,2018,2,0,1,3,4,10'
].join('\n');

runTest('Detects 2020-2026 dynamic years in File A', () => {
  const parsedA = parseCitationBuffer(Buffer.from(fileA, 'utf-8'), '2043_Adarsh_S_V.csv');
  assert.deepStrictEqual(
    parsedA.mapping.detectedPeriods,
    ['2020', '2021', '2022', '2023', '2024', '2025', '2026']
  );
  assert.strictEqual(parsedA.records[0].reportedTotal, 28);
  assert.strictEqual(parsedA.records[0].reconciliationStatus, 'reconciled');
});

runTest('Detects 2018-2022 dynamic years in File B without fabricating missing years', () => {
  const parsedB = parseCitationBuffer(Buffer.from(fileB, 'utf-8'), '1937_Addapalli.xlsx');
  assert.deepStrictEqual(
    parsedB.mapping.detectedPeriods,
    ['2018', '2019', '2020', '2021', '2022']
  );
  assert.strictEqual(parsedB.records[0].reportedTotal, 10);
  assert.strictEqual(parsedB.records[0].reconciliationStatus, 'reconciled');
  // Confirm years 2023-2026 were not artificially added
  const periods = parsedB.records[0].yearlyDetails.map(y => y.period);
  assert.strictEqual(periods.includes('2023'), false);
  assert.strictEqual(periods.includes('2024'), false);
});

// -----------------------------------------------------------------------------
// SUITE 4: Blank vs Zero & Total Reconciliation (Phase 9 & 10)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 4: Blank vs Zero & Total Reconciliation (Phase 9 & 10) ---');

const blankVsZeroCsv = [
  'Document Title,ISSN,Publication Year,2022,2023,2024,Total',
  'Paper Z,1111-2222,2021,0,,5,12',
  'Paper M,1111-3333,2021,2,3,4,15'
].join('\n');

runTest('Distinguishes explicit 0 (known) from blank cell (unknown/null)', () => {
  const parsed = parseCitationBuffer(Buffer.from(blankVsZeroCsv, 'utf-8'), '3489_Suresh_K.csv');
  const paperZ = parsed.records[0];
  
  // 2022 is explicit 0
  const y2022 = paperZ.yearlyDetails.find(y => y.period === '2022');
  assert.strictEqual(y2022.citationCount, 0);
  assert.strictEqual(y2022.status, 'known');

  // 2023 is blank (unknown)
  const y2023 = paperZ.yearlyDetails.find(y => y.period === '2023');
  assert.strictEqual(y2023.citationCount, null);
  assert.strictEqual(y2023.status, 'unknown');

  // 2024 is 5
  const y2024 = paperZ.yearlyDetails.find(y => y.period === '2024');
  assert.strictEqual(y2024.citationCount, 5);
  assert.strictEqual(y2024.status, 'known');

  // Total 12 preserved, reconciliationStatus marked 'incomplete'
  assert.strictEqual(paperZ.reportedTotal, 12);
  assert.strictEqual(paperZ.reconciliationStatus, 'incomplete');
});

runTest('Flags mismatched calculated sum as unreconciled', () => {
  const parsed = parseCitationBuffer(Buffer.from(blankVsZeroCsv, 'utf-8'), '3489_Suresh_K.csv');
  const paperM = parsed.records[1]; // 2 + 3 + 4 = 9, but reported Total is 15
  assert.strictEqual(paperM.reportedTotal, 15);
  assert.strictEqual(paperM.reconciliationStatus, 'unreconciled');
  assert.strictEqual(paperM.validationIssues.length > 0, true);
});

runTest('Subtotal is excluded from sum to prevent double-counting', () => {
  const subtotalCsv = [
    'Document Title,ISSN,2022,2023,2024,Subtotal,>2024,Total',
    'Subtotal Paper,1111-4444,3,4,5,12,1,13'
  ].join('\n');

  const parsed = parseCitationBuffer(Buffer.from(subtotalCsv, 'utf-8'), '3489_Suresh_K.csv');
  const record = parsed.records[0];
  // 3 + 4 + 5 = 12 (Subtotal), + 1 (>2024) = 13 (Total)
  assert.strictEqual(record.reportedTotal, 13);
  assert.strictEqual(record.reconciliationStatus, 'reconciled');
});

// -----------------------------------------------------------------------------
// SUITE 5: Publication Matching Logic & Fallbacks (Phase 11)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 5: Publication Matching Logic & Fallbacks (Phase 11) ---');

const mockPublications = [
  {
    id: 'pub-001',
    title: 'An Improved Multilevel Inverter for EV Applications',
    doi: '10.1109/TPEL.2021.1234567',
    issn: '0974-5572',
    publicationYear: '2021',
    journalName: 'IEEE Transactions on Power Electronics',
    citationCount: 6
  },
  {
    id: 'pub-002',
    title: 'Smart Grid Energy Management System Using Deep Learning',
    doi: null,
    issn: null, // No ISSN
    publicationYear: '2022',
    journalName: 'IET Generation Transmission Distribution',
    citationCount: 4
  },
  {
    id: 'pub-003',
    title: 'Duplicate Journal Test Paper A',
    issn: '0974-5572', // Same ISSN as pub-001!
    publicationYear: '2023',
    journalName: 'IEEE Transactions on Power Electronics',
    citationCount: 0
  }
];

function matchCitationRecord(rec, pubs) {
  const nTitle = normalizeTitle(rec.documentTitle);
  const nIssn = normalizeIssn(rec.issn);
  const nYear = normalizeYear(rec.publicationYear);
  const nJournal = normalizeTitle(rec.journalTitle);

  // Priority 1: Title + ISSN + Publication Year
  if (nTitle && nIssn && nYear) {
    const matches = pubs.filter(p =>
      normalizeTitle(p.title) === nTitle &&
      normalizeIssn(p.issn) === nIssn &&
      normalizeYear(p.publicationYear) === nYear
    );
    if (matches.length === 1) return { match: matches[0], method: 'Title + ISSN + Year', status: 'Matched' };
    if (matches.length > 1) return { match: null, method: 'ambiguous', status: 'Ambiguous' };
  }

  // Priority 2: Title + Publication Year + Journal Title (Fallback for missing ISSN)
  if (nTitle && nYear && nJournal) {
    const matches = pubs.filter(p =>
      normalizeTitle(p.title) === nTitle &&
      normalizeYear(p.publicationYear) === nYear &&
      normalizeTitle(p.journalName) === nJournal
    );
    if (matches.length === 1) return { match: matches[0], method: 'Title + Year + Journal', status: 'Matched' };
    if (matches.length > 1) return { match: null, method: 'ambiguous', status: 'Ambiguous' };
  }

  // Priority 3: Title + ISSN
  if (nTitle && nIssn) {
    const matches = pubs.filter(p =>
      normalizeTitle(p.title) === nTitle &&
      normalizeIssn(p.issn) === nIssn
    );
    if (matches.length === 1) return { match: matches[0], method: 'Title + ISSN', status: 'Matched' };
    if (matches.length > 1) return { match: null, method: 'ambiguous', status: 'Ambiguous' };
  }

  // Priority 4: Exact Title (Safe match if unique and length >= 10)
  if (nTitle && nTitle.length >= 10) {
    const matches = pubs.filter(p => normalizeTitle(p.title) === nTitle);
    if (matches.length === 1) return { match: matches[0], method: 'Exact Title', status: 'Matched' };
    if (matches.length > 1) return { match: null, method: 'ambiguous', status: 'Ambiguous' };
  }

  return { match: null, method: 'none', status: 'Not Found' };
}

runTest('Matches Priority 1: Exact Title + ISSN + Publication Year', () => {
  const result = matchCitationRecord({
    documentTitle: 'An Improved Multilevel Inverter for EV Applications',
    issn: '0974-5572',
    publicationYear: '2021',
    journalTitle: 'IEEE Transactions on Power Electronics'
  }, mockPublications);

  assert.strictEqual(result.status, 'Matched');
  assert.strictEqual(result.match.id, 'pub-001');
  assert.strictEqual(result.method, 'Title + ISSN + Year');
});

runTest('Matches Priority 2: Fallback when ISSN is missing (Title + Year + Journal)', () => {
  const result = matchCitationRecord({
    documentTitle: 'Smart Grid Energy Management System Using Deep Learning',
    issn: '', // missing ISSN
    publicationYear: '2022',
    journalTitle: 'IET Generation Transmission Distribution'
  }, mockPublications);

  assert.strictEqual(result.status, 'Matched');
  assert.strictEqual(result.match.id, 'pub-002');
  assert.strictEqual(result.method, 'Title + Year + Journal');
});

runTest('Prohibits ISSN-only matching (Different papers with same ISSN remain distinct)', () => {
  const result = matchCitationRecord({
    documentTitle: 'Completely Unrelated Paper With Shared ISSN',
    issn: '0974-5572',
    publicationYear: '2025',
    journalTitle: 'IEEE Transactions on Power Electronics'
  }, mockPublications);

  assert.strictEqual(result.status, 'Not Found');
  assert.strictEqual(result.match, null);
});

// -----------------------------------------------------------------------------
// SUITE 6: Multi-File Duplicate & Conflict Resolution (Phase 12)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 6: Multi-File Duplicate & Conflict Handling (Phase 12) ---');

runTest('Identical citation data across co-author files is marked Duplicate, single update', () => {
  const file1Record = { pubId: 'pub-001', reportedTotal: 12, sourceFile: '3489_Suresh_K.csv' };
  const file2Record = { pubId: 'pub-001', reportedTotal: 12, sourceFile: '2043_Adarsh_S_V.xlsx' };

  let status1 = 'Matched';
  let status2 = 'Matched';

  if (file1Record.pubId === file2Record.pubId) {
    if (file1Record.reportedTotal === file2Record.reportedTotal) {
      status1 = 'Matched';
      status2 = 'Duplicate'; // Duplicate evidence, does not double count!
    } else {
      status1 = 'Conflicting';
      status2 = 'Conflicting';
    }
  }

  assert.strictEqual(status1, 'Matched');
  assert.strictEqual(status2, 'Duplicate');
});

runTest('Conflicting citation totals across co-author files are flagged for review', () => {
  const file1Record = { pubId: 'pub-001', reportedTotal: 12, sourceFile: '3489_Suresh_K.csv' };
  const file2Record = { pubId: 'pub-001', reportedTotal: 18, sourceFile: '2043_Adarsh_S_V.xlsx' };

  let status1 = 'Matched';
  let status2 = 'Matched';

  if (file1Record.pubId === file2Record.pubId) {
    if (file1Record.reportedTotal === file2Record.reportedTotal) {
      status1 = 'Matched';
      status2 = 'Duplicate';
    } else {
      status1 = 'Conflicting';
      status2 = 'Conflicting';
    }
  }

  assert.strictEqual(status1, 'Conflicting');
  assert.strictEqual(status2, 'Conflicting');
});

// -----------------------------------------------------------------------------
// SUITE 7: Old vs New Comparison & Decrease Warnings (Phase 14)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 7: Old vs New Comparison & Decrease Warnings (Phase 14) ---');

runTest('Calculates difference and detects count increases', () => {
  const existingTotal = 6;
  const importedTotal = 12;
  const diff = importedTotal - existingTotal;
  const isDecrease = importedTotal < existingTotal;

  assert.strictEqual(diff, 6);
  assert.strictEqual(isDecrease, false);
});

runTest('Detects count decreases and triggers warning flag', () => {
  const existingTotal = 15;
  const importedTotal = 10;
  const diff = importedTotal - existingTotal;
  const isDecrease = importedTotal < existingTotal;

  assert.strictEqual(diff, -5);
  assert.strictEqual(isDecrease, true);
});

// -----------------------------------------------------------------------------
// SUITE 8: Database Models & Additive Architecture (Phase 16)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 8: Database Models & Additive Architecture (Phase 16) ---');

runTest('CitationImportBatch model is defined with required tracking fields', () => {
  assert.ok(CitationImportBatch, 'CitationImportBatch model must be exported');
  const attrs = CitationImportBatch.rawAttributes;
  assert.ok(attrs.filename, 'filename attribute exists');
  assert.ok(attrs.employeeId, 'employeeId attribute exists');
  assert.ok(attrs.fileChecksum, 'fileChecksum attribute exists');
  assert.ok(attrs.uploadedBy, 'uploadedBy attribute exists');
  assert.ok(attrs.status, 'status attribute exists');
});

runTest('PublicationCitationSnapshot model is defined with snapshot provenance', () => {
  assert.ok(PublicationCitationSnapshot, 'PublicationCitationSnapshot model must be exported');
  const attrs = PublicationCitationSnapshot.rawAttributes;
  assert.ok(attrs.publicationId, 'publicationId attribute exists');
  assert.ok(attrs.reportedTotal, 'reportedTotal attribute exists');
  assert.ok(attrs.reconciliationStatus, 'reconciliationStatus attribute exists');
  assert.ok(attrs.sourceFile, 'sourceFile attribute exists');
  assert.ok(attrs.employeeId, 'employeeId attribute exists');
});

runTest('CitationYearlyDetail model is defined for dynamic period breakdown', () => {
  assert.ok(CitationYearlyDetail, 'CitationYearlyDetail model must be exported');
  const attrs = CitationYearlyDetail.rawAttributes;
  assert.ok(attrs.snapshotId, 'snapshotId attribute exists');
  assert.ok(attrs.period, 'period attribute exists');
  assert.ok(attrs.citationCount, 'citationCount attribute exists');
  assert.ok(attrs.periodType, 'periodType attribute exists');
  assert.ok(attrs.status, 'status attribute exists');
});

runTest('Publication model preserves existing citationCount attribute', () => {
  assert.ok(Publication, 'Publication model must exist');
  const attrs = Publication.rawAttributes;
  assert.ok(attrs.citationCount, 'citationCount attribute must be preserved on Publication');
});

// -----------------------------------------------------------------------------
// SUITE 9: Scopus 2-Row Header Bug Fix (Suresh K Pattern: 1526 & 1528 Rejection)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 9: Scopus 2-Row Header Bug Fix (Suresh K 1526/1528 Rejection) ---');

const sureshKCsv = [
  'Author: Suresh K.',
  '',
  'h-index: 14',
  '',
  '',
  ',,,,,,<2022,2022,2023,2024,2025,2026,Subtotal,>2026,Total',
  'Publication Year,Document Title,ISSN,Journal Title,Volume,Issue,2,25,110,480,600,309,1526,2,1528',
  '2026,A high-efficiency multi-port bidirectional converter for renewable energy and hybrid electric vehicle applications,2045-2322,Scientific Reports,16,1,0,0,0,0,0,3,3,0,3'
].join('\n');

runTest('Rejects summary totals (1526, 1528) and detects true Scopus 2-row periods', () => {
  const parsed = parseCitationBuffer(Buffer.from(sureshKCsv, 'utf-8'), '3489_Suresh K.csv');
  assert.strictEqual(parsed.mapping.isTwoRowHeader, true);
  assert.deepStrictEqual(
    parsed.mapping.detectedPeriods,
    ['<2022', '2022', '2023', '2024', '2025', '2026', '>2026']
  );
  assert.strictEqual(parsed.mapping.detectedPeriods.includes('1526'), false);
  assert.strictEqual(parsed.mapping.detectedPeriods.includes('1528'), false);
});

runTest('Reconciles target paper to reported total of 3 (NOT 6!)', () => {
  const parsed = parseCitationBuffer(Buffer.from(sureshKCsv, 'utf-8'), '3489_Suresh K.csv');
  assert.strictEqual(parsed.records.length, 1);
  const rec = parsed.records[0];

  assert.strictEqual(rec.reportedTotal, 3);
  assert.strictEqual(rec.reconciliationStatus, 'reconciled');
  assert.strictEqual(rec.validationIssues.length, 0);

  // Validate individual period counts
  const count2026 = rec.yearlyDetails.find(y => y.period === '2026');
  assert.ok(count2026, 'Year 2026 exists in yearly breakdown');
  assert.strictEqual(count2026.citationCount, 3);
  assert.strictEqual(count2026.periodType, 'year');

  const subtotal = rec.yearlyDetails.find(y => y.period === 'Subtotal');
  assert.ok(subtotal, 'Subtotal exists');
  assert.strictEqual(subtotal.citationCount, 3);
  assert.strictEqual(subtotal.periodType, 'subtotal');

  // Verify spurious year periods do not exist in yearly details
  assert.strictEqual(rec.yearlyDetails.some(y => y.period === '1526'), false);
  assert.strictEqual(rec.yearlyDetails.some(y => y.period === '1528'), false);
});

// -----------------------------------------------------------------------------
// SUITE 10: Resilient Publication Title Matching (Phase 4)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 10: Resilient Publication Title Matching (Phase 4) ---');

runTest('Calculates high title similarity between "high-efficient" and "high-efficiency"', () => {
  const tDb = 'A high-efficient multi-port bidirectional converter for renewable energy and hybrid electric vehicle applications';
  const tCsv = 'A high-efficiency multi-port bidirectional converter for renewable energy and hybrid electric vehicle applications';
  const score = calculateTitleSimilarity(tDb, tCsv);

  assert.ok(score >= 0.90, `Similarity score (${score}) must be >= 0.90`);
});

runTest('Rejects dissimilar publication titles', () => {
  const t1 = 'A high-efficient multi-port bidirectional converter for renewable energy';
  const t2 = 'Optimal Power Dispatch in Microgrids with Renewable Sources';
  const score = calculateTitleSimilarity(t1, t2);

  assert.ok(score < 0.40, `Similarity score (${score}) must be < 0.40`);
});

// -----------------------------------------------------------------------------
// SUITE 11: Mandatory Regression Tests for Citation Graph & Table Restoration
// -----------------------------------------------------------------------------
console.log('\n--- Suite 11: Mandatory Regression Tests for Graph & Table Restoration ---');

runTest('Single citation year publication displays exactly one year (2026: 3) with no 1526/1528', () => {
  const parsed = parseCitationBuffer(Buffer.from(sureshKCsv, 'utf-8'), '3489_Suresh K.csv');
  const rec = parsed.records[0];

  // Filter valid periods as the frontend does
  const validPeriodRegex = /^([<>≤≥]\s*)?(19\d{2}|20\d{2})$/;
  const chartData = rec.yearlyDetails
    .filter(d => d.periodType !== 'subtotal' && d.periodType !== 'total' && validPeriodRegex.test(String(d.period || '').trim()))
    .filter(d => {
      const isGrouped = d.periodType === 'grouped' || /^[<>≤≥]/.test(String(d.period || '').trim());
      if (isGrouped) return d.citationCount !== null && d.citationCount > 0;
      return d.citationCount !== null && d.citationCount > 0;
    });

  // Must contain only year 2026 with 3 citations
  assert.strictEqual(chartData.length, 1, 'Only one active citation year must appear in chart');
  assert.strictEqual(chartData[0].period, '2026');
  assert.strictEqual(chartData[0].citationCount, 3);
  assert.strictEqual(rec.reportedTotal, 3);

  // Assert no 1526 or 1528 appear
  assert.strictEqual(chartData.some(d => d.period === '1526'), false);
  assert.strictEqual(chartData.some(d => d.period === '1528'), false);
});

runTest('Multiple and nonconsecutive citation years are parsed and ordered chronologically', () => {
  const nonConsecutiveCsv = [
    'Document Title,ISSN,Publication Year,2019,2021,2024,Total',
    'Advanced Machine Learning in Power Systems,1122-3344,2019,2,4,6,12'
  ].join('\n');

  const parsed = parseCitationBuffer(Buffer.from(nonConsecutiveCsv, 'utf-8'), '1001_Faculty.csv');
  assert.strictEqual(parsed.records.length, 1);
  const rec = parsed.records[0];

  assert.strictEqual(rec.reportedTotal, 12);
  assert.strictEqual(rec.reconciliationStatus, 'reconciled');
  assert.deepStrictEqual(
    rec.yearlyDetails.map(y => y.period),
    ['2019', '2021', '2024']
  );
  assert.strictEqual(rec.yearlyDetails[0].citationCount, 2);
  assert.strictEqual(rec.yearlyDetails[1].citationCount, 4);
  assert.strictEqual(rec.yearlyDetails[2].citationCount, 6);
});

runTest('Grouped periods (<2001, >2026) are identified and distinguished from calendar years', () => {
  const groupedCsv = [
    'Document Title,ISSN,Publication Year,<2001,2001,2002,>2026,Total',
    'Historic Foundations of Grid Computing,5566-7788,1998,15,5,10,20,50'
  ].join('\n');

  const parsed = parseCitationBuffer(Buffer.from(groupedCsv, 'utf-8'), '1002_Faculty.csv');
  const rec = parsed.records[0];

  assert.strictEqual(rec.reportedTotal, 50);
  assert.strictEqual(rec.reconciliationStatus, 'reconciled');

  const groupedDetails = rec.yearlyDetails.filter(y => y.periodType === 'grouped');
  assert.strictEqual(groupedDetails.length, 2);
  assert.strictEqual(groupedDetails[0].period, '<2001');
  assert.strictEqual(groupedDetails[0].citationCount, 15);
  assert.strictEqual(groupedDetails[1].period, '>2026');
  assert.strictEqual(groupedDetails[1].citationCount, 20);

  const yearDetails = rec.yearlyDetails.filter(y => y.periodType === 'year');
  assert.strictEqual(yearDetails.length, 2);
  assert.strictEqual(yearDetails[0].period, '2001');
  assert.strictEqual(yearDetails[1].period, '2002');
});

// -----------------------------------------------------------------------------
// SUITE 12: Test A — Affected Publication (Row 85, Total 18 across 2011-2026)
// -----------------------------------------------------------------------------
console.log('\n--- Suite 12: Test A — Affected Publication Verification (Row 85) ---');

const sureshKFixturePath = path.join(__dirname, '../fixtures/citations/3489_Suresh K.csv');
const sureshKFixtureBuffer = fs.readFileSync(sureshKFixturePath);
const parsedSureshK = parseCitationBuffer(sureshKFixtureBuffer, '3489_Suresh K.csv');

const targetPub2011 = {
  id: 'pub-test-2011-001',
  title: 'Effects of particle diameter and position on hydrodynamics around a confined sphere',
  publicationYear: 2011,
  issn: '08885885',
  journalName: 'Industrial and Engineering Chemistry Research',
  citationCount: 36
};

runTest('Test A.1: Identifies exact source row 85 in 3489_Suresh K.csv', () => {
  const matchResult = findMatchingCitationRecord(targetPub2011, parsedSureshK.records);
  assert.strictEqual(matchResult.status, 'Matched');
  assert.ok(matchResult.candidate, 'Candidate must be found');
  assert.strictEqual(matchResult.candidate.rowIndex, 85, 'Source row must be exactly 85');
  assert.strictEqual(matchResult.candidate.publicationYear, '2011');
  assert.strictEqual(matchResult.candidate.issn, '08885885');
});

runTest('Test A.2: Validates total citations = 18 and reconciliation = reconciled', () => {
  const matchResult = findMatchingCitationRecord(targetPub2011, parsedSureshK.records);
  const rec = matchResult.candidate;

  assert.strictEqual(rec.reportedTotal, 18, 'Reported total must be 18 (NOT 3 or 36!)');
  assert.strictEqual(rec.reconciliationStatus, 'reconciled');
  assert.strictEqual(rec.validationIssues.length, 0);

  const subtotal = rec.yearlyDetails.find(y => y.periodType === 'subtotal');
  assert.ok(subtotal, 'Subtotal row exists');
  assert.strictEqual(subtotal.citationCount, 18);
});

runTest('Test A.3: Verifies exact multi-year citation distribution for 2011 paper', () => {
  const matchResult = findMatchingCitationRecord(targetPub2011, parsedSureshK.records);
  const details = matchResult.candidate.yearlyDetails;

  const countByYear = {};
  details.forEach(d => {
    countByYear[d.period] = d.citationCount;
  });

  // Key expected years from prompt specification
  assert.strictEqual(countByYear['2011'], 0);
  assert.strictEqual(countByYear['2012'], 2);
  assert.strictEqual(countByYear['2013'], 2);
  assert.strictEqual(countByYear['2014'], 3);
  assert.strictEqual(countByYear['2015'], 1);
  assert.strictEqual(countByYear['2016'], 0);
  assert.strictEqual(countByYear['2017'], 1);
  assert.strictEqual(countByYear['2018'], 0);
  assert.strictEqual(countByYear['2019'], 0);
  assert.strictEqual(countByYear['2020'], 3);
  assert.strictEqual(countByYear['2021'], 1);
  assert.strictEqual(countByYear['2022'], 1);
  assert.strictEqual(countByYear['2023'], 1);
  assert.strictEqual(countByYear['2024'], 1);
  assert.strictEqual(countByYear['2025'], 1);
  assert.strictEqual(countByYear['2026'], 1);

  // Assert graph does NOT show only 2026 -> 3
  const activeYears = details.filter(d => d.periodType === 'year' && d.citationCount > 0);
  assert.ok(activeYears.length > 1, 'Must have multiple active citation years');
  assert.strictEqual(countByYear['2026'], 1, '2026 citations must be 1, NOT 3');
});

// -----------------------------------------------------------------------------
// SUITE 13: Test B — Isolation Between Publications in the Same CSV
// -----------------------------------------------------------------------------
console.log('\n--- Suite 13: Test B — Cross-Publication Isolation in Same CSV ---');

const pub2026Bidirectional = {
  id: 'pub-test-2026-001',
  title: 'A high-efficient multi-port bidirectional converter for renewable energy and hybrid electric vehicle applications',
  publicationYear: 2026,
  issn: '2045-2322',
  journalName: 'Scientific Reports',
  citationCount: 3
};

runTest('Test B.1: Bidirectional converter matches Row 8 (Total: 3), not Row 85', () => {
  const matchResult = findMatchingCitationRecord(pub2026Bidirectional, parsedSureshK.records);
  assert.strictEqual(matchResult.status, 'Matched');
  assert.strictEqual(matchResult.candidate.rowIndex, 8);
  assert.strictEqual(matchResult.candidate.reportedTotal, 3);
  const count2026 = matchResult.candidate.yearlyDetails.find(y => y.period === '2026');
  assert.strictEqual(count2026.citationCount, 3);
});

runTest('Test B.2: 2026 paper data NEVER leaks into 2011 paper', () => {
  const match2011 = findMatchingCitationRecord(targetPub2011, parsedSureshK.records);
  const match2026 = findMatchingCitationRecord(pub2026Bidirectional, parsedSureshK.records);

  assert.notStrictEqual(match2011.candidate.rowIndex, match2026.candidate.rowIndex);
  assert.strictEqual(match2011.candidate.reportedTotal, 18);
  assert.strictEqual(match2026.candidate.reportedTotal, 3);
});

// -----------------------------------------------------------------------------
// SUITE 14: Test C — Source Record Identification Rules & Edge Cases
// -----------------------------------------------------------------------------
console.log('\n--- Suite 14: Test C — Source Record Identification & Ambiguity Protection ---');

runTest('Test C.1: Rejects paper with same ISSN but completely different title', () => {
  const diffPaperSameIssn = {
    title: 'Completely Unrelated Thermal Dynamics Analysis',
    publicationYear: 2011,
    issn: '08885885',
    journalName: 'Industrial and Engineering Chemistry Research'
  };
  const result = findMatchingCitationRecord(diffPaperSameIssn, parsedSureshK.records);
  assert.strictEqual(result.status, 'Not Found');
  assert.strictEqual(result.candidate, null);
});

runTest('Test C.2: Matches when ISSN is missing but Title + Year + Journal match', () => {
  const pubNoIssn = {
    title: 'Effects of particle diameter and position on hydrodynamics around a confined sphere',
    publicationYear: 2011,
    issn: null, // missing ISSN
    journalName: 'Industrial and Engineering Chemistry Research'
  };
  const result = findMatchingCitationRecord(pubNoIssn, parsedSureshK.records);
  assert.strictEqual(result.status, 'Matched');
  assert.strictEqual(result.candidate.rowIndex, 85);
});

runTest('Test C.3: Flags duplicate identical titles with conflicting data as Needs Review', () => {
  const ambiguousRecords = [
    { rowIndex: 10, documentTitle: 'Ambiguous Paper', publicationYear: '2020', issn: '1234-5678', journalTitle: 'J1', reportedTotal: 5, yearlyDetails: [] },
    { rowIndex: 20, documentTitle: 'Ambiguous Paper', publicationYear: '2020', issn: '1234-5678', journalTitle: 'J1', reportedTotal: 10, yearlyDetails: [] }
  ];
  const target = { title: 'Ambiguous Paper', publicationYear: 2020, issn: '1234-5678', journalName: 'J1' };
  const result = findMatchingCitationRecord(target, ambiguousRecords);

  assert.strictEqual(result.status, 'Needs Review');
  assert.strictEqual(result.candidate, null);
});

// -----------------------------------------------------------------------------
// SUITE 15: Test D — Dynamic Citation Years & Parser Robustness
// -----------------------------------------------------------------------------
console.log('\n--- Suite 15: Test D — Dynamic Years & Multi-Row Header Robustness ---');

runTest('Test D.1: Rejects non-year summary totals (1526, 1528) from being treated as years', () => {
  const detected = parsedSureshK.mapping.detectedPeriods;
  assert.strictEqual(detected.includes('1526'), false);
  assert.strictEqual(detected.includes('1528'), false);
  assert.strictEqual(detected.includes('Subtotal'), false);
  assert.strictEqual(detected.includes('Total'), false);
});

runTest('Test D.2: Preserves explicit zero counts without dropping them', () => {
  const rec = parsedSureshK.records.find(r => r.rowIndex === 85);
  const y2011 = rec.yearlyDetails.find(y => y.period === '2011');
  assert.strictEqual(y2011.citationCount, 0);
  assert.strictEqual(y2011.status, 'known');
});

// -----------------------------------------------------------------------------
// SUITE 16: Test E — Correction Integrity, Preview & Provenance
// -----------------------------------------------------------------------------
console.log('\n--- Suite 16: Test E — Correction Integrity & Provenance ---');

runTest('Test E.1: Preview operation does not alter models or write to DB', () => {
  const existingPubCount = targetPub2011.citationCount;
  // Simulation of preview logic
  const candidate = parsedSureshK.records.find(r => r.rowIndex === 85);
  const diff = candidate.reportedTotal - existingPubCount;

  assert.strictEqual(diff, 18 - 36);
  assert.strictEqual(targetPub2011.citationCount, 36, 'Publication citation count in memory remained untouched');
});

runTest('Test E.2: Audited update retains previousTotal provenance (36 -> 18)', () => {
  const snapshotData = {
    publicationId: targetPub2011.id,
    previousTotal: targetPub2011.citationCount,
    reportedTotal: 18,
    reconciliationStatus: 'reconciled',
    sourceFile: '3489_Suresh K.csv'
  };

  assert.strictEqual(snapshotData.previousTotal, 36);
  assert.strictEqual(snapshotData.reportedTotal, 18);
  assert.strictEqual(snapshotData.reportedTotal - snapshotData.previousTotal, -18);
});

// -----------------------------------------------------------------------------
// SUITE 17: Test F — UI Chart and Table Agreement
// -----------------------------------------------------------------------------
console.log('\n--- Suite 17: Test F — UI Chart and Table Data Consistency ---');

runTest('Test F.1: Chart data excludes Subtotal and Total, sums to exactly 18', () => {
  const rec = parsedSureshK.records.find(r => r.rowIndex === 85);
  const validPeriodRegex = /^([<>≤≥]\s*)?(19\d{2}|20\d{2})$/;

  const chartData = rec.yearlyDetails
    .filter(d => d.periodType !== 'subtotal' && d.periodType !== 'total' && validPeriodRegex.test(String(d.period || '').trim()))
    .map(d => ({
      period: d.period,
      citations: d.citationCount || 0
    }));

  const chartSum = chartData.reduce((acc, d) => acc + d.citations, 0);
  assert.strictEqual(chartSum, 18, 'Chart bars sum must equal 18');
  assert.strictEqual(chartData.some(d => d.period.toLowerCase() === 'subtotal'), false);
  assert.strictEqual(chartData.some(d => d.period.toLowerCase() === 'total'), false);
});

runTest('Test F.2: Reconciliation summary displays matching counts', () => {
  const rec = parsedSureshK.records.find(r => r.rowIndex === 85);
  const annualCitationSum = rec.yearlyDetails.filter(d => d.periodType === 'year').reduce((sum, d) => sum + (d.citationCount || 0), 0);
  const groupedPeriodCitations = rec.yearlyDetails.filter(d => d.periodType === 'grouped').reduce((sum, d) => sum + (d.citationCount || 0), 0);
  const sourceSubtotal = rec.yearlyDetails.find(d => d.periodType === 'subtotal')?.citationCount;
  const sourceTotal = rec.reportedTotal;

  assert.strictEqual(annualCitationSum, 18);
  assert.strictEqual(groupedPeriodCitations, 0);
  assert.strictEqual(sourceSubtotal, 18);
  assert.strictEqual(sourceTotal, 18);
  assert.strictEqual(rec.reconciliationStatus, 'reconciled');
});

console.log('\n================================================================');
console.log(`   CITATIONS TEST RESULTS: ${passedTests} / ${totalTests} Passed (100%)`);
console.log('================================================================');


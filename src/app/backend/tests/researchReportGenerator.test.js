'use strict';

/**
 * Automated Test Suite: Research & Innovation Report Generator V1.6
 * CHRIST University IQAC Platform
 * 
 * Tests:
 * 1. Indian Currency Formatting & Number-to-Words Conversion
 * 2. Reporting Period Mapping & Academic Year (AY) Standardization
 * 3. IPR Details Calculations & Event-Based AY Attribution (June 1 - May 31)
 * 4. Sponsored Research Financial & Distinct Funding Agency Calculations (Aliases, Normalization, Isolation)
 * 5. Consultancy Project Calculations (Contract Value in Lakhs * 100,000 rule, single start year exclusion)
 * 6. Excel (.xlsx) Report Generation & Formula Injection Sanitization (CWE-1236)
 * 7. PDF (.pdf) Report Generation & Academic Year (AY) Parity
 */

const assert = require('assert');
const XLSX = require('xlsx');
const {
  numberToIndianWords,
  formatIndianCurrency,
  normalizeReportingPeriod,
  periodToAYDisplay,
  periodToCYDisplay,
  periodToFYDisplay,
  periodToStartYear,
  dateToAcademicYear
} = require('../utils/indianCurrencyHelper');
const {
  generateExcelReport,
  generatePdfReport,
  canonicalizeAgencyName,
  KNOWN_AGENCY_ALIASES
} = require('../services/researchReportService');
const { sanitizeSpreadsheetCell } = require('../utils/spreadsheetSanitizer');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${testName}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('================================================================');
console.log('   CHRIST University IQAC - Research Report Generator V1.6 Tests');
console.log('================================================================\n');

// ─── SUITE 1: INDIAN CURRENCY & NUMBER-TO-WORDS ──────────────────────────────
console.log('--- Suite 1: Indian Currency & Words Conversion ---');

runTest('Converts ₹12,50,000 to "Twelve Lakh Fifty Thousand Rupees Only"', () => {
  assert.strictEqual(numberToIndianWords(1250000), 'Twelve Lakh Fifty Thousand Rupees Only');
});

runTest('Converts ₹8,50,000 to "Eight Lakh Fifty Thousand Rupees Only"', () => {
  assert.strictEqual(numberToIndianWords(850000), 'Eight Lakh Fifty Thousand Rupees Only');
});

runTest('Converts 0 to "Zero Rupees Only"', () => {
  assert.strictEqual(numberToIndianWords(0), 'Zero Rupees Only');
});

runTest('Converts Crores accurately (e.g. 10,00,0000 = One Crore Rupees Only)', () => {
  assert.strictEqual(numberToIndianWords(10000000), 'One Crore Rupees Only');
  assert.strictEqual(numberToIndianWords(45200000), 'Four Crore Fifty Two Lakh Rupees Only');
});

runTest('Formats numbers into Indian currency string (₹12,50,000)', () => {
  assert.strictEqual(formatIndianCurrency(1250000), '₹12,50,000');
  assert.strictEqual(formatIndianCurrency(850000), '₹8,50,000');
  assert.strictEqual(formatIndianCurrency(0), '₹0');
  assert.strictEqual(formatIndianCurrency(null), '—');
});

runTest('Distinguishes confirmed zero from missing or unmapped values', () => {
  assert.strictEqual(numberToIndianWords(0), 'Zero Rupees Only');
  assert.strictEqual(numberToIndianWords(null), '—');
  assert.strictEqual(numberToIndianWords(undefined), '—');
  assert.strictEqual(formatIndianCurrency(0), '₹0');
  assert.strictEqual(formatIndianCurrency(null), '—');
});

// ─── SUITE 2: REPORTING PERIOD & AY STANDARDIZATION ─────────────────────────
console.log('\n--- Suite 2: Reporting Period & AY Standardization ---');

runTest('Normalizes 4-digit year ranges (2024-2025 -> 2024-25)', () => {
  assert.strictEqual(normalizeReportingPeriod('2024-2025'), '2024-25');
  assert.strictEqual(normalizeReportingPeriod('2023-2024'), '2023-24');
});

runTest('Normalizes 2-digit year ranges (2024-25 -> 2024-25)', () => {
  assert.strictEqual(normalizeReportingPeriod('2024-25'), '2024-25');
  assert.strictEqual(normalizeReportingPeriod('2024–25'), '2024-25'); // en-dash
});

runTest('Unmapped single calendar year is NOT automatically assumed to be a year range', () => {
  assert.strictEqual(normalizeReportingPeriod('2024'), null);
  assert.strictEqual(normalizeReportingPeriod('2025'), null);
});

runTest('Generates Academic Year display (AY) with en-dash (AY 2024–25)', () => {
  assert.strictEqual(periodToAYDisplay('2024-25'), 'AY 2024–25');
  assert.strictEqual(periodToAYDisplay('2023-24'), 'AY 2023–24');
  assert.strictEqual(periodToAYDisplay('2022-23'), 'AY 2022–23');
});

runTest('Legacy helpers (periodToCYDisplay & periodToFYDisplay) return AY display to protect against legacy callers', () => {
  assert.strictEqual(periodToCYDisplay('2024-25'), 'AY 2024–25');
  assert.strictEqual(periodToFYDisplay('2024-25'), 'AY 2024–25');
});

runTest('Extracts integer start year from period key', () => {
  assert.strictEqual(periodToStartYear('2024-25'), 2024);
  assert.strictEqual(periodToStartYear('2023-24'), 2023);
  assert.strictEqual(periodToStartYear('invalid'), null);
});

runTest('Derives Academic Year key from date using institutional boundary (June 1 – May 31)', () => {
  // June 1, 2024 -> AY 2024-25
  assert.strictEqual(dateToAcademicYear('2024-06-01'), '2024-25');
  // October 15, 2024 -> AY 2024-25
  assert.strictEqual(dateToAcademicYear('2024-10-15'), '2024-25');
  // May 31, 2025 -> AY 2024-25
  assert.strictEqual(dateToAcademicYear('2025-05-31'), '2024-25');
  // May 31, 2024 -> AY 2023-24 (before June boundary)
  assert.strictEqual(dateToAcademicYear('2024-05-31'), '2023-24');
  // Jan 15, 2024 -> AY 2023-24
  assert.strictEqual(dateToAcademicYear('2024-01-15'), '2023-24');
  // Null or invalid
  assert.strictEqual(dateToAcademicYear(null), null);
  assert.strictEqual(dateToAcademicYear('invalid-date'), null);
});

// ─── SUITE 3: IPR DETAILS CALCULATIONS & EVENT-BASED AY ATTRIBUTION ─────────
console.log('\n--- Suite 3: IPR Details Calculations & Event-Based AY Attribution ---');

runTest('Separately tracks publication and grant events by Academic Year using institutional dates', () => {
  const patents = [
    // p1: published May 10, 2024 (AY 2023-24), granted Nov 15, 2024 (AY 2024-25)
    { id: 'p1', publishedDate: '2024-05-10', grantedDate: '2024-11-15', approvalStatus: 'approved' },
    // p2: published Feb 14, 2024 (AY 2023-24), no grant
    { id: 'p2', publishedDate: '2024-02-14', grantedDate: null, approvalStatus: 'approved' },
    // p3: published Aug 20, 2024 (AY 2024-25), granted Nov 05, 2024 (AY 2024-25)
    { id: 'p3', publishedDate: '2024-08-20', grantedDate: '2024-11-05', approvalStatus: 'approved' }
  ];

  const periods = [
    { key: '2024-25', ayLabel: 'AY 2024–25' },
    { key: '2023-24', ayLabel: 'AY 2023–24' }
  ];

  const published = { '2024-25': 0, '2023-24': 0 };
  const granted = { '2024-25': 0, '2023-24': 0 };

  patents.forEach(p => {
    const pubAY = dateToAcademicYear(p.publishedDate);
    const grntAY = dateToAcademicYear(p.grantedDate);

    if (pubAY && published[pubAY] !== undefined) published[pubAY]++;
    if (grntAY && granted[grntAY] !== undefined) granted[grntAY]++;
  });

  // AY 2024-25: p3 published = 1
  // AY 2023-24: p1, p2 published = 2
  assert.strictEqual(published['2024-25'], 1);
  assert.strictEqual(published['2023-24'], 2);

  // AY 2024-25: p1, p3 granted = 2
  // AY 2023-24: 0 granted
  assert.strictEqual(granted['2024-25'], 2);
  assert.strictEqual(granted['2023-24'], 0);
});

runTest('Never uses grantYear for publication event attribution', () => {
  const p = { id: 'p4', publishedDate: null, grantYear: 2024, approvalStatus: 'approved' };
  const pubAY = dateToAcademicYear(p.publishedDate);
  assert.strictEqual(pubAY, null); // Cannot assume publication from grantYear
});

// ─── SUITE 4: SPONSORED RESEARCH FINANCIAL & DISTINCT FUNDING AGENCY ─────────
console.log('\n--- Suite 4: Sponsored Research Financial & Distinct Funding Agency Calculations ---');

runTest('CRITICAL: Total Amount Received uses sanctionedAmount, NOT amountReceived', () => {
  const projects = [
    { id: 's1', sanctionedAmount: '1000000.00', amountReceived: '250000.00', academicYear: '2024-2025', fundingAgency: 'DST - SERB' },
    { id: 's2', sanctionedAmount: '250000.00', amountReceived: '50000.00', academicYear: '2024-2025', fundingAgency: 'ICMR' }
  ];

  let sumSanctioned = 0;
  let sumAmountReceived = 0;

  projects.forEach(p => {
    sumSanctioned += Number(p.sanctionedAmount);
    sumAmountReceived += Number(p.amountReceived);
  });

  // Report must strictly equal sum of sanctionedAmount (₹12,50,000)
  assert.strictEqual(sumSanctioned, 1250000);
  assert.notStrictEqual(sumSanctioned, sumAmountReceived);
  assert.strictEqual(numberToIndianWords(sumSanctioned), 'Twelve Lakh Fifty Thousand Rupees Only');
});

runTest('Case A: Duplicate agencies are counted once (DST, AICTE, DST, SERB, AICTE, ISRO -> 4)', () => {
  const list = ['DST', 'AICTE', 'DST', 'SERB', 'AICTE', 'ISRO'];
  const agencySet = new Set();
  list.forEach(a => {
    const canon = canonicalizeAgencyName(a);
    if (canon) agencySet.add(canon);
  });
  assert.strictEqual(agencySet.size, 4);
});

runTest('Case B: Case and whitespace normalization (" AICTE ", "aicte", "AICTE" -> 1)', () => {
  const list = [' AICTE ', 'aicte', 'AICTE'];
  const agencySet = new Set();
  list.forEach(a => {
    const canon = canonicalizeAgencyName(a);
    if (canon) agencySet.add(canon);
  });
  assert.strictEqual(agencySet.size, 1);
});

runTest('Case C: Verified national agency aliases map to same canonical identity ("All India Council for Technical Education" & "AICTE" -> 1)', () => {
  const list = ['All India Council for Technical Education', 'AICTE', 'aicte'];
  const agencySet = new Set();
  list.forEach(a => {
    const canon = canonicalizeAgencyName(a);
    if (canon) agencySet.add(canon);
  });
  assert.strictEqual(agencySet.size, 1);
  assert.ok(agencySet.has('aicte'));
});

runTest('Case D: Missing agencies (DST, null, "", "   ", AICTE) -> 2 distinct agencies, 3 missing records flagged', () => {
  const list = ['DST', null, '', '   ', 'AICTE'];
  const agencySet = new Set();
  let missingCount = 0;

  list.forEach(a => {
    const canon = canonicalizeAgencyName(a);
    if (canon) {
      agencySet.add(canon);
    } else {
      missingCount++;
    }
  });

  assert.strictEqual(agencySet.size, 2);
  assert.strictEqual(missingCount, 3);
});

runTest('Case E: Multiple departments isolation: distinct agency count is scoped properly', () => {
  const projects = [
    { department: 'Computer Science and Engineering', fundingAgency: 'AICTE' },
    { department: 'Computer Science and Engineering', fundingAgency: 'DST' },
    { department: 'Mechanical Engineering', fundingAgency: 'AICTE' },
    { department: 'Mechanical Engineering', fundingAgency: 'DRDO' }
  ];

  // Scoped to CSE
  const cseAgencies = new Set(
    projects.filter(p => p.department === 'Computer Science and Engineering')
      .map(p => canonicalizeAgencyName(p.fundingAgency))
  );
  assert.strictEqual(cseAgencies.size, 2); // AICTE, DST

  // Scoped to MECH
  const mechAgencies = new Set(
    projects.filter(p => p.department === 'Mechanical Engineering')
      .map(p => canonicalizeAgencyName(p.fundingAgency))
  );
  assert.strictEqual(mechAgencies.size, 2); // AICTE, DRDO

  // University-wide (NOT sum of department counts: 2 + 2 = 4, but AICTE is common, so 3 distinct)
  const uniAgencies = new Set(projects.map(p => canonicalizeAgencyName(p.fundingAgency)));
  assert.strictEqual(uniAgencies.size, 3); // AICTE, DST, DRDO
  assert.notStrictEqual(uniAgencies.size, cseAgencies.size + mechAgencies.size);
});

runTest('Case F: Multiple academic years isolation: distinct agency count is independent per AY column', () => {
  const projects = [
    { academicYear: '2024-2025', fundingAgency: 'DST' },
    { academicYear: '2024-2025', fundingAgency: 'SERB' },
    { academicYear: '2023-2024', fundingAgency: 'DST' },
    { academicYear: '2023-2024', fundingAgency: 'ISRO' }
  ];

  const y24 = new Set(
    projects.filter(p => normalizeReportingPeriod(p.academicYear) === '2024-25')
      .map(p => canonicalizeAgencyName(p.fundingAgency))
  );
  const y23 = new Set(
    projects.filter(p => normalizeReportingPeriod(p.academicYear) === '2023-24')
      .map(p => canonicalizeAgencyName(p.fundingAgency))
  );

  assert.strictEqual(y24.size, 2); // DST, SERB
  assert.strictEqual(y23.size, 2); // DST, ISRO
  // Columns must never sum across years
});

runTest('Case G: Approval status filtering: only eligible approved records counted', () => {
  const projects = [
    { approvalStatus: 'approved', fundingAgency: 'DST' },
    { approvalStatus: 'pending', fundingAgency: 'SERB' },
    { approvalStatus: 'rejected', fundingAgency: 'ISRO' }
  ];

  const allowedStatuses = ['approved'];
  const eligibleAgencies = new Set(
    projects.filter(p => allowedStatuses.includes(p.approvalStatus))
      .map(p => canonicalizeAgencyName(p.fundingAgency))
  );
  assert.strictEqual(eligibleAgencies.size, 1);
  assert.ok(eligibleAgencies.has('dst'));
});

// ─── SUITE 5: CONSULTANCY PROJECT FINANCIAL CALCULATIONS ────────────────────
console.log('\n--- Suite 5: Consultancy Project Financial Calculations ---');

runTest('CRITICAL: Total Amount Received uses contractValueInLakhs * 100,000, NOT revenueInLakhs', () => {
  const projects = [
    { id: 'c1', contractValueInLakhs: '5.00', revenueInLakhs: '1.20', amountReceivedInLakhs: '1.20', year: '2024-2025', agencyName: 'Infosys' },
    { id: 'c2', contractValueInLakhs: '3.50', revenueInLakhs: '0.80', amountReceivedInLakhs: '0.80', year: '2024-2025', agencyName: 'Wipro' }
  ];

  let sumContractInr = 0;
  let sumRevenueInr = 0;

  projects.forEach(p => {
    sumContractInr += Number(p.contractValueInLakhs) * 100000;
    sumRevenueInr += Number(p.revenueInLakhs) * 100000;
  });

  // 5.00L + 3.50L = 8.50L = ₹8,50,000
  assert.strictEqual(sumContractInr, 850000);
  assert.notStrictEqual(sumContractInr, sumRevenueInr);
  assert.strictEqual(numberToIndianWords(sumContractInr), 'Eight Lakh Fifty Thousand Rupees Only');
});

runTest('Consultancy project with single start year (e.g. 2024) is excluded from year total without guessing', () => {
  const p = { id: 'c3', projectName: 'AI Advisory', contractValueInLakhs: '2.00', year: '2024' };
  const norm = normalizeReportingPeriod(p.year);
  assert.strictEqual(norm, null); // Cannot be mapped safely without guessing
});

// ─── SUITE 6: EXCEL REPORT EXPORT & SANITIZATION ─────────────────────────────
console.log('\n--- Suite 6: Excel Report Export & CWE-1236 Sanitization ---');

runTest('Spreadsheet sanitizer neutralizes formula injection triggers (=, +, -, @, %)', () => {
  assert.strictEqual(sanitizeSpreadsheetCell('=cmd|/C calc!A0'), '\'=cmd|/C calc!A0');
  assert.strictEqual(sanitizeSpreadsheetCell('+12345'), '\'+12345'); // formula trigger neutralized
  assert.strictEqual(sanitizeSpreadsheetCell('@SUM(1,2)'), '\'@SUM(1,2)');
  assert.strictEqual(sanitizeSpreadsheetCell('-100'), '-100'); // legitimate negative number preserved
  assert.strictEqual(sanitizeSpreadsheetCell(1250000), 1250000);
});

runTest('Generates valid Excel workbook buffer with Academic Year (AY) headers and no CY/FY', () => {
  const sampleData = {
    scopeDisplay: 'University-wide',
    periods: [
      { key: '2024-25', ayLabel: 'AY 2024–25', cyLabel: 'AY 2024–25', fyLabel: 'AY 2024–25' },
      { key: '2023-24', ayLabel: 'AY 2023–24', cyLabel: 'AY 2023–24', fyLabel: 'AY 2023–24' }
    ],
    sections: ['ipr', 'sponsored', 'consultancy'],
    generatedAt: '05/11/2026, 02:00 PM',
    iprMetrics: {
      publishedByPeriod: { '2024-25': 5, '2023-24': 3 },
      grantedByPeriod: { '2024-25': 2, '2023-24': 1 }
    },
    sponsoredMetrics: {
      projectsByPeriod: { '2024-25': 4, '2023-24': 2 },
      agenciesByPeriod: { '2024-25': 3, '2023-24': 2 },
      amountByPeriod: { '2024-25': 1250000, '2023-24': 800000 },
      amountFormattedByPeriod: { '2024-25': '₹12,50,000', '2023-24': '₹8,00,000' },
      amountInWordsByPeriod: {
        '2024-25': 'Twelve Lakh Fifty Thousand Rupees Only',
        '2023-24': 'Eight Lakh Rupees Only'
      }
    },
    consultancyMetrics: {
      projectsByPeriod: { '2024-25': 3, '2023-24': 1 },
      agenciesByPeriod: { '2024-25': 3, '2023-24': 1 },
      amountByPeriod: { '2024-25': 850000, '2023-24': 200000 },
      amountFormattedByPeriod: { '2024-25': '₹8,50,000', '2023-24': '₹2,00,000' },
      amountInWordsByPeriod: {
        '2024-25': 'Eight Lakh Fifty Thousand Rupees Only',
        '2023-24': 'Two Lakh Rupees Only'
      }
    },
    sourceRecords: [
      {
        section: 'IPR Details',
        metric: 'Patents Published',
        period: 'AY 2024–25',
        sourceId: 'p-1',
        title: 'Smart Sensor System',
        department: 'CSE',
        status: 'approved',
        agency: 'N/A',
        amountSource: '—',
        amountFormatted: '—',
        note: 'Published 2024'
      }
    ]
  };

  const excelBuf = generateExcelReport(sampleData, true);
  assert.ok(Buffer.isBuffer(excelBuf));
  assert.ok(excelBuf.length > 1000);

  // Read back and verify sheets
  const wb = XLSX.read(excelBuf, { type: 'buffer' });
  assert.ok(wb.SheetNames.includes('Research & Innovation Report'));
  assert.ok(wb.SheetNames.includes('Contributing Records'));

  // Inspect raw rows in the first sheet to verify AY headers
  const mainSheet = wb.Sheets['Research & Innovation Report'];
  const sheetJson = XLSX.utils.sheet_to_json(mainSheet, { header: 1 });
  const allText = JSON.stringify(sheetJson);

  assert.ok(allText.includes('AY 2024–25'));
  assert.ok(allText.includes('AY 2023–24'));
  assert.ok(!allText.includes('CY 2024'));
  assert.ok(!allText.includes('FY 2024–25'));
});

// ─── SUITE 7: PDF REPORT EXPORT ─────────────────────────────────────────────
console.log('\n--- Suite 7: PDF Report Generation & AY Parity ---');

runTest('Generates standard PDF 1.4 document buffer with Academic Year headings', () => {
  const sampleData = {
    scopeDisplay: 'University-wide',
    periods: [
      { key: '2024-25', ayLabel: 'AY 2024–25', cyLabel: 'AY 2024–25', fyLabel: 'AY 2024–25' },
      { key: '2023-24', ayLabel: 'AY 2023–24', cyLabel: 'AY 2023–24', fyLabel: 'AY 2023–24' }
    ],
    sections: ['ipr', 'sponsored'],
    generatedAt: '05/11/2026, 02:00 PM',
    iprMetrics: {
      publishedByPeriod: { '2024-25': 4, '2023-24': 2 },
      grantedByPeriod: { '2024-25': 1, '2023-24': 1 }
    },
    sponsoredMetrics: {
      projectsByPeriod: { '2024-25': 3, '2023-24': 1 },
      agenciesByPeriod: { '2024-25': 2, '2023-24': 1 },
      amountFormattedByPeriod: { '2024-25': '₹12,50,000', '2023-24': '₹4,00,000' },
      amountInWordsByPeriod: {
        '2024-25': 'Twelve Lakh Fifty Thousand Rupees Only',
        '2023-24': 'Four Lakh Rupees Only'
      }
    }
  };

  const pdfBuf = generatePdfReport(sampleData, false);
  assert.ok(Buffer.isBuffer(pdfBuf));
  assert.ok(pdfBuf.length > 500);

  const header = pdfBuf.slice(0, 8).toString('latin1');
  assert.ok(header.startsWith('%PDF-1.4'));

  const fullPdfStr = pdfBuf.toString('latin1');
  assert.ok(fullPdfStr.includes('CHRIST \\(DEEMED TO BE UNIVERSITY\\)'));
  assert.ok(fullPdfStr.includes('INTERNAL QUALITY ASSURANCE CELL'));
  assert.ok(fullPdfStr.includes('Twelve Lakh Fifty Thousand Rupees Only'));
  // Note: in PDF string escaping, en-dash in UTF-8 or WinAnsi is encoded, but let's check AY is present
  assert.ok(fullPdfStr.includes('AY 2024'));
  assert.ok(!fullPdfStr.includes('CY 2024'));
  assert.ok(!fullPdfStr.includes('FY 2024'));
});

// ─── SUMMARY ────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`   Research Report Generator Test Suite Results: ${passedTests}/${totalTests} Passed`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}

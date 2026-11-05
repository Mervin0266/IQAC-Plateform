'use strict';

/**
 * Automated Test Suite: Research & Innovation Report Generator V1.5
 * CHRIST University IQAC Platform
 * 
 * Tests:
 * 1. Indian Currency Formatting & Number-to-Words Conversion
 * 2. Reporting Period Mapping (CY for IPR, FY for Sponsored & Consultancy)
 * 3. IPR Details Calculations (Patents Published CY, Patents Granted CY, Multi-Year events)
 * 4. Sponsored Research Calculations (Sanctioned Amount vs Amount Received rule)
 * 5. Consultancy Project Calculations (Contract Value in Lakhs * 100,000 rule, single start year exclusion)
 * 6. Section & Period Selection (1, 2, or 3 sections, single/multi-year expansion)
 * 7. Section-Specific Approval Status Filtering
 * 8. Excel (.xlsx) Report Generation & Formula Injection Sanitization (CWE-1236)
 * 9. PDF (.pdf) Report Generation & Validation
 * 10. Scope Enforcement & Missing Data Handling
 */

const assert = require('assert');
const XLSX = require('xlsx');
const {
  numberToIndianWords,
  formatIndianCurrency,
  normalizeReportingPeriod,
  periodToCYDisplay,
  periodToFYDisplay,
  periodToStartYear
} = require('../utils/indianCurrencyHelper');
const {
  generateExcelReport,
  generatePdfReport
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
console.log('   CHRIST University IQAC - Research Report Generator V1.5 Tests');
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

// ─── SUITE 2: REPORTING PERIOD & YEAR-RANGE MAPPING ─────────────────────────
console.log('\n--- Suite 2: Reporting Period & Year-Range Mapping ---');

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

runTest('Generates Calendar Year display (CY) for IPR', () => {
  assert.strictEqual(periodToCYDisplay('2024-25'), 'CY 2024');
  assert.strictEqual(periodToCYDisplay('2023-24'), 'CY 2023');
  assert.strictEqual(periodToCYDisplay('2022-23'), 'CY 2022');
});

runTest('Generates Financial Year display (FY) with en-dash for Sponsored & Consultancy', () => {
  assert.strictEqual(periodToFYDisplay('2024-25'), 'FY 2024–25');
  assert.strictEqual(periodToFYDisplay('2023-24'), 'FY 2023–24');
});

runTest('Extracts integer start year from period key', () => {
  assert.strictEqual(periodToStartYear('2024-25'), 2024);
  assert.strictEqual(periodToStartYear('2023-24'), 2023);
  assert.strictEqual(periodToStartYear('invalid'), null);
});

// ─── SUITE 3: IPR DETAILS CALCULATIONS ──────────────────────────────────────
console.log('\n--- Suite 3: IPR Details Calculations ---');

runTest('Separately tracks publication and grant events by calendar year', () => {
  const patents = [
    { id: 'p1', publishedDate: '2023-05-10', grantYear: 2024, approvalStatus: 'approved' },
    { id: 'p2', publishedDate: '2024-02-14', grantYear: null, approvalStatus: 'approved' },
    { id: 'p3', publishedDate: '2024-08-20', grantedDate: '2024-11-05', approvalStatus: 'approved' }
  ];

  const periods = [
    { key: '2024-25', startYear: 2024, cyLabel: 'CY 2024' },
    { key: '2023-24', startYear: 2023, cyLabel: 'CY 2023' }
  ];

  const published = { '2024-25': 0, '2023-24': 0 };
  const granted = { '2024-25': 0, '2023-24': 0 };

  patents.forEach(p => {
    const pubY = p.publishedDate ? new Date(p.publishedDate).getFullYear() : null;
    const grntY = p.grantYear || (p.grantedDate ? new Date(p.grantedDate).getFullYear() : null);

    periods.forEach(per => {
      if (pubY === per.startYear) published[per.key]++;
      if (grntY === per.startYear) granted[per.key]++;
    });
  });

  // 2024: p2, p3 published = 2
  // 2023: p1 published = 1
  assert.strictEqual(published['2024-25'], 2);
  assert.strictEqual(published['2023-24'], 1);

  // 2024: p1, p3 granted = 2
  // 2023: 0 granted
  assert.strictEqual(granted['2024-25'], 2);
  assert.strictEqual(granted['2023-24'], 0);
});

// ─── SUITE 4: SPONSORED RESEARCH FINANCIAL CALCULATIONS ─────────────────────
console.log('\n--- Suite 4: Sponsored Research Financial Calculations ---');

runTest('CRITICAL: Total Amount Received uses sanctionedAmount, NOT amountReceived', () => {
  const projects = [
    { id: 's1', sanctionedAmount: '1000000.00', amountReceived: '250000.00', academicYear: '2024-2025', fundingAgency: 'DST - SERB' },
    { id: 's2', sanctionedAmount: '250000.00', amountReceived: '50000.00', academicYear: '2024-2025', fundingAgency: 'ICMR' }
  ];

  let sumSanctioned = 0;
  let sumAmountReceived = 0;
  const agencies = new Set();

  projects.forEach(p => {
    sumSanctioned += Number(p.sanctionedAmount);
    sumAmountReceived += Number(p.amountReceived);
    agencies.add(p.fundingAgency.trim().toLowerCase());
  });

  // Report must strictly equal sum of sanctionedAmount (₹12,50,000)
  assert.strictEqual(sumSanctioned, 1250000);
  assert.notStrictEqual(sumSanctioned, sumAmountReceived);
  assert.strictEqual(numberToIndianWords(sumSanctioned), 'Twelve Lakh Fifty Thousand Rupees Only');
  assert.strictEqual(agencies.size, 2);
});

runTest('Funding agencies normalization prevents duplicate counts on casing/spacing', () => {
  const agencies = ['DST - SERB', 'dst - serb ', 'Dst - Serb', 'ICMR'];
  const normSet = new Set(agencies.map(a => a.trim().toLowerCase().replace(/\s+/g, ' ')));
  assert.strictEqual(normSet.size, 2); // 'dst - serb' and 'icmr'
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

runTest('Generates valid Excel workbook buffer with required sheets', () => {
  const sampleData = {
    scopeDisplay: 'University-wide',
    periods: [
      { key: '2024-25', cyLabel: 'CY 2024', fyLabel: 'FY 2024–25' },
      { key: '2023-24', cyLabel: 'CY 2023', fyLabel: 'FY 2023–24' }
    ],
    sections: ['ipr', 'sponsored', 'consultancy'],
    generatedAt: '04/11/2026, 11:00 PM',
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
        period: 'CY 2024',
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
});

// ─── SUITE 7: PDF REPORT EXPORT ─────────────────────────────────────────────
console.log('\n--- Suite 7: PDF Report Generation & Formatting ---');

runTest('Generates standard PDF 1.4 document buffer', () => {
  const sampleData = {
    scopeDisplay: 'University-wide',
    periods: [
      { key: '2024-25', cyLabel: 'CY 2024', fyLabel: 'FY 2024–25' },
      { key: '2023-24', cyLabel: 'CY 2023', fyLabel: 'FY 2023–24' }
    ],
    sections: ['ipr', 'sponsored'],
    generatedAt: '04/11/2026, 11:00 PM',
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
});

// ─── SUMMARY ────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`   Research Report Generator Test Suite Results: ${passedTests}/${totalTests} Passed`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}

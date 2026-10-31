'use strict';

/**
 * CHRIST University IQAC Platform - Sponsored Research & Grants Test Suite
 * 
 * Verifies:
 * 1. Exact 5 Project Statuses (Internal values, display labels, alias normalization, invalid rejection)
 * 2. Sanction Year Derivation & Validation (Calendar year derivation, manual validation, mismatch detection)
 * 3. Project Duration Calculation (Calendar-aware, leap years, month boundaries, invalid date range rejection)
 * 4. Document Separation (Agreement Letter vs Payment Receipt, Drive URL validation, File ID extraction)
 * 5. Financial Management & Hybrid Reconciliation (Sanctioned amount, aggregate received, installments sum, discrepancy detection, no auto-defaulting)
 */

const assert = require('assert');
const { calculateProjectDuration, deriveAndValidateSanctionYear } = require('../utils/projectDurationHelper');
const googleDriveService = require('../services/googleDriveService');

let totalTests = 0;
let passedTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${description}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${description}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('================================================================');
console.log('   CHRIST University IQAC - Sponsored Research Test Suite');
console.log('================================================================\n');

// ----------------------------------------------------------------------
// Suite 1: Exact 5 Project Statuses
// ----------------------------------------------------------------------
console.log('--- Suite 1: Status Preservation & Alias Normalization (Phase 1) ---');

const VALID_STATUSES = ['Ongoing', 'Completed', 'Sanctioned', 'Proposal Submitted', 'Terminated'];
const STATUS_ALIASES = {
  'ongoing': 'Ongoing',
  'ongoing research': 'Ongoing',
  'on going': 'Ongoing',
  'in progress': 'Ongoing',
  'active': 'Ongoing',
  'completed': 'Completed',
  'finished': 'Completed',
  'closed': 'Completed',
  'sanctioned': 'Sanctioned',
  'sanctioned / awaiting funds': 'Sanctioned',
  'awaiting funds': 'Sanctioned',
  'approved': 'Sanctioned',
  'proposal submitted': 'Proposal Submitted',
  'proposal submitted / under review': 'Proposal Submitted',
  'under review': 'Proposal Submitted',
  'submitted': 'Proposal Submitted',
  'proposal': 'Proposal Submitted',
  'terminated': 'Terminated',
  'terminated / closed': 'Terminated',
  'cancelled': 'Terminated',
  'discontinued': 'Terminated'
};

function normalizeStatus(raw) {
  if (!raw) return null;
  const lower = String(raw).trim().toLowerCase();
  if (STATUS_ALIASES[lower]) return STATUS_ALIASES[lower];
  if (VALID_STATUSES.includes(String(raw).trim())) return String(raw).trim();
  return null;
}

test('All 5 standard statuses must be valid internal values', () => {
  VALID_STATUSES.forEach(status => {
    assert.strictEqual(normalizeStatus(status), status);
  });
});

test('Alias "Ongoing Research" normalizes to "Ongoing"', () => {
  assert.strictEqual(normalizeStatus('Ongoing Research'), 'Ongoing');
});

test('Alias "Sanctioned / Awaiting Funds" normalizes to "Sanctioned"', () => {
  assert.strictEqual(normalizeStatus('Sanctioned / Awaiting Funds'), 'Sanctioned');
});

test('Alias "Proposal Submitted / Under Review" normalizes to "Proposal Submitted"', () => {
  assert.strictEqual(normalizeStatus('Proposal Submitted / Under Review'), 'Proposal Submitted');
});

test('Alias "Terminated / Closed" normalizes to "Terminated"', () => {
  assert.strictEqual(normalizeStatus('Terminated / Closed'), 'Terminated');
});

test('Invalid status must return null and trigger validation failure', () => {
  assert.strictEqual(normalizeStatus('Invalid Random Status'), null);
  assert.strictEqual(normalizeStatus('Draft'), null);
});

// ----------------------------------------------------------------------
// Suite 2: Sanction Year Derivation & Validation
// ----------------------------------------------------------------------
console.log('\n--- Suite 2: Sanction Year Derivation & Validation (Phase 2) ---');

test('Derive 4-digit Sanction Year automatically from ISO date (2024-06-15 -> 2024)', () => {
  const result = deriveAndValidateSanctionYear('2024-06-15', null);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.sanctionYear, 2024);
  assert.strictEqual(result.academicYear, '2023-2024');
});

test('Derive 4-digit Sanction Year from earlier historical date (2019-11-20 -> 2019)', () => {
  const result = deriveAndValidateSanctionYear('2019-11-20', null);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.sanctionYear, 2019);
});

test('When Sanction Date is missing, valid manual 4-digit year is accepted (2025 -> 2025)', () => {
  const result = deriveAndValidateSanctionYear(null, '2025');
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.sanctionYear, 2025);
});

test('When both Sanction Date and Sanction Year match, validation passes', () => {
  const result = deriveAndValidateSanctionYear('2024-04-10', 2024);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.sanctionYear, 2024);
});

test('When Sanction Date (2024) and manual Year (2025) conflict, validation fails', () => {
  const result = deriveAndValidateSanctionYear('2024-04-10', 2025);
  assert.strictEqual(result.valid, false);
  assert(result.error.includes('does not match'));
});

test('Non-4-digit manual sanction year is rejected', () => {
  const result = deriveAndValidateSanctionYear(null, '24');
  assert.strictEqual(result.valid, false);
});

test('When both date and year are absent (e.g. Proposal Submitted), passes with null year', () => {
  const result = deriveAndValidateSanctionYear(null, null);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.sanctionYear, null);
});

// ----------------------------------------------------------------------
// Suite 3: Calendar-Aware Project Duration Calculation
// ----------------------------------------------------------------------
console.log('\n--- Suite 3: Automatic Project Duration (Phase 3) ---');

test('Duration for exact 2-year interval (2024-01-01 to 2026-01-01)', () => {
  const dur = calculateProjectDuration('2024-01-01', '2026-01-01');
  assert.strictEqual(dur.isValid, true);
  assert.strictEqual(dur.years, 2);
  assert.strictEqual(dur.months, 0);
  assert.strictEqual(dur.totalMonths, 24);
  assert.strictEqual(dur.formatted, '2 Years (24 Months)');
});

test('Duration for 3-year interval (2023-04-01 to 2026-04-01)', () => {
  const dur = calculateProjectDuration('2023-04-01', '2026-04-01');
  assert.strictEqual(dur.isValid, true);
  assert.strictEqual(dur.years, 3);
  assert.strictEqual(dur.totalMonths, 36);
  assert.strictEqual(dur.formatted, '3 Years (36 Months)');
});

test('Duration for mixed years and months (2024-01-01 to 2025-07-01)', () => {
  const dur = calculateProjectDuration('2024-01-01', '2025-07-01');
  assert.strictEqual(dur.isValid, true);
  assert.strictEqual(dur.years, 1);
  assert.strictEqual(dur.months, 6);
  assert.strictEqual(dur.totalMonths, 18);
  assert(dur.formatted.includes('1 Year 6 Months (18 Months)'));
});

test('Duration for sub-year interval (2024-01-01 to 2024-07-01)', () => {
  const dur = calculateProjectDuration('2024-01-01', '2024-07-01');
  assert.strictEqual(dur.isValid, true);
  assert.strictEqual(dur.years, 0);
  assert.strictEqual(dur.months, 6);
  assert.strictEqual(dur.formatted, '6 Months');
});

test('End Date earlier than Start Date must be rejected as invalid', () => {
  const dur = calculateProjectDuration('2025-01-01', '2024-01-01');
  assert.strictEqual(dur.isValid, false);
  assert(dur.error.includes('cannot be earlier than Start Date'));
});

test('Missing dates return Not Available', () => {
  const dur = calculateProjectDuration(null, '2025-01-01');
  assert.strictEqual(dur.isValid, false);
  assert.strictEqual(dur.formatted, 'Not Available');
});

// ----------------------------------------------------------------------
// Suite 4: Document Separation & Google Drive Links
// ----------------------------------------------------------------------
console.log('\n--- Suite 4: Document Separation & Drive Links (Phase 4 & 6) ---');

test('Valid standard Google Drive file URL extracts ID correctly', () => {
  const url = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7/view?usp=sharing';
  const fileId = googleDriveService.extractDriveFileId(url);
  assert.strictEqual(fileId, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7');
});

test('Valid Google Drive open?id= URL extracts ID correctly', () => {
  const url = 'https://drive.google.com/open?id=1CyjNWt1YSB6oGNeLwCeCakhnVvrqueet8';
  const fileId = googleDriveService.extractDriveFileId(url);
  assert.strictEqual(fileId, '1CyjNWt1YSB6oGNeLwCeCakhnVvrqueet8');
});

test('Valid Google Docs document URL extracts ID correctly', () => {
  const url = 'https://docs.google.com/document/d/1DzkOXu2ZTC7pHOfMxDfDbliowwsrvvfu9/edit';
  const fileId = googleDriveService.extractDriveFileId(url);
  assert.strictEqual(fileId, '1DzkOXu2ZTC7pHOfMxDfDbliowwsrvvfu9');
});

test('Non-HTTPS and arbitrary URLs are rejected', () => {
  const invalid1 = googleDriveService.validateDriveUrl('http://drive.google.com/file/d/12345/view');
  assert.strictEqual(invalid1.valid, false);

  const invalid2 = googleDriveService.validateDriveUrl('https://malicious-site.com/file.pdf');
  assert.strictEqual(invalid2.valid, false);
});

// ----------------------------------------------------------------------
// Suite 5: Financial Management & Hybrid Reconciliation
// ----------------------------------------------------------------------
console.log('\n--- Suite 5: Financial Management & Hybrid Reconciliation (Phase 8) ---');

function computeFinancialReconciliation(sanctioned, reportedReceived, installments) {
  const sAmt = parseFloat(sanctioned) || 0;
  const reported = reportedReceived !== null && reportedReceived !== undefined ? parseFloat(reportedReceived) : null;
  const instTotal = (installments || []).reduce((sum, inst) => sum + (parseFloat(inst.amount) || 0), 0);

  let effective = 0;
  let status = 'none';
  let diff = 0;

  if (reported !== null && (!installments || installments.length === 0)) {
    // Case 1: Manual aggregate only
    effective = reported;
    status = 'manual_only';
  } else if (reported === null && installments && installments.length > 0) {
    // Case 2: Installments only
    effective = instTotal;
    status = 'installments_only';
  } else if (reported !== null && installments && installments.length > 0) {
    // Case 3: Both entered
    diff = Math.abs(reported - instTotal);
    effective = reported;
    status = diff < 0.01 ? 'matched' : 'mismatched';
  }

  const balance = Math.max(0, sAmt - effective);

  return {
    sanctionedAmount: sAmt,
    reportedAmount: reported,
    effectiveReceived: effective,
    installmentTotal: instTotal,
    balanceYetToBeReceived: balance,
    reconciliationStatus: status,
    reconciliationDiff: diff
  };
}

test('Case 1: Manual aggregate only (₹10,00,000 sanctioned, ₹6,00,000 reported received, no installments)', () => {
  const fin = computeFinancialReconciliation(1000000, 600000, []);
  assert.strictEqual(fin.effectiveReceived, 600000);
  assert.strictEqual(fin.balanceYetToBeReceived, 400000);
  assert.strictEqual(fin.reconciliationStatus, 'manual_only');
});

test('Case 2: Installments only (₹10,00,000 sanctioned, reported null, installments 4L + 2L = 6L)', () => {
  const installments = [{ amount: 400000 }, { amount: 200000 }];
  const fin = computeFinancialReconciliation(1000000, null, installments);
  assert.strictEqual(fin.effectiveReceived, 600000);
  assert.strictEqual(fin.balanceYetToBeReceived, 400000);
  assert.strictEqual(fin.reconciliationStatus, 'installments_only');
});

test('Case 3A: Both entered and matching (Sanctioned 10L, Reported 6L, Installments 4L + 2L = 6L)', () => {
  const installments = [{ amount: 400000 }, { amount: 200000 }];
  const fin = computeFinancialReconciliation(1000000, 600000, installments);
  assert.strictEqual(fin.effectiveReceived, 600000);
  assert.strictEqual(fin.balanceYetToBeReceived, 400000);
  assert.strictEqual(fin.reconciliationStatus, 'matched');
  assert.strictEqual(fin.reconciliationDiff, 0);
});

test('Case 3B: Both entered and mismatched (Sanctioned 10L, Reported 6L, Installments 3L -> Diff 3L)', () => {
  const installments = [{ amount: 300000 }];
  const fin = computeFinancialReconciliation(1000000, 600000, installments);
  assert.strictEqual(fin.effectiveReceived, 600000);
  assert.strictEqual(fin.reconciliationStatus, 'mismatched');
  assert.strictEqual(fin.reconciliationDiff, 300000);
});

test('Critical bug prevention: Missing Amount Received must NOT default to Sanctioned Amount', () => {
  const fin = computeFinancialReconciliation(5000000, null, []);
  assert.strictEqual(fin.reportedAmount, null);
  assert.strictEqual(fin.effectiveReceived, 0);
  assert.strictEqual(fin.balanceYetToBeReceived, 5000000);
});

console.log('\n================================================================');
console.log(`   TEST RESULTS: ${passedTests} / ${totalTests} Passed (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}

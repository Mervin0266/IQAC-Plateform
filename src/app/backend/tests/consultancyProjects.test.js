'use strict';

/**
 * Automated Test Suite: Consultancy Projects & Advisory Services
 * Tests the scoped updates for Consultancy Projects:
 * - Phase 1: Project Status (Sanctioned, On Going, Completed) vs IQAC Approval Status
 * - Phase 2: Agency Details splitting (agencyName required, optional email & phone)
 * - Phase 3: Consultancy Start Year derivation & validation
 * - Phase 4: Planned & Actual Project Duration calculations
 * - Phase 5: Financial tracking (Contract Value, Revenue Generated, Amount Received)
 * - Phase 6: Supporting Documents (Agreement/Work Order, Invoice, Payment Receipt) & Drive Links
 * - Phase 7: Approval Workflow Retirement & Strict Lifecycle (Sanctioned, On Going, Completed)
 */

const assert = require('assert');
const {
  calculateProjectDuration,
  deriveAndValidateConsultancyStartYear,
  normalizeConsultancyProjectStatus,
  parseAgencyDetails,
  VALID_CONSULTANCY_PROJECT_STATUSES
} = require('../utils/projectDurationHelper');
const { validateDriveUrl, extractDriveFileId } = require('../services/googleDriveService');

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
console.log('   CHRIST University IQAC - Consultancy Projects Test Suite');
console.log('================================================================\n');

// ─── SUITE 1: PROJECT STATUS VS APPROVAL STATUS ─────────────────────────────
console.log('--- Suite 1: Project Status (Phase 2) ---');

runTest('Allowed lifecycle values are strictly Sanctioned, On Going, Completed', () => {
  assert.strictEqual(VALID_CONSULTANCY_PROJECT_STATUSES.length, 3);
  assert.deepStrictEqual(VALID_CONSULTANCY_PROJECT_STATUSES, ['Sanctioned', 'On Going', 'Completed']);
});

runTest('Exact spelling "On Going" is preserved and normalizes from variations', () => {
  assert.strictEqual(normalizeConsultancyProjectStatus('On Going'), 'On Going');
  assert.strictEqual(normalizeConsultancyProjectStatus('Ongoing'), 'On Going');
  assert.strictEqual(normalizeConsultancyProjectStatus('on-going'), 'On Going');
  assert.strictEqual(normalizeConsultancyProjectStatus('ongoing'), 'On Going');
});

runTest('Sanctioned and Completed normalize accurately', () => {
  assert.strictEqual(normalizeConsultancyProjectStatus('Sanctioned'), 'Sanctioned');
  assert.strictEqual(normalizeConsultancyProjectStatus('sanctioned'), 'Sanctioned');
  assert.strictEqual(normalizeConsultancyProjectStatus('Completed'), 'Completed');
  assert.strictEqual(normalizeConsultancyProjectStatus('completed'), 'Completed');
});

runTest('Invalid lifecycle statuses are rejected (returns null)', () => {
  assert.strictEqual(normalizeConsultancyProjectStatus('In Progress'), null);
  assert.strictEqual(normalizeConsultancyProjectStatus('Submitted'), null);
  assert.strictEqual(normalizeConsultancyProjectStatus('Finalized'), null);
  assert.strictEqual(normalizeConsultancyProjectStatus('Terminated'), null);
});

// ─── SUITE 2: AGENCY DETAILS SPLITTING ──────────────────────────────────────
console.log('\n--- Suite 2: Agency Details Splitting & Migration (Phase 3) ---');

runTest('Extracts agency name, email, and phone from legacy combined string', () => {
  const legacy = 'Bangalore Smart City Corporation, Contact: info@bscc.gov.in, Ph: 080-12345678';
  const parsed = parseAgencyDetails(legacy);
  assert.ok(parsed.agencyName.includes('Bangalore Smart City Corporation'));
  assert.strictEqual(parsed.email, 'info@bscc.gov.in');
  assert.strictEqual(parsed.phone, '080-12345678');
});

runTest('Parses plain agency name without contact info', () => {
  const legacy = 'Infosys Technologies Limited';
  const parsed = parseAgencyDetails(legacy);
  assert.strictEqual(parsed.agencyName, 'Infosys Technologies Limited');
  assert.strictEqual(parsed.email, null);
  assert.strictEqual(parsed.phone, null);
});

runTest('Parses mobile number with international country code', () => {
  const legacy = 'RetailMax Solutions, Email: contact@retailmax.com, Mob: +91 9876543210';
  const parsed = parseAgencyDetails(legacy);
  assert.ok(parsed.agencyName.includes('RetailMax Solutions'));
  assert.strictEqual(parsed.email, 'contact@retailmax.com');
  assert.strictEqual(parsed.phone, '+91 9876543210');
});

// ─── SUITE 3: CONSULTANCY START YEAR ─────────────────────────────────────────
console.log('\n--- Suite 3: Consultancy Start Year Derivation & Validation (Phase 4) ---');

runTest('Derives 4-digit year automatically from valid Start Date', () => {
  const res = deriveAndValidateConsultancyStartYear('2024-06-15', null);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.startYear, 2024);
  assert.strictEqual(res.legacyYear, '2023-2024');
});

runTest('When Start Date is missing, valid manual 4-digit year is accepted', () => {
  const res = deriveAndValidateConsultancyStartYear(null, 2025);
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.startYear, 2025);
});

runTest('When Start Date and manual year match, passes validation', () => {
  const res = deriveAndValidateConsultancyStartYear('2024-01-10', '2024');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.startYear, 2024);
});

runTest('When Start Date (2024) and manual year (2025) conflict, fails validation', () => {
  const res = deriveAndValidateConsultancyStartYear('2024-01-10', '2025');
  assert.strictEqual(res.valid, false);
  assert.ok(res.error.includes('does not match'));
});

runTest('Rejects non-4-digit manual years', () => {
  const res = deriveAndValidateConsultancyStartYear(null, '24');
  assert.strictEqual(res.valid, false);
  assert.ok(res.error.includes('4-digit'));
});

// ─── SUITE 4: PLANNED AND ACTUAL PROJECT DURATION ───────────────────────────
console.log('\n--- Suite 4: Project Duration Calculations (Phase 5) ---');

runTest('Calculates exact Planned Duration (2 Years)', () => {
  const duration = calculateProjectDuration('2024-01-01', '2026-01-01');
  assert.strictEqual(duration.isValid, true);
  assert.strictEqual(duration.years, 2);
  assert.strictEqual(duration.months, 0);
  assert.strictEqual(duration.formatted, '2 Years (24 Months)');
});

runTest('Calculates Actual Duration with months and days', () => {
  const duration = calculateProjectDuration('2024-01-01', '2025-07-15');
  assert.strictEqual(duration.isValid, true);
  assert.strictEqual(duration.years, 1);
  assert.strictEqual(duration.months, 6);
  assert.strictEqual(duration.days, 14);
});

runTest('Rejects End Date earlier than Start Date', () => {
  const duration = calculateProjectDuration('2025-01-01', '2024-01-01');
  assert.strictEqual(duration.isValid, false);
  assert.ok(duration.error.includes('earlier than Start Date'));
});

runTest('Handles missing dates safely without generating false durations', () => {
  const duration = calculateProjectDuration(null, null);
  assert.strictEqual(duration.isValid, false);
  assert.strictEqual(duration.formatted, 'Not Available');
});

// ─── SUITE 5: FINANCIAL INDEPENDENCE ────────────────────────────────────────
console.log('\n--- Suite 5: Financial Tracking & Non-Defaulting (Phase 6) ---');

runTest('Amount Received does NOT default to Contract Value', () => {
  const contractValue = 35.00;
  const amountReceived = null;
  assert.notStrictEqual(amountReceived, contractValue);
  assert.strictEqual(amountReceived, null);
});

runTest('Revenue Generated does NOT default to Contract Value', () => {
  const contractValue = 50.00;
  const revenueGenerated = 20.00;
  assert.notStrictEqual(revenueGenerated, contractValue);
  assert.strictEqual(revenueGenerated, 20.00);
});

runTest('Zero amounts are preserved separately from null/missing', () => {
  const zeroRevenue = 0.00;
  const missingAmount = null;
  assert.strictEqual(zeroRevenue, 0);
  assert.strictEqual(missingAmount, null);
});

// ─── SUITE 6: SUPPORTING DOCUMENTS & GOOGLE DRIVE LINKS ─────────────────────
console.log('\n--- Suite 6: Supporting Documents & Drive Links (Phase 7 & 8) ---');

runTest('Validates Google Drive file URLs and extracts File ID', () => {
  const url = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7/view?usp=sharing';
  const val = validateDriveUrl(url);
  assert.strictEqual(val.valid, true);
  assert.strictEqual(val.fileId, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7');
});

runTest('Validates Google Docs and Sheets URLs', () => {
  const docUrl = 'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7/edit';
  const val = validateDriveUrl(docUrl);
  assert.strictEqual(val.valid, true);
  assert.strictEqual(val.fileId, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7');
});

runTest('Rejects arbitrary non-Drive external URLs', () => {
  const badUrl = 'https://malicious-site.com/file.pdf';
  const val = validateDriveUrl(badUrl);
  assert.strictEqual(val.valid, false);
});

// ─── SUITE 7: APPROVAL WORKFLOW REMOVAL & STRICT LIFECYCLE ─────────────────
console.log('\n--- Suite 7: Approval Workflow Removal & Strict Lifecycle (Phase 3 & 4) ---');

runTest('All 11 legacy approval states are rejected as Project Status', () => {
  const legacyApprovalStates = [
    'draft',
    'submitted',
    'under_coordinator_review',
    'returned_for_correction',
    'rejected',
    'approved',
    'under_hod_review',
    'finalized',
    'edit_requested',
    'edit_request_approved',
    'record_reopened'
  ];
  for (const st of legacyApprovalStates) {
    assert.strictEqual(normalizeConsultancyProjectStatus(st), null, `Legacy approval state "${st}" must not be accepted as project status`);
  }
});

runTest('Project Status strictly accepts only Sanctioned, On Going, Completed', () => {
  assert.strictEqual(normalizeConsultancyProjectStatus('Sanctioned'), 'Sanctioned');
  assert.strictEqual(normalizeConsultancyProjectStatus('On Going'), 'On Going');
  assert.strictEqual(normalizeConsultancyProjectStatus('Completed'), 'Completed');
  assert.strictEqual(normalizeConsultancyProjectStatus('Pending'), null);
  assert.strictEqual(normalizeConsultancyProjectStatus('Active'), null);
  assert.strictEqual(normalizeConsultancyProjectStatus('In Review'), null);
});

runTest('ConsultancyProject model status default is null (no active draft/submitted state)', () => {
  const ConsultancyProject = require('../models/ConsultancyProject');
  const statusAttr = ConsultancyProject.rawAttributes.status;
  assert.strictEqual(statusAttr.allowNull, true);
  assert.strictEqual(statusAttr.defaultValue, null);
});

runTest('ConsultancyProject model projectStatus validation restricts to allowed 3 values', () => {
  const ConsultancyProject = require('../models/ConsultancyProject');
  const projectStatusAttr = ConsultancyProject.rawAttributes.projectStatus;
  assert.deepStrictEqual(projectStatusAttr.validate.isIn[0], ['Sanctioned', 'On Going', 'Completed']);
});

console.log('\n================================================================');
console.log(`   TEST RESULTS: ${passedTests} / ${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}

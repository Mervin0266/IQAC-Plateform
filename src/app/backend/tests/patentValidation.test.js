'use strict';

/**
 * Patents & IP Module Validation Test Suite
 * Covers Phase 1, Phase 2, Phase 3, Phase 4, Phase 5, Phase 8
 */

const assert = require('assert');
const { validateYearAndStatus } = require('../controllers/patentController');
const googleDriveService = require('../services/googleDriveService');
const { parseYearFromDate, parseYearFromAcademicYear } = require('../scripts/migrateHistoricalPatents');

console.log('================================================================');
console.log('   CHRIST University IQAC - Patents & IP Test Suite');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}\n`);
  }
}

// -------------------------------------------------------------
// TEST SUITE 1: Year of Grant Validation Rules
// -------------------------------------------------------------
console.log('--- Suite 1: Year & Status Validation (Phase 1 & 6) ---');

runTest('Granted patent with matching 4-digit Year and Grant Date should pass', () => {
  const result = validateYearAndStatus('granted', '2024-05-20', '2024');
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.grantYear, 2024);
});

runTest('Granted patent missing Year should fail', () => {
  const result = validateYearAndStatus('granted', '2024-05-20', null);
  assert.strictEqual(result.valid, false);
  assert(result.error.toLowerCase().includes('required'));
});

runTest('Granted patent with non-4-digit Year should fail', () => {
  const result = validateYearAndStatus('granted', '2024-05-20', '24');
  assert.strictEqual(result.valid, false);
  assert(result.error.includes('4-digit calendar year'));
});

runTest('Granted patent with Year differing from Grant Date year should fail', () => {
  const result = validateYearAndStatus('granted', '2023-11-15', '2024');
  assert.strictEqual(result.valid, false);
  assert(result.error.includes('does not match Grant Date year'));
});

runTest('Published patent with Year populated should fail (must be blank)', () => {
  const result = validateYearAndStatus('published', null, '2024');
  assert.strictEqual(result.valid, false);
  assert(result.error.includes('must be left blank'));
});

runTest('Filed patent with null Year should pass', () => {
  const result = validateYearAndStatus('filed', null, null);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.grantYear, null);
});

runTest('Under examination patent with empty string Year should pass', () => {
  const result = validateYearAndStatus('under_examination', null, '');
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.grantYear, null);
});

// -------------------------------------------------------------
// TEST SUITE 2: Google Drive URL Parsing & Validation (Phase 3 & 4)
// -------------------------------------------------------------
console.log('\n--- Suite 2: Google Drive URL Validation & Extraction ---');

runTest('Valid standard file view Drive URL should be accepted', () => {
  const url = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7/view?usp=sharing';
  assert.strictEqual(googleDriveService.isValidDriveUrl(url), true);
  assert.strictEqual(googleDriveService.extractFileId(url), '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7');
});

runTest('Valid open?id= Drive URL should extract file ID', () => {
  const url = 'https://drive.google.com/open?id=1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
  assert.strictEqual(googleDriveService.isValidDriveUrl(url), true);
  assert.strictEqual(googleDriveService.extractFileId(url), '1AbCdEfGhIjKlMnOpQrStUvWxYz012345');
});

runTest('Valid folder Drive URL should be recognized', () => {
  const url = 'https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7';
  assert.strictEqual(googleDriveService.isValidDriveUrl(url), true);
});

runTest('Non-Google Drive URL should be rejected', () => {
  const url = 'https://www.dropbox.com/s/abcdef123456/patent_proof.pdf';
  assert.strictEqual(googleDriveService.isValidDriveUrl(url), false);
  assert.strictEqual(googleDriveService.extractFileId(url), null);
});

runTest('Malicious URI scheme should be rejected', () => {
  const url = 'javascript:alert(1)';
  assert.strictEqual(googleDriveService.isValidDriveUrl(url), false);
  assert.strictEqual(googleDriveService.extractFileId(url), null);
});

// -------------------------------------------------------------
// TEST SUITE 3: Historical Migration Parsing (Phase 8)
// -------------------------------------------------------------
console.log('\n--- Suite 3: Historical Patent Migration Parsing ---');

runTest('Parse year from ISO date YYYY-MM-DD', () => {
  const yr = parseYearFromDate('2024-03-15');
  assert.strictEqual(yr, 2024);
});

runTest('Parse year from DD/MM/YYYY date', () => {
  const yr = parseYearFromDate('15/08/2022');
  assert.strictEqual(yr, 2022);
});

runTest('Parse year from Academic Year range (2023-2024 -> 2024)', () => {
  const yr = parseYearFromAcademicYear('2023-2024');
  assert.strictEqual(yr, 2024);
});

runTest('Parse year from single year string (2025 -> 2025)', () => {
  const yr = parseYearFromAcademicYear('2025');
  assert.strictEqual(yr, 2025);
});

runTest('Invalid / empty date returns null', () => {
  const yr = parseYearFromDate('N/A');
  assert.strictEqual(yr, null);
});

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`   TEST RESULTS: ${passedTests} / ${totalTests} Passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exitCode = 1;
}

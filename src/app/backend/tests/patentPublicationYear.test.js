'use strict';

/**
 * Patent Publication Year Automated Verification Test Suite
 *
 * Validates:
 * 1. Date normalization & derivation (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD.MM.YYYY, Excel dates/serials).
 * 2. Ambiguous non-empty date rejection (day <= 12, month <= 12, day !== month) and invalid date rejection.
 * 3. Blank / missing date handling with non-blocking warning and null publicationYear.
 * 4. Create Patent API: auto-derives publicationYear, sets academicYear to null, protects from client override.
 * 5. Update Patent API: recalculates publicationYear on date change, resets to null when cleared, prevents tampering.
 * 6. Bulk Upload API: summary accurately reflects imported, missing, invalid, ambiguous, and rejected counts.
 * 7. Clean DB teardown.
 */

const assert = require('assert');
const {
  parseAndValidatePublicationDate,
  buildIsoDateIfValid,
  createPatent,
  updatePatent,
  bulkUploadPatents
} = require('../controllers/patentController');
const { Patent, User, sequelize } = require('../models');

console.log('================================================================');
console.log('   CHRIST University IQAC - Patent Publication Year Test Suite');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runSyncTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}\n`);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}\n`);
    throw err;
  }
}

// Mock Express response helper
function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

async function main() {
  try {
    // -------------------------------------------------------------
    // SUITE 1: Date Normalization and Parsing
    // -------------------------------------------------------------
    console.log('--- Suite 1: Publication Date Normalization & Parsing ---');

    runSyncTest('Normalizes ISO YYYY-MM-DD format correctly', () => {
      const res = parseAndValidatePublicationDate('2024-08-15');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.isoDate, '2024-08-15');
      assert.strictEqual(res.publicationYear, 2024);
      assert.strictEqual(res.isBlank, false);
    });

    runSyncTest('Normalizes DD/MM/YYYY format with unambiguous day (> 12)', () => {
      const res = parseAndValidatePublicationDate('25/11/2023');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.isoDate, '2023-11-25');
      assert.strictEqual(res.publicationYear, 2023);
    });

    runSyncTest('Normalizes DD-MM-YYYY format with unambiguous day (> 12)', () => {
      const res = parseAndValidatePublicationDate('18-03-2022');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.isoDate, '2022-03-18');
      assert.strictEqual(res.publicationYear, 2022);
    });

    runSyncTest('Normalizes DD.MM.YYYY format with unambiguous day (> 12)', () => {
      const res = parseAndValidatePublicationDate('30.01.2025');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.isoDate, '2025-01-30');
      assert.strictEqual(res.publicationYear, 2025);
    });

    runSyncTest('Normalizes JavaScript Date object strictly in UTC', () => {
      const dt = new Date(Date.UTC(2026, 4, 10)); // 2026-05-10 UTC
      const res = parseAndValidatePublicationDate(dt);
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.isoDate, '2026-05-10');
      assert.strictEqual(res.publicationYear, 2026);
    });

    runSyncTest('Normalizes Excel numeric serial number', () => {
      // 45000 in Excel serial corresponds to 2023-03-15
      const res = parseAndValidatePublicationDate(45000);
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.publicationYear, 2023);
      assert.strictEqual(typeof res.isoDate, 'string');
    });

    runSyncTest('Allows identical day and month (e.g. 05/05/2024) unambiguously', () => {
      const res = parseAndValidatePublicationDate('05/05/2024');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.isoDate, '2024-05-05');
      assert.strictEqual(res.publicationYear, 2024);
    });

    runSyncTest('Permits explicit date format override to resolve ambiguous dates', () => {
      const res = parseAndValidatePublicationDate('04/05/2024', { format: 'DD/MM/YYYY' });
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.isoDate, '2024-05-04');
      assert.strictEqual(res.publicationYear, 2024);
    });

    // -------------------------------------------------------------
    // SUITE 2: Ambiguity, Invalidity, and Missing Dates
    // -------------------------------------------------------------
    console.log('\n--- Suite 2: Ambiguity, Invalidity, and Missing Dates ---');

    runSyncTest('Rejects ambiguous date when day <= 12 and month <= 12 without explicit format', () => {
      const res = parseAndValidatePublicationDate('04/05/2024');
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.isAmbiguous, true);
      assert(res.error.toLowerCase().includes('ambiguous'));
    });

    runSyncTest('Rejects out-of-range day or month (e.g. 35/15/2024)', () => {
      const res = parseAndValidatePublicationDate('35/15/2024');
      assert.strictEqual(res.valid, false);
      assert.strictEqual(res.isInvalid, true);
      assert(!res.isAmbiguous);
      assert(res.error.toLowerCase().includes('invalid'));
    });

    runSyncTest('Rejects non-existent calendar date (e.g. 2023-02-29, non-leap year)', () => {
      const res = parseAndValidatePublicationDate('2023-02-29');
      assert.strictEqual(res.valid, false);
      assert(res.error.toLowerCase().includes('invalid'));
    });

    runSyncTest('Handles empty string with warning and null publicationYear', () => {
      const res = parseAndValidatePublicationDate('');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.isBlank, true);
      assert.strictEqual(res.publicationYear, null);
      assert.strictEqual(res.isoDate, null);
      assert(res.warning.toLowerCase().includes('publication date is missing'));
    });

    runSyncTest('Handles null or undefined with warning and null publicationYear', () => {
      const resNull = parseAndValidatePublicationDate(null);
      assert.strictEqual(resNull.valid, true);
      assert.strictEqual(resNull.isBlank, true);
      assert.strictEqual(resNull.publicationYear, null);

      const resUndef = parseAndValidatePublicationDate(undefined);
      assert.strictEqual(resUndef.valid, true);
      assert.strictEqual(resUndef.isBlank, true);
      assert.strictEqual(resUndef.publicationYear, null);
    });

    runSyncTest('Handles string "N/A" or "None" or "-" as blank', () => {
      const resNA = parseAndValidatePublicationDate('N/A');
      assert.strictEqual(resNA.valid, true);
      assert.strictEqual(resNA.isBlank, true);
      assert.strictEqual(resNA.publicationYear, null);

      const resDash = parseAndValidatePublicationDate('-');
      assert.strictEqual(resDash.valid, true);
      assert.strictEqual(resDash.isBlank, true);
      assert.strictEqual(resDash.publicationYear, null);
    });

    // -------------------------------------------------------------
    // SUITE 3: Database & Controller Create / Update Integration
    // -------------------------------------------------------------
    console.log('\n--- Suite 3: Database & Controller CRUD Integration ---');

    let testUser = await User.findOne({ where: { role: 'admin' } });
    if (!testUser) {
      testUser = await User.findOne();
    }
    const testUserId = testUser ? testUser.id : null;

    let createdTestPatentId = null;
    let missingDateTestPatentId = null;

    await runAsyncTest('createPatent auto-derives publicationYear and sets academicYear null', async () => {
      const req = {
        body: {
          title: 'Automated Test Invention for Solar Efficiency',
          inventors: 'Dr. Test Inventor, Prof. Co-Inventor',
          applicationNo: 'TEST_APP_2024_001',
          patentNo: 'TEST_PAT_2024_001',
          status: 'published',
          patentType: 'National (Indian)',
          department: 'Computer Science and Engineering',
          publishedDate: '2024-09-20',
          // Client attempts to pass academicYear and override publicationYear
          academicYear: '2021-2022',
          publicationYear: 1999
        },
        user: { id: testUserId, role: 'admin', department: 'All' },
        ip: '127.0.0.1'
      };
      const res = createMockRes();

      await createPatent(req, res);

      assert.strictEqual(res.statusCode, 201, `Failed to create patent: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.publicationYear, 2024, 'publicationYear should be derived from publishedDate (2024), ignoring client 1999');
      assert.strictEqual(res.body.data.publishedDate, '2024-09-20');
      assert.strictEqual(res.body.data.academicYear, null, 'academicYear must be null');

      createdTestPatentId = res.body.data.id;
    });

    await runAsyncTest('createPatent handles missing publication date with null year and warning', async () => {
      const req = {
        body: {
          title: 'Automated Test Invention with Missing Date',
          inventors: 'Dr. Test Inventor',
          applicationNo: 'TEST_APP_2024_002',
          status: 'filed',
          patentType: 'National (Indian)',
          department: 'Computer Science and Engineering',
          publishedDate: ''
        },
        user: { id: testUserId, role: 'admin', department: 'All' },
        ip: '127.0.0.1'
      };
      const res = createMockRes();

      await createPatent(req, res);

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.publicationYear, null);
      assert.strictEqual(res.body.data.publishedDate, null);
      assert(res.body.warning && res.body.warning.includes('Publication Date is missing'));

      missingDateTestPatentId = res.body.data.id;
    });

    await runAsyncTest('updatePatent recalculates publicationYear when publishedDate is changed', async () => {
      assert(createdTestPatentId, 'createdTestPatentId should exist');
      const req = {
        params: { id: createdTestPatentId },
        body: {
          publishedDate: '2025-03-15',
          publicationYear: 2010 // Malicious override attempt
        },
        user: { id: testUserId, role: 'admin', department: 'All' },
        ip: '127.0.0.1'
      };
      const res = createMockRes();

      await updatePatent(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.publicationYear, 2025, 'publicationYear must be updated to 2025 based on new date');
      assert.strictEqual(res.body.data.publishedDate, '2025-03-15');
    });

    await runAsyncTest('updatePatent clears publicationYear when publishedDate is cleared', async () => {
      assert(createdTestPatentId, 'createdTestPatentId should exist');
      const req = {
        params: { id: createdTestPatentId },
        body: {
          publishedDate: null
        },
        user: { id: testUserId, role: 'admin', department: 'All' },
        ip: '127.0.0.1'
      };
      const res = createMockRes();

      await updatePatent(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.publicationYear, null);
      assert.strictEqual(res.body.data.publishedDate, null);
      assert(res.body.warning && res.body.warning.includes('Publication Date is missing'));
    });

    // -------------------------------------------------------------
    // SUITE 4: Bulk Upload API Handling & Granular Summary
    // -------------------------------------------------------------
    console.log('\n--- Suite 4: Bulk Upload API & Summary Verification ---');

    await runAsyncTest('bulkUploadPatents processes valid, missing, ambiguous, and invalid dates', async () => {
      const items = [
        // 1. Valid unambiguous DD/MM/YYYY date
        {
          title: 'Bulk Test Patent 1 - Clean DD/MM/YYYY',
          inventors: 'Dr. Alpha, Dr. Beta',
          applicationNo: 'BT_APP_001',
          status: 'published',
          publishedDate: '15/08/2024',
          department: 'Computer Science and Engineering'
        },
        // 2. Valid ISO date
        {
          title: 'Bulk Test Patent 2 - Clean ISO Date',
          inventors: 'Dr. Gamma',
          applicationNo: 'BT_APP_002',
          status: 'published',
          publishedDate: '2023-11-20',
          department: 'Computer Science and Engineering'
        },
        // 3. Missing Publication Date (must import with null publicationYear & warning)
        {
          title: 'Bulk Test Patent 3 - Missing Publication Date',
          inventors: 'Dr. Delta',
          applicationNo: 'BT_APP_003',
          status: 'filed',
          publishedDate: '',
          department: 'Computer Science and Engineering'
        },
        // 4. Ambiguous Publication Date (must reject)
        {
          title: 'Bulk Test Patent 4 - Ambiguous Date',
          inventors: 'Dr. Epsilon',
          applicationNo: 'BT_APP_004',
          status: 'published',
          publishedDate: '04/05/2024',
          department: 'Computer Science and Engineering'
        },
        // 5. Invalid Publication Date (must reject)
        {
          title: 'Bulk Test Patent 5 - Invalid Date',
          inventors: 'Dr. Zeta',
          applicationNo: 'BT_APP_005',
          status: 'published',
          publishedDate: '35/15/2024',
          department: 'Computer Science and Engineering'
        }
      ];

      const req = {
        body: { items, defaultDepartment: 'Computer Science and Engineering' },
        user: { id: testUserId, role: 'admin', department: 'All' },
        ip: '127.0.0.1'
      };
      const res = createMockRes();

      await bulkUploadPatents(req, res);

      assert.strictEqual(res.statusCode, 201, `Bulk upload failed: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.totalRows, 5);
      assert.strictEqual(res.body.importedCount, 3, 'Rows 1, 2, and 3 should be imported');
      assert.strictEqual(res.body.missingPublicationDateCount, 1, 'Row 3 has missing date');
      assert.strictEqual(res.body.ambiguousPublicationDateCount, 1, 'Row 4 has ambiguous date');
      assert.strictEqual(res.body.invalidPublicationDateCount, 1, 'Row 5 has invalid date');
      assert.strictEqual(res.body.rejectedCount, 2, 'Rows 4 and 5 should be rejected');
      assert(Array.isArray(res.body.warnings) && res.body.warnings.length === 1);
      assert(Array.isArray(res.body.errors) && res.body.errors.length === 2);

      // Verify imported row records in database
      const importedRow1 = res.body.data.find(p => p.applicationNo === 'BT_APP_001');
      assert.strictEqual(importedRow1.publicationYear, 2024);
      assert.strictEqual(importedRow1.academicYear, null);

      const importedRow2 = res.body.data.find(p => p.applicationNo === 'BT_APP_002');
      assert.strictEqual(importedRow2.publicationYear, 2023);

      const importedRow3 = res.body.data.find(p => p.applicationNo === 'BT_APP_003');
      assert.strictEqual(importedRow3.publicationYear, null);

      // Cleanup bulk test records
      const bulkAppNos = ['BT_APP_001', 'BT_APP_002', 'BT_APP_003'];
      await Patent.destroy({ where: { applicationNo: bulkAppNos } });
    });

    // -------------------------------------------------------------
    // TEARDOWN
    // -------------------------------------------------------------
    console.log('\n--- Teardown: Cleaning Test Records ---');
    if (createdTestPatentId) {
      await Patent.destroy({ where: { id: createdTestPatentId } });
    }
    if (missingDateTestPatentId) {
      await Patent.destroy({ where: { id: missingDateTestPatentId } });
    }
    console.log('  ✓ Test records cleaned from database.');

    console.log('\n================================================================');
    console.log(`   TEST RESULTS: ${passedTests} / ${totalTests} Passed (100%)`);
    console.log('================================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test Suite encountered an error:', err);
    process.exit(1);
  }
}

main();

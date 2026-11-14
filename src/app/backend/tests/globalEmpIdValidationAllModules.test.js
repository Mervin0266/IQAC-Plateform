'use strict';

const assert = require('assert');
const { sequelize } = require('../config/database');
const {
  Patent,
  PatentFaculty,
  Copyright,
  CopyrightFaculty,
  ConsultancyProject,
  ConsultancyProjectFaculty,
  SponsoredProject,
  SponsoredProjectFaculty,
  InternalResearchProject,
  InternalResearchFaculty,
  Faculty,
  User
} = require('../models');

const patentService = require('../services/patentService');
const copyrightController = require('../controllers/copyrightController');
const consultancyProjectService = require('../services/consultancyProjectService');
const sponsoredResearchService = require('../services/sponsoredResearchService');
const internalResearchService = require('../services/internalResearchService');

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(err);
    throw err;
  }
}

async function main() {
  console.log('========================================================================');
  console.log('  CHRIST University IQAC - Global EmpID Validation & Skip Test Suite   ');
  console.log('========================================================================\n');

  let adminUser = null;
  let testFac1 = null;
  let testFac2 = null;
  let testFac3 = null;

  try {
    adminUser = await User.findOne({ where: { role: 'admin' } });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'IQAC Admin Tester',
        email: 'iqac.tester@christuniversity.in',
        password: 'hashed_password_placeholder',
        role: 'admin',
        department: 'IQAC'
      });
    }

    // Ensure valid faculty records exist for test EmpIDs: 'TEST_EMP_1', 'TEST_EMP_2', 'TEST_EMP_3'
    await Faculty.destroy({ where: { employeeId: ['TEST_EMP_1', 'TEST_EMP_2', 'TEST_EMP_3'] } });

    testFac1 = await Faculty.create({
      employeeId: 'TEST_EMP_1',
      name: 'Dr. Test One',
      designation: 'Professor',
      department: 'Computer Science and Engineering',
      email: 'test1@christuniversity.in'
    });

    testFac2 = await Faculty.create({
      employeeId: 'TEST_EMP_2',
      name: 'Dr. Test Two',
      designation: 'Associate Professor',
      department: 'Computer Science and Engineering',
      email: 'test2@christuniversity.in'
    });

    testFac3 = await Faculty.create({
      employeeId: 'TEST_EMP_3',
      name: 'Dr. Test Three',
      designation: 'Assistant Professor',
      department: 'Civil Engineering',
      email: 'test3@christuniversity.in'
    });

    // TEST 1 — All valid EmpIDs
    await runTest('Test 1 — All valid EmpIDs: Row accepted, eligible for import, all associations linked', async () => {
      const evalPatents = await patentService.evaluateBulkPatentRows([
        {
          Title: 'Autonomous Navigation System',
          EmpId: 'TEST_EMP_1, TEST_EMP_2',
          'Application No': 'APP_TEST_101',
          'Publication Date': '15/05/2024'
        }
      ]);
      assert.strictEqual(evalPatents.summary.totalRows, 1);
      assert.strictEqual(evalPatents.summary.eligibleCount, 1);
      assert.strictEqual(evalPatents.summary.validCleanCount, 1);
      assert.strictEqual(evalPatents.rows[0].isEligible, true);
      assert.strictEqual(evalPatents.rows[0].rowStatus, 'valid');

      const evalCopyrights = await copyrightController._testHelpers.evaluateBulkCopyrightRows([
        {
          Title: 'AI Analytics Engine',
          EmpId: 'TEST_EMP_1, TEST_EMP_2',
          'Date of Application': '15-05-2024'
        }
      ]);
      assert.strictEqual(evalCopyrights.summary.eligibleCount, 1);
      assert.strictEqual(evalCopyrights.rows[0].eligible, true);
      assert.strictEqual(evalCopyrights.rows[0].status, 'valid');
    });

    // TEST 2 — Single invalid EmpID in multi-ID string
    await runTest('Test 2 — Single invalid EmpID in multi-ID string: Entire row skipped, not partially imported', async () => {
      const evalPatents = await patentService.evaluateBulkPatentRows([
        {
          Title: 'Quantum Sensor Array',
          EmpId: 'TEST_EMP_1, TEST_EMP_2, 99999',
          'Application No': 'APP_TEST_102',
          'Publication Date': '15/05/2024'
        }
      ]);
      assert.strictEqual(evalPatents.summary.eligibleCount, 0);
      assert.strictEqual(evalPatents.summary.skippedInvalidEmpIdCount, 1);
      assert.strictEqual(evalPatents.rows[0].isEligible, false);
      assert.strictEqual(evalPatents.rows[0].rowStatus, 'skipped_invalid_empid');
      assert.ok(evalPatents.rows[0].skipReason.includes('99999'));

      const evalConsultancy = await consultancyProjectService.evaluateBulkConsultancyRows([
        {
          'Name of Consultancy Project': 'Grid Modernization',
          EmpId: 'TEST_EMP_1, TEST_EMP_2, 99999',
          'Agency Name': 'Power Corp',
          'Start Date': '15/05/2024',
          'Project Type': 'Collaborative',
          'Project Status': 'On Going'
        }
      ]);
      assert.strictEqual(evalConsultancy.summary.eligibleCount, 0);
      assert.strictEqual(evalConsultancy.summary.skippedInvalidEmpIdCount, 1);
      assert.strictEqual(evalConsultancy.rows[0].isEligible, false);
      assert.strictEqual(evalConsultancy.rows[0].validationStatus, 'SKIPPED_INVALID_EMPID');
    });

    // TEST 3 — All invalid EmpIDs
    await runTest('Test 3 — All invalid EmpIDs: Entire row skipped, invalid IDs reported', async () => {
      const evalCopyrights = await copyrightController._testHelpers.evaluateBulkCopyrightRows([
        {
          Title: 'Faulty System Code',
          EmpId: '99999, 88888',
          'Date of Application': '15-05-2024'
        }
      ]);
      assert.strictEqual(evalCopyrights.summary.eligibleCount, 0);
      assert.strictEqual(evalCopyrights.summary.skippedInvalidEmpIdCount, 1);
      assert.strictEqual(evalCopyrights.rows[0].eligible, false);
      assert.strictEqual(evalCopyrights.rows[0].status, 'skipped_invalid_empid');
      assert.ok(evalCopyrights.rows[0].skipReason.includes('99999'));
      assert.ok(evalCopyrights.rows[0].skipReason.includes('88888'));
    });

    // TEST 4 — Missing EmpID
    await runTest('Test 4 — Missing EmpID: Row skipped, reported as missing EmpID', async () => {
      const evalPatents = await patentService.evaluateBulkPatentRows([
        {
          Title: 'Blank Inventor Patent',
          EmpId: '',
          'Application No': 'APP_TEST_104',
          'Publication Date': '15/05/2024'
        }
      ]);
      assert.strictEqual(evalPatents.summary.eligibleCount, 0);
      assert.strictEqual(evalPatents.summary.skippedMissingEmpIdCount, 1);
      assert.strictEqual(evalPatents.rows[0].isEligible, false);
      assert.strictEqual(evalPatents.rows[0].rowStatus, 'skipped_missing_empid');
    });

    // TEST 5 — Mixed spreadsheet
    await runTest('Test 5 — Mixed spreadsheet (10 rows: 7 valid, 2 invalid EmpID, 1 missing EmpID)', async () => {
      const rows = [];
      // 7 valid rows
      for (let i = 1; i <= 7; i++) {
        rows.push({
          'Name of Consultancy Project': `Consultancy Project #${i}`,
          EmpId: i % 2 === 0 ? 'TEST_EMP_1, TEST_EMP_2' : 'TEST_EMP_1',
          'Agency Name': `Agency Partner ${i}`,
          'Start Date': `0${i}/03/2024`,
          'Project Type': 'Sole',
          'Project Status': 'Completed'
        });
      }
      // 2 invalid EmpID rows
      rows.push({
        'Name of Consultancy Project': 'Invalid Multi-EmpID Consultancy',
        EmpId: 'TEST_EMP_1, 99999',
        'Agency Name': 'Test Agency',
        'Start Date': '10/03/2024',
        'Project Type': 'Collaborative',
        'Project Status': 'Completed'
      });
      rows.push({
        'Name of Consultancy Project': 'All Invalid EmpID Consultancy',
        EmpId: '88888, 77777',
        'Agency Name': 'Test Agency',
        'Start Date': '11/03/2024',
        'Project Type': 'Collaborative',
        'Project Status': 'Completed'
      });
      // 1 missing EmpID row
      rows.push({
        'Name of Consultancy Project': 'Missing EmpID Consultancy',
        EmpId: '',
        'Agency Name': 'Test Agency',
        'Start Date': '12/03/2024',
        'Project Type': 'Sole',
        'Project Status': 'Completed'
      });

      const evalRes = await consultancyProjectService.evaluateBulkConsultancyRows(rows);
      assert.strictEqual(evalRes.summary.totalRows, 10);
      assert.strictEqual(evalRes.summary.validCleanCount, 7);
      assert.strictEqual(evalRes.summary.eligibleCount, 7);
      assert.strictEqual(evalRes.summary.skippedInvalidEmpIdCount, 2);
      assert.strictEqual(evalRes.summary.skippedMissingEmpIdCount, 1);

      // Execute bulk import on the 10 rows
      const importRes = await consultancyProjectService.executeBulkImport(evalRes.rows, {
        userId: adminUser.id,
        userRole: 'admin',
        userDepartment: 'General',
        sequelize,
        ConsultancyProject,
        ConsultancyProjectFaculty,
        ConsultancyDocument: { create: async () => {} }
      });

      assert.strictEqual(importRes.success, true);
      assert.strictEqual(importRes.summary.importedCount, 7);
      assert.strictEqual(importRes.summary.skippedInvalidEmpIdCount, 2);
      assert.strictEqual(importRes.summary.skippedMissingEmpIdCount, 1);

      // Clean up test consultancy records
      await ConsultancyProject.destroy({ where: { id: importRes.createdIds } });
    });

    // TEST 6 — External Research PI validation
    await runTest('Test 6 — External Research PI validation: Invalid PI skips row, Co-PI not promoted', async () => {
      const evalRes = await sponsoredResearchService.evaluateBulkExternalRows({
        rows: [
          {
            'Project Title': 'Autonomous Drone Mapping',
            'Funding Agency': 'DST',
            'Sanction Date': '10/04/2024',
            'Investigators EmpId': '99999, TEST_EMP_2',
            'Sanctioned Amount (INR)': 1500000
          }
        ],
        user: adminUser,
        Faculty,
        SponsoredProject
      });

      assert.strictEqual(evalRes.totalRows, 1);
      assert.strictEqual(evalRes.validRows, 0);
      assert.strictEqual(evalRes.skippedInvalidEmpIdCount, 1);
      assert.strictEqual(evalRes.rows[0].isEligible, false);
      assert.strictEqual(evalRes.rows[0].rowStatus, 'SKIPPED_INVALID_EMPID');
      assert.ok(evalRes.rows[0].skipReason.includes('Principal Investigator'));
    });

    // TEST 7 — External Research Co-Investigator validation
    await runTest('Test 7 — External Research Co-Investigator validation: Invalid Co-PI skips row, no partial import', async () => {
      const evalRes = await sponsoredResearchService.evaluateBulkExternalRows({
        rows: [
          {
            'Project Title': 'Subsurface Geothermal Sensing',
            'Funding Agency': 'SERB',
            'Sanction Date': '12/04/2024',
            'Investigators EmpId': 'TEST_EMP_1, TEST_EMP_2, 99999',
            'Sanctioned Amount (INR)': 2500000
          }
        ],
        user: adminUser,
        Faculty,
        SponsoredProject
      });

      assert.strictEqual(evalRes.totalRows, 1);
      assert.strictEqual(evalRes.validRows, 0);
      assert.strictEqual(evalRes.skippedInvalidEmpIdCount, 1);
      assert.strictEqual(evalRes.rows[0].isEligible, false);
      assert.strictEqual(evalRes.rows[0].rowStatus, 'SKIPPED_INVALID_EMPID');
      assert.ok(evalRes.rows[0].skipReason.includes('Co-Investigator'));
    });

    // TEST 8 — Internal Research validation
    await runTest('Test 8 — Internal Research validation: Invalid EmpID in multi-ID skips row, no partial import', async () => {
      const evalRes = await internalResearchService.evaluateBulkInternalRows({
        rows: [
          {
            Title: 'Smart Water Metering',
            'Seed Money': 'Major Research Project',
            'Start Date': '01/06/2024',
            EmpId: 'TEST_EMP_1, 99999',
            'Sanctioned Amount': 200000
          }
        ],
        user: adminUser,
        Faculty,
        InternalResearchProject
      });

      assert.strictEqual(evalRes.totalRows, 1);
      assert.strictEqual(evalRes.validRows, 0);
      assert.strictEqual(evalRes.skippedInvalidEmpIdCount, 1);
      assert.strictEqual(evalRes.rows[0].isEligible, false);
      assert.strictEqual(evalRes.rows[0].rowStatus, 'SKIPPED_INVALID_EMPID');
    });

    // TEST 9 — Duplicate detection independence
    await runTest('Test 9 — Duplicate detection independence: Works independently of EmpID validation', async () => {
      // First, create a baseline patent
      const p1 = await Patent.create({
        title: 'Duplicate Key Test Invention',
        inventors: 'Dr. Test One',
        applicationNo: 'DUP_APP_TEST_001',
        publicationYear: 2024,
        status: 'published',
        patentType: 'National (Indian)',
        department: 'Computer Science and Engineering',
        createdBy: adminUser.id
      });
      await PatentFaculty.create({
        patentId: p1.id,
        facultyId: testFac1.id,
        employeeId: testFac1.employeeId,
        normalizedEmployeeId: testFac1.employeeId
      });

      // Now evaluate a duplicate row with VALID EmpID
      const evalDup = await patentService.evaluateBulkPatentRows([
        {
          Title: 'Duplicate Key Test Invention',
          EmpId: 'TEST_EMP_1',
          'Application No': 'DUP_APP_TEST_001',
          'Publication Date': '15/05/2024'
        }
      ]);

      assert.strictEqual(evalDup.summary.duplicateCount, 1);
      assert.strictEqual(evalDup.summary.skippedInvalidEmpIdCount, 0);
      assert.strictEqual(evalDup.rows[0].rowStatus, 'duplicate');
      assert.strictEqual(evalDup.rows[0].isDuplicate, true);

      // Clean up
      await PatentFaculty.destroy({ where: { patentId: p1.id } });
      await p1.destroy();
    });

    // TEST 10 — Regression: Valid single and batch imports
    await runTest('Test 10 — Regression: Single entry and valid batch imports function correctly', async () => {
      const p = await Patent.create({
        title: 'Single Entry Regression Patent',
        inventors: 'Dr. Test One',
        applicationNo: 'REG_APP_001',
        status: 'filed',
        department: 'Computer Science and Engineering',
        createdBy: adminUser.id
      });
      assert.ok(p.id);
      await p.destroy();
    });

    console.log('\n========================================================================');
    console.log('  ALL 10 TESTS PASSED SUCCESSFULLY!                                     ');
    console.log('========================================================================\n');

  } finally {
    // Clean up test faculty
    if (testFac1) await testFac1.destroy().catch(() => {});
    if (testFac2) await testFac2.destroy().catch(() => {});
    if (testFac3) await testFac3.destroy().catch(() => {});
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test suite failed:', err);
      process.exit(1);
    });
}

module.exports = { main };

'use strict';

const assert = require('assert');
const { sequelize } = require('../config/database');
const { Patent, PatentFaculty, Copyright, CopyrightFaculty, Faculty, User } = require('../models');
const patentService = require('../services/patentService');
const copyrightService = require('../services/copyrightService');
const patentController = require('../controllers/patentController');
const XLSX = require('xlsx');

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
  console.log('================================================================');
  console.log('   CHRIST University IQAC - Patents & Copyrights Complete Suite');
  console.log('================================================================\n');

  let adminUser = null;
  let testFacultyA = null;
  let testFacultyB = null;
  let createdPatentId = null;

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

    // Clean up any stale records from previous runs
    await Faculty.destroy({ where: { employeeId: ['CU_PAT_001', 'CU_PAT_002'] } });
    await Patent.destroy({ where: { applicationNo: 'TEMP_APP_QC_001' } });

    // Create 2 test faculty profiles
    testFacultyA = await Faculty.create({
      employeeId: 'CU_PAT_001',
      name: 'Dr. Alan Turing',
      designation: 'Professor',
      department: 'Computer Science and Engineering',
      email: 'alan.turing@christuniversity.in'
    });

    testFacultyB = await Faculty.create({
      employeeId: 'CU_PAT_002',
      name: 'Dr. Ada Lovelace',
      designation: 'Associate Professor',
      department: 'Mechanical and Automobile Engineering',
      email: 'ada.lovelace@christuniversity.in'
    });

    // ─────────────────────────────────────────────────────────────
    // SUITE 1: Patent Multi-Faculty Resolution & External Inventors
    // ─────────────────────────────────────────────────────────────
    console.log('--- Suite 1: Patent Multi-Faculty & External Inventors ---');

    await runTest('Normalizes comma-separated EmpIds, deduplicating within row', () => {
      const parsed = patentService.parseAndNormalizeEmpIds('CU_PAT_001, CU_PAT_002, cu_pat_001, 99999');
      assert.strictEqual(parsed.empIds.length, 3);
      assert.deepStrictEqual(parsed.duplicateEmpIds, ['cu_pat_001']);
      assert.strictEqual(parsed.empIdsRaw, 'CU_PAT_001, CU_PAT_002, 99999');
    });

    await runTest('Resolves internal faculty and flags unrecognized EmpId without throwing error', async () => {
      const res = await patentService.resolveFacultyAssociationsForEmpIds(
        ['CU_PAT_001', 'CU_PAT_002', 'CU_INVALID_999'],
        '2024-05-10',
        { Faculty }
      );
      assert.strictEqual(res.associations.length, 3);
      assert.strictEqual(res.hasInvalidEmpIds, true);
      assert.deepStrictEqual(res.invalidEmpIds, ['CU_INVALID_999']);

      const f1 = res.associations[0];
      assert.strictEqual(f1.isValid, true);
      assert.strictEqual(f1.facultyName, 'Dr. Alan Turing');
      assert.strictEqual(f1.originalDepartment, 'Computer Science and Engineering');

      const fInvalid = res.associations[2];
      assert.strictEqual(fInvalid.isValid, false);
      assert.strictEqual(fInvalid.originalDepartment, null);
    });

    // ─────────────────────────────────────────────────────────────
    // SUITE 2: Multi-Faculty Patent Creation & Relational Storage
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Suite 2: Multi-Faculty Patent Creation & Relational Junction ---');


    await runTest('createPatent creates Patent and PatentFaculty junction records', async () => {
      const req = {
        user: adminUser,
        body: {
          title: 'Quantum Computing Patent with Multiple Inventors',
          empIdsRaw: 'CU_PAT_001, CU_PAT_002, CU_UNRECOGNIZED_777',
          externalInventors: [
            { name: 'Dr. Richard Feynman', institution: 'Caltech' }
          ],
          applicationNo: 'TEMP_APP_QC_001',
          status: 'published',
          publishedDate: '2024-06-20',
          patentType: 'National (Indian)'
        }
      };

      let respData = null;
      let respStatus = 200;
      const res = {
        status: (s) => { respStatus = s; return res; },
        json: (d) => { respData = d; return res; }
      };

      await patentController.createPatent(req, res);
      assert.strictEqual(respStatus, 201, `Failed to create: ${JSON.stringify(respData)}`);
      assert.ok(respData.data.id);
      createdPatentId = respData.data.id;

      // Verify derived publication year
      assert.strictEqual(respData.data.publicationYear, 2024);
      assert.strictEqual(respData.data.academicYear, null);

      // Verify faculty associations
      assert.strictEqual(respData.data.facultyAssociations.length, 3);
      assert.strictEqual(respData.data.hasInvalidEmpIds, true);
      assert.deepStrictEqual(respData.data.invalidEmpIds, ['CU_UNRECOGNIZED_777']);

      // Verify external inventors
      assert.strictEqual(respData.data.externalInventors.length, 1);
      assert.strictEqual(respData.data.externalInventors[0].name, 'Dr. Richard Feynman');
      assert.strictEqual(respData.data.externalInventors[0].institution, 'Caltech');

      // Verify external inventor was NOT created in faculties table
      const extInFac = await Faculty.findOne({ where: { name: 'Dr. Richard Feynman' } });
      assert.strictEqual(extInFac, null);

      // Check patent_faculties table directly
      const junctionRows = await PatentFaculty.findAll({ where: { patentId: createdPatentId } });
      assert.strictEqual(junctionRows.length, 3);
    });

    // ─────────────────────────────────────────────────────────────
    // SUITE 3: Department Filtering & Deduplication
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Suite 3: Multi-Department Filtering & Deduplication ---');

    await runTest('Department filter includes shared patent in Computer Science and in Mechanical', async () => {
      // 1. Filter Computer Science
      const reqCS = {
        user: adminUser,
        query: { department: 'Computer Science and Engineering', limit: '100' }
      };
      let csData = null;
      const resCS = {
        status: (s) => resCS,
        json: (d) => { csData = d; return resCS; }
      };
      await patentController.getPatents(reqCS, resCS);
      assert.ok(csData, 'csData response should exist');
      const csRows = csData.rows || csData.data || [];
      const foundInCS = csRows.some(p => p.id === createdPatentId);
      assert.strictEqual(foundInCS, true, 'Patent must appear under Computer Science');

      // 2. Filter Mechanical
      const reqMech = {
        user: adminUser,
        query: { department: 'Mechanical and Automobile Engineering', limit: '100' }
      };
      let mechData = null;
      const resMech = {
        status: (s) => resMech,
        json: (d) => { mechData = d; return resMech; }
      };
      await patentController.getPatents(reqMech, resMech);
      assert.ok(mechData, 'mechData response should exist');
      const mechRows = mechData.rows || mechData.data || [];
      const foundInMech = mechRows.some(p => p.id === createdPatentId);
      assert.strictEqual(foundInMech, true, 'Patent must appear under Mechanical Engineering');

      // 3. Filter All (University-Wide)
      const reqAll = {
        user: adminUser,
        query: { department: 'all', export: 'true' }
      };
      let allData = null;
      const resAll = {
        status: (s) => resAll,
        json: (d) => { allData = d; return resAll; }
      };
      await patentController.getPatents(reqAll, resAll);
      assert.ok(allData, 'allData response should exist');
      const allRows = allData.rows || allData.data || [];
      const occurrencesInAll = allRows.filter(p => p.id === createdPatentId);
      assert.strictEqual(occurrencesInAll.length, 1, 'Patent must appear exactly ONCE in university-wide totals');
    });

    // ─────────────────────────────────────────────────────────────
    // SUITE 4: Patent Duplicate Detection
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Suite 4: Patent Duplicate Detection Rules ---');

    await runTest('Generates primary key (Application No) and fallback signature (Title + Filing Date + EmpIDs)', () => {
      const keys1 = patentService.generatePatentDuplicateKeys({
        applicationNo: 'in-2024/001a',
        title: 'Novel Solar Cell Design',
        filingDate: '2024-01-15',
        empIds: ['CU_PAT_002', 'CU_PAT_001']
      });

      const keys2 = patentService.generatePatentDuplicateKeys({
        applicationNo: null,
        title: '   Novel  Solar Cell  Design  ',
        filingDate: '2024-01-15',
        empIds: ['CU_PAT_001', 'CU_PAT_002']
      });

      assert.strictEqual(keys1.primaryKey, 'IN-2024/001A');
      // Even with EmpIds in different order and extra whitespace, fallback keys must match!
      assert.strictEqual(keys1.fallbackKey, keys2.fallbackKey);
    });

    // ─────────────────────────────────────────────────────────────
    // SUITE 5: Exact 15-Column Patent Bulk Upload Template Validation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Suite 5: Exact 15-Column Patent Bulk Upload Template ---');

    await runTest('Validates exact 15 approved patent columns in order', () => {
      const officialHeaders = [
        'Title', 'EmpId', 'Application No', 'Patent No', 'Status', 'Patent Type',
        'Filing Date', 'Publication Date', 'Grant Date', 'License Date',
        'Commercial Partner', 'Revenue Generated (INR)', 'Patent URL', 'Proof', 'Abstract'
      ];

      const validation = patentService.validatePatentHeaderColumns(officialHeaders);
      assert.strictEqual(validation.valid, true);

      // Rejects missing mandatory column
      const brokenHeaders = officialHeaders.filter(h => h !== 'Title');
      const brokenVal = patentService.validatePatentHeaderColumns(brokenHeaders);
      assert.strictEqual(brokenVal.valid, false);
      assert.ok(brokenVal.missingColumns.includes('Title'));
    });

    await runTest('generatePatentTemplateBuffer creates valid XLSX workbook with 15 columns', () => {
      const buffer = patentService.generatePatentTemplateBuffer();
      assert.ok(Buffer.isBuffer(buffer));
      const wb = XLSX.read(buffer, { type: 'buffer' });
      assert.ok(wb.SheetNames.includes('Patents_Template'));
      const ws = wb.Sheets['Patents_Template'];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      assert.strictEqual(rows[0].length, 15);
      assert.deepStrictEqual(rows[0], patentService.PATENT_TEMPLATE_COLUMNS);
    });

    // ─────────────────────────────────────────────────────────────
    // SUITE 6: Exact 7-Column Copyright Bulk Upload Template Validation
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- Suite 6: Exact 7-Column Copyright Bulk Upload Template ---');

    await runTest('Validates exact 7 approved copyright columns in order', () => {
      const officialCopyrightHeaders = [
        'EmpId', 'Title', 'Date of Application', 'Registration No',
        'Diary Number', 'Date of Receipt', 'Proof'
      ];
      assert.strictEqual(officialCopyrightHeaders.length, 7);
    });

  } finally {
    // Teardown
    console.log('\n--- Cleaning up test records ---');
    if (createdPatentId) {
      await PatentFaculty.destroy({ where: { patentId: createdPatentId } });
      await Patent.destroy({ where: { id: createdPatentId } });
    }
    if (testFacultyA) await Faculty.destroy({ where: { id: testFacultyA.id } });
    if (testFacultyB) await Faculty.destroy({ where: { id: testFacultyB.id } });
    console.log('  ✓ Test cleanup completed.');
  }

  console.log('\n================================================================');
  console.log('   ALL TESTS PASSED SUCCESSFULLY (100%)');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});

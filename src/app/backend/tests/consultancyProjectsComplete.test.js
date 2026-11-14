'use strict';

const assert = require('assert');
const XLSX = require('xlsx');
const { sequelize } = require('../config/database');
const { ConsultancyProject, ConsultancyProjectFaculty, Faculty, User } = require('../models');
const consultancyController = require('../controllers/consultancyProjectController');
const {
  CONSULTANCY_TEMPLATE_COLUMNS,
  VALID_PROJECT_TYPES,
  VALID_PROJECT_STATUSES,
  parseAndNormalizeEmpIds,
  deriveConsultancyStartYear,
  normalizeProjectType,
  generateConsultancyDuplicateKeys,
  buildConsultancyTemplateWorkbook,
  validateConsultancyHeaderColumns
} = require('../services/consultancyProjectService');

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function run() {
  console.log('================================================================');
  console.log('   CHRIST University IQAC - Consultancy Projects Complete Suite');
  console.log('================================================================');

  let adminUser = await User.findOne({ where: { role: 'admin' } });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'Consultancy Admin',
      email: 'consultancy.admin@christuniversity.in',
      password: 'placeholder_password',
      role: 'admin',
      department: 'IQAC'
    });
  }

  // --- Suite 1: Template Structure & Column Specification ---
  console.log('\n--- Suite 1: Exact 17-Column Consultancy Template ---');
  assert.strictEqual(CONSULTANCY_TEMPLATE_COLUMNS.length, 17, 'Template must define exactly 17 columns');
  assert.strictEqual(CONSULTANCY_TEMPLATE_COLUMNS[0], 'EmpId');
  assert.strictEqual(CONSULTANCY_TEMPLATE_COLUMNS[1], 'Name of Consultancy Project');
  assert.strictEqual(CONSULTANCY_TEMPLATE_COLUMNS[2], 'Agency Name');
  assert.strictEqual(CONSULTANCY_TEMPLATE_COLUMNS[7], 'Project Type');
  assert.strictEqual(CONSULTANCY_TEMPLATE_COLUMNS[14], 'Agreement / Work Order');
  assert.strictEqual(CONSULTANCY_TEMPLATE_COLUMNS[15], 'Invoice');
  assert.strictEqual(CONSULTANCY_TEMPLATE_COLUMNS[16], 'Payment Receipt');

  const missingCheck = validateConsultancyHeaderColumns(CONSULTANCY_TEMPLATE_COLUMNS);
  assert.strictEqual(missingCheck.length, 0, 'Official template headers must pass column validation');
  console.log('  ✓ [PASS] Exact 17 approved columns in strict specification order');

  const reqTemplate = { query: { format: 'xlsx' } };
  const resTemplate = createMockRes();
  await consultancyController.downloadConsultancyTemplate(reqTemplate, resTemplate);
  assert.strictEqual(resTemplate.statusCode, 200);
  assert(Buffer.isBuffer(resTemplate.body), 'Must return buffer');
  console.log('  ✓ [PASS] downloadConsultancyTemplate streams valid xlsx buffer');

  // --- Suite 2: Multi-Faculty EmpId Normalization & Parsing ---
  console.log('\n--- Suite 2: Multi-Faculty EmpId Normalization ---');
  const parsedSingle = parseAndNormalizeEmpIds('3489');
  assert.deepStrictEqual(parsedSingle.empIds, ['3489']);

  const parsedMulti = parseAndNormalizeEmpIds('3489, 2043, 0055');
  assert.deepStrictEqual(parsedMulti.empIds, ['3489', '2043', '0055']);
  assert.strictEqual(parsedMulti.empIds[2], '0055', 'Leading zeros must be preserved');

  const parsedDuplicates = parseAndNormalizeEmpIds('3489, 2043, 3489,  2043 ');
  assert.deepStrictEqual(parsedDuplicates.empIds, ['3489', '2043'], 'Duplicates within row must be deduplicated');
  assert.deepStrictEqual(parsedDuplicates.duplicateEmpIds, ['3489', '2043']);
  console.log('  ✓ [PASS] EmpId normalization preserves leading zeros and deduplicates within row');

  // --- Suite 3: Authoritative Consultancy Start Year Derivation ---
  console.log('\n--- Suite 3: Consultancy Start Year Derivation ---');
  assert.strictEqual(deriveConsultancyStartYear('15/08/2024').consultancyStartYear, 2024);
  assert.strictEqual(deriveConsultancyStartYear('2024-08-15').consultancyStartYear, 2024);
  assert.strictEqual(deriveConsultancyStartYear('2023/11/01').consultancyStartYear, 2023);
  assert.strictEqual(deriveConsultancyStartYear('10-Jan-2025').consultancyStartYear, 2025);
  assert.strictEqual(deriveConsultancyStartYear(null).consultancyStartYear, null);
  console.log('  ✓ [PASS] Start Year derived accurately as calendar year from Start Date');

  // --- Suite 4: Project Type Classification ---
  console.log('\n--- Suite 4: Project Type Classification ---');
  VALID_PROJECT_TYPES.forEach(tp => {
    const res = normalizeProjectType(tp);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.projectType, tp);
  });
  const customOther = normalizeProjectType('Others - CSR Sponsored Advisory');
  assert.strictEqual(customOther.valid, true);
  assert.strictEqual(customOther.projectType, 'Others');
  assert.strictEqual(customOther.otherProjectTypeDescription, 'CSR Sponsored Advisory');

  const invalidType = normalizeProjectType('CompletelyBogusType');
  assert.strictEqual(invalidType.valid, false);
  console.log('  ✓ [PASS] 5 valid Project Types and "Others - description" parsed accurately');

  // --- Suite 5: Four-Part Duplicate Detection ---
  console.log('\n--- Suite 5: Four-Part Duplicate Detection ---');
  const key1 = generateConsultancyDuplicateKeys({
    agencyName: 'Tata Consultancy Services',
    projectName: 'Smart Grid AI',
    startDate: '2024-05-10',
    empIds: ['3489', '2043']
  });
  const key2 = generateConsultancyDuplicateKeys({
    agencyName: 'TATA CONSULTANCY SERVICES',
    projectName: 'Smart Grid AI',
    startDate: '2024-05-10',
    empIds: ['2043', '3489'] // Reordered EmpIds!
  });
  assert.strictEqual(key1.duplicateKey, key2.duplicateKey, 'Duplicate key must be unordered with respect to EmpId set');
  console.log('  ✓ [PASS] 4-part duplicate key matches unordered EmpId sets case-insensitively');

  // --- Suite 6: Live API getConsultancyProjects (No "faculty.school does not exist" error) ---
  console.log('\n--- Suite 6: Live API Execution ---');
  const reqList = { user: adminUser, query: {} };
  const resList = createMockRes();
  await consultancyController.getConsultancyProjects(reqList, resList);
  assert.strictEqual(resList.statusCode, 200, `API must return 200, got ${resList.statusCode}: ${JSON.stringify(resList.body)}`);
  assert.strictEqual(resList.body.success, true);
  console.log(`  ✓ [PASS] getConsultancyProjects returned 200 OK without school column error (count: ${resList.body.count})`);

  // Test faculty search
  const reqSearch = { user: adminUser, query: { q: 'a' } };
  const resSearch = createMockRes();
  await consultancyController.searchFacultyDirectory(reqSearch, resSearch);
  assert.strictEqual(resSearch.statusCode, 200);
  assert.strictEqual(resSearch.body.success, true);
  assert(Array.isArray(resSearch.body.data));
  console.log(`  ✓ [PASS] searchFacultyDirectory returned 200 OK with ${resSearch.body.data.length} records`);

  // Test stats endpoint
  const reqStats = { user: adminUser, query: {} };
  const resStats = createMockRes();
  await consultancyController.getConsultancyStats(reqStats, resStats);
  assert.strictEqual(resStats.statusCode, 200);
  assert.strictEqual(resStats.body.success, true);
  assert(Array.isArray(resStats.body.data.byProjectType), 'Stats must include byProjectType breakdown');
  console.log('  ✓ [PASS] getConsultancyStats returned 200 OK with byProjectType breakdown');

  console.log('\n================================================================');
  console.log('   ALL CONSULTANCY TESTS PASSED SUCCESSFULLY (100%)');
  console.log('================================================================');
  process.exit(0);
}

run().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});

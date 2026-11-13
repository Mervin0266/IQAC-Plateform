'use strict';

const assert = require('assert');
const { sequelize } = require('../config/database');
const { Patent, PatentFaculty, PatentProof, Faculty, User } = require('../models');
const patentController = require('../controllers/patentController');

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function run() {
  console.log('--- Testing patentController.clearAllPatents ---');

  let adminUser = await User.findOne({ where: { role: 'admin' } });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'Test ClearAll Admin',
      email: 'test.clearall@christuniversity.in',
      password: 'placeholder_password',
      role: 'admin',
      department: 'IQAC'
    });
  }

  // 1. Create a dummy patent with junction records
  const patent = await Patent.create({
    title: 'CLEAR_ALL_TEST_PATENT',
    applicationNo: 'APP_CLEAR_TEST_001',
    status: 'Published',
    patentType: 'National',
    department: 'Computer Science and Engineering',
    publicationYear: 2026,
    publishedDate: '2026-05-15',
    filedDate: '2025-01-10',
    inventors: 'Dr. Test Inventor',
    empIdsRaw: 'CU_TEST_999'
  });

  const junction = await PatentFaculty.create({
    patentId: patent.id,
    employeeId: 'CU_TEST_999',
    normalizedEmployeeId: 'CU_TEST_999',
    facultyName: 'Dr. Test Inventor',
    designation: 'Professor',
    originalDepartment: 'Computer Science and Engineering',
    isValid: true
  });

  // Verify created
  assert(patent.id, 'Patent created');
  assert(junction.id, 'Junction created');

  // 2. Test clearAllPatents with empty query/body (verifying backend admin auto-injection)
  const req1 = {
    user: {
      id: adminUser.id,
      role: 'admin',
      isSystemAdmin: true,
      department: 'IQAC'
    },
    query: {},
    body: {}
  };
  const res1 = createMockRes();

  await patentController.clearAllPatents(req1, res1);

  console.log('Response 1 Status:', res1.statusCode);
  console.log('Response 1 Body:', res1.body);

  assert.strictEqual(res1.statusCode, 200, 'Status should be 200');
  assert.strictEqual(res1.body.success, true, 'Result should be success: true');
  assert(res1.body.count >= 1, 'Should have deleted at least 1 patent');

  // Verify patent and junction are gone
  const foundPatent = await Patent.findByPk(patent.id);
  assert.strictEqual(foundPatent, null, 'Patent should be destroyed');

  const foundJunction = await PatentFaculty.findOne({ where: { patentId: patent.id } });
  assert.strictEqual(foundJunction, null, 'PatentFaculty junction should be destroyed');

  // 3. Test clearAllPatents with explicit dual confirmation parameters (as sent by PatentsPage.tsx)
  const patent2 = await Patent.create({
    title: 'CLEAR_ALL_TEST_PATENT_2',
    applicationNo: 'APP_CLEAR_TEST_002',
    status: 'Filed',
    patentType: 'National',
    department: 'Mechanical and Automobile Engineering',
    filedDate: '2026-02-20',
    inventors: 'Dr. Test Inventor 2',
    empIdsRaw: 'CU_TEST_888'
  });

  const req2 = {
    user: {
      id: adminUser.id,
      role: 'admin',
      isSystemAdmin: true,
      department: 'IQAC'
    },
    query: {
      confirmAll: 'true',
      confirmation: 'CONFIRM_UNIVERSITY_CLEAR'
    },
    body: {
      confirmAll: true,
      confirmation: 'CONFIRM_UNIVERSITY_CLEAR'
    }
  };
  const res2 = createMockRes();

  await patentController.clearAllPatents(req2, res2);

  console.log('Response 2 Status:', res2.statusCode);
  console.log('Response 2 Body:', res2.body);

  assert.strictEqual(res2.statusCode, 200, 'Status should be 200');
  assert.strictEqual(res2.body.success, true, 'Result should be success: true');

  const foundPatent2 = await Patent.findByPk(patent2.id);
  assert.strictEqual(foundPatent2, null, 'Patent 2 should be destroyed');

  console.log('✓ All clearAllPatents tests PASSED!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});


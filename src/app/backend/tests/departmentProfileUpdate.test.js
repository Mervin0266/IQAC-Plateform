'use strict';

/**
 * CHRIST UNIVERSITY IQAC PLATFORM
 * Department Profile Update & Persistence Test Suite
 * 
 * Verifies:
 * 1. Successful PUT /api/departments/:id persistence with supported fields:
 *    (code, name, hodName, hodEmail, establishedYear, phone, description, status)
 * 2. Persistence verification: re-reading department confirms updated values.
 * 3. HOD Name & HOD Email validation: empty/null fields allowed without blocking edits.
 * 4. Duplicate prevention: duplicate code or name is caught and returns HTTP 400.
 * 5. Non-existent department UUID returns HTTP 404.
 * 6. Payload whitelisting: arbitrary or unauthorized properties are filtered out.
 * 7. Error handling: constraint violations return descriptive 400 messages.
 */

const assert = require('assert');
const { updateDepartment } = require('../controllers/departmentController');
const { Department, School, User } = require('../models');

console.log('================================================================');
console.log('  CHRIST University IQAC - Department Profile Update Test Suite');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}\n`);
  }
}

// Helper to create mock response object
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

// In-memory mock store for testing controller logic
const mockDepartmentStore = new Map();

function seedMockStore() {
  mockDepartmentStore.clear();
  mockDepartmentStore.set('a1b2c3d4-e5f6-7890-abcd-111111111111', {
    id: 'a1b2c3d4-e5f6-7890-abcd-111111111111',
    code: 'CSE',
    name: 'Computer Science and Engineering',
    shortName: 'CSE',
    hodName: 'Dr. Priya Sharma',
    hodEmail: 'priya.sharma@christuniversity.in',
    establishedYear: 2010,
    phone: '+91 80 4012 9101',
    description: 'Original CSE department description',
    status: 'Active',
    async update(values) {
      Object.assign(this, values);
      return this;
    }
  });

  mockDepartmentStore.set('a1b2c3d4-e5f6-7890-abcd-222222222222', {
    id: 'a1b2c3d4-e5f6-7890-abcd-222222222222',
    code: 'ECE',
    name: 'Electronics and Communication Engineering',
    shortName: 'ECE',
    hodName: 'Dr. Deepa Singh',
    hodEmail: 'deepa.singh@christuniversity.in',
    establishedYear: 2010,
    phone: '+91 80 4012 9102',
    description: 'ECE department description',
    status: 'Active',
    async update(values) {
      Object.assign(this, values);
      return this;
    }
  });
}

// Hook Department model methods for tests
const originalFindByPk = Department.findByPk;
const originalFindOne = Department.findOne;

function hookDepartmentModel() {
  Department.findByPk = async (id) => {
    return mockDepartmentStore.get(id) || null;
  };

  Department.findOne = async ({ where }) => {
    for (const dept of mockDepartmentStore.values()) {
      if (where.code && dept.code.toUpperCase() === where.code.toUpperCase()) {
        if (where.id && where.id[Object.getOwnPropertySymbols(where.id)[0]] === dept.id) {
          continue;
        }
        return dept;
      }
      if (where.name && dept.name.toLowerCase() === where.name.toLowerCase()) {
        if (where.id && where.id[Object.getOwnPropertySymbols(where.id)[0]] === dept.id) {
          continue;
        }
        return dept;
      }
    }
    return null;
  };
}

function restoreDepartmentModel() {
  Department.findByPk = originalFindByPk;
  Department.findOne = originalFindOne;
}

(async () => {
  hookDepartmentModel();

  // -------------------------------------------------------------
  // TEST SUITE 1: Successful Department Profile Update & Persistence
  // -------------------------------------------------------------
  console.log('--- Suite 1: Successful Department Profile Update & Persistence ---');

  await runAsyncTest('updateDepartment: updates HOD Name, HOD Email, Phone, Description and persists', async () => {
    seedMockStore();
    const deptId = 'a1b2c3d4-e5f6-7890-abcd-111111111111';

    const req = {
      params: { id: deptId },
      body: {
        code: 'CSE',
        name: 'Computer Science and Engineering',
        hodName: 'Dr. Rajesh Kumar Updated',
        hodEmail: 'rajesh.updated@christuniversity.in',
        phone: '+91 80 4012 9999',
        description: 'Updated state-of-the-art computer science department vision.',
        establishedYear: 2011,
        status: 'Active'
      }
    };
    const res = createMockRes();

    await updateDepartment(req, res);

    assert.strictEqual(res.statusCode, 200, 'Should return HTTP 200');
    assert.strictEqual(res.body.success, true, 'Response success should be true');
    assert.strictEqual(res.body.data.hodName, 'Dr. Rajesh Kumar Updated');
    assert.strictEqual(res.body.data.hodEmail, 'rajesh.updated@christuniversity.in');
    assert.strictEqual(res.body.data.phone, '+91 80 4012 9999');
    assert.strictEqual(res.body.data.description, 'Updated state-of-the-art computer science department vision.');
    assert.strictEqual(res.body.data.establishedYear, 2011);

    // Verify persistence: re-fetch from store to ensure changes actually persisted
    const persisted = mockDepartmentStore.get(deptId);
    assert.strictEqual(persisted.hodName, 'Dr. Rajesh Kumar Updated', 'Persisted HOD name must match');
    assert.strictEqual(persisted.hodEmail, 'rajesh.updated@christuniversity.in', 'Persisted HOD email must match');
    assert.strictEqual(persisted.phone, '+91 80 4012 9999', 'Persisted phone must match');
    assert.strictEqual(persisted.description, 'Updated state-of-the-art computer science department vision.', 'Persisted description must match');
    assert.strictEqual(persisted.establishedYear, 2011, 'Persisted established year must match');
  });

  // -------------------------------------------------------------
  // TEST SUITE 2: Empty/Null HOD Name & Email Handling (Requirement 11)
  // -------------------------------------------------------------
  console.log('\n--- Suite 2: Empty HOD Fields Do Not Prevent Legitimate Edits (Req 11) ---');

  await runAsyncTest('updateDepartment: allows updating description and phone when HOD Name and Email are empty', async () => {
    seedMockStore();
    const deptId = 'a1b2c3d4-e5f6-7890-abcd-111111111111';

    const req = {
      params: { id: deptId },
      body: {
        code: 'CSE',
        name: 'Computer Science and Engineering',
        hodName: null,
        hodEmail: null,
        phone: '+91 80 4012 5555',
        description: 'Department with currently vacant HOD chair.',
        establishedYear: 2010,
        status: 'Active'
      }
    };
    const res = createMockRes();

    await updateDepartment(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.hodName, null);
    assert.strictEqual(res.body.data.hodEmail, null);
    assert.strictEqual(res.body.data.phone, '+91 80 4012 5555');

    const persisted = mockDepartmentStore.get(deptId);
    assert.strictEqual(persisted.hodName, null);
    assert.strictEqual(persisted.hodEmail, null);
    assert.strictEqual(persisted.phone, '+91 80 4012 5555');
  });

  // -------------------------------------------------------------
  // TEST SUITE 3: Validation, Duplicate Detection & Not Found
  // -------------------------------------------------------------
  console.log('\n--- Suite 3: Error Handling, 404, and Duplicate Code/Name Rejection ---');

  await runAsyncTest('updateDepartment: non-existent department UUID returns HTTP 404', async () => {
    seedMockStore();
    const req = {
      params: { id: '00000000-0000-0000-0000-000000000000' },
      body: { name: 'Non Existent' }
    };
    const res = createMockRes();

    await updateDepartment(req, res);

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, 'Department not found');
  });

  await runAsyncTest('updateDepartment: rejects duplicate department code with descriptive HTTP 400', async () => {
    seedMockStore();
    // Try to update department 1 (CSE) with code 'ECE' which already belongs to department 2
    const req = {
      params: { id: 'a1b2c3d4-e5f6-7890-abcd-111111111111' },
      body: {
        code: 'ECE',
        name: 'Computer Science and Engineering'
      }
    };
    const res = createMockRes();

    await updateDepartment(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('already assigned to'), `Message should mention duplicate code: ${res.body.message}`);
  });

  await runAsyncTest('updateDepartment: rejects duplicate department name with descriptive HTTP 400', async () => {
    seedMockStore();
    // Try to update department 1 with name of department 2
    const req = {
      params: { id: 'a1b2c3d4-e5f6-7890-abcd-111111111111' },
      body: {
        code: 'CSE',
        name: 'Electronics and Communication Engineering'
      }
    };
    const res = createMockRes();

    await updateDepartment(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('already registered'), `Message should mention duplicate name: ${res.body.message}`);
  });

  // -------------------------------------------------------------
  // TEST SUITE 4: Payload Whitelisting & Status Update
  // -------------------------------------------------------------
  console.log('\n--- Suite 4: Payload Whitelisting & Status Management ---');

  await runAsyncTest('updateDepartment: filters out unauthorized/arbitrary properties from update payload', async () => {
    seedMockStore();
    const deptId = 'a1b2c3d4-e5f6-7890-abcd-111111111111';

    let updatedPayload = null;
    const originalDept = mockDepartmentStore.get(deptId);
    originalDept.update = async (values) => {
      updatedPayload = values;
      Object.assign(originalDept, values);
      return originalDept;
    };

    const req = {
      params: { id: deptId },
      body: {
        code: 'CSE',
        name: 'Computer Science and Engineering',
        status: 'Inactive',
        maliciousAdminFlag: true,
        injectedDatabaseQuery: 'DROP TABLE departments;'
      }
    };
    const res = createMockRes();

    await updateDepartment(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(updatedPayload.status, 'Inactive');
    assert.strictEqual(updatedPayload.maliciousAdminFlag, undefined, 'Unauthorized properties must be excluded');
    assert.strictEqual(updatedPayload.injectedDatabaseQuery, undefined, 'Injected properties must be excluded');
  });

  await runAsyncTest('updateDepartment: toggling status between Active and Inactive persists', async () => {
    seedMockStore();
    const deptId = 'a1b2c3d4-e5f6-7890-abcd-222222222222';

    const req = {
      params: { id: deptId },
      body: { status: 'Inactive' }
    };
    const res = createMockRes();

    await updateDepartment(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.data.status, 'Inactive');
    const persisted = mockDepartmentStore.get(deptId);
    assert.strictEqual(persisted.status, 'Inactive');
  });

  restoreDepartmentModel();

  console.log('\n================================================================');
  console.log(`   Department Profile Update Results: ${passedTests}/${totalTests} Passed`);
  console.log('================================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
})();


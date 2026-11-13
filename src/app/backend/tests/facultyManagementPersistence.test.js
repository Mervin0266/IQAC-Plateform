const assert = require('assert');
const {
  createFaculty,
  updateFaculty,
  getFaculty,
  bulkCreateFaculty,
  sanitizeFacultyRecord
} = require('../controllers/facultyController');
const { Faculty, sequelize } = require('../models');

let passed = 0;
let total = 0;

function runSyncTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    process.exitCode = 1;
  }
}

async function runAsyncTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    process.exitCode = 1;
  }
}

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

async function main() {
  console.log('\n======================================================================');
  console.log('  Faculty Management Single & Bulk Persistence Verification Test Suite');
  console.log('======================================================================\n');

  // ------------------------------------------------------------------
  // 1. Data Normalization & Date Sanitization Unit Tests
  // ------------------------------------------------------------------
  console.log('--- Suite 1: sanitizeFacultyRecord Unit Tests ---');

  runSyncTest('1.1 Normalizes empty strings for dateOfBirth and dateOfJoining to null', () => {
    const raw = {
      employeeId: 'CU1001',
      name: 'Dr. Test User',
      dateOfBirth: '',
      dateOfJoining: '',
      gender: '',
      highestQualification: '   ',
      panCardNo: 'NIL'
    };
    const sanitized = sanitizeFacultyRecord(raw, true);
    assert.strictEqual(sanitized.dateOfBirth, null, 'Empty dateOfBirth must be null');
    assert.strictEqual(sanitized.dateOfJoining, null, 'Empty dateOfJoining must be null');
    assert.strictEqual(sanitized.gender, null, 'Invalid/empty gender must be null');
    assert.strictEqual(sanitized.highestQualification, null, 'Whitespace string must be null');
    assert.strictEqual(sanitized.panCardNo, null, 'NIL string must be null');
    assert.strictEqual(sanitized.academicYear, '2024-2025', 'Default academicYear must be set');
    assert.strictEqual(sanitized.status, 'Active', 'Default status must be Active');
  });

  runSyncTest('1.2 Parses valid dates and enum values correctly', () => {
    const raw = {
      employeeId: 'CU1002',
      name: 'Dr. Valid Dates',
      dateOfBirth: '1985-04-12',
      dateOfJoining: '2020-08-01',
      gender: 'female',
      status: 'on sabbatical'
    };
    const sanitized = sanitizeFacultyRecord(raw, true);
    assert.strictEqual(sanitized.dateOfBirth, '1985-04-12');
    assert.strictEqual(sanitized.dateOfJoining, '2020-08-01');
    assert.strictEqual(sanitized.gender, 'Female');
    assert.strictEqual(sanitized.status, 'On Sabbatical');
  });

  // ------------------------------------------------------------------
  // 2. Integration Tests: createFaculty and Database Reflection
  // ------------------------------------------------------------------
  console.log('\n--- Suite 2: createFaculty Persistence & Reflection ---');

  const testEmpId = `TEST_FAC_${Date.now()}`;

  await runAsyncTest('2.1 createFaculty successfully saves record with empty date fields without 500 error', async () => {
    const req = {
      user: { id: 'admin-test', role: 'admin' },
      body: {
        employeeId: testEmpId,
        name: 'Dr. Automated Persistence Test',
        designation: 'Associate Professor',
        department: 'Computer Science and Engineering',
        academicYear: '2025-2026',
        highestQualification: 'Ph.D. in AI',
        dateOfBirth: '',
        panCardNo: '',
        dateOfJoining: '',
        prevTeachingExpYears: '5',
        prevTeachingExpMonths: '0',
        prevIndustryExpYears: '2',
        prevIndustryExpMonths: '0',
        qualificationLevel: 'PhD',
        cuExpYears: '3',
        cuExpMonths: '0',
        gender: '',
        status: 'Active'
      }
    };

    const res = createMockRes();
    await createFaculty(req, res);

    assert.strictEqual(res.statusCode, 201, `Expected 201 Created, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data);
    assert.strictEqual(res.body.data.employeeId, testEmpId);
    assert.strictEqual(res.body.data.name, 'Dr. Automated Persistence Test');
    assert.strictEqual(res.body.data.dateOfJoining, null);
    assert.strictEqual(res.body.data.dateOfBirth, null);
  });

  await runAsyncTest('2.2 getFaculty immediately reflects the newly created faculty record in DB queries', async () => {
    const req = {
      user: { id: 'admin-test', role: 'admin' },
      query: {
        search: testEmpId,
        academicYear: 'All'
      }
    };

    const res = createMockRes();
    await getFaculty(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    const found = res.body.data.find(f => f.employeeId === testEmpId);
    assert.ok(found, `Newly created faculty ${testEmpId} must be present in getFaculty result`);
    assert.strictEqual(found.name, 'Dr. Automated Persistence Test');
    assert.strictEqual(found.department, 'Computer Science and Engineering');
  });

  await runAsyncTest('2.3 createFaculty with existing employeeId in same academicYear updates safely', async () => {
    const req = {
      user: { id: 'admin-test', role: 'admin' },
      body: {
        employeeId: testEmpId,
        name: 'Dr. Automated Persistence Test (Updated)',
        designation: 'Professor',
        department: 'Computer Science and Engineering',
        academicYear: '2025-2026',
        highestQualification: 'Ph.D. in Computer Science & Engineering',
        dateOfBirth: '',
        dateOfJoining: '2021-06-15'
      }
    };

    const res = createMockRes();
    await createFaculty(req, res);

    assert.strictEqual(res.statusCode, 200, `Expected 200 OK for update, got ${res.statusCode}`);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.name, 'Dr. Automated Persistence Test (Updated)');
    assert.strictEqual(res.body.data.designation, 'Professor');
    assert.strictEqual(res.body.data.dateOfJoining, '2021-06-15');
  });

  await runAsyncTest('2.4 updateFaculty PUT endpoint safely updates faculty record', async () => {
    const faculty = await Faculty.findOne({ where: { employeeId: testEmpId } });
    assert.ok(faculty, 'Faculty record must exist in DB');

    const req = {
      params: { id: faculty.id },
      user: { id: 'admin-test', role: 'admin' },
      body: {
        name: 'Dr. Fully Verified Professor',
        designation: 'Senior Professor',
        dateOfBirth: ''
      }
    };

    const res = createMockRes();
    await updateFaculty(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.name, 'Dr. Fully Verified Professor');
    assert.strictEqual(res.body.data.designation, 'Senior Professor');
  });

  await runAsyncTest('2.5 createFaculty validates mandatory fields and returns clean 400 when missing', async () => {
    const req = {
      user: { id: 'admin-test', role: 'admin' },
      body: {
        employeeId: '',
        name: '',
        designation: '',
        department: ''
      }
    };

    const res = createMockRes();
    await createFaculty(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('required'));
  });

  // Cleanup test record
  await Faculty.destroy({ where: { employeeId: testEmpId } });

  console.log('\n======================================================================');
  console.log(`  FACULTY PERSISTENCE TEST RESULTS: ${passed} / ${total} Passed`);
  console.log('======================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});


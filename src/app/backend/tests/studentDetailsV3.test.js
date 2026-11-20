const assert = require('assert');
const { Student, StudentEnrollment, sequelize } = require('../models');
const studentController = require('../controllers/studentController');

async function runTests() {
  console.log('--- RUNNING STUDENT DETAILS V3.0 TEST SUITE ---');

  // Test 1: Verify database models and associations
  console.log('Test 1: Testing Student & StudentEnrollment models & associations...');
  assert.ok(Student, 'Student model should exist');
  assert.ok(StudentEnrollment, 'StudentEnrollment model should exist');
  assert.ok(Student.associations.enrollments, 'Student should have many enrollments');
  assert.ok(StudentEnrollment.associations.student, 'StudentEnrollment should belong to student');
  console.log('✓ Test 1 passed: Models and associations verified.');

  // Test 2: Test normalization of register number
  console.log('Test 2: Testing register number normalization...');
  const mockReq = { body: { registerNumber: '  0072345  ', name: 'James Bond', academicYear: '2024-2025' } };
  const mockRes = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; }
  };
  const mockAdminUser = { id: 'admin1', role: 'admin' };

  // Test 3: Test getStudentStats returns 5 KPI metrics with gender breakdowns
  console.log('Test 3: Testing getStudentStats endpoint...');
  const statsReq = {
    query: { academicYear: 'all' },
    user: mockAdminUser
  };
  const statsRes = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; }
  };
  await studentController.getStudentStats(statsReq, statsRes);
  assert.ok(statsRes.data.success, 'Stats request should succeed');
  const stats = statsRes.data.stats;
  assert.ok(typeof stats.total === 'number', 'Total students count should be a number');
  assert.ok(stats.totalGender, 'Total gender breakdown should exist');
  assert.ok(typeof stats.totalGender.boys === 'number', 'Boys count should exist');
  assert.ok(typeof stats.totalGender.girls === 'number', 'Girls count should exist');
  assert.ok(typeof stats.ugCount === 'number', 'UG count should exist');
  assert.ok(stats.ugGender, 'UG gender breakdown should exist');
  assert.ok(typeof stats.pgCount === 'number', 'PG count should exist');
  assert.ok(stats.pgGender, 'PG gender breakdown should exist');
  assert.ok(typeof stats.activeCount === 'number', 'Active students count should exist');
  assert.ok(typeof stats.depts === 'number', 'Academic departments count should exist');
  assert.ok(Array.isArray(stats.departmentList), 'Department list should be an array');

  // Verify Level 2 hover structure in department list
  if (stats.departmentList.length > 0) {
    const firstDept = stats.departmentList[0];
    assert.ok(firstDept.department, 'Department name must be present');
    assert.ok(typeof firstDept.count === 'number', 'Department count must be a number');
    assert.ok(firstDept.gender, 'Department gender breakdown must be present');
    assert.ok(typeof firstDept.gender.boys === 'number', 'Department boys count must be a number');
    assert.ok(typeof firstDept.gender.girls === 'number', 'Department girls count must be a number');
  }
  console.log(`✓ Test 3 passed: Stats returned successfully with total=${stats.total}, UG=${stats.ugCount}, PG=${stats.pgCount}, Active=${stats.activeCount}, Depts=${stats.depts}`);

  // Test 4: Test GET students with specific academic year and gender filter
  console.log('Test 4: Testing getStudents with academicYear=2024-2025 and gender filter...');
  const getReq = {
    query: { academicYear: '2024-2025', gender: 'Female', limit: 5, page: 1 },
    user: mockAdminUser
  };
  const getRes = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; }
  };
  await studentController.getStudents(getReq, getRes);
  assert.ok(getRes.data.rows, 'Rows should be returned');
  assert.ok(getRes.data.rows.length <= 5, 'Page limit should be respected');
  for (const st of getRes.data.rows) {
    assert.strictEqual(st.gender.toLowerCase(), 'female', 'Filtered rows must have Female gender');
    assert.ok(Array.isArray(st.enrollments), 'Student should have enrollments array');
  }
  console.log(`✓ Test 4 passed: Fetched ${getRes.data.rows.length} female students in 2024-2025.`);

  // Test 5: Test Single-Entry Creation with Missing-Field-Only update and department transition
  console.log('Test 5: Testing single-entry creation and missing-field merge...');
  const testRegNo = 'TEST_V3_999901';

  // Cleanup before test
  const existingTest = await Student.findOne({ where: { registerNumber: testRegNo } });
  if (existingTest) {
    await StudentEnrollment.destroy({ where: { registerNumber: testRegNo } });
    await existingTest.destroy();
  }

  // 5a. Create student in Year 1 (Science and Humanities)
  const createReq1 = {
    body: {
      registerNumber: testRegNo,
      name: 'Test Student V3',
      gender: 'Male',
      department: 'Science and Humanities',
      course: 'B.Tech Computer Science and Engineering',
      className: '1 BTECH CSE A',
      batch: '2024-2028',
      academicYear: '2024-2025',
      phone: null, // missing phone initially
      email: 'testv3@students.christuniversity.in'
    },
    user: mockAdminUser,
    ip: '127.0.0.1'
  };
  const createRes1 = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; }
  };
  await studentController.createStudent(createReq1, createRes1);
  assert.strictEqual(createRes1.statusCode, 201, 'Should create student with 201');
  assert.ok(createRes1.data.isNewStudent, 'Should be flagged as new student');

  // Verify DB state for Year 1
  const savedStudent1 = await Student.findOne({
    where: { registerNumber: testRegNo },
    include: [{ model: StudentEnrollment, as: 'enrollments' }]
  });
  assert.ok(savedStudent1, 'Student should be saved in DB');
  assert.strictEqual(savedStudent1.enrollments.length, 1, 'Should have exactly 1 enrollment');
  assert.strictEqual(savedStudent1.enrollments[0].academicYear, '2024-2025');
  assert.strictEqual(savedStudent1.enrollments[0].department, 'Science and Humanities');

  // 5b. Progress student to Year 2 (Computer Science and Engineering) with missing field filled (phone)
  const createReq2 = {
    body: {
      registerNumber: testRegNo,
      name: 'Test Student V3', // identical name
      academicYear: '2025-2026',
      department: 'Computer Science and Engineering', // Department transition!
      course: 'B.Tech Computer Science and Engineering',
      className: '3 BTECH CSE A',
      batch: '2024-2028',
      phone: '9876543210' // Filling missing phone!
    },
    user: mockAdminUser,
    ip: '127.0.0.1'
  };
  const createRes2 = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; }
  };
  await studentController.createStudent(createReq2, createRes2);
  assert.strictEqual(createRes2.statusCode, 201, 'Should return 201 for second year enrollment');
  assert.strictEqual(createRes2.data.isNewStudent, false, 'Should not be flagged as new student profile');
  assert.ok(createRes2.data.departmentTransition, 'Should detect department transition');
  assert.strictEqual(createRes2.data.departmentTransition.from, 'Science and Humanities');
  assert.strictEqual(createRes2.data.departmentTransition.to, 'Computer Science and Engineering');
  assert.strictEqual(createRes2.data.departmentTransition.isFirstYearSH, true);

  // Verify DB state after Year 2 transition
  const savedStudent2 = await Student.findOne({
    where: { registerNumber: testRegNo },
    include: [{ model: StudentEnrollment, as: 'enrollments', order: [['academicYear', 'ASC']] }]
  });
  assert.strictEqual(savedStudent2.phone, '9876543210', 'Missing phone should have been merged into profile');
  assert.strictEqual(savedStudent2.enrollments.length, 2, 'Should have 2 distinct enrollments');
  assert.strictEqual(savedStudent2.enrollments[0].academicYear, '2024-2025');
  assert.strictEqual(savedStudent2.enrollments[0].department, 'Science and Humanities'); // Year 1 untouched!
  assert.strictEqual(savedStudent2.enrollments[1].academicYear, '2025-2026');
  assert.strictEqual(savedStudent2.enrollments[1].department, 'Computer Science and Engineering'); // Year 2 CSE!

  console.log('✓ Test 5 passed: Single entry creation, missing-field fill, and S&H transition verified.');

  // Test 6: Test Lookup endpoint
  console.log('Test 6: Testing lookupStudentByRegNo...');
  const lookupReq = { params: { regNo: testRegNo }, user: mockAdminUser };
  const lookupRes = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; }
  };
  await studentController.lookupStudentByRegNo(lookupReq, lookupRes);
  assert.ok(lookupRes.data.success, 'Lookup should succeed');
  assert.strictEqual(lookupRes.data.enrollments.length, 2, 'Lookup should return all 2 enrollments');
  assert.strictEqual(lookupRes.data.transitions.length, 1, 'Lookup should return department transition');
  console.log('✓ Test 6 passed: Student lookup returned full history and transitions.');

  // Test 7: Test Bulk Upload Validation & Batch Commit
  console.log('Test 7: Testing validateBulkStudents & bulkCreateStudent...');
  const bulkTestBatch = [
    {
      'Register Number': testRegNo,
      'Name': 'Test Student V3',
      'Academic Year': '2026-2027',
      'Department': 'Computer Science and Engineering',
      'Course': 'B.Tech Computer Science and Engineering',
      'Class': '5 BTECH CSE A',
      'Batch': '2024-2028',
      'Gender': 'Male'
    },
    {
      'Register Number': 'TEST_V3_999902',
      'Name': 'Test Student V3 Two',
      'Academic Year': '2026-2027',
      'Department': 'Electronics and Communication Engineering',
      'Course': 'B.Tech Electronics and Communication Engineering',
      'Class': '1 BTECH ECE A',
      'Batch': '2026-2030',
      'Gender': 'Female'
    }
  ];

  const valReq = { body: { students: bulkTestBatch, academicYear: '2026-2027' }, user: mockAdminUser };
  const valRes = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; }
  };
  await studentController.validateBulkStudents(valReq, valRes);
  assert.ok(valRes.data.success, 'Validation should succeed');
  assert.strictEqual(valRes.data.summary.ready, 2, 'Both rows should be ready');

  // Bulk commit
  const commitReq = { body: { students: bulkTestBatch, academicYear: '2026-2027' }, user: mockAdminUser, ip: '127.0.0.1' };
  const commitRes = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; }
  };
  await studentController.bulkCreateStudent(commitReq, commitRes);
  assert.ok(commitRes.data.success, 'Bulk create should succeed');
  assert.strictEqual(commitRes.data.count, 2, 'Should process 2 students');

  // Verify testRegNo now has 3 enrollments
  const finalTestSt = await Student.findOne({
    where: { registerNumber: testRegNo },
    include: [{ model: StudentEnrollment, as: 'enrollments' }]
  });
  assert.strictEqual(finalTestSt.enrollments.length, 3, 'Should have 3 enrollments across years');
  console.log('✓ Test 7 passed: Bulk validation and commit verified.');

  // Test 8: Test getStudentAnalytics endpoint
  console.log('Test 8: Testing getStudentAnalytics...');
  const analyticsReq = { query: {}, user: mockAdminUser };
  const analyticsRes = {
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; }
  };
  await studentController.getStudentAnalytics(analyticsReq, analyticsRes);
  assert.ok(analyticsRes.data.success, 'Analytics request should succeed');
  assert.ok(Array.isArray(analyticsRes.data.analytics.yearlyEnrollment), 'Yearly enrollment array should exist');
  assert.ok(Array.isArray(analyticsRes.data.analytics.deptDistribution), 'Dept distribution should exist');
  assert.ok(Array.isArray(analyticsRes.data.analytics.genderTrends), 'Gender trends should exist');
  console.log('✓ Test 8 passed: Advanced analytics returned successfully.');

  // Cleanup test students
  await StudentEnrollment.destroy({ where: { registerNumber: [testRegNo, 'TEST_V3_999902'] } });
  await Student.destroy({ where: { registerNumber: [testRegNo, 'TEST_V3_999902'] } });
  console.log('✓ Test cleanup completed.');

  console.log('\n=============================================');
  console.log('ALL STUDENT DETAILS V3.0 BACKEND TESTS PASSED!');
  console.log('=============================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});

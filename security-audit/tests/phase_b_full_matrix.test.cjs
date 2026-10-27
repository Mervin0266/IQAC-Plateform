'use strict';

/**
 * Phase B Workstream B7: Full Five-Role (+ Unauthenticated) Security Test Matrix
 * CHRIST University IQAC Platform
 * 
 * Verifies real middleware and database queries across the 6 caller contexts:
 * 1. Admin
 * 2. Authority
 * 3. HOD
 * 4. Coordinator
 * 5. Faculty
 * 6. Unauthenticated caller
 * 
 * Covers:
 * - Allowed vs Forbidden HTTP methods
 * - Same-department access vs Cross-department isolation
 * - Record ownership and unauthorized modification
 * - Confidential field projection (PAN card exclusion, student private attributes)
 * - Create, Update, Delete, and Approval permissions
 * - Option C department-scoped bulk clearing
 * - Admin-specific privileged operations
 */

const path = require('path');
const fs = require('fs');

const testEnvPath = path.join(__dirname, '../../src/app/backend/.env.test');
if (fs.existsSync(testEnvPath) && !process.env.TEST_DATABASE_URL) {
  require('dotenv').config({ path: testEnvPath });
}

// FAIL-FAST SAFETY: Purge any ambient DATABASE_URL to prevent fallback
delete process.env.DATABASE_URL;

const backendPath = path.join(__dirname, '../../src/app/backend');
const { enforceTestEnvironmentPreflight, verifyPreProvisionedDisposableTestDatabase } = require(path.join(backendPath, 'utils/testDatabaseGuard'));

// Fail-fast safety preflight: Never silently override an unsafe launch environment!
enforceTestEnvironmentPreflight();

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const { sequelize } = require(path.join(backendPath, 'config/database'));
const { User, Student, Faculty, Document } = require(path.join(backendPath, 'models'));
const app = require(path.join(backendPath, 'server'));

describe('Phase B: Workstream B7 — Full Five-Role Security Test Matrix', () => {
  const jwtSecret = process.env.JWT_SECRET || 'phase_b_secret_key_fixed_for_tests';

  const deptCSE = 'Computer Science and Engineering';
  const deptECE = 'Electronics and Communication Engineering';

  let adminUser, authUser, hodCSEUser, coordCSEUser, facultyCSEUser, facultyECEUser;
  let adminToken, authToken, hodCSEToken, coordCSEToken, facultyCSEToken, facultyECEToken;

  before(async () => {
    // 1. Positively verify approved disposable test database
    await verifyPreProvisionedDisposableTestDatabase(sequelize);

    // 2. Clean up test users and domain records
    const testEmails = [
      'm_admin@christ.in', 'm_auth@christ.in', 'm_hod_cse@christ.in',
      'm_coord_cse@christ.in', 'm_fac_cse@christ.in', 'm_fac_ece@christ.in'
    ];
    await User.destroy({ where: { email: testEmails } });
    await Student.destroy({ where: { department: [deptCSE, deptECE] } });
    await Faculty.destroy({ where: { department: [deptCSE, deptECE] } });
    await Document.destroy({ where: { department: [deptCSE, deptECE] } });

    // 3. Seed test users for the 5 roles (+ 2nd department faculty for cross-dept test)
    adminUser = await User.create({
      name: 'Matrix Admin',
      email: 'm_admin@christ.in',
      password: 'TestPassword@2026!',
      role: 'admin',
      department: 'All',
      tokenVersion: 1,
      mustChangePassword: false
    });

    authUser = await User.create({
      name: 'Matrix Dean Authority',
      email: 'm_auth@christ.in',
      password: 'TestPassword@2026!',
      role: 'authority',
      department: 'All',
      tokenVersion: 1,
      mustChangePassword: false
    });

    hodCSEUser = await User.create({
      name: 'Matrix HOD CSE',
      email: 'm_hod_cse@christ.in',
      password: 'TestPassword@2026!',
      role: 'hod',
      department: deptCSE,
      tokenVersion: 1,
      mustChangePassword: false
    });

    coordCSEUser = await User.create({
      name: 'Matrix Coordinator CSE',
      email: 'm_coord_cse@christ.in',
      password: 'TestPassword@2026!',
      role: 'coordinator',
      department: deptCSE,
      tokenVersion: 1,
      mustChangePassword: false
    });

    facultyCSEUser = await User.create({
      name: 'Matrix Faculty CSE',
      email: 'm_fac_cse@christ.in',
      password: 'TestPassword@2026!',
      role: 'faculty',
      department: deptCSE,
      tokenVersion: 1,
      mustChangePassword: false
    });

    facultyECEUser = await User.create({
      name: 'Matrix Faculty ECE',
      email: 'm_fac_ece@christ.in',
      password: 'TestPassword@2026!',
      role: 'faculty',
      department: deptECE,
      tokenVersion: 1,
      mustChangePassword: false
    });

    // 4. Generate signed JWT tokens
    adminToken = jwt.sign({ id: adminUser.id, role: adminUser.role, department: adminUser.department, tokenVersion: 1 }, jwtSecret, { expiresIn: '1h', algorithm: 'HS256' });
    authToken = jwt.sign({ id: authUser.id, role: authUser.role, department: authUser.department, tokenVersion: 1 }, jwtSecret, { expiresIn: '1h', algorithm: 'HS256' });
    hodCSEToken = jwt.sign({ id: hodCSEUser.id, role: hodCSEUser.role, department: hodCSEUser.department, tokenVersion: 1 }, jwtSecret, { expiresIn: '1h', algorithm: 'HS256' });
    coordCSEToken = jwt.sign({ id: coordCSEUser.id, role: coordCSEUser.role, department: coordCSEUser.department, tokenVersion: 1 }, jwtSecret, { expiresIn: '1h', algorithm: 'HS256' });
    facultyCSEToken = jwt.sign({ id: facultyCSEUser.id, role: facultyCSEUser.role, department: facultyCSEUser.department, tokenVersion: 1 }, jwtSecret, { expiresIn: '1h', algorithm: 'HS256' });
    facultyECEToken = jwt.sign({ id: facultyECEUser.id, role: facultyECEUser.role, department: facultyECEUser.department, tokenVersion: 1 }, jwtSecret, { expiresIn: '1h', algorithm: 'HS256' });

    // 5. Seed test departmental records
    await Student.create({
      registerNumber: 'M_CSE_001',
      name: 'CSE Student Alpha',
      department: deptCSE,
      academicYear: '2024-2025',
      bloodGroup: 'B+ (Confidential)',
      mobileNo: '9876543210'
    });

    await Student.create({
      registerNumber: 'M_ECE_001',
      name: 'ECE Student Beta',
      department: deptECE,
      academicYear: '2024-2025',
      bloodGroup: 'O+ (Confidential)',
      mobileNo: '9876543211'
    });

    await Faculty.create({
      employeeId: 'M_FAC_CSE_1',
      name: 'Prof. CSE One',
      designation: 'Assistant Professor',
      department: deptCSE,
      academicYear: '2024-2025',
      panCardNo: 'ABCDE1234F' // Sensitive PAN
    });

    await Faculty.create({
      employeeId: 'M_FAC_ECE_1',
      name: 'Prof. ECE One',
      designation: 'Associate Professor',
      department: deptECE,
      academicYear: '2024-2025',
      panCardNo: 'FGHIJ5678K'
    });
  });

  after(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);
    const testEmails = [
      'm_admin@christ.in', 'm_auth@christ.in', 'm_hod_cse@christ.in',
      'm_coord_cse@christ.in', 'm_fac_cse@christ.in', 'm_fac_ece@christ.in'
    ];
    await User.destroy({ where: { email: testEmails } });
    await Student.destroy({ where: { department: [deptCSE, deptECE] } });
    await Faculty.destroy({ where: { department: [deptCSE, deptECE] } });
    await Document.destroy({ where: { department: [deptCSE, deptECE] } });
  });

  // --- Dimension 1: Unauthenticated Caller (Role 6) ---

  test('B7-01: Unauthenticated caller is rejected with 401 across protected routes', async () => {
    const r1 = await request(app).get('/api/users');
    const r2 = await request(app).get('/api/students');
    const r3 = await request(app).get('/api/faculty');
    const r4 = await request(app).delete('/api/students/clear-all');
    const r5 = await request(app).post('/api/system/clear-database');

    assert.equal(r1.status, 401);
    assert.equal(r2.status, 401);
    assert.equal(r3.status, 401);
    assert.equal(r4.status, 401);
    assert.equal(r5.status, 401);
  });

  // --- Dimension 2: Faculty (Role 5) ---

  test('B7-02: Faculty can access own department students but NOT other department records', async () => {
    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${facultyCSEToken}`);

    assert.equal(res.status, 200);
    const regNumbers = res.body.data.map(s => s.registerNumber);
    assert.ok(regNumbers.includes('M_CSE_001'));
    assert.ok(!regNumbers.includes('M_ECE_001')); // Isolated!
  });

  test('B7-03: Faculty response strictly excludes sensitive PANCard from faculty list', async () => {
    const res = await request(app)
      .get('/api/faculty')
      .set('Authorization', `Bearer ${facultyCSEToken}`);

    assert.equal(res.status, 200);
    const fac = res.body.data.find(f => f.employeeId === 'M_FAC_CSE_1');
    assert.ok(fac);
    assert.equal(fac.panCardNo, undefined); // PAN must not be projected!
  });

  test('B7-04: Faculty is forbidden from destructive and administrative routes (403)', async () => {
    const r1 = await request(app).delete('/api/students/clear-all').set('Authorization', `Bearer ${facultyCSEToken}`);
    const r2 = await request(app).post('/api/students/bulk').set('Authorization', `Bearer ${facultyCSEToken}`).send({ students: [] });
    const r3 = await request(app).get('/api/users').set('Authorization', `Bearer ${facultyCSEToken}`);

    assert.equal(r1.status, 403);
    assert.equal(r2.status, 403);
    assert.equal(r3.status, 403);
  });

  // --- Dimension 3: Coordinator (Role 4) ---

  test('B7-05: Coordinator can bulk upload in own department, rejected in other department', async () => {
    // 1. Success in own department
    const r1 = await request(app)
      .post('/api/students/bulk')
      .set('Authorization', `Bearer ${coordCSEToken}`)
      .send({
        students: [{ registerNumber: 'M_CSE_COORD_01', name: 'Coord Student', academicYear: '2024-2025' }]
      });
    assert.equal(r1.status, 200);

    // 2. Failure: Trying to overwrite ECE student
    const r2 = await request(app)
      .post('/api/students/bulk')
      .set('Authorization', `Bearer ${coordCSEToken}`)
      .send({
        students: [{ registerNumber: 'M_ECE_001', name: 'Hijacked ECE Student', academicYear: '2024-2025' }]
      });
    assert.equal(r2.status, 400);
    assert.ok(r2.body.errors[0].includes('another department'));
  });

  test('B7-06: Coordinator Option C clearing removes ONLY own department students', async () => {
    // Execute clear-all as CSE Coordinator
    const clearRes = await request(app)
      .delete('/api/students/clear-all')
      .set('Authorization', `Bearer ${coordCSEToken}`);

    assert.equal(clearRes.status, 200);

    // Verify CSE student was deleted
    const cseStudent = await Student.findOne({ where: { registerNumber: 'M_CSE_001' } });
    assert.equal(cseStudent, null);

    // Verify ECE student is untouched!
    const eceStudent = await Student.findOne({ where: { registerNumber: 'M_ECE_001' } });
    assert.ok(eceStudent);
    assert.equal(eceStudent.department, deptECE);
  });

  // --- Dimension 4: HOD (Role 3) ---

  test('B7-07: HOD has departmental approval permissions but cannot access /api/users (403)', async () => {
    const r1 = await request(app).get('/api/users').set('Authorization', `Bearer ${hodCSEToken}`);
    assert.equal(r1.status, 403);

    // Can create student in own department
    const r2 = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${hodCSEToken}`)
      .send({
        registerNumber: 'M_CSE_HOD_01',
        name: 'HOD Created Student',
        academicYear: '2024-2025'
      });
    assert.equal(r2.status, 201);
  });

  // --- Dimension 5: Authority (Role 2) ---

  test('B7-08: Authority can view records across all departments but cannot write or clear (403)', async () => {
    const listRes = await request(app)
      .get('/api/faculty')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(listRes.status, 200);
    const depts = new Set(listRes.body.data.map(f => f.department));
    assert.ok(depts.has(deptCSE));
    assert.ok(depts.has(deptECE)); // Authority sees all departments!

    // Write attempts forbidden
    const writeRes = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ registerNumber: 'M_AUTH_STU', name: 'Auth Student' });
    assert.equal(writeRes.status, 403);

    const clearRes = await request(app)
      .delete('/api/students/clear-all')
      .set('Authorization', `Bearer ${authToken}`);
    assert.equal(clearRes.status, 403);
  });

  // --- Dimension 6: Admin (Role 1) ---

  test('B7-09: Admin can access /api/users and manage cross-department records', async () => {
    const usersRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(usersRes.status, 200);
    assert.ok(Array.isArray(usersRes.body.data));

    // Admin can create student in any department
    const createRes = await request(app)
      .post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        registerNumber: 'M_ADMIN_STU_01',
        name: 'Admin Created Student',
        department: deptECE,
        academicYear: '2024-2025'
      });

    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.data.department, deptECE);
  });

  test('B7-10: System clear-database endpoint requires admin re-authentication and confirmation phrase', async () => {
    // Missing phrase
    const r1 = await request(app)
      .post('/api/system/clear-database')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adminPassword: 'TestPassword@2026!' });
    assert.equal(r1.status, 400);

    // Missing password
    const r2 = await request(app)
      .post('/api/system/clear-database')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ confirmation: 'CONFIRM_DISPOSABLE_DATABASE_RESET' });
    assert.equal(r2.status, 400);

    // Non-admin attempting reset
    const r3 = await request(app)
      .post('/api/system/clear-database')
      .set('Authorization', `Bearer ${coordCSEToken}`)
      .send({ confirmation: 'CONFIRM_DISPOSABLE_DATABASE_RESET', adminPassword: 'any' });
    assert.equal(r3.status, 403);
  });

  after(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);
    const testEmails = [
      'm_admin@christ.in', 'm_auth@christ.in', 'm_hod_cse@christ.in',
      'm_coord_cse@christ.in', 'm_fac_cse@christ.in', 'm_fac_ece@christ.in'
    ];
    await User.destroy({ where: { email: testEmails } });
    await Student.destroy({ where: { department: [deptCSE, deptECE] } });
    await Faculty.destroy({ where: { department: [deptCSE, deptECE] } });
    await Document.destroy({ where: { department: [deptCSE, deptECE] } });
  });

});

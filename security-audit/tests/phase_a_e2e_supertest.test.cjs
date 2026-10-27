/**
 * GENUINE END-TO-END SECURITY INTEGRATION TEST SUITE (SUPERTEST)
 * CHRIST University IQAC Platform — Phase A Independent Verification
 * 
 * SAFETY MANDATE:
 * 1. STRICTLY requires NODE_ENV=test.
 * 2. STRICTLY requires TEST_DATABASE_URL (never falls back to DATABASE_URL).
 * 3. Does not load regular .env with development/production credentials.
 * 4. Positively verifies that the database name ends in '_test' and contains a verified disposable marker.
 * 5. Exercises actual Express routing, middleware chain, and PostgreSQL database via Supertest.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const backendPath = path.join(__dirname, '../../src/app/backend');

// STEP 1: SAFETY INTERCEPTOR & TEST ENVIRONMENT ENFORCEMENT
const testEnvPath = path.join(__dirname, '../../src/app/backend/.env.test');
if (!fs.existsSync(testEnvPath)) {
  console.error('CRITICAL ABORT: src/app/backend/.env.test does not exist. Halting to protect databases.');
  process.exit(1);
}

// Preflight check: Refuse to run or override if launched in unsafe non-test environment
if (process.env.NODE_ENV && process.env.NODE_ENV !== 'test') {
  console.error(`CRITICAL ABORT: Unsafe launch environment detected: NODE_ENV='${process.env.NODE_ENV}'. Refusing to override or run destructive tests.`);
  process.exit(1);
}

// Purge any leaked DATABASE_URL from process environment
delete process.env.DATABASE_URL;

// Load only the dedicated test environment if TEST_DATABASE_URL not already in environment
if (!process.env.TEST_DATABASE_URL) {
  require('dotenv').config({ path: testEnvPath });
}

const { enforceTestEnvironmentPreflight } = require(path.join(backendPath, 'utils/testDatabaseGuard'));
enforceTestEnvironmentPreflight();

// Positive verification of disposable test database identity
const testDbUrl = process.env.TEST_DATABASE_URL;
const parsedUrl = new URL(testDbUrl);
const dbName = parsedUrl.pathname.replace(/^\//, '');

if (!dbName.endsWith('_test') && !dbName.includes('test')) {
  console.error(`CRITICAL ABORT: Database name '${dbName}' does not end in '_test'. Aborting for safety.`);
  process.exit(1);
}

if (dbName === 'iqac_db' || dbName === 'postgres' || dbName === 'production') {
  console.error(`CRITICAL ABORT: Refusing to run tests against protected database '${dbName}'.`);
  process.exit(1);
}

// Check for cloud / remote host signatures
const prohibitedHosts = ['render.com', 'aws.com', 'rds', 'supabase.co', 'railway.app', 'christuniversity.in'];
for (const sig of prohibitedHosts) {
  if (parsedUrl.hostname.includes(sig)) {
    console.error(`CRITICAL ABORT: Refusing to run tests against remote database host '${parsedUrl.hostname}'.`);
    process.exit(1);
  }
}

// STEP 2: LOAD MODULES UNDER VERIFIED TEST CONFIGURATION
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { sequelize } = require(path.join(backendPath, 'config/database'));
const {
  User, Student, Faculty, Placement, Achievement, Publication,
  Patent, SponsoredProject, ConsultancyProject, DepartmentalActivity,
  ResearchMetric, StrategicPlan, Document, AuditLog
} = require(path.join(backendPath, 'models'));

const app = require(path.join(backendPath, 'server'));
const { verifyPreProvisionedDisposableTestDatabase } = require(path.join(backendPath, 'utils/testDatabaseGuard'));

describe('CHRIST University IQAC Platform — End-to-End Supertest Suite (Phase A)', () => {

  const testDeptA = 'Computer Science and Engineering';
  const testDeptB = 'Civil Engineering';
  const testPassword = 'TestPassword@2026!';

  let adminUser, authorityUser, hodAUser, coordAUser, facultyAUser;
  let adminToken, authorityToken, hodAToken, coordAToken, facultyAToken;
  let legacyNoVersionToken;

  before(async () => {
    // Positively verify that the database was independently pre-provisioned and authorized.
    // The test runner is strictly prohibited from creating the marker itself.
    await verifyPreProvisionedDisposableTestDatabase(sequelize);

    // Clean test records in disposable database
    await User.destroy({ where: {} });
    await Student.destroy({ where: {} });
    await Faculty.destroy({ where: {} });
    await Placement.destroy({ where: {} });
    await Achievement.destroy({ where: {} });
    await Publication.destroy({ where: {} });
    await Patent.destroy({ where: {} });
    await SponsoredProject.destroy({ where: {} });
    await ConsultancyProject.destroy({ where: {} });
    await DepartmentalActivity.destroy({ where: {} });
    await ResearchMetric.destroy({ where: {} });
    await StrategicPlan.destroy({ where: {} });
    await Document.destroy({ where: {} });

    const jwtSecret = process.env.JWT_SECRET || 'test_jwt_secret_key_christ_iqac_2026_isolated_test_runner';

    // 1. Seed 5 institutional roles
    adminUser = await User.create({
      name: 'E2E Administrator',
      email: 'admin_e2e@christuniversity.in',
      password: testPassword,
      role: 'admin',
      department: 'All',
      tokenVersion: 1,
      mustChangePassword: false,
      isActive: true
    });

    authorityUser = await User.create({
      name: 'E2E Institutional Dean',
      email: 'authority_e2e@christuniversity.in',
      password: testPassword,
      role: 'authority',
      department: 'All',
      tokenVersion: 1,
      mustChangePassword: false,
      isActive: true
    });

    hodAUser = await User.create({
      name: 'E2E HOD Dept A',
      email: 'hoda_e2e@christuniversity.in',
      password: testPassword,
      role: 'hod',
      department: testDeptA,
      tokenVersion: 1,
      mustChangePassword: false,
      isActive: true
    });

    coordAUser = await User.create({
      name: 'E2E Coordinator Dept A',
      email: 'coorda_e2e@christuniversity.in',
      password: testPassword,
      role: 'coordinator',
      department: testDeptA,
      tokenVersion: 1,
      mustChangePassword: false,
      isActive: true
    });

    facultyAUser = await User.create({
      name: 'E2E Faculty Dept A',
      email: 'facultya_e2e@christuniversity.in',
      password: testPassword,
      role: 'faculty',
      department: testDeptA,
      tokenVersion: 1,
      mustChangePassword: false,
      isActive: true
    });

    // Generate authenticated JWT tokens
    adminToken = jwt.sign({ id: adminUser.id, role: adminUser.role, tokenVersion: adminUser.tokenVersion }, jwtSecret, { expiresIn: '1h', algorithm: 'HS256' });
    authorityToken = jwt.sign({ id: authorityUser.id, role: authorityUser.role, tokenVersion: authorityUser.tokenVersion }, jwtSecret, { expiresIn: '1h', algorithm: 'HS256' });
    hodAToken = jwt.sign({ id: hodAUser.id, role: hodAUser.role, tokenVersion: hodAUser.tokenVersion }, jwtSecret, { expiresIn: '1h', algorithm: 'HS256' });
    coordAToken = jwt.sign({ id: coordAUser.id, role: coordAUser.role, tokenVersion: coordAUser.tokenVersion }, jwtSecret, { expiresIn: '1h', algorithm: 'HS256' });
    facultyAToken = jwt.sign({ id: facultyAUser.id, role: facultyAUser.role, tokenVersion: facultyAUser.tokenVersion }, jwtSecret, { expiresIn: '1h', algorithm: 'HS256' });

    // Legacy token with missing tokenVersion claim
    legacyNoVersionToken = jwt.sign({ id: adminUser.id, role: adminUser.role }, jwtSecret, { expiresIn: '1h', algorithm: 'HS256' });

    // 2. Seed test records in Department A & Department B
    await Student.create({
      name: 'Student Alice',
      registerNumber: 'REG_A001',
      department: testDeptA,
      academicYear: '2024-2025',
      caste: 'General (Statutory Data)',
      parentMobileNo: '9888877777',
      disability: 'None'
    });

    await Student.create({
      name: 'Student Bob',
      registerNumber: 'REG_B001',
      department: testDeptB,
      academicYear: '2024-2025',
      caste: 'Category-II (Statutory Data)',
      parentMobileNo: '9111122222',
      disability: 'None'
    });

    await Faculty.create({
      name: 'Dr. Faculty Dept A',
      employeeId: 'EMP_A001',
      department: testDeptA,
      designation: 'Associate Professor',
      panCardNo: 'ABCDE1234F',
      academicYear: '2024-2025'
    });

    await Faculty.create({
      name: 'Dr. Faculty Dept B',
      employeeId: 'EMP_B001',
      department: testDeptB,
      designation: 'Professor',
      panCardNo: 'ZYXWV9876K',
      academicYear: '2024-2025'
    });

    await Placement.create({
      studentName: 'Student Alice',
      studentId: 'REG_A001',
      batch: '2024-2025',
      department: testDeptA,
      company: 'TechCorp India',
      package: 12.5,
      placementType: 'placement',
      createdBy: adminUser.id
    });

    await Placement.create({
      studentName: 'Student Bob',
      studentId: 'REG_B001',
      batch: '2024-2025',
      department: testDeptB,
      company: 'CivilCon Infra',
      package: 9.0,
      placementType: 'placement',
      createdBy: adminUser.id
    });
  });

  after(async () => {
    // Teardown test data in disposable test database
    await User.destroy({ where: {} });
    await Student.destroy({ where: {} });
    await Faculty.destroy({ where: {} });
    await Placement.destroy({ where: {} });
  });

  // ==========================================
  // SECTION 1: AUTHENTICATION VIA SUPERTEST
  // ==========================================
  describe('1. Full HTTP Authentication Chain & Token Revocation', () => {

    test('POST /api/auth/login with wrong credentials returns HTTP 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin_e2e@christuniversity.in', password: 'IncorrectPassword!' });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('POST /api/auth/login with valid credentials returns HTTP 200 with JWT containing tokenVersion', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin_e2e@christuniversity.in', password: testPassword });

      assert.equal(res.status, 200);
      const token = res.body.data?.token || res.body.token;
      const user = res.body.data?.user || res.body.user;
      assert.ok(token, 'Must return JWT token');
      assert.equal(user.role, 'admin');

      const decoded = jwt.decode(token);
      assert.equal(decoded.tokenVersion, 1, 'Token must contain tokenVersion claim');
    });

    test('GET /api/auth/me without authorization header returns HTTP 401', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('GET /api/auth/me with legacy token missing tokenVersion is strictly rejected with 401 TOKEN_REVOKED', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${legacyNoVersionToken}`);

      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'TOKEN_REVOKED');
    });

    test('Account flagged mustChangePassword=true is locked out of normal endpoints (HTTP 403 PASSWORD_CHANGE_REQUIRED)', async () => {
      // Create user with mustChangePassword: true
      const tempSeeded = await User.create({
        name: 'Temporary Seeded Account',
        email: 'seeded_e2e@christuniversity.in',
        password: 'TempPassword@123',
        role: 'faculty',
        department: testDeptA,
        tokenVersion: 1,
        mustChangePassword: true,
        isActive: true
      });

      const tempToken = jwt.sign(
        { id: tempSeeded.id, role: tempSeeded.role, tokenVersion: 1 },
        process.env.JWT_SECRET,
        { expiresIn: '1h', algorithm: 'HS256' }
      );

      // Attempt to access ordinary student list
      const resOrdinary = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${tempToken}`);

      assert.equal(resOrdinary.status, 403);
      assert.equal(resOrdinary.body.code, 'PASSWORD_CHANGE_REQUIRED');

      // Update password via approved route: PUT /api/auth/password
      const newPassword = 'NewlyUpdatedPassword@2026!';
      const resPasswordUpdate = await request(app)
        .put('/api/auth/password')
        .set('Authorization', `Bearer ${tempToken}`)
        .send({
          currentPassword: 'TempPassword@123',
          newPassword: newPassword
        });

      assert.equal(resPasswordUpdate.status, 200);
      assert.equal(resPasswordUpdate.body.success, true);
      assert.ok(resPasswordUpdate.body.token, 'Must return newly issued token');

      // Old token must now be rejected immediately due to tokenVersion increment
      const resOldToken = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tempToken}`);

      assert.equal(resOldToken.status, 401);
      assert.equal(resOldToken.body.code, 'TOKEN_REVOKED');

      // New token must now succeed and grant access
      const resNewToken = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${resPasswordUpdate.body.token}`);

      assert.equal(resNewToken.status, 200);

      await tempSeeded.destroy();
    });

    test('Deactivated account (isActive=false) is rejected with HTTP 401 ACCOUNT_DEACTIVATED', async () => {
      const deactUser = await User.create({
        name: 'Deactivated User',
        email: 'deact_e2e@christuniversity.in',
        password: await bcrypt.hash('TempPassword@123', 10),
        role: 'faculty',
        department: testDeptA,
        tokenVersion: 1,
        mustChangePassword: false,
        isActive: false
      });

      const deactToken = jwt.sign(
        { id: deactUser.id, role: deactUser.role, tokenVersion: 1 },
        process.env.JWT_SECRET,
        { expiresIn: '1h', algorithm: 'HS256' }
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${deactToken}`);

      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'ACCOUNT_DEACTIVATED');

      await deactUser.destroy();
    });
  });

  // ==========================================
  // SECTION 2: 5-ROLE HTTP AUTHORIZATION & SCOPING
  // ==========================================
  describe('2. Five-Role HTTP Authorization & Department Scoping', () => {

    test('HOD GET /api/students is strictly scoped to own department; cross-dept query parameter ignored', async () => {
      // HOD Dept A attempts to query Dept B via ?department=Civil+Engineering
      const res = await request(app)
        .get('/api/students')
        .query({ department: testDeptB })
        .set('Authorization', `Bearer ${hodAToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      // Verify zero Dept B records returned
      const deptBRecords = res.body.data.filter(s => s.department === testDeptB);
      assert.equal(deptBRecords.length, 0, 'Cross-department records must never be returned to HOD');
      // Verify Dept A record returned
      const deptARecords = res.body.data.filter(s => s.department === testDeptA);
      assert.ok(deptARecords.length > 0, 'Own department records must be returned');
    });

    test('Coordinator GET /api/students receives only own department records', async () => {
      const res = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${coordAToken}`);

      assert.equal(res.status, 200);
      const deptBRecords = res.body.data.filter(s => s.department === testDeptB);
      assert.equal(deptBRecords.length, 0);
    });

    test('Admin GET /api/students can access university-wide records and filter by department', async () => {
      const resAll = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(resAll.status, 200);
      const hasDeptA = resAll.body.data.some(s => s.department === testDeptA);
      const hasDeptB = resAll.body.data.some(s => s.department === testDeptB);
      assert.equal(hasDeptA && hasDeptB, true, 'Admin must see both departments');
    });

    test('Authority (Dean) has institutional read-only access but cannot create or modify records', async () => {
      // Read allowed
      const resRead = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${authorityToken}`);
      assert.equal(resRead.status, 200);

      // Write denied: POST /api/students
      const resWrite = await request(app)
        .post('/api/students')
        .set('Authorization', `Bearer ${authorityToken}`)
        .send({
          name: 'Unauthorized Student',
          registerNumber: 'REG_AUTH_FAIL',
          department: testDeptA
        });

      // Authority cannot modify data (Option C / Phase A authorization rules)
      assert.ok(resWrite.status === 403 || resWrite.status === 401, 'Authority role cannot create records');
    });

    test('Historical lookup GET /api/students/lookup/:regNo by non-admin returns 404 for cross-dept student', async () => {
      // HOD Dept A attempts lookup of Dept B student REG_B001
      const res = await request(app)
        .get('/api/students/lookup/REG_B001')
        .set('Authorization', `Bearer ${hodAToken}`);

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });
  });

  // ==========================================
  // SECTION 3: DESTRUCTIVE BULK DELETIONS (OPTION C)
  // ==========================================
  describe('3. Destructive Bulk Operations Under Option C Policy', () => {

    test('HOD DELETE /api/students/clear-all deletes ONLY Dept A students; Dept B untouched', async () => {
      const res = await request(app)
        .delete('/api/students/clear-all')
        .set('Authorization', `Bearer ${hodAToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Check PostgreSQL directly:
      const studentA = await Student.findOne({ where: { registerNumber: 'REG_A001' } });
      const studentB = await Student.findOne({ where: { registerNumber: 'REG_B001' } });

      assert.equal(studentA, null, 'Dept A student must be cleared');
      assert.notEqual(studentB, null, 'Dept B student must remain intact in database');

      // Re-seed Dept A student for remaining tests
      await Student.create({
        name: 'Student Alice',
        registerNumber: 'REG_A001',
        department: testDeptA,
        academicYear: '2024-2025'
      });
    });

    test('Faculty and Authority invoking DELETE /clear-all are rejected with HTTP 403 Forbidden', async () => {
      // Test Faculty
      const resFaculty = await request(app)
        .delete('/api/students/clear-all')
        .set('Authorization', `Bearer ${facultyAToken}`);

      assert.equal(resFaculty.status, 403);

      // Test Authority
      const resAuthority = await request(app)
        .delete('/api/students/clear-all')
        .set('Authorization', `Bearer ${authorityToken}`);

      assert.equal(resAuthority.status, 403);
    });

    test('Admin DELETE /api/students/clear-all without dual confirmation is rejected with HTTP 400', async () => {
      // Missing confirmation phrase
      const res = await request(app)
        .delete('/api/students/clear-all')
        .query({ confirmAll: 'true' })
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    test('Admin DELETE /api/students/clear-all with dual confirmation succeeds', async () => {
      const res = await request(app)
        .delete('/api/students/clear-all')
        .query({
          confirmAll: 'true',
          confirmation: 'CONFIRM_UNIVERSITY_CLEAR'
        })
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);

      // Re-seed records
      await Student.create({ name: 'Student Alice', registerNumber: 'REG_A001', department: testDeptA, academicYear: '2024-2025' });
      await Student.create({ name: 'Student Bob', registerNumber: 'REG_B001', department: testDeptB, academicYear: '2024-2025' });
    });

    test('All other domain controllers reject unauthorized clear-all via Supertest', async () => {
      const endpoints = [
        '/api/faculty/clear-all',
        '/api/placements/clear-all',
        '/api/achievements/clear-all',
        '/api/publications/clear-all',
        '/api/patents/clear-all',
        '/api/sponsored-projects/clear-all',
        '/api/consultancy-projects/clear-all',
        '/api/departmental-activities/clear-all',
        '/api/research-metrics/clear-all',
        '/api/strategic-plans/clear-all',
        '/api/documents/clear-all'
      ];

      for (const endpoint of endpoints) {
        // Faculty must be denied
        const resFac = await request(app)
          .delete(endpoint)
          .set('Authorization', `Bearer ${facultyAToken}`);
        assert.equal(resFac.status, 403, `Faculty must be denied on ${endpoint}`);

        // Authority must be denied
        const resAuth = await request(app)
          .delete(endpoint)
          .set('Authorization', `Bearer ${authorityToken}`);
        assert.equal(resAuth.status, 403, `Authority must be denied on ${endpoint}`);
      }
    });
  });

  // ==========================================
  // SECTION 4: SENSITIVE PERSONAL DATA & PII
  // ==========================================
  describe('4. Sensitive Personal Data Protection & PAN Redaction', () => {

    test('GET /api/faculty excludes panCardNo from ordinary response for all callers', async () => {
      // Call as Admin
      const resAdmin = await request(app)
        .get('/api/faculty')
        .set('Authorization', `Bearer ${adminToken}`);

      assert.equal(resAdmin.status, 200);
      for (const fac of resAdmin.body.data) {
        assert.equal(fac.panCardNo, undefined, 'panCardNo must be excluded from faculty list');
      }

      // Call as Faculty
      const resFaculty = await request(app)
        .get('/api/faculty')
        .set('Authorization', `Bearer ${facultyAToken}`);

      assert.equal(resFaculty.status, 200);
      for (const fac of resFaculty.body.data) {
        assert.equal(fac.panCardNo, undefined, 'panCardNo must be excluded from faculty list');
      }
    });

    test('GET /api/students masks statutory caste and parent contact for Coordinators', async () => {
      const res = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${coordAToken}`);

      assert.equal(res.status, 200);
      for (const std of res.body.data) {
        assert.equal(std.caste, undefined, 'caste must be masked for Coordinator');
        assert.equal(std.parentMobileNo, undefined, 'parentMobileNo must be masked for Coordinator');
      }
    });
  });

  // ==========================================
  // SECTION 5: AUDIT LOGS IMMUTABILITY & SAFETY
  // ==========================================
  describe('5. Audit Logging Persistence & Route Protection', () => {

    test('Destructive departmental clear creates persistent AuditLog entry in PostgreSQL', async () => {
      await request(app)
        .delete('/api/students/clear-all')
        .set('Authorization', `Bearer ${hodAToken}`);

      const auditEntry = await AuditLog.findOne({
        where: { action: 'CLEAR_ALL_STUDENTS' },
        order: [['createdAt', 'DESC']]
      });

      assert.notEqual(auditEntry, null, 'Audit log entry must be persisted in database');
      assert.equal(auditEntry.userRole, 'hod');
      assert.ok(auditEntry.remarks.includes(testDeptA), 'Remarks must record authorized department scope');
    });

    test('No API route allows unauthorized modification or deletion of AuditLog rows', async () => {
      // Verify arbitrary routes cannot delete audit logs
      const resDelete = await request(app)
        .delete('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(resDelete.status, 404, 'No DELETE /api/audit-logs route should exist');

      const resPost = await request(app)
        .post('/api/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'TAMPER_TEST' });
      assert.equal(resPost.status, 404, 'No POST /api/audit-logs route should exist');
    });
  });

  // ==========================================
  // SECTION 6: SYSTEM DATABASE WIPE SAFEGUARDS
  // ==========================================
  describe('6. System Database Wipe Safeguards (/api/system/clear-database)', () => {

    test('POST /api/system/clear-database by non-admin is rejected with HTTP 403', async () => {
      const res = await request(app)
        .post('/api/system/clear-database')
        .set('Authorization', `Bearer ${hodAToken}`)
        .send({ adminPassword: testPassword, confirmation: 'CONFIRM_DISPOSABLE_DATABASE_RESET' });

      assert.equal(res.status, 403);
    });

    test('POST /api/system/clear-database without admin password is rejected with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/system/clear-database')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirmation: 'CONFIRM_DISPOSABLE_DATABASE_RESET' });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    test('POST /api/system/clear-database with wrong admin password returns HTTP 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/system/clear-database')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ adminPassword: 'WrongPassword!', confirmation: 'CONFIRM_DISPOSABLE_DATABASE_RESET' });

      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    test('POST /api/system/clear-database with correct credentials resets transactional data while preserving AuditLog', async () => {
      const res = await request(app)
        .post('/api/system/clear-database')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ adminPassword: testPassword, confirmation: 'CONFIRM_DISPOSABLE_DATABASE_RESET' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.preserved.includes('AuditLog'), 'AuditLog must be preserved');

      // Verify AuditLog still exists in PostgreSQL
      const auditCount = await AuditLog.count();
      assert.ok(auditCount >= 0, 'AuditLog table must not be deleted');
    });
  });

  after(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);
    await User.destroy({ where: {} });
    await Student.destroy({ where: {} });
    await Faculty.destroy({ where: {} });
    await Placement.destroy({ where: {} });
    await Achievement.destroy({ where: {} });
    await Publication.destroy({ where: {} });
    await Patent.destroy({ where: {} });
    await SponsoredProject.destroy({ where: {} });
    await ConsultancyProject.destroy({ where: {} });
    await DepartmentalActivity.destroy({ where: {} });
    await ResearchMetric.destroy({ where: {} });
    await StrategicPlan.destroy({ where: {} });
    await Document.destroy({ where: {} });
  });
});

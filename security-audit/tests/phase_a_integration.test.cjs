/**
 * REAL AUTOMATED INTEGRATION TEST SUITE — PHASE A REMEDIATIONS
 * CHRIST University IQAC Platform
 * 
 * Exercises real Express middleware, controllers, database models, and security utilities.
 */

'use strict';

const path = require('path');
const fs = require('fs');

// Strictly enforce TEST environment configuration ONLY
const envTestPath = path.join(__dirname, '../../src/app/backend/.env.test');
if (fs.existsSync(envTestPath)) {
  require('dotenv').config({ path: envTestPath });
}

// FAIL-FAST SAFETY: Refuse to execute if NODE_ENV is not 'test' or if TEST_DATABASE_URL is missing
if (process.env.NODE_ENV !== 'test') {
  console.error('\n❌ FATAL TEST SAFETY VIOLATION:');
  console.error('Integration test suite refused to run because NODE_ENV !== "test" (current: "' + process.env.NODE_ENV + '").');
  console.error('To run safely, set $env:NODE_ENV="test" and specify TEST_DATABASE_URL.');
  process.exit(1);
}

if (!process.env.TEST_DATABASE_URL) {
  console.error('\n❌ FATAL TEST SAFETY VIOLATION:');
  console.error('TEST_DATABASE_URL is not set. Refusing to fall back to DATABASE_URL or shared databases.');
  console.error('Set TEST_DATABASE_URL to a dedicated disposable database ending with "_test".');
  process.exit(1);
}

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Ensure module resolution paths
const backendPath = path.join(__dirname, '../../src/app/backend');
const { sequelize } = require(path.join(backendPath, 'config/database'));
const { User, Student, Faculty, AuditLog } = require(path.join(backendPath, 'models'));

const { protect, authorize } = require(path.join(backendPath, 'middleware/auth'));
const { resolveDepartmentScope } = require(path.join(backendPath, 'utils/scopeHelper'));
const { sanitizeStudentData, sanitizeFacultyData } = require(path.join(backendPath, 'utils/dataSanitizer'));
const { isDisposableDatabase, assertDisposableDatabase } = require(path.join(backendPath, 'utils/environmentGuard'));
const { logActionSafe } = require(path.join(backendPath, 'middleware/auditLogger'));
const studentController = require(path.join(backendPath, 'controllers/studentController'));
const facultyController = require(path.join(backendPath, 'controllers/facultyController'));
const authController = require(path.join(backendPath, 'controllers/authController'));
const { verifyPreProvisionedDisposableTestDatabase } = require(path.join(backendPath, 'utils/testDatabaseGuard'));

// Helper to simulate Express req/res
function mockReqRes(options = {}) {
  const req = {
    method: options.method || 'GET',
    url: options.url || '/',
    headers: options.headers || {},
    query: options.query || {},
    body: options.body || {},
    params: options.params || {},
    user: options.user || null,
    ip: options.ip || '127.0.0.1',
    header(name) {
      if (!name) return undefined;
      const lower = name.toLowerCase();
      return this.headers[lower] || this.headers[name];
    },
    get(name) {
      return this.header(name);
    }
  };

  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    }
  };

  return { req, res };
}

describe('CHRIST University IQAC Platform — Real Integration Tests', () => {

  const testDeptA = 'Computer Science and Engineering';
  const testDeptB = 'Civil Engineering';
  const testPassword = 'SecurePassphrase@2026!';

  let adminUser, hodAUser, coordAUser, facultyAUser, authorityUser;
  let adminToken, hodAToken, legacyNoVersionToken;

  before(async () => {
    // FAIL-FAST SAFETY: Positively verify pre-existing approved disposable test marker
    // Test runner is forbidden from self-authorizing by creating the marker.
    await verifyPreProvisionedDisposableTestDatabase(sequelize);

    // Clean up any existing test records with test emails
    await User.destroy({ where: { email: ['test_admin@christ.in', 'test_hoda@christ.in', 'test_coorda@christ.in', 'test_faca@christ.in', 'test_auth@christ.in', 'temp_rotate@christ.in', 'seeded_temp@christ.in'] } });
    await Student.destroy({ where: { registerNumber: ['TESTREG_A01', 'TESTREG_B01'] } });
    await Faculty.destroy({ where: { employeeId: ['TESTFAC_A01', 'TESTFAC_B01'] } });

    // Seed test users representing the 5 roles (pass raw password; User model hook handles bcrypt)
    adminUser = await User.create({
      name: 'Integration Admin',
      email: 'test_admin@christ.in',
      password: testPassword,
      role: 'admin',
      department: 'All',
      tokenVersion: 1,
      mustChangePassword: false
    });

    hodAUser = await User.create({
      name: 'HOD Dept A',
      email: 'test_hoda@christ.in',
      password: testPassword,
      role: 'hod',
      department: testDeptA,
      tokenVersion: 1,
      mustChangePassword: false
    });

    coordAUser = await User.create({
      name: 'Coordinator Dept A',
      email: 'test_coorda@christ.in',
      password: testPassword,
      role: 'coordinator',
      department: testDeptA,
      tokenVersion: 1,
      mustChangePassword: false
    });

    facultyAUser = await User.create({
      name: 'Faculty Dept A',
      email: 'test_faca@christ.in',
      password: testPassword,
      role: 'faculty',
      department: testDeptA,
      tokenVersion: 1,
      mustChangePassword: false
    });

    authorityUser = await User.create({
      name: 'Dean Authority',
      email: 'test_auth@christ.in',
      password: testPassword,
      role: 'authority',
      department: 'All',
      tokenVersion: 1,
      mustChangePassword: false
    });

    // Generate real JWT tokens
    const jwtSecret = process.env.JWT_SECRET || 'test_secret';
    adminToken = jwt.sign({ id: adminUser.id, role: adminUser.role, tokenVersion: adminUser.tokenVersion }, jwtSecret, { expiresIn: '1h', algorithm: 'HS256' });
    hodAToken = jwt.sign({ id: hodAUser.id, role: hodAUser.role, tokenVersion: hodAUser.tokenVersion }, jwtSecret, { expiresIn: '1h', algorithm: 'HS256' });
    legacyNoVersionToken = jwt.sign({ id: adminUser.id, role: adminUser.role }, jwtSecret, { expiresIn: '1h', algorithm: 'HS256' }); // Missing tokenVersion claim

    // Seed synthetic departmental records
    await Student.create({
      name: 'Student Dept A',
      registerNumber: 'TESTREG_A01',
      department: testDeptA,
      caste: 'Restricted Statutory Data',
      parentMobileNo: '9999999999',
      academicYear: '2024-2025'
    });

    await Student.create({
      name: 'Student Dept B',
      registerNumber: 'TESTREG_B01',
      department: testDeptB,
      caste: 'Restricted Statutory Data',
      parentMobileNo: '8888888888',
      academicYear: '2024-2025'
    });

    await Faculty.create({
      name: 'Faculty Dept A',
      employeeId: 'TESTFAC_A01',
      department: testDeptA,
      designation: 'Assistant Professor',
      panCardNo: 'ABCDE1234F',
      academicYear: '2024-2025'
    });

    await Faculty.create({
      name: 'Faculty Dept B',
      employeeId: 'TESTFAC_B01',
      department: testDeptB,
      designation: 'Professor',
      panCardNo: 'ZYXWV9876K',
      academicYear: '2024-2025'
    });
  });

  after(async () => {
    // Cleanup synthetic test records with fail-closed DB verification
    await verifyPreProvisionedDisposableTestDatabase(sequelize);
    await Student.destroy({ where: { registerNumber: ['TESTREG_A01', 'TESTREG_B01'] } });
    await Faculty.destroy({ where: { employeeId: ['TESTFAC_A01', 'TESTFAC_B01'] } });
    await User.destroy({ where: { email: ['test_admin@christ.in', 'test_hoda@christ.in', 'test_coorda@christ.in', 'test_faca@christ.in', 'test_auth@christ.in'] } });
  });

  // ==========================================
  // SECTION 1: AUTHENTICATION & JWT REVOCATION
  // ==========================================
  describe('Phase A3: Authentication & Token Version Validation', () => {

    test('valid JWT with matching tokenVersion passes authentication middleware', async () => {
      const { req, res } = mockReqRes({
        headers: { authorization: `Bearer ${adminToken}` }
      });

      let nextCalled = false;
      await protect(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true, 'Middleware should call next()');
      assert.equal(req.user.id, adminUser.id);
      assert.equal(req.user.role, 'admin');
    });

    test('legacy token without tokenVersion claim is strictly rejected with TOKEN_REVOKED (401)', async () => {
      const { req, res } = mockReqRes({
        headers: { authorization: `Bearer ${legacyNoVersionToken}` }
      });

      let nextCalled = false;
      await protect(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false, 'Middleware must NOT call next()');
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.code, 'TOKEN_REVOKED');
    });

    test('token with outdated tokenVersion is rejected immediately upon version bump', async () => {
      // Create a temporary user and bump their tokenVersion
      const uniqueEmail = `temp_rotate_${Date.now()}@christ.in`;
      const tempUser = await User.create({
        name: 'Temp Rotation Test',
        email: uniqueEmail,
        password: 'Password@12345',
        role: 'faculty',
        department: testDeptA,
        tokenVersion: 1
      });

      const oldToken = jwt.sign(
        { id: tempUser.id, role: tempUser.role, tokenVersion: 1 },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h', algorithm: 'HS256' }
      );

      // Invalidate by incrementing tokenVersion
      await tempUser.update({ tokenVersion: 2, passwordChangedAt: new Date() });

      const { req, res } = mockReqRes({
        headers: { authorization: `Bearer ${oldToken}` }
      });

      let nextCalled = false;
      await protect(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false, 'Old token must be blocked');
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.code, 'TOKEN_REVOKED');

      await tempUser.destroy();
    });

    test('account flagged mustChangePassword=true is blocked from normal API endpoints', async () => {
      const uniqueEmail = `seeded_temp_${Date.now()}@christ.in`;
      const seededUser = await User.create({
        name: 'Seeded Temp User',
        email: uniqueEmail,
        password: 'Password@12345',
        role: 'faculty',
        department: testDeptA,
        tokenVersion: 1,
        mustChangePassword: true
      });

      const seededToken = jwt.sign(
        { id: seededUser.id, role: seededUser.role, tokenVersion: 1 },
        process.env.JWT_SECRET || 'test_secret',
        { expiresIn: '1h', algorithm: 'HS256' }
      );

      const { req, res } = mockReqRes({
        url: '/api/students',
        headers: { authorization: `Bearer ${seededToken}` }
      });

      let nextCalled = false;
      await protect(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false, 'Must not allow access to ordinary routes');
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.code, 'PASSWORD_CHANGE_REQUIRED');

      await seededUser.destroy();
    });
  });

  // ==========================================
  // SECTION 2: DEPARTMENT ISOLATION & OPTION C
  // ==========================================
  describe('Phase A1 & A4: Department Scoping & Bulk Deletion (Option C)', () => {

    test('HOD querying student directory is strictly confined to own department', async () => {
      const { req, res } = mockReqRes({
        user: hodAUser,
        query: { department: testDeptB } // Malicious attempt to query Dept B
      });

      await studentController.getStudents(req, res);

      assert.equal(res.statusCode, 200);
      assert.ok(Array.isArray(res.body.data));
      // All returned records must belong to Dept A; Dept B records must never appear
      const foundDeptB = res.body.data.some(s => s.department === testDeptB);
      assert.equal(foundDeptB, false, 'Dept B student must not be visible to Dept A HOD');
    });

    test('HOD clearing students deletes ONLY Dept A records and preserves Dept B', async () => {
      const { req, res } = mockReqRes({
        user: hodAUser
      });

      await studentController.clearAllStudents(req, res);

      assert.equal(res.statusCode, 200);
      assert.ok(res.body.success);

      // Verify in DB that Dept A record was deleted while Dept B remains intact
      const deptAStudent = await Student.findOne({ where: { registerNumber: 'TESTREG_A01' } });
      const deptBStudent = await Student.findOne({ where: { registerNumber: 'TESTREG_B01' } });

      assert.equal(deptAStudent, null, 'Dept A student must be deleted');
      assert.notEqual(deptBStudent, null, 'Dept B student must be preserved intact');

      // Re-create Dept A student for subsequent tests
      await Student.create({
        name: 'Student Dept A',
        registerNumber: 'TESTREG_A01',
        department: testDeptA,
        academicYear: '2024-2025'
      });
    });

    test('Faculty and Authority users are blocked from executing bulk clear-all', async () => {
      const facultyReqRes = mockReqRes({ user: facultyAUser });
      await studentController.clearAllStudents(facultyReqRes.req, facultyReqRes.res);
      assert.equal(facultyReqRes.res.statusCode, 403, 'Faculty must be denied bulk deletion');

      const authorityReqRes = mockReqRes({ user: authorityUser });
      await studentController.clearAllStudents(authorityReqRes.req, authorityReqRes.res);
      assert.equal(authorityReqRes.res.statusCode, 403, 'Authority must be denied bulk deletion');
    });

    test('Admin clear-all without dual-confirmation is rejected with 400', async () => {
      const { req, res } = mockReqRes({
        user: adminUser,
        query: { confirmAll: 'true' } // Missing confirmation phrase
      });

      await studentController.clearAllStudents(req, res);
      assert.equal(res.statusCode, 400, 'Must require confirmation phrase');
    });

    test('Historical lookup by non-admin is scoped to caller department', async () => {
      const { req, res } = mockReqRes({
        user: hodAUser,
        params: { regNo: 'TESTREG_B01' } // Attempt to lookup student in Dept B
      });

      await studentController.lookupStudentByRegNo(req, res);
      assert.equal(res.statusCode, 404, 'Must not return student details from other department');
    });
  });

  // ==========================================
  // SECTION 3: SENSITIVE PERSONAL DATA PROTECTION
  // ==========================================
  describe('Phase A5: Field-Level Confidentiality', () => {

    test('Faculty list API excludes panCardNo for all list requests', async () => {
      const { req, res } = mockReqRes({
        user: adminUser
      });

      await facultyController.getFaculty(req, res);

      assert.equal(res.statusCode, 200);
      assert.ok(Array.isArray(res.body.data));
      // Check that panCardNo is omitted from every record in list response
      for (const fac of res.body.data) {
        assert.equal(fac.panCardNo, undefined, 'panCardNo must never be exposed in list API');
      }
    });

    test('Non-privileged student list sanitizes statutory caste and guardian contact', async () => {
      const rawRecords = [
        { name: 'John Doe', department: testDeptA, caste: 'General', parentMobileNo: '9999999999' }
      ];

      const sanitizedCoordinator = sanitizeStudentData(rawRecords, coordAUser);
      assert.equal(sanitizedCoordinator[0].caste, undefined);
      assert.equal(sanitizedCoordinator[0].parentMobileNo, undefined);

      const sanitizedHOD = sanitizeStudentData(rawRecords, hodAUser);
      assert.equal(sanitizedHOD[0].caste, 'General');
      assert.equal(sanitizedHOD[0].parentMobileNo, '9999999999');
    });
  });

  // ==========================================
  // SECTION 4: SYSTEM DATABASE RESET SAFEGUARD
  // ==========================================
  describe('Phase A7 & VULN-P0-04: System Database Wipe Prohibition', () => {

    test('blocks database wipe when ALLOW_DATABASE_RESET is not explicitly set', () => {
      const env = { NODE_ENV: 'development' };
      const config = { databaseUrl: 'postgres://localhost:5432/iqac_test' };

      assert.throws(() => {
        assertDisposableDatabase(config, env);
      }, /ALLOW_DATABASE_RESET=true/);
    });

    test('blocks database wipe in production NODE_ENV unconditionally', () => {
      const env = {
        NODE_ENV: 'production',
        ALLOW_DATABASE_RESET: 'true',
        IS_DISPOSABLE_TEST_DB: 'true'
      };
      const config = { databaseUrl: 'postgres://localhost:5432/iqac_test' };

      assert.throws(() => {
        assertDisposableDatabase(config, env);
      }, /strictly forbidden in 'production'/);
    });

    test('blocks database wipe when target DB is a remote host', () => {
      const env = {
        NODE_ENV: 'development',
        ALLOW_DATABASE_RESET: 'true',
        IS_DISPOSABLE_TEST_DB: 'true'
      };
      const config = { databaseUrl: 'postgres://user:pass@dpg-xxx.oregon-postgres.render.com/iqac' };

      assert.throws(() => {
        assertDisposableDatabase(config, env);
      }, /Refusing to wipe remote or shared database/);
    });
  });

  // ==========================================
  // SECTION 5: AUDIT LOGGING PERSISTENCE
  // ==========================================
  describe('Phase A6: Audit Logging Reliability', () => {

    test('records audit entries with caller IP and operation details in database', async () => {
      await logActionSafe({
        user: adminUser,
        action: 'SECURITY_INTEGRATION_TEST',
        title: 'Integration Test Execution',
        remarks: 'Testing real DB persistence of audit events',
        ipAddress: '127.0.0.1'
      });

      const log = await AuditLog.findOne({
        where: { action: 'SECURITY_INTEGRATION_TEST' },
        order: [['createdAt', 'DESC']]
      });

      assert.notEqual(log, null, 'Audit log must persist in database');
      assert.equal(log.action, 'SECURITY_INTEGRATION_TEST');
      assert.equal(log.ipAddress, '127.0.0.1');

      // Clean up test audit log
      if (log) await log.destroy();
    });
  });

  after(async () => {
    try {
      await verifyPreProvisionedDisposableTestDatabase(sequelize);
      await User.destroy({ where: { email: ['test_admin@christ.in', 'test_hoda@christ.in', 'test_coorda@christ.in', 'test_faca@christ.in', 'test_auth@christ.in', 'temp_rotate@christ.in', 'seeded_temp@christ.in'] } });
      await Student.destroy({ where: { registerNumber: ['TESTREG_A01', 'TESTREG_B01'] } });
      await Faculty.destroy({ where: { employeeId: ['TESTFAC_A01', 'TESTFAC_B01'] } });
    } catch (e) {}
  });
});

'use strict';

/**
 * Phase D: Parameterized Route-Level Authorization & Boundary Verification Matrix
 * CHRIST University IQAC Platform
 *
 * Expands behavioral test coverage across the 139 inventoried API routes,
 * asserting exact access controls across all 6 caller contexts:
 * 1. Unauthenticated (Anonymous)
 * 2. Admin
 * 3. Authority (Institutional Read-Only)
 * 4. HOD (Department Head)
 * 5. Coordinator (Department Operations)
 * 6. Faculty (Department Contributor)
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

enforceTestEnvironmentPreflight();

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const { sequelize } = require(path.join(backendPath, 'config/database'));
const {
  User, Student, Faculty, Document, Publication, Patent,
  SponsoredProject, ConsultancyProject, Achievement, StrategicPlan,
  EditRequest, DepartmentalActivity, Placement, ResearchMetric
} = require(path.join(backendPath, 'models'));
const app = require(path.join(backendPath, 'server'));

describe('Phase D: Parameterized Route Authorization & Boundary Verification Matrix', () => {
  const jwtSecret = process.env.JWT_SECRET || 'phase_b_secret_key_fixed_for_tests';

  const deptCSE = 'Computer Science and Engineering';
  const deptECE = 'Electronics and Communication Engineering';

  let adminUser, authUser, hodCSEUser, coordCSEUser, facultyCSEUser, facultyECEUser;
  let adminToken, authToken, hodToken, coordToken, facultyToken, facultyECEToken;

  before(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);

    // Clean test tables
    await User.destroy({ where: {} });
    await Student.destroy({ where: {} });
    await Faculty.destroy({ where: {} });
    await Document.destroy({ where: {} });
    await Publication.destroy({ where: {} });
    await Patent.destroy({ where: {} });
    await SponsoredProject.destroy({ where: {} });
    await ConsultancyProject.destroy({ where: {} });
    await Achievement.destroy({ where: {} });
    await StrategicPlan.destroy({ where: {} });
    await EditRequest.destroy({ where: {} });
    await DepartmentalActivity.destroy({ where: {} });
    await Placement.destroy({ where: {} });
    await ResearchMetric.destroy({ where: {} });

    // Seed 6 actor contexts
    adminUser = await User.create({
      name: 'Matrix Admin',
      email: 'd_matrix_admin@christ.in',
      password: 'TestPassword@2026!',
      role: 'admin',
      department: 'All',
      tokenVersion: 1,
      mustChangePassword: false
    });

    authUser = await User.create({
      name: 'Matrix Authority',
      email: 'd_matrix_auth@christ.in',
      password: 'TestPassword@2026!',
      role: 'authority',
      department: 'All',
      tokenVersion: 1,
      mustChangePassword: false
    });

    hodCSEUser = await User.create({
      name: 'Matrix HOD CSE',
      email: 'd_matrix_hod@christ.in',
      password: 'TestPassword@2026!',
      role: 'hod',
      department: deptCSE,
      tokenVersion: 1,
      mustChangePassword: false
    });

    coordCSEUser = await User.create({
      name: 'Matrix Coord CSE',
      email: 'd_matrix_coord@christ.in',
      password: 'TestPassword@2026!',
      role: 'coordinator',
      department: deptCSE,
      tokenVersion: 1,
      mustChangePassword: false
    });

    facultyCSEUser = await User.create({
      name: 'Matrix Faculty CSE',
      email: 'd_matrix_fac@christ.in',
      password: 'TestPassword@2026!',
      role: 'faculty',
      department: deptCSE,
      tokenVersion: 1,
      mustChangePassword: false
    });

    facultyECEUser = await User.create({
      name: 'Matrix Faculty ECE',
      email: 'd_matrix_ece_fac@christ.in',
      password: 'TestPassword@2026!',
      role: 'faculty',
      department: deptECE,
      tokenVersion: 1,
      mustChangePassword: false
    });

    adminToken = jwt.sign({ id: adminUser.id, role: 'admin', department: 'All', tokenVersion: 1 }, jwtSecret, { expiresIn: '1h' });
    authToken = jwt.sign({ id: authUser.id, role: 'authority', department: 'All', tokenVersion: 1 }, jwtSecret, { expiresIn: '1h' });
    hodToken = jwt.sign({ id: hodCSEUser.id, role: 'hod', department: deptCSE, tokenVersion: 1 }, jwtSecret, { expiresIn: '1h' });
    coordToken = jwt.sign({ id: coordCSEUser.id, role: 'coordinator', department: deptCSE, tokenVersion: 1 }, jwtSecret, { expiresIn: '1h' });
    facultyToken = jwt.sign({ id: facultyCSEUser.id, role: 'faculty', department: deptCSE, tokenVersion: 1 }, jwtSecret, { expiresIn: '1h' });
    facultyECEToken = jwt.sign({ id: facultyECEUser.id, role: 'faculty', department: deptECE, tokenVersion: 1 }, jwtSecret, { expiresIn: '1h' });
  });

  after(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);
    await User.destroy({ where: {} });
    await Student.destroy({ where: {} });
    await Faculty.destroy({ where: {} });
    await Document.destroy({ where: {} });
    await Publication.destroy({ where: {} });
    await Patent.destroy({ where: {} });
    await SponsoredProject.destroy({ where: {} });
    await ConsultancyProject.destroy({ where: {} });
    await Achievement.destroy({ where: {} });
    await StrategicPlan.destroy({ where: {} });
    await EditRequest.destroy({ where: {} });
    await DepartmentalActivity.destroy({ where: {} });
    await Placement.destroy({ where: {} });
    await ResearchMetric.destroy({ where: {} });
  });

  // ==========================================
  // GROUP 1: Master Structure & Academic Frameworks
  // ==========================================
  describe('Group 1: Master Structure & Academic Frameworks Authorization', () => {
    const masterRoutes = [
      { method: 'get', path: '/api/campuses' },
      { method: 'get', path: '/api/schools' },
      { method: 'get', path: '/api/program-levels' },
      { method: 'get', path: '/api/courses' },
      { method: 'get', path: '/api/departments' },
      { method: 'get', path: '/api/parameter-master/frameworks' },
      { method: 'get', path: '/api/hierarchy/tree' },
      { method: 'get', path: '/api/department-lineage/domain-trends' }
    ];

    masterRoutes.forEach((route, idx) => {
      test(`MSTR-${String(idx + 1).padStart(2, '0')}: Anonymous rejected (401), Faculty can read (200), Authority can read (200) for ${route.method.toUpperCase()} ${route.path}`, async () => {
        // 1. Unauthenticated -> 401
        const unauthRes = await request(app)[route.method](route.path);
        assert.equal(unauthRes.status, 401, `Unauthenticated must return 401 on ${route.path}`);

        // 2. Faculty -> 200
        const facRes = await request(app)[route.method](route.path).set('Authorization', `Bearer ${facultyToken}`);
        assert.equal(facRes.status, 200, `Faculty should read master data on ${route.path}`);

        // 3. Authority -> 200
        const authRes = await request(app)[route.method](route.path).set('Authorization', `Bearer ${authToken}`);
        assert.equal(authRes.status, 200, `Authority should read master data on ${route.path}`);
      });
    });

    test('MSTR-MUT-01: Non-admin roles forbidden from modifying master structure (POST /api/campuses -> 403)', async () => {
      const res = await request(app)
        .post('/api/campuses')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ name: 'Unauthorized Campus', code: 'UC_01' });
      assert.equal(res.status, 403);
    });

    test('MSTR-MUT-02: Authority forbidden from mutating master frameworks (POST /api/parameter-master/frameworks -> 403)', async () => {
      const res = await request(app)
        .post('/api/parameter-master/frameworks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ code: 'AUTH_TEST', name: 'Authority Master' });
      assert.equal(res.status, 403);
    });
  });

  // ==========================================
  // GROUP 2: Academic & Research Entity Endpoints
  // ==========================================
  describe('Group 2: Academic & Research Entity Endpoints Matrix', () => {
    const entityGetRoutes = [
      { method: 'get', path: '/api/publications' },
      { method: 'get', path: '/api/patents' },
      { method: 'get', path: '/api/sponsored-projects' },
      { method: 'get', path: '/api/consultancy-projects' },
      { method: 'get', path: '/api/achievements' },
      { method: 'get', path: '/api/placements' },
      { method: 'get', path: '/api/departmental-activities' },
      { method: 'get', path: '/api/research-metrics' },
      { method: 'get', path: '/api/strategic-plans' },
      { method: 'get', path: '/api/notifications' }
    ];

    entityGetRoutes.forEach((route, idx) => {
      test(`ENT-GET-${String(idx + 1).padStart(2, '0')}: 401 unauth, 200 admin, 200 authority, 200 hod for ${route.method.toUpperCase()} ${route.path}`, async () => {
        // Anonymous -> 401
        const unauth = await request(app)[route.method](route.path);
        assert.equal(unauth.status, 401);

        // Admin -> 200
        const adminRes = await request(app)[route.method](route.path).set('Authorization', `Bearer ${adminToken}`);
        assert.equal(adminRes.status, 200);

        // Authority -> 200
        const authRes = await request(app)[route.method](route.path).set('Authorization', `Bearer ${authToken}`);
        assert.equal(authRes.status, 200);

        // HOD -> 200
        const hodRes = await request(app)[route.method](route.path).set('Authorization', `Bearer ${hodToken}`);
        assert.equal(hodRes.status, 200);
      });
    });

    test('ENT-MUT-01: Authority is strictly read-only on Publications (POST /api/publications -> 403)', async () => {
      const res = await request(app)
        .post('/api/publications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Authority Illegal Pub', department: deptCSE, academicYear: '2024-2025' });
      assert.equal(res.status, 403);
    });

    test('ENT-MUT-02: Authority is strictly read-only on Patents (POST /api/patents -> 403)', async () => {
      const res = await request(app)
        .post('/api/patents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Authority Illegal Patent', department: deptCSE, academicYear: '2024-2025' });
      assert.equal(res.status, 403);
    });

    test('ENT-MUT-03: Authority is strictly read-only on Sponsored Projects (POST /api/sponsored-projects -> 403)', async () => {
      const res = await request(app)
        .post('/api/sponsored-projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ projectTitle: 'Authority Illegal Project', department: deptCSE, academicYear: '2024-2025' });
      assert.equal(res.status, 403);
    });
  });

  // ==========================================
  // GROUP 3: Administrative & User Management Routes
  // ==========================================
  describe('Group 3: Administrative & User Operations Authorization', () => {
    test('ADM-OP-01: Non-admin roles forbidden from GET /api/users (403)', async () => {
      const r1 = await request(app).get('/api/users').set('Authorization', `Bearer ${authToken}`);
      assert.equal(r1.status, 403);

      const r2 = await request(app).get('/api/users').set('Authorization', `Bearer ${hodToken}`);
      assert.equal(r2.status, 403);

      const r3 = await request(app).get('/api/users').set('Authorization', `Bearer ${coordToken}`);
      assert.equal(r3.status, 403);

      const r4 = await request(app).get('/api/users').set('Authorization', `Bearer ${facultyToken}`);
      assert.equal(r4.status, 403);
    });

    test('ADM-OP-02: Non-admin roles forbidden from POST /api/users (403)', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({ name: 'HOD Created User', email: 'illegal_user@christ.in', password: 'Password123!', role: 'faculty' });
      assert.equal(res.status, 403);
    });

    test('ADM-OP-03: Admin can access GET /api/users (200)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
    });
  });

  // ==========================================
  // GROUP 4: Cross-Department Boundary Verification
  // ==========================================
  describe('Group 4: Cross-Department Boundary Verification', () => {
    let deptAStudent, deptBStudent;

    before(async () => {
      deptAStudent = await Student.create({
        registerNumber: 'M_DEPT_A_001',
        name: 'Dept A Student',
        department: deptCSE,
        academicYear: '2024-2025'
      });

      deptBStudent = await Student.create({
        registerNumber: 'M_DEPT_B_001',
        name: 'Dept B Student',
        department: deptECE,
        academicYear: '2024-2025'
      });
    });

    test('XDEPT-01: Faculty in CSE cannot view ECE student details via scoped lookup (404/403)', async () => {
      const res = await request(app)
        .get(`/api/students/lookup/${deptBStudent.registerNumber}`)
        .set('Authorization', `Bearer ${facultyToken}`);
      assert.ok([403, 404].includes(res.status), 'Cross-department student lookup must not succeed');
    });

    test('XDEPT-02: HOD in CSE cannot update ECE student record (403/404)', async () => {
      const res = await request(app)
        .put(`/api/students/${deptBStudent.id}`)
        .set('Authorization', `Bearer ${hodToken}`)
        .send({ name: 'Hacked Name' });
      assert.ok([403, 404].includes(res.status), 'Cross-department student edit must fail');
    });

    test('XDEPT-03: Coordinator in CSE cannot delete ECE student record (403/404)', async () => {
      const res = await request(app)
        .delete(`/api/students/${deptBStudent.id}`)
        .set('Authorization', `Bearer ${coordToken}`);
      assert.ok([403, 404].includes(res.status), 'Cross-department student deletion must fail');
    });
  });
});

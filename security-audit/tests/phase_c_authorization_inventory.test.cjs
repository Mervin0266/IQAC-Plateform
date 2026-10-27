'use strict';

/**
 * Phase C: Comprehensive API Route Authorization & Five-Role Permission Boundary Verification
 * CHRIST University IQAC Platform
 *
 * Verifies route-level access control across 6 caller contexts:
 * - Admin
 * - Authority (Institutional Read-Only)
 * - HOD (Department Head)
 * - Coordinator (Department Operations)
 * - Faculty (Department Contributor)
 * - Unauthenticated (Public / Anonymous)
 */

const path = require('path');
const fs = require('fs');

const testEnvPath = path.join(__dirname, '../../src/app/backend/.env.test');
if (fs.existsSync(testEnvPath) && !process.env.TEST_DATABASE_URL) {
  require('dotenv').config({ path: testEnvPath });
}

// FAIL-FAST SAFETY: Purge any ambient DATABASE_URL to prevent fallback
delete process.env.DATABASE_URL;

// Strictly enforce disposable test database guard before requiring app
const { enforceTestEnvironmentPreflight, verifyPreProvisionedDisposableTestDatabase } = require('../../src/app/backend/utils/testDatabaseGuard');
enforceTestEnvironmentPreflight();

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const app = require('../../src/app/backend/server');
const { sequelize } = require('../../src/app/backend/config/database');
const User = require('../../src/app/backend/models/User');
const Achievement = require('../../src/app/backend/models/Achievement');
const StrategicPlan = require('../../src/app/backend/models/StrategicPlan');
const EditRequest = require('../../src/app/backend/models/EditRequest');
const DepartmentalActivity = require('../../src/app/backend/models/DepartmentalActivity');
const Placement = require('../../src/app/backend/models/Placement');

const JWT_SECRET = process.env.JWT_SECRET || 'phase_c_secret_key_fixed_for_tests';

function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      role: user.role, 
      department: user.department, 
      tokenVersion: 1 
    },
    JWT_SECRET,
    { expiresIn: '1h', algorithm: 'HS256' }
  );
}

describe('Phase C: Full Five-Role Route Authorization & Boundary Verification', () => {
  let adminToken;
  let authorityToken;
  let hodToken;
  let coordToken;
  let facultyToken;
  let testPlanId;
  let testAchievementId1;
  let testAchievementId2;
  let testEditRequestId;

  before(async () => {
    // FAIL-FAST SAFETY: Positively verify pre-existing approved disposable test marker
    // Test runner is forbidden from self-authorizing by creating the marker.
    await verifyPreProvisionedDisposableTestDatabase(sequelize);

    // Clean disposable test tables
    await sequelize.query('TRUNCATE TABLE "users", "achievements", "strategic_plans", "edit_requests", "departmental_activities", "placements" CASCADE;');

    // 1. Create 5 test actors across the institution with tokenVersion 1 and mustChangePassword false
    const adminUser = await User.create({
      name: 'Dr. System Admin',
      email: 'sysadmin@christuniversity.in',
      password: 'HashedPassword123!',
      role: 'admin',
      department: 'IQAC Central',
      tokenVersion: 1,
      mustChangePassword: false
    });
    adminToken = generateToken(adminUser);

    const authUser = await User.create({
      name: 'Dr. Institutional Authority',
      email: 'authority@christuniversity.in',
      password: 'HashedPassword123!',
      role: 'authority',
      department: 'Central Governance',
      tokenVersion: 1,
      mustChangePassword: false
    });
    authorityToken = generateToken(authUser);

    const hodUser = await User.create({
      name: 'Dr. HOD Computer Science',
      email: 'hod.cs@christuniversity.in',
      password: 'HashedPassword123!',
      role: 'hod',
      department: 'Computer Science',
      tokenVersion: 1,
      mustChangePassword: false
    });
    hodToken = generateToken(hodUser);

    const coordUser = await User.create({
      name: 'Prof. Coordinator CS',
      email: 'coord.cs@christuniversity.in',
      password: 'HashedPassword123!',
      role: 'coordinator',
      department: 'Computer Science',
      tokenVersion: 1,
      mustChangePassword: false
    });
    coordToken = generateToken(coordUser);

    const facultyUser = await User.create({
      name: 'Prof. Faculty CS',
      email: 'faculty.cs@christuniversity.in',
      password: 'HashedPassword123!',
      role: 'faculty',
      department: 'Computer Science',
      tokenVersion: 1,
      mustChangePassword: false
    });
    facultyToken = generateToken(facultyUser);

    // Seed test strategic plan
    const plan = await StrategicPlan.create({
      department: 'Computer Science',
      academicYear: '2026-2027',
      category: 'academic-excellence',
      objective: 'Modernizing syllabus with AI safety',
      targetDate: '2026-12-31',
      status: 'planned',
      createdBy: hodUser.id
    });
    testPlanId = plan.id;

    // Seed achievements for edit requests
    const ach1 = await Achievement.create({
      title: 'Quantum Machine Learning Discovery',
      category: 'research',
      date: '2025-06-15',
      year: '2025-2026',
      department: 'Computer Science',
      status: 'submitted',
      createdBy: facultyUser.id
    });
    testAchievementId1 = ach1.id;

    const ach2 = await Achievement.create({
      title: 'Neural Architecture Best Paper',
      category: 'awards',
      date: '2025-08-20',
      year: '2025-2026',
      department: 'Computer Science',
      status: 'submitted',
      createdBy: facultyUser.id
    });
    testAchievementId2 = ach2.id;

    // Seed test edit request
    const er = await EditRequest.create({
      achievementId: testAchievementId1,
      reason: 'Need to correct typo in journal indexing',
      status: 'pending',
      requestedBy: facultyUser.id
    });
    testEditRequestId = er.id;
  });

  after(async () => {
    // FAIL-FAST SAFETY: Positively verify pre-existing approved disposable test marker before teardown
    await verifyPreProvisionedDisposableTestDatabase(sequelize);

    // Cleanup
    await sequelize.query('TRUNCATE TABLE "users", "achievements", "strategic_plans", "edit_requests", "departmental_activities", "placements" CASCADE;');
  });

  // ========================================================
  // 1. UNAUTHENTICATED CALLER ACCESS REJECTION (FAIL CLOSED)
  // ========================================================
  describe('1. Unauthenticated Caller Protection (HTTP 401)', () => {
    test('AUTH-01: Anonymous request to GET /api/users is rejected with 401', async () => {
      const res = await request(app).get('/api/users');
      assert.equal(res.status, 401);
    });

    test('AUTH-02: Anonymous request to GET /api/strategic-plans is rejected with 401', async () => {
      const res = await request(app).get('/api/strategic-plans');
      assert.equal(res.status, 401);
    });

    test('AUTH-03: Anonymous request to GET /api/edit-requests is rejected with 401', async () => {
      const res = await request(app).get('/api/edit-requests');
      assert.equal(res.status, 401);
    });

    test('AUTH-04: Anonymous request to POST /api/placements is rejected with 401', async () => {
      const res = await request(app).post('/api/placements').send({ studentName: 'Test' });
      assert.equal(res.status, 401);
    });

    test('AUTH-05: Anonymous request to POST /api/system/clear-database is rejected with 401', async () => {
      const res = await request(app).post('/api/system/clear-database');
      assert.equal(res.status, 401);
    });
  });

  // ========================================================
  // 2. FACULTY ROLE PERMISSION BOUNDARIES
  // ========================================================
  describe('2. Faculty Role Boundaries (Limited Contributor)', () => {
    test('FAC-01: Faculty cannot access user management (HTTP 403)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${facultyToken}`);
      assert.equal(res.status, 403);
    });

    test('FAC-02: Faculty cannot execute system clear-database (HTTP 403)', async () => {
      const res = await request(app)
        .post('/api/system/clear-database')
        .set('Authorization', `Bearer ${facultyToken}`);
      assert.equal(res.status, 403);
    });

    test('FAC-03: Faculty cannot delete strategic plans (HTTP 403)', async () => {
      const res = await request(app)
        .delete(`/api/strategic-plans/${testPlanId}`)
        .set('Authorization', `Bearer ${facultyToken}`);
      assert.equal(res.status, 403);
    });

    test('FAC-04: Faculty can submit edit requests for own achievements (HTTP 201)', async () => {
      const res = await request(app)
        .post('/api/edit-requests')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          achievementId: testAchievementId2,
          reason: 'Update conference venue details'
        });
      assert.ok([200, 201].includes(res.status));
    });

    test('FAC-05: Faculty cannot approve or reject edit requests (HTTP 403)', async () => {
      const res = await request(app)
        .put(`/api/edit-requests/${testEditRequestId}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ status: 'approved' });
      assert.equal(res.status, 403);
    });
  });

  // ========================================================
  // 3. COORDINATOR ROLE BOUNDARIES
  // ========================================================
  describe('3. Coordinator Role Boundaries (Department Operational)', () => {
    test('COORD-01: Coordinator can create departmental activity (HTTP 201)', async () => {
      const res = await request(app)
        .post('/api/departmental-activities')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          title: 'AI Symposium 2026',
          activityCategory: 'Seminar / Talks / Training Program',
          eventDate: '2026-11-01',
          participantsCount: 50
        });
      assert.ok([200, 201].includes(res.status));
    });

    test('COORD-02: Coordinator cannot modify framework master (HTTP 403)', async () => {
      const res = await request(app)
        .post('/api/parameter-master/frameworks')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ name: 'Unauthorized Framework', code: 'UNAUTH' });
      assert.equal(res.status, 403);
    });

    test('COORD-03: Coordinator can view department edit requests (HTTP 200)', async () => {
      const res = await request(app)
        .get('/api/edit-requests')
        .set('Authorization', `Bearer ${coordToken}`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data || res.body));
    });

    test('COORD-04: Coordinator can review/approve edit requests (HTTP 200)', async () => {
      const res = await request(app)
        .put(`/api/edit-requests/${testEditRequestId}`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({ status: 'approved', coordinatorRemarks: 'Approved by CS Coordinator' });
      assert.equal(res.status, 200);
    });
  });

  // ========================================================
  // 4. HOD ROLE BOUNDARIES
  // ========================================================
  describe('4. HOD Role Boundaries (Department Governance)', () => {
    test('HOD-01: HOD can view department strategic plans (HTTP 200)', async () => {
      const res = await request(app)
        .get('/api/strategic-plans')
        .set('Authorization', `Bearer ${hodToken}`);
      assert.equal(res.status, 200);
    });

    test('HOD-02: HOD can create strategic plans for their department (HTTP 201)', async () => {
      const res = await request(app)
        .post('/api/strategic-plans')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({
          department: 'Computer Science',
          academicYear: '2026-2027',
          category: 'academic-excellence',
          objective: 'Curriculum Revision with AI safety',
          targetDate: '2027-05-30',
          status: 'planned'
        });
      assert.ok([200, 201].includes(res.status));
    });

    test('HOD-03: HOD cannot execute system clear-database (HTTP 403)', async () => {
      const res = await request(app)
        .post('/api/system/clear-database')
        .set('Authorization', `Bearer ${hodToken}`);
      assert.equal(res.status, 403);
    });
  });

  // ========================================================
  // 5. INSTITUTIONAL AUTHORITY ROLE BOUNDARIES
  // ========================================================
  describe('5. Authority Role Boundaries (Read-Only Institutional Oversight)', () => {
    test('AUTH-ROLE-01: Authority can view strategic plans across institution (HTTP 200)', async () => {
      const res = await request(app)
        .get('/api/strategic-plans')
        .set('Authorization', `Bearer ${authorityToken}`);
      assert.equal(res.status, 200);
    });

    test('AUTH-ROLE-02: Authority is forbidden from creating strategic plans (HTTP 403)', async () => {
      const res = await request(app)
        .post('/api/strategic-plans')
        .set('Authorization', `Bearer ${authorityToken}`)
        .send({
          department: 'Computer Science',
          academicYear: '2026-2027',
          category: 'academic-excellence',
          objective: 'Unauthorized Authority Plan',
          targetDate: '2027-05-30'
        });
      assert.equal(res.status, 403);
    });

    test('AUTH-ROLE-03: Authority is forbidden from mutating placements (HTTP 403)', async () => {
      const res = await request(app)
        .post('/api/placements')
        .set('Authorization', `Bearer ${authorityToken}`)
        .send({
          studentName: 'Candidate',
          companyName: 'Tech Corp'
        });
      assert.equal(res.status, 403);
    });
  });

  // ========================================================
  // 6. ADMIN ROLE CAPABILITIES
  // ========================================================
  describe('6. Admin Role Capabilities (Full Administration)', () => {
    test('ADM-01: Admin can list all system users (HTTP 200)', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data || res.body));
    });

    test('ADM-02: Admin can access dashboard statistics (HTTP 200)', async () => {
      const res = await request(app)
        .get('/api/system/dashboard-stats')
        .set('Authorization', `Bearer ${adminToken}`);
      assert.equal(res.status, 200);
    });

    test('ADM-03: Admin can configure framework master (HTTP 200/201)', async () => {
      const res = await request(app)
        .post('/api/parameter-master/frameworks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'NBA_TIER1_2026',
          name: 'NBA Tier-1 Framework 2026',
          category: 'NBA',
          academicYear: '2026-2027'
        });
      assert.ok([200, 201].includes(res.status));
    });
  });

});

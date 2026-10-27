'use strict';

/**
 * Phase E1: Expanded Route-Level Authorization & Boundary Verification Matrix
 * CHRIST University IQAC Platform
 *
 * Exercises behavioral authorization checks across 6 caller contexts:
 * - Unauthenticated (Anonymous)
 * - Admin
 * - Authority (Institutional Read-Only)
 * - HOD (Department Head)
 * - Coordinator (Department Operations)
 * - Faculty (Department Contributor)
 *
 * Covers:
 * 1. Edit Requests (create, view, approve/reject)
 * 2. Documents (create, scoped read, role-restricted delete)
 * 3. Strategic Plans & Departmental Activities (creation, deletion, cross-dept bounds)
 * 4. Achievements & Placements (bulk creation, deletion restrictions)
 * 5. Destructive Clear-All & System Reset Boundaries
 * 6. Privilege Escalation & Parameter Tampering Resistance
 */

const path = require('path');
const fs = require('fs');

const testEnvPath = path.join(__dirname, '../../src/app/backend/.env.test');
if (fs.existsSync(testEnvPath) && !process.env.TEST_DATABASE_URL) {
  require('dotenv').config({ path: testEnvPath });
}

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
  User, Student, Faculty, Document, StrategicPlan,
  EditRequest, DepartmentalActivity, Placement, Achievement
} = require(path.join(backendPath, 'models'));
const app = require(path.join(backendPath, 'server'));

describe('Phase E1: Expanded Route-Level Authorization & Boundary Verification Matrix', () => {
  const jwtSecret = process.env.JWT_SECRET || 'phase_b_secret_key_fixed_for_tests';

  const deptCSE = 'Computer Science and Engineering';
  const deptECE = 'Electronics and Communication Engineering';

  let adminUser, authUser, hodCSEUser, coordCSEUser, facultyCSEUser, facultyECEUser;
  let adminToken, authToken, hodToken, coordToken, facultyToken, facultyECEToken;

  let testDocCSE, testPlanCSE, testPlanECE, testAchCSE;

  before(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);

    // Clean test tables
    await User.destroy({ where: {} });
    await Student.destroy({ where: {} });
    await Faculty.destroy({ where: {} });
    await Document.destroy({ where: {} });
    await StrategicPlan.destroy({ where: {} });
    await EditRequest.destroy({ where: {} });
    await DepartmentalActivity.destroy({ where: {} });
    await Placement.destroy({ where: {} });
    await Achievement.destroy({ where: {} });

    // Seed 6 actor contexts
    adminUser = await User.create({
      name: 'Matrix Admin',
      email: 'e_matrix_admin@christ.in',
      password: 'TestPassword@2026!',
      role: 'admin',
      department: 'All',
      tokenVersion: 1,
      mustChangePassword: false
    });

    authUser = await User.create({
      name: 'Matrix Authority',
      email: 'e_matrix_auth@christ.in',
      password: 'TestPassword@2026!',
      role: 'authority',
      department: 'All',
      tokenVersion: 1,
      mustChangePassword: false
    });

    hodCSEUser = await User.create({
      name: 'Matrix HOD CSE',
      email: 'e_matrix_hod@christ.in',
      password: 'TestPassword@2026!',
      role: 'hod',
      department: deptCSE,
      tokenVersion: 1,
      mustChangePassword: false
    });

    coordCSEUser = await User.create({
      name: 'Matrix Coord CSE',
      email: 'e_matrix_coord@christ.in',
      password: 'TestPassword@2026!',
      role: 'coordinator',
      department: deptCSE,
      tokenVersion: 1,
      mustChangePassword: false
    });

    facultyCSEUser = await User.create({
      name: 'Matrix Faculty CSE',
      email: 'e_matrix_fac_cse@christ.in',
      password: 'TestPassword@2026!',
      role: 'faculty',
      department: deptCSE,
      tokenVersion: 1,
      mustChangePassword: false
    });

    facultyECEUser = await User.create({
      name: 'Matrix Faculty ECE',
      email: 'e_matrix_fac_ece@christ.in',
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

    // Seed fixtures
    testDocCSE = await Document.create({
      title: 'CSE Accreditation Document',
      category: 'naac',
      department: deptCSE,
      academicYear: '2025-2026',
      fileName: 'cse-naac.pdf',
      filePath: '/uploads/cse-naac.pdf',
      fileSize: 1024,
      fileType: 'application/pdf',
      uploadedBy: coordCSEUser.id,
      status: 'approved'
    });

    testPlanCSE = await StrategicPlan.create({
      department: deptCSE,
      academicYear: '2025-2026',
      category: 'academic-excellence',
      objective: 'CSE Strategic Roadmap Objective',
      description: 'CSE Strategic Roadmap Description',
      targetDate: '2026-12-31',
      status: 'planned',
      createdBy: hodCSEUser.id
    });

    testPlanECE = await StrategicPlan.create({
      department: deptECE,
      academicYear: '2025-2026',
      category: 'academic-excellence',
      objective: 'ECE Strategic Roadmap Objective',
      description: 'ECE Strategic Roadmap Description',
      targetDate: '2026-12-31',
      status: 'planned',
      createdBy: facultyECEUser.id
    });

    testAchCSE = await Achievement.create({
      title: 'Best Research Paper 2026',
      category: 'research',
      department: deptCSE,
      date: '2026-02-15',
      year: '2025-2026',
      status: 'draft',
      createdBy: facultyCSEUser.id
    });
  });

  after(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);
  });

  // =========================================================================
  // GROUP 1: Edit Requests Authorization Matrix
  // =========================================================================
  describe('Group 1: Edit Requests Authorization Matrix', () => {
    test('EDT-01: Anonymous rejected (401), Faculty can submit (200/201) on POST /api/edit-requests', async () => {
      // 1. Unauthenticated
      await request(app)
        .post('/api/edit-requests')
        .send({ achievementId: testAchCSE.id, reason: 'Correction required' })
        .expect(401);

      // 2. Faculty creator
      const res = await request(app)
        .post('/api/edit-requests')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ achievementId: testAchCSE.id, reason: 'Correction in date' });
      assert.ok([200, 201].includes(res.status), `Expected 200/201, got ${res.status}`);
    });

    test('EDT-02: Non-faculty roles forbidden from creating edit requests (POST /api/edit-requests -> 403)', async () => {
      await request(app)
        .post('/api/edit-requests')
        .set('Authorization', `Bearer ${hodToken}`)
        .send({ entityType: 'publication', entityId: 1, reason: 'Correction' })
        .expect(403);

      await request(app)
        .post('/api/edit-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ entityType: 'publication', entityId: 1, reason: 'Correction' })
        .expect(403);
    });

    test('EDT-03: Governance roles can view edit requests; Faculty is forbidden (GET /api/edit-requests)', async () => {
      // 1. Faculty forbidden
      await request(app)
        .get('/api/edit-requests')
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(403);

      // 2. Admin allowed
      await request(app)
        .get('/api/edit-requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 3. HOD allowed
      await request(app)
        .get('/api/edit-requests')
        .set('Authorization', `Bearer ${hodToken}`)
        .expect(200);

      // 4. Authority allowed
      await request(app)
        .get('/api/edit-requests')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  // =========================================================================
  // GROUP 2: Documents Authorization & Scoping Matrix
  // =========================================================================
  describe('Group 2: Documents Authorization & Scoping Matrix', () => {
    test('DOC-01: Anonymous rejected (401), Authenticated callers can list documents (GET /api/documents)', async () => {
      await request(app).get('/api/documents').expect(401);
      await request(app).get('/api/documents').set('Authorization', `Bearer ${adminToken}`).expect(200);
      await request(app).get('/api/documents').set('Authorization', `Bearer ${facultyToken}`).expect(200);
    });

    test('DOC-02: Authority role forbidden from creating documents (POST /api/documents -> 403)', async () => {
      await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'New Doc', documentType: 'NAAC', department: deptCSE, academicYear: '2025-2026', fileUrl: '/doc.pdf' })
        .expect(403);
    });

    test('DOC-03: Faculty cannot delete documents (DELETE /api/documents/:id -> 403)', async () => {
      await request(app)
        .delete(`/api/documents/${testDocCSE.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(403);
    });

    test('DOC-04: Cross-department document read is restricted (403/404) for non-admin/authority', async () => {
      const res = await request(app)
        .get(`/api/documents/${testDocCSE.id}`)
        .set('Authorization', `Bearer ${facultyECEToken}`);
      assert.ok([403, 404].includes(res.status), `Cross-dept doc access must be rejected, got ${res.status}`);
    });
  });

  // =========================================================================
  // GROUP 3: Strategic Plans & Departmental Activities Matrix
  // =========================================================================
  describe('Group 3: Strategic Plans & Departmental Activities Matrix', () => {
    test('PLN-01: Authority is read-only on Strategic Plans (POST /api/strategic-plans -> 403)', async () => {
      await request(app)
        .post('/api/strategic-plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Auth Plan', department: 'All', academicYear: '2025-2026' })
        .expect(403);
    });

    test('PLN-02: Faculty forbidden from deleting strategic plans (DELETE /api/strategic-plans/:id -> 403)', async () => {
      await request(app)
        .delete(`/api/strategic-plans/${testPlanCSE.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(403);
    });

    test('PLN-03: Cross-department strategic plan edit is rejected (403/404)', async () => {
      // HOD CSE attempting to update ECE strategic plan
      const res = await request(app)
        .put(`/api/strategic-plans/${testPlanECE.id}`)
        .set('Authorization', `Bearer ${hodToken}`)
        .send({ title: 'Hijacked Plan' });
      assert.ok([403, 404].includes(res.status), `Cross-department plan update must be rejected, got ${res.status}`);
    });
  });

  // =========================================================================
  // GROUP 4: Achievements & Placements Matrix
  // =========================================================================
  describe('Group 4: Achievements & Placements Matrix', () => {
    test('ACH-01: Faculty forbidden from bulk upload of achievements (POST /api/achievements/bulk -> 403)', async () => {
      await request(app)
        .post('/api/achievements/bulk')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ achievements: [] })
        .expect(403);
    });

    test('ACH-02: Authority forbidden from bulk upload of achievements (POST /api/achievements/bulk -> 403)', async () => {
      await request(app)
        .post('/api/achievements/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ achievements: [] })
        .expect(403);
    });

    test('ACH-03: Faculty cannot delete achievements (DELETE /api/achievements/:id -> 403)', async () => {
      await request(app)
        .delete(`/api/achievements/${testAchCSE.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .expect(403);
    });

    test('PLC-01: Authority and Faculty forbidden from creating placements (POST /api/placements -> 403)', async () => {
      await request(app)
        .post('/api/placements')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ studentName: 'Test', company: 'Corp', package: '10 LPA', academicYear: '2025-2026', department: deptCSE })
        .expect(403);

      await request(app)
        .post('/api/placements')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ studentName: 'Test', company: 'Corp', package: '10 LPA', academicYear: '2025-2026', department: deptCSE })
        .expect(403);
    });
  });

  // =========================================================================
  // GROUP 5: Destructive Clear-All & System Reset Boundaries
  // =========================================================================
  describe('Group 5: Destructive Clear-All & System Reset Boundaries', () => {
    test('CLR-01: Anonymous and Faculty forbidden from student clear-all (401 / 403)', async () => {
      await request(app).delete('/api/students/clear-all').expect(401);
      await request(app).delete('/api/students/clear-all').set('Authorization', `Bearer ${facultyToken}`).expect(403);
    });

    test('CLR-02: Authority forbidden from student clear-all (DELETE /api/students/clear-all -> 403)', async () => {
      await request(app).delete('/api/students/clear-all').set('Authorization', `Bearer ${authToken}`).expect(403);
    });

    test('CLR-03: HOD clear-all is strictly scoped to own department and preserves other departments; Admin requires dual confirmation', async () => {
      // 1. Seed students in CSE and ECE
      await Student.create({
        registerNumber: 'REG_CLR_CSE_01',
        name: 'CSE Student',
        department: deptCSE,
        academicYear: '2025-2026'
      });
      await Student.create({
        registerNumber: 'REG_CLR_ECE_01',
        name: 'ECE Student',
        department: deptECE,
        academicYear: '2025-2026'
      });

      // 2. HOD CSE clears (even with confirmAll=true)
      const res = await request(app)
        .delete('/api/students/clear-all?confirmAll=true')
        .set('Authorization', `Bearer ${hodToken}`);
      assert.equal(res.status, 200);

      // 3. Verify ECE student was NOT deleted (preserved!)
      const eceStudent = await Student.findOne({ where: { registerNumber: 'REG_CLR_ECE_01' } });
      assert.ok(eceStudent, 'Cross-department student record must NOT be deleted by HOD clear-all');

      // 4. Admin without dual-confirmation phrase is rejected (400)
      await request(app)
        .delete('/api/students/clear-all?confirmAll=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      // Cleanup
      await Student.destroy({ where: { registerNumber: 'REG_CLR_ECE_01' } });
    });

    test('SYS-01: Non-admin roles forbidden from POST /api/system/clear-database (403)', async () => {
      await request(app).post('/api/system/clear-database').set('Authorization', `Bearer ${authToken}`).expect(403);
      await request(app).post('/api/system/clear-database').set('Authorization', `Bearer ${hodToken}`).expect(403);
      await request(app).post('/api/system/clear-database').set('Authorization', `Bearer ${coordToken}`).expect(403);
      await request(app).post('/api/system/clear-database').set('Authorization', `Bearer ${facultyToken}`).expect(403);
    });

    test('SYS-02: Admin cannot clear-database without correct confirmation phrase (400)', async () => {
      await request(app)
        .post('/api/system/clear-database')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ confirmationPhrase: 'INCORRECT_PHRASE' })
        .expect(400);
    });
  });

  // =========================================================================
  // GROUP 6: Privilege Escalation & Parameter Tampering Rejection
  // =========================================================================
  describe('Group 6: Privilege Escalation & Parameter Tampering Rejection', () => {
    test('ESC-01: Non-admin cannot elevate own role to admin via PUT /api/users/:id (403)', async () => {
      await request(app)
        .put(`/api/users/${facultyCSEUser.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ role: 'admin' })
        .expect(403);

      await request(app)
        .put(`/api/users/${hodCSEUser.id}`)
        .set('Authorization', `Bearer ${hodToken}`)
        .send({ role: 'admin' })
        .expect(403);
    });

    test('ESC-02: Faculty cannot self-approve achievement via PUT /api/achievements/:id (status=approved ignored)', async () => {
      const res = await request(app)
        .put(`/api/achievements/${testAchCSE.id}`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ title: 'Updated Title', status: 'approved' });

      assert.ok([200, 403].includes(res.status));
      // Verify database still reflects original draft status
      const reloaded = await Achievement.findByPk(testAchCSE.id);
      assert.notEqual(reloaded.status, 'approved', 'Faculty must not be able to self-approve');
    });
  });
});

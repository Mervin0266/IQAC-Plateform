'use strict';

/**
 * Phase E: Final Comprehensive Route Authorization & Boundary Verification Matrix
 * CHRIST University IQAC Platform
 *
 * Covers remaining mutative domain entities across caller contexts:
 * - Unauthenticated (Anonymous)
 * - Admin (Full institutional privileges)
 * - Authority (Institutional read-only audit)
 * - Faculty (Department-scoped contributor)
 *
 * Verifies:
 * 1. User Account Administrative Boundaries (DELETE /api/users/:id)
 * 2. Institutional Master Configuration (Campuses, Schools, Program Levels, Courses)
 * 3. Research & Extension Bulk Ingestion (Patents, Publications, Sponsored Projects, Consultancy, Activities)
 * 4. Cross-Department Boundary Isolation on Bulk Operations
 * 5. Parameter Master Verification & Governance Workflow
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

const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const { sequelize } = require(path.join(backendPath, 'config/database'));
const { User, Department } = require(path.join(backendPath, 'models'));
const app = require(path.join(backendPath, 'server'));

describe('Phase E: Final Comprehensive Route Authorization & Boundary Verification Matrix', () => {
  const jwtSecret = process.env.JWT_SECRET || 'phase_b_secret_key_fixed_for_tests';

  let adminUser, authUser, facultyCSEUser, facultyECEUser;
  let adminToken, authToken, facultyCSEToken, facultyECEToken;

  before(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);

    adminUser = await User.findOne({ where: { role: 'admin' } });
    authUser = await User.findOne({ where: { role: 'authority' } });
    facultyCSEUser = await User.findOne({ where: { role: 'faculty', department: 'Computer Science and Engineering' } });
    facultyECEUser = await User.findOne({ where: { role: 'faculty', department: 'Electronics and Communication Engineering' } });

    assert.ok(adminUser, 'Admin user must exist');
    assert.ok(authUser, 'Authority user must exist');
    assert.ok(facultyCSEUser, 'Faculty CSE user must exist');
    assert.ok(facultyECEUser, 'Faculty ECE user must exist');

    adminToken = jwt.sign({ id: adminUser.id, tokenVersion: adminUser.tokenVersion || 0 }, jwtSecret, { expiresIn: '1h' });
    authToken = jwt.sign({ id: authUser.id, tokenVersion: authUser.tokenVersion || 0 }, jwtSecret, { expiresIn: '1h' });
    facultyCSEToken = jwt.sign({ id: facultyCSEUser.id, tokenVersion: facultyCSEUser.tokenVersion || 0 }, jwtSecret, { expiresIn: '1h' });
    facultyECEToken = jwt.sign({ id: facultyECEUser.id, tokenVersion: facultyECEUser.tokenVersion || 0 }, jwtSecret, { expiresIn: '1h' });
  });

  // --- 1. User Administration Authorization ---
  test('AUTH-FINAL-01: Anonymous caller cannot delete users (DELETE /api/users/:id -> 401)', async () => {
    const res = await request(app).delete('/api/users/99999');
    assert.equal(res.status, 401);
  });

  test('AUTH-FINAL-02: Faculty cannot delete user accounts (DELETE /api/users/:id -> 403)', async () => {
    const res = await request(app)
      .delete('/api/users/99999')
      .set('Authorization', `Bearer ${facultyCSEToken}`);
    assert.equal(res.status, 403);
  });

  // --- 2. Master Infrastructure & Curricular Configuration ---
  const masterRoutes = [
    { name: 'Campuses', path: '/api/campuses' },
    { name: 'Schools', path: '/api/schools' },
    { name: 'Program Levels', path: '/api/program-levels' },
    { name: 'Courses', path: '/api/courses' }
  ];

  masterRoutes.forEach(({ name, path: routePath }) => {
    test(`AUTH-FINAL-03-${name}: Anonymous cannot create ${name} (POST ${routePath} -> 401)`, async () => {
      const res = await request(app)
        .post(routePath)
        .send({ name: `Test ${name}` });
      assert.equal(res.status, 401);
    });

    test(`AUTH-FINAL-04-${name}: Faculty cannot create institutional ${name} (POST ${routePath} -> 403)`, async () => {
      const res = await request(app)
        .post(routePath)
        .set('Authorization', `Bearer ${facultyCSEToken}`)
        .send({ name: `Unauthorized ${name}` });
      assert.equal(res.status, 403);
    });
  });

  // --- 3. Research & Extension Bulk Ingestion Routes ---
  const bulkRoutes = [
    { entity: 'Patents', path: '/api/patents/bulk' },
    { entity: 'Publications', path: '/api/publications/bulk' },
    { entity: 'Sponsored Projects', path: '/api/sponsored-projects/bulk' },
    { entity: 'Consultancy Projects', path: '/api/consultancy-projects/bulk' },
    { entity: 'Departmental Activities', path: '/api/departmental-activities/bulk' }
  ];

  bulkRoutes.forEach(({ entity, path: bulkPath }) => {
    test(`AUTH-FINAL-05-${entity}: Anonymous caller cannot bulk-ingest ${entity} (POST ${bulkPath} -> 401)`, async () => {
      const res = await request(app)
        .post(bulkPath)
        .send({ data: [{ title: 'Unauthorized' }] });
      assert.equal(res.status, 401);
    });

    test(`AUTH-FINAL-06-${entity}: Authority (Read-Only) cannot bulk-ingest ${entity} (POST ${bulkPath} -> 403)`, async () => {
      const res = await request(app)
        .post(bulkPath)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: [{ title: 'Auditor Cannot Ingest' }] });
      assert.equal(res.status, 403);
    });
  });

  // --- 4. Cross-Department Boundary Isolation on Bulk Ingestion ---
  test('AUTH-FINAL-07: Faculty cannot bulk-ingest records for a different department (POST /api/publications/bulk -> 403)', async () => {
    const res = await request(app)
      .post('/api/publications/bulk')
      .set('Authorization', `Bearer ${facultyCSEToken}`)
      .send({
        department: 'Electronics and Communication Engineering',
        data: [{ title: 'Cross Dept Paper', department: 'Electronics and Communication Engineering' }]
      });
    // System must reject cross-department submission
    assert.ok([400, 403].includes(res.status), `Expected 400 or 403, got ${res.status}`);
  });

  // --- 5. Parameter Master Governance Workflow ---
  test('AUTH-FINAL-08: Anonymous caller cannot access parameter master definitions (POST /api/parameter-master/parameters -> 401)', async () => {
    const res = await request(app)
      .post('/api/parameter-master/parameters')
      .send({ code: 'PARAM_TEST', label: 'Test Param' });
    assert.equal(res.status, 401);
  });

  test('AUTH-FINAL-09: Faculty cannot create master parameter criteria (POST /api/parameter-master/parameters -> 403)', async () => {
    const res = await request(app)
      .post('/api/parameter-master/parameters')
      .set('Authorization', `Bearer ${facultyCSEToken}`)
      .send({ code: 'PARAM_FAC_TEST', label: 'Faculty Cannot Define Parameters' });
    assert.equal(res.status, 403);
  });

  test('AUTH-FINAL-10: Faculty cannot verify parameter submissions (PUT /api/parameter-master/submissions/1/verify -> 403)', async () => {
    const res = await request(app)
      .put('/api/parameter-master/submissions/1/verify')
      .set('Authorization', `Bearer ${facultyCSEToken}`)
      .send({ verified: true });
    assert.equal(res.status, 403);
  });
});

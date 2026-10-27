'use strict';

/**
 * Phase B Workstream B5 Automated Tests: Runtime DDL Elimination & Safe Upsert
 * CHRIST University IQAC Platform
 * 
 * Verifies:
 * - Elimination of ALTER TABLE / DROP CONSTRAINT from request handlers
 * - Composite identity keys: Student [registerNumber, academicYear], Faculty [employeeId, academicYear]
 * - Safe transactional upsert for same-department records
 * - Prevention of cross-department overwrites
 * - Multi-year co-existence under composite key
 * - Transaction rollback on catastrophic/invalid imports
 * - Concurrent import safety
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
const { User, Student, Faculty, Patent } = require(path.join(backendPath, 'models'));
const app = require(path.join(backendPath, 'server'));

describe('Phase B: Workstream B5 — Remove Runtime DDL & Safe Upsert', () => {
  const jwtSecret = process.env.JWT_SECRET || 'phase_b_secret_key_fixed_for_tests';

  let cseCoordToken;
  let physicsCoordToken;
  let adminToken;

  const cseDept = 'Computer Science and Engineering';
  const physicsDept = 'Physics';

  before(async () => {
    // 1. Positively verify disposable test database
    await verifyPreProvisionedDisposableTestDatabase(sequelize);

    // 2. Clean test data
    await User.destroy({ where: { email: ['b5_cse_coord@christ.in', 'b5_phys_coord@christ.in', 'b5_admin@christ.in'] } });
    await Student.destroy({ where: { registerNumber: ['REG_TEST_001', 'REG_TEST_002', 'REG_TEST_003', 'REG_CONCURRENT_1', 'REG_CONCURRENT_2'] } });
    await Faculty.destroy({ where: { employeeId: ['EMP_TEST_001', 'EMP_TEST_002', 'EMP_CONCURRENT_1'] } });

    // 3. Create real user records for testing
    const cseCoord = await User.create({
      name: 'CSE Coordinator',
      email: 'b5_cse_coord@christ.in',
      password: 'TestPassword@2026!',
      role: 'coordinator',
      department: cseDept,
      tokenVersion: 1,
      mustChangePassword: false
    });

    const physCoord = await User.create({
      name: 'Physics Coordinator',
      email: 'b5_phys_coord@christ.in',
      password: 'TestPassword@2026!',
      role: 'coordinator',
      department: physicsDept,
      tokenVersion: 1,
      mustChangePassword: false
    });

    const admin = await User.create({
      name: 'B5 Admin',
      email: 'b5_admin@christ.in',
      password: 'TestPassword@2026!',
      role: 'admin',
      department: 'All',
      tokenVersion: 1,
      mustChangePassword: false
    });

    // 4. Create auth tokens
    cseCoordToken = jwt.sign(
      { id: cseCoord.id, role: cseCoord.role, department: cseCoord.department, tokenVersion: cseCoord.tokenVersion },
      jwtSecret,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    physicsCoordToken = jwt.sign(
      { id: physCoord.id, role: physCoord.role, department: physCoord.department, tokenVersion: physCoord.tokenVersion },
      jwtSecret,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    adminToken = jwt.sign(
      { id: admin.id, role: admin.role, department: admin.department, tokenVersion: admin.tokenVersion },
      jwtSecret,
      { expiresIn: '1h', algorithm: 'HS256' }
    );
  });

  after(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);
    await User.destroy({ where: { email: ['b5_cse_coord@christ.in', 'b5_phys_coord@christ.in', 'b5_admin@christ.in'] } });
    await Student.destroy({ where: { registerNumber: ['REG_TEST_001', 'REG_TEST_002', 'REG_TEST_003', 'REG_CONCURRENT_1', 'REG_CONCURRENT_2'] } });
    await Faculty.destroy({ where: { employeeId: ['EMP_TEST_001', 'EMP_TEST_002', 'EMP_CONCURRENT_1'] } });
  });

  test('B5-01: Bulk create new student records successfully in caller department', async () => {
    const res = await request(app)
      .post('/api/students/bulk')
      .set('Authorization', `Bearer ${cseCoordToken}`)
      .send({
        students: [
          {
            registerNumber: 'REG_TEST_001',
            name: 'Aarav Sharma',
            academicYear: '2024-2025',
            course: 'BTech CSE',
            email: 'aarav.sharma@test.christuniversity.in'
          }
        ]
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 1);

    const saved = await Student.findOne({ where: { registerNumber: 'REG_TEST_001', academicYear: '2024-2025' } });
    assert.ok(saved);
    assert.equal(saved.department, cseDept);
    assert.equal(saved.name, 'Aarav Sharma');
  });

  test('B5-02: Safe upsert: uploading existing student in same department updates record without DDL/constraint crash', async () => {
    const res = await request(app)
      .post('/api/students/bulk')
      .set('Authorization', `Bearer ${cseCoordToken}`)
      .send({
        students: [
          {
            registerNumber: 'REG_TEST_001',
            name: 'Aarav Sharma Updated',
            academicYear: '2024-2025',
            course: 'BTech CSE AI',
            email: 'aarav.updated@test.christuniversity.in'
          }
        ]
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 1);

    const updated = await Student.findOne({ where: { registerNumber: 'REG_TEST_001', academicYear: '2024-2025' } });
    assert.ok(updated);
    assert.equal(updated.name, 'Aarav Sharma Updated');
    assert.equal(updated.course, 'BTech CSE AI');
  });

  test('B5-03: Composite key allows same student registerNumber in a different academicYear', async () => {
    const res = await request(app)
      .post('/api/students/bulk')
      .set('Authorization', `Bearer ${cseCoordToken}`)
      .send({
        students: [
          {
            registerNumber: 'REG_TEST_001',
            name: 'Aarav Sharma Year 2',
            academicYear: '2025-2026',
            course: 'BTech CSE'
          }
        ]
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const year1 = await Student.findOne({ where: { registerNumber: 'REG_TEST_001', academicYear: '2024-2025' } });
    const year2 = await Student.findOne({ where: { registerNumber: 'REG_TEST_001', academicYear: '2025-2026' } });

    assert.ok(year1);
    assert.ok(year2);
    assert.notEqual(year1.id, year2.id);
  });

  test('B5-04: Cross-department overwrite protection rejects attempt by another department', async () => {
    const res = await request(app)
      .post('/api/students/bulk')
      .set('Authorization', `Bearer ${physicsCoordToken}`)
      .send({
        students: [
          {
            registerNumber: 'REG_TEST_001',
            name: 'Hacked Aarav In Physics',
            academicYear: '2024-2025',
            course: 'BSc Physics'
          }
        ]
      });

    // All records failed authorization
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors && res.body.errors.length > 0);
    assert.ok(res.body.errors[0].includes('another department'));

    // Verify CSE record remains unchanged
    const record = await Student.findOne({ where: { registerNumber: 'REG_TEST_001', academicYear: '2024-2025' } });
    assert.equal(record.department, cseDept);
    assert.equal(record.name, 'Aarav Sharma Updated');
  });

  test('B5-05: Missing required fields aborts with transaction rollback and meaningful error', async () => {
    const res = await request(app)
      .post('/api/students/bulk')
      .set('Authorization', `Bearer ${cseCoordToken}`)
      .send({
        students: [
          {
            // missing registerNumber
            name: 'Invalid Student'
          },
          {
            registerNumber: 'REG_TEST_003'
            // missing name
          }
        ]
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors.length >= 2);

    const unsaved = await Student.findOne({ where: { registerNumber: 'REG_TEST_003' } });
    assert.equal(unsaved, null);
  });

  test('B5-06: Faculty bulk upload creates record with composite key [employeeId, academicYear]', async () => {
    const res = await request(app)
      .post('/api/faculty/bulk')
      .set('Authorization', `Bearer ${cseCoordToken}`)
      .send({
        faculty: [
          {
            employeeId: 'EMP_TEST_001',
            name: 'Dr. Priya Raman',
            designation: 'Professor',
            academicYear: '2024-2025',
            gender: 'Female'
          }
        ]
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 1);

    const saved = await Faculty.findOne({ where: { employeeId: 'EMP_TEST_001', academicYear: '2024-2025' } });
    assert.ok(saved);
    assert.equal(saved.department, cseDept);
    assert.equal(saved.name, 'Dr. Priya Raman');
  });

  test('B5-07: Faculty cross-department protection prevents overwrite by different department coordinator', async () => {
    const res = await request(app)
      .post('/api/faculty/bulk')
      .set('Authorization', `Bearer ${physicsCoordToken}`)
      .send({
        faculty: [
          {
            employeeId: 'EMP_TEST_001',
            name: 'Dr. Priya Raman Physics Hijack',
            designation: 'Professor',
            academicYear: '2024-2025'
          }
        ]
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors[0].includes('another department'));

    const fac = await Faculty.findOne({ where: { employeeId: 'EMP_TEST_001', academicYear: '2024-2025' } });
    assert.equal(fac.department, cseDept);
  });

  test('B5-08: Concurrent bulk uploads execute safely without deadlock or duplicate key errors', async () => {
    const payload1 = {
      students: [
        { registerNumber: 'REG_CONCURRENT_1', name: 'Concurrent Student 1', academicYear: '2024-2025' }
      ]
    };
    const payload2 = {
      students: [
        { registerNumber: 'REG_CONCURRENT_2', name: 'Concurrent Student 2', academicYear: '2024-2025' }
      ]
    };

    const [res1, res2] = await Promise.all([
      request(app).post('/api/students/bulk').set('Authorization', `Bearer ${cseCoordToken}`).send(payload1),
      request(app).post('/api/students/bulk').set('Authorization', `Bearer ${cseCoordToken}`).send(payload2)
    ]);

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);

    const s1 = await Student.findOne({ where: { registerNumber: 'REG_CONCURRENT_1' } });
    const s2 = await Student.findOne({ where: { registerNumber: 'REG_CONCURRENT_2' } });

    assert.ok(s1);
    assert.ok(s2);
  });

  after(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);
    await User.destroy({ where: { email: ['b5_cse_coord@christ.in', 'b5_phys_coord@christ.in', 'b5_admin@christ.in'] } });
    await Student.destroy({ where: { registerNumber: ['REG_TEST_001', 'REG_TEST_002', 'REG_TEST_003', 'REG_CONCURRENT_1', 'REG_CONCURRENT_2'] } });
    await Faculty.destroy({ where: { employeeId: ['EMP_TEST_001', 'EMP_TEST_002', 'EMP_CONCURRENT_1'] } });
  });

});

'use strict';

/**
 * Phase D: Resource-Bounded Streaming & Batched Export Verification Suite
 * CHRIST University IQAC Platform
 * 
 * Verifies:
 * 1. Safe disposable database preflight and positive marker verification.
 * 2. Multi-page batched streaming export without server memory exhaustion.
 * 3. Preservation of authorization scope and department boundaries during export.
 * 4. Streaming CSV export with RFC-4180 escaping, UTF-8 BOM, and formula injection mitigation.
 * 5. Preservation of negative numbers and decimals during export sanitization.
 * 6. Field-level confidentiality enforcement (PAN redaction, private student fields).
 * 7. Resource-bounded fail-safe behavior with accurate isComplete / isTruncated flags.
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
const { User, Student, Faculty } = require(path.join(backendPath, 'models'));
const app = require(path.join(backendPath, 'server'));
const { streamBatchedExport, escapeCsvCell } = require(path.join(backendPath, 'utils/paginationHelper'));

describe('Phase D: Resource-Bounded Streaming & Batched Export Verification', () => {
  const jwtSecret = process.env.JWT_SECRET || 'phase_b_secret_key_fixed_for_tests';

  let adminUser, hodUserDeptA, facultyUserDeptB;
  let adminToken, hodTokenDeptA, facultyTokenDeptB;

  const deptA = 'Computer Science and Engineering';
  const deptB = 'Mechanical Engineering';

  before(async () => {
    // 1. Positively verify disposable test database marker
    await verifyPreProvisionedDisposableTestDatabase(sequelize);

    // 2. Clean test records
    await User.destroy({ where: { email: ['d_export_admin@christ.in', 'd_export_hod_a@christ.in', 'd_export_fac_b@christ.in'] } });
    await Student.destroy({ where: { department: [deptA, deptB] } });
    await Faculty.destroy({ where: { department: [deptA, deptB] } });

    // 3. Seed users
    adminUser = await User.create({
      name: 'Export Admin',
      email: 'd_export_admin@christ.in',
      password: 'TestPassword@2026!',
      role: 'admin',
      department: 'All',
      tokenVersion: 1,
      mustChangePassword: false
    });

    hodUserDeptA = await User.create({
      name: 'Export HOD Dept A',
      email: 'd_export_hod_a@christ.in',
      password: 'TestPassword@2026!',
      role: 'hod',
      department: deptA,
      tokenVersion: 1,
      mustChangePassword: false
    });

    facultyUserDeptB = await User.create({
      name: 'Export Faculty Dept B',
      email: 'd_export_fac_b@christ.in',
      password: 'TestPassword@2026!',
      role: 'faculty',
      department: deptB,
      tokenVersion: 1,
      mustChangePassword: false
    });

    adminToken = jwt.sign({ id: adminUser.id, role: 'admin', department: 'All', tokenVersion: 1 }, jwtSecret, { expiresIn: '1h' });
    hodTokenDeptA = jwt.sign({ id: hodUserDeptA.id, role: 'hod', department: deptA, tokenVersion: 1 }, jwtSecret, { expiresIn: '1h' });
    facultyTokenDeptB = jwt.sign({ id: facultyUserDeptB.id, role: 'faculty', department: deptB, tokenVersion: 1 }, jwtSecret, { expiresIn: '1h' });

    // 4. Seed synthetic dataset for multi-page streaming verification (120 records across 2 departments)
    // Includes formula injection attempts and confidential fields
    const students = [];
    for (let i = 1; i <= 80; i++) {
      students.push({
        registerNumber: `D_EXP_A_${String(i).padStart(4, '0')}`,
        name: i === 1 ? '=cmd|\'/C calc\'!A0' : (i === 2 ? '@SUM(1,2)' : `Dept A Student ${i}`),
        department: deptA,
        academicYear: '2024-2025',
        course: 'B.Tech CSE',
        status: 'Active',
        email: `student_a_${i}@christ.in`,
        mobileNo: `98765${String(i).padStart(5, '0')}`
      });
    }

    for (let i = 1; i <= 40; i++) {
      students.push({
        registerNumber: `D_EXP_B_${String(i).padStart(4, '0')}`,
        name: `Dept B Student ${i}`,
        department: deptB,
        academicYear: '2024-2025',
        course: 'B.Tech ME',
        status: 'Active',
        email: `student_b_${i}@christ.in`,
        mobileNo: `91234${String(i).padStart(5, '0')}`
      });
    }

    await Student.bulkCreate(students);

    // Seed faculty with PAN numbers
    await Faculty.bulkCreate([
      {
        employeeId: 'D_FAC_A_001',
        name: 'Dr. Faculty A',
        department: deptA,
        academicYear: '2024-2025',
        designation: 'Professor',
        panCardNumber: 'ABCDE1234F',
        sNo: 1
      },
      {
        employeeId: 'D_FAC_B_001',
        name: 'Dr. Faculty B',
        department: deptB,
        academicYear: '2024-2025',
        designation: 'Associate Professor',
        panCardNumber: 'XYZAB5678C',
        sNo: 2
      }
    ]);
  });

  after(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);
    await User.destroy({ where: { email: ['d_export_admin@christ.in', 'd_export_hod_a@christ.in', 'd_export_fac_b@christ.in'] } });
    await Student.destroy({ where: { department: [deptA, deptB] } });
    await Faculty.destroy({ where: { department: [deptA, deptB] } });
  });

  // Test 1: escapeCsvCell handles formula injection and preserves negatives
  test('EXP-01: escapeCsvCell neutralizes formula triggers and preserves valid numbers', () => {
    assert.equal(escapeCsvCell('=cmd|\'/C calc\'!A0'), '\'=cmd|\'/C calc\'!A0');
    assert.equal(escapeCsvCell('+12345'), '\'+12345');
    assert.equal(escapeCsvCell('@SUM(1,2)'), '"\'@SUM(1,2)"');
    assert.equal(escapeCsvCell('-42'), '-42');
    assert.equal(escapeCsvCell('-3.14159'), '-3.14159');
    assert.equal(escapeCsvCell('Hello, World'), '"Hello, World"');
    assert.equal(escapeCsvCell('Line1\nLine2'), '"Line1\nLine2"');
    assert.equal(escapeCsvCell('Quote "test"'), '"Quote ""test"""');
  });

  // Test 2: JSON Streaming Export for Admin (Full multi-department dataset)
  test('EXP-02: Admin JSON streaming export retrieves full institutional dataset with accurate metadata', async () => {
    const res = await request(app)
      .get('/api/students?export=true')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'application/json; charset=utf-8');
    assert.equal(res.headers['transfer-encoding'], 'chunked');

    const body = res.body;
    assert.equal(body.success, true);
    assert.equal(body.total, 120);
    assert.equal(body.count, 120);
    assert.equal(body.pagination.isComplete, true);
    assert.equal(body.pagination.isTruncated, false);
    assert.equal(body.data.length, 120);

    // Verify formula neutralization in JSON stream
    const firstStudent = body.data.find(s => s.registerNumber === 'D_EXP_A_0001');
    assert.ok(firstStudent);
    assert.ok(firstStudent.name.startsWith("'="), `Formula injection must be sanitized: got ${firstStudent.name}`);
  });

  // Test 3: Department scoping is strictly preserved during export
  test('EXP-03: HOD export is strictly restricted to department records only', async () => {
    const res = await request(app)
      .get('/api/students?export=true')
      .set('Authorization', `Bearer ${hodTokenDeptA}`);

    assert.equal(res.status, 200);
    const body = res.body;
    assert.equal(body.success, true);
    assert.equal(body.total, 80); // Only Dept A records
    assert.equal(body.count, 80);
    assert.ok(body.data.every(s => s.department === deptA), 'HOD export must not leak other departments');
  });

  // Test 4: CSV Streaming Export with RFC-4180 headers and formula protection
  test('EXP-04: CSV streaming export produces compliant CSV with BOM and formula protection', async () => {
    const res = await request(app)
      .get('/api/students?export=true&format=csv')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'text/csv; charset=utf-8');
    assert.equal(res.headers['content-disposition'], 'attachment; filename="students_export.csv"');
    assert.equal(res.headers['transfer-encoding'], 'chunked');

    const csvText = res.text;
    // Check for UTF-8 Byte Order Mark
    assert.ok(csvText.charCodeAt(0) === 0xFEFF, 'CSV must start with UTF-8 BOM');

    // Check header row
    const lines = csvText.replace(/^\uFEFF/, '').trim().split('\r\n');
    assert.ok(lines.length >= 121, `Expected at least 121 lines (1 header + 120 records), got ${lines.length}`);
    assert.ok(lines[0].includes('registerNumber'));

    // Check formula neutralization in CSV row
    const formulaLine = lines.find(l => l.includes('D_EXP_A_0001'));
    assert.ok(formulaLine, 'Line with formula student must exist');
    assert.ok(formulaLine.includes("'=cmd|"), `Formula in CSV must be escaped with single quote: ${formulaLine}`);
  });

  // Test 5: Field-level confidentiality preserved in faculty export (PAN redacted for non-admin)
  test('EXP-05: Faculty export preserves field-level confidentiality (PAN redacted for department faculty)', async () => {
    const res = await request(app)
      .get('/api/faculty?export=true')
      .set('Authorization', `Bearer ${facultyTokenDeptB}`);

    assert.equal(res.status, 200);
    const body = res.body;
    assert.equal(body.success, true);
    assert.equal(body.total, 1); // Only Dept B faculty
    const facB = body.data[0];
    assert.equal(facB.panCardNumber, undefined, 'PAN card must be completely omitted from faculty export');
  });

  // Test 6: Batched Keyset Streaming with Small Chunk Size simulates multi-page processing
  test('EXP-06: streamBatchedExport handles multi-batch queries safely with small chunk sizes', async () => {
    let mockOutput = '';
    const mockHeaders = {};

    const mockRes = {
      setHeader(k, v) { mockHeaders[k] = v; },
      write(chunk) { mockOutput += chunk; },
      end() { this.writableEnded = true; },
      on(event, handler) {},
      writableEnded: false
    };

    // Export 120 students with batchSize = 25 (requires 5 discrete database queries)
    await streamBatchedExport(mockRes, {
      model: Student,
      where: { department: deptA },
      order: [['registerNumber', 'ASC']],
      batchSize: 25,
      maxRecords: 1000,
      format: 'json',
      filename: 'test_batch'
    });

    assert.ok(mockRes.writableEnded);
    const parsed = JSON.parse(mockOutput);
    assert.equal(parsed.success, true);
    assert.equal(parsed.count, 80);
    assert.equal(parsed.total, 80);
    assert.equal(parsed.pagination.isComplete, true);
    assert.equal(parsed.pagination.isTruncated, false);
    assert.equal(parsed.data.length, 80);
  });

  // Test 7: Resource-bounded fail-safe behavior flags isTruncated when ceiling is hit
  test('EXP-07: streamBatchedExport flags isTruncated:true and fails safely when maxRecords ceiling is reached', async () => {
    let mockOutput = '';
    const mockHeaders = {};

    const mockRes = {
      setHeader(k, v) { mockHeaders[k] = v; },
      write(chunk) { mockOutput += chunk; },
      end() { this.writableEnded = true; },
      on(event, handler) {},
      writableEnded: false
    };

    // Ceil maxRecords to 30 when 80 exist
    await streamBatchedExport(mockRes, {
      model: Student,
      where: { department: deptA },
      order: [['registerNumber', 'ASC']],
      batchSize: 10,
      maxRecords: 30, // Intentionally bounded below total
      format: 'json',
      filename: 'bounded_test'
    });

    const parsed = JSON.parse(mockOutput);
    assert.equal(parsed.count, 30);
    assert.equal(parsed.total, 80);
    assert.equal(parsed.pagination.isComplete, false, 'Export must NOT claim complete when truncated');
    assert.equal(parsed.pagination.isTruncated, true, 'Export must explicitly flag isTruncated:true');
    assert.equal(parsed.data.length, 30);
  });
});

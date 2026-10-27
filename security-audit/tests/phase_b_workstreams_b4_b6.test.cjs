'use strict';

/**
 * Phase B Workstreams B4 (API Pagination) & B6 (Spreadsheet & Mass Assignment Security)
 * CHRIST University IQAC Platform
 * 
 * Verifies:
 * - B4: Server-side pagination bounds (default 50, max 100)
 * - B4: Input sanitization on negative/malformed page and limit parameters
 * - B4: Accurate pagination metadata (total, totalPages, hasNextPage, hasPrevPage)
 * - B4: Full dataset access under export=true
 * - B6: Spreadsheet formula injection mitigation (CWE-1236)
 * - B6: Numeric preservation (negative numbers/floats NOT corrupted)
 * - B6: Mass assignment defense in documentController (ownership & status protection)
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
const { sanitizeSpreadsheetCell, sanitizeSpreadsheetRow } = require(path.join(backendPath, 'utils/spreadsheetSanitizer'));
const { parsePagination, safeParseInt } = require(path.join(backendPath, 'utils/paginationHelper'));

describe('Phase B: Workstreams B4 (Pagination) & B6 (Spreadsheet / Mass Assignment)', () => {
  const jwtSecret = process.env.JWT_SECRET || 'phase_b_secret_key_fixed_for_tests';

  let facultyUser, adminUser;
  let facultyToken, adminToken;
  const testDept = 'Computer Science and Engineering';

  before(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);

    // Clean test data
    await User.destroy({ where: { email: ['b4_b6_fac@christ.in', 'b4_b6_admin@christ.in'] } });
    await Student.destroy({ where: { department: 'Test Pagination Dept' } });
    await Document.destroy({ where: { title: 'Security Test Document B6' } });

    facultyUser = await User.create({
      name: 'B4 Faculty User',
      email: 'b4_b6_fac@christ.in',
      password: 'TestPassword@2026!',
      role: 'faculty',
      department: testDept,
      tokenVersion: 1,
      mustChangePassword: false
    });

    adminUser = await User.create({
      name: 'B4 Admin User',
      email: 'b4_b6_admin@christ.in',
      password: 'TestPassword@2026!',
      role: 'admin',
      department: 'All',
      tokenVersion: 1,
      mustChangePassword: false
    });

    facultyToken = jwt.sign(
      { id: facultyUser.id, role: facultyUser.role, department: facultyUser.department, tokenVersion: facultyUser.tokenVersion },
      jwtSecret,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    adminToken = jwt.sign(
      { id: adminUser.id, role: adminUser.role, department: adminUser.department, tokenVersion: adminUser.tokenVersion },
      jwtSecret,
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    // Seed 15 test student records for pagination testing
    const testStudents = [];
    for (let i = 1; i <= 15; i++) {
      testStudents.push({
        registerNumber: `PAG_TEST_${String(i).padStart(3, '0')}`,
        name: `Pagination Student ${i}`,
        department: 'Test Pagination Dept',
        academicYear: '2024-2025'
      });
    }
    await Student.bulkCreate(testStudents);
  });

  after(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);
    await User.destroy({ where: { email: ['b4_b6_fac@christ.in', 'b4_b6_admin@christ.in'] } });
    await Student.destroy({ where: { department: 'Test Pagination Dept' } });
    await Document.destroy({ where: { title: 'Security Test Document B6' } });
  });

  // --- B4: Pagination Tests ---

  test('B4-01: Pagination Helper parses valid page and limit and clamps to max limit', () => {
    const res1 = parsePagination({ page: '2', limit: '20' });
    assert.equal(res1.page, 2);
    assert.equal(res1.limit, 20);
    assert.equal(res1.offset, 20);

    // Clamping to max 100
    const res2 = parsePagination({ page: '1', limit: '999999' });
    assert.equal(res2.page, 1);
    assert.equal(res2.limit, 100);

    // Clamping negative / malformed values safely
    const res3 = parsePagination({ page: '-5', limit: '-20' });
    assert.equal(res3.page, 1);
    assert.equal(res3.limit, 50);

    const res4 = parsePagination({ page: 'NaN', limit: 'undefined' });
    assert.equal(res4.page, 1);
    assert.equal(res4.limit, 50);
  });

  test('B4-02: GET /api/students returns paginated records with correct metadata', async () => {
    const res = await request(app)
      .get('/api/students?department=Test%20Pagination%20Dept&page=1&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.count, 5);
    assert.equal(res.body.total, 15);
    assert.ok(res.body.pagination);
    assert.equal(res.body.pagination.page, 1);
    assert.equal(res.body.pagination.limit, 5);
    assert.equal(res.body.pagination.totalPages, 3);
    assert.equal(res.body.pagination.hasNextPage, true);
    assert.equal(res.body.pagination.hasPrevPage, false);
  });

  test('B4-03: GET /api/students page 3 returns remaining records with hasNextPage=false', async () => {
    const res = await request(app)
      .get('/api/students?department=Test%20Pagination%20Dept&page=3&limit=5')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.count, 5);
    assert.equal(res.body.pagination.page, 3);
    assert.equal(res.body.pagination.hasNextPage, false);
    assert.equal(res.body.pagination.hasPrevPage, true);
  });

  test('B4-04: GET /api/students rejects excessive limit by clamping to 100', async () => {
    const res = await request(app)
      .get('/api/students?department=Test%20Pagination%20Dept&limit=999999')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.pagination.limit, 100);
  });

  test('B4-05: GET /api/students with export=true returns full authorized dataset', async () => {
    const res = await request(app)
      .get('/api/students?department=Test%20Pagination%20Dept&export=true')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.count, 15);
    assert.equal(res.body.total, 15);
  });

  // --- B6: Spreadsheet Formula Injection Tests (CWE-1236) ---

  test('B6-01: Formula triggers beginning with =, +, -, @ are prefixed with single quote', () => {
    assert.equal(sanitizeSpreadsheetCell('=SUM(A1:B10)'), "'=SUM(A1:B10)");
    assert.equal(sanitizeSpreadsheetCell('+cmd|\' /C calc\'!A0'), "'+cmd|' /C calc'!A0");
    assert.equal(sanitizeSpreadsheetCell('@SUM(1,2)'), "'@SUM(1,2)");
    assert.equal(sanitizeSpreadsheetCell('\t=2+2'), "'\t=2+2");
    assert.equal(sanitizeSpreadsheetCell('  =cmd'), "'  =cmd");
    assert.equal(sanitizeSpreadsheetCell('-2+3+cmd|\' /C calc\'!A0'), "'-2+3+cmd|' /C calc'!A0");
  });

  test('B6-02: Legitimate negative numbers and floats are preserved without quote prefix', () => {
    assert.equal(sanitizeSpreadsheetCell(-42), -42);
    assert.equal(sanitizeSpreadsheetCell(-3.14159), -3.14159);
    assert.equal(sanitizeSpreadsheetCell('-42'), '-42');
    assert.equal(sanitizeSpreadsheetCell('-3.14'), '-3.14');
    assert.equal(sanitizeSpreadsheetCell(0), 0);
    assert.equal(sanitizeSpreadsheetCell('Normal Faculty Name'), 'Normal Faculty Name');
  });

  test('B6-03: sanitizeSpreadsheetRow neutralizes malicious values in objects and arrays', () => {
    const dirtyRow = {
      name: '=cmd|calc',
      department: 'Computer Science',
      salary: -50000,
      notes: '  @alert(1)'
    };
    const cleanRow = sanitizeSpreadsheetRow(dirtyRow);
    assert.equal(cleanRow.name, "'=cmd|calc");
    assert.equal(cleanRow.department, 'Computer Science');
    assert.equal(cleanRow.salary, -50000);
    assert.equal(cleanRow.notes, "'  @alert(1)");
  });

  // --- B6: Mass Assignment Defense Tests ---

  test('B6-04: Document creation ignores client-supplied uploadedBy and forces caller identity', async () => {
    const maliciousPayload = {
      title: 'Security Test Document B6',
      description: 'Test document for mass assignment protection',
      category: 'policies',
      fileName: 'policy.pdf',
      filePath: '/uploads/policy.pdf',
      fileSize: 1024,
      fileType: 'application/pdf',
      uploadedBy: '99999999-9999-4999-a999-999999999999', // Attacker attempt to forge ownership
      status: 'approved' // Non-admin cannot self-approve
    };

    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send(maliciousPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.uploadedBy, facultyUser.id); // Must match authenticated user!
    assert.notEqual(res.body.data.uploadedBy, '99999999-9999-4999-a999-999999999999');
  });

  test('B6-05: Document update prevents regular faculty from modifying uploadedBy or status', async () => {
    // 1. Create a document owned by faculty
    const doc = await Document.create({
      title: 'Security Test Document B6',
      description: 'Initial description',
      category: 'policies',
      fileName: 'policy.pdf',
      filePath: '/uploads/policy.pdf',
      fileSize: 1024,
      fileType: 'application/pdf',
      uploadedBy: facultyUser.id,
      department: testDept,
      status: 'pending'
    });

    // 2. Faculty attempts to update description (legitimate) while forging status and uploadedBy (malicious)
    const updateRes = await request(app)
      .put(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        description: 'Legitimate updated description',
        status: 'approved', // Unauthorized status escalation
        uploadedBy: adminUser.id // Unauthorized ownership transfer
      });

    assert.equal(updateRes.status, 200);

    const refreshed = await Document.findByPk(doc.id);
    assert.equal(refreshed.description, 'Legitimate updated description'); // Legitimate edit succeeded
    assert.equal(refreshed.uploadedBy, facultyUser.id); // Ownership unchanged!
    assert.equal(refreshed.status, 'pending'); // Status escalation blocked!
  });

  test('B6-06: Admin can legitimately update document approval status', async () => {
    const doc = await Document.findOne({ where: { title: 'Security Test Document B6' } });
    assert.ok(doc);

    const adminRes = await request(app)
      .put(`/api/documents/${doc.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'approved'
      });

    assert.equal(adminRes.status, 200);

    const refreshed = await Document.findByPk(doc.id);
    assert.equal(refreshed.status, 'approved');
  });

  after(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);
    await User.destroy({ where: { email: ['b4_b6_fac@christ.in', 'b4_b6_admin@christ.in'] } });
    await Student.destroy({ where: { department: 'Test Pagination Dept' } });
    await Document.destroy({ where: { title: 'Security Test Document B6' } });
  });

});

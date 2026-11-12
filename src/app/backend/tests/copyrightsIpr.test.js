'use strict';

/**
 * IPRs -> Copyrights & Patents Comprehensive Test Suite
 * Tests multi-faculty associations, invalid EmpId flagging, original vs current dept tracking,
 * cross-dept distinct filtering, Excel bulk parsing/duplicate skip, RBAC, and Patents regression.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

const assert = require('assert');
const http = require('http');
const { PassThrough } = require('stream');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');

const app = require('../server');
const models = require('../models');
const {
  User,
  Role,
  UserPermissionOverride,
  UserOrganizationalScope,
  ModuleConfig,
  Copyright,
  CopyrightFaculty,
  Faculty,
  UserDepartmentHistory,
  SystemConfiguration,
  FormDefinition,
  Campus,
  School,
  Department,
  ProgramLevel,
  Course,
  AuditLog,
  Patent,
  PatentProof
} = models;
const { sequelize } = require('../config/database');
const configPropagationService = require('../services/configPropagationService');
const copyrightService = require('../services/copyrightService');
const copyrightController = require('../controllers/copyrightController');

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, tokenVersion: user.tokenVersion ?? 0 },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

function dispatchExpress(target, { method = 'GET', url = '/', headers = {}, body = {} } = {}) {
  return new Promise((resolve, reject) => {
    const socket = new PassThrough();
    const req = new http.IncomingMessage(socket);
    req.method = method.toUpperCase();
    req.url = url;
    req.originalUrl = url;
    req.headers = {
      'content-type': 'application/json',
      ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
    };
    req.body = body;
    req._body = true;
    req.ip = '127.0.0.1';

    const res = new http.ServerResponse(req);
    const chunks = [];
    res.write = (chunk) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    };
    res.end = (chunk) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const raw = Buffer.concat(chunks).toString('utf8');
      let parsedBody = raw;
      try { parsedBody = raw ? JSON.parse(raw) : {}; } catch (_) {}
      resolve({ status: res.statusCode, body: parsedBody, raw, headers: res.getHeaders() });
      return res;
    };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (payload) => {
      if (!res.getHeader('content-type')) res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify(payload));
    };
    res.send = (payload) => {
      if (typeof payload === 'object' && payload !== null && !Buffer.isBuffer(payload)) {
        return res.json(payload);
      }
      return res.end(payload);
    };

    target.handle(req, res, (err) => {
      if (err) return reject(err);
      if (!res.writableEnded) res.status(404).json({ success: false, message: 'Route not found' });
    });
  });
}

function withStubs(stubs) {
  const originals = [];
  for (const [obj, prop, impl] of stubs) {
    originals.push([obj, prop, obj[prop]]);
    obj[prop] = impl;
  }
  return () => {
    for (let i = originals.length - 1; i >= 0; i--) {
      const [obj, prop, orig] = originals[i];
      obj[prop] = orig;
    }
  };
}

const SAMPLE_FACULTY = [
  { id: 'fac-1', employeeId: 'CU001', name: 'Dr. Alice Menon', designation: 'Professor', department: 'Computer Science and Engineering', email: 'alice@christuniversity.in', academicYear: '2024-2025' },
  { id: 'fac-2', employeeId: 'CU015', name: 'Dr. Arun Nair', designation: 'Associate Professor', department: 'Electronics and Communication Engineering', email: 'arun@christuniversity.in', academicYear: '2024-2025' },
  { id: 'fac-3', employeeId: 'CU028', name: 'Dr. Meera Iyer', designation: 'Assistant Professor', department: 'Mechanical and Automobile Engineering', email: 'meera@christuniversity.in', academicYear: '2024-2025' },
  { id: 'fac-4', employeeId: '0042', name: 'Dr. Leading Zero', designation: 'Assistant Professor', department: 'Computer Science and Engineering', email: 'zero@christuniversity.in', academicYear: '2024-2025' }
];

const MOCK_USERS = {
  'u-admin': { id: 'u-admin', name: 'System Admin', email: 'admin@christuniversity.in', role: 'admin', department: 'IQAC', isActive: true, tokenVersion: 0, mustChangePassword: false },
  'u-auth': { id: 'u-auth', name: 'University Authority', email: 'authority@christuniversity.in', role: 'authority', department: null, isActive: true, tokenVersion: 0, mustChangePassword: false },
  'u-hod-cse': { id: 'u-hod-cse', name: 'CSE HOD', email: 'hod.cse@christuniversity.in', role: 'hod', department: 'Computer Science and Engineering', isActive: true, tokenVersion: 0, mustChangePassword: false },
  'u-fac-cse': { id: 'u-fac-cse', name: 'CSE Faculty', email: 'fac.cse@christuniversity.in', role: 'faculty', department: 'Computer Science and Engineering', isActive: true, tokenVersion: 0, mustChangePassword: false }
};

async function runTests() {
  console.log('🧪 Starting IPRs (Patents & Copyrights) Comprehensive Test Suite...\n');
  let passed = 0;

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.stack || err.message}`);
      throw err;
    }
  }

  // 1. EmpId Normalization & Deduplication
  await testAsync('1. Normalizes multiple comma-separated EmpIds preserving leading zeros and deduplicating safely', async () => {
    const parsed = copyrightService.parseAndNormalizeEmpIds(' CU001 , 0042, cu001 , , CU015 ');
    assert.deepStrictEqual(parsed.empIds, ['CU001', '0042', 'CU015']);
    assert.strictEqual(parsed.empIdsRaw, 'CU001, 0042, CU015');
    assert.deepStrictEqual(parsed.duplicateEmpIds, ['cu001']);
  });

  // 2. Timezone-safe Date Parsing & Strict Calendar Year Derivation
  await testAsync('2. Parses ISO, DD-MM-YYYY, and Excel serial dates without timezone shift and derives Year strictly from Date of Application', async () => {
    assert.strictEqual(copyrightService.sanitizeDateNoShift('15-02-2025'), '2025-02-15');
    assert.strictEqual(copyrightService.sanitizeDateNoShift('15/02/2025'), '2025-02-15');
    assert.strictEqual(copyrightService.sanitizeDateNoShift('2025-02-15'), '2025-02-15');
    // Excel serial 45703 = 2025-02-15
    assert.strictEqual(copyrightService.sanitizeDateNoShift(45703), '2025-02-15');
    // Invalid calendar day rejected
    assert.strictEqual(copyrightService.sanitizeDateNoShift('31/02/2025'), null);
    assert.strictEqual(copyrightService.sanitizeDateNoShift('not-a-date'), null);
    assert.strictEqual(copyrightService.deriveCalendarYear('2025-02-15'), 2025);
  });

  // 3. Invalid EmpId Handling Without Rejecting Record + Original vs Current Dept Tracking
  await testAsync('3. Preserves copyright with mixed valid/invalid EmpIds, flags invalid IDs, and tracks Original vs Current Department', async () => {
    const resolved = await copyrightService.resolveFacultyAssociationsForEmpIds(
      ['CU001', 'CU015', 'CU999'],
      '2025-02-15',
      { Faculty: null, User: null, UserDepartmentHistory: null },
      SAMPLE_FACULTY
    );

    assert.strictEqual(resolved.hasInvalidEmpIds, true);
    assert.deepStrictEqual(resolved.invalidEmpIds, ['CU999']);
    assert.strictEqual(resolved.associations.length, 3);
    assert.strictEqual(resolved.associations[0].isValid, true);
    assert.strictEqual(resolved.associations[0].originalDepartment, 'Computer Science and Engineering');
    assert.strictEqual(resolved.associations[2].isValid, false);
    assert.strictEqual(resolved.associations[2].facultyId, null);
    assert.strictEqual(resolved.associations[2].originalDepartment, null);

    // Simulate CU001 later transferring to AI & DS in Faculty Management
    const liveFacultyUpdated = [
      { ...SAMPLE_FACULTY[0], department: 'AI and Data Science Engineering' },
      SAMPLE_FACULTY[1]
    ];
    const byId = new Map(liveFacultyUpdated.map(f => [f.id, f]));
    const byEmp = new Map(liveFacultyUpdated.map(f => [f.employeeId.toUpperCase(), f]));

    const enriched = copyrightService.enrichCopyrightRecord({
      id: 'copy-1',
      title: 'Smart Agricultural Monitoring System',
      dateOfApplication: '2025-02-15',
      calendarYear: 2025,
      status: 'submitted',
      registrationNo: null,
      diaryNumber: '3421/2025-CO/SW',
      hasInvalidEmpIds: true,
      invalidEmpIds: ['CU999'],
      facultyAssociations: resolved.associations
    }, byId, byEmp);

    const cu001Assoc = enriched.facultyAssociations.find(a => a.employeeId === 'CU001');
    assert.strictEqual(cu001Assoc.originalDepartment, 'Computer Science and Engineering');
    assert.strictEqual(cu001Assoc.currentDepartment, 'AI and Data Science Engineering');
    assert.strictEqual(cu001Assoc.departmentTransferred, true);
    assert.strictEqual(enriched.validFacultyCount, 2);
    assert.strictEqual(enriched.registrationStatus, 'pending'); // Diary Number alone does NOT mark registered!
  });

  // 4. Multi-Department Filtering & No-Duplication + 4 Dashboard Metrics
  await testAsync('4. Displays shared multi-department copyright once per department and in combined filters, with exact metrics math', async () => {
    const resolved = await copyrightService.resolveFacultyAssociationsForEmpIds(
      ['CU001', 'CU015', 'CU028', 'CU999'],
      '2025-02-15',
      {},
      SAMPLE_FACULTY
    );
    const byId = new Map(SAMPLE_FACULTY.map(f => [f.id, f]));
    const byEmp = new Map(SAMPLE_FACULTY.map(f => [f.employeeId.toUpperCase(), f]));

    const sharedCopyright = copyrightService.enrichCopyrightRecord({
      id: 'copy-shared',
      title: 'Multi-Dept IoT Platform',
      dateOfApplication: '2025-02-15',
      calendarYear: 2025,
      status: 'registered',
      registrationNo: 'SW-19001/2025',
      facultyAssociations: resolved.associations
    }, byId, byEmp);

    const draftCopyright = copyrightService.enrichCopyrightRecord({
      id: 'copy-draft',
      title: 'Draft Work',
      dateOfApplication: '2025-03-01',
      calendarYear: 2025,
      status: 'draft',
      registrationNo: null,
      facultyAssociations: resolved.associations.slice(0, 1)
    }, byId, byEmp);

    const pendingCopyright = copyrightService.enrichCopyrightRecord({
      id: 'copy-pending',
      title: 'Pending App',
      dateOfApplication: '2025-04-01',
      calendarYear: 2025,
      status: 'submitted',
      registrationNo: null,
      diaryNumber: '991/2025',
      facultyAssociations: resolved.associations.slice(1, 2)
    }, byId, byEmp);

    assert.strictEqual(copyrightService.matchesDepartmentFilter(sharedCopyright, ['Computer Science and Engineering']), true);
    assert.strictEqual(copyrightService.matchesDepartmentFilter(sharedCopyright, ['Electronics and Communication Engineering']), true);
    assert.strictEqual(copyrightService.matchesDepartmentFilter(sharedCopyright, ['Mechanical and Automobile Engineering']), true);
    assert.strictEqual(copyrightService.matchesDepartmentFilter(sharedCopyright, ['Civil Engineering']), false);

    // Multi-dept combined filter still returns exactly 1 distinct copyright
    const combinedMatches = [sharedCopyright].filter(c =>
      copyrightService.matchesDepartmentFilter(c, ['Computer Science and Engineering', 'Electronics and Communication Engineering'])
    );
    assert.strictEqual(combinedMatches.length, 1);

    const metrics = copyrightService.computeCopyrightMetrics([sharedCopyright, draftCopyright, pendingCopyright]);
    assert.strictEqual(metrics.totalCopyrights, 3);
    assert.strictEqual(metrics.applicationsFiled, 2); // excludes draft
    assert.strictEqual(metrics.registeredCopyrights, 1); // excludes diary-number-only & draft
    assert.strictEqual(metrics.pendingRegistration, 1);
    assert.strictEqual(metrics.registeredCopyrights + metrics.pendingRegistration, metrics.applicationsFiled);
    assert.strictEqual(metrics.departmentBreakdown['Computer Science and Engineering'], 2); // shared + draft
    assert.strictEqual(metrics.departmentBreakdown['Electronics and Communication Engineering'], 2); // shared + pending
  });

  // 5. Excel Bulk Upload Validation, Reordered EmpId Duplicate Detection, & Invalid Drive URL Rejection
  await testAsync('5. Validates Excel bulk upload, detects reordered EmpId duplicates, flags invalid EmpIds as warnings, and rejects invalid dates/Drive URLs', async () => {
    const wb = XLSX.utils.book_new();
    const sheetData = [
      ['EmpId', 'Title', 'Date of Application', 'Registration No', 'Diary Number', 'Date of Receipt', 'Proof'],
      ['CU001, CU015', 'Smart Agricultural Monitoring System', '15-02-2025', 'SW-18421/2025', '3421/2025', '01-03-2025', 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7/view'],
      // Reordered EmpIds duplicate of existing DB record -> must skip!
      ['CU015, CU001', '  smart  agricultural monitoring   system ', '2025-02-15', '', '', '', ''],
      // Mixed valid + invalid EmpId + blank optional Proof -> eligible with warning!
      ['0042, CU999', 'Novel Edge Classifier', '10-03-2025', '', '4401/2025', '', ''],
      // Intra-sheet duplicate of Row 4 -> skip!
      ['CU999, 0042', 'Novel Edge Classifier', '10-03-2025', '', '', '', ''],
      // Missing Title + invalid Proof URL -> rejected!
      ['CU001', '', '10-03-2025', '', '', '', 'http://evil-non-drive-site.com/file.pdf'],
      // Invalid Date -> rejected!
      ['CU001', 'Bad Date Entry', '31/02/2025', '', '', '', '']
    ];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, 'Copyrights');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const parsed = copyrightController._testHelpers.parseUploadedSpreadsheetBuffer(buf);
    const evalResult = await copyrightController._testHelpers.evaluateBulkCopyrightRows(parsed.rows, {
      headers: parsed.headers,
      user: MOCK_USERS['u-admin'],
      mockFacultyRows: SAMPLE_FACULTY,
      mockExistingCopyrights: [
        { title: 'Smart Agricultural Monitoring System', dateOfApplication: '2025-02-15', empIds: ['CU001', 'CU015'] }
      ],
      verifyDriveLinks: false
    });

    assert.strictEqual(evalResult.validColumns, true);
    assert.strictEqual(evalResult.summary.totalRows, 6);
    assert.strictEqual(evalResult.summary.duplicateCount, 3); // row 2 matches DB, row 3 reordered duplicate of row 2/DB, row 5 intra-sheet dup of row 4
    assert.strictEqual(evalResult.summary.warningInvalidEmpIdCount, 1); // row 4 ('0042, CU999')
    assert.strictEqual(evalResult.summary.invalidErrorCount, 2); // row 6 & row 7

    const warningRow = evalResult.rows.find(r => r.status === 'warning');
    assert.ok(warningRow);
    assert.deepStrictEqual(warningRow.normalized.invalidEmpIds, ['CU999']);
    assert.strictEqual(warningRow.normalized.empIds[0], '0042'); // leading zero preserved!
  });

  // 6. Missing Template Columns Rejected Cleanly
  await testAsync('6. Rejects Excel spreadsheet missing required columns (EmpId / Title / Date of Application)', async () => {
    const missing = copyrightController._testHelpers.validateHeaderColumns(['Title', 'Registration No']);
    assert.deepStrictEqual(missing, ['EmpId', 'Date of Application']);
  });

  // 7. End-to-End HTTP RBAC & CRUD + Patents Regression via Real Express App
  await testAsync('7. Enforces backend RBAC on /api/copyrights and preserves existing /api/patents endpoints', async () => {
    const storedCopyrights = [];
    const storedAssocs = [];

    const restore = withStubs([
      [User, 'findByPk', async (id) => MOCK_USERS[id] || null],
      [Role, 'findOrCreate', async () => [null, false]],
      [Role, 'findAll', async () => [
        { id: 'r1', code: 'admin', name: 'System Admin', isSystemAdmin: true, isActive: true, defaultScope: 'university', permissions: {} },
        { id: 'r2', code: 'authority', name: 'Authority', isSystemAdmin: false, isActive: true, defaultScope: 'university', permissions: {} },
        { id: 'r3', code: 'hod', name: 'HOD', isSystemAdmin: false, isActive: true, defaultScope: 'department', permissions: {} },
        { id: 'r4', code: 'faculty', name: 'Faculty', isSystemAdmin: false, isActive: true, defaultScope: 'department', permissions: {} }
      ]],
      [ModuleConfig, 'findOrCreate', async () => [null, false]],
      [ModuleConfig, 'findAll', async () => [
        { moduleKey: 'patents', moduleName: 'IPRs — Patents', isEnabled: true, isCritical: false, affectedRoutes: ['research-innovation', 'patents'] },
        { moduleKey: 'copyrights', moduleName: 'IPRs — Copyrights', isEnabled: true, isCritical: false, affectedRoutes: ['copyrights'] }
      ]],
      [SystemConfiguration, 'findOrCreate', async () => [null, false]],
      [SystemConfiguration, 'findAll', async () => []],
      [FormDefinition, 'findOrCreate', async () => [null, false]],
      [FormDefinition, 'findAll', async () => []],
      [Campus, 'findAll', async () => []],
      [School, 'findAll', async () => []],
      [Department, 'findAll', async () => []],
      [ProgramLevel, 'findAll', async () => []],
      [Course, 'findAll', async () => []],
      [AuditLog, 'create', async (p) => p],
      [UserPermissionOverride, 'findAll', async () => []],
      [UserOrganizationalScope, 'findAll', async () => []],
      [Faculty, 'findAll', async () => SAMPLE_FACULTY],
      [UserDepartmentHistory, 'findAll', async () => []],
      [sequelize, 'transaction', async () => ({ commit: async () => {}, rollback: async () => {} })],
      [Copyright, 'findAll', async () => storedCopyrights.map(c => ({
        ...c,
        facultyAssociations: storedAssocs.filter(a => a.copyrightId === c.id)
      }))],
      [Copyright, 'findByPk', async (id) => {
        const c = storedCopyrights.find(x => x.id === id);
        if (!c) return null;
        return { ...c, facultyAssociations: storedAssocs.filter(a => a.copyrightId === c.id) };
      }],
      [Copyright, 'create', async (payload) => {
        const rec = { id: `copy-${storedCopyrights.length + 1}`, ...payload };
        storedCopyrights.push(rec);
        return rec;
      }],
      [CopyrightFaculty, 'bulkCreate', async (items) => {
        items.forEach(i => storedAssocs.push({ id: `cf-${storedAssocs.length + 1}`, ...i }));
        return items;
      }],
      [Patent, 'findAndCountAll', async () => ({ count: 0, rows: [] })]
    ]);
    configPropagationService.invalidateConfigCache();

    try {
      // Unauthenticated rejected
      const unauth = await dispatchExpress(app, { method: 'GET', url: '/api/copyrights' });
      assert.strictEqual(unauth.status, 401);

      // Authority is strictly read-only on Copyrights (403 on write, 200 on read)
      const authToken = signToken(MOCK_USERS['u-auth']);
      const authPost = await dispatchExpress(app, {
        method: 'POST',
        url: '/api/copyrights',
        headers: { Authorization: `Bearer ${authToken}` },
        body: { empIdsRaw: 'CU001', title: 'Test', dateOfApplication: '2025-02-15' }
      });
      assert.strictEqual(authPost.status, 403);

      const authGet = await dispatchExpress(app, {
        method: 'GET',
        url: '/api/copyrights',
        headers: { Authorization: `Bearer ${authToken}` }
      });
      assert.strictEqual(authGet.status, 200);

      // HOD scoped department violation blocked with 403
      const hodToken = signToken(MOCK_USERS['u-hod-cse']);
      const hodBadDept = await dispatchExpress(app, {
        method: 'GET',
        url: '/api/copyrights?department=Mechanical+and+Automobile+Engineering',
        headers: { Authorization: `Bearer ${hodToken}` }
      });
      assert.strictEqual(hodBadDept.status, 403);

      // Admin creates multi-faculty copyright with mixed valid & unrecognized EmpId
      const adminToken = signToken(MOCK_USERS['u-admin']);
      const createRes = await dispatchExpress(app, {
        method: 'POST',
        url: '/api/copyrights',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          empIdsRaw: 'CU001, CU015, CU999',
          title: 'Campus Energy Optimizer',
          dateOfApplication: '2025-02-15',
          diaryNumber: '9001/2025-CO/SW'
        }
      });
      assert.strictEqual(createRes.status, 201);
      assert.strictEqual(createRes.body.data.calendarYear, 2025);
      assert.strictEqual(createRes.body.data.hasInvalidEmpIds, true);
      assert.deepStrictEqual(createRes.body.data.invalidEmpIds, ['CU999']);
      assert.strictEqual(createRes.body.data.registrationStatus, 'pending');

      // CSE HOD sees the shared copyright in GET /api/copyrights
      const hodListRes = await dispatchExpress(app, {
        method: 'GET',
        url: '/api/copyrights',
        headers: { Authorization: `Bearer ${hodToken}` }
      });
      assert.strictEqual(hodListRes.status, 200);
      assert.strictEqual(hodListRes.body.data.length, 1);
      assert.strictEqual(hodListRes.body.metrics.totalCopyrights, 1);
      assert.strictEqual(hodListRes.body.metrics.pendingRegistration, 1);
      assert.strictEqual(hodListRes.body.metrics.registeredCopyrights, 0);

      // Regression check: Existing Patents API route still functions intact
      const patentsRes = await dispatchExpress(app, {
        method: 'GET',
        url: '/api/patents',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(patentsRes.status, 200);
      assert.strictEqual(patentsRes.body.success, true);
    } finally {
      restore();
    }
  });

  console.log(`\n✅ IPRs (Patents & Copyrights) Test Suite passed (${passed}/${passed} assertions).`);
}

runTests().catch((err) => {
  console.error('\n❌ IPRs Test Suite failed:', err);
  process.exit(1);
});

'use strict';

/**
 * System Administration V2.0 — Comprehensive RBAC, Propagation & Safety Test Suite
 * Runs offline without mutating production PostgreSQL tables.
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

const assert = require('assert');
const http = require('http');
const { PassThrough } = require('stream');
const jwt = require('jsonwebtoken');

const app = require('../server');
const adminRouter = require('../routes/systemAdmin');
const authRoutes = require('../routes/auth');

/**
 * Dispatches an HTTP-like request directly through Express router/app without binding TCP ports,
 * allowing full middleware + route param + controller execution inside restricted sandboxes.
 */
function dispatchExpress(target, { method = 'GET', url = '/', headers = {}, body = {} } = {}) {
  return new Promise((resolve, reject) => {
    const socket = new PassThrough();
    const req = new http.IncomingMessage(socket);
    req.method = method.toUpperCase();
    req.url = url;
    req.originalUrl = url;
    req.headers = { 'content-type': 'application/json', ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])) };
    req.body = body;
    req._body = true; // bypass body-parser stream read
    req.ip = '127.0.0.1';
    req.connection = { remoteAddress: '127.0.0.1' };

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
      try {
        parsedBody = raw ? JSON.parse(raw) : {};
      } catch (_) {}
      resolve({ status: res.statusCode, body: parsedBody, headers: res.getHeaders() });
      return res;
    };
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
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

    const handler = typeof target.handle === 'function' ? target.handle.bind(target) : target;
    handler(req, res, (err) => {
      if (err) return reject(err);
      if (!res.writableEnded) {
        res.status(404).json({ success: false, message: 'Route not found' });
      }
    });
  });
}
const models = require('../models');
const {
  User,
  Role,
  UserPermissionOverride,
  UserOrganizationalScope,
  FormDefinition,
  FormField,
  SystemConfiguration,
  ModuleConfig,
  ConfigurationVersion,
  ConfigurationBackup,
  Campus,
  School,
  Department,
  ProgramLevel,
  Course,
  AuditLog
} = models;

const configPropagationService = require('../services/configPropagationService');
const { requireModuleEnabled } = require('../middleware/configEnforcement');
const { redactSecrets } = require('../middleware/auditLogger');

function signTestToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0
    },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '1h' }
  );
}

/**
 * Helper to temporarily stub object methods and restore automatically.
 */
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

const DEFAULT_MOCK_ROLES = [
  { id: 'role-admin', code: 'admin', name: 'System Administrator', isSystem: true, isSystemAdmin: true, isActive: true, defaultScope: 'university', permissions: {} },
  {
    id: 'role-iqac-admin',
    code: 'iqac_admin',
    name: 'IQAC Administrator',
    isSystem: true,
    isSystemAdmin: false,
    isActive: true,
    defaultScope: 'university',
    permissions: { dashboard: { view: true, export: true }, 'student-details': { view: true, edit: true } }
  },
  { id: 'role-authority', code: 'authority', name: 'University Authority', isSystem: true, isSystemAdmin: false, isActive: true, defaultScope: 'university', permissions: { dashboard: { view: true } } },
  {
    id: 'role-hod',
    code: 'hod',
    name: 'Head of Department',
    isSystem: true,
    isSystemAdmin: false,
    isActive: true,
    defaultScope: 'department',
    permissions: { 'student-details': { view: true, add: true, edit: true, approve: true }, 'placements-internships': { view: true, add: true } }
  },
  { id: 'role-coordinator', code: 'coordinator', name: 'Criteria Coordinator', isSystem: true, isSystemAdmin: false, isActive: true, defaultScope: 'department', permissions: { placements: { view: true, add: true, edit: true } } },
  { id: 'role-faculty', code: 'faculty', name: 'Faculty Member', isSystem: true, isSystemAdmin: false, isActive: true, defaultScope: 'department', permissions: { publications: { view: true, add: true } } },
  { id: 'role-custom', code: 'iqac_reviewer', name: 'IQAC Reviewer', isSystem: false, isSystemAdmin: false, isActive: true, defaultScope: 'school', permissions: { publications: { view: true, approve: true } } }
];

const MOCK_USERS_BY_ID = {
  'u-admin': { id: 'u-admin', name: 'System Admin', email: 'admin@christuniversity.in', role: 'admin', roleId: 'role-admin', department: 'IQAC', isActive: true, tokenVersion: 0, mustChangePassword: false },
  'u-iqac': { id: 'u-iqac', name: 'IQAC Operational Admin', email: 'iqacadmin@christuniversity.in', role: 'iqac_admin', roleId: 'role-iqac-admin', department: 'IQAC', isActive: true, tokenVersion: 0, mustChangePassword: false },
  'u-auth': { id: 'u-auth', name: 'Authority User', email: 'authority@christuniversity.in', role: 'authority', roleId: 'role-authority', department: null, isActive: true, tokenVersion: 0, mustChangePassword: false },
  'u-hod': { id: 'u-hod', name: 'Dr. HOD', email: 'hod@christuniversity.in', role: 'hod', roleId: 'role-hod', department: 'Computer Science and Engineering', isActive: true, tokenVersion: 0, mustChangePassword: false },
  'u-coord': { id: 'u-coord', name: 'Coord User', email: 'coord@christuniversity.in', role: 'coordinator', roleId: 'role-coordinator', department: 'Computer Science and Engineering', isActive: true, tokenVersion: 0, mustChangePassword: false },
  'u-faculty': { id: 'u-faculty', name: 'Faculty User', email: 'faculty@christuniversity.in', role: 'faculty', roleId: 'role-faculty', department: 'Computer Science and Engineering', isActive: true, tokenVersion: 0, mustChangePassword: false },
  'u-custom': { id: 'u-custom', name: 'Custom Reviewer', email: 'reviewer@christuniversity.in', role: 'iqac_reviewer', roleId: 'role-custom', department: 'Computer Science and Engineering', isActive: true, tokenVersion: 0, mustChangePassword: false },
  'u-inactive': { id: 'u-inactive', name: 'Inactive User', email: 'inactive@christuniversity.in', role: 'faculty', roleId: 'role-faculty', department: 'CSE', isActive: false, tokenVersion: 0, mustChangePassword: false },
  'u-revoked': { id: 'u-revoked', name: 'Revoked User', email: 'revoked@christuniversity.in', role: 'faculty', roleId: 'role-faculty', department: 'CSE', isActive: true, tokenVersion: 5, mustChangePassword: false }
};

function installCommonModelStubs({ extraModules = [], extraForms = [], overrides = [], extraStubs = [] } = {}) {
  const baseModules = extraModules.length > 0 ? extraModules : [
    { moduleKey: 'dashboard', moduleName: 'Institutional Intelligence Dashboard', routeKey: 'dashboard', isEnabled: true, isCritical: true, dependencies: [], affectedRoutes: ['/'] },
    { moduleKey: 'system-admin', moduleName: 'System Administration V2.0', routeKey: 'system-admin', isEnabled: true, isCritical: true, dependencies: [], affectedRoutes: ['/api/admin'] },
    { moduleKey: 'placements', moduleName: 'Placements & Internships', routeKey: 'placements-internships', isEnabled: true, isCritical: false, dependencies: ['students'], affectedRoutes: ['/api/placements'] }
  ];

  const restore = withStubs([
    [User, 'findByPk', async (id) => MOCK_USERS_BY_ID[id] || null],
    [Role, 'count', async () => DEFAULT_MOCK_ROLES.length],
    [Role, 'findAll', async () => DEFAULT_MOCK_ROLES],
    [Role, 'findOne', async (opts) => {
      const code = opts?.where?.code;
      return DEFAULT_MOCK_ROLES.find(r => r.code === code) || null;
    }],
    [ModuleConfig, 'count', async () => baseModules.length],
    [ModuleConfig, 'findAll', async () => baseModules],
    [ModuleConfig, 'findOne', async (opts) => baseModules.find(m => m.moduleKey === opts?.where?.moduleKey) || null],
    [SystemConfiguration, 'count', async () => 1],
    [SystemConfiguration, 'findAll', async () => [
      { configKey: 'academic_years', category: 'academic_years', label: 'Academic Years', value: { years: ['2024-2025', '2025-2026'], current: '2024-2025' } }
    ]],
    [FormDefinition, 'count', async () => extraForms.length],
    [FormDefinition, 'findAll', async () => extraForms],
    [FormField, 'findAll', async () => []],
    [UserPermissionOverride, 'findAll', async (opts) => overrides.filter(o => !opts?.where?.userId || o.userId === opts.where.userId)],
    [UserOrganizationalScope, 'findAll', async () => []],
    [Campus, 'count', async () => 1],
    [Campus, 'findAll', async () => [{ id: 'camp-1', name: 'Bangalore Kengeri Campus', code: 'KGR', status: 'Active' }]],
    [School, 'count', async () => 1],
    [School, 'findAll', async () => [{ id: 'sch-1', name: 'School of Engineering and Technology', code: 'SOET', campusId: 'camp-1', status: 'Active' }]],
    [Department, 'count', async () => 1],
    [Department, 'findAll', async () => [{ id: 'dept-1', name: 'Computer Science and Engineering', shortName: 'CSE', code: 'CSE', schoolId: 'sch-1', status: 'Active' }]],
    [ProgramLevel, 'count', async () => 1],
    [ProgramLevel, 'findAll', async () => [{ id: 'pl-1', name: 'UG', status: 'Active' }]],
    [Course, 'count', async () => 1],
    [Course, 'findAll', async () => [{ id: 'crs-1', name: 'B.Tech CSE', code: 'BTCS', departmentId: 'dept-1', status: 'Active' }]],
    [ConfigurationVersion, 'findAll', async () => []],
    [AuditLog, 'findAll', async () => []],
    [AuditLog, 'create', async (payload) => payload],
    ...extraStubs
  ]);

  configPropagationService.invalidateConfigCache();
  return restore;
}

async function runTests() {
  console.log('🧪 Starting System Administration V2.0 Verification Test Suite...\n');
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

  // 1. Strict RBAC Gate on /api/admin/*
  await testAsync('1. Blocks unauthenticated (401) and non-System Admin roles (403), allows System Admin (200) on /api/admin/*', async () => {
    const restore = installCommonModelStubs({
      extraStubs: [
        [User, 'count', async () => 6]
      ]
    });
    try {
      // Unauthenticated
      const unauthRes = await dispatchExpress(app, { method: 'GET', url: '/api/admin/overview' });
      assert.strictEqual(unauthRes.status, 401);

      // Every non-System Admin role must be rejected with 403 SYSTEM_ADMIN_REQUIRED across Admin routes
      const blockedUsers = ['u-faculty', 'u-hod', 'u-coord', 'u-auth', 'u-iqac', 'u-custom'];
      for (const uid of blockedUsers) {
        const token = signTestToken(MOCK_USERS_BY_ID[uid]);
        const headers = { Authorization: `Bearer ${token}` };
        const r1 = await dispatchExpress(app, { method: 'GET', url: '/api/admin/overview', headers });
        assert.strictEqual(r1.status, 403, `Expected 403 for ${uid} on /overview, got ${r1.status}`);
        assert.strictEqual(r1.body.code, 'SYSTEM_ADMIN_REQUIRED');

        const r2 = await dispatchExpress(app, { method: 'GET', url: '/api/admin/users', headers });
        assert.strictEqual(r2.status, 403, `Expected 403 for ${uid} on /users, got ${r2.status}`);

        const r3 = await dispatchExpress(app, {
          method: 'PUT',
          url: '/api/admin/modules/placements/toggle',
          headers,
          body: { isEnabled: false, confirmed: true }
        });
        assert.strictEqual(r3.status, 403, `Expected 403 for ${uid} on /modules/toggle, got ${r3.status}`);

        const r4 = await dispatchExpress(app, {
          method: 'POST',
          url: '/api/admin/backups',
          headers,
          body: { backupName: 'Unauth test' }
        });
        assert.strictEqual(r4.status, 403, `Expected 403 for ${uid} on /backups, got ${r4.status}`);
      }

      // Active System Administrator succeeds
      const adminToken = signTestToken(MOCK_USERS_BY_ID['u-admin']);
      const okRes = await dispatchExpress(app, {
        method: 'GET',
        url: '/api/admin/overview',
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(okRes.status, 200);
      assert.strictEqual(okRes.body.success, true);
      assert.strictEqual(okRes.body.data.users.total, 6);
    } finally {
      restore();
    }
  });

  // 2. Permission Inheritance + Individual Override Precedence + Privilege Escalation Guard
  await testAsync('2. Computes inherited vs granted vs restricted permissions and prevents system-admin escalation', async () => {
    const restore = installCommonModelStubs({
      overrides: [
        { userId: 'u-hod', moduleKey: 'student-details', permission: 'approve', effect: 'restrict' },
        { userId: 'u-hod', moduleKey: 'publications', permission: 'export', effect: 'grant' },
        { userId: 'u-hod', moduleKey: 'system-admin', permission: 'manage', effect: 'grant' }
      ]
    });
    try {
      const ctx = await configPropagationService.resolveUserAuthorizationContext(MOCK_USERS_BY_ID['u-hod']);
      assert.strictEqual(ctx.isSystemAdmin, false);
      // Inherited
      assert.strictEqual(ctx.effectivePermissions['student-details'].view, true);
      assert.strictEqual(ctx.permissionProvenance['student-details'].view, 'inherited');
      // Restricted override defeats inherited permission
      assert.strictEqual(ctx.effectivePermissions['student-details'].approve, false);
      assert.strictEqual(ctx.permissionProvenance['student-details'].approve, 'restricted');
      // Explicit grant adds new module permission
      assert.strictEqual(ctx.effectivePermissions.publications.export, true);
      assert.strictEqual(ctx.permissionProvenance.publications.export, 'granted');
      // Privilege escalation guard: ordinary users cannot obtain system-admin via override
      assert.strictEqual(ctx.effectivePermissions['system-admin'].manage, false);
    } finally {
      restore();
    }
  });

  // 3. Lockout Protection & Immediate Session Revocation
  await testAsync('3. Enforces self/last-admin deactivation lockout protection and rejects inactive or revoked tokens', async () => {
    const restore = installCommonModelStubs({
      extraStubs: [
        [User, 'count', async () => 0] // Simulate zero OTHER active admins remaining
      ]
    });
    try {
      const adminToken = signTestToken(MOCK_USERS_BY_ID['u-admin']);

      // Self-deactivation blocked
      const selfRes = await dispatchExpress(app, {
        method: 'POST',
        url: '/api/admin/users/u-admin/deactivate',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { reason: 'Self test' }
      });
      assert.strictEqual(selfRes.status, 400);
      assert.match(selfRes.body.message, /own active account/i);

      // Last active admin protection (target another admin-role user when remaining=0)
      MOCK_USERS_BY_ID['u-admin-2'] = { ...MOCK_USERS_BY_ID['u-admin'], id: 'u-admin-2', email: 'admin2@christuniversity.in' };
      const lastAdminRes = await dispatchExpress(app, {
        method: 'POST',
        url: '/api/admin/users/u-admin-2/deactivate',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { reason: 'Try lock out' }
      });
      assert.strictEqual(lastAdminRes.status, 400);
      assert.match(lastAdminRes.body.message, /final active System Administrator/i);
      delete MOCK_USERS_BY_ID['u-admin-2'];

      // Inactive account rejected with 401
      const inactiveToken = signTestToken(MOCK_USERS_BY_ID['u-inactive']);
      const inactiveRes = await dispatchExpress(app, {
        method: 'GET',
        url: '/api/auth/me',
        headers: { Authorization: `Bearer ${inactiveToken}` }
      });
      assert.strictEqual(inactiveRes.status, 401);
      assert.strictEqual(inactiveRes.body.code, 'ACCOUNT_DEACTIVATED');

      // Revoked session (tokenVersion mismatch) rejected with 401
      const staleToken = signTestToken({ ...MOCK_USERS_BY_ID['u-revoked'], tokenVersion: 4 });
      const revokedRes = await dispatchExpress(app, {
        method: 'GET',
        url: '/api/auth/me',
        headers: { Authorization: `Bearer ${staleToken}` }
      });
      assert.strictEqual(revokedRes.status, 401);
      assert.strictEqual(revokedRes.body.code, 'TOKEN_REVOKED');
    } finally {
      restore();
    }
  });

  // 4. Bulk User Upload Validation & Duplicate Protection
  await testAsync('4. Validates bulk user rows, flags duplicates without overwriting existing users', async () => {
    const createdCalls = [];
    const restore = installCommonModelStubs({
      extraStubs: [
        [User, 'findAll', async () => [
          { id: 'u-1', email: 'existing@christuniversity.in', employeeId: 'EMP001' }
        ]],
        [User, 'create', async (data) => {
          createdCalls.push(data);
          return { id: 'new-u-1', ...data };
        }]
      ]
    });
    try {
      const adminToken = signTestToken(MOCK_USERS_BY_ID['u-admin']);
      const rows = [
        { Name: 'Dr. Existing', Email: 'existing@christuniversity.in', EmployeeID: 'EMP099', Role: 'faculty', Department: 'Computer Science and Engineering' },
        { Name: 'Dr. DupEmp', Email: 'fresh1@christuniversity.in', EmployeeID: 'EMP001', Role: 'faculty', Department: 'CSE' },
        { Name: 'Dr. Valid User', Email: 'valid.user@christuniversity.in', EmployeeID: 'EMP777', Role: 'faculty', Department: 'CSE' },
        { Name: 'Dr. DupSheet', Email: 'valid.user@christuniversity.in', EmployeeID: 'EMP778', Role: 'faculty', Department: 'CSE' },
        { Name: 'Dr. BadRole', Email: 'badrole@christuniversity.in', EmployeeID: 'EMP779', Role: 'super_unknown_role', Department: 'CSE' }
      ];

      const previewRes = await dispatchExpress(app, {
        method: 'POST',
        url: '/api/admin/users/bulk-preview',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { rows }
      });

      assert.strictEqual(previewRes.status, 200);
      assert.strictEqual(previewRes.body.data.totalRows, 5);
      assert.strictEqual(previewRes.body.data.validCount, 1);
      assert.strictEqual(previewRes.body.data.invalidCount, 4);
      assert.strictEqual(previewRes.body.data.rows[0].valid, false);
      assert.match(previewRes.body.data.rows[0].errors[0], /already exists/i);
      assert.strictEqual(previewRes.body.data.rows[2].valid, true);
      assert.strictEqual(previewRes.body.data.rows[2].normalized.department, 'Computer Science and Engineering');

      const importRes = await dispatchExpress(app, {
        method: 'POST',
        url: '/api/admin/users/bulk-import',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { rows }
      });

      assert.strictEqual(importRes.status, 200);
      assert.strictEqual(importRes.body.data.importedCount, 1);
      assert.strictEqual(importRes.body.data.skippedCount, 4);
      assert.strictEqual(createdCalls.length, 1);
      assert.strictEqual(createdCalls[0].email, 'valid.user@christuniversity.in');
      assert.strictEqual(createdCalls[0].mustChangePassword, true);
    } finally {
      restore();
    }
  });

  // 5. Role Deactivation Reassignment & System Admin Role Lockout Guard
  await testAsync('5. Requires user reassignment before role deactivation and blocks deactivating System Administrator role', async () => {
    const restore = installCommonModelStubs({
      extraStubs: [
        [Role, 'findByPk', async (id) => DEFAULT_MOCK_ROLES.find(r => r.id === id) || null],
        [User, 'findAll', async () => [{ id: 'u-hod', name: 'Dr. HOD', email: 'hod@christuniversity.in' }]]
      ]
    });
    try {
      const adminToken = signTestToken(MOCK_USERS_BY_ID['u-admin']);

      // System Admin role cannot be deactivated
      const sysRes = await dispatchExpress(app, {
        method: 'POST',
        url: '/api/admin/roles/role-admin/deactivate',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {}
      });
      assert.strictEqual(sysRes.status, 400);
      assert.match(sysRes.body.message, /cannot be deactivated/i);

      // Role with assigned users requires reassignmentTarget
      const needReassignRes = await dispatchExpress(app, {
        method: 'POST',
        url: '/api/admin/roles/role-hod/deactivate',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {}
      });
      assert.strictEqual(needReassignRes.status, 409);
      assert.strictEqual(needReassignRes.body.code, 'REASSIGNMENT_REQUIRED');
    } finally {
      restore();
    }
  });

  // 6. Form Builder V2.0 Conditional Rules & Archived Field Protection
  await testAsync('6. Evaluates Placement/Internship AND/OR conditional rules and blocks archived fields on new entries', async () => {
    const conditionalOfferMode = {
      fieldKey: 'offer_mode',
      label: 'Offer Mode',
      fieldType: 'dropdown',
      isCore: false,
      isRequired: false,
      status: 'active',
      conditionalRules: [
        {
          logic: 'AND',
          conditions: [{ fieldKey: 'placementType', operator: 'equals', value: 'placement' }],
          action: 'require'
        },
        {
          logic: 'AND',
          conditions: [{ fieldKey: 'placementType', operator: 'equals', value: 'internship' }],
          action: 'hide'
        }
      ]
    };

    const placementBehavior = configPropagationService.evaluateFieldBehavior(conditionalOfferMode, { placementType: 'placement' });
    assert.strictEqual(placementBehavior.visible, true);
    assert.strictEqual(placementBehavior.required, true);

    const internshipBehavior = configPropagationService.evaluateFieldBehavior(conditionalOfferMode, { placementType: 'internship' });
    assert.strictEqual(internshipBehavior.visible, false);

    const archivedLegacyField = {
      fieldKey: 'legacy_drive_code',
      label: 'Legacy Drive Code',
      fieldType: 'text',
      isCore: false,
      isRequired: false,
      status: 'archived',
      conditionalRules: []
    };

    const restore = installCommonModelStubs({
      extraForms: [
        {
          id: 'form-placements',
          formKey: 'placements-internships-form',
          moduleKey: 'placements',
          formName: 'Placements & Internships',
          version: 1,
          fields: [conditionalOfferMode, archivedLegacyField]
        }
      ]
    });
    try {
      // New entry missing conditionally required field + attempting archived field fails
      const badCreate = await configPropagationService.validatePayloadAgainstForm(
        'placements-internships-form',
        { placementType: 'placement', customFields: { legacy_drive_code: 'OLD-123' } },
        true
      );
      assert.strictEqual(badCreate.valid, false);
      assert.strictEqual(badCreate.errors.length, 2);

      // Historical edit preserving archived field succeeds when active conditionally required field is provided
      const historicalEdit = await configPropagationService.validatePayloadAgainstForm(
        'placements-internships-form',
        { placementType: 'placement', customFields: { offer_mode: 'On-Campus', legacy_drive_code: 'OLD-123' } },
        false
      );
      assert.strictEqual(historicalEdit.valid, true);
    } finally {
      restore();
    }
  });

  // 7. Institutional Structure Option A vs Option B Enforcement
  await testAsync('7. Requires explicit Option A (Update Everywhere) or Option B (Current Only) on structural renames', async () => {
    const mockDeptInstance = {
      id: 'dept-1',
      name: 'Computer Science and Engineering',
      shortName: 'CSE',
      toJSON() { return { ...this }; },
      update: async () => this
    };
    const restore = installCommonModelStubs({
      extraStubs: [
        [Department, 'findByPk', async (id) => (id === 'dept-1' ? mockDeptInstance : null)]
      ]
    });
    try {
      const adminToken = signTestToken(MOCK_USERS_BY_ID['u-admin']);
      const renameNoMode = await dispatchExpress(app, {
        method: 'PUT',
        url: '/api/admin/structure/department/dept-1',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { name: 'Computer Science & AI Engineering' }
      });

      assert.strictEqual(renameNoMode.status, 400);
      assert.strictEqual(renameNoMode.body.code, 'PROPAGATION_MODE_REQUIRED');
    } finally {
      restore();
    }
  });

  // 8. Module Management Critical Safeguards & Route Enforcement
  await testAsync('8. Protects critical modules from disable, enforces confirmation, and blocks disabled module writes', async () => {
    const restore = installCommonModelStubs({
      extraModules: [
        { moduleKey: 'dashboard', moduleName: 'Dashboard', routeKey: 'dashboard', isEnabled: true, isCritical: true, dependencies: [], affectedRoutes: ['/'] },
        { moduleKey: 'placements', moduleName: 'Placements & Internships', routeKey: 'placements-internships', isEnabled: false, isCritical: false, dependencies: [], affectedRoutes: ['/api/placements'] }
      ]
    });
    try {
      const adminToken = signTestToken(MOCK_USERS_BY_ID['u-admin']);

      // Critical module disable refused
      const critRes = await dispatchExpress(app, {
        method: 'PUT',
        url: '/api/admin/modules/dashboard/toggle',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { isEnabled: false, confirmed: true }
      });
      assert.strictEqual(critRes.status, 400);
      assert.match(critRes.body.message, /Critical module/i);

      // Non-critical disable without confirmation refused
      const noConfirmRes = await dispatchExpress(app, {
        method: 'PUT',
        url: '/api/admin/modules/placements/toggle',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { isEnabled: false, confirmed: false }
      });
      assert.strictEqual(noConfirmRes.status, 400);

      // requireModuleEnabled middleware rejects POST when disabled while historical GET remains separate
      const mw = requireModuleEnabled('placements');
      let nextCalled = false;
      let statusSent = null;
      let bodySent = null;
      const mockRes = {
        status(code) { statusSent = code; return this; },
        json(payload) { bodySent = payload; return this; }
      };
      await mw({}, mockRes, () => { nextCalled = true; });
      assert.strictEqual(nextCalled, false);
      assert.strictEqual(statusSent, 403);
      assert.strictEqual(bodySent.code, 'MODULE_DISABLED');
    } finally {
      restore();
    }
  });

  // 9. Configuration Backup Format Validation & Lockout Conflict Preview
  await testAsync('9. Rejects invalid backup schemas and warns on System Admin role conflicts while preserving operational data', async () => {
    const restore = installCommonModelStubs();
    try {
      const adminToken = signTestToken(MOCK_USERS_BY_ID['u-admin']);

      const badBackup = await dispatchExpress(app, {
        method: 'POST',
        url: '/api/admin/backups/preview-restore',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { snapshot: { schemaVersion: '1.0', roles: [] } }
      });
      assert.strictEqual(badBackup.status, 400);

      const noAdminBackup = await dispatchExpress(app, {
        method: 'POST',
        url: '/api/admin/backups/preview-restore',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          snapshot: {
            schemaVersion: '2.0',
            exportedAt: new Date().toISOString(),
            roles: [{ code: 'faculty', name: 'Faculty', isSystemAdmin: false, isActive: true }],
            systemConfigurations: [],
            moduleConfigs: [],
            formDefinitions: [],
            formFields: []
          }
        }
      });
      assert.strictEqual(noAdminBackup.status, 200);
      assert.strictEqual(noAdminBackup.body.data.operationalDataAffected, false);
      assert.strictEqual(noAdminBackup.body.data.auditHistoryPreserved, true);
      assert.strictEqual(noAdminBackup.body.data.conflicts.length, 1);
      assert.match(noAdminBackup.body.data.conflicts[0], /System Administrator role/i);
    } finally {
      restore();
    }
  });

  // 10. Secret Redaction in Audit Logs
  await testAsync('10. Redacts passwords, tokens, API keys, and cookies recursively in audit logs', async () => {
    const cleaned = redactSecrets({
      name: 'User',
      password: 'SuperSecretPassword!123',
      nested: {
        jwtToken: 'eyJ.abc.def',
        apiKey: 'secret-key-99',
        safeField: 'allowed'
      }
    });
    assert.strictEqual(cleaned.name, 'User');
    assert.strictEqual(cleaned.password, '[REDACTED]');
    assert.strictEqual(cleaned.nested.jwtToken, '[REDACTED]');
    assert.strictEqual(cleaned.nested.apiKey, '[REDACTED]');
    assert.strictEqual(cleaned.nested.safeField, 'allowed');
  });

  console.log(`\n✅ System Administration V2.0 Test Suite passed (${passed}/${passed} assertions).`);
}

runTests().catch((err) => {
  console.error('\n❌ System Administration V2.0 Test Suite failed:', err);
  process.exit(1);
});

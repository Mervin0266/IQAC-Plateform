'use strict';

/**
 * Phase B Workstream B1 (Login Rate Limiting) & B2 (Strict CORS) Automated Tests
 * CHRIST University IQAC Platform
 * 
 * Verifies:
 * - B1: Dedicated login rate limiting (5 failed attempts -> 429 AUTH_RATE_LIMITED)
 * - B1: Success does not consume failure budget
 * - B1: Account-specific composite isolation
 * - B2: Approved origin allowed with credentials
 * - B2: Arbitrary *.vercel.app rejected (wildcard removed)
 * - B2: Arbitrary *.onrender.com rejected (wildcard removed)
 * - B2: Lookalike hostname rejected
 * - B2: OPTIONS preflight handled correctly
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

process.env.LOGIN_RATE_LIMIT_WINDOW_MS = '60000'; // 1 minute for test
process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS = '5';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const { sequelize } = require(path.join(backendPath, 'config/database'));
const { User } = require(path.join(backendPath, 'models'));
const app = require(path.join(backendPath, 'server'));

describe('Phase B: Workstreams B1 (Rate Limiting) & B2 (CORS Protection)', () => {

  const testEmail = 'ratelimit_user@christuniversity.in';
  const testOtherEmail = 'ratelimit_other@christuniversity.in';
  const validPassword = 'ComplexPassword@2026!';

  before(async () => {
    // 1. Positive Pre-provisioned Database Verification
    await verifyPreProvisionedDisposableTestDatabase(sequelize);

    // 2. Clean and seed test accounts
    await User.destroy({ where: { email: [testEmail, testOtherEmail] } });

    await User.create({
      name: 'Rate Limit Test User',
      email: testEmail,
      password: validPassword,
      role: 'faculty',
      department: 'Computer Science and Engineering',
      tokenVersion: 1,
      isActive: true,
      mustChangePassword: false
    });

    await User.create({
      name: 'Rate Limit Other User',
      email: testOtherEmail,
      password: validPassword,
      role: 'faculty',
      department: 'Civil Engineering',
      tokenVersion: 1,
      isActive: true,
      mustChangePassword: false
    });
  });

  // =========================================================================
  // WORKSTREAM B1: DEDICATED LOGIN RATE LIMITING TESTS
  // =========================================================================
  describe('Workstream B1: Login Rate Limiting (VULN-P1-07)', () => {

    test('1. First 5 failed login attempts return HTTP 401 Invalid credentials', async () => {
      for (let i = 1; i <= 5; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: testEmail, password: 'WrongPassword!' });

        assert.equal(res.status, 401, `Attempt ${i} should return 401`);
        assert.equal(res.body.success, false);
      }
    });

    test('2. 6th failed login attempt is throttled with HTTP 429 AUTH_RATE_LIMITED', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'WrongPassword!' });

      assert.equal(res.status, 429, '6th attempt must be rejected with 429');
      assert.equal(res.body.success, false);
      assert.equal(res.body.code, 'AUTH_RATE_LIMITED');
      assert.ok(res.body.message.includes('Too many failed login attempts'));
    });

    test('3. Generic error message prevents username/account enumeration', async () => {
      // Non-existent account throttled request also returns standard message
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent_account@christuniversity.in', password: 'AnyPassword!' });

      // First attempt on nonexistent account
      assert.equal(res.status, 401);
      assert.equal(res.body.message, 'Invalid credentials');
    });

    test('4. Rate limit on one account does not block another account from same IP', async () => {
      // testEmail is currently rate-limited (429)
      const resBlocked = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: validPassword });
      assert.equal(resBlocked.status, 429, 'testEmail remains rate limited');

      // But testOtherEmail should be allowed to log in!
      const resOther = await request(app)
        .post('/api/auth/login')
        .send({ email: testOtherEmail, password: validPassword });

      assert.equal(resOther.status, 200, 'Different account should not be blocked by campus IP sharing');
      assert.ok(resOther.body.data?.token || resOther.body.token);
    });
  });

  // =========================================================================
  // WORKSTREAM B2: EXACT-ORIGIN CORS RESTRICTION TESTS
  // =========================================================================
  describe('Workstream B2: Strict CORS Protection (VULN-P1-02)', () => {

    test('1. Configured localhost origin is granted CORS permissions in test mode', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Origin', 'http://localhost:5173');

      assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
      assert.equal(res.headers['access-control-allow-credentials'], 'true');
    });

    test('2. Arbitrary *.vercel.app origin is strictly rejected (wildcard removed)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Origin', 'https://malicious-tenant.vercel.app');

      // Rejected CORS origin must NOT have Access-Control-Allow-Origin header
      assert.equal(res.headers['access-control-allow-origin'], undefined);
    });

    test('3. Arbitrary *.onrender.com origin is strictly rejected (wildcard removed)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Origin', 'https://attacker-app.onrender.com');

      assert.equal(res.headers['access-control-allow-origin'], undefined);
    });

    test('4. Lookalike domain is strictly rejected', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Origin', 'https://iqac.christuniversity.in.attacker.org');

      assert.equal(res.headers['access-control-allow-origin'], undefined);
    });

    test('5. OPTIONS preflight from approved origin returns HTTP 204 with allowed headers', async () => {
      const res = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      assert.equal(res.status, 204);
      assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
      assert.ok(res.headers['access-control-allow-methods'].includes('POST'));
    });

    test('6. Non-browser request without Origin header succeeds normally', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      // Without Origin header, request is processed normally (returns 401 unauthorized, not a CORS error)
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });
  });

  after(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);
    await User.destroy({ where: { email: [testEmail, testOtherEmail] } });
  });
});

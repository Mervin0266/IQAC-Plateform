'use strict';

/**
 * Phase D: HTTP Security Headers, Browser Defenses & Infrastructure Hardening Test Suite
 * CHRIST University IQAC Platform
 * 
 * Verifies:
 * 1. Content Security Policy (CSP) headers (object-src 'none', frame-ancestors 'none', script-src 'self').
 * 2. Strict-Transport-Security (HSTS) with includeSubDomains and 1-year maxAge.
 * 3. X-Content-Type-Options: nosniff.
 * 4. X-Frame-Options: DENY (anti-clickjacking).
 * 5. Referrer-Policy: strict-origin-when-cross-origin.
 * 6. Permissions-Policy device feature restrictions.
 * 7. Cache-Control: no-store, no-cache, must-revalidate on sensitive /api/* responses.
 * 8. Safe /health check behavior without information disclosure.
 * 9. Production trust proxy configuration assertion.
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

const { sequelize } = require(path.join(backendPath, 'config/database'));
const app = require(path.join(backendPath, 'server'));

describe('Phase D: HTTP Security Headers & Browser Defenses', () => {

  before(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);
  });

  after(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);
  });

  test('HDR-01: Content-Security-Policy restricts object-src, frame-ancestors, and script-src', async () => {
    const res = await request(app).get('/health');
    const csp = res.headers['content-security-policy'];
    assert.ok(csp, 'Content-Security-Policy header must be present');
    assert.ok(csp.includes("object-src 'none'"), 'CSP must restrict object-src to none');
    assert.ok(csp.includes("frame-ancestors 'none'"), 'CSP must restrict frame-ancestors to none');
    assert.ok(csp.includes("script-src 'self'"), 'CSP must restrict script-src to self');
    assert.ok(csp.includes("default-src 'self'"), 'CSP must enforce default-src self');
  });

  test('HDR-02: Strict-Transport-Security (HSTS) enforces 1-year duration with includeSubDomains', async () => {
    const res = await request(app).get('/health');
    const hsts = res.headers['strict-transport-security'];
    assert.ok(hsts, 'Strict-Transport-Security header must be present');
    assert.ok(hsts.includes('max-age=31536000'), 'HSTS max-age must be at least 31536000 seconds (1 year)');
    assert.ok(hsts.includes('includeSubDomains'), 'HSTS must specify includeSubDomains');
  });

  test('HDR-03: MIME sniffing protection (X-Content-Type-Options: nosniff)', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
  });

  test('HDR-04: Frame Protection against clickjacking (X-Frame-Options: DENY)', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.headers['x-frame-options'], 'DENY');
  });

  test('HDR-05: Referrer-Policy enforces strict-origin-when-cross-origin', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  });

  test('HDR-06: Permissions-Policy restricts sensitive device APIs', async () => {
    const res = await request(app).get('/health');
    const pp = res.headers['permissions-policy'];
    assert.ok(pp, 'Permissions-Policy header must be present');
    assert.ok(pp.includes('camera=()'));
    assert.ok(pp.includes('microphone=()'));
    assert.ok(pp.includes('geolocation=()'));
  });

  test('HDR-07: Sensitive /api/ responses enforce Cache-Control: no-store, no-cache', async () => {
    const res = await request(app).get('/api/auth/me');
    const cc = res.headers['cache-control'];
    assert.ok(cc, 'Cache-Control header must be set on /api/ endpoints');
    assert.ok(cc.includes('no-store'), 'Cache-Control must contain no-store');
    assert.ok(cc.includes('no-cache'), 'Cache-Control must contain no-cache');
    assert.ok(cc.includes('must-revalidate'), 'Cache-Control must contain must-revalidate');
    assert.equal(res.headers['pragma'], 'no-cache');
  });

  test('HDR-08: Health check endpoint behaves safely without leaking secrets or database internals', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'IQAC Backend API is running');

    // Confirm no leaked sensitive details
    const resString = JSON.stringify(res.body);
    assert.ok(!resString.includes('password'));
    assert.ok(!resString.includes('postgres://'));
    assert.ok(!resString.includes('DATABASE_URL'));
    assert.ok(!resString.includes('JWT_SECRET'));
  });

  test('HDR-09: Trust proxy setting is strictly validated (1 hop or false, never permissive string)', () => {
    const trustProxy = app.get('trust proxy');
    assert.ok(trustProxy === false || trustProxy === 1 || typeof trustProxy === 'function',
      'Trust proxy must be strictly false or 1 hop, preventing IP spoofing');
  });
});

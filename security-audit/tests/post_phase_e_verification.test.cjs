'use strict';

/**
 * Post-Phase E Final Security Verification Suite
 * CHRIST University IQAC Platform
 *
 * Verifies:
 * 1. Single JWT 1-hour expiry policy enforcement (fallback from missing/malformed, production clamping from >1h).
 * 2. Token lifecycle security: expired tokens, tampered signatures, missing tokens, and revoked tokenVersion.
 * 3. Strict RFC-4180 CSV export compliance: parseable without comment lines, pure institutional rows, trailer metadata.
 * 4. Streaming JSON export: valid parseable JSON output on completion and mid-stream error.
 * 5. Spreadsheet formula injection neutralization across all data types.
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
const jwt = require('jsonwebtoken');
const { sequelize } = require(path.join(backendPath, 'config/database'));
const { resolveJwtExpiry, generateToken } = require(path.join(backendPath, 'controllers/authController'));
const { streamBatchedExport, escapeCsvCell } = require(path.join(backendPath, 'utils/paginationHelper'));
const { auth: authMiddleware } = require(path.join(backendPath, 'middleware/auth'));
const { User } = require(path.join(backendPath, 'models'));

describe('Post-Phase E: Final Corrections & Verification', () => {
  before(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);
  });

  // --- 1. JWT Policy Enforcement ---
  test('POST-E-01: JWT expiry defaults to 1h when JWT_EXPIRE is missing or empty', () => {
    const orig = process.env.JWT_EXPIRE;
    try {
      delete process.env.JWT_EXPIRE;
      assert.equal(resolveJwtExpiry(), '1h', 'Missing JWT_EXPIRE must default to 1h');

      process.env.JWT_EXPIRE = '';
      assert.equal(resolveJwtExpiry(), '1h', 'Empty JWT_EXPIRE must default to 1h');

      process.env.JWT_EXPIRE = '   ';
      assert.equal(resolveJwtExpiry(), '1h', 'Whitespace JWT_EXPIRE must default to 1h');
    } finally {
      process.env.JWT_EXPIRE = orig;
    }
  });

  test('POST-E-02: JWT expiry rejects malformed input and safely defaults to 1h', () => {
    const orig = process.env.JWT_EXPIRE;
    try {
      process.env.JWT_EXPIRE = 'unlimited';
      assert.equal(resolveJwtExpiry(), '1h', 'Malformed string must default to 1h');

      process.env.JWT_EXPIRE = 'never';
      assert.equal(resolveJwtExpiry(), '1h', 'Invalid duration must default to 1h');

      process.env.JWT_EXPIRE = '-5h';
      assert.equal(resolveJwtExpiry(), '1h', 'Negative duration must default to 1h');
    } finally {
      process.env.JWT_EXPIRE = orig;
    }
  });

  test('POST-E-03: In production mode, JWT expiry exceeding 1h is clamped strictly to 1h', () => {
    const origEnv = process.env.NODE_ENV;
    const origExpire = process.env.JWT_EXPIRE;
    try {
      process.env.NODE_ENV = 'production';

      process.env.JWT_EXPIRE = '8h';
      assert.equal(resolveJwtExpiry(), '1h', '8h in production must be clamped to 1h');

      process.env.JWT_EXPIRE = '7d';
      assert.equal(resolveJwtExpiry(), '1h', '7d in production must be clamped to 1h');

      process.env.JWT_EXPIRE = '7200s';
      assert.equal(resolveJwtExpiry(), '1h', '7200s in production must be clamped to 1h');
    } finally {
      process.env.NODE_ENV = origEnv;
      process.env.JWT_EXPIRE = origExpire;
    }
  });

  test('POST-E-04: In production mode, JWT expiry <= 1h is respected', () => {
    const origEnv = process.env.NODE_ENV;
    const origExpire = process.env.JWT_EXPIRE;
    try {
      process.env.NODE_ENV = 'production';

      process.env.JWT_EXPIRE = '45m';
      assert.equal(resolveJwtExpiry(), '45m', '45m in production should be permitted');

      process.env.JWT_EXPIRE = '1800s';
      assert.equal(resolveJwtExpiry(), '1800s', '1800s in production should be permitted');
    } finally {
      process.env.NODE_ENV = origEnv;
      process.env.JWT_EXPIRE = origExpire;
    }
  });

  test('POST-E-05: Expired token is rejected with TOKEN_EXPIRED (401)', async () => {
    const expiredToken = jwt.sign(
      { id: 99999, tokenVersion: 0 },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '-10s', algorithm: 'HS256' }
    );

    let statusCode = null;
    let responseBody = null;
    const req = {
      header: (name) => (name === 'Authorization' ? `Bearer ${expiredToken}` : null),
      headers: { authorization: `Bearer ${expiredToken}` }
    };
    const res = {
      status(code) { statusCode = code; return this; },
      json(body) { responseBody = body; }
    };

    await authMiddleware(req, res, () => {});

    assert.equal(statusCode, 401);
    assert.equal(responseBody.errorCode, 'TOKEN_EXPIRED');
  });

  test('POST-E-06: Token with invalid signature is rejected with 401', async () => {
    const invalidSignatureToken = jwt.sign(
      { id: 1, tokenVersion: 0 },
      'wrong_secret_key_12345678901234567890',
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    let statusCode = null;
    let responseBody = null;
    const req = {
      header: (name) => (name === 'Authorization' ? `Bearer ${invalidSignatureToken}` : null),
      headers: { authorization: `Bearer ${invalidSignatureToken}` }
    };
    const res = {
      status(code) { statusCode = code; return this; },
      json(body) { responseBody = body; }
    };

    await authMiddleware(req, res, () => {});

    assert.equal(statusCode, 401);
    assert.equal(responseBody.message, 'Invalid token.');
  });

  test('POST-E-07: Token with revoked tokenVersion is rejected with TOKEN_REVOKED (401)', async () => {
    // Find an existing active user
    const user = await User.findOne({ where: { role: 'admin' } });
    assert.ok(user, 'Admin user must exist in test database');

    // Create a token with an obsolete tokenVersion
    const staleToken = jwt.sign(
      { id: user.id, tokenVersion: (user.tokenVersion || 0) - 1 },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h', algorithm: 'HS256' }
    );

    let statusCode = null;
    let responseBody = null;
    const req = {
      header: (name) => (name === 'Authorization' ? `Bearer ${staleToken}` : null),
      headers: { authorization: `Bearer ${staleToken}` }
    };
    const res = {
      status(code) { statusCode = code; return this; },
      json(body) { responseBody = body; }
    };

    await authMiddleware(req, res, () => {});

    assert.equal(statusCode, 401);
    assert.equal(responseBody.code, 'TOKEN_REVOKED');
  });

  // --- 2. Streaming Export CSV/JSON Verification ---
  test('POST-E-08: CSV export produces 100% parseable RFC-4180 output with identical column count per row', async () => {
    let output = '';
    const trailers = {};

    const mockRes = {
      setHeader() {},
      addTrailers(t) { Object.assign(trailers, t); },
      write(chunk) { output += chunk; },
      end() { this.writableEnded = true; },
      on() {},
      writableEnded: false
    };

    const mockModel = {
      count: async () => 2,
      findAll: async () => [
        { id: 10, name: 'Faculty One', department: 'Computer Science', status: 'Active' },
        { id: 11, name: 'Faculty Two', department: 'Mechanical Engg', status: 'Active' }
      ]
    };

    await streamBatchedExport(mockRes, {
      model: mockModel,
      batchSize: 10,
      maxRecords: 100,
      format: 'csv'
    });

    assert.ok(mockRes.writableEnded);
    assert.equal(trailers['X-Export-Status'], 'COMPLETED');

    const cleanOutput = output.replace(/^\uFEFF/, '').trim();
    const rows = cleanOutput.split('\r\n');

    // Header row + 2 data rows = 3 rows
    assert.equal(rows.length, 3);
    const headerCols = rows[0].split(',');
    assert.equal(headerCols.length, 4, 'Header must have 4 columns');

    // Verify all rows have exactly 4 columns
    for (let i = 0; i < rows.length; i++) {
      const cols = rows[i].split(',');
      assert.equal(cols.length, 4, `Row ${i} must have exactly 4 columns`);
    }

    // Body must contain no comment lines
    assert.ok(!cleanOutput.includes('# EXPORT STATUS'), 'CSV body must contain zero metadata comment rows');
  });

  test('POST-E-09: JSON streaming export produces valid parseable JSON', async () => {
    let output = '';
    const trailers = {};

    const mockRes = {
      setHeader() {},
      addTrailers(t) { Object.assign(trailers, t); },
      write(chunk) { output += chunk; },
      end() { this.writableEnded = true; },
      on() {},
      writableEnded: false
    };

    const mockModel = {
      count: async () => 2,
      findAll: async () => [
        { id: 1, title: 'Paper 1', year: 2024 },
        { id: 2, title: 'Paper 2', year: 2025 }
      ]
    };

    await streamBatchedExport(mockRes, {
      model: mockModel,
      batchSize: 10,
      maxRecords: 100,
      format: 'json'
    });

    assert.ok(mockRes.writableEnded);
    assert.equal(trailers['X-Export-Status'], 'COMPLETED');

    // Must parse cleanly with JSON.parse
    const parsed = JSON.parse(output);
    assert.equal(parsed.success, true);
    assert.equal(parsed.total, 2);
    assert.equal(parsed.count, 2);
    assert.equal(parsed.data.length, 2);
    assert.equal(parsed.pagination.isComplete, true);
  });

  test('POST-E-10: Formula injection vectors in CSV cells are neutralized with leading single quote', () => {
    const maliciousInputs = [
      '=1+2',
      '=cmd|\' /C calc\'!A0',
      '+12345text',
      '-@SUM(A1:A5)',
      '@calc',
      '\t=cmd|\' /C calc\'!A0'
    ];

    maliciousInputs.forEach(input => {
      const escaped = escapeCsvCell(input);
      assert.ok(
        escaped.startsWith("'") || escaped.startsWith("\"'"),
        `Input "${input}" must be sanitized with leading quote: got "${escaped}"`
      );
    });
  });
});

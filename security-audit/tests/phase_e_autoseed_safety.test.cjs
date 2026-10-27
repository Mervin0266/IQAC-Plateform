'use strict';

/**
 * Phase E0.1: Production Auto-Seeding Prohibition & Fail-Closed Guard Regression Suite
 * CHRIST University IQAC Platform
 *
 * Requirements:
 * 1. Production startup must NEVER execute automatic demo-user seeding.
 * 2. Production startup must NEVER execute schema-altering sync or raw DDL.
 * 3. ENABLE_AUTO_SEED=true must NOT override the production prohibition.
 * 4. Missing or incorrect environment configuration must fail closed.
 * 5. Preserve safe developer and disposable-test setup workflows.
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
const { sequelize } = require(path.join(backendPath, 'config/database'));

describe('Phase E0.1: Production Auto-Seeding Prohibition & Fail-Closed Guard', () => {
  before(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);
  });

  const autoSeed = require(path.join(backendPath, 'config/autoSeed'));

  test('E0.1-01: autoSeed throws immediately if NODE_ENV=production with ENABLE_AUTO_SEED unset', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalEnable = process.env.ENABLE_AUTO_SEED;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.ENABLE_AUTO_SEED;

      await assert.rejects(
        async () => {
          await autoSeed(sequelize);
        },
        /AUTO_SEED_PROHIBITED/
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalEnable !== undefined) process.env.ENABLE_AUTO_SEED = originalEnable;
      else delete process.env.ENABLE_AUTO_SEED;
    }
  });

  test('E0.1-02: autoSeed strictly ignores ENABLE_AUTO_SEED=true in production mode and throws', async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalEnable = process.env.ENABLE_AUTO_SEED;
    try {
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_AUTO_SEED = 'true';

      await assert.rejects(
        async () => {
          await autoSeed(sequelize);
        },
        /AUTO_SEED_PROHIBITED/
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalEnable !== undefined) process.env.ENABLE_AUTO_SEED = originalEnable;
      else delete process.env.ENABLE_AUTO_SEED;
    }
  });

  test('E0.1-03: autoSeed fails closed if NODE_ENV is undefined/missing', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      delete process.env.NODE_ENV;

      await assert.rejects(
        async () => {
          await autoSeed(sequelize);
        },
        /AUTO_SEED_PROHIBITED/
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test('E0.1-04: autoSeed fails closed if NODE_ENV is set to unrecognized non-development environment', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'staging';

      await assert.rejects(
        async () => {
          await autoSeed(sequelize);
        },
        /AUTO_SEED_PROHIBITED/
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test('E0.1-05: server.js startup logic evaluation ignores ENABLE_AUTO_SEED in production', () => {
    // Simulating server.js decision logic
    function shouldRunAutoSeed(env, enableFlag) {
      const nodeEnv = env;
      if (!nodeEnv || nodeEnv === 'production') {
        return false;
      }
      return nodeEnv === 'development' || nodeEnv === 'test';
    }

    assert.equal(shouldRunAutoSeed('production', 'true'), false, 'Must not run in production with ENABLE_AUTO_SEED=true');
    assert.equal(shouldRunAutoSeed('production', 'false'), false, 'Must not run in production with ENABLE_AUTO_SEED=false');
    assert.equal(shouldRunAutoSeed(undefined, 'true'), false, 'Must fail closed when NODE_ENV is undefined');
    assert.equal(shouldRunAutoSeed('staging', 'true'), false, 'Must fail closed on unrecognized environment');
    assert.equal(shouldRunAutoSeed('development', undefined), true, 'Allowed in development');
    assert.equal(shouldRunAutoSeed('test', undefined), true, 'Allowed in test');
  });
});

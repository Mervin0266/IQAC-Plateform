'use strict';

/**
 * Hardened Test Database Verification & Negative Safety Tests
 * CHRIST University IQAC Platform
 * 
 * Verifies that verifyPreProvisionedDisposableTestDatabase():
 * 1. Strictly rejects non-test NODE_ENV.
 * 2. Strictly rejects missing TEST_DATABASE_URL.
 * 3. Strictly rejects remote/cloud host targets.
 * 4. Strictly rejects databases not ending in '_test'.
 * 5. Strictly aborts if the pre-existing disposable marker is missing (self-authorization prevented).
 * 6. Strictly aborts if the marker status is not APPROVED_FOR_DESTRUCTIVE_SECURITY_TESTING.
 * 7. Successfully passes ONLY when pre-provisioned marker and database identity are verified.
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { verifyPreProvisionedDisposableTestDatabase } = require('../../src/app/backend/utils/testDatabaseGuard');

// Load .env.test if not present in environment
if (!process.env.TEST_DATABASE_URL) {
  require('dotenv').config({ path: path.join(__dirname, '../../src/app/backend/.env.test') });
}
const DEFAULT_TEST_URL = process.env.TEST_DATABASE_URL || 'postgres://postgres:test@localhost:5432/iqac_test';

describe('Disposable Database Verification Safety Matrix', () => {

  test('1. Aborts immediately if NODE_ENV !== "test"', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      await assert.rejects(
        async () => {
          await verifyPreProvisionedDisposableTestDatabase({});
        },
        /unsafe environment NODE_ENV='production'|NODE_ENV must be strictly 'test'/
      );
    } finally {
      if (originalEnv !== undefined) {
        process.env.NODE_ENV = originalEnv;
      } else {
        delete process.env.NODE_ENV;
      }
    }
  });

  test('2. Aborts immediately if TEST_DATABASE_URL is missing', async () => {
    const originalUrl = process.env.TEST_DATABASE_URL;
    try {
      delete process.env.TEST_DATABASE_URL;
      await assert.rejects(
        async () => {
          await verifyPreProvisionedDisposableTestDatabase({});
        },
        /TEST_DATABASE_URL is not set/
      );
    } finally {
      if (originalUrl !== undefined) {
        process.env.TEST_DATABASE_URL = originalUrl;
      } else {
        process.env.TEST_DATABASE_URL = DEFAULT_TEST_URL;
      }
    }
  });

  test('3. Aborts immediately if TEST_DATABASE_URL points to cloud/remote host', async () => {
    const originalUrl = process.env.TEST_DATABASE_URL;
    try {
      process.env.TEST_DATABASE_URL = 'postgres://user:pass@dpg-abcdef.oregon-postgres.render.com:5432/iqac_test';
      await assert.rejects(
        async () => {
          await verifyPreProvisionedDisposableTestDatabase({});
        },
        /remote cloud host signature/
      );
    } finally {
      if (originalUrl !== undefined) {
        process.env.TEST_DATABASE_URL = originalUrl;
      } else {
        process.env.TEST_DATABASE_URL = DEFAULT_TEST_URL;
      }
    }
  });

  test('4. Aborts if PostgreSQL catalog name does not end in "_test"', async () => {
    const mockSequelize = {
      query: async (sql) => {
        if (sql.includes('current_database()')) {
          return [[{ db_name: 'iqac_production' }]];
        }
        return [[]];
      }
    };

    await assert.rejects(
      async () => {
        await verifyPreProvisionedDisposableTestDatabase(mockSequelize);
      },
      /Connected database 'iqac_production' does NOT end with '_test'/
    );
  });

  test('5. Aborts if target DB name contains "test" in middle but does not end in "_test"', async () => {
    const mockSequelize = {
      query: async (sql) => {
        if (sql.includes('current_database()')) {
          return [[{ db_name: 'test_backup_production' }]];
        }
        return [[]];
      }
    };

    await assert.rejects(
      async () => {
        await verifyPreProvisionedDisposableTestDatabase(mockSequelize);
      },
      /must strictly end with "_test"/
    );
  });

  test('6. Prevents self-authorization: Aborts if __disposable_test_marker__ table is absent', async () => {
    const mockSequelize = {
      query: async (sql) => {
        if (sql.includes('current_database()')) {
          return [[{ db_name: 'iqac_test' }]];
        }
        if (sql.includes('__disposable_test_marker__')) {
          throw new Error('relation "__disposable_test_marker__" does not exist');
        }
        return [[]];
      }
    };

    await assert.rejects(
      async () => {
        await verifyPreProvisionedDisposableTestDatabase(mockSequelize);
      },
      /The test runner is not allowed to create the authorization marker for itself/
    );
  });

  test('7. Aborts if marker status is not APPROVED_FOR_DESTRUCTIVE_SECURITY_TESTING', async () => {
    const mockSequelize = {
      query: async (sql) => {
        if (sql.includes('current_database()')) {
          return [[{ db_name: 'iqac_test' }]];
        }
        if (sql.includes('__disposable_test_marker__')) {
          return [[]]; // No rows with APPROVED status
        }
        return [[]];
      }
    };

    await assert.rejects(
      async () => {
        await verifyPreProvisionedDisposableTestDatabase(mockSequelize);
      },
      /Disposable marker table exists but contains no valid approved marker record/
    );
  });

  test('8. Successfully authorizes when pre-existing marker and database identity are verified', async () => {
    const mockSequelize = {
      query: async (sql) => {
        if (sql.includes('current_database()')) {
          return [[{ db_name: 'iqac_test' }]];
        }
        if (sql.includes('__disposable_test_marker__')) {
          return [[{
            marker_id: 'CHRIST_IQAC_DISPOSABLE_TEST_MARKER_V1',
            environment: 'test',
            status: 'APPROVED_FOR_DESTRUCTIVE_SECURITY_TESTING',
            provisioned_at: new Date()
          }]];
        }
        return [[]];
      }
    };

    const result = await verifyPreProvisionedDisposableTestDatabase(mockSequelize);
    assert.equal(result.verified, true);
    assert.equal(result.database, 'iqac_test');
    assert.equal(result.markerId, 'CHRIST_IQAC_DISPOSABLE_TEST_MARKER_V1');
  });

  test('9. Preflight strictly rejects production/staging without modifying process.env.NODE_ENV', () => {
    const { enforceTestEnvironmentPreflight } = require('../../src/app/backend/utils/testDatabaseGuard');
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      assert.throws(
        () => enforceTestEnvironmentPreflight(),
        /Test runner launched in unsafe environment NODE_ENV='production'/
      );
      assert.equal(process.env.NODE_ENV, 'production', 'NODE_ENV must NOT be mutated by preflight');

      process.env.NODE_ENV = 'staging';
      assert.throws(
        () => enforceTestEnvironmentPreflight(),
        /Test runner launched in unsafe environment NODE_ENV='staging'/
      );
      assert.equal(process.env.NODE_ENV, 'staging', 'NODE_ENV must NOT be mutated by preflight');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  test('10. Preflight rejects missing or malformed TEST_DATABASE_URL fail-closed', () => {
    const { enforceTestEnvironmentPreflight } = require('../../src/app/backend/utils/testDatabaseGuard');
    const originalEnv = process.env.NODE_ENV;
    const originalUrl = process.env.TEST_DATABASE_URL;
    try {
      process.env.NODE_ENV = 'test';
      delete process.env.TEST_DATABASE_URL;
      assert.throws(
        () => enforceTestEnvironmentPreflight(),
        /TEST_DATABASE_URL is not set/
      );

      process.env.TEST_DATABASE_URL = '   ';
      assert.throws(
        () => enforceTestEnvironmentPreflight(),
        /TEST_DATABASE_URL is not set/
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.TEST_DATABASE_URL = originalUrl;
    }
  });
});

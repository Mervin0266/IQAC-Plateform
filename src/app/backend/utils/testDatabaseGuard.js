'use strict';

/**
 * Hardened Test Database Safety Guard
 * CHRIST University IQAC Platform
 * 
 * Verifies that the connected database is a pre-provisioned, disposable test database
 * BEFORE any test writes, updates, or destructive operations are executed.
 * 
 * Strict Safety Rules:
 * 1. NODE_ENV must be strictly 'test'.
 * 2. TEST_DATABASE_URL must be explicitly configured; never fallback to DATABASE_URL.
 * 3. The PostgreSQL catalog database name (current_database()) must strictly end with '_test'.
 * 4. The pre-existing disposable marker table '__disposable_test_marker__' must ALREADY exist.
 *    The test runner is STRICTLY FORBIDDEN from creating this marker to self-authorize.
 * 5. The marker must contain status = 'APPROVED_FOR_DESTRUCTIVE_SECURITY_TESTING'.
 */

function enforceTestEnvironmentPreflight() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      `TEST SAFETY FATAL: Test runner launched in unsafe environment NODE_ENV='${process.env.NODE_ENV}'. ` +
      'Tests are strictly forbidden from overriding NODE_ENV or running against non-test environments.'
    );
  }
  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (!testDbUrl || !testDbUrl.trim() || testDbUrl.trim() === 'undefined') {
    throw new Error(
      'TEST SAFETY FATAL: TEST_DATABASE_URL is not set. ' +
      'Tests are strictly forbidden from falling back to DATABASE_URL or connecting to shared environments.'
    );
  }
}

async function verifyPreProvisionedDisposableTestDatabase(sequelize) {
  // 1. Runtime environment assertion
  enforceTestEnvironmentPreflight();

  // 3. Reject cloud/remote hosts
  const testDbUrl = process.env.TEST_DATABASE_URL;
  let parsedUrl;
  try {
    parsedUrl = new URL(testDbUrl);
  } catch (e) {
    throw new Error(`TEST SAFETY FATAL: Malformed TEST_DATABASE_URL: ${e.message}`);
  }

  const prohibitedHosts = [
    'render.com', 'onrender.com', 'aws.com', 'amazonaws.com', 'rds',
    'supabase.co', 'railway.app', 'heroku', 'cockroach', 'neon.tech',
    'christuniversity.in'
  ];
  for (const hostSig of prohibitedHosts) {
    if (parsedUrl.hostname.includes(hostSig)) {
      throw new Error(
        `TEST SAFETY FATAL: TEST_DATABASE_URL points to a remote cloud host signature '${hostSig}'. ` +
        'Refusing to execute destructive tests on remote infrastructure.'
      );
    }
  }

  // 4. Positive verification directly from PostgreSQL catalog
  const [catalogRows] = await sequelize.query('SELECT current_database() as db_name;');
  const currentDb = catalogRows[0]?.db_name || '';
  if (!currentDb.endsWith('_test')) {
    throw new Error(
      `TEST SAFETY FATAL: Connected database '${currentDb}' does NOT end with '_test'. ` +
      'A database name containing "test" is insufficient; it must strictly end with "_test".'
    );
  }

  // 5. Positive verification of PRE-EXISTING disposable marker table
  // Test runners are NOT permitted to create this table!
  try {
    const [markerRows] = await sequelize.query(`
      SELECT marker_id, environment, status, provisioned_at 
      FROM __disposable_test_marker__ 
      WHERE status = 'APPROVED_FOR_DESTRUCTIVE_SECURITY_TESTING'
      ORDER BY provisioned_at DESC 
      LIMIT 1;
    `);

    if (!markerRows || markerRows.length === 0) {
      throw new Error(
        'Disposable marker table exists but contains no valid approved marker record. ' +
        'Database must be provisioned via provisionTestDatabase.js before testing.'
      );
    }

    const marker = markerRows[0];
    if (marker.environment !== 'test') {
      throw new Error(`Marker environment mismatch: expected 'test', found '${marker.environment}'.`);
    }

    return {
      verified: true,
      database: currentDb,
      markerId: marker.marker_id,
      provisionedAt: marker.provisioned_at
    };
  } catch (err) {
    throw new Error(
      `TEST SAFETY ABORT: Disposable test database authorization check failed: ${err.message}. ` +
      'The test runner is not allowed to create the authorization marker for itself. ' +
      'Please run "node src/app/backend/scripts/provisionTestDatabase.js" to provision and authorize a disposable database.'
    );
  }
}

module.exports = {
  enforceTestEnvironmentPreflight,
  verifyPreProvisionedDisposableTestDatabase
};

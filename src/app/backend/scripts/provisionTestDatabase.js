'use strict';

/**
 * Disposable Test Database Provisioning Script
 * CHRIST University IQAC Platform
 * 
 * Explicitly provisions and authorizes a disposable test database for security testing.
 * Writes the independent verification marker table '__disposable_test_marker__'.
 * 
 * Usage:
 *   $env:NODE_ENV="test"
 *   $env:TEST_DATABASE_URL="postgres://user:pass@localhost:5432/iqac_test"
 *   node src/app/backend/scripts/provisionTestDatabase.js
 */

const path = require('path');
const fs = require('fs');

// Ensure isolated test configuration is loaded
const envTestPath = path.join(__dirname, '../.env.test');
if (fs.existsSync(envTestPath)) {
  require('dotenv').config({ path: envTestPath });
}

async function provisionTestDatabase() {
  if (process.env.NODE_ENV !== 'test') {
    console.error('❌ FATAL: Cannot provision test database unless NODE_ENV === "test". Current:', process.env.NODE_ENV);
    process.exit(1);
  }

  const { sequelize } = require('../config/database');
  const models = require('../models');

  try {
    console.log('--- CHRIST University IQAC Platform ---');
    console.log('Initiating Disposable Test Database Provisioning...');

    await sequelize.authenticate();

    // 1. Verify target database catalog name
    const [dbRows] = await sequelize.query('SELECT current_database() as db_name;');
    const currentDb = dbRows[0]?.db_name || '';
    if (!currentDb.endsWith('_test')) {
      console.error(`❌ FATAL: Connected database '${currentDb}' does NOT end with '_test'. Aborting provisioning.`);
      process.exit(1);
    }
    console.log(`✓ Positively verified target database: ${currentDb}`);

    // 2. Synchronize all models
    console.log('Synchronizing Sequelize models on test database...');
    await sequelize.sync({ force: false });
    console.log('✓ Models synchronized.');

    // 3. Apply user security fields migration
    const userFieldsMigration = require('../migrations/20261019_add_user_security_fields');
    await userFieldsMigration.up(sequelize.getQueryInterface(), sequelize.constructor);
    console.log('✓ Security fields migration applied.');

    // 4. Create and populate pre-existing disposable authorization marker
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS __disposable_test_marker__ (
        id SERIAL PRIMARY KEY,
        marker_id VARCHAR(64) NOT NULL,
        environment VARCHAR(32) NOT NULL,
        status VARCHAR(64) NOT NULL,
        provisioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    const markerId = 'CHRIST_IQAC_DISPOSABLE_TEST_MARKER_V1';
    await sequelize.query(`
      INSERT INTO __disposable_test_marker__ (marker_id, environment, status, provisioned_at)
      VALUES ('${markerId}', 'test', 'APPROVED_FOR_DESTRUCTIVE_SECURITY_TESTING', NOW());
    `);
    console.log(`✓ Established approved disposable marker (${markerId}) in PostgreSQL.`);
    console.log('✅ Disposable test database is fully authorized for automated security tests.');

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Provisioning failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  provisionTestDatabase();
}

module.exports = { provisionTestDatabase };

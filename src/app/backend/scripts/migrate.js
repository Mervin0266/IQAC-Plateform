const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const { sequelize } = require('../config/database');

/**
 * Migration Runner with SequelizeMeta Tracking Ledger
 * Ensures migrations are executed idempotently and tracked permanently in PostgreSQL.
 * Subsequent runs skip already applied migrations, reducing boot/deployment latency.
 */
async function runMigrations() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('✓ Connected to database');

    try {
      await sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    } catch (extErr) {
      // Non-fatal if extension already exists or lacks superuser
    }

    // Ensure SequelizeMeta tracking table exists
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
        "name" VARCHAR(255) NOT NULL PRIMARY KEY,
        "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Fetch applied migrations
    const [rows] = await sequelize.query('SELECT name FROM "SequelizeMeta";');
    const executedSet = new Set(rows.map(r => r.name));

    const migrationsDir = path.resolve(__dirname, '../migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.js'))
        .sort();

      const pendingFiles = migrationFiles.filter(f => !executedSet.has(f));

      console.log(`Migration Status: ${executedSet.size} applied, ${pendingFiles.length} pending (out of ${migrationFiles.length} total).`);

      if (pendingFiles.length === 0) {
        console.log('✓ Database schema up to date. Zero pending migrations to apply.');
      } else {
        for (const file of pendingFiles) {
          console.log(`Applying pending migration: ${file}...`);
          const migration = require(path.resolve(migrationsDir, file));
          if (typeof migration.up === 'function') {
            await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
          }
          await sequelize.query('INSERT INTO "SequelizeMeta" ("name") VALUES (:name) ON CONFLICT ("name") DO NOTHING;', {
            replacements: { name: file }
          });
          console.log(`✓ Completed and tracked: ${file}`);
        }
        console.log('✓ All pending migrations completed successfully.');
      }
    }

    if (require.main === module) {
      process.exit(0);
    }
  } catch (err) {
    console.error('Migration failed:', err);
    if (require.main === module) {
      process.exit(1);
    }
    throw err;
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;

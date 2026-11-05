const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const { sequelize } = require('../config/database');

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

    const migrationsDir = path.resolve(__dirname, '../migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.js'))
        .sort();

      console.log(`Running ${migrationFiles.length} migrations...`);
      for (const file of migrationFiles) {
        console.log(`Applying: ${file}...`);
        const migration = require(path.resolve(migrationsDir, file));
        if (typeof migration.up === 'function') {
          await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
          console.log(`✓ Completed: ${file}`);
        }
      }
    }
    console.log('✓ All migrations completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = runMigrations;


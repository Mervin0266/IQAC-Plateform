const { sequelize } = require('../config/database');

async function fixColumns() {
  try {
    await sequelize.query('ALTER TABLE report_snapshots ADD COLUMN IF NOT EXISTS "snapshotId" VARCHAR(100) UNIQUE;');
    await sequelize.query('ALTER TABLE report_snapshots ADD COLUMN IF NOT EXISTS "dataProvenance" JSONB DEFAULT \'{}\';');
    await sequelize.query('ALTER TABLE report_snapshots ADD COLUMN IF NOT EXISTS "checksum" VARCHAR(64);');
    await sequelize.query('ALTER TABLE report_snapshots ADD COLUMN IF NOT EXISTS "createdBy" UUID;');
    await sequelize.query('ALTER TABLE report_snapshots ADD COLUMN IF NOT EXISTS "stylingConfig" JSONB DEFAULT \'{}\';');
    
    // Copy existing reportRunId into snapshotId if null
    await sequelize.query('UPDATE report_snapshots SET "snapshotId" = "reportRunId" WHERE "snapshotId" IS NULL AND "reportRunId" IS NOT NULL;');

    const [cols] = await sequelize.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'report_snapshots\'');
    console.log('SUCCESS! Updated columns in report_snapshots:', cols.map(c => c.column_name));
  } catch (err) {
    console.error('Error fixing columns:', err);
  } finally {
    process.exit(0);
  }
}

fixColumns();

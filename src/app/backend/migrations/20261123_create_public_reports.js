const { sequelize } = require('../config/database');

async function up(queryInterface, Sequelize) {
  const db = queryInterface && queryInterface.sequelize ? queryInterface.sequelize : sequelize;
  await db.query(`
    CREATE TABLE IF NOT EXISTS public_reports (
      section VARCHAR(255) NOT NULL,
      period VARCHAR(255) NOT NULL,
      draft JSONB,
      published JSONB,
      "publishedAt" TIMESTAMPTZ,
      "publishedBy" UUID,
      "archivedAt" TIMESTAMPTZ,
      "archivedBy" UUID,
      version INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMPTZ NOT NULL,
      "updatedAt" TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (section, period)
    )
  `);
}

module.exports = { up };

if (require.main === module) {
  up().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  }).finally(() => sequelize.close());
}

'use strict';

/**
 * Migration: Add Scopus Citation tracking and EID fields to publications table
 * and create indexes for efficient weekly scheduler queries.
 *
 * Additive, non-destructive, safe migration.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add Scopus citation tracking columns to publications table
    await queryInterface.sequelize.query(`
      ALTER TABLE "publications"
      ADD COLUMN IF NOT EXISTS "scopusEid" VARCHAR(100);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "publications"
      ADD COLUMN IF NOT EXISTS "scopusDocId" VARCHAR(100);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "publications"
      ADD COLUMN IF NOT EXISTS "scopusUrl" TEXT;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "publications"
      ADD COLUMN IF NOT EXISTS "scopusCitedByUrl" TEXT;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "publications"
      ADD COLUMN IF NOT EXISTS "citationMatchMethod" VARCHAR(50);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "publications"
      ADD COLUMN IF NOT EXISTS "citationStatus" VARCHAR(50) DEFAULT 'Pending';
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "publications"
      ADD COLUMN IF NOT EXISTS "lastCitationRefreshAt" TIMESTAMP WITH TIME ZONE;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "publications"
      ADD COLUMN IF NOT EXISTS "nextCitationRefreshAt" TIMESTAMP WITH TIME ZONE;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "publications"
      ADD COLUMN IF NOT EXISTS "citationError" TEXT;
    `);

    // 2. Add performance indexes for Scopus EID, citationStatus, and weekly scheduler queries
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_publications_scopus_eid" ON "publications" ("scopusEid");
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_publications_citation_status" ON "publications" ("citationStatus");
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_publications_next_citation_refresh" ON "publications" ("nextCitationRefreshAt");
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "idx_publications_scopus_eid";
      DROP INDEX IF EXISTS "idx_publications_citation_status";
      DROP INDEX IF EXISTS "idx_publications_next_citation_refresh";
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "publications"
      DROP COLUMN IF EXISTS "scopusEid",
      DROP COLUMN IF EXISTS "scopusDocId",
      DROP COLUMN IF EXISTS "scopusUrl",
      DROP COLUMN IF EXISTS "scopusCitedByUrl",
      DROP COLUMN IF EXISTS "citationMatchMethod",
      DROP COLUMN IF EXISTS "citationStatus",
      DROP COLUMN IF EXISTS "lastCitationRefreshAt",
      DROP COLUMN IF EXISTS "nextCitationRefreshAt",
      DROP COLUMN IF EXISTS "citationError";
    `);
  }
};

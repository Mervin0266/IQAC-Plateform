'use strict';

/**
 * Migration: Add Scopus CiteScore Quartile fields to publications table
 * and create scopus_sources cache table.
 *
 * Additive, non-destructive, safe migration.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add Scopus CiteScore enrichment columns to publications table
    await queryInterface.sequelize.query(`
      ALTER TABLE "publications"
      ADD COLUMN IF NOT EXISTS "quartile" VARCHAR(10);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "publications"
      ADD COLUMN IF NOT EXISTS "quartileStatus" VARCHAR(50) DEFAULT 'Pending';
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "publications"
      ADD COLUMN IF NOT EXISTS "scopusSourceId" VARCHAR(50);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "publications"
      ADD COLUMN IF NOT EXISTS "citeScoreYear" INTEGER;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "publications"
      ADD COLUMN IF NOT EXISTS "citeScoreValue" DECIMAL(6, 2);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "publications"
      ADD COLUMN IF NOT EXISTS "scopusEnrichment" JSONB;
    `);

    // 2. Add performance index on quartile and quartileStatus
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_publications_quartile" ON "publications" ("quartile");
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_publications_quartile_status" ON "publications" ("quartileStatus");
    `);

    // 3. Create scopus_sources cache table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "scopus_sources" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "issn" VARCHAR(20),
        "eIssn" VARCHAR(20),
        "sourceTitle" TEXT NOT NULL,
        "scopusSourceId" VARCHAR(50),
        "citeScoresByYear" JSONB DEFAULT '{}'::jsonb,
        "lastFetchedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_scopus_sources_issn" ON "scopus_sources" ("issn");
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_scopus_sources_eissn" ON "scopus_sources" ("eIssn");
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_scopus_sources_title" ON "scopus_sources" (LOWER("sourceTitle"));
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Non-destructive: down migration can safely remove indexes and columns if explicitly rolled back
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS "scopus_sources";
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE "publications"
      DROP COLUMN IF EXISTS "quartile",
      DROP COLUMN IF EXISTS "quartileStatus",
      DROP COLUMN IF EXISTS "scopusSourceId",
      DROP COLUMN IF EXISTS "citeScoreYear",
      DROP COLUMN IF EXISTS "citeScoreValue",
      DROP COLUMN IF EXISTS "scopusEnrichment";
    `);
  }
};

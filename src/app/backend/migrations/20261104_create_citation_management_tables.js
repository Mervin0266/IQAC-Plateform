'use strict';

/**
 * Migration: Create citation_import_batches, publication_citation_snapshots, and citation_yearly_details tables
 * 
 * Establishes additive storage for citation overview reports, publication snapshots,
 * and dynamic year-wise citation breakdown.
 * Preserves all existing publication and faculty data.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. citation_import_batches
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "citation_import_batches" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "filename" VARCHAR(500) NOT NULL,
        "fileChecksum" VARCHAR(64),
        "fileFormat" VARCHAR(20) NOT NULL DEFAULT 'csv',
        "employeeId" VARCHAR(50) NOT NULL,
        "facultyId" UUID REFERENCES "faculties"("id") ON DELETE SET NULL,
        "facultyName" VARCHAR(255),
        "department" VARCHAR(255),
        "uploadedBy" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "sourceType" VARCHAR(100) DEFAULT 'Scopus Citation Overview',
        "totalRecords" INTEGER DEFAULT 0,
        "matchedRecords" INTEGER DEFAULT 0,
        "needsReviewRecords" INTEGER DEFAULT 0,
        "notFoundRecords" INTEGER DEFAULT 0,
        "duplicateRecords" INTEGER DEFAULT 0,
        "updatedRecords" INTEGER DEFAULT 0,
        "status" VARCHAR(50) DEFAULT 'completed',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_citation_batches_employeeId"
      ON "citation_import_batches" ("employeeId");
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_citation_batches_uploadedBy"
      ON "citation_import_batches" ("uploadedBy");
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_citation_batches_fileChecksum"
      ON "citation_import_batches" ("fileChecksum");
    `);

    // 2. publication_citation_snapshots
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "publication_citation_snapshots" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "publicationId" UUID NOT NULL REFERENCES "publications"("id") ON DELETE CASCADE,
        "importBatchId" UUID REFERENCES "citation_import_batches"("id") ON DELETE SET NULL,
        "sourceFile" VARCHAR(500) NOT NULL,
        "employeeId" VARCHAR(50) NOT NULL,
        "facultyName" VARCHAR(255),
        "citationSource" VARCHAR(100) DEFAULT 'Scopus',
        "reportedTotal" INTEGER NOT NULL,
        "previousTotal" INTEGER,
        "reconciliationStatus" VARCHAR(50) DEFAULT 'reconciled',
        "approvalStatus" VARCHAR(50) DEFAULT 'approved',
        "reportDate" DATE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_citation_snapshots_pubId"
      ON "publication_citation_snapshots" ("publicationId");
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_citation_snapshots_importBatchId"
      ON "publication_citation_snapshots" ("importBatchId");
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_citation_snapshots_employeeId"
      ON "publication_citation_snapshots" ("employeeId");
    `);

    // 3. citation_yearly_details
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "citation_yearly_details" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "snapshotId" UUID NOT NULL REFERENCES "publication_citation_snapshots"("id") ON DELETE CASCADE,
        "period" VARCHAR(50) NOT NULL,
        "citationCount" INTEGER,
        "periodType" VARCHAR(50) NOT NULL DEFAULT 'year',
        "status" VARCHAR(50) DEFAULT 'known',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_citation_yearly_snapshotId"
      ON "citation_yearly_details" ("snapshotId");
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_citation_yearly_period"
      ON "citation_yearly_details" ("period");
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS "citation_yearly_details" CASCADE;
      DROP TABLE IF EXISTS "publication_citation_snapshots" CASCADE;
      DROP TABLE IF EXISTS "citation_import_batches" CASCADE;
    `);
  }
};


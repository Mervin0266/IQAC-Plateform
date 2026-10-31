'use strict';

/**
 * Migration: Add Consultancy Project Status, Agency details, Consultancy Start Year,
 * Dates & Duration, Financial tracking, and Consultancy Documents table.
 * 
 * Safe, additive, non-destructive migration.
 * Preserves all existing data in consultancy_projects table (including year, sponsoringAgency, status, revenueInLakhs).
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add new columns to consultancy_projects table if not existing
    await queryInterface.sequelize.query(`
      ALTER TABLE "consultancy_projects" 
      ADD COLUMN IF NOT EXISTS "projectStatus" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "agencyName" VARCHAR(500),
      ADD COLUMN IF NOT EXISTS "agencyContactEmail" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "agencyContactNumber" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "consultancyStartYear" INTEGER,
      ADD COLUMN IF NOT EXISTS "startDate" DATE,
      ADD COLUMN IF NOT EXISTS "expectedEndDate" DATE,
      ADD COLUMN IF NOT EXISTS "actualCompletionDate" DATE,
      ADD COLUMN IF NOT EXISTS "contractValueInLakhs" DECIMAL(15, 2),
      ADD COLUMN IF NOT EXISTS "amountReceivedInLakhs" DECIMAL(15, 2),
      ADD COLUMN IF NOT EXISTS "description" TEXT;
    `);

    // 2. Create indexes on consultancy_projects
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "consultancy_projects_start_year_idx" 
      ON "consultancy_projects" ("consultancyStartYear");

      CREATE INDEX IF NOT EXISTS "consultancy_projects_project_status_idx" 
      ON "consultancy_projects" ("projectStatus");
    `);

    // 3. Safe historical backfills (Preserve original fields without guessing)
    // 3a. Derive consultancyStartYear from valid startDate when available
    await queryInterface.sequelize.query(`
      UPDATE "consultancy_projects" 
      SET "consultancyStartYear" = CAST(EXTRACT(YEAR FROM "startDate") AS INTEGER) 
      WHERE "startDate" IS NOT NULL AND "consultancyStartYear" IS NULL;
    `);

    // 3b. Backfill agencyName from sponsoringAgency where agencyName is null
    await queryInterface.sequelize.query(`
      UPDATE "consultancy_projects" 
      SET "agencyName" = "sponsoringAgency" 
      WHERE "agencyName" IS NULL AND "sponsoringAgency" IS NOT NULL;
    `);

    // 4. Create consultancy_documents table if it does not exist
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "consultancy_documents" (
        "id" UUID PRIMARY KEY,
        "projectId" UUID NOT NULL REFERENCES "consultancy_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "documentCategory" VARCHAR(50) NOT NULL DEFAULT 'agreement_work_order',
        "sourceType" VARCHAR(50) NOT NULL DEFAULT 'drive_link',
        "driveFileId" VARCHAR(255),
        "driveFolderId" VARCHAR(255),
        "driveUrl" TEXT NOT NULL,
        "fileName" VARCHAR(500) NOT NULL,
        "mimeType" VARCHAR(100),
        "fileSize" BIGINT,
        "uploadedBy" UUID REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "accessStatus" VARCHAR(50) DEFAULT 'active',
        "accessRemarks" TEXT,
        "isActive" BOOLEAN DEFAULT TRUE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Create indexes on consultancy_documents
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "consultancy_docs_project_id_idx" 
      ON "consultancy_documents" ("projectId");

      CREATE INDEX IF NOT EXISTS "consultancy_docs_category_idx" 
      ON "consultancy_documents" ("documentCategory");

      CREATE INDEX IF NOT EXISTS "consultancy_docs_source_type_idx" 
      ON "consultancy_documents" ("sourceType");

      CREATE INDEX IF NOT EXISTS "consultancy_docs_uploaded_by_idx" 
      ON "consultancy_documents" ("uploadedBy");

      CREATE INDEX IF NOT EXISTS "consultancy_docs_is_active_idx" 
      ON "consultancy_documents" ("isActive");
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Reversible rollback
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS "consultancy_documents" CASCADE;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "consultancy_projects"
      DROP COLUMN IF EXISTS "projectStatus",
      DROP COLUMN IF EXISTS "agencyName",
      DROP COLUMN IF EXISTS "agencyContactEmail",
      DROP COLUMN IF EXISTS "agencyContactNumber",
      DROP COLUMN IF EXISTS "consultancyStartYear",
      DROP COLUMN IF EXISTS "startDate",
      DROP COLUMN IF EXISTS "expectedEndDate",
      DROP COLUMN IF EXISTS "actualCompletionDate",
      DROP COLUMN IF EXISTS "contractValueInLakhs",
      DROP COLUMN IF EXISTS "amountReceivedInLakhs",
      DROP COLUMN IF EXISTS "description";
    `);
  }
};

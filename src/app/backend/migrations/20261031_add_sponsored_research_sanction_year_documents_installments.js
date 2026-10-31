'use strict';

/**
 * Migration: Add sanctionYear to sponsored_projects and create
 * sponsored_research_documents and sponsored_research_installments tables.
 * 
 * Safe, additive, non-destructive migration.
 * Preserves all existing data in sponsored_projects table (including academicYear and status).
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add sanctionYear to sponsored_projects table if it does not already exist
    await queryInterface.sequelize.query(`
      ALTER TABLE "sponsored_projects" 
      ADD COLUMN IF NOT EXISTS "sanctionYear" INTEGER;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "sponsored_projects_sanction_year_idx" 
      ON "sponsored_projects" ("sanctionYear");
    `);

    // Backfill sanctionYear from valid sanctionDate (never guess or overwrite historical academicYear)
    await queryInterface.sequelize.query(`
      UPDATE "sponsored_projects" 
      SET "sanctionYear" = CAST(EXTRACT(YEAR FROM "sanctionDate") AS INTEGER) 
      WHERE "sanctionDate" IS NOT NULL AND "sanctionYear" IS NULL;
    `);

    // 2. Create sponsored_research_documents table if it does not exist
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "sponsored_research_documents" (
        "id" UUID PRIMARY KEY,
        "projectId" UUID NOT NULL REFERENCES "sponsored_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "documentCategory" VARCHAR(50) NOT NULL DEFAULT 'agreement_letter',
        "sourceType" VARCHAR(50) NOT NULL DEFAULT 'drive_link',
        "driveFileId" VARCHAR(255),
        "driveFolderId" VARCHAR(255),
        "driveUrl" TEXT NOT NULL,
        "fileName" VARCHAR(500) NOT NULL,
        "mimeType" VARCHAR(100),
        "fileSize" BIGINT,
        "uploadedBy" UUID REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "uploadedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "accessStatus" VARCHAR(50) DEFAULT 'pending_verification',
        "accessRemarks" TEXT,
        "isActive" BOOLEAN DEFAULT TRUE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create indexes on sponsored_research_documents
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "sponsored_docs_project_id_idx" 
      ON "sponsored_research_documents" ("projectId");

      CREATE INDEX IF NOT EXISTS "sponsored_docs_category_idx" 
      ON "sponsored_research_documents" ("documentCategory");

      CREATE INDEX IF NOT EXISTS "sponsored_docs_source_type_idx" 
      ON "sponsored_research_documents" ("sourceType");

      CREATE INDEX IF NOT EXISTS "sponsored_docs_uploaded_by_idx" 
      ON "sponsored_research_documents" ("uploadedBy");

      CREATE INDEX IF NOT EXISTS "sponsored_docs_is_active_idx" 
      ON "sponsored_research_documents" ("isActive");
    `);

    // 4. Create sponsored_research_installments table if it does not exist
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "sponsored_research_installments" (
        "id" UUID PRIMARY KEY,
        "projectId" UUID NOT NULL REFERENCES "sponsored_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "installmentNumber" INTEGER,
        "paymentDate" DATE,
        "amount" DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        "paymentReference" VARCHAR(255),
        "notes" TEXT,
        "createdBy" UUID REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Create indexes on sponsored_research_installments
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "sponsored_installments_project_id_idx" 
      ON "sponsored_research_installments" ("projectId");

      CREATE INDEX IF NOT EXISTS "sponsored_installments_payment_date_idx" 
      ON "sponsored_research_installments" ("paymentDate");
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Reversible rollback
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS "sponsored_research_installments" CASCADE;
      DROP TABLE IF EXISTS "sponsored_research_documents" CASCADE;
      DROP INDEX IF EXISTS "sponsored_projects_sanction_year_idx";
      ALTER TABLE "sponsored_projects" DROP COLUMN IF EXISTS "sanctionYear";
    `);
  }
};

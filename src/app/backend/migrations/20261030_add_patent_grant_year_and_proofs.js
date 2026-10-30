'use strict';

/**
 * Migration: Add grantYear to patents and create patent_proofs table.
 * 
 * Safe, additive, non-destructive migration.
 * Preserves all existing data in patents table (including academicYear).
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add grantYear to patents table if it does not already exist
    await queryInterface.sequelize.query(`
      ALTER TABLE "patents" 
      ADD COLUMN IF NOT EXISTS "grantYear" INTEGER;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "patents_grant_year_idx" 
      ON "patents" ("grantYear");
    `);

    // 2. Create patent_proofs table if it does not exist
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "patent_proofs" (
        "id" UUID PRIMARY KEY,
        "patentId" UUID NOT NULL REFERENCES "patents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
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

    // 3. Create indexes on patent_proofs
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "patent_proofs_patent_id_idx" 
      ON "patent_proofs" ("patentId");

      CREATE INDEX IF NOT EXISTS "patent_proofs_source_type_idx" 
      ON "patent_proofs" ("sourceType");

      CREATE INDEX IF NOT EXISTS "patent_proofs_uploaded_by_idx" 
      ON "patent_proofs" ("uploadedBy");

      CREATE INDEX IF NOT EXISTS "patent_proofs_is_active_idx" 
      ON "patent_proofs" ("isActive");
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Reversible rollback
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS "patent_proofs" CASCADE;
      DROP INDEX IF EXISTS "patents_grant_year_idx";
      ALTER TABLE "patents" DROP COLUMN IF EXISTS "grantYear";
    `);
  }
};


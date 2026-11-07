'use strict';

/**
 * Migration: Add Placement & Internship V2.1 fields and make package column nullable.
 * 
 * Safe, additive, non-destructive migration.
 * Preserves all existing records in placements table.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Make package nullable to support optional Internship stipends
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE "placements" 
        ALTER COLUMN "package" DROP NOT NULL;
      `);
    } catch (err) {
      console.warn('Note: Could not alter package nullability (may already be nullable):', err.message);
    }

    // 2. Add offer letter and academic hierarchy scope columns if not already existing
    await queryInterface.sequelize.query(`
      ALTER TABLE "placements" 
      ADD COLUMN IF NOT EXISTS "offerLetterUrl" TEXT,
      ADD COLUMN IF NOT EXISTS "offerLetterFileName" VARCHAR(500),
      ADD COLUMN IF NOT EXISTS "offerLetterDriveId" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "campus" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "school" VARCHAR(255);
    `);

    // 3. Create indexes for performance and fast lookups
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "placements_student_id_batch_idx" 
      ON "placements" ("studentId", "batch");

      CREATE INDEX IF NOT EXISTS "placements_placement_type_idx" 
      ON "placements" ("placementType");
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "placements_placement_type_idx";
      DROP INDEX IF EXISTS "placements_student_id_batch_idx";
      ALTER TABLE "placements" 
      DROP COLUMN IF EXISTS "offerLetterUrl",
      DROP COLUMN IF EXISTS "offerLetterFileName",
      DROP COLUMN IF EXISTS "offerLetterDriveId",
      DROP COLUMN IF EXISTS "campus",
      DROP COLUMN IF EXISTS "school";
    `);
  }
};


'use strict';

/**
 * Migration: Add publicationYear to patents table and backfill from publishedDate.
 * 
 * Non-destructive, reversible migration:
 * 1. Adds "publicationYear" INTEGER column to "patents".
 * 2. Creates index on "patents"("publicationYear").
 * 3. Ensures "academicYear" column is nullable so operational dependency is removed.
 * 4. Backfills "publicationYear" from valid "publishedDate" values strictly.
 *    - Records with valid publishedDate: derives 4-digit calendar year.
 *    - Records with missing/null publishedDate: leaves publicationYear NULL.
 *    - Preserves all existing academicYear values without deletion.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add publicationYear column to patents table if not exists
    await queryInterface.sequelize.query(`
      ALTER TABLE "patents" 
      ADD COLUMN IF NOT EXISTS "publicationYear" INTEGER;
    `);

    // 2. Create index on publicationYear
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "patents_publication_year_idx" 
      ON "patents" ("publicationYear");
    `);

    // 3. Ensure academicYear allows NULL so new records are not blocked
    await queryInterface.sequelize.query(`
      ALTER TABLE "patents" 
      ALTER COLUMN "academicYear" DROP NOT NULL;
    `);

    // 4. Safely backfill publicationYear strictly from publishedDate
    await queryInterface.sequelize.query(`
      UPDATE "patents"
      SET "publicationYear" = EXTRACT(YEAR FROM "publishedDate")::INTEGER
      WHERE "publishedDate" IS NOT NULL
        AND ("publicationYear" IS NULL OR "publicationYear" != EXTRACT(YEAR FROM "publishedDate")::INTEGER);
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "patents_publication_year_idx";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "patents" 
      DROP COLUMN IF EXISTS "publicationYear";
    `);
  }
};


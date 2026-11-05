'use strict';

/**
 * Migration: Add authorFullNames, publicationYear, publisher, isbn, coden to publications table.
 * Make academicYear and citationCount nullable without default fabricated values.
 * 
 * Safe, additive, non-destructive migration.
 * Preserves all existing data in publications table (including academicYear and citationCount).
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add new columns to publications table if they do not already exist
    await queryInterface.sequelize.query(`
      ALTER TABLE "publications" 
      ADD COLUMN IF NOT EXISTS "authorFullNames" TEXT;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "publications" 
      ADD COLUMN IF NOT EXISTS "publicationYear" VARCHAR(10);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "publications" 
      ADD COLUMN IF NOT EXISTS "publisher" VARCHAR(500);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "publications" 
      ADD COLUMN IF NOT EXISTS "isbn" VARCHAR(100);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "publications" 
      ADD COLUMN IF NOT EXISTS "coden" VARCHAR(100);
    `);

    // 2. Make academicYear nullable and drop default to avoid fabricating academic year ranges
    await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE "publications" ALTER COLUMN "academicYear" DROP NOT NULL;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        BEGIN
          ALTER TABLE "publications" ALTER COLUMN "academicYear" DROP DEFAULT;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END $$;
    `);

    // 3. Make citationCount nullable and drop default 0
    await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE "publications" ALTER COLUMN "citationCount" DROP NOT NULL;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
        BEGIN
          ALTER TABLE "publications" ALTER COLUMN "citationCount" DROP DEFAULT;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
      END $$;
    `);

    // 4. Create indexes if not exists
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "publications_publication_year_idx" 
      ON "publications" ("publicationYear");
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "publications_doi_idx" 
      ON "publications" ("doi");
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Safe, non-destructive down migration
  }
};


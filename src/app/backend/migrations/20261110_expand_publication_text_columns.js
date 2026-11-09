'use strict';

/**
 * Migration: Expand publication and publication_faculty string columns to TEXT.
 * 
 * Prevents PostgreSQL 'value too long for type character varying(255)' errors
 * during bulk uploads of Scopus and Web of Science exports, which commonly contain:
 * - Long conference proceeding titles (e.g. 250+ characters)
 * - Complex publisher strings with office addresses
 * - Lengthy DOIs, composite ISBNs, volumes, and page numbers
 * 
 * Safe, additive, non-destructive migration preserving all existing data.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Expand publication fields to TEXT
    await queryInterface.sequelize.query(`
      ALTER TABLE "publications" 
        ALTER COLUMN "journalName" TYPE TEXT,
        ALTER COLUMN "publisher" TYPE TEXT,
        ALTER COLUMN "doi" TYPE TEXT,
        ALTER COLUMN "volume" TYPE TEXT,
        ALTER COLUMN "issue" TYPE TEXT,
        ALTER COLUMN "pageNumber" TYPE TEXT,
        ALTER COLUMN "isbn" TYPE TEXT,
        ALTER COLUMN "coden" TYPE TEXT,
        ALTER COLUMN "issn" TYPE TEXT;
    `);

    // 2. Expand publication_faculties fields to TEXT
    await queryInterface.sequelize.query(`
      ALTER TABLE "publication_faculties"
        ALTER COLUMN "sourceFile" TYPE TEXT,
        ALTER COLUMN "facultyName" TYPE TEXT,
        ALTER COLUMN "department" TYPE TEXT;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Non-destructive down migration: columns remain compatible
  }
};


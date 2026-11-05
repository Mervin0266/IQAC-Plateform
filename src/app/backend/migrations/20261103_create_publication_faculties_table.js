'use strict';

/**
 * Migration: Create publication_faculties table
 * 
 * Establishes additive association between publications and verified faculty members.
 * Enforces uniqueness on (publicationId, employeeId).
 * Preserves all existing publication and faculty data.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "publication_faculties" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "publicationId" UUID NOT NULL REFERENCES "publications"("id") ON DELETE CASCADE,
        "facultyId" UUID REFERENCES "faculties"("id") ON DELETE SET NULL,
        "employeeId" VARCHAR(50) NOT NULL,
        "facultyName" VARCHAR(255),
        "department" VARCHAR(255) NOT NULL,
        "sourceFile" VARCHAR(500),
        "indexing" VARCHAR(100) DEFAULT 'Scopus',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_publication_faculties_pub_emp_unique"
      ON "publication_faculties" ("publicationId", "employeeId");
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_publication_faculties_employeeId"
      ON "publication_faculties" ("employeeId");
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_publication_faculties_department"
      ON "publication_faculties" ("department");
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_publication_faculties_publicationId"
      ON "publication_faculties" ("publicationId");
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS "publication_faculties" CASCADE;
    `);
  }
};


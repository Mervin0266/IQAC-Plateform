'use strict';

/**
 * Migration: Add multi-inventor columns to patents and create patent_faculties table
 *
 * Additive, idempotent schema update for IPRs -> Patents.
 * Enables multiple internal faculty associations, external inventors, and department attribution.
 * Preserves existing Patents, Copyrights, and all other operational data.
 *
 * Rollback: DROP TABLE IF EXISTS "patent_faculties" CASCADE;
 */
module.exports = {
  up: async (queryInterface) => {
    try {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    } catch (_) {}

    // Add multi-inventor and external-inventor columns to patents table safely
    await queryInterface.sequelize.query(`
      ALTER TABLE "patents"
      ADD COLUMN IF NOT EXISTS "empIdsRaw" TEXT,
      ADD COLUMN IF NOT EXISTS "hasInvalidEmpIds" BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "invalidEmpIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS "duplicateEmpIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS "externalInventors" JSONB NOT NULL DEFAULT '[]'::jsonb;
    `);

    // Create relational junction table patent_faculties
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "patent_faculties" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "patentId" UUID NOT NULL REFERENCES "patents"("id") ON DELETE CASCADE,
        "facultyId" UUID REFERENCES "faculties"("id") ON DELETE SET NULL,
        "employeeId" VARCHAR(64) NOT NULL,
        "normalizedEmployeeId" VARCHAR(64) NOT NULL,
        "facultyName" TEXT,
        "designation" VARCHAR(255),
        "originalDepartment" VARCHAR(255),
        "originalDepartmentSource" VARCHAR(50) NOT NULL DEFAULT 'creation_snapshot',
        "isValid" BOOLEAN NOT NULL DEFAULT TRUE,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Create indexes for query performance and data integrity
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_patent_faculties_pat_emp_unique"
      ON "patent_faculties" ("patentId", "normalizedEmployeeId");
    `);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_patent_faculties_patentId" ON "patent_faculties" ("patentId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_patent_faculties_facultyId" ON "patent_faculties" ("facultyId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_patent_faculties_employeeId" ON "patent_faculties" ("employeeId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_patent_faculties_normalizedEmpId" ON "patent_faculties" ("normalizedEmployeeId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_patent_faculties_originalDept" ON "patent_faculties" ("originalDepartment");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_patent_faculties_isValid" ON "patent_faculties" ("isValid");`);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "patent_faculties" CASCADE;`);
    await queryInterface.sequelize.query(`
      ALTER TABLE "patents"
      DROP COLUMN IF EXISTS "empIdsRaw",
      DROP COLUMN IF EXISTS "hasInvalidEmpIds",
      DROP COLUMN IF EXISTS "invalidEmpIds",
      DROP COLUMN IF EXISTS "duplicateEmpIds",
      DROP COLUMN IF EXISTS "externalInventors";
    `);
  }
};


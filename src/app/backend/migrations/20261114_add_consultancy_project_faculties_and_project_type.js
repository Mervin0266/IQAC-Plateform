'use strict';

/**
 * Migration: Add multi-faculty, projectType, and consultancy_project_faculties table
 *
 * Additive, idempotent schema update for Research & Innovation -> Consultancy Projects.
 * Enables multiple internal faculty owners, Project Type filtering, and automatic year derivation.
 * Preserves existing Consultancy records, finance values, document links, and operational data.
 *
 * Rollback: DROP TABLE IF EXISTS "consultancy_project_faculties" CASCADE;
 */
module.exports = {
  up: async (queryInterface) => {
    try {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    } catch (_) {}

    // Add multi-faculty, projectType, and tracking columns to consultancy_projects safely
    await queryInterface.sequelize.query(`
      ALTER TABLE "consultancy_projects"
      ADD COLUMN IF NOT EXISTS "projectType" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "otherProjectTypeDescription" VARCHAR(500),
      ADD COLUMN IF NOT EXISTS "empIdsRaw" TEXT,
      ADD COLUMN IF NOT EXISTS "hasInvalidEmpIds" BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "invalidEmpIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS "duplicateEmpIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS "externalCollaborators" JSONB NOT NULL DEFAULT '[]'::jsonb;
    `);

    // Ensure teacherConsultant allows NULL for EmpId-based multi-faculty projects
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE "consultancy_projects" ALTER COLUMN "teacherConsultant" DROP NOT NULL;
      `);
    } catch (_) {}

    // Create relational junction table consultancy_project_faculties
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "consultancy_project_faculties" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "projectId" UUID NOT NULL REFERENCES "consultancy_projects"("id") ON DELETE CASCADE,
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
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_consultancy_faculties_proj_emp_unique"
      ON "consultancy_project_faculties" ("projectId", "normalizedEmployeeId");
    `);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_consultancy_faculties_projectId" ON "consultancy_project_faculties" ("projectId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_consultancy_faculties_facultyId" ON "consultancy_project_faculties" ("facultyId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_consultancy_faculties_employeeId" ON "consultancy_project_faculties" ("employeeId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_consultancy_faculties_normalizedEmpId" ON "consultancy_project_faculties" ("normalizedEmployeeId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_consultancy_faculties_originalDept" ON "consultancy_project_faculties" ("originalDepartment");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_consultancy_faculties_isValid" ON "consultancy_project_faculties" ("isValid");`);

    // Backfill consultancyStartYear from startDate where startDate is valid
    try {
      await queryInterface.sequelize.query(`
        UPDATE "consultancy_projects"
        SET "consultancyStartYear" = EXTRACT(YEAR FROM "startDate")
        WHERE "startDate" IS NOT NULL
          AND ("consultancyStartYear" IS NULL OR "consultancyStartYear" != EXTRACT(YEAR FROM "startDate"));
      `);
    } catch (_) {}
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "consultancy_project_faculties" CASCADE;`);
    await queryInterface.sequelize.query(`
      ALTER TABLE "consultancy_projects"
      DROP COLUMN IF EXISTS "projectType",
      DROP COLUMN IF EXISTS "otherProjectTypeDescription",
      DROP COLUMN IF EXISTS "empIdsRaw",
      DROP COLUMN IF EXISTS "hasInvalidEmpIds",
      DROP COLUMN IF EXISTS "invalidEmpIds",
      DROP COLUMN IF EXISTS "duplicateEmpIds",
      DROP COLUMN IF EXISTS "externalCollaborators";
    `);
  }
};

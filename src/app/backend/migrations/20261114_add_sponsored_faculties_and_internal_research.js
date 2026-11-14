'use strict';

/**
 * Migration: Add multi-investigator support to sponsored_projects and create internal_research tables
 *
 * Additive, idempotent schema update for:
 * 1. Research & Innovation -> Sponsored Research & Grants -> External Research
 *    - sponsored_project_faculties junction table (PI / Co-PI roles)
 *    - Multi-investigator EmpId columns on sponsored_projects
 * 2. Research & Innovation -> Sponsored Research & Grants -> Internal Research
 *    - internal_research_projects table
 *    - internal_research_faculties junction table
 *
 * Preserves all existing sponsored research records, document links, finance values, and operational data.
 */
module.exports = {
  up: async (queryInterface) => {
    try {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    } catch (_) {}

    // 1. Add multi-investigator tracking columns to existing sponsored_projects table
    await queryInterface.sequelize.query(`
      ALTER TABLE "sponsored_projects"
      ADD COLUMN IF NOT EXISTS "empIdsRaw" TEXT,
      ADD COLUMN IF NOT EXISTS "hasInvalidEmpIds" BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "invalidEmpIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS "duplicateEmpIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS "unresolvedPI" BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "externalCollaborators" JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS "duration" VARCHAR(100);
    `);

    // Ensure principalInvestigator allows NULL in schema if needed for EmpId-based multi-investigators
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE "sponsored_projects" ALTER COLUMN "principalInvestigator" DROP NOT NULL;
      `);
    } catch (_) {}

    // 2. Create relational junction table sponsored_project_faculties
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "sponsored_project_faculties" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "projectId" UUID NOT NULL REFERENCES "sponsored_projects"("id") ON DELETE CASCADE,
        "facultyId" UUID REFERENCES "faculties"("id") ON DELETE SET NULL,
        "employeeId" VARCHAR(64) NOT NULL,
        "normalizedEmployeeId" VARCHAR(64) NOT NULL,
        "role" VARCHAR(20) NOT NULL DEFAULT 'PI',
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

    // Indexes for sponsored_project_faculties
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_sponsored_faculties_proj_emp_unique"
      ON "sponsored_project_faculties" ("projectId", "normalizedEmployeeId");
      
      CREATE INDEX IF NOT EXISTS "idx_sponsored_faculties_project_id"
      ON "sponsored_project_faculties" ("projectId");

      CREATE INDEX IF NOT EXISTS "idx_sponsored_faculties_faculty_id"
      ON "sponsored_project_faculties" ("facultyId");

      CREATE INDEX IF NOT EXISTS "idx_sponsored_faculties_role"
      ON "sponsored_project_faculties" ("role");

      CREATE INDEX IF NOT EXISTS "idx_sponsored_faculties_original_dept"
      ON "sponsored_project_faculties" ("originalDepartment");
    `);

    // 3. Create independent table internal_research_projects
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "internal_research_projects" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" TEXT NOT NULL,
        "seedMoney" VARCHAR(255) NOT NULL,
        "startDate" DATE NOT NULL,
        "calendarYear" INTEGER NOT NULL,
        "endDate" DATE,
        "duration" VARCHAR(100),
        "sanctionedAmount" DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        "department" VARCHAR(255),
        "proofUrl" TEXT,
        "proofDriveFileId" VARCHAR(255),
        "proofFileName" VARCHAR(500),
        "empIdsRaw" TEXT,
        "hasInvalidEmpIds" BOOLEAN NOT NULL DEFAULT FALSE,
        "invalidEmpIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "duplicateEmpIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "approvalStatus" VARCHAR(50) NOT NULL DEFAULT 'approved',
        "customFields" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdBy" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // Indexes for internal_research_projects
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_internal_research_dept"
      ON "internal_research_projects" ("department");

      CREATE INDEX IF NOT EXISTS "idx_internal_research_year"
      ON "internal_research_projects" ("calendarYear");

      CREATE INDEX IF NOT EXISTS "idx_internal_research_seed_money"
      ON "internal_research_projects" ("seedMoney");

      CREATE INDEX IF NOT EXISTS "idx_internal_research_start_date"
      ON "internal_research_projects" ("startDate");
    `);

    // 4. Create independent relational junction table internal_research_faculties
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "internal_research_faculties" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "projectId" UUID NOT NULL REFERENCES "internal_research_projects"("id") ON DELETE CASCADE,
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

    // Indexes for internal_research_faculties
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_internal_faculties_proj_emp_unique"
      ON "internal_research_faculties" ("projectId", "normalizedEmployeeId");

      CREATE INDEX IF NOT EXISTS "idx_internal_faculties_project_id"
      ON "internal_research_faculties" ("projectId");

      CREATE INDEX IF NOT EXISTS "idx_internal_faculties_faculty_id"
      ON "internal_research_faculties" ("facultyId");

      CREATE INDEX IF NOT EXISTS "idx_internal_faculties_original_dept"
      ON "internal_research_faculties" ("originalDepartment");
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS "internal_research_faculties" CASCADE;
      DROP TABLE IF EXISTS "internal_research_projects" CASCADE;
      DROP TABLE IF EXISTS "sponsored_project_faculties" CASCADE;
    `);
  }
};

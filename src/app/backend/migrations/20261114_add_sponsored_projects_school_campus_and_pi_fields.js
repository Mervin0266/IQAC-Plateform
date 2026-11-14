'use strict';

/**
 * Migration: Add school, campus, principalInvestigatorEmpId, and principalInvestigatorDepartment
 * to sponsored_projects table to fix column "school" does not exist error.
 */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "sponsored_projects"
      ADD COLUMN IF NOT EXISTS "school" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "campus" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "principalInvestigatorEmpId" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "principalInvestigatorDepartment" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "duration" VARCHAR(100);
    `);
  },

  down: async (queryInterface) => {
    try {
      await queryInterface.sequelize.query(`
        ALTER TABLE "sponsored_projects"
        DROP COLUMN IF EXISTS "school",
        DROP COLUMN IF EXISTS "campus",
        DROP COLUMN IF EXISTS "principalInvestigatorEmpId",
        DROP COLUMN IF EXISTS "principalInvestigatorDepartment";
      `);
    } catch (_) {}
  }
};

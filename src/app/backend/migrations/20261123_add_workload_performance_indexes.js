'use strict';

/**
 * Migration: Add Workload Performance Indexes for IQAC Platform
 * Adds b-tree composite and filter indexes for high-frequency institutional queries:
 * - faculties: department, employeeId, designation
 * - placements: department, batch, academicYear
 * - consultancy_projects: department, year
 * - departmental_activities: department, academicYear
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. faculties indexes
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_faculties_department" ON "faculties" ("department");
      CREATE INDEX IF NOT EXISTS "idx_faculties_employee_id" ON "faculties" ("employeeId");
      CREATE INDEX IF NOT EXISTS "idx_faculties_designation" ON "faculties" ("designation");
    `);

    // 2. placements indexes
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_placements_department" ON "placements" ("department");
      CREATE INDEX IF NOT EXISTS "idx_placements_batch" ON "placements" ("batch");
      CREATE INDEX IF NOT EXISTS "idx_placements_academic_year" ON "placements" ("academicYear");
    `);

    // 3. consultancy_projects indexes
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_consultancy_projects_department" ON "consultancy_projects" ("department");
      CREATE INDEX IF NOT EXISTS "idx_consultancy_projects_year" ON "consultancy_projects" ("year");
    `);

    // 4. departmental_activities indexes
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_departmental_activities_department" ON "departmental_activities" ("department");
      CREATE INDEX IF NOT EXISTS "idx_departmental_activities_academic_year" ON "departmental_activities" ("academicYear");
    `);

    console.log('✓ Successfully applied workload performance indexes.');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "idx_faculties_department";
      DROP INDEX IF EXISTS "idx_faculties_employee_id";
      DROP INDEX IF EXISTS "idx_faculties_designation";
      DROP INDEX IF EXISTS "idx_placements_department";
      DROP INDEX IF EXISTS "idx_placements_batch";
      DROP INDEX IF EXISTS "idx_placements_academic_year";
      DROP INDEX IF EXISTS "idx_consultancy_projects_department";
      DROP INDEX IF EXISTS "idx_consultancy_projects_year";
      DROP INDEX IF EXISTS "idx_departmental_activities_department";
      DROP INDEX IF EXISTS "idx_departmental_activities_academic_year";
    `);
    console.log('✓ Reverted workload performance indexes.');
  }
};

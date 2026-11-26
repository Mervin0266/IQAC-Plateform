'use strict';

/**
 * Migration: Add Monthly Stipend (INR) to placements table.
 * 
 * Safe, additive, non-destructive migration.
 * Preserves all existing records in placements table.
 * Existing records without stipend remain NULL (Not Provided).
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "placements" 
      ADD COLUMN IF NOT EXISTS "monthlyStipend" NUMERIC(12, 2);
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "placements" 
      DROP COLUMN IF EXISTS "monthlyStipend";
    `);
  }
};

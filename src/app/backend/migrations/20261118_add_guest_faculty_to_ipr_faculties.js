'use strict';

/**
 * Migration: Support Guest Faculty in patent_faculties and copyright_faculties
 * 
 * - Makes employeeId and normalizedEmployeeId nullable for Guest Faculty
 * - Adds isGuestFaculty (BOOLEAN DEFAULT FALSE)
 * - Adds facultyType (VARCHAR(50) DEFAULT 'Faculty')
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. patent_faculties table updates
    await queryInterface.sequelize.query(`
      ALTER TABLE "patent_faculties" ALTER COLUMN "employeeId" DROP NOT NULL;
    `).catch(() => {});

    await queryInterface.sequelize.query(`
      ALTER TABLE "patent_faculties" ALTER COLUMN "normalizedEmployeeId" DROP NOT NULL;
    `).catch(() => {});

    await queryInterface.sequelize.query(`
      ALTER TABLE "patent_faculties" ADD COLUMN IF NOT EXISTS "isGuestFaculty" BOOLEAN NOT NULL DEFAULT FALSE;
    `).catch(() => {});

    await queryInterface.sequelize.query(`
      ALTER TABLE "patent_faculties" ADD COLUMN IF NOT EXISTS "facultyType" VARCHAR(50) NOT NULL DEFAULT 'Faculty';
    `).catch(() => {});

    // 2. copyright_faculties table updates
    await queryInterface.sequelize.query(`
      ALTER TABLE "copyright_faculties" ALTER COLUMN "employeeId" DROP NOT NULL;
    `).catch(() => {});

    await queryInterface.sequelize.query(`
      ALTER TABLE "copyright_faculties" ALTER COLUMN "normalizedEmployeeId" DROP NOT NULL;
    `).catch(() => {});

    await queryInterface.sequelize.query(`
      ALTER TABLE "copyright_faculties" ADD COLUMN IF NOT EXISTS "isGuestFaculty" BOOLEAN NOT NULL DEFAULT FALSE;
    `).catch(() => {});

    await queryInterface.sequelize.query(`
      ALTER TABLE "copyright_faculties" ADD COLUMN IF NOT EXISTS "facultyType" VARCHAR(50) NOT NULL DEFAULT 'Faculty';
    `).catch(() => {});
  },

  down: async (queryInterface) => {
    // Reversible if needed
  }
};

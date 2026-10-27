'use strict';

/**
 * Migration: Establish composite identity keys and remove legacy constraints.
 * 
 * 1. Drops legacy single-field uniqueness constraints on registerNumber and employeeId.
 * 2. Adds composite uniqueness constraint on students (registerNumber, academicYear).
 * 3. Adds composite uniqueness constraint on faculties (employeeId, academicYear).
 * 4. Ensures patent schema columns have correct types and nullability without runtime DDL.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Drop legacy single-field constraints if they exist
    await queryInterface.sequelize.query(`
      ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "students_registerNumber_key" CASCADE;
      ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "students_register_number_key" CASCADE;
      DROP INDEX IF EXISTS "students_register_number_key";
      DROP INDEX IF EXISTS "students_registerNumber_key";

      ALTER TABLE "faculties" DROP CONSTRAINT IF EXISTS "faculties_employeeId_key" CASCADE;
      ALTER TABLE "faculties" DROP CONSTRAINT IF EXISTS "faculties_employee_id_key" CASCADE;
      DROP INDEX IF EXISTS "faculties_employee_id_key";
      DROP INDEX IF EXISTS "faculties_employeeId_key";
    `);

    // 2. Add composite unique index on students (registerNumber, academicYear)
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "students_register_academic_year_unique"
      ON "students" ("registerNumber", "academicYear");
    `);

    // 3. Add composite unique index on faculties (employeeId, academicYear)
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "faculties_employee_academic_year_unique"
      ON "faculties" ("employeeId", "academicYear");
    `);

    // 4. Ensure patent column types and nullability are consistent
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        BEGIN
          ALTER TABLE "patents" ALTER COLUMN "status" TYPE VARCHAR(100) USING "status"::text;
          ALTER TABLE "patents" ALTER COLUMN "patentType" TYPE VARCHAR(100) USING "patentType"::text;
          ALTER TABLE "patents" ALTER COLUMN "academicYear" TYPE VARCHAR(50) USING "academicYear"::text;
          ALTER TABLE "patents" ALTER COLUMN "department" TYPE VARCHAR(255) USING "department"::text;
          ALTER TABLE "patents" ALTER COLUMN "approvalStatus" TYPE VARCHAR(50) USING "approvalStatus"::text;
          ALTER TABLE "patents" ALTER COLUMN "inventors" TYPE TEXT;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;

        BEGIN
          ALTER TABLE "patents" ALTER COLUMN "status" DROP NOT NULL;
          ALTER TABLE "patents" ALTER COLUMN "patentType" DROP NOT NULL;
          ALTER TABLE "patents" ALTER COLUMN "academicYear" DROP NOT NULL;
          ALTER TABLE "patents" ALTER COLUMN "department" DROP NOT NULL;
          ALTER TABLE "patents" ALTER COLUMN "createdBy" DROP NOT NULL;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END $$;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "students_register_academic_year_unique";
      DROP INDEX IF EXISTS "faculties_employee_academic_year_unique";
    `);
  }
};

// Allow direct execution via: node src/app/backend/migrations/20261019_add_composite_identity_keys.js
if (require.main === module) {
  const { sequelize } = require('../config/database');
  console.log('Applying migration: 20261019_add_composite_identity_keys...');
  module.exports.up(sequelize.getQueryInterface(), sequelize.constructor)
    .then(() => {
      console.log('✓ Migration applied successfully.');
      return sequelize.close();
    })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('✗ Migration failed:', err.message);
      process.exit(1);
    });
}

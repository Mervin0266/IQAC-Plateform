'use strict';

/**
 * Migration: Add permanentCountry to students, extended profile fields to faculties,
 * academicYear to placements, and create exchange_rates table for Research & Innovation currency conversions.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Students: add permanentCountry
    await queryInterface.sequelize.query(`
      ALTER TABLE "students"
      ADD COLUMN IF NOT EXISTS "permanentCountry" VARCHAR(100);
    `);

    // 2. Faculties: add specified missing profile fields
    await queryInterface.sequelize.query(`
      ALTER TABLE "faculties"
      ADD COLUMN IF NOT EXISTS "nationality" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "permanentCity" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "permanentState" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "permanentCountry" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "officialEmailId" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "totalCurrentExpYears" VARCHAR(10) DEFAULT '0',
      ADD COLUMN IF NOT EXISTS "totalCurrentExpMonths" VARCHAR(10) DEFAULT '0',
      ADD COLUMN IF NOT EXISTS "age" INTEGER;
    `);

    // 3. Placements: add academicYear and backfill from batch
    await queryInterface.sequelize.query(`
      ALTER TABLE "placements"
      ADD COLUMN IF NOT EXISTS "academicYear" VARCHAR(50);

      UPDATE "placements"
      SET "academicYear" = "batch"
      WHERE "academicYear" IS NULL AND "batch" IS NOT NULL;
    `);

    // 4. Exchange Rates table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "exchange_rates" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "baseCurrency" VARCHAR(10) NOT NULL DEFAULT 'USD',
        "targetCurrency" VARCHAR(10) NOT NULL DEFAULT 'INR',
        "rate" NUMERIC(14, 6) NOT NULL,
        "effectiveDate" DATE NOT NULL,
        "source" VARCHAR(100) NOT NULL DEFAULT 'system_reference',
        "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
        "updatedBy" VARCHAR(100),
        "notes" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS "idx_exchange_rates_currencies_date"
      ON "exchange_rates" ("baseCurrency", "targetCurrency", "effectiveDate");

      -- Seed an initial baseline rate if table is empty
      INSERT INTO "exchange_rates" ("id", "baseCurrency", "targetCurrency", "rate", "effectiveDate", "source", "isManualOverride", "createdAt", "updatedAt")
      SELECT gen_random_uuid(), 'USD', 'INR', 86.850000, CURRENT_DATE, 'system_reference', false, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM "exchange_rates");
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "students" DROP COLUMN IF EXISTS "permanentCountry";
      ALTER TABLE "faculties" 
        DROP COLUMN IF EXISTS "nationality",
        DROP COLUMN IF EXISTS "permanentCity",
        DROP COLUMN IF EXISTS "permanentState",
        DROP COLUMN IF EXISTS "permanentCountry",
        DROP COLUMN IF EXISTS "officialEmailId",
        DROP COLUMN IF EXISTS "totalCurrentExpYears",
        DROP COLUMN IF EXISTS "totalCurrentExpMonths",
        DROP COLUMN IF EXISTS "age";
      ALTER TABLE "placements" DROP COLUMN IF EXISTS "academicYear";
      DROP TABLE IF EXISTS "exchange_rates";
    `);
  }
};

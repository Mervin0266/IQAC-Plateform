'use strict';

/**
 * Migration: Create custom_dashboards, custom_metrics, and analytics_presets tables
 * for CHRIST University Institutional Intelligence & Analytics Platform.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. custom_dashboards table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "custom_dashboards" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" VARCHAR(255) NOT NULL,
        "description" TEXT,
        "layout" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "filters" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "isDefault" BOOLEAN NOT NULL DEFAULT false,
        "isPublic" BOOLEAN NOT NULL DEFAULT false,
        "isTemplate" BOOLEAN NOT NULL DEFAULT false,
        "category" VARCHAR(100) DEFAULT 'General',
        "createdBy" UUID REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS "idx_custom_dashboards_user" ON "custom_dashboards" ("createdBy");
      CREATE INDEX IF NOT EXISTS "idx_custom_dashboards_template" ON "custom_dashboards" ("isTemplate");
    `);

    // 2. custom_metrics table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "custom_metrics" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255) NOT NULL,
        "code" VARCHAR(100),
        "description" TEXT,
        "formula" TEXT NOT NULL,
        "domain" VARCHAR(100) NOT NULL,
        "unit" VARCHAR(50),
        "format" VARCHAR(50) DEFAULT 'number',
        "isSystem" BOOLEAN NOT NULL DEFAULT false,
        "createdBy" UUID REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS "idx_custom_metrics_domain" ON "custom_metrics" ("domain");
      CREATE INDEX IF NOT EXISTS "idx_custom_metrics_user" ON "custom_metrics" ("createdBy");
    `);

    // 3. analytics_presets table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "analytics_presets" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" VARCHAR(255) NOT NULL,
        "domain" VARCHAR(100) NOT NULL,
        "config" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdBy" UUID REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS "idx_analytics_presets_domain" ON "analytics_presets" ("domain");
    `);

    // 4. Seed system custom metrics if empty
    await queryInterface.sequelize.query(`
      INSERT INTO "custom_metrics" ("id", "name", "code", "description", "formula", "domain", "unit", "format", "isSystem", "createdAt", "updatedAt")
      SELECT gen_random_uuid(), 'Publications per Faculty Member', 'PUBS_PER_FACULTY', 'Average research papers per full-time faculty member', 'total_publications / total_faculty', 'Research', 'papers/faculty', 'ratio', true, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM "custom_metrics" WHERE "code" = 'PUBS_PER_FACULTY');

      INSERT INTO "custom_metrics" ("id", "name", "code", "description", "formula", "domain", "unit", "format", "isSystem", "createdAt", "updatedAt")
      SELECT gen_random_uuid(), 'Student-to-Faculty Ratio (SFR)', 'SFR_RATIO', 'Number of enrolled students per full-time teaching faculty member', 'total_students / total_faculty', 'Academic', ':1', 'ratio', true, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM "custom_metrics" WHERE "code" = 'SFR_RATIO');

      INSERT INTO "custom_metrics" ("id", "name", "code", "description", "formula", "domain", "unit", "format", "isSystem", "createdAt", "updatedAt")
      SELECT gen_random_uuid(), 'Consultancy Inflow per Faculty', 'CONSULTANCY_PER_FACULTY', 'Total consultancy earnings generated per teaching faculty (in INR Lakhs)', 'consultancy_inflow_lakhs / total_faculty', 'Research', 'Lakhs/faculty', 'currency', true, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM "custom_metrics" WHERE "code" = 'CONSULTANCY_PER_FACULTY');

      INSERT INTO "custom_metrics" ("id", "name", "code", "description", "formula", "domain", "unit", "format", "isSystem", "createdAt", "updatedAt")
      SELECT gen_random_uuid(), 'Extramural Grants per Faculty', 'GRANTS_PER_FACULTY', 'Total extramural sponsored research grants per faculty (in INR Lakhs)', 'sponsored_grants_lakhs / total_faculty', 'Research', 'Lakhs/faculty', 'currency', true, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM "custom_metrics" WHERE "code" = 'GRANTS_PER_FACULTY');

      INSERT INTO "custom_metrics" ("id", "name", "code", "description", "formula", "domain", "unit", "format", "isSystem", "createdAt", "updatedAt")
      SELECT gen_random_uuid(), 'Verified Placement Percentage', 'PLACEMENT_PCT', 'Ratio of distinct placed students over eligible cohort', '(placed_students / eligible_students) * 100', 'Placements', '%', 'percentage', true, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM "custom_metrics" WHERE "code" = 'PLACEMENT_PCT');
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS "analytics_presets";
      DROP TABLE IF EXISTS "custom_metrics";
      DROP TABLE IF EXISTS "custom_dashboards";
    `);
  }
};

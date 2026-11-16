'use strict';

/**
 * Migration: Create awards & e_contents tables and seed master configuration
 *
 * Additive, idempotent schema creation for Achievements -> Awards & E-Contents.
 * Preserves existing Patents, Copyrights, Publications, Faculty, and all unrelated tables.
 */
module.exports = {
  up: async (queryInterface) => {
    try {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    } catch (_) {}

    // 1. Table: awards
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "awards" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "facultyId" UUID REFERENCES "faculties"("id") ON DELETE SET NULL,
        "employeeId" VARCHAR(64) NOT NULL,
        "normalizedEmployeeId" VARCHAR(64) NOT NULL,
        "facultyName" TEXT,
        "designation" VARCHAR(255),
        "department" VARCHAR(255),
        "originalDepartment" VARCHAR(255),
        "originalDepartmentSource" VARCHAR(50) DEFAULT 'creation_snapshot',
        "school" VARCHAR(255),
        "campus" VARCHAR(255),
        "nameOfRecognition" TEXT NOT NULL,
        "description" TEXT,
        "dateOfRecognition" DATE NOT NULL,
        "recognisedAgencyType" VARCHAR(150) NOT NULL,
        "recognisingAgencyName" TEXT,
        "proofUrl" TEXT,
        "calendarYear" INTEGER NOT NULL,
        "customFields" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdBy" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_awards_employeeId" ON "awards" ("employeeId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_awards_normEmpId" ON "awards" ("normalizedEmployeeId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_awards_facultyId" ON "awards" ("facultyId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_awards_department" ON "awards" ("department");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_awards_dateOfRecognition" ON "awards" ("dateOfRecognition");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_awards_calendarYear" ON "awards" ("calendarYear");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_awards_agencyType" ON "awards" ("recognisedAgencyType");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_awards_agencyName" ON "awards" (LEFT("recognisingAgencyName", 255));`);

    // 2. Table: e_contents
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "e_contents" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "facultyId" UUID REFERENCES "faculties"("id") ON DELETE SET NULL,
        "employeeId" VARCHAR(64) NOT NULL,
        "normalizedEmployeeId" VARCHAR(64) NOT NULL,
        "facultyName" TEXT,
        "designation" VARCHAR(255),
        "department" VARCHAR(255),
        "originalDepartment" VARCHAR(255),
        "originalDepartmentSource" VARCHAR(50) DEFAULT 'creation_snapshot',
        "school" VARCHAR(255),
        "campus" VARCHAR(255),
        "title" TEXT NOT NULL,
        "eContentPlatform" VARCHAR(150) NOT NULL,
        "publicationDate" DATE NOT NULL,
        "url" TEXT NOT NULL,
        "contentType" VARCHAR(150) NOT NULL,
        "proofUrl" TEXT,
        "calendarYear" INTEGER NOT NULL,
        "customFields" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdBy" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_econtents_employeeId" ON "e_contents" ("employeeId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_econtents_normEmpId" ON "e_contents" ("normalizedEmployeeId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_econtents_facultyId" ON "e_contents" ("facultyId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_econtents_department" ON "e_contents" ("department");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_econtents_publicationDate" ON "e_contents" ("publicationDate");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_econtents_calendarYear" ON "e_contents" ("calendarYear");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_econtents_platform" ON "e_contents" ("eContentPlatform");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_econtents_contentType" ON "e_contents" ("contentType");`);

    // 3. Seed default system configurations idempotently
    const agencyTypesJson = JSON.stringify({
      options: [
        { id: 'international', label: 'International', status: 'active' },
        { id: 'national', label: 'National', status: 'active' },
        { id: 'state', label: 'State', status: 'active' },
        { id: 'university', label: 'University', status: 'active' },
        { id: 'professional_body', label: 'Professional Body / Society', status: 'active' },
        { id: 'government', label: 'Government Agency', status: 'active' },
        { id: 'industry', label: 'Industry / Corporate', status: 'active' }
      ]
    });

    const platformsJson = JSON.stringify({
      options: [
        { id: 'swayam', label: 'SWAYAM / NPTEL', status: 'active' },
        { id: 'coursera', label: 'Coursera', status: 'active' },
        { id: 'edx', label: 'edX', status: 'active' },
        { id: 'youtube', label: 'YouTube (Institutional Channel)', status: 'active' },
        { id: 'lms', label: 'Institutional LMS / Moodle', status: 'active' },
        { id: 'ugc_inflibnet', label: 'e-PG Pathshala / INFLIBNET', status: 'active' },
        { id: 'cec', label: 'Consortium for Educational Communication (CEC)', status: 'active' },
        { id: 'other_platform', label: 'Other Approved MOOCs Platform', status: 'active' }
      ]
    });

    const contentTypesJson = JSON.stringify({
      options: [
        { id: 'complete_course', label: 'Complete MOOC Course (4 Quadrants)', status: 'active' },
        { id: 'course_module', label: 'MOOC Module / Courseware', status: 'active' },
        { id: 'video_lecture', label: 'Video Lecture / Demonstration', status: 'active' },
        { id: 'podcast_audio', label: 'Podcast / Audio Lecture', status: 'active' },
        { id: 'e_book_notes', label: 'E-Text / Reading Material', status: 'active' },
        { id: 'interactive_module', label: 'Interactive Simulation / Virtual Lab', status: 'active' },
        { id: 'learning_object', label: 'Learning Object Repository (LOR)', status: 'active' }
      ]
    });

    await queryInterface.sequelize.query(`
      INSERT INTO "system_configurations" ("id", "configKey", "category", "label", "description", "value", "version", "createdAt", "updatedAt")
      VALUES
        (gen_random_uuid(), 'achievements_award_agency_types', 'Achievements', 'Recognised Agency Types', 'Authorized categories for recognising agencies in Awards.', '${agencyTypesJson}'::jsonb, 1, NOW(), NOW()),
        (gen_random_uuid(), 'achievements_econtent_platforms', 'Achievements', 'E-Content Platforms', 'Authorized platform providers for digital e-contents.', '${platformsJson}'::jsonb, 1, NOW(), NOW()),
        (gen_random_uuid(), 'achievements_econtent_types', 'Achievements', 'E-Content Types', 'Authorized digital learning content types.', '${contentTypesJson}'::jsonb, 1, NOW(), NOW())
      ON CONFLICT ("configKey") DO NOTHING;
    `).catch(() => {
      // Non-fatal if system_configurations table does not exist or has slightly different structure
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "e_contents" CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "awards" CASCADE;');
  }
};

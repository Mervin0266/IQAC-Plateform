'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. professional_developments table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "professional_developments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" TEXT NOT NULL,
        "startDate" DATE NOT NULL,
        "endDate" DATE,
        "durationDays" VARCHAR(50),
        "organizedBy" VARCHAR(255),
        "organizationName" VARCHAR(255),
        "programType" VARCHAR(150),
        "role" VARCHAR(150),
        "proofUrl" TEXT,
        "calendarYear" INTEGER NOT NULL,
        "department" VARCHAR(255),
        "school" VARCHAR(255),
        "campus" VARCHAR(255),
        "customFields" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdBy" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_pd_startDate" ON "professional_developments" ("startDate");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_pd_calendarYear" ON "professional_developments" ("calendarYear");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_pd_dept" ON "professional_developments" ("department");`);

    // 2. professional_development_faculties table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "professional_development_faculties" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "professionalDevelopmentId" UUID NOT NULL REFERENCES "professional_developments"("id") ON DELETE CASCADE,
        "facultyId" UUID REFERENCES "faculties"("id") ON DELETE SET NULL,
        "employeeId" VARCHAR(64),
        "normalizedEmployeeId" VARCHAR(64),
        "facultyName" TEXT,
        "designation" VARCHAR(255),
        "department" VARCHAR(255),
        "contributorType" VARCHAR(50) NOT NULL DEFAULT 'Verified Faculty',
        "isGuestFaculty" BOOLEAN NOT NULL DEFAULT false,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_pdf_pdId" ON "professional_development_faculties" ("professionalDevelopmentId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_pdf_facId" ON "professional_development_faculties" ("facultyId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_pdf_empId" ON "professional_development_faculties" ("employeeId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_pdf_normEmp" ON "professional_development_faculties" ("normalizedEmployeeId");`);

    // 3. invited_talks table (NO DATE FIELD!)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "invited_talks" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" TEXT NOT NULL,
        "programType" VARCHAR(150),
        "organization" VARCHAR(255),
        "media" VARCHAR(255),
        "proofUrl" TEXT,
        "department" VARCHAR(255),
        "school" VARCHAR(255),
        "campus" VARCHAR(255),
        "customFields" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdBy" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_it_dept" ON "invited_talks" ("department");`);

    // 4. invited_talk_faculties table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "invited_talk_faculties" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "invitedTalkId" UUID NOT NULL REFERENCES "invited_talks"("id") ON DELETE CASCADE,
        "facultyId" UUID REFERENCES "faculties"("id") ON DELETE SET NULL,
        "employeeId" VARCHAR(64),
        "normalizedEmployeeId" VARCHAR(64),
        "facultyName" TEXT,
        "designation" VARCHAR(255),
        "department" VARCHAR(255),
        "contributorType" VARCHAR(50) NOT NULL DEFAULT 'Verified Faculty',
        "isGuestFaculty" BOOLEAN NOT NULL DEFAULT false,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_itf_itId" ON "invited_talk_faculties" ("invitedTalkId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_itf_facId" ON "invited_talk_faculties" ("facultyId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_itf_empId" ON "invited_talk_faculties" ("employeeId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_itf_normEmp" ON "invited_talk_faculties" ("normalizedEmployeeId");`);

    // 5. periodicals table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "periodicals" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "periodicalName" TEXT NOT NULL,
        "publicationDate" DATE NOT NULL,
        "publicationType" VARCHAR(150),
        "periodicalType" VARCHAR(150),
        "url" TEXT,
        "proofUrl" TEXT,
        "calendarYear" INTEGER NOT NULL,
        "department" VARCHAR(255),
        "school" VARCHAR(255),
        "campus" VARCHAR(255),
        "customFields" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdBy" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_per_pubDate" ON "periodicals" ("publicationDate");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_per_calYear" ON "periodicals" ("calendarYear");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_per_dept" ON "periodicals" ("department");`);

    // 6. periodical_faculties table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "periodical_faculties" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "periodicalId" UUID NOT NULL REFERENCES "periodicals"("id") ON DELETE CASCADE,
        "facultyId" UUID REFERENCES "faculties"("id") ON DELETE SET NULL,
        "employeeId" VARCHAR(64),
        "normalizedEmployeeId" VARCHAR(64),
        "facultyName" TEXT,
        "designation" VARCHAR(255),
        "department" VARCHAR(255),
        "contributorType" VARCHAR(50) NOT NULL DEFAULT 'Verified Faculty',
        "isGuestFaculty" BOOLEAN NOT NULL DEFAULT false,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_perf_perId" ON "periodical_faculties" ("periodicalId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_perf_facId" ON "periodical_faculties" ("facultyId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_perf_empId" ON "periodical_faculties" ("employeeId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_perf_normEmp" ON "periodical_faculties" ("normalizedEmployeeId");`);

    // 7. award_faculties table (Multiple contributors for Awards)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "award_faculties" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "awardId" UUID NOT NULL REFERENCES "awards"("id") ON DELETE CASCADE,
        "facultyId" UUID REFERENCES "faculties"("id") ON DELETE SET NULL,
        "employeeId" VARCHAR(64),
        "normalizedEmployeeId" VARCHAR(64),
        "facultyName" TEXT,
        "designation" VARCHAR(255),
        "department" VARCHAR(255),
        "contributorType" VARCHAR(50) NOT NULL DEFAULT 'Verified Faculty',
        "isGuestFaculty" BOOLEAN NOT NULL DEFAULT false,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_awf_awardId" ON "award_faculties" ("awardId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_awf_facId" ON "award_faculties" ("facultyId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_awf_normEmp" ON "award_faculties" ("normalizedEmployeeId");`);

    // 8. econtent_faculties table (Multiple contributors for E-Contents)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "econtent_faculties" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "econtentId" UUID NOT NULL REFERENCES "e_contents"("id") ON DELETE CASCADE,
        "facultyId" UUID REFERENCES "faculties"("id") ON DELETE SET NULL,
        "employeeId" VARCHAR(64),
        "normalizedEmployeeId" VARCHAR(64),
        "facultyName" TEXT,
        "designation" VARCHAR(255),
        "department" VARCHAR(255),
        "contributorType" VARCHAR(50) NOT NULL DEFAULT 'Verified Faculty',
        "isGuestFaculty" BOOLEAN NOT NULL DEFAULT false,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_ecf_ecId" ON "econtent_faculties" ("econtentId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_ecf_facId" ON "econtent_faculties" ("facultyId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_ecf_normEmp" ON "econtent_faculties" ("normalizedEmployeeId");`);

    // Backfill award_faculties from existing awards
    await queryInterface.sequelize.query(`
      INSERT INTO "award_faculties" ("awardId", "facultyId", "employeeId", "normalizedEmployeeId", "facultyName", "designation", "department", "contributorType", "isGuestFaculty")
      SELECT 
        "id" AS "awardId",
        "facultyId",
        "employeeId",
        "normalizedEmployeeId",
        "facultyName",
        "designation",
        "department",
        CASE 
          WHEN "facultyId" IS NOT NULL THEN 'Verified Faculty'
          WHEN "employeeId" = 'GUEST' OR "employeeId" IS NULL OR "employeeId" = '' THEN 'Guest Faculty'
          ELSE 'Unverified Faculty'
        END AS "contributorType",
        CASE 
          WHEN "employeeId" = 'GUEST' OR "employeeId" IS NULL OR "employeeId" = '' THEN true
          ELSE false
        END AS "isGuestFaculty"
      FROM "awards"
      WHERE "id" NOT IN (SELECT DISTINCT "awardId" FROM "award_faculties")
      ON CONFLICT DO NOTHING;
    `);

    // Backfill econtent_faculties from existing e_contents
    await queryInterface.sequelize.query(`
      INSERT INTO "econtent_faculties" ("econtentId", "facultyId", "employeeId", "normalizedEmployeeId", "facultyName", "designation", "department", "contributorType", "isGuestFaculty")
      SELECT 
        "id" AS "econtentId",
        "facultyId",
        "employeeId",
        "normalizedEmployeeId",
        "facultyName",
        "designation",
        "department",
        CASE 
          WHEN "facultyId" IS NOT NULL THEN 'Verified Faculty'
          WHEN "employeeId" = 'GUEST' OR "employeeId" IS NULL OR "employeeId" = '' THEN 'Guest Faculty'
          ELSE 'Unverified Faculty'
        END AS "contributorType",
        CASE 
          WHEN "employeeId" = 'GUEST' OR "employeeId" IS NULL OR "employeeId" = '' THEN true
          ELSE false
        END AS "isGuestFaculty"
      FROM "e_contents"
      WHERE "id" NOT IN (SELECT DISTINCT "econtentId" FROM "econtent_faculties")
      ON CONFLICT DO NOTHING;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "econtent_faculties" CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "award_faculties" CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "periodical_faculties" CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "periodicals" CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "invited_talk_faculties" CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "invited_talks" CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "professional_development_faculties" CASCADE;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS "professional_developments" CASCADE;');
  }
};

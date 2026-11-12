'use strict';

/**
 * Migration: Create copyrights & copyright_faculties tables
 *
 * Additive, idempotent schema creation for IPRs -> Copyrights.
 * Preserves existing Patents, Faculty, Departments, and all unrelated operational tables.
 *
 * Rollback: DROP TABLE IF EXISTS "copyright_faculties" CASCADE; DROP TABLE IF EXISTS "copyrights" CASCADE;
 */
module.exports = {
  up: async (queryInterface) => {
    try {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    } catch (_) {}

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "copyrights" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" TEXT NOT NULL,
        "empIdsRaw" TEXT,
        "dateOfApplication" DATE NOT NULL,
        "calendarYear" INTEGER NOT NULL,
        "registrationNo" VARCHAR(255),
        "diaryNumber" VARCHAR(255),
        "dateOfReceipt" DATE,
        "status" VARCHAR(50) NOT NULL DEFAULT 'submitted',
        "proofUrl" TEXT,
        "proofSourceType" VARCHAR(50),
        "proofFileId" VARCHAR(500),
        "proofFileName" VARCHAR(500),
        "proofAccessStatus" VARCHAR(50),
        "proofAccessRemarks" TEXT,
        "hasInvalidEmpIds" BOOLEAN NOT NULL DEFAULT FALSE,
        "invalidEmpIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "duplicateEmpIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "customFields" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdBy" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS "idx_copyrights_title" ON "copyrights" USING gin(to_tsvector('english', "title"));
    `).catch(async () => {
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS "idx_copyrights_title_btree" ON "copyrights" (LEFT("title", 255));
      `);
    });
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_copyrights_dateOfApplication" ON "copyrights" ("dateOfApplication");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_copyrights_calendarYear" ON "copyrights" ("calendarYear");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_copyrights_registrationNo" ON "copyrights" ("registrationNo");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_copyrights_diaryNumber" ON "copyrights" ("diaryNumber");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_copyrights_status" ON "copyrights" ("status");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_copyrights_hasInvalidEmpIds" ON "copyrights" ("hasInvalidEmpIds");`);

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "copyright_faculties" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "copyrightId" UUID NOT NULL REFERENCES "copyrights"("id") ON DELETE CASCADE,
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

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_copyright_faculties_copy_emp_unique"
      ON "copyright_faculties" ("copyrightId", "normalizedEmployeeId");
    `);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_copyright_faculties_copyrightId" ON "copyright_faculties" ("copyrightId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_copyright_faculties_facultyId" ON "copyright_faculties" ("facultyId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_copyright_faculties_employeeId" ON "copyright_faculties" ("employeeId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_copyright_faculties_normalizedEmpId" ON "copyright_faculties" ("normalizedEmployeeId");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_copyright_faculties_originalDept" ON "copyright_faculties" ("originalDepartment");`);
    await queryInterface.sequelize.query(`CREATE INDEX IF NOT EXISTS "idx_copyright_faculties_isValid" ON "copyright_faculties" ("isValid");`);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "copyright_faculties" CASCADE;`);
    await queryInterface.sequelize.query(`DROP TABLE IF EXISTS "copyrights" CASCADE;`);
  }
};


'use strict';

/**
 * Migration: System Administration V2.0 Tables & Extensions
 * Idempotent, non-destructive migration preserving all existing data, FKs, and audit history.
 */

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        -- 1. Safely widen users.role from ENUM to VARCHAR(64) so custom roles & iqac_admin work cleanly
        BEGIN
          ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
          ALTER TABLE "users" ALTER COLUMN "role" TYPE VARCHAR(64) USING "role"::text;
          ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'faculty';
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;

        -- 2. Extend users with nullable System Admin V2.0 metadata columns
        BEGIN ALTER TABLE "users" ADD COLUMN "roleId" UUID; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE "users" ADD COLUMN "campus" VARCHAR(255); EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE "users" ADD COLUMN "school" VARCHAR(255); EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE "users" ADD COLUMN "deactivatedAt" TIMESTAMP WITH TIME ZONE; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE "users" ADD COLUMN "deactivatedBy" UUID; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE "users" ADD COLUMN "deactivationReason" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;

        -- 3. Extend audit_logs with structured System Admin V2.0 columns
        BEGIN ALTER TABLE "audit_logs" ADD COLUMN "adminUserId" UUID; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE "audit_logs" ADD COLUMN "adminIdentity" VARCHAR(255); EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE "audit_logs" ADD COLUMN "module" VARCHAR(100); EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE "audit_logs" ADD COLUMN "entity" VARCHAR(100); EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE "audit_logs" ADD COLUMN "affectedRecordId" VARCHAR(150); EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE "audit_logs" ADD COLUMN "reason" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE "audit_logs" ADD COLUMN "result" VARCHAR(24) DEFAULT 'Success'; EXCEPTION WHEN duplicate_column THEN NULL; END;
        BEGIN ALTER TABLE "audit_logs" ADD COLUMN "correlationId" VARCHAR(100); EXCEPTION WHEN duplicate_column THEN NULL; END;
      END $$;
    `);

    // 4. Create System Administration V2.0 tables idempotently
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" VARCHAR(64) NOT NULL UNIQUE,
        "name" VARCHAR(120) NOT NULL UNIQUE,
        "description" TEXT,
        "isSystem" BOOLEAN DEFAULT false,
        "isSystemAdmin" BOOLEAN DEFAULT false,
        "isActive" BOOLEAN DEFAULT true,
        "defaultScope" VARCHAR(32) DEFAULT 'department',
        "permissions" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdBy" UUID,
        "updatedBy" UUID,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "user_permission_overrides" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "moduleKey" VARCHAR(64) NOT NULL,
        "permission" VARCHAR(32) NOT NULL,
        "effect" VARCHAR(16) NOT NULL,
        "reason" TEXT,
        "updatedBy" UUID,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "user_perm_override_unique" UNIQUE ("userId", "moduleKey", "permission")
      );

      CREATE TABLE IF NOT EXISTS "user_organizational_scopes" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "scopeType" VARCHAR(24) NOT NULL DEFAULT 'department',
        "campusId" UUID,
        "campusName" VARCHAR(200),
        "schoolId" UUID,
        "schoolName" VARCHAR(200),
        "departmentId" UUID,
        "departmentName" VARCHAR(200),
        "isPrimary" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "form_definitions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "moduleKey" VARCHAR(64) NOT NULL,
        "formKey" VARCHAR(64) NOT NULL UNIQUE,
        "formName" VARCHAR(150) NOT NULL,
        "description" TEXT,
        "tableNameRef" VARCHAR(100),
        "isActive" BOOLEAN DEFAULT true,
        "version" INTEGER DEFAULT 1,
        "updatedBy" UUID,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "form_fields" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "formId" UUID NOT NULL REFERENCES "form_definitions"("id") ON DELETE CASCADE,
        "fieldKey" VARCHAR(100) NOT NULL,
        "label" VARCHAR(150) NOT NULL,
        "description" TEXT,
        "fieldType" VARCHAR(50) NOT NULL DEFAULT 'text',
        "isCore" BOOLEAN DEFAULT false,
        "isRequired" BOOLEAN DEFAULT false,
        "defaultValue" TEXT,
        "validationRules" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "options" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "conditionalRules" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        "status" VARCHAR(24) NOT NULL DEFAULT 'active',
        "archivedAt" TIMESTAMP WITH TIME ZONE,
        "archivedBy" UUID,
        "previousTypeHistory" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "form_field_unique_key" UNIQUE ("formId", "fieldKey")
      );

      CREATE TABLE IF NOT EXISTS "system_configurations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "configKey" VARCHAR(100) NOT NULL UNIQUE,
        "category" VARCHAR(64) NOT NULL,
        "label" VARCHAR(150) NOT NULL,
        "description" TEXT,
        "value" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "version" INTEGER NOT NULL DEFAULT 1,
        "updatedBy" UUID,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "module_configs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "moduleKey" VARCHAR(64) NOT NULL UNIQUE,
        "moduleName" VARCHAR(120) NOT NULL,
        "description" TEXT,
        "routeKey" VARCHAR(64),
        "tableNameRef" VARCHAR(100),
        "isEnabled" BOOLEAN NOT NULL DEFAULT true,
        "isCritical" BOOLEAN NOT NULL DEFAULT false,
        "dependencies" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "affectedRoutes" JSONB NOT NULL DEFAULT '[]'::jsonb,
        "version" INTEGER NOT NULL DEFAULT 1,
        "lastChangedAt" TIMESTAMP WITH TIME ZONE,
        "lastChangedBy" UUID,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "configuration_versions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "configId" VARCHAR(120) NOT NULL,
        "versionNumber" INTEGER NOT NULL DEFAULT 1,
        "entityType" VARCHAR(64) NOT NULL,
        "entityName" VARCHAR(200) NOT NULL,
        "previousConfig" JSONB,
        "newConfig" JSONB,
        "adminUserId" UUID,
        "adminIdentity" VARCHAR(200) NOT NULL,
        "reason" TEXT,
        "changeStatus" VARCHAR(24) NOT NULL DEFAULT 'applied',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "configuration_backups" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(200) NOT NULL,
        "description" TEXT,
        "schemaVersion" VARCHAR(32) NOT NULL DEFAULT '2.0',
        "snapshot" JSONB NOT NULL,
        "createdBy" UUID,
        "createdByName" VARCHAR(200) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 5. Add non-destructive customFields JSONB column on core transactional tables to store Form Builder custom fields & archived values cleanly
    const operationalTables = [
      'students',
      'faculties',
      'publications',
      'patents',
      'sponsored_projects',
      'consultancy_projects',
      'placements',
      'departmental_activities',
      'achievements'
    ];

    for (const tbl of operationalTables) {
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          BEGIN
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "customFields" JSONB NOT NULL DEFAULT %L::jsonb', '${tbl}', '{}');
          EXCEPTION WHEN undefined_table OR duplicate_column THEN
            NULL;
          END;
        END $$;
      `);
    }
  },

  down: async (queryInterface) => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECURITY ABORT: Dropping System Administration V2.0 configuration tables in production is prohibited.');
    }
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS "configuration_backups";
      DROP TABLE IF EXISTS "configuration_versions";
      DROP TABLE IF EXISTS "module_configs";
      DROP TABLE IF EXISTS "system_configurations";
      DROP TABLE IF EXISTS "form_fields";
      DROP TABLE IF EXISTS "form_definitions";
      DROP TABLE IF EXISTS "user_organizational_scopes";
      DROP TABLE IF EXISTS "user_permission_overrides";
      DROP TABLE IF EXISTS "roles";
    `);
  }
};

if (require.main === module) {
  const { sequelize } = require('../config/database');
  console.log('Applying migration: 20261112_create_system_administration_tables...');
  module.exports.up(sequelize.getQueryInterface(), sequelize.constructor)
    .then(() => {
      console.log('✓ System Administration V2.0 migration applied successfully.');
      return sequelize.close();
    })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('✗ Migration failed:', err.message);
      process.exit(1);
    });
}


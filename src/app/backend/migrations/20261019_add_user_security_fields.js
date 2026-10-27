'use strict';

/**
 * Migration: Add security fields to users table (mustChangePassword, passwordChangedAt, tokenVersion)
 * Non-destructive, idempotent migration for Phase A security hardening.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. mustChangePassword
    await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE "users" ADD COLUMN "mustChangePassword" BOOLEAN DEFAULT false;
        EXCEPTION WHEN duplicate_column THEN
          NULL;
        END;

        BEGIN
          ALTER TABLE "users" ADD COLUMN "passwordChangedAt" TIMESTAMP WITH TIME ZONE;
        EXCEPTION WHEN duplicate_column THEN
          NULL;
        END;

        BEGIN
          ALTER TABLE "users" ADD COLUMN "tokenVersion" INTEGER DEFAULT 0;
        EXCEPTION WHEN duplicate_column THEN
          NULL;
        END;
      END $$;
    `);

    // Backfill any null values safely
    await queryInterface.sequelize.query(`
      UPDATE "users" SET "mustChangePassword" = false WHERE "mustChangePassword" IS NULL;
      UPDATE "users" SET "tokenVersion" = 0 WHERE "tokenVersion" IS NULL;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Security policy: Do not drop security columns in production to preserve auditability and session state.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECURITY ABORT: Dropping security tracking columns (tokenVersion, mustChangePassword) in production is strictly prohibited.');
    }
    await queryInterface.sequelize.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "mustChangePassword";
      ALTER TABLE "users" DROP COLUMN IF EXISTS "passwordChangedAt";
      ALTER TABLE "users" DROP COLUMN IF EXISTS "tokenVersion";
    `);
  }
};

// Allow direct execution via: node src/app/backend/migrations/20261019_add_user_security_fields.js
if (require.main === module) {
  const { sequelize } = require('../config/database');
  console.log('Applying migration: 20261019_add_user_security_fields...');
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

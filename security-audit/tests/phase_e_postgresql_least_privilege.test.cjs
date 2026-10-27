'use strict';

/**
 * Phase E0.2: PostgreSQL Least-Privilege Role Segregation Verification Suite
 * CHRIST University IQAC Platform
 *
 * Verifies:
 * 1. Runtime application role does NOT own application tables.
 * 2. Runtime application role is granted DML only (SELECT, INSERT, UPDATE, DELETE).
 * 3. Runtime application role cannot TRUNCATE application tables (permission denied).
 * 4. Runtime application role cannot DROP application tables (must be owner of table).
 * 5. Runtime application role cannot ALTER application tables (must be owner of table).
 * 6. Runtime application role cannot CREATE new tables in public schema (permission denied).
 */

const path = require('path');
const fs = require('fs');

const testEnvPath = path.join(__dirname, '../../src/app/backend/.env.test');
if (fs.existsSync(testEnvPath) && !process.env.TEST_DATABASE_URL) {
  require('dotenv').config({ path: testEnvPath });
}

delete process.env.DATABASE_URL;

const backendPath = path.join(__dirname, '../../src/app/backend');
const { enforceTestEnvironmentPreflight, verifyPreProvisionedDisposableTestDatabase } = require(path.join(backendPath, 'utils/testDatabaseGuard'));

enforceTestEnvironmentPreflight();

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require(path.join(backendPath, 'config/database'));

describe('Phase E0.2: PostgreSQL Least-Privilege Role Segregation Verification', () => {
  const migratorRole = 'test_migrator_role_e';
  const appRole = 'test_app_role_e';
  const testTable = 'least_priv_verification_table';

  before(async () => {
    await verifyPreProvisionedDisposableTestDatabase(sequelize);

    // Setup isolated roles and test fixtures
    await sequelize.query(`
      DROP TABLE IF EXISTS public.${testTable};
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM pg_roles WHERE rolname = '${appRole}') THEN
          EXECUTE 'DROP OWNED BY ${appRole};';
          EXECUTE 'DROP ROLE ${appRole};';
        END IF;
        IF EXISTS (SELECT FROM pg_roles WHERE rolname = '${migratorRole}') THEN
          EXECUTE 'DROP OWNED BY ${migratorRole};';
          EXECUTE 'DROP ROLE ${migratorRole};';
        END IF;
      END $$;

      CREATE ROLE ${migratorRole} NOSUPERUSER NOCREATEDB NOCREATEROLE;
      CREATE ROLE ${appRole} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;

      -- Schema permissions
      GRANT USAGE, CREATE ON SCHEMA public TO ${migratorRole};
      GRANT USAGE ON SCHEMA public TO ${appRole};
      REVOKE CREATE ON SCHEMA public FROM ${appRole};

      -- Table created by migrator (table owner)
      SET ROLE ${migratorRole};
      CREATE TABLE public.${testTable} (
        id SERIAL PRIMARY KEY,
        payload VARCHAR(255)
      );
      RESET ROLE;

      -- Grant DML to app role
      GRANT SELECT, INSERT, UPDATE, DELETE ON public.${testTable} TO ${appRole};
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${appRole};

      -- Explicitly revoke TRUNCATE
      REVOKE TRUNCATE ON public.${testTable} FROM ${appRole};
    `);
  });

  after(async () => {
    try {
      await sequelize.query(`
        RESET ROLE;
        DROP TABLE IF EXISTS public.${testTable};
        DO $$
        BEGIN
          IF EXISTS (SELECT FROM pg_roles WHERE rolname = '${appRole}') THEN
            EXECUTE 'DROP OWNED BY ${appRole};';
            EXECUTE 'DROP ROLE ${appRole};';
          END IF;
          IF EXISTS (SELECT FROM pg_roles WHERE rolname = '${migratorRole}') THEN
            EXECUTE 'DROP OWNED BY ${migratorRole};';
            EXECUTE 'DROP ROLE ${migratorRole};';
          END IF;
        END $$;
      `);
    } catch (err) {
      // Ignore cleanup error
    }
  });

  test('E0.2-01: Runtime app role can execute INSERT, SELECT, UPDATE, and DELETE (DML)', async () => {
    // Execute as appRole
    await sequelize.query(`SET ROLE ${appRole};`);
    
    // 1. INSERT
    await sequelize.query(`INSERT INTO public.${testTable} (payload) VALUES ('test-dml-payload');`);

    // 2. SELECT
    const [rows] = await sequelize.query(`SELECT payload FROM public.${testTable} WHERE payload = 'test-dml-payload';`);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].payload, 'test-dml-payload');

    // 3. UPDATE
    await sequelize.query(`UPDATE public.${testTable} SET payload = 'updated-payload' WHERE payload = 'test-dml-payload';`);
    const [updatedRows] = await sequelize.query(`SELECT payload FROM public.${testTable} WHERE payload = 'updated-payload';`);
    assert.equal(updatedRows.length, 1);

    // 4. DELETE
    await sequelize.query(`DELETE FROM public.${testTable} WHERE payload = 'updated-payload';`);
    const [emptyRows] = await sequelize.query(`SELECT payload FROM public.${testTable};`);
    assert.equal(emptyRows.length, 0);

    await sequelize.query(`RESET ROLE;`);
  });

  test('E0.2-02: Runtime app role execution of TRUNCATE is denied with permission denied error', async () => {
    await sequelize.query(`SET ROLE ${appRole};`);
    
    await assert.rejects(
      async () => {
        await sequelize.query(`TRUNCATE TABLE public.${testTable};`);
      },
      (err) => {
        return err.message.includes('permission denied for table') || err.message.includes('permission denied');
      }
    );

    await sequelize.query(`RESET ROLE;`);
  });

  test('E0.2-03: Runtime app role execution of DROP TABLE is denied (must be owner of table)', async () => {
    await sequelize.query(`SET ROLE ${appRole};`);

    await assert.rejects(
      async () => {
        await sequelize.query(`DROP TABLE public.${testTable};`);
      },
      (err) => {
        return err.message.includes('must be owner of table') || err.message.includes('permission denied');
      }
    );

    await sequelize.query(`RESET ROLE;`);
  });

  test('E0.2-04: Runtime app role execution of ALTER TABLE is denied (must be owner of table)', async () => {
    await sequelize.query(`SET ROLE ${appRole};`);

    await assert.rejects(
      async () => {
        await sequelize.query(`ALTER TABLE public.${testTable} ADD COLUMN unauthorized_col text;`);
      },
      (err) => {
        return err.message.includes('must be owner of table') || err.message.includes('permission denied');
      }
    );

    await sequelize.query(`RESET ROLE;`);
  });

  test('E0.2-05: Runtime app role execution of CREATE TABLE in schema public is denied', async () => {
    await sequelize.query(`SET ROLE ${appRole};`);

    await assert.rejects(
      async () => {
        await sequelize.query(`CREATE TABLE public.unauthorized_app_table (id int);`);
      },
      (err) => {
        return err.message.includes('permission denied for schema public') || err.message.includes('permission denied');
      }
    );

    await sequelize.query(`RESET ROLE;`);
  });

  test('E0.2-06: Audit log immutability: runtime app role CAN INSERT and SELECT, but is DENIED UPDATE, DELETE, and TRUNCATE', async () => {
    const auditTestTable = 'least_priv_audit_logs_test';

    // Setup table owned by migratorRole
    await sequelize.query(`
      DROP TABLE IF EXISTS public.${auditTestTable};
      SET ROLE ${migratorRole};
      CREATE TABLE public.${auditTestTable} (
        id SERIAL PRIMARY KEY,
        action VARCHAR(50),
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      RESET ROLE;

      -- Grant SELECT and INSERT only to appRole
      GRANT SELECT, INSERT ON public.${auditTestTable} TO ${appRole};
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${appRole};
      REVOKE UPDATE, DELETE, TRUNCATE ON public.${auditTestTable} FROM PUBLIC, ${appRole};
    `);

    // 1. App role CAN insert audit records
    await sequelize.query(`SET ROLE ${appRole};`);
    await sequelize.query(`INSERT INTO public.${auditTestTable} (action, remarks) VALUES ('LOGIN_SUCCESS', 'Legitimate audit entry');`);

    // 2. App role CAN select audit records
    const [auditRows] = await sequelize.query(`SELECT action, remarks FROM public.${auditTestTable} WHERE action = 'LOGIN_SUCCESS';`);
    assert.equal(auditRows.length, 1);
    assert.equal(auditRows[0].action, 'LOGIN_SUCCESS');

    // 3. App role CANNOT update audit records (denied)
    await assert.rejects(
      async () => {
        await sequelize.query(`UPDATE public.${auditTestTable} SET action = 'TAMPERED' WHERE action = 'LOGIN_SUCCESS';`);
      },
      (err) => err.message.includes('permission denied for table') || err.message.includes('permission denied')
    );

    // 4. App role CANNOT delete audit records (denied)
    await assert.rejects(
      async () => {
        await sequelize.query(`DELETE FROM public.${auditTestTable} WHERE action = 'LOGIN_SUCCESS';`);
      },
      (err) => err.message.includes('permission denied for table') || err.message.includes('permission denied')
    );

    // 5. App role CANNOT truncate audit table (denied)
    await assert.rejects(
      async () => {
        await sequelize.query(`TRUNCATE TABLE public.${auditTestTable};`);
      },
      (err) => err.message.includes('permission denied for table') || err.message.includes('permission denied')
    );

    await sequelize.query(`RESET ROLE;`);

    // Cleanup
    await sequelize.query(`DROP TABLE IF EXISTS public.${auditTestTable};`);
  });
});

-- ============================================================================
-- CHRIST UNIVERSITY IQAC PLATFORM — PRODUCTION DATABASE ROLE PROVISIONING
-- LEAST-PRIVILEGE ROLE SEGREGATION (PHASE E0.2 COMPLIANT)
-- ============================================================================
--
-- This script provisions two segregated roles:
-- 1. iqac_migrator: Owns all tables, sequences, and schemas; runs migrations.
-- 2. iqac_app_user: Runtime application user with DML privileges only (SELECT, INSERT, UPDATE, DELETE).
--    Strictly denied DDL (CREATE, ALTER, DROP) and TRUNCATE.
--
-- Usage: Execute as a PostgreSQL superuser or database owner (e.g., postgres)
-- ============================================================================

\set ON_ERROR_STOP on

-- Ensure target database is set (replace iqac_db if necessary)
-- \c iqac_db

BEGIN;

-- 1. Create Migration Role (Table Owner)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'iqac_migrator') THEN
    CREATE ROLE iqac_migrator WITH LOGIN PASSWORD 'CHANGEME_MIGRATOR_VAULT_PASSWORD' NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END $$;

-- 2. Create Application Runtime Role (Non-Owner, DML Only)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'iqac_app_user') THEN
    CREATE ROLE iqac_app_user WITH LOGIN PASSWORD 'CHANGEME_APP_VAULT_PASSWORD' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END $$;

-- 3. Schema & Database Permissions
GRANT CONNECT ON DATABASE current_database() TO iqac_migrator;
GRANT CONNECT ON DATABASE current_database() TO iqac_app_user;

GRANT USAGE, CREATE ON SCHEMA public TO iqac_migrator;
GRANT USAGE ON SCHEMA public TO iqac_app_user;

-- Revoke CREATE on public schema from PUBLIC and app user
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM iqac_app_user;

-- 4. Transfer existing table and sequence ownership to iqac_migrator (if applicable)
DO $$
DECLARE
  tbl record;
  seq record;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO iqac_migrator;', tbl.tablename);
  END LOOP;
  FOR seq IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO iqac_migrator;', seq.sequencename);
  END LOOP;
END $$;

-- 5. Grant DML to iqac_app_user on existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO iqac_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO iqac_app_user;

-- Revoke TRUNCATE on all tables from PUBLIC and iqac_app_user
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM iqac_app_user;

-- 6. Enforce Audit Log Immutability (WORM: Write-Once, Read-Many)
-- The runtime application role requires INSERT to append audit events and SELECT to read them,
-- but must strictly be denied UPDATE, DELETE, and TRUNCATE to guarantee non-repudiation.
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.audit_logs FROM PUBLIC, iqac_app_user;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'AuditLogs') THEN
    REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public."AuditLogs" FROM PUBLIC, iqac_app_user;
  END IF;
END $$;

-- 7. Configure Default Privileges for future tables created by iqac_migrator
ALTER DEFAULT PRIVILEGES FOR ROLE iqac_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO iqac_app_user;

ALTER DEFAULT PRIVILEGES FOR ROLE iqac_migrator IN SCHEMA public
  REVOKE TRUNCATE ON TABLES FROM PUBLIC, iqac_app_user;

ALTER DEFAULT PRIVILEGES FOR ROLE iqac_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO iqac_app_user;

COMMIT;

-- Verification Queries:
-- SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE grantee = 'iqac_app_user';
-- SELECT rolname, rolsuper, rolinherit, rolcreaterole FROM pg_roles WHERE rolname IN ('iqac_migrator', 'iqac_app_user');

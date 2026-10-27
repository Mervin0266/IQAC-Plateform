# CHRIST UNIVERSITY IQAC PLATFORM
## PHASE D — POSTGRESQL SECURITY ARCHITECTURE & ACCESS CONTROLS

**Document Version:** 1.0.0  
**Classification:** Database Administration & Security Architecture  
**Database Engine:** PostgreSQL 15+ / 16  
**ORM Framework:** Sequelize v6  
**Author:** Senior PostgreSQL Database Administrator, Cloud Security Architect  
**Date:** October 20, 2026  
**Status:** CONFIGURATION HARDENED — STAGED DEPLOYMENT READY  

---

### 1. PRINCIPLE OF LEAST PRIVILEGE: DATABASE ACCOUNTS

To prevent accidental or malicious schema destruction from application vulnerabilities, three distinct PostgreSQL database roles are established:

```
+-------------------------------------------------------------------------+
|                      POSTGRESQL ROLE SEGREGATION                        |
+---------------------+-----------------------+---------------------------+
| Role Name           | Environment Scope     | Allowed Privileges        |
+---------------------+-----------------------+---------------------------+
| iqac_app_user       | Production / Staging  | DML Only: SELECT, INSERT, |
|                     | Runtime               | UPDATE, DELETE on tables; |
|                     |                       | USAGE on sequences.       |
|                     |                       | STRICTLY NO DDL (ALTER,   |
|                     |                       | DROP, TRUNCATE prohibited)|
+---------------------+-----------------------+---------------------------+
| iqac_migrator       | CI/CD Deployment Job  | DDL & DML: CREATE, ALTER, |
|                     | (Short-lived)         | DROP on application schema|
|                     |                       | for versioned migrations. |
+---------------------+-----------------------+---------------------------+
| iqac_test_user      | Isolated Disposable   | Full DDL & DML, restricted|
|                     | Test Databases only   | strictly to databases     |
|                     | (e.g. iqac_test)      | matching pattern '*_test'.|
+---------------------+-----------------------+---------------------------+
```

#### SQL Definition for Migration and Runtime Least-Privilege Roles:
```sql
-- 1. Create dedicated schema migration role (table owner)
CREATE ROLE iqac_migrator WITH LOGIN PASSWORD 'STRONG_MIGRATOR_PASSWORD_HERE' NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT CONNECT ON DATABASE iqac_db TO iqac_migrator;
GRANT ALL ON SCHEMA public TO iqac_migrator;

-- 2. Create application runtime user (DML only, non-owner)
CREATE ROLE iqac_app_user WITH LOGIN PASSWORD 'STRONG_APP_PASSWORD_HERE' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
GRANT CONNECT ON DATABASE iqac_db TO iqac_app_user;
GRANT USAGE ON SCHEMA public TO iqac_app_user;

-- Revoke schema CREATE so app runtime user cannot create, replace, or drop schema objects
REVOKE CREATE ON SCHEMA public FROM PUBLIC, iqac_app_user;

-- 3. Grant DML privileges on all tables created by migrator
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO iqac_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO iqac_app_user;

-- Explicitly revoke TRUNCATE on all tables
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM PUBLIC, iqac_app_user;

-- 4. Ensure future tables created by iqac_migrator automatically enforce this boundary
ALTER DEFAULT PRIVILEGES FOR ROLE iqac_migrator IN SCHEMA public 
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO iqac_app_user;

ALTER DEFAULT PRIVILEGES FOR ROLE iqac_migrator IN SCHEMA public 
  REVOKE TRUNCATE ON TABLES FROM PUBLIC, iqac_app_user;

ALTER DEFAULT PRIVILEGES FOR ROLE iqac_migrator IN SCHEMA public 
  GRANT USAGE, SELECT ON SEQUENCES TO iqac_app_user;

-- Note on DROP: In PostgreSQL, DROP is an object ownership privilege, not a grantable table privilege.
-- Because iqac_app_user does not own the tables and lacks schema CREATE/ALTER privileges, DROP TABLE,
-- ALTER TABLE, and DDL mutations are strictly denied by the PostgreSQL engine.
```

---

### 2. TLS AND NETWORK ISOLATION CONTROLS

1. **Network Placement:** In production, the PostgreSQL cluster must NOT be bound to a public IPv4 address (`0.0.0.0/0`). It must reside inside a private Render Private Network (or AWS RDS VPC peering) accessible only by the backend application container.
2. **Mandatory Encryption in Transit (TLS):**
   - The connection configuration in `src/app/backend/config/database.js` enforces SSL whenever `NODE_ENV === 'production'`.
   - Supports `DB_SSL_REJECT_UNAUTHORIZED=true` and custom institutional CA certificates via `DB_CA_CERT=/path/to/ca.pem` to prevent Man-in-the-Middle (MitM) attacks.
3. **Prevention of Test Runner Spillover:**
   - Preflight guards in `testDatabaseGuard.js` reject any connection to cloud database host signatures (`render.com`, `aws.com`, `rds`, `supabase.co`, `railway.app`, `christuniversity.in`).

---

### 3. CONNECTION POOLING, RESOURCE BOUNDS & TIMEOUTS

To prevent resource exhaustion, denial-of-service, or database connection pool starvation under high concurrent traffic, `src/app/backend/config/database.js` enforces strict pool boundaries:

```javascript
const poolConfig = {
  max: parseInt(process.env.DB_POOL_MAX, 10) || 10,        // Max active connections
  min: parseInt(process.env.DB_POOL_MIN, 10) || 0,         // Min idle connections
  acquire: parseInt(process.env.DB_POOL_ACQUIRE_MS, 10) || 30000, // Timeout before failing to obtain connection
  idle: parseInt(process.env.DB_POOL_IDLE_MS, 10) || 10000        // Release idle connections after 10s
};
```

#### Statement and Transaction Timeout:
To neutralize rogue, runaway, or deadlocking queries:
- Configured PostgreSQL dialect option: `statement_timeout: 30000` (30 seconds).
- Any query exceeding 30,000ms is terminated automatically by the PostgreSQL engine with `57014 (query_canceled)`, releasing lock buffers and preventing cascading container failures.

---

### 4. ELIMINATION OF STARTUP RUNTIME DDL

- **Identified Risk:** In previous versions, `autoSeed(sequelize)` executed at server boot, executing raw SQL `ALTER TABLE "patents" ...`, `DROP TYPE IF EXISTS ...`, and `sequelize.sync({ alter: true })`.
- **Phase D Remediation:**
  In `src/app/backend/server.js`:
  ```javascript
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_AUTO_SEED === 'true') {
    const autoSeed = require('./config/autoSeed');
    await autoSeed(sequelize);
  } else {
    console.log('✓ Production mode: Runtime DDL and auto-seeding disabled. Schema managed via versioned migrations.');
  }
  ```
- **Outcome:** The production web server runs strictly without startup schema mutation or auto-seeding. Schema changes are performed exclusively through auditable migrations (`npm run migrate`) prior to traffic cutover.

# CHRIST UNIVERSITY IQAC PLATFORM
# STAGING SECURITY VERIFICATION & DISASTER RECOVERY HANDOFF RUNBOOK

> **Target Environment:** Approved Institutional Staging Cluster (Render Staging + Vercel Preview + Isolated AWS RDS / PostgreSQL Staging)  
> **Audience:** Lead Security QA Engineer, DevSecOps Lead, Senior PostgreSQL DBA  
> **Classification:** Non-Destructive Operational Staging Verification Protocol  
> **Current Execution Status:** 🟡 **READY FOR STAGING EXECUTION (Pending Institutional Access & Deployment)**

---

## 1. Governance Notice & Execution Boundaries

This runbook establishes the **mandatory non-destructive staging verification protocol** for the CHRIST University IQAC Platform.

### Strict Operational Constraints
1. **Zero Destructive Operations on Live Tables:** Direct execution of `DROP TABLE`, `TRUNCATE`, or unconfirmed university-wide clear endpoints is **strictly prohibited** in staging. Permission boundaries must be verified using PostgreSQL permission inspection functions (`has_table_privilege`, `has_schema_privilege`) or isolated sacrificial fixtures.
2. **Synthetic Staging Data:** All verification activities in staging must operate exclusively on synthetic, anonymized university fixtures. Real student or faculty PII must never be seeded into staging.
3. **Fail-Closed Backup Safeguards:** The local test backup utility (`verify_pg_dump_restore.cjs`) contains hardcoded preflight safety guards that strictly abort if pointed at non-disposable environments. Staging disaster recovery must follow Section 4 below in an isolated recovery database.
4. **Institutional Sign-Off Required:** Staging execution requires formal written authorization from the IQAC Director and Lead Security Auditor.

---

## 2. Comprehensive 11-Domain Non-Destructive Staging Checklist

Execute each verification step sequentially upon staging deployment:

### Domain 1: HTTPS, TLS & Exact-Origin CORS
- [ ] **1.1 TLS Protocol:** Verify staging endpoints only negotiate TLS 1.3 or TLS 1.2 with strong AEAD cipher suites (`ECDHE-RSA-AES256-GCM-SHA384`).
- [ ] **1.2 CORS Headers (Allowed Origin):**
  ```bash
  curl -I -H "Origin: https://staging.iqac.christuniversity.in" https://staging-api.iqac.christuniversity.in/health
  # Must return: Access-Control-Allow-Origin: https://staging.iqac.christuniversity.in
  ```
- [ ] **1.3 CORS Headers (Disallowed Origin):**
  ```bash
  curl -I -H "Origin: https://evil.attacker.com" https://staging-api.iqac.christuniversity.in/health
  # Must NOT return Access-Control-Allow-Origin
  ```

### Domain 2: Frontend Origin Security Headers (Vercel Staging)
- [ ] **2.1 Document Security Headers:** Query the frontend root URL:
  ```bash
  curl -I https://staging.iqac.christuniversity.in
  ```
  Verify the following response headers from `vercel.json`:
  - `Content-Security-Policy: default-src 'self'; script-src 'self'; ... connect-src 'self' https://staging-api.iqac.christuniversity.in`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Domain 3: Backend Security Headers & HSTS Safety (Render Staging)
- [ ] **3.1 API Security Headers:** Query any backend endpoint:
  ```bash
  curl -I https://staging-api.iqac.christuniversity.in/api/auth/me
  ```
  Verify:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (Verify `preload` is **NOT** present)
  - `Cache-Control: no-store, no-cache, must-revalidate, private` on `/api/*`
  - `X-Content-Type-Options: nosniff`

### Domain 4: Authentication & 5-Role Access Control
- [ ] **4.1 Admin Role:** Full access to dashboard, system analytics, user management.
- [ ] **4.2 Authority Role:** Read-only institutional analytics across all departments; all mutative requests (`POST`, `PUT`, `DELETE`) return `403 Forbidden`.
- [ ] **4.3 HOD Role:** Departmental management restricted strictly to assigned department (e.g. `Computer Science and Engineering`).
- [ ] **4.4 Coordinator Role:** Data entry and upload restricted strictly to assigned department.
- [ ] **4.5 Faculty Role:** Access restricted to personal records and department submissions.
- [ ] **4.6 Unauthenticated:** Access denied with `401 Unauthorized` on all protected endpoints.
- [ ] **4.7 Safe Destructive Gate Test:** Test university-wide clear (`DELETE /api/students/clear-all`) **WITHOUT** the dual-confirmation header `x-confirm-university-clear`.
  - Must return `400 Bad Request` (`Dual confirmation header missing`).
  - Do NOT supply `CONFIRM_UNIVERSITY_CLEAR` in staging to avoid accidental data wipe.

### Domain 5: Cross-Department Boundary Isolation
- [ ] **5.1 Cross-Department Modification:** An HOD or Coordinator from `CSE` attempts to modify a synthetic `ECE` student record (`PUT /api/students/:id`). Must return `403 Forbidden`.
- [ ] **5.2 Cross-Department Bulk Upload:** Coordinator from `CSE` attempts to bulk-upload with payload `department: 'Mechanical Engineering'`. Must be rejected with `400` or `403`.

### Domain 6: Confidential Statutory Field Protection (PAN Exclusion Policy)
- [ ] **6.1 Faculty PAN Redaction (All Roles):** Query faculty endpoint (`GET /api/faculty`) as Admin, Authority, HOD, and Faculty.
  - Verify `panCardNo` (and aliases `pan`, `panNumber`) is **completely absent** from the JSON response for every single role.
- [ ] **6.2 Faculty Export PAN Redaction:** Trigger CSV export (`GET /api/faculty?export=true&format=csv`).
  - Inspect the CSV header and data rows; verify `panCardNo` is NOT included in the exported columns.
- [ ] **6.3 Student Contact Sanitization:** Ensure student personal phone/address fields are masked for general faculty viewers.

### Domain 7: Streaming Export Integrity & RFC-4180 Parsing
- [ ] **7.1 CSV Export Parsing:** Trigger large student export (`GET /api/students?export=true&format=csv`).
  - Verify UTF-8 BOM (`\uFEFF`) is present.
  - Verify `Trailer: X-Export-Status, X-Export-Records, X-Export-Total` headers exist.
  - Parse with automated RFC-4180 CSV parser: zero nonstandard `# EXPORT STATUS` comment rows in the data body; exact column count match on all rows.
- [ ] **7.2 Formula Injection Neutralization:** Verify any synthetic field starting with `=`, `+`, `-`, `@` is escaped with a leading single quote (`'`).

### Domain 8: Database Role Separation & Non-Destructive Least-Privilege Inspection
- [ ] **8.1 Non-Destructive Permission Inspection:** Query PostgreSQL privilege catalog as DBA:
  ```sql
  -- 1. Verify iqac_app_user CANNOT TRUNCATE application tables:
  SELECT has_table_privilege('iqac_app_user', 'public."Students"', 'TRUNCATE'); -- Must return FALSE
  SELECT has_table_privilege('iqac_app_user', 'public.audit_logs', 'TRUNCATE'); -- Must return FALSE

  -- 2. Verify iqac_app_user CANNOT UPDATE or DELETE audit records (Immutability):
  SELECT has_table_privilege('iqac_app_user', 'public.audit_logs', 'UPDATE');   -- Must return FALSE
  SELECT has_table_privilege('iqac_app_user', 'public.audit_logs', 'DELETE');   -- Must return FALSE
  SELECT has_table_privilege('iqac_app_user', 'public.audit_logs', 'INSERT');   -- Must return TRUE
  SELECT has_table_privilege('iqac_app_user', 'public.audit_logs', 'SELECT');   -- Must return TRUE

  -- 3. Verify iqac_app_user CANNOT CREATE tables in public schema:
  SELECT has_schema_privilege('iqac_app_user', 'public', 'CREATE');            -- Must return FALSE

  -- 4. Verify table ownership belongs to iqac_migrator (NOT iqac_app_user):
  SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'public';     -- All must show 'iqac_migrator'
  ```
- [ ] **8.2 Safe Sacrificial Object Verification:** If runtime DDL denial must be tested via SQL execution, use an isolated temporary sacrificial table created by `iqac_migrator`:
  ```sql
  -- Run inside a transaction that is rolled back immediately:
  BEGIN;
  SET ROLE iqac_app_user;
  -- Attempt DDL on sacrificial object:
  -- DROP TABLE public.sacrificial_staging_test; -> Must error: "must be owner of table"
  ROLLBACK;
  ```

### Domain 9: Audit Logging Operational Durability
- [ ] **9.1 Mutative Action Recording:** Perform an approved edit request or user role update.
- [ ] **9.2 Database Verification:** Query `audit_logs` table; verify record contains user ID, role, action, target entity, client IP, and UTC timestamp.
- [ ] **9.3 Immutability Check:** Confirm `iqac_app_user` cannot `DELETE` or `UPDATE` records in `audit_logs` (verified via 8.1 catalog check).

### Domain 10: Monitoring, Alerting & Rate Limiting
- [ ] **10.1 Brute-Force Rate Limiting:** Submit 6 consecutive invalid login attempts for a single account within 1 minute.
  - Attempt 6 must be blocked with `429 Too Many Requests`.
- [ ] **10.2 Security Alerting:** Verify that Render/Datadog log alert triggers for high-frequency 401/429 spikes.

---

## 3. Staging Disaster Recovery & Isolated Logical Restore Protocol

To validate database disaster recovery in staging without risking live staging data:

### Prerequisites
1. **Isolated Restore Target Database:** A dedicated empty database instance (e.g. `iqac_staging_restore_dr`), completely separate from the active staging database.
2. **Access Control:** DBA credentials restricted to the isolated target.

### Execution Procedure
```bash
# 1. Take a logical snapshot of staging using native PostgreSQL pg_dump
pg_dump --host=staging-db-host --username=iqac_migrator --dbname=iqac_staging \
  --format=plain --no-owner --no-privileges --file=staging_dr_snapshot_$(date +%Y%m%d).sql

# 2. Compute SHA-256 integrity checksum
sha256sum staging_dr_snapshot_$(date +%Y%m%d).sql > staging_dr_snapshot_$(date +%Y%m%d).sha256

# 3. Restore snapshot into the ISOLATED recovery database (NOT the active staging DB)
psql --host=staging-db-host --username=iqac_migrator --dbname=iqac_staging_restore_dr \
  --file=staging_dr_snapshot_$(date +%Y%m%d).sql

# 4. Measure and document empirical recovery timings:
#    - Backup Duration: [Record exact elapsed seconds]
#    - Restore Duration: [Record exact elapsed seconds]
#    - Table Count Parity: SELECT count(*) FROM information_schema.tables WHERE table_schema='public';
#    - Entity Parity: Verify row counts match 100% across Users, Students, Faculty, audit_logs.
```

---

## 4. Staging Verification Sign-Off Table

| Domain | Assessment Area | Lead Verifier | Date Verified | Result |
|---|---|---|---|:---:|
| Domain 1 | TLS, HTTPS & CORS | DevSecOps Lead | ______________ | [ ] PASS [ ] FAIL |
| Domain 2 | Frontend CSP & Vercel Headers | Cloud Architect | ______________ | [ ] PASS [ ] FAIL |
| Domain 3 | Backend HSTS & Security Headers | AppSec Lead | ______________ | [ ] PASS [ ] FAIL |
| Domain 4 | 5-Role RBAC Authorization | Security QA Lead | ______________ | [ ] PASS [ ] FAIL |
| Domain 5 | Cross-Department Boundary Scoping | Backend Lead | ______________ | [ ] PASS [ ] FAIL |
| Domain 6 | Statutory PAN Exclusion (`panCardNo`) | Data Protection Lead| ______________ | [ ] PASS [ ] FAIL |
| Domain 7 | RFC-4180 Streaming Exports | Senior QA Engineer | ______________ | [ ] PASS [ ] FAIL |
| Domain 8 | Non-Destructive Least-Privilege Inspection | PostgreSQL DBA | ______________ | [ ] PASS [ ] FAIL |
| Domain 9 | Audit Log Persistence & Immutability | Compliance Auditor | ______________ | [ ] PASS [ ] FAIL |
| Domain 10| Rate Limiting & Monitoring Alerts | SRE Lead | ______________ | [ ] PASS [ ] FAIL |
| Domain 11| Staging DR Backup & Restore Parity | PostgreSQL DBA | ______________ | [ ] PASS [ ] FAIL |

---

*Handoff Certified by:*  
Lead Application Security Auditor: _________________________ Date: _____________  
Director / Dean of IQAC: __________________________________ Date: _____________

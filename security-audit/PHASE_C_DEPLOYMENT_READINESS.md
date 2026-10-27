# CHRIST UNIVERSITY IQAC PLATFORM
# PHASE C — DEPLOYMENT READINESS & SECURITY-PRESERVING RECOVERY PLAN

**Document Version:** 1.0.0  
**Date:** October 20, 2026  
**Auditor / Architect:** Senior Application Security Architect & DevSecOps Lead  
**Classification:** Restricted Institutional Internal  
**Scope:** Staging / Production Release Safety, Rollback Prevention of Known Vulnerabilities, Migration Compatibility  

---

## 1. Executive Deployment Mandate

A production rollout must never re-introduce previously remediated vulnerabilities during an operational recovery. 

Generic rollback procedures (such as blindly redeploying an older container image or running down-migrations) represent severe security hazards: rolling back to a pre-Phase-A/B artifact would immediately restore critical vulnerabilities, including:
- Unauthorized `/clear-all` database deletions (VULN-P0-01).
- Hardcoded institutional credentials (VULN-P0-02).
- Department isolation bypasses (VULN-P0-03).
- Remote database wipe triggers (VULN-P0-04).
- IP spoofing via `proxy-addr` (Critical CVSS 9.1).
- Unrestricted wildcard CORS origins.

This document replaces generic rollback instructions with a **Security-Preserving Release Recovery Plan** and establishes strict pre-deployment readiness requirements.

---

## 2. Pre-Deployment Database Compatibility & Data Verification

Before executing any database migration in a staging or production environment, the following verification steps MUST be performed against live read replicas:

### 2.1 Duplicate Record Pre-Check for Composite Identity Constraints
Migration [`20261019_add_composite_identity_keys.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/migrations/20261019_add_composite_identity_keys.js) enforces unique composite indexes on:
1. `students ("registerNumber", "academicYear")`
2. `faculties ("employeeId", "academicYear")`

Before applying this migration to existing institutional data, DBA staff must execute read-only duplicate scans:

```sql
-- Check for existing duplicate student records in the same academic year
SELECT "registerNumber", "academicYear", COUNT(*) 
FROM students 
GROUP BY "registerNumber", "academicYear" 
HAVING COUNT(*) > 1;

-- Check for existing duplicate faculty records in the same academic year
SELECT "employeeId", "academicYear", COUNT(*) 
FROM faculties 
GROUP BY "employeeId", "academicYear" 
HAVING COUNT(*) > 1;
```

**Gate Condition:** If any rows are returned, the migration MUST NOT be executed until the respective department coordinators reconcile the conflicting historical records.

### 2.2 Backup Verification & Recovery Dry-Run
No deployment or migration may proceed without a verified, restorable physical backup:
1. **Full Consistent Dump:**
   ```bash
   pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -Fc -f "/var/backups/iqac_pre_phase_c_$(date +%Y%m%d_%H%M%S).dump"
   ```
2. **SHA-256 Checksum Generation:**
   ```bash
   sha256sum /var/backups/iqac_pre_phase_c_*.dump > /var/backups/checksum.sha256
   ```
3. **Restoration Dry-Run:**
   The backup file must be restored into an isolated verification instance (`iqac_recovery_verify`) to confirm catalog integrity and table accessibility before any production maintenance window begins.

---

## 3. Maintenance Window & Deployment Strategy

### 3.1 Downtime vs. Zero-Downtime Clarification
While frontend static assets (Vite SPA) support blue-green deployment via CDN cache-busting, the backend deployment involves:
- Adding composite unique indexes on high-traffic tables.
- Transactional advisory locking updates.
- Server restart for Express route re-binding.

Therefore, this rollout **MUST NOT be advertised as zero-downtime** until production canary metrics demonstrate zero connection drops under live traffic. A scheduled **30-minute institutional maintenance window** (e.g., Saturday 22:00–22:30 IST) is mandatory.

### 3.2 Step-by-Step Staged Deployment Sequence

1. **Institutional Maintenance Notification:**
   Post maintenance banner across portal 24 hours prior to window.
2. **Traffic Draining:**
   Configure reverse proxy (Nginx / ALB) to return HTTP 503 Maintenance Page for incoming non-admin traffic.
3. **Verified Backup Execution:**
   Execute and checksum pg_dump as defined in Section 2.2.
4. **Migration Application:**
   Execute migrations from an authorized jumpbox using a dedicated migration service account:
   ```bash
   NODE_ENV=production node -e "
   const { sequelize } = require('./src/app/backend/config/database');
   const m = require('./src/app/backend/migrations/20261019_add_composite_identity_keys');
   m.up(sequelize.getQueryInterface(), sequelize.constructor)
     .then(() => { console.log('Migration successfully applied.'); process.exit(0); })
     .catch(err => { console.error('Migration failed:', err); process.exit(1); });
   "
   ```
5. **Backend Container Deployment:**
   Deploy verified Phase C container image with `NODE_ENV=production` and `ALLOW_DATABASE_RESET=false`.
6. **Frontend Static Distribution:**
   Deploy `dist/` bundle to institutional hosting / CDN.
7. **Smoke Test Execution:**
   Execute post-deployment verification tests (Section 5).
8. **Traffic Resumption:**
   Disable maintenance banner; enable live routing.

---

## 4. Security-Preserving Release Recovery Plan

If unexpected catastrophic failures occur during or after deployment, operations staff MUST follow this recovery protocol:

### 4.1 Strict Rollback Prohibition (Blacklisted Artifacts)
- **Rule 1:** Automated rollback tools (e.g., Kubernetes rollback, Render auto-revert) MUST NEVER be pointed to any container image tag or commit hash prior to Phase A/B baseline (`commit-baseline-phase-b-final`).
- **Rule 2:** Restoring older images without Option C department isolation, login rate limiters, token version validation, or patched `proxy-addr` is strictly classified as an intentional security breach.

### 4.2 Security-Preserving Recovery Options

#### Option A: Roll-Forward Patching (Preferred)
For code defects, route errors, or UI bugs:
1. Keep the security-hardened backend container active.
2. Formulate and review a hotfix on a local branch.
3. Execute the 10 security test suites locally against `iqac_test` to confirm no regressions.
4. Build, push, and deploy the hotfix image.

#### Option B: Staged Rollback to Approved Security Baseline
If the Phase C container experiences an unrecoverable crash:
1. Revert exclusively to the immediately preceding **Phase B verified release tag** (`release-v1.2.0-phase-b-hardened`).
2. Do NOT revert database migrations down. The composite indexes (`unique_student_reg_year`, `unique_faculty_emp_year`) are fully compatible with Phase B code.

#### Option C: Database Point-in-Time Recovery (PITR)
If database corruption occurs:
1. Immediately isolate the database cluster.
2. Restore from the pre-deployment verified backup created in Step 3.
3. Verify table checksums and audit logs.
4. Re-apply verified migrations under senior DBA supervision.

---

## 5. Post-Deployment Smoke Verification Checklist

Immediately following deployment, the QA Lead and Security Engineer must execute:

1. **Health & Header Check:**
   ```bash
   curl -I https://iqac.christuniversity.in/health
   # Verify HTTP 200, Helmet security headers (X-Frame-Options, CSP, HSTS) present.
   ```
2. **CORS Enforcement:**
   ```bash
   curl -I -H "Origin: https://malicious-lookalike.com" https://api-iqac.christuniversity.in/api/students
   # Must return HTTP 403 CORS_ORIGIN_DENIED.
   ```
3. **Unauthenticated Access Rejection:**
   ```bash
   curl -I https://api-iqac.christuniversity.in/api/users
   # Must return HTTP 401 Unauthorized.
   ```
4. **Five-Role Login Smoke Check:**
   Log in with designated test accounts for each of the 5 roles (Admin, Authority, HOD, Coordinator, Faculty) and verify dashboard loading without console errors.
5. **Spreadsheet Export Verification:**
   Download a student or faculty CSV export and verify formula injection single-quote neutralization.

---

## 6. Required Institutional Operational Approvals

Before initiating deployment to any live institutional environment, the following sign-offs are mandatory:

1. **Director, Internal Quality Assurance Cell (IQAC):** Functional requirement sign-off.
2. **Dean / Director of Quality Assurance & Accreditation:** NAAC/NBA metric preservation sign-off.
3. **Chief Information Security Officer (CISO) / IT Director:** Security release gate and vulnerability audit sign-off.
4. **Lead Database Administrator (DBA):** Backup verification and migration execution approval.

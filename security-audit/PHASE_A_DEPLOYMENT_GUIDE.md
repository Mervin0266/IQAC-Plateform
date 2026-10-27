# Phase A Deployment Guide: Operations & Runbooks
# CHRIST (Deemed to be University) IQAC Platform

> **Document Type:** Production Deployment Guide & Operational Runbooks  
> **System:** CHRIST University IQAC Platform  
> **Scope:** Phase A Remediation Rollout  
> **Target Environments:** Render (Backend API), Vercel (Frontend), PostgreSQL (Database)  
> **Security Status:** Phase A Independently Verified (70 Passing Tests Across Unit, Integration, and Supertest E2E Suites)  
> **Operational Warning:** The instructions in this guide are intended solely for authorized CHRIST University DevOps and Systems Operations personnel. The independent security reviewer will NOT execute production migrations, account remediation scripts, or live deployment operations.

---

## 1. Required Environment Variables

Before rolling out the Phase A backend, verify and configure the following environment variables in the Render backend dashboard and Vercel project settings. **Never commit secret values to version control or CLI commands.**

### Backend (Render Environment)

| Variable Name | Required | Default / Example | Purpose & Security Constraint |
|---|---|---|---|
| `NODE_ENV` | **YES** | `production` | Enables production mode and activates strict security guards. |
| `DATABASE_URL` | **YES** | `postgres://user:pass@host:5432/db` | Production PostgreSQL connection string (enforce SSL `?sslmode=require`). |
| `JWT_SECRET` | **YES** | `[256-bit high-entropy secret]` | Secret key used to sign and verify HS256 JWT tokens. |
| `JWT_EXPIRE` | **YES** | `8h` (or `24h` maximum) | Maximum lifetime of issued access tokens. |
| `INITIAL_ADMIN_EMAIL` | **OPTIONAL** | `admin@christuniversity.in` | Dedicated administrative user email for bootstrapping. |
| `ALLOW_DATABASE_RESET` | **NO** | `false` | **MUST BE FALSE OR OMITTED IN PRODUCTION.** |
| `IS_DISPOSABLE_TEST_DB` | **NO** | `false` | **MUST BE FALSE OR OMITTED IN PRODUCTION.** |
| `CLIENT_URL` | **YES** | `https://iqac.christuniversity.in` | Explicit frontend origin for CORS whitelist. |

### Frontend (Vercel Environment)

| Variable Name | Required | Value | Purpose |
|---|---|---|---|
| `VITE_API_URL` | **YES** | `https://api.iqac.christuniversity.in` | Backend API gateway URL. |

---

## 2. Safe Operational Rollout Sequencing

> [!IMPORTANT]
> **Maintenance Window & Downtime Expectations:**
> Zero-downtime cannot be guaranteed during Phase A rollout because existing active sessions must be invalidated (`tokenVersion` upgrade) and database schema changes must precede application startup. Plan an atomic scheduled maintenance window of 10 to 15 minutes during off-peak hours (e.g., Sunday 02:00–02:15 IST).

Execute deployment steps in the following strict order to maintain database integrity and avoid request failures:

```mermaid
graph TD
    A[Step 1: Scheduled Maintenance Window & PostgreSQL Backup] --> B[Step 2: Run Schema Migration]
    B --> C[Step 3: Deploy Backend on Render]
    C --> D[Step 4: Execute Account Remediation Script]
    D --> E[Step 5: Deploy Frontend on Vercel]
    E --> F[Step 6: Post-Deployment Smoke Verification]
```

### Step 1: Pre-Deployment PostgreSQL Backup
Create an immediate snapshot backup of the production database before applying migrations:
```bash
# Render CLI / PostgreSQL CLI snapshot command
pg_dump -U postgres -h [HOST] -d iqac_db -F c -b -v -f "iqac_backup_pre_phase_a_$(date +%Y%m%d%H%M%S).dump"
```

### Step 2: Apply Database Schema Migration
Run the verified idempotent migration to add `mustChangePassword`, `passwordChangedAt`, and `tokenVersion` columns to the `users` table:
```bash
node src/app/backend/migrations/20261019_add_user_security_fields.js
```
*Note: The migration script utilizes `DO $$ BEGIN ... EXCEPTION WHEN duplicate_column ... END $$;` blocks and is directly executable. It safely handles pre-existing columns without throwing errors.*

### Step 3: Deploy Backend Service (Render)
1. Push release branch `release/phase-a-remediation` to Render backend deployment pipeline.
2. Confirm startup logs:
   - Verify: `Database connection established successfully`.
   - Verify: No credentials printed to console logs.
   - Verify: System confirms `Production mode: demo users are NOT seeded.`

### Step 4: Remediate Historically Seeded Accounts
Execute the idempotent remediation script to invalidate legacy factory sessions and require password resets on exposed accounts:
```bash
# From secure operational container or administrative console:
node src/app/backend/scripts/remediateCompromisedAccounts.js
```
What this does:
1. Identifies known seeded accounts (`admin@christuniversity.in`, `faculty@christuniversity.in`, etc.).
2. Re-hashes passwords to cryptographically random unusable entropy (32-byte CSPRNG hex strings).
3. Sets `mustChangePassword = true`.
4. Increments `tokenVersion` to revoke all active JWT sessions instantly.
5. Records administrative audit log in `audit_logs`.

### Step 5: Deploy Frontend Application (Vercel)
Deploy the updated frontend to Vercel. Ensure `import.meta.env.PROD` is active so that `ClearDatabaseButton` is completely removed from the DOM.

---

## 3. Operational Runbooks for Authorized Administrators

### Runbook A: Provisioning a New Administrator CLI
When a new institutional administrator must be created or updated without exposing credentials:

> [!CAUTION]
> **Zero Credential Exposure Rule:**
> NEVER pass passwords as command-line arguments (e.g. `--password=secret`). Command-line arguments leak into process listings (`ps aux`), shell histories (`~/.bash_history`, `Get-History`), CI/CD runner logs, and container audit trails. `provisionAdmin.js` actively blocks `--password` arguments.

Execute the provisioning CLI interactively or via secure pipe:
```bash
# Method 1: Interactive prompt (Recommended)
node src/app/backend/scripts/provisionAdmin.js --email="dr.admin@christuniversity.in"

# Method 2: Via environment variable in ephemeral session
ADMIN_PROVISION_PASSWORD="[HighEntropyPassphrase@2026!]" node src/app/backend/scripts/provisionAdmin.js --email="dr.admin@christuniversity.in"
```
The script will:
1. Reject any `--password` flags to prevent process-table leaks.
2. Prompt for the password securely or read from `ADMIN_PROVISION_PASSWORD`.
3. Validate minimum 10-character length.
4. Hash the password with Bcrypt (cost factor 10) via Sequelize hooks.
5. Set `mustChangePassword = true` and increment `tokenVersion`.
6. Enforce password reset upon first browser login.

### Runbook B: Emergency Revocation of an Individual User Session
If an institutional account is suspected of compromise:
```bash
# Connect to PostgreSQL via psql:
psql $DATABASE_URL -c "UPDATE users SET \"tokenVersion\" = \"tokenVersion\" + 1, \"updatedAt\" = NOW() WHERE email = 'compromised_user@christuniversity.in';"
```
*All active JWT tokens held by that user will be rejected with HTTP 401 `TOKEN_REVOKED` immediately on their next request.*

---

## 4. Post-Deployment Verification & Health Checks

Perform the following smoke tests against the production deployment:

1. **Health Check:** `GET /api/system/health` returns HTTP 200 with `{ status: "healthy" }`.
2. **Database Wipe Protection Test:**
   ```bash
   curl -X POST https://api.iqac.christuniversity.in/api/system/clear-database \
     -H "Content-Type: application/json" \
     -d '{"confirmation":"CONFIRM_RESET"}'
   ```
   **Expected Response:** HTTP 403 Forbidden with `{ "success": false, "message": "System database reset is strictly forbidden in 'production' environments." }`.
3. **Legacy Token Rejection Test:**
   Submit an API request using a legacy token without `tokenVersion`.
   **Expected Response:** HTTP 401 Unauthorized with `{ "code": "TOKEN_REVOKED" }`.
4. **Faculty PAN Masking Test:**
   Call `GET /api/faculty` with valid token.
   **Expected Response:** `panCardNo` attribute is absent from all items in `data` array.

---

## 5. Recovery, Hotfix & Roll-Forward Strategy

> [!WARNING]
> **Strict Prohibition: Never Roll Back to Known-Vulnerable Releases**
> Under NO circumstances should operations roll back to pre-Phase A backend releases. Pre-Phase A builds contain critical P0 vulnerabilities:
> - Unauthenticated university-wide database wiping via public `/clear-all` routes.
> - Hardcoded, universally known factory passwords for administrative and academic accounts.
> - Absence of department scoping, permitting cross-department data destruction.
>
> Rolling back to a pre-Phase A commit would instantly re-open these critical vulnerabilities to the public internet.

### 5.1 Secure Roll-Forward / Hotfix Procedure
If a defect or operational regression is discovered post-deployment:
1. **Identify and isolate the defect:** Inspect Render application logs and PostgreSQL error logs.
2. **Apply targeted hotfix:** Create a hotfix branch branched from the verified Phase A release commit.
3. **Run automated security suites:** Ensure `phase_a_integration.test.cjs` and `phase_a_e2e_supertest.test.cjs` pass 100% on the hotfix commit before tagging.
4. **Deploy hotfix:** Deploy the hotfix build to Render.

### 5.2 Do NOT Drop Security Columns
Do NOT drop `tokenVersion`, `mustChangePassword`, or `passwordChangedAt` from the `users` table:
- Dropping these columns destroys audit history, resets session revocation tracking, and causes security middleware to fail.
- The `down` migration contains a built-in safety guard that refuses to drop security columns when `NODE_ENV === 'production'`.

### 5.3 Disaster Recovery: Point-in-Time Database Restore
If physical database corruption occurs during rollout:
1. Restore the snapshot dump created in Step 1:
   ```bash
   pg_restore -U postgres -h [HOST] -d iqac_db -v -c "iqac_backup_pre_phase_a_[TIMESTAMP].dump"
   ```
2. Immediately re-apply the schema migration:
   ```bash
   node src/app/backend/migrations/20261019_add_user_security_fields.js
   ```
3. Re-run the account remediation script:
   ```bash
   node src/app/backend/scripts/remediateCompromisedAccounts.js
   ```
This ensures the restored database is never left running without the mandatory Phase A security schema and credential protections.

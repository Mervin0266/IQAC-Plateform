# CHRIST UNIVERSITY IQAC PLATFORM
# PRODUCTION CREDENTIAL ROTATION & SECRET GOVERNANCE RUNBOOK

> **Document Type:** Operational Security Standard & Credential Lifecycle Runbook  
> **System:** CHRIST (Deemed to be University) — Internal Quality Assurance Cell (IQAC)  
> **Audience:** Senior PostgreSQL DBA, Lead Systems Administrator, DevSecOps Architect  
> **Execution Constraint:** Live credentials must NEVER be committed to Git or rotated by unauthorized automated agents. This runbook is strictly for designated university operational staff.  
> **Target Cutover Date:** Pre-Production Staging & Cutover Window

---

## 1. Secret Inventory & Entropy Standards

The IQAC platform uses the following distinct categories of credentials across its hosting, database, and application tiers:

| Secret Identifier | Target Service | Risk Scope if Compromised | Minimum Complexity & Cryptographic Standard |
|---|---|---|---|
| `DATABASE_URL` (Migrator) | Render / PostgreSQL Host | Full Schema Ownership & DDL Modification | 32+ character CSPRNG string (`openssl rand -base64 32`) |
| `DATABASE_URL` (App Runtime) | Render / PostgreSQL Host | Direct DML Access to Student & Faculty Data | 32+ character CSPRNG string (`openssl rand -base64 32`) |
| `JWT_SECRET` | Express API Middleware | Forged Authentication Tokens for Any Role | 64 hexadecimal characters representing **256 bits of cryptographic entropy** (`openssl rand -hex 32`) |
| `INITIAL_ADMIN_PASSWORD` | First-Login Bootstrap | System Takeover (Universal Admin Access) | 16+ character mixed-case, numbers, symbols (provisioned via CLI) |
| `VERCEL_DEPLOY_HOOK` | Vercel Deployment Tier | Unauthorized Frontend Deployment | UUID v4 / Vercel API Token |

> [!NOTE]
> **Configuration Variable Distinction:**  
> - **Active Runtime Variables:** `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRE` (enforced canonical default: `1h`), `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `COOKIE_DOMAIN`.
> - **Operational / CLI Variables:** `ADMIN_PROVISION_PASSWORD`, `INITIAL_ADMIN_EMAIL`.
> - **External Vault Management:** HashiCorp Vault / AWS Secrets Manager integration is an institutional operational recommendation; direct environment variable injection via hosting dashboards (Render/Vercel) represents the current staging configuration.

---

## 2. DBA-Approved Database Credential Rotation Sequence

> [!WARNING]
> **Connection Pool Availability:** In PostgreSQL, executing `ALTER ROLE iqac_app_user WITH PASSWORD '...'` immediately invalidates existing pooled connections upon next re-authentication or pool renewal. Unplanned password rotation will cause transient `500 Server Error` or `SequelizeConnectionRefusedError` responses.
> To prevent application disruption, follow one of the two DBA-approved strategies below:

### Strategy A: Dual-Role Overlapping Cutover (Zero Downtime)
1. **Provision Secondary Runtime Role:**
   ```sql
   -- Connect as postgres superuser via psql
   CREATE ROLE iqac_app_user_v2 WITH LOGIN PASSWORD 'NEW_STRONG_CSPRNG_PASSWORD' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
   GRANT CONNECT ON DATABASE iqac_prod TO iqac_app_user_v2;
   GRANT USAGE ON SCHEMA public TO iqac_app_user_v2;
   REVOKE CREATE ON SCHEMA public FROM iqac_app_user_v2;
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO iqac_app_user_v2;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO iqac_app_user_v2;
   REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM iqac_app_user_v2;
   -- Enforce audit log immutability
   REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.audit_logs FROM iqac_app_user_v2;
   ```
2. **Update Application Environment Configuration:**
   - In Render Dashboard → Environment: update `DATABASE_URL` with credentials for `iqac_app_user_v2`.
   - Trigger a rolling deployment. Active instances will gracefully drain connections on the old role while new instances connect using `iqac_app_user_v2`.
3. **Decommission Previous Role:**
   - After new instances pass health checks, revoke connect and drop `iqac_app_user`:
     ```sql
     REVOKE CONNECT ON DATABASE iqac_prod FROM iqac_app_user;
     -- After 24-hour verification window:
     DROP ROLE iqac_app_user;
     -- Rename role to canonical name if desired during next maintenance window
     ```

### Strategy B: Scheduled Off-Peak Maintenance Window (15 Minutes)
1. Announce scheduled maintenance window (e.g., 23:00 - 23:15 IST).
2. Enable maintenance page on Vercel frontend.
3. Execute password rotation on PostgreSQL:
   ```sql
   ALTER ROLE iqac_app_user WITH PASSWORD 'NEW_STRONG_CSPRNG_PASSWORD';
   ALTER ROLE iqac_migrator WITH PASSWORD 'NEW_STRONG_CSPRNG_MIGRATOR_PASSWORD';
   ```
4. Update `DATABASE_URL` in Render Dashboard.
5. Restart backend services, verify health checks (`GET /health` -> 200), and disable maintenance mode.

---

## 3. JWT Secret Rotation & Universal Session Invalidation

Rotating `JWT_SECRET` immediately renders all outstanding browser tokens cryptographically invalid.

1. **Generate 256-Bit Cryptographic Secret:**
   ```bash
   openssl rand -hex 32
   # Outputs exact 64-character hexadecimal string (256 bits of entropy)
   ```
2. **Update Application Environment:**
   - Update `JWT_SECRET` in Render Dashboard.
   - Verify `JWT_EXPIRE=1h` (canonical institutional baseline).
3. **Database-Layer Session Invalidation:**
   In PostgreSQL, increment `tokenVersion` across all existing users to ensure that any cached tokens are permanently rejected even if the old secret were retained:
   ```sql
   -- Universal Session Revocation
   UPDATE "Users" SET "tokenVersion" = COALESCE("tokenVersion", 0) + 1;
   ```
4. **Trigger Service Restart:**
   Restart the backend service on Render to load the fresh `JWT_SECRET`.

---

## 4. Initial Administrator Provisioning via Application CLI

> [!CAUTION]
> **Prohibition of Direct SQL Inserts:** Never execute raw `INSERT INTO "Users"` statements with placeholder bcrypt hashes. Raw inserts bypass Sequelize model validations, skip audit logging, and risk password hash corruption.

Use the verified institutional provisioning utility [`src/app/backend/scripts/provisionAdmin.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/scripts/provisionAdmin.js):

```bash
# Execute from application root directory on a secure administrative shell
cd src/app/backend

# Option 1: Interactive Secure Prompt (Password is NOT echoed to console)
node scripts/provisionAdmin.js --email=iqac.admin@christuniversity.in

# Option 2: Environment Variable Injection (For automated vault pipelines)
ADMIN_PROVISION_PASSWORD="InitialTemporarySecurePassword123!" node scripts/provisionAdmin.js --email=iqac.admin@christuniversity.in
```

### Automatic Protections Enforced by `provisionAdmin.js`:
- Password complexity validation (minimum 10 characters).
- Cryptographic bcrypt hashing with salt rounds = 12.
- `mustChangePassword: true` flag set automatically.
- User is forced to change password via `PUT /api/auth/password` immediately upon first login before accessing any platform feature.

---

## 5. Post-Rotation Verification & Operational Checklist

| Check ID | Verification Task | Expected Result | Operational Sign-Off |
|---|---|---|:---:|
| **ROT-01** | Test connection with old PostgreSQL password | Connection rejected (`password authentication failed for user`) | [ ] DBA |
| **ROT-02** | Test connection with new PostgreSQL credentials | Connection succeeded over SSL (`SELECT 1;`) | [ ] DBA |
| **ROT-03** | Verify audit log immutability for app role | `UPDATE audit_logs ...` returns `permission denied for table` | [ ] DBA |
| **ROT-04** | Verify old JWT bearer token against API | Request rejected with 401 (`Invalid token.` or `TOKEN_REVOKED`) | [ ] AppSec Lead |
| **ROT-05** | Perform fresh login with rotated admin credentials | Returns 200 OK with fresh 1-hour JWT | [ ] AppSec Lead |
| **ROT-06** | Test password update flow (`PUT /api/auth/password`) | Password updated, `tokenVersion` incremented, `mustChangePassword` cleared | [ ] QA Lead |
| **ROT-07** | Inspect Render and Vercel audit logs | Verify deployment and restart events recorded with timestamp | [ ] SysAdmin |

---

*Certified by:*  
Lead Systems Administrator: ___________________________ Date: ______________  
Senior PostgreSQL DBA: _______________________________ Date: ______________  
Lead DevSecOps Architect: ____________________________ Date: ______________

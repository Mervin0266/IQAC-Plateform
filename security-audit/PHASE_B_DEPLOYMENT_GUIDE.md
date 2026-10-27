# CHRIST UNIVERSITY IQAC PLATFORM
# PHASE B PRODUCTION DEPLOYMENT & DEVSECOPS GUIDE

> **Document Type:** Production Deployment, Configuration & Operations Guide  
> **System:** CHRIST (Deemed to be University) — IQAC Platform  
> **Scope:** Phase B Security Hardened Release  
> **Target Environments:** Render / AWS ECS (Backend API), Vercel / Cloudflare Pages (Frontend SPA), Managed PostgreSQL  
> **Status:** 🟢 **READY FOR STAGED INSTITUTIONAL ROLLOUT**

---

## 1. Prerequisites & Environment Configurations

### 1.1 Backend Environment Variables (`src/app/backend/.env`)

Ensure the following variables are configured in the target production environment secrets manager. **Never commit these values to source control.**

```ini
# Core Environment
NODE_ENV=production
PORT=5000

# PostgreSQL Connection (Use SSL in production)
DATABASE_URL=postgres://[DB_USER]:[DB_PASSWORD]@[DB_HOST]:5432/[DB_NAME]?sslmode=require

# JWT Authentication
JWT_SECRET=[GENERATE_64_CHAR_HEX_SECRET_VIA_OPENSSL]
JWT_EXPIRE=24h

# Network & CORS Security (Workstream B2)
# Specify exact production origins separated by comma; NO wildcards permitted
CLIENT_URL=https://iqac.christuniversity.in
ALLOWED_ORIGINS=https://iqac.christuniversity.in,https://iqac-platform.vercel.app

# Reverse Proxy Trust (Workstream B2)
# Set to '1' if behind a single reverse proxy (Render / Nginx) or 'loopback'
TRUST_PROXY=1

# Dedicated Login Rate Limiter (Workstream B1)
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=5

# Safety Guardrail (Permanent lock in production)
ALLOW_DATABASE_RESET=false
```

### 1.2 Frontend Environment Variables (`.env.production`)

```ini
VITE_API_URL=https://api-iqac.christuniversity.in
```

---

## 2. Step-by-Step Deployment Procedure

### Step 1: Database Migration Execution (Zero Downtime)
Before starting updated backend containers, run the versioned idempotent migrations in order:

```bash
cd src/app/backend

# 1. Apply Phase A User Security Tracking Fields (tokenVersion, mustChangePassword)
node migrations/20261019_add_user_security_fields.js

# 2. Apply Phase B Composite Identity Keys & Patent Schema Fixes
node migrations/20261019_add_composite_identity_keys.js
```

*Verification:* Confirm terminal output displays `✓ Migration applied successfully.` for both scripts.

### Step 2: Backend Container Build & Deployment
Install production dependencies using locked package definitions:

```bash
cd src/app/backend
npm ci --production
npm start
```

*Verification:*
1. Inspect startup logs to confirm `morgan` is not logging in `dev` mode.
2. Verify `/health` endpoint:
   ```bash
   curl -i https://api-iqac.christuniversity.in/health
   # Expected: HTTP 200 {"success":true,"message":"IQAC Backend API is running"}
   ```

### Step 3: Frontend Build & CDN Deployment
Compile and deploy the client bundle:

```bash
pnpm install --frozen-lockfile
pnpm build
```

Deploy the resulting `dist/` directory to Vercel, Cloudflare Pages, or institutional S3/CloudFront.

---

## 3. Post-Deployment Verification & Smoke Tests

Execute the following manual checks immediately following deployment:

1. **Exact-Origin CORS Validation:**
   ```bash
   # Approved Origin -> Expected: HTTP 200 with Access-Control-Allow-Origin
   curl -I -H "Origin: https://iqac.christuniversity.in" https://api-iqac.christuniversity.in/health

   # Unapproved Lookalike Origin -> Expected: HTTP 403 CORS_ORIGIN_DENIED
   curl -I -H "Origin: https://attacker-lookalike.com" https://api-iqac.christuniversity.in/api/users
   ```

2. **Login Rate Limiting Verification:**
   Submit 6 consecutive invalid login requests to `POST /api/auth/login`. Confirm that attempt 6 returns `HTTP 429` with `AUTH_RATE_LIMITED`.

3. **API Bounded Pagination Verification:**
   Query `GET /api/students?limit=5000`. Confirm that response metadata indicates `pagination.limit: 100`.

4. **Option C Department Isolation Verification:**
   Log in as a Department Coordinator and verify student and faculty directory views display only records for that department.

---

## 4. Emergency Rollback Procedure

If unexpected operational failures occur:

1. **Frontend Rollback:** Revert CDN / Vercel deployment to the previous immutable release deployment ID.
2. **Backend Rollback:** Re-deploy previous container image tag.
3. **Database Schema Backward Compatibility:**
   The composite indexes created in migration `20261019_add_composite_identity_keys.js` are strictly non-destructive and backward compatible with previous read queries.
   If rolling back migrations is explicitly required:
   ```bash
   node -e "
   const { sequelize } = require('./config/database');
   const m = require('./migrations/20261019_add_composite_identity_keys');
   m.down(sequelize.getQueryInterface(), sequelize.constructor).then(() => process.exit(0));
   "
   ```

---

## 5. Security Guardrails & Prohibitions

1. **NEVER run automated security test suites against production databases.** Automated test suites execute destructive cleanup tests against test databases. The built-in `testDatabaseGuard.js` will abort if attempted, but production credentials must never be passed to test runners.
2. **NEVER set `ALLOW_DATABASE_RESET=true` in production.**
3. **NEVER set `NODE_ENV=test` in production runtime environments.**

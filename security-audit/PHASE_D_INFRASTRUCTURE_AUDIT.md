# CHRIST UNIVERSITY IQAC PLATFORM
## PHASE D — INFRASTRUCTURE CONFIGURATION AUDIT & HARDENING

**Document Version:** 1.0.0  
**Classification:** Cloud Security Architecture & Infrastructure Review  
**Target Environments:** Render Backend (Web Service), Vercel Frontend (Edge/Static), Managed PostgreSQL  
**Author:** Senior Cloud Security Architect, DevSecOps Lead  
**Date:** October 20, 2026  
**Status:** AUDITED & LOCALLY HARDENED — STAGED DEPLOYMENT READY  

---

### 1. INFRASTRUCTURE COMPONENT INVENTORY

| Infrastructure Component | Hosting Provider / Architecture | Hostname / URI Pattern | Primary Security Responsibility | Hardening Status |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API Service** | Render (Node.js Web Service) | `https://api-iqac.christuniversity.in` / `*.onrender.com` | API routing, JWT auth, business logic, PostgreSQL ORM, file uploads | **HARDENED** |
| **Frontend Web App** | Vercel (Edge CDN / Static SPA) | `https://iqac.christuniversity.in` / `*.vercel.app` | React SPA, Vite bundle delivery, client-side routing, UI rendering | **HARDENED** |
| **Database Tier** | Managed PostgreSQL (Render / RDS) | Private internal VPC / TLS endpoint | Persistent relational storage, sequence keys, audit logs | **HARDENED** |
| **Reverse Proxy / Edge** | Cloudflare / Vercel Edge / Render NGINX | Institutional domain apex | TLS termination, DDoS mitigation, WAF, header enforcement | **REVIEWED** |

---

### 2. THE 15 MANDATORY INFRASTRUCTURE SECURITY CONTROLS

#### 1. Production NODE_ENV and Debug Settings
- **Configuration:** `NODE_ENV=production` is strictly enforced in production environments.
- **Audit Finding:** In `server.js`, `process.env.NODE_ENV === 'production'` disables verbose Morgan request logging, disables stack trace exposures in error responses, disables local development CORS origins, and shuts down automatic database seeding.

#### 2. Secret Storage and Injection
- **Configuration:** All secrets (`JWT_SECRET`, `DATABASE_URL`, `ADMIN_PASSWORD`) are injected exclusively via environment variables.
- **Audit Finding:** Zero secrets exist in tracked source code or git history. The CI pipeline incorporates automated regex secret scanning that aborts if private keys, tokens, or connection strings are committed.

#### 3. Minimum Database Privileges
- **Configuration:** Segregation of database roles is defined:
  - `iqac_app_user`: DML privileges only (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) on application tables. Prohibited from DDL (`CREATE`, `ALTER`, `DROP`).
  - `iqac_migrator`: DDL privileges allowed strictly during CI/CD migration runs.
  - `iqac_test_user`: Scoped exclusively to disposable `*_test` databases.

#### 4. TLS Configuration and Certificate Validation
- **Configuration:** PostgreSQL connection in `database.js` requires SSL in production (`enableSsl = true`).
- **Hardening Added:** Configured `DB_SSL_REJECT_UNAUTHORIZED` and optional `DB_CA_CERT` path to support strict institutional or cloud CA validation without blind `rejectUnauthorized: false`.

#### 5. Reverse Proxy Trust Configuration
- **Configuration:** Express `trust proxy` is configured strictly to `1` in production behind Render/Cloudflare, and `false` in development/test.
- **Audit Finding:** Prevents client-side IP spoofing via crafted `X-Forwarded-For` headers while preserving accurate audit logging of real client IP addresses.

#### 6. Exact-Origin CORS Configuration
- **Configuration:** CORS middleware matches against an explicit allowlist parsed from `CLIENT_URL` and `ALLOWED_ORIGINS`.
- **Audit Finding:** All wildcard regexes (`*.vercel.app`, `*.onrender.com`) have been completely eliminated. Arbitrary lookalike domains (`christuniversity.in.attacker.com`) are rejected fail-closed with HTTP 403 / no Access-Control headers.

#### 7. HTTPS Enforcement & HSTS
- **Configuration:** Enforced 1-year HSTS (`max-age=31536000; includeSubDomains; preload`).
- **Audit Finding:** In production behind Render/Vercel, unencrypted HTTP traffic is redirected to HTTPS at the edge. The HSTS header instructs modern browsers to never issue unencrypted HTTP requests to the domain.

#### 8. Production Security Headers
- **Configuration:** Full Helmet suite active with custom Content-Security-Policy:
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; imgSrc 'self' data: blob: https:; font-src 'self' https: data:; connect-src 'self' https://iqac.christuniversity.in; object-src 'none'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  ```

#### 9. Error Logging Without Sensitive Data
- **Configuration:** Global Express error handler sanitizes messages in production (`An internal server error occurred. Please contact the system administrator`).
- **Audit Finding:** Error responses never expose stack traces, database schemas, SQL statements, or file paths. Audit logger masks PAN numbers, passwords, and tokens before writing to `audit_logs`.

#### 10. Safe Health-Check Behavior
- **Configuration:** Endpoint `/health` returns `{ success: true, message: "IQAC Backend API is running", timestamp }`.
- **Audit Finding:** Zero internal infrastructure data, database credentials, software version numbers, or environment variables are disclosed.

#### 11. Production Database-Reset Prohibition
- **Configuration:** Endpoint `POST /api/system/clear-database` requires `admin` role, re-authentication with current admin password, confirmation string `CONFIRM_DISPOSABLE_DATABASE_RESET`, and passes through `environmentGuard.js`.
- **Audit Finding:** In production (`NODE_ENV=production`), the reset operation is permanently prohibited and logs a high-severity security alert (`SECURITY_ALERT_DATABASE_WIPE_BLOCKED`).

#### 12. Restriction of Internal Operational Endpoints
- **Configuration:** Internal endpoints (`/api/system/clear-database`, `/api/users/*`) are restricted strictly to the `admin` role.
- **Audit Finding:** Unauthenticated requests receive HTTP 401; non-admin roles receive HTTP 403.

#### 13. Build-Time and Runtime Environment Separation
- **Configuration:** The React/Vite frontend is pre-compiled at build time (`pnpm build`) into static HTML/CSS/JS artifacts.
- **Audit Finding:** Only public `VITE_*` variables (`VITE_API_URL`) are embedded in the browser bundle. Backend secrets, database connection strings, and server-side private keys never enter the build environment or bundle.

#### 14. Exposure of Source Maps and Internal Files
- **Configuration:** Production Vite build emits minified assets without inline source maps.
- **Audit Finding:** Internal files (`.env`, `package.json`, `.git`, backend source) are never exposed via the static web root. `vercel.json` and static hosting rules prevent direct file browsing.

#### 15. Safe Vercel and Render Deployment Manifests
- **Configuration:** `vercel.json` configures single-page application rewriting (`"source": "/(.*)", "destination": "/index.html"`).
- **Audit Finding:** No hardcoded production URLs or unverified external domains exist in configuration manifests.

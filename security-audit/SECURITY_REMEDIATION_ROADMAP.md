# Security Remediation Roadmap: Christ University IQAC Platform

> **Target System:** CHRIST (Deemed to be University) — IQAC Platform  
> **Execution Strategy:** Phased, Non-Destructive, Architecture-Compatible Hardening  
> **Precondition:** Implementation strictly requires explicit user approval per phase.  

---

## Remediation Phasing Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                   SECURITY REMEDIATION TIMELINE                        │
└────────────────────────────────────────────────────────────────────────┘

 [Phase A: Critical Blockers] ──▶ Must resolve before any production deployment
   ├── REM-A1: Restrict /clear-all destructive routes to Admin only
   ├── REM-A2: Eliminate hardcoded credentials & enforce initial password reset
   ├── REM-A3: Fix department scoping bypass in middleware & student/faculty queries
   └── REM-A4: Lock down /api/system/clear-database & preserve audit logs

 [Phase B: Auth & Access Hardening] ──▶ Core Identity & Network Defenses
   ├── REM-B1: Implement dedicated login brute-force rate limiter
   ├── REM-B2: Redact PAN card numbers from GET /api/faculty
   ├── REM-B3: Lock down CORS allowed origins (eliminate wildcard regex)
   └── REM-B4: Fix signature mismatch in auditLogger to restore audit logging

 [Phase C: Data & API Protection] ──▶ Operational Reliability & Data Hygiene
   ├── REM-C1: Introduce pagination (limit/offset) on unbounded table queries
   ├── REM-C2: Remove DDL (ALTER TABLE) queries from bulk upload request handlers
   ├── REM-C3: Escaped spreadsheet exports against CSV/Formula injection
   └── REM-C4: Enforce strict DTO projection on document updates (mass assignment)

 [Phase D: Infrastructure & Dependencies] ──▶ Supply Chain & Operational Runbooks
   ├── REM-D1: Patch Critical & High vulnerabilities (proxy-addr, tar, braces)
   └── REM-D2: Document Render/Vercel custom-domain same-site cookie migration

 [Phase E: Continuous Security Verification] ──▶ CI/CD Pipeline Gates
   ├── REM-E1: Add automated Jest/Supertest RBAC regression test suite
   └── REM-E2: Configure pre-commit secret scanning & automated dependabot alerts
```

---

## Phase A: Critical Blockers (Immediate Mandatory Fixes)

### [REM-A1] Restrict Destructive `/clear-all` Routes Strictly to System Administrators
* **Objective:** Prevent Department Coordinators and HODs from deleting university-wide tables.
* **Affected Files:**
  * [`src/app/backend/routes/students.js:16`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/routes/students.js#L16)
  * [`src/app/backend/routes/faculty.js:15`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/routes/faculty.js#L15)
  * [`src/app/backend/routes/placements.js:17`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/routes/placements.js#L17)
  * [`src/app/backend/routes/publications.js:20`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/routes/publications.js#L20)
  * [`src/app/backend/routes/patents.js:20`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/routes/patents.js#L20)
  * [`src/app/backend/routes/achievements.js:18`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/routes/achievements.js#L18)
* **Remediation Specification:**
  Change route middleware from `authorize('admin', 'coordinator', 'hod')` to `authorize('admin')`.
  In controllers, ensure if non-admins ever clear their section, the query is strictly scoped:
  ```javascript
  where: { department: req.user.department }
  ```
* **Testing Strategy:** Issue `DELETE /api/students/clear-all` with coordinator Bearer token; verify HTTP 403 Forbidden.
* **Regression Risk:** Low. Coordinators should only manage records via individual deletes or department-scoped imports.
* **Rollback Plan:** Revert route authorization arguments.

---

### [REM-A2] Eliminate Hardcoded Credentials & Enforce First-Login Reset
* **Objective:** Eliminate predictable default credentials from Git and database seeds.
* **Affected Files:**
  * [`src/app/backend/config/autoSeed.js:697-747`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/config/autoSeed.js#L697-L747)
  * [`src/app/backend/models/User.js:46`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/models/User.js#L46)
* **Remediation Specification:**
  1. Add `mustChangePassword: { type: DataTypes.BOOLEAN, defaultValue: false }` to `User.js`.
  2. In `autoSeed.js`, generate cryptographically random passwords if environment variables (`INITIAL_ADMIN_PASSWORD`) are not provided, and set `mustChangePassword: true`.
  3. Frontend redirects users to password update screen if `mustChangePassword === true`.
* **Testing Strategy:** Log in with newly seeded user; verify that API blocks standard requests until password is changed.
* **Regression Risk:** Low.
* **Rollback Plan:** Revert `mustChangePassword` requirement in login controller.

---

### [REM-A3] Fix Department Scoping Bypass in Middleware & Controllers
* **Objective:** Enforce department isolation for HOD, Coordinator, and Faculty roles.
* **Affected Files:**
  * [`src/app/backend/middleware/auth.js:78-100`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/middleware/auth.js#L78-L100)
  * [`src/app/backend/controllers/studentController.js:101-138`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/studentController.js#L101-L138)
* **Remediation Specification:**
  Rewrite `checkDepartment` so that for non-admin/authority roles, it automatically attaches `req.scopedDepartment = req.user.department`. In `studentController.js`:
  ```javascript
  if (req.user.role !== 'admin' && req.user.role !== 'authority') {
    where.department = req.user.department;
  } else if (req.query.department && req.query.department !== 'all') {
    where.department = req.query.department;
  }
  ```
* **Testing Strategy:** Issue `GET /api/students` with CSE Coordinator token; verify only CSE students are returned.
* **Regression Risk:** Low. Matches documented institutional security policies.

---

### [REM-A4] Secure `/api/system/clear-database` and Preserve Audit Logs
* **Objective:** Prevent catastrophic institutional data loss and preserve forensic history.
* **Affected Files:**
  * [`src/app/backend/routes/system.js:9`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/routes/system.js#L9)
  * [`src/app/backend/controllers/systemController.js:7-60`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/systemController.js#L7-L60)
* **Remediation Specification:**
  1. Add environment check:
     ```javascript
     if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SYSTEM_CLEAR) {
       return res.status(403).json({ success: false, message: 'Database wipe disabled in production.' });
     }
     ```
  2. Remove `if (AuditLog) await AuditLog.destroy(...)`. Audit logs must NEVER be deleted.
  3. Require `adminPassword` in request body and verify via `await req.user.comparePassword(adminPassword)`.
* **Testing Strategy:** Issue `POST /api/system/clear-database` without password; verify HTTP 400/403.
* **Regression Risk:** None. Protects production integrity.

---

## Phase B: Authentication & Authorization Hardening

* **[REM-B1] Dedicated Login Rate Limiter:** Attach `rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: 'Too many login attempts. Please try again in 15 minutes.' })` to `POST /api/auth/login` in [`routes/auth.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/routes/auth.js).
* **[REM-B2] Faculty PAN Number Redaction:** In [`controllers/facultyController.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/facultyController.js), add `attributes: { exclude: ['panCardNo'] }` to all public and departmental queries.
* **[REM-B3] Strict CORS Allowed Origins:** In [`server.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/server.js), remove regex matching on `*.vercel.app` and `*.onrender.com`. Compare incoming origins strictly against an explicit whitelist loaded from `CLIENT_URL`.
* **[REM-B4] Harmonize Audit Logger Function Call:** Fix parameter passing in [`controllers/publicationController.js:551`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/publicationController.js#L551) and [`controllers/patentController.js:812`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/patentController.js#L812) to pass `{ recordId, user: req.user, action, remarks }`, and capture `req.ip` into `ipAddress`.

---

## Phase C: Data & API Protection

* **[REM-C1] Query Pagination:** Implement `page = parseInt(req.query.page) || 1` and `limit = Math.min(parseInt(req.query.limit) || 50, 100)` in `studentController.js`, `facultyController.js`, and `publicationController.js`.
* **[REM-C2] Remove DDL from Request Handlers:** Remove `sequelize.query('ALTER TABLE ...')` from `facultyController.js` and `studentController.js`. Place any needed constraint drops into one-time startup scripts.
* **[REM-C3] Formula Injection Neutralization:** In [`BulkUploadDialog.tsx`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/BulkUploadDialog.tsx) and page export handlers, prepend `'` to any string cell value beginning with `=`, `+`, `-`, or `@`.
* **[REM-C4] Mass Assignment Protection:** In `documentController.js`, explicitly pick allowed fields (`title`, `description`, `category`, `subcategory`, `academicYear`) rather than spreading `req.body`.

---

## Phase D: Infrastructure, Dependencies & Supply Chain

* **[REM-D1] Patch Vulnerable Dependencies:** Upgrade `express`, `proxy-addr`, `braces`, `tar`, and `source-map-js` to their patched versions via `npm update` and `pnpm update`.
* **[REM-D2] Custom Domain Architecture Setup:** Configure CNAME DNS records on Christ University's domain for both frontend and backend to enable first-party cookie support in Phase E.

---

## Phase E: Continuous Security Verification

* **[REM-E1] Automated Security Regression Suite:** Implement Jest + Supertest suites in `src/app/backend/tests/security/` executing the five-role authorization matrix on every pull request.
* **[REM-E2] Automated Dependabot & Secret Scanning:** Enable GitHub Secret Scanning and Dependabot alerts on the repository.

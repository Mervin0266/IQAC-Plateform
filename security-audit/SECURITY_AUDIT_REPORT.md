# Comprehensive Security Audit Report: Christ University IQAC Platform

> **Audit Date:** October 19, 2026  
> **Target System:** CHRIST (Deemed to be University) — Internal Quality Assurance Cell (IQAC) Platform  
> **Auditor Role:** Senior Application Security Architect, Penetration Testing Specialist & DevSecOps Auditor  
> **Assessment Mode:** Read-Only Static Code Analysis, Configuration Review, and Dependency Audit  
> **Classification:** Highly Confidential — Institutional Cybersecurity & Compliance Document  

---

## 1. Executive Security Assessment

A rigorous, evidence-driven security audit of the **Christ University IQAC Platform** was conducted across the frontend SPA (React 18 / Vite 6 / TypeScript), the backend REST API (Node.js / Express 4 / Sequelize 6), PostgreSQL data models, Git commit history, configuration manifests, and production deployment descriptors (Vercel + Render).

### 1.1 Overall Security Posture: **BLOCKED FOR PRODUCTION RELEASE**

While the application features well-intentioned defensive controls—including Helmet HTTP headers, Bcrypt password hashing, and Sequelize ORM parameterization—the current implementation suffers from **several critical architectural vulnerabilities and authorization flaws** that represent immediate institutional risk:

1. **Catastrophic Destructive Authority for Department Roles (P0):** Any HOD or Coordinator can issue single unparameterized HTTP `DELETE` requests to `/api/students/clear-all`, `/api/faculty/clear-all`, `/api/placements/clear-all`, etc., instantly truncating entire university datasets across all departments.
2. **Hardcoded Administrative Credentials in Git History & Seed Scripts (P0):** Predictable default passwords (`Admin@123`, `Authority@123`, `Hod@123`, `Coordinator@123`, `Faculty@123`) were committed to Git and remain hardcoded in `autoSeed.js` and `initDatabase.js`.
3. **Broken Departmental Scoping & Horizontal Privilege Escalation (P0):** `GET /api/students` and `GET /api/faculty` perform unconstrained full-table queries without filtering by `req.user.department`, exposing institution-wide PII.
4. **Exposure of Highly Sensitive Financial & Statutory Data (P1):** `GET /api/faculty` returns raw PAN Card numbers (`panCardNo`) institution-wide in plaintext without attribute exclusion.
5. **Permissive Cross-Tenant CORS Regex (P1):** The CORS filter allows wildcard connections with credentials from any `*.vercel.app` or `*.onrender.com` deployment.
6. **Silent Audit Log Failure (P1):** In `publicationController.js` and `patentController.js`, `logAction` is called with positional arguments instead of a destructured object, throwing uncaught TypeErrors in `auditLogger.js` and silently failing to log events.
7. **Unbounded Database Queries & Lack of Pagination (P1):** `Student.findAll()` and `Faculty.findAll()` load entire collections into memory, creating high denial-of-service risks.

---

## 2. Audit Scope & Verification Boundaries

### In Scope
* All 58 frontend React TypeScript components in `src/app/components/`.
* Authentication context and RBAC definitions in `src/app/contexts/` and `src/app/config/`.
* Express API server, routes (25 modules), and controllers (25 modules) in `src/app/backend/`.
* Sequelize database configuration, migration hooks, and 27 relational models in `src/app/backend/models/`.
* Git commit history, tracked files, and `.gitignore` directives.
* Package dependencies and lockfiles (`package.json`, `pnpm-lock.yaml`, `src/app/backend/package-lock.json`).

### Verification Limitations (Read-Only Mode)
* No live destructive exploits were launched against production databases.
* No external network penetration scans were directed against live Christ University infrastructure.
* Tests were performed via static source code analysis, AST inspection, and controlled local CLI commands.

---

## 3. Threat Model (STRIDE Methodology)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        THREAT BOUNDARY MAP                             │
└────────────────────────────────────────────────────────────────────────┘

  [Public Internet]
         │
         │ (HTTP/HTTPS)
         ▼
  ┌──────────────┐         CORS (*.vercel.app / *.onrender.com)
  │  Vercel SPA  │ ────────────────────────────────────────────────┐
  └──────────────┘                                                 ▼
         │                                               ┌──────────────────┐
         │ Bearer JWT (in localStorage)                  │ Malicious Tenant │
         ▼                                               │ on *.vercel.app  │
  ┌────────────────────────────────────────────────┐     └──────────────────┘
  │            Render Express API                  │
  │  - Rate Limiter: Global 10,000 req/15min       │
  │  - Auth Middleware: Bearer JWT validation      │
  │  - checkDepartment: Bypassed if dept omitted   │
  └───────────────────────┬────────────────────────┘
                          │ Internal SSL
                          ▼
  ┌────────────────────────────────────────────────┐
  │            PostgreSQL 16 Database              │
  │  - 27 Models                                   │
  │  - Raw DDL ALTER TABLE in request handlers     │
  └────────────────────────────────────────────────┘
```

| STRIDE Category | Identified Threat Scenario | Risk Level |
|---|---|---|
| **Spoofing** | Compromise of default administrative accounts (`admin@christuniversity.in` / `Admin@123`) from Git history; theft of JWT tokens stored in browser `localStorage`. | **Critical (P0)** |
| **Tampering** | Mass-assignment in document updates; unauthorized modification of students across departments due to missing department checks in `studentController.js`. | **High (P1)** |
| **Repudiation** | Silent audit logging failure in `publicationController.js` and `patentController.js` due to argument signature mismatch in `logAction`. Missing IP capture in `AuditLog`. | **High (P1)** |
| **Information Disclosure** | Plaintext exposure of faculty PAN card numbers (`panCardNo`) and student caste/disability/phone records to any authenticated faculty member. | **High (P1)** |
| **Denial of Service** | Unbounded full-table reads on `/api/students`; database locks caused by `ALTER TABLE` DDL queries inside bulk upload request handlers; ReDoS via `braces` / `proxy-addr`. | **High (P1)** |
| **Elevation of Privilege** | Department Coordinators and HODs invoking `/api/students/clear-all` or `/api/faculty/clear-all` to delete institution-wide records. | **Critical (P0)** |

---

## 4. Confirmed Security Findings by Priority

```
┌─────────────────────────────────────────────────────────┐
│                    FINDINGS SUMMARY                     │
├───────────────────┬─────────────────────────────────────┤
│ P0 — Critical     │ 4 Confirmed Findings                │
│ P1 — High         │ 7 Confirmed Findings                │
│ P2 — Medium       │ 6 Confirmed Findings                │
│ P3 — Low          │ 4 Confirmed Findings                │
│ Total Findings    │ 21 Confirmed Findings               │
└───────────────────┴─────────────────────────────────────┘
```

### 4.1. Priority P0: Critical Vulnerabilities

#### [VULN-P0-01] Destructive Bulk Deletion Accessible to Non-Admin Roles
* **CWE Mapping:** CWE-285 (Improper Authorization), CWE-863 (Incorrect Authorization).
* **OWASP Category:** A01:2025 – Broken Access Control.
* **Affected Files & Lines:**
  * [`src/app/backend/routes/students.js:16`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/routes/students.js#L16)
  * [`src/app/backend/controllers/studentController.js:375-390`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/studentController.js#L375-L390)
  * [`src/app/backend/routes/faculty.js:15`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/routes/faculty.js#L15)
  * [`src/app/backend/controllers/facultyController.js:240-255`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/facultyController.js#L240-L255)
  * [`src/app/backend/routes/placements.js:17`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/routes/placements.js#L17)
  * [`src/app/backend/controllers/placementController.js:277-292`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/placementController.js#L277-L292)
* **Evidence:**
  ```javascript
  // In routes/students.js:
  router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), clearAllStudents);

  // In controllers/studentController.js:
  exports.clearAllStudents = async (req, res) => {
    try {
      const deletedCount = await Student.destroy({ where: {} }); // Wipes entire table!
  ```
* **Impact:** Any department coordinator or HOD (e.g., Coordinator of Civil Engineering) can execute a single `DELETE /api/students/clear-all` or `DELETE /api/faculty/clear-all` call and permanently delete all student and faculty records across the entire university.
* **Remediation:** Remove `/clear-all` routes from non-admin access. Restrict table clearing strictly to system administrators with mandatory step-up reauthentication, or scope deletions strictly to the caller's department (`where: { department: req.user.department }`).

---

#### [VULN-P0-02] Hardcoded Administrative & Departmental Credentials in Source and Git History
* **CWE Mapping:** CWE-798 (Use of Hard-coded Credentials), CWE-259 (Use of Hard-coded Password).
* **OWASP Category:** A07:2025 – Identification and Authentication Failures.
* **Affected Files & Lines:**
  * [`src/app/backend/config/autoSeed.js:697-747`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/config/autoSeed.js#L697-L747)
  * [`src/app/backend/scripts/initDatabase.js:21-58`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/scripts/initDatabase.js#L21-L58)
  * Git commit `829a8a7c` (and subsequent branch history).
* **Evidence:**
  ```javascript
  // In autoSeed.js:
  const defaultAccounts = [
    { email: 'admin@christuniversity.in', password: 'Admin@123', role: 'admin' },
    { email: 'dean@christuniversity.in', password: 'Authority@123', role: 'authority' },
    { email: 'hod.cse@christuniversity.in', password: 'Hod@123', role: 'hod' },
    { email: 'coord.cse@christuniversity.in', password: 'Coordinator@123', role: 'coordinator' },
    { email: 'faculty.cse@christuniversity.in', password: 'Faculty@123', role: 'faculty' }
  ];
  ```
* **Impact:** Any individual with read access to the repository (or an attacker exploiting code exposure) can log in as System Administrator or Institutional Dean with full privileges.
* **Remediation:** Remove static fallback passwords. Require passwords to be passed via secure environment variables (`INITIAL_ADMIN_PASSWORD`). Enforce a `mustChangePassword: true` flag in the `User` model, requiring immediate password change on first login.

---

#### [VULN-P0-03] Horizontal Privilege Escalation & Department Boundary Bypass
* **CWE Mapping:** CWE-639 (Authorization Bypass Through User-Controlled Key).
* **OWASP Category:** A01:2025 – Broken Access Control.
* **Affected Files & Lines:**
  * [`src/app/backend/middleware/auth.js:78-100`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/middleware/auth.js#L78-L100)
  * [`src/app/backend/controllers/studentController.js:99-138`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/studentController.js#L99-L138)
  * [`src/app/backend/controllers/facultyController.js:6-23`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/facultyController.js#L6-L23)
* **Evidence:**
  ```javascript
  // In middleware/auth.js:
  const checkDepartment = (req, res, next) => {
    ...
    const reqDept = req.query.department || req.body.department;
    if (reqDept && reqDept !== 'all') {
      // Compares reqDept with userDept
    }
    next(); // If department parameter is omitted or set to 'all', execution passes unconditionally!
  };
  ```
  In `studentController.js`, `checkDepartment` is not even registered. `getStudents` builds `where` solely from `req.query`:
  ```javascript
  if (req.query.department && req.query.department !== 'all') {
    where.department = req.query.department;
  }
  const students = await Student.findAll({ where });
  ```
* **Impact:** A faculty member or student from Department A can simply issue `GET /api/students` (without query parameters) and receive the full student directory of Department B, C, and D.
* **Remediation:** Invert the check logic: for non-admin/authority roles, server-side code must forcefully inject `where.department = req.user.department`, ignoring user-supplied department parameters entirely.

---

#### [VULN-P0-04] Destructive System-Wide Database Clearing Lacking Secondary Safeguards
* **CWE Mapping:** CWE-306 (Missing Authentication for Critical Function).
* **OWASP Category:** A05:2025 – Security Misconfiguration / Critical Operation Security.
* **Affected Files & Lines:**
  * [`src/app/backend/routes/system.js:9`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/routes/system.js#L9)
  * [`src/app/backend/controllers/systemController.js:7-60`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/systemController.js#L7-L60)
* **Evidence:**
  ```javascript
  // In controllers/systemController.js:
  if (AuditLog) await AuditLog.destroy({ where: {}, truncate: false }); // Wipes forensic logs!
  ```
* **Impact:** `POST /api/system/clear-database` requires only a standard Admin Bearer token. It accepts no confirmation token, requires no re-entry of the administrative password, does not check `NODE_ENV === 'production'`, and deliberately wipes the `audit_logs` table, destroying forensic evidence of the incident.
* **Remediation:**
  1. Disable this endpoint unconditionally in production (`if (process.env.NODE_ENV === 'production') return res.status(403);`).
  2. Never allow deletion of the `audit_logs` table.
  3. Require password reauthentication and step-up confirmation tokens for destructive administrative actions.

---

### 4.2. Priority P1: High Vulnerabilities

#### [VULN-P1-01] Institution-Wide Exposure of Faculty PAN Numbers (PII / Financial Data)
* **CWE Mapping:** CWE-359 (Exposure of Private Personal Information to an Unauthorized Actor).
* **OWASP Category:** A01:2025 – Broken Access Control / Sensitive Data Exposure.
* **Affected Files & Lines:**
  * [`src/app/backend/controllers/facultyController.js:6-23`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/facultyController.js#L6-L23)
  * [`src/app/backend/models/Faculty.js:42-45`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/models/Faculty.js#L42-L45)
* **Evidence:**
  `Faculty.findAll()` does not specify an `attributes` projection. The response includes `panCardNo`, `dateOfBirth`, `phone`, `email`, and salary-related experience metrics for all faculty members across all departments.
* **Impact:** Exposure of Indian PAN Card identifiers violates institutional privacy standards and statutory data protection principles under India's Digital Personal Data Protection Act (DPDP Act).
* **Remediation:** Exclude `panCardNo` from default API projections:
  ```javascript
  attributes: { exclude: ['panCardNo'] }
  ```
  Only permit HR administrators and individual faculty members to view their own PAN number.

---

#### [VULN-P1-02] Permissive Cross-Tenant CORS Configuration
* **CWE Mapping:** CWE-942 (Permissive Cross-Domain Policy with Untrusted Domains).
* **OWASP Category:** A05:2025 – Security Misconfiguration.
* **Affected Files & Lines:**
  * [`src/app/backend/server.js:40-48`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/server.js#L40-L48)
* **Evidence:**
  ```javascript
  // Allow all Vercel deployments (*.vercel.app)
  if (/\.vercel\.app$/.test(origin)) {
    return callback(null, true);
  }
  // Allow all Render deployments (*.onrender.com)
  if (/\.onrender\.com$/.test(origin)) {
    return callback(null, true);
  }
  ```
* **Impact:** Any third-party attacker who registers an arbitrary account on Vercel (`attacker-site.vercel.app`) or Render (`malicious.onrender.com`) is granted authenticated CORS access (`credentials: true`) to the Christ University backend API.
* **Remediation:** Replace regex subdomains with strict exact-match origin validation against trusted production domains configured in environment variables (`CLIENT_URL`).

---

#### [VULN-P1-03] Silent Audit Logging Failure Due to Signature Mismatch
* **CWE Mapping:** CWE-778 (Insufficient Logging), CWE-252 (Unchecked Return Value).
* **OWASP Category:** A09:2025 – Security Logging and Monitoring Failures.
* **Affected Files & Lines:**
  * [`src/app/backend/controllers/publicationController.js:551-559`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/publicationController.js#L551-L559)
  * [`src/app/backend/controllers/patentController.js:812-820`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/patentController.js#L812-L820)
  * [`src/app/backend/middleware/auditLogger.js:3-19`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/middleware/auditLogger.js#L3-L19)
* **Evidence:**
  `publicationController.js` calls:
  ```javascript
  await logAction(req.user.id, 'BULK_UPLOAD_PUBLICATIONS', 'Publication', null, null, { ... }, req);
  ```
  However, `auditLogger.js` expects a single destructured object:
  ```javascript
  const logAction = async ({ recordId, achievementTitle, user, action, previousValue, updatedValue, remarks }) => {
    await AuditLog.create({ userName: user.name ... });
  ```
  Because `user` is `undefined`, `user.name` throws an uncaught TypeError, which is caught and swallowed by `catch (error) { console.error('✗ Audit logging failed:', error); }`.
* **Impact:** High-impact modifications, bulk uploads, and data deletions in publications and patents are never recorded in `AuditLog`.
* **Remediation:** Harmonize the `logAction` function signature and add automated unit tests ensuring audit log creation on every state transition.

---

#### [VULN-P1-04] Unbounded Full Table Queries & Memory Exhaustion (DoS)
* **CWE Mapping:** CWE-770 (Allocation of Resources Without Limits or Throttling).
* **OWASP Category:** A05:2025 – Security Misconfiguration.
* **Affected Files & Lines:**
  * [`src/app/backend/controllers/studentController.js:121`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/studentController.js#L121)
  * [`src/app/backend/controllers/facultyController.js:8`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/facultyController.js#L8)
  * [`src/app/backend/controllers/publicationController.js:35`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/publicationController.js#L35)
* **Evidence:**
  Endpoints like `GET /api/students`, `GET /api/faculty`, and `GET /api/publications` perform `findAll({ where })` without `limit` or `offset`.
* **Impact:** In an institution with 25,000+ students and thousands of publications, an unpaginated query can allocate hundreds of megabytes of memory, blocking the Node.js single-threaded event loop and causing server crashes.
* **Remediation:** Enforce mandatory server-side pagination with a default limit of 50 and maximum limit of 100.

---

#### [VULN-P1-05] Critical Dependency Vulnerabilities in Runtime & Build Pipelines
* **CWE Mapping:** CWE-1395 (Dependency on Vulnerable Third-Party Component).
* **OWASP Category:** A06:2025 – Vulnerable and Outdated Components.
* **Affected Components:**
  1. `proxy-addr` (Critical, CVSS 9.1, GHSA-jqcg-44mw-7w3h): IP spoofing via IPv4-mapped IPv6 trust subnet. Directly compromises IP-based rate limiting when running behind proxies.
  2. `tar` (Critical, CVE-2026-59873, GHSA-23hp-3jrh-7fpw): Arbitrary file overwrite / symlink poisoning during decompression.
  3. `braces` (High, CVSS 7.5, GHSA-vfj7-8cjw-p6xm): ReDoS stack-exhaustion via deeply nested patterns.
  4. `source-map-js` (High, CVSS 7.5, GHSA-68fv-2mgg-jv7q): Event loop denial of service.
* **Impact:** Exploitation of `proxy-addr` allows attackers to bypass IP rate limits on login and administrative routes.
* **Remediation:** Upgrade `express` to 4.21.2+, `proxy-addr` to 2.0.8+, and rebuild dependency lockfiles.

---

#### [VULN-P1-06] Database DDL Execution Inside HTTP Request Handlers
* **CWE Mapping:** CWE-400 (Uncontrolled Resource Consumption).
* **OWASP Category:** A05:2025 – Security Misconfiguration.
* **Affected Files & Lines:**
  * [`src/app/backend/controllers/facultyController.js:87-90`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/facultyController.js#L87-L90)
  * [`src/app/backend/controllers/studentController.js:309-312`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/studentController.js#L309-L312)
* **Evidence:**
  ```javascript
  // Inside bulkCreateFaculty and bulkCreateStudent:
  await sequelize.query('ALTER TABLE "faculties" DROP CONSTRAINT IF EXISTS "faculties_employeeId_key" CASCADE;').catch(() => {});
  await sequelize.query('DROP INDEX IF EXISTS "faculties_employee_id_key";').catch(() => {});
  ```
* **Impact:** Executing DDL `ALTER TABLE` queries during API request processing acquires an `AccessExclusiveLock` on the entire table, causing lock contention, deadlocks, and denial of service under concurrent bulk uploads.
* **Remediation:** Move all schema migrations strictly into initialization scripts (`autoSeed.js` / migration runners). Remove DDL queries from runtime API controllers.

---

#### [VULN-P1-07] Permissive Global Rate Limiting on Authentication Endpoints
* **CWE Mapping:** CWE-307 (Improper Restriction of Excessive Authentication Attempts).
* **OWASP Category:** A07:2025 – Identification and Authentication Failures.
* **Affected Files & Lines:**
  * [`src/app/backend/server.js:61-65`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/server.js#L61-L65)
* **Evidence:**
  ```javascript
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000 // 10,000 requests per 15 min applied globally to all /api/ routes
  });
  app.use('/api/', limiter);
  ```
* **Impact:** There is no dedicated rate limiter on `/api/auth/login`. An attacker can submit up to 10,000 automated password guesses every 15 minutes per IP without triggering throttling.
* **Remediation:** Implement a strict login rate limiter: `max: 5` attempts per 15 minutes per IP on `/api/auth/login`.

---

### 4.3. Priority P2: Medium Vulnerabilities

* **[VULN-P2-01] Formula Injection (CSV/XLSX Injection) in Excel Exports:** User-controlled strings (e.g. publication titles, patent abstracts) exported via `XLSX.writeFile` in [`BulkUploadDialog.tsx`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/BulkUploadDialog.tsx) and [`PublicationsPage.tsx`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/PublicationsPage.tsx) are not sanitized against formula characters (`=`, `+`, `-`, `@`). (CWE-1236).
* **[VULN-P2-02] Mass Assignment in Document Creation & Updates:** `Document.create({ ...req.body, uploadedBy: req.user.id })` and `document.update(req.body)` in [`documentController.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/documentController.js#L85-L126) permit arbitrary attribute injection. (CWE-915).
* **[VULN-P2-03] User Enumeration via Differentiated Error Messages:** `/api/auth/login` returns `"Your account has been deactivated"` for deactivated users vs. `"Invalid credentials"` for invalid passwords, confirming account existence. (CWE-204).
* **[VULN-P2-04] Lack of Algorithm Pinning in JWT Verification:** `jwt.verify(token, process.env.JWT_SECRET)` in [`auth.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/middleware/auth.js#L22) does not explicitly pass `algorithms: ['HS256']`. (CWE-327).
* **[VULN-P2-05] Missing Database SSL Certificate Validation:** `rejectUnauthorized: false` in [`database.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/config/database.js#L23) permits connections to databases with unverified or self-signed certificates. (CWE-295).
* **[VULN-P2-06] Session Persistence on Password Change:** Changing user password in `authController.updatePassword` does not increment a token version or invalidate existing active JWT tokens. (CWE-613).

---

### 4.4. Priority P3: Low Hardening Items

* **[VULN-P3-01] Missing IP Logging in Audit Trail:** `ipAddress` column in `AuditLog` is never populated by `logAction`. (CWE-778).
* **[VULN-P3-02] In-Memory UI Freezing on Large Excel Parsing:** `BulkUploadDialog.tsx` parses large workbooks on the browser's UI thread instead of a Web Worker. (CWE-400).
* **[VULN-P3-03] Stack Trace Leakage in Development Mode:** Detailed stack traces returned when `NODE_ENV === 'development'` in `server.js`. (CWE-209).
* **[VULN-P3-04] Lack of Automated Password Reset Flow:** Administrative password recovery requires manual database updates or admin user intervention. (CWE-640).

---

## 5. Special Architecture Assessment: Cross-Site Authentication Analysis

The documented deployment architecture hosts the frontend on **Vercel** (`https://<app>.vercel.app`) and the backend API on **Render** (`https://<api>.onrender.com`).

### 5.1 The Danger of Blindly Enforcing `SameSite=Strict` Cookies
* `vercel.app` and `onrender.com` are completely different effective Top-Level Domains plus one (eTLD+1).
* Cookies set by `onrender.com` on AJAX requests from `vercel.app` are classified by browsers as **Third-Party Cookies**.
* Modern browsers (Safari ITP, Chrome Privacy Sandbox, Firefox ETP) block third-party cookies by default.
* If `localStorage` authentication is replaced with `Set-Cookie: token=...; HttpOnly; Secure; SameSite=Strict`, **all cross-origin API calls will fail immediately**, breaking user authentication completely.

### 5.2 Recommended Browser-Compatible Migration Strategy

```
STAGE 1 (Immediate - Current Decoupled Domains):
  - Retain Authorization: Bearer <token> in API headers for API calls.
  - Implement token in-memory caching in React state rather than persistent localStorage.
  - Set token lifetime to 15 minutes, coupled with a server-managed Refresh Token rotation endpoint.

STAGE 2 (Preferred Enterprise Production Deployment):
  - Configure custom subdomains on Christ University's domain:
    * Frontend: https://iqac.christuniversity.in  (CNAME -> Vercel)
    * Backend:  https://api.iqac.christuniversity.in (CNAME -> Render)
  - Both origins now share the same apex domain (`christuniversity.in`).
  - Deploy HttpOnly, Secure, SameSite=Lax cookies with Domain=.iqac.christuniversity.in.
  - Native first-party browser support across all browsers with zero cross-site restrictions.
```

---

## 6. Overall Security Readiness Conclusion

### **CURRENT STATUS: BLOCKED**

The application must **NOT** be deployed to production in its current state. The presence of non-admin bulk deletion routes ([VULN-P0-01]), hardcoded administrative credentials ([VULN-P0-02]), horizontal privilege escalation ([VULN-P0-03]), and destructive unauthenticated endpoints ([VULN-P0-04]) represent immediate threats of institutional data loss and unauthorized takeover.

Implementation of Phase A and Phase B remediations outlined in the remediation roadmap is required before initiating formal re-assessment.

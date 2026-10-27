# Comprehensive Security Audit Checklist: Christ University IQAC Platform

> **Assessment Date:** October 19, 2026  
> **Target System:** CHRIST (Deemed to be University) — IQAC Platform  
> **Status Notation:**  
> - `[x] PASS` — Verified secure through code inspection and testing evidence.  
> - `[ ] FAIL` — Confirmed vulnerability or critical security weakness.  
> - `[ ] PARTIAL` — Security control exists but contains demonstrable gaps or bypasses.  
> - `[ ] NOT VERIFIED` — Insufficient evidence or requires dynamic live staging tests.  
> - `[ ] N/A` — Feature or condition not applicable to this architecture.  

---

## 1. Authentication Security

| Status | Requirement & Control Description | File Reference | Findings & Operational Notes |
|---|---|---|---|
| `[x] PASS` | Passwords hashed securely using industry-standard algorithm | [`models/User.js:56-69`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/models/User.js#L56-L69) | Verified: `bcryptjs` with 10 salt rounds executed in `beforeCreate` and `beforeUpdate` hooks. |
| `[ ] FAIL` | Protection against automated brute-force login attempts | [`server.js:61-65`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/server.js#L61-L65) | **FAIL:** Global limiter permits 10,000 requests per 15 minutes across all routes. No dedicated limiter on `/api/auth/login`. |
| `[ ] FAIL` | Account lockout or throttling per user identity | [`controllers/authController.js:14-80`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/authController.js#L14-L80) | **FAIL:** Failed login counter and lockout mechanisms are absent; unlimited guesses allowed. |
| `[ ] FAIL` | Prevention of username/account enumeration | [`controllers/authController.js:38-42`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/authController.js#L38-L42) | **FAIL:** Returns `"Your account has been deactivated"` for deactivated users vs generic message. |
| `[x] PASS` | Immediate account deactivation enforcement | [`middleware/auth.js:36-41`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/middleware/auth.js#L36-L41) | Verified: `auth` middleware queries database on every request and blocks tokens if `isActive === false`. |
| `[ ] PARTIAL` | JWT signature and expiration validation | [`middleware/auth.js:22-58`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/middleware/auth.js#L22-L58) | **PARTIAL:** Validates expiration and signature, but fails to pin `algorithms: ['HS256']`. |
| `[ ] FAIL` | Appropriate token lifetime & revocation | [`config/database.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/config/database.js), [`.env:17`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/.env#L17) | **FAIL:** JWT configured with excessive 7-day lifetime (`7d`). No server-side blocklist or revocation list. |
| `[ ] PARTIAL` | Client-side token storage security | [`contexts/AuthContext.tsx:61`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/contexts/AuthContext.tsx#L61) | **PARTIAL:** Stored in `localStorage`. Cross-site cookie migration required once custom domains are aligned. |
| `[x] PASS` | Invalidation of sessions on password update | [`controllers/authController.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/authController.js) | Verified in Phase A: `tokenVersion` incremented on password change; old JWT tokens immediately rejected with HTTP 401 `TOKEN_REVOKED`. |
| `[x] PASS` | Elimination of default credentials in seeds | [`config/autoSeed.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/config/autoSeed.js) | Verified in Phase A: Demo account seeding disabled in production; random CSPRNG passwords and `mustChangePassword: true` enforced in non-prod. |
| `[ ] NOT VERIFIED` | Multi-Factor Authentication (MFA) | [`controllers/authController.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/authController.js) | **N/A:** MFA is not currently implemented in the codebase. |

---

## 2. Authorization, RBAC and Department Isolation

| Status | Requirement & Control Description | File Reference | Findings & Operational Notes |
|---|---|---|---|
| `[x] PASS` | Server-side authorization on destructive routes | [`controllers/studentController.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/studentController.js) | Verified in Phase A: Option C enforces departmental scoping for HODs; university-wide clearing requires Admin dual-confirmation (`confirmAll=true` and `confirmation="CONFIRM_UNIVERSITY_CLEAR"`). |
| `[x] PASS` | Department isolation enforcement on student records | [`utils/scopeHelper.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/utils/scopeHelper.js), [`controllers/studentController.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/studentController.js) | Verified in Phase A: Non-admin users are strictly pinned to `req.user.department`. Query parameter overrides for other departments are ignored. |
| `[x] PASS` | Robust validation of department parameters | [`utils/scopeHelper.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/utils/scopeHelper.js) | Verified in Phase A: Query parameter overrides are ignored for non-admin/authority roles, preventing parameter tampering. |
| `[x] PASS` | Role-based feature disabling in frontend UI | [`config/permissions.ts:1-241`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/config/permissions.ts#L1-L241) | Verified: Comprehensive permission matrix maps page and feature visibility to all 5 roles. |
| `[x] PASS` | Authority role restricted to read-only access | [`config/permissions.ts:74-83`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/config/permissions.ts#L74-L83) | Verified: Authority role cannot perform write operations in UI, and write routes require `admin`/`hod`/`coordinator`. |
| `[ ] PARTIAL` | Ownership verification on resource updates | [`controllers/documentController.js:118`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/documentController.js#L118) | **PARTIAL:** Documents verify `uploadedBy === req.user.id`, but other entities lack individual author ownership verification. |
| `[x] PASS` | Horizontal privilege escalation prevention in student lookup | [`controllers/studentController.js:143-175`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/studentController.js#L143-L175) | Verified in Phase A: Non-admin callers can only look up students in their own department; cross-department lookups return HTTP 404. |

---

## 3. Critical Administrative Operations

| Status | Requirement & Control Description | File Reference | Findings & Operational Notes |
|---|---|---|---|
| `[x] PASS` | Database wipe route restricted to Admin role | [`routes/system.js:9`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/routes/system.js#L9) | Verified: `POST /api/system/clear-database` requires `auth` and `authorize('admin')`. |
| `[x] PASS` | Secondary authentication & step-up confirmation | [`controllers/systemController.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/systemController.js), [`utils/environmentGuard.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/utils/environmentGuard.js) | Verified in Phase A: Requires admin password re-authentication, confirmation phrase, and multi-layered production environment lockout. |
| `[x] PASS` | Audit log preservation during system clearing | [`controllers/systemController.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/systemController.js) | Verified in Phase A: `AuditLog` table permanently excluded from database wipe operations. |
| `[x] PASS` | Structural hierarchy preserved during clearing | [`controllers/systemController.js:72-109`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/systemController.js#L72-L109) | Verified: Campus, School, Department, and Course hierarchy are preserved or re-seeded if empty. |

---

## 4. Student, Faculty and Confidential Data

| Status | Requirement & Control Description | File Reference | Findings & Operational Notes |
|---|---|---|---|
| `[x] PASS` | Concealment of Faculty PAN numbers | [`controllers/facultyController.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/facultyController.js) | Verified in Phase A: `panCardNo` excluded from all API responses and sanitized via `dataSanitizer.js`. |
| `[x] PASS` | Field-level authorization on sensitive student data | [`utils/dataSanitizer.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/utils/dataSanitizer.js), [`controllers/studentController.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/studentController.js) | Verified in Phase A: Statutory caste and guardian contact numbers masked (`[CONFIDENTIAL]`) for non-privileged viewers. |
| `[x] PASS` | Password exclusion on user retrieval endpoints | [`controllers/userController.js:17`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/userController.js#L17), [`controllers/authController.js:89`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/authController.js#L89) | Verified: User queries explicitly specify `attributes: { exclude: ['password'] }`. |

---

## 5. Bulk Excel Upload Security

| Status | Requirement & Control Description | File Reference | Findings & Operational Notes |
|---|---|---|---|
| `[x] PASS` | Client-side date and format normalization | [`components/BulkUploadDialog.tsx:11-52`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/BulkUploadDialog.tsx#L11-L52) | Verified: Robust handling of Excel serial numbers, slash formats, and dot-separated dates. |
| `[ ] FAIL` | Formula Injection (CSV/XLSX) prevention on exports | [`components/BulkUploadDialog.tsx:537`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/BulkUploadDialog.tsx#L537), [`components/PublicationsPage.tsx:665`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/PublicationsPage.tsx#L665) | **FAIL:** Exported files do not prefix formula trigger characters (`=`, `+`, `-`, `@`) with `'`. |
| `[ ] FAIL` | DDL execution isolated from upload requests | [`controllers/facultyController.js:87-90`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/facultyController.js#L87-L90) | **FAIL:** Executes raw `ALTER TABLE DROP CONSTRAINT` inside request handlers during bulk upload. |
| `[ ] PARTIAL` | Backend validation of imported records | [`controllers/studentController.js:240-355`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/studentController.js#L240-L355) | **PARTIAL:** Validates required fields, but does not enforce department match against caller's role. |

---

## 6. API, CORS, Browser & Database Security

| Status | Requirement & Control Description | File Reference | Findings & Operational Notes |
|---|---|---|---|
| `[x] PASS` | Security HTTP headers enabled | [`server.js:58`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/server.js#L58) | Verified: `app.use(helmet())` enforces standard browser protections. |
| `[ ] FAIL` | Strict CORS origin verification | [`server.js:40-48`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/server.js#L40-L48) | **FAIL:** Wildcard regex permits all `*.vercel.app` and `*.onrender.com` origins with credentials. |
| `[ ] PARTIAL` | Database TLS/SSL encryption | [`config/database.js:20-26`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/config/database.js#L20-L26) | **PARTIAL:** SSL enforced, but `rejectUnauthorized: false` allows self-signed/untrusted certificates. |
| `[x] PASS` | Audit log operational integrity | [`middleware/auditLogger.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/middleware/auditLogger.js) | Verified in Phase A: Standardized object signature and `logActionSafe` wrapper implemented; persistent PostgreSQL writes confirmed via E2E tests. |
| `[ ] FAIL` | Dependency vulnerability health | [`package.json`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/package.json), [`src/app/backend/package.json`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/package.json) | **FAIL:** 2 Critical vulnerabilities (`proxy-addr` CVSS 9.1, `tar` CVE-2026-59873) and 22 High vulnerabilities present. |
| `[x] PASS` | SQL Injection prevention via ORM | All Controllers & Models | Verified: Standard data queries utilize Sequelize parameterized prepared statements. |

# CHRIST UNIVERSITY IQAC PLATFORM
# PHASE B SECURITY VERIFICATION CHECKLIST

> **Standard:** OWASP ASVS 5.0 (Level 2), OWASP Top 10:2025, ISO/IEC 27001  
> **Status:** 🟢 **100% SATISFIED AND VERIFIED**  
> **Verification Date:** October 2026

---

## 1. Pre-Implementation Safety & Credential Protection

- [x] **Redact Database Credentials from Documentation:** All plaintext connection strings and passwords stripped from previous audit reports; replaced with `[TEST_DB_PASSWORD]`.
- [x] **Strict Git Configuration:** `.gitignore` configured to ignore `.env*` files while allowing `.example` templates.
- [x] **Safe Example Environment Template:** Created `src/app/backend/.env.test.example` containing placeholder credentials.
- [x] **Pre-Provisioned Test Database Verification Guard:** Created `src/app/backend/utils/testDatabaseGuard.js` enforcing `NODE_ENV=test`, `TEST_DATABASE_URL`, remote host rejection, and requiring pre-existing marker table with `CHRIST_IQAC_DISPOSABLE_TEST_MARKER_V1`.
- [x] **Anti-Self-Authorization:** Test runner forbidden from creating the approval marker used to authorize its own execution. Marker creation restricted to `provisionTestDatabase.js`.
- [x] **Negative Safety Testing:** Verified 8 negative test cases in `test_database_safety.test.cjs`.

---

## 2. Workstream B1 — Login Rate Limiting (VULN-P1-07)

- [x] **Dedicated Route Limiting:** Attached `loginRateLimiter` specifically to `POST /api/auth/login`.
- [x] **15-Minute Observation Window:** Default window configured to 900,000 ms.
- [x] **Failed Attempt Bounding:** Configured threshold of 5 failed attempts before blocking.
- [x] **HTTP 429 Response:** Emits HTTP 429 with generic error code `AUTH_RATE_LIMITED`.
- [x] **Generic Response Neutrality:** Error responses do not disclose whether an account exists.
- [x] **Shared NAT / Campus IP Protection:** Keyed on composite `login:${ip}:${normalizedEmail}` to avoid locking out entire campus networks when one user is attacked.
- [x] **Success Isolation:** `skipSuccessfulRequests: true` ensures valid logins do not consume failure budget.
- [x] **Trusted Proxy Configuration:** Express `trust proxy` configured for reverse proxy topology.
- [x] **Redacted Security Logging:** Emits `AUTH_RATE_LIMIT_EXCEEDED` audit logs without logging passwords or auth tokens.

---

## 3. Workstream B2 — Strict Exact-Origin CORS Lockdown (VULN-P1-02)

- [x] **Removed Wildcard Regexes:** Eliminated regex patterns for `*.vercel.app` and `*.onrender.com`.
- [x] **Configurable Origin Allowlist:** Loaded exact origins from `CLIENT_URL` and `ALLOWED_ORIGINS`.
- [x] **Development Mode Scoping:** Localhost origins permitted only when `NODE_ENV !== 'production'`.
- [x] **No Origin Reflection:** Rejected origins receive HTTP 403 `CORS_ORIGIN_DENIED` with no header reflection.
- [x] **OPTIONS Preflight Handling:** Preflight requests handled cleanly with explicit allowed methods (`GET, POST, PUT, DELETE, OPTIONS, PATCH`) and headers.
- [x] **No Stack Trace Leakage:** CORS denials return clean JSON without exposing Express internals.

---

## 4. Workstream B3 — Dependency Security (VULN-P1-05)

- [x] **Backend Critical CVE Remediation:** Added npm override for `proxy-addr: ^2.0.8`, fixing the Critical CVSS 9.1 IP spoofing advisory.
- [x] **Backend Supporting Upgrades:** Overrode `qs: ^6.16.1` and bumped `morgan: ^1.12.1`. Zero critical findings in backend audit.
- [x] **Frontend Package Compatibility:** Pinned `react-router: 7.13.2` to resolve peer dependency conflict with React 18.3.1.
- [x] **Frontend Overrides:** Overrode `source-map-js`, `browserslist`, and `baseline-browser-mapping` via pnpm.
- [x] **Full Production Build:** Ran `pnpm build` — compiled cleanly in 11.57s with 0 errors.

---

## 5. Workstream B4 — API Pagination & Resource Protection (VULN-P1-04)

- [x] **Server-Side Pagination Helper:** Created `paginationHelper.js` with default limit = 50, max limit = 100.
- [x] **Integer Validation & Clamping:** Safely parses `page` and `limit`, rejecting negative, zero, NaN, and overflow values.
- [x] **Endpoint Integration:** Applied across all major directory controllers:
  - [x] Students (`GET /api/students`)
  - [x] Faculty (`GET /api/faculty`)
  - [x] Publications (`GET /api/publications`)
  - [x] Patents (`GET /api/patents`)
  - [x] Placements (`GET /api/placements`)
  - [x] Sponsored Projects (`GET /api/sponsored-projects`)
  - [x] Departmental Activities (`GET /api/departmental-activities`)
  - [x] Achievements (`GET /api/achievements`)
  - [x] Documents (`GET /api/documents`)
- [x] **Stable Ordering:** Ordered by natural key and primary ID to prevent page drift.
- [x] **Pagination Metadata:** Returns `count`, `total`, `page`, `limit`, `totalPages`, `hasNextPage`, `hasPrevPage`.
- [x] **Export Full Dataset Handling:** When `export=true` is requested by authorized users, sets limit to 10,000, preventing silent single-page truncation on CSV/Excel downloads.
- [x] **Frontend Pagination Controls:** Added pagination footers (Showing X to Y of Z, Previous, Page N of M, Next) to `StudentDetailsPage.tsx` and `FacultyDetailsPage.tsx`.

---

## 6. Workstream B5 — Remove Runtime Database DDL (VULN-P1-06)

- [x] **Purge DDL from Request Handlers:** Completely removed `ALTER TABLE`, `DROP CONSTRAINT`, `DROP INDEX` from:
  - [x] `studentController.js` (`bulkCreateStudent`)
  - [x] `facultyController.js` (`bulkCreateFaculty`)
  - [x] `patentController.js` (`ensurePatentTableSchema`, `getPatents`, `bulkUploadPatents`)
- [x] **Versioned Database Migration:** Created and executed `20261019_add_composite_identity_keys.js`.
- [x] **Composite Natural Keys Established:**
  - [x] Student: `(registerNumber, academicYear)`
  - [x] Faculty: `(employeeId, academicYear)`
- [x] **Transactional Conflict-Safe Upserts:** Wrapped bulk creation loops in `sequelize.transaction()` with row-level locks.
- [x] **Cross-Department Collision Protection:** Checks if student/faculty exists in another department; rejects cross-department overwrites.
- [x] **Catastrophic Failure Rollback:** Rolls back transaction when all records fail validation or authorization.

---

## 7. Workstream B6 — Spreadsheet & Mass Assignment Security

- [x] **Spreadsheet Formula Injection Sanitizer (CWE-1236):** Created `spreadsheetSanitizer.js` (backend) and `spreadsheetSanitizer.ts` (frontend).
- [x] **Trigger Character Neutralization:** Prefixes strings beginning with `=`, `+`, `-`, `@`, `|`, `%` with a single quote (`'`).
- [x] **Numeric Value Preservation:** Legitimate negative numbers (`-42`, `-3.14`) and positive numbers are preserved as safe numbers without quotes.
- [x] **Mass Assignment Defense in `documentController.js`:**
  - [x] Replaced `req.body` spreading with explicit allowlist `CLIENT_DOCUMENT_FIELDS`.
  - [x] Enforced `uploadedBy = req.user.id` on creation; stripped `uploadedBy` on updates.
  - [x] Restricted `status` updates exclusively to `admin`, `coordinator`, and `hod`.
  - [x] Restricted `department` updates exclusively to `admin`.

---

## 8. Workstream B7 — Full Five-Role Security Test Matrix

- [x] **Six Caller Contexts Covered:**
  - [x] Unauthenticated Caller: Rejected with 401 across all protected routes.
  - [x] Faculty: Confined to own department; PAN excluded; forbidden from bulk clearing (403).
  - [x] Coordinator: Same-department bulk upload allowed; other-department overwrite blocked; Option C clear-all deletes only own department records.
  - [x] HOD: Departmental approval and record management allowed; admin routes (`/api/users`) blocked (403).
  - [x] Authority: Read access across all departments; write and bulk deletion blocked (403).
  - [x] Admin: Full management; database wipe protected by dual-key confirmation.

---

## 9. Preservation of Phase A Security Controls

- [x] **Option C Department Scoping Policy:** Preserved across all 6 domain entities.
- [x] **JWT Token Version Revocation:** Active on all credential updates.
- [x] **Mandatory First-Login Password Change:** Blocks non-password endpoints for unmigrated users.
- [x] **PAN Card Redaction:** Strictly excluded from all faculty list responses.
- [x] **Database Wipe Lockout:** Multi-layered environment check active in `systemController.js`.
- [x] **Audit Logging Integrity:** Standardized destructured signature and PostgreSQL persistence active.

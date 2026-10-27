# CHRIST UNIVERSITY IQAC PLATFORM
# PHASE C — SECURITY TEST RESULTS

**Execution Date:** October 20, 2026  
**Environment:** Windows PowerShell, Node.js v24.19.0, PostgreSQL 16  
**Target Database:** `postgres://postgres:[REDACTED]@localhost:5432/iqac_test` (Positively verified disposable test marker)  
**Overall Status:** 140 / 140 TESTS PASSED (100% SUCCESS RATE, 0 FAILING, 0 SKIPPED)  

---

## 1. Summary by Test Suite

| # | Suite Filename | Focus Area | Tests Executed | Passed | Failed | Duration |
| :-: | :--- | :--- | :-: | :-: | :-: | :-: |
| 1 | `test_database_safety.test.cjs` | Database Guard & Environment Preflight | 10 | 10 | 0 | 7.7 ms |
| 2 | `phase_a_verification.test.cjs` | Phase A Core Security Controls | 15 | 15 | 0 | 12.1 ms |
| 3 | `phase_a_integration.test.cjs` | Integration & Option C Department Scoping | 16 | 16 | 0 | 668.6 ms |
| 4 | `phase_a_e2e_supertest.test.cjs` | End-to-End Supertest HTTP Security | 24 | 24 | 0 | 1,187.9 ms |
| 5 | `phase_b_workstreams_b1_b2.test.cjs` | Login Rate Limiting & Strict CORS | 10 | 10 | 0 | 697.0 ms |
| 6 | `phase_b_workstreams_b4_b6.test.cjs` | Bounded Pagination & Formula Injection | 11 | 11 | 0 | 347.8 ms |
| 7 | `phase_b_workstream_b5.test.cjs` | Composite Identity Keys & Safe Upsert | 8 | 8 | 0 | 471.7 ms |
| 8 | `phase_b_full_matrix.test.cjs` | Five-Role Security Matrix Across Callers | 10 | 10 | 0 | 661.2 ms |
| 9 | `phase_c_concurrency_and_exports.test.cjs` | Concurrency, Export Integrity, Mass Assignment | 13 | 13 | 0 | 508.1 ms |
| 10 | `phase_c_authorization_inventory.test.cjs` | Full 139-Route Authorization & Boundaries | 23 | 23 | 0 | 717.1 ms |
| **TOTAL** | **10 Distinct Test Suites** | **Comprehensive System Security Coverage** | **140** | **140** | **0** | **~5.3 s** |

---

## 2. Test-by-Test Execution Breakdown

### Suite 1: `test_database_safety.test.cjs` (10 Tests)
1. **PASS** — Aborts immediately if `NODE_ENV !== 'test'` (1.7ms)
2. **PASS** — Aborts immediately if `TEST_DATABASE_URL` is missing (0.4ms)
3. **PASS** — Aborts immediately if `TEST_DATABASE_URL` points to cloud/remote host (0.4ms)
4. **PASS** — Aborts if PostgreSQL catalog name does not end in `_test` (0.3ms)
5. **PASS** — Aborts if target DB name contains `test` in middle but does not end in `_test` (1.3ms)
6. **PASS** — Prevents self-authorization: Aborts if `__disposable_test_marker__` table is absent (0.5ms)
7. **PASS** — Aborts if marker status is not `APPROVED_FOR_DESTRUCTIVE_SECURITY_TESTING` (0.3ms)
8. **PASS** — Successfully authorizes when pre-existing marker and database identity are verified (0.3ms)
9. **PASS** — Preflight strictly rejects production/staging without modifying `process.env.NODE_ENV` (0.4ms)
10. **PASS** — Preflight rejects missing or malformed `TEST_DATABASE_URL` fail-closed (0.5ms)

### Suite 2: `phase_a_verification.test.cjs` (15 Tests)
1. **PASS** — Persists audit log with exact destructured object signature
2. **PASS** — Survives and throws clean errors on audit log failure without crashing the process
3. **PASS** — Does not log or print passwords to console or logs during provisioning
4. **PASS** — Generates compliant, high-entropy secrets and mandates password change
5. **PASS** — Invalidates active JWT sessions immediately upon password change via `tokenVersion`
6. **PASS** — Prevents HOD from querying other departments even if requested
7. **PASS** — Handles Course model compatibility using `departmentId` instead of department string
8. **PASS** — Safely filters historical student lookup to prevent cross-department PII leaks
9. **PASS** — Allows HOD to clear ONLY their own department data
10. **PASS** — Blocks Faculty and Authority from executing bulk clear
11. **PASS** — Requires Admin to explicitly pass `confirmAll=true` to clear university-wide
12. **PASS** — Masks PAN and sensitive personal statutory fields for non-admin roles
13. **PASS** — Rolls back partial deletions on constraint error while audit log entry survives
14. **PASS** — Blocks database wipe if connected to remote cloud database
15. **PASS** — Permits database wipe ONLY on local disposable DB with explicit `ALLOW_DATABASE_RESET=true`

### Suite 3: `phase_a_integration.test.cjs` (16 Tests)
1. **PASS** — Valid JWT with matching `tokenVersion` passes authentication middleware
2. **PASS** — Legacy token without `tokenVersion` claim is strictly rejected with `TOKEN_REVOKED` (HTTP 401)
3. **PASS** — Token with outdated `tokenVersion` is rejected immediately upon version bump
4. **PASS** — Account flagged `mustChangePassword=true` is blocked from normal API endpoints
5. **PASS** — HOD querying student directory is strictly confined to own department
6. **PASS** — HOD clearing students deletes ONLY Dept A records and preserves Dept B
7. **PASS** — Faculty and Authority users are blocked from executing bulk clear-all (HTTP 403)
8. **PASS** — Admin clear-all without dual-confirmation is rejected with HTTP 400
9. **PASS** — Historical lookup by non-admin is scoped to caller department
10. **PASS** — Faculty list API excludes `panCardNo` for all list requests
11. **PASS** — Non-privileged student list sanitizes statutory caste and guardian contact
12. **PASS** — Blocks database wipe when `ALLOW_DATABASE_RESET` is not explicitly set
13. **PASS** — Blocks database wipe in production `NODE_ENV` unconditionally
14. **PASS** — Blocks database wipe when target DB is a remote host
15. **PASS** — Records audit entries with caller IP and operation details in database
16. **PASS** — Audit log survival under transactional failures

### Suite 4: `phase_a_e2e_supertest.test.cjs` (24 Tests)
1. **PASS** — POST `/api/auth/login` with wrong credentials returns HTTP 401 (75.5ms)
2. **PASS** — POST `/api/auth/login` with valid credentials returns HTTP 200 with JWT containing `tokenVersion` (62.1ms)
3. **PASS** — GET `/api/auth/me` without authorization header returns HTTP 401 (2.9ms)
4. **PASS** — GET `/api/auth/me` with legacy token missing `tokenVersion` is strictly rejected with 401 `TOKEN_REVOKED` (4.4ms)
5. **PASS** — Account flagged `mustChangePassword=true` is locked out of normal endpoints (HTTP 403) (194.7ms)
6. **PASS** — Deactivated account (`isActive=false`) is rejected with HTTP 401 `ACCOUNT_DEACTIVATED` (140.8ms)
7. **PASS** — HOD GET `/api/students` is strictly scoped to own department (8.2ms)
8. **PASS** — Coordinator GET `/api/students` receives only own department records (4.7ms)
9. **PASS** — Admin GET `/api/students` can access university-wide records and filter by department (4.9ms)
10. **PASS** — Authority has institutional read-only access but cannot create or modify records (7.0ms)
11. **PASS** — Historical lookup GET `/api/students/lookup/:regNo` by non-admin returns 404 for cross-dept student (3.6ms)
12. **PASS** — HOD DELETE `/api/students/clear-all` deletes ONLY Dept A students (15.5ms)
13. **PASS** — Faculty and Authority invoking DELETE `/clear-all` are rejected with HTTP 403 (6.0ms)
14. **PASS** — Admin DELETE `/api/students/clear-all` without dual confirmation is rejected with HTTP 400 (3.4ms)
15. **PASS** — Admin DELETE `/api/students/clear-all` with dual confirmation succeeds (7.1ms)
16. **PASS** — All other domain controllers reject unauthorized clear-all via Supertest (61.5ms)
17. **PASS** — GET `/api/faculty` excludes `panCardNo` from ordinary response for all callers (15.5ms)
18. **PASS** — GET `/api/students` masks statutory caste and parent contact for Coordinators (6.4ms)
19. **PASS** — Destructive departmental clear creates persistent `AuditLog` entry in PostgreSQL (11.5ms)
20. **PASS** — No API route allows unauthorized modification or deletion of `AuditLog` rows (4.5ms)
21. **PASS** — POST `/api/system/clear-database` by non-admin is rejected with HTTP 403 (3.7ms)
22. **PASS** — POST `/api/system/clear-database` without admin password is rejected with HTTP 400 (3.8ms)
23. **PASS** — POST `/api/system/clear-database` with wrong admin password returns HTTP 401 (65.9ms)
24. **PASS** — POST `/api/system/clear-database` with correct credentials resets transactional data while preserving `AuditLog` (65.9ms)

### Suite 5: `phase_b_workstreams_b1_b2.test.cjs` (10 Tests)
1. **PASS** — First 5 failed login attempts return HTTP 401 Invalid credentials (347.6ms)
2. **PASS** — 6th failed login attempt is throttled with HTTP 429 `AUTH_RATE_LIMITED` (7.6ms)
3. **PASS** — Generic error message prevents username/account enumeration (4.1ms)
4. **PASS** — Rate limit on one account does not block another account from same IP (72.0ms)
5. **PASS** — Configured localhost origin is granted CORS permissions in test mode (3.9ms)
6. **PASS** — Arbitrary `*.vercel.app` origin is strictly rejected (wildcard removed) (2.4ms)
7. **PASS** — Arbitrary `*.onrender.com` origin is strictly rejected (wildcard removed) (2.3ms)
8. **PASS** — Lookalike domain is strictly rejected (2.1ms)
9. **PASS** — OPTIONS preflight from approved origin returns HTTP 204 with allowed headers (1.8ms)
10. **PASS** — Non-browser request without Origin header succeeds normally (1.9ms)

### Suite 6: `phase_b_workstreams_b4_b6.test.cjs` (11 Tests)
1. **PASS** — B4-01: Pagination Helper parses valid page and limit and clamps to max limit (0.8ms)
2. **PASS** — B4-02: GET `/api/students` returns paginated records with correct metadata (22.2ms)
3. **PASS** — B4-03: GET `/api/students` page 3 returns remaining records with `hasNextPage=false` (8.6ms)
4. **PASS** — B4-04: GET `/api/students` rejects excessive limit by clamping to 100 (8.4ms)
5. **PASS** — B4-05: GET `/api/students` with `export=true` returns full authorized dataset (8.3ms)
6. **PASS** — B6-01: Formula triggers beginning with `=`, `+`, `-`, `@` are prefixed with single quote (0.5ms)
7. **PASS** — B6-02: Legitimate negative numbers and floats are preserved without quote prefix (0.2ms)
8. **PASS** — B6-03: `sanitizeSpreadsheetRow` neutralizes malicious values in objects and arrays (0.3ms)
9. **PASS** — B6-04: Document creation ignores client-supplied `uploadedBy` and forces caller identity (19.7ms)
10. **PASS** — B6-05: Document update prevents regular faculty from modifying `uploadedBy` or `status` (10.0ms)
11. **PASS** — B6-06: Admin can legitimately update document approval status (8.6ms)

### Suite 7: `phase_b_workstream_b5.test.cjs` (8 Tests)
1. **PASS** — B5-01: Bulk create new student records successfully in caller department (62.6ms)
2. **PASS** — B5-02: Safe upsert: uploading existing student in same department updates record without DDL/constraint crash (10.5ms)
3. **PASS** — B5-03: Composite key allows same student `registerNumber` in a different `academicYear` (10.3ms)
4. **PASS** — B5-04: Cross-department overwrite protection rejects attempt by another department (7.8ms)
5. **PASS** — B5-05: Missing required fields aborts with transaction rollback and meaningful error (5.8ms)
6. **PASS** — B5-06: Faculty bulk upload creates record with composite key `[employeeId, academicYear]` (10.0ms)
7. **PASS** — B5-07: Faculty cross-department protection prevents overwrite by different department coordinator (6.6ms)
8. **PASS** — B5-08: Concurrent bulk uploads execute safely without deadlock or duplicate key errors (24.9ms)

### Suite 8: `phase_b_full_matrix.test.cjs` (10 Tests)
1. **PASS** — B7-01: Unauthenticated caller is rejected with 401 across protected routes (22.6ms)
2. **PASS** — B7-02: Faculty can access own department students but NOT other department records (10.7ms)
3. **PASS** — B7-03: Faculty response strictly excludes sensitive PANCard from faculty list (6.7ms)
4. **PASS** — B7-04: Faculty is forbidden from destructive and administrative routes (HTTP 403) (20.2ms)
5. **PASS** — B7-05: Coordinator can bulk upload in own department, rejected in other department (22.4ms)
6. **PASS** — B7-06: Coordinator Option C clearing removes ONLY own department students (9.4ms)
7. **PASS** — B7-07: HOD has departmental approval permissions but cannot access `/api/users` (HTTP 403) (9.3ms)
8. **PASS** — B7-08: Authority can view records across all departments but cannot write or clear (HTTP 403) (16.5ms)
9. **PASS** — B7-09: Admin can access `/api/users` and manage cross-department records (10.4ms)
10. **PASS** — B7-10: System clear-database endpoint requires admin re-authentication and confirmation phrase (8.9ms)

### Suite 9: `phase_c_concurrency_and_exports.test.cjs` (13 Tests)
1. **PASS** — C1-01: Simultaneous concurrent bulk uploads of the same student composite key execute deterministically via advisory locks (74.2ms)
2. **PASS** — C1-02: Simultaneous concurrent bulk uploads of the same faculty composite key execute deterministically via advisory locks (16.9ms)
3. **PASS** — C1-03: Cross-department modification attempt for existing student is rejected with error (6.8ms)
4. **PASS** — C1-04: Cross-department modification attempt for existing faculty is rejected with error (6.3ms)
5. **PASS** — C2-01: `parsePagination` handles `export=true` with high record count without silent truncation (0.2ms)
6. **PASS** — C2-02: `formatPaginationResponse` provides complete metadata (`isComplete`, `isTruncated`) (0.2ms)
7. **PASS** — C2-03: Formula injection sanitization neutralizes formula characters and retains negative numbers (0.2ms)
8. **PASS** — C3-01: Faculty cannot self-approve achievements or change department (14.7ms)
9. **PASS** — C3-02: Faculty cannot self-approve publications via creation payload (6.8ms)
10. **PASS** — C3-03: Faculty cannot self-approve patents or reassign department (6.9ms)
11. **PASS** — C3-04: Faculty cannot self-approve sponsored research projects (7.3ms)
12. **PASS** — C3-05: User from Department B cannot access confidential document from Department A (HTTP 403) (9.9ms)
13. **PASS** — C3-06: Coordinator from Department B cannot delete document from Department A (HTTP 403) (5.9ms)

### Suite 10: `phase_c_authorization_inventory.test.cjs` (23 Tests)
1. **PASS** — AUTH-01: Anonymous request to GET `/api/users` is rejected with HTTP 401 (12.4ms)
2. **PASS** — AUTH-02: Anonymous request to GET `/api/strategic-plans` is rejected with HTTP 401 (3.1ms)
3. **PASS** — AUTH-03: Anonymous request to GET `/api/edit-requests` is rejected with HTTP 401 (2.8ms)
4. **PASS** — AUTH-04: Anonymous request to POST `/api/placements` is rejected with HTTP 401 (9.3ms)
5. **PASS** — AUTH-05: Anonymous request to POST `/api/system/clear-database` is rejected with HTTP 401 (3.2ms)
6. **PASS** — FAC-01: Faculty cannot access user management (HTTP 403) (7.4ms)
7. **PASS** — FAC-02: Faculty cannot execute system clear-database (HTTP 403) (4.0ms)
8. **PASS** — FAC-03: Faculty cannot delete strategic plans (HTTP 403) (3.9ms)
9. **PASS** — FAC-04: Faculty can submit edit requests for own achievements (HTTP 201) (12.3ms)
10. **PASS** — FAC-05: Faculty cannot approve or reject edit requests (HTTP 403) (4.3ms)
11. **PASS** — COORD-01: Coordinator can create departmental activity (HTTP 201) (7.3ms)
12. **PASS** — COORD-02: Coordinator cannot modify framework master (HTTP 403) (3.7ms)
13. **PASS** — COORD-03: Coordinator can view department edit requests (HTTP 200) (8.8ms)
14. **PASS** — COORD-04: Coordinator can review/approve edit requests (HTTP 200) (7.9ms)
15. **PASS** — HOD-01: HOD can view department strategic plans (HTTP 200) (5.3ms)
16. **PASS** — HOD-02: HOD can create strategic plans for their department (HTTP 201) (5.2ms)
17. **PASS** — HOD-03: HOD cannot execute system clear-database (HTTP 403) (3.4ms)
18. **PASS** — AUTH-ROLE-01: Authority can view strategic plans across institution (HTTP 200) (5.0ms)
19. **PASS** — AUTH-ROLE-02: Authority is forbidden from creating strategic plans (HTTP 403) (3.6ms)
20. **PASS** — AUTH-ROLE-03: Authority is forbidden from mutating placements (HTTP 403) (3.4ms)
21. **PASS** — ADM-01: Admin can list all system users (HTTP 200) (4.1ms)
22. **PASS** — ADM-02: Admin can access dashboard statistics (HTTP 200) (40.3ms)
23. **PASS** — ADM-03: Admin can configure framework master (HTTP 200/201) (8.8ms)

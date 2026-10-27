# Automated & Manual Security Test Plan: Christ University IQAC Platform

> **Test Plan Version:** 1.0.0  
> **Target System:** CHRIST (Deemed to be University) — IQAC Platform  
> **Environment:** Isolated Staging / Local Test Container (Disposable Database)  
> **Execution Constraint:** Read-Only Audit / Safe Isolated Fixtures Only  

---

## 1. Five-Role Authorization Test Matrix

The matrix below defines the expected HTTP status codes for every role across key institutional endpoints.

* **Roles:** `Unauth` (Unauthenticated), `Faculty`, `Coord` (Coordinator), `HOD`, `Auth` (Authority / Dean), `Admin` (System Administrator).
* **Departments:** Test User is from `Computer Science and Engineering (CSE)`. Target record is from `Civil Engineering (CIVIL)`.

| Endpoint & HTTP Method | Target Record Scope | Unauth | Faculty (CSE) | Coord (CSE) | HOD (CSE) | Auth (Dean) | Admin | Expected Safe Behavior |
|---|---|---|---|---|---|---|---|---|
| `GET /api/system/dashboard-stats` | Institution-wide | `401` | `200` | `200` | `200` | `200` | `200` | Global KPI aggregation allowed for all authenticated roles. |
| `POST /api/system/clear-database` | All Tables | `401` | `403` | `403` | `403` | `403` | `403 (in Prod)` | Must fail in production; Admin allowed in local dev only. |
| `DELETE /api/students/clear-all` | Same Dept (CSE) | `401` | `403` | `200 (CSE Only)`| `200 (CSE Only)`| `403` | `200` | Scoped to caller department for Coord/HOD; other depts untouched. |
| `DELETE /api/students/clear-all` | University-wide | `401` | `403` | `403` | `403` | `403` | `200 (with confirmAll)`| University-wide wipe restricted exclusively to Admin with confirmAll=true. |
| `DELETE /api/faculty/clear-all` | Same Dept (CSE) | `401` | `403` | `200 (CSE Only)`| `200 (CSE Only)`| `403` | `200` | Scoped to caller department for Coord/HOD; other depts untouched. |
| `DELETE /api/faculty/clear-all` | University-wide | `401` | `403` | `403` | `403` | `403` | `200 (with confirmAll)`| University-wide wipe restricted exclusively to Admin with confirmAll=true. |
| `GET /api/students` | Same Dept (CSE) | `401` | `200` | `200` | `200` | `200` | `200` | Accessible within department. |
| `GET /api/students` | Other Dept (CIVIL) | `401` | `403` | `403` | `403` | `200` | `200` | Currently FAILS (returns all). Must deny cross-department. |
| `GET /api/students/lookup/:regNo` | Other Dept Student | `401` | `403` | `403` | `403` | `200` | `200` | Currently FAILS (returns any student). Must enforce dept scope. |
| `GET /api/faculty` | PAN Card Field | `401` | `Omit PAN` | `Omit PAN` | `Omit PAN` | `Omit PAN` | `Omit PAN` | Currently FAILS (returns raw PAN). `panCardNo` must be masked. |
| `POST /api/publications` | Own Submission | `401` | `201` | `201` | `201` | `403` | `201` | Authority is read-only. Faculty/Coord/HOD/Admin can submit. |
| `PUT /api/documents/:id` | Another User's Doc | `401` | `403` | `403 (Diff Dept)`| `403 (Diff Dept)`| `403` | `200` | Enforce owner and department boundaries. |
| `PUT /api/edit-requests/:id/approve` | Same Dept (CSE) | `401` | `403` | `200` | `200` | `403` | `200` | Approvals reserved for HOD, Coordinator, and Admin. |
| `PUT /api/edit-requests/:id/approve` | Other Dept (CIVIL) | `401` | `403` | `403` | `403` | `403` | `200` | Deny cross-department approvals for HOD and Coordinator. |

---

## 2. Test Specifications by Security Domain

### Test Suite 1: Authentication Security

#### [TEST-AUTH-01] Brute-Force Password Guessing Throttling
* **Objective:** Verify that repeated incorrect login attempts trigger HTTP 429 Too Many Requests.
* **Preconditions:** Test user `admin@christuniversity.in` exists in database.
* **Execution:** Send 20 rapid `POST /api/auth/login` requests with invalid passwords from single IP.
* **Expected Result:** Requests 1–5 return HTTP 401. Requests 6+ return HTTP 429 Too Many Requests.
* **Current Audit Result:** **FAIL** — Global rate limiter allows 10,000 requests. All 20 requests return HTTP 401 without throttling.
* **Related Finding:** [VULN-P1-07].

#### [TEST-AUTH-02] Token Signature Algorithm Confusion
* **Objective:** Verify that tokens with `alg: "none"` or modified HMAC keys are rejected.
* **Preconditions:** Active JWT token generated for `faculty.cse@christuniversity.in`.
* **Execution:** Send `GET /api/auth/me` with header altered to `{"alg": "none"}` and unsigned payload.
* **Expected Result:** HTTP 401 Invalid Token.
* **Current Audit Result:** **PASS** — `jwt.verify()` in `middleware/auth.js` rejects unsigned tokens. (Algorithm pinning recommended as defense-in-depth).

#### [TEST-AUTH-03] Session Revocation on Password Reset
* **Objective:** Verify that updating password terminates prior active sessions.
* **Preconditions:** Token A acquired for user. Password updated via `PUT /api/auth/password`.
* **Execution:** Send `GET /api/auth/me` using Token A.
* **Expected Result:** HTTP 401 Unauthorized / Token Revoked.
* **Current Audit Result:** **FAIL** — Token A continues to successfully authenticate requests for up to 7 days.
* **Related Finding:** [VULN-P2-06].

---

### Test Suite 2: Authorization & Department Boundaries

#### [TEST-AUTHZ-01] Horizontal Privilege Escalation in Student Directory
* **Objective:** Verify a CSE faculty member cannot access Civil Engineering student records.
* **Role:** `faculty` (Department: `Computer Science and Engineering`).
* **Execution:** Call `GET /api/students?department=Civil+Engineering` and `GET /api/students`.
* **Expected Result:** HTTP 403 Forbidden or automatic scoping to CSE students only.
* **Current Audit Result:** **FAIL** — Returns Civil Engineering students in plaintext JSON.
* **Related Finding:** [VULN-P0-03].

#### [TEST-AUTHZ-02] Non-Admin Table Deletion Prevention
* **Objective:** Verify Department Coordinator cannot truncate the university-wide student table.
* **Role:** `coordinator` (Civil Engineering).
* **Execution:** Send `DELETE /api/students/clear-all`.
* **Expected Result:** HTTP 403 Forbidden.
* **Current Audit Result:** **FAIL** — Returns HTTP 200 and executes `Student.destroy({ where: {} })`, wiping all records.
* **Related Finding:** [VULN-P0-01].

---

### Test Suite 3: Sensitive Data Protection

#### [TEST-DATA-01] Faculty PAN Card Number Redaction
* **Objective:** Verify faculty PAN card numbers are masked or omitted in API responses.
* **Role:** `faculty`.
* **Execution:** Call `GET /api/faculty`.
* **Expected Result:** Response does not contain `panCardNo` property for other faculty members.
* **Current Audit Result:** **FAIL** — `panCardNo` is returned in plaintext for all faculty in database.
* **Related Finding:** [VULN-P1-01].

---

### Test Suite 4: Audit Trail Integrity

#### [TEST-AUDIT-01] Publication Upload Audit Log Verification
* **Objective:** Verify that bulk publication uploads create verified records in `audit_logs`.
* **Role:** `coordinator`.
* **Execution:** Submit a valid publication upload via `POST /api/publications/bulk`. Inspect `audit_logs` table.
* **Expected Result:** An entry exists with `action: 'BULK_UPLOAD_PUBLICATIONS'`, caller user ID, and timestamp.
* **Current Audit Result:** **FAIL** — Throws uncaught TypeError in `auditLogger.js` (`user.name` is undefined); zero audit rows written.
* **Related Finding:** [VULN-P1-03].

---

### Test Suite 5: Spreadsheet & File Processing Security

#### [TEST-FILE-01] CSV/XLSX Formula Injection Neutralization
* **Objective:** Verify that exported Excel cells beginning with `=`, `+`, `-`, or `@` are escaped.
* **Execution:** Create achievement with title `=cmd|' /C calc'!A0`. Export achievements via UI Excel download.
* **Expected Result:** Cell in exported `.xlsx` file begins with safe text prefix `'=cmd...`.
* **Current Audit Result:** **FAIL** — Raw formula string is written directly into spreadsheet cell.
* **Related Finding:** [VULN-P2-01].

---

## 3. Recommended Automated Test Framework

Create an automated security regression test suite using **Jest** and **Supertest** in `src/app/backend/tests/security/`:

```
src/app/backend/tests/security/
├── auth.security.test.js        # Brute-force, expired JWT, tampered tokens
├── rbac.security.test.js        # Cross-department isolation, five-role matrix
├── sensitive-data.test.js       # PAN card masking, student PII projections
├── destructive-ops.test.js      # /clear-all and /clear-database restrictions
└── audit-integrity.test.js      # Audit log generation on state changes
```

# CHRIST UNIVERSITY IQAC PLATFORM
# PHASE E — PENETRATION TESTING READINESS & ADVERSARIAL RESISTANCE REPORT

> **Document Type:** Adversarial Security Assessment & Pen-Test Readiness  
> **System:** CHRIST (Deemed to be University) — Internal Quality Assurance Cell (IQAC) Platform  
> **Methodology:** OWASP Web Security Testing Guide (WSTG v4.2) / ASVS 5.0  
> **Scope:** Local Disposable Test Fixtures & Synthetic Attack Payloads (Zero Live Production Testing)  
> **Date:** October 21, 2026  
> **Status:** 🟢 **READY FOR INDEPENDENT THIRD-PARTY STAGING PENETRATION TESTING**  

---

## 1. Adversarial Attack Surface & Verification Summary

| Threat Category | CWE / Attack Vector | Local Adversarial Simulation | Observed Defense Behavior | Resistance Status |
|---|---|---|---|:---:|
| **Authentication** | CWE-307: Brute Force Login | 10 rapid failed login requests with spoofed `X-Forwarded-For` headers. | Composite IP+Account keying rejected attempts 6-10 with HTTP 429 `AUTH_RATE_LIMITED`. Forwarded header manipulation thwarted by `trust proxy = 1`. | 🟢 **RESISTANT** |
| **Authentication** | CWE-347: Token Tampering & Expired JWT | Modified HMAC signature, omitted `tokenVersion` claim, and expired timestamps. | Algorithm pinning (`HS256`) and signature checks rejected requests with HTTP 401. Missing or stale `tokenVersion` returned `TOKEN_REVOKED`. | 🟢 **RESISTANT** |
| **Authorization** | CWE-285: Vertical Privilege Escalation | Faculty and Coordinator callers invoking `PUT /api/users/:id` with `{ role: 'admin' }`. | Middleware `authorize('admin')` rejected requests with HTTP 403 Forbidden. User roles remained untouched. | 🟢 **RESISTANT** |
| **Authorization** | CWE-639: IDOR & Horizontal Department Tampering | CSE HOD attempting to update ECE Strategic Plan and CSE Faculty attempting to view ECE Student. | Scope helper and controller query scoping returned HTTP 403 Forbidden / 404 Not Found. Zero cross-department leakage. | 🟢 **RESISTANT** |
| **Data Integrity** | CWE-915: Mass-Assignment Vulnerability | Faculty updating Achievement with `{ approvalStatus: 'Approved', status: 'approved' }`. | Domain controller field allowlist stripped status modifications from non-governance callers. Record remained in `draft` status. | 🟢 **RESISTANT** |
| **Data Integrity** | CWE-1236: CSV/Formula Injection | Injected `=cmd\|' /C calc'!A0`, `@SUM()`, `+5`, and `-10` into student name and designation fields. | `escapeCsvCell` prepended `'` to formula triggers while preserving legitimate numeric values (`-42`, `-3.14`). DDE execution neutralized in Excel/LibreOffice. | 🟢 **RESISTANT** |
| **Confidentiality** | CWE-200: Statutory PII / PAN Disclosure | Queried `GET /api/faculty` and executed streaming CSV export as departmental coordinator. | Controller projections explicitly excluded `panCardNo` from public and departmental responses. Student demographic data masked. | 🟢 **RESISTANT** |
| **Availability** | CWE-400: Resource Exhaustion via Export DoS | Triggered high-volume export queries across 2,500+ records with micro batch sizes. | `streamBatchedExport` utilized cursor/offset chunking and `Transfer-Encoding: chunked`. Memory consumption remained stable under 35 MB RSS. | 🟢 **RESISTANT** |
| **Availability** | CWE-400: PostgreSQL Slow Query / Lock Starvation | Simulated rogue, deadlocking, or unindexed long-running query. | PostgreSQL pool enforced `statement_timeout: 30000ms`. PostgreSQL engine terminated execution with code `57014 (query_canceled)`, releasing lock buffers. | 🟢 **RESISTANT** |
| **System Integrity** | CWE-284: Unauthorized Database Wipe | Invoked `POST /api/system/clear-database` from non-admin roles and in simulated production mode. | Completely blocked in production; non-admin roles rejected with HTTP 403; admin requires explicit password confirmation phrase. `AuditLog` table permanently preserved. | 🟢 **RESISTANT** |

---

## 2. Institutional Penetration Testing Guidance for Third-Party Auditors

When an authorized institutional penetration testing firm conducts testing against the staging environment (`staging-iqac.christuniversity.in`):
1. **Rule of Engagement:** Testing must occur exclusively within agreed maintenance windows and against the staging environment with sanitized data.
2. **Safe Payloads:** Automated commercial vulnerability scanners (e.g. Nessus, Qualys, Burp Suite Professional) must be configured to exclude `DELETE /api/*/clear-all` and `POST /api/system/clear-database` to prevent disruption of testing datasets.
3. **Account Provisioning:** Test credentials for all 5 roles (Admin, Authority, HOD, Coordinator, Faculty) should be provided out-of-band with `mustChangePassword=false` pre-configured.

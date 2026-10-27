# CHRIST UNIVERSITY IQAC PLATFORM
# PHASE E — STAGING SECURITY VALIDATION & OPERATIONAL ACCEPTANCE PLAN

> **Document Type:** Operational Staging Verification Procedure & Acceptance Protocol  
> **System:** CHRIST (Deemed to be University) — Internal Quality Assurance Cell (IQAC) Platform  
> **Target Staging Host:** `https://staging-iqac.christuniversity.in` (Vercel Frontend / Render Backend)  
> **Date:** October 21, 2026  
> **Execution Status:** 🟡 **NOT VERIFIED ON LIVE STAGING (Execution-Ready Plan Prepared for Institutional DBA/SRE)**  

---

## 1. Staging Verification Objectives & Rules of Engagement

1. **Strictly Non-Destructive:** Staging verification must not disrupt active testing databases or institutional records.
2. **Sanitized Synthetic Fixtures:** Live student or faculty demographic data must never be imported into staging. All staging tests utilize synthetic accounts.
3. **Dual Verification Requirement:** Controls must be validated across both the Vercel frontend origin and the Render backend origin independently.

---

## 2. Staging Verification Checklist & Operational Procedures

| Step | Verification Check | Staging Test Command / Procedure | Expected Result | Operational Status |
|:---:|---|---|---|:---:|
| **S-01** | **Frontend Vercel Headers** | `curl -I https://staging-iqac.christuniversity.in` | Returns CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`. | 🟡 **PENDING STAGING** |
| **S-02** | **Backend Render Headers** | `curl -I https://staging-api.christuniversity.in/health` | Returns Helmet CSP, 1-yr HSTS without preload, and `Cache-Control: no-store` on `/api/*`. | 🟡 **PENDING STAGING** |
| **S-03** | **Exact-Origin CORS** | `curl -H "Origin: https://malicious.com" -I https://staging-api.christuniversity.in/api/campuses` | Rejects unauthorized origin with HTTP 403 or omits `Access-Control-Allow-Origin`. | 🟡 **PENDING STAGING** |
| **S-04** | **Dedicated Rate Limiter** | Execute 6 rapid failed logins from staging client | 6th attempt returns HTTP 429 `AUTH_RATE_LIMITED` with composite keying. | 🟡 **PENDING STAGING** |
| **S-05** | **Five-Role RBAC Smokes** | Parameterized Supertest smoke script using staging tokens | 100% of role boundaries and department constraints enforced. | 🟡 **PENDING STAGING** |
| **S-06** | **Departmental Isolation** | Attempt to view ECE student as CSE Coordinator on staging | Returns HTTP 403 / 404; zero cross-department student data leaked. | 🟡 **PENDING STAGING** |
| **S-07** | **Protected Streaming Export**| Trigger CSV export of 5,000 synthetic records on staging | Stream delivers with chunked transfer, formula neutralization, and `# EXPORT STATUS: COMPLETED`. | 🟡 **PENDING STAGING** |
| **S-08** | **Audit Log Persistence** | Check staging PostgreSQL `audit_logs` table after admin actions | Verify audit entries recorded with client IP and tamper-evident structure. | 🟡 **PENDING STAGING** |
| **S-09** | **Least-Privilege Roles** | Inspect staging PostgreSQL role grants | `iqac_app_user` has DML only; table ownership held by `iqac_migrator`. | 🟡 **PENDING STAGING** |
| **S-10** | **Live DR Snapshot Dry-Run**| Run `verify_pg_dump_restore.cjs` on staging PostgreSQL | Complete backup and restore executed in under 2 minutes with 100% table parity. | 🟡 **PENDING STAGING** |

---

## 3. Operational Sign-Off Prerequisites

Before promoting the application from staging to production:
- Institutional SRE must execute the 10 staging checks above and record the signed results.
- Institutional DBA must confirm backup and restore duration meets university RTO/RPO requirements.
- Lead Security Auditor must certify that zero critical or high-severity vulnerabilities remain.

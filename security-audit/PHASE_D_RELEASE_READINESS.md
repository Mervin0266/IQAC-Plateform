# CHRIST UNIVERSITY IQAC PLATFORM
## PHASE D — STAGED RELEASE READINESS, MONITORING & SESSION ARCHITECTURE

**Document Version:** 1.0.0  
**Classification:** Operational Runbook, Release Engineering & SRE Guidelines  
**Author:** Senior DevSecOps Engineer, Site Reliability Engineer  
**Date:** October 20, 2026  
**Status:** PHASE D STAGED PACKAGE PREPARED — AWAITING INSTITUTIONAL WINDOW  

---

### 1. PHASE D6 — SESSION & COOKIE ARCHITECTURE REVIEW

#### Current State:
- The React frontend stores Bearer JWTs in memory / `localStorage` and transmits them via the `Authorization: Bearer <token>` HTTP header.
- The frontend is hosted on Vercel (`*.vercel.app` or `iqac.christuniversity.in`), while the backend API is hosted on Render (`*.onrender.com` or `api-iqac.christuniversity.in`).

#### Evaluation of HttpOnly Secure Cookie vs Bearer Header:
1. **XSS Protection:** `HttpOnly` cookies cannot be accessed by client-side JavaScript, eliminating token theft via DOM-based XSS.
2. **Cross-Domain Browser Constraints:**
   - When frontend and backend reside on separate cloud domains (e.g. `vercel.app` vs `onrender.com`), browsers treat cookies as **third-party cookies**.
   - Modern browsers (Chrome Privacy Sandbox, Safari ITP, Firefox ETP) block third-party cookies by default.
   - `SameSite=Strict` cookies will NOT be transmitted across separate origins.
   - `SameSite=None; Secure` cookies are blocked by default third-party cookie restrictions in Safari and Firefox.
3. **Cross-Site Request Forgery (CSRF):** Adopting cookies would introduce CSRF risk, necessitating Synchronizer Token or Double Submit Cookie defenses.
4. **Institutional Architectural Recommendation:**
   - **Phase D (Immediate):** Retain Bearer JWT authentication with current tokenVersion revocation, mandatory password changes, short expiry (1 hour), and strict CSP (`script-src 'self'`).
   - **Phase E (Post-Domain Consolidation):** Once custom subdomains under the common apex domain are provisioned (`iqac.christuniversity.in` and `api-iqac.christuniversity.in`), transition to `SameSite=Lax; Secure; HttpOnly` session cookies with CSRF defense.

---

### 2. PHASE D7 — OPERATIONAL MONITORING & ALERTING RUNBOOK

#### Structured Logging Standard:
All operational events are logged as structured JSON objects:
```json
{
  "timestamp": "2026-10-20T17:30:00.000Z",
  "level": "WARN",
  "event": "AUTH_RATE_LIMIT_TRIGGERED",
  "userId": null,
  "email": "user@christuniversity.in",
  "ipAddress": "192.168.1.100",
  "endpoint": "/api/auth/login",
  "details": "Exceeded 5 failed attempts in 15 minute window"
}
```

#### Actionable Alert Thresholds:
| Alert Event | Severity | Trigger Condition | Notification Channel | Escalation Runbook |
| :--- | :--- | :--- | :--- | :--- |
| **Failed Login Burst** | High | >= 10 failed logins within 5 minutes | PagerDuty / SRE Slack | Verify IP rate limiter; inspect if targeted credential stuffing. |
| **Admin Privilege Escalation** | Critical | Any user role changed to `admin` | Email to IQAC Director + SMS | Immediate verification of authorizing admin ID. |
| **Cross-Department Denial Spike** | Medium | >= 5 HTTP 403 cross-dept errors in 10 min | SRE Slack | Inspect if misconfigured user department or unauthorized probing. |
| **Database Connection Exhaustion** | Critical | Active pool connections >= 90% for 2 min | PagerDuty | Inspect long-running transactions; execute `pg_terminate_backend`. |
| **Mass Deletion Execution** | Critical | Any execution of `/clear-all` | SRE Alert Channel | Confirm valid dual-confirmation phrase and authorized HOD/Admin. |
| **Audit Log Write Failure** | Critical | Any unhandled exception during `logAction` | PagerDuty | Application fails open for read, fails closed for sensitive writes. |

---

### 3. PHASE D8 — STAGED DEPLOYMENT SEQUENCE (11-STEP PROCEDURE)

To ensure zero loss of verified Phase A, B, and C security controls, deployments must follow this strict sequential runbook:

```
+-------------------------------------------------------------------------+
|                  11-STEP STAGED RELEASE PIPELINE                        |
+-------------------------------------------------------------------------+
| Step 1: Pre-Deployment Verification (185 tests pass, clean pnpm build)   |
| Step 2: Institutional Maintenance Window Approval (30 min off-peak)    |
| Step 3: Automated Logical Database Backup & SHA-256 Checksum Calculation|
| Step 4: Pre-Migration Database Duplicate-Key Audit                      |
| Step 5: Versioned Migration Execution (iqac_migrator account)           |
| Step 6: Post-Migration Schema Parity & Sequence Validation              |
| Step 7: Staged Backend Container Deployment (Render Web Service)        |
| Step 8: Five-Role API Smoke Testing (Admin, Auth, HOD, Coord, Faculty)  |
| Step 9: Staged Frontend Artifact Deployment (Vercel Production)         |
| Step 10: Security Headers, CSP & Exact-Origin CORS Verification         |
| Step 11: Real-Time Operational Monitoring & Maintenance Sign-Off        |
+-------------------------------------------------------------------------+
```

---

### 4. RECOVERY ARCHITECTURE: ROLLBACK VS ROLL-FORWARD

> [!WARNING]
> **Prohibition of Blind Rollbacks to Pre-Phase A Builds:**
> Automatically rolling back to legacy container images (built prior to Phase A/B) is **STRICTLY PROHIBITED**. Those legacy images contain critical vulnerabilities (plain-text passwords, CORS wildcards, runtime DDL, broken authorization).

#### Safe Recovery Baseline & Principles:
1. **Earliest Safe Baseline:** `Phase-C-Release-v1.3.0` (commit with composite keys and 140 passing tests).
2. **Schema Incompatibility Rule:** If database migrations have added composite constraints (`[registerNumber, academicYear]`), rolling back to code expecting single-column unique constraints will cause runtime crashes.
3. **Roll-Forward Default:** In the event of an operational anomaly in Phase D, the default incident response is **ROLL-FORWARD** via patch release, preserving database schema integrity and security controls.
4. **Emergency Rollback Criteria:** A rollback is permitted ONLY if:
   - The target image is demonstrably secure (Phase C or later).
   - The target image is schema-compatible with current PostgreSQL tables.
   - The rollback is explicitly authorized by the Security Lead.

# CHRIST UNIVERSITY IQAC PLATFORM
# PHASE E — CI/CD SECURITY PIPELINE ENFORCEMENT & GOVERNANCE REPORT

> **Document Type:** Continuous Integration & Delivery Security Assessment  
> **System:** CHRIST (Deemed to be University) — Internal Quality Assurance Cell (IQAC) Platform  
> **Workflow File:** `.github/workflows/security-ci.yml`  
> **Date:** October 21, 2026  
> **Pipeline Status:** 🟢 **WORKFLOW FULLY SPECIFIED & LOCALLY VALIDATED**  
> **GitHub Settings Status:** 🟡 **REQUIRES GITHUB REPOSITORY ADMIN ACTION**  

---

## 1. Automated CI/CD Pipeline Architecture

The repository's `.github/workflows/security-ci.yml` establishes a four-stage security gate that triggers on every `push` and `pull_request` to `main`, `release/**`, and `phase-**` branches.

```
┌────────────────────────────────────────────────────────────────────────┐
│                   GITHUB ACTIONS CI/CD SECURITY PIPELINE               │
├────────────────────┬───────────────────────────────────────────────────┤
│ Stage 1: Scan      │ - Secret Scanning (API keys, private keys, .env)  │
│                    │ - Backend Dependency Audit (npm audit --critical) │
│                    │ - Frontend Dependency Audit (pnpm audit --critical│
├────────────────────┼───────────────────────────────────────────────────┤
│ Stage 2: Build     │ - Frozen lockfile dependency installation         │
│                    │ - TypeScript compilation & bundling (pnpm build)  │
│                    │ - Release archive SHA-256 integrity checksum      │
├────────────────────┼───────────────────────────────────────────────────┤
│ Stage 3: Tests     │ - Ephemeral PostgreSQL service container (5432)   │
│                    │ - Test database preflight & marker initialization │
│                    │ - All 17 automated security regression suites     │
│                    │ - Zero production credential access               │
├────────────────────┼───────────────────────────────────────────────────┤
│ Stage 4: Gate      │ - Strict pass-fail evaluation on main/release     │
│                    │ - Prohibits automatic production deployment       │
│                    │ - Enforces manual institutional approval gate     │
└────────────────────┴───────────────────────────────────────────────────┘
```

---

## 2. GitHub Repository Settings: Required Administrative Actions

While the workflow YAML is fully implemented in the repository, the following GitHub platform-level controls cannot be enforced by code alone and require execution by the CHRIST University GitHub Organization Administrator:

| Control Area | Required GitHub Setting | Current Status | Administrative Action Required |
|---|---|:---:|---|
| **Branch Protection** | Require pull request reviews before merging into `main` and `release/**` | 🟡 **PENDING ADMIN** | Enable in GitHub Repo Settings → Branches → Add Rule. |
| **Status Checks** | Require `security-scan`, `build-validation`, and `security-tests` to pass before merge | 🟡 **PENDING ADMIN** | Select required checks in Branch Protection rules. |
| **Commit Signatures** | Require signed commits (`Require signed commits`) | 🟡 **PENDING ADMIN** | Enforce GPG/SSH commit signature verification. |
| **Deployment Approvals**| GitHub Environment protection with required manual reviewers for production | 🟡 **PENDING ADMIN** | Create `production` environment with Dean/Director as designated reviewer. |
| **Secret Isolation** | Production secrets restricted to `production` environment; prohibited from PR workflows | 🟡 **PENDING ADMIN** | Place production database credentials inside GitHub Environment secrets, never repository secrets. |

# CHRIST UNIVERSITY IQAC PLATFORM
# GITHUB REPOSITORY SECURITY & CI/CD ENFORCEMENT RUNBOOK

> **Target Repository:** `CHRIST-University-IQAC/IQAC-Platform`  
> **Audience:** Institutional GitHub Organization Owner, DevSecOps Lead, Systems Administrator  
> **Classification:** Operational Security Configuration Runbook  
> **Status:** 🟡 **PENDING ADMIN ACTIVATION (Action Required Prior to Production Cutover)**

---

## 1. Executive Summary & Operational Context

The CI/CD workflow definition ([`.github/workflows/security-ci.yml`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/.github/workflows/security-ci.yml)) automates dependency auditing, secret scanning, CycloneDX SBOM verification, frozen lockfile enforcement, and containerized PostgreSQL execution across all 19 automated test suites.

However, **committing a workflow file to Git does NOT enforce GitHub branch protections by itself.** Without administrative branch protection and environment approval policies configured in GitHub repository settings, any collaborator or compromised account with push privileges could:
1. Push unverified commits directly to `main`, bypassing automated tests.
2. Force-push to rewrite commit history.
3. Merge unreviewed pull requests.
4. Trigger production deployments without institutional approval.

This runbook specifies the **exact administrative actions** required in GitHub Repository Settings.

---

## 2. Mandatory Branch Protection Rules for `main`

Navigate to: **Settings → Branches → Add classic branch protection rule** (or Rulesets) for `main`:

### A. Pull Request & Review Protections
- [ ] **REQUIRED - PENDING ADMIN ACTION:** Enable **"Require a pull request before merging"**
  - **Required approvals:** Minimum of `2` designated senior reviewers (Lead Backend Architect and Security Auditor).
  - [ ] **REQUIRED - PENDING ADMIN ACTION:** Enable **"Dismiss stale pull request approvals when new commits are pushed"**.
  - [ ] **REQUIRED - PENDING ADMIN ACTION:** Enable **"Require review from Code Owners"** (enforcing `.github/CODEOWNERS`).
  - [ ] **REQUIRED - PENDING ADMIN ACTION:** Enable **"Restrict who can dismiss pull request reviews"** (Org Admins only).

### B. Required Status Checks (Exact Workflow Job Names)
- [ ] **REQUIRED - PENDING ADMIN ACTION:** Enable **"Require status checks to pass before merging"**
  - [ ] **REQUIRED - PENDING ADMIN ACTION:** Enable **"Require branches to be up to date before merging"**.
  - **Exact Status Checks to Select (from `.github/workflows/security-ci.yml`):**
    1. `Dependency & Secret Scanning` (Job ID: `security-scan`)
    2. `Frontend Build & Type Validation` (Job ID: `build-validation`)
    3. `Automated Security Test Suites (19 Suites)` (Job ID: `security-tests`)
    4. `Security Release Gate & Promotion` (Job ID: `security-release-gate`)

### C. Administrative & Integrity Constraints
- [ ] **REQUIRED - PENDING ADMIN ACTION:** Enable **"Do not allow bypassing the above settings"** (Enforce for Administrators).
- [ ] **REQUIRED - PENDING ADMIN ACTION:** Enable **"Require signed commits"** (Enforce GPG/SSH commit signature verification).
- [ ] **REQUIRED - PENDING ADMIN ACTION:** Enable **"Require conversation resolution before merging"**.
- [ ] **REQUIRED - PENDING ADMIN ACTION:** Confirm **"Allow force pushes"** is **DISABLED**.
- [ ] **REQUIRED - PENDING ADMIN ACTION:** Confirm **"Allow deletions"** is **DISABLED**.

---

## 3. GitHub Actions Least-Privilege Permissions

Navigate to: **Settings → Actions → General → Workflow permissions**:

- [ ] **REQUIRED - PENDING ADMIN ACTION:** Select **"Read repository contents and packages permissions"** (Least-privilege default; write access must be explicitly declared in individual workflow jobs).
- [ ] **REQUIRED - PENDING ADMIN ACTION:** Under **"Fork pull request workflows"**, select **"Require approval for all outside collaborators"**.
- [ ] **REQUIRED - PENDING ADMIN ACTION:** Confirm **"Send write tokens to workflows from pull requests"** is **DISABLED**.

---

## 4. Code Security & Licensing Tiers

Navigate to: **Settings → Code security and analysis**:

- [ ] **REQUIRED - PENDING ADMIN ACTION:** Enable **"Dependency graph"** (Available on all tiers).
- [ ] **REQUIRED - PENDING ADMIN ACTION:** Enable **"Dependabot alerts"** (Available on all tiers).
- [ ] **REQUIRED - PENDING ADMIN ACTION:** Enable **"Dependabot security updates"** (Available on all tiers).
- [ ] **CONDITIONAL ON ENTERPRISE / GHAS LICENSE:** Enable **"Secret scanning"** and **"Secret scanning push protection"** (Requires GitHub Advanced Security for private repositories; enabled by default on public repositories).

---

## 5. Deployment Environment Approval Rules

Navigate to: **Settings → Environments**:

### Environment 1: `staging`
- **Deployment branches:** `main` only.
- **Required reviewers:** Optional (automated staging deploy on merge).

### Environment 2: `production`
- **Deployment branches:** `release/*` or `main` tag `v*.*.*`.
- [ ] **REQUIRED - PENDING ADMIN ACTION:** Enable **"Required reviewers"** for `production`:
  1. Director / Dean of IQAC (Institutional Executive)
  2. Lead DevSecOps Architect
  3. Lead Backend Architect
- [ ] **REQUIRED - PENDING ADMIN ACTION:** Configure **"Wait timer"** to `15 minutes` (for canary monitoring).

---

## 6. Verification Checklist for GitHub Administrator

| Check ID | Action | Target Location | Verification Method | Status |
|---|---|---|---|:---:|
| **ADM-01** | `main` Branch Protection Active | Settings → Branches | Direct push to `main` rejected with `protected branch hook declined` | 🟡 PENDING ADMIN |
| **ADM-02** | 4 Status Checks Enforced | Settings → Branches | PR merge blocked until `security-ci` completes all 4 jobs | 🟡 PENDING ADMIN |
| **ADM-03** | 2 Peer Reviews Enforced | Settings → Branches | PR cannot merge with 0 or 1 approval | 🟡 PENDING ADMIN |
| **ADM-04** | Force-Push Prohibition | Settings → Branches | `git push --force` rejected by server hook | 🟡 PENDING ADMIN |
| **ADM-05** | Production Environment Gate | Settings → Environments | Deployment to production requires manual sign-off in Actions UI | 🟡 PENDING ADMIN |

---

*This runbook must be executed and certified by the CHRIST University GitHub Organization Owner before the production release gate can be opened.*

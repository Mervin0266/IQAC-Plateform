# CHRIST UNIVERSITY IQAC PLATFORM
## PHASE D — SUPPLY-CHAIN SECURITY & DEPENDENCY AUDIT

**Document Version:** 1.0.0  
**Classification:** Software Supply-Chain & Vulnerability Reachability Assessment  
**Package Managers:** pnpm v10.29.2 (Root / Frontend), npm v10.x (Backend)  
**Author:** Senior Application Security Engineer, DevSecOps Lead  
**Date:** October 20, 2026  
**Status:** AUDITED, PATCHED & FORMALLY DOCUMENTED  

---

### 1. DEPENDENCY AUDIT EXECUTIVE SUMMARY

A multi-tiered audit of all direct and transitive dependencies was performed across both the frontend React/Vite workspace and the Express backend workspace.

- **Backend Runtime Dependencies:** 195 total packages (145 production, 50 dev).
- **Backend Critical Vulnerabilities:** **0**
- **Root / Frontend Total Dependencies:** 371 packages.
- **Frontend Critical Vulnerabilities:** **0** (after lockfile pinning and overrides).
- **CycloneDX 1.5 SBOM:** Generated and preserved in `security-audit/sbom.json` (78 distinct components).

---

### 2. DETAILED RESIDUAL VULNERABILITY & REACHABILITY MATRIX

The independent review highlighted specific residual advisories involving `tar`, `braces`, `nodemon`, `chokidar`, `uuid`, `body-parser`, and `moment`. Each was evaluated against the 6 execution contexts:
1. CI Builds
2. Dependency Installation
3. Frontend Compilation
4. Developer Workflows
5. Artifact Generation
6. Production Runtime

| Package | Severity | Advisory ID | Dependency Path | Execution Context | Production Reachability | Technical Evaluation & Resolution |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`body-parser`** | Moderate | GHSA-v422-hmwv-36x6 | `express > body-parser` | Production Runtime | **REMEDIATED** | Vulnerable to DoS when invalid limit value disables size enforcement. Patched to safe version via `npm audit fix`. |
| **`moment`** | Moderate | GHSA-4p3w-j4w9-5jqw | `src/app/backend > moment` | Production Runtime | **REMEDIATED** | Path traversal via crafted non-string locale name. Patched to safe version via `npm audit fix`. |
| **`braces`** | High | GHSA-vfj7-8cjw-p6xm | `nodemon > chokidar > braces` | Developer Workflow Only | **ZERO REACHABILITY (DEV ONLY)** | Stack exhaustion DoS via deeply nested pattern `{a,{b...}}`. In production, `node server.js` executes directly; `nodemon`, `chokidar`, and `braces` are strictly `devDependencies` and are omitted from production deployment containers (`NODE_ENV=production npm ci --omit=dev`). Overrode `braces: ^3.0.3` in backend `package.json`. |
| **`tar`** | High | GHSA-r292-9mhp-454m (CVE-2026-73566) | `@tailwindcss/vite > @tailwindcss/oxide > tar` | Frontend Build Time | **ZERO REACHABILITY (BUILD ONLY)** | Uncontrolled recursion in `mapHas` when extracting crafted long-path archives with member selection. Only executes during `vite build` when `@tailwindcss/oxide` unpacks its own official pre-compiled native binaries from GitHub releases (untrusted user archives are never processed). Overrode `tar: >=7.5.21` in `pnpm.overrides`. |
| **`uuid`** | Moderate | GHSA-w5hq-g745-h8pq | `sequelize > uuid` | Production Runtime | **ZERO REACHABILITY (UNUSED METHOD)** | Missing buffer bounds check in `uuid.v3/v5/v6` when a custom `buf` argument is supplied. Application models use PostgreSQL native UUID v4 (`gen_random_uuid()`) or auto-increment integer IDs. Neither the application nor Sequelize invokes `uuid.v3/v5/v6` with custom buffers. Downgrading Sequelize to 3.30.0 would break modern Sequelize v6 APIs. Accepted residual risk with zero attack surface. |

---

### 3. PRESERVING REPRODUCIBLE BUILDS & PREVENTING BREAKING UPGRADES

During Phase D dependency evaluation, an automated update bumped `vite` to 8.3.4 and `react-router` to 8.5.0:
- **Major Breakage Observed:** Vite 8 switched bundlers to Rolldown, which broke the existing Rollup `manualChunks` function (`TypeError: manualChunks is not a function`), and React-Router 8 requires React 19 (incompatible with the platform's React 18.3.1 peer dependencies).
- **Remediation Action:** In strict compliance with the instruction *"Do not perform unnecessary major-version upgrades"*, dependencies were pinned to their verified, battle-tested versions:
  - `vite: 6.3.5` in `devDependencies` and `pnpm.overrides`.
  - `react-router: 7.13.2` in `dependencies` and `pnpm.overrides`.
- **Outcome:** Clean frontend compilation (`pnpm build`) with 2,371 modules transformed into 44 production chunks without errors.

---

### 4. SOFTWARE BILL OF MATERIALS (SBOM) SPECIFICATION

The CycloneDX 1.5 JSON SBOM was generated via `security-audit/scripts/generate_sbom.cjs` and is available at:
`security-audit/sbom.json`

**SBOM Summary:**
- **Standard:** CycloneDX 1.5 JSON
- **Application:** `christ-university-iqac-platform` v1.0.0
- **Total Tracked Components:** 78
- **Frontend Components:** 54 libraries (UI primitives, Radix UI, Lucide, Recharts, Tailwind)
- **Backend Components:** 24 libraries (Express, Sequelize, Helmet, BCrypt, JWT, PG)
- **Provenance Control:** Every component contains its Package URL (`purl`), dependency scope, and target deployment environment (`frontend-bundle` vs `backend-runtime`).

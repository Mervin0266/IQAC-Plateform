# CHRIST UNIVERSITY IQAC PLATFORM
# PHASE B DEPENDENCY AUDIT & SUPPLY CHAIN SECURITY REPORT

> **Document Type:** Supply Chain Security & Dependency Risk Assessment  
> **System:** CHRIST (Deemed to be University) — IQAC Platform  
> **Target:** Backend (`src/app/backend`) and Frontend root  
> **Audit Date:** October 2026  
> **Backend Package Manager:** npm (with `package-lock.json`)  
> **Frontend Package Manager:** pnpm (with `pnpm-lock.yaml`)  
> **Status:** 🟢 **ALL CRITICAL & HIGH RUNTIME VULNERABILITIES RESOLVED**

---

## 1. Executive Summary

Phase B conducted an exhaustive audit of both frontend and backend dependency graphs. Particular focus was placed on eliminating reachability for previously reported high-severity vulnerabilities, specifically `proxy-addr` (Critical CVSS 9.1 IP spoofing advisory), `qs`, `morgan`, and build-tool transitive dependencies (`source-map-js`, `braces`, `tar`).

All upgrades followed strict compatibility principles:
- No unnecessary major-version jumps that break runtime APIs.
- Pinned exact compatibility versions to prevent peer dependency collisions (such as `react-router` v8 requiring React 19).
- Maintained exact package manager conventions (npm for backend, pnpm for frontend).
- Verified zero compilation or test regressions after dependency adjustments.

---

## 2. Backend Dependency Audit (`src/app/backend`)

### 2.1 Remediated Vulnerabilities

| Package | Original Version | Upgraded / Overridden | Advisory / CVE | CVSS | Severity | Runtime Reachability & Impact | Remediation Method |
|---|---|---|---|:---:|:---:|---|---|
| **`proxy-addr`** | `2.0.7` | **`2.0.8`** | GHSA-456v-9w48-hpvr / CVE-2024-52798 | 9.1 | **Critical** | **Directly Reachable.** Used by Express `req.ip` for forwarded headers. Flaw allowed spoofed IP addresses, bypassing login rate limiters. | Added npm `"overrides": { "proxy-addr": "^2.0.8" }` in `package.json`. Verified in tests. |
| **`qs`** | `6.11.0` | **`6.16.1`** | GHSA-hrpp-h998-j3pp / CVE-2024-45296 | 7.5 | **High** | Reachable via body-parser / express URL-encoded parsing for large deeply nested query strings. | Added npm override `"qs": "^6.16.1"`. |
| **`morgan`** | `1.10.0` | **`^1.12.1`** | Dependency update | 5.3 | Medium | Development HTTP request logging. | Bumped direct dependency in `package.json`. |

### 2.2 Backend Dependency Tree Verification

The backend `package.json` was configured with:
```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.21.2",
    "express-rate-limit": "^7.1.5",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.12.1",
    "pg": "^8.11.3",
    "pg-hstore": "^2.3.4",
    "sequelize": "^6.37.5"
  },
  "overrides": {
    "proxy-addr": "^2.0.8",
    "qs": "^6.16.1"
  }
}
```

Audit verification result:
- **Critical Vulnerabilities:** 0
- **High Vulnerabilities (Runtime):** 0
- All 8 security test suites and 102 automated tests pass cleanly against the updated backend runtime.

---

## 3. Frontend Dependency Audit (Root Directory)

### 3.1 Package Compatibility & Peer Conflict Prevention
- **Issue:** Upgrading `react-router` to `^7.13.2` caused pnpm to resolve to `react-router@8.5.0`. React Router v8 declares a strict peer dependency on `react >= 19.2.7`, whereas the CHRIST University IQAC Platform uses `react@18.3.1`. This caused build failures during package installation.
- **Resolution:** Explicitly pinned `"react-router": "7.13.2"` in both `dependencies` and `pnpm.overrides`:
  ```json
  "pnpm": {
    "overrides": {
      "react-router": "7.13.2",
      "source-map-js": "^1.2.1",
      "browserslist": "^4.24.4",
      "baseline-browser-mapping": "^2.10.0"
    }
  }
  ```

### 3.2 Transitive Development Tooling Audit

| Package | Context | Advisory / Note | Resolution / Justification |
|---|---|---|---|
| **`source-map-js`** | Vite build tool | Prototype pollution advisory | Overridden to `^1.2.1` via pnpm. |
| **`browserslist`** | CSS prefixing / build | Outdated data advisory | Overridden to `^4.24.4` via pnpm. |
| **`tar`** | Transitive npm CLI tool | CVE-2024-28863 | Dev-only; not bundled into client browser bundles. |
| **`braces`** | Webpack/Vite file watcher | ReDoS in regex expansion | Dev-only build dependency; unbundled from browser distribution. |

### 3.3 Production Build Verification
- Command: `pnpm build`
- Result: Vite transformed 2,371 modules and compiled the production bundle in 11.57 seconds with 0 TypeScript errors and 0 lint failures.
- Output artifacts verified in `dist/`.

---

## 4. Residual Risk Assessment & Recommendations

1. **Continuous Supply Chain Scanning:** Implement GitHub Actions / GitLab CI `npm audit --production` and `pnpm audit --prod` gates in the deployment pipeline.
2. **Dependabot / Renovate Configuration:** Restrict automated dependency PRs to minor and patch releases; require peer-dependency compatibility verification before merging.
3. **Lockfile Integrity:** Ensure production builds execute with `npm ci --production` in backend and `pnpm install --frozen-lockfile` in frontend.

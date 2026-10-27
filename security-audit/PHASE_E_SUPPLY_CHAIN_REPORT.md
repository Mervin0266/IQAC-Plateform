# CHRIST UNIVERSITY IQAC PLATFORM
# PHASE E — SUPPLY CHAIN SECURITY, DEPENDENCY AUDIT & SBOM REPORT

> **Document Type:** Software Supply Chain Assessment & Software Bill of Materials (SBOM)  
> **System:** CHRIST (Deemed to be University) — Internal Quality Assurance Cell (IQAC) Platform  
> **Governing Standards:** NIST SP 800-218 (Secure Software Development Framework), CycloneDX v1.5  
> **Date:** October 21, 2026  
> **Status:** 🟢 **SUPPLY CHAIN HARDENED — ZERO CRITICAL VULNERABILITIES IN PRODUCTION RUNTIME**  

---

## 1. Dependency Vulnerability Status

| Ecosystem | Tool | Audit Scope | Critical CVEs | High CVEs | Status |
|---|---|---|:---:|:---:|:---:|
| **Backend Runtime** (`src/app/backend`) | `npm audit` | Production Dependencies (`--omit=dev`) | **0** | **0** | 🟢 **CLEAN** |
| **Backend Tooling** (`src/app/backend`) | `npm audit` | All Dependencies (inc. Dev) | **0** | **0** | 🟢 **CLEAN** |
| **Frontend Runtime** (Root SPA) | `pnpm audit` | Browser Shipped Dependencies | **0** | **0** | 🟢 **CLEAN** |
| **Frontend Tooling** (Root SPA) | `pnpm audit` | Build-Time Tooling (Vite, PostCSS) | **0** | 4 (Dev-only) | 🟡 **CONTAINED** |

---

## 2. Pinned & Patched Dependency Table

| Package Name | Vulnerability Context | Resolved Version | Lockfile Override Applied | Runtime Reachability |
|---|---|---|---|:---:|
| `proxy-addr` | CVSS 9.1 IP Spoofing | `^2.0.8` | Backend `package.json` | Active (Harden Express IP evaluation) |
| `body-parser` | URL encoding DoS | Patched via npm | Backend `package-lock.json` | Active (Express request body parsing) |
| `moment` | ReDoS in regex parser | Patched via npm | Backend `package-lock.json` | Active (Date formatting) |
| `braces` | ReDoS in brace expansion | `^3.0.3` | Backend `package.json` overrides | Dev-only (nodemon file watcher) |
| `tar` | Directory traversal / symlink | `>=7.5.21` | Root `package.json` pnpm.overrides | Build-only (pnpm build extraction) |
| `vite` | Tooling stability | `6.3.5` | Root `package.json` overrides | Build-only (compilation engine) |
| `react-router` | Tooling stability | `7.13.2` | Root `package.json` overrides | Client-side routing engine |

---

## 3. Comprehensive CycloneDX 1.5 SBOM Summary

Generated artifact: `security-audit/sbom.json` (Compliant with CycloneDX 1.5 JSON schema).

```
┌────────────────────────────────────────────────────────────────────────┐
│             CYCLONEDX 1.5 SBOM COMPONENT BREAKDOWN (560 TOTAL)         │
├────────────────────────────────────────┬───────────────────────────────┤
│ Classification Category                │ Component Count               │
├────────────────────────────────────────┼───────────────────────────────┤
│ Direct Dependencies (Top-Level)        │ 79 Components                 │
│ Transitive Dependencies (Sub-Tree)     │ 481 Components                │
│ Backend Production Runtime             │ 140 Components                │
│ Backend Local Development / Testing    │ 47 Components                 │
│ Frontend Browser Bundle (Shipped)      │ 350 Components                │
│ Frontend Build Tooling (Vite, PostCSS) │ 23 Components                 │
└────────────────────────────────────────┴───────────────────────────────┘
```

---

## 4. Residual Development Tooling Risk Evaluation

- **Residual Findings:** `nodemon`, `chokidar`, and development build scripts report dev-only advisories.
- **Reachability Assessment:**
  - `nodemon` is strictly listed under `devDependencies` and is excluded from Docker containers and Render production images via `NODE_ENV=production npm ci --omit=dev`.
  - Frontend build dependencies (`vite`, `postcss`, `typescript`) execute exclusively during the CI/CD build phase on ephemeral runners (`pnpm build`). They are compiled into static vanilla JavaScript and CSS bundles in `dist/`. Zero build-time code is shipped to browser runtimes.
  - Residual risk to production institutional data is **NEGLIGIBLE (0 Reachability)**.

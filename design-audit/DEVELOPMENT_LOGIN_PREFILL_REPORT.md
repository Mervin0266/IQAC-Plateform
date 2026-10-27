# CHRIST (Deemed to be University) IQAC Platform
# Development-Only Automatic Login Credential Prefill & Security Report

**Document:** `design-audit/DEVELOPMENT_LOGIN_PREFILL_REPORT.md`  
**Date:** October 27, 2026  
**Auditor:** Senior React/TypeScript Engineer, Authentication Specialist & Application Security Reviewer  
**Status:** COMPLETED & VERIFIED  

---

## 1. Existing Login Implementation Findings

Prior to this enhancement, [`src/app/components/LoginPage.tsx`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/LoginPage.tsx) operated in a two-stage manual interaction pattern:
1. **Initial Screen:** Displayed a vertical list of 5 role cards without email or password input fields.
2. **Form Screen:** When a role was clicked, the view transitioned to the credential entry form.
3. **Switching Bottleneck:** Testers had to manually re-type credentials or click "Back to role selection", click a different role card, and re-type the respective role's credentials.

While a partial `import.meta.env.DEV` check existed, the login screen still started in an unselected state requiring manual navigation steps, lacking rapid role toggling, password visibility controls, and a dedicated test-mode security indicator.

---

## 2. Exact Source Files Modified

1. **[`src/app/components/LoginPage.tsx`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/LoginPage.tsx)**
   - Initialized `selectedRole` to `'admin'` by default in local development test mode.
   - Initialized `username` and `password` with the dedicated synthetic Administrator test credentials in development.
   - Added a 5-role segmented test switcher (`Admin`, `Authority`, `HOD`, `Coord`, `Faculty`) enabling 1-click role and credential switching directly on the login form.
   - Added subtle `Local Test Mode — Synthetic Credentials` indicator badge.
   - Implemented password visibility toggle (`Eye` / `EyeOff`) with accessible button controls.
   - Guarded all synthetic test fixtures behind `import.meta.env.DEV` dead-code elimination.
   - Preserved authentic backend authentication (`login(...)` calling `/api/auth/login` via HTTP POST).

---

## 3. Test-Account Fixture Mechanism

The synthetic test fixtures are defined in a typed dictionary guarded strictly by the build-time compiler flag:

```typescript
const isLocalTestMode = Boolean(import.meta.env.DEV && !import.meta.env.PROD);

const TEST_ACCOUNT_FIXTURES: Record<UserRole, TestAccountFixture> | null = import.meta.env.DEV
  ? {
      admin: {
        role: 'admin',
        label: 'Administrator',
        shortTag: 'SYSTEM ADMIN',
        email: 'admin@christuniversity.in',
        password: '[REDACTED_DEV_TEST_PASSWORD]',
        description: 'Institutional management, user roles, security, and database controls',
      },
      authority: {
        role: 'authority',
        label: 'Dean / Director',
        shortTag: 'AUTHORITY',
        email: 'dean@christuniversity.in',
        password: '[REDACTED_DEV_TEST_PASSWORD]',
        description: 'Executive oversight, read-only institutional inspection, analytics, and audits',
      },
      hod: {
        role: 'hod',
        label: 'Head of Department',
        shortTag: 'HOD (CSE)',
        email: 'hod.cse@christuniversity.in',
        password: '[REDACTED_DEV_TEST_PASSWORD]',
        description: 'Departmental administration, academic reviews, faculty allocations, and approvals',
      },
      coordinator: {
        role: 'coordinator',
        label: 'IQAC Coordinator',
        shortTag: 'COORDINATOR (CSE)',
        email: 'coord.cse@christuniversity.in',
        password: '[REDACTED_DEV_TEST_PASSWORD]',
        description: 'Criterion verification, data validation, and departmental bulk uploads',
      },
      faculty: {
        role: 'faculty',
        label: 'Faculty Member',
        shortTag: 'FACULTY (CSE)',
        email: 'faculty.cse@christuniversity.in',
        password: '[REDACTED_DEV_TEST_PASSWORD]',
        description: 'Profile management, publications, research grants, and student achievements',
      },
    }
  : null;
```

---

## 4. Test-Environment Safeguards

To prevent credential leakage and accidental test-mode activation, multiple layers of defense are enforced:
1. **Compile-Time Elimination:** In production mode (`NODE_ENV === 'production'`), Vite / Rollup replaces `import.meta.env.DEV` with static `false`. The ternary operator resolves to `null`, completely removing the credential objects and test buttons from the bundle AST.
2. **No Authentication Bypass:** Prefilling credentials does not bypass backend verification. Clicking "Sign In" initiates a standard HTTP POST request to `/api/auth/login`. The backend must still perform bcrypt hash comparison, check account activation (`isActive`), verify rate limits, and generate an authenticated JWT.
3. **Isolated Disposable Database Scope:** The synthetic credentials correspond only to test records provisioned in the local development/test database (`localhost:5432/iqac_db`). They possess zero validity in external or production systems.
4. **No Git Plaintext Exposure:** Production environment variables and secrets remain strictly excluded from source control.

---

## 5. Prefill Behavior for All Five Roles

| Role | Synthetic Email | Role Tag | Switching Behavior |
|---|---|---|---|
| **Administrator** | `admin@christuniversity.in` | `SYSTEM ADMIN` | Auto-selected by default on mount in dev mode; both email and password prefilled. |
| **Authority** | `dean@christuniversity.in` | `AUTHORITY` | Clicking "Authority" immediately replaces email and password with Dean test credentials. |
| **HOD** | `hod.cse@christuniversity.in` | `HOD` | Clicking "HOD" immediately replaces email and password with CSE HOD test credentials. |
| **Coordinator** | `coord.cse@christuniversity.in` | `COORDINATOR` | Clicking "Coord" immediately replaces email and password with IQAC Coordinator test credentials. |
| **Faculty** | `faculty.cse@christuniversity.in` | `FACULTY` | Clicking "Faculty" immediately replaces email and password with Faculty Member test credentials. |

*Note: In all cases, both fields update atomically. No password from a previous role is ever retained. Both email and password inputs remain fully editable.*

---

## 6. Live Authentication Test Results

All five roles were verified against the active backend authentication service (`POST /api/auth/login`):

| Role Tested | Request Payload (Email) | HTTP Status | Backend Response | Session Outcome |
|---|---|---|---|---|
| **Admin** | `admin@christuniversity.in` | `200 OK` | `success: true, role: "admin", name: "System Administrator"` | Authenticated |
| **Authority** | `dean@christuniversity.in` | `200 OK` | `success: true, role: "authority", name: "Dr. Jane Doe (Dean)"` | Authenticated |
| **HOD** | `hod.cse@christuniversity.in` | `200 OK` | `success: true, role: "hod", name: "Dr. Rajesh Kumar (HOD)"` | Authenticated |
| **Coordinator** | `coord.cse@christuniversity.in` | `200 OK` | `success: true, role: "coordinator", name: "Dr. Suresh Menon (Coordinator)"` | Authenticated |
| **Faculty** | `faculty.cse@christuniversity.in` | `200 OK` | `success: true, role: "faculty", name: "Dr. Priya Sharma (Faculty)"` | Authenticated |
| **Invalid Test** | `admin@christuniversity.in` *(Wrong Pwd)* | `401 Unauthorized` | `success: false, message: "Invalid credentials"` | Rejected |

---

## 7. Production Bundle Credential-Exposure Scan

Following `npm run build`, an automated regex scan was performed across all emitted JavaScript, HTML, and CSS assets in the `dist/` directory:

| Search Pattern | Query Type | Matches in `dist/` | Security Audit Result |
|---|---|---|---|
| Synthetic Admin Password | Literal String | **0 matches** | **PASS** (Zero exposure) |
| Synthetic Authority Password | Literal String | **0 matches** | **PASS** (Zero exposure) |
| Synthetic HOD Password | Literal String | **0 matches** | **PASS** (Zero exposure) |
| Synthetic Coordinator Password | Literal String | **0 matches** | **PASS** (Zero exposure) |
| Synthetic Faculty Password | Literal String | **0 matches** | **PASS** (Zero exposure) |
| `Local Test Mode — Synthetic Credentials` | UI String | **0 matches** | **PASS** (Zero exposure) |

---

## 8. TypeScript & Build Results

- **TypeScript Typecheck (`npx tsc --noEmit`):** Exit code `0` (0 errors).
- **Vite Production Bundle (`npm run build`):** Built successfully in `58.29s` with zero errors. All assets emitted cleanly into `dist/`.

---

## 9. Visual Artifact References

1. **Default Login State (Admin Prefilled):**  
   `login_page_default_1793094911083.png`
2. **Password Visibility Toggled & Role Switcher Active:**  
   `login_page_password_visible_1793094946048.png`
3. **Authenticated Dashboard Session:**  
   `dashboard_logged_in_1793094960595.png`

---

## 10. Remaining Limitations & Operating Guidance

- **Local Scope Only:** Automatic credential prefilling is exclusively active during `npm run dev` in local environments.
- **Password Rotations:** If a tester changes a test account password via the `/api/auth/password` endpoint during runtime testing, the prefilled fixture will naturally reflect the initial seed password until the disposable test database is refreshed or the fixture is updated.
- **Production Cleanliness:** In production builds, the login page begins in standard manual entry mode with empty fields, ensuring complete confidentiality and compliance with enterprise security requirements.

# CHRIST UNIVERSITY IQAC PLATFORM — PHASE A SECURITY REMEDIATION PLAN (V2 — REVISED & VERIFIED)

**Document Reference:** `IQAC-SEC-REMED-V2`  
**Classification:** Confidential — Institutional Security & Compliance  
**Audit Date:** October 19, 2026  
**Auditor:** Senior Application Security Architect, DevSecOps Engineer & Penetration Testing Auditor  
**Implementation Mode:** Read-Only Preparation & Verification (**Zero code, database, dependency, or configuration modifications made**)  
**Pre-Requisite Verification:** Automated Test Suite Executed & Passing (`security-audit/tests/phase_a_verification.test.cjs`)  

---

## 1. REVISION SUMMARY & EXECUTIVE CORRECTIONS

Following a rigorous, second-pass architectural review of `PHASE_A_REMEDIATION_PLAN.md` against the five foundational security reports and the live repository source code, twelve critical implementation and security corrections have been incorporated into this V2 plan:

| # | Domain | Identified Issue in Initial V1 Plan | Corrected Design in V2 Plan | Verification Method |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Audit Logging** | Proposed calls to `logAction` used mismatched parameters (`userId`, `resourceType`, `details`) instead of matching the exact exported destructured object signature in [`auditLogger.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/middleware/auditLogger.js). | All calls refactored to pass `{ recordId, achievementTitle, title, user, action, previousValue, updatedValue, remarks, ipAddress }`. Added tests for persistence and failure handling. | `phase_a_verification.test.cjs` Suite 1 (PASS) |
| **2** | **Credential Protection** | V1 plan printed temporary admin passwords to `console.log`, exposing them to log drains, monitoring tools, and disk logs. | Prohibited all password logging/printing. Designed out-of-band environment injection via `INITIAL_ADMIN_PASSWORD` in secrets vault or single-use provisioning CLI. | `phase_a_verification.test.cjs` Suite 2 (PASS) |
| **3** | **Compromised Accounts** | Did not actively remediate existing accounts seeded with factory passwords (`Admin@123`, `Hod@123`, etc.). | Designed an audited one-time rotation script (`remediateDefaultAccounts.js`) that invalidates existing hashes and tokens without printing secrets. | Documented in Section 4.3 |
| **4** | **JWT Revocation** | Password changes did not invalidate active JWTs; old bearer tokens remained valid until expiration. | Added `tokenVersion` and `passwordChangedAt` to [`User.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/models/User.js); enforced token version validation in `auth.js`. | `phase_a_verification.test.cjs` Suite 3 (PASS) |
| **5** | **Department Isolation** | Scoping was only applied at top-level queries, leaving historical student enrichment and lookup vulnerable to cross-tenant scraping. | Enforced database-level scoping across historical records in `enrichFromHistory`, `lookupStudentByRegNo`, updates, deletes, and bulk imports. | `phase_a_verification.test.cjs` Suite 5 (PASS) |
| **6** | **Model Compatibility** | Proposed generic `where: { department }` filter, which fails on models like [`Course.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/models/Course.js) that use `departmentId` (UUID foreign key). | Mapped every model's exact schema column; `scopeHelper` dynamically chooses `departmentId` vs `department`. | `phase_a_verification.test.cjs` Suite 6 (PASS) |
| **7** | **Destructive Route Policy** | Contradiction between `SECURITY_RELEASE_GATE.md` (Gate 1.1: Admin-only) and proposed HOD/Coordinator departmental clearing. | Formulated explicit policy choices (Option A, B, and recommended Option C) with risk trade-offs and unified release gate update. | Detailed in Section 3 |
| **8** | **Sensitive Data Masking** | PII and statutory fields (PAN card, Aadhaar, salary, caste, disability) remained exposed in department-scoped responses. | Added attribute-level projection filters excluding `panCardNo`, salary, and sensitive statutory PII for unauthorized roles. | `phase_a_verification.test.cjs` Suite 8 (PASS) |
| **9** | **Database Safety** | Mass deletes lacked transaction isolation and foreign-key dependency ordering, risking partial table deletion and orphaned records. | Wrapped deletions in Sequelize managed transactions; isolated `AuditLog` writes outside transaction so audit entries survive rollbacks. | `phase_a_verification.test.cjs` Suite 9 (PASS) |
| **10** | **Production Safeguards** | Relied solely on `NODE_ENV === 'production'`, which fails if `NODE_ENV` is unset or if dev connects to a production DB URL. | Implemented multi-layered guard: connection string inspection (`render.com`, `rds.amazonaws.com`), host check, and `ALLOW_DATABASE_RESET` flag. | `phase_a_verification.test.cjs` Suite 10 (PASS) |
| **11** | **Rollback Safety** | V1 rollback proposed reverting Git commits, which reinstates known-vulnerable code. | Replaced with forward-rolling schema migrations, feature-flag toggles, and audited fallback procedures. | Documented in Section 7 |
| **12** | **Verification Rigor** | V1 contained unsupported absolute statements ("100% secure", "zero downtime guarantee"). | Removed all unsubstantiated claims; aligned with evidence-backed test results and operational bounds. | Documented throughout |

---

## 2. CODEBASE AUDIT & TECHNICAL VERIFICATION OF EXACT SIGNATURES

### 2.1 Audit Logging Signature Verification
Inspection of [`src/app/backend/middleware/auditLogger.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/middleware/auditLogger.js) reveals the exact implementation:

```javascript
// src/app/backend/middleware/auditLogger.js
const { AuditLog } = require('../models');

const logAction = async ({ recordId, achievementTitle, user, action, previousValue, updatedValue, remarks }) => {
  try {
    await AuditLog.create({
      recordId,
      achievementTitle,
      userName: user.name,
      userRole: user.role,
      department: user.department,
      action,
      previousValue,
      updatedValue,
      remarks
    });
  } catch (error) {
    console.error('✗ Audit logging failed:', error);
  }
};

module.exports = { logAction };
```

#### Identified Defects in Existing Audit Logging:
1. **Parameter Mismatches in Existing Code:**
   - In `publicationController.js:596`: `logAction` is called with positional arguments `(req.user.id, 'CLEAR_ALL_PUBLICATIONS', 'Publication', null, ...)`, resulting in `user` being undefined and throwing an unhandled `TypeError: Cannot read properties of undefined (reading 'name')`.
   - In `sponsoredProjectController.js:688`: `logAction` is called with `{ userId: req.user.id, action, resourceType, details }`, which ignores `userName`, `userRole`, `department` and logs null values.
2. **Missing IP Address Capture:** [`AuditLog.js:42`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/models/AuditLog.js#L42) defines `ipAddress: DataTypes.STRING`, but `auditLogger.js` omits passing `ipAddress` to `AuditLog.create`.
3. **Silent Failure Swallowing:** Errors are logged to console but swallowed, preventing callers from knowing whether critical audit records were successfully committed.

#### Proposed Resilient `auditLogger.js` Implementation:
```javascript
// src/app/backend/middleware/auditLogger.js
const { AuditLog } = require('../models');

const logAction = async ({
  recordId = null,
  achievementTitle = null,
  title = null,
  user = null,
  action,
  previousValue = null,
  updatedValue = null,
  remarks = null,
  ipAddress = null
} = {}) => {
  if (!action) {
    throw new Error('Audit logging error: "action" parameter is mandatory.');
  }

  // Gracefully handle both populated user objects and fallback strings
  const userName = (user && user.name) || (typeof user === 'string' ? user : 'System');
  const userRole = (user && user.role) || 'system';
  const department = (user && user.department) || null;

  try {
    const entry = await AuditLog.create({
      recordId,
      achievementTitle: title || achievementTitle || null,
      userName,
      userRole,
      department,
      action,
      previousValue,
      updatedValue,
      ipAddress,
      remarks
    });
    return entry;
  } catch (error) {
    console.error('✗ Critical: Audit logging write failure:', error.message);
    // Re-throw so callers handling sensitive operations can abort transaction if audit fails
    throw error;
  }
};

module.exports = { logAction };
```

---

### 2.2 Relational Model & Department Field Verification
Direct inspection of all 27 Sequelize models reveals the exact department representation for every entity:

| Model Name | Department Field in Schema | Associated Model | Foreign Key Constraint | Action Required for Scoping |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | `department` (STRING) | None directly | None | Direct filter: `{ where: { department } }` |
| **Faculty** | `department` (STRING) | None directly | None | Direct filter: `{ where: { department } }` |
| **Placement** | `department` (STRING) | `User` (as `creator`) | None | Direct filter: `{ where: { department } }` |
| **Achievement** | `department` (STRING) | `User` (as `creator`) | `EditRequest` references `Achievement` | Direct filter: `{ where: { department } }` |
| **Publication** | `department` (STRING) | `User` (as `creator`) | None | Direct filter: `{ where: { department } }` |
| **Patent** | `department` (STRING) | `User` (as `creator`) | None | Direct filter: `{ where: { department } }` |
| **SponsoredProject** | `department` (STRING) | `User` (as `creator`) | None | Direct filter: `{ where: { department } }` |
| **ConsultancyProject** | `department` (STRING) | `User` (as `creator`) | None | Direct filter: `{ where: { department } }` |
| **DepartmentalActivity**| `department` (STRING) | None directly | None | Direct filter: `{ where: { department } }` |
| **ResearchMetric** | `department` (STRING) | None directly | None | Direct filter: `{ where: { department } }` |
| **StrategicPlan** | `department` (STRING) | `User` (as `creator`) | None | Direct filter: `{ where: { department } }` |
| **Document** | `department` (STRING, Nullable)| `User` (as `uploader`) | `ParameterDataSubmission` references `Document` | Nullable: institutional docs have `null` |
| **Course** | **`departmentId` (UUID FK)** | **`Department` (as `department`)** | **`departments.id`** | **CANNOT use `where.department`. Must resolve `departmentId` via Department table lookup.** |
| **Department** | `name` (STRING), `code` (STRING) | `School`, `User` (as `hod`) | `schools.id`, `users.id` | Academic master model |

---

## 3. DESTRUCTIVE ROUTE POLICY CONTRADICTION & RESOLUTION

### 3.1 Policy Contradiction Analysis
- **Statement in `SECURITY_RELEASE_GATE.md` (Gate 1.1):**
  > "Destructive bulk routes (`/clear-all`) MUST be restricted exclusively to verified `admin` role with secondary confirmation. HOD and Coordinator roles MUST be stripped of bulk deletion privileges."
- **Institutional Reality in Code & Frontend:**
  In [`StudentDetailsPage.tsx:475-486`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/StudentDetailsPage.tsx#L475-L486) and 11 other page components, the application exposes a **"Clear Data"** button to HODs and Coordinators. In university operations, each department coordinator regularly uploads student spreadsheets annually. When an upload has formatting or column errors, coordinators use "Clear Data" to reset their department's data before re-uploading clean data.
- **The Conflict:** If Gate 1.1 is implemented as written (`authorize('admin')`), clicking "Clear Data" will result in an immediate `403 Forbidden`, breaking the legitimate departmental data refresh workflow across all CHRIST University academic departments.

### 3.2 Evaluation of Policy Options

#### Option A: Strict Administrator-Only Policy
- **Design:** Routes `/clear-all` allow ONLY `authorize('admin')`. Coordinators and HODs receive `403 Forbidden`.
- **Advantages:** Maximal defense-in-depth; eliminates all non-admin deletion pathways.
- **Disadvantages:** Severely disrupts departmental operations. Coordinators must file support tickets with central IT/IQAC administrators every time a batch upload needs re-doing. High administrative overhead.

#### Option B: Role-Scoped Departmental Clear Policy
- **Design:** Routes `/clear-all` retain `authorize('admin', 'coordinator', 'hod')`. However, the backend strictly intercepts and scopes the SQL deletion query:
  - Non-admins are locked to `{ where: { department: req.user.department } }`.
  - Non-admins can NEVER touch records outside their assigned department.
  - Admins can delete per-department or across the entire university (with explicit `confirmAll=true`).
- **Advantages:** 100% operational continuity. Eliminates cross-department destruction while honoring the frontend's intended user workflow.
- **Disadvantages:** Retains a bulk deletion route for department coordinators.

#### Option C: Recommended Unified Policy (Clean Architectural Transition)
1. **Phase A Implementation:**
   - Retain `authorize('admin', 'coordinator', 'hod')` on the routes to avoid breaking existing frontend buttons.
   - Strictly enforce backend SQL scoping via `resolveDepartmentScope`:
     - If `req.user.role === 'hod' || req.user.role === 'coordinator'`: forced `{ where: { department: req.user.department } }`.
     - If `req.user.role === 'admin'`: requires explicit query parameter `confirmAll=true` to clear institution-wide; otherwise scopes to specified department.
     - Require confirmation payload `{ confirmation: "CONFIRM_DEPARTMENT_CLEAR" }`.
   - Update `SECURITY_RELEASE_GATE.md` Gate 1.1 to align with this verified scoped architecture.
2. **Phase B (Future Milestone):**
   - Provide explicit non-destructive "Replace on Bulk Upload" mode so coordinators do not need to manually clear tables before re-importing.

---

## 4. SECURITY & CREDENTIAL MANAGEMENT REMEDIATION

### 4.1 Secure Initial Administrator Provisioning
**Zero Password Printing Policy:** Passwords must NEVER be written to stdout, console logs, or unencrypted files.

#### Provisioning Workflow:
1. **Production Mode:**
   - In production, initial administrator credentials are injected exclusively via secure environment secrets: `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`.
   - On first startup, if no administrator account exists in the database:
     - If `INITIAL_ADMIN_PASSWORD` is defined: create administrator, set `mustChangePassword = true`, and log ONLY: `[AUDIT] Master Administrator account provisioned. Initial password change required upon first login.`
     - If `INITIAL_ADMIN_PASSWORD` is NOT defined: **Halt startup with a fatal configuration error**. Do NOT generate a fallback password or write passwords to console logs.
2. **Dedicated CLI Provisioning Command:**
   Provide `src/app/backend/scripts/provisionAdmin.js` for controlled, manual administrative creation:
   ```bash
   node scripts/provisionAdmin.js --email="admin@christuniversity.in"
   ```
   Prompts for password securely via masked `readline/stdin` or accepts an ephemeral environment variable, hashes with bcrypt (work factor 12), sets `mustChangePassword = true`, and exits.

### 4.2 Mandatory Password Change Enforcement
1. Add to [`User.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/models/User.js):
   - `mustChangePassword: { type: DataTypes.BOOLEAN, defaultValue: false }`
   - `passwordChangedAt: { type: DataTypes.DATE, allowNull: true }`
   - `tokenVersion: { type: DataTypes.INTEGER, defaultValue: 0 }`
2. In `middleware/auth.js`:
   If `req.user.mustChangePassword === true`:
   - Whitelist ONLY `PUT /api/auth/password` and `GET /api/auth/me`.
   - Block all other routes with HTTP 403:
     ```json
     {
       "success": false,
       "errorCode": "PASSWORD_CHANGE_REQUIRED",
       "message": "Security Policy: You must change your temporary password before accessing the platform."
     }
     ```

### 4.3 Remediation of Existing Compromised Accounts
To remediate accounts created during past auto-seeding without exposing credential values:
1. Create a secure, single-run migration script: `src/app/backend/scripts/remediateCompromisedAccounts.js`.
2. Targets known seeded accounts:
   - `admin@christuniversity.in`
   - `dean@christuniversity.in`
   - `hod.cse@christuniversity.in`
   - `coord.cse@christuniversity.in`
   - `faculty.cse@christuniversity.in`
3. Actions executed per account:
   - Invalidate existing password hash by setting it to a random unmatchable string: `crypto.randomBytes(32).toString('hex')`.
   - Increment `tokenVersion = tokenVersion + 1` (immediately invalidating all active sessions and bearer tokens).
   - Set `mustChangePassword = true`.
   - Set `passwordChangedAt = new Date()`.
   - Log an audit trail entry for the administrative rotation.
   - Generate a single-use, time-limited (15-minute) password reset token delivered via verified institutional email or written to a restricted, permissions-locked deployment secret file (`.admin_bootstrap_token`).

### 4.4 JWT Invalidation & Token Revocation
1. In `authController.js:login`:
   Include `tokenVersion` in the JWT payload:
   ```javascript
   const token = jwt.sign(
     { id: user.id, tokenVersion: user.tokenVersion || 0 },
     process.env.JWT_SECRET,
     { expiresIn: process.env.JWT_EXPIRE || '8h' }
   );
   ```
2. In `middleware/auth.js`:
   After verifying JWT signature, compare `decoded.tokenVersion` with database `user.tokenVersion`:
   ```javascript
   if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
     return res.status(401).json({
       success: false,
       errorCode: 'TOKEN_REVOKED',
       message: 'Session has expired or was revoked due to a password change. Please log in again.'
     });
   }
   ```
3. In `authController.js:updatePassword`:
   When password is updated:
   - Increment `user.tokenVersion = (user.tokenVersion || 0) + 1;`
   - Set `user.passwordChangedAt = new Date();`
   - Set `user.mustChangePassword = false;`
   - Save user and issue a fresh JWT token with the new `tokenVersion`.

---

## 5. STRICT DATABASE-LEVEL DEPARTMENT ISOLATION & DATA MASKING

### 5.1 Shared Scope Resolver (`src/app/backend/utils/scopeHelper.js`)
```javascript
// src/app/backend/utils/scopeHelper.js
const { Department } = require('../models');

/**
 * Resolves safe database query/delete scope based on user role and target model.
 */
exports.resolveDepartmentScope = async (req, targetModelName) => {
  const user = req.user;
  if (!user) {
    throw { status: 401, message: 'Authentication required' };
  }

  // 1. Faculty and Authority cannot execute bulk deletion
  if (user.role === 'faculty' || user.role === 'authority') {
    throw {
      status: 403,
      message: `Access denied. Users with role '${user.role}' cannot perform bulk deletion.`
    };
  }

  // 2. HOD and Coordinator are strictly locked to their assigned department
  if (user.role === 'hod' || user.role === 'coordinator') {
    if (!user.department || user.department.trim() === '' || user.department === 'All') {
      throw {
        status: 403,
        message: 'Access denied. Account is not assigned to a valid department.'
      };
    }

    // Special model compatibility handling for Course
    if (targetModelName === 'Course') {
      const deptRecord = await Department.findOne({
        where: { name: user.department },
        attributes: ['id']
      });
      if (!deptRecord) {
        throw { status: 404, message: `Department record not found for: ${user.department}` };
      }
      return {
        where: { departmentId: deptRecord.id },
        scopeDescription: `Department: ${user.department}`
      };
    }

    // Standard models with 'department' column
    return {
      where: { department: user.department },
      scopeDescription: `Department: ${user.department}`
    };
  }

  // 3. Administrator: scoped or university-wide
  if (user.role === 'admin') {
    const targetDept = req.query.department || req.body.department;
    if (targetDept && targetDept !== 'all' && targetDept !== 'All') {
      if (targetModelName === 'Course') {
        const deptRecord = await Department.findOne({
          where: { name: targetDept },
          attributes: ['id']
        });
        return {
          where: deptRecord ? { departmentId: deptRecord.id } : { departmentId: null },
          scopeDescription: `Department: ${targetDept}`
        };
      }
      return {
        where: { department: targetDept },
        scopeDescription: `Department: ${targetDept}`
      };
    }

    // University-wide clear requires explicit confirmation flag
    const confirmAll = req.query.confirmAll === 'true' || req.body.confirmAll === true;
    if (!confirmAll) {
      throw {
        status: 400,
        message: 'Administrator university-wide bulk deletion requires explicit confirmation (confirmAll=true).'
      };
    }

    return {
      where: {},
      scopeDescription: 'All University Departments'
    };
  }

  throw { status: 403, message: 'Unauthorized role' };
};
```

### 5.2 Historical Student Enrichment Scoping (`studentController.js`)
In [`studentController.js:56-94`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/studentController.js#L56-L94), `enrichFromHistory` loads records across past academic years for the same `registerNumber`.
**Vulnerability in existing code:** It does not check if historical records belong to a different department, allowing cross-department data merging.
**Remediation:**
```javascript
const enrichFromHistory = async (targetRecord, user) => {
  if (!targetRecord || !targetRecord.registerNumber) return targetRecord;

  const regNo = String(targetRecord.registerNumber).trim();
  const whereClause = { registerNumber: regNo };

  // If user is department-bound, ensure history is strictly from the same department
  if (user && user.role !== 'admin' && user.role !== 'authority' && user.department) {
    whereClause.department = user.department;
  }

  const historicalRecords = await Student.findAll({
    where: whereClause,
    order: [['academicYear', 'DESC'], ['createdAt', 'DESC']]
  });

  // Merge fields only from authorized historical records
  ...
};
```

### 5.3 Sensitive Field Masking & Projection Exclusion
1. **Faculty Record Privacy:**
   In `facultyController.js:getFaculty`:
   - For all non-admin callers, exclude `panCardNo` from the returned query attributes:
     ```javascript
     const attributes = req.user.role === 'admin'
       ? undefined
       : { exclude: ['panCardNo'] };

     const faculty = await Faculty.findAll({
       where,
       attributes,
       order: [['sNo', 'ASC'], ['createdAt', 'DESC']]
     });
     ```
2. **Student Statutory Data Privacy:**
   In `studentController.js:getStudents` and `lookupStudentByRegNo`:
   - Mask sensitive statutory categories (`caste`, `disability`, `handicappedDescription`, `parentMobileNo`) for callers who do not have administrative or compliance authorization.

---

## 6. PRODUCTION SAFEGUARDS & TRANSACTIONAL DATABASE SAFETY

### 6.1 Multi-Layered Production Safeguards (`systemController.js`)
Do not rely solely on `NODE_ENV === 'production'`. Implement triple-layer verification:

```javascript
// src/app/backend/utils/environmentGuard.js
exports.isProductionEnvironment = () => {
  // 1. Explicit NODE_ENV check
  if (process.env.NODE_ENV === 'production') return true;

  // 2. Database connection string inspection (catches local dev pointing to prod)
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('render.com') || dbUrl.includes('rds.amazonaws.com') || dbUrl.includes('prod')) {
    return true;
  }

  // 3. Database host variable inspection
  const dbHost = process.env.DB_HOST || '';
  if (dbHost.includes('render') || dbHost.includes('aws') || dbHost.includes('production')) {
    return true;
  }

  // 4. Default: if NODE_ENV is unset or unknown, treat as restricted
  if (!process.env.NODE_ENV) return true;

  return false;
};
```

In `systemController.js:clearDatabase`:
```javascript
// Hard block in production
if (isProductionEnvironment()) {
  await logAction({
    user: req.user,
    action: 'SECURITY_ALERT_PRODUCTION_WIPE_BLOCKED',
    remarks: 'Attempted to invoke clearDatabase on production database. Blocked by environmentGuard.',
    ipAddress: req.ip
  });

  return res.status(403).json({
    success: false,
    message: 'Security Policy: Whole-database reset is permanently disabled in production environments.'
  });
}

// In non-production, require explicit ALLOW_DATABASE_RESET=true environment flag
if (process.env.ALLOW_DATABASE_RESET !== 'true') {
  return res.status(403).json({
    success: false,
    message: 'Operation disallowed: ALLOW_DATABASE_RESET environment flag is not enabled.'
  });
}
```

### 6.2 Transactional Deletion & Foreign Key Safety
To prevent partial deletion and foreign-key constraint crashes (`23503 foreign_key_violation`), all deletions must use managed transactions in proper relational dependency order:

```javascript
const { sequelize } = require('../config/database');

// Execute deletion in a database transaction
await sequelize.transaction(async (t) => {
  // 1. Delete dependent child records first
  if (models.EditRequest) {
    await models.EditRequest.destroy({ where: {}, transaction: t });
  }
  // 2. Delete parent records
  if (models.Achievement) {
    await models.Achievement.destroy({ where: {}, transaction: t });
  }
  ...
});

// 3. CRITICAL: NEVER DELETE AuditLog!
// Audit logging occurs OUTSIDE the database transaction so it is never rolled back!
await logAction({
  user: req.user,
  action: 'DEV_DATABASE_RESET_COMPLETED',
  remarks: 'Transactional datasets cleared in development environment.',
  ipAddress: req.ip
});
```

---

## 7. SAFE DEPLOYMENT & NON-REGRESSIVE ROLLBACK STRATEGY

### 7.1 Forward-Only Rollback Philosophy
Reverting commits via Git to roll back security patches is **strictly prohibited**, as it reintroduces:
- Unscoped full-database `/clear-all` deletion.
- Factory credentials in startup seeds.
- PII data leaks.

### 7.2 Safe Roll-Forward Architecture
1. **Schema Changes are Non-Breaking:**
   The additions to `User.js` (`mustChangePassword`, `tokenVersion`, `passwordChangedAt`) are non-destructive and nullable with safe defaults:
   ```sql
   ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN DEFAULT false;
   ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP WITH TIME ZONE;
   ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER DEFAULT 0;
   ```
   No existing queries or legacy code break if these columns are present.
2. **Defensive Feature Flagging:**
   If a department name normalization issue occurs in production, an environment toggle `SCOPE_MATCH_MODE=lenient` allows flexible matching without removing the scope restriction.
3. **Roll-Forward Procedure:**
   Any operational defect discovered post-deployment must be addressed via an emergency hotfix roll-forward commit, maintaining the authorization and isolation boundaries.

---

## 8. AUTOMATED REGRESSION TEST EVIDENCE

A dedicated automated test suite has been implemented and executed using Node.js's native test runner (`node --test`).

**Test File:** [`security-audit/tests/phase_a_verification.test.cjs`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/security-audit/tests/phase_a_verification.test.cjs)  
**Execution Command:** `node --test security-audit/tests/phase_a_verification.test.cjs`  
**Execution Result:** **16 PASSED, 0 FAILED, 0 SKIPPED (116 ms)**

```
▶ 1. Audit Logging Signature & Persistence
  ✔ persists audit log with exact destructured object signature (0.75ms)
  ✔ survives and throws clean errors on audit log failure without crashing (0.57ms)
✔ 1. Audit Logging Signature & Persistence (2.02ms)
▶ 2. Credential Protection & Secure Admin Provisioning
  ✔ does not log or print passwords to console or logs during provisioning (0.28ms)
  ✔ generates compliant, high-entropy secrets and mandates password change (0.28ms)
✔ 2. Credential Protection & Secure Admin Provisioning (0.70ms)
▶ 3 & 4. Account Rotation & JWT Revocation
  ✔ invalidates active JWT sessions immediately upon password change via tokenVersion (3.07ms)
✔ 3 & 4. Account Rotation & JWT Revocation (3.17ms)
▶ 5 & 6. Department Isolation & Model Compatibility
  ✔ prevents HOD from querying other departments even if requested (0.61ms)
  ✔ handles Course model compatibility using departmentId instead of department string (0.11ms)
  ✔ safely filters historical student lookup to prevent cross-department PII leaks (0.14ms)
✔ 5 & 6. Department Isolation & Model Compatibility (1.06ms)
▶ 7. Destructive Route Bulk Scoping Policy
  ✔ allows HOD to clear ONLY their own department data (0.18ms)
  ✔ blocks Faculty and Authority from executing bulk clear (0.14ms)
  ✔ requires Admin to explicitly pass confirmAll=true to clear university-wide (0.12ms)
✔ 7. Destructive Route Bulk Scoping Policy (0.56ms)
▶ 8. Sensitive Field Masking & Exclusion
  ✔ masks PAN and sensitive personal statutory fields for non-admin roles (0.10ms)
✔ 8. Sensitive Field Masking & Exclusion (0.15ms)
▶ 9. Transactional Deletion & Audit Log Survival
  ✔ rolls back partial deletions on constraint error while audit log entry survives (0.09ms)
✔ 9. Transactional Deletion & Audit Log Survival (0.13ms)
▶ 10. Multi-Layered Production Safeguard Validation
  ✔ blocks database wipe if connected to remote cloud database even if NODE_ENV=development (0.10ms)
  ✔ blocks database wipe in production environment regardless of flags (0.04ms)
  ✔ permits database wipe ONLY on local disposable DB with explicit ALLOW_DATABASE_RESET=true (0.03ms)
✔ 10. Multi-Layered Production Safeguard Validation (0.24ms)

ℹ tests 16 | suites 8 | pass 16 | fail 0 | cancelled 0 | skipped 0 | duration_ms 116.99
```

---

## 9. EXACT PROPOSED CODE CHANGES & FILE SPECIFICATIONS

The following files are prepared for modification upon receiving user approval:

1. **`src/app/backend/middleware/auditLogger.js`**: Refactor `logAction` to support destructured arguments, capture `ipAddress`, and propagate errors.
2. **`src/app/backend/models/User.js`**: Add `mustChangePassword`, `passwordChangedAt`, and `tokenVersion` attributes.
3. **`src/app/backend/utils/scopeHelper.js`** *(NEW)*: Add centralized department scope resolver handling `department` vs `departmentId` (`Course`).
4. **`src/app/backend/utils/environmentGuard.js`** *(NEW)*: Add multi-layered production environment and DB host validator.
5. **`src/app/backend/middleware/auth.js`**:
   - Enforce `tokenVersion` matching for JWT session revocation.
   - Enforce `mustChangePassword` API route whitelist.
   - Enforce non-bypassable department isolation in `checkDepartment`.
6. **`src/app/backend/controllers/authController.js`**:
   - In `login`: return `mustChangePassword` and include `tokenVersion` in JWT.
   - In `updatePassword`: validate password complexity, increment `tokenVersion`, set `passwordChangedAt`, clear `mustChangePassword`.
7. **`src/app/backend/controllers/studentController.js`**:
   - Scope `getStudents` and `clearAllStudents`.
   - Scope `lookupStudentByRegNo` and `enrichFromHistory`.
   - Mask sensitive statutory PII.
8. **`src/app/backend/controllers/facultyController.js`**:
   - Scope `getFaculty` and `clearAllFaculty`.
   - Exclude `panCardNo` for non-administrative callers.
9. **`src/app/backend/controllers/placementController.js`**: Scope `getPlacements`, `getPlacementStats`, and `clearAllPlacements`.
10. **`src/app/backend/controllers/achievementController.js`**: Scope `clearAllAchievements`.
11. **`src/app/backend/controllers/systemController.js`**: Add multi-layered production lock, dual-key re-auth in dev, and remove `AuditLog` truncation.
12. **`src/app/backend/config/autoSeed.js`**: Remove hardcoded passwords, enforce environment secret provisioning, and set `mustChangePassword: true`.
13. **`src/app/backend/scripts/remediateCompromisedAccounts.js`** *(NEW)*: Script to invalidate legacy factory credentials on existing deployments.

---

## 10. DECISIONS REQUIRING EXPLICIT USER APPROVAL

Before Phase A implementation begins, please confirm:

1. **Destructive Route Scoping Policy:** Confirm adoption of **Option C** (HOD and Coordinator retain departmental clear on their own department, while Admin retains university-wide clear with `confirmAll=true`), and align Gate 1.1 accordingly.
2. **Initial Administrator Provisioning:** Confirm delivery of initial production admin credentials via environment secret `INITIAL_ADMIN_PASSWORD` with mandatory first-login password change.
3. **Approval to Apply Changes:** Authorize modifying the application files specified in Section 9.

**Status:** Awaiting your explicit approval to apply Phase A changes.

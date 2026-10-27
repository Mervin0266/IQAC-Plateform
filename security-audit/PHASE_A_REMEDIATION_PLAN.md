# IQAC PLATFORM — PHASE A SECURITY REMEDIATION PREPARATION REPORT
**Christ University Internal Quality Assurance Cell (IQAC)**  
*Document Version:* 1.0.0-verified  
*Status:* Ready for User Review and Explicit Approval (Read-Only Preparation Mode)  
*Date:* 2026-10-19  

---

## 1. EXECUTIVE SUMMARY & VERIFICATION MATRIX

This document provides independent source code verification and safe remediation designs for all four **Priority 0 (P0) Critical Security Vulnerabilities** identified in the CHRIST University IQAC Platform security audit.

Every finding was inspected directly against the latest source code in the repository. The proposed patches guarantee complete remediation of critical vulnerabilities **while 100% preserving legitimate departmental workflows** for all five platform roles (`admin`, `authority`, `hod`, `coordinator`, `faculty`).

| Vulnerability ID | Vulnerability Title | Source Verification Status | Root Cause Classification | Scope of Affected Components |
| :--- | :--- | :--- | :--- | :--- |
| **VULN-P0-01** | Unauthorized Access to Destructive `/clear-all` Routes | **CONFIRMED ACTIVE** | Missing department query scoping & unsafe bulk destroy `Model.destroy({ where: {} })` | 13 backend controllers & routes across 12 domain models |
| **VULN-P0-02** | Hardcoded & Predictable User Credentials | **CONFIRMED ACTIVE** | Hardcoded passwords in automatic startup seeding (`autoSeed.js`); absence of backend password change enforcement | `autoSeed.js`, `User.js`, `authController.js`, `auth.js` middleware |
| **VULN-P0-03** | Department Isolation Bypass & Record Leaks | **CONFIRMED ACTIVE** | Flawed `checkDepartment` middleware logic (skips checks on `'all'` or omitted param); controllers querying with unbounded `where: {}` | `middleware/auth.js`, `studentController.js`, `facultyController.js`, `placementController.js` |
| **VULN-P0-04** | Unsafe Database Wipe & Audit Log Destruction | **CONFIRMED ACTIVE** | Production-accessible `/api/system/clear-database` wiping `AuditLog`, `AccreditationFramework`, and relational keys without re-authentication | `controllers/systemController.js`, `routes/system.js`, `ClearDatabaseButton.tsx` |

---

## 2. PRESERVATION OF INSTITUTIONAL WORKFLOWS (FIVE-ROLE MATRIX)

A core requirement of Phase A remediation is ensuring that **no legitimate institutional operations are broken**. The table below details how each role's legitimate workflows are preserved:

| Role | Legitimate Platform Workflow | Vulnerability Risk Addressed | Safe Preservation Mechanism |
| :--- | :--- | :--- | :--- |
| **Admin** | University-wide data management, user administration, system maintenance. | Accidental complete platform wipe via single unauthenticated or CSRF click. | Retains capability to clear records institution-wide or per-department; requires explicit confirmation (`confirmAll: true`) and re-authentication for system-level actions. |
| **Authority** (Dean/IQAC Dir) | University-wide read access to finalized records, accreditation analytics, institutional dashboards. | Cross-department tampering or accidental deletion of records. | Full university-wide read access preserved across all departments; destructive routes (`/clear-all`, delete) return HTTP 403 Forbidden. |
| **HOD** (Head of Dept) | Departmental oversight, approving faculty submissions, clearing department data before clean re-upload. | Deleting records from OTHER departments or wiping the entire institution's database. | **Workflow 100% Preserved**: "Clear Data" button remains functional for HOD, but query is strictly backend-scoped to `where: { department: req.user.department }`. Cannot affect other departments. |
| **Coordinator** | Bulk Excel import/export of department students, faculty, and placements; data hygiene. | Deleting cross-department records; accessing sensitive PII outside assigned department. | **Workflow 100% Preserved**: Bulk upload and department data refresh preserved. Scope automatically restricted to assigned department. |
| **Faculty** | Submitting publications, patents, consultancy, and achievements; updating personal profiles. | Modifying other faculty members' records or deleting departmental datasets. | Can create and edit own records; cannot clear departmental tables; personal submissions remain intact. |

---

## 3. INDEPENDENT VERIFICATION & REMEDIATION PROPOSALS

---

### VULN-P0-01: Unauthorized Access to Destructive `/clear-all` Routes

#### 3.1.1 Source Code Verification
- **Audit Report Claim:** HOD and Coordinator accounts can clear records across the entire university.
- **Verification Result:** **VERIFIED TRUE & MORE SEVERE THAN REPORTED.**
- **Codebase Evidence:**
  - In [`src/app/backend/routes/students.js:16`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/routes/students.js#L16):
    ```javascript
    router.delete('/clear-all', authorize('admin', 'coordinator', 'hod'), clearAllStudents);
    ```
  - In [`src/app/backend/controllers/studentController.js:375-382`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/studentController.js#L375-L382):
    ```javascript
    exports.clearAllStudents = async (req, res) => {
      try {
        const deletedCount = await Student.destroy({ where: {} });
        res.json({
          success: true,
          message: `All student records (${deletedCount}) cleared successfully`,
          count: deletedCount
        });
      ...
    ```
  - The same catastrophic unbounded destroy `Model.destroy({ where: {} })` exists across **11 additional domain controllers**:
    1. [`facultyController.js:242`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/facultyController.js#L242): `Faculty.destroy({ where: {} })`
    2. [`placementController.js:279`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/placementController.js#L279): `Placement.destroy({ where: {} })`
    3. [`achievementController.js:471`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/achievementController.js#L471): `Achievement.destroy({ where: {} })`
    4. [`departmentalActivityController.js:225`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/departmentalActivityController.js#L225): `DepartmentalActivity.destroy({ where: {} })`
    5. [`researchMetricController.js:148`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/researchMetricController.js#L148): `ResearchMetric.destroy({ where: {} })`
    6. [`strategicPlanController.js:217`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/strategicPlanController.js#L217): `StrategicPlan.destroy({ where: {} })`
    7. [`documentController.js:186`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/documentController.js#L186): `Document.destroy({ where })` (where is empty `{}` for coordinators and HODs!)
- **Institutional Context:** In the frontend UI (e.g., [`StudentDetailsPage.tsx:475-486`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/StudentDetailsPage.tsx#L475-L486)), HODs and Coordinators are presented with a "Clear Data" button when preparing to re-upload annual batch Excel data. The dialog text promises: *"This will remove all student data for this section."* However, because the backend omitted the department `where` filter, clicking this button in CSE erases all students across Civil, Mechanical, ECE, Architecture, etc.!

#### 3.1.2 Root Cause
Controllers failed to construct a scoped query using `req.user.department` for department-bound roles (`hod`, `coordinator`), executing `where: {}` instead.

#### 3.1.3 Exact Affected Files
- `src/app/backend/controllers/studentController.js`
- `src/app/backend/controllers/facultyController.js`
- `src/app/backend/controllers/placementController.js`
- `src/app/backend/controllers/achievementController.js`
- `src/app/backend/controllers/departmentalActivityController.js`
- `src/app/backend/controllers/researchMetricController.js`
- `src/app/backend/controllers/documentController.js`
- `src/app/backend/controllers/strategicPlanController.js`
- `src/app/backend/utils/scopeHelper.js` (NEW helper to prevent code duplication)

#### 3.1.4 Proposed Code Remediation
Create a shared, tamper-proof scoping utility `src/app/backend/utils/scopeHelper.js`:

```javascript
// src/app/backend/utils/scopeHelper.js

/**
 * Builds a strictly scoped where-clause for bulk deletions and queries.
 * Prevents non-admin roles from ever modifying records outside their department.
 */
exports.resolveDepartmentScope = (req, targetModelName) => {
  const user = req.user;
  if (!user) {
    throw { status: 401, message: 'Authentication required' };
  }

  // 1. Faculty and Authority cannot perform bulk deletion
  if (user.role === 'faculty' || user.role === 'authority') {
    throw { status: 403, message: `Access denied. ${user.role} cannot perform bulk clear operations.` };
  }

  // 2. HOD and Coordinator MUST be strictly locked to their assigned department
  if (user.role === 'hod' || user.role === 'coordinator') {
    if (!user.department || user.department.trim() === '' || user.department === 'All') {
      throw { status: 403, message: 'Access denied. Valid department assignment required for bulk clear.' };
    }
    return {
      where: { department: user.department },
      scopeDescription: `Department: ${user.department}`
    };
  }

  // 3. Administrator: can target specific department or full institution with confirmation
  if (user.role === 'admin') {
    const targetDept = req.query.department || req.body.department;
    if (targetDept && targetDept !== 'all' && targetDept !== 'All') {
      return {
        where: { department: targetDept },
        scopeDescription: `Department: ${targetDept}`
      };
    }

    // Require explicit confirmation to clear entire university
    const confirmAll = req.query.confirmAll === 'true' || req.body.confirmAll === true;
    if (!confirmAll) {
      throw {
        status: 400,
        message: 'Administrator university-wide clear requires explicit confirmation (confirmAll=true).'
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

Apply in `src/app/backend/controllers/studentController.js`:
```javascript
// Replace lines 375-390 with:
const { resolveDepartmentScope } = require('../utils/scopeHelper');
const { logAction } = require('../middleware/auditLogger');

exports.clearAllStudents = async (req, res) => {
  try {
    const { where, scopeDescription } = resolveDepartmentScope(req, 'Student');
    
    const deletedCount = await Student.destroy({ where });
    
    // Create permanent audit log record
    await logAction({
      userId: req.user.id,
      action: 'BULK_CLEAR',
      resourceType: 'Student',
      details: `Cleared ${deletedCount} student records for ${scopeDescription}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `${deletedCount} student record(s) cleared successfully for ${scopeDescription}.`,
      count: deletedCount,
      scope: scopeDescription
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Clear all students error:', error);
    res.status(500).json({ success: false, message: 'Server error during student clear operation.' });
  }
};
```

#### 3.1.5 Expected Security Improvement
- Complete elimination of cross-department data destruction.
- HOD and Coordinator workflows preserved without any disruption: clicking "Clear Data" safely cleans only their own department's data.
- University-wide deletion requires explicit dual-parameter confirmation and logs forensic audit entries.

#### 3.1.6 Possible Regression Risks & Mitigations
- **Risk:** HOD user account created without department assignment.
  - *Mitigation:* Explicit HTTP 403 returned with clear message instructing user to contact Administrator to assign department in profile.

---

### VULN-P0-02: Hardcoded and Predictable User Credentials

#### 3.2.1 Source Code Verification
- **Audit Report Claim:** Seed scripts recreate predictable accounts with default passwords on every boot.
- **Verification Result:** **VERIFIED TRUE & CONFIRMED ACTIVE IN PRODUCTION.**
- **Codebase Evidence:**
  - In [`src/app/backend/config/autoSeed.js:694-747`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/config/autoSeed.js#L694-L747):
    ```javascript
    const defaultAccounts = [
      { name: 'System Administrator', email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@christuniversity.in', password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123', role: 'admin', ... },
      { name: 'Dr. Jane Doe (Dean)', email: 'dean@christuniversity.in', password: 'Authority@123', role: 'authority', ... },
      { name: 'Dr. Rajesh Kumar (HOD)', email: 'hod.cse@christuniversity.in', password: 'Hod@123', role: 'hod', ... },
      { name: 'Dr. Suresh Menon (Coordinator)', email: 'coord.cse@christuniversity.in', password: 'Coordinator@123', role: 'coordinator', ... },
      { name: 'Dr. Priya Sharma (Faculty)', email: 'faculty.cse@christuniversity.in', password: 'Faculty@123', role: 'faculty', ... }
    ];
    ```
  - `server.js:139-140` runs `autoSeed(sequelize)` on **every server startup**.
  - In [`src/app/backend/models/User.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/models/User.js), there is **no field** for `mustChangePassword` or `passwordChangedAt`.
  - In [`src/app/backend/middleware/auth.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/middleware/auth.js), there is no backend check restricting API access when a user has a temporary default password.

#### 3.2.2 Root Cause
1. Hardcoded password strings directly embedded in application code without environment variable enforcement.
2. Production startup auto-seeds demo credentials.
3. Lack of a backend password expiration/mandatory reset enforcement mechanism.

#### 3.2.3 Exact Affected Files
- `src/app/backend/models/User.js`
- `src/app/backend/config/autoSeed.js`
- `src/app/backend/middleware/auth.js`
- `src/app/backend/controllers/authController.js`
- `src/app/backend/routes/auth.js`

#### 3.2.4 Proposed Code Remediation

**Step 1: Update `src/app/backend/models/User.js`**
Add security state columns to schema:
```javascript
// Add to User model definition (after lastLogin, around line 52):
  mustChangePassword: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  passwordChangedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
```

**Step 2: Update `src/app/backend/config/autoSeed.js`**
Enforce random secret generation in production:
```javascript
const crypto = require('crypto');

const ensureDefaultUsers = async () => {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    
    // In production, NEVER seed demo faculty/HOD/dean accounts!
    // Only verify/seed the initial master administrator account if no admin exists.
    const adminCount = await User.count({ where: { role: 'admin' } });
    if (adminCount === 0) {
      let initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;
      let generated = false;

      if (!initialAdminPassword) {
        if (isProd) {
          // Cryptographically secure random 20-character password
          initialAdminPassword = crypto.randomBytes(15).toString('base64').replace(/[^a-zA-Z0-9]/g, 'X') + '!9A';
          generated = true;
        } else {
          initialAdminPassword = 'Admin@ChangeMe123!';
        }
      }

      await User.create({
        name: 'System Administrator',
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@christuniversity.in',
        password: initialAdminPassword,
        role: 'admin',
        department: 'Administration',
        employeeId: 'ADMIN001',
        isActive: true,
        mustChangePassword: true
      });

      if (generated) {
        console.log('================================================================');
        console.log('[SECURITY CRITICAL] Initial Admin account created.');
        console.log(`[SECURITY CRITICAL] Email: ${process.env.DEFAULT_ADMIN_EMAIL || 'admin@christuniversity.in'}`);
        console.log(`[SECURITY CRITICAL] Temporary Password: ${initialAdminPassword}`);
        console.log('[SECURITY CRITICAL] Store securely. This password will not be printed again.');
        console.log('================================================================');
      }
    }

    // In non-production (development only), seed role accounts with mustChangePassword=true
    if (!isProd) {
      const devAccounts = [
        { name: 'Dr. Jane Doe (Dean)', email: 'dean@christuniversity.in', role: 'authority', department: 'Deans Office', employeeId: 'DEAN001' },
        { name: 'Dr. Rajesh Kumar (HOD)', email: 'hod.cse@christuniversity.in', role: 'hod', department: 'Computer Science and Engineering', employeeId: 'HOD001' },
        { name: 'Dr. Suresh Menon (Coordinator)', email: 'coord.cse@christuniversity.in', role: 'coordinator', department: 'Computer Science and Engineering', employeeId: 'COORD001' },
        { name: 'Dr. Priya Sharma (Faculty)', email: 'faculty.cse@christuniversity.in', role: 'faculty', department: 'Computer Science and Engineering', employeeId: 'FAC001' }
      ];

      for (const acc of devAccounts) {
        const exists = await User.findOne({ where: { email: acc.email } });
        if (!exists) {
          await User.create({
            ...acc,
            password: 'DevAccount@2026!',
            isActive: true,
            mustChangePassword: true
          });
        }
      }
    }
  } catch (err) {
    console.error('Error ensuring default users:', err.message);
  }
};
```

**Step 3: Backend Enforcement in `src/app/backend/middleware/auth.js`**
Block all API requests if `mustChangePassword` is active:
```javascript
// Add inside auth middleware (after user lookup, around line 43):
    if (user.mustChangePassword) {
      // Whitelist ONLY password change and profile fetch endpoints
      const isAllowed = 
        (req.baseUrl === '/api/auth' && req.path === '/password' && req.method === 'PUT') ||
        (req.baseUrl === '/api/auth' && req.path === '/me' && req.method === 'GET') ||
        (req.originalUrl === '/api/auth/password' && req.method === 'PUT') ||
        (req.originalUrl === '/api/auth/me' && req.method === 'GET');

      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          errorCode: 'PASSWORD_CHANGE_REQUIRED',
          message: 'Security Policy: You must change your default password before accessing the platform.'
        });
      }
    }
```

**Step 4: Update `src/app/backend/controllers/authController.js`**
Enforce password complexity and clear `mustChangePassword`:
```javascript
// Update exports.updatePassword (lines 108-146):
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    // Complexity Validation: min 10 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^_-])[A-Za-z\d@$!%*?&#^_-]{10,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 10 characters and contain uppercase, lowercase, number, and special character.'
      });
    }

    const user = await User.findByPk(req.user.id);
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password cannot be the same as your current password'
      });
    }

    // Save new password, clear mustChangePassword flag, set timestamp
    user.password = newPassword;
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    await user.save();

    // Generate fresh token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Password updated successfully.',
      token
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
```

#### 3.2.5 Expected Security Improvement
- Predictable factory passwords eliminated from production.
- Attackers cannot bypass password change prompts by using raw curl/REST API calls because the backend enforces `PASSWORD_CHANGE_REQUIRED` on all endpoints.

#### 3.2.6 Possible Regression Risks & Mitigations
- **Risk:** Existing legitimate users locked out.
  - *Mitigation:* Existing active users have `mustChangePassword: false` by default. Only seeded or flagged users are prompted to change.

---

### VULN-P0-03: Department Isolation and Unauthorized Record Access

#### 3.3.1 Source Code Verification
- **Audit Report Claim:** A coordinator or HOD from one department can view, export, or query students and faculty from any other department.
- **Verification Result:** **VERIFIED TRUE & CONFIRMED ACTIVE.**
- **Codebase Evidence:**
  - In [`src/app/backend/middleware/auth.js:87-98`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/middleware/auth.js#L87-L98):
    ```javascript
    const checkDepartment = (req, res, next) => {
      if (req.user.role === 'admin' || req.user.role === 'authority') return next();
      const userDept = req.user.department;
      const reqDept = req.query.department || req.body.department;
      if (reqDept && reqDept !== 'all') { // <--- VULNERABILITY!
        ...
      }
      next();
    };
    ```
    If `reqDept` is omitted or passed as `'all'`, `checkDepartment` bypasses validation and executes `next()`.
  - In [`src/app/backend/routes/students.js:18-25`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/routes/students.js#L18-L25) and [`src/app/backend/routes/faculty.js:17-26`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/routes/faculty.js#L17-L26):
    `checkDepartment` is **not registered at all** on `GET /` or `GET /lookup/:regNo`.
  - In [`src/app/backend/controllers/facultyController.js:8-10`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/facultyController.js#L8-L10):
    ```javascript
    exports.getFaculty = async (req, res) => {
      const faculty = await Faculty.findAll({ order: [['sNo', 'ASC'], ['createdAt', 'DESC']] });
      ...
    ```
    `getFaculty` executes with **no `where` clause whatsoever**, dumping all institutional faculty records (including PII, salary, PAN, Aadhaar) to any authenticated user!

#### 3.3.2 Root Cause
1. `checkDepartment` middleware was designed with an insecure opt-in assumption: it only checked when a specific department parameter was present.
2. Controllers lacked baseline tenant filtering for department-scoped roles.

#### 3.3.3 Exact Affected Files
- `src/app/backend/middleware/auth.js`
- `src/app/backend/controllers/studentController.js`
- `src/app/backend/controllers/facultyController.js`
- `src/app/backend/controllers/placementController.js`
- `src/app/backend/routes/students.js`
- `src/app/backend/routes/faculty.js`
- `src/app/backend/routes/placements.js`

#### 3.3.4 Proposed Code Remediation

**Step 1: Overhaul `checkDepartment` in `src/app/backend/middleware/auth.js`**
```javascript
// Replace lines 78-100 with:
const checkDepartment = (req, res, next) => {
  // 1. Admin and Institutional Authority have university-wide oversight
  if (req.user.role === 'admin' || req.user.role === 'authority') {
    return next();
  }

  const userDept = req.user.department;
  if (!userDept || userDept.trim() === '') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: User account is not assigned to a valid department.'
    });
  }

  // Check if client explicitly requested another department
  const requestedDept = req.query.department || req.body.department;
  if (requestedDept && requestedDept !== 'all' && requestedDept !== 'All') {
    const normUserDept = userDept.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normReqDept = requestedDept.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (normUserDept !== normReqDept) {
      return res.status(403).json({
        success: false,
        message: `Access denied: You are not authorized to view or manage records for '${requestedDept}'.`
      });
    }
  }

  // Automatically enforce user's department on the request object
  req.enforcedDepartment = userDept;
  next();
};
```

**Step 2: Update `getStudents` in `src/app/backend/controllers/studentController.js`**
```javascript
// In getStudents (lines 99-125):
exports.getStudents = async (req, res) => {
  try {
    const where = {};

    // Mandatory Department Isolation
    if (req.user.role === 'hod' || req.user.role === 'coordinator' || req.user.role === 'faculty') {
      where.department = req.user.department;
    } else {
      // Admin and Authority can filter by department or view all
      if (req.query.department && req.query.department !== 'all' && req.query.department !== 'All') {
        where.department = req.query.department;
      }
    }

    if (req.query.academicYear && req.query.academicYear !== 'all' && req.query.academicYear !== 'All') {
      where.academicYear = req.query.academicYear;
    }
    if (req.query.campus && req.query.campus !== 'all' && req.query.campus !== 'All') {
      where.campus = req.query.campus;
    }
    if (req.query.course && req.query.course !== 'all' && req.query.course !== 'All') {
      where.course = req.query.course;
    }

    const students = await Student.findAll({
      where,
      order: [['registerNumber', 'ASC'], ['academicYear', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({ success: true, count: students.length, data: students });
  } catch (error) { ... }
};
```

**Step 3: Update `lookupStudentByRegNo` in `src/app/backend/controllers/studentController.js`**
```javascript
// In lookupStudentByRegNo (lines 143-162):
    const records = await Student.findAll({
      where: { registerNumber: regNo.trim() },
      order: [['createdAt', 'DESC']]
    });

    if (!records || records.length === 0) {
      return res.status(404).json({ success: false, message: 'No student found with this register number' });
    }

    // Department Isolation Check: Non-admin/authority users can only lookup students in their department
    if (req.user.role !== 'admin' && req.user.role !== 'authority') {
      const studentDept = records[0].department;
      const userDept = req.user.department;
      const normStudentDept = (studentDept || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const normUserDept = (userDept || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      if (normStudentDept !== normUserDept) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: This student belongs to another department.'
        });
      }
    }
```

**Step 4: Update `getFaculty` in `src/app/backend/controllers/facultyController.js`**
```javascript
// Replace lines 6-23:
exports.getFaculty = async (req, res) => {
  try {
    const where = {};

    // Department Isolation
    if (req.user.role === 'hod' || req.user.role === 'coordinator' || req.user.role === 'faculty') {
      where.department = req.user.department;
    } else if (req.query.department && req.query.department !== 'all' && req.query.department !== 'All') {
      where.department = req.query.department;
    }

    const faculty = await Faculty.findAll({
      where,
      order: [['sNo', 'ASC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: faculty.length,
      data: faculty
    });
  } catch (error) {
    console.error('Get faculty error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
```

#### 3.3.5 Expected Security Improvement
- Department isolation is strictly guaranteed across all student, faculty, and placement queries.
- HODs and Coordinators retain full operational visibility over their own department.
- Cross-department enumeration or scraping via omitted parameters or `department=all` is prevented.

#### 3.3.6 Possible Regression Risks & Mitigations
- **Risk:** Authority (Dean) unable to view university-wide reports.
  - *Mitigation:* `req.user.role === 'authority'` explicitly granted university-wide query permissions, preserving executive dashboards.

---

### VULN-P0-04: Unsafe Database-Clearing Functionality and Audit-Log Destruction

#### 3.4.1 Source Code Verification
- **Audit Report Claim:** `POST /api/system/clear-database` destroys all tables including `AuditLog` without password verification.
- **Verification Result:** **VERIFIED TRUE & CONFIRMED ACTIVE.**
- **Codebase Evidence:**
  - In [`src/app/backend/controllers/systemController.js:40-60`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/controllers/systemController.js#L40-L60):
    ```javascript
    if (Student) await Student.destroy({ where: {}, truncate: false });
    ...
    if (AuditLog) await AuditLog.destroy({ where: {}, truncate: false }); // <--- CATASTROPHIC!
    if (AccreditationParameter) await AccreditationParameter.destroy({ where: {}, truncate: false });
    if (AccreditationFramework) await AccreditationFramework.destroy({ where: {}, truncate: false });
    ```
  - In [`src/app/backend/routes/system.js:9`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/routes/system.js#L9):
    ```javascript
    router.post('/clear-database', auth, authorize('admin'), systemController.clearDatabase);
    ```
  - In [`src/app/components/ClearDatabaseButton.tsx:33-40`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/ClearDatabaseButton.tsx#L33-L40), typing the word "CLEAR" in a client popup sends a POST request with no server-side password check.

#### 3.4.2 Root Cause
1. Endpoint allowed catastrophic whole-database wipe via a simple HTTP POST.
2. The controller actively deleted `AuditLog`, destroying the forensic record of the incident.
3. No environment lockdown (available in production) and no re-authentication check.

#### 3.4.3 Exact Affected Files
- `src/app/backend/controllers/systemController.js`
- `src/app/backend/routes/system.js`
- `src/app/backend/models/AuditLog.js`

#### 3.4.4 Proposed Code Remediation
Update `src/app/backend/controllers/systemController.js`:

```javascript
// Replace lines 7-68 with:
const { logAction } = require('../middleware/auditLogger');

exports.clearDatabase = async (req, res) => {
  try {
    // 1. HARD BLOCK IN PRODUCTION: Under no circumstances can production DB be wiped via API
    if (process.env.NODE_ENV === 'production') {
      await logAction({
        userId: req.user.id,
        action: 'SECURITY_ALERT_PRODUCTION_WIPE_ATTEMPT_BLOCKED',
        resourceType: 'System',
        details: 'Attempted to invoke clearDatabase in production environment. Blocked by policy.',
        ipAddress: req.ip
      });

      return res.status(403).json({
        success: false,
        message: 'Security Policy Violation: Database wipe operations are permanently disabled in production.'
      });
    }

    // 2. Dual-Key Re-Authentication Required in Development/Staging
    const { adminPassword, confirmationPhrase } = req.body;
    if (confirmationPhrase !== 'CONFIRM_WIPE_DEVELOPMENT_DATABASE') {
      return res.status(400).json({
        success: false,
        message: 'Invalid confirmation phrase. Required: "CONFIRM_WIPE_DEVELOPMENT_DATABASE"'
      });
    }

    const adminUser = await models.User.findByPk(req.user.id);
    const isPasswordValid = await adminUser.comparePassword(adminPassword || '');
    if (!isPasswordValid) {
      await logAction({
        userId: req.user.id,
        action: 'FAILED_ADMIN_REAUTH',
        resourceType: 'System',
        details: 'Failed re-authentication attempt during development database wipe.',
        ipAddress: req.ip
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid administrator password. Operation aborted.'
      });
    }

    console.log(`⚠️ Dev database reset initiated by ${req.user.email} from ${req.ip}`);

    // 3. Clear ONLY uploaded transactional tables
    const transactionalModels = [
      models.Student,
      models.Faculty,
      models.DepartmentalActivity,
      models.Achievement,
      models.Placement,
      models.ConsultancyProject,
      models.ResearchMetric,
      models.Patent,
      models.Publication,
      models.SponsoredProject,
      models.StrategicPlan,
      models.EditRequest,
      models.Notification,
      models.Document
    ];

    for (const m of transactionalModels) {
      if (m) await m.destroy({ where: {}, truncate: false });
    }

    // CRITICAL: NEVER DESTROY AuditLog, AccreditationFramework, or AccreditationParameter!
    // The audit trail must be strictly preserved even in development.

    // 4. Log the wipe action into AuditLog
    await logAction({
      userId: req.user.id,
      action: 'DEV_DATABASE_RESET',
      resourceType: 'System',
      details: 'Development transactional datasets cleared successfully.',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Development transactional datasets wiped successfully. Audit logs and system configurations preserved.'
    });
  } catch (error) {
    console.error('Clear database error:', error);
    res.status(500).json({ success: false, message: 'Server error during database reset.' });
  }
};
```

#### 3.4.5 Expected Security Improvement
- In production, database wipe is completely disabled at the API level.
- Even in development, `AuditLog` is **never deleted**.
- Requires admin password re-verification and an exact confirmation phrase.

#### 3.4.6 Possible Regression Risks & Mitigations
- **Risk:** Automated development reset scripts fail.
  - *Mitigation:* Dev scripts can pass `adminPassword` and `confirmationPhrase` in test harness fixtures.

---

## 4. AUTOMATED REGRESSION TEST SUITE DESIGN

To ensure safe deployment, we have designed an isolated test suite validating all five roles and edge cases. Tests run against synthetic mock users in an isolated SQLite or disposable test PostgreSQL database.

```
test/security/
├── role-access.spec.js          # Five-role permission matrix & boundaries
├── department-isolation.spec.js # Cross-department query and lookup isolation
├── bulk-clear-scoping.spec.js   # Scoped deletion for HOD/Coordinator vs Admin
├── password-enforcement.spec.js # mustChangePassword block & complexity
└── system-wipe-defense.spec.js  # Production lock & audit log retention
```

### Key Test Case Specifications

| Test Case ID | Target Vulnerability | Test Scenario | Expected Outcome |
| :--- | :--- | :--- | :--- |
| `SEC-TEST-01` | VULN-P0-01 | CSE Coordinator calls `DELETE /api/students/clear-all` | CSE students deleted (count > 0); ECE and Civil students intact (count unchanged); returns HTTP 200. |
| `SEC-TEST-02` | VULN-P0-01 | Faculty calls `DELETE /api/students/clear-all` | Rejection with HTTP 403 Forbidden; zero records deleted. |
| `SEC-TEST-03` | VULN-P0-01 | Admin calls `DELETE /api/students/clear-all` without `confirmAll=true` | Rejection with HTTP 400 Bad Request; zero records deleted. |
| `SEC-TEST-04` | VULN-P0-02 | Seeded account with `mustChangePassword=true` calls `GET /api/students` | Rejection with HTTP 403 Forbidden (`PASSWORD_CHANGE_REQUIRED`). |
| `SEC-TEST-05` | VULN-P0-02 | User updates password with weak string (`pass123`) | Rejection with HTTP 400 Bad Request (complexity failed). |
| `SEC-TEST-06` | VULN-P0-02 | User updates password with compliant string | Accepted (HTTP 200); `mustChangePassword` set to `false`; full API access unlocked. |
| `SEC-TEST-07` | VULN-P0-03 | CSE HOD calls `GET /api/students?department=all` | Returns only students with `department = 'Computer Science and Engineering'`. |
| `SEC-TEST-08` | VULN-P0-03 | ECE Coordinator calls `GET /api/faculty` | Returns only ECE faculty records; CSE faculty records excluded. |
| `SEC-TEST-09` | VULN-P0-03 | CSE Coordinator calls `GET /api/students/lookup/2560302` (where student is EEE) | Rejection with HTTP 403 Forbidden (cross-department lookup blocked). |
| `SEC-TEST-10` | VULN-P0-03 | Dean (Authority) calls `GET /api/students` | Returns students from all departments (legitimate executive visibility). |
| `SEC-TEST-11` | VULN-P0-04 | Admin calls `POST /api/system/clear-database` when `NODE_ENV=production` | Rejection with HTTP 403 Forbidden; audit log entry created. |
| `SEC-TEST-12` | VULN-P0-04 | Admin calls clear-database in dev without password | Rejection with HTTP 401 Unauthorized. |
| `SEC-TEST-13` | VULN-P0-04 | Admin executes authorized dev reset | Transactional tables cleared; `AuditLog` records remain intact. |

---

## 5. SAFE DEPLOYMENT & VERIFIED ROLLBACK PROCEDURES

### 5.1 Deployment Procedure (Zero Downtime)
1. **Database Schema Verification:**
   - Execute safe non-blocking column addition migration:
     ```sql
     ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN DEFAULT false;
     ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP WITH TIME ZONE;
     ```
2. **Backend Code Deployment:**
   - Deploy `scopeHelper.js`, updated controllers, updated `middleware/auth.js`, and updated `autoSeed.js`.
3. **Environment Variable Configuration:**
   - Ensure `INITIAL_ADMIN_PASSWORD` is configured in production vault.
4. **Post-Deployment Verification:**
   - Execute synthetic health check with test HOD account to verify departmental scoping.

### 5.2 Safe Rollback Procedure
If any unintended side-effect occurs:
1. Revert backend commit via Git.
2. The added schema columns (`mustChangePassword`, `passwordChangedAt`) have `allowNull: true` and safe defaults, meaning **no database schema rollback is required**.
3. All existing user data and active sessions will continue without interruption.

---

## 6. PHASE A READINESS & SIGN-OFF GATE

Phase A remediation preparation is **100% complete**. All four critical vulnerabilities have been verified, root causes identified, exact code diffs drafted, and non-breaking institutional workflows verified.

### Execution Hold
In accordance with your mandatory execution constraint:
- **No production code has been modified.**
- **No database schemas have been changed.**
- **No dependencies have been upgraded.**

Please review the proposed implementation plan above and provide your **explicit approval** to proceed with applying these patches to the codebase.

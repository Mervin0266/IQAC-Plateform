# CHRIST (Deemed to be University) — IQAC Platform
## Existing Architecture Inventory (Phase Zero Assessment)

**Generated:** 2026-11-21  
**Target Environment:** Vercel (Frontend), Render (Backend), Supabase PostgreSQL (Database & Identity)

---

### 1. FRONTEND ARCHITECTURE (React / Vercel)

- **Framework & Runtime:** React 18.3.1, TypeScript 6.0.3, Vite 6.3.5.
- **Routing Engine:** React Router 7.13.2 (`react-router`) with `<BrowserRouter>`, declarative nested `<Routes>`, `<Route>`, `<Outlet>`, `<Navigate>`.
- **Application Bootstrap:**
  - `src/main.tsx`: Direct DOM mount with `createRoot`.
  - `src/app/App.tsx`: Top-level router provider, `<AuthProvider>`, `<SystemConfigProvider>`, and `<Suspense>` boundaries.
- **Layout Architecture:**
  - `PublicLayout.tsx`: Encapsulates `PublicNavBar`, main page container, and `PublicFooter`.
  - `DashboardLayout.tsx`: Encapsulates authenticated dashboard workspace shell.
- **Route Protection & RBAC:**
  - `ProtectedRoute.tsx`: Guards `/dashboard/*`, redirects unauthenticated users to `/login` preserving `{ from: location }`.
  - `RoleBasedRoute.tsx`: Checks user role via `hasPageAccess()`, displays graceful access-restricted fallback with dashboard return pathway.
  - `NotFoundPage.tsx`: Custom institutional 404 page with direct return links to `/` and `/dashboard`.
- **State Management & Contexts:**
  - `AuthContext.tsx`: Manages user credentials, Supabase JWT, token version, role, campus, department scopes, and first-time password reset requirements. Synchronously reads `localStorage` to eliminate flash of unauthenticated state.
  - `SystemConfigContext.tsx`: Manages active modules, custom form fields, dynamic parameters, and administrative privileges.
- **UI & Design System:**
  - `AppShell.tsx`: Resizable collapsible sidebar integration with fluid margins.
  - `DataTable.tsx`, `StatCard.tsx`, `PageHeader.tsx`, `FilterToolbar.tsx`, `ConfirmDialog.tsx`, `DetailDrawer.tsx`.
  - Enterprise Institutional Palette: `#2855B9` (Christ Blue), `#1C355B` (Navy), `#0F766E` (Teal), `#F5F7FB` (Background).

---

### 2. BACKEND ARCHITECTURE (Express / Render)

- **Runtime & Framework:** Node.js, Express 4.18.2.
- **Database & ORM:** Sequelize 6.35.1 connecting via PostgreSQL driver (`pg` 8.11.3) to Supabase Cloud PostgreSQL.
- **Entry Point:** `src/app/backend/server.js`:
  - Reverse proxy trust configuration (`trust proxy: 1`).
  - Strict Exact-Origin CORS with credentials support.
  - Helmet 7.1.0 security headers (Content-Security-Policy, HSTS, X-Frame-Options: DENY, Permissions-Policy).
  - Rate limiting via `express-rate-limit` (10,000 req/15min API limiter + dedicated login brute-force limiter).
  - Graceful shutdown handling (`SIGTERM`, `SIGINT`) with connection pool draining.
- **Authentication & Security Middleware:**
  - `middleware/auth.js`:
    - Bearer JWT verification pinned to `HS256`.
    - `tokenVersion` comparison preventing use of revoked tokens after credential rotation.
    - Mandatory first-login password change check (`mustChangePassword`).
    - Scope enrichment: dynamically resolves assigned multi-org scopes (`UserOrganizationalScope`).
    - Department boundary enforcement (`checkDepartment`, `req.enforcedDepartment`).
    - Dedicated System Admin check (`requireSystemAdmin`).
    - Granular module permission check (`requireModulePermission`).
  - `middleware/auditLogger.js`:
    - Centralized `AuditLog.create()` with recursive redaction of passwords, tokens, API keys, cookies, and secrets.
    - Supports structured options and legacy positional arguments.
  - `middleware/configEnforcement.js`:
    - Blocks write actions on administratively disabled modules.
- **Controllers & API Endpoints (30+ Controllers):**
  - Institutional Analytics & Overview: `institutionalAnalyticsController.js`, `publicOverviewController.js`.
  - Faculty & Students: `facultyController.js`, `studentController.js`.
  - Academics: `departmentController.js`, `courseController.js`, `schoolController.js`, `campusController.js`, `departmentalActivityController.js`.
  - Research & IPR: `publicationController.js`, `patentController.js`, `copyrightController.js`, `consultancyProjectController.js`, `sponsoredProjectController.js`, `internalResearchController.js`.
  - Outcomes: `placementController.js`, `achievementController.js`, `awardsController.js`, `eContentsController.js`, `invitedTalksController.js`, `professionalDevelopmentsController.js`, `periodicalsController.js`.
  - Quality & Administration: `systemAdminController.js`, `parameterMasterController.js`, `systemController.js`, `strategicPlanController.js`, `researchReportController.js`.

---

### 3. DATABASE & STORAGE INVENTORY (Supabase PostgreSQL)

- **Database Models (50+ Models in `models/index.js`):**
  - Identity & Access: `User`, `Role`, `UserPermissionOverride`, `UserOrganizationalScope`, `AuditLog`.
  - Academic Structure: `Campus`, `School`, `Department`, `Course`, `ProgramLevel`, `DepartmentLineage`.
  - Core Records: `Faculty`, `Student`, `StudentEnrollment`, `Publication`, `Patent`, `Copyright`, `ConsultancyProject`, `SponsoredProject`, `Placement`, `Achievement`, `Award`, `EContent`, `InvitedTalk`, `Periodical`, `ProfessionalDevelopment`.
  - Quality & Strategic: `StrategicPlan`, `AccreditationFramework`, `AccreditationParameter`, `ParameterDataSubmission`, `DynamicParameterMaster`.
  - System Admin: `FormDefinition`, `FormField`, `SystemConfiguration`, `ModuleConfig`, `ConfigurationVersion`, `ConfigurationBackup`.
- **Audit Logging Table:**
  - `AuditLog`: stores action, userName, userRole, department, previousValue, updatedValue, ipAddress, remarks, adminUserId, adminIdentity, module, entity, affectedRecordId, correlationId.
- **Evidence Documents & Storage:**
  - Files stored under local server directory `/uploads` or Supabase storage buckets, tracked via `Document`, `PatentProof`, and proof URL fields across models.

---

### 4. CLASSIFICATION OF EXISTING IMPLEMENTATIONS

| Component | Responsibility | Classification | Notes |
| :--- | :--- | :--- | :--- |
| `App.tsx` | React Router entry | **A. Reuse without changes** | Successfully refactored to React Router v7 |
| `AuthContext.tsx` | Frontend session management | **B. Reuse with improvements** | Add hook-level access helpers |
| `PublicLayout.tsx` | Public pages wrapper | **A. Reuse without changes** | Clean separation of concerns |
| `DashboardLayout.tsx`| Dashboard pages wrapper | **A. Reuse without changes** | Clean separation of concerns |
| `ProtectedRoute.tsx` | Auth guard | **A. Reuse without changes** | Retains `{ from: location }` |
| `RoleBasedRoute.tsx` | Role access guard | **A. Reuse without changes** | Clean UI with dashboard return |
| `auth.js` (backend) | JWT & RBAC middleware | **B. Reuse with improvements** | Integrate with unified Auth Engine |
| `auditLogger.js` | Backend audit logging | **B. Reuse with improvements** | Add correlation ID extraction middleware |
| API Services (FE) | Direct fetch in components | **C. Introduce missing capability** | Build typed Frontend Service layer (`src/app/services/`) |
| Auth Engine (BE) | Authorization checks | **C. Introduce missing capability** | Centralized `authEngine.js` for clean RBAC & scope checks |
| File Security (BE) | Multer & file uploads | **C. Introduce missing capability** | Centralized validation for MIME/size/path traversal |
| Bulk Upload Engine | Module-specific uploaders | **B. Reuse with improvements** | Standardize upload pipeline & validation reporting |

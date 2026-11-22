# CHRIST (Deemed to be University) — IQAC Platform
## Target Architecture Mapping & Implementation Plan

**Generated:** 2026-11-21  
**Scope:** Controlled, Backward-Compatible Architectural Refinement

---

### 1. IMPLEMENTATION MAPPING MATRIX

| Existing Implementation | Target Responsibility | Planned Change | Compatibility Risk | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| Direct `fetch` in UI components | Centralized Frontend Service Layer | Introduce `src/app/services/` (ApiClient, AuthService, FacultyService, etc.) | Very Low | Components can adopt services incrementally; existing endpoints untouched. |
| Scattered role checks in UI | Fine-grained Authorization Hooks | Introduce `usePermissions.ts`, `useCan.ts`, `useDataScope.ts` | Zero | Wraps existing `AuthContext` and `permissions.ts` without altering rules. |
| Backend `auth.js` middleware | Centralized Backend Auth & RBAC Engine | Create `src/app/backend/security/authEngine.js` and integrate into `auth.js` | Zero | Re-exports all existing functions (`auth`, `authorize`, `checkDepartment`, etc.). |
| Direct request logging in controllers | Request Context & Audit Correlation | Add `requestContext.js` middleware generating `req.id` / `X-Request-ID` | Zero | Pass-through middleware; attaches UUIDv4 correlation ID to request and audit log. |
| Upload handlers using raw multer | Centralized File Security Validator | Add `src/app/backend/security/fileSecurity.js` | Very Low | Validates MIME types, extensions, size limits, and sanitizes filenames. |
| Ad-hoc error handlers in controllers | Centralized Error Response Factory | Add `src/app/backend/utils/apiResponse.js` and refine `server.js` error handler | Zero | Preserves `{ success, message, data }` response contracts. |
| Bulk upload duplicated logic | Unified Bulk Upload Helper | Add `src/app/backend/services/bulkUploadEngine.js` | Very Low | Retains module-specific schemas and business rules while unifying parsing and error reporting. |

---

### 2. ARCHITECTURAL LAYERS & DIRECTORY BLUEPRINT

#### A. Frontend Architecture (`src/app/`)
```
src/app/
├── App.tsx                     # React Router v7 root with BrowserRouter & Providers
├── contexts/
│   ├── AuthContext.tsx         # User authentication, token version & Supabase session
│   └── SystemConfigContext.tsx # Dynamic configuration & permissions propagation
├── components/
│   ├── layouts/                # PublicLayout & DashboardLayout
│   ├── routing/                # ProtectedRoute, RoleBasedRoute, NotFoundPage
│   ├── design-system/          # AppShell, PageHeader, DataTable, StatCard
│   └── ... feature views
├── hooks/
│   ├── usePermissions.ts       # [NEW] Role, module permissions & action capabilities
│   ├── useDataScope.ts         # [NEW] Multi-campus/school/department scope evaluation
│   ├── useCan.ts               # [NEW] Declarative can(action, module) authorization hook
│   └── ... existing hooks
└── services/                   # [NEW] Centralized API Client & Service Modules
    ├── apiClient.ts            # Base HTTP client with JWT injection, correlation IDs, 401 interception
    ├── authService.ts          # Login, logout, session verification, password changes
    ├── facultyService.ts       # Faculty profiles, metrics, department lineage
    ├── studentService.ts       # Student intelligence, enrollment statistics
    ├── researchService.ts      # Publications, patents, copyrights, sponsored research, consultancy
    ├── reportService.ts        # Report generation, export status, history
    └── auditService.ts         # Centralized audit trail queries
```

#### B. Backend Architecture (`src/app/backend/`)
```
src/app/backend/
├── server.js                   # Application bootstrap, security headers, CORS, rate limiting
├── middleware/
│   ├── requestContext.js       # [NEW] Correlation ID injection (X-Request-ID) & actor tracking
│   ├── auth.js                 # Authentication verification & role gates
│   ├── auditLogger.js          # Centralized audit logging with recursive secret redaction
│   ├── configEnforcement.js    # Disabled module protection
│   └── loginRateLimiter.js     # Brute-force login defense
├── security/
│   ├── authEngine.js           # [NEW] Centralized RBAC, scope resolution & action authorization
│   └── fileSecurity.js         # [NEW] File validation, MIME pinning & path traversal defense
├── utils/
│   ├── apiResponse.js          # [NEW] Standardized client-safe response builder
│   ├── dataSanitizer.js        # Input sanitization
│   └── scopeHelper.js          # Data scope evaluation
├── services/
│   ├── bulkUploadEngine.js     # [NEW] Unified spreadsheet parsing, validation & batch processing
│   ├── institutionalReportService.js # Report builder engine
│   └── configPropagationService.js   # Dynamic permissions & hierarchy propagation
├── controllers/                # 30+ Resource controllers (preserved contracts)
├── routes/                     # 30+ Resource routes (preserved contracts)
└── models/                     # 50+ Sequelize models connecting to Supabase PostgreSQL
```

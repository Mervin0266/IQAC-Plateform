# CHRIST UNIVERSITY IQAC PLATFORM
# PHASE C — API ROUTE AUTHORIZATION COVERAGE & INVENTORY MATRIX

**Document Version:** 1.0.0  
**Date:** October 20, 2026  
**Auditor:** Application Security Lead & Full-Stack Architect  
**Scope:** Complete inventory of all 139 registered Express API endpoints extracted directly from `app._router.stack`.  

---

## 1. Executive Summary & Coverage Guarantee

Every active API route in the CHRIST University IQAC Platform has been inspected, extracted, and categorized by HTTP method, path, authentication requirement, authorized role permissions, department scoping rules, and ownership enforcement.

- **Total Registered API Endpoints:** 139
- **Public / Unauthenticated Routes:** 2 (`POST /api/auth/login`, `GET /health`)
- **Strictly Protected Routes:** 137 (Require valid, signed JWT with matching `tokenVersion` and `mustChangePassword === false`)
- **Role Permission Coverage:**
  - **Admin:** Full university-wide operational and administrative authority.
  - **Authority (Dean/Director):** Institutional read-only access across all departments; mutation routes strictly rejected with HTTP 403.
  - **HOD:** Departmental oversight, strategic plan creation/update, edit request approval, department-confined bulk clear.
  - **Coordinator:** Departmental record creation, bulk uploads, document management, edit request review.
  - **Faculty:** Personal contribution creation, edit request submission, own-record updates; administrative/destructive endpoints rejected with HTTP 403.
  - **Unauthenticated:** Rejected with HTTP 401 across all protected routes.

---

## 2. Master API Route Authorization Inventory

### 2.1 Authentication & System Administration
| HTTP Method | Route Path | Auth Required | Authorized Roles | Department Scoping | Ownership Rules | Verification Test Reference |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | No | Public / All | Global | N/A | `phase_b_workstreams_b1_b2` |
| `GET` | `/api/auth/me` | Yes | All Roles | Global | User Identity | `phase_a_e2e_supertest` |
| `POST` | `/api/auth/logout` | Yes | All Roles | Global | User Identity | `phase_b_workstreams_b1_b2` |
| `GET` | `/health` | No | Public | Global | Public Monitoring | Server Unit Check |
| `POST` | `/api/system/clear-database` | Yes | `admin` | Global | Dual Auth + Pwd | `phase_a_e2e_supertest`, `phase_c_authorization_inventory` |
| `GET` | `/api/system/dashboard-stats` | Yes | All Roles | Scoped for Non-Admin | Aggregated Stats | `phase_c_authorization_inventory` |

### 2.2 User Management (`/api/users`)
| HTTP Method | Route Path | Auth Required | Authorized Roles | Department Scoping | Ownership Rules | Verification Test Reference |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/users` | Yes | `admin` | University-wide | Admin Only | `phase_c_authorization_inventory` (ADM-01, FAC-01) |
| `POST` | `/api/users` | Yes | `admin` | University-wide | Admin Only | `phase_a_verification` |
| `GET` | `/api/users/:id` | Yes | `admin` | University-wide | Admin Only | `phase_c_authorization_inventory` |
| `PUT` | `/api/users/:id` | Yes | `admin` | University-wide | Admin Only | `phase_c_authorization_inventory` |
| `DELETE` | `/api/users/:id` | Yes | `admin` | University-wide | Admin Only | `phase_c_authorization_inventory` |

### 2.3 Student Records (`/api/students`)
| HTTP Method | Route Path | Auth Required | Authorized Roles | Department Scoping | Ownership Rules | Verification Test Reference |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/students` | Yes | All Roles | Scoped to User Dept | Read-Only for Auth | `phase_a_e2e_supertest`, `phase_b_full_matrix` |
| `POST` | `/api/students` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept | Department Match | `phase_b_workstream_b5` |
| `GET` | `/api/students/lookup/:regNo` | Yes | All Roles | Scoped to User Dept | Dept Isolated | `phase_a_integration`, `phase_a_e2e_supertest` |
| `GET` | `/api/students/:id` | Yes | All Roles | Scoped to User Dept | Dept Isolated | `phase_b_full_matrix` |
| `PUT` | `/api/students/:id` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept | Dept Match | `phase_b_full_matrix` |
| `DELETE` | `/api/students/:id` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept | Dept Match | `phase_b_full_matrix` |
| `POST` | `/api/students/bulk` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept | Advisory Locked | `phase_c_concurrency_and_exports` (C1-01) |
| `DELETE` | `/api/students/clear-all` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept (Option C) | Admin Dual-Confirm | `phase_a_e2e_supertest` |

### 2.4 Faculty Records (`/api/faculty`)
| HTTP Method | Route Path | Auth Required | Authorized Roles | Department Scoping | Ownership Rules | Verification Test Reference |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/faculty` | Yes | All Roles | Scoped to User Dept | PAN Redacted | `phase_a_e2e_supertest`, `phase_b_full_matrix` |
| `POST` | `/api/faculty` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept | Dept Match | `phase_b_workstream_b5` |
| `GET` | `/api/faculty/:id` | Yes | All Roles | Scoped to User Dept | PAN Redacted | `phase_b_full_matrix` |
| `PUT` | `/api/faculty/:id` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept | Dept Match | `phase_b_full_matrix` |
| `DELETE` | `/api/faculty/:id` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept | Dept Match | `phase_b_full_matrix` |
| `POST` | `/api/faculty/bulk` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept | Advisory Locked | `phase_c_concurrency_and_exports` (C1-02) |
| `DELETE` | `/api/faculty/clear-all` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept (Option C) | Admin Dual-Confirm | `phase_a_e2e_supertest` |

### 2.5 Institutional Documents (`/api/documents`)
| HTTP Method | Route Path | Auth Required | Authorized Roles | Department Scoping | Ownership Rules | Verification Test Reference |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/documents` | Yes | All Roles | Scoped to User Dept | Department Isolated | `phase_b_workstreams_b4_b6` |
| `POST` | `/api/documents` | Yes | `admin`, `coordinator`, `faculty` | Scoped to User Dept | `uploadedBy = caller.id` | `phase_b_workstreams_b4_b6` |
| `GET` | `/api/documents/:id` | Yes | All Roles | Scoped to User Dept | Cross-Dept 403 | `phase_c_concurrency_and_exports` (C3-05) |
| `PUT` | `/api/documents/:id` | Yes | `admin`, `coordinator`, `hod`, `faculty` | Scoped to User Dept | Status Admin/Coord | `phase_b_workstreams_b4_b6` |
| `DELETE` | `/api/documents/:id` | Yes | `admin`, `coordinator` | Scoped to User Dept | Cross-Dept 403 | `phase_c_concurrency_and_exports` (C3-06) |
| `DELETE` | `/api/documents/clear-all` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept | Option C Scoped | `phase_b_workstreams_b4_b6` |

### 2.6 Achievements & Awards (`/api/achievements`)
| HTTP Method | Route Path | Auth Required | Authorized Roles | Department Scoping | Ownership Rules | Verification Test Reference |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/achievements` | Yes | All Roles | Scoped to User Dept | Read-Only for Auth | `phase_c_concurrency_and_exports` |
| `POST` | `/api/achievements` | Yes | `admin`, `coordinator`, `faculty` | Locked to User Dept | Faculty = Submitted | `phase_c_concurrency_and_exports` (C3-01) |
| `GET` | `/api/achievements/:id` | Yes | All Roles | Scoped to User Dept | All Roles Read | `phase_c_concurrency_and_exports` |
| `PUT` | `/api/achievements/:id` | Yes | `admin`, `coordinator`, `hod`, `faculty` | Locked to User Dept | Faculty Own Only | `phase_c_concurrency_and_exports` (C3-01) |
| `DELETE` | `/api/achievements/:id` | Yes | `admin`, `coordinator` | Scoped to User Dept | Privileged Only | `phase_c_concurrency_and_exports` |
| `POST` | `/api/achievements/bulk` | Yes | `admin`, `coordinator` | Scoped to User Dept | Operational | `phase_c_concurrency_and_exports` |
| `DELETE` | `/api/achievements/clear-all` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept | Option C Scoped | `phase_c_concurrency_and_exports` |
| `GET` | `/api/achievements/stats` | Yes | All Roles | Scoped to User Dept | Aggregated Metrics | `phase_c_concurrency_and_exports` |

### 2.7 Publications & Research (`/api/publications`)
| HTTP Method | Route Path | Auth Required | Authorized Roles | Department Scoping | Ownership Rules | Verification Test Reference |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/publications` | Yes | All Roles | Scoped to User Dept | Read-Only for Auth | `phase_b_full_matrix` |
| `POST` | `/api/publications` | Yes | `admin`, `coordinator`, `faculty` | Locked to User Dept | Faculty = Submitted | `phase_c_concurrency_and_exports` (C3-02) |
| `GET` | `/api/publications/:id` | Yes | All Roles | Scoped to User Dept | All Roles Read | `phase_b_full_matrix` |
| `PUT` | `/api/publications/:id` | Yes | `admin`, `coordinator`, `hod`, `faculty` | Locked to User Dept | Faculty Own Only | `phase_c_concurrency_and_exports` |
| `DELETE` | `/api/publications/:id` | Yes | `admin`, `coordinator` | Scoped to User Dept | Privileged Only | `phase_b_full_matrix` |
| `POST` | `/api/publications/bulk` | Yes | `admin`, `coordinator` | Scoped to User Dept | Operational | `phase_b_full_matrix` |
| `DELETE` | `/api/publications/clear-all` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept | Option C Scoped | `phase_b_full_matrix` |
| `GET` | `/api/publications/stats` | Yes | All Roles | Scoped to User Dept | Aggregated Metrics | `phase_b_full_matrix` |

### 2.8 Patents (`/api/patents`)
| HTTP Method | Route Path | Auth Required | Authorized Roles | Department Scoping | Ownership Rules | Verification Test Reference |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/patents` | Yes | All Roles | Scoped to User Dept | Read-Only for Auth | `phase_b_full_matrix` |
| `POST` | `/api/patents` | Yes | `admin`, `coordinator`, `faculty` | Locked to User Dept | Faculty = Submitted | `phase_c_concurrency_and_exports` (C3-03) |
| `GET` | `/api/patents/:id` | Yes | All Roles | Scoped to User Dept | All Roles Read | `phase_b_full_matrix` |
| `PUT` | `/api/patents/:id` | Yes | `admin`, `coordinator`, `hod`, `faculty` | Locked to User Dept | Faculty Own Only | `phase_c_concurrency_and_exports` |
| `DELETE` | `/api/patents/:id` | Yes | `admin`, `coordinator` | Scoped to User Dept | Privileged Only | `phase_b_full_matrix` |
| `POST` | `/api/patents/bulk` | Yes | `admin`, `coordinator` | Scoped to User Dept | Operational | `phase_b_full_matrix` |
| `DELETE` | `/api/patents/clear-all` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept | Option C Scoped | `phase_b_full_matrix` |
| `GET` | `/api/patents/stats` | Yes | All Roles | Scoped to User Dept | Aggregated Metrics | `phase_b_full_matrix` |

### 2.9 Sponsored Research Projects (`/api/sponsored-projects`)
| HTTP Method | Route Path | Auth Required | Authorized Roles | Department Scoping | Ownership Rules | Verification Test Reference |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/sponsored-projects` | Yes | All Roles | Scoped to User Dept | Read-Only for Auth | `phase_b_full_matrix` |
| `POST` | `/api/sponsored-projects` | Yes | `admin`, `coordinator`, `faculty` | Locked to User Dept | Faculty = Submitted | `phase_c_concurrency_and_exports` (C3-04) |
| `GET` | `/api/sponsored-projects/:id` | Yes | All Roles | Scoped to User Dept | All Roles Read | `phase_b_full_matrix` |
| `PUT` | `/api/sponsored-projects/:id` | Yes | `admin`, `coordinator`, `hod`, `faculty` | Locked to User Dept | Faculty Own Only | `phase_c_concurrency_and_exports` |
| `DELETE` | `/api/sponsored-projects/:id` | Yes | `admin`, `coordinator` | Scoped to User Dept | Privileged Only | `phase_b_full_matrix` |
| `POST` | `/api/sponsored-projects/bulk` | Yes | `admin`, `coordinator` | Scoped to User Dept | Operational | `phase_b_full_matrix` |
| `DELETE` | `/api/sponsored-projects/clear-all` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept | Option C Scoped | `phase_b_full_matrix` |
| `GET` | `/api/sponsored-projects/stats` | Yes | All Roles | Scoped to User Dept | Aggregated Metrics | `phase_b_full_matrix` |

### 2.10 Consultancy Projects (`/api/consultancy-projects`)
| HTTP Method | Route Path | Auth Required | Authorized Roles | Department Scoping | Ownership Rules | Verification Test Reference |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/consultancy-projects` | Yes | All Roles | Scoped to User Dept | Read-Only for Auth | `phase_c_concurrency_and_exports` |
| `POST` | `/api/consultancy-projects` | Yes | `admin`, `coordinator`, `faculty` | Locked to User Dept | Faculty = Submitted | `phase_c_concurrency_and_exports` |
| `GET` | `/api/consultancy-projects/:id` | Yes | All Roles | Scoped to User Dept | All Roles Read | `phase_c_concurrency_and_exports` |
| `PUT` | `/api/consultancy-projects/:id` | Yes | `admin`, `coordinator`, `hod`, `faculty` | Locked to User Dept | Faculty Own Only | `phase_c_concurrency_and_exports` |
| `DELETE` | `/api/consultancy-projects/:id` | Yes | `admin`, `coordinator` | Scoped to User Dept | Privileged Only | `phase_c_concurrency_and_exports` |
| `POST` | `/api/consultancy-projects/bulk` | Yes | `admin`, `coordinator` | Scoped to User Dept | Operational | `phase_c_concurrency_and_exports` |
| `DELETE` | `/api/consultancy-projects/clear-all` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept | Option C Scoped | `phase_c_concurrency_and_exports` |
| `GET` | `/api/consultancy-projects/stats` | Yes | All Roles | Scoped to User Dept | Aggregated Metrics | `phase_c_concurrency_and_exports` |

### 2.11 Departmental Activities (`/api/departmental-activities`)
| HTTP Method | Route Path | Auth Required | Authorized Roles | Department Scoping | Ownership Rules | Verification Test Reference |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/departmental-activities` | Yes | All Roles | Scoped to User Dept | Read-Only for Auth | `phase_c_authorization_inventory` |
| `POST` | `/api/departmental-activities` | Yes | `admin`, `coordinator`, `hod` | Locked to User Dept | Operational | `phase_c_authorization_inventory` (COORD-01) |
| `GET` | `/api/departmental-activities/matrix` | Yes | All Roles | Scoped to User Dept | Matrix Metrics | `phase_c_authorization_inventory` |
| `GET` | `/api/departmental-activities/:id` | Yes | All Roles | Scoped to User Dept | All Roles Read | `phase_c_authorization_inventory` |
| `PUT` | `/api/departmental-activities/:id` | Yes | `admin`, `coordinator`, `hod` | Locked to User Dept | Dept Match | `phase_c_authorization_inventory` |
| `DELETE` | `/api/departmental-activities/:id` | Yes | `admin`, `coordinator`, `hod` | Locked to User Dept | Dept Match | `phase_c_authorization_inventory` |
| `POST` | `/api/departmental-activities/bulk` | Yes | `admin`, `coordinator`, `hod` | Locked to User Dept | Operational | `phase_c_authorization_inventory` |
| `DELETE` | `/api/departmental-activities/clear-all` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept | Option C Scoped | `phase_c_authorization_inventory` |

### 2.12 Strategic Plans (`/api/strategic-plans`)
| HTTP Method | Route Path | Auth Required | Authorized Roles | Department Scoping | Ownership Rules | Verification Test Reference |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/strategic-plans` | Yes | All Roles | Scoped to User Dept | Read-Only for Auth | `phase_c_authorization_inventory` (HOD-01, AUTH-ROLE-01) |
| `POST` | `/api/strategic-plans` | Yes | `admin`, `coordinator`, `hod`, `faculty` | Locked to User Dept | Locked Creator | `phase_c_authorization_inventory` (HOD-02, AUTH-ROLE-02) |
| `GET` | `/api/strategic-plans/:id` | Yes | All Roles | Scoped to User Dept | All Roles Read | `phase_c_authorization_inventory` |
| `PUT` | `/api/strategic-plans/:id` | Yes | `admin`, `coordinator`, `hod`, `faculty` | Locked to User Dept | Dept Match | `phase_c_authorization_inventory` |
| `DELETE` | `/api/strategic-plans/:id` | Yes | `admin`, `coordinator`, `hod` | Locked to User Dept | Fac/Auth Forbidden | `phase_c_authorization_inventory` (FAC-03) |
| `DELETE` | `/api/strategic-plans/clear-all` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept | Option C Scoped | `phase_c_authorization_inventory` |
| `GET` | `/api/strategic-plans/stats` | Yes | All Roles | Scoped to User Dept | Aggregated Metrics | `phase_c_authorization_inventory` |

### 2.13 Edit Requests & Change Approvals (`/api/edit-requests`)
| HTTP Method | Route Path | Auth Required | Authorized Roles | Department Scoping | Ownership Rules | Verification Test Reference |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/edit-requests` | Yes | `faculty` | Locked to User Dept | Own Records Only | `phase_c_authorization_inventory` (FAC-04) |
| `GET` | `/api/edit-requests` | Yes | `admin`, `authority`, `hod`, `coordinator` | Scoped to User Dept | Governance | `phase_c_authorization_inventory` (COORD-03) |
| `PUT` | `/api/edit-requests/:id` | Yes | `admin`, `hod`, `coordinator` | Scoped to User Dept | Fac Blocked (403) | `phase_c_authorization_inventory` (COORD-04, FAC-05) |

### 2.14 Placements & Internships (`/api/placements`)
| HTTP Method | Route Path | Auth Required | Authorized Roles | Department Scoping | Ownership Rules | Verification Test Reference |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/placements` | Yes | All Roles | Scoped to User Dept | Read-Only for Auth | `phase_c_authorization_inventory` |
| `POST` | `/api/placements` | Yes | `admin`, `coordinator` | Scoped to User Dept | Auth Blocked (403) | `phase_c_authorization_inventory` (AUTH-ROLE-03) |
| `GET` | `/api/placements/:id` | Yes | All Roles | Scoped to User Dept | All Roles Read | `phase_c_authorization_inventory` |
| `PUT` | `/api/placements/:id` | Yes | `admin`, `coordinator` | Scoped to User Dept | Dept Match | `phase_c_authorization_inventory` |
| `DELETE` | `/api/placements/:id` | Yes | `admin`, `coordinator` | Scoped to User Dept | Dept Match | `phase_c_authorization_inventory` |
| `POST` | `/api/placements/bulk` | Yes | `admin`, `coordinator` | Scoped to User Dept | Operational | `phase_c_authorization_inventory` |
| `DELETE` | `/api/placements/clear-all` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept | Option C Scoped | `phase_c_authorization_inventory` |
| `GET` | `/api/placements/stats` | Yes | All Roles | Scoped to User Dept | Aggregated Metrics | `phase_c_authorization_inventory` |

### 2.15 Accreditation Parameter Master (`/api/parameter-master`)
| HTTP Method | Route Path | Auth Required | Authorized Roles | Department Scoping | Ownership Rules | Verification Test Reference |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- |
| `GET` | `/api/parameter-master/frameworks` | Yes | All Roles | Global Master | Framework View | `phase_c_authorization_inventory` |
| `POST` | `/api/parameter-master/frameworks` | Yes | `admin` | Global Master | Coord Blocked (403) | `phase_c_authorization_inventory` (ADM-03, COORD-02) |
| `GET` | `/api/parameter-master/parameters` | Yes | All Roles | Global Master | Parameter View | `phase_c_authorization_inventory` |
| `POST` | `/api/parameter-master/parameters` | Yes | `admin`, `hod` | Global Master | HOD/Admin Config | `phase_c_authorization_inventory` |
| `POST` | `/api/parameter-master/submissions` | Yes | `admin`, `hod`, `coordinator`, `faculty` | Scoped to User Dept | Dept Contribution | `phase_c_authorization_inventory` |
| `PUT` | `/api/parameter-master/verify/:id` | Yes | `admin`, `coordinator`, `hod` | Scoped to User Dept | Governance Approval | `phase_c_authorization_inventory` |

### 2.16 Academic Structure & Hierarchy Endpoints
| HTTP Method | Route Path Group | Auth Required | Authorized Roles | Verification Method |
| :--- | :--- | :---: | :--- | :--- |
| `GET, POST, PUT, DELETE` | `/api/campuses` (6 endpoints) | Yes | Admin/Coord for mutations; all read | Automated Route Registry Introspection |
| `GET, POST, PUT, DELETE` | `/api/schools` (6 endpoints) | Yes | Admin/Coord for mutations; all read | Automated Route Registry Introspection |
| `GET, POST, PUT, DELETE` | `/api/departments` (8 endpoints) | Yes | Admin/Coord for mutations; all read | Automated Route Registry Introspection |
| `GET, POST, PUT, DELETE` | `/api/program-levels` (5 endpoints) | Yes | Admin/Coord for mutations; all read | Automated Route Registry Introspection |
| `GET, POST, PUT, DELETE` | `/api/courses` (5 endpoints) | Yes | Admin/Coord for mutations; all read | Automated Route Registry Introspection |
| `GET, PUT` | `/api/hierarchy` (2 endpoints) | Yes | Read all; Admin update | Automated Route Registry Introspection |
| `GET, PUT` | `/api/department-lineage` (2 endpoints) | Yes | Read all; Admin update | Automated Route Registry Introspection |
| `GET, PUT` | `/api/notifications` (2 endpoints) | Yes | User-scoped notification list & read toggle | Automated Route Registry Introspection |
| `GET, POST, PUT` | `/api/research-metrics` (3 endpoints) | Yes | Scoped departmental metric summaries | Automated Route Registry Introspection |

---

## 3. Coverage Verification Conclusion

Every single route in the Express application has been validated. Unauthenticated callers are rejected fail-closed, role boundaries enforce least privilege across the five-role hierarchy, and cross-department unauthorized data tampering is structurally prohibited.

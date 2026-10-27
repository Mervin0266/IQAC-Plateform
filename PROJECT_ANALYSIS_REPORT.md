# Christ University IQAC Platform: Comprehensive System Architecture & Technical Analysis Report

> **Document Type:** Deep Technical Architecture & Operational Analysis Report  
> **Institution:** CHRIST (Deemed to be University), Bangalore, Karnataka, India  
> **System:** Internal Quality Assurance Cell (IQAC) Institutional Platform  
> **Version:** 2.4.0 (Production Architecture)  
> **Generated:** October 19, 2026  
> **Classification:** Institutional Quality Management & Academic Accreditation  

---

## Table of Contents

1. [Executive Summary & System Identity](#1-executive-summary--system-identity)
2. [High-Level Architecture & Topology](#2-high-level-architecture--topology)
3. [Identity & Access Management (IAM) & RBAC](#3-identity--access-management-iam--rbac)
4. [Functional Decomposition by Module](#4-functional-decomposition-by-module)
   - [4.1. Academic Structural Hierarchy Engine](#41-academic-structural-hierarchy-engine)
   - [4.2. Executive Dashboard & Institutional Intelligence](#42-executive-dashboard--institutional-intelligence)
   - [4.3. Research, Innovations & Intellectual Property (IPR)](#43-research-innovations--intellectual-property-ipr)
   - [4.4. Accreditation Master (NAAC & NBA)](#44-accreditation-master-naac--nba)
   - [4.5. Student & Faculty Lifecycle Management](#45-student--faculty-lifecycle-management)
   - [4.6. Department Lineage & Temporal Bifurcation Modeling](#46-department-lineage--temporal-bifurcation-modeling)
   - [4.7. High-Capacity Bulk Ingestion Pipeline](#47-high-capacity-bulk-ingestion-pipeline)
   - [4.8. Governance, Edit Requests & Audit Trail](#48-governance-edit-requests--audit-trail)
5. [Database Architecture & Data Models (Sequelize + PostgreSQL)](#5-database-architecture--data-models-sequelize--postgresql)
   - [5.1. Complete 27-Model Inventory](#51-complete-27-model-inventory)
   - [5.2. Relational Graph & Associations](#52-relational-graph--associations)
   - [5.3. Indexing & Optimization Strategies](#53-indexing--optimization-strategies)
6. [API Architecture & Complete Route Catalog](#6-api-architecture--complete-route-catalog)
7. [Performance Engineering & Optimization Analysis](#7-performance-engineering--optimization-analysis)
   - [7.1. Frontend Optimization Achievements](#71-frontend-optimization-achievements)
   - [7.2. Backend & Database Optimizations](#72-backend--database-optimizations)
   - [7.3. Identified Performance Bottlenecks & Remedies](#73-identified-performance-bottlenecks--remedies)
8. [Security Architecture & Threat Modeling (OWASP Assessment)](#8-security-architecture--threat-modeling-owasp-assessment)
   - [8.1. Current Defensive Measures](#81-current-defensive-measures)
   - [8.2. OWASP Top 10 Evaluation](#82-owasp-top-10-evaluation)
   - [8.3. Security Remediation Action Plan](#83-security-remediation-action-plan)
9. [Deployment, DevOps & Operational Playbook](#9-deployment-devops--operational-playbook)
   - [9.1. Deployment Topology (Vercel + Render)](#91-deployment-topology-vercel--render)
   - [9.2. Environment Variables Configuration Matrix](#92-environment-variables-configuration-matrix)
   - [9.3. Operational Runbook & Cold-Start Keep-Alive Strategy](#93-operational-runbook--cold-start-keep-alive-strategy)
10. [Frontend Component & File Structure Matrix](#10-frontend-component--file-structure-matrix)
11. [Strategic Recommendations & Engineering Roadmap](#11-strategic-recommendations--engineering-roadmap)

---

## 1. Executive Summary & System Identity

The **Christ University IQAC Platform** is an enterprise-grade academic quality assurance and institutional intelligence platform developed specifically for **CHRIST (Deemed to be University)**. It provides end-to-end data governance, accreditation compilation, and metric tracking across campuses, schools, academic departments, research centers, and administrative divisions.

### Primary Objectives
* **Accreditation Readiness:** Streamline evidence aggregation and metric computation for **NAAC** (*National Assessment and Accreditation Council*) SSR 7 Criteria and **NBA** (*National Board of Accreditation*) SAR 10 Criteria.
* **National & Global Rankings Intelligence:** Real-time data preparation and score modeling for **NIRF** (National Institutional Ranking Framework), **QS India & Asia**, **Times Higher Education (THE) World Rankings**, and **India Today MDRA Rankings**.
* **Research & Innovation Monitoring:** Lifecycle tracking of research publications, patents (filed/granted/commercialized), extramural research grants (DST, AICTE, ISRO, MNRE), and corporate consultancy contracts.
* **Academic Multi-Tenancy & Governance:** Departmental scoping, multi-tier approvals, audited edit-requests, and historical lineage tracking for department bifurcations.

---

## 2. High-Level Architecture & Topology

The platform is designed around a modern, decoupled client-server Single Page Application (SPA) architecture communicating through secure RESTful APIs:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER (Vercel)                            │
│  - React 18 SPA (TypeScript) compiled with Vite 6                     │
│  - Dynamic Role-Based Component Routing & Lazy-Loaded Code-Splitting   │
│  - State Management: React Context (AuthContext) + Custom Hooks       │
│  - Analytics Engine: Recharts + Client-Side SheetJS (xlsx) Ingestion   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS (REST / JSON)
                                    │ Bearer JWT Authentication
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       APPLICATION TIER (Render)                        │
│  - Node.js & Express RESTful API (`src/app/backend`)                   │
│  - Security Layers: Helmet, CORS Regex Filter, Express Rate Limiter    │
│  - Middleware: JWT Auth, RBAC Authorization, Department Isolation      │
│  - 25 Resource Controllers & 25 Route Handlers                         │
│  - Self-Healing Auto-Seed & Schema Migration Engine (`autoSeed.js`)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Encrypted SSL (pg pool)
                                    │ Dialect: PostgreSQL 16
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA TIER (Render PostgreSQL)                   │
│  - PostgreSQL 16 Relational Engine                                     │
│  - 27 Sequelize Data Models with Foreign Key Integrity & Indexes       │
│  - Temporal Attribution & Department Lineage Modeling                  │
│  - Immutable Audit Logging & Notification Queues                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Identity & Access Management (IAM) & RBAC

The platform enforces a five-tier Role-Based Access Control (**RBAC**) model implemented across both client navigation guards and backend middleware:

| Role | Target Users | Permissions & Page Scope | Department Scoping |
|---|---|---|---|
| **Admin** | System Administrators, IQAC Directors | Unrestricted CRUD on all 25 modules, user management, system database clearing, institution-wide analytics. | Institution-wide (all departments) |
| **Authority** | Vice Chancellor, Deans, Registrar | Universal read-only access to all institutional analytics, rankings, accreditations, and reports. | Institution-wide (read-only) |
| **HOD** | Heads of Academic Departments | Full CRUD within their assigned department; approvals for faculty edit requests and student records. | Strictly scoped to own department |
| **Coordinator** | IQAC / Department Accreditation Coordinators | Data entry, bulk upload, metric compilation, and edit request review for assigned department. | Strictly scoped to own department |
| **Faculty** | Professors, Assistant Professors | Content creation (publications, patents, achievements), personal profile management, edit requests. | Scoped to personal submissions |

### Enforcement Mechanisms:
* **Client Guard (`src/app/config/permissions.ts`):** Enforces `hasPageAccess()` and `hasFeatureAccess()` to control navigation items, action buttons, and write controls dynamically.
* **Backend JWT Middleware (`src/app/backend/middleware/auth.js`):**
  * `auth` / `protect`: Decodes Bearer JWT, validates signature, ensures token is not expired, and confirms the user account is active (`isActive: true`).
  * `authorize(...roles)`: Enforces strict role whitelisting at route level.
  * `checkDepartment`: Sanitizes and validates `req.query.department` against `req.user.department`, stopping horizontal privilege escalation attempts.

---

## 4. Functional Decomposition by Module

### 4.1. Academic Structural Hierarchy Engine
The academic structure is modeled as a strict, normalized parent-child hierarchy:
$$\text{Campus} \longrightarrow \text{School} \longrightarrow \text{Department} \longrightarrow \text{ProgramLevel} \longrightarrow \text{Course}$$

* **Controllers & Routes:** `hierarchyController.js`, `campuses.js`, `schools.js`, `departments.js`, `programLevels.js`, `courses.js`.
* **Endpoints:**
  * `GET /api/hierarchy/tree`: Returns the complete nested structural tree (Campus $\rightarrow$ School $\rightarrow$ Department $\rightarrow$ Course) annotated with degree levels (UG, PG, PhD).
  * `GET /api/hierarchy/stats`: Aggregates active entity counts for real-time dashboard cards.
* **Client Integration:** Custom hook [`useAcademicHierarchy.ts`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/hooks/useAcademicHierarchy.ts) provides memoized cascaded select filters across the entire application.

---

### 4.2. Executive Dashboard & Institutional Intelligence
* **Component:** [`DashboardPage.tsx`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/DashboardPage.tsx) (35 KB)
* **Hook:** [`useDashboardData.ts`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/hooks/useDashboardData.ts) (14 KB)
* **Features:**
  1. **Real-Time KPI Cards:** Total Students, Total Faculty, Student-Faculty Ratio (**SFR**), Research Papers, Total Extramural Grants (in Crores/Lakhs), Patents, Campus Placement percentage, and Average/Highest Salary LPA.
  2. **Accreditation Radar & Readiness:** Visualizes NAAC Criteria 1–7 attainment scores on a multi-axis Radar chart with an overall institutional readiness index ($91.4\%$).
  3. **Placement Trends:** Dual-view analytical engine allowing comparative analysis across engineering departments and multi-year graduation batches.
  4. **Excel Export (`XLSX`):** Generates multi-tab executive reports on-the-fly directly in the browser.

---

### 4.3. Research, Innovations & Intellectual Property (IPR)

#### A. Research Publications ([`PublicationsPage.tsx`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/PublicationsPage.tsx))
* Tracks journal publications, conference proceedings, book chapters, and monographs.
* Supports citation metrics, DOI formatting, ISSN tracking, and indexing classifications: **Scopus**, **Web of Science (WoS)**, **UGC-CARE List**, and **Peer Reviewed**.
* Approval workflows: Faculty draft $\rightarrow$ Coordinator/HOD verification $\rightarrow$ Approved institutional repository.

#### B. Patents & IPR ([`PatentsPage.tsx`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/PatentsPage.tsx))
* Tracks the full lifecycle of intellectual property:
  $$\text{Filed} \longrightarrow \text{Published} \longrightarrow \text{Under Examination} \longrightarrow \text{Granted} \longrightarrow \text{Commercialized}$$
* Captures patent classifications: National (Indian Patent Office), International (PCT), USPTO, EPO.
* Financial tracking: Tracks commercialization licensees (e.g., Qualcomm Technologies Inc.) and generated technology transfer royalties/revenue in INR.

#### C. Sponsored Extramural Research Grants ([`SponsoredResearchPage.tsx`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/SponsoredResearchPage.tsx))
* Manages national and international grant portfolios: DST-SERB (CRG), AICTE (RPS), ISRO (RESPOND), MNRE, and corporate research grants.
* Fields: Sanction Order No., Sanction Date, Principal Investigator (PI), Co-PIs, Total Sanctioned Amount vs. Amount Received, Project Timeline, and Progress Percentage.

#### D. Consultancy Projects ([`ConsultancyProjectsPage.tsx`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/ConsultancyProjectsPage.tsx))
* Tracks industrial consultancy, corporate training, revenue generation, client organizations, and departmental faculty consultants.

---

### 4.4. Accreditation Master (NAAC & NBA)
* **Component:** [`DynamicParameterMaster.tsx`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/DynamicParameterMaster.tsx) (75 KB)
* **Accreditation Engines:**
  1. **NAAC (National Assessment and Accreditation Council):**
     * **Criterion 1 (150 Marks):** Curricular Aspects (Curriculum development, academic flexibility, feedback system).
     * **Criterion 2 (200 Marks):** Teaching-Learning & Evaluation (Student enrollment, diversity, faculty qualification, student satisfaction survey).
     * **Criterion 3 (250 Marks):** Research, Innovations & Extension (Seed money, grants, publications, patents, consultancy, MoUs).
     * **Criterion 4 (100 Marks):** Infrastructure & Learning Resources (Physical facilities, library ILMS automation, 10 Gbps IT infrastructure).
     * **Criterion 5 (100 Marks):** Student Support & Progression (Scholarships, competitive exams, placements, alumni engagement).
     * **Criterion 6 (100 Marks):** Governance, Leadership & Management (Decentralization, financial mobilization, internal audit).
     * **Criterion 7 (100 Marks):** Institutional Values & Best Practices (Gender equity, green campus initiatives, distinctiveness).
  2. **NBA (National Board of Accreditation):**
     * SAR Criteria 1–10 tracking with Program Outcome (**PO**) and Course Outcome (**CO**) direct/indirect attainment measurement.

---

### 4.5. Student & Faculty Lifecycle Management

#### A. Student Lifecycle ([`StudentDetailsPage.tsx`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/StudentDetailsPage.tsx))
* Tracks student records across academic batches, programs (UG, PG, PhD), gender distribution, and category reservations (SC, ST, OBC).
* **Multi-Year History Enrichment (`enrichFromHistory`):** If a student register number is submitted with partial data for a new academic year, the system cross-references historical records and merges missing demographic or academic properties automatically.

#### B. Faculty Lifecycle ([`FacultyDetailsPage.tsx`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/FacultyDetailsPage.tsx))
* Tracks employee IDs, PAN card records, highest qualifications (Ph.D., Postdoc), date of joining, and experience breakdown:
  * Prior Teaching Experience (Years & Months)
  * Prior Industry Experience (Years & Months)
  * Christ University Tenure Experience (Years & Months)
* Supports automatic calculation of Student-Faculty Ratio (**SFR**) across departments.

---

### 4.6. Department Lineage & Temporal Bifurcation Modeling
* **Models:** [`DepartmentLineage.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/models/DepartmentLineage.js) & [`UserDepartmentHistory.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/models/UserDepartmentHistory.js)
* **Frontend Visualization:** [`DepartmentLineageTrends.tsx`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/DepartmentLineageTrends.tsx)
* **Problem Addressed:** When departments divide (e.g., *Artificial Intelligence and Data Science* spun off from *Computer Science and Engineering* in AY 2024-25), historical NAAC SSR criteria require tracking the entity both **separately** and as a **combined computing domain**.
* **Engine:** The platform introduces a `splitAcademicYear` event marker and domain group grouping (`Computing Domain`), enabling Recharts to switch between bifurcated and aggregate historical trajectories.

---

### 4.7. High-Capacity Bulk Ingestion Pipeline
* **Component:** [`BulkUploadDialog.tsx`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/BulkUploadDialog.tsx) (approx. 100 KB)
* **Supported Entity Types (10 distinct pipelines):**
  1. Research Publications
  2. Research Patents
  3. Sponsored Research Projects
  4. Consultancy Projects
  5. Placements & Internships
  6. Achievements & Awards
  7. Faculty Directory
  8. Student Directory
  9. Academic Departments
  10. Departmental Activities
* **Processing Capabilities:**
  * **Excel Template Generator:** Dynamically creates `.xlsx` files with required header columns and validation formatting.
  * **Date Parser & Serial Normalizer:** Seamlessly converts Excel 5-digit serial dates (e.g., `45123`), slash formats (`DD/MM/YYYY`), dot formats (`DD.MM.YYYY`), and text markers (`N/A`, `NIL`) into strict PostgreSQL `YYYY-MM-DD` ISO strings.
  * **Client-Side Validation & Diff Modal:** Identifies missing required columns, malformed emails, and invalid foreign keys before submitting to the backend.

---

### 4.8. Governance, Edit Requests & Audit Trail
* **Models:** [`EditRequest.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/models/EditRequest.js), [`AuditLog.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/models/AuditLog.js)
* **Workflow:**
  1. Finalized records cannot be modified directly by faculty.
  2. Faculty submits an **Edit Request** providing an audited rationale.
  3. Status changes to `edit_requested`.
  4. HOD or Coordinator reviews the request via [`EditRequestDialog.tsx`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/EditRequestDialog.tsx) and either unlocks the record for editing or rejects the request.
  5. Every state transition is written to the immutable `audit_logs` table via `logAction()` ([`auditLogger.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/middleware/auditLogger.js)).

---

## 5. Database Architecture & Data Models (Sequelize + PostgreSQL)

```
                            ┌──────────────┐
                            │    Campus    │
                            └──────┬───────┘
                                   │ 1:N
                                   ▼
                            ┌──────────────┐
                            │    School    │
                            └──────┬───────┘
                                   │ 1:N
                                   ▼
                            ┌──────────────┐
                            │  Department  │◀──┐ 1:1 (HOD)
                            └──────┬───────┘   │
                       1:N ┌───────┴───────┐   │
                           ▼               ▼   │
                    ┌────────────┐   ┌─────────┴──┐
                    │   Course   │   │    User    │
                    └────────────┘   └──────┬─────┘
                                            │
         ┌───────────────┬──────────────────┼─────────────────┬────────────────┐
         ▼ 1:N           ▼ 1:N              ▼ 1:N             ▼ 1:N            ▼ 1:N
  ┌─────────────┐ ┌─────────────┐   ┌───────────────┐ ┌──────────────┐ ┌───────────────┐
  │ Publication │ │   Patent    │   │ SponsoredProj │ │ Achievement  │ │ Consultancy   │
  └─────────────┘ └─────────────┘   └───────────────┘ └──────────────┘ └───────────────┘
         ▲               ▲                  ▲                 ▲                ▲
         └───────────────┴──────────────────┴─────────────────┴────────────────┘
                                  Audit Logging & Approval Workflow
```

### 5.1. Complete 27-Model Inventory

| # | Model Name | Table Name | Primary Purpose & Key Fields |
|---|---|---|---|
| 1 | **User** | `users` | Identity, email, hashed password, role (`admin`, `authority`, `hod`, `coordinator`, `faculty`), department, `isActive`. |
| 2 | **Campus** | `campuses` | Physical university campus (`code`, `name`, `status`). |
| 3 | **School** | `schools` | Academic faculty division (`campusId`, `code`, `name`). |
| 4 | **Department** | `departments` | Academic department entity (`schoolId`, `hodId`, `code`, `name`, `shortName`, `establishedYear`). |
| 5 | **ProgramLevel** | `program_levels` | Degree classification tier (`UG`, `PG`, `PHD`). |
| 6 | **Course** | `courses` | Specific degree program (`departmentId`, `programLevelId`, `duration`, `status`). |
| 7 | **Student** | `students` | Student records (`registerNumber`, `name`, `course`, `department`, `batch`, `gender`, `academicYear`). |
| 8 | **Faculty** | `faculties` | Faculty profile (`employeeId`, `name`, `designation`, `department`, `highestQualification`, tenure & experience). |
| 9 | **Publication** | `publications` | Research papers (`title`, `authors`, `journalName`, `indexing`, `doi`, `impactFactor`, `citationCount`). |
| 10 | **Patent** | `patents` | Patents & IPR (`title`, `inventors`, `applicationNo`, `patentNo`, `status`, `patentType`, `revenue`). |
| 11 | **SponsoredProject** | `sponsored_projects` | Funded grants (`principalInvestigator`, `fundingAgency`, `sanctionedAmount`, `amountReceived`). |
| 12 | **ConsultancyProject** | `consultancy_projects` | Industry consultancy contracts (`clientName`, `revenue`, `department`). |
| 13 | **Placement** | `placements` | Placement & internship records (`studentName`, `companyName`, `package`, `department`, `batch`). |
| 14 | **Achievement** | `achievements` | Institutional & departmental awards (`title`, `category`, `level`, `year`). |
| 15 | **Document** | `documents` | Course files & accreditation proof (`title`, `fileUrl`, `fileType`, `category`, `uploadedBy`). |
| 16 | **StrategicPlan** | `strategic_plans` | Institutional 5-year perspective plan (`theme`, `subTheme`, `goal`, `target`, `achieved`). |
| 17 | **AccreditationFramework** | `accreditation_frameworks` | Framework root definition (`name`: NAAC / NBA, `version`, `year`). |
| 18 | **AccreditationParameter** | `accreditation_parameters` | Metric definitions (`criterionNumber`, `metricId`, `weightage`, `metricType`). |
| 19 | **ParameterDataSubmission** | `parameter_data_submissions` | Departmental data submissions against specific criteria parameters. |
| 20 | **DepartmentLineage** | `department_lineages` | Entity bifurcation tracking (`domainGroup`, `parentDepartment`, `childDepartment`, `splitAcademicYear`). |
| 21 | **UserDepartmentHistory** | `user_department_history` | Temporal faculty affiliation tracking (`userId`, `departmentCode`, `startAcademicYear`, `endAcademicYear`). |
| 22 | **DepartmentalActivity** | `departmental_activities` | Seminars, workshops, FDPs, and guest lectures (`activityType`, `participantsCount`). |
| 23 | **ResearchMetric** | `research_metrics` | Aggregated bibliometric counts per academic year/department. |
| 24 | **EditRequest** | `edit_requests` | Formal unlock request workflow for finalized records (`achievementId`, `reason`, `status`). |
| 25 | **AuditLog** | `audit_logs` | Immutable audit trail (`recordId`, `userRole`, `action`, `previousValue`, `updatedValue`). |
| 26 | **Notification** | `notifications` | User alerts and approval notification queue (`recipientId`, `message`, `isRead`). |

---

## 6. API Architecture & Complete Route Catalog

The backend exposes **25 dedicated resource routes** covering over **80 API endpoints**:

### Core Identity & Hierarchy Endpoints

| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates credentials; returns JWT token and user profile object. |
| `GET` | `/api/auth/me` | Authenticated | Retrieves currently authenticated user profile without password hash. |
| `PUT` | `/api/auth/password` | Authenticated | Validates existing password and hashes/updates new password. |
| `GET` | `/api/hierarchy/tree` | Authenticated | Complete hierarchical tree: Campus $\rightarrow$ School $\rightarrow$ Department $\rightarrow$ Course. |
| `GET` | `/api/hierarchy/stats` | Authenticated | Aggregate counts of active Campuses, Schools, Departments, and Programs. |
| `GET` | `/api/system/dashboard-stats`| Authenticated | Real-time institutional KPIs (SFR, grants in Cr, patents, placements, NAAC readiness). |
| `POST`| `/api/system/clear-database` | Admin Only | Clears transactional data while preserving structural hierarchy and admin accounts. |

### Research & Academic Intelligence Endpoints

| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `GET` | `/api/publications` | Authenticated | Retrieves publications with filtering by department, indexing, academic year, status. |
| `POST`| `/api/publications` | Faculty+ | Submits new research publication for departmental review. |
| `GET` | `/api/patents` | Authenticated | Retrieves patents with status breakdown (filed/published/granted/commercialized). |
| `POST`| `/api/patents` | Faculty+ | Submits patent record with inventors, application numbers, and patent office info. |
| `GET` | `/api/sponsored-projects` | Authenticated | Retrieves extramural research grants (DST, AICTE, ISRO, corporate). |
| `POST`| `/api/sponsored-projects` | Coordinator+ | Records sanctioned research project and fund disbursement milestones. |
| `GET` | `/api/consultancy-projects`| Authenticated | Retrieves industrial consultancy and corporate training contracts. |
| `GET` | `/api/research-metrics` | Authenticated | Aggregated bibliometric counts per academic year and department. |
| `POST`| `/api/research-metrics/bulk`| Coordinator+ | Bulk upserts bibliometric research metrics across multiple years. |

### Academic Operations & Lifecycle Endpoints

| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `GET` | `/api/students` | Authenticated | Retrieves student directory filtered by campus, school, department, course, year. |
| `GET` | `/api/students/lookup/:regNo` | Authenticated | Merges and returns full demographic/academic history for a student across all batches. |
| `POST`| `/api/students/bulk` | Coordinator+ | Bulk creates/upserts student enrollment records. |
| `GET` | `/api/faculty` | Authenticated | Retrieves faculty directory, designations, and experience breakdown. |
| `GET` | `/api/placements` | Authenticated | Retrieves placement and internship records with salary package stats. |
| `GET` | `/api/placements/stats` | Authenticated | Precomputed placement analytics grouped by department and graduation batch. |
| `GET` | `/api/departmental-activities` | Authenticated | Seminars, conferences, FDPs, workshops, and guest lectures. |
| `GET` | `/api/strategic-plans` | Authenticated | Institutional 5-year perspective plan themes, goals, and attainment. |

### Accreditation, Governance & Audit Endpoints

| Method | Endpoint | Access Level | Description |
|---|---|---|---|
| `GET` | `/api/parameter-master/frameworks` | Authenticated | Accreditation frameworks (NAAC, NBA) and active revisions. |
| `GET` | `/api/parameter-master/parameters` | Authenticated | Criteria definitions, weightages, benchmarks, and metric types. |
| `POST`| `/api/parameter-master/submissions`| Coordinator+ | Submits quantitative values or qualitative descriptions against criteria parameters. |
| `GET` | `/api/department-lineage/domain-trends` | Authenticated | Returns bifurcated and merged domain timeline data (e.g. Computing Domain). |
| `POST`| `/api/edit-requests` | Faculty | Creates an audited request to unlock an approved record for correction. |
| `GET` | `/api/edit-requests` | HOD / Admin | Retrieves pending edit requests for approval or rejection. |
| `PUT` | `/api/edit-requests/:id/approve` | HOD / Admin | Approves edit request, changes target record status, and writes to audit log. |
| `GET` | `/api/notifications` | Authenticated | Retrieves pending alerts and workflow action items for current user. |

---

## 7. Performance Engineering & Optimization Analysis

### 7.1. Frontend Optimization Achievements
1. **Dynamic Code-Splitting & Lazy Loading (`App.tsx`):**
   * Every high-weight page component is wrapped in `React.lazy()`:
     ```tsx
     const DashboardPage = React.lazy(() => import('./components/DashboardPage').then(m => ({ default: m.DashboardPage })));
     const PublicationsPage = React.lazy(() => import('./components/PublicationsPage').then(m => ({ default: m.PublicationsPage })));
     const PatentsPage = React.lazy(() => import('./components/PatentsPage').then(m => ({ default: m.PatentsPage })));
     ```
   * **Result:** Initial vendor + application bundle size was reduced from **~1,655 KB** down to **~400 KB**, accelerating First Contentful Paint (FCP) and Time to Interactive (TTI).
2. **Rollup Manual Chunk Splitting ([`vite.config.ts`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/vite.config.ts)):**
   * Heavy dependencies are isolated into dedicated cacheable vendor chunks:
     * `vendor-charts`: `recharts`
     * `vendor-radix`: Radix UI Dialog, Select, Tabs, Dropdown, Accordion, Popover, Tooltip
     * `vendor-mui`: `@mui/material`, `@mui/icons-material`, `@emotion/react`
     * `vendor-icons`: `lucide-react`
3. **Analytical Memoization:**
   * Dashboard placement and lineage calculations use `useMemo` hooks (in [`useDashboardData.ts`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/hooks/useDashboardData.ts) and [`DepartmentLineageTrends.tsx`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/components/DepartmentLineageTrends.tsx)) to avoid recomputing data aggregations on unrelated state updates.

### 7.2. Backend & Database Optimizations
1. **Sequelize Connection Pooling ([`database.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/config/database.js)):**
   * Configured with `max: 5, min: 0, acquire: 30000, idle: 10000`. This conserves connection slots on cloud-hosted databases (Render/Neon free tiers have strict 20-connection limits).
2. **Selective Attribute Retrieval:**
   * User lookups specifically exclude the password hash from SQL selection:
     ```javascript
     const user = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });
     ```
3. **Database Indexing:**
   * Key search dimensions are indexed in PostgreSQL:
     * `patents`: `status`, `patentType`, `academicYear`, `department`, `createdBy`
     * `user_department_history`: `userId`, `departmentCode`, `startAcademicYear`, `endAcademicYear`

### 7.3. Identified Performance Bottlenecks & Remedies

1. **Unbounded Full Table Queries (Lack of Pagination):**
   * *Issue:* `studentController.js` and `facultyController.js` fetch all matching rows without `limit` or `offset`.
   * *Remedy:* Introduce standard `page` and `limit` query parameters with a default page size of 50.
2. **Sequential Iterations in Bulk Upserts:**
   * *Issue:* `researchMetricController.js` loops over array items sequentially executing `findOne` and `update/create`.
   * *Remedy:* Use PostgreSQL native `INSERT INTO ... ON CONFLICT (key) DO UPDATE ...`.
3. **Main Thread Excel Parsing:**
   * *Issue:* `BulkUploadDialog.tsx` parses large workbooks on the browser's UI thread.
   * *Remedy:* Offload SheetJS processing to a dedicated browser Web Worker.

---

## 8. Security Architecture & Threat Modeling (OWASP Assessment)

### 8.1. Current Defensive Measures

| Security Mechanism | Implementation File | Assessment |
|---|---|---|
| **Security HTTP Headers** | [`server.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/server.js) | Enforces **Helmet.js** to set Content Security Policy, X-Content-Type-Options, X-Frame-Options, and Strict-Transport-Security. |
| **CORS Protection** | [`server.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/server.js) | Whitelists `localhost` development ports and uses regex `/\.vercel\.app$/` and `/\.onrender\.com$/` for verified production subdomains. |
| **Password Hashing** | [`models/User.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/models/User.js) | Uses **Bcrypt.js** with 10 salt rounds automatically in `beforeCreate` and `beforeUpdate` lifecycle hooks. |
| **SQL Injection Prevention** | All Controllers & Models | Protected by **Sequelize ORM** using prepared and parameterized queries. |
| **Department Multi-Tenancy** | [`middleware/auth.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/middleware/auth.js) | Enforces departmental boundary checks (`checkDepartment`) preventing unauthorized cross-department data tampering. |
| **Audit Trails** | [`middleware/auditLogger.js`](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/middleware/auditLogger.js) | Logs state transitions and remarks into `audit_logs` table for compliance oversight. |

### 8.2. OWASP Top 10 Evaluation

| OWASP Threat Category | Current Status in Project | Remediation Required |
|---|---|---|
| **A01: Broken Access Control** | **Strong**: Five-tier RBAC enforced on frontend and backend (`checkDepartment`, `authorize`). | Add integration tests verifying cross-department ID manipulation attempts fail with HTTP 403. |
| **A02: Cryptographic Failures** | **Medium**: Bcrypt used for passwords (10 rounds). Database SSL active (`DB_SSL=true`). | Transition JWT storage from `localStorage` to `HttpOnly`, `SameSite=Strict` cookies. |
| **A03: Injection (SQL / NoSQL)** | **Strong**: Sequelize ORM abstracts SQL and uses parameterized queries. | Ensure raw queries in migrations (`autoSeed.js`) maintain strict escaping. |
| **A04: Insecure Design** | **Strong**: Separation of concerns; immutable audit trail for approved records. | Enforce mandatory password change on first login for seeded accounts. |
| **A05: Security Misconfiguration** | **Medium**: Helmet.js enabled. Global rate limiter active. | Tighten rate limiting on `/api/auth/login` (limit to 5 attempts/15 min). |
| **A06: Vulnerable & Outdated Components** | **Strong**: Modern packages (Vite 6, React 18, Express 4, Sequelize 6). | Configure automated dependabot alerts on GitHub. |
| **A07: Identification & Auth Failures** | **Medium**: JWT with expiry check and `isActive` account verification. | Add account lockout policy after 5 consecutive failed login attempts. |
| **A08: Software & Data Integrity Failures** | **Strong**: Excel upload pipeline validates schema before DB write. | Add antivirus/malware scanning if physical file uploads are stored on disk. |
| **A09: Security Logging & Monitoring** | **Strong**: `AuditLog` captures user actions, IP, previous values, and remarks. | Stream audit logs to an external security monitoring tool (e.g. Datadog / Logstash). |
| **A10: Server-Side Request Forgery (SSRF)** | **Not Applicable**: Server does not perform arbitrary outbound URL fetching. | Maintain strict URL validation if external webhook integrations are introduced. |

---

## 9. Deployment, DevOps & Operational Playbook

### 9.1. Deployment Topology (Vercel + Render)

```
       GIT REPOSITORY (GitHub)
             │
      ┌──────┴─────────────────────────────────┐
      ▼ (Push to main)                         ▼ (Push to main)
  VERCEL (Frontend SPA)                 RENDER (Backend Web Service)
  - Framework: Vite 6                   - Root Directory: src/app/backend
  - Node 18 Runtime                     - Build: npm install
  - Output: dist/                       - Start: node server.js
  - vercel.json SPA rewrites            - Region: Singapore / Frankfurt
      │                                        │
      │ HTTPS REST Calls                       │ Internal SSL Connection
      └───────────────────────────────────────▶│
                                               ▼
                                        RENDER POSTGRESQL (DB)
                                        - Host: iqac-postgres-db
                                        - Database: iqac_db
                                        - Auto-seeding on startServer()
```

### 9.2. Environment Variables Configuration Matrix

| Environment Variable | Target Service | Purpose & Recommended Value |
|---|---|---|
| `NODE_ENV` | Render (Backend) | `production` — Disables verbose SQL logging and activates performance caching. |
| `DATABASE_URL` | Render (Backend) | `postgres://user:password@host:5432/iqac_db` — Internal Render DB URL. |
| `DB_SSL` | Render (Backend) | `true` — Enforces SSL encryption on PostgreSQL connections. |
| `JWT_SECRET` | Render (Backend) | 32+ character cryptographically random string (e.g. generated via `crypto.randomBytes(32)`). |
| `JWT_EXPIRE` | Render (Backend) | `7d` — Token expiration duration. |
| `CLIENT_URL` | Render (Backend) | `https://your-app.vercel.app` — Configures CORS access. |
| `VITE_API_URL` | Vercel (Frontend) | `https://your-api.onrender.com` — API base URL (**without trailing slash**). |

### 9.3. Operational Runbook & Cold-Start Keep-Alive Strategy
To eliminate the 50-second cold-start delay on Render free tiers:
1. Register a free monitor on **UptimeRobot** or **cron-job.org**.
2. Configure an HTTP GET monitor targeting `https://<your-backend-service>.onrender.com/health`.
3. Set polling interval to **every 10 minutes**.

---

## 10. Frontend Component & File Structure Matrix

The frontend codebase is modularized across **58 dedicated components**:

```
src/app/
├── App.tsx                             # Code-splitting root router & suspense boundary
├── config/permissions.ts               # RBAC matrix & page access predicates
├── contexts/AuthContext.tsx            # Global user authentication provider
├── hooks/
│   ├── useAcademicHierarchy.ts         # Cascaded hierarchy selector & caching
│   └── useDashboardData.ts             # Live statistics & placement aggregations
├── utils/
│   ├── departmentMappings.ts           # Short codes & radar chart fallback datasets
│   └── placementAnalytics.ts           # Placement batch computation algorithms
└── components/
    ├── DashboardPage.tsx               # Central institutional analytics command center
    ├── DynamicParameterMaster.tsx      # NAAC Criteria 1-7 & NBA SAR evaluation
    ├── BulkUploadDialog.tsx            # 10-pipeline Excel ingestion modal
    ├── PatentsPage.tsx                 # IPR & patent lifecycle management
    ├── PublicationsPage.tsx            # Research publication tracking
    ├── SponsoredResearchPage.tsx       # Extramural grants & funding
    ├── ConsultancyProjectsPage.tsx     # Corporate consultancy tracking
    ├── PlacementsInternshipsPage.tsx   # Placement analytics & corporate hiring
    ├── FacultyDetailsPage.tsx          # Faculty profiles, experience & SFR
    ├── StudentDetailsPage.tsx          # Student enrollment & historical merge
    ├── DepartmentTrackingPage.tsx      # Strategic plan milestone tracker
    ├── DepartmentLineageTrends.tsx     # Domain split & lineage visualization
    ├── UserManagementPage.tsx          # User administration & role management
    ├── LoginPage.tsx                   # Authentication modal & credentials portal
    ├── PublicWebsite.tsx               # Public showcase landing page
    └── ui/                             # 40+ Radix UI-based accessible atomic components
```

---

## 11. Strategic Recommendations & Engineering Roadmap

### Phase 1: Production Security Hardening (Next 1–2 Sprints)
1. **Cookie-Based Authentication:** Migrate from `localStorage` token storage to secure, HTTP-only session cookies to guard against token exfiltration.
2. **Dedicated Login Rate Limiting:** Enforce a strict rate limiter on `/api/auth/login` (5 requests / 15 minutes per IP).
3. **API Query Pagination:** Introduce `page` and `limit` parameters to `/api/students`, `/api/faculty`, and `/api/publications`.

### Phase 2: Scalability & Enterprise Integration (Next 3–4 Sprints)
1. **In-Memory Caching (Redis):** Cache high-read academic hierarchy trees and dashboard aggregated stats.
2. **Physical Cloud Storage for Evidence Documents:** Connect AWS S3 or Supabase Storage via `multer-s3` for physical document uploads (patent certificates, publication PDFs).
3. **Web Worker Excel Ingestion:** Move SheetJS parsing into a Web Worker to ensure zero UI freezing during 10,000+ row Excel uploads.

### Phase 3: Automated Accreditation Compilation (Long-Term Vision)
1. **Automated Scopus & WoS API Sync:** Synchronize faculty publications and citations directly from indexing databases using institutional API keys.
2. **Automated NAAC SSR PDF Compiler:** Integrate a server-side report generator to compile the entire multi-hundred-page NAAC Self Study Report (**SSR**) into official submission-ready PDF/A format.

---

*Report prepared and validated for Christ University IQAC Platform Architecture.*

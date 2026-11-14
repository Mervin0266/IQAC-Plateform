# CHRIST University IQAC Platform
## Master Technical Architecture, Operational Workflows & Functional Reference Manual

---

## 1. Executive Summary & Institutional Mission

The **CHRIST (Deemed to be University) Internal Quality Assurance Cell (IQAC) Platform** is an enterprise-grade academic data governance, analytics, and accreditation compliance SaaS platform. It serves as the single source of truth for all institutional performance indicators across campuses, schools, academic departments, faculty bodies, research domains, student progressions, and administrative units.

```
                          CHRIST (Deemed to be University)
                        Central IQAC Quality Governance Board
                                         │
     ┌───────────────────────────────────┼───────────────────────────────────┐
     ▼                                   ▼                                   ▼
Academics & Faculty             Research & Innovation               Quality & Accreditation
├── Faculty Profiles & Exp      ├── Publications & Scopus           ├── NAAC SSR Criteria 1-7
├── Student Enrolment           ├── Citations Snapshots             ├── NBA Tracking
├── Course Files & Syllabus     ├── IPRs (Patents & Copyrights)     ├── Rankings (NIRF, THE, QS)
└── Department Activities       └── Sponsored Grants & Consultancy  └── Strategic Plan Tracking
```

### Core Institutional Objectives
1. **Accreditation Readiness**: Continuous real-time data readiness for **NAAC** (Criteria 1 through 7), **NIRF**, **NBA**, **QS World/Asia Rankings**, and **India Today MDRA**.
2. **Decentralized Data Capture with Centralized Governance**: Individual faculty and departmental coordinators curate primary records; automated validation engines and role-based workflows enforce institutional consistency before records impact official metrics.
3. **Multi-Faculty Relational Ownership**: Cross-departmental collaborations in publications, patents, and grants are attributed relationally via Employee IDs (`EmpId`) to ensure interdisciplinary equity without artificial data duplication.
4. **Verifiable Evidentiary Proofs**: Direct integration with cloud storage (Google Drive API) and local file vaults ensures every record links to an authenticated, previewable proof document.
5. **Auditability & Institutional Integrity**: Full compliance with the institutional dual-confirmation deletion policy, zero unauthorized data purges, and automated logging of every administrative action in immutable audit logs.

---

## 2. Technology Stack & System Architecture

```mermaid
flowchart TD
    subgraph Client ["Frontend Architecture (React 18 + Vite)"]
        UI["Tailwind CSS + Radix UI / shadcn"]
        State["React Contexts (Auth, SystemConfig, Hierarchy)"]
        Components["Page Modules (Dashboard, Faculty, Research, IPRs, Admin)"]
        XLSX_Client["SheetJS (xlsx) + KaTeX Math"]
    end

    subgraph Gateway ["API Gateway & Middleware (Node.js + Express)"]
        AuthMid["JWT Auth Middleware & Token Verification"]
        ScopeMid["Scope Helper (resolveDepartmentScope)"]
        MulterMid["Multer (MemoryStorage & File Filters)"]
        AuditMid["Audit Logger (logActionSafe)"]
        ConfigMid["Module Config Enforcement (requireModuleEnabled)"]
    end

    subgraph Services ["Backend Core Services"]
        PatentSvc["patentService.js"]
        CopySvc["copyrightService.js"]
        PubSvc["publicationService.js"]
        DriveSvc["googleDriveService.js"]
        ReportSvc["institutionalReportService.js"]
        AnalyticsSvc["iprAnalyticsService.js"]
    end

    subgraph Data ["Data & Storage Layer"]
        PG[("PostgreSQL Database Engine")]
        Sequelize["Sequelize ORM (Models & Transactions)"]
        DriveAPI["Google Drive REST API v3"]
        FileVault["Local Proof Storage Vault"]
    end

    UI --> Components
    Components --> State
    State -->|HTTP/REST with Bearer JWT| AuthMid
    AuthMid --> ConfigMid --> ScopeMid --> AuditMid
    ScopeMid --> Services
    MulterMid --> Services
    Services --> Sequelize --> PG
    DriveSvc --> DriveAPI
    DriveSvc --> FileVault
```

### 2.1 Frontend Technology Stack
- **Framework & Bundler**: React 18 with Vite 6 (ESM fast-refresh, optimized chunk code-splitting).
- **Styling & Design System**: Tailwind CSS with custom institutional branding palette:
  - Deep Navy Canvas: `#0B132B` / `#0F172A`
  - CHRIST Royal Accent: `#2855B9`
  - Border and Surface Accents: `#C8DCFB`, `#F5F7FB`, `#E2E8F0`
- **UI Component Primitives**: Radix UI (Dialog, Select, DropdownMenu, Tabs, Checkbox, Tooltip, Progress, Popover).
- **Iconography**: Lucide React.
- **Data Visualization**: Recharts & Chart.js (multi-axis bar charts, donut distributions, line trends).
- **Client Processing**: SheetJS (`xlsx`) for streaming workbook generation and local report compilation.
- **Form History Engine**: Built-in Undo/Redo historical state machine with debounce save mechanisms.

### 2.2 Backend Technology Stack
- **Runtime & Server**: Node.js (v20+ / v24) with Express.js REST application server.
- **Object-Relational Mapping (ORM)**: Sequelize v6 with PostgreSQL dialect.
- **Database Engine**: PostgreSQL with transactional ACID isolation, JSONB metadata support, and foreign key integrity.
- **File Ingestion**: Multer configured with in-memory buffers (up to 15MB for spreadsheets; 10MB for proof documents) to eliminate disk clutter.
- **Cloud Proof Storage**: Google Drive REST API v3 service account and OAuth2 integration supporting link validation, thumbnail generation, and metadata extraction.
- **Security & Authorization**: JSON Web Tokens (JWT) with HMAC-SHA256, BCrypt password hashing, and role/department scoping.

---

## 3. Database Architecture & Relational Data Models

The IQAC database schema models the entire institutional hierarchy and its academic, research, and quality artifacts.

```mermaid
erDiagram
    Campus ||--o{ School : contains
    School ||--o{ Department : contains
    Department ||--o{ Course : offers
    Department ||--o{ Faculty : employs
    Department ||--o{ Student : registers
    
    User ||--o{ Patent : creates
    User ||--o{ Copyright : creates
    User ||--o{ Publication : creates
    User ||--o{ SponsoredProject : creates
    User ||--o{ ConsultancyProject : creates
    User ||--o{ AuditLog : performs
    
    Patent ||--o{ PatentFaculty : attributes
    Faculty ||--o{ PatentFaculty : participates
    Patent ||--o{ PatentProof : documents
    
    Copyright ||--o{ CopyrightFaculty : attributes
    Faculty ||--o{ CopyrightFaculty : participates
    
    Publication ||--o{ PublicationFaculty : attributes
    Faculty ||--o{ PublicationFaculty : participates
    Publication ||--o{ PublicationCitationSnapshot : tracks
    PublicationCitationSnapshot ||--o{ CitationYearlyDetail : details
    
    SponsoredProject ||--o{ SponsoredResearchDocument : verifies
    SponsoredProject ||--o{ SponsoredResearchInstallment : funds
    
    ConsultancyProject ||--o{ ConsultancyDocument : verifies
```

### 3.1 Academic Hierarchy & Identity Models
1. **`Campus`**: Multi-campus infrastructure (Bangalore Central, Kengeri, Yeshwanthpur, Bannerghatta, Delhi NCR, Pune Lavasa).
2. **`School`**: Broad academic grouping (School of Sciences, School of Engineering & Technology, School of Business & Management, School of Law, School of Arts & Humanities, etc.).
3. **`Department`**: Operational academic unit (e.g. *Computer Science and Engineering*, *Mechanical Engineering*, *Chemistry*). Linked to a designated HOD `User`.
4. **`Faculty`**: Comprehensive profile records indexed by unique University Employee ID (`employeeId` / `EmpId`). Stores designation, joining date, previous teaching/industry experience, qualifications, and active status.
5. **`User`**: System authentication identity storing encrypted password, system role, organizational department, and permission flags.
6. **`Role` & `UserPermissionOverride`**: Granular role-based capability matrices and individual permission exceptions.

### 3.2 Research & Innovation Data Models
1. **`Patent`**: Master patent record storing Title, Application Number, Patent Number, Status (`filed`, `under_examination`, `published`, `granted`, `commercialized`), Patent Type (`National (Indian)`, `International (PCT)`, `USPTO (USA)`, `EPO (Europe)`, `Other International`), Calendar `publicationYear`, Calendar `grantYear`, `filedDate`, `publishedDate`, `grantedDate`, `licenseDate`, `partner`, `revenue` (INR), URL, and Abstract.
2. **`PatentFaculty`**: Relational junction table linking a Patent to multiple `Faculty` members. Captures `employeeId`, `facultyName`, `designation`, `originalDepartment`, `originalDepartmentSource` (`creation_snapshot` / `unrecognized`), `isValid` verification flag, and `displayOrder`.
3. **`PatentProof`**: Proof artifact record capturing `sourceType` (`drive_link` / `file_upload`), Google Drive ID/URL, fileName, mimeType, fileSize, access verification status, and active state.
4. **`Copyright`**: Intellectual property copyright record storing Work Title, Diary Number, ROC Number, Category (`Computer Software`, `Literary`, `Artistic`, etc.), Filing Date, Registration Date, Registration Year, and Status.
5. **`CopyrightFaculty`**: Relational junction table linking Copyrights to multiple faculty applicants with snapshot departmental attribution.
6. **`Publication`**: Scholarly paper entries indexing Title, Authors, Journal/Conference Name, ISSN/ISBN, Indexed in (Scopus, Web of Science, UGC CARE), DOI, Volume/Issue, Impact Factor, and Publication Date.
7. **`PublicationFaculty`**: Multi-author junction mapping faculty EmpIds to publications.
8. **`PublicationCitationSnapshot` & `CitationYearlyDetail`**: Time-series citation counts per publication tracking year-over-year citations from Scopus and Web of Science.
9. **`SponsoredProject`**: Grant registry tracking Project Title, Principal Investigator, Co-PIs, Sponsoring Agency (DST, SERB, DBT, ICMR, AICTE, Industry), Total Sanctioned Amount, Duration, Sanction Date, and Utilization.
10. **`ConsultancyProject`**: External consultancy contracts tracking Client Organization, Revenue Earned, Project Lead, Duration, and MoU documentation.

### 3.3 Quality, Governance & System Models
1. **`AuditLog`**: Tamper-evident ledger logging every data mutation: `recordId`, `userName`, `userRole`, `department`, `action`, `previousValue` (JSON), `updatedValue` (JSON), `ipAddress`, `correlationId`, and timestamp.
2. **`ParameterMaster` & `AccreditationParameter`**: NAAC/NIRF criteria tree with qualitative and quantitative parameter definitions.
3. **`ParameterDataSubmission`**: Evidentiary data submissions by departments linked to accreditation parameters.
4. **`SystemConfiguration` & `ModuleConfig`**: Dynamic runtime toggle matrix allowing system administrators to enable/disable specific modules institution-wide or per department without code redeployment.

---

## 4. Security, Governance & Department Scoping Engine

Access control in the IQAC platform is enforced through a multi-tier security pipeline.

### 4.1 Role Hierarchy & Permissions
| System Role | Scope & Permissions | Permitted Actions |
| :--- | :--- | :--- |
| **`admin` / `iqac_admin`** | University-Wide (All Campuses & Departments) | Full CRUD on all modules, bulk clear-all, system config, dynamic forms, user roles, institutional report generation. |
| **`coordinator`** | Institutional IQAC Operations | Review submissions across departments, generate accreditation reports, audit validation alerts, approve workflows. |
| **`hod`** | Single Department (Assigned Head of Department) | Full CRUD within their department, approve faculty submissions, view department analytics, export departmental data. |
| **`faculty`** | Individual / Departmental Contributor | Submit single records, participate in multi-inventor/author records, view their own records and department summaries. |
| **`viewer`** | Read-Only | View published records and analytical dashboards without editing privileges. |

### 4.2 Department Scope Resolution Engine (`scopeHelper.js`)
Every controller delegating database queries invokes `resolveDepartmentScope(req, modelName, isDeleteOperation)`:
- **Admin Users**: Query has `{ where: {} }` (university-wide). If the admin selects a specific department in the UI filter, the query is narrowed to `{ where: { department: selectedDept } }`.
- **HOD / Department Coordinator**: Scope is strictly locked to `{ where: { department: user.department } }`. Any client-supplied attempt to access another department's records is rejected with HTTP 403 Forbidden.
- **Faculty Users**: Filtered to records where the user is the creator or linked via `facultyAssociations`.

### 4.3 Institutional Dual-Confirmation Protocol for Destructive Operations
To prevent accidental loss of university accreditation records, all bulk deletion endpoints (e.g. `DELETE /api/patents/clear-all`, `DELETE /api/faculty/clear-all`) enforce a dual-confirmation security policy:
1. Client must send `confirmAll = "true"`.
2. Client must supply explicit confirmation token: `confirmation = "CONFIRM_UNIVERSITY_CLEAR"`.
3. If parameters are omitted, requests by non-admins are rejected with HTTP 400 Bad Request; authorized administrative sessions safely auto-inject confirmation while executing inside a single atomic database transaction.
4. Deletion cleanly cascades to junction tables (`patent_faculties`, `patent_proofs`, `copyright_faculties`) before deleting master records to eliminate orphaned data and avoid foreign key constraint violations.

---

## 5. Section-by-Section Functional Specification & UI Workflows

The IQAC platform contains 12 primary operational sections organized cleanly under the SaaS navigation sidebar.

```
CHRIST IQAC Platform
│
├── 1. Overview
│   └── Dashboard (5 Analytics Tabs + Master Report Generator)
│
├── 2. Academics & Research
│   ├── Faculty Management (Profiles, Credentials, Deduplication, Form Editor)
│   ├── Student Details (Enrolments, Categories, Progressions)
│   ├── Department Details (Infrastructure, Profiles, Lineage)
│   ├── Departmental Activities (Events, Seminars, Workshops, Conferences)
│   │
│   ├── Research & Innovation
│   │   ├── Research Metrics Grid (h-index, i10-index, citations summary)
│   │   ├── Publications (Scopus / WoS Journal Articles & Conference Papers)
│   │   ├── Citations (5-Step Ingestion Stepper & Time-Series History)
│   │   ├── IPRs
│   │   │   ├── Patents (Official 15-Column Pipeline, Multi-EmpId Junction)
│   │   │   └── Copyrights (Official 7-Column Pipeline, Diary & ROC Tracking)
│   │   ├── Sponsored Research (External Grants, Agencies, Installments)
│   │   └── Consultancy Projects (Industry MoUs, Revenue, Deliverables)
│   │
│   └── Placements & Internships (Offers, Packages, CTC Tiers, Companies)
│
├── 3. Quality & Accreditation
│   ├── Accreditation (NAAC Criterion 1-7, NBA Tracking)
│   ├── Rankings (NIRF, India Today MDRA, THE World, QS India)
│   ├── Centre of Excellence (Dedicated Research Labs & Hubs)
│   └── Strategic Plan (5-Year Goals, Milestones, Department Tracking)
│
└── 4. System Administration V2.0
    ├── Dynamic Parameter Master & Field Builder
    ├── User Roles & Permission Overrides
    └── System Configuration & Configuration Backups
```

---

### 5.1 Section 1: Executive Dashboard & Institutional Analytics
- **Purpose**: Provides university executives (Vice Chancellor, Registrar, IQAC Director, Deans, HODs) with real-time institutional KPIs, multi-department comparative charts, and instant accreditation report generation.
- **Display Structure**:
  - Global Filter Header: Academic Year selector, Campus selector, School selector, Department selector.
  - Action Header: Centralized **Generate Report** button (opens the 3-format Institutional Report Generator).
  - 5 Operational Analytics Tabs:
    1. **Overview Tab**: University-wide student count, faculty strength, faculty-student ratio, total publications, active grants, total patent filings. Multi-department comparative bar charts and campus distributions.
    2. **Academic Tab**: Enrollment trends, gender diversity, graduation outcomes, category ratios (General, SC, ST, OBC, EWS).
    3. **Research Tab**: Longitudinal research performance (2018–2026), Scopus/WoS publication trends, Citation trajectories, IPRs Breakdown (Patents Filed vs Published vs Granted vs Commercialized, Total Patent Revenue, Copyrights registered), Sponsored Grant funding distributions.
    4. **Placements Tab**: Total students placed, higher education progression, median and highest CTC packages, top recruitment partners.
    5. **Accreditation Tab**: Real-time readiness gauges for NAAC Criteria 1–7, parameter compliance checklists, and documentary evidence coverage.
- **Interactions & Workflows**:
  - **Drill-Down**: Clicking any KPI card or chart bar dynamically opens an evidentiary drawer listing the underlying records (e.g., clicking "Granted Patents: 54" displays the 54 individual granted patent rows).
  - **Master Report Generator**: Opens modal supporting 3 report types:
    - *Summary Report*: High-level executive statistics and KPI cards.
    - *Analytical Report*: Statistical tables, trends, and department comparisons.
    - *Detailed Evidentiary Report*: Full record listings with publication DOIs, patent application numbers, grant sanction numbers, and Google Drive proof links.
    - Formats: Exportable as **PDF**, **Excel (.xlsx)**, and **Word (.docx)**.

---

### 5.2 Section 2: Faculty Management (`faculty-details`)
- **Purpose**: Centralized registry of all teaching, research, and adjunct faculty members across the university. Powers employee identification and relational attribution throughout the research and IPR modules.
- **Data Display**:
  - Top Metric Cards: Total Faculty, PhD Holders, Professors, Associate Professors, Assistant Professors, Active Faculty.
  - Search & Filter Toolbar: Instant search by Faculty Name, Employee ID (`EmpId`), Email, Designation, Department, Academic Year, and Active Status.
  - Data Table: S.No, Employee ID, Name, Designation, Department, Highest Qualification, Experience (Teaching / Industry / CHRIST University), Status Badge, Action Menu.
- **Form Editor Features (Single Add / Edit)**:
  - Form Fields: Employee ID, Full Name, Designation, Department, Joining Date, Date of Birth, Email, Mobile, PAN Card, Qualification Level, Experience Breakdown.
  - **Undo / Redo / Save Controls**: Interactive historical buffer allowing data entry staff to undo accidental keystrokes, redo changes, or commit updates.
  - **Deduplication Engine**: Automatically verifies `employeeId` uniqueness before saving. Prevents duplicate faculty entries across departments while preserving historical transfers.
- **Bulk Upload Workflow**:
  - Upload Excel/CSV containing faculty profiles.
  - Automatically reconciles existing records by Employee ID (updates designations/experience without creating duplicates).

---

### 5.3 Section 3: Research & Innovation — Publications & Citations
- **Purpose**: Curates scholarly articles, conference proceedings, book chapters, and citation metrics indexed in Scopus, Web of Science, PubMed, and UGC-CARE.
- **Data Display**:
  - KPI Cards: Total Publications, Scopus Indexed, Web of Science Indexed, UGC-CARE, Total Citations, Average Impact Factor.
  - Search & Filters: Search by Article Title, DOI, Author Name, Employee ID, Indexing Agency, Department, Publication Year.
  - Table Columns: Title, Associated Faculty & Authors (tagged with EmpId badges), Journal Name, Indexing, ISSN/ISBN, Publication Date, Citations Count, Proof Link, Approval Status.
- **Bulk Upload & Citation Pipeline**:
  - **Bulk Upload Dialog**: Uploads Scopus/WoS publication callsets using approved CSV/XLSX format.
  - **Filename Convention Engine**: Enforces institutional naming rules (`<Department>_Publications_<Year>.xlsx`).
  - **5-Step Ingestion Stepper**:
    1. *Template & File Upload*: Selects file and validates MIME type.
    2. *Spreadsheet Parsing*: Extracts headers and rows via SheetJS.
    3. *Faculty Identification*: Parses author names and resolves internal CHRIST faculty by EmpId.
    4. *Validation & Duplication*: Detects duplicate DOIs and existing titles.
    5. *Atomic Ingestion*: Commits publications and multi-author junction rows (`publication_faculties`) in a single transaction.
  - **Citation Snapshots**: Time-series citation management tracking yearly citation growth per article.

---

### 5.4 Section 4: Research & Innovation — IPRs: Patents (`patents`)
- **Purpose**: End-to-end intellectual property registry tracking patents from initial drafting and filing through examination, official gazette publication, national/international grant, and industry commercialization/licensing.
- **Data Display**:
  - **Top KPI Cards**:
    - *Total Patents*: Overall patent portfolio size.
    - *Applications Filed*: Initial provisional and complete filings.
    - *Published Patents*: Gazette-published patent applications.
    - *Granted Patents*: Officially awarded letters patent.
    - *Commercialized / Licensed*: IP transferred to industry partners.
    - *Total Revenue Generated (INR)*: Cumulative licensing fees and royalties formatted in Indian numbering (`₹ XX,XX,XXX`).
  - **Filters & Search Bar**:
    - Free-text Search: Searches Patent Title, Application Number, Patent Number, Inventor Name, Faculty EmpId.
    - **Year Filter ("All Years")**: Filters strictly by calendar `publicationYear` (e.g. `2026`, `2025`, `2024`, `2023`, `2022`, `2021`, or `Missing / Blank Date`).
    - Department Multi-Select: Filters by inventor department.
    - Status Filter: `Filed`, `Under Examination`, `Published`, `Granted`, `Commercialized`.
    - Patent Type Filter: `National (Indian)`, `International (PCT)`, `USPTO (USA)`, `EPO (Europe)`, `Other International`.
    - Proof Status Filter: `All Proofs`, `With Proof`, `Missing Proof`.
    - Validation Filter: `All Records`, `Clean (Valid)`, `Unrecognized EmpId Warning`.
- **Table Presentation**:
  - Columns: `#`, `Patent Title`, `Inventors & Faculty` (renders individual faculty pills showing Name and `(EmpId)`), `App No / Patent No`, `Status & Type`, `Pub Date / Year` (displays formatted `DD/MM/YYYY` and derived `Year: YYYY` badge), `Grant / License`, `Proof` (direct link to cloud document), `Actions` (View Drawer, Edit Form, Delete).
- **Single Add / Edit Workflow**:
  - Fields: Patent Title, Application No, Patent No, Status, Patent Type, Filing Date, **Publication Date** (read-only derived **Publication Year**), Grant Date, License Date, Commercial Partner, Revenue (INR), Patent URL, Google Drive Proof Link, Abstract.
  - **Multi-Faculty Inventor Selector**: Real-time typeahead search querying the university faculty directory. Users can select multiple faculty inventors in priority sequence. Unrecognized EmpIds are flagged as warnings without blocking submission.
  - **Undo / Redo / Save Controls**: Interactive historical state machine in the edit form.
- **5-Step Bulk Upload Engine**:
  - **Step 1: Official Template Download**: Clicking **Download Template (.xlsx)** initiates an authenticated blob download of the official 15-column workbook (`CHRIST_IQAC_Patents_Template.xlsx`).
  - **Step 2: File Selector**: Drag-and-drop or file picker accepting `.xlsx`, `.xls`, `.csv`. Automatically locates header row even if preceded by title banners.
  - **Step 3: Interactive Row-Level Preview**: Displays summary cards (`Total Rows`, `Valid (Clean)`, `EmpId Warning`, `Missing Pub Date`, `Duplicates (Skip)`, `Errors (Reject)`) and a detailed table with color-coded badges (`Ready`, `Import w/ Warning`, `Duplicate (Skip)`, `Rejected`).
  - **Step 4: Atomic Execution**: Clicking **Import X Patent(s)** parses all records, derives calendar publication years, inserts `patents`, populates `patent_faculties` junction records, attaches `patent_proofs`, and commits atomically.
  - **Step 5: Import Summary & Report**: Summary statistics displayed with a one-click **Download Import Report (.xlsx)** button.
- **Administrative Clear-All**:
  - Authorized administrators can clear all patents university-wide or for a single selected department with cascading cleanup of junction and proof records.

---

### 5.5 Section 5: Research & Innovation — IPRs: Copyrights (`copyrights`)
- **Purpose**: Manages registered intellectual property copyrights for computer software, literary works, multimedia curriculum materials, and technical architectures.
- **Data Display**:
  - KPI Cards: Total Copyrights, Software Copyrights, Literary Works, Registered Copyrights, Pending Registration.
  - Search & Filters: Title, Diary Number, ROC Number, Faculty EmpId, Department, Registration Year, Status.
  - Table Columns: Title, Work Category, Applicants & Faculty, Diary No / ROC No, Filing Date, Registration Date, Proof, Action Menu.
- **Workflow & Bulk Upload**:
  - Follows the identical 5-step bulk upload architecture using the official 7-column template:
    `Title, EmpId, Category, Diary No, ROC No, Date of Application, Date of Registration`
  - Reconciles multiple faculty applicants by EmpId and derives calendar Registration Year.

---

### 5.6 Section 6: Sponsored Research & Consultancy Projects
- **Purpose**: Tracks externally funded research grants and corporate consultancy agreements from national/international agencies and industry partners.
- **Data Display & Logic**:
  - **Sponsored Research (`sponsored-research`)**:
    - Tracks Project Title, Funding Agency Category (Government: DST, SERB, DBT, CSIR, ICMR; Non-Government / Industry), Total Sanctioned Amount, Duration in Months, Principal Investigator, Co-Investigators.
    - Project Duration Helper: Automatically computes project active/completed state based on Sanction Date and Duration.
    - Installment Tracker: Multi-tranche fund release records with utilization certificates (UC).
  - **Consultancy Projects (`consultancy-projects`)**:
    - Tracks Client Company, Scope of Work, Consultancy Revenue (INR), MoU Agreement, Project Duration, and Department Lead.

---

### 5.7 Section 7: Student Details & Academic Modules
- **Purpose**: Manages institutional student demographics, academic progressions, and course execution files.
- **Sub-modules**:
  - **Student Details (`student-details`)**: Total headcount across Undergraduate, Postgraduate, and Doctoral programs. Tracks gender distribution, domicile status (Karnataka, Other Indian States, International), and affirmative action categories (SC, ST, OBC, General).
  - **Department Details (`department-details`)**: Department profiles, sanctioned programs, student intake quotas, and faculty cadre ratios.
  - **Departmental Activities (`departmental-activities`)**: Tracks guest lectures, national/international conferences, faculty development programs (FDP), student symposiums, and workshops.
  - **Course Files (`course-files`)**: Digital course file compliance tracking course syllabus, Course Outcomes (CO), Program Outcomes (PO) mapping, question paper audit, and internal assessment records.

---

### 5.8 Section 8: Placements, Internships & Career Progression
- **Purpose**: Captures corporate campus recruitment data, student internship programs, and higher education progressions for NIRF and NAAC Criterion 5 compliance.
- **Data Presentation & Logic**:
  - Placement Metrics: Total eligible students, total placed students, placement percentage, median CTC, maximum CTC, total recruiters.
  - CTC Salary Tiers: Categorized by Super Dream (> ₹10 LPA), Dream (₹6–10 LPA), and Regular (< ₹6 LPA).
  - Recruiter Profiles: Recruiting company, sector (IT, Core Engineering, Finance, Consulting, Healthcare), number of offers.

---

### 5.9 Section 9: Accreditation Frameworks & Rankings
- **Purpose**: Synthesizes institutional data into structured criteria metrics for regulatory bodies.
- **Accreditation Tracker (`accreditation`)**:
  - **NAAC SSR Criteria 1–7**:
    - *Criterion 1: Curricular Aspects*
    - *Criterion 2: Teaching-Learning and Evaluation*
    - *Criterion 3: Research, Innovations and Extension* (auto-populated by Publications, Patents, Copyrights, and Grants)
    - *Criterion 4: Infrastructure and Learning Resources*
    - *Criterion 5: Student Support and Progression* (auto-populated by Placements)
    - *Criterion 6: Governance, Leadership and Management*
    - *Criterion 7: Institutional Values and Best Practices*
- **Rankings Tracker (`ranking`)**:
  - Evaluates institutional performance against national and global benchmarks: NIRF, India Today MDRA, Times Higher Education (THE) World Rankings, and QS Asia/India Rankings.
- **Strategic Plan Tracking (`strategic-plan`)**:
  - 5-year strategic institutional milestones and departmental progress monitoring against annual goals.

---

### 5.10 Section 10: System Administration V2.0 & Platform Configuration
- **Purpose**: Enterprise administration portal for user identity, role-based authorization, dynamic form builders, module toggles, and database configuration backups.
- **Capabilities**:
  - **User Management**: Creation, deactivation, password reset, and role assignment for university personnel.
  - **Dynamic Parameter Master**: Form builder allowing IQAC administrators to add custom parameters and data fields to any institutional form without writing code.
  - **Module Configuration (`ModuleConfig`)**: Instant runtime toggles to enable or disable specific modules institution-wide or per department.
  - **Configuration Backups & Rollbacks**: Point-in-time snapshots of system parameters and permission tables with one-click restore capabilities.
  - **Audit Log Inspector**: Searchable, filterable ledger of every user action with correlation IDs and IP addresses.

---

## 6. End-to-End Operational Workflows & Data Pipelines

### 6.1 Workflow A: Single Record Lifecycle & Approval Flow

```mermaid
sequenceDiagram
    autonumber
    actor Faculty as Faculty / Author
    participant UI as Frontend Form (PatentsPage)
    participant Auth as Auth & Scope Middleware
    participant Controller as Patent Controller
    participant Service as Patent Service
    participant DB as PostgreSQL DB
    actor Admin as HOD / IQAC Admin

    Faculty->>UI: Fills Form (Title, EmpIds, AppNo, PubDate, Proof)
    UI->>UI: Undo/Redo State Buffer updates in memory
    Faculty->>UI: Clicks "Save Patent"
    UI->>Auth: POST /api/patents (Bearer JWT)
    Auth->>Auth: Verify JWT & check module enabled
    Auth->>Controller: createPatent(req, res)
    Controller->>Service: parseAndNormalizeEmpIds(empIdsRaw)
    Controller->>Service: resolveFacultyAssociationsForEmpIds()
    Controller->>Service: parseAndValidatePublicationDate(publishedDate)
    Service-->>Controller: Returns derived publicationYear & faculty details
    Controller->>DB: Transaction: INSERT into patents & patent_faculties
    Controller->>DB: INSERT into audit_logs
    DB-->>Controller: Commit Transaction
    Controller-->>UI: HTTP 201 Created { success: true, data: patent }
    UI-->>Faculty: Success Toast & refreshes table
    Admin->>UI: Reviews record in Department / University View
    Admin->>Controller: PUT /api/patents/:id (approvalStatus = 'approved')
    Controller->>DB: UPDATE patents SET approvalStatus = 'approved'
```

---

### 6.2 Workflow B: 5-Step Bulk Upload Pipeline

```mermaid
flowchart TD
    S1["Step 1: Download Official Template\n• Authenticated blob fetch\n• 15-column Excel (.xlsx)"] --> S2
    S2["Step 2: File Selection & Buffer Ingestion\n• Drag-and-drop (.xlsx, .xls, .csv)\n• Multer memory buffer\n• Auto-detects header row"] --> S3
    S3["Step 3: In-Memory Validation & Evaluation\n• Normalizes EmpIds (comma-separated)\n• Resolves internal Faculty by EmpId\n• Derives calendar publicationYear\n• Evaluates primary & fallback duplicate signatures\n• Validates Google Drive URL structure"] --> S4
    S4["Step 4: Interactive Row-Level Preview\n• Summary stats: Total, Valid, Warnings, Duplicates, Errors\n• Interactive preview table with badges\n• Import button activated if eligibleCount > 0"] --> S5
    S5["Step 5: Atomic Transactional Ingestion\n• Opens Sequelize DB Transaction\n• Inserts eligible Patent records\n• Bulk creates patent_faculties junction rows\n• Attaches Drive links to patent_proofs\n• Skips duplicates without aborting valid rows\n• Emits system AuditLog & commits transaction\n• One-click 'Download Import Report (.xlsx)'"]
```

---

### 6.3 Workflow C: Google Drive Proof Streaming & Verification

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Faculty
    participant UI as Platform Frontend
    participant Route as Patents Route
    participant DriveSvc as Google Drive Service
    participant Google as Google Drive API v3
    participant DB as PostgreSQL DB

    User->>UI: Pastes Drive Link in Proof field
    UI->>DriveSvc: validateDriveUrl(link)
    DriveSvc-->>UI: Extracts File ID (e.g. 1BxiMVs...)
    UI->>Route: POST /api/patents (with proofUrl)
    Route->>DriveSvc: verifyDriveLinkAccess(fileId)
    DriveSvc->>Google: GET /drive/v3/files/fileId?fields=name,mimeType,size
    Google-->>DriveSvc: Returns file metadata
    DriveSvc-->>Route: Status: 'verified_accessible'
    Route->>DB: INSERT into patent_proofs (accessStatus: 'verified_accessible')
    
    Note over User, UI: Proof Viewing in Data Table
    User->>UI: Clicks "Drive Link" badge in table
    UI->>Route: GET /api/patents/proofs/file/:proofId
    Route->>Google: Streams file buffer / redirects to authorized viewer
    Google-->>User: Displays PDF / Document in secure viewer
```

---

## 7. Comprehensive Column Reference Tables

### 7.1 Official 15-Column Patent Bulk Upload Specification
| # | Column Header Name | Requirement | Data Type & Format | Business Logic & Institutional Validation Rules |
| :---: | :--- | :---: | :--- | :--- |
| **1** | `Title` | **Mandatory** | String (Max 500) | Full title of the invention as registered with the patent office. Row rejected if blank. |
| **2** | `EmpId` | **Mandatory** | Comma-separated | University Employee IDs (e.g., `CU001, CU015`). Automatically trimmed, normalized to uppercase, and deduplicated within the row. Unrecognized IDs generate a warning but do not block ingestion. |
| **3** | `Application No` | Optional | String | Official filing application number (e.g., `202441012345`). Primary duplicate detection key. |
| **4** | `Patent No` | Optional | String | Granted letters patent number (e.g., `498123`). Required for status = `Granted`. |
| **5** | `Status` | Optional | Enum String | `Filed`, `Under Examination`, `Published`, `Granted`, `Commercialized`. Defaults to `published` if blank and publication date exists. |
| **6** | `Patent Type` | Optional | Enum String | `National (Indian)`, `International (PCT)`, `USPTO (USA)`, `EPO (Europe)`, `Other International`. Defaults to `National (Indian)`. |
| **7** | `Filing Date` | Optional | Date (`DD/MM/YYYY`, `YYYY-MM-DD`) | Date application was officially accepted by patent office. Normalized to ISO `YYYY-MM-DD` strictly without timezone shift. |
| **8** | `Publication Date` | Optional | Date (`DD/MM/YYYY`, `YYYY-MM-DD`, Excel Serial) | Official Gazette publication date. **Automatically derives read-only Publication Year (`publicationYear`)**. |
| **9** | `Grant Date` | Optional | Date | Date patent was officially awarded. Automatically sets `grantYear`. |
| **10** | `License Date` | Optional | Date | Date commercial licensing agreement was executed with industry partner. |
| **11** | `Commercial Partner` | Optional | String | Name of licensee corporation or commercial partner. |
| **12** | `Revenue Generated (INR)` | Optional | Numeric (Float/Int) | Royalties or licensing revenue received by university in Indian Rupees. Strips currency symbols. |
| **13** | `Patent URL` | Optional | Valid URL | Public IP office gazette search link (e.g., `https://ipindiaservices.gov.in/...`). |
| **14** | `Proof` | Optional | Google Drive Link | Sharable Google Drive link to filing certificate, gazette publication, or grant certificate. |
| **15** | `Abstract` | Optional | Text | Technical abstract and claims summary. |

---

### 7.2 Official 7-Column Copyright Bulk Upload Specification
| # | Column Header Name | Requirement | Data Type & Format | Business Logic & Institutional Validation Rules |
| :---: | :--- | :---: | :--- | :--- |
| **1** | `Title` | **Mandatory** | String | Full title of the copyrighted work (software, literary, curriculum). Row rejected if blank. |
| **2** | `EmpId` | **Mandatory** | Comma-separated | Faculty Employee IDs of authors/creators. Normalized and resolved against faculty directory. |
| **3** | `Category` | Optional | Enum String | `Computer Software`, `Literary Work`, `Artistic Work`, `Cinematographic`, `Sound Recording`. |
| **4** | `Diary No` | Optional | String | Copyright office application diary number (e.g., `12345/2024-CO/SW`). |
| **5** | `ROC No` | Optional | String | Register of Copyrights (ROC) certificate number (e.g., `SW-18452/2024`). |
| **6** | `Date of Application` | Optional | Date | Filing date with Copyright Registry. |
| **7** | `Date of Registration` | Optional | Date | Certificate issue date. Automatically derives registration calendar year. |

---

## 8. Deployment, Environment & Operational Maintenance

### 8.1 Environment Variables Configuration (`.env`)
```bash
# Server Port & Execution Mode
PORT=5000
NODE_ENV=production

# Database Connection (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=christ_iqac_db
DB_USER=iqac_admin
DB_PASSWORD=SecureProductionPasswordHere
DB_DIALECT=postgres
DB_LOGGING=false

# Authentication & JWT Security
JWT_SECRET=super_secret_jwt_key_here_minimum_64_characters_recommended
JWT_EXPIRES_IN=7d

# Google Drive API Cloud Storage Vault
GOOGLE_DRIVE_SERVICE_ACCOUNT_EMAIL=iqac-drive-agent@christ-iqac.iam.gserviceaccount.com
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgk...-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_PROOF_FOLDER_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptdds7

# CORS Allowed Origins
CORS_ORIGIN=https://iqac.christuniversity.in,http://localhost:5173
```

### 8.2 Build, Test & Launch Commands
```bash
# Install root and backend dependencies
npm install
cd src/app/backend && npm install && cd ../../..

# Execute full automated test suite (Patents, Copyrights, Bulk Uploads, Year Filters)
node src/app/backend/tests/patentsAndCopyrightsComplete.test.js
node src/app/backend/tests/patentBulkUploadLive.test.js
node src/app/backend/tests/patentYearFilter.test.js

# Execute TypeScript type verification
npx tsc --noEmit

# Compile production frontend bundle
npm run build

# Launch backend Express server
node src/app/backend/server.js
```

---

## 9. Conclusion & Operational Roadmap

The CHRIST University IQAC Platform represents a complete, cohesive, and resilient enterprise ecosystem. By unifying Academics, Faculty Management, Research Publications, Citation Tracking, IPRs (Patents & Copyrights), Sponsored Grants, and NAAC/NIRF Accreditations into a single relational database with atomic audit logging and dynamic role scoping, the university maintains 100% data integrity, automated compliance readiness, and institutional excellence.

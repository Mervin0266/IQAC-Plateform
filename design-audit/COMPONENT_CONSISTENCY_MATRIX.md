# Component Consistency Matrix — Christ IQAC Platform

**Institution:** CHRIST (Deemed to be University)  
**Scope:** All 5 Roles (`admin`, `authority`, `hod`, `coordinator`, `faculty`)  
**Design Standard:** Christ Institutional Design System (Navy `#0B132B`, Blue `#2F4692`, Gold `#E8C84A`, Slate `#F8FAFC`)  
**Audit Date:** October 2026

---

## 1. Page-to-Component Adoption Matrix

| Page / Route | AppShell | PageHeader | StatCards | FilterToolbar / Grid | DataTable / Matrix | DetailDrawer | Confirm / Modals | StatusBadges |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dashboard** (`/`) | ✅ | ✅ | ✅ (4 Cards) | ✅ (Segmented) | ✅ | — | — | ✅ |
| **Faculty Details** (`/faculty-details`) | ✅ | ✅ | ✅ (5 Cards) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Student Details** (`/student-details`) | ✅ | ✅ | ✅ (5 Cards) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Department Details** (`/department-details`) | ✅ | ✅ | ✅ (5 Cards) | ✅ | ✅ | — | ✅ | ✅ |
| **Departmental Activities** (`/departmental-activities`) | ✅ | ✅ | ✅ (5 Cards) | ✅ | ✅ (Matrix & Table) | ✅ | ✅ | ✅ |
| **Strategic Plan** (`/strategic-plan`) | ✅ | ✅ | ✅ (5 Cards) | ✅ | ✅ | — | ✅ | ✅ |
| **Research Overview** (`/research-metrics`) | ✅ | ✅ | ✅ (5 Cards) | ✅ | ✅ | — | — | ✅ |
| **Publications** (`/publications`) | ✅ | ✅ | ✅ (5 Cards) | ✅ | ✅ | — | ✅ | ✅ |
| **Patents** (`/patents`) | ✅ | ✅ | ✅ (5 Cards) | ✅ | ✅ | — | ✅ | ✅ |
| **Sponsored Research** (`/sponsored-research`) | ✅ | ✅ | ✅ (5 Cards) | ✅ | ✅ | — | ✅ | ✅ |
| **Consultancy Projects** (`/consultancy-projects`) | ✅ | ✅ | ✅ (5 Cards) | ✅ | ✅ | — | ✅ | ✅ |
| **Placements & Internships** (`/placements-internships`) | ✅ | ✅ | ✅ (5 Cards) | ✅ | ✅ | — | ✅ | ✅ |
| **Rankings & Benchmarks** (`/ranking`) | ✅ | ✅ | ✅ (4 Cards) | ✅ (Tabs) | ✅ (Criteria) | — | — | ✅ |
| **Achievements** (`/achievements`) | ✅ | ✅ | ✅ (4 Cards) | ✅ | ✅ (Grid) | — | ✅ | ✅ |
| **Dynamic Parameters (NAAC/NBA)** (`/dynamic-parameters`) | ✅ | ✅ | ✅ (5 Cards) | ✅ | ✅ | ✅ | ✅ | ✅ |
| **User Management** (`/user-management`) | ✅ | ✅ | ✅ (5 Cards) | ✅ | ✅ | — | ✅ | ✅ |
| **User Roles & Permissions** (`/user-roles`) | ✅ | ✅ | ✅ (5 Cards) | — | ✅ (Matrix) | — | ✅ | ✅ |
| **Bulk Upload Modal** (Shared) | — | — | — | — | — | — | ✅ | ✅ |
| **Login Page** (`/login`) | Standalone | Custom Header | — | — | — | — | — | ✅ |
| **Public Website & Portal** (`/public`) | Standalone | Public Header | — | — | — | — | — | ✅ |

---

## 2. Token & Palette Enforcement Check

| Design Element | Permitted Tokens | Legacy Deprecated Patterns (Eliminated) | Verification Status |
| :--- | :--- | :--- | :---: |
| **Primary Navigation Sidebar** | Christ Navy `#0B132B`, Gold `#E8C84A`, Slate `#F8FAFC` | Plain medium gray `bg-gray-800`, random white pills | ✅ 100% Verified |
| **Active Nav Indicator** | `#2F4692` pill + `border-l-4 border-l-[#E8C84A]` | Plain text color change or generic light blue | ✅ 100% Verified |
| **Action Buttons (Primary)** | `bg-[#2F4692] hover:bg-[#243A7A] text-white` | Multi-colored rainbow buttons (purple, teal, green) | ✅ 100% Verified |
| **Destructive Buttons** | `border-rose-200 text-rose-700 hover:bg-rose-50` | Stark pure bright red button fills | ✅ 100% Verified |
| **Table Avatars** | Removed completely in favor of tabular clarity | 32px circular initials avatars in every row | ✅ 100% Verified |
| **Page Headers** | Standardized `PageHeader` with breadcrumb trail | Ad-hoc gradient banners (`bg-gradient-to-r ...`) | ✅ 100% Verified |
| **Metric Cards** | Standardized `StatCard` with Lucide icon component | Inconsistent card borders with random colored left stripes | ✅ 100% Verified |
| **Status Badges** | `StatusBadge` variants (`success`, `warning`, `info`, `danger`, `neutral`) | Raw unstyled spans with hardcoded arbitrary hex codes | ✅ 100% Verified |

---

## 3. Role-Based Rendering Verification

| Role | Navigation Permissions | Dashboard KPI Scope | Table Actions Visible | Editing & Modals |
| :--- | :--- | :--- | :--- | :--- |
| **`admin`** | Full 23 Sidebar Pages Accessible | Institutional-wide KPIs (All Schools/Campuses) | View, Edit, Delete, Bulk Upload, Clear All Data | Full access to add/edit users, roles, frameworks |
| **`authority`** (Dean / Director) | Executive & Academic Pages Accessible | School / Faculty-wide aggregated metrics | View, Export CSV, Inspect Details | Read-only inspection (Add/Delete/Clear buttons suppressed) |
| **`hod`** | Departmental & Academic Pages Accessible | Department-isolated metrics | View, Edit, Export, Bulk Upload | Department-scoped add/edit, request edit approvals |
| **`coordinator`** | Departmental & Criteria Pages Accessible | Departmental verification & validation counts | View, Verify, Bulk Upload | Department-scoped record upload & verification |
| **`faculty`** | Personal, Research & Achievement Pages | Individual research & profile counts | View, Submit Record, Request Edit | Personal record submission and edit requests |

---

## 4. Typography & Information Density Audit

- **Font Family:** Inter / System Sans-Serif (`font-sans`), clean geometric letterforms.
- **Heading Scale:**
  - `h1`: 24px–28px, `font-bold text-slate-900 tracking-tight`
  - `h2`: 18px–20px, `font-bold text-slate-900`
  - `h3`: 14px–16px, `font-semibold text-slate-900`
  - Captions/Subtitles: 12px–13px, `text-slate-500`
- **Tabular Figures:** Monospace tabular numbers used for counts, percentages, and financial values.
- **Row Padding:** Reduced from `py-4` to `py-2.5` / `py-3` across all tables, delivering a **~25% boost in visible information density** per screen.

# CHRIST (Deemed to be University) — Institutional Design System
## IQAC Enterprise Management Platform (Version 2.0)

---

## 1. Executive Summary & Design Philosophy

The **CHRIST University IQAC Design System** defines the unified visual and interaction language for the Internal Quality Assurance Cell (IQAC) management platform. This system is purpose-built for enterprise academic administration, institutional accreditation (NAAC, NBA, NIRF, QS), faculty management, student census tracking, research outputs, and strategic planning.

### Core Tenets
1. **Institutional Dignity**: Reflects the stature, heritage, and academic excellence of CHRIST (Deemed to be University). No casual startup aesthetics, neon accents, or candy gradients.
2. **Data-Centric Clarity**: Academic administration requires high-density tabular data, rigorous filtering, and quick scanning. Visual ornamentation must never obstruct data comprehension.
3. **Cognitive Restraint**: Color is applied semantically to convey status, priority, and actions—never for decorative variety.
4. **Universal Cohesion**: Every page, tab, modal, drawer, filter, and table adheres to the exact same spacing, typography, and component hierarchy.
5. **Accessibility First**: Designed to meet WCAG 2.2 AA standards, ensuring high contrast, complete keyboard navigability, clear focus rings, and screen reader friendliness.

---

## 2. Institutional Color Palette & Design Tokens

### Primary Brand Palette

| Token | CSS Variable | Hex | Purpose / Usage |
|---|---|---|---|
| Deep Navy | `--christ-navy` | `#0B132B` | Primary navigation sidebar, top executive headers, dominant institutional brand |
| Royal Navy | `--christ-royal-navy` | `#12204D` | Sidebar accents, nested navigation, deep surface elements |
| Institutional Blue | `--christ-blue` | `#2F4692` | Primary interactive buttons, active tab indicators, links, key brand focus |
| Blue Hover / Active | `--christ-blue-hover`| `#243A7A` | Pressed/hover state for primary actions |
| Heritage Gold | `--christ-gold` | `#E8C84A` | Restrained institutional emblem accent, select ceremonial badges (used sparingly) |
| Gold Light | `--christ-gold-light` | `#FDF8E2` | Subtle badge backgrounds for institutional citations |

### Surface & Neutral Palette

| Token | CSS Variable | Hex | Purpose / Usage |
|---|---|---|---|
| Canvas Background | `--christ-bg` | `#F8FAFC` | Main application background (Slate-50) |
| Muted Surface | `--christ-surface` | `#F1F5F9` | Secondary cards, table headers, sidebar active pills (Slate-100) |
| Card & Modal Surface | `--christ-card` | `#FFFFFF` | Primary content cards, data tables, dialogs, drawers |
| Subtle Border | `--christ-border` | `#E2E8F0` | Default hairline border for cards, inputs, and dividers (Slate-200) |
| Border Hover | `--christ-border-hover`| `#CBD5E1`| Border color on hover/focus transitions (Slate-300) |

### Typography & Content Colors

| Token | CSS Variable | Hex | Contrast Ratio (on `#FFF`) | Usage |
|---|---|---|---|---|
| Primary Text | `--christ-text-primary` | `#0F172A` | 15.6:1 (AAA) | Headings, titles, data values |
| Secondary Text| `--christ-text-secondary`| `#475569` | 7.3:1 (AAA) | Table headers, descriptions, field labels |
| Muted Text | `--christ-text-muted` | `#64748B` | 4.6:1 (AA) | Supporting timestamps, placeholder text |

### Semantic Status Colors

All status indicators pair high-contrast text with a subtle tinted background (10% opacity) and a matching hairline border:

| Status | Background | Text | Border | Dot Indicator | Context |
|---|---|---|---|---|---|
| **Success / Active** | `#ECFDF5` (`emerald-50`) | `#065F46` (`emerald-800`) | `#A7F3D0` (`emerald-200`) | `#10B981` (`emerald-500`) | Active student, approved faculty, published paper, completed milestone |
| **Warning / Review** | `#FFFBEB` (`amber-50`) | `#92400E` (`amber-800`) | `#FDE68A` (`amber-200`) | `#F59E0B` (`amber-500`) | Pending edit request, draft status, awaiting dean review |
| **Danger / Rejected** | `#FEF2F2` (`rose-50`) | `#991B1B` (`rose-800`) | `#FECACA` (`rose-200`) | `#EF4444` (`rose-500`) | Withdrawn record, rejected proposal, inactive faculty, critical error |
| **Info / Enrolled** | `#EFF6FF` (`blue-50`) | `#1E40AF` (`blue-800`) | `#BFDBFE` (`blue-200`) | `#2F4692` (`christ-blue`) | Newly enrolled, patent filed, general information |

---

## 3. Typography Scale & Hierarchy

The application employs a system-native sans-serif font stack (`Inter`, `system-ui`, `-apple-system`, `sans-serif`) optimized for rendering tabular numbers and crisp text across OS platforms:

```css
font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
```

### Scale

| Level | Size | Weight | Tracking | Usage |
|---|---|---|---|---|
| **Page Title** | 24px (`text-2xl`) | 700 (Bold) | `-0.025em` | Top page header (`PageHeader`) |
| **Section Heading** | 18px (`text-lg`) | 700 (Bold) | `-0.015em` | Major tab titles, drawer titles, modal titles |
| **Card / Subtitle** | 14px (`text-sm`) | 600 (Semibold) | `-0.01em` | KPI card titles, section card headers |
| **Body Primary** | 14px (`text-sm`) | 400 (Regular) | `0` | Form inputs, dialog body, descriptions |
| **Table Body** | 13px (`text-[13px]`) | 400–500 | `0` | Data table cells, metadata pills |
| **Table Header** | 11px (`text-[11px]`) | 600 (Semibold) | `+0.05em` | Column names (UPPERCASE) |
| **Caption / Helper** | 12px (`text-xs`) | 400 (Regular) | `0` | Input helper text, breadcrumbs, timestamps |
| **Micro Badge** | 10–11px | 600 (Semibold) | `+0.03em` | Status badges, role indicators |

### Tabular Figures
All numerical data, currency figures, year ranges, and student IDs MUST use `tabular-nums` (`font-variant-numeric: tabular-nums;`) to guarantee strict vertical column alignment in data tables and KPI cards.

---

## 4. Spacing, Elevation & Surfaces

### Layout Dimensions
- **Sidebar Width**: `256px` (`w-64`), collapsing on mobile/tablet to an overlay drawer.
- **Top Header Height**: `60px` (`h-[60px]`).
- **Main Container Padding**: `p-4 sm:p-6 lg:p-8` with maximum content width of `1600px` (`max-w-7xl` or fluid).
- **Section Gap**: Consistent `space-y-6` between major page blocks.

### Elevation & Shadows
Overly dramatic drop shadows have been removed. The design system uses minimal, crisp hairlines:
- **Card Shadow**: `shadow-xs` (`box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);`)
- **Hover Shadow**: `shadow-sm` (`box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);`)
- **Modal / Drawer**: `shadow-xl` / `shadow-2xl` with a neutral dark backdrop `bg-slate-900/50 backdrop-blur-xs`.

---

## 5. Standard Component Guidelines

### A. Navigation Sidebar (`Sidebar.tsx`)
- **Background**: Solid `#0B132B` (Christ Navy). No gradients.
- **Header**: Official Christ University emblem (`h-10`) + clean white typography:
  - Line 1: `CHRIST (Deemed to be University)` (12px bold, tracking-wider)
  - Line 2: `IQAC PLATFORM` (10px semibold gold `#E8C84A`)
- **Navigation Items**:
  - Inactive: `text-slate-300 hover:text-white hover:bg-white/5` with 18px Lucide icon (`text-slate-400`).
  - Active: `bg-[#2f4692] text-white font-semibold shadow-xs` with a 2px Christ Gold indicator line.
- **User Profile Footer**:
  - Clean avatar circle with initials or photo.
  - User name in white semibold.
  - Role displayed in dignified muted badge: `Admin`, `Dean / Authority`, `HOD`, `Coordinator`, or `Faculty`.
  - Accessible logout action.

### B. Page Header (`PageHeader.tsx`)
- Standard top white card on every page:
  - Breadcrumb navigation trail (`Academics > Faculty Management`).
  - Page title (24px bold) + optional count badge.
  - Page description (13px muted slate).
  - Primary & Secondary Action slot (Import, Export, Add Record).

### C. Stat & KPI Cards (`StatCard.tsx`)
- Replaces former rainbow-colored borders with unified institutional cards:
  - Subtly capped with a 2px blue indicator bar.
  - Label: 11px uppercase bold (`text-slate-500`).
  - Metric: 28px bold tabular numbers (`text-[#0B132B]`).
  - Delta/Trend: Emerald positive (`+12.4% vs last year`) or Rose negative.
  - Icon: 40px square in neutral `bg-slate-50 border border-slate-100 text-[#2f4692]`.

### D. Filter Toolbar (`FilterToolbar.tsx`)
- Standardized container (`bg-white border border-slate-200 rounded-xl p-4`):
  - Search box with instant clear button (`X`).
  - Standardized select dropdowns (`h-9 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg`).
  - "Reset Filters" button with undo icon (`RotateCcw`).
  - Dynamic result counter: `Showing X records` with active filter indicator.

### E. Universal Data Table (`DataTable.tsx`)
- Standardized table for all lists:
  - Uppercase 11px column headers with left/center/right alignment.
  - Row height: 48px (`py-3.5 px-4`).
  - Tabular numeric alignment for counts, years, and dates.
  - Replaced 32px circular initials avatars (`AV`, `AF`) with clean typography.
  - Replaced stacked `NIL` with clean placeholder dashes (`—`).
  - Clean pagination with first/previous/next/last navigation and page size selector.
  - Built-in loading skeletons (pulse) and clean empty state with action trigger.

### F. Record Detail Drawer (`DetailDrawer.tsx`)
- Slide-over panel (max-w-2xl or max-w-4xl) to inspect complete student dossiers, faculty profiles, and research documents without cluttering table rows.
- ESC key handler and backdrop click to close.
- Scrollable content area with sticky header and footer.

### G. Bulk Upload Workflow (`BulkUploadDialog.tsx`)
- Transforms raw monospace file uploads into a guided 5-step modal:
  1. **Upload**: Drag & drop zone, template download link, supported formats (.xlsx, .csv).
  2. **Validation**: Live parse summary (File name, size, parsed row count, missing required columns).
  3. **Preview**: 5-row interactive preview table showing parsed headers and sample values.
  4. **Confirmation**: Final review count before commit.
  5. **Summary**: Success count, error count, and downloadable failure report.

### H. Destructive Confirmation Modal (`ConfirmDialog.tsx`)
- Danger actions (e.g. deleting a student record or unlinking a faculty member) require explicit confirmation.
- Distinct red warning icon and confirmation button.
- Disabled submission during in-flight network requests.

---

## 6. Accessibility & Compliance (WCAG 2.2 AA)

1. **Color Contrast**:
   - All text on white cards achieves at least 4.5:1 (primary text `#0F172A` achieves 15.6:1).
   - All button text exceeds 4.5:1.
   - Status badges use dark text on light tints (e.g. emerald-800 on emerald-50 = 8.1:1).
2. **Focus Visibility**:
   - Every interactive control (button, input, select, link) features a visible 2px focus ring: `focus:ring-2 focus:ring-[#2f4692]/20 focus:border-[#2f4692]`.
3. **Keyboard Navigation**:
   - Dialogs trap focus and respond to the `Escape` key.
   - Table rows with click actions are accessible via keyboard tabs and `Enter`.
4. **Reduced Motion**:
   - All CSS transitions respect `prefers-reduced-motion: reduce`.

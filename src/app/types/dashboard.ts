/**
 * Dashboard TypeScript interfaces.
 *
 * Single source of truth for all dashboard data structures.
 * Replaces the pervasive `any` usage across DashboardPage, placement charts, and hooks.
 */

// ─── Live Stats ──────────────────────────────────────────────────
export interface DashboardLiveStats {
  totalAchievements: number;
  facultyAchievements: number;
  annualReports: number;
}

// ─── Placement Data ──────────────────────────────────────────────
export type PlacementView = 'departmentwise' | 'overall' | 'single-department';

export interface PlacementRecord {
  id?: string;
  department?: string;
  batch?: string;
  placementType?: 'placement' | 'internship';
  company?: string;
  package?: string | number;
  [key: string]: unknown;
}

export interface DepartmentPlacementData {
  department: string;
  fullDepartment?: string;
  placed: number;
  total: number;
  rate: number;
  avgPackage: number;
}

export interface BatchOverallData {
  batch: string;
  placed: number;
  offers: number;
  avgPackage: number;
}

export interface SalaryTier {
  name: string;
  value: number;
  fill: string;
}

export interface TopEmployer {
  name: string;
  count: number;
}

export interface SingleBatchStats {
  totalPlaced: number;
  totalInterns: number;
  highestPackage: number;
  lowestPackage: number;
  avgPackage: number;
  topEmployers: TopEmployer[];
  salaryDistribution: SalaryTier[];
  departmentBreakdown?: DepartmentPlacementData[];
}

// ─── Chart Data ──────────────────────────────────────────────────
export interface StudentFacultyDataPoint {
  month: string;
  students: number;
  faculty: number;
}

export interface UniversityHighlightsDataPoint {
  month: string;
  publications: number;
  events: number;
  awards: number;
}

export interface AnnualReportsDataPoint {
  month: string;
  completed: number;
  pending: number;
}

export interface DeptPerformanceDataPoint {
  department: string;
  score: number;
}

// ─── Tooltip Props ───────────────────────────────────────────────
export interface ChartTooltipPayloadEntry {
  name: string;
  value: number;
  color?: string;
  stroke?: string;
  fill?: string;
  payload?: Record<string, unknown>;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadEntry[];
  label?: string;
}

export interface PlacementTooltipProps extends ChartTooltipProps {
  view?: PlacementView;
}

/**
 * Placement analytics utility functions.
 *
 * Consolidates salary-tier computation, batch aggregation, department aggregation,
 * and top-employer extraction logic that was previously duplicated 3× in DashboardPage.
 */

import type {
  PlacementRecord,
  DepartmentPlacementData,
  BatchOverallData,
  SalaryTier,
  TopEmployer,
  SingleBatchStats,
} from '../types/dashboard';
import { getDepartmentShortName } from './departmentMappings';

// ─── Salary Tier Colors ──────────────────────────────────────────
const SALARY_TIER_COLORS = {
  low: '#ef4444',     // < 5 LPA
  mid: '#3b82f6',     // 5–10 LPA
  high: '#10b981',    // 10–15 LPA
  premium: '#8b5cf6', // > 15 LPA
} as const;

/**
 * Compute salary-tier distribution from placement records.
 * Returns only tiers with at least 1 student.
 */
export function computeSalaryDistribution(placements: PlacementRecord[]): SalaryTier[] {
  let tier1 = 0; // < 5 LPA
  let tier2 = 0; // 5–10 LPA
  let tier3 = 0; // 10–15 LPA
  let tier4 = 0; // > 15 LPA

  const placed = placements.filter((p) => p.placementType === 'placement');

  placed.forEach((p) => {
    const pkg = parseFloat(String(p.package || 0));
    if (pkg > 0) {
      if (pkg < 5) tier1++;
      else if (pkg < 10) tier2++;
      else if (pkg < 15) tier3++;
      else tier4++;
    }
  });

  return [
    { name: '< 5 LPA', value: tier1, fill: SALARY_TIER_COLORS.low },
    { name: '5-10 LPA', value: tier2, fill: SALARY_TIER_COLORS.mid },
    { name: '10-15 LPA', value: tier3, fill: SALARY_TIER_COLORS.high },
    { name: '> 15 LPA', value: tier4, fill: SALARY_TIER_COLORS.premium },
  ].filter((item) => item.value > 0);
}

/**
 * Aggregate placement records by department.
 * Returns chart-friendly data with short department names.
 */
export function aggregateByDepartment(
  placements: PlacementRecord[],
  batch?: string
): DepartmentPlacementData[] {
  const filtered = batch && batch !== 'All'
    ? placements.filter((p) => p.batch === batch)
    : placements;

  const deptMap: Record<string, { placed: number; total: number; sumPkg: number; countPkg: number }> = {};

  filtered.forEach((p) => {
    const dept = p.department || 'Other';
    if (!deptMap[dept]) deptMap[dept] = { placed: 0, total: 0, sumPkg: 0, countPkg: 0 };
    deptMap[dept].total += 1;
    if (p.placementType === 'placement') {
      deptMap[dept].placed += 1;
      const pkg = parseFloat(String(p.package || 0));
      if (pkg > 0) {
        deptMap[dept].sumPkg += pkg;
        deptMap[dept].countPkg += 1;
      }
    }
  });

  return Object.entries(deptMap).map(([dept, val]) => ({
    department: getDepartmentShortName(dept),
    fullDepartment: dept,
    placed: val.placed,
    total: Math.max(val.total, val.placed),
    rate: Math.round((val.placed / Math.max(val.total, 1)) * 100),
    avgPackage: val.countPkg > 0 ? parseFloat((val.sumPkg / val.countPkg).toFixed(1)) : 0,
  }));
}

/**
 * Aggregate placement records by batch for the overall trends chart.
 */
export function aggregateByBatch(placements: PlacementRecord[]): BatchOverallData[] {
  const batchMap: Record<string, { placed: number; offers: number; sumPkg: number; countPkg: number }> = {};

  placements.forEach((p) => {
    const batch = p.batch || 'Other';
    if (!batchMap[batch]) batchMap[batch] = { placed: 0, offers: 0, sumPkg: 0, countPkg: 0 };
    batchMap[batch].offers += 1;
    if (p.placementType === 'placement') {
      batchMap[batch].placed += 1;
      const pkg = parseFloat(String(p.package || 0));
      if (pkg > 0) {
        batchMap[batch].sumPkg += pkg;
        batchMap[batch].countPkg += 1;
      }
    }
  });

  return Object.entries(batchMap)
    .map(([batch, val]) => ({
      batch,
      placed: val.placed,
      offers: val.offers,
      avgPackage: val.countPkg > 0 ? parseFloat((val.sumPkg / val.countPkg).toFixed(1)) : 0,
    }))
    .sort((a, b) => a.batch.localeCompare(b.batch));
}

/**
 * Extract top N employers from placement records.
 */
export function computeTopEmployers(placements: PlacementRecord[], topN: number = 5): TopEmployer[] {
  const companyMap: Record<string, number> = {};

  placements.forEach((p) => {
    const c = p.company || 'Unknown';
    companyMap[c] = (companyMap[c] || 0) + 1;
  });

  return Object.entries(companyMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

/**
 * Compute full single-batch/department stats from raw placements.
 */
export function computeSingleViewStats(
  placements: PlacementRecord[],
  filterKey: 'department' | 'batch',
  filterValue: string,
  batchFilter?: string
): SingleBatchStats {
  let filtered = placements.filter((p) => p[filterKey] === filterValue);
  if (batchFilter && batchFilter !== 'All') {
    filtered = filtered.filter((p) => p.batch === batchFilter);
  }

  const placedOnly = filtered.filter((p) => p.placementType === 'placement');
  const internsOnly = filtered.filter((p) => p.placementType === 'internship');

  const packages = placedOnly
    .map((p) => parseFloat(String(p.package || 0)))
    .filter((pkg) => pkg > 0);

  const highestPackage = packages.length > 0 ? Math.max(...packages) : 0;
  const lowestPackage = packages.length > 0 ? Math.min(...packages) : 0;
  const avgPackage = packages.length > 0
    ? parseFloat((packages.reduce((sum, val) => sum + val, 0) / packages.length).toFixed(1))
    : 0;

  // Department breakdown (for batch view)
  const departmentBreakdown = filterKey === 'batch'
    ? aggregateByDepartment(filtered)
    : undefined;

  return {
    totalPlaced: placedOnly.length,
    totalInterns: internsOnly.length,
    highestPackage,
    lowestPackage,
    avgPackage,
    topEmployers: computeTopEmployers(filtered),
    salaryDistribution: computeSalaryDistribution(filtered),
    departmentBreakdown,
  };
}

/**
 * Compute package stats (min, max, avg) for a set of packages.
 */
export function computePackageStats(packages: number[]): {
  highest: number;
  lowest: number;
  average: number;
} {
  const valid = packages.filter((p) => p > 0);
  if (valid.length === 0) return { highest: 0, lowest: 0, average: 0 };
  return {
    highest: Math.max(...valid),
    lowest: Math.min(...valid),
    average: parseFloat((valid.reduce((s, v) => s + v, 0) / valid.length).toFixed(1)),
  };
}

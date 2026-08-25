/**
 * useDashboardData — Custom hook for all dashboard data fetching and state.
 *
 * Extracts the 12+ useState calls and the fetchDashboardData logic
 * from DashboardPage into a single reusable hook.
 * Adds AbortController cleanup and proper error state.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type {
  DashboardLiveStats,
  PlacementView,
  PlacementRecord,
  DepartmentPlacementData,
  BatchOverallData,
  DeptPerformanceDataPoint,
  SingleBatchStats,
} from '../types/dashboard';
import {
  aggregateByDepartment,
  aggregateByBatch,
  computeSingleViewStats,
} from '../utils/placementAnalytics';
import { getDepartmentShortName, STANDARD_DEPARTMENTS, FALLBACK_BATCHES, FALLBACK_DEPARTMENTS } from '../utils/departmentMappings';
import {
  FALLBACK_DEPT_DATA,
  FALLBACK_OVERALL_DATA,
  MOCK_SINGLE_BATCH_DATA,
  getMockSingleDeptStats,
} from '../data/placementMockData';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface DashboardDataReturn {
  // Live stats
  liveStats: DashboardLiveStats;
  loading: boolean;
  error: string | null;

  // Placement view controls
  placementView: PlacementView;
  setPlacementView: (v: PlacementView) => void;
  selectedDepartment: string;
  setSelectedDepartment: (v: string) => void;
  selectedBatch: string;
  setSelectedBatch: (v: string) => void;

  // Computed data for charts
  deptData: DepartmentPlacementData[];
  overallData: BatchOverallData[];
  deptPerformance: DeptPerformanceDataPoint[];
  activeSingleBatch: SingleBatchStats;
  activeSingleDept: SingleBatchStats;

  // Lists for dropdowns
  departmentsList: string[];
  batchesList: string[];

  // Raw state
  rawPlacements: PlacementRecord[];

  // Dialog state
  isDialogOpen: boolean;
  setIsDialogOpen: (v: boolean) => void;

  // Re-fetch trigger
  refetchDashboard: () => void;
}

export function useDashboardData(): DashboardDataReturn {
  const { user, logout } = useAuth();

  // ── Core State ───────────────────────────────────────────
  const [liveStats, setLiveStats] = useState<DashboardLiveStats>({
    totalAchievements: 120,
    facultyAchievements: 85,
    annualReports: 15,
  });
  const [placementView, setPlacementView] = useState<PlacementView>('departmentwise');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('All');
  const [rawPlacements, setRawPlacements] = useState<PlacementRecord[]>([]);
  const [placementDeptData, setPlacementDeptData] = useState<DepartmentPlacementData[]>(FALLBACK_DEPT_DATA);
  const [deptPerformance, setDeptPerformance] = useState<DeptPerformanceDataPoint[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── API Fetch ────────────────────────────────────────────
  const fetchDashboardData = useCallback(async (signal?: AbortSignal) => {
    if (!user?.token) return;
    setLoading(true);
    setError(null);

    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const fetchOpts = { headers, signal };

      // Parallel fetch for achievements, documents, and strategic plans
      const [resAchievements, resDocs, resPlans] = await Promise.all([
        fetch(`${API_BASE}/api/achievements`, fetchOpts),
        fetch(`${API_BASE}/api/documents`, fetchOpts),
        fetch(`${API_BASE}/api/strategic-plans`, fetchOpts),
      ]);

      // Handle 401 on any endpoint
      if (resAchievements.status === 401 || resDocs.status === 401 || resPlans.status === 401) {
        logout();
        return;
      }

      const [achievementsData, docsData, plansData] = await Promise.all([
        resAchievements.json(),
        resDocs.json(),
        resPlans.json(),
      ]);

      const liveAchievements = achievementsData.success ? achievementsData.data : [];
      const liveDocs = docsData.success ? docsData.data : [];
      const livePlans = plansData.success ? plansData.data : [];

      // Calculate dynamic counts
      const total = liveAchievements.length || 120;
      const facultyCount = liveAchievements.filter(
        (a: PlacementRecord) => a.category === 'research' || a.category === 'awards'
      ).length || 85;
      const reportsCount = liveDocs.length || 15;

      setLiveStats({ totalAchievements: total, facultyAchievements: facultyCount, annualReports: reportsCount });

      // Fetch placements
      try {
        const resPlacements = await fetch(`${API_BASE}/api/placements`, fetchOpts);
        if (resPlacements.ok) {
          const placementsData = await resPlacements.json();
          if (placementsData.success && placementsData.data?.length > 0) {
            setRawPlacements(placementsData.data);
            const liveDeptList = aggregateByDepartment(placementsData.data);
            if (liveDeptList.length > 0) {
              setPlacementDeptData(liveDeptList);
            }
          }
        }
      } catch (pErr) {
        if (!signal?.aborted) console.error('Error fetching placements:', pErr);
      }

      // Compute Radar Chart data from strategic plans
      if (livePlans.length > 0) {
        const deptProgress: Record<string, { sum: number; count: number }> = {};
        livePlans.forEach((plan: { department?: string; progress?: number }) => {
          const dept = plan.department || 'Other';
          if (!deptProgress[dept]) deptProgress[dept] = { sum: 0, count: 0 };
          deptProgress[dept].sum += plan.progress || 0;
          deptProgress[dept].count += 1;
        });

        const radarData = Object.entries(deptProgress).map(([dept, data]) => ({
          department: getDepartmentShortName(dept),
          score: Math.round(data.sum / data.count),
        }));

        // Merge with standard departments
        const mergedDepts = [...radarData];
        STANDARD_DEPARTMENTS.forEach((std) => {
          if (!mergedDepts.some((d) => d.department === std.department)) {
            mergedDepts.push(std);
          }
        });

        setDeptPerformance(mergedDepts.slice(0, 6));
      }
    } catch (err) {
      if (!signal?.aborted) {
        console.error('Error loading dashboard stats:', err);
        setError('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  }, [user, logout]);

  // ── Lifecycle ────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    fetchDashboardData(controller.signal);
    return () => controller.abort();
  }, [fetchDashboardData]);

  // ── Derived Lists ────────────────────────────────────────
  const departmentsList = useMemo(() => {
    return Array.from(
      new Set(rawPlacements.map((p) => p.department).filter(Boolean) as string[])
    ).sort();
  }, [rawPlacements]);

  const batchesList = useMemo(() => {
    return Array.from(
      new Set(rawPlacements.map((p) => p.batch).filter(Boolean) as string[])
    ).sort();
  }, [rawPlacements]);

  // Auto-select first department
  useEffect(() => {
    if (departmentsList.length > 0 && !selectedDepartment) {
      setSelectedDepartment(departmentsList[0]);
    }
  }, [departmentsList, selectedDepartment]);

  // Auto-select latest batch
  useEffect(() => {
    const list = rawPlacements.length > 0 ? batchesList : FALLBACK_BATCHES;
    if (list.length > 0 && !selectedBatch) {
      setSelectedBatch(list[list.length - 1]);
    }
  }, [batchesList, selectedBatch, rawPlacements]);

  // ── Computed Data ────────────────────────────────────────
  const computedOverallData = useMemo(() => aggregateByBatch(rawPlacements), [rawPlacements]);
  const computedDeptData = useMemo(() => aggregateByDepartment(rawPlacements, selectedBatch), [rawPlacements, selectedBatch]);

  const singleDeptData = useMemo<SingleBatchStats | null>(() => {
    if (!selectedDepartment || rawPlacements.length === 0) return null;
    return computeSingleViewStats(rawPlacements, 'department', selectedDepartment, selectedBatch);
  }, [rawPlacements, selectedDepartment, selectedBatch]);

  const singleBatchData = useMemo<SingleBatchStats | null>(() => {
    if (!selectedBatch || rawPlacements.length === 0) return null;
    return computeSingleViewStats(rawPlacements, 'batch', selectedBatch);
  }, [rawPlacements, selectedBatch]);

  // ── Final Resolved Data ──────────────────────────────────
  const deptData = useMemo(() => {
    if (rawPlacements.length > 0) return computedDeptData;
    if (selectedBatch && selectedBatch !== 'All' && MOCK_SINGLE_BATCH_DATA[selectedBatch]) {
      const breakdown = MOCK_SINGLE_BATCH_DATA[selectedBatch].departmentBreakdown;
      return breakdown || placementDeptData;
    }
    return placementDeptData;
  }, [rawPlacements, computedDeptData, selectedBatch, placementDeptData]);

  const overallData = rawPlacements.length > 0 ? computedOverallData : FALLBACK_OVERALL_DATA;

  const activeSingleBatch = useMemo<SingleBatchStats>(() => {
    const activeB = selectedBatch || (rawPlacements.length > 0 ? batchesList[0] : FALLBACK_BATCHES[0]);
    if (rawPlacements.length > 0 && singleBatchData) return singleBatchData;
    return MOCK_SINGLE_BATCH_DATA[activeB] || MOCK_SINGLE_BATCH_DATA['2024-25'];
  }, [rawPlacements, singleBatchData, selectedBatch, batchesList]);

  const activeSingleDept = useMemo<SingleBatchStats>(() => {
    if (rawPlacements.length > 0 && singleDeptData) return singleDeptData;
    const batchScale = selectedBatch && selectedBatch !== 'All' && MOCK_SINGLE_BATCH_DATA[selectedBatch]
      ? (MOCK_SINGLE_BATCH_DATA[selectedBatch].avgPackage / 8.5)
      : 1.0;
    return getMockSingleDeptStats(batchScale);
  }, [rawPlacements, singleDeptData, selectedBatch]);

  return {
    liveStats,
    loading,
    error,
    placementView,
    setPlacementView,
    selectedDepartment,
    setSelectedDepartment,
    selectedBatch,
    setSelectedBatch,
    deptData,
    overallData,
    deptPerformance,
    activeSingleBatch,
    activeSingleDept,
    departmentsList,
    batchesList: rawPlacements.length > 0 ? batchesList : FALLBACK_BATCHES,
    rawPlacements,
    isDialogOpen,
    setIsDialogOpen,
    refetchDashboard: () => fetchDashboardData(),
  };
}

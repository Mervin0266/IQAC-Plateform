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
import { getDepartmentShortName, FALLBACK_BATCHES } from '../utils/departmentMappings';
import { useAcademicHierarchy } from './useAcademicHierarchy';
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
  const { departmentList: dbDepts } = useAcademicHierarchy();

  // ── Core State ───────────────────────────────────────────
  const [liveStats, setLiveStats] = useState<DashboardLiveStats>({
    totalAchievements: 0,
    facultyAchievements: 0,
    annualReports: 0,
    totalStudents: 0,
    totalFaculty: 0,
    sfr: '—',
    totalPapers: 0,
    scopusJournals: 0,
    totalPatents: 0,
    totalGrantsAmountLakhs: 0,
    totalGrantsCrores: '0.00',
    consultancyAmountLakhs: 0,
    totalPlacements: 0,
    placedPercentage: 0,
    avgSalaryLpa: '0.0',
    highestSalaryLpa: '0.0',
    naacCgpa: '3.74',
    naacGrade: 'A++',
    readinessPct: 0,
    totalCampuses: 0,
    totalSchools: 0,
    totalDepartments: 0,
    totalProgramLevels: 0,
    totalCourses: 0,
  });
  const [placementView, setPlacementView] = useState<PlacementView>('departmentwise');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('All');
  const [rawPlacements, setRawPlacements] = useState<PlacementRecord[]>([]);
  const [placementDeptData, setPlacementDeptData] = useState<DepartmentPlacementData[]>([]);
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

      // Parallel fetch for dynamic dashboard stats, achievements, documents, strategic plans, hierarchy stats, and placements
      const [resSysStats, resAchievements, resDocs, resPlans, resHierarchy, resPlacements] = await Promise.all([
        fetch(`${API_BASE}/api/system/dashboard-stats`, fetchOpts),
        fetch(`${API_BASE}/api/achievements`, fetchOpts),
        fetch(`${API_BASE}/api/documents`, fetchOpts),
        fetch(`${API_BASE}/api/strategic-plans`, fetchOpts),
        fetch(`${API_BASE}/api/hierarchy/stats`, fetchOpts),
        fetch(`${API_BASE}/api/placements`, fetchOpts).catch(() => ({ ok: false, json: () => ({ success: false }) } as any))
      ]);

      // Handle 401 on any endpoint
      if (resSysStats.status === 401 || resAchievements.status === 401 || resDocs.status === 401 || resPlans.status === 401 || resHierarchy.status === 401) {
        logout();
        return;
      }

      const [sysStatsData, achievementsData, docsData, plansData, hierarchyData] = await Promise.all([
        resSysStats.ok ? resSysStats.json() : { success: false },
        resAchievements.ok ? resAchievements.json() : { success: false },
        resDocs.ok ? resDocs.json() : { success: false },
        resPlans.ok ? resPlans.json() : { success: false },
        resHierarchy.ok ? resHierarchy.json() : { success: false },
      ]);

      const liveAchievements = achievementsData.success ? (achievementsData.data || []) : [];
      const liveDocs = docsData.success ? (docsData.data || []) : [];
      const livePlans = plansData.success ? (plansData.data || []) : [];
      const hStats = hierarchyData.success ? hierarchyData.data : { totalCampuses: 0, totalSchools: 0, totalDepartments: 0, totalProgramLevels: 0, totalCourses: 0 };
      const sysStats = sysStatsData.success ? sysStatsData.data : null;

      if (sysStats) {
        setLiveStats({
          totalStudents: sysStats.totalStudents ?? 0,
          totalFaculty: sysStats.totalFaculty ?? 0,
          sfr: sysStats.sfr || '—',
          totalAchievements: sysStats.totalAchievements ?? liveAchievements.length,
          facultyAchievements: sysStats.facultyAchievements ?? liveAchievements.length,
          annualReports: sysStats.annualReports ?? liveDocs.length,
          totalPapers: sysStats.totalPapers ?? 0,
          scopusJournals: sysStats.scopusJournals ?? 0,
          totalPatents: sysStats.totalPatents ?? 0,
          totalGrantsAmountLakhs: sysStats.totalGrantsAmountLakhs ?? 0,
          totalGrantsCrores: sysStats.totalGrantsCrores ?? '0.00',
          consultancyAmountLakhs: sysStats.consultancyAmountLakhs ?? 0,
          totalPlacements: sysStats.totalPlacements ?? 0,
          placedPercentage: sysStats.placedPercentage ?? 0,
          avgSalaryLpa: sysStats.avgSalaryLpa ?? '0.0',
          highestSalaryLpa: sysStats.highestSalaryLpa ?? '0.0',
          naacCgpa: sysStats.naacCgpa || '3.74',
          naacGrade: sysStats.naacGrade || 'A++',
          readinessPct: sysStats.readinessPct ?? 0,
          totalCampuses: sysStats.totalCampuses ?? hStats.totalCampuses ?? 0,
          totalSchools: sysStats.totalSchools ?? hStats.totalSchools ?? 0,
          totalDepartments: sysStats.totalDepartments ?? hStats.totalDepartments ?? 0,
          totalProgramLevels: sysStats.totalProgramLevels ?? hStats.totalProgramLevels ?? 0,
          totalCourses: sysStats.totalCourses ?? hStats.totalCourses ?? 0,
          totalActivities: sysStats.totalActivities ?? 0,
          totalStrategicPlans: sysStats.totalStrategicPlans ?? livePlans.length
        });
      } else {
        const total = liveAchievements.length;
        const facultyCount = liveAchievements.filter(
          (a: PlacementRecord) => a.category === 'research' || a.category === 'awards'
        ).length;
        const reportsCount = liveDocs.length;

        setLiveStats({
          totalAchievements: total,
          facultyAchievements: facultyCount,
          annualReports: reportsCount,
          totalCampuses: hStats.totalCampuses || 0,
          totalSchools: hStats.totalSchools || 0,
          totalDepartments: hStats.totalDepartments || 0,
          totalProgramLevels: hStats.totalProgramLevels || 0,
          totalCourses: hStats.totalCourses || 0,
          totalStudents: 0,
          totalFaculty: 0,
          sfr: '—',
          totalPapers: 0,
          totalPatents: 0,
          totalGrantsCrores: '0.00',
          totalPlacements: 0,
          placedPercentage: 0,
          avgSalaryLpa: '0.0',
          highestSalaryLpa: '0.0'
        });
      }

      // Process placements
      if (resPlacements && resPlacements.ok) {
        const placementsData = await resPlacements.json();
        if (placementsData.success && Array.isArray(placementsData.data) && placementsData.data.length > 0) {
          setRawPlacements(placementsData.data);
          const liveDeptList = aggregateByDepartment(placementsData.data);
          setPlacementDeptData(liveDeptList);
        } else {
          setRawPlacements([]);
          setPlacementDeptData([]);
        }
      } else {
        setRawPlacements([]);
        setPlacementDeptData([]);
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

        setDeptPerformance(radarData.slice(0, 6));
      } else {
        setDeptPerformance([]);
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
    const list = Array.from(
      new Set(rawPlacements.map((p) => p.department).filter(Boolean) as string[])
    ).sort();
    if (list.length === 0) {
      return dbDepts;
    }
    return list;
  }, [rawPlacements, dbDepts]);

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
    return [];
  }, [rawPlacements, computedDeptData]);

  const overallData = useMemo(() => {
    if (rawPlacements.length > 0) return computedOverallData;
    return [];
  }, [rawPlacements, computedOverallData]);

  const activeSingleBatch = useMemo<SingleBatchStats>(() => {
    if (rawPlacements.length > 0 && singleBatchData) return singleBatchData;
    return {
      totalPlaced: 0,
      totalInterns: 0,
      highestPackage: 0,
      lowestPackage: 0,
      avgPackage: 0,
      topEmployers: [],
      salaryDistribution: []
    };
  }, [rawPlacements, singleBatchData]);

  const activeSingleDept = useMemo<SingleBatchStats>(() => {
    if (rawPlacements.length > 0 && singleDeptData) return singleDeptData;
    return {
      totalPlaced: 0,
      totalInterns: 0,
      highestPackage: 0,
      lowestPackage: 0,
      avgPackage: 0,
      topEmployers: [],
      salaryDistribution: []
    };
  }, [rawPlacements, singleDeptData]);

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

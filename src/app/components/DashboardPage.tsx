/**
 * DashboardPage — Institutional Intelligence & Analytics Platform V2.0
 * CHRIST (Deemed to be University) — IQAC Platform
 *
 * Comprehensive, interactive, fully customizable Institutional Analytics and Intelligence Platform:
 * 1. Executive Overview: University performance snapshot, dual-axis progression, department comparison, hierarchy & workspaces.
 * 2. Explore Analytics: Dedicated views for Students, Academic Performance, Teaching Faculty, Non-Teaching Staff, Research, Placements, Achievements.
 * 3. Diversity & Inclusion: Multi-population diversity, gender parity, geographic domicile with privacy suppression (< 5).
 * 4. Advanced Comparison Studio: Single-metric, multi-metric, normalized (per faculty/SFR), rankings, target vs actual.
 * 5. Custom Analysis Builder: Multi-step interactive builder with chart switcher and "Save to My Dashboards".
 * 6. Metric & Formula Studio: Validated mathematical expression creator for custom ratios and normalized KPIs.
 * 7. My Dashboards: Personalized customizable workspace with pre-built template kits and widget management.
 * 8. Data Quality & Governance: Verification rates, profile completeness %, and proof compliance scorecards.
 *
 * STRICT PRESERVATION:
 * - InstitutionalReportGeneratorDialog and backend report services are 100% preserved and accessible via header button.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
} from 'recharts';
import { AppShell, PageHeader } from './design-system';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutGrid,
  Compass,
  Users,
  Scale,
  Sparkles,
  Calculator,
  Layers,
  ShieldCheck,
  RefreshCw,
  FileText
} from 'lucide-react';
import { InstitutionalReportGeneratorDialog } from './InstitutionalReportGeneratorDialog';
import { UniversalFilterBar, FilterState } from './analytics/UniversalFilterBar';
import { ExecutiveOverviewView } from './analytics/ExecutiveOverviewView';
import { ExploreAnalyticsView } from './analytics/ExploreAnalyticsView';
import { DiversityAnalyticsView } from './analytics/DiversityAnalyticsView';
import { ComparisonStudioView } from './analytics/ComparisonStudioView';
import { AnalysisBuilderView } from './analytics/AnalysisBuilderView';
import { MetricFormulaStudioView } from './analytics/MetricFormulaStudioView';
import { MyDashboardsView } from './analytics/MyDashboardsView';
import { DataQualityGovernanceView } from './analytics/DataQualityGovernanceView';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

const COLORS = {
  primary: '#2855B9',
  slate: '#1C355B',
  teal: '#0F766E',
  amber: '#D97706',
  violet: '#7C3AED',
  sky: '#0284C7',
  rose: '#E11D48',
  gray: '#64748B'
};

const PIE_COLORS = ['#2855B9', '#0F766E', '#7C3AED', '#D97706', '#0284C7', '#64748B'];

/**
 * Shared Light-Themed Chart Tooltip Component
 */
export interface DashboardChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  valuePrefix?: string;
  valueSuffix?: string;
  isNaac?: boolean;
}

export function DashboardChartTooltip({
  active,
  payload,
  label,
  valuePrefix = '',
  valueSuffix = '',
  isNaac = false
}: DashboardChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const firstItem = payload[0];
  const itemData = firstItem?.payload;

  let title: React.ReactNode = label;
  let subtitle: string | null = null;

  if (isNaac && itemData?.criterion) {
    title = itemData.criterion;
  } else if (itemData?.departmentName) {
    title = itemData.departmentName;
    if (itemData.shortName && itemData.shortName !== itemData.departmentName) {
      subtitle = itemData.shortName;
    }
  } else if (itemData?.fullName) {
    title = itemData.fullName;
    subtitle = itemData.name;
  } else if (itemData?.name && !label) {
    title = itemData.name;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-xs min-w-[190px] max-w-[300px] z-50">
      <div className="border-b border-slate-100 pb-2 mb-2">
        <p className="font-semibold text-slate-900 leading-tight">{title}</p>
        {subtitle && (
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="space-y-1.5">
        {payload.map((entry: any, idx: number) => {
          const color = entry.color || entry.fill || COLORS.primary;
          const name = entry.name || entry.dataKey;
          const val = entry.value;
          const formattedVal = typeof val === 'number'
            ? `${valuePrefix}${val.toLocaleString('en-IN')}${valueSuffix}`
            : `${valuePrefix}${val ?? '—'}${valueSuffix}`;

          return (
            <div key={`tooltip-${idx}`} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[11px] text-slate-600 truncate">{name}</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-900 tabular-nums shrink-0">
                {formattedVal}
              </span>
            </div>
          );
        })}
      </div>
      {isNaac && itemData?.score !== undefined && itemData?.target !== undefined && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
          <span className="text-slate-500 font-medium">Attainment Status</span>
          <span
            className={`font-semibold px-1.5 py-0.5 rounded ${
              Number(itemData.score) >= Number(itemData.target)
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {Number(itemData.score) >= Number(itemData.target) ? 'Target Met' : 'In Progress'}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Shared Proportioned Donut Chart Component
 */
export function DashboardDonutChart({
  data = [],
  colors = PIE_COLORS,
  emptyMessage = 'No distribution records available',
  height = 180
}: {
  data: Array<{ name: string; count: number }>;
  colors?: string[];
  emptyMessage?: string;
  height?: number;
}) {
  const total = useMemo(() => {
    return data.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0);
  }, [data]);

  const activeData = useMemo(() => {
    return data.filter(d => (Number(d.count) || 0) > 0);
  }, [data]);

  if (total === 0 || data.length === 0) {
    return (
      <div className="h-52 flex items-center justify-center text-xs text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={activeData}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={74}
              innerRadius={46}
              paddingAngle={activeData.length > 1 ? 3 : 0}
            >
              {activeData.map((entry, idx) => {
                const originalIndex = data.findIndex(d => d.name === entry.name);
                const color = colors[(originalIndex >= 0 ? originalIndex : idx) % colors.length];
                return <Cell key={`cell-${idx}`} fill={color} />;
              })}
            </Pie>
            <Tooltip content={<DashboardChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 mt-2 pt-2 border-t border-slate-100 w-full text-xs">
        {data.map((item, idx) => {
          const count = Number(item.count) || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const color = colors[idx % colors.length];
          return (
            <div key={idx} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-[11px] text-slate-600">{item.name}:</span>
              <span className="text-[11px] font-semibold text-slate-900 tabular-nums">
                {count.toLocaleString('en-IN')} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user } = useAuth();
  const dashboard = useDashboardData();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Active Main Navigation Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'explore' | 'diversity' | 'comparison' | 'builder' | 'formula' | 'dashboards' | 'governance'
  >('overview');

  // Complete Institutional Report Dialog Modal state
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);

  // Available Academic Years across the institutional database
  const availableYears = [
    'AY 2026–27',
    'AY 2025–26',
    'AY 2024–25',
    'AY 2023–24',
    'AY 2022–23',
    'AY 2021–22',
    'AY 2020–21'
  ];

  // Global Universal Filters
  const [filters, setFilters] = useState<FilterState>({
    campus: 'All',
    school: 'All',
    department: 'All',
    academicYears: ['AY 2026–27', 'AY 2025–26', 'AY 2024–25', 'AY 2023–24'],
    programLevel: 'All',
    batch: 'All',
    indexing: 'All'
  });

  // Filter dropdown options
  const [campuses, setCampuses] = useState<Array<{ id: string; name: string }>>([]);
  const [schools, setSchools] = useState<Array<{ id: string; name: string; campusId?: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; shortName?: string; schoolId?: string }>>([]);

  // Live Analytics Data from Centralized Service
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Custom metrics list
  const [customMetrics, setCustomMetrics] = useState<any[]>([]);

  // Load Hierarchy metadata for dropdowns
  useEffect(() => {
    async function loadHierarchy() {
      try {
        const token = user?.token;
        const res = await fetch(`${API_URL}/api/institutional-analytics/report-config`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setCampuses(json.data.campuses || []);
            setSchools(json.data.schools || []);
            setDepartments(json.data.departments || []);
          }
        }
      } catch (err) {
        console.warn('Failed to load filter options:', err);
      }
    }
    loadHierarchy();
  }, [user?.token, API_URL]);

  // Load custom metrics from API
  const fetchCustomMetrics = async () => {
    try {
      const token = user?.token;
      const res = await fetch(`${API_URL}/api/institutional-analytics/metric-catalog`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.customMetrics) {
          setCustomMetrics(json.customMetrics);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch metric catalog:', err);
    }
  };

  useEffect(() => {
    fetchCustomMetrics();
  }, [user?.token, API_URL]);

  // Fetch Centralized Institutional Analytics when filters change
  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const token = user?.token;
      const params = new URLSearchParams();
      if (filters.campus !== 'All') params.append('campus', filters.campus);
      if (filters.school !== 'All') params.append('school', filters.school);
      if (filters.department !== 'All') params.append('department', filters.department);

      if (filters.academicYears.length > 0 && filters.academicYears.length < availableYears.length) {
        params.append('academicYears', filters.academicYears.join(','));
      }

      if (filters.programLevel !== 'All') params.append('program', filters.programLevel);
      if (filters.indexing !== 'All') params.append('indexing', filters.indexing);
      if (filters.batch !== 'All') params.append('batch', filters.batch);

      const res = await fetch(`${API_URL}/api/institutional-analytics/dashboard?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setAnalyticsData(json.data);
        }
      }
    } catch (err) {
      console.warn('Analytics fetch error:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [filters, user?.token]);

  // Fetch Faculty Expansion & Achievements Analytics
  const [expansionStats, setExpansionStats] = useState({
    profDev: 0,
    invitedTalks: 0,
    awards: 0,
    eContents: 0,
    periodicals: 0
  });

  useEffect(() => {
    const fetchExpansion = async () => {
      try {
        const token = user?.token || (() => {
          try {
            const u = localStorage.getItem('iqac_user');
            return u ? JSON.parse(u)?.token : null;
          } catch {
            return null;
          }
        })() || localStorage.getItem('token');
        if (!token) return;
        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
        const [pdRes, itRes, awRes, ecRes, perRes] = await Promise.allSettled([
          fetch(`${API_URL}/api/professional-developments/stats`, { headers }).then(r => r.json()),
          fetch(`${API_URL}/api/invited-talks/stats`, { headers }).then(r => r.json()),
          fetch(`${API_URL}/api/awards/stats`, { headers }).then(r => r.json()),
          fetch(`${API_URL}/api/e-contents/stats`, { headers }).then(r => r.json()),
          fetch(`${API_URL}/api/periodicals/stats`, { headers }).then(r => r.json())
        ]);

        setExpansionStats({
          profDev: pdRes.status === 'fulfilled' && pdRes.value?.success ? (pdRes.value.data?.totalPrograms || pdRes.value.data?.totalCount || 0) : 0,
          invitedTalks: itRes.status === 'fulfilled' && itRes.value?.success ? (itRes.value.data?.totalTalks || itRes.value.data?.totalCount || 0) : 0,
          awards: awRes.status === 'fulfilled' && awRes.value?.success ? (awRes.value.stats?.totalAwards || 0) : 0,
          eContents: ecRes.status === 'fulfilled' && ecRes.value?.success ? (ecRes.value.stats?.totalEContents || 0) : 0,
          periodicals: perRes.status === 'fulfilled' && perRes.value?.success ? (perRes.value.data?.totalPeriodicals || perRes.value.data?.totalCount || 0) : 0
        });
      } catch (err) {
        console.warn('Failed to load expansion stats:', err);
      }
    };
    fetchExpansion();
  }, [user?.token, filters.campus, filters.school, filters.department]);

  const handleUpdateFilters = (updated: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updated }));
  };

  const handleResetFilters = () => {
    setFilters({
      campus: 'All',
      school: 'All',
      department: 'All',
      academicYears: ['AY 2026–27', 'AY 2025–26', 'AY 2024–25', 'AY 2023–24'],
      programLevel: 'All',
      batch: 'All',
      indexing: 'All'
    });
  };

  // Main 8-Tab Navigation Definition
  const MAIN_TABS = [
    { id: 'overview', label: '1. Executive Overview', icon: LayoutGrid },
    { id: 'explore', label: '2. Explore Analytics', icon: Compass },
    { id: 'diversity', label: '3. Diversity & Inclusion', icon: Users },
    { id: 'comparison', label: '4. Comparison Studio', icon: Scale },
    { id: 'builder', label: '5. Custom Analysis Builder', icon: Sparkles },
    { id: 'formula', label: '6. Metric & Formula Studio', icon: Calculator },
    { id: 'dashboards', label: '7. My Dashboards', icon: Layers },
    { id: 'governance', label: '8. Data Governance', icon: ShieldCheck }
  ];

  return (
    <AppShell currentPage="dashboard" onNavigate={onNavigate}>
      {/* 1. Universal Page Header */}
      <PageHeader
        breadcrumbs={[{ label: 'Home' }, { label: 'Institutional Intelligence & Analytics Platform V2.0', active: true }]}
        title="Institutional Intelligence & Analytics Platform"
        badge="Accreditation Cycle 4 • Grade A++"
        description="Comprehensive institutional intelligence platform providing multi-dimensional analytics, custom formula authoring, cross-entity comparisons, and personalized workspaces."
        actions={
          <div className="flex items-center gap-2.5">
            {/* Centralized "Generate Report" Button — STRICTLY PRESERVED */}
            <button
              type="button"
              onClick={() => setIsReportDialogOpen(true)}
              className="inline-flex items-center gap-2 h-9 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm group"
            >
              <FileText className="w-4 h-4 text-blue-100 group-hover:scale-105 transition-transform" />
              <span>Generate Report</span>
            </button>

            <button
              type="button"
              onClick={() => {
                dashboard.refetchDashboard();
                fetchAnalytics();
                fetchCustomMetrics();
              }}
              disabled={loadingAnalytics}
              className="inline-flex items-center gap-2 h-9 px-3.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all shadow-xs disabled:opacity-50"
              title="Refresh Live Analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loadingAnalytics ? 'animate-spin' : ''}`} />
              <span>{loadingAnalytics ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>
        }
      />

      {/* 2. Global Universal Filter Bar */}
      <UniversalFilterBar
        filters={filters}
        onChange={handleUpdateFilters}
        onReset={handleResetFilters}
        availableYears={availableYears}
        campuses={campuses}
        schools={schools}
        departments={departments}
        isLoading={loadingAnalytics}
      />

      {/* 3. Main Navigation Tab Switcher */}
      <div className="bg-slate-100/90 border border-slate-200/80 p-1.5 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-2">
        <nav className="flex flex-wrap items-center gap-1" aria-label="Dashboard views">
          {MAIN_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-semibold ring-1 ring-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <span className="text-[11px] text-slate-400 font-medium px-3 hidden xl:inline">
          CHRIST Institutional Analytics Platform
        </span>
      </div>

      {/* 4. Tab Content Panes */}

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <ExecutiveOverviewView
          analyticsData={analyticsData}
          dashboard={dashboard}
          onNavigate={onNavigate}
          tooltipComponent={DashboardChartTooltip}
        />
      )}

      {/* TAB 2: EXPLORE ANALYTICS */}
      {activeTab === 'explore' && (
        <ExploreAnalyticsView
          analyticsData={analyticsData}
          dashboard={dashboard}
          expansionStats={expansionStats}
          onNavigate={onNavigate}
          tooltipComponent={DashboardChartTooltip}
          donutChartComponent={DashboardDonutChart}
        />
      )}

      {/* TAB 3: DIVERSITY & INCLUSION */}
      {activeTab === 'diversity' && (
        <DiversityAnalyticsView
          analyticsData={analyticsData}
          tooltipComponent={DashboardChartTooltip}
          donutChartComponent={DashboardDonutChart}
        />
      )}

      {/* TAB 4: ADVANCED COMPARISON STUDIO */}
      {activeTab === 'comparison' && (
        <ComparisonStudioView
          departments={departments}
          academicYears={filters.academicYears}
          tooltipComponent={DashboardChartTooltip}
        />
      )}

      {/* TAB 5: CUSTOM ANALYSIS BUILDER */}
      {activeTab === 'builder' && (
        <AnalysisBuilderView
          tooltipComponent={DashboardChartTooltip}
          onSaveWidget={(widget) => {
            console.log('Saved custom widget:', widget);
          }}
        />
      )}

      {/* TAB 6: METRIC & FORMULA STUDIO */}
      {activeTab === 'formula' && (
        <MetricFormulaStudioView
          customMetrics={customMetrics}
          onRefreshMetrics={fetchCustomMetrics}
        />
      )}

      {/* TAB 7: MY DASHBOARDS */}
      {activeTab === 'dashboards' && (
        <MyDashboardsView
          tooltipComponent={DashboardChartTooltip}
          onNavigateToBuilder={() => setActiveTab('builder')}
        />
      )}

      {/* TAB 8: DATA QUALITY & GOVERNANCE */}
      {activeTab === 'governance' && (
        <DataQualityGovernanceView onNavigate={onNavigate} />
      )}

      {/* Complete Institutional Report Generator Dialog Modal — PRESERVED */}
      <InstitutionalReportGeneratorDialog
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        initialScope={{
          campus: filters.campus !== 'All' ? filters.campus : undefined,
          school: filters.school !== 'All' ? filters.school : undefined,
          departments: filters.department !== 'All' ? [filters.department] : undefined,
          academicYears: filters.academicYears
        }}
      />
    </AppShell>
  );
}

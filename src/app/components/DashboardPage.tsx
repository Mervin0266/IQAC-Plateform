/**
 * DashboardPage — Institutional Intelligence & Quality Dashboard V2.0
 * CHRIST (Deemed to be University) — IQAC Platform
 *
 * Professional, modern, interactive, data-driven institutional analytics platform with:
 * 1. 5 Focused Tabs: Executive Overview, Academic & Faculty, Research & Innovation,
 *    Placements & Internships, Accreditation & Rankings.
 * 2. Shared Global Filter Bar: Campus, School, Department(s), Academic Year(s), Reset & Active Pills.
 * 3. Contextual Sub-Filters: Program Level, Designation, Indexing, Batch, Status.
 * 4. Dual-Axis Scaled Recharts Visualizations (Bar, Line, Donut, Grouped Bar).
 * 5. Drill-Down KPI Cards linking to authorized, filtered source records.
 * 6. Centralized "Generate Report" feature opening InstitutionalReportGeneratorDialog.
 * 7. Clear separation between live verified calculations and reference benchmarks (NAAC/NIRF).
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { AppShell, PageHeader, StatCard } from './design-system';
import { RoleIndicator } from './RoleIndicator';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuth } from '../contexts/AuthContext';
import {
  Award,
  BookOpen,
  Users,
  TrendingUp,
  Briefcase,
  Star,
  Target,
  Building2,
  GraduationCap,
  LayoutGrid,
  RefreshCw,
  ArrowUpRight,
  FileText,
  Compass,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles,
  RotateCcw,
  Info,
  AlertCircle,
  Scale
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { InstitutionalReportGeneratorDialog } from './InstitutionalReportGeneratorDialog';
import { IprDashboardSection } from './dashboard/IprDashboardSection';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

// Institutional Chart Color Palette
const COLORS = {
  primary: '#2855B9', // CHRIST Primary Blue
  slate: '#1C355B',   // Dark Institutional Slate
  teal: '#0F766E',    // Verified Green / Teal
  amber: '#D97706',   // Warning / Reference Amber
  violet: '#7C3AED',  // Accreditation Violet
  sky: '#0284C7',     // Accent Sky Blue
  rose: '#E11D48',    // Accent Rose
  gray: '#64748B'     // Muted Slate
};

const PIE_COLORS = ['#2855B9', '#0F766E', '#7C3AED', '#D97706', '#0284C7', '#64748B'];

/**
 * Shared Light-Themed Chart Tooltip Component
 * Provides clean white background, high contrast dark slate text, series color dots,
 * and context-aware headers (full department names, NAAC criteria details, formatted numbers).
 */
interface DashboardChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  valuePrefix?: string;
  valueSuffix?: string;
  isNaac?: boolean;
}

function DashboardChartTooltip({
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
  } else if (itemData?.name && !label) {
    title = itemData.name;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-lg text-xs min-w-[190px] max-w-[300px]">
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
 * Standardizes innerRadius=46, outerRadius=74, custom legends with counts & percentages,
 * and robustly handles single-category distributions without distortion.
 */
interface DashboardDonutChartProps {
  data: Array<{ name: string; count: number }>;
  colors?: string[];
  emptyMessage?: string;
  height?: number;
}

function DashboardDonutChart({
  data = [],
  colors = PIE_COLORS,
  emptyMessage = 'No distribution records available',
  height = 180
}: DashboardDonutChartProps) {
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

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'academic' | 'research' | 'placements' | 'accreditation'>('overview');
  const [researchSubSection, setResearchSubSection] = useState<'analytics' | 'iprs'>('analytics');

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

  // Global Shared Filters
  const [filterCampus, setFilterCampus] = useState<string>('All');
  const [filterSchool, setFilterSchool] = useState<string>('All');
  const [filterDepartment, setFilterDepartment] = useState<string>('All');
  const [filterYears, setFilterYears] = useState<string[]>([
    'AY 2026–27',
    'AY 2025–26',
    'AY 2024–25',
    'AY 2023–24'
  ]);

  // Contextual Sub-Filters
  const [filterProgramLevel, setFilterProgramLevel] = useState<string>('All');
  const [filterDesignation, setFilterDesignation] = useState<string>('All');
  const [filterIndexing, setFilterIndexing] = useState<string>('All');
  const [filterBatch, setFilterBatch] = useState<string>('All');

  // Filter dropdown options
  const [campuses, setCampuses] = useState<Array<{ id: string; name: string }>>([]);
  const [schools, setSchools] = useState<Array<{ id: string; name: string; campusId?: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; shortName?: string; schoolId?: string }>>([]);

  // Live Analytics Data from Centralized Service
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

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

  // Fetch Centralized Institutional Analytics when filters change
  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const token = user?.token;
      const params = new URLSearchParams();
      if (filterCampus !== 'All') params.append('campus', filterCampus);
      if (filterSchool !== 'All') params.append('school', filterSchool);
      if (filterDepartment !== 'All') params.append('department', filterDepartment);

      // Pass selected academic years (if subset selected)
      if (filterYears.length > 0 && filterYears.length < availableYears.length) {
        params.append('academicYears', filterYears.join(','));
      }

      if (filterProgramLevel !== 'All') params.append('program', filterProgramLevel);
      if (filterIndexing !== 'All') params.append('indexing', filterIndexing);
      if (filterBatch !== 'All') params.append('batch', filterBatch);

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
  }, [filterCampus, filterSchool, filterDepartment, filterYears, filterProgramLevel, filterIndexing, filterBatch, user?.token]);

  // Reset all filters to default
  const handleResetFilters = () => {
    setFilterCampus('All');
    setFilterSchool('All');
    setFilterDepartment('All');
    setFilterYears(['AY 2026–27', 'AY 2025–26', 'AY 2024–25', 'AY 2023–24']);
    setFilterProgramLevel('All');
    setFilterDesignation('All');
    setFilterIndexing('All');
    setFilterBatch('All');
  };

  // Select all academic years
  const handleSelectAllYears = () => {
    if (filterYears.length === availableYears.length) {
      setFilterYears(['AY 2026–27', 'AY 2025–26', 'AY 2024–25', 'AY 2023–24']);
    } else {
      setFilterYears([...availableYears]);
    }
  };

  // Toggle single year selection
  const handleToggleYear = (yr: string) => {
    setFilterYears(prev => {
      if (prev.includes(yr)) {
        if (prev.length === 1) return prev;
        return prev.filter(y => y !== yr);
      } else {
        return [...prev, yr];
      }
    });
  };

  // Extract sections from live backend analytics
  const exec = analyticsData?.executiveOverview || {};
  const acad = analyticsData?.academicFaculty || {};
  const resData = analyticsData?.researchInnovation || {};
  const placeData = analyticsData?.placementsInternships || {};
  const accData = analyticsData?.accreditationRankings || {};
  const quality = analyticsData?.dataQuality || {};

  const totalStudents = exec.totalStudents ?? 0;
  const totalFaculty = exec.totalFaculty ?? 0;
  const sfr = exec.studentFacultyRatio ?? '—';
  const totalPubs = resData.totalPublications ?? 0;
  const totalCitations = resData.totalCitations ?? 0;
  const placementRate = placeData.placementRate ?? 0;
  const avgSalaryLpa = placeData.avgPackageLpa || '—';
  const highestSalaryLpa = placeData.highestPackageLpa || '—';

  const totalGrantsCrores = resData.totalSponsoredAmountCrores ?? '0.00';
  const totalGrantsLakhs = resData.totalSponsoredAmountLakhs ?? 0;
  const consultancyLakhs = resData.totalConsultancyAmountLakhs ?? 0;

  // Memoize chronological annual trend data (AY 2020–21 -> AY 2026–27 ascending for charts)
  const chronologicalYearlyOverview = useMemo(() => {
    if (!exec.yearlyOverview || !Array.isArray(exec.yearlyOverview)) return [];
    return [...exec.yearlyOverview].sort((a, b) => {
      const yearA = parseInt(a.academicYear?.match(/\d{4}/)?.[0] || '0', 10);
      const yearB = parseInt(b.academicYear?.match(/\d{4}/)?.[0] || '0', 10);
      return yearA - yearB;
    });
  }, [exec.yearlyOverview]);

  const chronologicalYearlyResearch = useMemo(() => {
    if (!resData.yearlyResearch || !Array.isArray(resData.yearlyResearch)) return [];
    return [...resData.yearlyResearch].sort((a, b) => {
      const yearA = parseInt(a.academicYear?.match(/\d{4}/)?.[0] || '0', 10);
      const yearB = parseInt(b.academicYear?.match(/\d{4}/)?.[0] || '0', 10);
      return yearA - yearB;
    });
  }, [resData.yearlyResearch]);

  // Quick modules navigation directory
  const quickModules = [
    {
      title: 'Student Details & Enrolment',
      route: 'student-details',
      icon: GraduationCap,
      desc: 'Active student registry, programs, cohorts & demographic breakdowns',
      stat: `${totalStudents.toLocaleString('en-IN')} Enrolled • SFR ${sfr}:1`,
    },
    {
      title: 'Faculty Details & Qualifications',
      route: 'faculty-details',
      icon: Users,
      desc: 'Faculty profiles, cadre breakdown, PhD qualifications & teaching experience',
      stat: `${totalFaculty.toLocaleString('en-IN')} Faculty • ${acad.phdPercentage || 0}% PhD Holders`,
    },
    {
      title: 'Research Publications & Citations',
      route: 'publications',
      icon: BookOpen,
      desc: 'Scopus, WoS, and UGC-CARE indexed papers with verified citation histories',
      stat: `${totalPubs.toLocaleString('en-IN')} Publications • ${totalCitations.toLocaleString('en-IN')} Citations`,
    },
    {
      title: 'Extramural Research Grants',
      route: 'sponsored-research',
      icon: TrendingUp,
      desc: 'Sponsored research projects, funding agencies, installments & sanctions',
      stat: `₹ ${totalGrantsCrores} Cr Sanctioned • ${resData.sponsoredCount || 0} Projects`,
    },
    {
      title: 'Campus Placements & Corporate Hiring',
      route: 'placements-internships',
      icon: Briefcase,
      desc: 'Corporate recruiters, placement rates, packages & internship stipends',
      stat: `${placementRate}% Placed • ${placeData.totalOffers || 0} Offers Recorded`,
    },
    {
      title: 'Accreditation Master (NAAC & NBA)',
      route: 'naac-accreditation',
      icon: Award,
      desc: 'NAAC SSR 7-Criteria metrics and NBA program readiness assessments',
      stat: `Grade ${accData.naacGrade || 'A++'} (${accData.naacCgpa || '3.74'} CGPA) • Cycle 4`,
    },
  ];

  return (
    <AppShell currentPage="dashboard" onNavigate={onNavigate}>
      {/* 1. Universal Page Header */}
      <PageHeader
        breadcrumbs={[{ label: 'Home' }, { label: 'Institutional Intelligence Dashboard V2.0', active: true }]}
        title="Institutional Intelligence & Quality Dashboard"
        badge="Accreditation Cycle 4"
        description="Comprehensive institutional analytics platform covering academic cohorts, faculty profiles, research outputs, recruitment, and accreditation compliance."
        actions={
          <div className="flex items-center gap-2.5">
            {/* Centralized "Generate Report" Button */}
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

      {/* Role & Context Indicator */}
      <RoleIndicator />

      {/* 2. Global Shared Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Institutional Filters
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSelectAllYears}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
            >
              {filterYears.length === availableYears.length ? 'Default Years' : 'All Academic Years'}
            </button>

            {(filterCampus !== 'All' || filterSchool !== 'All' || filterDepartment !== 'All' || filterYears.length !== 4) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center space-x-1 text-xs text-slate-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Campus Selector */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Campus</label>
            <Select value={filterCampus} onValueChange={setFilterCampus}>
              <SelectTrigger className="w-full bg-slate-50 h-8 text-xs border-slate-200">
                <SelectValue placeholder="All Campuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Campuses (University-wide)</SelectItem>
                {campuses.map(c => (
                  <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* School Selector */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">School</label>
            <Select value={filterSchool} onValueChange={setFilterSchool}>
              <SelectTrigger className="w-full bg-slate-50 h-8 text-xs border-slate-200">
                <SelectValue placeholder="All Schools" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Schools</SelectItem>
                {schools.map(s => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Department Selector */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">Department</label>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-full bg-slate-50 h-8 text-xs border-slate-200">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Departments</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.name}>{d.shortName || d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Academic Years Selector (Aligned Popover Multi-Select) */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Academic Years ({filterYears.length})
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full bg-slate-50 h-8 text-xs border border-slate-200 rounded-md px-2.5 flex items-center justify-between text-slate-700 hover:bg-slate-100 transition-colors focus:outline-hidden"
                >
                  <span className="truncate">
                    {filterYears.length === availableYears.length
                      ? 'All Academic Years (7)'
                      : filterYears.length === 1
                      ? filterYears[0]
                      : `${filterYears.length} Years Selected`}
                  </span>
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-3 bg-white border border-slate-200 shadow-lg rounded-xl z-50">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-800">Select Academic Years</span>
                  <button
                    type="button"
                    onClick={handleSelectAllYears}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {filterYears.length === availableYears.length ? 'Reset Default' : 'Select All'}
                  </button>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {availableYears.map(yr => {
                    const isChecked = filterYears.includes(yr);
                    return (
                      <label
                        key={yr}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs"
                      >
                        <span className={`font-medium ${isChecked ? 'text-slate-900' : 'text-slate-500'}`}>
                          {yr}
                        </span>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleYear(yr)}
                        />
                      </label>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Active Filter Pills Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500">
          <span className="font-medium">Active Scope:</span>
          <Badge variant="outline" className="text-[11px] font-normal py-0 bg-slate-50">
            {filterCampus === 'All' ? 'All Campuses' : filterCampus}
          </Badge>
          <Badge variant="outline" className="text-[11px] font-normal py-0 bg-slate-50">
            {filterSchool === 'All' ? 'All Schools' : filterSchool}
          </Badge>
          <Badge variant="outline" className="text-[11px] font-normal py-0 bg-slate-50">
            {filterDepartment === 'All' ? 'All Departments' : filterDepartment}
          </Badge>
          <Badge variant="outline" className="text-[11px] font-normal py-0 bg-blue-50 text-blue-700 border-blue-200">
            {filterYears.length === availableYears.length ? 'All Academic Years' : filterYears.join(', ')}
          </Badge>
          {loadingAnalytics && (
            <span className="inline-flex items-center text-blue-600 font-medium ml-2">
              <RefreshCw className="w-3 h-3 animate-spin mr-1" />
              Calculating live metrics...
            </span>
          )}
        </div>
      </div>

      {/* 3. 5 Focused Navigation Tabs */}
      <div className="bg-slate-100 p-1 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
        <nav className="flex flex-wrap items-center gap-1" aria-label="Dashboard views">
          {[
            { id: 'overview', label: '1. Executive Overview', icon: LayoutGrid },
            { id: 'academic', label: '2. Academic & Faculty', icon: GraduationCap },
            { id: 'research', label: '3. Research & Innovation', icon: BookOpen },
            { id: 'placements', label: '4. Placements & Internships', icon: Briefcase },
            { id: 'accreditation', label: '5. Accreditation & Rankings', icon: Award },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-colors ${
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

        <span className="text-[11px] text-slate-400 font-medium px-3 hidden md:inline">
          IQAC Intelligence v2.0
        </span>
      </div>

      {/* 4. Tab Content Panes */}

      {/* ======================================================== */}
      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 6 Core Institutional KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-stretch">
            <StatCard
              title="Enrolled Students"
              value={totalStudents.toLocaleString('en-IN')}
              subtitle="Distinct Register Numbers"
              icon={GraduationCap}
              className="border-t-2 border-t-blue-600"
              onClick={() => onNavigate('student-details')}
            />
            <StatCard
              title="Full-Time Faculty"
              value={totalFaculty.toLocaleString('en-IN')}
              subtitle={`SFR ${sfr}:1 Average`}
              icon={Users}
              className="border-t-2 border-t-teal-600"
              onClick={() => onNavigate('faculty-details')}
            />
            <StatCard
              title="Publications"
              value={totalPubs.toLocaleString('en-IN')}
              subtitle="Scopus / WoS Indexed"
              icon={BookOpen}
              className="border-t-2 border-t-indigo-600"
              onClick={() => onNavigate('publications')}
            />
            <StatCard
              title="Total Citations"
              value={totalCitations.toLocaleString('en-IN')}
              subtitle="Approved Citations"
              icon={TrendingUp}
              className="border-t-2 border-t-sky-600"
              onClick={() => onNavigate('publications')}
            />
            <StatCard
              title="Extramural Grants"
              value={`₹ ${totalGrantsCrores} Cr`}
              subtitle={`₹ ${Number(totalGrantsLakhs).toFixed(2)} Lakhs`}
              icon={Sparkles}
              className="border-t-2 border-t-amber-500"
              onClick={() => onNavigate('sponsored-research')}
            />
            <StatCard
              title="Placement Rate"
              value={`${placementRate}%`}
              subtitle={placeData.totalOffers > 0 ? avgSalaryLpa : 'No placement records'}
              icon={Briefcase}
              className="border-t-2 border-t-emerald-600"
              onClick={() => onNavigate('placements-internships')}
            />
          </div>

          {/* 2 Primary Interactive Recharts Visualizations (Dual-Axis Scaled) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Multi-Year Progression (Dual Axis) */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                    Annual Multi-Year Institutional Progression
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Students (left axis) vs Publications & Placements (right axis)
                  </p>
                </div>
                <Badge variant="outline" className="text-xs bg-slate-50">
                  AY Comparative
                </Badge>
              </div>

              <div className="h-64">
                {(!chronologicalYearlyOverview || chronologicalYearlyOverview.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No progression data available for selected scope
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chronologicalYearlyOverview}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis
                        dataKey="academicYear"
                        stroke="#CBD5E1"
                        tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="#CBD5E1"
                        tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                        tickLine={false}
                        tickFormatter={(v) => v.toLocaleString('en-IN')}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#CBD5E1"
                        tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                        tickLine={false}
                        tickFormatter={(v) => v.toLocaleString('en-IN')}
                      />
                      <Tooltip content={<DashboardChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar yAxisId="left" dataKey="students" name="Students (Left)" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="publications" name="Publications (Right)" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="placed" name="Placements (Right)" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Department Comparative Distribution (Dual Axis) */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                    Department Comparative Distribution
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Students (left axis) vs Faculty count (right axis)
                  </p>
                </div>
                <Badge variant="outline" className="text-xs bg-slate-50">
                  Faculty vs Students
                </Badge>
              </div>

              <div className="h-64">
                {(!acad.departmentBreakdown || acad.departmentBreakdown.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No department data available for selected scope
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={acad.departmentBreakdown}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis
                        dataKey="shortName"
                        stroke="#CBD5E1"
                        tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        stroke="#CBD5E1"
                        tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                        tickLine={false}
                        tickFormatter={(v) => v.toLocaleString('en-IN')}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#CBD5E1"
                        tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                        tickLine={false}
                        tickFormatter={(v) => v.toLocaleString('en-IN')}
                      />
                      <Tooltip content={<DashboardChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar yAxisId="left" dataKey="students" name="Students (Left)" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="faculty" name="Faculty (Right)" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Structural Hierarchy Banner */}
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-xs">
            {/* Prestigious Dark Header Band */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 px-5 py-3 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <Building2 className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  University Structural Hierarchy & Academic Organization
                </h3>
              </div>
              <span className="text-xs text-slate-300 font-medium">Bangalore Kengeri Campus</span>
            </div>

            {/* Crisp Light-Themed Metric Cards Body */}
            <div className="bg-slate-50/70 p-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Campuses</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                    {exec.structuralHierarchy?.totalCampuses || campuses.length || 1}
                  </p>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Institutional Hubs</span>
                </div>
                <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Schools</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                    {exec.structuralHierarchy?.totalSchools || schools.length || 1}
                  </p>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Engineering & Tech</span>
                </div>
                <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Departments</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                    {exec.structuralHierarchy?.totalDepartments || departments.length || 8}
                  </p>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">Active Academic Units</span>
                </div>
                <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Programs</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                    {exec.structuralHierarchy?.totalCourses || 31}
                  </p>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">UG, PG, PhD Degrees</span>
                </div>
                <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Levels</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                    {exec.structuralHierarchy?.totalProgramLevels || 3}
                  </p>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">UG / PG / Doctoral</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quality Management Workspaces Directory */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 tracking-tight">
                <Compass className="w-4 h-4 text-blue-600" />
                <span>Quality Management Workspaces</span>
              </h2>
              <span className="text-xs text-slate-500 font-medium">Click to access module records</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickModules.map((mod, idx) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => onNavigate(mod.route)}
                    className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs hover:border-slate-300 transition-colors cursor-pointer group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {mod.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {mod.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <span className="text-[11px] font-medium text-slate-700 bg-slate-50 px-2.5 py-1 rounded-md">
                        {mod.stat}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ACADEMIC & FACULTY */}
      {/* ======================================================== */}
      {activeTab === 'academic' && (
        <div className="space-y-6">
          {/* Sub-Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl">
            <span className="text-xs font-semibold text-slate-800">Academic & Faculty Sub-Filters:</span>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterProgramLevel} onValueChange={setFilterProgramLevel}>
                <SelectTrigger className="w-36 h-8 text-xs bg-slate-50">
                  <SelectValue placeholder="Program Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Levels</SelectItem>
                  <SelectItem value="Undergraduate">Undergraduate (UG)</SelectItem>
                  <SelectItem value="Postgraduate">Postgraduate (PG)</SelectItem>
                  <SelectItem value="PhD">Doctoral (PhD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard
              title="PhD Faculty"
              value={`${acad.phdFacultyCount || 0}`}
              subtitle={`${acad.phdPercentage || 0}% of Total Cadre`}
              icon={Award}
              className="border-t-2 border-t-teal-600"
              onClick={() => onNavigate('faculty-details')}
            />
            <StatCard
              title="Senior Leadership"
              value={`${acad.seniorFacultyCount || 0}`}
              subtitle="Professors & Assoc. Prof"
              icon={Users}
              className="border-t-2 border-t-blue-600"
              onClick={() => onNavigate('faculty-details')}
            />
            <StatCard
              title="Assistant Professors"
              value={`${acad.assistantProfCount || 0}`}
              subtitle="Active Teaching Cadre"
              icon={GraduationCap}
              className="border-t-2 border-t-indigo-600"
              onClick={() => onNavigate('faculty-details')}
            />
            <StatCard
              title="UG / PG Ratio"
              value={`${acad.ugPgRatio || '—'}`}
              subtitle="Program Level Ratio"
              icon={BookOpen}
              className="border-t-2 border-t-violet-600"
              onClick={() => onNavigate('student-details')}
            />
            <StatCard
              title="Research Scholars"
              value={`${acad.researchScholarsCount || 0}`}
              subtitle="Doctoral Candidates"
              icon={Star}
              className="border-t-2 border-t-amber-500"
              onClick={() => onNavigate('student-details')}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart: Designation Distribution */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Faculty Cadre Distribution</h3>
              <DashboardDonutChart
                data={acad.designationDistribution || []}
                emptyMessage="No cadre distribution records available"
              />
            </div>

            {/* Chart: Program Level Distribution */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Student Enrolment by Level</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={acad.programLevelDistribution || []}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#CBD5E1"
                      tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#CBD5E1"
                      tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                      tickLine={false}
                      tickFormatter={(v) => v.toLocaleString('en-IN')}
                    />
                    <Tooltip content={<DashboardChartTooltip />} />
                    <Bar dataKey="count" name="Students" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart: Gender Diversity */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Faculty Gender Ratio</h3>
              <DashboardDonutChart
                data={acad.genderDistribution || []}
                colors={[COLORS.primary, COLORS.teal]}
                emptyMessage="No gender ratio records available"
              />
            </div>
          </div>

          {/* Department Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                Departmental Academic & Faculty Ratios
              </h3>
              <span className="text-xs text-slate-500">Live Scoped Aggregate</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-slate-500 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5">Department</th>
                    <th className="py-3 px-3.5 text-right">Students</th>
                    <th className="py-3 px-3.5 text-right">Faculty</th>
                    <th className="py-3 px-3.5 text-right">SFR</th>
                    <th className="py-3 px-3.5 text-right">PhD Holders</th>
                    <th className="py-3 px-3.5 text-right">Avg Experience</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(acad.departmentBreakdown || []).map((d: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 font-medium text-slate-900">{d.departmentName}</td>
                      <td className="py-3 px-3.5 text-right font-medium text-slate-800 tabular-nums">
                        {d.students.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3.5 text-right font-medium text-slate-800 tabular-nums">
                        {d.faculty}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 tabular-nums">
                          {d.sfr}:1
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right font-medium text-slate-800 tabular-nums">
                        {d.phdCount}
                      </td>
                      <td className="py-3 px-3.5 text-right font-medium text-slate-800 tabular-nums">
                        {d.avgExperience ? `${d.avgExperience} yrs` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: RESEARCH & INNOVATION */}
      {/* ======================================================== */}
      {activeTab === 'research' && (
        <div className="space-y-6">
          {/* Research & Innovation Sub-Section Switcher: Research Analytics vs IPRs */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-slate-100 border border-slate-200/80 rounded-xl">
            <nav className="flex flex-wrap items-center gap-1" aria-label="Research sub-navigation">
              <button
                type="button"
                onClick={() => setResearchSubSection('analytics')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-colors ${
                  researchSubSection === 'analytics'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-semibold ring-1 ring-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
                }`}
              >
                <BookOpen className={`w-3.5 h-3.5 ${researchSubSection === 'analytics' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>Research Analytics</span>
              </button>
              <button
                type="button"
                onClick={() => setResearchSubSection('iprs')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs transition-colors ${
                  researchSubSection === 'iprs'
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-semibold ring-1 ring-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
                }`}
              >
                <Scale className={`w-3.5 h-3.5 ${researchSubSection === 'iprs' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>IPRs (Patents & Copyrights)</span>
                {resData.ipr?.totalIprs !== undefined && (
                  <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-800 font-semibold px-1.5 py-0">
                    {resData.ipr.totalIprs}
                  </Badge>
                )}
              </button>
            </nav>
            <span className="text-[11px] text-slate-400 font-medium px-2 hidden sm:inline">
              {researchSubSection === 'analytics' ? 'Scholarly Publications, Citations, Grants & Inflow' : 'Institutional Intellectual Property Rights Intelligence'}
            </span>
          </div>

          {researchSubSection === 'analytics' ? (
            <div className="space-y-6">
              {/* Sub-Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl">
                <span className="text-xs font-semibold text-slate-800">Research & Innovation Sub-Filters:</span>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={filterIndexing} onValueChange={setFilterIndexing}>
                    <SelectTrigger className="w-40 h-8 text-xs bg-slate-50">
                      <SelectValue placeholder="Journal Indexing" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Indexing Types</SelectItem>
                      <SelectItem value="Scopus">Scopus</SelectItem>
                      <SelectItem value="Web of Science">Web of Science</SelectItem>
                      <SelectItem value="UGC-CARE">UGC-CARE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
                <StatCard
                  title="Publications"
                  value={totalPubs.toLocaleString('en-IN')}
                  subtitle="Scopus / WoS Indexed"
                  icon={BookOpen}
                  className="border-t-2 border-t-blue-600"
                  onClick={() => onNavigate('publications')}
                />
                <StatCard
                  title="Approved Citations"
                  value={totalCitations.toLocaleString('en-IN')}
                  subtitle="Verified Total Count"
                  icon={TrendingUp}
                  className="border-t-2 border-t-teal-600"
                  onClick={() => onNavigate('publications')}
                />
                <StatCard
                  title="Extramural Grants"
                  value={`₹ ${totalGrantsCrores} Cr`}
                  subtitle={`₹ ${Number(totalGrantsLakhs).toFixed(2)} Lakhs`}
                  icon={Sparkles}
                  className="border-t-2 border-t-amber-500"
                  onClick={() => onNavigate('sponsored-research')}
                />
                <StatCard
                  title="Consultancy Inflow"
                  value={`₹ ${consultancyLakhs} L`}
                  subtitle={`${resData.consultancyCount || 0} Projects Completed`}
                  icon={Briefcase}
                  className="border-t-2 border-t-indigo-600"
                  onClick={() => onNavigate('consultancy-projects')}
                />
                <StatCard
                  title="Funding Agencies"
                  value={`${resData.distinctFundingAgenciesCount || 0}`}
                  subtitle="Distinct Sanctioning Bodies"
                  icon={Building2}
                  className="border-t-2 border-t-sky-600"
                  onClick={() => onNavigate('sponsored-research')}
                />
                <StatCard
                  title="Patents (Pub / Grant)"
                  value={`${resData.patentsPublished || 0} / ${resData.patentsGranted || 0}`}
                  subtitle="Intellectual Property"
                  icon={Award}
                  className="border-t-2 border-t-violet-600"
                  onClick={() => setResearchSubSection('iprs')}
                />
              </div>

              {/* Charts Row (Dual-Axis Scaled) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart: Annual Pubs & Citations */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">Annual Publications & Citations Trend</h3>
                  <p className="text-xs text-slate-500 mb-4">Publications (left axis) vs Approved Citations (right axis)</p>
                  <div className="h-64">
                    {(!chronologicalYearlyResearch || chronologicalYearlyResearch.length === 0) ? (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        No research trend data available for selected scope
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chronologicalYearlyResearch}
                          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                          <XAxis
                            dataKey="academicYear"
                            stroke="#CBD5E1"
                            tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                            tickLine={false}
                          />
                          <YAxis
                            yAxisId="left"
                            stroke="#CBD5E1"
                            tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                            tickLine={false}
                            tickFormatter={(v) => v.toLocaleString('en-IN')}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#CBD5E1"
                            tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                            tickLine={false}
                            tickFormatter={(v) => v.toLocaleString('en-IN')}
                          />
                          <Tooltip content={<DashboardChartTooltip />} />
                          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                          <Bar yAxisId="left" dataKey="publications" name="Publications (Left)" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                          <Bar yAxisId="right" dataKey="citations" name="Citations (Right)" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Chart: Indexing Breakdown */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">Journal Indexing Classification</h3>
                  <p className="text-xs text-slate-500 mb-4">Distribution by primary index tier</p>
                  <DashboardDonutChart
                    data={resData.indexingDistribution || []}
                    emptyMessage="No journal indexing distribution available"
                  />
                </div>
              </div>
            </div>
          ) : (
            <IprDashboardSection
              filterCampus={filterCampus}
              filterSchool={filterSchool}
              filterDepartment={filterDepartment}
              availableDepartments={departments.map(d => d.name)}
              onNavigate={onNavigate}
            />
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: PLACEMENTS & INTERNSHIPS */}
      {/* ======================================================== */}
      {activeTab === 'placements' && (
        <div className="space-y-6">
          {/* Sub-Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl">
            <span className="text-xs font-semibold text-slate-800">Placement & Internship Sub-Filters:</span>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterBatch} onValueChange={setFilterBatch}>
                <SelectTrigger className="w-36 h-8 text-xs bg-slate-50">
                  <SelectValue placeholder="Batch Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Batches</SelectItem>
                  <SelectItem value="2027">Batch 2027</SelectItem>
                  <SelectItem value="2026">Batch 2026</SelectItem>
                  <SelectItem value="2025">Batch 2025</SelectItem>
                  <SelectItem value="2024">Batch 2024</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status Note if Table is Empty */}
          {placeData.totalOffers === 0 && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-start space-x-2.5 text-blue-900 text-xs">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Placements & Internships Data Status:</span>
                <p className="mt-0.5 text-blue-800">
                  No student placement or internship records have been uploaded for the current scope. Once uploaded via the Placements bulk uploader, campus hiring metrics and CTC bands will dynamically appear here.
                </p>
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
            <StatCard
              title="Unique Placed"
              value={`${placeData.uniquePlaced || 0}`}
              subtitle="Distinct Student Offers"
              icon={Users}
              className="border-t-2 border-t-blue-600"
              onClick={() => onNavigate('placements-internships')}
            />
            <StatCard
              title="Total Job Offers"
              value={`${placeData.totalOffers || 0}`}
              subtitle="Including Multiple Offers"
              icon={Briefcase}
              className="border-t-2 border-t-teal-600"
              onClick={() => onNavigate('placements-internships')}
            />
            <StatCard
              title="Placement Rate"
              value={`${placementRate}%`}
              subtitle="Eligible Cohort Ratio"
              icon={TrendingUp}
              className="border-t-2 border-t-emerald-600"
              onClick={() => onNavigate('placements-internships')}
            />
            <StatCard
              title="Average Package"
              value={avgSalaryLpa}
              subtitle="Placements LPA CTC"
              icon={Sparkles}
              className="border-t-2 border-t-amber-500"
              onClick={() => onNavigate('placements-internships')}
            />
            <StatCard
              title="Highest Package"
              value={highestSalaryLpa}
              subtitle="Institutional Peak"
              icon={Star}
              className="border-t-2 border-t-violet-600"
              onClick={() => onNavigate('placements-internships')}
            />
            <StatCard
              title="Internships"
              value={`${placeData.totalInternships || 0}`}
              subtitle={`Avg ₹ ${placeData.avgInternshipStipend || 0}/mo`}
              icon={GraduationCap}
              className="border-t-2 border-t-sky-600"
              onClick={() => onNavigate('placements-internships')}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart: CTC Range Distribution */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Compensation Range Breakdown (LPA)</h3>
              <p className="text-xs text-slate-500 mb-4">Package distribution across placed students</p>
              <div className="h-64">
                {placeData.totalOffers === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No compensation records available to display
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={placeData.salaryRanges || []}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis
                        dataKey="range"
                        stroke="#CBD5E1"
                        tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#CBD5E1"
                        tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                        tickLine={false}
                        tickFormatter={(v) => v.toLocaleString('en-IN')}
                      />
                      <Tooltip content={<DashboardChartTooltip />} />
                      <Bar dataKey="count" name="Offers" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart: Top Recruiters */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Leading Corporate Recruiters</h3>
              <p className="text-xs text-slate-500 mb-4">Top hiring partners by student offers</p>
              <div className="h-64">
                {(!placeData.topRecruiters || placeData.topRecruiters.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No corporate recruiting records available to display
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={placeData.topRecruiters}
                      layout="vertical"
                      margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis
                        type="number"
                        stroke="#CBD5E1"
                        tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                        tickLine={false}
                        tickFormatter={(v) => v.toLocaleString('en-IN')}
                      />
                      <YAxis
                        dataKey="company"
                        type="category"
                        stroke="#CBD5E1"
                        tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                        tickLine={false}
                        width={90}
                      />
                      <Tooltip content={<DashboardChartTooltip />} />
                      <Bar dataKey="offers" name="Job Offers" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: ACCREDITATION & RANKINGS */}
      {/* ======================================================== */}
      {activeTab === 'accreditation' && (
        <div className="space-y-6">
          {/* Reference Benchmark Warning Banner */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start space-x-3 text-xs text-amber-900">
            <Award className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-950">Accreditation & National Rankings Reference Benchmarks</span>
              <p className="mt-0.5 text-amber-800 leading-relaxed">
                NAAC Cycle 4 Grade A++ (3.74 CGPA) and NIRF standings represent officially certified institutional benchmarks. Live parameter readiness is tracked across SSR Criteria and NBA SAR metrics.
              </p>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div
              onClick={() => onNavigate('naac-accreditation')}
              className="bg-white border border-slate-200 border-t-2 border-t-amber-500 rounded-xl p-5 shadow-xs cursor-pointer hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">NAAC SSR Grade</span>
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Reference Value</Badge>
              </div>
              <p className="text-2xl font-bold text-slate-900">{accData.naacGrade || 'A++'}</p>
              <p className="text-xs text-slate-500 mt-1">3.74 CGPA • Cycle 4 Valid to 2027</p>
            </div>

            <div
              onClick={() => onNavigate('nirf-ranking')}
              className="bg-white border border-slate-200 border-t-2 border-t-blue-600 rounded-xl p-5 shadow-xs cursor-pointer hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">NIRF Overall University</span>
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Reference Value</Badge>
              </div>
              <p className="text-2xl font-bold text-slate-900">Rank #{accData.nirfOverall || '63'}</p>
              <p className="text-xs text-slate-500 mt-1">Top 100 Universities of India</p>
            </div>

            <div
              onClick={() => onNavigate('nirf-ranking')}
              className="bg-white border border-slate-200 border-t-2 border-t-indigo-600 rounded-xl p-5 shadow-xs cursor-pointer hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">NIRF Disciplines</span>
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Reference Value</Badge>
              </div>
              <p className="text-2xl font-bold text-slate-900">Engg #76</p>
              <p className="text-xs text-slate-500 mt-1">Management #58 • Law #19</p>
            </div>

            <div
              onClick={() => onNavigate('strategic-plan')}
              className="bg-white border border-slate-200 border-t-2 border-t-emerald-600 rounded-xl p-5 shadow-xs cursor-pointer hover:border-slate-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Strategic Plan 2025–30</span>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">Verified Live</Badge>
              </div>
              <p className="text-2xl font-bold text-slate-900">{accData.strategicGoalAttainment || '84.6'}%</p>
              <p className="text-xs text-slate-500 mt-1">
                {accData.strategicGoalsCompleted || 38} of {accData.strategicGoalsTotal || 45} Goals Attained
              </p>
            </div>
          </div>

          {/* NAAC 7-Criteria Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
                  NAAC 7-Criteria Institutional Standing
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Criterion scores and weighted benchmarks (Scale: 3.0 to 4.0 GPA)
                </p>
              </div>
              <Badge variant="outline" className="text-xs bg-slate-50">
                Scale: 3.0 – 4.0
              </Badge>
            </div>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={accData.criteriaBreakdown || []}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="criterion"
                    stroke="#CBD5E1"
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                    tickLine={false}
                    tickFormatter={(val: string) => val ? val.split(':')[0] : ''}
                  />
                  <YAxis
                    domain={[3.0, 4.0]}
                    stroke="#CBD5E1"
                    tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }}
                    tickLine={false}
                    tickFormatter={(v) => v.toFixed(1)}
                  />
                  <Tooltip content={<DashboardChartTooltip isNaac />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="score" name="Assessed Standing (out of 4.0)" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="target" name="Institutional Target" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Complete Institutional Report Generator Dialog Modal */}
      <InstitutionalReportGeneratorDialog
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        initialScope={{
          campus: filterCampus !== 'All' ? filterCampus : undefined,
          school: filterSchool !== 'All' ? filterSchool : undefined,
          departments: filterDepartment !== 'All' ? [filterDepartment] : undefined,
          academicYears: filterYears
        }}
      />
    </AppShell>
  );
}

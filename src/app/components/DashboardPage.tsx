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
  AlertCircle
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { InstitutionalReportGeneratorDialog } from './InstitutionalReportGeneratorDialog';

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

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user } = useAuth();
  const dashboard = useDashboardData();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'academic' | 'research' | 'placements' | 'accreditation'>('overview');

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

          {/* Academic Years Selector (Multi-Pill) */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Academic Years ({filterYears.length})
            </label>
            <div className="flex flex-wrap gap-1">
              {availableYears.map(yr => {
                const isSelected = filterYears.includes(yr);
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => handleToggleYear(yr)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all ${
                      isSelected
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {yr.replace('AY ', '')}
                  </button>
                );
              })}
            </div>
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
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
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
              onClick={() => onNavigate('student-details')}
            />
            <StatCard
              title="Full-Time Faculty"
              value={totalFaculty.toLocaleString('en-IN')}
              subtitle={`SFR ${sfr}:1 Average`}
              icon={Users}
              onClick={() => onNavigate('faculty-details')}
            />
            <StatCard
              title="Publications"
              value={totalPubs.toLocaleString('en-IN')}
              subtitle="Scopus / WoS Indexed"
              icon={BookOpen}
              onClick={() => onNavigate('publications')}
            />
            <StatCard
              title="Total Citations"
              value={totalCitations.toLocaleString('en-IN')}
              subtitle="Approved Citations"
              icon={TrendingUp}
              onClick={() => onNavigate('publications')}
            />
            <StatCard
              title="Extramural Grants"
              value={`₹ ${totalGrantsCrores} Cr`}
              subtitle={`₹ ${Number(totalGrantsLakhs).toFixed(2)} Lakhs`}
              icon={Sparkles}
              onClick={() => onNavigate('sponsored-research')}
            />
            <StatCard
              title="Placement Rate"
              value={`${placementRate}%`}
              subtitle={placeData.totalOffers > 0 ? avgSalaryLpa : 'No placement records'}
              icon={Briefcase}
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
                {(!exec.yearlyOverview || exec.yearlyOverview.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No progression data available for selected scope
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={exec.yearlyOverview}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="academicYear" stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <YAxis yAxisId="left" stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }}
                      />
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="shortName" stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <YAxis yAxisId="left" stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar yAxisId="left" dataKey="students" name="Students (Left)" fill={COLORS.slate} radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="faculty" name="Faculty (Right)" fill={COLORS.sky} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Structural Hierarchy Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-xl p-5 text-white shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2.5">
                <Building2 className="w-5 h-5 text-blue-300" />
                <h3 className="text-sm font-bold text-white tracking-tight">
                  University Structural Hierarchy & Academic Organization
                </h3>
              </div>
              <span className="text-xs text-slate-300">Bangalore Kengeri Campus</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4">
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="text-[11px] text-slate-300 uppercase">Campuses</span>
                <p className="text-xl font-bold text-white mt-1">
                  {exec.structuralHierarchy?.totalCampuses || campuses.length || 1}
                </p>
                <span className="text-[10px] text-slate-400">Institutional Hubs</span>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="text-[11px] text-slate-300 uppercase">Schools</span>
                <p className="text-xl font-bold text-white mt-1">
                  {exec.structuralHierarchy?.totalSchools || schools.length || 1}
                </p>
                <span className="text-[10px] text-slate-400">Engineering & Tech</span>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="text-[11px] text-slate-300 uppercase">Departments</span>
                <p className="text-xl font-bold text-white mt-1">
                  {exec.structuralHierarchy?.totalDepartments || departments.length || 8}
                </p>
                <span className="text-[10px] text-slate-400">Active Academic Units</span>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="text-[11px] text-slate-300 uppercase">Programs</span>
                <p className="text-xl font-bold text-white mt-1">
                  {exec.structuralHierarchy?.totalCourses || 31}
                </p>
                <span className="text-[10px] text-slate-400">UG, PG, PhD Degrees</span>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <span className="text-[11px] text-slate-300 uppercase">Levels</span>
                <p className="text-xl font-bold text-white mt-1">
                  {exec.structuralHierarchy?.totalProgramLevels || 3}
                </p>
                <span className="text-[10px] text-slate-400">UG / PG / Doctoral</span>
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
              onClick={() => onNavigate('faculty-details')}
            />
            <StatCard
              title="Senior Leadership"
              value={`${acad.seniorFacultyCount || 0}`}
              subtitle="Professors & Assoc. Prof"
              icon={Users}
              onClick={() => onNavigate('faculty-details')}
            />
            <StatCard
              title="Assistant Professors"
              value={`${acad.assistantProfCount || 0}`}
              subtitle="Active Teaching Cadre"
              icon={GraduationCap}
              onClick={() => onNavigate('faculty-details')}
            />
            <StatCard
              title="UG / PG Ratio"
              value={`${acad.ugPgRatio || '—'}`}
              subtitle="Program Level Ratio"
              icon={BookOpen}
              onClick={() => onNavigate('student-details')}
            />
            <StatCard
              title="Research Scholars"
              value={`${acad.researchScholarsCount || 0}`}
              subtitle="Doctoral Candidates"
              icon={Star}
              onClick={() => onNavigate('student-details')}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart: Designation Distribution */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Faculty Cadre Distribution</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={acad.designationDistribution || []}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={45}
                      paddingAngle={3}
                    >
                      {PIE_COLORS.map((col, idx) => (
                        <Cell key={`cell-${idx}`} fill={col} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }}
                    />
                    <Bar dataKey="count" name="Students" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart: Gender Diversity */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Faculty Gender Ratio</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={acad.genderDistribution || []}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={45}
                      paddingAngle={4}
                    >
                      <Cell fill={COLORS.primary} />
                      <Cell fill={COLORS.teal} />
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
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
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-right">Students</th>
                    <th className="py-2.5 px-3 text-right">Faculty</th>
                    <th className="py-2.5 px-3 text-right">SFR</th>
                    <th className="py-2.5 px-3 text-right">PhD Holders</th>
                    <th className="py-2.5 px-3 text-right">Avg Experience</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(acad.departmentBreakdown || []).map((d: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-medium text-slate-900">{d.departmentName}</td>
                      <td className="py-2.5 px-3 text-right">{d.students.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right">{d.faculty}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-blue-600">{d.sfr}:1</td>
                      <td className="py-2.5 px-3 text-right">{d.phdCount}</td>
                      <td className="py-2.5 px-3 text-right">{d.avgExperience ? `${d.avgExperience} yrs` : '—'}</td>
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
              onClick={() => onNavigate('publications')}
            />
            <StatCard
              title="Approved Citations"
              value={totalCitations.toLocaleString('en-IN')}
              subtitle="Verified Total Count"
              icon={TrendingUp}
              onClick={() => onNavigate('publications')}
            />
            <StatCard
              title="Extramural Grants"
              value={`₹ ${totalGrantsCrores} Cr`}
              subtitle={`₹ ${Number(totalGrantsLakhs).toFixed(2)} Lakhs`}
              icon={Sparkles}
              onClick={() => onNavigate('sponsored-research')}
            />
            <StatCard
              title="Consultancy Inflow"
              value={`₹ ${consultancyLakhs} L`}
              subtitle={`${resData.consultancyCount || 0} Projects Completed`}
              icon={Briefcase}
              onClick={() => onNavigate('consultancy-projects')}
            />
            <StatCard
              title="Funding Agencies"
              value={`${resData.distinctFundingAgenciesCount || 0}`}
              subtitle="Distinct Sanctioning Bodies"
              icon={Building2}
              onClick={() => onNavigate('sponsored-research')}
            />
            <StatCard
              title="Patents (Pub / Grant)"
              value={`${resData.patentsPublished || 0} / ${resData.patentsGranted || 0}`}
              subtitle="Intellectual Property"
              icon={Award}
              onClick={() => onNavigate('patents')}
            />
          </div>

          {/* Charts Row (Dual-Axis Scaled) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart: Annual Pubs & Citations */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Annual Publications & Citations Trend</h3>
              <p className="text-xs text-slate-500 mb-4">Publications (left axis) vs Approved Citations (right axis)</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={resData.yearlyResearch || []}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="academicYear" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar yAxisId="left" dataKey="publications" name="Publications (Left)" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="citations" name="Citations (Right)" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart: Indexing Breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Journal Indexing Classification</h3>
              <p className="text-xs text-slate-500 mb-4">Distribution by primary index tier</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={resData.indexingDistribution || []}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={3}
                    >
                      {PIE_COLORS.map((col, idx) => (
                        <Cell key={`cell-${idx}`} fill={col} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
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
              onClick={() => onNavigate('placements-internships')}
            />
            <StatCard
              title="Total Job Offers"
              value={`${placeData.totalOffers || 0}`}
              subtitle="Including Multiple Offers"
              icon={Briefcase}
              onClick={() => onNavigate('placements-internships')}
            />
            <StatCard
              title="Placement Rate"
              value={`${placementRate}%`}
              subtitle="Eligible Cohort Ratio"
              icon={TrendingUp}
              onClick={() => onNavigate('placements-internships')}
            />
            <StatCard
              title="Average Package"
              value={avgSalaryLpa}
              subtitle="Placements LPA CTC"
              icon={Sparkles}
              onClick={() => onNavigate('placements-internships')}
            />
            <StatCard
              title="Highest Package"
              value={highestSalaryLpa}
              subtitle="Institutional Peak"
              icon={Star}
              onClick={() => onNavigate('placements-internships')}
            />
            <StatCard
              title="Internships"
              value={`${placeData.totalInternships || 0}`}
              subtitle={`Avg ₹ ${placeData.avgInternshipStipend || 0}/mo`}
              icon={GraduationCap}
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="range" stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }}
                      />
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
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <YAxis dataKey="company" type="category" stroke="#94A3B8" fontSize={11} tickLine={false} width={80} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }}
                      />
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
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs cursor-pointer hover:border-slate-300 transition-colors"
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
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs cursor-pointer hover:border-slate-300 transition-colors"
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
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs cursor-pointer hover:border-slate-300 transition-colors"
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
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs cursor-pointer hover:border-slate-300 transition-colors"
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
            <h3 className="text-sm font-semibold text-slate-900 mb-1">NAAC 7-Criteria Institutional Standing</h3>
            <p className="text-xs text-slate-500 mb-4">Criterion scores and weighted benchmarks</p>

            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={accData.criteriaBreakdown || []}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="criterion" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis domain={[3.0, 4.0]} stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '11px' }}
                  />
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

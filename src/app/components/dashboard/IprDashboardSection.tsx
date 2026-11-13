/**
 * IprDashboardSection — Institutional Intellectual Property Rights (Patents & Copyrights) Analytics
 * CHRIST (Deemed to be University) — IQAC Platform
 *
 * Implements:
 * 1. Three views: IPR Overview, Patents Analytics, Copyrights Analytics.
 * 2. Dedicated Calendar Year filtering (independent from Academic Year).
 * 3. Multi-Department Comparison with deduplicated combined totals.
 * 4. Original vs Current Department attribution basis.
 * 5. Interactive Drill-Down modal for records inspection.
 * 6. High-contrast Recharts visualizations and StatCard KPI metrics.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { StatCard } from '../design-system';
import {
  Award,
  BookOpen,
  FileText,
  TrendingUp,
  DollarSign,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Info,
  Calendar,
  Sparkles,
  Scale
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { useAuth } from '../../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const IPR_COLORS = {
  primary: '#2855B9',
  purple: '#7C3AED',
  teal: '#0F766E',
  amber: '#D97706',
  green: '#16A34A',
  sky: '#0284C7',
  slate: '#64748B'
};

const PIE_COLORS = ['#2855B9', '#7C3AED', '#0F766E', '#D97706', '#0284C7', '#64748B', '#E11D48'];

interface IprDashboardSectionProps {
  filterCampus?: string;
  filterSchool?: string;
  filterDepartment?: string;
  availableDepartments?: string[];
  onNavigate?: (page: string) => void;
}

export function IprDashboardSection({
  filterCampus = 'All',
  filterSchool = 'All',
  filterDepartment = 'All',
  availableDepartments = [],
  onNavigate
}: IprDashboardSectionProps) {
  const { user } = useAuth();

  // ── Section View State ─────────────────────────────────────
  const [subView, setSubView] = useState<'overview' | 'patents' | 'copyrights'>('overview');
  const [calendarYear, setCalendarYear] = useState<string>('all');
  const [attributionBasis, setAttributionBasis] = useState<'original' | 'current'>('original');

  // Multi-department comparison state
  const [compareDepartments, setCompareDepartments] = useState<string[]>([]);
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);

  // ── Data & Loading State ───────────────────────────────────
  const [loading, setLoading] = useState<boolean>(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Drill-Down Modal State ─────────────────────────────────
  const [drilldownOpen, setDrilldownOpen] = useState<boolean>(false);
  const [drilldownTitle, setDrilldownTitle] = useState<string>('');
  const [drilldownLoading, setDrilldownLoading] = useState<boolean>(false);
  const [drilldownRecords, setDrilldownRecords] = useState<any[]>([]);
  const [drilldownSearch, setDrilldownSearch] = useState<string>('');

  // ── Fetch Analytics ────────────────────────────────────────
  const fetchIprAnalytics = useCallback(async () => {
    if (!user?.token) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('view', subView);
      if (calendarYear !== 'all') params.set('calendarYear', calendarYear);
      params.set('attributionBasis', attributionBasis);

      if (isCompareMode && compareDepartments.length > 0) {
        params.set('departments', compareDepartments.join(','));
      } else if (filterDepartment && filterDepartment !== 'All') {
        params.set('department', filterDepartment);
      }

      if (filterSchool && filterSchool !== 'All') params.set('school', filterSchool);
      if (filterCampus && filterCampus !== 'All') params.set('campus', filterCampus);

      const res = await fetch(`${API_BASE}/api/institutional-analytics/ipr?${params.toString()}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${res.status}: Failed to load IPR analytics.`);
      }

      const json = await res.json();
      setAnalyticsData(json);
    } catch (err: any) {
      console.error('Error loading IPR analytics:', err);
      setError(err.message || 'Failed to load IPR intelligence.');
    } finally {
      setLoading(false);
    }
  }, [user?.token, subView, calendarYear, attributionBasis, isCompareMode, compareDepartments, filterDepartment, filterSchool, filterCampus]);

  useEffect(() => {
    fetchIprAnalytics();
  }, [fetchIprAnalytics]);

  // ── Trigger Drill-Down ─────────────────────────────────────
  const handleOpenDrilldown = async (kpi: string, label: string, moduleType: 'patents' | 'copyrights' | 'all' = 'all', extraParams: Record<string, string> = {}) => {
    if (!user?.token) return;
    setDrilldownTitle(`${label} — Contributing Source Records`);
    setDrilldownOpen(true);
    setDrilldownLoading(true);
    setDrilldownSearch('');

    try {
      const params = new URLSearchParams();
      params.set('module', moduleType);
      params.set('kpi', kpi);
      if (calendarYear !== 'all') params.set('calendarYear', calendarYear);
      params.set('attributionBasis', attributionBasis);

      if (isCompareMode && compareDepartments.length > 0) {
        params.set('departments', compareDepartments.join(','));
      } else if (filterDepartment && filterDepartment !== 'All') {
        params.set('department', filterDepartment);
      }

      if (filterSchool && filterSchool !== 'All') params.set('school', filterSchool);
      if (filterCampus && filterCampus !== 'All') params.set('campus', filterCampus);

      Object.entries(extraParams).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });

      const res = await fetch(`${API_BASE}/api/institutional-analytics/ipr/drilldown?${params.toString()}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve source drill-down records.');
      }

      const json = await res.json();
      setDrilldownRecords(json.records || []);
    } catch (err: any) {
      console.error('Drilldown fetch error:', err);
      setDrilldownRecords([]);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const filteredDrilldownList = useMemo(() => {
    if (!drilldownSearch.trim()) return drilldownRecords;
    const q = drilldownSearch.toLowerCase();
    return drilldownRecords.filter(r =>
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.inventorsOrCreators && r.inventorsOrCreators.toLowerCase().includes(q)) ||
      (r.department && r.department.toLowerCase().includes(q)) ||
      (r.registrationOrAppNo && r.registrationOrAppNo.toLowerCase().includes(q))
    );
  }, [drilldownRecords, drilldownSearch]);

  const overview = analyticsData?.overview || {};
  const patents = analyticsData?.patents || {};
  const copyrights = analyticsData?.copyrights || {};
  const availableYears = analyticsData?.availableCalendarYears || [];
  const missingDates = analyticsData?.missingDates || {};

  return (
    <div className="space-y-6">
      {/* ── Sub-Navigation & Filter Toolbar ────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-[#2855B9]" />
              IPRs Intelligence:
            </span>
            <div className="bg-slate-100 p-0.5 rounded-lg flex items-center">
              <button
                type="button"
                onClick={() => setSubView('overview')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  subView === 'overview'
                    ? 'bg-white text-[#2855B9] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. IPR Overview
              </button>
              <button
                type="button"
                onClick={() => setSubView('patents')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  subView === 'patents'
                    ? 'bg-white text-[#2855B9] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Patents Analytics
              </button>
              <button
                type="button"
                onClick={() => setSubView('copyrights')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  subView === 'copyrights'
                    ? 'bg-white text-[#2855B9] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. Copyrights Analytics
              </button>
            </div>
          </div>

          {/* Date Basis Explanation Badge */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              <strong>Date Basis:</strong> Patents (Publication Date) | Copyrights (Application Date)
            </span>
          </div>
        </div>

        {/* ── Filter Controls Row ──────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Calendar Year Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Calendar Year:
              </span>
              <Select value={calendarYear} onValueChange={setCalendarYear}>
                <SelectTrigger className="w-44 h-8 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="All Calendar Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Calendar Years</SelectItem>
                  {availableYears.map((yr: string) => (
                    <SelectItem key={yr} value={yr}>
                      Calendar Year {yr}
                    </SelectItem>
                  ))}
                  <SelectItem value="missing">Missing / Undated Records</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Attribution Basis Selector */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
              <span className="text-slate-500 font-medium">Attribution:</span>
              <div className="bg-slate-100 p-0.5 rounded flex items-center text-[11px]">
                <button
                  type="button"
                  onClick={() => setAttributionBasis('original')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    attributionBasis === 'original'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Historical department assigned at creation/filing time"
                >
                  Original Department
                </button>
                <button
                  type="button"
                  onClick={() => setAttributionBasis('current')}
                  className={`px-2 py-0.5 rounded font-medium transition-colors ${
                    attributionBasis === 'current'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Live current department from Faculty Management"
                >
                  Current Department
                </button>
              </div>
            </div>

            {/* Department Comparison Mode Toggle */}
            {availableDepartments.length > 1 && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <Button
                  variant={isCompareMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setIsCompareMode(!isCompareMode);
                    if (!isCompareMode && compareDepartments.length === 0) {
                      setCompareDepartments(availableDepartments.slice(0, 3));
                    }
                  }}
                  className={`h-8 text-xs ${isCompareMode ? 'bg-[#2855B9] text-white' : 'text-slate-700'}`}
                >
                  <Layers className="w-3.5 h-3.5 mr-1" />
                  {isCompareMode ? 'Exit Comparison' : 'Compare Departments'}
                </Button>
              </div>
            )}
          </div>

          {/* Quick Module Navigation Links */}
          <div className="flex items-center gap-2">
            {onNavigate && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('patents')}
                  className="text-[11px] font-semibold text-[#2855B9] hover:underline flex items-center gap-0.5"
                >
                  <span>Patents Section</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => onNavigate('copyrights')}
                  className="text-[11px] font-semibold text-[#7C3AED] hover:underline flex items-center gap-0.5"
                >
                  <span>Copyrights Section</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Multi-Department Selector when Compare Mode is active */}
        {isCompareMode && (
          <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-blue-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Select Departments for Side-by-Side Comparison:
              </span>
              <span className="text-[11px] text-blue-700">
                {compareDepartments.length} Selected (Deduplicated university total maintained)
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {availableDepartments.map(dept => {
                const isSelected = compareDepartments.includes(dept);
                return (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setCompareDepartments(compareDepartments.filter(d => d !== dept));
                      } else {
                        setCompareDepartments([...compareDepartments, dept]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {dept}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Missing Dates Notice */}
        {(missingDates.patentsMissingPublicationDate > 0 || missingDates.copyrightsMissingApplicationDate > 0) && (
          <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 px-3 py-1.5 rounded-lg flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                <strong>Data Notice:</strong>{' '}
                {missingDates.patentsMissingPublicationDate > 0 && `${missingDates.patentsMissingPublicationDate} Patent(s) missing Publication Date. `}
                {missingDates.copyrightsMissingApplicationDate > 0 && `${missingDates.copyrightsMissingApplicationDate} Copyright(s) missing Application Date.`}{' '}
                {missingDates.note}
              </span>
            </span>
            {calendarYear !== 'missing' && (
              <button
                type="button"
                onClick={() => setCalendarYear('missing')}
                className="underline hover:text-amber-950 font-semibold shrink-0 ml-2"
              >
                Inspect Undated Records
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Loading Skeleton / Error State ─────────────────────── */}
      {loading && (
        <div className="p-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-xl">
          <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-[#2855B9]" />
          <span>Aggregating institutional IPRs intelligence...</span>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
          <Info className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. VIEW 1: COMBINED IPR OVERVIEW                         */}
      {/* ======================================================== */}
      {!loading && !error && subView === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
            <StatCard
              title="Total IPRs"
              value={Number(overview.totalIprs || 0).toLocaleString('en-IN')}
              subtitle="Distinct Patents + Copyrights"
              icon={Scale}
              className="border-t-2 border-t-[#2855B9]"
              onClick={() => handleOpenDrilldown('total', 'Total IPRs', 'all')}
            />
            <StatCard
              title="Total Patents"
              value={Number(overview.totalPatents || 0).toLocaleString('en-IN')}
              subtitle="Distinct Patent Records"
              icon={Award}
              className="border-t-2 border-t-blue-600"
              onClick={() => handleOpenDrilldown('total', 'Total Patents', 'patents')}
            />
            <StatCard
              title="Total Copyrights"
              value={Number(overview.totalCopyrights || 0).toLocaleString('en-IN')}
              subtitle="Distinct Copyright Records"
              icon={BookOpen}
              className="border-t-2 border-t-purple-600"
              onClick={() => handleOpenDrilldown('total', 'Total Copyrights', 'copyrights')}
            />
            <StatCard
              title="Patent Apps Filed"
              value={Number(overview.patentApplicationsFiled || 0).toLocaleString('en-IN')}
              subtitle="Submitted Patent Filings"
              icon={FileText}
              className="border-t-2 border-t-sky-600"
              onClick={() => handleOpenDrilldown('filed', 'Patent Applications Filed', 'patents')}
            />
            <StatCard
              title="Copyright Apps Filed"
              value={Number(overview.copyrightApplicationsFiled || 0).toLocaleString('en-IN')}
              subtitle="Submitted Copyright Filings"
              icon={FileText}
              className="border-t-2 border-t-violet-600"
              onClick={() => handleOpenDrilldown('filed', 'Copyright Applications Filed', 'copyrights')}
            />
            <StatCard
              title="Total Patent Revenue"
              value={overview.totalRevenueFormatted || '₹ 0.00'}
              subtitle="Commercialized Royalty / Fee"
              icon={DollarSign}
              className="border-t-2 border-t-emerald-600"
              onClick={() => handleOpenDrilldown('licensed', 'Commercialized Patents with Revenue', 'patents')}
            />
          </div>

          {/* Charts Row 1: Distribution & Progression Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Donut Chart: IPR Breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">IPRs Distribution</h3>
              <p className="text-xs text-slate-500 mb-4">Patents vs Copyrights proportion</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={overview.distribution || []}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={74}
                      paddingAngle={3}
                    >
                      {(overview.distribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => [`${Number(v).toLocaleString('en-IN')} Records`, 'Count']}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart: IPR by Calendar Year */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs lg:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-slate-900">IPR Records by Calendar Year</h3>
                <Badge variant="outline" className="text-[10px] bg-slate-50">
                  Patents (Pub Date) | Copyrights (App Date)
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mb-4">Chronological institutional output by respective record date</p>
              <div className="h-56">
                {(!overview.yearlyTrend || overview.yearlyTrend.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No calendar year trend data available for current scope
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.yearlyTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="year" stroke="#CBD5E1" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} />
                      <YAxis stroke="#CBD5E1" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11px' }}
                        formatter={(val: any, name: any) => [Number(val).toLocaleString('en-IN'), name]}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar dataKey="patents" name="Patents (Pub Year)" fill={IPR_COLORS.primary} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="copyrights" name="Copyrights (App Year)" fill={IPR_COLORS.purple} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Charts Row 2: Department-wise Contribution & Patent Revenue Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department-wise Contribution */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Department-wise IPR Contribution</h3>
              <p className="text-xs text-slate-500 mb-4">Total intellectual property volume across departments</p>
              <div className="h-64">
                {(!overview.departmentContribution || overview.departmentContribution.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No department contribution data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={overview.departmentContribution.slice(0, 7)}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                      <XAxis type="number" stroke="#CBD5E1" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="department"
                        stroke="#CBD5E1"
                        tick={{ fill: '#475569', fontSize: 10 }}
                        width={90}
                        tickFormatter={(v) => v.length > 14 ? `${v.slice(0, 12)}…` : v}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar dataKey="patents" name="Patents" stackId="a" fill={IPR_COLORS.primary} />
                      <Bar dataKey="copyrights" name="Copyrights" stackId="a" fill={IPR_COLORS.purple} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Patent Revenue Trend by Publication Year */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Patent Commercial Revenue Trend</h3>
              <p className="text-xs text-slate-500 mb-4">Royalty and commercial licensing inflow by Publication Year</p>
              <div className="h-64">
                {(!overview.revenueTrend || overview.revenueTrend.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No commercial revenue data recorded for current scope
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={overview.revenueTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="year" stroke="#CBD5E1" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} />
                      <YAxis
                        stroke="#CBD5E1"
                        tick={{ fill: '#475569', fontSize: 11 }}
                        tickLine={false}
                        tickFormatter={(v) => `₹ ${v}L`}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11px' }}
                        formatter={(val: any) => [`₹ ${Number(val).toFixed(2)} Lakhs`, 'Revenue']}
                      />
                      <Bar dataKey="revenueLakhs" name="Revenue (₹ Lakhs)" fill={IPR_COLORS.green} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Top Faculty Contributors Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Leading Faculty IPR Contributors</h3>
            <p className="text-xs text-slate-500 mb-3">
              Faculty members participating in Patents and Copyrights (Inventors & Creators)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Faculty Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-center">Patents</th>
                    <th className="py-2.5 px-3 text-center">Copyrights</th>
                    <th className="py-2.5 px-3 text-center font-bold text-blue-700">Total IPRs</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!overview.topFacultyContributors || overview.topFacultyContributors.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No faculty inventor records found
                      </td>
                    </tr>
                  ) : (
                    overview.topFacultyContributors.map((f: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {f.name}
                          {f.employeeId && <span className="ml-1.5 text-[10px] text-slate-400 font-mono">({f.employeeId})</span>}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{f.department}</td>
                        <td className="py-2 px-3 text-center font-medium">{f.patentsCount}</td>
                        <td className="py-2 px-3 text-center font-medium">{f.copyrightsCount}</td>
                        <td className="py-2 px-3 text-center font-bold text-[#2855B9]">{f.totalIprs}</td>
                        <td className="py-2 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2 text-blue-600 hover:text-blue-800"
                            onClick={() => handleOpenDrilldown('faculty', `Faculty IPRs: ${f.name}`, 'all', { facultyName: f.name })}
                          >
                            View Records
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. VIEW 2: PATENTS ANALYTICS                             */}
      {/* ======================================================== */}
      {!loading && !error && subView === 'patents' && (
        <div className="space-y-6">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard
              title="Total Patents"
              value={Number(patents.totalPatents || 0).toLocaleString('en-IN')}
              subtitle="Distinct Patent Records"
              icon={Award}
              className="border-t-2 border-t-[#2855B9]"
              onClick={() => handleOpenDrilldown('total', 'Total Patents', 'patents')}
            />
            <StatCard
              title="Applications Filed"
              value={Number(patents.applicationsFiled || 0).toLocaleString('en-IN')}
              subtitle="Filed / Submitted Patents"
              icon={FileText}
              className="border-t-2 border-t-sky-600"
              onClick={() => handleOpenDrilldown('filed', 'Filed Patents', 'patents')}
            />
            <StatCard
              title="Granted Patents"
              value={Number(patents.grantedPatents || 0).toLocaleString('en-IN')}
              subtitle="Formally Granted by IPO/WIPO"
              icon={CheckCircle2}
              className="border-t-2 border-t-emerald-600"
              onClick={() => handleOpenDrilldown('granted', 'Granted Patents', 'patents')}
            />
            <StatCard
              title="Licensed Patents"
              value={Number(patents.licensedPatents || 0).toLocaleString('en-IN')}
              subtitle="Commercialized Technologies"
              icon={TrendingUp}
              className="border-t-2 border-t-amber-500"
              onClick={() => handleOpenDrilldown('licensed', 'Licensed / Commercialized Patents', 'patents')}
            />
            <StatCard
              title="Total Revenue"
              value={patents.totalRevenueFormatted || '₹ 0.00'}
              subtitle="Cumulative Licensing Income"
              icon={DollarSign}
              className="border-t-2 border-t-indigo-600"
              onClick={() => handleOpenDrilldown('licensed', 'Revenue-Generating Patents', 'patents')}
            />
          </div>

          {/* Charts Row 1: Status Distribution & Type Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Patent Status Distribution</h3>
              <p className="text-xs text-slate-500 mb-4">Breakdown by current examination/grant stage</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={patents.statusDistribution || []}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={74}
                      paddingAngle={3}
                    >
                      {(patents.statusDistribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-status-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => [`${v} Patents`, 'Count']}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Patent Type Classification</h3>
              <p className="text-xs text-slate-500 mb-4">National (Indian) vs International (PCT/USPTO)</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={patents.typeDistribution || []}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={74}
                      paddingAngle={3}
                    >
                      {(patents.typeDistribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-type-${index}`} fill={PIE_COLORS[(index + 2) % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => [`${v} Patents`, 'Count']}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2: Patents by Publication Year */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-slate-900">Patents by Publication Year</h3>
              <Badge variant="outline" className="text-[10px] bg-slate-50 font-normal">
                Derived exclusively from Publication Date
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mb-4">Official publication timeline of institutional patents</p>
            <div className="h-56">
              {(!patents.patentsByPublicationYear || patents.patentsByPublicationYear.length === 0) ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No publication year data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={patents.patentsByPublicationYear} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="year" stroke="#CBD5E1" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} />
                    <YAxis stroke="#CBD5E1" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11px' }}
                      formatter={(val: any) => [`${val} Patents`, 'Count']}
                    />
                    <Bar dataKey="count" name="Patents Published" fill={IPR_COLORS.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Commercial Partners Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Commercial & Industry Partners</h3>
            <p className="text-xs text-slate-500 mb-3">Leading technology transfer and licensing corporate partners</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Commercial Partner</th>
                    <th className="py-2.5 px-3 text-center">Licensed Patents</th>
                    <th className="py-2.5 px-3 text-right">Revenue Generated (INR)</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!patents.topCommercialPartners || patents.topCommercialPartners.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400">
                        No commercial partner records recorded
                      </td>
                    </tr>
                  ) : (
                    patents.topCommercialPartners.map((part: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-900">{part.partner}</td>
                        <td className="py-2 px-3 text-center font-medium">{part.count}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">{part.revenueFormatted}</td>
                        <td className="py-2 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2 text-blue-600 hover:text-blue-800"
                            onClick={() => handleOpenDrilldown('partner', `Partner: ${part.partner}`, 'patents', { partnerName: part.partner })}
                          >
                            View Records
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. VIEW 3: COPYRIGHTS ANALYTICS                          */}
      {/* ======================================================== */}
      {!loading && !error && subView === 'copyrights' && (
        <div className="space-y-6">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              title="Total Copyrights"
              value={Number(copyrights.totalCopyrights || 0).toLocaleString('en-IN')}
              subtitle="Distinct Copyright Records"
              icon={BookOpen}
              className="border-t-2 border-t-[#7C3AED]"
              onClick={() => handleOpenDrilldown('total', 'Total Copyrights', 'copyrights')}
            />
            <StatCard
              title="Applications Filed"
              value={Number(copyrights.applicationsFiled || 0).toLocaleString('en-IN')}
              subtitle="Submitted Applications (Excl. Drafts)"
              icon={FileText}
              className="border-t-2 border-t-purple-600"
              onClick={() => handleOpenDrilldown('filed', 'Filed Copyright Applications', 'copyrights')}
            />
            <StatCard
              title="Registered Copyrights"
              value={Number(copyrights.registeredCopyrights || 0).toLocaleString('en-IN')}
              subtitle="Registration No. Formally Issued"
              icon={CheckCircle2}
              className="border-t-2 border-t-emerald-600"
              onClick={() => handleOpenDrilldown('registered', 'Registered Copyrights', 'copyrights')}
            />
            <StatCard
              title="Pending Registration"
              value={Number(copyrights.pendingRegistration || 0).toLocaleString('en-IN')}
              subtitle="Diary No. / Awaiting Certificate"
              icon={Clock}
              className="border-t-2 border-t-amber-500"
              onClick={() => handleOpenDrilldown('pending', 'Pending Copyright Registrations', 'copyrights')}
            />
          </div>

          {/* Charts Row 1: Registration Status & Application Year */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Registration Status</h3>
              <p className="text-xs text-slate-500 mb-4">Registration No. Issued vs Pending Diary</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={copyrights.registrationDistribution || []}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={74}
                      paddingAngle={3}
                    >
                      {(copyrights.registrationDistribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-reg-${index}`} fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => [`${v} Copyrights`, 'Count']}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs lg:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-slate-900">Copyrights by Application Year</h3>
                <Badge variant="outline" className="text-[10px] bg-slate-50 font-normal">
                  Calendar Year from Date of Application
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mb-4">Annual trend of intellectual creative work filings</p>
              <div className="h-56">
                {(!copyrights.copyrightsByApplicationYear || copyrights.copyrightsByApplicationYear.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No application year data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={copyrights.copyrightsByApplicationYear} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="year" stroke="#CBD5E1" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} />
                      <YAxis stroke="#CBD5E1" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11px' }}
                        formatter={(val: any) => [`${val} Copyrights`, 'Count']}
                      />
                      <Bar dataKey="count" name="Applications" fill={IPR_COLORS.purple} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Department Contribution Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-slate-900">Department-wise Copyright Filings</h3>
              <Badge variant="outline" className="text-[10px] bg-slate-50">
                Attribution Basis: {attributionBasis === 'current' ? 'Current Department' : 'Original Department'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mb-3">Distinct copyright contributions mapped to academic departments</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Academic Department</th>
                    <th className="py-2.5 px-3 text-center">Copyrights Count</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!copyrights.departmentContribution || copyrights.departmentContribution.length === 0) ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-400">
                        No department copyright records found
                      </td>
                    </tr>
                  ) : (
                    copyrights.departmentContribution.map((d: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3 font-semibold text-slate-900">{d.department}</td>
                        <td className="py-2 px-3 text-center font-bold text-[#7C3AED]">{d.count}</td>
                        <td className="py-2 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2 text-purple-600 hover:text-purple-800"
                            onClick={() => handleOpenDrilldown('department', `Copyrights: ${d.department}`, 'copyrights', { department: d.department })}
                          >
                            View Records
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MULTI-DEPARTMENT COMPARISON MATRIX (When Active)     */}
      {/* ======================================================== */}
      {isCompareMode && compareDepartments.length > 0 && !loading && (
        <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-blue-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-blue-950 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                Multi-Department IPRs Comparison Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Side-by-side benchmarking across {compareDepartments.length} selected academic departments
              </p>
            </div>
            <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-800 border-blue-200">
              Deduplication Guard Active
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3 text-center">Patents</th>
                  <th className="py-2.5 px-3 text-center">Copyrights</th>
                  <th className="py-2.5 px-3 text-center font-bold text-[#2855B9]">Total IPRs</th>
                  <th className="py-2.5 px-3 text-center">Granted Patents</th>
                  <th className="py-2.5 px-3 text-center">Reg. Copyrights</th>
                  <th className="py-2.5 px-3 text-right">Revenue (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview.departmentContribution
                  ?.filter((d: any) => compareDepartments.includes(d.department))
                  .map((dept: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2 px-3 font-semibold text-slate-900">{dept.department}</td>
                      <td className="py-2 px-3 text-center font-medium">{dept.patents}</td>
                      <td className="py-2 px-3 text-center font-medium">{dept.copyrights}</td>
                      <td className="py-2 px-3 text-center font-bold text-[#2855B9]">{dept.totalIprs}</td>
                      <td className="py-2 px-3 text-center text-emerald-700 font-medium">
                        {patents.statusDistribution?.find((s: any) => s.status.toLowerCase().includes('grant'))?.count || 0}
                      </td>
                      <td className="py-2 px-3 text-center text-emerald-700 font-medium">
                        {copyrights.registeredCopyrights || 0}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-emerald-800">
                        {dept.revenueFormatted || '₹ 0.00'}
                      </td>
                    </tr>
                  ))}

                {/* Deduplicated Union Total Row */}
                <tr className="bg-blue-50/80 font-bold text-blue-950 border-t-2 border-blue-200">
                  <td className="py-2.5 px-3">
                    Multi-Department Deduplicated Total:
                  </td>
                  <td className="py-2.5 px-3 text-center">{overview.totalPatents || 0}</td>
                  <td className="py-2.5 px-3 text-center">{overview.totalCopyrights || 0}</td>
                  <td className="py-2.5 px-3 text-center text-[#2855B9] text-sm">
                    {overview.totalIprs || 0}
                  </td>
                  <td className="py-2.5 px-3 text-center text-emerald-800">
                    {patents.grantedPatents || 0}
                  </td>
                  <td className="py-2.5 px-3 text-center text-emerald-800">
                    {copyrights.registeredCopyrights || 0}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-900">
                    {overview.totalRevenueFormatted || '₹ 0.00'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-2.5 bg-blue-50/40 rounded text-[11px] text-blue-800 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>Deduplication Safeguard:</strong> Shared patents or copyrights co-authored by faculty members across multiple selected departments are attributed once to each participating department in the individual breakdown, but counted exactly once in the combined Multi-Department Total.
            </span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. INTERACTIVE DRILL-DOWN SOURCE RECORDS MODAL            */}
      {/* ======================================================== */}
      <Dialog open={drilldownOpen} onOpenChange={setDrilldownOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  {drilldownTitle}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing authorized, filtered source records from institutional database
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-semibold bg-white">
                {filteredDrilldownList.length} Records Found
              </Badge>
            </div>
          </DialogHeader>

          <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
            {/* Search filter in modal */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search by title, inventor, registration number, or department..."
                value={drilldownSearch}
                onChange={(e) => setDrilldownSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {drilldownLoading ? (
              <div className="p-12 text-center text-xs text-slate-500">
                <Clock className="w-5 h-5 animate-spin mx-auto mb-2 text-[#2855B9]" />
                <span>Loading source records...</span>
              </div>
            ) : filteredDrilldownList.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No matching source records found for the selected scope and filters.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Title & Details</th>
                      <th className="py-2 px-3">Module</th>
                      <th className="py-2 px-3">Department</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Year / Date</th>
                      <th className="py-2 px-3 text-right">Identifier / Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDrilldownList.map((rec: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-3 max-w-[280px]">
                          <p className="font-semibold text-slate-900 line-clamp-2 leading-snug">{rec.title}</p>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {rec.inventorsOrCreators}
                          </p>
                        </td>
                        <td className="py-2 px-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              rec.module === 'Patent'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {rec.module}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-slate-600 max-w-[140px] truncate">{rec.department}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              rec.status.toLowerCase().includes('grant') || rec.status.toLowerCase().includes('register')
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : rec.status.toLowerCase().includes('commercial')
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <p className="font-medium text-slate-900">{rec.year}</p>
                          <p className="text-[10px] text-slate-400">{rec.date}</p>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <p className="font-mono text-[11px] text-slate-700">{rec.registrationOrAppNo}</p>
                          {rec.revenue > 0 && (
                            <p className="text-[10px] font-bold text-emerald-700">₹ {Number(rec.revenue).toLocaleString('en-IN')}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Records are strictly restricted to your authorized organizational scope.
            </span>
            <Button
              size="sm"
              onClick={() => setDrilldownOpen(false)}
              className="bg-[#2855B9] text-white hover:bg-[#1C355B] text-xs px-5"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


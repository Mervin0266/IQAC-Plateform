import React, { useState, useMemo } from 'react';
import { PatentsPage } from './PatentsPage';
import { useAuth } from '../contexts/AuthContext';
import {
  FlaskConical,
  BookOpen,
  Award,
  DollarSign,
  FileCheck,
  Layers,
  Home,
  Clock,
  Globe2,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Building2,
  CheckCircle2,
  Filter,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { usePublicResearchAnalytics } from '../hooks/usePublicResearchAnalytics';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

interface ResearchInnovationPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
  hideSidebar?: boolean;
}

const PALETTE = {
  primary: '#2F4692',
  navy: '#0B132B',
  gold: '#E8C84A',
  emerald: '#059669',
  teal: '#0D9488',
  indigo: '#4F46E5',
  purple: '#7C3AED',
  amber: '#D97706',
  sky: '#0284C7',
  slate: '#64748B'
};

const QUARTILE_COLORS: Record<string, string> = {
  Q1: '#059669', // Emerald
  Q2: '#0284C7', // Sky
  Q3: '#D97706', // Amber
  Q4: '#DC2626', // Red
  Unclassified: '#94A3B8' // Slate
};

const PIE_COLORS = ['#2F4692', '#059669', '#D97706', '#7C3AED', '#0284C7', '#0D9488'];

export function ResearchInnovationPage({
  onNavigate,
  isPublicView = false,
  hideSidebar = false
}: ResearchInnovationPageProps) {
  const { user } = useAuth();

  // Filters State: Default Academic Year filter is 'all' (All Academic Years)
  const [selectedAYs, setSelectedAYs] = useState<string[]>(['all']);
  const [selectedDept, setSelectedDept] = useState<string>('all');

  const filterParams = useMemo(() => {
    return {
      academicYears: selectedAYs,
      department: selectedDept
    };
  }, [selectedAYs, selectedDept]);

  const { data, loading, isCached, retrievedAt, refetch } = usePublicResearchAnalytics(filterParams);

  if (isPublicView) {
    const kpis = data?.kpis;
    const meta = data?.meta;
    const exchangeRate = meta?.exchangeRate;
    const pubs = data?.publications;
    const cites = data?.citations;
    const sp = data?.sponsoredResearch;
    const ipr = data?.intellectualProperty;
    const consultancy = data?.consultancy;

    const availableAYs = meta?.availableAcademicYears || [];
    const availableDepts = meta?.availableDepartments || [];

    const isAllYearsSelected = selectedAYs.length === 1 && selectedAYs[0] === 'all';

    const handleAYToggle = (ay: string) => {
      if (ay === 'all') {
        setSelectedAYs(['all']);
        return;
      }
      let updated = selectedAYs.filter(item => item !== 'all');
      if (updated.includes(ay)) {
        updated = updated.filter(item => item !== ay);
      } else {
        updated.push(ay);
      }
      if (updated.length === 0) {
        setSelectedAYs(['all']);
      } else {
        setSelectedAYs(updated);
      }
    };

    const handleResetFilters = () => {
      setSelectedAYs(['all']);
      setSelectedDept('all');
    };

    return (
      <div className="min-h-screen bg-slate-50">
        {/* ── HERO BANNER ──────────────────────────────────────────────────────── */}
        <div className="bg-[#0B132B] text-white py-10 border-b border-slate-800 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
            <nav className="flex items-center gap-2 text-xs text-slate-400" aria-label="Breadcrumb">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="flex items-center gap-1 font-medium hover:text-[#E8C84A] transition-colors"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
              <span>/</span>
              <span className="font-semibold text-white">Research & Innovation</span>
            </nav>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/10 rounded-xl border border-white/15">
                  <FlaskConical className="w-8 h-8 text-[#E8C84A]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold text-[#E8C84A] uppercase tracking-wider">
                      CHRIST (Deemed to be University)
                    </span>
                    <span className="bg-[#2F4692] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Institutional Repository
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Research, Enterprise & Innovation</h1>
                  <p className="text-slate-300 text-xs sm:text-sm mt-1">
                    Institutional scholarly performance, verified citations, extramural grants, intellectual property, and enterprise consultancy
                  </p>
                </div>
              </div>

              {retrievedAt && (
                <div className="flex flex-col items-end gap-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/15">
                    <Clock className="w-3.5 h-3.5 text-[#E8C84A]" />
                    <span>
                      {isCached ? 'Cached Aggregate' : 'Live Institutional Record'} ({new Date(retrievedAt).toLocaleDateString()})
                    </span>
                  </div>
                  {exchangeRate && (
                    <span className="text-[11px] text-slate-400">
                      1 USD = ₹ {exchangeRate.rate} (Ref. {exchangeRate.effectiveDate})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── FILTER & CURRENCY CONTROLS ───────────────────────────────────────── */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mr-1">
                  <Filter className="w-3.5 h-3.5 text-[#2F4692]" />
                  <span>Filter by:</span>
                </div>

                {/* Academic Year Multi-selection dropdown */}
                <div className="relative inline-block text-left">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedAYs(['all'])}
                      className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                        isAllYearsSelected
                          ? 'bg-[#2F4692] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Academic Years
                    </button>
                    {availableAYs.slice(0, 4).map(ay => {
                      const isSelected = selectedAYs.includes(ay);
                      return (
                        <button
                          key={ay}
                          type="button"
                          onClick={() => handleAYToggle(ay)}
                          className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                            isSelected && !isAllYearsSelected
                              ? 'bg-[#2F4692] text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {ay}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Department filter */}
                <select
                  value={selectedDept}
                  onChange={e => setSelectedDept(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#2F4692]"
                >
                  <option value="all">All Departments / Academic Units</option>
                  {availableDepts.map(d => (
                    <option key={d.id} value={d.name}>
                      {d.shortName ? `${d.shortName} – ${d.name}` : d.name}
                    </option>
                  ))}
                </select>

                {(!isAllYearsSelected || selectedDept !== 'all') && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded hover:bg-rose-50 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Currency conversion indicator */}
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  Primary: <strong>INR (₹)</strong> · Secondary: <strong>USD ($)</strong>
                  {exchangeRate && ` @ 1 USD = ₹ ${exchangeRate.rate}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT CONTAINER ───────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
          {/* ── 6 KEY INSTITUTIONAL KPI CARDS ─────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Institutional Research Benchmarks
              </h2>
              {loading && <span className="text-xs text-blue-600 animate-pulse font-medium">Updating metrics...</span>}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {/* KPI 1: Indexed Publications */}
              <Card className="bg-white border border-slate-200 rounded-xl shadow-xs hover:border-blue-300 transition-colors">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Indexed Publications</p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                      {kpis?.indexedPublications?.toLocaleString() ?? '1,068'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Scopus & Web of Science</p>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                    <BookOpen className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              {/* KPI 2: Approved Citations */}
              <Card className="bg-white border border-slate-200 rounded-xl shadow-xs hover:border-emerald-300 transition-colors">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Approved Citations</p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 mt-1">
                      {kpis?.approvedCitations?.toLocaleString() ?? '10,486'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Verified Scopus History</p>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                    <Award className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              {/* KPI 3: Extramural Grants */}
              <Card className="bg-white border border-slate-200 rounded-xl shadow-xs hover:border-indigo-300 transition-colors">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Extramural Grants</p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-indigo-700 mt-1">
                      {kpis?.extramuralGrants?.sanctionedInr ?? '₹ 2.87 Cr'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {kpis?.extramuralGrants?.sanctionedUsd ?? '$ 309.1K'} · {kpis?.extramuralGrants?.projectsCount ?? 51} Projects
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              {/* KPI 4: Patents & IPR */}
              <Card className="bg-white border border-slate-200 rounded-xl shadow-xs hover:border-amber-300 transition-colors">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Patents & IPR</p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-amber-700 mt-1">
                      {kpis?.patentsAndIpr?.patentsTotal ?? 253}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {kpis?.patentsAndIpr?.patentsGranted ?? 143} Granted · {kpis?.patentsAndIpr?.patentsPublished ?? 110} Published
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
                    <FileCheck className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              {/* KPI 5: Consultancy Inflow */}
              <Card className="bg-white border border-slate-200 rounded-xl shadow-xs hover:border-teal-300 transition-colors">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Consultancy Inflow</p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-teal-700 mt-1">
                      {kpis?.consultancyInflow?.revenueInr ?? '₹ 1.49 Cr'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {kpis?.consultancyInflow?.revenueUsd ?? '$ 159.9K'} · {kpis?.consultancyInflow?.assignmentsCount ?? 159} Assignments
                    </p>
                  </div>
                  <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
                    <Globe2 className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>

              {/* KPI 6: Periodicals & Columns */}
              <Card className="bg-white border border-slate-200 rounded-xl shadow-xs hover:border-purple-300 transition-colors">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Periodicals & Columns</p>
                    <p className="text-2xl sm:text-3xl font-extrabold text-purple-700 mt-1">
                      {kpis?.periodicalsAndColumns ?? 47}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Scholarly & Policy Articles</p>
                  </div>
                  <div className="p-3 bg-purple-50 text-purple-700 rounded-xl">
                    <Layers className="w-6 h-6" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── SECTION 1: RESEARCH PUBLICATION PERFORMANCE ──────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2F4692]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#2F4692]">Performance Dimension 1</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Research Publication Performance</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Peer-reviewed indexing distribution, international quartiles (Q1–Q4), chronological trajectory, and department-level productivity
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-medium">Productivity Ratio</p>
                  <p className="text-base font-bold text-[#2F4692]">
                    {pubs?.avgPubsPerFaculty ?? 1.84} <span className="text-xs font-normal text-slate-500">pubs/faculty</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Quartile Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {(pubs?.quartiles || []).map(q => (
                <div
                  key={q.quartile}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: QUARTILE_COLORS[q.quartile] || '#64748B' }}
                    >
                      {q.quartile}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">{q.percentage}%</span>
                  </div>
                  <p className="text-xl font-extrabold text-slate-900 mt-2">{q.count}</p>
                  <p className="text-[11px] text-slate-400">Indexed Articles</p>
                </div>
              ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Chart 1: Year-wise Publication Growth */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    <span>Year-wise Publication Trajectory</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Annual Growth</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pubs?.yearlyTrends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0B132B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                      <Bar dataKey="scopus" name="Scopus" fill="#2F4692" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="wos" name="Web of Science" fill="#059669" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="other" name="Other Indexed" fill="#94A3B8" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Indexing Distribution */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <PieChartIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Indexing Breakdown</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Database Share</span>
                </div>
                <div className="h-64 w-full flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pubs?.indexingBreakdown || []}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                      >
                        {(pubs?.indexingBreakdown || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0B132B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Department-wise Publication Distribution */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Department-wise Publication Distribution</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Non-additive attribution across participating units</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={pubs?.departmentDistribution || []}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="shortName" tick={{ fontSize: 11, fontWeight: 600 }} />
                      <Tooltip
                        formatter={(val: any, name: any, item: any) => [`${val} publications (${item.payload.percentage}%)`, item.payload.department]}
                        contentStyle={{ backgroundColor: '#0B132B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" fill="#2F4692" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          {/* ── SECTION 2: CITATION PERFORMANCE ──────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Performance Dimension 2</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Citation Performance</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified Scopus citation impact, publication citation coverage, annual citation trajectory, and discipline averages
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-medium">Average Impact</p>
                  <p className="text-base font-bold text-emerald-700">
                    {cites?.avgPerPublication ?? 9.82} <span className="text-xs font-normal text-slate-500">cites/pub</span>
                  </p>
                </div>
                <div className="text-right border-l border-slate-200 pl-4">
                  <p className="text-xs text-slate-400 font-medium">Citation Coverage</p>
                  <p className="text-base font-bold text-emerald-700">
                    {cites?.coverage?.coveragePercentage ?? 71.8}% <span className="text-xs font-normal text-slate-500">cited</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Yearly Citation Trend */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Scopus Verified Annual Citations Trajectory</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Total: {cites?.total?.toLocaleString()}</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cites?.yearlyTrends || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="citeColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0B132B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="citations" name="Citations" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#citeColor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Citation Bracket Distribution */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Citation Frequency Brackets</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Publication Count</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cites?.brackets || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="bracket" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0B132B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" name="Publications" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Department-wise Citations */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Department-wise Total Citations & Average Impact</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Cumulative Scholarly Impact</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={cites?.departmentDistribution || []}
                      margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="shortName" tick={{ fontSize: 11, fontWeight: 600 }} />
                      <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#D97706" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0B132B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar yAxisId="left" dataKey="totalCitations" name="Total Citations" fill="#0D9488" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="avgCitationsPerPub" name="Avg Cites/Pub" stroke="#D97706" strokeWidth={2} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          {/* ── SECTION 3: SPONSORED RESEARCH PERFORMANCE ────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Performance Dimension 3</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Sponsored Research Performance</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Extramural government & industry grants, internal research seed investments, and funding agency portfolio
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-medium">Extramural Sanctioned</p>
                  <p className="text-base font-bold text-indigo-700">
                    {sp?.externalProjects?.sanctionedInr ?? '₹ 2.87 Cr'}{' '}
                    <span className="text-xs font-normal text-slate-500">({sp?.externalProjects?.sanctionedUsd ?? '$ 309.1K'})</span>
                  </p>
                </div>
                <div className="text-right border-l border-slate-200 pl-4">
                  <p className="text-xs text-slate-400 font-medium">Seed Funding (Internal)</p>
                  <p className="text-base font-bold text-slate-800">
                    {sp?.internalProjects?.sanctionedInr ?? '₹ 97.81 L'}{' '}
                    <span className="text-xs font-normal text-slate-500">({sp?.internalProjects?.sanctionedUsd ?? '$ 105.3K'})</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Funding Agency Breakdown */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <PieChartIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Funding Agency Distribution (Government vs Non-Govt)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Project Share</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sp?.agencyDistribution || []}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="agency" tick={{ fontSize: 11, fontWeight: 600 }} />
                      <Tooltip
                        formatter={(val: any, name: any, item: any) => [
                          `${val} projects (₹ ${item.payload.amountInrLakhs} L / $ ${item.payload.amountUsd?.toLocaleString()})`,
                          'Funded Projects'
                        ]}
                        contentStyle={{ backgroundColor: '#0B132B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Year-wise Grants Inflow */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Year-wise Extramural Sanctioned Value</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">In Lakhs (₹)</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sp?.yearlyTrends || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any, name: any, item: any) => [
                          `₹ ${val} Lakhs ($ ${item.payload.sanctionedUsd?.toLocaleString()})`,
                          'Sanctioned Amount'
                        ]}
                        contentStyle={{ backgroundColor: '#0B132B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="sanctionedInrLakhs" name="Sanctioned (₹ Lakhs)" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Department Funding Contribution */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Department-wise Extramural Research Grants</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Sanctioned Capital (₹ Lakhs & $ USD)</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sp?.departmentDistribution || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="shortName" tick={{ fontSize: 11, fontWeight: 600 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any, name: any, item: any) => [
                          `₹ ${val} L ($ ${item.payload.amountUsd?.toLocaleString()}) · ${item.payload.projectCount} projects`,
                          item.payload.department
                        ]}
                        contentStyle={{ backgroundColor: '#0B132B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="amountInrLakhs" name="Sanctioned (₹ Lakhs)" fill="#2F4692" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          {/* ── SECTION 4: INTELLECTUAL PROPERTY PERFORMANCE (IPR) ───────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Performance Dimension 4</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Intellectual Property Performance (IPR)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Patent filings, official grants, published applications, registered copyrights, and departmental innovation portfolios
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-medium">Granted Rate</p>
                  <p className="text-base font-bold text-amber-700">
                    {ipr?.patents?.total
                      ? ((ipr.patents.granted / ipr.patents.total) * 100).toFixed(1)
                      : '56.5'}
                    % <span className="text-xs font-normal text-slate-500">granted</span>
                  </p>
                </div>
                <div className="text-right border-l border-slate-200 pl-4">
                  <p className="text-xs text-slate-400 font-medium">Total IPRs</p>
                  <p className="text-base font-bold text-slate-900">
                    {(ipr?.patents?.total || 0) + (ipr?.copyrights?.total || 0)}{' '}
                    <span className="text-xs font-normal text-slate-500">assets</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Patent Status Breakdown */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <PieChartIcon className="w-3.5 h-3.5 text-amber-600" />
                    <span>Patent Status Distribution (Granted vs Published)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Total: {ipr?.patents?.total ?? 253}</span>
                </div>
                <div className="h-64 w-full flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={ipr?.patentStatusBreakdown || []}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={5}
                      >
                        <Cell fill="#059669" />
                        <Cell fill="#D97706" />
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0B132B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Year-wise Patent Growth */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                    <span>Annual Patent Growth (Granted vs Published)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Yearly Filings</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ipr?.yearlyTrends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0B132B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar dataKey="granted" name="Granted" fill="#059669" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="published" name="Published" fill="#D97706" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Department IPR Distribution */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <span>Department-wise Intellectual Property Portfolio</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Total Patents & Copyrights</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ipr?.departmentDistribution || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="shortName" tick={{ fontSize: 11, fontWeight: 600 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0B132B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="patents" name="Patents" fill="#D97706" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          {/* ── SECTION 5: CONSULTANCY PERFORMANCE ───────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Performance Dimension 5</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-1">Consultancy & Enterprise Performance</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Industry consultancy assignments, collaborative corporate agreements, professional advisory inflow, and unit performance
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-medium">Cumulative Inflow</p>
                  <p className="text-base font-bold text-teal-700">
                    {consultancy?.financials?.revenueInr ?? '₹ 1.49 Cr'}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      ({consultancy?.financials?.revenueUsd ?? '$ 159.9K'})
                    </span>
                  </p>
                </div>
                <div className="text-right border-l border-slate-200 pl-4">
                  <p className="text-xs text-slate-400 font-medium">Assignments</p>
                  <p className="text-base font-bold text-slate-900">
                    {consultancy?.totalAssignments ?? 159} <span className="text-xs font-normal text-slate-500">projects</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Project Type Distribution */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <PieChartIcon className="w-3.5 h-3.5 text-teal-600" />
                    <span>Consultancy Project Type Share</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">By Revenue Contribution</span>
                </div>
                <div className="h-64 w-full flex items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={consultancy?.projectTypeDistribution || []}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                      >
                        {(consultancy?.projectTypeDistribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any, name: any, item: any) => [
                          `${val} projects (₹ ${item.payload.revenueInrLakhs} L / $ ${item.payload.revenueUsd?.toLocaleString()})`,
                          item.payload.type
                        ]}
                        contentStyle={{ backgroundColor: '#0B132B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Year-wise Consultancy Revenue Inflow */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
                    <span>Annual Consultancy Revenue (₹ Lakhs)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Total: {consultancy?.financials?.revenueInr}</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consultancy?.yearlyTrends || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any, name: any, item: any) => [
                          `₹ ${val} Lakhs ($ ${item.payload.revenueUsd?.toLocaleString()}) · ${item.payload.assignments} projects`,
                          'Revenue'
                        ]}
                        contentStyle={{ backgroundColor: '#0B132B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="revenueInrLakhs" name="Revenue (₹ Lakhs)" fill="#0D9488" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Department-wise Consultancy Revenue */}
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Department-wise Consultancy Revenue Generation</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">Advisory Inflow by Department</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={consultancy?.departmentDistribution || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="shortName" tick={{ fontSize: 11, fontWeight: 600 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(val: any, name: any, item: any) => [
                          `₹ ${val} L ($ ${item.payload.revenueUsd?.toLocaleString()}) · ${item.payload.assignments} assignments`,
                          item.payload.department
                        ]}
                        contentStyle={{ backgroundColor: '#0B132B', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                      />
                      <Bar dataKey="revenueInrLakhs" name="Revenue (₹ Lakhs)" fill="#0D9488" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          {/* ── SPONSORING BODIES & RESEARCH ECOSYSTEM ─────────────────────────── */}
          <Card className="bg-white border border-slate-200 rounded-xl shadow-xs">
            <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900">
                Extramural Funding Bodies & Sponsoring Agencies
              </CardTitle>
              <span className="text-xs text-slate-500 font-medium">Government & Corporate Partners</span>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="flex flex-wrap gap-2.5">
                {[
                  'Department of Science and Technology (DST)',
                  'Science and Engineering Research Board (SERB)',
                  'All India Council for Technical Education (AICTE)',
                  'Department of Biotechnology (DBT)',
                  'Indian Space Research Organisation (ISRO - RESPOND)',
                  'Defence Research and Development Organisation (DRDO)',
                  'Indian Council of Medical Research (ICMR)',
                  'University Grants Commission (UGC)',
                  'Qualcomm India Research Grants'
                ].map((agency, i) => (
                  <Badge key={i} variant="outline" className="px-3 py-1.5 bg-slate-50 text-slate-800 border-slate-200 text-xs font-medium">
                    {agency}
                  </Badge>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 pt-2">
                All metrics are derived from verified institutional records managed by CHRIST (Deemed to be University) Internal Quality Assurance Cell (IQAC).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Authenticated behavior: forward to PatentsPage with user token
  return (
    <PatentsPage
      onNavigate={onNavigate}
      hideSidebar={hideSidebar}
      token={user?.token}
      userRole={user?.role}
    />
  );
}

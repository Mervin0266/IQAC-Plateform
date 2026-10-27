/**
 * DashboardPage — Institutional Intelligence & Quality Dashboard
 *
 * Unified executive dashboard providing real-time analytics across:
 * 1. Academic Hierarchy & Enrolment
 * 2. Research & Innovation Metrics
 * 3. NAAC / NBA Accreditation Readiness
 * 4. NIRF & Global Rankings Performance
 * 5. Campus Placements & Corporate Engagement
 */

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { AppShell, PageHeader, StatCard, SectionCard } from './design-system';
import { RoleIndicator } from './RoleIndicator';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuth } from '../contexts/AuthContext';
import {
  Award, BookOpen, Users, TrendingUp, Briefcase,
  Star, Target, Building2, GraduationCap,
  LayoutGrid, RefreshCw, ArrowUpRight,
  ChevronRight, FileSpreadsheet, Compass
} from 'lucide-react';
import { Progress } from './ui/progress';
import { ClearDatabaseButton } from './ClearDatabaseButton';
import { PlacementStatsCard } from './dashboard/PlacementStatsCard';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const { user } = useAuth();
  const dashboard = useDashboardData();
  const [activeTab, setActiveTab] = useState<'overview' | 'placements' | 'research' | 'accreditation'>('overview');

  // Quick Modules Directory (Dynamically connected to real database counts)
  const quickModules = [
    {
      title: 'Research & Innovation',
      route: 'research-metrics',
      icon: BookOpen,
      desc: 'Publications, patents, grants & consultancy projects',
      stat: `${dashboard.liveStats.totalPapers ?? 0} Papers • ₹ ${dashboard.liveStats.totalGrantsCrores || '0.00'} Cr Grants`,
    },
    {
      title: 'Accreditation Master',
      route: 'naac-accreditation',
      icon: Award,
      desc: 'NAAC SSR 7 Criteria & NBA SAR 10 Criteria tracking',
      stat: `Grade ${dashboard.liveStats.naacGrade || 'A++'} (${dashboard.liveStats.naacCgpa || '3.74'} CGPA) • ${dashboard.liveStats.readinessPct ?? 0}%`,
    },
    {
      title: 'National & Global Rankings',
      route: 'nirf-ranking',
      icon: TrendingUp,
      desc: 'NIRF, India Today MDRA, THE World & QS India ranks',
      stat: 'NIRF Univ #63 • Engg #76',
    },
    {
      title: 'Placements & Internships',
      route: 'placements-internships',
      icon: Briefcase,
      desc: 'Campus recruitment, compensation & corporate hiring',
      stat: `${dashboard.liveStats.placedPercentage ?? 0}% Placed • ₹ ${dashboard.liveStats.avgSalaryLpa || '0.0'} LPA Avg`,
    },
    {
      title: 'Centres of Excellence',
      route: 'centre-excellence',
      icon: Star,
      desc: 'Multi-disciplinary labs, GPU clusters & industry R&D',
      stat: `${dashboard.liveStats.totalActivities ?? 0} Events • 4 Active Hubs`,
    },
    {
      title: 'Strategic Plan 2025–2030',
      route: 'strategic-plan',
      icon: Target,
      desc: 'Department goals, milestones & capital budget',
      stat: `${dashboard.liveStats.totalStrategicPlans ?? 0} Goals Attained`,
    },
  ];

  // Export Executive Summary to Excel
  const handleExportSummary = () => {
    const summaryRows = [
      { Dimension: 'Total Students Enrolled', Value: dashboard.liveStats.totalStudents ?? 0, Notes: 'Registered student database' },
      { Dimension: 'Total Faculty Members', Value: dashboard.liveStats.totalFaculty ?? 0, Notes: `SFR: ${dashboard.liveStats.sfr || '—'}` },
      { Dimension: 'Total Campuses', Value: dashboard.liveStats.totalCampuses || 1, Notes: 'Kengeri Campus Bangalore' },
      { Dimension: 'Total Schools', Value: dashboard.liveStats.totalSchools || 1, Notes: 'School of Engineering and Technology' },
      { Dimension: 'Total Departments', Value: dashboard.liveStats.totalDepartments || 8, Notes: 'ADSE, CSE, ECE, CIVIL, EEE, MECH, SOA, S&H' },
      { Dimension: 'Total Academic Programs', Value: dashboard.liveStats.totalCourses || 27, Notes: 'UG, PG, PhD Degree Programs' },
      { Dimension: 'NAAC Projected CGPA', Value: `${dashboard.liveStats.naacCgpa || '3.74'} / 4.00`, Notes: `Grade ${dashboard.liveStats.naacGrade || 'A++'}` },
      { Dimension: 'Campus Placement Rate', Value: `${dashboard.liveStats.placedPercentage ?? 0}%`, Notes: `Placed students (${dashboard.liveStats.totalPlacements ?? 0} total records)` },
      { Dimension: 'Average Compensation', Value: `₹ ${dashboard.liveStats.avgSalaryLpa || '0.0'} LPA`, Notes: 'Mean CTC' },
      { Dimension: 'Research Papers & Articles', Value: dashboard.liveStats.totalPapers ?? 0, Notes: 'Scopus, WoS, National, International' },
      { Dimension: 'Patents Filed & Granted', Value: dashboard.liveStats.totalPatents ?? 0, Notes: 'Indian & International IPR' },
      { Dimension: 'Research Grants Received', Value: `₹ ${dashboard.liveStats.totalGrantsCrores || '0.00'} Crores`, Notes: 'Extramural research grants' },
    ];

    const ws = XLSX.utils.json_to_sheet(summaryRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Executive IQAC Summary');
    XLSX.writeFile(wb, `CHRIST_IQAC_Executive_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const formattedGrants =
    Number(dashboard.liveStats.totalGrantsCrores) > 0
      ? `₹ ${dashboard.liveStats.totalGrantsCrores} Cr`
      : Number(dashboard.liveStats.totalGrantsAmountLakhs) > 0
      ? `₹ ${Number(dashboard.liveStats.totalGrantsAmountLakhs).toFixed(2)} L`
      : '₹ 0.00';

  return (
    <AppShell currentPage="dashboard" onNavigate={onNavigate}>
      {/* 1. Universal Page Header */}
      <PageHeader
        breadcrumbs={[{ label: 'Home' }, { label: 'Executive Dashboard', active: true }]}
        title="Institutional Intelligence & Quality Dashboard"
        badge="Accreditation Cycle 4"
        description="Comprehensive institutional analytics covering academic census, faculty metrics, research outputs, accreditation readiness, and campus recruitment."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportSummary}
              className="inline-flex items-center gap-2 h-9 px-3.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Summary</span>
            </button>

            <button
              type="button"
              onClick={dashboard.refetchDashboard}
              disabled={dashboard.loading}
              className="inline-flex items-center gap-2 h-9 px-3.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all shadow-xs disabled:opacity-50"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${dashboard.loading ? 'animate-spin' : ''}`} />
              <span>{dashboard.loading ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>
        }
      />

      {/* Role & Context Indicator */}
      <RoleIndicator />

      {/* 2. 5 Core Institutional KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-stretch">
        <StatCard
          title="Student Census"
          value={(dashboard.liveStats.totalStudents ?? 0).toLocaleString()}
          subtitle={`${dashboard.liveStats.totalFaculty ?? 0} Faculty • SFR ${dashboard.liveStats.sfr || '—'}`}
          icon={GraduationCap}
          onClick={() => onNavigate('student-details')}
        />

        <StatCard
          title="Research Grants"
          value={formattedGrants}
          subtitle={`${dashboard.liveStats.totalPapers ?? 0} Papers • ${dashboard.liveStats.totalPatents ?? 0} Patents`}
          icon={BookOpen}
          onClick={() => onNavigate('research-metrics')}
        />

        <StatCard
          title="Accreditation"
          value={`${dashboard.liveStats.naacCgpa || '3.74'}`}
          badge={`Grade ${dashboard.liveStats.naacGrade || 'A++'}`}
          subtitle={`Readiness: ${dashboard.liveStats.readinessPct ?? 0}%`}
          icon={Award}
          onClick={() => onNavigate('naac-accreditation')}
        />

        <StatCard
          title="NIRF Standing"
          value="Rank #63"
          subtitle="Engg #76 • QS India #18"
          icon={TrendingUp}
          onClick={() => onNavigate('nirf-ranking')}
        />

        <StatCard
          title="Placements"
          value={`${dashboard.liveStats.placedPercentage ?? 0}%`}
          subtitle={`Avg ₹ ${dashboard.liveStats.avgSalaryLpa || '0.0'} LPA • High ${dashboard.liveStats.highestSalaryLpa || '0.0'} LPA`}
          icon={Briefcase}
          onClick={() => onNavigate('placements-internships')}
        />
      </div>

      {/* 3. Standardized Segmented Workspace View Switcher */}
      <div className="bg-slate-100/80 border border-slate-200/80 rounded-2xl p-1.5 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <nav className="flex flex-wrap items-center gap-1.5" aria-label="Dashboard views">
          {[
            { id: 'overview', label: 'Executive Overview', icon: LayoutGrid },
            { id: 'placements', label: 'Placements Analytics', icon: Briefcase },
            { id: 'research', label: 'Research Highlights', icon: BookOpen },
            { id: 'accreditation', label: 'Accreditation Readiness', icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white text-[#2F4692] shadow-xs border border-slate-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#2F4692]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <span className="text-[11px] text-slate-400 font-semibold px-3 hidden md:inline">
          IQAC Quality Portal v2.5
        </span>
      </div>

      {/* 4. Tab Content Panes */}
      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Quality Management Modules Directory */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 tracking-tight">
                <Compass className="w-4 h-4 text-[#2F4692]" />
                <span>Quality Management Workspaces</span>
              </h2>
              <span className="text-xs text-slate-500 font-medium">Direct Module Navigation</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
              {quickModules.map((mod, idx) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={idx}
                    onClick={() => onNavigate(mod.route)}
                    className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-transparent group-hover:bg-[#2F4692] transition-colors" />
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-50/80 border border-blue-100/80 flex items-center justify-center text-[#2F4692] group-hover:bg-[#2F4692] group-hover:text-white transition-all shadow-2xs">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-[#2F4692] group-hover:bg-slate-50 transition-all">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#2F4692] transition-colors line-clamp-1">
                        {mod.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2 h-9">
                        {mod.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                      <span className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-200/60 truncate max-w-[65%]">
                        {mod.stat}
                      </span>
                      <span className="text-[#2F4692] group-hover:text-[#12204D] flex items-center gap-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform">
                        <span>Access</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Academic Structural Hierarchy */}
          <SectionCard
            title="Academic Structural Hierarchy"
            subtitle="Campuses, academic schools, established engineering departments, and degree programs"
            actions={
              <button
                type="button"
                onClick={() => onNavigate('department-details')}
                className="text-xs font-semibold text-[#2F4692] hover:underline flex items-center gap-1"
              >
                <span>View Departments</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Campuses</span>
                <span className="text-2xl font-bold text-[#0B132B] mt-1 block tabular-nums">
                  {dashboard.liveStats.totalCampuses || 1} Campus
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block">Kengeri, Bangalore</span>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Faculty Schools</span>
                <span className="text-2xl font-bold text-[#0B132B] mt-1 block tabular-nums">
                  {dashboard.liveStats.totalSchools || 1} School
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block">School of Engineering</span>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Academic Depts</span>
                <span className="text-2xl font-bold text-[#0B132B] mt-1 block tabular-nums">
                  {dashboard.liveStats.totalDepartments || 7} Depts
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block">ADSE, CSE, ECE, Civil...</span>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Degree Programs</span>
                <span className="text-2xl font-bold text-[#0B132B] mt-1 block tabular-nums">
                  {dashboard.liveStats.totalCourses || 27} Courses
                </span>
                <span className="text-xs text-slate-500 mt-0.5 block">
                  UG: {dashboard.liveStats.totalUGPrograms || 18} • PG: {dashboard.liveStats.totalPGPrograms || 6}
                </span>
              </div>
            </div>
          </SectionCard>
        </div>
      ) : activeTab === 'placements' ? (
        <div className="space-y-6">
          <PlacementStatsCard
            placementView={dashboard.placementView}
            setPlacementView={dashboard.setPlacementView}
            selectedDepartment={dashboard.selectedDepartment}
            setSelectedDepartment={dashboard.setSelectedDepartment}
            selectedBatch={dashboard.selectedBatch}
            setSelectedBatch={dashboard.setSelectedBatch}
            deptData={dashboard.deptData}
            overallData={dashboard.overallData}
            activeSingleDept={dashboard.activeSingleDept}
            departmentsList={dashboard.departmentsList}
            batchesList={dashboard.batchesList}
            hasLiveData={dashboard.rawPlacements.length > 0}
          />
        </div>
      ) : activeTab === 'research' ? (
        <SectionCard
          title="Research & Grants Executive Highlights"
          subtitle="Peer-reviewed journals, extramural funded projects, and technology transfer patents"
          actions={
            <button
              type="button"
              onClick={() => onNavigate('research-metrics')}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white bg-[#2F4692] hover:bg-[#243A7A] rounded-lg transition-colors"
            >
              <span>Open Research Workspace</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <span className="text-xs font-bold uppercase text-slate-500 block">Publications & Citations</span>
              <div className="text-2xl font-bold text-[#0B132B] tabular-nums">
                {dashboard.liveStats.totalPapers ?? 0} Papers
              </div>
              <Progress
                value={
                  dashboard.liveStats.totalPapers
                    ? Math.min(100, Math.round((dashboard.liveStats.totalPapers / 500) * 100))
                    : 0
                }
                className="h-2 bg-slate-200"
              />
              <p className="text-xs text-slate-600">
                {dashboard.liveStats.scopusJournals ?? 0} Scopus / WoS indexed journal publications recorded.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <span className="text-xs font-bold uppercase text-slate-500 block">Funded Grants</span>
              <div className="text-2xl font-bold text-emerald-700 tabular-nums">
                {formattedGrants}
              </div>
              <Progress
                value={
                  Number(dashboard.liveStats.totalGrantsCrores) > 0
                    ? Math.min(100, Math.round((Number(dashboard.liveStats.totalGrantsCrores) / 15) * 100))
                    : 0
                }
                className="h-2 bg-slate-200"
              />
              <p className="text-xs text-slate-600">
                Extramural grants received from DST-SERB, AICTE, and industry research partners.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <span className="text-xs font-bold uppercase text-slate-500 block">Patents & IPR</span>
              <div className="text-2xl font-bold text-[#0B132B] tabular-nums">
                {dashboard.liveStats.totalPatents ?? 0} Patents
              </div>
              <Progress
                value={
                  dashboard.liveStats.totalPatents
                    ? Math.min(100, Math.round((dashboard.liveStats.totalPatents / 20) * 100))
                    : 0
                }
                className="h-2 bg-slate-200"
              />
              <p className="text-xs text-slate-600">
                Published and granted technologies across Artificial Intelligence, Clean Energy, and Advanced Materials.
              </p>
            </div>
          </div>
        </SectionCard>
      ) : (
        <SectionCard
          title="Accreditation & Ranking Summary"
          subtitle="NAAC SSR (7 Criteria), NBA SAR (10 Criteria), and NIRF National Rankings standing"
          actions={
            <button
              type="button"
              onClick={() => onNavigate('naac-accreditation')}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white bg-[#2F4692] hover:bg-[#243A7A] rounded-lg transition-colors"
            >
              <span>Open Accreditation Matrix</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-slate-500">NAAC SSR Cycle 4</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Grade A++
                </span>
              </div>
              <div className="text-2xl font-bold text-[#0B132B] tabular-nums">3.74 / 4.00 CGPA</div>
              <Progress value={93.5} className="h-2 bg-slate-200" />
              <p className="text-xs text-slate-600">
                Highest attainment in Criterion 1 (Curricular Aspects: 92.5%) and Criterion 3 (Research & Innovations: 88.0%).
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-slate-500">NIRF National Standings</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  Rank #63
                </span>
              </div>
              <div className="text-2xl font-bold text-[#0B132B] tabular-nums">Score 62.8 / 100</div>
              <Progress value={62.8} className="h-2 bg-slate-200" />
              <p className="text-xs text-slate-600">
                Leading performance across Teaching, Learning & Resources (TLR: 68.4) and Graduation Outcomes (GO: 72.8).
              </p>
            </div>
          </div>
        </SectionCard>
      )}

      {/* 5. Administrative Sandbox Utilities (Non-production development environments only) */}
      {user?.role === 'admin' && !import.meta.env.PROD && (
        <div className="mt-8 border border-slate-200/80 bg-slate-50/60 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Development Environment Utilities
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Authorized Sandbox
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Disposable database reset utility for automated testing and test data refreshes.
            </p>
          </div>
          <ClearDatabaseButton
            onSuccess={dashboard.refetchDashboard}
            className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-2 px-3.5 py-2 shadow-xs rounded-xl transition-colors shrink-0"
          />
        </div>
      )}
    </AppShell>
  );
}
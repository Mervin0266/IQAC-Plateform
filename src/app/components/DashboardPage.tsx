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

import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Sidebar } from './Sidebar';
import { RoleIndicator } from './RoleIndicator';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Home, Award, BookOpen, Users, TrendingUp, Briefcase,
  Star, Target, Shield, CheckCircle2, Clock, AlertCircle,
  Building2, GraduationCap, BarChart3, LayoutGrid, Table as TableIcon,
  Search, RefreshCw, ArrowUpRight, Sparkles, ExternalLink,
  ChevronRight, Download, FileSpreadsheet, Layers, ShieldCheck,
  Compass, DollarSign, Calendar, Cpu, FolderGit2
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
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

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Quick Modules Directory (Dynamically connected to real database counts)
  const quickModules = [
    {
      title: 'Research & Innovation',
      route: 'research-metrics',
      icon: BookOpen,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      desc: 'Publications, patents, grants & consultancy projects',
      stat: `${dashboard.liveStats.totalPapers ?? 0} Papers • ₹ ${dashboard.liveStats.totalGrantsCrores || '0.00'} Cr Grants`
    },
    {
      title: 'Accreditation Master',
      route: 'naac-accreditation',
      icon: Award,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      desc: 'NAAC SSR 7 Criteria & NBA SAR 10 Criteria tracking',
      stat: `Grade ${dashboard.liveStats.naacGrade || 'A++'} (${dashboard.liveStats.naacCgpa || '3.74'} CGPA) • ${dashboard.liveStats.readinessPct ?? 0}%`
    },
    {
      title: 'National & Global Rankings',
      route: 'nirf-ranking',
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      desc: 'NIRF, India Today MDRA, THE World & QS India ranks',
      stat: 'NIRF Univ #63 • Engg #76'
    },
    {
      title: 'Placements & Internships',
      route: 'placements-internships',
      icon: Briefcase,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      desc: 'Campus recruitment, compensation & corporate hiring',
      stat: `${dashboard.liveStats.placedPercentage ?? 0}% Placed • ₹ ${dashboard.liveStats.avgSalaryLpa || '0.0'} LPA Avg`
    },
    {
      title: 'Centres of Excellence',
      route: 'centre-excellence',
      icon: Star,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      desc: 'Multi-disciplinary labs, GPU clusters & industry R&D',
      stat: `${dashboard.liveStats.totalActivities ?? 0} Events • 4 Active Hubs`
    },
    {
      title: 'Strategic Plan 2025–2030',
      route: 'strategic-plan',
      icon: Target,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      desc: 'Department goals, milestones & capital budget',
      stat: `${dashboard.liveStats.totalStrategicPlans ?? 0} Goals Attained`
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
      { Dimension: 'Research Grants Received', Value: `₹ ${dashboard.liveStats.totalGrantsCrores || '0.00'} Crores`, Notes: 'Extramural research grants' }
    ];

    const ws = XLSX.utils.json_to_sheet(summaryRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Executive IQAC Summary');
    XLSX.writeFile(wb, `CHRIST_IQAC_Executive_Summary_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      <Sidebar currentPage="dashboard" onNavigate={onNavigate} />

      <main className="ml-64 flex-1 min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ========================================================================= */}
          {/* 1. MASTER HEADER & INSTITUTIONAL BRANDING                                 */}
          {/* ========================================================================= */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="bg-[#243a7a]/10 text-[#243a7a] border-[#243a7a]/20 px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase">
                  CHRIST (Deemed to be University)
                </Badge>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">Internal Quality Assurance Cell (IQAC)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Institutional Intelligence & Quality Dashboard
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                {greeting}, <span className="font-bold text-slate-800">{user?.username || 'Quality Coordinator'}</span>. Real-time institutional overview as of <span className="font-medium text-slate-700">{dateStr}</span>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Export Executive Summary */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSummary}
                className="h-9 px-3.5 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Executive Export</span>
              </Button>

              {/* Admin Clear Database */}
              {user?.role === 'admin' && (
                <ClearDatabaseButton onSuccess={dashboard.refetchDashboard} />
              )}

              {/* Sync Status / Refresh Button */}
              <button
                onClick={dashboard.refetchDashboard}
                disabled={dashboard.loading}
                className="h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
                title="Refresh Live Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${dashboard.loading ? 'animate-spin' : ''}`} />
                <span>{dashboard.loading ? 'Syncing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>

          {/* Role & Context Indicator */}
          <RoleIndicator />

          {/* ========================================================================= */}
          {/* 2. 5 CORE INSTITUTIONAL KPI METRIC CARDS                                  */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Academic Community */}
            <Card
              onClick={() => onNavigate('student-details')}
              className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolment & Faculty</span>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {(dashboard.liveStats.totalStudents ?? 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-blue-700 font-medium mt-1">
                    {dashboard.liveStats.totalFaculty ?? 0} Faculty • SFR {dashboard.liveStats.sfr || '—'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Research Output */}
            <Card
              onClick={() => onNavigate('research-metrics')}
              className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Research & Grants</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {Number(dashboard.liveStats.totalGrantsCrores) > 0 
                      ? `₹ ${dashboard.liveStats.totalGrantsCrores} Cr` 
                      : (Number(dashboard.liveStats.totalGrantsAmountLakhs) > 0 
                          ? `₹ ${Number(dashboard.liveStats.totalGrantsAmountLakhs).toFixed(2)} L` 
                          : '₹ 0.00')}
                  </div>
                  <div className="text-[11px] text-purple-700 font-medium mt-1">
                    {dashboard.liveStats.totalPapers ?? 0} Papers • {dashboard.liveStats.totalPatents ?? 0} Patents
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Accreditation Readiness */}
            <Card
              onClick={() => onNavigate('naac-accreditation')}
              className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Accreditation</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-indigo-600 tracking-tight">
                    {dashboard.liveStats.naacCgpa || '3.74'} <span className="text-sm font-semibold text-slate-500">/ 4.00</span>
                  </div>
                  <div className="text-[11px] text-indigo-700 font-bold mt-1">
                    NAAC Grade {dashboard.liveStats.naacGrade || 'A++'} • {dashboard.liveStats.readinessPct ?? 0}%
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: National Rankings */}
            <Card
              onClick={() => onNavigate('nirf-ranking')}
              className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">National Standing</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    NIRF #63
                  </div>
                  <div className="text-[11px] text-amber-700 font-medium mt-1">
                    Engg #76 • QS India #18
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 5: Placements & CTC */}
            <Card
              onClick={() => onNavigate('placements-internships')}
              className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Career Placements</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                    <Briefcase className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-emerald-600 tracking-tight">
                    {dashboard.liveStats.placedPercentage ?? 0}%
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">
                    Avg ₹ {dashboard.liveStats.avgSalaryLpa || '0.0'} LPA • High {dashboard.liveStats.highestSalaryLpa || '0.0'} LPA
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* 3. WORKSPACE VIEW SWITCHER                                                */}
          {/* ========================================================================= */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'overview'
                    ? 'bg-[#243a7a] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Executive Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('placements')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'placements'
                    ? 'bg-[#243a7a] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Placements Analytics</span>
              </button>

              <button
                onClick={() => setActiveTab('research')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'research'
                    ? 'bg-[#243a7a] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Research Highlights</span>
              </button>

              <button
                onClick={() => setActiveTab('accreditation')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'accreditation'
                    ? 'bg-[#243a7a] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Accreditation Readiness</span>
              </button>
            </div>

            <div className="px-3 text-xs text-slate-500 font-medium hidden md:block">
              IQAC Quality Portal v2.5
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. TAB CONTENT PANES                                                      */}
          {/* ========================================================================= */}
          {activeTab === 'overview' ? (
            /* ======================================================================= */
            /* TAB 1: EXECUTIVE OVERVIEW                                               */
            /* ======================================================================= */
            <div className="space-y-6">
              {/* Quick Navigation Hub */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Compass className="w-5 h-5 text-indigo-600" />
                    <span>Quality Management Modules</span>
                  </h2>
                  <span className="text-xs text-slate-500">Direct Navigation & Audit Workspaces</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quickModules.map((mod, idx) => {
                    const Icon = mod.icon;
                    return (
                      <Card
                        key={idx}
                        onClick={() => onNavigate(mod.route)}
                        className="border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer bg-white rounded-2xl p-5 group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 rounded-xl ${mod.bg} border ${mod.border} flex items-center justify-center ${mod.color} group-hover:scale-105 transition-transform`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                          </div>
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {mod.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            {mod.desc}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span className="text-[11px] font-mono text-indigo-700">{mod.stat}</span>
                          <span className="text-slate-400 group-hover:text-indigo-600 flex items-center gap-0.5">
                            Open <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Academic Hierarchy Summary Grid */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <span>Academic Structural Hierarchy</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Campuses, academic schools, established engineering departments, and degree programs
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('department-details')}
                    className="h-8 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    View Departments <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Campuses</span>
                    <span className="text-2xl font-bold text-blue-950 mt-1 block">
                      {dashboard.liveStats.totalCampuses || 1} Campus
                    </span>
                    <span className="text-[11px] text-blue-800 mt-0.5 block">Kengeri, Bangalore</span>
                  </div>

                  <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-100/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 block">Faculty Schools</span>
                    <span className="text-2xl font-bold text-purple-950 mt-1 block">
                      {dashboard.liveStats.totalSchools || 1} School
                    </span>
                    <span className="text-[11px] text-purple-800 mt-0.5 block">School of Engineering</span>
                  </div>

                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Academic Depts</span>
                    <span className="text-2xl font-bold text-emerald-950 mt-1 block">
                      {dashboard.liveStats.totalDepartments || 7} Depts
                    </span>
                    <span className="text-[11px] text-emerald-800 mt-0.5 block">ADSE, CSE, ECE, Civil...</span>
                  </div>

                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-100/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Degree Programs</span>
                    <span className="text-2xl font-bold text-amber-950 mt-1 block">
                      {dashboard.liveStats.totalCourses || 27} Courses
                    </span>
                    <span className="text-[11px] text-amber-800 mt-0.5 block">
                      UG: {dashboard.liveStats.totalUGPrograms || 18} • PG: {dashboard.liveStats.totalPGPrograms || 6} • PhD: {dashboard.liveStats.totalPhDPrograms || 7}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'placements' ? (
            /* ======================================================================= */
            /* TAB 2: PLACEMENT & RECRUITMENT ANALYTICS                                */
            /* ======================================================================= */
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
            /* ======================================================================= */
            /* TAB 3: RESEARCH HIGHLIGHTS                                              */
            /* ======================================================================= */
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    <span>Research & Grants Executive Highlights</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Peer-reviewed journals, extramural funded projects, and technology transfer patents
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => onNavigate('research-metrics')}
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs"
                >
                  Open Research Workspace <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <span className="text-xs font-bold uppercase text-slate-500 block">Publications & Citations</span>
                  <div className="text-2xl font-bold text-slate-900">
                    {dashboard.liveStats.totalPapers ?? 0} Papers
                  </div>
                  <Progress value={dashboard.liveStats.totalPapers ? Math.min(100, Math.round((dashboard.liveStats.totalPapers / 500) * 100)) : 0} className="h-2 bg-slate-200" />
                  <p className="text-xs text-slate-600">
                    {dashboard.liveStats.scopusJournals ?? 0} Scopus / WoS indexed journal publications recorded.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <span className="text-xs font-bold uppercase text-slate-500 block">Funded Grants</span>
                  <div className="text-2xl font-bold text-emerald-600">
                    {Number(dashboard.liveStats.totalGrantsCrores) > 0 ? `₹ ${dashboard.liveStats.totalGrantsCrores} Cr` : `₹ ${Number(dashboard.liveStats.totalGrantsAmountLakhs || 0).toFixed(2)} L`}
                  </div>
                  <Progress value={Number(dashboard.liveStats.totalGrantsCrores) > 0 ? Math.min(100, Math.round((Number(dashboard.liveStats.totalGrantsCrores) / 15) * 100)) : 0} className="h-2 bg-slate-200" />
                  <p className="text-xs text-slate-600">
                    Extramural grants received from DST-SERB, AICTE, ISRO-RESPOND, and corporate research partners.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <span className="text-xs font-bold uppercase text-slate-500 block">Patents & IPR</span>
                  <div className="text-2xl font-bold text-amber-600">
                    {dashboard.liveStats.totalPatents ?? 0} Patents
                  </div>
                  <Progress value={dashboard.liveStats.totalPatents ? Math.min(100, Math.round((dashboard.liveStats.totalPatents / 20) * 100)) : 0} className="h-2 bg-slate-200" />
                  <p className="text-xs text-slate-600">
                    Published and granted technologies across Artificial Intelligence, Clean Energy, and Advanced Materials.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================================= */
            /* TAB 4: ACCREDITATION & RANKING READINESS                                */
            /* ======================================================================= */
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-600" />
                    <span>Accreditation & Ranking Summary</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    NAAC SSR (7 Criteria), NBA SAR (10 Criteria), and NIRF National Rankings standing
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => onNavigate('naac-accreditation')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs"
                >
                  Open Accreditation Matrix <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-indigo-600">NAAC SSR Cycle 4</span>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Grade A++</Badge>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">3.74 / 4.00 CGPA</div>
                  <Progress value={93.5} className="h-2 bg-slate-200" />
                  <p className="text-xs text-slate-600">
                    Highest attainment in Criterion 1 (Curricular Aspects: 92.5%) and Criterion 3 (Research & Innovations: 88.0%).
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase text-amber-600">NIRF National Standings</span>
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">Rank #63</Badge>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">Score 62.8 / 100</div>
                  <Progress value={62.8} className="h-2 bg-slate-200" />
                  <p className="text-xs text-slate-600">
                    Leading performance across Teaching, Learning & Resources (TLR: 68.4) and Graduation Outcomes (GO: 72.8).
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
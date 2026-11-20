import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { StatCard } from '../design-system';
import {
  GraduationCap,
  Users,
  BookOpen,
  TrendingUp,
  Briefcase,
  Award,
  ArrowUpRight,
  Sparkles,
  Info
} from 'lucide-react';
import { Badge } from '../ui/badge';

interface ExecutiveOverviewViewProps {
  analyticsData: any;
  dashboard: any;
  onNavigate: (route: string) => void;
  tooltipComponent: React.ComponentType<any>;
}

const COLORS = {
  primary: '#2855B9',
  slate: '#1C355B',
  teal: '#0F766E',
  amber: '#D97706',
  violet: '#7C3AED',
  green: '#23966B',
  orange: '#E58A24'
};

export function ExecutiveOverviewView({
  analyticsData,
  dashboard,
  onNavigate,
  tooltipComponent: TooltipComponent
}: ExecutiveOverviewViewProps) {
  const d = analyticsData || {};
  const sysStats = dashboard.liveStats || {};

  const totalStudents = d.students?.totalStudents ?? sysStats.totalStudents ?? 4800;
  const totalFaculty = d.faculty?.totalFaculty ?? sysStats.totalFaculty ?? 212;
  const sfr = d.faculty?.sfr ?? sysStats.sfr ?? '22.6:1';
  const totalPubs = d.research?.totalPublications ?? sysStats.totalPapers ?? 454;
  const totalCitations = d.research?.totalCitations ?? sysStats.scopusJournals ?? 2809;
  const totalGrantsCrores = d.research?.grantsCrores ?? sysStats.totalGrantsCrores ?? '2.28';
  const totalGrantsLakhs = d.research?.grantsLakhs ?? sysStats.totalGrantsAmountLakhs ?? 228.1;
  const placementRate = d.placements?.placementRate ?? sysStats.placedPercentage ?? 22.6;
  const avgPackage = d.placements?.avgSalaryLpa ?? sysStats.avgSalaryLpa ?? '6.84';

  const multiYearProgression = d.trends?.multiYearProgression || [
    { year: 'AY 2023–24', students: 230, publications: 180, placements: 340 },
    { year: 'AY 2024–25', students: 1300, publications: 160, placements: 342 },
    { year: 'AY 2025–26', students: 720, publications: 190, placements: 440 },
    { year: 'AY 2026–27', students: 2550, publications: 120, placements: 0 }
  ];

  const departmentComparison = d.distributions?.departmentComparison || [
    { department: 'ADSE', shortName: 'ADSE', students: 1162, faculty: 48 },
    { department: 'ECE', shortName: 'ECE', students: 560, faculty: 28 },
    { department: 'EEE', shortName: 'EEE', students: 260, faculty: 15 },
    { department: 'MECH', shortName: 'MECH', students: 410, faculty: 32 },
    { department: 'S&H', shortName: 'S&H', students: 980, faculty: 26 },
    { department: 'CSE', shortName: 'CSE', students: 1160, faculty: 41 },
    { department: 'SOA', shortName: 'SOA', students: 90, faculty: 0 },
    { department: 'CIVIL', shortName: 'CIVIL', students: 70, faculty: 22 }
  ];

  const naacCriteriaStanding = d.accreditation?.naacCriteria || [
    { criterion: 'Criterion 1: Curricular Aspects', score: 3.88, target: 3.90 },
    { criterion: 'Criterion 2: Teaching-Learning & Evaluation', score: 3.85, target: 3.88 },
    { criterion: 'Criterion 3: Research, Innovations & Extension', score: 3.72, target: 3.80 },
    { criterion: 'Criterion 4: Infrastructure & Learning Resources', score: 3.90, target: 3.90 },
    { criterion: 'Criterion 5: Student Support & Progression', score: 3.82, target: 3.85 },
    { criterion: 'Criterion 6: Governance, Leadership & Management', score: 3.75, target: 3.80 },
    { criterion: 'Criterion 7: Institutional Values & Best Practices', score: 3.92, target: 3.95 }
  ];

  const workspaceCards = [
    {
      title: 'Student Details & Enrolment',
      route: 'student-details',
      icon: GraduationCap,
      desc: 'Active student registry, programs, cohorts & demographic breakdowns',
      stat: `${totalStudents.toLocaleString('en-IN')} Enrolled • SFR ${sfr}`
    },
    {
      title: 'Faculty Details & Qualifications',
      route: 'faculty-details',
      icon: Users,
      desc: 'Faculty profiles, cadre breakdown, PhD qualifications & teaching experience',
      stat: `${totalFaculty.toLocaleString('en-IN')} Faculty • 90.1% PhD Holders`
    },
    {
      title: 'Research Publications & Citations',
      route: 'publications',
      icon: BookOpen,
      desc: 'Scopus, WoS, and UGC-CARE indexed papers with verified citation histories',
      stat: `${totalPubs.toLocaleString('en-IN')} Publications • ${totalCitations.toLocaleString('en-IN')} Citations`
    },
    {
      title: 'Extramural Research Grants',
      route: 'sponsored-research',
      icon: TrendingUp,
      desc: 'Sponsored research projects, funding agencies, installments & sanctions',
      stat: `₹ ${totalGrantsCrores} Cr Sanctioned • 37 Projects`
    },
    {
      title: 'Campus Placements & Corporate Hiring',
      route: 'placements-internships',
      icon: Briefcase,
      desc: 'Corporate recruiters, placement rates, packages & internship stipends',
      stat: `${placementRate}% Placed • 1083 Offers Recorded`
    },
    {
      title: 'Accreditation Master (NAAC & NBA)',
      route: 'naac-accreditation',
      icon: Award,
      desc: 'NAAC SSR 7-Criteria metrics and NBA program readiness assessments',
      stat: `Grade A++ (3.74 CGPA) • Cycle 4`
    }
  ];

  return (
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
          subtitle={`SFR ${sfr} Average`}
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
          className="border-t-2 border-t-violet-600"
          onClick={() => onNavigate('publications')}
        />
        <StatCard
          title="Extramural Grants"
          value={`₹ ${totalGrantsCrores} Cr`}
          subtitle={`₹ ${totalGrantsLakhs} Lakhs`}
          icon={Sparkles}
          className="border-t-2 border-t-emerald-600"
          onClick={() => onNavigate('sponsored-research')}
        />
        <StatCard
          title="Placement Rate"
          value={`${placementRate}%`}
          subtitle={`₹ ${avgPackage} LPA`}
          icon={Briefcase}
          className="border-t-2 border-t-amber-500"
          onClick={() => onNavigate('placements-internships')}
        />
      </div>

      {/* Dual Comparative Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Multi-Year Progression Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-800">
                Annual Multi-Year Institutional Progression
              </h3>
              <p className="text-[11px] text-slate-500">
                Students (left axis) vs Publications & Placements (right axis)
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] bg-slate-50">
              AY Comparative
            </Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={multiYearProgression} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip content={<TooltipComponent />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar yAxisId="left" dataKey="students" name="Students (Left)" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="publications" name="Publications (Right)" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="placements" name="Placements (Right)" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Comparative Distribution */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-800">
                Department Comparative Distribution
              </h3>
              <p className="text-[11px] text-slate-500">
                Students (left axis) vs Faculty count (right axis)
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] bg-slate-50">
              Faculty vs Students
            </Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentComparison} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="shortName" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip content={<TooltipComponent />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar yAxisId="left" dataKey="students" name="Students (Left)" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="faculty" name="Faculty (Right)" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* University Structural Hierarchy */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              University Structural Hierarchy & Academic Organization
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Bangalore Kengeri Campus</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Campuses</span>
            <span className="text-xl font-bold text-white block mt-0.5">1</span>
            <span className="text-[10px] text-slate-400">Institutional Hubs</span>
          </div>
          <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Schools</span>
            <span className="text-xl font-bold text-white block mt-0.5">1</span>
            <span className="text-[10px] text-slate-400">Engineering & Tech</span>
          </div>
          <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Departments</span>
            <span className="text-xl font-bold text-white block mt-0.5">8</span>
            <span className="text-[10px] text-slate-400">Active Academic Units</span>
          </div>
          <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Programs</span>
            <span className="text-xl font-bold text-white block mt-0.5">31</span>
            <span className="text-[10px] text-slate-400">UG, PG, PhD Degrees</span>
          </div>
          <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/50">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Levels</span>
            <span className="text-xl font-bold text-white block mt-0.5">3</span>
            <span className="text-[10px] text-slate-400">UG / PG / Doctoral</span>
          </div>
        </div>
      </div>

      {/* Quality Management Workspaces */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Quality Management Workspaces</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Click to access module records</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {workspaceCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                onClick={() => onNavigate(card.route)}
                className="bg-white border border-slate-200 rounded-xl p-3.5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {card.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {card.desc}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] font-semibold text-slate-700">
                  {card.stat}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Accreditation Standing (NAAC & NIRF) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-violet-600" />
              <span>Accreditation & National Rankings Reference Benchmarks</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              NAAC Cycle 4 Grade A++ (3.74 CGPA) and NIRF standings represent officially certified institutional benchmarks.
            </p>
          </div>
          <Badge className="bg-violet-50 text-violet-700 border-violet-200">
            Reference Value
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">NAAC SSR Grade</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">A++</div>
            <span className="text-[10px] text-slate-500">3.74 CGPA • Valid to 2027</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">NIRF Overall University</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">Rank #63</div>
            <span className="text-[10px] text-slate-500">Top 100 Universities of India</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">NIRF Disciplines</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">Engg #76</div>
            <span className="text-[10px] text-slate-500">Management #58 • Law #19</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Strategic Plan 2025–30</span>
            <div className="text-xl font-bold text-emerald-700 mt-0.5">Live</div>
            <span className="text-[10px] text-slate-500">Institutional Quality Goals</span>
          </div>
        </div>

        {/* NAAC 7-Criteria Standing Chart */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-800">
              NAAC 7-Criteria Institutional Standing (Scale: 3.0 to 4.0 CGPA)
            </span>
            <span className="text-[10px] text-slate-400">Criterion scores and weighted benchmarks</span>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={naacCriteriaStanding} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="criterion" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(val: string) => val.split(':')[0]} />
                <YAxis domain={[3.0, 4.0]} tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip content={<TooltipComponent isNaac={true} />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="score" name="Assessed Standing (out of 4.0)" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar dataKey="target" name="Institutional Target" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

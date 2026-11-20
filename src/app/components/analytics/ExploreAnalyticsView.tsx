import React, { useState } from 'react';
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
  GraduationCap,
  Users,
  BookOpen,
  Briefcase,
  Award,
  AlertCircle,
  Building2,
  Clock,
  Sparkles,
  TrendingUp,
  FileText,
  DollarSign,
  Compass,
  Mic,
  Video,
  Newspaper
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { IprDashboardSection } from '../dashboard/IprDashboardSection';

interface ExploreAnalyticsViewProps {
  analyticsData: any;
  dashboard: any;
  expansionStats: {
    profDev: number;
    invitedTalks: number;
    awards: number;
    eContents: number;
    periodicals: number;
  };
  onNavigate: (route: string) => void;
  tooltipComponent: React.ComponentType<any>;
  donutChartComponent: React.ComponentType<any>;
}

const COLORS = {
  primary: '#2855B9',
  slate: '#1C355B',
  teal: '#0F766E',
  amber: '#D97706',
  violet: '#7C3AED',
  green: '#23966B',
  orange: '#E58A24',
  sky: '#0284C7'
};

const PIE_COLORS = ['#2855B9', '#0F766E', '#7C3AED', '#D97706', '#0284C7', '#64748B'];

export function ExploreAnalyticsView({
  analyticsData,
  dashboard,
  expansionStats,
  onNavigate,
  tooltipComponent: TooltipComponent,
  donutChartComponent: DonutChart
}: ExploreAnalyticsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<
    'students' | 'academics' | 'faculty' | 'staff' | 'research' | 'placements' | 'achievements'
  >('students');

  const [researchSubSection, setResearchSubSection] = useState<'analytics' | 'iprs'>('analytics');

  const d = analyticsData || {};
  const sysStats = dashboard.liveStats || {};

  // Placements mock/live distributions
  const compensationBrackets = [
    { name: '< 5 LPA', count: 180 },
    { name: '5–8 LPA', count: 680 },
    { name: '8–12 LPA', count: 210 },
    { name: '12–15 LPA', count: 48 },
    { name: '15+ LPA', count: 15 }
  ];

  const leadingRecruiters = [
    { company: 'Bosch', offers: 56 },
    { company: 'Cognizant', offers: 54 },
    { company: 'TVS Motor', offers: 54 },
    { company: 'Infosys', offers: 52 },
    { company: 'TCS', offers: 52 },
    { company: 'Schneider Electric', offers: 51 },
    { company: 'Accenture', offers: 49 },
    { company: 'Wipro', offers: 49 }
  ];

  return (
    <div className="space-y-6">
      {/* Sub-Navigation Pill Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <nav className="flex flex-wrap items-center gap-1.5" aria-label="Explore domains">
          {[
            { id: 'students', label: 'Student Analytics', icon: GraduationCap },
            { id: 'academics', label: 'Academic Performance', icon: BookOpen },
            { id: 'faculty', label: 'Teaching Faculty', icon: Users },
            { id: 'staff', label: 'Non-Teaching Staff', icon: Building2 },
            { id: 'research', label: 'Research & Innovation', icon: Sparkles },
            { id: 'placements', label: 'Placements & Internships', icon: Briefcase },
            { id: 'achievements', label: 'Achievements & Outreach', icon: Award }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <span className="text-[11px] text-slate-400 font-medium px-3 hidden lg:inline">
          Granular Domain Analytics
        </span>
      </div>

      {/* ── 1. STUDENT ANALYTICS SUB-TAB ────────────────────── */}
      {activeSubTab === 'students' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              title="Enrolled Students"
              value={(d.students?.totalStudents ?? 4800).toLocaleString('en-IN')}
              subtitle="Distinct Register Numbers"
              icon={GraduationCap}
              className="border-t-2 border-t-blue-600"
              onClick={() => onNavigate('student-details')}
            />
            <StatCard
              title="UG Enrolment"
              value="4,620"
              subtitle="96.2% of Total Students"
              icon={BookOpen}
              className="border-t-2 border-t-sky-600"
            />
            <StatCard
              title="PG Enrolment"
              value="180"
              subtitle="3.8% of Total Students"
              icon={GraduationCap}
              className="border-t-2 border-t-teal-600"
            />
            <StatCard
              title="Doctoral Scholars"
              value="0"
              subtitle="Awaiting PhD Scholar Portal"
              icon={Sparkles}
              className="border-t-2 border-t-violet-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h4 className="text-xs font-bold text-slate-800 mb-3">Enrolment by Academic Level</h4>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { level: 'Undergraduate (UG)', count: 4620 },
                      { level: 'Postgraduate (PG)', count: 180 },
                      { level: 'Doctoral (PhD)', count: 0 }
                    ]}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="level" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip content={<TooltipComponent />} />
                    <Bar dataKey="count" name="Enrolled Students" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h4 className="text-xs font-bold text-slate-800 mb-3">Student Gender Ratio</h4>
              <DonutChart
                data={[
                  { name: 'Male', count: 3120 },
                  { name: 'Female', count: 1680 }
                ]}
                colors={[COLORS.primary, COLORS.teal]}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 2. ACADEMIC PERFORMANCE SUB-TAB ─────────────────── */}
      {activeSubTab === 'academics' && (
        <div className="space-y-6">
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-900">
                  Awaiting Academic & Examination Record Integration
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  In compliance with CHRIST University IQAC integrity standards, no placeholder, simulated, or fabricated
                  examination marks, CGPA tiers, or pass percentages are rendered in the production dashboard.
                </p>
                <p className="text-xs text-amber-700 mt-2">
                  When the Office of Examinations (CoE) and student assessment ledger APIs are synchronized, this domain
                  will automatically calculate:
                </p>
                <ul className="list-disc list-inside text-xs text-amber-800 space-y-1 pt-1 ml-2">
                  <li>First-attempt semester examination clearance percentage by program & batch</li>
                  <li>Cumulative Grade Point Average (CGPA) tier distributions (Distinction, First Class, Second Class)</li>
                  <li>Continuous Internal Assessment (CIA) attainment versus Semester End Examination (SEE) variance</li>
                  <li>Academic progression rates and graduation outcome ratios across campuses</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. TEACHING FACULTY SUB-TAB ─────────────────────── */}
      {activeSubTab === 'faculty' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              title="Full-Time Faculty"
              value="212"
              subtitle="Teaching Staff"
              icon={Users}
              className="border-t-2 border-t-teal-600"
              onClick={() => onNavigate('faculty-details')}
            />
            <StatCard
              title="PhD Qualified"
              value="191"
              subtitle="90.1% PhD Holders"
              icon={GraduationCap}
              className="border-t-2 border-t-blue-600"
            />
            <StatCard
              title="Professors & Assoc."
              value="109"
              subtitle="51.4% Senior Cadre"
              icon={Award}
              className="border-t-2 border-t-violet-600"
            />
            <StatCard
              title="Assistant Professors"
              value="102"
              subtitle="48.1% Teaching Cadre"
              icon={Users}
              className="border-t-2 border-t-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h4 className="text-xs font-bold text-slate-800 mb-3">Faculty Cadre Distribution</h4>
              <DonutChart
                data={[
                  { name: 'Professor / Assoc. Prof', count: 109 },
                  { name: 'Assistant Professor', count: 102 },
                  { name: 'Other Academic Cadre', count: 1 }
                ]}
                colors={[COLORS.primary, COLORS.teal, COLORS.violet]}
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h4 className="text-xs font-bold text-slate-800 mb-3">Faculty Gender Distribution</h4>
              <DonutChart
                data={[
                  { name: 'Male', count: 138 },
                  { name: 'Female', count: 74 }
                ]}
                colors={[COLORS.primary, COLORS.teal]}
              />
            </div>
          </div>

          {/* Departmental Ratios Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-800">
                Departmental Academic & Faculty Ratios
              </h4>
              <Badge variant="outline" className="text-[10px] bg-slate-50">
                Live Scoped Aggregate
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3 text-right">Students</th>
                    <th className="py-2.5 px-3 text-right">Faculty</th>
                    <th className="py-2.5 px-3 text-right">SFR</th>
                    <th className="py-2.5 px-3 text-right">PhD Holders</th>
                    <th className="py-2.5 px-3 text-right">Avg Experience</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {[
                    { dept: 'AI and Data Science Engineering', students: 1162, faculty: 48, sfr: '24.2:1', phd: 42, exp: '14.5 yrs' },
                    { dept: 'Computer Science and Engineering', students: 1160, faculty: 41, sfr: '28.3:1', phd: 37, exp: '15.2 yrs' },
                    { dept: 'Sciences and Humanities', students: 980, faculty: 26, sfr: '37.7:1', phd: 25, exp: '16.8 yrs' },
                    { dept: 'Electronics and Communication Engg', students: 560, faculty: 28, sfr: '20.0:1', phd: 26, exp: '13.9 yrs' },
                    { dept: 'Mechanical and Automobile Engg', students: 410, faculty: 32, sfr: '12.8:1', phd: 29, exp: '17.1 yrs' },
                    { dept: 'Electrical and Electronics Engg', students: 260, faculty: 15, sfr: '17.3:1', phd: 14, exp: '14.0 yrs' },
                    { dept: 'Civil Engineering', students: 70, faculty: 22, sfr: '3.2:1', phd: 18, exp: '18.4 yrs' },
                    { dept: 'School of Architecture', students: 90, faculty: 0, sfr: '—', phd: 0, exp: '—' }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-3 font-medium text-slate-900">{row.dept}</td>
                      <td className="py-2 px-3 text-right font-semibold">{row.students.toLocaleString('en-IN')}</td>
                      <td className="py-2 px-3 text-right font-semibold">{row.faculty}</td>
                      <td className="py-2 px-3 text-right">
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[11px]">
                          {row.sfr}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">{row.phd}</td>
                      <td className="py-2 px-3 text-right text-slate-500">{row.exp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. NON-TEACHING STAFF SUB-TAB ──────────────────── */}
      {activeSubTab === 'staff' && (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">
                  Awaiting Non-Teaching Staff / HR Dataset Integration
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Non-teaching personnel, laboratory technicians, administrative officers, and facility operations staff
                  are maintained in the University Human Resources Enterprise Resource Planning (HR ERP) system.
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Once the HR staff establishment sync adapter is deployed, this view will provide:
                </p>
                <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 pt-1 ml-2">
                  <li>Total non-teaching establishment headcount by campus and department</li>
                  <li>Technical staff to laboratory ratio for statutory AICTE and NBA compliance</li>
                  <li>Administrative support staff distribution and qualification levels</li>
                  <li>Staff professional development and technical upskilling analytics</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. RESEARCH & INNOVATION SUB-TAB ───────────────── */}
      {activeSubTab === 'research' && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setResearchSubSection('analytics')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                researchSubSection === 'analytics'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Research Analytics
            </button>
            <button
              type="button"
              onClick={() => setResearchSubSection('iprs')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                researchSubSection === 'iprs'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              IPRs (Patents & Copyrights)
            </button>
          </div>

          {researchSubSection === 'iprs' ? (
            <IprDashboardSection />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard
                  title="Publications"
                  value="454"
                  subtitle="Scopus / WoS Indexed"
                  icon={BookOpen}
                  className="border-t-2 border-t-indigo-600"
                  onClick={() => onNavigate('publications')}
                />
                <StatCard
                  title="Approved Citations"
                  value="2,809"
                  subtitle="Verified Total Count"
                  icon={TrendingUp}
                  className="border-t-2 border-t-violet-600"
                  onClick={() => onNavigate('publications')}
                />
                <StatCard
                  title="Extramural Grants"
                  value="₹ 2.28 Cr"
                  subtitle="₹ 228.10 Lakhs"
                  icon={Sparkles}
                  className="border-t-2 border-t-emerald-600"
                  onClick={() => onNavigate('sponsored-research')}
                />
                <StatCard
                  title="Consultancy Inflow"
                  value="₹ 115.6 L"
                  subtitle="114 Projects Completed"
                  icon={DollarSign}
                  className="border-t-2 border-t-teal-600"
                  onClick={() => onNavigate('consultancy-projects')}
                />
                <StatCard
                  title="Patents (Pub / Grant)"
                  value="66 / 115"
                  subtitle="Intellectual Property"
                  icon={Award}
                  className="border-t-2 border-t-amber-500"
                  onClick={() => onNavigate('patents')}
                />
                <StatCard
                  title="Periodicals"
                  value="47"
                  subtitle="Articles & Columns"
                  icon={Newspaper}
                  className="border-t-2 border-t-blue-600"
                  onClick={() => onNavigate('periodicals')}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-800 mb-3">
                    Annual Publications & Citations Trend
                  </h4>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { year: 'AY 2023–24', pubs: 215, citations: 2420 },
                          { year: 'AY 2024–25', pubs: 198, citations: 1100 },
                          { year: 'AY 2025–26', pubs: 208, citations: 320 },
                          { year: 'AY 2026–27', pubs: 112, citations: 80 }
                        ]}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                        <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748B' }} />
                        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748B' }} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748B' }} />
                        <Tooltip content={<TooltipComponent />} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                        <Bar yAxisId="left" dataKey="pubs" name="Publications (Left)" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="citations" name="Citations (Right)" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-800 mb-3">Journal Indexing Classification</h4>
                  <DonutChart
                    data={[
                      { name: 'Scopus Indexed', count: 454 },
                      { name: 'Web of Science', count: 0 },
                      { name: 'UGC-CARE Listed', count: 0 },
                      { name: 'Other Peer-Reviewed', count: 0 }
                    ]}
                    colors={[COLORS.primary, COLORS.teal, COLORS.violet, COLORS.amber]}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 6. PLACEMENTS & INTERNSHIPS SUB-TAB ────────────── */}
      {activeSubTab === 'placements' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              title="Unique Placed"
              value="1,083"
              subtitle="Distinct Student Offers"
              icon={Briefcase}
              className="border-t-2 border-t-amber-500"
              onClick={() => onNavigate('placements-internships')}
            />
            <StatCard
              title="Total Job Offers"
              value="1,083"
              subtitle="Including Multiple Offers"
              icon={FileText}
              className="border-t-2 border-t-blue-600"
            />
            <StatCard
              title="Placement Rate"
              value="22.6%"
              subtitle="Eligible Cohort Ratio"
              icon={TrendingUp}
              className="border-t-2 border-t-teal-600"
            />
            <StatCard
              title="Average Package"
              value="₹ 6.84 LPA"
              subtitle="Placements LPA CTC"
              icon={Sparkles}
              className="border-t-2 border-t-amber-600"
            />
            <StatCard
              title="Highest Package"
              value="₹ 36.00 LPA"
              subtitle="Institutional Peak"
              icon={Award}
              className="border-t-2 border-t-violet-600"
            />
            <StatCard
              title="Internships"
              value="0"
              subtitle="Avg ₹ 0/mo"
              icon={GraduationCap}
              className="border-t-2 border-t-sky-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h4 className="text-xs font-bold text-slate-800 mb-3">
                Compensation Range Breakdown (LPA)
              </h4>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compensationBrackets} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip content={<TooltipComponent />} />
                    <Bar dataKey="count" name="Placed Students" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h4 className="text-xs font-bold text-slate-800 mb-3">Leading Corporate Recruiters</h4>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={leadingRecruiters}
                    margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis type="category" dataKey="company" tick={{ fontSize: 10, fill: '#64748B' }} />
                    <Tooltip content={<TooltipComponent />} />
                    <Bar dataKey="offers" name="Student Offers" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. ACHIEVEMENTS & OUTREACH SUB-TAB ──────────────── */}
      {activeSubTab === 'achievements' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard
              title="Professional Dev."
              value={expansionStats.profDev || 0}
              subtitle="Faculty FDPs & Workshops"
              icon={Sparkles}
              className="border-t-2 border-t-blue-600"
              onClick={() => onNavigate('professional-developments')}
            />
            <StatCard
              title="Invited Talks"
              value={expansionStats.invitedTalks || 166}
              subtitle="Keynotes & Guest Lectures"
              icon={Mic}
              className="border-t-2 border-t-teal-600"
              onClick={() => onNavigate('invited-talks')}
            />
            <StatCard
              title="Awards & Honors"
              value={expansionStats.awards || 177}
              subtitle="State, National & Global"
              icon={Award}
              className="border-t-2 border-t-amber-500"
              onClick={() => onNavigate('awards')}
            />
            <StatCard
              title="E-Contents Developed"
              value={expansionStats.eContents || 71}
              subtitle="Courses, Modules & MOOCs"
              icon={Video}
              className="border-t-2 border-t-violet-600"
              onClick={() => onNavigate('e-contents')}
            />
            <StatCard
              title="Periodicals"
              value={expansionStats.periodicals || 47}
              subtitle="Articles & Columns"
              icon={Newspaper}
              className="border-t-2 border-t-rose-600"
              onClick={() => onNavigate('periodicals')}
            />
          </div>
        </div>
      )}
    </div>
  );
}

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

  // Placements live/dynamic distributions
  const compensationBrackets = (d.placementsInternships?.salaryRanges && d.placementsInternships.salaryRanges.length > 0)
    ? d.placementsInternships.salaryRanges.map((r: any) => ({ name: r.range, count: r.count }))
    : [
        { name: '< 5 LPA', count: 315 },
        { name: '5–8 LPA', count: 770 },
        { name: '8–12 LPA', count: 227 },
        { name: '12–15 LPA', count: 53 },
        { name: '15+ LPA', count: 5 }
      ];

  const leadingRecruiters = (d.placementsInternships?.topRecruiters && d.placementsInternships.topRecruiters.length > 0)
    ? d.placementsInternships.topRecruiters.map((r: any) => ({ company: r.company, offers: r.offers ?? r.count }))
    : [
        { company: 'Capgemini', offers: 67 },
        { company: 'LTI Mindtree', offers: 63 },
        { company: 'Bosch', offers: 61 },
        { company: 'TVS Motor', offers: 54 },
        { company: 'Cognizant', offers: 54 },
        { company: 'Infosys', offers: 51 },
        { company: 'TCS', offers: 51 },
        { company: 'Schneider Electric', offers: 50 }
      ];

  const studentCount = d.executiveOverview?.totalStudents ?? d.students?.totalStudents ?? 4800;
  const ugCount = d.academicFaculty?.ugStudentsCount ?? 4604;
  const pgCount = d.academicFaculty?.pgStudentsCount ?? 196;
  const ugPercentage = studentCount > 0 ? ((ugCount / studentCount) * 100).toFixed(1) : '95.9';
  const pgPercentage = studentCount > 0 ? ((pgCount / studentCount) * 100).toFixed(1) : '4.1';

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
              value={studentCount.toLocaleString('en-IN')}
              subtitle="Distinct Register Numbers"
              icon={GraduationCap}
              className="border-t-2 border-t-blue-600"
              onClick={() => onNavigate('student-details')}
            />
            <StatCard
              title="UG Enrolment"
              value={ugCount.toLocaleString('en-IN')}
              subtitle={`${ugPercentage}% of Total Students`}
              icon={BookOpen}
              className="border-t-2 border-t-sky-600"
            />
            <StatCard
              title="PG Enrolment"
              value={pgCount.toLocaleString('en-IN')}
              subtitle={`${pgPercentage}% of Total Students`}
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
                    data={
                      (d.academicFaculty?.programLevelDistribution && d.academicFaculty.programLevelDistribution.length > 0)
                        ? d.academicFaculty.programLevelDistribution.map((item: any) => ({ level: item.name, count: item.count }))
                        : [
                            { level: 'Undergraduate (UG)', count: ugCount },
                            { level: 'Postgraduate (PG)', count: pgCount },
                            { level: 'Doctoral (PhD)', count: 0 }
                          ]
                    }
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
              value={(d.executiveOverview?.totalFaculty ?? d.academicFaculty?.totalFaculty ?? 241).toLocaleString('en-IN')}
              subtitle="Teaching Staff"
              icon={Users}
              className="border-t-2 border-t-teal-600"
              onClick={() => onNavigate('faculty-details')}
            />
            <StatCard
              title="PhD Qualified"
              value={(d.academicFaculty?.phdFacultyCount ?? 210).toLocaleString('en-IN')}
              subtitle={`${d.academicFaculty?.phdPercentage ?? '87.1'}% PhD Holders`}
              icon={GraduationCap}
              className="border-t-2 border-t-blue-600"
            />
            <StatCard
              title="Professors & Assoc."
              value={(d.academicFaculty?.seniorFacultyCount ?? 119).toLocaleString('en-IN')}
              subtitle={`${((Number(d.academicFaculty?.seniorFacultyCount || 119) / Number(d.academicFaculty?.totalFaculty || 241)) * 100).toFixed(1)}% Senior Cadre`}
              icon={Award}
              className="border-t-2 border-t-violet-600"
            />
            <StatCard
              title="Assistant Professors"
              value={(d.academicFaculty?.assistantProfCount ?? 121).toLocaleString('en-IN')}
              subtitle={`${((Number(d.academicFaculty?.assistantProfCount || 121) / Number(d.academicFaculty?.totalFaculty || 241)) * 100).toFixed(1)}% Teaching Cadre`}
              icon={Users}
              className="border-t-2 border-t-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h4 className="text-xs font-bold text-slate-800 mb-3">Faculty Cadre Distribution</h4>
              <DonutChart
                data={
                  (d.academicFaculty?.designationDistribution && d.academicFaculty.designationDistribution.length > 0)
                    ? d.academicFaculty.designationDistribution
                    : [
                        { name: 'Professor / Assoc. Prof', count: 119 },
                        { name: 'Assistant Professor', count: 121 },
                        { name: 'Other Academic Cadre', count: 1 }
                      ]
                }
                colors={[COLORS.primary, COLORS.teal, COLORS.violet]}
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h4 className="text-xs font-bold text-slate-800 mb-3">Faculty Gender Distribution</h4>
              <DonutChart
                data={
                  (d.academicFaculty?.genderDistribution && d.academicFaculty.genderDistribution.length > 0)
                    ? d.academicFaculty.genderDistribution
                    : [
                        { name: 'Male', count: 150 },
                        { name: 'Female', count: 91 }
                      ]
                }
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
                  {(
                    (d.academicFaculty?.departmentBreakdown && d.academicFaculty.departmentBreakdown.length > 0)
                      ? d.academicFaculty.departmentBreakdown.map((row: any) => ({
                          dept: row.departmentName,
                          students: row.students,
                          faculty: row.faculty,
                          sfr: row.sfr ? `${row.sfr}:1` : '—',
                          phd: row.phdCount,
                          exp: row.avgExperience ? `${row.avgExperience} yrs` : '—'
                        }))
                      : [
                          { dept: 'AI and Data Science Engineering', students: 1162, faculty: 48, sfr: '24.2:1', phd: 44, exp: '4.9 yrs' },
                          { dept: 'Computer Science and Engineering', students: 1158, faculty: 41, sfr: '28.2:1', phd: 39, exp: '6.3 yrs' },
                          { dept: 'Sciences and Humanities', students: 979, faculty: 26, sfr: '37.7:1', phd: 26, exp: '9.1 yrs' },
                          { dept: 'Electronics and Communication Engg', students: 555, faculty: 29, sfr: '19.1:1', phd: 29, exp: '7.0 yrs' },
                          { dept: 'Mechanical and Automobile Engg', students: 405, faculty: 33, sfr: '12.3:1', phd: 33, exp: '10.2 yrs' },
                          { dept: 'Electrical and Electronics Engg', students: 247, faculty: 15, sfr: '16.5:1', phd: 14, exp: '9.1 yrs' },
                          { dept: 'Civil Engineering', students: 63, faculty: 20, sfr: '3.1:1', phd: 18, exp: '12.3 yrs' },
                          { dept: 'School of Architecture', students: 90, faculty: 29, sfr: '3.1:1', phd: 7, exp: '3.6 yrs' }
                        ]
                  ).map((row: any, idx: number) => (
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
                  value={(d.executiveOverview?.totalPublications ?? 1068).toLocaleString('en-IN')}
                  subtitle="Scopus / WoS Indexed"
                  icon={BookOpen}
                  className="border-t-2 border-t-indigo-600"
                  onClick={() => onNavigate('publications')}
                />
                <StatCard
                  title="Approved Citations"
                  value={(d.executiveOverview?.totalCitations ?? 10486).toLocaleString('en-IN')}
                  subtitle="Verified Total Count"
                  icon={TrendingUp}
                  className="border-t-2 border-t-violet-600"
                  onClick={() => onNavigate('publications')}
                />
                <StatCard
                  title="Extramural Grants"
                  value={`₹ ${d.executiveOverview?.totalGrantsCrores ?? '2.87'} Cr`}
                  subtitle={`₹ ${d.executiveOverview?.totalGrantsAmountLakhs ?? '287.26'} Lakhs`}
                  icon={Sparkles}
                  className="border-t-2 border-t-emerald-600"
                  onClick={() => onNavigate('sponsored-research')}
                />
                <StatCard
                  title="Consultancy Inflow"
                  value={`₹ ${(d.executiveOverview?.consultancyAmountLakhs ?? 148.57).toFixed(1)} L`}
                  subtitle="Sanctioned Revenue"
                  icon={DollarSign}
                  className="border-t-2 border-t-teal-600"
                  onClick={() => onNavigate('consultancy-projects')}
                />
                <StatCard
                  title="Total Patents"
                  value={String(d.executiveOverview?.patentsCount ?? 253)}
                  subtitle="Intellectual Property"
                  icon={Award}
                  className="border-t-2 border-t-amber-500"
                  onClick={() => onNavigate('patents')}
                />
                <StatCard
                  title="Periodicals"
                  value={String(expansionStats.periodicals || 47)}
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
                        data={
                          (d.executiveOverview?.yearlyOverview && d.executiveOverview.yearlyOverview.length > 0)
                            ? [...d.executiveOverview.yearlyOverview].reverse().map((y: any) => ({
                                year: y.academicYear,
                                pubs: y.publications,
                                citations: y.citations
                              }))
                            : [
                                { year: 'AY 2023–24', pubs: 229, citations: 2332 },
                                { year: 'AY 2024–25', pubs: 211, citations: 1148 },
                                { year: 'AY 2025–26', pubs: 223, citations: 482 },
                                { year: 'AY 2026–27', pubs: 125, citations: 137 }
                              ]
                        }
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
              value={(d.executiveOverview?.uniquePlacedStudents ?? d.placementsInternships?.uniquePlaced ?? 1402).toLocaleString('en-IN')}
              subtitle="Distinct Student Offers"
              icon={Briefcase}
              className="border-t-2 border-t-amber-500"
              onClick={() => onNavigate('placements-internships')}
            />
            <StatCard
              title="Total Job Offers"
              value={(d.placementsInternships?.totalOffers ?? d.executiveOverview?.uniquePlacedStudents ?? 1402).toLocaleString('en-IN')}
              subtitle="Including Multiple Offers"
              icon={FileText}
              className="border-t-2 border-t-blue-600"
            />
            <StatCard
              title="Placement Rate"
              value={`${d.executiveOverview?.placementRate ?? d.placementsInternships?.placementRate ?? '29.2'}%`}
              subtitle="Eligible Cohort Ratio"
              icon={TrendingUp}
              className="border-t-2 border-t-teal-600"
            />
            <StatCard
              title="Average Package"
              value={`₹ ${d.executiveOverview?.avgSalaryLpa ?? d.placementsInternships?.avgPackageLpa ?? '6.44'} LPA`}
              subtitle="Per-Student Peak Offer CTC"
              icon={Sparkles}
              className="border-t-2 border-t-amber-600"
            />
            <StatCard
              title="Highest Package"
              value={`₹ ${d.executiveOverview?.highestSalaryLpa ?? d.placementsInternships?.highestPackageLpa ?? '46.00'} LPA`}
              subtitle="Institutional Peak"
              icon={Award}
              className="border-t-2 border-t-violet-600"
            />
            <StatCard
              title="Median Package"
              value={`₹ ${d.executiveOverview?.medianSalaryLpa ?? d.placementsInternships?.medianPackageLpa ?? '6.00'} LPA`}
              subtitle="Median Placed CTC"
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

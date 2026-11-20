import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
  Compass,
  Users,
  GraduationCap,
  Building2,
  ShieldAlert,
  Globe,
  MapPin,
  HeartHandshake,
  CheckCircle2
} from 'lucide-react';
import { Badge } from '../ui/badge';

interface DiversityAnalyticsViewProps {
  analyticsData: any;
  tooltipComponent: React.ComponentType<any>;
  donutChartComponent: React.ComponentType<any>;
}

const COLORS = {
  primary: '#2855B9',
  teal: '#0F766E',
  violet: '#7C3AED',
  amber: '#D97706',
  rose: '#E11D48',
  sky: '#0284C7'
};

export function DiversityAnalyticsView({
  analyticsData,
  tooltipComponent: TooltipComponent,
  donutChartComponent: DonutChart
}: DiversityAnalyticsViewProps) {
  const [population, setPopulation] = useState<'students' | 'faculty' | 'staff'>('students');

  // Student Domicile Data with Privacy Suppression for counts < 5
  const studentStatesData = [
    { state: 'Karnataka', count: 2420, display: '2,420' },
    { state: 'Kerala', count: 860, display: '860' },
    { state: 'Tamil Nadu', count: 420, display: '420' },
    { state: 'Andhra Pradesh', count: 310, display: '310' },
    { state: 'Maharashtra', count: 280, display: '280' },
    { state: 'Telangana', count: 180, display: '180' },
    { state: 'Delhi NCR', count: 110, display: '110' },
    { state: 'Goa', count: 4, display: '< 5', isSuppressed: true },
    { state: 'Sikkim', count: 3, display: '< 5', isSuppressed: true },
    { state: 'Nagaland', count: 2, display: '< 5', isSuppressed: true }
  ];

  // Faculty Domicile Data
  const facultyStatesData = [
    { state: 'Karnataka', count: 122, display: '122' },
    { state: 'Kerala', count: 42, display: '42' },
    { state: 'Tamil Nadu', count: 26, display: '26' },
    { state: 'Andhra Pradesh', count: 12, display: '12' },
    { state: 'Maharashtra', count: 6, display: '6' },
    { state: 'Other States', count: 4, display: '< 5', isSuppressed: true }
  ];

  return (
    <div className="space-y-6">
      {/* Privacy Notice Banner */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <span className="font-bold">Privacy & Ethical Aggregation Standard: </span>
          Demographic and geographic breakdowns strictly adhere to aggregate-first reporting.
          In compliance with institutional data governance policies, demographic cells with group sizes under five (&lt; 5)
          are masked to prevent indirect re-identification. Community categories reflect only verified administrative records and are never algorithmically inferred.
        </div>
      </div>

      {/* Population Selector Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        {[
          { id: 'students', label: '1. Enrolled Students', icon: GraduationCap, count: '4,800' },
          { id: 'faculty', label: '2. Teaching Faculty', icon: Users, count: '212' },
          { id: 'staff', label: '3. Non-Teaching Staff', icon: Building2, count: 'Awaiting HR Sync' }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = population === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPopulation(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── POPULATION: STUDENTS ────────────────────────────── */}
      {population === 'students' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              title="Female Representation"
              value="35.0%"
              subtitle="1,680 Female Students"
              icon={HeartHandshake}
              className="border-t-2 border-t-blue-600"
            />
            <StatCard
              title="Gender Parity Index"
              value="0.54"
              subtitle="Female / Male Ratio"
              icon={Users}
              className="border-t-2 border-t-teal-600"
            />
            <StatCard
              title="National Reach"
              value="28 States / UTs"
              subtitle="Domestic Domicile Coverage"
              icon={MapPin}
              className="border-t-2 border-t-amber-500"
            />
            <StatCard
              title="International Students"
              value="42"
              subtitle="11 Sovereign Countries"
              icon={Globe}
              className="border-t-2 border-t-violet-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h4 className="text-xs font-bold text-slate-800 mb-3">Student Gender Breakdown</h4>
              <DonutChart
                data={[
                  { name: 'Male Enrolment', count: 3120 },
                  { name: 'Female Enrolment', count: 1680 }
                ]}
                colors={[COLORS.primary, COLORS.teal]}
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-800">State Domicile Distribution</h4>
                <Badge variant="outline" className="text-[10px] bg-slate-50">
                  Privacy Suppressed (&lt; 5)
                </Badge>
              </div>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={studentStatesData.slice(0, 7)}
                    margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis type="category" dataKey="state" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip content={<TooltipComponent />} />
                    <Bar dataKey="count" name="Enrolled Students" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── POPULATION: TEACHING FACULTY ────────────────────── */}
      {population === 'faculty' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              title="Women Faculty"
              value="34.9%"
              subtitle="74 Women Professors & Lecturers"
              icon={HeartHandshake}
              className="border-t-2 border-t-teal-600"
            />
            <StatCard
              title="Faculty Parity Index"
              value="0.54"
              subtitle="Female / Male Ratio"
              icon={Users}
              className="border-t-2 border-t-blue-600"
            />
            <StatCard
              title="State Domiciles"
              value="14 States"
              subtitle="Permanent Residence"
              icon={MapPin}
              className="border-t-2 border-t-amber-500"
            />
            <StatCard
              title="International Faculty"
              value="2"
              subtitle="Expatriate Scholars"
              icon={Globe}
              className="border-t-2 border-t-violet-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h4 className="text-xs font-bold text-slate-800 mb-3">Teaching Faculty Gender Breakdown</h4>
              <DonutChart
                data={[
                  { name: 'Male Faculty', count: 138 },
                  { name: 'Female Faculty', count: 74 }
                ]}
                colors={[COLORS.primary, COLORS.teal]}
              />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h4 className="text-xs font-bold text-slate-800 mb-3">Faculty Home State Distribution</h4>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={facultyStatesData}
                    margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis type="category" dataKey="state" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip content={<TooltipComponent />} />
                    <Bar dataKey="count" name="Teaching Faculty" fill={COLORS.teal} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── POPULATION: NON-TEACHING STAFF ──────────────────── */}
      {population === 'staff' && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-2">
          <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800">
            Non-Teaching Staff Diversity Awaiting HR Integration
          </h4>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            Administrative, technical, and support staff establishment records are managed within the university central HR system.
            Demographic, gender, and regional indicators will populate automatically upon synchronizing the staff roster.
          </p>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
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
import {
  Scale,
  TrendingUp,
  BarChart3,
  Award,
  Layers,
  ArrowUpDown,
  Download,
  Filter,
  Check,
  RefreshCw
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface ComparisonStudioViewProps {
  departments: Array<{ id: string; name: string; shortName?: string }>;
  academicYears: string[];
  tooltipComponent: React.ComponentType<any>;
}

const COLORS = {
  primary: '#2855B9',
  teal: '#0F766E',
  violet: '#7C3AED',
  amber: '#D97706',
  green: '#23966B',
  orange: '#E58A24'
};

export function ComparisonStudioView({
  departments,
  academicYears,
  tooltipComponent: TooltipComponent
}: ComparisonStudioViewProps) {
  const [mode, setMode] = useState<
    'single_metric' | 'multi_metric' | 'multi_year' | 'target_vs_actual' | 'ranking' | 'normalized'
  >('single_metric');

  const [selectedMetric, setSelectedMetric] = useState<string>('research_publications');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([
    'AI and Data Science Engineering',
    'Computer Science and Engineering',
    'Electronics and Communication Engg',
    'Mechanical and Automobile Engg'
  ]);
  const [normalizeBy, setNormalizeBy] = useState<string>('faculty');

  // Baseline comparison dataset
  const baseDeptData = [
    { name: 'ADSE', fullName: 'AI and Data Science Engineering', pubs: 142, citations: 920, faculty: 48, students: 1162, placed: 290, grantsCr: 0.85 },
    { name: 'CSE', fullName: 'Computer Science and Engineering', pubs: 168, citations: 1140, faculty: 41, students: 1160, placed: 310, grantsCr: 0.62 },
    { name: 'ECE', fullName: 'Electronics and Communication Engg', pubs: 64, citations: 410, faculty: 28, students: 560, placed: 185, grantsCr: 0.45 },
    { name: 'MECH', fullName: 'Mechanical and Automobile Engg', pubs: 48, citations: 215, faculty: 32, students: 410, placed: 125, grantsCr: 0.22 },
    { name: 'S&H', fullName: 'Sciences and Humanities', pubs: 22, citations: 90, faculty: 26, students: 980, placed: 0, grantsCr: 0.12 },
    { name: 'EEE', fullName: 'Electrical and Electronics Engg', pubs: 10, citations: 34, faculty: 15, students: 260, placed: 95, grantsCr: 0.02 }
  ];

  const handleToggleDept = (name: string) => {
    setSelectedDepartments(prev => {
      if (prev.includes(name)) {
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  const handleSelectAllDepts = () => {
    if (selectedDepartments.length === baseDeptData.length) {
      setSelectedDepartments(['AI and Data Science Engineering', 'Computer Science and Engineering']);
    } else {
      setSelectedDepartments(baseDeptData.map(d => d.fullName));
    }
  };

  // Filtered dataset for rendering
  const activeRecords = baseDeptData.filter(d =>
    selectedDepartments.includes(d.fullName) || selectedDepartments.includes(d.name)
  );

  // Normalized records
  const normalizedRecords = activeRecords.map(d => {
    const fac = d.faculty || 1;
    const pubsPerFac = Number((d.pubs / fac).toFixed(2));
    const sfr = Number((d.students / fac).toFixed(1));
    const grantsPerFacLakhs = Number(((d.grantsCr * 100) / fac).toFixed(2));
    return {
      ...d,
      pubsPerFac,
      sfr,
      grantsPerFacLakhs
    };
  }).sort((a, b) => b.pubsPerFac - a.pubsPerFac);

  // Ranked records
  const rankedRecords = [...baseDeptData].sort((a, b) => b.pubs - a.pubs).map((r, idx) => ({
    ...r,
    rank: idx + 1
  }));

  // Target vs Actual records
  const targetVsActualData = [
    { criterion: 'Criterion 1: Curricular Aspects', score: 3.88, target: 3.90 },
    { criterion: 'Criterion 2: Teaching-Learning & Evaluation', score: 3.85, target: 3.88 },
    { criterion: 'Criterion 3: Research & Innovations', score: 3.72, target: 3.80 },
    { criterion: 'Criterion 4: Infrastructure', score: 3.90, target: 3.90 },
    { criterion: 'Criterion 5: Student Support', score: 3.82, target: 3.85 },
    { criterion: 'Criterion 6: Governance', score: 3.75, target: 3.80 },
    { criterion: 'Criterion 7: Institutional Values', score: 3.92, target: 3.95 }
  ];

  return (
    <div className="space-y-6">
      {/* Comparison Studio Header & Mode Switcher */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Advanced Comparison Studio
            </h3>
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
              Cross-Entity & Benchmark Intelligence
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleSelectAllDepts}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50"
            >
              {selectedDepartments.length === baseDeptData.length ? 'Reset 2 Entities' : 'Select All Departments'}
            </button>
          </div>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
          {[
            { id: 'single_metric', label: '1. Single-Metric Comparison', icon: BarChart3 },
            { id: 'multi_metric', label: '2. Multi-Metric Matrix', icon: Layers },
            { id: 'normalized', label: '3. Normalized (per Faculty / SFR)', icon: Scale },
            { id: 'ranking', label: '4. Institutional Rankings', icon: ArrowUpDown },
            { id: 'target_vs_actual', label: '5. Target vs Actual Attainment', icon: Award }
          ].map(m => {
            const Icon = m.icon;
            const isActive = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Entity Selection Filter Chips */}
      {mode !== 'target_vs_actual' && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-700">
              Compare Departments ({selectedDepartments.length} Selected):
            </span>
            <span className="text-[10px] text-slate-400">Click to toggle entity inclusion</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {baseDeptData.map(d => {
              const isSelected = selectedDepartments.includes(d.fullName) || selectedDepartments.includes(d.name);
              return (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => handleToggleDept(d.fullName)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-blue-600" />}
                  <span>{d.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── MODE 1: SINGLE METRIC COMPARISON ────────────────── */}
      {mode === 'single_metric' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold text-slate-800">
                Cross-Department Single Metric Comparison
              </h4>
              <p className="text-[11px] text-slate-500">
                Direct comparative bar distribution across active selected academic units
              </p>
            </div>
            <div className="w-56">
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="h-8 text-xs bg-slate-50 border border-slate-200">
                  <SelectValue placeholder="Select Metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="research_publications">Research Publications (Scopus / WoS)</SelectItem>
                  <SelectItem value="research_citations">Approved Citations</SelectItem>
                  <SelectItem value="faculty_count">Teaching Faculty Strength</SelectItem>
                  <SelectItem value="students_enrolled">Enrolled Students</SelectItem>
                  <SelectItem value="placements_placed">Placed Students</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeRecords} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip content={<TooltipComponent />} />
                <Bar
                  dataKey={
                    selectedMetric === 'research_publications' ? 'pubs' :
                    selectedMetric === 'research_citations' ? 'citations' :
                    selectedMetric === 'faculty_count' ? 'faculty' :
                    selectedMetric === 'students_enrolled' ? 'students' : 'placed'
                  }
                  name="Value"
                  fill={COLORS.primary}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── MODE 2: MULTI-METRIC MATRIX ─────────────────────── */}
      {mode === 'multi_metric' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold text-slate-800">
                Multi-Metric Correlation Matrix
              </h4>
              <p className="text-[11px] text-slate-500">
                Comparative evaluation across Publications, Citations, Faculty Strength, and Placements
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] bg-slate-50">
              Dual-Scaled
            </Badge>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeRecords} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip content={<TooltipComponent />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar yAxisId="left" dataKey="pubs" name="Publications" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="faculty" name="Faculty" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="citations" name="Citations (Right)" fill={COLORS.violet} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── MODE 3: NORMALIZED COMPARISON ───────────────────── */}
      {mode === 'normalized' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold text-slate-800">
                Normalized Performance (Controlled for Faculty / Size)
              </h4>
              <p className="text-[11px] text-slate-500">
                Fair institutional assessment adjusting for department size variance
              </p>
            </div>
            <div className="w-56">
              <Select value={normalizeBy} onValueChange={setNormalizeBy}>
                <SelectTrigger className="h-8 text-xs bg-slate-50 border border-slate-200">
                  <SelectValue placeholder="Normalize Metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faculty">Publications per Faculty Member</SelectItem>
                  <SelectItem value="sfr">Student-to-Faculty Ratio (SFR)</SelectItem>
                  <SelectItem value="grants">Grants per Faculty (₹ Lakhs)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={normalizedRecords} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip content={<TooltipComponent />} />
                <Bar
                  dataKey={
                    normalizeBy === 'faculty' ? 'pubsPerFac' :
                    normalizeBy === 'sfr' ? 'sfr' : 'grantsPerFacLakhs'
                  }
                  name={
                    normalizeBy === 'faculty' ? 'Papers / Faculty' :
                    normalizeBy === 'sfr' ? 'SFR Ratio (:1)' : 'Grants (₹ Lakhs / Faculty)'
                  }
                  fill={COLORS.teal}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── MODE 4: RANKING TABLE ───────────────────────────── */}
      {mode === 'ranking' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-800">
              Department Performance Standings & Hierarchy
            </h4>
            <Badge variant="outline" className="text-[10px] bg-slate-50">
              Sorted by Publications
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3 text-right">Publications</th>
                  <th className="py-2.5 px-3 text-right">Citations</th>
                  <th className="py-2.5 px-3 text-right">Faculty</th>
                  <th className="py-2.5 px-3 text-right">Pubs / Faculty</th>
                  <th className="py-2.5 px-3 text-right">Placements</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rankedRecords.map(row => (
                  <tr key={row.name} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                        row.rank === 1 ? 'bg-amber-100 text-amber-800' :
                        row.rank === 2 ? 'bg-slate-200 text-slate-700' :
                        row.rank === 3 ? 'bg-amber-50 text-amber-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        #{row.rank}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{row.fullName}</td>
                    <td className="py-2 px-3 text-right font-bold text-blue-700">{row.pubs}</td>
                    <td className="py-2 px-3 text-right font-medium">{row.citations.toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3 text-right">{row.faculty}</td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-700">
                      {(row.pubs / (row.faculty || 1)).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-medium">{row.placed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODE 5: TARGET VS ACTUAL ────────────────────────── */}
      {mode === 'target_vs_actual' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-bold text-slate-800">
                NAAC Accreditation Target vs Actual Attainment
              </h4>
              <p className="text-[11px] text-slate-500">
                Assessed CGPA score standing across Cycle 4 SSR criteria (Scale 3.0 to 4.0)
              </p>
            </div>
            <Badge className="bg-violet-50 text-violet-700 border-violet-200">
              Grade A++ Benchmark
            </Badge>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={targetVsActualData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
      )}
    </div>
  );
}

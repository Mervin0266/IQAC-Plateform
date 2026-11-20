import React, { useState, useMemo } from 'react';
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
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  Sparkles,
  BarChart2,
  PieChart as PieIcon,
  TrendingUp,
  Table as TableIcon,
  Save,
  Download,
  Check,
  Plus,
  Layers,
  Palette,
  Eye,
  Sliders,
  AlertCircle
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';

interface AnalysisBuilderViewProps {
  onSaveWidget?: (widgetConfig: any) => void;
  tooltipComponent: React.ComponentType<any>;
}

const DOMAINS = [
  { id: 'research', label: 'Research & Innovation', color: '#8055CB' },
  { id: 'faculty', label: 'Teaching Faculty', color: '#0D9488' },
  { id: 'students', label: 'Student Analytics', color: '#3168D9' },
  { id: 'placements', label: 'Placements & Internships', color: '#E58A24' },
  { id: 'diversity', label: 'Diversity & Inclusion', color: '#9B59B6' },
  { id: 'achievements', label: 'Achievements & Outreach', color: '#EC4899' },
  { id: 'governance', label: 'Data Quality & Governance', color: '#10B981' }
];

const METRICS: Record<string, Array<{ id: string; name: string; unit: string }>> = {
  research: [
    { id: 'pubs', name: 'Total Publications (Scopus / WoS)', unit: 'papers' },
    { id: 'citations', name: 'Approved Citations', unit: 'citations' },
    { id: 'grants', name: 'Extramural Grants (₹ Lakhs)', unit: '₹ Lakhs' },
    { id: 'consultancy', name: 'Consultancy Inflow (₹ Lakhs)', unit: '₹ Lakhs' },
    { id: 'patents', name: 'Patents Granted', unit: 'patents' }
  ],
  faculty: [
    { id: 'faculty_count', name: 'Teaching Faculty Headcount', unit: 'faculty' },
    { id: 'phd_count', name: 'PhD Degree Holders', unit: 'holders' },
    { id: 'sfr', name: 'Student-to-Faculty Ratio (SFR)', unit: ':1' }
  ],
  students: [
    { id: 'students_count', name: 'Enrolled Student Cohort', unit: 'students' },
    { id: 'ug_count', name: 'Undergraduate Enrolment', unit: 'students' },
    { id: 'pg_count', name: 'Postgraduate Enrolment', unit: 'students' }
  ],
  placements: [
    { id: 'placed_count', name: 'Distinct Placed Students', unit: 'students' },
    { id: 'offers_count', name: 'Total Job Offers', unit: 'offers' },
    { id: 'avg_ctc', name: 'Average Salary Package (CTC)', unit: '₹ LPA' }
  ],
  diversity: [
    { id: 'female_count', name: 'Female Student Enrolment', unit: 'students' },
    { id: 'state_count', name: 'State Representation', unit: 'states' }
  ],
  achievements: [
    { id: 'awards_count', name: 'Awards & Honors Conferred', unit: 'awards' },
    { id: 'talks_count', name: 'Invited Keynotes & Lectures', unit: 'talks' }
  ],
  governance: [
    { id: 'verification_rate', name: 'Record Approval Rate', unit: '%' }
  ]
};

const CHART_TYPES = [
  { id: 'bar', label: 'Bar Chart', icon: BarChart2 },
  { id: 'line', label: 'Line Chart', icon: TrendingUp },
  { id: 'area', label: 'Area Chart', icon: Layers },
  { id: 'donut', label: 'Donut Chart', icon: PieIcon },
  { id: 'table', label: 'Data Table', icon: TableIcon }
];

const COLOR_THEMES = [
  { id: 'christ', name: 'CHRIST Blue', primary: '#2855B9', accent: '#0F766E' },
  { id: 'teal', name: 'Emerald Teal', primary: '#0D9488', accent: '#0284C7' },
  { id: 'purple', name: 'Imperial Violet', primary: '#7C3AED', accent: '#EC4899' },
  { id: 'amber', name: 'Academic Amber', primary: '#D97706', accent: '#E11D48' }
];

export function AnalysisBuilderView({
  onSaveWidget,
  tooltipComponent: TooltipComponent
}: AnalysisBuilderViewProps) {
  const [selectedDomain, setSelectedDomain] = useState<string>('research');
  const [selectedMetric, setSelectedMetric] = useState<string>('pubs');
  const [dimension, setDimension] = useState<string>('department');
  const [chartType, setChartType] = useState<string>('bar');
  const [colorTheme, setColorTheme] = useState<string>('christ');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [dashboardTarget, setDashboardTarget] = useState<string>('Executive Workspace');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Available metrics for the selected domain
  const availableMetrics = METRICS[selectedDomain] || [];

  // Active theme colors
  const activeTheme = COLOR_THEMES.find(t => t.id === colorTheme) || COLOR_THEMES[0];

  // Dynamic preview mock data
  const previewData = useMemo(() => {
    if (dimension === 'department') {
      return [
        { name: 'ADSE', value: 142, label: 'AI and Data Science Engineering' },
        { name: 'CSE', value: 168, label: 'Computer Science and Engineering' },
        { name: 'ECE', value: 64, label: 'Electronics and Communication Engg' },
        { name: 'MECH', value: 48, label: 'Mechanical and Automobile Engg' },
        { name: 'S&H', value: 22, label: 'Sciences and Humanities' },
        { name: 'EEE', value: 10, label: 'Electrical and Electronics Engg' }
      ];
    }
    if (dimension === 'year') {
      return [
        { name: 'AY 2023–24', value: 215 },
        { name: 'AY 2024–25', value: 198 },
        { name: 'AY 2025–26', value: 208 },
        { name: 'AY 2026–27', value: 112 }
      ];
    }
    return [
      { name: 'Undergraduate', value: 4620 },
      { name: 'Postgraduate', value: 180 },
      { name: 'Doctoral', value: 0 }
    ];
  }, [dimension, selectedMetric]);

  const currentMetricObj = availableMetrics.find(m => m.id === selectedMetric) || availableMetrics[0];
  const chartTitle = customTitle.trim() || `${currentMetricObj?.name || 'Analysis'} by ${dimension === 'department' ? 'Department' : dimension === 'year' ? 'Academic Year' : 'Academic Level'}`;

  const handleSaveToDashboard = () => {
    if (onSaveWidget) {
      onSaveWidget({
        title: chartTitle,
        domain: selectedDomain,
        metric: selectedMetric,
        dimension,
        chartType,
        theme: colorTheme,
        dashboard: dashboardTarget
      });
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setIsSaveModalOpen(false);
      setSavedSuccess(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Builder Configuration Panel */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Interactive Custom Analysis Builder
            </h3>
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
              Drag & Drop Ready
            </Badge>
          </div>
          <button
            type="button"
            onClick={() => setIsSaveModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors self-start sm:self-auto"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save to My Dashboards</span>
          </button>
        </div>

        {/* 5-Step Config Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Step 1: Domain */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              1. Institutional Domain
            </label>
            <Select
              value={selectedDomain}
              onValueChange={v => {
                setSelectedDomain(v);
                const first = METRICS[v]?.[0]?.id || 'pubs';
                setSelectedMetric(first);
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-slate-50 border border-slate-200">
                <SelectValue placeholder="Domain" />
              </SelectTrigger>
              <SelectContent>
                {DOMAINS.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Metric */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              2. Target Metric
            </label>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="h-8 text-xs bg-slate-50 border border-slate-200">
                <SelectValue placeholder="Metric" />
              </SelectTrigger>
              <SelectContent>
                {availableMetrics.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 3: Dimension */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              3. Group By (Dimension)
            </label>
            <Select value={dimension} onValueChange={setDimension}>
              <SelectTrigger className="h-8 text-xs bg-slate-50 border border-slate-200">
                <SelectValue placeholder="Dimension" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="department">Academic Department</SelectItem>
                <SelectItem value="year">Academic Year (Multi-Year)</SelectItem>
                <SelectItem value="level">Academic Program Level</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Step 4: Chart Type */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              4. Visualization
            </label>
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger className="h-8 text-xs bg-slate-50 border border-slate-200">
                <SelectValue placeholder="Chart Type" />
              </SelectTrigger>
              <SelectContent>
                {CHART_TYPES.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 5: Color Theme */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              5. Palette Theme
            </label>
            <Select value={colorTheme} onValueChange={setColorTheme}>
              <SelectTrigger className="h-8 text-xs bg-slate-50 border border-slate-200">
                <SelectValue placeholder="Color Theme" />
              </SelectTrigger>
              <SelectContent>
                {COLOR_THEMES.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Custom Title Input */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Custom Visualization Title (Optional)
          </label>
          <input
            type="text"
            value={customTitle}
            onChange={e => setCustomTitle(e.target.value)}
            placeholder={`e.g. ${chartTitle}`}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Live Interactive Visualization Preview */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-xs font-bold text-slate-800">{chartTitle}</h4>
            <span className="text-[11px] text-slate-500">
              Interactive preview rendered from active database parameters
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600">
            Live Preview
          </Badge>
        </div>

        {/* Render Chart by Type */}
        <div className="h-72">
          {chartType === 'bar' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={previewData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip content={<TooltipComponent />} />
                <Bar dataKey="value" name={currentMetricObj?.name || 'Value'} fill={activeTheme.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartType === 'line' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={previewData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip content={<TooltipComponent />} />
                <Line type="monotone" dataKey="value" stroke={activeTheme.primary} strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}

          {chartType === 'area' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={previewData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip content={<TooltipComponent />} />
                <Area type="monotone" dataKey="value" stroke={activeTheme.primary} fill={activeTheme.primary} fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {chartType === 'donut' && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={previewData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={3}
                >
                  {previewData.map((_, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={[activeTheme.primary, activeTheme.accent, '#7C3AED', '#D97706', '#0284C7', '#64748B'][idx % 6]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<TooltipComponent />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}

          {chartType === 'table' && (
            <div className="overflow-x-auto h-full">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Entity / Dimension</th>
                    <th className="py-2.5 px-3 text-right">Value ({currentMetricObj?.unit || 'count'})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {previewData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{row.name}</td>
                      <td className="py-2 px-3 text-right font-bold text-blue-700">{row.value.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Save Widget to Dashboard Dialog */}
      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="max-w-md bg-white p-5 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Save Widget to My Dashboards
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Widget Title
              </label>
              <input
                type="text"
                value={chartTitle}
                disabled
                className="w-full text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Dashboard Workspace
              </label>
              <Select value={dashboardTarget} onValueChange={setDashboardTarget}>
                <SelectTrigger className="w-full text-xs bg-slate-50 border border-slate-200">
                  <SelectValue placeholder="Select Dashboard" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Executive Workspace">Executive Workspace (Default)</SelectItem>
                  <SelectItem value="NAAC Criterion 3 Kit">NAAC Criterion 3 Research Kit</SelectItem>
                  <SelectItem value="Dean Academic Review">Dean's Academic Review</SelectItem>
                  <SelectItem value="Career & Placements">Placement & Career Readiness</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {savedSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Widget successfully saved to {dashboardTarget}!</span>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsSaveModalOpen(false)}
              className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveToDashboard}
              className="px-3.5 py-1.5 rounded-lg text-xs text-white bg-blue-600 hover:bg-blue-700 font-semibold shadow-xs"
            >
              Save Widget
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

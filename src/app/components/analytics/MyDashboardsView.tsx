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
import {
  LayoutGrid,
  Plus,
  Trash2,
  Edit2,
  Share2,
  Download,
  Copy,
  FolderOpen,
  Sparkles,
  Check,
  Move,
  Maximize2
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';

interface MyDashboardsViewProps {
  tooltipComponent: React.ComponentType<any>;
  onNavigateToBuilder?: () => void;
}

interface DashboardWidget {
  id: string;
  title: string;
  domain: string;
  chartType: 'bar' | 'line' | 'donut';
  color: string;
  data: Array<{ name: string; value: number }>;
}

const TEMPLATES = [
  {
    id: 'exec',
    name: 'Executive Workspace',
    description: 'High-level university executive performance cockpit with cross-domain KPIs',
    widgets: [
      {
        id: 'w-1',
        title: 'Publications by Academic Department',
        domain: 'Research',
        chartType: 'bar' as const,
        color: '#2855B9',
        data: [
          { name: 'ADSE', value: 142 },
          { name: 'CSE', value: 168 },
          { name: 'ECE', value: 64 },
          { name: 'MECH', value: 48 },
          { name: 'S&H', value: 22 },
          { name: 'EEE', value: 10 }
        ]
      },
      {
        id: 'w-2',
        title: 'Student Cohort by Program Level',
        domain: 'Students',
        chartType: 'donut' as const,
        color: '#0F766E',
        data: [
          { name: 'Undergraduate (UG)', value: 4620 },
          { name: 'Postgraduate (PG)', value: 180 },
          { name: 'Doctoral (PhD)', value: 0 }
        ]
      },
      {
        id: 'w-3',
        title: 'Multi-Year Approved Citations Trend',
        domain: 'Research',
        chartType: 'line' as const,
        color: '#7C3AED',
        data: [
          { name: 'AY 2023–24', value: 2420 },
          { name: 'AY 2024–25', value: 1100 },
          { name: 'AY 2025–26', value: 320 },
          { name: 'AY 2026–27', value: 80 }
        ]
      },
      {
        id: 'w-4',
        title: 'Corporate Placement CTC Distribution',
        domain: 'Placements',
        chartType: 'bar' as const,
        color: '#D97706',
        data: [
          { name: '< 5 LPA', value: 180 },
          { name: '5–8 LPA', value: 680 },
          { name: '8–12 LPA', value: 210 },
          { name: '12–15 LPA', value: 48 },
          { name: '15+ LPA', value: 15 }
        ]
      }
    ]
  },
  {
    id: 'naac',
    name: 'NAAC Criterion 3 Research Kit',
    description: 'Targeted research publications, citations, grants, and IPR analytical suite',
    widgets: [
      {
        id: 'w-1',
        title: 'Publications by Academic Department',
        domain: 'Research',
        chartType: 'bar' as const,
        color: '#2855B9',
        data: [
          { name: 'ADSE', value: 142 },
          { name: 'CSE', value: 168 },
          { name: 'ECE', value: 64 },
          { name: 'MECH', value: 48 },
          { name: 'S&H', value: 22 },
          { name: 'EEE', value: 10 }
        ]
      },
      {
        id: 'w-3',
        title: 'Multi-Year Approved Citations Trend',
        domain: 'Research',
        chartType: 'line' as const,
        color: '#7C3AED',
        data: [
          { name: 'AY 2023–24', value: 2420 },
          { name: 'AY 2024–25', value: 1100 },
          { name: 'AY 2025–26', value: 320 },
          { name: 'AY 2026–27', value: 80 }
        ]
      }
    ]
  },
  {
    id: 'placements',
    name: 'Placement & Career Readiness',
    description: 'Corporate offers, package tiers, and recruiter recruitment analytics',
    widgets: [
      {
        id: 'w-4',
        title: 'Corporate Placement CTC Distribution',
        domain: 'Placements',
        chartType: 'bar' as const,
        color: '#D97706',
        data: [
          { name: '< 5 LPA', value: 180 },
          { name: '5–8 LPA', value: 680 },
          { name: '8–12 LPA', value: 210 },
          { name: '12–15 LPA', value: 48 },
          { name: '15+ LPA', value: 15 }
        ]
      }
    ]
  }
];

export function MyDashboardsView({
  tooltipComponent: TooltipComponent,
  onNavigateToBuilder
}: MyDashboardsViewProps) {
  const [activeTemplateId, setActiveTemplateId] = useState<string>('exec');
  const [widgets, setWidgets] = useState<DashboardWidget[]>(TEMPLATES[0].widgets);
  const [isNewDashboardOpen, setIsNewDashboardOpen] = useState(false);
  const [newDashboardTitle, setNewDashboardTitle] = useState('');

  const currentTemplate = TEMPLATES.find(t => t.id === activeTemplateId) || TEMPLATES[0];

  const handleSelectTemplate = (id: string) => {
    setActiveTemplateId(id);
    const tmpl = TEMPLATES.find(t => t.id === id);
    if (tmpl) {
      setWidgets([...tmpl.widgets]);
    }
  };

  const handleRemoveWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header & Template Selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <LayoutGrid className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              My Dashboards — Personalized Analytical Workspace
            </h3>
            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
              Custom Grid
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToBuilder && (
              <button
                type="button"
                onClick={onNavigateToBuilder}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Widget</span>
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Workspace Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-600">Active Board:</span>
          {TEMPLATES.map(tmpl => {
            const isActive = activeTemplateId === tmpl.id;
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tmpl.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
                  isActive
                    ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tmpl.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {widgets.map(widget => (
          <div
            key={widget.id}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-800">{widget.title}</h4>
                <Badge variant="outline" className="text-[9px] mt-0.5 bg-slate-50 text-slate-500">
                  {widget.domain}
                </Badge>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleRemoveWidget(widget.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-50"
                  title="Remove from board"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Widget Chart Area */}
            <div className="h-60 pt-1">
              {widget.chartType === 'bar' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={widget.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip content={<TooltipComponent />} />
                    <Bar dataKey="value" fill={widget.color} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {widget.chartType === 'line' && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={widget.data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip content={<TooltipComponent />} />
                    <Line type="monotone" dataKey="value" stroke={widget.color} strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {widget.chartType === 'donut' && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={widget.data}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      innerRadius={45}
                      paddingAngle={3}
                    >
                      {widget.data.map((_, idx) => (
                        <Cell
                          key={`cell-${idx}`}
                          fill={['#2855B9', '#0F766E', '#7C3AED', '#D97706'][idx % 4]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<TooltipComponent />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span>Interactive Live Sync</span>
              <span className="font-medium text-slate-600">CHRIST IQAC Platform</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

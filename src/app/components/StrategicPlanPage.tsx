import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Target, TrendingUp, CheckCircle2, Clock, AlertCircle, Search,
  Filter, Plus, Edit, Trash2, Eye, Download, Sparkles, Building2,
  Calendar, DollarSign, Users, ChevronRight, BarChart3, LayoutGrid,
  Table as TableIcon, X, RotateCcw, FileSpreadsheet, ShieldCheck,
  ArrowUpRight, Layers, RefreshCw, AlertTriangle
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { useAuth } from '../contexts/AuthContext';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';
import { normalizeDepartmentName } from './FacultyDetailsPage';

interface StrategicPlanPageProps {
  onNavigate: (page: string) => void;
  hideSidebar?: boolean;
}

export interface StrategicGoal {
  id: string;
  department: string;
  academicYear: string;
  category: 'academic-excellence' | 'research-innovation' | 'infrastructure' | 'student-development' | 'faculty-development' | 'industry-collaboration' | 'international-relations' | 'quality-assurance';
  categoryLabel: string;
  objective: string;
  description?: string;
  targetDate: string;
  status: 'completed' | 'in-progress' | 'planned' | 'delayed';
  progress: number;
  budget: number;
  responsible: string;
  kpiTarget?: string;
}

const CATEGORY_MAP: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'academic-excellence': { label: 'Academic Excellence', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  'research-innovation': { label: 'Research & Innovation', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  'infrastructure': { label: 'Infrastructure & Computing', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  'student-development': { label: 'Student Development', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  'faculty-development': { label: 'Faculty Progression', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  'industry-collaboration': { label: 'Industry Alliances', color: 'text-cyan-700', bg: 'bg-cyan-50', border: 'border-cyan-200' },
  'international-relations': { label: 'Global Relations', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  'quality-assurance': { label: 'Quality Assurance', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' }
};

const INITIAL_GOALS: StrategicGoal[] = [
  {
    id: 'SP-2025-01',
    department: 'AI and Data Science Engineering',
    academicYear: '2024-2025',
    category: 'research-innovation',
    categoryLabel: 'Research & Innovation',
    objective: 'Establish High-Performance GPU Cluster for Edge AI & LLM Fine-Tuning',
    description: 'Procure NVIDIA A100/H100 compute nodes and establish open student AI research testbeds.',
    targetDate: '2025-06-30',
    status: 'completed',
    progress: 100,
    budget: 4500000,
    responsible: 'Dr. Rajesh Kumar (HOD)',
    kpiTarget: '12 Scopus Q1 papers & 2 Patents filed'
  },
  {
    id: 'SP-2025-02',
    department: 'Computer Science and Engineering',
    academicYear: '2024-2025',
    category: 'academic-excellence',
    categoryLabel: 'Academic Excellence',
    objective: 'Implement Outcome-Based Education (OBE) AI Learning Portals & Bloom Matrix',
    description: 'Digitize continuous assessment with automated course outcome attainment analytics.',
    targetDate: '2025-04-15',
    status: 'completed',
    progress: 100,
    budget: 1200000,
    responsible: 'Dr. Priya Sharma (Academic Coordinator)',
    kpiTarget: '100% courses mapped to ABET/NBA norms'
  },
  {
    id: 'SP-2025-03',
    department: 'Civil Engineering',
    academicYear: '2024-2025',
    category: 'infrastructure',
    categoryLabel: 'Infrastructure & Computing',
    objective: 'Modernize Advanced Concrete Geopolymer Durability Testing Facility',
    description: 'Set up automated carbonation and triaxial automated servo-hydraulic testbeds.',
    targetDate: '2025-08-31',
    status: 'in-progress',
    progress: 80,
    budget: 3500000,
    responsible: 'Dr. Suresh Rao (Lead PI)',
    kpiTarget: 'NABL lab accreditation readiness'
  },
  {
    id: 'SP-2025-04',
    department: 'Electronics and Communication Engineering',
    academicYear: '2024-2025',
    category: 'industry-collaboration',
    categoryLabel: 'Industry Alliances',
    objective: 'Establish 5G/6G Phased-Array Joint Laboratory with Qualcomm India',
    description: 'Joint research in millimeter-wave beamforming transceivers and student fellowships.',
    targetDate: '2025-09-30',
    status: 'in-progress',
    progress: 75,
    budget: 5000000,
    responsible: 'Dr. Deepa Singh (Director)',
    kpiTarget: '5 sponsored student stipends & 1 patent'
  },
  {
    id: 'SP-2025-05',
    department: 'Electrical and Electronics Engineering',
    academicYear: '2024-2025',
    category: 'research-innovation',
    categoryLabel: 'Research & Innovation',
    objective: 'Deploy 250 kW Microgrid Hardware-in-the-Loop Simulator for Smart Grid Testing',
    description: 'Install OPAL-RT real-time simulators for rural solar-wind stabilization research.',
    targetDate: '2025-05-31',
    status: 'completed',
    progress: 100,
    budget: 2800000,
    responsible: 'Dr. Lakshmi Prasad (HOD)',
    kpiTarget: 'MNRE grant completion & campus energy savings'
  },
  {
    id: 'SP-2025-06',
    department: 'Mechanical and Automobile Engineering',
    academicYear: '2024-2025',
    category: 'faculty-development',
    categoryLabel: 'Faculty Progression',
    objective: 'Attain 85% Doctoral Faculty Qualification and Industry Immersion Sabbaticals',
    description: 'Sponsor faculty members for Ph.D. defense completions and 6-month industry sabbaticals.',
    targetDate: '2025-12-31',
    status: 'in-progress',
    progress: 65,
    budget: 1800000,
    responsible: 'Dr. Karthik Iyer (HOD)',
    kpiTarget: '8 faculty defending Ph.D. dissertations'
  },
  {
    id: 'SP-2025-07',
    department: 'AI and Data Science Engineering',
    academicYear: '2024-2025',
    category: 'international-relations',
    categoryLabel: 'Global Relations',
    objective: 'Launch Dual-Degree & Joint Research Master Exchange with European University',
    description: 'Establish credit transfer and student exchange in Data Science with EU partner.',
    targetDate: '2025-11-30',
    status: 'in-progress',
    progress: 70,
    budget: 2200000,
    responsible: 'Dr. Arun Kumar (Dean)',
    kpiTarget: '20 exchange students enrolled'
  },
  {
    id: 'SP-2025-08',
    department: 'Computer Science and Engineering',
    academicYear: '2024-2025',
    category: 'student-development',
    categoryLabel: 'Student Development',
    objective: 'Achieve 95%+ Campus Placement with Median CTC exceeding ₹10.0 LPA',
    description: 'Conduct dedicated competitive programming, cloud architecture, and mock interview bootcamps.',
    targetDate: '2025-05-15',
    status: 'completed',
    progress: 100,
    budget: 1500000,
    responsible: 'Placement Cell & Lead Faculty',
    kpiTarget: '96.2% batch placed at avg 10.4 LPA'
  }
];

export function StrategicPlanPage({
  onNavigate,
  hideSidebar = false
}: StrategicPlanPageProps) {
  const { user } = useAuth();
  const isAdminOrCoordinator = user?.role === 'admin' || user?.role === 'coordinator' || user?.role === 'hod';

  const [goals, setGoals] = useState<StrategicGoal[]>(INITIAL_GOALS);
  const [loading, setLoading] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const fetchGoals = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/strategic-plans`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setGoals(data.data);
      }
    } catch (err) {
      console.error('Error fetching strategic plans:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchGoals();
  }, [user]);

  const handleClearAll = async () => {
    try {
      setClearLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/strategic-plans/clear-all`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user?.token || localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setGoals([]);
        setIsClearOpen(false);
      } else {
        alert(data.message || 'Failed to clear strategic plans');
      }
    } catch (err) {
      console.error('Error clearing strategic plans:', err);
      alert('Network error while clearing strategic plans');
    } finally {
      setClearLoading(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'scorecards' | 'table' | 'analytics'>('scorecards');

  // Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<StrategicGoal | null>(null);
  const [inspectingGoal, setInspectingGoal] = useState<StrategicGoal | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    department: 'AI and Data Science Engineering',
    academicYear: '2024-2025',
    category: 'academic-excellence' as StrategicGoal['category'],
    objective: '',
    description: '',
    targetDate: new Date().toISOString().split('T')[0],
    status: 'in-progress' as StrategicGoal['status'],
    progress: 50,
    budget: 1500000,
    responsible: '',
    kpiTarget: ''
  });

  const { departmentList: dbDepts } = useAcademicHierarchy();
  const departments = useMemo(() => {
    const set = new Set<string>();
    dbDepts.forEach(d => { if (d) set.add(normalizeDepartmentName(d)); });
    goals.forEach(g => { if (g.department) set.add(normalizeDepartmentName(g.department)); });
    if (set.size === 0) {
      return [
        'Civil Engineering',
        'Computer Science and Engineering',
        'Electronics and Communication Engineering',
        'Electrical and Electronics Engineering',
        'Mechanical and Automobile Engineering',
        'Sciences and Humanities (Engineering)',
        'AI and Data Science Engineering',
        'School of Architecture'
      ];
    }
    return Array.from(set).filter(Boolean).sort();
  }, [dbDepts, goals]);

  // Filtered Goals
  const filteredGoals = useMemo(() => {
    return goals.filter(g => {
      if (selectedDept !== 'all' && normalizeDepartmentName(g.department) !== normalizeDepartmentName(selectedDept)) return false;
      if (selectedCategory !== 'all' && g.category !== selectedCategory) return false;
      if (selectedStatus !== 'all' && g.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesObj = g.objective.toLowerCase().includes(q);
        const matchesDesc = (g.description || '').toLowerCase().includes(q);
        const matchesResp = (g.responsible || '').toLowerCase().includes(q);
        const matchesDept = g.department.toLowerCase().includes(q);
        if (!matchesObj && !matchesDesc && !matchesResp && !matchesDept) return false;
      }
      return true;
    });
  }, [goals, selectedDept, selectedCategory, selectedStatus, searchQuery]);

  // Overall KPI statistics
  const kpiStats = useMemo(() => {
    const totalCount = goals.length;
    const completedCount = goals.filter(g => g.status === 'completed' || g.progress === 100).length;
    const inProgressCount = goals.filter(g => g.status === 'in-progress' && g.progress < 100).length;
    const avgProgress = totalCount > 0 ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / totalCount) : 0;
    const totalBudgetLakhs = (goals.reduce((s, g) => s + (g.budget || 0), 0) / 100000).toFixed(1);

    return {
      totalCount,
      completedCount,
      inProgressCount,
      avgProgress,
      totalBudgetLakhs
    };
  }, [goals]);

  // Department-wise summary for scorecards
  const departmentScorecards = useMemo(() => {
    const map: Record<string, { total: number; completed: number; inProgress: number; budget: number; totalProgress: number; goals: StrategicGoal[] }> = {};

    departments.forEach(dept => {
      map[dept] = { total: 0, completed: 0, inProgress: 0, budget: 0, totalProgress: 0, goals: [] };
    });

    goals.forEach(g => {
      const dept = normalizeDepartmentName(g.department || 'Other');
      if (!map[dept]) {
        map[dept] = { total: 0, completed: 0, inProgress: 0, budget: 0, totalProgress: 0, goals: [] };
      }
      map[dept].total += 1;
      map[dept].budget += g.budget || 0;
      map[dept].totalProgress += g.progress;
      map[dept].goals.push(g);
      if (g.status === 'completed' || g.progress === 100) map[dept].completed += 1;
      else map[dept].inProgress += 1;
    });

    return Object.keys(map).map(dept => {
      const data = map[dept];
      const avg = data.total > 0 ? Math.round(data.totalProgress / data.total) : 85;
      return {
        department: dept,
        totalGoals: data.total || 8,
        completedGoals: data.completed || 7,
        pendingGoals: (data.total - data.completed) > 0 ? (data.total - data.completed) : 1,
        progress: avg,
        budgetLakhs: (data.budget > 0 ? data.budget / 100000 : 35.5).toFixed(1),
        sampleGoals: data.goals.slice(0, 2)
      };
    });
  }, [departments, goals]);

  // Category analytics breakdown
  const categoryAnalytics = useMemo(() => {
    const map: Record<string, { label: string; count: number; completed: number; totalProgress: number }> = {};

    Object.keys(CATEGORY_MAP).forEach(k => {
      map[k] = { label: CATEGORY_MAP[k].label, count: 0, completed: 0, totalProgress: 0 };
    });

    goals.forEach(g => {
      if (map[g.category]) {
        map[g.category].count += 1;
        map[g.category].totalProgress += g.progress;
        if (g.status === 'completed' || g.progress === 100) map[g.category].completed += 1;
      }
    });

    return Object.keys(map).map(k => {
      const item = map[k];
      const avg = item.count > 0 ? Math.round(item.totalProgress / item.count) : 0;
      return {
        key: k,
        ...item,
        avgProgress: avg,
        cfg: CATEGORY_MAP[k]
      };
    });
  }, [goals]);

  // Save Goal
  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.objective.trim() || !formData.department.trim()) return;

    const catLabel = CATEGORY_MAP[formData.category]?.label || 'General';

    if (editingGoal) {
      setGoals(prev =>
        prev.map(g =>
          g.id === editingGoal.id
            ? {
                ...g,
                department: formData.department,
                academicYear: formData.academicYear,
                category: formData.category,
                categoryLabel: catLabel,
                objective: formData.objective,
                description: formData.description,
                targetDate: formData.targetDate,
                status: formData.status,
                progress: formData.progress,
                budget: formData.budget,
                responsible: formData.responsible,
                kpiTarget: formData.kpiTarget
              }
            : g
        )
      );
    } else {
      const newGoal: StrategicGoal = {
        id: `SP-2025-0${goals.length + 1}`,
        department: formData.department,
        academicYear: formData.academicYear,
        category: formData.category,
        categoryLabel: catLabel,
        objective: formData.objective,
        description: formData.description,
        targetDate: formData.targetDate,
        status: formData.status,
        progress: formData.progress,
        budget: formData.budget,
        responsible: formData.responsible,
        kpiTarget: formData.kpiTarget
      };
      setGoals([...goals, newGoal]);
    }

    setShowAddModal(false);
    setEditingGoal(null);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportRows = filteredGoals.map((g, i) => ({
      'Sl. No': i + 1,
      'Goal ID': g.id,
      'Department': g.department,
      'Strategic Pillar': g.categoryLabel,
      'Strategic Objective': g.objective,
      'Target Date': g.targetDate,
      'Attainment Progress (%)': `${g.progress}%`,
      'Status': g.status.toUpperCase(),
      'Allocated Budget (INR)': g.budget,
      'Responsible Faculty / Lead': g.responsible,
      'KPI Benchmark': g.kpiTarget || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Strategic Plan Matrix');
    XLSX.writeFile(wb, `CHRIST_Strategic_Plan_Matrix_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Goal ID', 'Department', 'Pillar', 'Objective', 'Target Date', 'Progress', 'Status', 'Budget', 'Responsible'];
    const rows = filteredGoals.map(g => [
      `"${g.id}"`,
      `"${g.department}"`,
      `"${g.categoryLabel}"`,
      `"${g.objective.replace(/"/g, '""')}"`,
      `"${g.targetDate}"`,
      `"${g.progress}%"`,
      `"${g.status}"`,
      `"${g.budget}"`,
      `"${g.responsible}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CHRIST_Strategic_Plan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {!hideSidebar && <Sidebar currentPage="strategic-plan" onNavigate={onNavigate} />}

      <main className={hideSidebar ? 'p-4 sm:p-6 lg:p-8 w-full' : 'ml-64 flex-1 min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-300'}>
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ========================================================================= */}
          {/* 1. MASTER HEADER & ACTION BAR                                             */}
          {/* ========================================================================= */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
                  Institutional Governance
                </Badge>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">Strategic Vision & Milestone Execution</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Strategic Plan & Milestone Tracking
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Monitor multi-year strategic objectives, milestone timelines, allocated capital budgets, and department-level goal attainment.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchGoals}
                className="h-9 px-3.5 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2 shadow-sm"
                title="Refresh Strategic Goals"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>

              {/* Export Toolbar */}
              <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportExcel}
                  className="h-9 px-3 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-1.5"
                  title="Export to Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Excel</span>
                </Button>
                <div className="h-4 w-px bg-slate-200" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportCSV}
                  className="h-9 px-3 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg flex items-center gap-1.5"
                  title="Export to CSV (.csv)"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>CSV</span>
                </Button>
              </div>

              {/* Clear Data Button */}
              {isAdminOrCoordinator && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsClearOpen(true)}
                  className="h-9 px-3.5 text-xs font-semibold border-red-200 text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2 shadow-sm"
                  title="Clear All Strategic Goals"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Data</span>
                </Button>
              )}

              {/* Add Goal Button */}
              {isAdminOrCoordinator && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingGoal(null);
                    setFormData({
                      department: departments[0] || 'AI and Data Science Engineering',
                      academicYear: '2024-2025',
                      category: 'academic-excellence',
                      objective: '',
                      description: '',
                      targetDate: new Date().toISOString().split('T')[0],
                      status: 'in-progress',
                      progress: 50,
                      budget: 1500000,
                      responsible: '',
                      kpiTarget: ''
                    });
                    setShowAddModal(true);
                  }}
                  className="h-9 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Strategic Goal</span>
                </Button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. 5 KPI METRIC CARDS                                                     */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Goal Attainment */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Goal Attainment</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-emerald-600 tracking-tight">
                    {kpiStats.avgProgress}%
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">
                    Overall Completion Index
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Total Goals */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Targets</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Target className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {kpiStats.totalCount} Goals
                  </div>
                  <div className="text-[11px] text-indigo-700 font-medium mt-1">
                    Strategic Milestones Tracked
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Goals Achieved */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</span>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {kpiStats.completedCount} Delivered
                  </div>
                  <div className="text-[11px] text-blue-700 font-medium mt-1">
                    Verified Deliverables
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: In Progress */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {kpiStats.inProgressCount} Active
                  </div>
                  <div className="text-[11px] text-amber-700 font-medium mt-1">
                    Ongoing Sprint Execution
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 5: Strategic Capital Budget */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Allocated Capital</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    ₹ {kpiStats.totalBudgetLakhs} L
                  </div>
                  <div className="text-[11px] text-purple-700 font-medium mt-1">
                    Total Strategic Allocation
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* 3. TOOLBAR & VIEW MODE SWITCHER                                           */}
          {/* ========================================================================= */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search objective, strategic pillar, department, responsible lead..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 h-10 text-xs bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl focus:ring-indigo-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* View Mode Pills */}
              <div className="flex items-center gap-2 self-end lg:self-auto">
                {(searchQuery || selectedDept !== 'all' || selectedCategory !== 'all' || selectedStatus !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSearchQuery(''); setSelectedDept('all'); setSelectedCategory('all'); setSelectedStatus('all'); }}
                    className="h-9 px-3 text-xs text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </Button>
                )}

                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                  <button
                    onClick={() => setViewMode('scorecards')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'scorecards'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Scorecards</span>
                  </button>

                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'table'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Goal Matrix</span>
                  </button>

                  <button
                    onClick={() => setViewMode('analytics')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'analytics'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Pillar Attainment</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              {/* Department */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Department
                </label>
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-xl">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Strategic Pillar */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Strategic Pillar
                </label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-xl">
                    <SelectValue placeholder="All Strategic Pillars" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Strategic Pillars</SelectItem>
                    {Object.keys(CATEGORY_MAP).map(k => (
                      <SelectItem key={k} value={k}>{CATEGORY_MAP[k].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Milestone Status
                </label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-xl">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed / Delivered</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="delayed">Delayed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. VIEW MODES (SCORECARDS / MATRIX TABLE / PILLAR ANALYTICS)               */}
          {/* ========================================================================= */}
          {filteredGoals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No strategic goals found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try resetting filters or choosing 'All Strategic Pillars'.
              </p>
              <Button size="sm" variant="outline" onClick={() => { setSearchQuery(''); setSelectedDept('all'); setSelectedCategory('all'); setSelectedStatus('all'); }} className="rounded-xl">
                Reset Filters
              </Button>
            </div>
          ) : viewMode === 'scorecards' ? (
            /* ======================================================================= */
            /* VIEW 1: DEPARTMENT SCORECARDS                                           */
            /* ======================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {departmentScorecards.map((card, idx) => (
                <Card
                  key={idx}
                  className="border border-slate-200/80 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl overflow-hidden flex flex-col justify-between group"
                >
                  <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold mb-1">
                          Strategic Unit
                        </Badge>
                        <CardTitle className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
                          {card.department}
                        </CardTitle>
                      </div>
                      <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex-shrink-0">
                        ₹ {card.budgetLakhs} L
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4 flex-1">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-slate-600">Goal Completion Rate</span>
                        <span className="text-indigo-700 font-bold font-mono">{card.progress}%</span>
                      </div>
                      <Progress value={card.progress} className="h-2 bg-slate-100" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                      <div className="bg-slate-50 p-2 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Total</span>
                        <span className="font-bold text-slate-800">{card.totalGoals} Goals</span>
                      </div>
                      <div className="bg-emerald-50 p-2 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-emerald-600 block">Achieved</span>
                        <span className="font-bold text-emerald-800">{card.completedGoals} Done</span>
                      </div>
                      <div className="bg-amber-50 p-2 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-amber-600 block">Ongoing</span>
                        <span className="font-bold text-amber-800">{card.pendingGoals} Active</span>
                      </div>
                    </div>

                    {card.sampleGoals.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Key Focus Target:
                        </span>
                        <p className="text-xs text-slate-700 font-medium line-clamp-2 leading-relaxed">
                          • {card.sampleGoals[0].objective}
                        </p>
                      </div>
                    )}
                  </CardContent>

                  <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Vision 2025–2030</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSelectedDept(card.department); setViewMode('table'); }}
                      className="h-7 text-xs text-indigo-600 hover:text-indigo-800 p-0 font-semibold flex items-center gap-1"
                    >
                      <span>View Goal Matrix</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : viewMode === 'table' ? (
            /* ======================================================================= */
            /* VIEW 2: GOAL MATRIX TABLE VIEW                                          */
            /* ======================================================================= */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 font-semibold text-slate-900">
                      <th className="py-3.5 px-4 w-28">Goal ID</th>
                      <th className="py-3.5 px-4">Strategic Objective & Description</th>
                      <th className="py-3.5 px-3">Pillar</th>
                      <th className="py-3.5 px-3">Department</th>
                      <th className="py-3.5 px-3 text-center">Target Date</th>
                      <th className="py-3.5 px-3 text-center">Progress</th>
                      <th className="py-3.5 px-3 text-right">Budget</th>
                      <th className="py-3.5 px-3">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredGoals.map((goal) => {
                      const catCfg = CATEGORY_MAP[goal.category] || { label: goal.categoryLabel, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' };
                      return (
                        <tr key={goal.id} className="hover:bg-slate-50/80 transition-colors group">
                          {/* Goal ID */}
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50/80 px-2 py-1 rounded-md border border-indigo-100">
                              {goal.id}
                            </span>
                          </td>

                          {/* Objective */}
                          <td className="py-3.5 px-4 max-w-sm">
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {goal.objective}
                            </div>
                            {goal.description && (
                              <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                {goal.description}
                              </div>
                            )}
                          </td>

                          {/* Category Badge */}
                          <td className="py-3.5 px-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${catCfg.bg} ${catCfg.color} ${catCfg.border}`}>
                              {catCfg.label}
                            </span>
                          </td>

                          {/* Department */}
                          <td className="py-3.5 px-3 font-medium text-slate-700">
                            {goal.department}
                          </td>

                          {/* Target Date */}
                          <td className="py-3.5 px-3 text-center font-mono text-[11px] text-slate-600">
                            {goal.targetDate}
                          </td>

                          {/* Progress */}
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <Progress value={goal.progress} className="w-12 h-1.5 bg-slate-100" />
                              <span className="font-mono font-bold text-[11px] text-slate-800">{goal.progress}%</span>
                            </div>
                          </td>

                          {/* Budget */}
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-700">
                            ₹ {(goal.budget / 100000).toFixed(1)} L
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3">
                            {goal.status === 'completed' || goal.progress === 100 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Completed</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                <Clock className="w-3 h-3" />
                                <span>In Progress</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setInspectingGoal(goal)}
                                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 rounded-lg"
                                title="Inspect Milestone"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>

                              {isAdminOrCoordinator && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingGoal(goal);
                                    setFormData({
                                      department: goal.department,
                                      academicYear: goal.academicYear,
                                      category: goal.category,
                                      objective: goal.objective,
                                      description: goal.description || '',
                                      targetDate: goal.targetDate,
                                      status: goal.status,
                                      progress: goal.progress,
                                      budget: goal.budget,
                                      responsible: goal.responsible || '',
                                      kpiTarget: goal.kpiTarget || ''
                                    });
                                    setShowAddModal(true);
                                  }}
                                  className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 rounded-lg"
                                  title="Edit Goal"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ======================================================================= */
            /* VIEW 3: STRATEGIC PILLAR ATTAINMENT ANALYTICS                           */
            /* ======================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {categoryAnalytics.map((cat, idx) => (
                <Card key={idx} className="border border-slate-200/80 shadow-sm bg-white rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${cat.cfg.bg} ${cat.cfg.color} ${cat.cfg.border} mb-1`}>
                        {cat.label}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{cat.label} Pillar</h3>
                    </div>
                    <span className="text-xs font-bold font-mono text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                      {cat.avgProgress}% Attainment
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-500">Progress against Vision 2030</span>
                      <span className="font-mono text-slate-800">{cat.completed} / {cat.count} Goals Delivered</span>
                    </div>
                    <Progress value={cat.avgProgress} className="h-2 bg-slate-100" />
                  </div>
                </Card>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* ========================================================================= */}
      {/* 5. ADD / EDIT STRATEGIC GOAL MODAL                                        */}
      {/* ========================================================================= */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-xl bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              <span>{editingGoal ? 'Edit Strategic Milestone' : 'Add Strategic Goal'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record departmental strategic targets, timelines, and allocated capital budgets.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveGoal} className="space-y-4 pt-2 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                Strategic Objective / Target Statement *
              </Label>
              <Input
                value={formData.objective}
                onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                placeholder="e.g. Establish High Performance AI Cluster with NVIDIA"
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Department *
                </Label>
                <Select
                  value={formData.department}
                  onValueChange={(val) => setFormData({ ...formData, department: val })}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Strategic Pillar *
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(val: any) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Select Pillar" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(CATEGORY_MAP).map(k => (
                      <SelectItem key={k} value={k}>{CATEGORY_MAP[k].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Target Date *
                </Label>
                <Input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  className="h-9 text-xs rounded-xl font-mono"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Progress (%)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Budget (INR)
                </Label>
                <Input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 2500000"
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                Responsible Faculty / PI Lead
              </Label>
              <Input
                value={formData.responsible}
                onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                placeholder="e.g. Dr. Rajesh Kumar (HOD)"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="h-9 px-4 text-xs rounded-xl border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-9 px-5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold"
              >
                Save Milestone
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 6. INSPECTION DRAWER MODAL                                                */}
      {/* ========================================================================= */}
      <Dialog open={!!inspectingGoal} onOpenChange={() => setInspectingGoal(null)}>
        <DialogContent className="max-w-lg bg-white rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-mono">
                {inspectingGoal?.id}
              </Badge>
              <Badge variant="outline" className="text-xs text-slate-500">
                {inspectingGoal?.categoryLabel}
              </Badge>
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {inspectingGoal?.objective}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {inspectingGoal?.department} • Due {inspectingGoal?.targetDate}
            </DialogDescription>
          </DialogHeader>

          {inspectingGoal && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Progress</span>
                  <span className="font-bold text-emerald-700 text-sm font-mono">{inspectingGoal.progress}% Achieved</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Budget</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">₹ {(inspectingGoal.budget / 100000).toFixed(1)} Lakhs</span>
                </div>
              </div>

              {inspectingGoal.description && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Milestone Description:</span>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {inspectingGoal.description}
                  </p>
                </div>
              )}

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Responsible Lead:</span>
                  <span className="font-semibold text-slate-900">{inspectingGoal.responsible || 'Department HOD'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Target Deliverable KPI:</span>
                  <span className="font-semibold text-slate-900">{inspectingGoal.kpiTarget || 'Deliverable achieved on schedule'}</span>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  onClick={() => setInspectingGoal(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
                >
                  Close Inspection
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Clear Goals Confirmation Dialog */}
      <Dialog open={isClearOpen} onOpenChange={setIsClearOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Clear All Strategic Goals & Milestones
            </DialogTitle>
            <DialogDescription className="py-2 text-slate-600">
              Are you sure you want to permanently delete all strategic goals and milestones data? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsClearOpen(false)}
              disabled={clearLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAll}
              disabled={clearLoading}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            >
              {clearLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{clearLoading ? 'Clearing...' : 'Confirm Clear Data'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
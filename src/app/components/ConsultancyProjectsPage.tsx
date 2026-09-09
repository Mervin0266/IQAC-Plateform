import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  DollarSign, TrendingUp, Briefcase, Plus, Upload, Pencil, Trash2,
  CheckCircle, Clock, AlertCircle, X, Building, Calendar, Search,
  Download, Eye, Filter, LayoutGrid, Table as TableIcon, BarChart3,
  ExternalLink, Sparkles, UserCheck, ChevronRight, RefreshCw
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { BulkUploadDialog } from './BulkUploadDialog';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';
import { normalizeDepartmentName } from './FacultyDetailsPage';

interface ConsultancyProjectsPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
  hideSidebar?: boolean;
  token?: string;
  userRole?: string;
}

export interface ConsultancyProject {
  id: string;
  teacherConsultant: string;
  projectName: string;
  sponsoringAgency: string;
  year: string;
  revenueInLakhs: number;
  department: string;
  status: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  creator?: { name: string; email: string; department: string };
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const YEARS = [
  '2026-2027',
  '2025-2026',
  '2024-2025',
  '2023-2024',
  '2022-2023',
  '2021-2022',
  '2020-2021'
];

const EMPTY_FORM = {
  teacherConsultant: '',
  projectName: '',
  sponsoringAgency: '',
  year: '2024-2025',
  revenueInLakhs: '',
  department: '',
  status: 'approved',
  description: ''
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  approved: { label: 'Approved', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <CheckCircle className="w-3 h-3 text-emerald-600" /> },
  finalized: { label: 'Finalized', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', icon: <CheckCircle className="w-3 h-3 text-teal-600" /> },
  submitted: { label: 'Submitted', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: <Clock className="w-3 h-3 text-blue-600" /> },
  under_coordinator_review: { label: 'Under Review', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: <AlertCircle className="w-3 h-3 text-amber-600" /> },
  draft: { label: 'Draft', color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200', icon: <Clock className="w-3 h-3 text-gray-500" /> },
  returned_for_correction: { label: 'Correction', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: <AlertCircle className="w-3 h-3 text-orange-600" /> },
  rejected: { label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: <X className="w-3 h-3 text-red-600" /> },
};

function formatStatusBadge(statusKey: string) {
  const cfg = STATUS_CONFIG[statusKey] || {
    label: statusKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    color: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: <Clock className="w-3 h-3 text-gray-500" />
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.icon}
      <span>{cfg.label}</span>
    </span>
  );
}

export function ConsultancyProjectsPage({
  onNavigate,
  isPublicView = false,
  hideSidebar = false,
  token = '',
  userRole = 'faculty'
}: ConsultancyProjectsPageProps) {
  const [projects, setProjects] = useState<ConsultancyProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtering & View State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'department'>('table');

  // Modals & Drawers
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<ConsultancyProject | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [viewingProject, setViewingProject] = useState<ConsultancyProject | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const { departmentList: dbDepts } = useAcademicHierarchy();
  const departments = useMemo(() => {
    const set = new Set<string>();
    dbDepts.forEach(d => {
      if (d) set.add(normalizeDepartmentName(d));
    });
    projects.forEach(p => {
      if (p.department) set.add(normalizeDepartmentName(p.department));
    });
    if (set.size === 0) {
      return [
        'AI and Data Science Engineering',
        'Civil Engineering',
        'Computer Science and Engineering',
        'Electrical and Electronics Engineering',
        'Electronics and Communication Engineering',
        'Mechanical and Automobile Engineering',
        'School of Architecture',
        'Sciences and Humanities (Engineering)'
      ];
    }
    return Array.from(set).sort();
  }, [dbDepts, projects]);

  const fetchProjects = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedYear !== 'all') params.append('year', selectedYear);
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const res = await fetch(`${API_BASE}/api/consultancy-projects?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProjects(data.data || []);
      } else {
        setError(data.message || 'Failed to load records');
      }
    } catch {
      setError('Connection failed. Please ensure the backend server is active.');
    } finally {
      setLoading(false);
    }
  }, [token, selectedYear, selectedDepartment, selectedStatus]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Filtered list
  const filteredProjects = useMemo(() => {
    return projects.filter(item => {
      if (selectedYear !== 'all' && item.year !== selectedYear) return false;
      if (selectedDepartment !== 'all' && item.department !== selectedDepartment) return false;
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.projectName?.toLowerCase().includes(q);
        const consultantMatch = item.teacherConsultant?.toLowerCase().includes(q);
        const agencyMatch = item.sponsoringAgency?.toLowerCase().includes(q);
        const deptMatch = item.department?.toLowerCase().includes(q);
        if (!titleMatch && !consultantMatch && !agencyMatch && !deptMatch) return false;
      }
      return true;
    });
  }, [projects, selectedYear, selectedDepartment, selectedStatus, searchQuery]);

  // Aggregate stats
  const totalRevenue = useMemo(() => {
    return filteredProjects.reduce((sum, p) => sum + Number(p.revenueInLakhs || 0), 0);
  }, [filteredProjects]);

  const uniqueConsultants = useMemo(() => {
    const set = new Set<string>();
    filteredProjects.forEach(p => {
      if (p.teacherConsultant) {
        p.teacherConsultant.split(',').forEach(name => {
          const trimmed = name.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return set.size;
  }, [filteredProjects]);

  const departmentMap = useMemo(() => {
    return filteredProjects.reduce((acc, p) => {
      const d = p.department || 'General';
      if (!acc[d]) acc[d] = { count: 0, revenue: 0 };
      acc[d].count++;
      acc[d].revenue += Number(p.revenueInLakhs || 0);
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);
  }, [filteredProjects]);

  const activeDepartmentsCount = Object.keys(departmentMap).length;
  const avgRevenuePerProject = filteredProjects.length > 0 ? (totalRevenue / filteredProjects.length) : 0;

  // Handlers
  const handleOpenForm = (project?: ConsultancyProject) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        teacherConsultant: project.teacherConsultant || '',
        projectName: project.projectName || '',
        sponsoringAgency: project.sponsoringAgency || '',
        year: project.year || '2024-2025',
        revenueInLakhs: String(project.revenueInLakhs || ''),
        department: project.department || departments[0] || '',
        status: project.status || 'approved',
        description: project.description || ''
      });
    } else {
      setEditingProject(null);
      setFormData({
        ...EMPTY_FORM,
        department: departments[0] || 'Computer Science and Engineering'
      });
    }
    setFormError('');
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacherConsultant.trim() || !formData.projectName.trim() || !formData.sponsoringAgency.trim() || !formData.year) {
      setFormError('Please fill in all required fields (Consultant, Project Title, Sponsoring Agency, and Year).');
      return;
    }

    setFormLoading(true);
    setFormError('');
    try {
      const url = editingProject
        ? `${API_BASE}/api/consultancy-projects/${editingProject.id}`
        : `${API_BASE}/api/consultancy-projects`;
      const method = editingProject ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          revenueInLakhs: parseFloat(formData.revenueInLakhs) || 0,
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        fetchProjects();
      } else {
        setFormError(data.message || 'Failed to save record.');
      }
    } catch {
      setFormError('Connection failed. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/consultancy-projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDeletingId(null);
        if (viewingProject?.id === id) setViewingProject(null);
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    if (!token) return;
    setClearLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/consultancy-projects/clear-all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setShowClearConfirm(false);
        fetchProjects();
      } else {
        setError(data.message || 'Failed to clear records.');
      }
    } catch {
      setError('Error connecting to server.');
    } finally {
      setClearLoading(false);
    }
  };

  // Export functions
  const handleExportCSV = () => {
    if (filteredProjects.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = [
      'S. No.',
      'Teacher Consultant',
      'Name of Consultancy Project',
      'Consulting / Sponsoring Agency with Contact Details',
      'Year',
      'Revenue Generated (INR in Lakhs)',
      'Department',
      'Status'
    ];

    const rows = filteredProjects.map((p, idx) => [
      idx + 1,
      `"${(p.teacherConsultant || '').replace(/"/g, '""')}"`,
      `"${(p.projectName || '').replace(/"/g, '""')}"`,
      `"${(p.sponsoringAgency || '').replace(/"/g, '""')}"`,
      `"${p.year || ''}"`,
      Number(p.revenueInLakhs || 0).toFixed(2),
      `"${(p.department || '').replace(/"/g, '""')}"`,
      `"${p.status || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `consultancy_projects_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (filteredProjects.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = [
      'S. No.',
      'Teacher Consultant',
      'Name of Consultancy Project',
      'Consulting / Sponsoring Agency with Contact Details',
      'Academic Year',
      'Revenue Generated (INR in Lakhs)',
      'Department',
      'Status'
    ];

    const rows = filteredProjects.map((p, idx) => [
      idx + 1,
      p.teacherConsultant,
      p.projectName,
      p.sponsoringAgency,
      p.year,
      Number(p.revenueInLakhs || 0),
      p.department,
      p.status
    ]);

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consultancy Projects');
    XLSX.writeFile(wb, `consultancy_projects_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const canEdit = userRole === 'admin' || userRole === 'coordinator' || userRole === 'hod' || userRole === 'faculty';
  const canDelete = userRole === 'admin' || userRole === 'coordinator';
  const canBulkUpload = userRole === 'admin' || userRole === 'coordinator' || userRole === 'hod' || userRole === 'faculty';

  // ─── PUBLIC VIEW ────────────────────────────────────────────────────────────
  if (isPublicView) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white py-14 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4 mb-2">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                <Briefcase className="w-8 h-8 text-teal-300" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Consultancy Projects & Advisory Services</h1>
                <p className="text-teal-200 text-sm mt-1">
                  Industry solutions, commercial testing, and technical advisory undertaken by faculty consultants
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-200">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Total Assignments</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{filteredProjects.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
                  <Briefcase className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-200">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">₹{totalRevenue.toFixed(2)}L</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                  <DollarSign className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-200">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Faculty Consultants</p>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">{uniqueConsultants}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700">
                  <UserCheck className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-200">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Active Depts</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{activeDepartmentsCount}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
                  <Building className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-800 text-white font-semibold">
                <tr>
                  <th className="py-3 px-4">S. No.</th>
                  <th className="py-3 px-4">Teacher Consultant</th>
                  <th className="py-3 px-4">Project Name</th>
                  <th className="py-3 px-4">Consulting / Sponsoring Agency</th>
                  <th className="py-3 px-4">Year</th>
                  <th className="py-3 px-4 text-right">Revenue (₹ Lakhs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProjects.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">{p.teacherConsultant}</td>
                    <td className="py-3 px-4 text-gray-800">{p.projectName}</td>
                    <td className="py-3 px-4 text-gray-600">{p.sponsoringAgency}</td>
                    <td className="py-3 px-4 font-mono">{p.year}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700 text-right">₹{Number(p.revenueInLakhs).toFixed(2)} Lakhs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── INTERNAL WORKSPACE VIEW ────────────────────────────────────────────────
  return (
    <div className={hideSidebar ? 'space-y-6' : 'min-h-screen bg-gray-50 flex'}>
      {!hideSidebar && <Sidebar currentPage="consultancy-projects" onNavigate={onNavigate} />}

      <main className={hideSidebar ? 'w-full p-4 sm:p-6 lg:p-8' : 'ml-64 flex-1 min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-300'}>
        <div className={hideSidebar ? 'space-y-6' : 'max-w-7xl mx-auto space-y-6'}>

          {/* Top Section Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl border border-teal-200/60 shadow-sm">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Consultancy Projects</h1>
                    <span className="bg-teal-100 text-teal-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      NIRF & NAAC 3.5
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Industry testing, professional advisory, and corporate research projects rendered by faculty
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {canDelete && projects.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearConfirm(true)}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 text-xs font-semibold shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  <span>Clear All Data</span>
                </Button>
              )}

              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportCSV}
                  className="text-xs text-gray-700 hover:bg-gray-100 px-3 py-1.5 h-8 font-medium rounded-none border-r border-gray-200"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-gray-500" />
                  <span>CSV</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportExcel}
                  className="text-xs text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 h-8 font-semibold rounded-none"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  <span>Excel (.xlsx)</span>
                </Button>
              </div>

              {canBulkUpload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkUpload(true)}
                  className="border-teal-200 text-teal-700 bg-teal-50/50 hover:bg-teal-100/70 text-xs font-semibold shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
                  <span>Bulk Upload</span>
                </Button>
              )}

              {canEdit && (
                <Button
                  size="sm"
                  onClick={() => handleOpenForm()}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  <span>Add Consultancy</span>
                </Button>
              )}
            </div>
          </div>

          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border border-teal-100 bg-gradient-to-br from-teal-50/70 to-white shadow-sm rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">Total Projects</span>
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-gray-900">{filteredProjects.length}</span>
                  <span className="text-[10px] text-teal-600 font-medium">Assignments</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Across all academic departments</p>
              </CardContent>
            </Card>

            <Card className="border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white shadow-sm rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Revenue</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-emerald-700">₹{totalRevenue.toFixed(2)}L</span>
                  <span className="text-[10px] text-emerald-600 font-medium">INR Lakhs</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Earned via external contracts</p>
              </CardContent>
            </Card>

            <Card className="border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white shadow-sm rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">Faculty Consultants</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <UserCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-gray-900">{uniqueConsultants}</span>
                  <span className="text-[10px] text-indigo-600 font-medium">Experts</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Active faculty advisors</p>
              </CardContent>
            </Card>

            <Card className="border border-purple-100 bg-gradient-to-br from-purple-50/70 to-white shadow-sm rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Active Depts</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Building className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-gray-900">{activeDepartmentsCount}</span>
                  <span className="text-[10px] text-purple-600 font-medium">of {departments.length}</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Engaged disciplines</p>
              </CardContent>
            </Card>

            <Card className="border border-amber-100 bg-gradient-to-br from-amber-50/70 to-white shadow-sm rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Avg / Project</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-gray-900">₹{avgRevenuePerProject.toFixed(2)}L</span>
                  <span className="text-[10px] text-amber-600 font-medium">Avg Outlay</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Average contract size</p>
              </CardContent>
            </Card>
          </div>

          {/* Search, Filter & View Controls */}
          <Card className="border border-gray-200/80 shadow-sm rounded-xl bg-white">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by project title, consultant, client agency..."
                    className="pl-9 h-9 text-xs border-gray-200 focus-visible:ring-teal-600"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Academic Year Filter */}
                <div className="w-[145px]">
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                      <SelectValue placeholder="Academic Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Academic Years</SelectItem>
                      {YEARS.map(y => (
                        <SelectItem key={y} value={y}>AY {y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Department Filter */}
                <div className="w-[185px]">
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="w-[130px]">
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="finalized">Finalized</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Clear Filter button */}
                {(selectedYear !== 'all' || selectedDepartment !== 'all' || selectedStatus !== 'all' || searchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedYear('all');
                      setSelectedDepartment('all');
                      setSelectedStatus('all');
                      setSearchQuery('');
                    }}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-9 px-2"
                  >
                    Reset
                  </Button>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                  title="Table View"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    viewMode === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                  title="Card View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('department')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    viewMode === 'department' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                  title="Department Analytics"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Dept Analytics</span>
                </button>
              </div>

              {/* Refresh Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchProjects}
                className="h-9 w-9 p-0 text-gray-500 hover:text-gray-900"
                title="Refresh Consultancy Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </CardContent>
          </Card>

          {/* Main Content Area */}
          {loading ? (
            <div className="py-24 text-center space-y-3 bg-white rounded-xl border border-gray-200">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700 mx-auto"></div>
              <p className="text-xs text-gray-500 font-medium">Loading consultancy records from database...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center bg-red-50 text-red-700 rounded-xl border border-red-200 space-y-2">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
              <p className="font-semibold">{error}</p>
              <Button size="sm" variant="outline" onClick={fetchProjects} className="mt-2 text-xs">
                Try Again
              </Button>
            </div>
          ) : filteredProjects.length === 0 ? (
            <Card className="border border-dashed border-gray-300 shadow-none rounded-xl p-12 text-center bg-white">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800">No Consultancy Projects Found</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-5">
                {searchQuery || selectedYear !== 'all' || selectedDepartment !== 'all' || selectedStatus !== 'all'
                  ? 'No project records matched your active filter criteria. Try resetting the filters.'
                  : 'Start by recording faculty consultancy assignments or upload bulk spreadsheets.'}
              </p>
              <div className="flex justify-center gap-3">
                {canEdit && (
                  <Button size="sm" onClick={() => handleOpenForm()} className="bg-teal-700 hover:bg-teal-800 text-white text-xs">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    <span>Add First Record</span>
                  </Button>
                )}
                {canBulkUpload && (
                  <Button size="sm" variant="outline" onClick={() => setShowBulkUpload(true)} className="text-xs">
                    <Upload className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
                    <span>Bulk Upload Spreadsheet</span>
                  </Button>
                )}
              </div>
            </Card>
          ) : viewMode === 'table' ? (
            /* TABLE VIEW */
            <Card className="border border-gray-200/80 shadow-sm rounded-xl overflow-hidden bg-white">
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-gray-200">
                    <tr className="text-gray-700 font-semibold">
                      <th className="py-3 px-3.5 w-12 text-center">#</th>
                      <th className="py-3 px-3.5 min-w-[220px]">Project Name</th>
                      <th className="py-3 px-3.5 min-w-[180px]">Teacher Consultant</th>
                      <th className="py-3 px-3.5 min-w-[200px]">Sponsoring Client / Agency</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Year</th>
                      <th className="py-3 px-3.5 text-right whitespace-nowrap font-bold text-emerald-800">Revenue (₹ Lakhs)</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Department</th>
                      <th className="py-3 px-3.5 whitespace-nowrap text-center">Status</th>
                      <th className="py-3 px-3.5 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProjects.map((project, idx) => (
                      <tr key={project.id} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="py-3 px-3.5 text-center font-mono text-gray-400">{idx + 1}</td>
                        <td className="py-3 px-3.5">
                          <button
                            onClick={() => setViewingProject(project)}
                            className="font-bold text-gray-900 hover:text-teal-700 text-left line-clamp-2 transition-colors"
                          >
                            {project.projectName}
                          </button>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                              {project.teacherConsultant?.charAt(0) || 'T'}
                            </span>
                            <span className="font-semibold text-gray-800 truncate max-w-[160px]" title={project.teacherConsultant}>
                              {project.teacherConsultant}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-gray-600 truncate max-w-[200px]" title={project.sponsoringAgency}>
                          {project.sponsoringAgency}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-gray-700 whitespace-nowrap">
                          {project.year}
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap font-mono font-bold text-emerald-700">
                          ₹{Number(project.revenueInLakhs || 0).toFixed(2)}L
                        </td>
                        <td className="py-3 px-3.5 text-gray-600 truncate max-w-[140px]" title={project.department}>
                          {project.department || '-'}
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          {formatStatusBadge(project.status)}
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingProject(project)}
                              className="h-7 w-7 p-0 text-gray-500 hover:text-teal-700"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenForm(project)}
                                className="h-7 w-7 p-0 text-gray-500 hover:text-blue-700"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingId(project.id)}
                                className="h-7 w-7 p-0 text-gray-500 hover:text-red-700"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : viewMode === 'cards' ? (
            /* CARD GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((project) => (
                <Card
                  key={project.id}
                  className="border border-gray-200/80 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all flex flex-col justify-between bg-white group"
                >
                  <CardHeader className="p-5 pb-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono text-teal-800 bg-teal-50 border-teal-200">
                        AY {project.year}
                      </Badge>
                      {formatStatusBadge(project.status)}
                    </div>
                    <CardTitle className="text-sm font-bold text-gray-900 group-hover:text-teal-700 transition-colors line-clamp-2">
                      {project.projectName}
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-600 flex items-center gap-1.5 pt-1">
                      <UserCheck className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                      <span className="font-semibold text-gray-800 truncate">{project.teacherConsultant}</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-3">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 text-xs">
                      <div className="text-[11px] text-gray-500 font-medium truncate" title={project.sponsoringAgency}>
                        <span className="font-semibold text-gray-700">Client:</span> {project.sponsoringAgency}
                      </div>
                      <div className="text-[11px] text-gray-500 truncate" title={project.department}>
                        <span className="font-semibold text-gray-700">Dept:</span> {project.department}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Contract Value</span>
                        <span className="text-base font-extrabold text-emerald-700 font-mono">
                          ₹{Number(project.revenueInLakhs || 0).toFixed(2)} Lakhs
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewingProject(project)}
                        className="text-xs text-teal-700 border-teal-200 hover:bg-teal-50 h-8"
                      >
                        Inspect
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* DEPARTMENT ANALYTICS VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Object.entries(departmentMap).map(([dept, stats]) => (
                <Card key={dept} className="border border-gray-200/80 shadow-sm rounded-xl hover:shadow-md transition-shadow bg-white">
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                        <Building className="w-4 h-4" />
                      </div>
                      <CardTitle className="text-sm font-bold text-gray-900 truncate" title={dept}>
                        {dept}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-0 space-y-3 text-xs">
                    <div className="space-y-2 border-t border-gray-100 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Consultancy Projects:</span>
                        <span className="font-bold text-gray-900 font-mono">{stats.count}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Total Revenue Generated:</span>
                        <span className="font-extrabold text-emerald-700 font-mono">₹{stats.revenue.toFixed(2)} Lakhs</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Average / Project:</span>
                        <span className="font-semibold text-gray-700 font-mono">
                          ₹{(stats.revenue / (stats.count || 1)).toFixed(2)} Lakhs
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* DIALOG: ADD/EDIT CONSULTANCY PROJECT */}
      {showForm && (
        <Dialog open={showForm} onOpenChange={(open) => !open && setShowForm(false)}>
          <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto bg-white p-6 rounded-2xl">
            <DialogHeader className="border-b border-gray-100 pb-3">
              <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-teal-700" />
                <span>{editingProject ? 'Edit Consultancy Record' : 'Add Consultancy Project'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Record contract details, client organization info, and revenue generated (NIRF Metric & NAAC 3.5).
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleFormSubmit} className="space-y-4 py-2 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Project Title / Assignment Name <span className="text-red-500">*</span></Label>
                <Input
                  required
                  placeholder="e.g. AI-Powered Smart City Infrastructure Planning"
                  className="h-9 text-xs border-gray-200 focus-visible:ring-teal-600"
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Name of Teacher Consultant(s) <span className="text-red-500">*</span></Label>
                  <Input
                    required
                    placeholder="e.g. Dr. Rajesh Kumar, Dr. Priya Sharma"
                    className="h-9 text-xs border-gray-200 focus-visible:ring-teal-600"
                    value={formData.teacherConsultant}
                    onChange={(e) => setFormData({ ...formData, teacherConsultant: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Revenue Generated (₹ in Lakhs) <span className="text-red-500">*</span></Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    placeholder="e.g. 25.00"
                    className="h-9 text-xs border-gray-200 focus-visible:ring-teal-600"
                    value={formData.revenueInLakhs}
                    onChange={(e) => setFormData({ ...formData, revenueInLakhs: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Consulting / Sponsoring Agency with Contact Details <span className="text-red-500">*</span></Label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Bangalore Smart City Corporation, Contact: info@bscc.gov.in, Ph: 080-12345678"
                  className="w-full rounded-md border border-gray-200 p-2.5 outline-none focus:border-teal-600 text-xs"
                  value={formData.sponsoringAgency}
                  onChange={(e) => setFormData({ ...formData, sponsoringAgency: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Academic Year <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.year}
                    onValueChange={(val) => setFormData({ ...formData, year: val })}
                  >
                    <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map(y => (
                        <SelectItem key={y} value={y}>AY {y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Department</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(val) => setFormData({ ...formData, department: val })}
                  >
                    <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => setFormData({ ...formData, status: val })}
                  >
                    <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="finalized">Finalized</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Scope of Work / Deliverables Summary</Label>
                <textarea
                  rows={2}
                  placeholder="Optional summary of deliverables, testing reports, or technical advisory outcomes..."
                  className="w-full rounded-md border border-gray-200 p-2.5 outline-none focus:border-teal-600 text-xs"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <DialogFooter className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm(false)}
                  disabled={formLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-teal-700 hover:bg-teal-800 text-white font-semibold"
                  disabled={formLoading}
                >
                  {formLoading ? 'Saving...' : editingProject ? 'Update Record' : 'Save Consultancy'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* DRAWER: VIEW DETAILS SHEET */}
      {viewingProject && (
        <Dialog open={!!viewingProject} onOpenChange={(open) => !open && setViewingProject(null)}>
          <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto bg-white p-6 rounded-2xl">
            <DialogHeader className="border-b border-gray-100 pb-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-xs font-mono text-teal-800 bg-teal-50 border-teal-200">
                  AY {viewingProject.year}
                </Badge>
                {formatStatusBadge(viewingProject.status)}
              </div>
              <DialogTitle className="text-lg font-bold text-gray-900 mt-2">
                {viewingProject.projectName}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                NIRF Consultancy & Corporate Advisory Project Detail Sheet
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs text-gray-700">
              <div className="grid grid-cols-2 gap-4 bg-teal-50/50 p-4 rounded-xl border border-teal-100">
                <div>
                  <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">Revenue (INR)</span>
                  <p className="text-xl font-extrabold text-emerald-700 font-mono mt-0.5">
                    ₹{Number(viewingProject.revenueInLakhs || 0).toFixed(2)} Lakhs
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">Academic Department</span>
                  <p className="font-semibold text-gray-900 mt-0.5">{viewingProject.department || 'N/A'}</p>
                </div>
              </div>

              <div className="space-y-1 border-t border-gray-100 pt-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Teacher Consultant(s)</span>
                <p className="font-semibold text-gray-900 text-sm">{viewingProject.teacherConsultant}</p>
              </div>

              <div className="space-y-1 border-t border-gray-100 pt-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Consulting / Sponsoring Agency & Contact Info</span>
                <p className="font-medium text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200 leading-relaxed">
                  {viewingProject.sponsoringAgency}
                </p>
              </div>

              {viewingProject.description && (
                <div className="space-y-1 border-t border-gray-100 pt-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Deliverables & Scope Description</span>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200 leading-relaxed">
                    {viewingProject.description}
                  </p>
                </div>
              )}

              {viewingProject.creator && (
                <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-[11px] text-gray-500">
                  <span>Submitted by: <strong>{viewingProject.creator.name}</strong> ({viewingProject.creator.department})</span>
                  <span>{viewingProject.createdAt ? new Date(viewingProject.createdAt).toLocaleDateString() : ''}</span>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 border-t border-gray-100 flex justify-between items-center sm:justify-between">
              {canDelete ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const id = viewingProject.id;
                    setViewingProject(null);
                    setDeletingId(id);
                  }}
                  className="text-xs text-red-600 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>
              ) : <div></div>}

              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const p = viewingProject;
                      setViewingProject(null);
                      handleOpenForm(p);
                    }}
                    className="text-xs text-blue-700 border-blue-200"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setViewingProject(null)}
                  className="bg-gray-800 text-white hover:bg-gray-900 text-xs"
                >
                  Close Sheet
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {deletingId && (
        <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
          <DialogContent className="sm:max-w-[420px] bg-white p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>Confirm Deletion</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-600 mt-2">
                Are you sure you want to delete this consultancy project record? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeletingId(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => deletingId && handleDelete(deletingId)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Delete Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CONFIRM CLEAR ALL DIALOG */}
      {showClearConfirm && (
        <Dialog open={showClearConfirm} onOpenChange={(open) => !open && setShowClearConfirm(false)}>
          <DialogContent className="sm:max-w-[440px] bg-white p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>Clear All Consultancy Records</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-600 mt-2 leading-relaxed">
                This will permanently delete all {projects.length} consultancy projects from the platform. Are you sure you want to proceed?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowClearConfirm(false)} disabled={clearLoading} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleClearAll}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                disabled={clearLoading}
              >
                {clearLoading ? 'Clearing...' : 'Yes, Delete All'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* BULK CSV / EXCEL UPLOAD DIALOG */}
      {showBulkUpload && (
        <BulkUploadDialog
          isOpen={showBulkUpload}
          onClose={() => setShowBulkUpload(false)}
          token={token}
          onSuccess={() => {
            fetchProjects();
          }}
          uploadType="consultancy"
        />
      )}
    </div>
  );
}
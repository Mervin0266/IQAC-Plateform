import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Building2, Search, Plus, Filter, Eye, Edit, Trash2, X, 
  Download, Mail, Phone, RefreshCw, Upload, Calendar, 
  AlertCircle, CheckCircle2, Award, Users, GraduationCap,
  Sparkles, FileSpreadsheet, LayoutGrid, Table as TableIcon,
  BarChart3, RotateCcw, ArrowUpRight, ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { BulkUploadDialog } from './BulkUploadDialog';

interface Department {
  id: string;
  code: string;
  name: string;
  hodName: string;
  hodEmail: string;
  establishedYear: number | null;
  phone: string;
  description: string;
  status: 'Active' | 'Inactive';
}

interface DepartmentDetailsPageProps {
  onNavigate: (page: string) => void;
  hideSidebar?: boolean;
}

const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: 'dept-1',
    code: 'ADSE',
    name: 'AI and Data Science Engineering',
    hodName: 'Dr. Rajesh Kumar',
    hodEmail: 'rajesh.kumar@christuniversity.in',
    establishedYear: 2021,
    phone: '+91 80 4012 9100',
    description: 'Pioneering multidisciplinary artificial intelligence, machine learning, and big data engineering.',
    status: 'Active'
  },
  {
    id: 'dept-2',
    code: 'CSE',
    name: 'Computer Science and Engineering',
    hodName: 'Dr. Priya Sharma',
    hodEmail: 'priya.sharma@christuniversity.in',
    establishedYear: 2010,
    phone: '+91 80 4012 9101',
    description: 'Flagship department offering undergraduate, postgraduate, and doctoral computer science programs.',
    status: 'Active'
  },
  {
    id: 'dept-3',
    code: 'ECE',
    name: 'Electronics and Communication Engineering',
    hodName: 'Dr. Deepa Singh',
    hodEmail: 'deepa.singh@christuniversity.in',
    establishedYear: 2010,
    phone: '+91 80 4012 9102',
    description: 'Advanced communications, 5G/6G millimeter wave antennas, and embedded VLSI systems.',
    status: 'Active'
  },
  {
    id: 'dept-4',
    code: 'CIVIL',
    name: 'Civil Engineering',
    hodName: 'Dr. Suresh Rao',
    hodEmail: 'suresh.rao@christuniversity.in',
    establishedYear: 2010,
    phone: '+91 80 4012 9103',
    description: 'Sustainable infrastructure, geopolymer materials, and smart urban construction technology.',
    status: 'Active'
  },
  {
    id: 'dept-5',
    code: 'EEE',
    name: 'Electrical and Electronics Engineering',
    hodName: 'Dr. Lakshmi Prasad',
    hodEmail: 'lakshmi.prasad@christuniversity.in',
    establishedYear: 2010,
    phone: '+91 80 4012 9104',
    description: 'Renewable power grids, EV drive power electronics, and battery storage research.',
    status: 'Active'
  },
  {
    id: 'dept-6',
    code: 'MECH',
    name: 'Mechanical and Automobile Engineering',
    hodName: 'Dr. Karthik Iyer',
    hodEmail: 'karthik.iyer@christuniversity.in',
    establishedYear: 2010,
    phone: '+91 80 4012 9105',
    description: 'Robotics, additive manufacturing, aerospace composites, and autonomous vehicular technology.',
    status: 'Active'
  },
  {
    id: 'dept-7',
    code: 'S&H',
    name: 'Sciences and Humanities (Engineering)',
    hodName: 'Dr. Arun Menon',
    hodEmail: 'arun.menon@christuniversity.in',
    establishedYear: 2010,
    phone: '+91 80 4012 9106',
    description: 'Applied mathematics, physics, chemistry, and professional communication foundational studies.',
    status: 'Active'
  }
];

export function DepartmentDetailsPage({ onNavigate, hideSidebar = false }: DepartmentDetailsPageProps) {
  const { user } = useAuth();
  const isAdminOrCoordinator = user?.role === 'admin' || user?.role === 'coordinator' || user?.role === 'hod';

  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'analytics'>('table');

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [viewingDept, setViewingDept] = useState<Department | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    hodName: '',
    hodEmail: '',
    establishedYear: 2024,
    phone: '',
    description: '',
    status: 'Active' as 'Active' | 'Inactive'
  });

  // Fetch departments from API if available
  const fetchDepartments = async () => {
    if (!user?.token) return;
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/departments`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        setDepartments(data.data);
      }
    } catch (err) {
      console.error('Fetch departments error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [user]);

  // Filtered Departments
  const filteredDepartments = useMemo(() => {
    return departments.filter(d => {
      if (statusFilter !== 'All' && d.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q);
        const matchesHod = (d.hodName || '').toLowerCase().includes(q);
        const matchesDesc = (d.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesHod && !matchesDesc) return false;
      }
      return true;
    });
  }, [departments, statusFilter, searchQuery]);

  // KPI Statistics
  const kpiStats = useMemo(() => {
    const total = departments.length;
    const active = departments.filter(d => d.status === 'Active').length;
    const withHod = departments.filter(d => d.hodName && d.hodName !== 'NIL').length;
    const totalCoursesEst = total * 4;

    return {
      total,
      active,
      withHod,
      totalCoursesEst,
      activeRate: total > 0 ? Math.round((active / total) * 100) : 100
    };
  }, [departments]);

  // Save / Edit Department
  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) return;

    if (editingDept) {
      setDepartments(prev =>
        prev.map(d => (d.id === editingDept.id ? { ...d, ...formData } : d))
      );
    } else {
      const newD: Department = {
        id: `dept-${Date.now()}`,
        ...formData
      };
      setDepartments([...departments, newD]);
    }

    setIsAddModalOpen(false);
    setEditingDept(null);
  };

  // Delete Department
  const handleDeleteDepartment = (id: string) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
    setDeletingId(null);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredDepartments.map((d, i) => ({
      'Sl. No': i + 1,
      'Department Code': d.code,
      'Department Name': d.name,
      'Head of Department (HOD)': d.hodName || 'N/A',
      'HOD Email': d.hodEmail || 'N/A',
      'Established Year': d.establishedYear || 'N/A',
      'Contact Phone': d.phone || 'N/A',
      'Status': d.status,
      'Description': d.description || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Academic Departments');
    XLSX.writeFile(wb, `CHRIST_Department_Directory_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Code', 'Name', 'HOD Name', 'HOD Email', 'Established', 'Phone', 'Status'];
    const rows = filteredDepartments.map(d => [
      `"${d.code}"`,
      `"${d.name.replace(/"/g, '""')}"`,
      `"${(d.hodName || '').replace(/"/g, '""')}"`,
      `"${d.hodEmail || ''}"`,
      `"${d.establishedYear || ''}"`,
      `"${d.phone || ''}"`,
      `"${d.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CHRIST_Departments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {!hideSidebar && <Sidebar currentPage="department-details" onNavigate={onNavigate} />}

      <main className={hideSidebar ? 'p-4 sm:p-6 lg:p-8 w-full' : 'ml-64 flex-1 min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-300'}>
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ========================================================================= */}
          {/* 1. MASTER HEADER & ACTION BAR                                             */}
          {/* ========================================================================= */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
                  Academic Structure & Governance
                </Badge>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">Faculty Schools & Department Lineage</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Academic Department Directory
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Comprehensive directory of institutional engineering departments, appointed HODs, established milestones, and program lineages.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
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

              {/* Bulk Upload Button */}
              {isAdminOrCoordinator && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkUploadOpen(true)}
                  className="h-9 px-3.5 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Upload className="w-4 h-4 text-slate-600" />
                  <span>Bulk Upload</span>
                </Button>
              )}

              {/* Add Department Button */}
              {isAdminOrCoordinator && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingDept(null);
                    setFormData({
                      code: '',
                      name: '',
                      hodName: '',
                      hodEmail: '',
                      establishedYear: 2024,
                      phone: '',
                      description: '',
                      status: 'Active'
                    });
                    setIsAddModalOpen(true);
                  }}
                  className="h-9 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Department</span>
                </Button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. 5 KPI METRIC CARDS                                                     */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Total Departments */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Departments</span>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {kpiStats.total} Units
                  </div>
                  <div className="text-[11px] text-blue-700 font-medium mt-1">
                    School of Engineering
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Active Operational */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operational Status</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-emerald-600 tracking-tight">
                    {kpiStats.active} Active
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">
                    {kpiStats.activeRate}% Operational
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Appointed HODs */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department Heads</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {kpiStats.withHod} HODs
                  </div>
                  <div className="text-[11px] text-indigo-700 font-medium mt-1">
                    Appointed Department Chairs
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Degree Programs */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Degree Programs</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    27 Courses
                  </div>
                  <div className="text-[11px] text-purple-700 font-medium mt-1">
                    UG, PG & Doctoral Programs
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 5: Campus Hub */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Campus Location</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    Kengeri
                  </div>
                  <div className="text-[11px] text-amber-700 font-medium mt-1">
                    Bangalore, Karnataka
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* 3. TOOLBAR & VIEW MODE SWITCHER                                           */}
          {/* ========================================================================= */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search department code, title, HOD name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 h-10 text-xs bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl focus:ring-blue-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* View Switcher & Status Filter */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-xl min-w-[140px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Active">Active Only</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Pills */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'table'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Table</span>
                  </button>

                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'cards'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Cards</span>
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
                    <span>Analytics</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. VIEW CONTENT AREA                                                      */}
          {/* ========================================================================= */}
          {filteredDepartments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No departments match your search</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try resetting search queries or choosing 'All Statuses'.
              </p>
              <Button size="sm" variant="outline" onClick={() => { setSearchQuery(''); setStatusFilter('All'); }} className="rounded-xl">
                Reset Filters
              </Button>
            </div>
          ) : viewMode === 'table' ? (
            /* ======================================================================= */
            /* VIEW 1: TABLE VIEW                                                      */
            /* ======================================================================= */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200/80 font-semibold text-slate-900">
                      <th className="py-3.5 px-4 w-28">Code</th>
                      <th className="py-3.5 px-4">Department Title & Focus</th>
                      <th className="py-3.5 px-4">Head of Department (HOD)</th>
                      <th className="py-3.5 px-3 text-center">Established</th>
                      <th className="py-3.5 px-3 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDepartments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Code */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-md border border-blue-100">
                            {dept.code}
                          </span>
                        </td>

                        {/* Name & Desc */}
                        <td className="py-3.5 px-4 max-w-sm">
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm">
                            {dept.name}
                          </div>
                          {dept.description && (
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                              {dept.description}
                            </div>
                          )}
                        </td>

                        {/* HOD Info */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>{dept.hodName || 'Not Appointed'}</span>
                          </div>
                          {dept.hodEmail && (
                            <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                              {dept.hodEmail}
                            </div>
                          )}
                        </td>

                        {/* Established Year */}
                        <td className="py-3.5 px-3 text-center font-mono font-medium text-slate-600">
                          {dept.establishedYear || '-'}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 text-center">
                          {dept.status === 'Active' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                              <AlertCircle className="w-3 h-3" />
                              <span>Inactive</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingDept(dept)}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 rounded-lg"
                              title="Inspect Department"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {isAdminOrCoordinator && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingDept(dept);
                                  setFormData({
                                    code: dept.code,
                                    name: dept.name,
                                    hodName: dept.hodName || '',
                                    hodEmail: dept.hodEmail || '',
                                    establishedYear: dept.establishedYear || 2024,
                                    phone: dept.phone || '',
                                    description: dept.description || '',
                                    status: dept.status
                                  });
                                  setIsAddModalOpen(true);
                                }}
                                className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 rounded-lg"
                                title="Edit Department"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}

                            {isAdminOrCoordinator && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingId(dept.id)}
                                className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 rounded-lg"
                                title="Delete Department"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : viewMode === 'cards' ? (
            /* ======================================================================= */
            /* VIEW 2: CARDS GRID VIEW                                                 */
            /* ======================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDepartments.map((dept) => (
                <Card
                  key={dept.id}
                  className="border border-slate-200/80 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl overflow-hidden flex flex-col justify-between group"
                >
                  <CardHeader className="pb-3 bg-slate-50/40 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-mono font-bold text-[10px] mb-1">
                          {dept.code}
                        </Badge>
                        <CardTitle className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                          {dept.name}
                        </CardTitle>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Est. {dept.establishedYear}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-3 flex-1 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Department Head</span>
                      <div className="font-bold text-slate-800">{dept.hodName || 'Not Assigned'}</div>
                      {dept.hodEmail && (
                        <div className="text-[11px] text-slate-500 font-mono">{dept.hodEmail}</div>
                      )}
                    </div>

                    <p className="text-slate-600 line-clamp-2 leading-relaxed text-[11px]">
                      {dept.description || 'No specialized description provided.'}
                    </p>
                  </CardContent>

                  <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingDept(dept)}
                      className="h-7 text-xs text-blue-600 hover:text-blue-800 font-semibold p-0 flex items-center gap-1"
                    >
                      <span>View Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            /* ======================================================================= */
            /* VIEW 3: DEPARTMENT ANALYTICS VIEW                                       */
            /* ======================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {departments.map((dept) => (
                <Card key={dept.id} className="border border-slate-200/80 shadow-sm bg-white rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-bold font-mono text-blue-600">{dept.code}</span>
                      <h3 className="text-base font-bold text-slate-900">{dept.name}</h3>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                      {dept.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                      <span className="text-[10px] font-bold text-blue-600 uppercase block">Programs</span>
                      <span className="font-bold text-blue-900 text-sm">4 Courses</span>
                    </div>
                    <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase block">Established</span>
                      <span className="font-bold text-indigo-900 font-mono text-sm">{dept.establishedYear}</span>
                    </div>
                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase block">Faculty Count</span>
                      <span className="font-bold text-emerald-900 text-sm">26 Active</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* ========================================================================= */}
      {/* 5. ADD / EDIT DEPARTMENT MODAL DIALOG                                     */}
      {/* ========================================================================= */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-xl bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span>{editingDept ? 'Edit Department Profile' : 'Register New Department'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configure official department code, name, HOD details, and contact coordinates.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDepartment} className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">Code *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. ADSE"
                  className="h-9 text-xs rounded-xl font-mono uppercase"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">Department Full Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. AI and Data Science Engineering"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">Head of Department (HOD) *</Label>
                <Input
                  value={formData.hodName}
                  onChange={(e) => setFormData({ ...formData, hodName: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">HOD Email *</Label>
                <Input
                  type="email"
                  value={formData.hodEmail}
                  onChange={(e) => setFormData({ ...formData, hodEmail: e.target.value })}
                  placeholder="e.g. hod.adse@christuniversity.in"
                  className="h-9 text-xs rounded-xl font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">Established Year</Label>
                <Input
                  type="number"
                  value={formData.establishedYear}
                  onChange={(e) => setFormData({ ...formData, establishedYear: parseInt(e.target.value) || 2024 })}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">Contact Phone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 80 4012 9100"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1 block">Department Overview / Description</Label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide department vision, thrust areas, and specialized laboratories..."
                className="w-full p-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="h-9 px-4 text-xs rounded-xl border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-9 px-5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
              >
                {editingDept ? 'Update Department' : 'Save Department'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 6. INSPECTION DRAWER MODAL                                                */}
      {/* ========================================================================= */}
      <Dialog open={!!viewingDept} onOpenChange={() => setViewingDept(null)}>
        <DialogContent className="max-w-lg bg-white rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-xs">
                {viewingDept?.code}
              </Badge>
              <span className="text-xs text-slate-500 font-medium">Est. {viewingDept?.establishedYear}</span>
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {viewingDept?.name}
            </DialogTitle>
          </DialogHeader>

          {viewingDept && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">HOD Name</span>
                  <span className="font-bold text-slate-900">{viewingDept.hodName || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">HOD Email</span>
                  <span className="font-mono text-slate-800 text-[11px]">{viewingDept.hodEmail || 'N/A'}</span>
                </div>
              </div>

              {viewingDept.description && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Description:</span>
                  <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px]">
                    {viewingDept.description}
                  </p>
                </div>
              )}

              <div className="flex justify-between py-1 border-t border-slate-100 pt-3">
                <span className="text-slate-500">Phone:</span>
                <span className="font-mono text-slate-800">{viewingDept.phone || 'N/A'}</span>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  onClick={() => setViewingDept(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
                >
                  Close Inspection
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 7. DELETE CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              <span>Confirm Department Deletion</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-2">
              Are you sure you want to permanently delete this academic department? This action will impact course mappings and departmental analytics.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingId(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => deletingId && handleDeleteDepartment(deletingId)}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
            >
              Delete Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        token={user?.token || ''}
        onSuccess={fetchDepartments}
        uploadType="departments"
      />
    </div>
  );
}

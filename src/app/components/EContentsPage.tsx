import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent } from './ui/card';
import {
  Video, Globe, Users, Calendar, Building2, CheckCircle2,
  Plus, Search, Trash2, Edit, Eye, Download, AlertCircle, Upload, X,
  ExternalLink, Layers, RefreshCw, FileSpreadsheet, PlayCircle, BookOpen
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { useAuth } from '../contexts/AuthContext';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';
import { normalizeDepartmentName } from './FacultyDetailsPage';
import { AppShell, PageHeader, StatCard } from './design-system';
import { BulkUploadDialog } from './BulkUploadDialog';

export interface EContentItem {
  id: string;
  facultyId?: string | null;
  employeeId: string;
  normalizedEmployeeId: string;
  facultyName?: string | null;
  designation?: string | null;
  department?: string | null;
  originalDepartment?: string | null;
  currentDepartment?: string | null;
  departmentTransferred?: boolean;
  school?: string | null;
  campus?: string | null;
  title: string;
  eContentPlatform: string;
  publicationDate: string;
  url: string;
  contentType: string;
  proofUrl?: string | null;
  calendarYear: number;
  customFields?: Record<string, any>;
  createdBy?: string | null;
  createdAt?: string;
  faculty?: {
    id: string;
    employeeId: string;
    name: string;
    designation?: string;
    department?: string;
    email?: string;
  };
}

export interface EContentStats {
  totalEContents: number;
  yearWise: Record<string, number>;
  departmentWise: Record<string, number>;
  platformWise: Record<string, number>;
  contentTypeWise: Record<string, number>;
  activeDepartmentsCount: number;
}

interface EContentsPageProps {
  onNavigate: (page: string) => void;
  hideSidebar?: boolean;
  token?: string;
  userRole?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DEFAULT_STATS: EContentStats = {
  totalEContents: 0,
  yearWise: {},
  departmentWise: {},
  platformWise: {},
  contentTypeWise: {},
  activeDepartmentsCount: 0
};

export function EContentsPage({ onNavigate, hideSidebar = false, token: propToken, userRole }: EContentsPageProps) {
  const { user } = useAuth();
  const token = propToken || user?.token || localStorage.getItem('token') || '';

  // Data & KPI states
  const [econtents, setEcontents] = useState<EContentItem[]>([]);
  const [stats, setStats] = useState<EContentStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState<boolean>(true);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [contentTypes, setContentTypes] = useState<string[]>([]);

  // Filtering states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedContentType, setSelectedContentType] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Available years: persistent 16-year range + DB years
  const [availableYears, setAvailableYears] = useState<number[]>(() => {
    const cur = new Date().getFullYear();
    const yrs: number[] = [];
    for (let y = cur + 1; y >= cur - 15; y--) yrs.push(y);
    return yrs;
  });

  // Hierarchy departments
  const { departmentList } = useAcademicHierarchy();
  const departments = useMemo(() => {
    const set = new Set<string>();
    departmentList.forEach(d => {
      if (d) set.add(normalizeDepartmentName(d));
    });
    return Array.from(set).sort();
  }, [departmentList]);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<EContentItem | null>(null);
  const [viewingItem, setViewingItem] = useState<EContentItem | null>(null);
  const [isBulkOpen, setIsBulkOpen] = useState<boolean>(false);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Single-entry form states
  const [formFacultyQuery, setFormFacultyQuery] = useState<string>('');
  const [facultyOptions, setFacultyOptions] = useState<any[]>([]);
  const [facultySearching, setFacultySearching] = useState<boolean>(false);
  const [selectedFaculty, setSelectedFaculty] = useState<any | null>(null);

  const [formTitle, setFormTitle] = useState<string>('');
  const [formPlatform, setFormPlatform] = useState<string>('');
  const [formPublicationDate, setFormPublicationDate] = useState<string>('');
  const [formUrl, setFormUrl] = useState<string>('');
  const [formContentType, setFormContentType] = useState<string>('');
  const [formProofUrl, setFormProofUrl] = useState<string>('');

  // Automatically derived year for single-entry form
  const derivedFormYear = useMemo(() => {
    if (!formPublicationDate) return null;
    const match = formPublicationDate.match(/^(\d{4})/);
    return match ? parseInt(match[1], 10) : new Date(formPublicationDate).getFullYear() || null;
  }, [formPublicationDate]);

  // Fetch approved Dropdown Options
  const fetchDropdownOptions = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/e-contents/dropdown-options`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.platforms)) setPlatforms(data.platforms);
        if (Array.isArray(data.contentTypes)) setContentTypes(data.contentTypes);
      }
    } catch (_) {}
  }, [token]);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (selectedYear !== 'all') params.append('calendarYear', selectedYear);
      if (selectedDept !== 'all') params.append('department', selectedDept);

      const res = await fetch(`${API_BASE}/api/e-contents/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Fetch e-content stats error:', err);
    }
  }, [token, selectedYear, selectedDept]);

  // Fetch E-Contents
  const fetchEContents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '50');
      if (selectedYear !== 'all') params.append('calendarYear', selectedYear);
      if (selectedDept !== 'all') params.append('department', selectedDept);
      if (selectedPlatform !== 'all') params.append('platform', selectedPlatform);
      if (selectedContentType !== 'all') params.append('contentType', selectedContentType);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`${API_BASE}/api/e-contents?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const list: EContentItem[] = data.rows || [];
        setEcontents(list);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);

        setAvailableYears(prev => {
          const set = new Set<number>(prev);
          const cur = new Date().getFullYear();
          for (let y = cur + 1; y >= cur - 15; y--) set.add(y);
          list.forEach(item => {
            if (item.calendarYear) set.add(Number(item.calendarYear));
          });
          return Array.from(set).sort((a, b) => b - a);
        });
      }
    } catch (err) {
      console.error('Fetch e-contents error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, page, selectedYear, selectedDept, selectedPlatform, selectedContentType, searchQuery]);

  useEffect(() => {
    fetchDropdownOptions();
  }, [fetchDropdownOptions]);

  useEffect(() => {
    fetchEContents();
  }, [fetchEContents]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setPage(1);
  }, [selectedYear, selectedDept, selectedPlatform, selectedContentType, searchQuery]);

  // Faculty Directory Search for single-entry modal
  useEffect(() => {
    if (!isFormOpen || !token || !formFacultyQuery.trim()) {
      setFacultyOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setFacultySearching(true);
      try {
        const res = await fetch(`${API_BASE}/api/awards/faculty-search?q=${encodeURIComponent(formFacultyQuery.trim())}&limit=20`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setFacultyOptions(data.data);
        }
      } catch (_) {
      } finally {
        setFacultySearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [isFormOpen, formFacultyQuery, token]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingItem(null);
    setSelectedFaculty(null);
    setFormFacultyQuery('');
    setFormTitle('');
    setFormPlatform(platforms[0] || 'SWAYAM / NPTEL');
    setFormPublicationDate('');
    setFormUrl('');
    setFormContentType(contentTypes[0] || 'Complete MOOC Course (4 Quadrants)');
    setFormProofUrl('');
    setFormError('');
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: EContentItem) => {
    setEditingItem(item);
    setSelectedFaculty({
      employeeId: item.employeeId,
      name: item.facultyName || item.faculty?.name,
      designation: item.designation || item.faculty?.designation,
      department: item.department || item.faculty?.department,
      school: item.school,
      campus: item.campus
    });
    setFormFacultyQuery(item.employeeId);
    setFormTitle(item.title);
    setFormPlatform(item.eContentPlatform);
    setFormPublicationDate(item.publicationDate);
    setFormUrl(item.url);
    setFormContentType(item.contentType);
    setFormProofUrl(item.proofUrl || '');
    setFormError('');
    setIsFormOpen(true);
  };

  // Submit Single Add/Edit
  const handleSaveEContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty || !selectedFaculty.employeeId) {
      setFormError('Please search and select exactly one valid faculty member.');
      return;
    }
    if (!formTitle.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!formPlatform.trim()) {
      setFormError('E-Content Platform is required.');
      return;
    }
    if (!formPublicationDate) {
      setFormError('Publication Date is required.');
      return;
    }
    if (!formContentType.trim()) {
      setFormError('Content Type is required.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const payload = {
        employeeId: selectedFaculty.employeeId,
        title: formTitle.trim(),
        eContentPlatform: formPlatform.trim(),
        publicationDate: formPublicationDate,
        url: formUrl.trim() || null,
        contentType: formContentType.trim(),
        proofUrl: formProofUrl.trim() || null
      };

      const url = editingItem
        ? `${API_BASE}/api/e-contents/${editingItem.id}`
        : `${API_BASE}/api/e-contents`;
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to save e-content record.');
      }

      setIsFormOpen(false);
      fetchEContents();
      fetchStats();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving the e-content.');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete E-Content
  const handleDeleteEContent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this e-content record? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/e-contents/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchEContents();
        fetchStats();
      } else {
        alert(data.message || 'Failed to delete e-content.');
      }
    } catch (err) {
      alert('Error communicating with server while deleting e-content.');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (econtents.length === 0) {
      alert('No e-content records to export.');
      return;
    }
    const headers = [
      'EmpID',
      'Faculty Name',
      'Designation',
      'Department',
      'Title',
      'E-Content Platform',
      'Publication Date',
      'Calendar Year',
      'Content Type',
      'Published URL',
      'Proof URL'
    ];
    const rows = econtents.map(item => [
      item.employeeId,
      item.facultyName || item.faculty?.name || '',
      item.designation || item.faculty?.designation || '',
      item.department || '',
      item.title,
      item.eContentPlatform,
      item.publicationDate,
      item.calendarYear,
      item.contentType,
      item.url,
      item.proofUrl || ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'E_Contents');
    XLSX.writeFile(wb, `CHRIST_EContents_Export_${selectedYear !== 'all' ? selectedYear : 'All_Years'}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (econtents.length === 0) {
      alert('No e-content records to export.');
      return;
    }
    const headers = [
      'EmpID',
      'Faculty Name',
      'Designation',
      'Department',
      'Title',
      'E-Content Platform',
      'Publication Date',
      'Calendar Year',
      'Content Type',
      'Published URL',
      'Proof URL'
    ];
    let csv = headers.join(',') + '\n';
    econtents.forEach(item => {
      const row = [
        `"${item.employeeId}"`,
        `"${item.facultyName || item.faculty?.name || ''}"`,
        `"${item.designation || item.faculty?.designation || ''}"`,
        `"${item.department || ''}"`,
        `"${(item.title || '').replace(/"/g, '""')}"`,
        `"${item.eContentPlatform}"`,
        `"${item.publicationDate}"`,
        `"${item.calendarYear}"`,
        `"${item.contentType}"`,
        `"${item.url || ''}"`,
        `"${item.proofUrl || ''}"`
      ];
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CHRIST_EContents_Export_${selectedYear !== 'all' ? selectedYear : 'All_Years'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell currentPage="e-contents" onNavigate={onNavigate} hideSidebar={hideSidebar}>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="E-Contents & Courseware"
          description="Institutional repository of digital learning materials, MOOCs, video lectures, and e-course modules"
          badge="Achievements"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={fetchEContents}
                variant="outline"
                size="sm"
                className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold h-9 px-3 rounded-xl shadow-2xs"
                title="Refresh Records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>

              <Button
                onClick={handleExportExcel}
                variant="outline"
                size="sm"
                className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold h-9 px-3 rounded-xl shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Export Excel</span>
              </Button>

              <Button
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold h-9 px-3 rounded-xl shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>

              <Button
                onClick={() => setIsBulkOpen(true)}
                variant="outline"
                size="sm"
                className="border-[#2855B9]/30 text-[#2855B9] bg-blue-50/50 hover:bg-blue-50 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5 mr-1 text-[#2855B9]" />
                <span>Bulk Upload</span>
              </Button>

              <Button
                onClick={handleOpenAdd}
                size="sm"
                className="bg-[#2855B9] hover:bg-[#1C355B] text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs"
              >
                <Plus className="w-4 h-4 mr-1" />
                <span>Add E-Content</span>
              </Button>
            </div>
          }
        />

        {/* Dashboard KPI Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total E-Contents"
            value={stats.totalEContents}
            badge="Digital Learning"
            subtitle={`${stats.activeDepartmentsCount} active departments`}
            icon={Video}
          />
          <StatCard
            title="Current Year Published"
            value={stats.yearWise[new Date().getFullYear()] || 0}
            badge={String(new Date().getFullYear())}
            subtitle="Derived publication calendar year"
            icon={Calendar}
          />
          <StatCard
            title="Active Platforms"
            value={Object.keys(stats.platformWise).length}
            badge="Platforms"
            subtitle="SWAYAM, Coursera, YouTube, etc."
            icon={Globe}
          />
          <StatCard
            title="Top Content Type"
            value={Object.values(stats.contentTypeWise)[0] || 0}
            badge={Object.keys(stats.contentTypeWise)[0] ? `${Object.keys(stats.contentTypeWise)[0].slice(0, 16)}...` : 'None'}
            subtitle="Most common content format"
            icon={BookOpen}
          />
        </div>

        {/* Filter and Search Bar */}
        <Card className="border border-slate-200 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search title, platform, content type, faculty name, EmpID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl border-slate-200"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Year Filter */}
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[130px] h-9 text-xs rounded-xl border-slate-200">
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">All Years</SelectItem>
                    {availableYears.map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Department Filter */}
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger className="w-[170px] h-9 text-xs rounded-xl border-slate-200 truncate">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Platform Filter */}
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger className="w-[160px] h-9 text-xs rounded-xl border-slate-200 truncate">
                    <SelectValue placeholder="All Platforms" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">All Platforms</SelectItem>
                    {platforms.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Content Type Filter */}
                <Select value={selectedContentType} onValueChange={setSelectedContentType}>
                  <SelectTrigger className="w-[160px] h-9 text-xs rounded-xl border-slate-200 truncate">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">All Types</SelectItem>
                    {contentTypes.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(searchQuery || selectedYear !== 'all' || selectedDept !== 'all' || selectedPlatform !== 'all' || selectedContentType !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedYear('all');
                      setSelectedDept('all');
                      setSelectedPlatform('all');
                      setSelectedContentType('all');
                    }}
                    className="h-9 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    <span>Clear All</span>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card className="border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1C355B] text-white font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-3.5 text-center w-12">#</th>
                  <th className="py-3 px-3.5 min-w-[150px]">Faculty Member (EmpID)</th>
                  <th className="py-3 px-3.5 min-w-[240px]">Title</th>
                  <th className="py-3 px-3.5 min-w-[150px]">Platform</th>
                  <th className="py-3 px-3.5 min-w-[120px]">Publication Date</th>
                  <th className="py-3 px-3.5 text-center min-w-[70px]">Year</th>
                  <th className="py-3 px-3.5 min-w-[160px]">Content Type</th>
                  <th className="py-3 px-3.5 min-w-[160px]">Department</th>
                  <th className="py-3 px-3.5 min-w-[110px]">Published URL</th>
                  <th className="py-3 px-3.5 text-right pr-4 min-w-[110px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#2855B9]" />
                      <span>Loading e-content records...</span>
                    </td>
                  </tr>
                ) : econtents.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <Video className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-700 text-sm">No e-content records found</p>
                      <p className="text-xs text-slate-500 mt-0.5">Try adjusting your filters or upload new e-content records.</p>
                    </td>
                  </tr>
                ) : (
                  econtents.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 text-center font-mono text-slate-400 text-[11px]">
                        {(page - 1) * 50 + index + 1}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-900 truncate max-w-[160px]" title={item.facultyName || item.faculty?.name || ''}>
                          {item.facultyName || item.faculty?.name || 'Unassigned Faculty'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          EmpID: <span className="font-bold text-slate-700">{item.employeeId}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-900 leading-snug line-clamp-2 max-w-[260px]" title={item.title}>
                          {item.title}
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-medium border border-purple-200">
                          {item.eContentPlatform}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                        {item.publicationDate}
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-800">
                        {item.calendarYear}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200 truncate max-w-[160px]" title={item.contentType}>
                          {item.contentType}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="text-slate-700 truncate block max-w-[160px]" title={item.department || item.originalDepartment || ''}>
                          {item.department || item.originalDepartment || 'General'}
                        </span>
                        {item.departmentTransferred && (
                          <span className="text-[9px] text-amber-600 block mt-0.5 font-medium">
                            Now in: {item.currentDepartment}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2855B9] hover:underline"
                            title="Open Published E-Content"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>View Content</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right pr-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingItem(item)}
                            className="p-1 text-slate-500 hover:text-[#2855B9] hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit E-Content"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteEContent(item.id)}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete E-Content"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>Showing Page {page} of {totalPages} ({totalCount} total e-contents)</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="h-8 text-xs border-slate-200"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="h-8 text-xs border-slate-200"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* View Details Modal */}
        {viewingItem && (
          <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
            <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Video className="w-5 h-5 text-[#2855B9]" />
                  <span>E-Content Record Details</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Comprehensive digital learning metadata and verified institutional faculty attribution
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Faculty Card */}
                <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      {viewingItem.facultyName || viewingItem.faculty?.name || 'Verified Faculty'}
                    </span>
                    <Badge variant="outline" className="bg-white text-blue-700 border-blue-300 font-mono text-[10px]">
                      EmpID: {viewingItem.employeeId}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-500">Designation: </span>
                      {viewingItem.designation || viewingItem.faculty?.designation || 'Not specified'}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">Original Dept: </span>
                      {viewingItem.department || viewingItem.originalDepartment || 'General'}
                    </div>
                    {viewingItem.departmentTransferred && (
                      <div className="col-span-2 text-amber-700 font-medium">
                        Current Department in Faculty Directory: {viewingItem.currentDepartment}
                      </div>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Title</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">{viewingItem.title}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">E-Content Platform</span>
                    <span className="font-semibold text-purple-700 mt-0.5 block">{viewingItem.eContentPlatform}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Content Type</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">{viewingItem.contentType}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Publication Date</span>
                    <span className="font-mono text-slate-800 mt-0.5 block">{viewingItem.publicationDate}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">System-Derived Calendar Year</span>
                    <span className="font-mono font-bold text-slate-900 mt-0.5 block">{viewingItem.calendarYear}</span>
                  </div>

                  <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Published Content URL</span>
                    {viewingItem.url ? (
                      <a
                        href={viewingItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2855B9] font-medium hover:underline inline-flex items-center gap-1 mt-1 break-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span>{viewingItem.url}</span>
                      </a>
                    ) : (
                      <span className="text-slate-400 text-xs mt-1 block">Not provided</span>
                    )}
                  </div>

                  {viewingItem.proofUrl && (
                    <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Supporting Evidence / Proof URL</span>
                      <a
                        href={viewingItem.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2855B9] font-medium hover:underline inline-flex items-center gap-1 mt-1 break-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span>{viewingItem.proofUrl}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setViewingItem(null)} className="h-8 text-xs border-slate-200">
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Add / Edit Single Entry Modal */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Video className="w-5 h-5 text-[#2855B9]" />
                <span>{editingItem ? 'Edit E-Content Record' : 'Add New E-Content Record'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Link one faculty member, enter digital learning resource details, and save.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveEContent} className="space-y-4 py-2 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Faculty Selector (1 faculty only) */}
              <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Faculty Member (EmpID Lookup) <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-500 font-normal">Exactly one faculty member per record</span>
                </Label>

                {selectedFaculty ? (
                  <div className="p-3 bg-white border border-emerald-300 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{selectedFaculty.name}</div>
                      <div className="text-[11px] text-slate-500">
                        EmpID: <span className="font-mono font-semibold text-slate-800">{selectedFaculty.employeeId}</span> • {selectedFaculty.designation || 'Faculty'} • {selectedFaculty.department || 'General'}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFaculty(null);
                        setFormFacultyQuery('');
                      }}
                      className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      Change Faculty
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search by EmpID or Faculty Name..."
                      value={formFacultyQuery}
                      onChange={e => setFormFacultyQuery(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-lg border-slate-300 bg-white"
                    />

                    {facultySearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                        Searching...
                      </div>
                    )}

                    {facultyOptions.length > 0 && !selectedFaculty && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {facultyOptions.map(f => (
                          <div
                            key={f.id}
                            onClick={() => {
                              setSelectedFaculty(f);
                              setFacultyOptions([]);
                            }}
                            className="p-2.5 hover:bg-blue-50 cursor-pointer transition-colors"
                          >
                            <div className="font-semibold text-slate-900">{f.name}</div>
                            <div className="text-[10px] text-slate-500">
                              EmpID: <span className="font-mono text-[#2855B9] font-bold">{f.employeeId}</span> • {f.designation} • {f.department}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Title of E-Content / MOOC <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Machine Learning Principles & Architectures..."
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="h-9 text-xs rounded-lg border-slate-300"
                  required
                />
              </div>

              {/* Platform & Content Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    E-Content Platform <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={formPlatform} onValueChange={setFormPlatform}>
                    <SelectTrigger className="h-9 text-xs rounded-lg border-slate-300">
                      <SelectValue placeholder="Select Platform" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {platforms.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Content Type <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={formContentType} onValueChange={setFormContentType}>
                    <SelectTrigger className="h-9 text-xs rounded-lg border-slate-300">
                      <SelectValue placeholder="Select Content Type" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {contentTypes.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Publication Date & Derived Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Publication Date <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={formPublicationDate}
                    onChange={e => setFormPublicationDate(e.target.value)}
                    className="h-9 text-xs rounded-lg border-slate-300"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    System-Derived Year (Read-Only)
                  </Label>
                  <div className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center font-mono font-bold text-slate-700">
                    {derivedFormYear || '— (select date first)'}
                  </div>
                </div>
              </div>

              {/* Published URL */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  URL to Published E-Content <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  type="url"
                  placeholder="https://swayam.gov.in/courses/... or active video / module link (optional)"
                  value={formUrl}
                  onChange={e => setFormUrl(e.target.value)}
                  className="h-9 text-xs rounded-lg border-slate-300"
                />
              </div>

              {/* Proof URL */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Supporting Evidence / Proof URL <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  type="url"
                  placeholder="https://drive.google.com/... or verification certificate link"
                  value={formProofUrl}
                  onChange={e => setFormProofUrl(e.target.value)}
                  className="h-9 text-xs rounded-lg border-slate-300"
                />
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFormOpen(false)}
                  className="h-8 text-xs border-slate-200"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  size="sm"
                  disabled={formLoading}
                  className="bg-[#2855B9] hover:bg-[#1C355B] text-white text-xs font-semibold h-8 px-4"
                >
                  {formLoading ? 'Saving...' : editingItem ? 'Update E-Content' : 'Save E-Content'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Bulk Upload Modal reusing the exact Publications upload card UI */}
        <BulkUploadDialog
          isOpen={isBulkOpen}
          onClose={() => setIsBulkOpen(false)}
          token={token}
          onSuccess={() => {
            fetchEContents();
            fetchStats();
          }}
          uploadType="e-contents"
        />
      </div>
    </AppShell>
  );
}

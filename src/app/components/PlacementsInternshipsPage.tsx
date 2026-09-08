import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  UserCheck, Briefcase, TrendingUp, Building2, Award, DollarSign,
  Users, BarChart3, Upload, Filter, RotateCcw, Search, Download,
  Plus, Edit, Trash2, Eye, X, CheckCircle, Clock, AlertCircle,
  LayoutGrid, Table as TableIcon, Calendar, GraduationCap, MapPin,
  ExternalLink, Sparkles, ChevronRight, FileSpreadsheet
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../contexts/AuthContext';
import { BulkUploadDialog } from './BulkUploadDialog';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';
import { normalizeDepartmentName } from './FacultyDetailsPage';

interface PlacementsInternshipsPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
  hideSidebar?: boolean;
  token?: string;
  userRole?: string;
}

export interface PlacementItem {
  id: string;
  studentName: string;
  studentId: string;
  department: string;
  course?: string;
  batch: string;
  company: string;
  role?: string;
  package: number | string;
  placementType: 'placement' | 'internship';
  placementDate?: string | null;
  location?: string | null;
  createdAt?: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ACADEMIC_YEARS = [
  '2026-2027',
  '2025-2026',
  '2024-2025',
  '2023-2024',
  '2022-2023',
  '2021-2022',
  '2020-2021'
];

const EMPTY_FORM = {
  studentName: '',
  studentId: '',
  department: '',
  course: '',
  batch: '2024-2025',
  company: '',
  role: '',
  package: '',
  placementType: 'placement' as 'placement' | 'internship',
  placementDate: new Date().toISOString().split('T')[0],
  location: ''
};

export function PlacementsInternshipsPage({
  onNavigate,
  isPublicView = false,
  hideSidebar = false,
  token: propToken,
  userRole: propUserRole
}: PlacementsInternshipsPageProps) {
  const { user, logout } = useAuth();
  const effectiveToken = propToken || user?.token || '';
  const effectiveRole = propUserRole || user?.role || 'faculty';
  const isAdminOrCoordinator = effectiveRole === 'admin' || effectiveRole === 'coordinator' || effectiveRole === 'hod';

  const [placements, setPlacements] = useState<PlacementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtering & View Mode State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'placement' | 'internship'>('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'analytics'>('table');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 12;

  // Modals & Drawers
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PlacementItem | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [viewingItem, setViewingItem] = useState<PlacementItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  const { departmentList: dbDepts } = useAcademicHierarchy();

  // Fetch placements
  const fetchPlacements = useCallback(async () => {
    if (!effectiveToken) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/placements`, {
        headers: {
          'Authorization': `Bearer ${effectiveToken}`
        }
      });

      if (response.status === 401) {
        logout();
        return;
      }

      const data = await response.json();
      if (data.success) {
        setPlacements(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch placement records');
      }
    } catch (err: any) {
      console.error('Error fetching placements:', err);
      setError('Unable to connect to placement server');
    } finally {
      setLoading(false);
    }
  }, [effectiveToken, logout]);

  useEffect(() => {
    fetchPlacements();
  }, [fetchPlacements]);

  // Derived options for dropdowns
  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    dbDepts.forEach(d => {
      if (d) set.add(normalizeDepartmentName(d));
    });
    placements.forEach(p => {
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
        'Sciences and Humanities (Engineering)'
      ];
    }
    return Array.from(set).sort();
  }, [dbDepts, placements]);

  const uniqueCourses = useMemo(() => {
    const set = new Set<string>();
    placements.forEach(p => {
      if (p.course && p.course.trim()) set.add(p.course.trim());
    });
    return Array.from(set).sort();
  }, [placements]);

  const uniqueBatches = useMemo(() => {
    const set = new Set<string>(ACADEMIC_YEARS);
    placements.forEach(p => {
      if (p.batch && p.batch.trim()) set.add(p.batch.trim());
    });
    return Array.from(set).sort().reverse();
  }, [placements]);

  // Format LPA
  const formatLPA = (val: number | string) => {
    const num = parseFloat(String(val || 0));
    if (!num || isNaN(num)) return '₹ 0.0 LPA';
    const lpa = num > 1000 ? num / 100000 : num;
    return `₹ ${lpa.toFixed(1).replace(/\.0$/, '')} LPA`;
  };

  // Format Stipend
  const formatStipend = (val: number | string) => {
    const num = parseFloat(String(val || 0));
    if (!num || isNaN(num)) return '₹ 0 /mo';
    return `₹ ${Math.round(num).toLocaleString('en-IN')} /mo`;
  };

  // Filtered Placements & Internships
  const filteredRecords = useMemo(() => {
    return placements.filter(item => {
      // Type Filter
      if (selectedType !== 'all' && item.placementType !== selectedType) {
        return false;
      }

      // Search Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = (item.studentName || '').toLowerCase().includes(query);
        const matchesId = (item.studentId || '').toLowerCase().includes(query);
        const matchesCompany = (item.company || '').toLowerCase().includes(query);
        const matchesRole = (item.role || '').toLowerCase().includes(query);
        const matchesDept = (item.department || '').toLowerCase().includes(query);
        const matchesCourse = (item.course || '').toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesCompany && !matchesRole && !matchesDept && !matchesCourse) {
          return false;
        }
      }

      // Department Filter
      if (selectedDept !== 'all' && normalizeDepartmentName(item.department) !== normalizeDepartmentName(selectedDept)) {
        return false;
      }

      // Course Filter
      if (selectedCourse !== 'all' && item.course !== selectedCourse) {
        return false;
      }

      // Batch Filter
      if (selectedBatch !== 'all' && item.batch !== selectedBatch) {
        return false;
      }

      return true;
    });
  }, [placements, selectedType, searchQuery, selectedDept, selectedCourse, selectedBatch]);

  // Sorted Records
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      switch (sortBy) {
        case 'package-desc':
          return (parseFloat(String(b.package || 0)) || 0) - (parseFloat(String(a.package || 0)) || 0);
        case 'package-asc':
          return (parseFloat(String(a.package || 0)) || 0) - (parseFloat(String(b.package || 0)) || 0);
        case 'name-asc':
          return (a.studentName || '').localeCompare(b.studentName || '');
        case 'name-desc':
          return (b.studentName || '').localeCompare(a.studentName || '');
        case 'company-asc':
          return (a.company || '').localeCompare(b.company || '');
        case 'company-desc':
          return (b.company || '').localeCompare(a.company || '');
        case 'date-asc':
          return new Date(a.placementDate || a.createdAt || 0).getTime() - new Date(b.placementDate || b.createdAt || 0).getTime();
        case 'date-desc':
        default:
          return new Date(b.placementDate || b.createdAt || 0).getTime() - new Date(a.placementDate || a.createdAt || 0).getTime();
      }
    });
  }, [filteredRecords, sortBy]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / recordsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return sortedRecords.slice(start, start + recordsPerPage);
  }, [sortedRecords, currentPage, recordsPerPage]);

  // Dynamic KPI Stats calculated from filtered records
  const kpiStats = useMemo(() => {
    const placementList = filteredRecords.filter(p => p.placementType === 'placement');
    const internshipList = filteredRecords.filter(p => p.placementType === 'internship');

    const validPackages = placementList
      .map(p => parseFloat(String(p.package || 0)))
      .filter(p => p > 0);

    const avgPkg = validPackages.length > 0
      ? validPackages.reduce((sum, val) => sum + val, 0) / validPackages.length
      : 0;
    const maxPkg = validPackages.length > 0 ? Math.max(...validPackages) : 0;
    const minPkg = validPackages.length > 0 ? Math.min(...validPackages) : 0;

    const validStipends = internshipList
      .map(p => parseFloat(String(p.package || 0)))
      .filter(s => s > 0);
    const avgStipend = validStipends.length > 0
      ? validStipends.reduce((sum, val) => sum + val, 0) / validStipends.length
      : 0;

    const companies = new Set(filteredRecords.map(p => (p.company || '').trim()).filter(Boolean));

    return {
      totalPlacements: placementList.length,
      totalInternships: internshipList.length,
      avgPackageLPA: avgPkg,
      maxPackageLPA: maxPkg,
      minPackageLPA: minPkg,
      avgStipend: avgStipend,
      totalCompanies: companies.size,
      totalRecords: filteredRecords.length
    };
  }, [filteredRecords]);

  // Department Analytics breakdown
  const departmentAnalytics = useMemo(() => {
    const map: Record<string, { placements: PlacementItem[]; internships: PlacementItem[] }> = {};

    filteredRecords.forEach(r => {
      const dept = normalizeDepartmentName(r.department || 'Other');
      if (!map[dept]) {
        map[dept] = { placements: [], internships: [] };
      }
      if (r.placementType === 'internship') {
        map[dept].internships.push(r);
      } else {
        map[dept].placements.push(r);
      }
    });

    return Object.keys(map).map(dept => {
      const { placements: pList, internships: iList } = map[dept];
      const validPackages = pList.map(p => parseFloat(String(p.package || 0))).filter(p => p > 0);
      const avg = validPackages.length > 0 ? validPackages.reduce((a, b) => a + b, 0) / validPackages.length : 0;
      const max = validPackages.length > 0 ? Math.max(...validPackages) : 0;
      const min = validPackages.length > 0 ? Math.min(...validPackages) : 0;

      const topCompanies = Array.from(new Set([...pList, ...iList].map(p => p.company))).filter(Boolean).slice(0, 5);

      return {
        department: dept,
        placedCount: pList.length,
        internCount: iList.length,
        avgPackage: formatLPA(avg),
        maxPackage: formatLPA(max),
        minPackage: formatLPA(min),
        topCompanies
      };
    });
  }, [filteredRecords]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedDept('all');
    setSelectedCourse('all');
    setSelectedBatch('all');
    setSortBy('date-desc');
    setCurrentPage(1);
  };

  // Open Form for Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      ...EMPTY_FORM,
      department: uniqueDepartments[0] || 'AI and Data Science Engineering'
    });
    setFormError('');
    setShowFormModal(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (item: PlacementItem) => {
    setEditingItem(item);
    setFormData({
      studentName: item.studentName || '',
      studentId: item.studentId || '',
      department: item.department || '',
      course: item.course || '',
      batch: item.batch || '2024-2025',
      company: item.company || '',
      role: item.role || '',
      package: String(item.package || ''),
      placementType: item.placementType || 'placement',
      placementDate: item.placementDate || new Date().toISOString().split('T')[0],
      location: item.location || ''
    });
    setFormError('');
    setShowFormModal(true);
  };

  // Save Placement/Internship Form
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentName.trim() || !formData.studentId.trim() || !formData.company.trim() || !formData.package) {
      setFormError('Please fill in Student Name, Register No, Company, and Package / Stipend.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    const payload = {
      ...formData,
      package: parseFloat(formData.package) || 0
    };

    try {
      const url = editingItem
        ? `${API_BASE}/api/placements/${editingItem.id}`
        : `${API_BASE}/api/placements`;
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        setShowFormModal(false);
        fetchPlacements();
      } else {
        setFormError(data.message || 'Failed to save placement record');
      }
    } catch (err: any) {
      console.error('Save placement error:', err);
      setFormError('Server error while saving record');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Placement
  const handleDeletePlacement = async () => {
    if (!deletingId) return;
    try {
      const response = await fetch(`${API_BASE}/api/placements/${deletingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${effectiveToken}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setDeletingId(null);
        fetchPlacements();
      } else {
        alert(data.message || 'Failed to delete placement record');
      }
    } catch (err) {
      console.error('Delete placement error:', err);
      alert('Server error while deleting');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert('No records to export with current filters');
      return;
    }

    const exportRows = filteredRecords.map((r, i) => ({
      'Sl. No': i + 1,
      'Student Name': r.studentName,
      'Register Number': r.studentId,
      'Type': r.placementType === 'placement' ? 'Campus Placement' : 'Corporate Internship',
      'Department': r.department,
      'Course': r.course || 'N/A',
      'Academic Year (AY)': r.batch,
      'Recruiting Company': r.company,
      'Job Designation / Role': r.role || 'N/A',
      'Package / Stipend': r.placementType === 'placement' ? `${r.package} LPA` : `₹ ${r.package}/mo`,
      'Location': r.location || 'N/A',
      'Placement Date': r.placementDate || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Placements & Internships');
    XLSX.writeFile(wb, `CHRIST_Placements_Internships_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert('No records to export with current filters');
      return;
    }

    const headers = ['Register No', 'Student Name', 'Type', 'Department', 'Course', 'AY', 'Company', 'Role', 'Package_LPA_or_Stipend', 'Location', 'Date'];
    const rows = filteredRecords.map(r => [
      `"${r.studentId || ''}"`,
      `"${(r.studentName || '').replace(/"/g, '""')}"`,
      `"${r.placementType || ''}"`,
      `"${(r.department || '').replace(/"/g, '""')}"`,
      `"${(r.course || '').replace(/"/g, '""')}"`,
      `"${r.batch || ''}"`,
      `"${(r.company || '').replace(/"/g, '""')}"`,
      `"${(r.role || '').replace(/"/g, '""')}"`,
      `"${r.package || ''}"`,
      `"${(r.location || '').replace(/"/g, '""')}"`,
      `"${r.placementDate || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CHRIST_Placements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      {!hideSidebar && <Sidebar currentPage="placements-internships" onNavigate={onNavigate} />}

      <main className={hideSidebar ? 'p-0' : 'ml-64 p-8 transition-all duration-300'}>
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ========================================================================= */}
          {/* 1. MASTER HEADER & ACTION BAR                                             */}
          {/* ========================================================================= */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
                  Career & Corporate Connect
                </Badge>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">Industry Linkage & Campus Recruitment</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Placements & Internships
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Comprehensive repository for student campus placements, corporate internships, compensation analytics, and recruiters data.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Export Button */}
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
                  onClick={() => setShowBulkDialog(true)}
                  className="h-9 px-3.5 text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Upload className="w-4 h-4 text-slate-600" />
                  <span>Bulk Upload</span>
                </Button>
              )}

              {/* Add Placement Record Button */}
              {isAdminOrCoordinator && (
                <Button
                  size="sm"
                  onClick={handleOpenCreate}
                  className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Placement / Internship</span>
                </Button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. KPI METRIC CARDS (5 KPI METRICS)                                       */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Total Placements */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Placed</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <UserCheck className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {kpiStats.totalPlacements}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium mt-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Campus Recruitment Offers</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Average Package */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Package</span>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {formatLPA(kpiStats.avgPackageLPA)}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">
                    Mean CTC across departments
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Highest Package */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Highest Package</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {formatLPA(kpiStats.maxPackageLPA)}
                  </div>
                  <div className="text-[11px] text-amber-700 font-medium mt-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Marquee Corporate Offer</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Total Internships */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Internships</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    <Briefcase className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {kpiStats.totalInternships}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">
                    {kpiStats.avgStipend > 0 ? `Avg: ${formatStipend(kpiStats.avgStipend)}` : 'Corporate Internships'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 5: Recruiting Partners */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recruiters</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {kpiStats.totalCompanies}
                  </div>
                  <div className="text-[11px] text-indigo-700 font-medium mt-1">
                    Active Corporate Partners
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* 3. SINGLE UNIFIED FILTER & VIEW TOOLBAR (CLEAN, NO DUPLICATES)            */}
          {/* ========================================================================= */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              {/* Real-time Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search student name, register no, company, role, course..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-4 h-10 text-xs bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl focus:ring-emerald-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* View Switcher & Reset Filters */}
              <div className="flex items-center gap-2 self-end lg:self-auto">
                {(searchQuery || selectedType !== 'all' || selectedDept !== 'all' || selectedCourse !== 'all' || selectedBatch !== 'all' || sortBy !== 'date-desc') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-9 px-3 text-xs text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </Button>
                )}

                {/* View Mode Pills */}
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

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 pt-1">
              {/* Type Select */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Record Type
                </label>
                <Select value={selectedType} onValueChange={(val: any) => { setSelectedType(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-xl">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All (Placements & Interns)</SelectItem>
                    <SelectItem value="placement">Campus Placements</SelectItem>
                    <SelectItem value="internship">Corporate Internships</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Department Select */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Department
                </label>
                <Select value={selectedDept} onValueChange={(val) => { setSelectedDept(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-xl">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {uniqueDepartments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Course Select */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Course
                </label>
                <Select value={selectedCourse} onValueChange={(val) => { setSelectedCourse(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-xl">
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {uniqueCourses.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Academic Year (AY) */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Academic Year (AY)
                </label>
                <Select value={selectedBatch} onValueChange={(val) => { setSelectedBatch(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-xl">
                    <SelectValue placeholder="All AY" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Academic Years</SelectItem>
                    {uniqueBatches.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Sort Order
                </label>
                <Select value={sortBy} onValueChange={(val) => setSortBy(val)}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-xl">
                    <SelectValue placeholder="Sort Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="package-desc">Package: High to Low</SelectItem>
                    <SelectItem value="package-asc">Package: Low to High</SelectItem>
                    <SelectItem value="name-asc">Student Name: A-Z</SelectItem>
                    <SelectItem value="company-asc">Company: A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. VIEW CONTENT AREA (TABLE / CARDS / ANALYTICS)                          */}
          {/* ========================================================================= */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mb-3" />
              <p className="text-sm font-medium text-slate-600">Loading placement records...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl text-center">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
              <p className="font-semibold text-sm">{error}</p>
              <Button onClick={fetchPlacements} variant="outline" size="sm" className="mt-3 bg-white">
                Retry Fetching
              </Button>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No records match your criteria</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try clearing search terms or selecting 'All Departments' / 'All Academic Years'.
              </p>
              <Button size="sm" variant="outline" onClick={handleResetFilters} className="rounded-xl">
                Reset All Filters
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
                      <th className="py-3.5 px-4">Student Details</th>
                      <th className="py-3.5 px-3">Type</th>
                      <th className="py-3.5 px-3">Department & Course</th>
                      <th className="py-3.5 px-3">AY (Batch)</th>
                      <th className="py-3.5 px-4">Recruiting Company & Role</th>
                      <th className="py-3.5 px-3">Package / Stipend</th>
                      <th className="py-3.5 px-3">Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedRecords.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Student Details */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {item.studentName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            Reg: {item.studentId}
                          </div>
                        </td>

                        {/* Type Badge */}
                        <td className="py-3.5 px-3">
                          {item.placementType === 'placement' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <UserCheck className="w-3 h-3" />
                              <span>Placement</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              <Briefcase className="w-3 h-3" />
                              <span>Internship</span>
                            </span>
                          )}
                        </td>

                        {/* Department & Course */}
                        <td className="py-3.5 px-3 max-w-[200px]">
                          <div className="font-medium text-slate-800 truncate" title={item.department}>
                            {item.department}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate" title={item.course || ''}>
                            {item.course || 'Degree Program'}
                          </div>
                        </td>

                        {/* Academic Year */}
                        <td className="py-3.5 px-3 font-mono text-slate-600">
                          {item.batch}
                        </td>

                        {/* Company & Role */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.company}</span>
                          </div>
                          {item.role && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {item.role}
                            </div>
                          )}
                        </td>

                        {/* Package / Stipend */}
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                          {item.placementType === 'placement' ? (
                            <span className="text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-100">
                              {formatLPA(item.package)}
                            </span>
                          ) : (
                            <span className="text-purple-700 bg-purple-50/80 px-2 py-0.5 rounded-md border border-purple-100">
                              {formatStipend(item.package)}
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                          {item.placementDate || '-'}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingItem(item)}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                              title="View Candidate Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {isAdminOrCoordinator && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(item)}
                                className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Edit Record"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}

                            {isAdminOrCoordinator && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingId(item.id)}
                                className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                title="Delete Record"
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

              {/* Pagination Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 gap-3">
                <div className="text-xs text-slate-500">
                  Showing <span className="font-semibold text-slate-800">{(currentPage - 1) * recordsPerPage + 1}</span> to{' '}
                  <span className="font-semibold text-slate-800">{Math.min(currentPage * recordsPerPage, sortedRecords.length)}</span> of{' '}
                  <span className="font-semibold text-slate-800">{sortedRecords.length}</span> records
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3 text-xs bg-white rounded-lg border-slate-200"
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-semibold text-slate-700 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 text-xs bg-white rounded-lg border-slate-200"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          ) : viewMode === 'cards' ? (
            /* ======================================================================= */
            /* VIEW 2: CARD GRID VIEW                                                  */
            /* ======================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedRecords.map((item) => (
                <Card
                  key={item.id}
                  className="border border-slate-200/80 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl overflow-hidden group flex flex-col justify-between"
                >
                  <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/30">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {item.placementType === 'placement' ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-[10px]">
                              Placement
                            </Badge>
                          ) : (
                            <Badge className="bg-purple-50 text-purple-700 border-purple-200 font-semibold text-[10px]">
                              Internship
                            </Badge>
                          )}
                          <span className="text-[11px] font-mono text-slate-500">{item.batch}</span>
                        </div>
                        <CardTitle className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {item.studentName}
                        </CardTitle>
                        <CardDescription className="text-xs font-mono text-slate-500 mt-0.5">
                          Reg No: {item.studentId}
                        </CardDescription>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold font-mono text-emerald-700 block">
                          {item.placementType === 'placement' ? formatLPA(item.package) : formatStipend(item.package)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3 flex-1 text-xs">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                      <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{item.company}</span>
                    </div>

                    {item.role && (
                      <div className="text-[11px] text-slate-600 flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{item.role}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                        {item.department}
                      </Badge>
                      {item.course && (
                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                          {item.course}
                        </Badge>
                      )}
                    </div>
                  </CardContent>

                  <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.placementDate || 'Date: N/A'}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingItem(item)}
                        className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900 rounded-lg"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                      </Button>
                      {isAdminOrCoordinator && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(item)}
                          className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                      )}
                      {isAdminOrCoordinator && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingId(item.id)}
                          className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            /* ======================================================================= */
            /* VIEW 3: DEPARTMENT ANALYTICS VIEW                                       */
            /* ======================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {departmentAnalytics.map((dept, index) => (
                <Card key={index} className="border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden">
                  <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-emerald-600" />
                        <span>{dept.department}</span>
                      </CardTitle>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
                        {dept.placedCount} Placed
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div className="bg-blue-50/60 border border-blue-100/80 p-2.5 rounded-xl">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Avg Package</p>
                        <p className="text-sm font-bold text-blue-900 mt-0.5">{dept.avgPackage}</p>
                      </div>

                      <div className="bg-emerald-50/60 border border-emerald-100/80 p-2.5 rounded-xl">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Highest</p>
                        <p className="text-sm font-bold text-emerald-900 mt-0.5">{dept.maxPackage}</p>
                      </div>

                      <div className="bg-amber-50/60 border border-amber-100/80 p-2.5 rounded-xl">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Interns</p>
                        <p className="text-sm font-bold text-amber-900 mt-0.5">{dept.internCount}</p>
                      </div>
                    </div>

                    {dept.topCompanies.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Key Recruiting Partners:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {dept.topCompanies.map((c, i) => (
                            <Badge key={i} variant="secondary" className="text-xs bg-slate-100 text-slate-700 border-slate-200">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* ========================================================================= */}
      {/* 5. ADD / EDIT RECORD MODAL DIALOG                                         */}
      {/* ========================================================================= */}
      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              <span>{editingItem ? 'Edit Placement / Internship Record' : 'Add New Placement / Internship Record'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enter official campus placement or corporate internship details for verification.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSaveForm} className="space-y-4 pt-2">
            {/* Record Type Toggle */}
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
                Type of Opportunity *
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, placementType: 'placement' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    formData.placementType === 'placement'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Campus Placement</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, placementType: 'internship' })}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    formData.placementType === 'internship'
                      ? 'bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-500'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Corporate Internship</span>
                </button>
              </div>
            </div>

            {/* Student Name & Register No */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Student Full Name *
                </Label>
                <Input
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Register Number / Student ID *
                </Label>
                <Input
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  placeholder="e.g. 2160350"
                  className="h-9 text-xs rounded-xl font-mono"
                  required
                />
              </div>
            </div>

            {/* Department & Course */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    {uniqueDepartments.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Degree / Program Course
                </Label>
                <Input
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  placeholder="e.g. BTech in Computer Science"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Company & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Recruiting Company *
                </Label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g. Microsoft, Infosys, Cisco"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Role / Job Profile
                </Label>
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g. Software Engineer, Data Analyst"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Package / Stipend & Academic Year */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  {formData.placementType === 'placement' ? 'Package (₹ in LPA) *' : 'Stipend (₹/month) *'}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.package}
                  onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                  placeholder={formData.placementType === 'placement' ? 'e.g. 14.5' : 'e.g. 35000'}
                  className="h-9 text-xs rounded-xl font-mono"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Academic Year (AY) *
                </Label>
                <Select
                  value={formData.batch}
                  onValueChange={(val) => setFormData({ ...formData, batch: val })}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Select AY" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACADEMIC_YEARS.map(yr => (
                      <SelectItem key={yr} value={yr}>{yr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Placement / Offer Date
                </Label>
                <Input
                  type="date"
                  value={formData.placementDate}
                  onChange={(e) => setFormData({ ...formData, placementDate: e.target.value })}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                Work Location / City
              </Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Bangalore, Hyderabad, Remote"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFormModal(false)}
                className="h-9 px-4 text-xs rounded-xl border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={formLoading}
                className="h-9 px-5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
              >
                {formLoading ? 'Saving...' : editingItem ? 'Update Record' : 'Create Record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 6. SLIDE-OVER DETAIL INSPECTION DRAWER                                    */}
      {/* ========================================================================= */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        <DialogContent className="max-w-lg bg-white rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                {viewingItem?.placementType === 'placement' ? 'Campus Placement' : 'Corporate Internship'}
              </Badge>
              <span className="text-xs font-mono text-slate-500">{viewingItem?.batch}</span>
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {viewingItem?.studentName}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-mono">
              Register No: {viewingItem?.studentId}
            </DialogDescription>
          </DialogHeader>

          {viewingItem && (
            <div className="space-y-4 pt-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Recruiting Company</span>
                  <span className="font-semibold text-slate-900 text-sm">{viewingItem.company}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Role / Designation</span>
                  <span className="font-semibold text-slate-900">{viewingItem.role || 'Software Trainee'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Package / Compensation</span>
                  <span className="font-bold text-emerald-700 text-sm font-mono">
                    {viewingItem.placementType === 'placement' ? formatLPA(viewingItem.package) : formatStipend(viewingItem.package)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Location</span>
                  <span className="font-medium text-slate-700">{viewingItem.location || 'Bangalore, India'}</span>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-semibold text-slate-800">{viewingItem.department}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Degree Program:</span>
                  <span className="font-semibold text-slate-800">{viewingItem.course || 'Undergraduate'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Offer Date:</span>
                  <span className="font-mono text-slate-700">{viewingItem.placementDate || '-'}</span>
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  onClick={() => setViewingItem(null)}
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
              <span>Confirm Deletion</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-2">
              Are you sure you want to permanently delete this placement record? This action will update departmental placement statistics in real time.
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
              onClick={handleDeletePlacement}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
            >
              Delete Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 8. BULK UPLOAD MODAL DIALOG                                               */}
      {/* ========================================================================= */}
      <BulkUploadDialog
        isOpen={showBulkDialog}
        onClose={() => setShowBulkDialog(false)}
        token={effectiveToken}
        onSuccess={fetchPlacements}
        uploadType="placements"
      />
    </div>
  );
}

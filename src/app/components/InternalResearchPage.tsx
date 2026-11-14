import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent } from './ui/card';
import {
  Sparkles, FileText, TrendingUp, Users, Calendar,
  Building, CheckCircle, Clock, Plus, Search, Trash2, Edit,
  Eye, Download, AlertCircle, Upload, X, ExternalLink,
  Layers, ChevronRight, Check, RefreshCw, DollarSign, ShieldCheck,
  Paperclip, Link2, FileCheck, FolderOpen, AlertTriangle,
  UploadCloud, FileSpreadsheet, ChevronDown, UserCheck
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
import { calculateProjectDuration } from '../utils/projectDurationHelper';

export interface InternalFacultyAssociation {
  id?: string;
  facultyId?: string | null;
  employeeId: string;
  normalizedEmployeeId?: string;
  facultyName?: string | null;
  designation?: string | null;
  department?: string | null;
  originalDepartment?: string | null;
  originalDepartmentSource?: string;
  school?: string | null;
  campus?: string | null;
  isValid: boolean;
  displayOrder?: number;
}

export interface InternalResearchItem {
  id: string;
  title: string;
  seedMoney: string;
  startDate: string;
  calendarYear: number;
  endDate?: string | null;
  duration?: string | null;
  sanctionedAmount: number;
  department?: string | null;
  school?: string | null;
  campus?: string | null;
  proofUrl?: string | null;
  empIdsRaw?: string;
  hasInvalidEmpIds?: boolean;
  invalidEmpIds?: string[];
  duplicateEmpIds?: string[];
  facultyAssociations?: InternalFacultyAssociation[];
  creator?: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
  createdAt?: string;
}

export interface InternalResearchStats {
  totalProjects: number;
  totalSanctionedAmount: number;
  activeDepartmentsCount: number;
  bySeedMoney: Record<string, number>;
  byYear: Record<string, number>;
}

export interface FacultyDirectoryItem {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  email?: string;
  school?: string;
  campus?: string;
}

interface InternalResearchPageProps {
  onNavigate: (page: string) => void;
  hideSidebar?: boolean;
  token?: string;
  userRole?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DEFAULT_SEED_MONEY_SCHEMES = [
  'Centre for Research - Seed Money Project (MRP)',
  'Minor Research Project (Minor RP)',
  'Faculty Research Grant (FRG)',
  'Seed Money for Research (SMR)',
  'Student Research Fellowship Scheme (SRFS)',
  'Postdoctoral / Early Career Seed Grant',
  'Interdisciplinary Research Grant',
  'Others / Special Seed Grant'
];

export function InternalResearchPage({ onNavigate, hideSidebar, token: tokenProp, userRole: userRoleProp }: InternalResearchPageProps) {
  const { user } = useAuth();
  const token = tokenProp || user?.token;
  const userRole = userRoleProp || user?.role || 'faculty';
  const canModify = ['admin', 'coordinator', 'hod', 'faculty', 'iqac_admin'].includes(userRole);

  const [projects, setProjects] = useState<InternalResearchItem[]>([]);
  const [stats, setStats] = useState<InternalResearchStats>({
    totalProjects: 0,
    totalSanctionedAmount: 0,
    activeDepartmentsCount: 0,
    bySeedMoney: {},
    byYear: {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedScheme, setSelectedScheme] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableYears, setAvailableYears] = useState<number[]>(() => {
    const cur = new Date().getFullYear();
    const yrs: number[] = [];
    for (let y = cur + 1; y >= cur - 15; y--) yrs.push(y);
    return yrs;
  });
  const [configuredSchemes, setConfiguredSchemes] = useState<string[]>(DEFAULT_SEED_MONEY_SCHEMES);

  // View Details Modal
  const [viewingProject, setViewingProject] = useState<InternalResearchItem | null>(null);

  // Single-entry Add/Edit Modal
  const [showAddEdit, setShowAddEdit] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    seedMoney: DEFAULT_SEED_MONEY_SCHEMES[0],
    startDate: '',
    calendarYear: '',
    endDate: '',
    duration: '',
    sanctionedAmount: '',
    proofUrl: '',
    department: ''
  });

  // Multi-faculty selector states
  const [facultyQuery, setFacultyQuery] = useState('');
  const [facultyOptions, setFacultyOptions] = useState<FacultyDirectoryItem[]>([]);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [selectedFacultyList, setSelectedFacultyList] = useState<FacultyDirectoryItem[]>([]);

  // Bulk Upload Modal (5-Step Stepper)
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkStep, setBulkStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any>(null);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [bulkError, setBulkError] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Clear All Modal
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  // Academic hierarchy departments
  const { departmentList: dbDepts } = useAcademicHierarchy();
  const departmentOptions = useMemo(() => {
    const set = new Set<string>();
    dbDepts.forEach(d => { if (d) set.add(normalizeDepartmentName(d)); });
    projects.forEach(p => { if (p.department) set.add(p.department); });
    return Array.from(set).sort();
  }, [dbDepts, projects]);

  // Fetch Configured Seed Money Schemes
  useEffect(() => {
    fetch(`${API_BASE}/api/internal-research/seed-money-schemes`)
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data) && d.data.length > 0) {
          setConfiguredSchemes(d.data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Projects List
  const fetchProjects = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedYear !== 'all') params.set('calendarYear', selectedYear);
      if (selectedDepartment !== 'all') params.set('department', selectedDepartment);
      if (selectedScheme !== 'all') params.set('seedMoney', selectedScheme);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`${API_BASE}/api/internal-research?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const list: InternalResearchItem[] = data.rows || data.data || [];
        setProjects(list);

        setAvailableYears(prev => {
          const yearsSet = new Set<number>(prev);
          const currentYear = new Date().getFullYear();
          for (let y = currentYear + 1; y >= currentYear - 15; y--) {
            yearsSet.add(y);
          }
          list.forEach(p => {
            if (p.calendarYear) yearsSet.add(Number(p.calendarYear));
          });
          return Array.from(yearsSet).sort((a, b) => b - a);
        });
      } else {
        setError(data.message || 'Failed to load internal research records');
      }
    } catch (err: any) {
      setError(err.message || 'Network error loading internal research');
    } finally {
      setLoading(false);
    }
  }, [token, selectedYear, selectedDepartment, selectedScheme, searchQuery]);

  // Fetch Statistics for KPI Cards
  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (selectedYear !== 'all') params.set('calendarYear', selectedYear);
      if (selectedDepartment !== 'all') params.set('department', selectedDepartment);

      const res = await fetch(`${API_BASE}/api/internal-research/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch {
      // stats failure shouldn't crash page
    }
  }, [token, selectedYear, selectedDepartment]);

  useEffect(() => {
    fetchProjects();
    fetchStats();
  }, [fetchProjects, fetchStats]);

  // Faculty Directory Autocomplete
  useEffect(() => {
    if (!showAddEdit || !facultyQuery.trim() || !token) {
      setFacultyOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setFacultyLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/internal-research/faculty-search?q=${encodeURIComponent(facultyQuery.trim())}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setFacultyOptions(data.data || []);
        }
      } catch (err) {
        console.error('Faculty search error:', err);
      } finally {
        setFacultyLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [showAddEdit, facultyQuery, token]);

  // Handle Start Date change with automatic Calendar Year derivation
  const handleStartDateChange = (val: string) => {
    let derivedYear = '';
    if (val) {
      const clean = val.split('T')[0];
      const match = clean.match(/^(\d{4})/);
      if (match) derivedYear = match[1];
    }
    let dur = '';
    if (val && formData.endDate) {
      dur = calculateProjectDuration(val, formData.endDate).formatted;
    } else if (val) {
      dur = 'Ongoing (Start date recorded)';
    }

    setFormData(prev => ({
      ...prev,
      startDate: val,
      calendarYear: derivedYear,
      duration: dur
    }));
  };

  const handleEndDateChange = (val: string) => {
    let dur = '';
    if (formData.startDate && val) {
      dur = calculateProjectDuration(formData.startDate, val).formatted;
    } else if (formData.startDate) {
      dur = 'Ongoing (Start date recorded)';
    }
    setFormData(prev => ({
      ...prev,
      endDate: val,
      duration: dur
    }));
  };

  // Add Faculty Association in Form
  const handleAddFaculty = (fac: FacultyDirectoryItem) => {
    const exists = selectedFacultyList.some(
      f => f.employeeId.toUpperCase() === fac.employeeId.toUpperCase()
    );
    if (!exists) {
      const updated = [...selectedFacultyList, fac];
      setSelectedFacultyList(updated);
      if (!formData.department && fac.department) {
        setFormData(prev => ({ ...prev, department: fac.department }));
      }
    }
    setFacultyQuery('');
    setFacultyOptions([]);
  };

  const handleRemoveFaculty = (employeeId: string) => {
    setSelectedFacultyList(prev => prev.filter(f => f.employeeId !== employeeId));
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingId(null);
    setFormError('');
    setFormData({
      title: '',
      seedMoney: configuredSchemes[0] || DEFAULT_SEED_MONEY_SCHEMES[0],
      startDate: '',
      calendarYear: '',
      endDate: '',
      duration: '',
      sanctionedAmount: '',
      proofUrl: '',
      department: ''
    });
    setSelectedFacultyList([]);
    setFacultyQuery('');
    setFacultyOptions([]);
    setShowAddEdit(true);
  };

  // Open Edit Modal
  const openEditModal = (project: InternalResearchItem) => {
    setEditingId(project.id);
    setFormError('');
    setFormData({
      title: project.title,
      seedMoney: project.seedMoney,
      startDate: project.startDate || '',
      calendarYear: String(project.calendarYear || ''),
      endDate: project.endDate || '',
      duration: project.duration || '',
      sanctionedAmount: String(project.sanctionedAmount || ''),
      proofUrl: project.proofUrl || '',
      department: project.department || ''
    });

    const faculties = (project.facultyAssociations || []).map(a => ({
      id: a.facultyId || a.employeeId,
      employeeId: a.employeeId,
      name: a.facultyName || `Faculty (${a.employeeId})`,
      designation: a.designation || '',
      department: a.department || '',
      school: a.school || undefined,
      campus: a.campus || undefined
    }));
    setSelectedFacultyList(faculties);
    setFacultyQuery('');
    setFacultyOptions([]);
    setShowAddEdit(true);
  };

  // Save Single-Entry Project
  const handleSaveProject = async () => {
    if (!formData.title.trim()) {
      setFormError('Project title is required.');
      return;
    }
    if (!formData.seedMoney.trim()) {
      setFormError('Seed Money scheme/program is required.');
      return;
    }
    if (!formData.startDate) {
      setFormError('Start Date is required.');
      return;
    }
    if (selectedFacultyList.length === 0) {
      setFormError('At least one associated faculty member is required.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const payload = {
        title: formData.title.trim(),
        seedMoney: formData.seedMoney.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        sanctionedAmount: parseFloat(formData.sanctionedAmount) || 0,
        proofUrl: formData.proofUrl.trim() || null,
        department: formData.department.trim() || selectedFacultyList[0]?.department || null,
        empIds: selectedFacultyList.map(f => f.employeeId).join(', ')
      };

      const url = editingId
        ? `${API_BASE}/api/internal-research/${editingId}`
        : `${API_BASE}/api/internal-research`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setShowAddEdit(false);
        fetchProjects();
        fetchStats();
      } else {
        setFormError(data.message || 'Failed to save internal research record.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error saving project.');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Single Project
  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this internal research project?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/internal-research/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        if (viewingProject?.id === id) setViewingProject(null);
        fetchProjects();
        fetchStats();
      } else {
        alert(data.message || 'Failed to delete record.');
      }
    } catch {
      alert('Error connecting to server.');
    }
  };

  // Clear All Records
  const handleClearAll = async () => {
    setClearLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/internal-research/clear-all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setShowClearConfirm(false);
        fetchProjects();
        fetchStats();
      } else {
        alert(data.message || 'Failed to clear internal research records.');
      }
    } catch {
      alert('Error clearing records.');
    } finally {
      setClearLoading(false);
    }
  };

  // Bulk Upload File Handlers (5-Step Stepper)
  const handleBulkFileSelect = async (file: File) => {
    setBulkFile(file);
    setBulkError('');
    setBulkStep(2); // Validation step
    setBulkLoading(true);

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`${API_BASE}/api/internal-research/bulk/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      const data = await res.json();

      if (data.success) {
        setBulkPreview(data);
        setBulkStep(3); // Preview step
      } else {
        setBulkError(data.message || 'Failed to parse spreadsheet file.');
        setBulkStep(1);
      }
    } catch (err: any) {
      setBulkError(err.message || 'Failed to upload spreadsheet.');
      setBulkStep(1);
    } finally {
      setBulkLoading(false);
    }
  };

  // Execute Bulk Import
  const handleExecuteImport = async () => {
    if (!bulkPreview || !bulkPreview.rows) return;
    setBulkLoading(true);
    setBulkError('');
    setBulkStep(4); // Confirmation step

    try {
      const res = await fetch(`${API_BASE}/api/internal-research/bulk/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rows: bulkPreview.rows })
      });
      const data = await res.json();

      if (data.success) {
        setBulkResult(data.result);
        setBulkStep(5); // Summary step
        fetchProjects();
        fetchStats();
      } else {
        setBulkError(data.message || 'Import failed.');
        setBulkStep(3);
      }
    } catch (err: any) {
      setBulkError(err.message || 'Error processing import.');
      setBulkStep(3);
    } finally {
      setBulkLoading(false);
    }
  };

  // Download Template
  const handleDownloadTemplate = (format: 'xlsx' | 'csv') => {
    window.open(`${API_BASE}/api/internal-research/template?format=${format}`, '_blank');
  };

  // Export Data (Excel & CSV)
  const handleExport = (format: 'xlsx' | 'csv') => {
    if (projects.length === 0) {
      alert('No internal research records to export.');
      return;
    }

    const data = projects.map((p, idx) => ({
      'S.No': idx + 1,
      'Associated Faculty EmpIds': p.empIdsRaw || (p.facultyAssociations || []).map(f => f.employeeId).join(', '),
      'Associated Faculty Members': (p.facultyAssociations || []).map(f => `${f.facultyName || f.employeeId} (${f.employeeId})`).join('; '),
      'Departments': (p.facultyAssociations || []).map(f => f.department).filter(Boolean).join(', ') || p.department || '',
      'Seed Money Scheme': p.seedMoney,
      'Project Title': p.title,
      'Start Date': p.startDate,
      'Calendar Year': p.calendarYear,
      'End Date': p.endDate || '',
      'Project Duration': p.duration || '',
      'Sanctioned Amount (INR)': p.sanctionedAmount,
      'Proof Link': p.proofUrl || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Internal_Research');

    const filename = `Internal_Research_Export_${new Date().toISOString().slice(0, 10)}.${format}`;
    if (format === 'xlsx') {
      XLSX.writeFile(wb, filename);
    } else {
      XLSX.writeFile(wb, filename, { bookType: 'csv' });
    }
  };

  // Currency Formatter
  const formatINR = (amount: number) => {
    if (!amount) return '₹0.00';
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} Lakhs`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const content = (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Research & Innovation' },
          { label: 'Sponsored Research & Grants' },
          { label: 'Internal Research' }
        ]}
        title="Internal Research & Seed Money"
        badge={`${stats.totalProjects} Projects`}
        description="Institutional seed money grants, internal faculty research schemes, interdisciplinary collaborations, and verified proof documents."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('xlsx')}
              className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
              <span>Excel</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
              <span>CSV</span>
            </Button>
            {canModify && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBulkFile(null);
                    setBulkPreview(null);
                    setBulkResult(null);
                    setBulkError('');
                    setBulkStep(1);
                    setIsBulkOpen(true);
                  }}
                  className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  <span>Bulk Upload</span>
                </Button>
                <Button
                  size="sm"
                  onClick={openAddModal}
                  className="bg-[#2855B9] hover:bg-[#1C355B] text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>Add Internal Project</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* KPI Cards (No Status Distribution) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Internal Projects"
          value={stats.totalProjects.toLocaleString()}
          subtitle="University-supported research"
          icon={Sparkles}
        />
        <StatCard
          title="Total Sanctioned Grant"
          value={formatINR(stats.totalSanctionedAmount)}
          subtitle="Cumulative seed money allocation"
          icon={DollarSign}
        />
        <StatCard
          title="Seed Money Schemes"
          value={Object.keys(stats.bySeedMoney || {}).length.toString()}
          subtitle="Active funding categories"
          icon={Layers}
        />
        <StatCard
          title="Active Departments"
          value={stats.activeDepartmentsCount.toString()}
          subtitle="Disciplines with seed grants"
          icon={Building}
        />
      </div>

      {/* Search and Filters Bar */}
      <Card className="border border-slate-200 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search title, scheme, faculty name, EmpId..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-[170px] h-9 text-xs rounded-xl border-slate-200 truncate">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departmentOptions.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Scheme Filter */}
              <Select value={selectedScheme} onValueChange={setSelectedScheme}>
                <SelectTrigger className="w-[180px] h-9 text-xs rounded-xl border-slate-200 truncate">
                  <SelectValue placeholder="All Schemes" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Schemes</SelectItem>
                  {configuredSchemes.map(sch => (
                    <SelectItem key={sch} value={sch}>{sch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {canModify && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowClearConfirm(true)}
                  className="h-9 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>Clear All</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#0B1B3D] text-white">
              <tr>
                <th className="p-3.5 font-semibold text-[11px] uppercase tracking-wider w-12 text-center">#</th>
                <th className="p-3.5 font-semibold text-[11px] uppercase tracking-wider min-w-[280px]">Title & Scheme</th>
                <th className="p-3.5 font-semibold text-[11px] uppercase tracking-wider min-w-[220px]">Associated Faculty</th>
                <th className="p-3.5 font-semibold text-[11px] uppercase tracking-wider min-w-[130px]">Calendar Year</th>
                <th className="p-3.5 font-semibold text-[11px] uppercase tracking-wider min-w-[150px]">Timeline / Duration</th>
                <th className="p-3.5 font-semibold text-[11px] uppercase tracking-wider min-w-[140px] text-right">Sanctioned Amount</th>
                <th className="p-3.5 font-semibold text-[11px] uppercase tracking-wider min-w-[90px] text-center">Proof</th>
                <th className="p-3.5 font-semibold text-[11px] uppercase tracking-wider min-w-[100px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#2855B9] mb-2" />
                    <span>Loading internal research records...</span>
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <Sparkles className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No Internal Research Records Found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try adjusting your filters or search query.</p>
                  </td>
                </tr>
              ) : (
                projects.map((project, idx) => (
                  <tr key={project.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 leading-snug">{project.title}</div>
                      <div className="text-[11px] text-[#2855B9] font-medium mt-0.5">{project.seedMoney}</div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(project.facultyAssociations || []).map((fac) => (
                          <Badge
                            key={fac.employeeId}
                            variant="outline"
                            className="text-[10px] font-normal border-slate-200 bg-slate-50 text-slate-700 flex items-center gap-1"
                          >
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>{fac.facultyName || `EmpID ${fac.employeeId}`} ({fac.employeeId})</span>
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <Badge className="bg-[#EAF1FD] text-[#2855B9] border-[#C8DCFB] text-[11px] font-semibold">
                        {project.calendarYear}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <div className="text-slate-800 font-medium">Start: {project.startDate}</div>
                      <div className="text-[11px] text-slate-500">
                        {project.endDate ? `End: ${project.endDate}` : 'Ongoing'}
                      </div>
                      {project.duration && (
                        <div className="text-[10px] text-emerald-700 font-medium mt-0.5">{project.duration}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      {formatINR(project.sanctionedAmount)}
                    </td>
                    <td className="p-3.5 text-center">
                      {project.proofUrl ? (
                        <a
                          href={project.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#2855B9] hover:underline text-[11px] font-medium"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Proof</span>
                        </a>
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingProject(project)}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {canModify && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(project)}
                              className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProject(project.id)}
                              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RECORD DETAIL DIALOG (IPRs Style)                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={!!viewingProject} onOpenChange={(open) => { if (!open) setViewingProject(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-[#2855B9]">
              <Sparkles className="w-5 h-5" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Internal Research Project Details
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Institutional grant metadata and equal faculty associations.
            </DialogDescription>
          </DialogHeader>

          {viewingProject && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{viewingProject.title}</h3>
                <p className="text-xs text-[#2855B9] font-medium mt-1">{viewingProject.seedMoney}</p>
              </div>

              {/* Grid Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase text-slate-400 block">Calendar Year</span>
                  <span className="text-sm font-bold text-slate-800">{viewingProject.calendarYear}</span>
                </div>
                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase text-slate-400 block">Sanctioned Amount</span>
                  <span className="text-sm font-bold text-emerald-700">{formatINR(viewingProject.sanctionedAmount)}</span>
                </div>
                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase text-slate-400 block">Project Duration</span>
                  <span className="text-xs font-semibold text-slate-700">{viewingProject.duration || 'Not Available'}</span>
                </div>
                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase text-slate-400 block">Start Date</span>
                  <span className="text-xs font-medium text-slate-800">{viewingProject.startDate}</span>
                </div>
                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase text-slate-400 block">End Date</span>
                  <span className="text-xs font-medium text-slate-800">{viewingProject.endDate || 'Ongoing'}</span>
                </div>
                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase text-slate-400 block">Primary Department</span>
                  <span className="text-xs font-medium text-slate-800">{viewingProject.department || 'General'}</span>
                </div>
              </div>

              {/* Equal Faculty Associations */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Users className="w-4 h-4 text-[#2855B9]" />
                  <span>Associated Faculty Members (Equal Roles)</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {(viewingProject.facultyAssociations || []).map((fac) => (
                    <div key={fac.employeeId} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">{fac.facultyName || `Faculty (${fac.employeeId})`}</div>
                        <div className="text-[11px] text-slate-500">
                          {fac.designation ? `${fac.designation} • ` : ''}{fac.department || fac.originalDepartment}
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px] border-slate-200">
                        EmpID: {fac.employeeId}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proof Document */}
              {viewingProject.proofUrl && (
                <div className="p-3 bg-[#EAF1FD]/40 border border-[#C8DCFB] rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-[#2855B9]" />
                    <span className="font-medium text-slate-800 text-xs">Official Proof Document Attached</span>
                  </div>
                  <a
                    href={viewingProject.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-[#2855B9] text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-[#1C355B]"
                  >
                    <span>Open Proof</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button variant="outline" size="sm" onClick={() => setViewingProject(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SINGLE-ENTRY ADD / EDIT DIALOG                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={showAddEdit} onOpenChange={setShowAddEdit}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingId ? 'Edit Internal Research Project' : 'Add Internal Research Project'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record university seed-money research with multi-faculty equal ownership.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* A. Faculty Associations (Equal Roles) */}
            <div className="border border-slate-200 rounded-xl p-3.5 space-y-3 bg-slate-50/40">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#2855B9]" />
                  <span>Associated Faculty Members (Equal Partners) *</span>
                </Label>
                <span className="text-[10px] text-slate-400">Search by EmpID or Name</span>
              </div>

              {/* Selected Badges */}
              <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-white rounded-lg border border-slate-200">
                {selectedFacultyList.length === 0 ? (
                  <span className="text-slate-400 text-[11px] italic">No faculty members selected yet. Use the search input below.</span>
                ) : (
                  selectedFacultyList.map(fac => (
                    <Badge
                      key={fac.employeeId}
                      className="bg-[#EAF1FD] text-[#2855B9] border-[#C8DCFB] text-[11px] flex items-center gap-1.5 pr-1"
                    >
                      <span>{fac.name || fac.employeeId} ({fac.employeeId})</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFaculty(fac.employeeId)}
                        className="hover:bg-blue-200 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3 text-[#2855B9]" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>

              {/* Search Faculty Autocomplete */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Type EmpID (e.g. 2295) or Faculty Name to search directory..."
                  value={facultyQuery}
                  onChange={e => setFacultyQuery(e.target.value)}
                  className="pl-8 h-8 text-xs bg-white"
                />
                {facultyLoading && (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                )}

                {facultyOptions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {facultyOptions.map(opt => (
                      <div
                        key={opt.employeeId}
                        onClick={() => handleAddFaculty(opt)}
                        className="p-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-800 text-xs">{opt.name}</div>
                          <div className="text-[10px] text-slate-500">{opt.designation} • {opt.department}</div>
                        </div>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          EmpID: {opt.employeeId}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* B. Project Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Project Title *</Label>
                <Input
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Full official title of the internal research project"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Seed Money Scheme / Program *</Label>
                <Select
                  value={formData.seedMoney}
                  onValueChange={val => setFormData(prev => ({ ...prev, seedMoney: val }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select Seed Money Scheme" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {configuredSchemes.map(sch => (
                      <SelectItem key={sch} value={sch}>{sch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Sanctioned Amount (INR) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.sanctionedAmount}
                  onChange={e => setFormData(prev => ({ ...prev, sanctionedAmount: e.target.value }))}
                  placeholder="e.g. 250000"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* C. Project Timeline (Start Date Mandatory, Calendar Year Derived) */}
            <div className="border border-slate-200 rounded-xl p-3.5 space-y-3 bg-slate-50/40">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#2855B9]" />
                <span>Project Timeline & Year Derivation</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={e => handleStartDateChange(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Calendar Year (Derived)</Label>
                  <Input
                    value={formData.calendarYear}
                    readOnly
                    placeholder="Auto-derived"
                    className="h-8 text-xs bg-slate-100 text-slate-600 font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">End Date (Optional)</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={e => handleEndDateChange(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Duration (Calculated)</Label>
                  <Input
                    value={formData.duration}
                    readOnly
                    placeholder="Calculated duration"
                    className="h-8 text-xs bg-slate-100 text-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* D. Proof Link */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Proof Document Link (Google Drive / URL)</Label>
              <Input
                value={formData.proofUrl}
                onChange={e => setFormData(prev => ({ ...prev, proofUrl: e.target.value }))}
                placeholder="https://drive.google.com/file/d/..."
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-slate-400">Optional Google Drive link to sanction letter or approval memo.</p>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddEdit(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveProject}
              disabled={formLoading}
              className="bg-[#2855B9] hover:bg-[#1C355B] text-white"
            >
              {formLoading ? 'Saving...' : editingId ? 'Update Project' : 'Save Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5-STEP BULK UPLOAD MODAL (Exact 7-Column Template)            */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-[#2855B9]">
              <FileSpreadsheet className="w-5 h-5" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Internal Research Bulk Excel Upload
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Upload Excel (.xlsx, .xls) or CSV (.csv) using the official 7-column template. Multi-faculty EmpIDs must be comma-separated.
            </DialogDescription>
          </DialogHeader>

          {/* Stepper Header (5 Equal Steps) */}
          <div className="py-2 border-b border-slate-100">
            <div className="grid grid-cols-5 text-center text-xs">
              {[
                { num: 1, label: 'Upload' },
                { num: 2, label: 'Validation' },
                { num: 3, label: 'Preview' },
                { num: 4, label: 'Confirmation' },
                { num: 5, label: 'Summary' }
              ].map(st => (
                <div key={st.num} className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      bulkStep === st.num
                        ? 'bg-[#2855B9] text-white ring-2 ring-blue-200'
                        : bulkStep > st.num
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {bulkStep > st.num ? <Check className="w-3.5 h-3.5" /> : st.num}
                  </div>
                  <span className={`text-[11px] mt-1 ${bulkStep === st.num ? 'font-bold text-[#2855B9]' : 'text-slate-500'}`}>
                    {st.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 py-2 text-xs">
            {/* Step 1: Upload */}
            {bulkStep === 1 && (
              <div className="space-y-4">
                <div className="p-3.5 bg-[#EAF1FD]/50 border border-[#C8DCFB] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-800">Official 7-Column Internal Research Template</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Columns: <code>EmpId, Seed Money, Title, Start Date, End Date, Sanctioned Amount, Proof</code>
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleDownloadTemplate('xlsx')} className="bg-white border-[#C8DCFB] text-[#2855B9] text-xs">
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Excel (.xlsx)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDownloadTemplate('csv')} className="bg-white border-[#C8DCFB] text-slate-600 text-xs">
                      <Download className="w-3.5 h-3.5 mr-1" />
                      CSV (.csv)
                    </Button>
                  </div>
                </div>

                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleBulkFileSelect(e.target.files[0]); }}
                />

                <div
                  onClick={() => bulkFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-[#2855B9] rounded-xl p-8 text-center cursor-pointer bg-slate-50/40 transition-colors"
                >
                  <UploadCloud className="w-10 h-10 mx-auto text-[#2855B9] mb-2" />
                  <p className="font-semibold text-slate-800">
                    {bulkFile ? `${bulkFile.name} (${Math.round(bulkFile.size / 1024)} KB)` : 'Click to select Internal Research Excel / CSV file'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Supports .xlsx, .xls, and .csv formats</p>
                </div>
              </div>
            )}

            {/* Step 2: Validating */}
            {bulkStep === 2 && bulkLoading && (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2855B9]" />
                <p className="font-semibold text-slate-700">Validating Internal Research Spreadsheet...</p>
                <p className="text-[11px] text-slate-400">Verifying faculty EmpIDs, dates, and seed money schemes.</p>
              </div>
            )}

            {/* Step 3: Preview */}
            {bulkStep === 3 && bulkPreview && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 block">Total Rows</span>
                    <span className="text-base font-bold text-slate-900">{bulkPreview.totalRows}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] uppercase text-emerald-700 block">Valid Rows</span>
                    <span className="text-base font-bold text-emerald-800">{bulkPreview.validRows}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <span className="text-[10px] uppercase text-amber-800 block">Invalid EmpID (Skip)</span>
                    <span className="text-base font-bold text-amber-900">{bulkPreview.skippedInvalidEmpIdCount || 0}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-700 block">Missing EmpID (Skip)</span>
                    <span className="text-base font-bold text-slate-900">{bulkPreview.skippedMissingEmpIdCount || 0}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                    <span className="text-[10px] uppercase text-indigo-700 block">Duplicates</span>
                    <span className="text-base font-bold text-indigo-900">{bulkPreview.duplicates}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                    <span className="text-[10px] uppercase text-rose-700 block">Errors</span>
                    <span className="text-base font-bold text-rose-900">{bulkPreview.errors}</span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2">Row</th>
                        <th className="p-2">EmpIds</th>
                        <th className="p-2">Title</th>
                        <th className="p-2">Seed Money</th>
                        <th className="p-2">Start Date / Yr</th>
                        <th className="p-2 text-right">Amount</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(bulkPreview.rows || []).map((r: any) => (
                        <tr key={r.rowNumber} className={r.rowStatus === 'ERROR' ? 'bg-rose-50/40' : undefined}>
                          <td className="p-2 font-mono">{r.rowNumber}</td>
                          <td className="p-2 font-mono">{r.empIdsRaw}</td>
                          <td className="p-2 font-medium max-w-[200px] truncate">{r.title}</td>
                          <td className="p-2">{r.seedMoney}</td>
                          <td className="p-2 font-mono">{r.startDate} ({r.calendarYear})</td>
                          <td className="p-2 text-right font-mono font-semibold">{formatINR(r.sanctionedAmount)}</td>
                          <td className="p-2">
                            {r.rowStatus === 'VALID' && (
                              <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Valid</Badge>
                            )}
                            {r.rowStatus === 'SKIPPED_INVALID_EMPID' && (
                              <div>
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Skipped (Invalid EmpID)</Badge>
                                <p className="text-[10px] text-amber-800 mt-0.5">{r.skipReason || (r.errors || []).join('; ')}</p>
                              </div>
                            )}
                            {r.rowStatus === 'SKIPPED_MISSING_EMPID' && (
                              <div>
                                <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px]">Skipped (Missing EmpID)</Badge>
                                <p className="text-[10px] text-slate-700 mt-0.5">{r.skipReason || 'Required EmpID is missing.'}</p>
                              </div>
                            )}
                            {r.rowStatus === 'WARNING' && (
                              <Badge className="bg-amber-100 text-amber-800 text-[10px]">Warning</Badge>
                            )}
                            {r.rowStatus === 'DUPLICATE' && (
                              <Badge className="bg-indigo-100 text-indigo-800 text-[10px]">Duplicate</Badge>
                            )}
                            {r.rowStatus === 'ERROR' && (
                              <Badge className="bg-rose-100 text-rose-800 text-[10px]">Error</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {bulkStep === 4 && bulkLoading && (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2855B9]" />
                <p className="font-semibold text-slate-700">Importing Internal Research Records...</p>
                <p className="text-[11px] text-slate-400">Saving records and faculty associations in atomic transaction.</p>
              </div>
            )}

            {/* Step 5: Summary */}
            {bulkStep === 5 && bulkResult && (
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-3">
                <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-900">Bulk Import Complete!</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-w-lg mx-auto text-xs">
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="block text-[10px] text-emerald-700 uppercase">Imported</span>
                    <span className="text-base font-bold text-emerald-900">{bulkResult.successfulImports}</span>
                  </div>
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="block text-[10px] text-amber-700 uppercase">Invalid EmpID (Skip)</span>
                    <span className="text-base font-bold text-amber-900">{bulkResult.skippedInvalidEmpIdCount || 0}</span>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="block text-[10px] text-slate-700 uppercase">Missing EmpID (Skip)</span>
                    <span className="text-base font-bold text-slate-900">{bulkResult.skippedMissingEmpIdCount || 0}</span>
                  </div>
                  <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <span className="block text-[10px] text-indigo-700 uppercase">Duplicates Skipped</span>
                    <span className="text-base font-bold text-indigo-900">{bulkResult.duplicatesSkipped || 0}</span>
                  </div>
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="block text-[10px] text-rose-700 uppercase">Errors Skipped</span>
                    <span className="text-base font-bold text-rose-900">{bulkResult.errorsSkipped || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {bulkError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bulkError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3">
            {bulkStep === 3 && (
              <div className="flex justify-between w-full">
                <Button variant="outline" size="sm" onClick={() => setBulkStep(1)}>
                  Upload Different File
                </Button>
                <Button
                  size="sm"
                  onClick={handleExecuteImport}
                  className="bg-[#2855B9] hover:bg-[#1C355B] text-white"
                >
                  Confirm & Import ({bulkPreview?.validRows || 0} Eligible Rows)
                </Button>
              </div>
            )}
            {bulkStep === 5 && (
              <Button size="sm" onClick={() => setIsBulkOpen(false)} className="bg-[#2855B9] text-white">
                Done
              </Button>
            )}
            {(bulkStep === 1 || bulkStep === 2) && (
              <Button variant="outline" size="sm" onClick={() => setIsBulkOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Confirmation Modal */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Clear All Internal Research Records?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              This action will permanently delete all internal research records and their associated faculty links. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3">
            <Button variant="outline" size="sm" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleClearAll}
              disabled={clearLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {clearLoading ? 'Clearing...' : 'Yes, Delete All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (hideSidebar) {
    return content;
  }

  return (
    <AppShell currentPage="internal-research" onNavigate={onNavigate}>
      {content}
    </AppShell>
  );
}

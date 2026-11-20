import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent } from './ui/card';
import {
  Trophy, Award, Users, Calendar, Building2, CheckCircle2,
  Plus, Search, Trash2, Edit, Eye, Download, AlertCircle, Upload, X,
  ExternalLink, Layers, RefreshCw, FileSpreadsheet, Globe
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useAuth } from '../contexts/AuthContext';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';
import { normalizeDepartmentName } from './FacultyDetailsPage';
import { AppShell, PageHeader, StatCard } from './design-system';
import { BulkUploadDialog } from './BulkUploadDialog';
import { ClearModuleDataDialog } from './ClearModuleDataDialog';

export interface AwardItem {
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
  nameOfRecognition: string;
  description?: string | null;
  dateOfRecognition: string;
  recognisedAgencyType: string;
  recognisingAgencyName: string;
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

export interface AwardStats {
  totalAwards: number;
  yearWise: Record<string, number>;
  departmentWise: Record<string, number>;
  agencyTypeWise: Record<string, number>;
  topAgencies: Array<{ name: string; count: number }>;
  activeDepartmentsCount: number;
}

interface AwardsPageProps {
  onNavigate: (page: string) => void;
  hideSidebar?: boolean;
  token?: string;
  userRole?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DEFAULT_STATS: AwardStats = {
  totalAwards: 0,
  yearWise: {},
  departmentWise: {},
  agencyTypeWise: {},
  topAgencies: [],
  activeDepartmentsCount: 0
};

export function AwardsPage({ onNavigate, hideSidebar = false, token: propToken, userRole }: AwardsPageProps) {
  const { user } = useAuth();
  const token = propToken || user?.token || localStorage.getItem('token') || '';

  // Data & KPI states
  const [awards, setAwards] = useState<AwardItem[]>([]);
  const [stats, setStats] = useState<AwardStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState<boolean>(true);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [agencyTypes, setAgencyTypes] = useState<string[]>([]);

  // Filtering states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedAgencyType, setSelectedAgencyType] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Available years: persistent 16-year baseline + DB years
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
  const [editingAward, setEditingAward] = useState<AwardItem | null>(null);
  const [viewingAward, setViewingAward] = useState<AwardItem | null>(null);
  const [isBulkOpen, setIsBulkOpen] = useState<boolean>(false);
  const [isClearDataOpen, setIsClearDataOpen] = useState<boolean>(false);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Single-entry form states
  const [formFacultyQuery, setFormFacultyQuery] = useState<string>('');
  const [facultyOptions, setFacultyOptions] = useState<any[]>([]);
  const [facultySearching, setFacultySearching] = useState<boolean>(false);
  const [selectedFaculty, setSelectedFaculty] = useState<any | null>(null);

  const [formRecognitionName, setFormRecognitionName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formDateOfRecognition, setFormDateOfRecognition] = useState<string>('');
  const [formAgencyType, setFormAgencyType] = useState<string>('');
  const [formAgencyName, setFormAgencyName] = useState<string>('');
  const [formProofUrl, setFormProofUrl] = useState<string>('');

  // Automatically derived year for single-entry form
  const derivedFormYear = useMemo(() => {
    if (!formDateOfRecognition) return null;
    const match = formDateOfRecognition.match(/^(\d{4})/);
    return match ? parseInt(match[1], 10) : new Date(formDateOfRecognition).getFullYear() || null;
  }, [formDateOfRecognition]);

  // Fetch approved Agency Types
  const fetchAgencyTypes = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/awards/agency-types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.options)) {
        setAgencyTypes(data.options);
      }
    } catch (_) {}
  }, [token]);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    if (!token) return;
    setStatsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear !== 'all') params.append('calendarYear', selectedYear);
      if (selectedDept !== 'all') params.append('department', selectedDept);

      const res = await fetch(`${API_BASE}/api/awards/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Fetch award stats error:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [token, selectedYear, selectedDept]);

  // Fetch Awards
  const fetchAwards = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '50');
      if (selectedYear !== 'all') params.append('calendarYear', selectedYear);
      if (selectedDept !== 'all') params.append('department', selectedDept);
      if (selectedAgencyType !== 'all') params.append('agencyType', selectedAgencyType);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`${API_BASE}/api/awards?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        const list: AwardItem[] = data.rows || [];
        setAwards(list);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);

        // Accumulate years safely without wiping previous options
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
      console.error('Fetch awards error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, page, selectedYear, selectedDept, selectedAgencyType, searchQuery]);

  useEffect(() => {
    fetchAgencyTypes();
  }, [fetchAgencyTypes]);

  useEffect(() => {
    fetchAwards();
  }, [fetchAwards]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedYear, selectedDept, selectedAgencyType, searchQuery]);

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
    setEditingAward(null);
    setSelectedFaculty(null);
    setFormFacultyQuery('');
    setFormRecognitionName('');
    setFormDescription('');
    setFormDateOfRecognition('');
    setFormAgencyType(agencyTypes[0] || 'National');
    setFormAgencyName('');
    setFormProofUrl('');
    setFormError('');
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (award: AwardItem) => {
    setEditingAward(award);
    setSelectedFaculty({
      employeeId: award.employeeId,
      name: award.facultyName || award.faculty?.name,
      designation: award.designation || award.faculty?.designation,
      department: award.department || award.faculty?.department,
      school: award.school,
      campus: award.campus
    });
    setFormFacultyQuery(award.employeeId);
    setFormRecognitionName(award.nameOfRecognition);
    setFormDescription(award.description || '');
    setFormDateOfRecognition(award.dateOfRecognition);
    setFormAgencyType(award.recognisedAgencyType);
    setFormAgencyName(award.recognisingAgencyName);
    setFormProofUrl(award.proofUrl || '');
    setFormError('');
    setIsFormOpen(true);
  };

  // Submit Single Add/Edit
  const handleSaveAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty || !selectedFaculty.employeeId) {
      setFormError('Please search and select exactly one valid faculty member.');
      return;
    }
    if (!formRecognitionName.trim()) {
      setFormError('Name of Recognition is required.');
      return;
    }
    if (!formDateOfRecognition) {
      setFormError('Date of Recognition is required.');
      return;
    }
    if (!formAgencyType.trim()) {
      setFormError('Recognised Agency Type is required.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const payload = {
        employeeId: selectedFaculty.employeeId,
        nameOfRecognition: formRecognitionName.trim(),
        description: formDescription.trim() || null,
        dateOfRecognition: formDateOfRecognition,
        recognisedAgencyType: formAgencyType.trim(),
        recognisingAgencyName: formAgencyName.trim(),
        proofUrl: formProofUrl.trim() || null
      };

      const url = editingAward
        ? `${API_BASE}/api/awards/${editingAward.id}`
        : `${API_BASE}/api/awards`;
      const method = editingAward ? 'PUT' : 'POST';

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
        throw new Error(data.message || 'Failed to save award record.');
      }

      setIsFormOpen(false);
      fetchAwards();
      fetchStats();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving the award.');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Award
  const handleDeleteAward = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this award record? This action cannot be undone.')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/awards/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchAwards();
        fetchStats();
      } else {
        alert(data.message || 'Failed to delete award.');
      }
    } catch (err) {
      alert('Error communicating with server while deleting award.');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (awards.length === 0) {
      alert('No award records to export.');
      return;
    }
    const headers = [
      'EmpID',
      'Faculty Name',
      'Designation',
      'Department',
      'Name of Recognition',
      'Recognised Agency Type',
      'Recognising Agency Name',
      'Date of Recognition',
      'Calendar Year',
      'Description',
      'Proof URL'
    ];
    const rows = awards.map(a => [
      a.employeeId,
      a.facultyName || a.faculty?.name || '',
      a.designation || a.faculty?.designation || '',
      a.department || '',
      a.nameOfRecognition,
      a.recognisedAgencyType,
      a.recognisingAgencyName,
      a.dateOfRecognition,
      a.calendarYear,
      a.description || '',
      a.proofUrl || ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Awards');
    XLSX.writeFile(wb, `CHRIST_Awards_Export_${selectedYear !== 'all' ? selectedYear : 'All_Years'}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (awards.length === 0) {
      alert('No award records to export.');
      return;
    }
    const headers = [
      'EmpID',
      'Faculty Name',
      'Designation',
      'Department',
      'Name of Recognition',
      'Recognised Agency Type',
      'Recognising Agency Name',
      'Date of Recognition',
      'Calendar Year',
      'Description',
      'Proof URL'
    ];
    let csv = headers.join(',') + '\n';
    awards.forEach(a => {
      const row = [
        `"${a.employeeId}"`,
        `"${a.facultyName || a.faculty?.name || ''}"`,
        `"${a.designation || a.faculty?.designation || ''}"`,
        `"${a.department || ''}"`,
        `"${(a.nameOfRecognition || '').replace(/"/g, '""')}"`,
        `"${a.recognisedAgencyType || ''}"`,
        `"${(a.recognisingAgencyName || '').replace(/"/g, '""')}"`,
        `"${a.dateOfRecognition}"`,
        `"${a.calendarYear}"`,
        `"${(a.description || '').replace(/"/g, '""')}"`,
        `"${a.proofUrl || ''}"`
      ];
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CHRIST_Awards_Export_${selectedYear !== 'all' ? selectedYear : 'All_Years'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell currentPage="awards" onNavigate={onNavigate} hideSidebar={hideSidebar}>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Awards & Recognitions"
          description="Institutional tracking of faculty honors, fellowships, and recognitions from approved agencies"
          badge="Achievements"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={fetchAwards}
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

              {user?.role === 'admin' && (
                <Button
                  onClick={() => setIsClearDataOpen(true)}
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600 bg-red-50/50 hover:bg-red-50 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-2xs gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Clear Data</span>
                </Button>
              )}

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
                <span>Add Award</span>
              </Button>
            </div>
          }
        />

        {/* Dashboard KPI Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Awards"
            value={stats.totalAwards}
            badge="Institutional"
            subtitle={`${stats.activeDepartmentsCount} active departments`}
            icon={Trophy}
          />
          <StatCard
            title="Current Year Awards"
            value={stats.yearWise[new Date().getFullYear()] || 0}
            badge={String(new Date().getFullYear())}
            subtitle="Derived recognition calendar year"
            icon={Calendar}
          />
          <StatCard
            title="Recognised Categories"
            value={Object.keys(stats.agencyTypeWise).length}
            badge="Agency Types"
            subtitle="National, International, Govt, etc."
            icon={Globe}
          />
          <StatCard
            title="Top Recognising Agency"
            value={stats.topAgencies[0]?.count || 0}
            badge={stats.topAgencies[0]?.name ? `${stats.topAgencies[0].name.slice(0, 16)}...` : 'None'}
            subtitle="Highest granting organization"
            icon={Award}
          />
        </div>

        {/* Filter and Search Bar */}
        <Card className="border border-slate-200 shadow-2xs">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search recognition name, agency, faculty name, EmpID..."
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

                {/* Agency Type Filter */}
                <Select value={selectedAgencyType} onValueChange={setSelectedAgencyType}>
                  <SelectTrigger className="w-[160px] h-9 text-xs rounded-xl border-slate-200 truncate">
                    <SelectValue placeholder="All Agency Types" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">All Agency Types</SelectItem>
                    {agencyTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(searchQuery || selectedYear !== 'all' || selectedDept !== 'all' || selectedAgencyType !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedYear('all');
                      setSelectedDept('all');
                      setSelectedAgencyType('all');
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
                  <th className="py-3 px-3.5 min-w-[220px]">Name of Recognition</th>
                  <th className="py-3 px-3.5 min-w-[150px]">Recognised Agency Type</th>
                  <th className="py-3 px-3.5 min-w-[180px]">Recognising Agency Name</th>
                  <th className="py-3 px-3.5 min-w-[120px]">Recognition Date</th>
                  <th className="py-3 px-3.5 text-center min-w-[70px]">Year</th>
                  <th className="py-3 px-3.5 min-w-[160px]">Department</th>
                  <th className="py-3 px-3.5 text-right pr-4 min-w-[110px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#2855B9]" />
                      <span>Loading awards records...</span>
                    </td>
                  </tr>
                ) : awards.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <Trophy className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-700 text-sm">No awards records found</p>
                      <p className="text-xs text-slate-500 mt-0.5">Try adjusting your search criteria or add a new record.</p>
                    </td>
                  </tr>
                ) : (
                  awards.map((award, index) => (
                    <tr key={award.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3.5 text-center font-mono text-slate-400 text-[11px]">
                        {(page - 1) * 50 + index + 1}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-900 truncate max-w-[160px]" title={award.facultyName || award.faculty?.name || ''}>
                          {award.facultyName || award.faculty?.name || 'Unassigned Faculty'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          EmpID: <span className="font-bold text-slate-700">{award.employeeId}</span>
                          {(award.designation || award.faculty?.designation) && (
                            <span className="text-slate-400 font-sans ml-1">• {award.designation || award.faculty?.designation}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-900 leading-snug line-clamp-2 max-w-[240px]" title={award.nameOfRecognition}>
                          {award.nameOfRecognition}
                        </div>
                        {award.description && (
                          <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5" title={award.description}>
                            {award.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-200">
                          {award.recognisedAgencyType}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-800 truncate max-w-[180px]" title={award.recognisingAgencyName}>
                        {award.recognisingAgencyName}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                        {award.dateOfRecognition}
                      </td>
                      <td className="py-3 px-3.5 text-center font-mono font-bold text-slate-800">
                        {award.calendarYear}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="text-slate-700 truncate block max-w-[160px]" title={award.department || award.originalDepartment || ''}>
                          {award.department || award.originalDepartment || 'General'}
                        </span>
                        {award.departmentTransferred && (
                          <span className="text-[9px] text-amber-600 block mt-0.5 font-medium">
                            Now in: {award.currentDepartment}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right pr-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingAward(award)}
                            className="p-1 text-slate-500 hover:text-[#2855B9] hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(award)}
                            className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit Award"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAward(award.id)}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Award"
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
              <span>Showing Page {page} of {totalPages} ({totalCount} total awards)</span>
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
        {viewingAward && (
          <Dialog open={!!viewingAward} onOpenChange={() => setViewingAward(null)}>
            <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#2855B9]" />
                  <span>Award & Recognition Details</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Comprehensive record metadata and verified institutional faculty attribution
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Faculty Card */}
                <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      {viewingAward.facultyName || viewingAward.faculty?.name || 'Verified Faculty'}
                    </span>
                    <Badge variant="outline" className="bg-white text-blue-700 border-blue-300 font-mono text-[10px]">
                      EmpID: {viewingAward.employeeId}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-500">Designation: </span>
                      {viewingAward.designation || viewingAward.faculty?.designation || 'Not specified'}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-500">Original Dept: </span>
                      {viewingAward.department || viewingAward.originalDepartment || 'General'}
                    </div>
                    {viewingAward.departmentTransferred && (
                      <div className="col-span-2 text-amber-700 font-medium">
                        Current Department in Faculty Directory: {viewingAward.currentDepartment}
                      </div>
                    )}
                  </div>
                </div>

                {/* Award Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Name of Recognition</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">{viewingAward.nameOfRecognition}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Recognised Agency Type</span>
                    <span className="font-semibold text-blue-700 mt-0.5 block">{viewingAward.recognisedAgencyType}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Recognising Agency Name</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">{viewingAward.recognisingAgencyName}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Date of Recognition</span>
                    <span className="font-mono text-slate-800 mt-0.5 block">{viewingAward.dateOfRecognition}</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">System-Derived Calendar Year</span>
                    <span className="font-mono font-bold text-slate-900 mt-0.5 block">{viewingAward.calendarYear}</span>
                  </div>

                  {viewingAward.description && (
                    <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Description</span>
                      <p className="text-slate-700 mt-0.5 leading-relaxed">{viewingAward.description}</p>
                    </div>
                  )}

                  {viewingAward.proofUrl && (
                    <div className="col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Supporting Evidence / Proof URL</span>
                      <a
                        href={viewingAward.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2855B9] font-medium hover:underline inline-flex items-center gap-1 mt-1 break-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span>{viewingAward.proofUrl}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setViewingAward(null)} className="h-8 text-xs border-slate-200">
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
                <Trophy className="w-5 h-5 text-[#2855B9]" />
                <span>{editingAward ? 'Edit Award Record' : 'Add New Award Record'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Search and link exactly one faculty member, fill in recognition details, and save.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveAward} className="space-y-4 py-2 text-xs">
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

              {/* Name of Recognition */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Name of Recognition <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Distinguished Scientist Award, Best Paper Recognition..."
                  value={formRecognitionName}
                  onChange={e => setFormRecognitionName(e.target.value)}
                  className="h-9 text-xs rounded-lg border-slate-300"
                  required
                />
              </div>

              {/* Recognised Agency Type & Agency Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Recognised Agency Type <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={formAgencyType} onValueChange={setFormAgencyType}>
                    <SelectTrigger className="h-9 text-xs rounded-lg border-slate-300">
                      <SelectValue placeholder="Select Agency Type" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {agencyTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Recognising Agency Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    placeholder="e.g. IEEE India Council, UGC, DST... (optional)"
                    value={formAgencyName}
                    onChange={e => setFormAgencyName(e.target.value)}
                    className="h-9 text-xs rounded-lg border-slate-300"
                  />
                </div>
              </div>

              {/* Date of Recognition & Derived Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">
                    Date of Recognition <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={formDateOfRecognition}
                    onChange={e => setFormDateOfRecognition(e.target.value)}
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

              {/* Description */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Description <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Textarea
                  placeholder="Provide context, award scope, criteria, or notable milestones..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="text-xs rounded-lg border-slate-300 resize-none h-20"
                />
              </div>

              {/* Proof URL */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">
                  Supporting Evidence / Proof URL <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <Input
                  type="url"
                  placeholder="https://drive.google.com/... or institutional verification link"
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
                  {formLoading ? 'Saving...' : editingAward ? 'Update Award' : 'Save Award'}
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
            fetchAwards();
            fetchStats();
          }}
          uploadType="awards"
        />

        {/* Clear All Data Dialog (Admin Only) */}
        <ClearModuleDataDialog
          isOpen={isClearDataOpen}
          onClose={() => setIsClearDataOpen(false)}
          moduleName="Awards"
          apiEndpoint="/api/awards/clear-all"
          token={token || ''}
          onSuccess={() => {
            fetchAwards();
            fetchStats();
          }}
        />
      </div>
    </AppShell>
  );
}

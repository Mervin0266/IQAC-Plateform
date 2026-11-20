import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  GraduationCap, Calendar, Building2, CheckCircle2, Plus, Search,
  Trash2, Edit, Eye, Download, AlertCircle, Upload, X, ExternalLink,
  Layers, RefreshCw, Clock, UserCheck, Award, Users
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useAuth } from '../contexts/AuthContext';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';
import { AppShell, PageHeader, StatCard } from './design-system';
import { BulkUploadDialog } from './BulkUploadDialog';
import { ClearModuleDataDialog } from './ClearModuleDataDialog';

export interface Contributor {
  id?: string;
  facultyId?: string | null;
  employeeId?: string | null;
  normalizedEmployeeId?: string | null;
  facultyName?: string | null;
  name?: string | null;
  designation?: string | null;
  department?: string | null;
  contributorType?: string;
  isGuestFaculty?: boolean;
  role?: string;
}

export interface ProfessionalDevelopmentItem {
  id: string;
  title: string;
  startDate: string;
  endDate?: string | null;
  durationDays?: number | null;
  organizedBy?: string | null;
  organizationName?: string | null;
  programType?: string | null;
  role?: string | null;
  proofUrl?: string | null;
  calendarYear: number;
  department?: string | null;
  school?: string | null;
  campus?: string | null;
  facultyAssociations?: Contributor[];
  createdAt?: string;
}

interface ProfessionalDevelopmentsPageProps {
  onNavigate: (page: string) => void;
  hideSidebar?: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PROGRAM_TYPES = [
  'Faculty Development Programme (FDP)',
  'Workshop',
  'MOOC',
  'Training Programme',
  'Quality Improvement Programme (QIP)',
  'Short Term Training Programme (STTP)',
  'Staff Training',
  'Staff Induction',
  'Staff Orientation',
  'Research Colloquium',
  'Other'
];

const ROLES = [
  'Participant',
  'Resource Person',
  'Keynote Speaker',
  'Coordinator',
  'Convener',
  'Co-Coordinator',
  'Organizing Committee Member',
  'Other'
];

export const ProfessionalDevelopmentsPage: React.FC<ProfessionalDevelopmentsPageProps> = ({
  onNavigate,
  hideSidebar = false
}) => {
  const { user, logout } = useAuth();
  const rawToken = user?.token || (() => {
    try {
      const u = localStorage.getItem('iqac_user');
      return u ? JSON.parse(u)?.token : null;
    } catch {
      return null;
    }
  })() || localStorage.getItem('token') || '';
  const token = rawToken && rawToken !== 'undefined' && rawToken !== 'null' ? rawToken : '';
  const { departments = [] } = useAcademicHierarchy();

  const [records, setRecords] = useState<ProfessionalDevelopmentItem[]>([]);
  const [stats, setStats] = useState({
    totalProgrammes: 0,
    totalProgrammeDays: 0,
    missingDurationCount: 0,
    participatingFaculty: 0,
    guestFacultyCount: 0,
    activeDepartments: 0,
    totalCount: 0,
    totalDurationDays: 0,
    departmentWise: {} as Record<string, number>,
    programTypeWise: {} as Record<string, number>,
    yearWise: {} as Record<string, number>
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedProgramType, setSelectedProgramType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Dialogs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isClearDataOpen, setIsClearDataOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ProfessionalDevelopmentItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    contributorName: '',
    employeeId: '',
    title: '',
    startDate: '',
    endDate: '',
    durationDays: '',
    organizedBy: '',
    organizationName: '',
    programType: 'Faculty Development Programme (FDP)',
    role: 'Participant',
    proofUrl: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const query = new URLSearchParams();
      if (selectedYear !== 'all') query.set('calendarYear', selectedYear);
      if (selectedDept !== 'all') query.set('department', selectedDept);
      if (selectedProgramType !== 'all') query.set('programType', selectedProgramType);
      if (searchTerm) query.set('search', searchTerm);

      const res = await fetch(`${API_BASE}/api/professional-developments/stats?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const data = await res.json();
      if (data.success && (data.stats || data.data)) {
        setStats(data.stats || data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [token, selectedYear, selectedDept, selectedProgramType, searchTerm, logout]);

  const fetchRecords = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (selectedYear !== 'all') query.set('calendarYear', selectedYear);
      if (selectedDept !== 'all') query.set('department', selectedDept);
      if (selectedProgramType !== 'all') query.set('programType', selectedProgramType);
      if (searchTerm) query.set('search', searchTerm);

      const res = await fetch(`${API_BASE}/api/professional-developments?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const data = await res.json();
      if (data.success) {
        setRecords(data.rows || []);
      } else {
        setError(data.message || 'Failed to load records.');
      }
    } catch (err: any) {
      setError(err.message || 'Error connecting to server.');
    } finally {
      setLoading(false);
    }
  }, [token, selectedYear, selectedDept, selectedProgramType, searchTerm, logout]);

  useEffect(() => {
    fetchStats();
    fetchRecords();
  }, [fetchStats, fetchRecords]);

  const handleOpenAdd = () => {
    setSelectedRecord(null);
    setFormData({
      contributorName: '',
      employeeId: '',
      title: '',
      startDate: '',
      endDate: '',
      durationDays: '',
      organizedBy: '',
      organizationName: '',
      programType: 'Faculty Development Programme (FDP)',
      role: 'Participant',
      proofUrl: ''
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (record: ProfessionalDevelopmentItem) => {
    setSelectedRecord(record);
    const firstContrib = record.facultyAssociations?.[0];
    setFormData({
      contributorName: firstContrib?.facultyName || firstContrib?.name || '',
      employeeId: firstContrib?.employeeId || '',
      title: record.title || '',
      startDate: record.startDate ? record.startDate.substring(0, 10) : '',
      endDate: record.endDate ? record.endDate.substring(0, 10) : '',
      durationDays: record.durationDays != null ? String(record.durationDays) : '',
      organizedBy: record.organizedBy || '',
      organizationName: record.organizationName || '',
      programType: record.programType || 'Faculty Development Programme (FDP)',
      role: record.role || firstContrib?.role || 'Participant',
      proofUrl: record.proofUrl || ''
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.title.trim()) errs.title = 'Name of the Programme is required.';
    if (!formData.startDate) errs.startDate = 'Start Date is required.';
    if (formData.proofUrl && !/^https?:\/\//i.test(formData.proofUrl)) {
      errs.proofUrl = 'Proof URL must start with http:// or https://';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload: any = {
        title: formData.title.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        durationDays: formData.durationDays ? parseInt(formData.durationDays, 10) : null,
        organizedBy: formData.organizedBy.trim() || null,
        organizationName: formData.organizationName.trim() || null,
        programType: formData.programType,
        role: formData.role,
        proofUrl: formData.proofUrl.trim() || null,
        contributors: []
      };

      if (formData.employeeId.trim() || formData.contributorName.trim()) {
        payload.contributors.push({
          employeeId: formData.employeeId.trim() || null,
          name: formData.contributorName.trim() || null,
          role: formData.role
        });
      }

      const url = selectedRecord
        ? `${API_BASE}/api/professional-developments/${selectedRecord.id}`
        : `${API_BASE}/api/professional-developments`;
      const method = selectedRecord ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const data = await res.json();
      if (data.success) {
        setIsFormOpen(false);
        fetchStats();
        fetchRecords();
      } else {
        setFormErrors({ submit: data.message || 'Failed to save record.' });
      }
    } catch (err: any) {
      setFormErrors({ submit: err.message || 'Network error saving record.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/professional-developments/${selectedRecord.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        logout();
        return;
      }
      const data = await res.json();
      if (data.success) {
        setIsDeleteOpen(false);
        setSelectedRecord(null);
        fetchStats();
        fetchRecords();
      } else {
        alert(data.message || 'Failed to delete record.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  const availableYears = useMemo(() => {
    const years = Object.keys(stats.yearWise || {}).sort((a, b) => Number(b) - Number(a));
    if (years.length === 0) {
      const current = new Date().getFullYear();
      return [current, current - 1, current - 2];
    }
    return years;
  }, [stats.yearWise]);

  return (
    <AppShell currentPage="professional-developments" onNavigate={onNavigate} hideSidebar={hideSidebar}>
      <div className="space-y-6">
        <PageHeader
          title="Professional Developments"
          description="Track faculty development programmes, workshops, orientation, and refresher courses with verified contributor classification."
          breadcrumbs={[
            { label: 'Faculty Management', onClick: () => onNavigate('faculty-details') },
            { label: 'Professional Developments' }
          ]}
          actions={
            <div className="flex items-center gap-2">
              {user?.role === 'admin' && (
                <Button
                  variant="outline"
                  onClick={() => setIsClearDataOpen(true)}
                  className="gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Data
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setIsBulkOpen(true)}
                className="gap-2 border-[#1E3A8A] text-[#1E3A8A] hover:bg-blue-50 font-semibold"
              >
                <Upload className="w-4 h-4" />
                Bulk Upload
              </Button>
              <Button
                onClick={handleOpenAdd}
                className="gap-2 bg-[#1E3A8A] hover:bg-[#152a65] text-white font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add Programme
              </Button>
            </div>
          }
        />

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Programmes"
            value={stats.totalProgrammes !== undefined ? stats.totalProgrammes : (stats.totalCount || 0)}
            icon={GraduationCap}
            subtitle="Programmes attended & organized"
          />
          <StatCard
            title="Total Programme Days"
            value={stats.totalProgrammeDays !== undefined ? stats.totalProgrammeDays : (stats.totalDurationDays || 0)}
            icon={Clock}
            subtitle={stats.missingDurationCount ? `Missing duration in ${stats.missingDurationCount} programmes` : "Cumulative duration in days"}
          />
          <StatCard
            title="Participating Faculty"
            value={stats.participatingFaculty || 0}
            icon={Users}
            subtitle={stats.guestFacultyCount ? `${stats.guestFacultyCount} external / guest contributors` : "Distinct verified faculty"}
          />
          <StatCard
            title="Active Departments"
            value={stats.activeDepartments !== undefined ? stats.activeDepartments : Object.keys(stats.departmentWise || {}).length}
            icon={Building2}
            subtitle="Participating academic units"
          />
        </div>

        {/* Filter & Search Bar */}
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Search programme, faculty, org..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Calendar Year (Start Date)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Calendar Years</SelectItem>
                  {availableYears.map(yr => (
                    <SelectItem key={yr} value={String(yr)}>{yr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id || d.name} value={d.name}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedProgramType} onValueChange={setSelectedProgramType}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Programme Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programme Types</SelectItem>
                  {PROGRAM_TYPES.map(pt => (
                    <SelectItem key={pt} value={pt}>{pt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#1E3A8A]" />
                <p className="text-xs">Loading professional development records...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-rose-600 space-y-3 max-w-md mx-auto">
                <AlertCircle className="w-8 h-8 mx-auto text-rose-500" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{error}</p>
                  {error.toLowerCase().includes('token') && (
                    <p className="text-xs text-slate-500">Your session token has expired or is invalid. Please log in again to renew your credentials.</p>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Button size="sm" variant="outline" onClick={fetchRecords}>Retry</Button>
                  {error.toLowerCase().includes('token') && (
                    <Button size="sm" className="bg-[#1E3A8A] text-white hover:bg-[#152865]" onClick={logout}>Sign In Again</Button>
                  )}
                </div>
              </div>
            ) : records.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <GraduationCap className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-medium">No professional development records found.</p>
                <Button size="sm" onClick={handleOpenAdd} className="bg-[#1E3A8A] text-white">
                  Add First Record
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Programme Details</th>
                      <th className="py-3 px-4">Faculty Contributor(s)</th>
                      <th className="py-3 px-4">Programme Type & Role</th>
                      <th className="py-3 px-4">Start Date (Cal Year)</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Organization</th>
                      <th className="py-3 px-4">Proof</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((r) => {
                      const contribs = r.facultyAssociations || [];
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 max-w-[280px]">
                            <div className="font-semibold text-slate-900 line-clamp-2" title={r.title}>
                              {r.title}
                            </div>
                            {r.department && (
                              <div className="text-[11px] text-slate-500 mt-0.5">{r.department}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 max-w-[240px]">
                            {contribs.length === 0 ? (
                              <span className="text-slate-400 italic">No contributor linked</span>
                            ) : (
                              <div className="space-y-1">
                                {contribs.map((c, i) => (
                                  <div key={c.id || i} className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-slate-800">
                                      {c.facultyName || c.name || 'Unnamed'}
                                    </span>
                                    {c.employeeId && (
                                      <span className="text-[10px] text-slate-400 font-mono">({c.employeeId})</span>
                                    )}
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] px-1.5 py-0 h-4 ${
                                        c.isGuestFaculty || c.contributorType === 'Guest Faculty'
                                          ? 'border-amber-400 text-amber-700 bg-amber-50'
                                          : c.contributorType === 'Unverified Faculty'
                                          ? 'border-rose-400 text-rose-700 bg-rose-50'
                                          : 'border-emerald-400 text-emerald-700 bg-emerald-50'
                                      }`}
                                    >
                                      {c.isGuestFaculty ? 'Guest' : (c.contributorType || 'Verified')}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-800">{r.programType || '—'}</div>
                            {r.role && <div className="text-[11px] text-slate-500">Role: {r.role}</div>}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-slate-800">{r.startDate || '—'}</div>
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                              {r.calendarYear}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {r.durationDays != null ? (
                              <span className="font-semibold text-slate-700">{r.durationDays} Days</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 max-w-[200px] truncate" title={r.organizationName || r.organizedBy || ''}>
                            {r.organizationName || r.organizedBy || '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            {r.proofUrl ? (
                              <a
                                href={r.proofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 font-medium"
                              >
                                View <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setSelectedRecord(r); setIsViewOpen(true); }}
                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEdit(r)}
                                className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setSelectedRecord(r); setIsDeleteOpen(true); }}
                                className="h-7 w-7 p-0 text-rose-600 hover:text-rose-800"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Modal */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {selectedRecord ? 'Edit Professional Development Programme' : 'Add Professional Development Programme'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Enter program details, manually enter duration in days, and link faculty contributor.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4 pt-2">
              {formErrors.submit && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formErrors.submit}</span>
                </div>
              )}

              {/* Section 1: Contributor Details */}
              <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#1E3A8A]" />
                  Faculty Contributor Identification
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Contributor Name</Label>
                    <Input
                      placeholder="e.g. Dr. Ramesh Kumar"
                      value={formData.contributorName}
                      onChange={(e) => setFormData({ ...formData, contributorName: e.target.value })}
                      className="text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Employee ID (EmpID)</Label>
                    <Input
                      placeholder="e.g. 1028 (leave blank if Guest)"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      className="text-xs mt-1"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      EmpID matched with Faculty Details becomes Verified Faculty.
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Programme Details */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Name of the Programme <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    placeholder="e.g. Two-Week Online FDP on Generative AI & Deep Learning Applications"
                    rows={2}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="text-xs mt-1"
                  />
                  {formErrors.title && <span className="text-rose-500 text-[11px]">{formErrors.title}</span>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Start Date <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="text-xs mt-1"
                    />
                    {formErrors.startDate && <span className="text-rose-500 text-[11px]">{formErrors.startDate}</span>}
                    <span className="text-[10px] text-slate-400 block mt-0.5">Calendar year derived from Start Date</span>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">End Date (Optional)</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Duration (In Days)
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g. 14 (Manual entry)"
                      value={formData.durationDays}
                      onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                      className="text-xs mt-1 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Enter exact total days manually</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Programme Type</Label>
                    <Select
                      value={formData.programType}
                      onValueChange={(val) => setFormData({ ...formData, programType: val })}
                    >
                      <SelectTrigger className="text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROGRAM_TYPES.map(pt => (
                          <SelectItem key={pt} value={pt}>{pt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(val) => setFormData({ ...formData, role: val })}
                    >
                      <SelectTrigger className="text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Organized By (Entity / Unit)</Label>
                    <Input
                      placeholder="e.g. Center for Research, CHRIST (Deemed to be University)"
                      value={formData.organizedBy}
                      onChange={(e) => setFormData({ ...formData, organizedBy: e.target.value })}
                      className="text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Organisation Name (Host Institute)</Label>
                    <Input
                      placeholder="e.g. IIT Madras, AICTE, NPTEL"
                      value={formData.organizationName}
                      onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                      className="text-xs mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Proof URL (Certificate / Verification)</Label>
                  <Input
                    placeholder="https://drive.google.com/... or https://..."
                    value={formData.proofUrl}
                    onChange={(e) => setFormData({ ...formData, proofUrl: e.target.value })}
                    className="text-xs mt-1"
                  />
                  {formErrors.proofUrl && <span className="text-rose-500 text-[11px]">{formErrors.proofUrl}</span>}
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#1E3A8A] text-white" disabled={submitting}>
                  {submitting ? 'Saving...' : selectedRecord ? 'Update Programme' : 'Save Programme'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Details Modal */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Programme Details
              </DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4 py-2 text-xs">
                <div>
                  <span className="text-slate-400 uppercase font-semibold block text-[10px]">Programme Title</span>
                  <p className="font-semibold text-slate-800 text-sm mt-0.5">{selectedRecord.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">Start Date (Calendar Year)</span>
                    <span className="font-medium text-slate-700">{selectedRecord.startDate} ({selectedRecord.calendarYear})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">End Date</span>
                    <span className="font-medium text-slate-700">{selectedRecord.endDate || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">Duration (In Days)</span>
                    <span className="font-medium text-slate-700">{selectedRecord.durationDays != null ? `${selectedRecord.durationDays} Days` : '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">Programme Type</span>
                    <span className="font-medium text-slate-700">{selectedRecord.programType || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">Role</span>
                    <span className="font-medium text-slate-700">{selectedRecord.role || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">Organisation Name</span>
                    <span className="font-medium text-slate-700">{selectedRecord.organizationName || selectedRecord.organizedBy || '—'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 uppercase font-semibold block text-[10px] mb-1.5">Contributors</span>
                  <div className="space-y-1.5">
                    {(selectedRecord.facultyAssociations || []).map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200">
                        <div>
                          <span className="font-semibold text-slate-800">{c.facultyName || c.name || 'Unnamed'}</span>
                          {c.employeeId && <span className="text-slate-400 font-mono ml-1.5">({c.employeeId})</span>}
                          {c.department && <div className="text-[10px] text-slate-500">{c.department}</div>}
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            c.isGuestFaculty || c.contributorType === 'Guest Faculty'
                              ? 'border-amber-400 text-amber-700 bg-amber-50'
                              : 'border-emerald-400 text-emerald-700 bg-emerald-50'
                          }`}
                        >
                          {c.isGuestFaculty ? 'Guest Faculty' : (c.contributorType || 'Verified Faculty')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedRecord.proofUrl && (
                  <div>
                    <span className="text-slate-400 uppercase font-semibold block text-[10px]">Proof Link</span>
                    <a
                      href={selectedRecord.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 font-medium mt-0.5 break-all"
                    >
                      {selectedRecord.proofUrl} <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setIsViewOpen(false)} className="bg-slate-800 text-white text-xs">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Delete Programme Record
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 pt-1">
                Are you sure you want to permanently delete "{selectedRecord?.title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-3">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700 text-white" disabled={submitting}>
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Upload Dialog */}
        <BulkUploadDialog
          isOpen={isBulkOpen}
          onClose={() => setIsBulkOpen(false)}
          token={token}
          uploadType="professional-developments"
          onSuccess={() => {
            fetchStats();
            fetchRecords();
          }}
        />

        {/* Clear All Data Dialog (Admin Only) */}
        <ClearModuleDataDialog
          isOpen={isClearDataOpen}
          onClose={() => setIsClearDataOpen(false)}
          moduleName="Professional Developments"
          apiEndpoint="/api/professional-developments/clear-all"
          token={token || ''}
          onSuccess={() => {
            fetchStats();
            fetchRecords();
          }}
        />
      </div>
    </AppShell>
  );
};

export default ProfessionalDevelopmentsPage;

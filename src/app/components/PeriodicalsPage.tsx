import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Newspaper, Calendar, Building2, CheckCircle2, Plus, Search,
  Trash2, Edit, Eye, Upload, ExternalLink, RefreshCw, UserCheck, Globe, BookOpen, AlertCircle
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

export interface PeriodicalItem {
  id: string;
  periodicalName: string;
  publicationDate: string;
  calendarYear: number;
  publicationType?: string | null;
  periodicalType?: string | null;
  url?: string | null;
  proofUrl?: string | null;
  department?: string | null;
  school?: string | null;
  campus?: string | null;
  facultyAssociations?: Contributor[];
  createdAt?: string;
}

interface PeriodicalsPageProps {
  onNavigate: (page: string) => void;
  hideSidebar?: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PUBLICATION_TYPES = [
  'Newspaper Article / Op-Ed',
  'Magazine Article',
  'Newsletter',
  'Institutional Bulletin',
  'Web Column / Blog',
  'Trade / Industry Journal',
  'Monograph / Commentary',
  'Other'
];

const PERIODICAL_TYPES = [
  'National',
  'International',
  'Regional / State',
  'Local',
  'Institutional'
];

export const PeriodicalsPage: React.FC<PeriodicalsPageProps> = ({
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

  const [records, setRecords] = useState<PeriodicalItem[]>([]);
  const [stats, setStats] = useState({
    totalCount: 0,
    departmentWise: {} as Record<string, number>,
    periodicalTypeWise: {} as Record<string, number>,
    publicationTypeWise: {} as Record<string, number>,
    yearWise: {} as Record<string, number>
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedPeriodicalType, setSelectedPeriodicalType] = useState<string>('all');
  const [selectedPublicationType, setSelectedPublicationType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Dialogs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isClearDataOpen, setIsClearDataOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PeriodicalItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    contributorName: '',
    employeeId: '',
    periodicalName: '',
    publicationDate: '',
    publicationType: 'Newspaper Article / Op-Ed',
    periodicalType: 'National',
    url: '',
    proofUrl: '',
    role: 'Author'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/periodicals/stats`, {
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
      console.error('Failed to fetch periodicals stats:', err);
    }
  }, [token, logout]);

  const fetchRecords = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (selectedYear !== 'all') query.set('calendarYear', selectedYear);
      if (selectedDept !== 'all') query.set('department', selectedDept);
      if (selectedPeriodicalType !== 'all') query.set('periodicalType', selectedPeriodicalType);
      if (selectedPublicationType !== 'all') query.set('publicationType', selectedPublicationType);
      if (searchTerm) query.set('search', searchTerm);

      const res = await fetch(`${API_BASE}/api/periodicals?${query.toString()}`, {
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
  }, [token, selectedYear, selectedDept, selectedPeriodicalType, selectedPublicationType, searchTerm, logout]);

  useEffect(() => {
    fetchStats();
    fetchRecords();
  }, [fetchStats, fetchRecords]);

  const handleOpenAdd = () => {
    setSelectedRecord(null);
    setFormData({
      contributorName: '',
      employeeId: '',
      periodicalName: '',
      publicationDate: '',
      publicationType: 'Newspaper Article / Op-Ed',
      periodicalType: 'National',
      url: '',
      proofUrl: '',
      role: 'Author'
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (record: PeriodicalItem) => {
    setSelectedRecord(record);
    const firstContrib = record.facultyAssociations?.[0];
    setFormData({
      contributorName: firstContrib?.facultyName || firstContrib?.name || '',
      employeeId: firstContrib?.employeeId || '',
      periodicalName: record.periodicalName || '',
      publicationDate: record.publicationDate ? record.publicationDate.substring(0, 10) : '',
      publicationType: record.publicationType || 'Newspaper Article / Op-Ed',
      periodicalType: record.periodicalType || 'National',
      url: record.url || '',
      proofUrl: record.proofUrl || '',
      role: firstContrib?.role || 'Author'
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.periodicalName.trim()) errs.periodicalName = 'Periodical Name / Title of Article is required.';
    if (!formData.publicationDate) errs.publicationDate = 'Publication Date is required.';
    if (formData.url && !/^https?:\/\//i.test(formData.url)) {
      errs.url = 'Article URL must start with http:// or https://';
    }
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
        periodicalName: formData.periodicalName.trim(),
        publicationDate: formData.publicationDate,
        publicationType: formData.publicationType,
        periodicalType: formData.periodicalType,
        url: formData.url.trim() || null,
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
        ? `${API_BASE}/api/periodicals/${selectedRecord.id}`
        : `${API_BASE}/api/periodicals`;
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
        setFormErrors({ submit: data.message || 'Failed to save periodical.' });
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
      const res = await fetch(`${API_BASE}/api/periodicals/${selectedRecord.id}`, {
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
    <AppShell currentPage="periodicals" onNavigate={onNavigate} hideSidebar={hideSidebar}>
      <div className="space-y-6">
        <PageHeader
          title="Periodicals"
          description="Track faculty contributions to newspapers, magazines, newsletters, and institutional periodicals with online article links."
          breadcrumbs={[
            { label: 'Achievements', onClick: () => onNavigate('awards') },
            { label: 'Periodicals' }
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
                Add Periodical
              </Button>
            </div>
          }
        />

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Periodicals"
            value={stats.totalCount || 0}
            icon={Newspaper}
            subtitle="Articles, op-eds & columns"
          />
          <StatCard
            title="Active Departments"
            value={Object.keys(stats.departmentWise || {}).length}
            icon={Building2}
            subtitle="Contributing departments"
          />
          <StatCard
            title="National / International"
            value={(stats.periodicalTypeWise?.National || 0) + (stats.periodicalTypeWise?.International || 0)}
            icon={Globe}
            subtitle="High-reach media publications"
          />
          <StatCard
            title="Calendar Years Active"
            value={Object.keys(stats.yearWise || {}).length}
            icon={Calendar}
            subtitle="Derived from publication date"
          />
        </div>

        {/* Filters & Search */}
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Search periodical, author, topic..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Calendar Year" />
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

              <Select value={selectedPeriodicalType} onValueChange={setSelectedPeriodicalType}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Scope / Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {PERIODICAL_TYPES.map(pt => (
                    <SelectItem key={pt} value={pt}>{pt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#1E3A8A]" />
                <p className="text-xs">Loading periodicals...</p>
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
                <Newspaper className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-medium">No periodical articles recorded yet.</p>
                <Button size="sm" onClick={handleOpenAdd} className="bg-[#1E3A8A] text-white">
                  Add First Periodical
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Periodical / Article Name</th>
                      <th className="py-3 px-4">Author(s) / Contributor</th>
                      <th className="py-3 px-4">Publication Date (Year)</th>
                      <th className="py-3 px-4">Publication Type</th>
                      <th className="py-3 px-4">Scope</th>
                      <th className="py-3 px-4">Online Article</th>
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
                            <div className="font-semibold text-slate-900 line-clamp-2" title={r.periodicalName}>
                              {r.periodicalName}
                            </div>
                            {r.department && (
                              <div className="text-[11px] text-slate-500 mt-0.5">{r.department}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 max-w-[240px]">
                            {contribs.length === 0 ? (
                              <span className="text-slate-400 italic">No author linked</span>
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
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-slate-800">{r.publicationDate || '—'}</div>
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                              {r.calendarYear}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-slate-800">{r.publicationType || '—'}</span>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                              {r.periodicalType || '—'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {r.url ? (
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 font-medium"
                              >
                                Read Article <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {r.proofUrl ? (
                              <a
                                href={r.proofUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 font-medium"
                              >
                                Proof <ExternalLink className="w-3 h-3" />
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
          <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {selectedRecord ? 'Edit Periodical Article' : 'Add Periodical Article'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Enter article title, publication date, URL, and link faculty contributor.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4 pt-2">
              {formErrors.submit && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formErrors.submit}</span>
                </div>
              )}

              {/* Contributor Section */}
              <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#1E3A8A]" />
                  Author / Contributor Identification
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Author Name</Label>
                    <Input
                      placeholder="e.g. Dr. Rajesh Kumar"
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

              {/* Periodical Details */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Periodical Name / Title of Article <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    placeholder="e.g. The Indian Express: The Ethical Frontiers of Artificial Intelligence"
                    rows={2}
                    value={formData.periodicalName}
                    onChange={(e) => setFormData({ ...formData, periodicalName: e.target.value })}
                    className="text-xs mt-1"
                  />
                  {formErrors.periodicalName && <span className="text-rose-500 text-[11px]">{formErrors.periodicalName}</span>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">
                      Publication Date <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={formData.publicationDate}
                      onChange={(e) => setFormData({ ...formData, publicationDate: e.target.value })}
                      className="text-xs mt-1"
                    />
                    {formErrors.publicationDate && <span className="text-rose-500 text-[11px]">{formErrors.publicationDate}</span>}
                    <span className="text-[10px] text-slate-400 block mt-0.5">Calendar year derived strictly from date</span>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Publication Type</Label>
                    <Select
                      value={formData.publicationType}
                      onValueChange={(val) => setFormData({ ...formData, publicationType: val })}
                    >
                      <SelectTrigger className="text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PUBLICATION_TYPES.map(pt => (
                          <SelectItem key={pt} value={pt}>{pt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Type of Periodical</Label>
                    <Select
                      value={formData.periodicalType}
                      onValueChange={(val) => setFormData({ ...formData, periodicalType: val })}
                    >
                      <SelectTrigger className="text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIODICAL_TYPES.map(pt => (
                          <SelectItem key={pt} value={pt}>{pt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Online Article URL (Opens in new tab)</Label>
                  <Input
                    placeholder="https://indianexpress.com/article/... or https://..."
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="text-xs mt-1"
                  />
                  {formErrors.url && <span className="text-rose-500 text-[11px]">{formErrors.url}</span>}
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Proof URL (Scan / PDF link)</Label>
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
                  {submitting ? 'Saving...' : selectedRecord ? 'Update Periodical' : 'Save Periodical'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Modal */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Periodical Article Details
              </DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4 py-2 text-xs">
                <div>
                  <span className="text-slate-400 uppercase font-semibold block text-[10px]">Article / Periodical Title</span>
                  <p className="font-semibold text-slate-800 text-sm mt-0.5">{selectedRecord.periodicalName}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">Publication Date (Calendar Year)</span>
                    <span className="font-medium text-slate-700">{selectedRecord.publicationDate} ({selectedRecord.calendarYear})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">Publication Type</span>
                    <span className="font-medium text-slate-700">{selectedRecord.publicationType || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">Type of Periodical</span>
                    <span className="font-medium text-slate-700">{selectedRecord.periodicalType || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">Department</span>
                    <span className="font-medium text-slate-700">{selectedRecord.department || '—'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 uppercase font-semibold block text-[10px] mb-1.5">Authors</span>
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

                {selectedRecord.url && (
                  <div>
                    <span className="text-slate-400 uppercase font-semibold block text-[10px]">Online Article URL</span>
                    <a
                      href={selectedRecord.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 font-medium mt-0.5 break-all"
                    >
                      {selectedRecord.url} <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  </div>
                )}

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

        {/* Delete Modal */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Delete Periodical
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 pt-1">
                Are you sure you want to permanently delete "{selectedRecord?.periodicalName}"?
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
          uploadType="periodicals"
          onSuccess={() => {
            fetchStats();
            fetchRecords();
          }}
        />

        {/* Clear All Data Dialog (Admin Only) */}
        <ClearModuleDataDialog
          isOpen={isClearDataOpen}
          onClose={() => setIsClearDataOpen(false)}
          moduleName="Periodicals"
          apiEndpoint="/api/periodicals/clear-all"
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

export default PeriodicalsPage;

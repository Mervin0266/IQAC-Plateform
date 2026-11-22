import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Mic, Building2, CheckCircle2, Plus, Search, Trash2, Edit, Eye,
  AlertCircle, Upload, ExternalLink, RefreshCw, UserCheck, Radio, Presentation, Users
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
import { AppShell, PageHeader, StatCard, MetricBreakdownData } from './design-system';
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

export interface InvitedTalkItem {
  id: string;
  title: string;
  programType?: string | null;
  organization?: string | null;
  media?: string | null;
  proofUrl?: string | null;
  department?: string | null;
  school?: string | null;
  campus?: string | null;
  facultyAssociations?: Contributor[];
  createdAt?: string;
}

interface InvitedTalksPageProps {
  onNavigate: (page: string) => void;
  hideSidebar?: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PROGRAM_TYPES = [
  'FDP',
  'QIP',
  'WORKSHOP',
  'SEMINAR',
  'RESEARCH COLLOQUIUM',
  'OTHERS'
];

const MEDIA_TYPES = [
  'In-Person / Offline',
  'Online / Virtual (Zoom, Teams, Meet)',
  'Hybrid',
  'Television Broadcast',
  'Radio / Podcast',
  'Print Media / Interview',
  'Other'
];

export const InvitedTalksPage: React.FC<InvitedTalksPageProps> = ({
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

  const [records, setRecords] = useState<InvitedTalkItem[]>([]);
  const [stats, setStats] = useState({
    totalTalks: 0,
    uniqueOrganizations: 0,
    participatingFaculty: 0,
    guestFacultyCount: 0,
    unverifiedFacultyCount: 0,
    mediaTypesCount: 0,
    totalCount: 0,
    departmentWise: {} as Record<string, number>,
    programTypeWise: {} as Record<string, number>,
    mediaWise: {} as Record<string, number>,
    programTypeDistribution: [] as { name: string; count: number }[],
    organizationWise: {} as Record<string, number>,
    facultyByDept: {} as Record<string, number>
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters (STRICT RULE: NO DATE OR YEAR FILTERS!)
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedProgramType, setSelectedProgramType] = useState<string>('all');
  const [selectedMedia, setSelectedMedia] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Dialogs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isClearDataOpen, setIsClearDataOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<InvitedTalkItem | null>(null);

  // Form State (STRICT RULE: NO DATE FIELDS!)
  const [formData, setFormData] = useState({
    contributorName: '',
    employeeId: '',
    title: '',
    programType: 'FDP',
    organization: '',
    media: 'In-Person / Offline',
    proofUrl: '',
    role: 'Keynote / Speaker'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const query = new URLSearchParams();
      if (selectedDept !== 'all') query.set('department', selectedDept);
      if (selectedProgramType !== 'all') query.set('programType', selectedProgramType);
      if (selectedMedia !== 'all') query.set('media', selectedMedia);
      if (searchTerm) query.set('search', searchTerm);

      const res = await fetch(`${API_BASE}/api/invited-talks/stats?${query.toString()}`, {
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
      console.error('Failed to fetch invited talks stats:', err);
    }
  }, [token, selectedDept, selectedProgramType, selectedMedia, searchTerm, logout]);

  const fetchRecords = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (selectedDept !== 'all') query.set('department', selectedDept);
      if (selectedProgramType !== 'all') query.set('programType', selectedProgramType);
      if (selectedMedia !== 'all') query.set('media', selectedMedia);
      if (searchTerm) query.set('search', searchTerm);

      const res = await fetch(`${API_BASE}/api/invited-talks?${query.toString()}`, {
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
  }, [token, selectedDept, selectedProgramType, selectedMedia, searchTerm, logout]);

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
      programType: 'Guest Lecture',
      organization: '',
      media: 'In-Person / Offline',
      proofUrl: '',
      role: 'Keynote / Speaker'
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (record: InvitedTalkItem) => {
    setSelectedRecord(record);
    const firstContrib = record.facultyAssociations?.[0];
    setFormData({
      contributorName: firstContrib?.facultyName || firstContrib?.name || '',
      employeeId: firstContrib?.employeeId || '',
      title: record.title || '',
      programType: record.programType || 'Guest Lecture',
      organization: record.organization || '',
      media: record.media || 'In-Person / Offline',
      proofUrl: record.proofUrl || '',
      role: firstContrib?.role || 'Keynote / Speaker'
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.title.trim()) errs.title = 'Title of the Lecture / Speech / Talk is required.';
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
        programType: formData.programType,
        organization: formData.organization.trim() || null,
        media: formData.media,
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
        ? `${API_BASE}/api/invited-talks/${selectedRecord.id}`
        : `${API_BASE}/api/invited-talks`;
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
        setFormErrors({ submit: data.message || 'Failed to save talk.' });
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
      const res = await fetch(`${API_BASE}/api/invited-talks/${selectedRecord.id}`, {
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

  const itCardBreakdowns = useMemo(() => {
    const totalTalks = stats.totalTalks !== undefined ? stats.totalTalks : (stats.totalCount || 0);
    const totalOrgs = stats.uniqueOrganizations || 0;
    const totalFac = stats.participatingFaculty || 0;
    const totalMedia = stats.mediaTypesCount !== undefined ? stats.mediaTypesCount : Object.keys(stats.mediaWise || {}).length;

    const progTypeDist: Array<{ name: string; count: number }> = stats.programTypeDistribution || [];
    const deptWise: Record<string, number> = stats.departmentWise || {};
    const orgWise: Record<string, number> = stats.organizationWise || {};
    const mediaWise: Record<string, number> = stats.mediaWise || {};
    const facultyByDept: Record<string, number> = stats.facultyByDept || {};

    // 1. Total Invited Talks Breakdown
    const totalInvitedTalksBreakdown: MetricBreakdownData = {
      title: 'Total Invited Talks & Keynotes',
      subtitle: 'Talk Distribution by Programme Type',
      badge: `${totalTalks} Talks`,
      sections: [
        {
          title: 'Programme Type Categories',
          items: progTypeDist.length > 0
            ? progTypeDist.map(pt => ({
                label: pt.name,
                value: `${pt.count} talks`,
                subtext: `${totalTalks > 0 ? ((pt.count / totalTalks) * 100).toFixed(1) : 0}% of total`,
                percent: totalTalks > 0 ? Math.round((pt.count / totalTalks) * 100) : 0
              }))
            : [{ label: 'Talks recorded in scope', value: totalTalks }]
        },
        {
          title: 'Department-wise Talk Contributions',
          items: Object.entries(deptWise)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([dept, count]) => ({
              label: dept,
              value: `${count} talks`,
              percent: totalTalks > 0 ? Math.round((count / totalTalks) * 100) : 0
            }))
        }
      ],
      footer: 'Distinct talk records • No artificial calendar dates'
    };

    // 2. Host Organizations Breakdown
    const hostOrganizationsBreakdown: MetricBreakdownData = {
      title: 'Host Organizations & Universities',
      subtitle: 'Inviting Academic & Industry Entities',
      badge: `${totalOrgs} Organizations`,
      sections: [
        {
          title: 'Top Host Institutions',
          items: Object.entries(orgWise)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([org, count]) => ({
              label: org,
              value: `${count} talks`,
              subtext: `${totalTalks > 0 ? ((count / totalTalks) * 100).toFixed(1) : 0}% share`,
              percent: totalTalks > 0 ? Math.round((count / totalTalks) * 100) : 0
            }))
        }
      ],
      footer: 'Distinct normalized organization entities'
    };

    // 3. Participating Faculty Breakdown
    const participatingFacultyBreakdown: MetricBreakdownData = {
      title: 'Faculty Resource Persons & Speakers',
      subtitle: 'Faculty Speaker Classification',
      badge: `${totalFac} Speakers`,
      sections: [
        {
          title: 'Speaker Classification',
          items: [
            {
              label: 'Distinct Verified Faculty',
              value: `${totalFac} Speakers`,
              badge: 'Verified',
              subtext: 'Christ University faculty members'
            },
            ...(stats.guestFacultyCount ? [{
              label: 'External / Guest Speakers',
              value: `${stats.guestFacultyCount} Speakers`,
              badge: 'Guest',
              subtext: 'Visiting / guest contributors'
            }] : []),
            ...(stats.unverifiedFacultyCount ? [{
              label: 'Unverified Contributors',
              value: `${stats.unverifiedFacultyCount} Speakers`,
              subtext: 'Pending employee ID mapping'
            }] : [])
          ]
        },
        ...(Object.keys(facultyByDept).length > 0 ? [{
          title: 'Speakers by Department',
          items: Object.entries(facultyByDept)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([dept, count]) => ({
              label: dept,
              value: `${count} speakers`,
              percent: totalFac > 0 ? Math.round((count / totalFac) * 100) : 0
            }))
        }] : [])
      ],
      footer: 'Deduplicated distinct faculty • Contributor associations deduplicated'
    };

    // 4. Delivery Media Types Breakdown
    const deliveryMediaTypesBreakdown: MetricBreakdownData = {
      title: 'Delivery Media & Presentation Modes',
      subtitle: 'Delivery Channel Distribution',
      badge: `${totalMedia} Media Types`,
      sections: [
        {
          title: 'Delivery Mode Breakdown',
          items: Object.entries(mediaWise)
            .sort((a, b) => b[1] - a[1])
            .map(([media, count]) => ({
              label: media,
              value: `${count} talks`,
              subtext: `${totalTalks > 0 ? ((count / totalTalks) * 100).toFixed(1) : 0}% of deliveries`,
              percent: totalTalks > 0 ? Math.round((count / totalTalks) * 100) : 0
            }))
        }
      ],
      footer: 'Audited delivery channels (Offline, Online, Hybrid)'
    };

    return {
      totalInvitedTalksBreakdown,
      hostOrganizationsBreakdown,
      participatingFacultyBreakdown,
      deliveryMediaTypesBreakdown
    };
  }, [stats]);

  return (
    <AppShell currentPage="invited-talks" onNavigate={onNavigate} hideSidebar={hideSidebar}>
      <div className="space-y-6">
        <PageHeader
          title="Invited Talks"
          description="Record invited talks, guest lectures, keynote addresses, and seminar sessions by faculty members."
          breadcrumbs={[
            { label: 'Faculty Management', onClick: () => onNavigate('faculty-details') },
            { label: 'Invited Talks' }
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
                Add Invited Talk
              </Button>
            </div>
          }
        />

        {/* Stats Row — STRICT RULE: No date/year stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Invited Talks"
            value={stats.totalTalks !== undefined ? stats.totalTalks : (stats.totalCount || 0)}
            icon={Mic}
            subtitle="All recorded invited talks"
            breakdown={itCardBreakdowns.totalInvitedTalksBreakdown}
          />
          <StatCard
            title="Host Organizations"
            value={stats.uniqueOrganizations || 0}
            icon={Building2}
            subtitle="Distinct universities & entities"
            breakdown={itCardBreakdowns.hostOrganizationsBreakdown}
          />
          <StatCard
            title="Participating Faculty"
            value={stats.participatingFaculty || 0}
            icon={Users}
            subtitle={stats.guestFacultyCount ? `${stats.guestFacultyCount} guest / external speakers` : "Distinct verified faculty"}
            breakdown={itCardBreakdowns.participatingFacultyBreakdown}
          />
          <StatCard
            title="Delivery Media Types"
            value={stats.mediaTypesCount !== undefined ? stats.mediaTypesCount : Object.keys(stats.mediaWise || {}).length}
            icon={Radio}
            subtitle="Distinct delivery channels"
            breakdown={itCardBreakdowns.deliveryMediaTypesBreakdown}
          />
        </div>

        {/* Filters & Search — STRICT RULE: No date/year filters */}
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  placeholder="Search talk title, organization, speaker..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

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
                  <SelectValue placeholder="Program Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Program Types</SelectItem>
                  {PROGRAM_TYPES.map(pt => (
                    <SelectItem key={pt} value={pt}>{pt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedMedia} onValueChange={setSelectedMedia}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Media Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Media Types</SelectItem>
                  {MEDIA_TYPES.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
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
                <p className="text-xs">Loading invited talks...</p>
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
                <Mic className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-medium">No invited talks recorded yet.</p>
                <Button size="sm" onClick={handleOpenAdd} className="bg-[#1E3A8A] text-white">
                  Add First Invited Talk
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Title of Lecture / Talk</th>
                      <th className="py-3 px-4">Speaker / Contributor</th>
                      <th className="py-3 px-4">Program Type</th>
                      <th className="py-3 px-4">Organization / Host</th>
                      <th className="py-3 px-4">Media</th>
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
                              <span className="text-slate-400 italic">No speaker linked</span>
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
                            <span className="font-medium text-slate-800">{r.programType || '—'}</span>
                          </td>
                          <td className="py-3.5 px-4 max-w-[200px] truncate" title={r.organization || ''}>
                            {r.organization || '—'}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                              {r.media || '—'}
                            </span>
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

        {/* Add/Edit Modal — STRICT RULE: No date field! */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {selectedRecord ? 'Edit Invited Talk' : 'Add Invited Talk'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Enter talk title, host organization, media, and speaker contributor.
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
                  Speaker / Contributor Identification
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Speaker Name</Label>
                    <Input
                      placeholder="e.g. Dr. Priya Sharma"
                      value={formData.contributorName}
                      onChange={(e) => setFormData({ ...formData, contributorName: e.target.value })}
                      className="text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Employee ID (EmpID)</Label>
                    <Input
                      placeholder="e.g. 1028 (leave blank for Guest)"
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

              {/* Talk Details — STRICT RULE: No date field! */}
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Title of the Lecture / Speech / Talk <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    placeholder="e.g. Recent Frontiers in Quantum Computing & Post-Quantum Cryptography"
                    rows={2}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="text-xs mt-1"
                  />
                  {formErrors.title && <span className="text-rose-500 text-[11px]">{formErrors.title}</span>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Type of Program</Label>
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
                    <Label className="text-xs font-semibold text-slate-700">Media</Label>
                    <Select
                      value={formData.media}
                      onValueChange={(val) => setFormData({ ...formData, media: val })}
                    >
                      <SelectTrigger className="text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEDIA_TYPES.map(m => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Organization / Institution / Host
                  </Label>
                  <Input
                    placeholder="e.g. Indian Institute of Science (IISc), Bangalore"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Proof URL (Invitation / Certificate Link)</Label>
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
                  {submitting ? 'Saving...' : selectedRecord ? 'Update Invited Talk' : 'Save Invited Talk'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Modal */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Invited Talk Details
              </DialogTitle>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4 py-2 text-xs">
                <div>
                  <span className="text-slate-400 uppercase font-semibold block text-[10px]">Lecture / Talk Title</span>
                  <p className="font-semibold text-slate-800 text-sm mt-0.5">{selectedRecord.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">Program Type</span>
                    <span className="font-medium text-slate-700">{selectedRecord.programType || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px]">Media Format</span>
                    <span className="font-medium text-slate-700">{selectedRecord.media || '—'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 font-semibold block text-[10px]">Host Organization</span>
                    <span className="font-medium text-slate-700">{selectedRecord.organization || '—'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 uppercase font-semibold block text-[10px] mb-1.5">Speaker / Contributor</span>
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

        {/* Delete Modal */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Delete Invited Talk
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 pt-1">
                Are you sure you want to permanently delete "{selectedRecord?.title}"?
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
          uploadType="invited-talks"
          onSuccess={() => {
            fetchStats();
            fetchRecords();
          }}
        />

        {/* Clear All Data Dialog (Admin Only) */}
        <ClearModuleDataDialog
          isOpen={isClearDataOpen}
          onClose={() => setIsClearDataOpen(false)}
          moduleName="Invited Talks"
          apiEndpoint="/api/invited-talks/clear-all"
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

export default InvitedTalksPage;

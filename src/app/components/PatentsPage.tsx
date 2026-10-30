import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Award, FileText, TrendingUp, Users, Calendar,
  Building, CheckCircle, Clock, Plus, Search, Trash2, Edit,
  Eye, Download, AlertCircle, Upload, X, ExternalLink,
  Layers, ChevronRight, Check, RefreshCw, DollarSign, ShieldCheck,
  Paperclip, Link2, FileCheck, FolderOpen, AlertTriangle
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
import { BulkUploadDialog } from './BulkUploadDialog';
import { AppShell, PageHeader, StatCard } from './design-system';

export interface PatentProofItem {
  id: string;
  patentId: string;
  sourceType: 'drive_upload' | 'drive_link' | 'local_upload';
  driveFileId?: string | null;
  driveFolderId?: string | null;
  driveUrl: string;
  fileName: string;
  mimeType?: string | null;
  fileSize?: number | null;
  accessStatus?: string;
  accessRemarks?: string | null;
  createdAt?: string;
}

export interface PatentItem {
  id: string;
  title: string;
  inventors: string;
  applicationNo?: string | null;
  patentNo?: string | null;
  status: string; // 'filed' | 'published' | 'granted' | 'commercialized' | 'under_examination'
  patentType: string;
  department?: string;
  academicYear?: string;
  grantYear?: number | null;
  filedDate?: string | null;
  publishedDate?: string | null;
  grantedDate?: string | null;
  licenseDate?: string | null;
  partner?: string | null;
  revenue?: number | string | null;
  patentUrl?: string | null;
  description?: string | null;
  approvalStatus?: string;
  createdAt?: string;
  proofs?: PatentProofItem[];
  creator?: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
}

interface PatentsPageProps {
  onNavigate: (page: string) => void;
  hideSidebar?: boolean;
  token?: string;
  userRole?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getProofViewUrl = (url?: string) => {
  if (!url) return '#';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

const PATENT_STATUS_OPTIONS = [
  { value: 'published', label: 'Published' },
  { value: 'granted', label: 'Granted' },
  { value: 'commercialized', label: 'Commercialized / Licensed' },
  { value: 'filed', label: 'Filed / Application Submitted' },
  { value: 'under_examination', label: 'Under Examination' }
];

const PATENT_TYPE_OPTIONS = [
  'National (Indian)',
  'International (PCT)',
  'USPTO (USA)',
  'EPO (Europe)',
  'Other International'
];

interface FormState {
  title: string;
  inventors: string;
  applicationNo: string;
  patentNo: string;
  status: string;
  patentType: string;
  department: string;
  grantYear: string;
  academicYear: string;
  filedDate: string;
  publishedDate: string;
  grantedDate: string;
  licenseDate: string;
  partner: string;
  revenue: number;
  patentUrl: string;
  description: string;
  approvalStatus: string;
  proofLinks: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  inventors: '',
  applicationNo: '',
  patentNo: '',
  status: 'published',
  patentType: 'National (Indian)',
  department: '',
  grantYear: '',
  academicYear: '2024-2025',
  filedDate: '',
  publishedDate: '',
  grantedDate: '',
  licenseDate: '',
  partner: '',
  revenue: 0,
  patentUrl: '',
  description: '',
  approvalStatus: 'approved',
  proofLinks: ''
};

export function PatentsPage({
  onNavigate,
  hideSidebar = false,
  token: propToken,
  userRole: propRole
}: PatentsPageProps) {
  const { user } = useAuth();
  const token = propToken || user?.token || '';
  const currentRole = propRole || user?.role || 'faculty';

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedProofFilter, setSelectedProofFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  // Data & Loading
  const [patents, setPatents] = useState<PatentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPatent, setEditingPatent] = useState<PatentItem | null>(null);
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const [selectedProofFiles, setSelectedProofFiles] = useState<File[]>([]);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [formServerError, setFormServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk Upload Modal
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Proof Document Viewer Modal
  const [proofViewerPatent, setProofViewerPatent] = useState<PatentItem | null>(null);
  const [activeProofs, setActiveProofs] = useState<PatentProofItem[]>([]);
  const [proofsLoading, setProofsLoading] = useState(false);
  const [newProofFiles, setNewProofFiles] = useState<File[]>([]);
  const [newProofLinks, setNewProofLinks] = useState('');
  const [proofActionLoading, setProofActionLoading] = useState(false);
  const [proofActionMessage, setProofActionMessage] = useState('');
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Details Sheet
  const [viewingPatent, setViewingPatent] = useState<PatentItem | null>(null);

  // Delete & Clear
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  // Department List from Academic Hierarchy
  const { departmentList: dbDepts } = useAcademicHierarchy();
  const departments = useMemo(() => {
    const set = new Set<string>();
    dbDepts.forEach(d => {
      if (d) set.add(normalizeDepartmentName(d));
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
  }, [dbDepts]);

  // Calendar Years for filter and selection
  const calendarYears = useMemo(() => {
    const current = new Date().getFullYear();
    const list: number[] = [];
    for (let y = current + 1; y >= current - 15; y--) {
      list.push(y);
    }
    return list;
  }, []);

  // Fetch patents from API
  const fetchPatents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('all', 'true');
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (selectedType !== 'all') params.append('patentType', selectedType);
      if (selectedDept !== 'all') params.append('department', selectedDept);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      // Year filter handling
      if (selectedYear === 'pending') {
        params.append('year', 'pending');
      } else if (selectedYear !== 'all') {
        params.append('year', selectedYear);
      }

      // Proof filter handling
      if (selectedProofFilter !== 'all') {
        params.append('proofStatus', selectedProofFilter);
      }

      const res = await fetch(`${API_BASE}/api/patents?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setPatents(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch patents');
      }
    } catch (err: any) {
      console.error('Fetch patents error:', err);
      setError('Unable to load patents from server.');
    } finally {
      setLoading(false);
    }
  }, [token, selectedStatus, selectedType, selectedYear, selectedDept, selectedProofFilter, searchQuery]);

  useEffect(() => {
    fetchPatents();
  }, [fetchPatents, refreshKey]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = patents.length;
    let published = 0;
    let granted = 0;
    let commercialized = 0;
    let filed = 0;
    let totalRevenue = 0;
    let withProof = 0;
    let missingProof = 0;

    patents.forEach(p => {
      const s = (p.status || '').toLowerCase();
      if (s.includes('commercial')) {
        commercialized++;
      } else if (s.includes('grant')) {
        granted++;
      } else if (s.includes('publish')) {
        published++;
      } else {
        filed++;
      }
      totalRevenue += Number(p.revenue) || 0;

      if (p.proofs && p.proofs.length > 0) {
        withProof++;
      } else {
        missingProof++;
      }
    });

    return {
      total,
      published,
      granted,
      commercialized,
      filed,
      totalRevenue,
      withProof,
      missingProof
    };
  }, [patents]);

  // Handle open add modal
  const handleOpenAddModal = () => {
    setEditingPatent(null);
    setSelectedProofFiles([]);
    setFormData({
      ...EMPTY_FORM,
      department: departments[0] || '',
      status: 'published',
      grantYear: ''
    });
    setFormErrors({});
    setFormServerError('');
    setIsAddModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEditModal = (patent: PatentItem) => {
    setEditingPatent(patent);
    setSelectedProofFiles([]);
    setFormData({
      title: patent.title || '',
      inventors: patent.inventors || '',
      applicationNo: patent.applicationNo || '',
      patentNo: patent.patentNo || '',
      status: patent.status || 'published',
      patentType: patent.patentType || 'National (Indian)',
      department: patent.department || '',
      grantYear: patent.grantYear ? String(patent.grantYear) : '',
      academicYear: patent.academicYear || '2024-2025',
      filedDate: patent.filedDate ? patent.filedDate.split('T')[0] : '',
      publishedDate: patent.publishedDate ? patent.publishedDate.split('T')[0] : '',
      grantedDate: patent.grantedDate ? patent.grantedDate.split('T')[0] : '',
      licenseDate: patent.licenseDate ? patent.licenseDate.split('T')[0] : '',
      partner: patent.partner || '',
      revenue: patent.revenue !== null && patent.revenue !== undefined ? Number(patent.revenue) : 0,
      patentUrl: patent.patentUrl || '',
      description: patent.description || '',
      approvalStatus: patent.approvalStatus || 'approved',
      proofLinks: ''
    });
    setFormErrors({});
    setFormServerError('');
    setIsAddModalOpen(true);
  };

  // Validation
  const validateForm = () => {
    const errs: { [key: string]: string } = {};
    if (!formData.title.trim()) errs.title = 'Patent / Invention Title is required.';
    if (!formData.inventors.trim()) errs.inventors = 'Inventor Name(s) are required.';
    if (!formData.status.trim()) errs.status = 'Patent Status is required.';
    if (!formData.patentType.trim()) errs.patentType = 'Patent Type is required.';

    const isGranted = formData.status.toLowerCase() === 'granted' || formData.status.toLowerCase() === 'commercialized';
    if (isGranted) {
      if (!formData.grantYear || !formData.grantYear.trim()) {
        errs.grantYear = 'Year of Grant is required for granted patents.';
      } else {
        const yr = parseInt(formData.grantYear, 10);
        if (isNaN(yr) || yr < 1990 || yr > 2050) {
          errs.grantYear = 'Year must be a valid 4-digit year (e.g. 2024).';
        }
      }
      if (formData.grantedDate && formData.grantYear) {
        const gd = new Date(formData.grantedDate);
        if (!isNaN(gd.getTime()) && gd.getFullYear() !== parseInt(formData.grantYear, 10)) {
          errs.grantYear = `Year (${formData.grantYear}) does not match Grant Date year (${gd.getFullYear()}).`;
        }
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Save Patent (Single Entry)
  const handleSavePatent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormServerError('');
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const url = editingPatent
        ? `${API_BASE}/api/patents/${editingPatent.id}`
        : `${API_BASE}/api/patents`;

      const method = editingPatent ? 'PUT' : 'POST';

      const isGranted = formData.status.toLowerCase() === 'granted' || formData.status.toLowerCase() === 'commercialized';
      const parsedGrantYear = isGranted && formData.grantYear ? parseInt(formData.grantYear, 10) : null;

      const payload = {
        title: formData.title,
        inventors: formData.inventors,
        applicationNo: formData.applicationNo || null,
        patentNo: formData.patentNo || null,
        status: formData.status,
        patentType: formData.patentType,
        department: formData.department,
        grantYear: parsedGrantYear,
        academicYear: parsedGrantYear ? `${parsedGrantYear - 1}-${parsedGrantYear}` : formData.academicYear,
        filedDate: formData.filedDate || null,
        publishedDate: formData.publishedDate || null,
        grantedDate: formData.grantedDate || null,
        licenseDate: formData.licenseDate || null,
        partner: formData.partner || null,
        revenue: Number(formData.revenue) || 0,
        patentUrl: formData.patentUrl || null,
        description: formData.description || null,
        approvalStatus: formData.approvalStatus || 'approved'
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        const errorDetails = data.missingFields ? `Missing: ${data.missingFields.join(', ')}` : (data.errors ? data.errors.join(' | ') : '');
        setFormServerError(`${data.message || 'Failed to save patent record.'}${errorDetails ? ` (${errorDetails})` : ''}`);
        setSubmitting(false);
        return;
      }

      const savedPatentId = data.data?.id || (editingPatent ? editingPatent.id : null);

      // Upload proofs if any were attached
      if (savedPatentId) {
        // Method A: File uploads
        if (selectedProofFiles.length > 0) {
          console.log('[IQAC Debug] Uploading initial proof files:', selectedProofFiles.map(f => f.name));
          const uploadData = new FormData();
          selectedProofFiles.forEach(file => {
            uploadData.append('files', file);
          });

          try {
            const uploadRes = await fetch(`${API_BASE}/api/patents/${savedPatentId}/proofs`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              },
              body: uploadData
            });
            const uploadDataRes = await uploadRes.json();
            console.log('[IQAC Debug] Initial proof upload response from backend:', uploadDataRes);

            if (uploadDataRes.failed && uploadDataRes.failed.length > 0 && (!uploadDataRes.uploaded || uploadDataRes.uploaded.length === 0)) {
              console.error('[IQAC Debug] File upload failed for:', uploadDataRes.failed);
              alert(`Patent record saved, but proof document upload failed:\n\n${uploadDataRes.failed[0].error}`);
            }
          } catch (err: any) {
            console.error('[IQAC Debug] Network error uploading proof files:', err);
          }
        }

        // Method B: Google Drive Links
        if (formData.proofLinks && formData.proofLinks.trim()) {
          const links = formData.proofLinks
            .split(/[\n,;]+/)
            .map(l => l.trim())
            .filter(Boolean);

          if (links.length > 0) {
            await fetch(`${API_BASE}/api/patents/${savedPatentId}/proof-links`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ links })
            }).catch(err => console.error('Error adding proof links:', err));
          }
        }
      }

      setIsAddModalOpen(false);
      setFormServerError('');
      setSelectedProofFiles([]);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      console.error('Save patent error:', err);
      setFormServerError('An unexpected network error occurred while communicating with the server.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Patent
  const handleDeletePatent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this patent record? Associated proof files and links will be detached.')) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/patents/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setRefreshKey(k => k + 1);
      } else {
        alert(data.message || 'Failed to delete patent record.');
      }
    } catch (err: any) {
      console.error('Delete patent error:', err);
      alert('Network error while deleting patent.');
    }
  };

  // Clear all patents (Admin / HOD)
  const handleClearAll = async () => {
    setClearLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/patents/clear-all`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setIsClearOpen(false);
        setRefreshKey(k => k + 1);
      } else {
        alert(data.message || 'Failed to clear patents.');
      }
    } catch (err) {
      console.error('Clear patents error:', err);
      alert('Network error while clearing patents.');
    } finally {
      setClearLoading(false);
    }
  };

  // Open Proof Viewer Modal
  const handleOpenProofViewer = async (patent: PatentItem) => {
    setProofViewerPatent(patent);
    setNewProofFiles([]);
    setNewProofLinks('');
    setProofActionMessage('');
    setProofsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/patents/${patent.id}/proofs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setActiveProofs(data.data || []);
      } else {
        setActiveProofs(patent.proofs || []);
      }
    } catch (err) {
      console.error('Fetch proofs error:', err);
      setActiveProofs(patent.proofs || []);
    } finally {
      setProofsLoading(false);
    }
  };

  // Delete a specific proof item from viewer
  const handleDeleteProofItem = async (proofId: string) => {
    if (!proofViewerPatent) return;
    if (!window.confirm('Are you sure you want to remove this proof document?')) return;

    setProofActionLoading(true);
    setProofActionMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/patents/${proofViewerPatent.id}/proofs/${proofId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setActiveProofs(prev => prev.filter(p => p.id !== proofId));
        setProofActionMessage('Proof document removed successfully.');
        setRefreshKey(k => k + 1);
      } else {
        alert(data.message || 'Failed to delete proof.');
      }
    } catch (err) {
      console.error('Delete proof error:', err);
      alert('Network error deleting proof.');
    } finally {
      setProofActionLoading(false);
    }
  };

  // Add more proofs from inside the viewer modal
  const handleAddProofsInViewer = async () => {
    if (!proofViewerPatent) return;
    if (newProofFiles.length === 0 && !newProofLinks.trim()) {
      alert('Please select files or paste Google Drive links to add.');
      return;
    }

    setProofActionLoading(true);
    setProofActionMessage('');
    try {
      let uploadCount = 0;

      // Method A: Upload files
      if (newProofFiles.length > 0) {
        const formDataPayload = new FormData();
        newProofFiles.forEach(file => {
          formDataPayload.append('files', file);
        });

        console.log('[IQAC Proof Viewer Debug] Uploading files:', newProofFiles.map(f => f.name));
        const res = await fetch(`${API_BASE}/api/patents/${proofViewerPatent.id}/proofs`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formDataPayload
        });
        const data = await res.json();
        console.log('[IQAC Proof Viewer Debug] Backend upload response:', data);

        if (data.success && data.uploaded) {
          uploadCount += data.uploaded.length;
        }

        if (data.failed && data.failed.length > 0 && (!data.uploaded || data.uploaded.length === 0)) {
          console.error('[IQAC Proof Viewer Debug] Files failed to upload:', data.failed);
          setProofActionMessage(`Upload error: ${data.failed[0].error}`);
        }
      }

      // Method B: Add links
      if (newProofLinks.trim()) {
        const links = newProofLinks
          .split(/[\n,;]+/)
          .map(l => l.trim())
          .filter(Boolean);

        if (links.length > 0) {
          const res = await fetch(`${API_BASE}/api/patents/${proofViewerPatent.id}/proof-links`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ links })
          });
          const data = await res.json();
          if (data.success && data.proofs) {
            uploadCount += data.proofs.length;
          }
        }
      }

      // Reload proofs list
      const reloadRes = await fetch(`${API_BASE}/api/patents/${proofViewerPatent.id}/proofs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const reloadData = await reloadRes.json();
      if (reloadData.success) {
        setActiveProofs(reloadData.data || []);
      }

      setNewProofFiles([]);
      setNewProofLinks('');
      setProofActionMessage(`Added ${uploadCount} proof document(s) successfully.`);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      console.error('Add proofs in viewer error:', err);
      alert('Failed to add proof documents.');
    } finally {
      setProofActionLoading(false);
    }
  };

  // Export Data (CSV / XLSX)
  const handleExportData = (format: 'csv' | 'xlsx') => {
    if (patents.length === 0) {
      alert('No patent records to export.');
      return;
    }

    const headers = [
      'Title',
      'Inventors',
      'Application No',
      'Patent No',
      'Status',
      'Patent Type',
      'Department',
      'Year',
      'Filing Date',
      'Publication Date',
      'Grant Date',
      'Commercial Partner',
      'Revenue (INR)',
      'Proof Document Links',
      'Official URL'
    ];

    const dataRows = patents.map(p => {
      const proofLinksStr = (p.proofs || [])
        .map(pr => pr.driveUrl)
        .filter(Boolean)
        .join(' ; ');

      return [
        p.title,
        p.inventors,
        p.applicationNo || '',
        p.patentNo || '',
        p.status,
        p.patentType,
        p.department || '',
        p.grantYear ? String(p.grantYear) : (p.status === 'granted' ? (p.academicYear || '') : 'Pending Grant'),
        p.filedDate || '',
        p.publishedDate || '',
        p.grantedDate || '',
        p.partner || '',
        p.revenue || 0,
        proofLinksStr || 'None attached',
        p.patentUrl || ''
      ];
    });

    if (format === 'csv') {
      const csvContent = [
        headers.map(h => `"${h}"`).join(','),
        ...dataRows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `patents_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const wsData = [headers, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Patents');
      XLSX.writeFile(wb, `patents_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('commercial')) {
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold text-[11px] flex items-center gap-1"><DollarSign className="w-3 h-3" /> Commercialized</Badge>;
    }
    if (s.includes('grant')) {
      return <Badge className="bg-green-100 text-green-800 border-green-300 font-semibold text-[11px] flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Granted</Badge>;
    }
    if (s.includes('publish')) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-semibold text-[11px]">Published</Badge>;
    }
    if (s.includes('exam')) {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-semibold text-[11px]">Under Examination</Badge>;
    }
    return <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold text-[11px]">Filed</Badge>;
  };

  // Proof status indicator badge
  const renderProofBadge = (patent: PatentItem) => {
    const proofs = patent.proofs || [];
    const count = proofs.length;

    if (count === 0) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenProofViewer(patent);
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          title="Click to add proof documents"
        >
          <Paperclip className="w-3 h-3 text-gray-400" />
          <span>Missing Proof</span>
        </button>
      );
    }

    const hasIssue = proofs.some(p => p.accessStatus === 'issue' || p.accessStatus === 'restricted');

    if (hasIssue) {
      return (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenProofViewer(patent);
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors"
          title="Drive access issue detected. Click to inspect."
        >
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          <span>{count} {count === 1 ? 'Proof' : 'Proofs'} (Issue)</span>
        </button>
      );
    }

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleOpenProofViewer(patent);
        }}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
        title="Click to view attached proof documents"
      >
        <FileCheck className="w-3 h-3 text-blue-600" />
        <span>{count} {count === 1 ? 'Proof' : 'Proofs'}</span>
      </button>
    );
  };

  const isGrantedForm = formData.status.toLowerCase() === 'granted' || formData.status.toLowerCase() === 'commercialized';

  const content = (
    <div className="space-y-6">
      {/* Header Bar */}
      <PageHeader
        breadcrumbs={[
          { label: 'Academics' },
          { label: 'Research' },
          { label: 'Patents & IP' }
        ]}
        title="Intellectual Property & Patents Portfolio"
        badge={`${stats.total.toLocaleString()} Patents`}
        description="Comprehensive tracking of filed, published, granted, and commercialized patents with verified institutional Google Drive proof documents."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportData('xlsx')}
              className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-xs"
              title="Export filtered records to Excel"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
              <span>Excel</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportData('csv')}
              className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-xs"
              title="Export filtered records to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
              <span>CSV</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkOpen(true)}
              className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              <span>Bulk Upload</span>
            </Button>

            <Button
              size="sm"
              onClick={handleOpenAddModal}
              className="bg-[#2F4692] hover:bg-[#243A7A] text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Add Patent</span>
            </Button>
          </div>
        }
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Patents"
          value={stats.total.toLocaleString()}
          subtitle="Across National & International jurisdictions"
          icon={Award}
        />
        <StatCard
          title="Patents Published"
          value={stats.published.toLocaleString()}
          subtitle="Official Patent Gazette published"
          icon={FileText}
        />
        <StatCard
          title="Patents Granted"
          value={stats.granted.toLocaleString()}
          badge={stats.total > 0 ? `${Math.round((stats.granted / stats.total) * 100)}%` : '0%'}
          subtitle="Fully certified & issued patents"
          icon={ShieldCheck}
        />
        <StatCard
          title="Commercialized Revenue"
          value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`}
          subtitle={`${stats.commercialized} commercialized partnerships`}
          icon={DollarSign}
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-sm border-gray-200 bg-white">
        <CardContent className="p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full xl:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search patent title, inventor, app no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs border-gray-200 bg-gray-50/50 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start sm:justify-end">
            {/* Status Filter */}
            <div className="w-36">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Patent Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {PATENT_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Patent Type Filter */}
            <div className="w-40">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Patent Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jurisdictions</SelectItem>
                  {PATENT_TYPE_OPTIONS.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Filter (Calendar Year / Pending Grant) */}
            <div className="w-36">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="pending">Pending Grant</SelectItem>
                  {calendarYears.map(yr => (
                    <SelectItem key={yr} value={String(yr)}>{yr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div className="w-48">
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white truncate">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Proof Status Filter */}
            <div className="w-36">
              <Select value={selectedProofFilter} onValueChange={setSelectedProofFilter}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Proof Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Proofs</SelectItem>
                  <SelectItem value="has_proof">With Proof</SelectItem>
                  <SelectItem value="missing">Missing Proof</SelectItem>
                  <SelectItem value="issue">Access Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-gray-50">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Spreadsheet Table View"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Card View"
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRefreshKey(k => k + 1)}
              className="h-9 w-9 p-0 text-gray-500 hover:text-gray-900"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <Card className="border-gray-200 p-12 text-center bg-white">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#2f4692] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-500 font-medium">Loading patent records...</p>
          </div>
        </Card>
      ) : patents.length === 0 ? (
        <Card className="border-dashed border-2 p-12 text-center border-gray-200 bg-white">
          <Award className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <h3 className="text-sm font-semibold text-gray-800">No Patents Found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            No patent records matched your filter criteria. Try adjusting the filters or add a new patent.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedStatus('all');
                setSelectedType('all');
                setSelectedYear('all');
                setSelectedDept('all');
                setSelectedProofFilter('all');
                setSearchQuery('');
              }}
              className="text-xs"
            >
              Reset Filters
            </Button>
            <Button
              size="sm"
              onClick={handleOpenAddModal}
              className="bg-[#2f4692] text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add First Patent
            </Button>
          </div>
        </Card>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <Card className="shadow-sm border-gray-200 overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold">
                  <th className="p-3 pl-4 min-w-[240px]">Patent / Invention Title</th>
                  <th className="p-3 min-w-[170px]">Inventor(s)</th>
                  <th className="p-3 min-w-[120px]">Status</th>
                  <th className="p-3 min-w-[130px]">Type / Jurisdiction</th>
                  <th className="p-3 min-w-[140px]">App / Patent No.</th>
                  <th className="p-3 min-w-[140px]">Department</th>
                  <th className="p-3 text-center min-w-[80px]">Year</th>
                  <th className="p-3 text-center min-w-[110px]">Proof</th>
                  <th className="p-3 min-w-[110px]">Filing / Grant Date</th>
                  <th className="p-3 text-right pr-4 min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patents.map((patent) => (
                  <tr key={patent.id} className="hover:bg-blue-50/30 transition-colors group">
                    {/* Title */}
                    <td className="p-3 pl-4">
                      <div
                        onClick={() => setViewingPatent(patent)}
                        className="font-semibold text-gray-800 hover:text-[#2f4692] cursor-pointer line-clamp-2 leading-snug"
                        title={patent.title}
                      >
                        {patent.title}
                      </div>
                      {patent.partner && (
                        <p className="text-[10px] text-emerald-700 font-medium mt-0.5 flex items-center gap-1">
                          <Building className="w-3 h-3 shrink-0" />
                          Partner: {patent.partner} {patent.revenue ? `(₹${Number(patent.revenue).toLocaleString('en-IN')})` : ''}
                        </p>
                      )}
                    </td>

                    {/* Inventors */}
                    <td className="p-3 text-gray-700">
                      <div className="flex items-center gap-1.5 font-medium text-gray-800">
                        <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="line-clamp-2 leading-relaxed">{patent.inventors}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      {getStatusBadge(patent.status)}
                    </td>

                    {/* Patent Type */}
                    <td className="p-3 text-gray-700 font-medium">
                      <Badge variant="outline" className="text-[10px] font-medium bg-gray-50 border-gray-200">
                        {patent.patentType || 'National (Indian)'}
                      </Badge>
                    </td>

                    {/* App / Patent No */}
                    <td className="p-3 text-[11px] font-mono">
                      {patent.patentNo ? (
                        <div>
                          <span className="font-bold text-green-700">{patent.patentNo}</span>
                          {patent.applicationNo && (
                            <span className="text-[10px] text-gray-400 block font-normal">App: {patent.applicationNo}</span>
                          )}
                        </div>
                      ) : patent.applicationNo ? (
                        <span className="text-gray-700">{patent.applicationNo}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    {/* Department */}
                    <td className="p-3 text-gray-600">
                      <span className="line-clamp-2 text-[11px] font-medium">{patent.department || 'General'}</span>
                    </td>

                    {/* Year */}
                    <td className="p-3 text-center">
                      {patent.grantYear ? (
                        <Badge variant="secondary" className="text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                          {patent.grantYear}
                        </Badge>
                      ) : patent.status.toLowerCase() === 'granted' && patent.academicYear ? (
                        <Badge variant="secondary" className="text-[10px] font-medium bg-gray-100 text-gray-700">
                          {patent.academicYear}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Pending</span>
                      )}
                    </td>

                    {/* Proof Indicator */}
                    <td className="p-3 text-center">
                      {renderProofBadge(patent)}
                    </td>

                    {/* Filing / Grant Date */}
                    <td className="p-3 text-[11px] text-gray-600">
                      {patent.grantedDate ? (
                        <span className="text-green-700 font-semibold block">Grant: {patent.grantedDate}</span>
                      ) : patent.publishedDate ? (
                        <span className="text-blue-700 block">Pub: {patent.publishedDate}</span>
                      ) : patent.filedDate ? (
                        <span className="text-gray-600 block">Filed: {patent.filedDate}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingPatent(patent)}
                          className="h-7 w-7 p-0 text-gray-500 hover:text-[#2f4692] hover:bg-blue-50"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditModal(patent)}
                          className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                          title="Edit Patent"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePatent(patent.id)}
                          className="h-7 w-7 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                          title="Delete Patent"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center px-4">
            <span>Showing {patents.length} patent records</span>
            {(currentRole === 'admin' || currentRole === 'hod') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsClearOpen(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-[11px] h-7 px-2"
              >
                Clear All Patents
              </Button>
            )}
          </div>
        </Card>
      ) : (
        /* CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patents.map((patent) => (
            <Card key={patent.id} className="shadow-sm hover:shadow-md transition-shadow border-gray-200 relative overflow-hidden bg-white">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2f4692]" />
              <CardContent className="p-4 pl-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getStatusBadge(patent.status)}
                      <Badge variant="outline" className="text-[10px]">
                        {patent.patentType}
                      </Badge>
                      {patent.grantYear ? (
                        <Badge variant="secondary" className="text-[10px] font-semibold bg-blue-50 text-blue-800">
                          Year: {patent.grantYear}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Pending Grant</span>
                      )}
                      {renderProofBadge(patent)}
                    </div>
                    <h3
                      onClick={() => setViewingPatent(patent)}
                      className="font-bold text-gray-900 text-sm hover:text-[#2f4692] cursor-pointer line-clamp-2 leading-snug"
                    >
                      {patent.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditModal(patent)}
                      className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePatent(patent.id)}
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-gray-600 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="line-clamp-1">{patent.inventors}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Application No</span>
                    <span className="font-mono text-gray-700">{patent.applicationNo || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Patent No</span>
                    <span className="font-mono font-semibold text-green-700">{patent.patentNo || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Department</span>
                    <span className="text-gray-700 truncate block">{patent.department || 'General'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Dates</span>
                    <span className="text-gray-700">
                      {patent.grantedDate ? `Grant: ${patent.grantedDate}` : patent.filedDate ? `Filed: ${patent.filedDate}` : '-'}
                    </span>
                  </div>
                </div>

                {patent.partner && (
                  <div className="text-[11px] text-emerald-800 bg-emerald-50/60 p-2 rounded border border-emerald-100 flex items-center justify-between">
                    <span className="font-medium truncate">Partner: {patent.partner}</span>
                    {patent.revenue ? (
                      <span className="font-bold text-emerald-700 shrink-0">₹{Number(patent.revenue).toLocaleString('en-IN')}</span>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SINGLE ENTRY / EDIT PATENT MODAL */}
      {/* ---------------------------------------------------- */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-5 pb-3 border-b border-gray-100 bg-gray-50/50">
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-[#2f4692]" />
              {editingPatent ? 'Edit Patent Record' : 'Add Patent / Invention'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Record intellectual property filing, grant, and institutional proof document metadata.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePatent} className="p-5 space-y-4 text-xs">
            {formServerError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-red-800">Submission Error</p>
                  <p className="text-[11px] leading-relaxed">{formServerError}</p>
                </div>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-gray-700">Title of Invention / Patent *</Label>
              <Input
                placeholder="e.g. IoT-Based Edge Computational Device for Agricultural Sensing"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (formErrors.title) setFormErrors({ ...formErrors, title: '' });
                }}
                className={`h-9 text-xs border-gray-200 focus-visible:ring-[#2f4692] ${
                  formErrors.title ? 'border-red-500 bg-red-50/20' : ''
                }`}
              />
              {formErrors.title && (
                <p className="text-red-500 text-[11px] font-medium">{formErrors.title}</p>
              )}
            </div>

            {/* Inventors */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-gray-700">Inventor Name(s) (Comma separated) *</Label>
              <Input
                placeholder="e.g. Dr. Rajesh Kumar, Dr. Priya Sharma, Dr. Anand V"
                value={formData.inventors}
                onChange={(e) => {
                  setFormData({ ...formData, inventors: e.target.value });
                  if (formErrors.inventors) setFormErrors({ ...formErrors, inventors: '' });
                }}
                className={`h-9 text-xs border-gray-200 focus-visible:ring-[#2f4692] ${
                  formErrors.inventors ? 'border-red-500 bg-red-50/20' : ''
                }`}
              />
              {formErrors.inventors && (
                <p className="text-red-500 text-[11px] font-medium">{formErrors.inventors}</p>
              )}
            </div>

            {/* Status & Patent Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Patent Stage / Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => {
                    const isNowGranted = val.toLowerCase() === 'granted' || val.toLowerCase() === 'commercialized';
                    let derivedYear = formData.grantYear;
                    if (isNowGranted && !derivedYear && formData.grantedDate) {
                      const d = new Date(formData.grantedDate);
                      if (!isNaN(d.getTime())) derivedYear = String(d.getFullYear());
                    } else if (!isNowGranted) {
                      derivedYear = '';
                    }
                    setFormData({
                      ...formData,
                      status: val,
                      grantYear: derivedYear
                    });
                    if (formErrors.status) setFormErrors({ ...formErrors, status: '' });
                  }}
                >
                  <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {PATENT_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Patent Type / Jurisdiction *</Label>
                <Select
                  value={formData.patentType}
                  onValueChange={(val) => setFormData({ ...formData, patentType: val })}
                >
                  <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                    <SelectValue placeholder="Select Jurisdiction" />
                  </SelectTrigger>
                  <SelectContent>
                    {PATENT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Application No & Patent No */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Application Number / Filing Ref</Label>
                <Input
                  placeholder="e.g. IN202441012345"
                  value={formData.applicationNo || ''}
                  onChange={(e) => setFormData({ ...formData, applicationNo: e.target.value })}
                  className="h-9 text-xs border-gray-200 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Patent / Grant Number (if granted)</Label>
                <Input
                  placeholder="e.g. PAT-IN-489021 / US11894520B2"
                  value={formData.patentNo || ''}
                  onChange={(e) => setFormData({ ...formData, patentNo: e.target.value })}
                  className="h-9 text-xs border-gray-200 font-mono"
                />
              </div>
            </div>

            {/* Department & Year of Grant */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Department</Label>
                <Select
                  value={formData.department}
                  onValueChange={(val) => setFormData({ ...formData, department: val })}
                >
                  <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-gray-700">
                    Year (Year of Grant) {isGrantedForm ? '*' : ''}
                  </Label>
                  {!isGrantedForm && (
                    <span className="text-[10px] text-gray-400">Assigned upon grant</span>
                  )}
                </div>
                {isGrantedForm ? (
                  <div>
                    <Input
                      type="number"
                      placeholder="e.g. 2024"
                      value={formData.grantYear}
                      onChange={(e) => {
                        setFormData({ ...formData, grantYear: e.target.value });
                        if (formErrors.grantYear) setFormErrors({ ...formErrors, grantYear: '' });
                      }}
                      className={`h-9 text-xs border-gray-200 ${formErrors.grantYear ? 'border-red-500 bg-red-50/20' : ''}`}
                    />
                    {formErrors.grantYear && (
                      <p className="text-red-500 text-[11px] font-medium mt-1">{formErrors.grantYear}</p>
                    )}
                  </div>
                ) : (
                  <div className="h-9 px-3 py-2 bg-gray-100 rounded-md border border-gray-200 text-gray-400 text-xs flex items-center italic">
                    Pending Grant — Year assigned only upon grant
                  </div>
                )}
              </div>
            </div>

            {/* Dates: Filing Date, Publication Date, Grant Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Filing Date</Label>
                <Input
                  type="date"
                  value={formData.filedDate || ''}
                  onChange={(e) => setFormData({ ...formData, filedDate: e.target.value })}
                  className="h-9 text-xs border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Publication Date</Label>
                <Input
                  type="date"
                  value={formData.publishedDate || ''}
                  onChange={(e) => setFormData({ ...formData, publishedDate: e.target.value })}
                  className="h-9 text-xs border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Grant Date</Label>
                <Input
                  type="date"
                  value={formData.grantedDate || ''}
                  onChange={(e) => {
                    const gDate = e.target.value;
                    let derivedYear = formData.grantYear;
                    if (gDate) {
                      const d = new Date(gDate);
                      if (!isNaN(d.getTime())) {
                        derivedYear = String(d.getFullYear());
                      }
                    }
                    setFormData({
                      ...formData,
                      grantedDate: gDate,
                      grantYear: isGrantedForm ? (derivedYear || formData.grantYear) : ''
                    });
                    if (formErrors.grantYear) setFormErrors({ ...formErrors, grantYear: '' });
                  }}
                  className="h-9 text-xs border-gray-200"
                />
              </div>
            </div>

            {/* Commercialization: Partner, Revenue, License Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Commercial Partner / Licensee</Label>
                <Input
                  placeholder="e.g. AgriTech Automation Pvt. Ltd."
                  value={formData.partner || ''}
                  onChange={(e) => setFormData({ ...formData, partner: e.target.value })}
                  className="h-9 text-xs border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Revenue / Royalty (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 450000"
                  value={formData.revenue || ''}
                  onChange={(e) => setFormData({ ...formData, revenue: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-xs border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">License Date</Label>
                <Input
                  type="date"
                  value={formData.licenseDate || ''}
                  onChange={(e) => setFormData({ ...formData, licenseDate: e.target.value })}
                  className="h-9 text-xs border-gray-200"
                />
              </div>
            </div>

            {/* Proof Documents Section (Optional, multi-document) */}
            <div className="border border-blue-100 bg-blue-50/20 rounded-lg p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-bold text-gray-800 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-[#2f4692]" />
                  Proof Document Management (Optional)
                </Label>
                <span className="text-[10px] text-gray-500">Stored in institutional Google Drive</span>
              </div>

              {/* Method A: File Upload */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-gray-700">Method A: Direct File Upload (PDF, PNG, JPG max 10MB)</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      if (e.target.files) {
                        setSelectedProofFiles(Array.from(e.target.files));
                      }
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 text-xs bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    <FolderOpen className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Browse Files
                  </Button>
                  <span className="text-[11px] text-gray-500">
                    {selectedProofFiles.length === 0
                      ? 'No files selected'
                      : `${selectedProofFiles.length} file(s) selected`}
                  </span>
                </div>
                {selectedProofFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedProofFiles.map((file, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded px-2 py-0.5 text-[10px] text-gray-700">
                        <Paperclip className="w-2.5 h-2.5 text-gray-400" />
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <span className="text-gray-400 font-mono">({Math.round(file.size / 1024)} KB)</span>
                        <button
                          type="button"
                          onClick={() => setSelectedProofFiles(selectedProofFiles.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-red-500 ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Method B: Google Drive Links */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-[11px] font-semibold text-gray-700">Method B: Google Drive Link(s)</Label>
                <textarea
                  rows={2}
                  placeholder="Paste Google Drive link(s) here (separate multiple links with comma or newline)..."
                  value={formData.proofLinks}
                  onChange={(e) => setFormData({ ...formData, proofLinks: e.target.value })}
                  className="w-full rounded-md border border-gray-200 p-2 text-xs bg-white outline-none focus:border-[#2f4692]"
                />
              </div>
            </div>

            {/* Patent Document URL */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-gray-700">Official Patent URL / Gazette Link</Label>
              <Input
                type="url"
                placeholder="https://ipindiaservices.gov.in / https://patents.google.com"
                value={formData.patentUrl || ''}
                onChange={(e) => setFormData({ ...formData, patentUrl: e.target.value })}
                className="h-9 text-xs border-gray-200"
              />
            </div>

            {/* Abstract / Summary */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-gray-700">Abstract / Summary of Invention</Label>
              <textarea
                rows={3}
                placeholder="Brief technical description, claims, or utility synopsis..."
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-md border border-gray-200 p-2.5 text-xs outline-none focus:border-[#2f4692]"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-[#2f4692] text-white hover:bg-[#243877] px-5"
              >
                {submitting ? 'Saving...' : editingPatent ? 'Update Patent' : 'Save Patent'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------- */}
      {/* BULK UPLOAD MODAL (EXCEL & CSV) */}
      {/* ---------------------------------------------------- */}
      <BulkUploadDialog
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        token={token}
        onSuccess={fetchPatents}
        uploadType="patents"
      />

      {/* ---------------------------------------------------- */}
      {/* PROOF DOCUMENT VIEWER MODAL */}
      {/* ---------------------------------------------------- */}
      <Dialog open={!!proofViewerPatent} onOpenChange={(open) => !open && setProofViewerPatent(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          {proofViewerPatent && (
            <div>
              <DialogHeader className="p-5 pb-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(proofViewerPatent.status)}
                  <Badge variant="outline" className="text-[10px]">
                    {proofViewerPatent.patentType}
                  </Badge>
                  {proofViewerPatent.grantYear ? (
                    <Badge variant="secondary" className="text-[10px] font-semibold bg-blue-50 text-blue-800">
                      Year: {proofViewerPatent.grantYear}
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-gray-400 italic">Pending Grant</span>
                  )}
                </div>
                <DialogTitle className="text-base font-bold text-gray-900 leading-snug">
                  Proof Documents — {proofViewerPatent.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Institutional Google Drive proof documents attached to Patent ID #{proofViewerPatent.id} ({proofViewerPatent.department || 'General'})
                </DialogDescription>
              </DialogHeader>

              <div className="p-5 space-y-4 text-xs">
                {proofActionMessage && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{proofActionMessage}</span>
                  </div>
                )}

                {/* Attached Proofs List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 uppercase text-[10px] tracking-wider">
                      Attached Documents ({activeProofs.length})
                    </span>
                    <span className="text-[10px] text-gray-400">Google Workspace Shared Drive</span>
                  </div>

                  {proofsLoading ? (
                    <div className="p-6 text-center text-gray-400">Loading documents...</div>
                  ) : activeProofs.length === 0 ? (
                    <div className="p-6 border border-dashed border-gray-200 rounded-lg text-center bg-gray-50/50">
                      <Paperclip className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="font-semibold text-gray-700">No Proof Documents Attached</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Upload a file or add a Google Drive link below.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden bg-white">
                      {activeProofs.map((proof) => (
                        <div key={proof.id} className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50/70 transition-colors">
                          <div className="flex items-start gap-2.5 min-w-0">
                            {proof.sourceType === 'drive_upload' ? (
                              <FolderOpen className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            ) : proof.sourceType === 'local_upload' ? (
                              <FileText className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                            ) : (
                              <Link2 className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate leading-tight" title={proof.fileName}>
                                {proof.fileName}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500 flex-wrap">
                                <Badge variant="outline" className={`text-[9px] px-1 py-0 ${
                                  proof.sourceType === 'drive_upload'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : proof.sourceType === 'local_upload'
                                    ? 'bg-teal-50 text-teal-700 border-teal-200'
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                }`}>
                                  {proof.sourceType === 'drive_upload' ? 'Drive Upload' : proof.sourceType === 'local_upload' ? 'Server Upload' : 'Drive Link'}
                                </Badge>
                                {proof.fileSize ? (
                                  <span>{Math.round(proof.fileSize / 1024)} KB</span>
                                ) : null}
                                {proof.accessStatus === 'verified' ? (
                                  <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> Verified
                                  </span>
                                ) : proof.accessStatus === 'issue' || proof.accessStatus === 'restricted' ? (
                                  <span className="text-amber-700 font-medium flex items-center gap-0.5">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Access Issue
                                  </span>
                                ) : null}
                                {proof.createdAt && (
                                  <span className="text-gray-400">{new Date(proof.createdAt).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={getProofViewUrl(proof.driveUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#2f4692] bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View</span>
                            </a>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={proofActionLoading}
                              onClick={() => handleDeleteProofItem(proof.id)}
                              className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                              title="Delete proof document"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add More Proofs Section */}
                <div className="border border-gray-200 rounded-lg p-3.5 bg-gray-50/50 space-y-3">
                  <span className="font-bold text-gray-800 uppercase text-[10px] tracking-wider block">
                    Attach Additional Proof
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Method A: Upload File */}
                    <div className="space-y-1.5 bg-white p-2.5 rounded border border-gray-200">
                      <Label className="text-[11px] font-semibold text-gray-700">Method A: Upload Files (PDF/JPG/PNG)</Label>
                      <input
                        type="file"
                        ref={modalFileInputRef}
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => {
                          if (e.target.files) {
                            setNewProofFiles(Array.from(e.target.files));
                          }
                        }}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => modalFileInputRef.current?.click()}
                        className="w-full text-xs h-8 border-gray-200 text-gray-700"
                      >
                        <FolderOpen className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                        Choose Files ({newProofFiles.length} selected)
                      </Button>
                      {newProofFiles.length > 0 && (
                        <p className="text-[10px] text-gray-500 truncate">
                          {newProofFiles.map(f => f.name).join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Method B: Drive Links */}
                    <div className="space-y-1.5 bg-white p-2.5 rounded border border-gray-200">
                      <Label className="text-[11px] font-semibold text-gray-700">Method B: Google Drive Links</Label>
                      <Input
                        placeholder="https://drive.google.com/..."
                        value={newProofLinks}
                        onChange={(e) => setNewProofLinks(e.target.value)}
                        className="h-8 text-xs border-gray-200"
                      />
                    </div>
                  </div>

                  {(newProofFiles.length > 0 || newProofLinks.trim()) && (
                    <div className="flex justify-end pt-1">
                      <Button
                        size="sm"
                        disabled={proofActionLoading}
                        onClick={handleAddProofsInViewer}
                        className="bg-[#2f4692] text-white hover:bg-[#243877] text-xs h-8 px-4"
                      >
                        {proofActionLoading ? 'Attaching...' : 'Attach Proof(s)'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => setProofViewerPatent(null)}
                  className="bg-[#2f4692] text-white hover:bg-[#243877] text-xs px-5"
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------- */}
      {/* PATENT DETAILS SHEET / MODAL */}
      {/* ---------------------------------------------------- */}
      <Dialog open={!!viewingPatent} onOpenChange={(open) => !open && setViewingPatent(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {viewingPatent && (
            <div>
              <DialogHeader className="p-5 pb-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(viewingPatent.status)}
                  <Badge variant="outline" className="text-[10px]">
                    {viewingPatent.patentType}
                  </Badge>
                  {viewingPatent.grantYear ? (
                    <Badge variant="secondary" className="text-[10px] font-semibold bg-blue-50 text-blue-800">
                      Year: {viewingPatent.grantYear}
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-gray-400 italic">Pending Grant</span>
                  )}
                  {viewingPatent.department && (
                    <Badge variant="outline" className="text-[10px]">
                      {viewingPatent.department}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-base font-bold text-gray-900 leading-snug">
                  {viewingPatent.title}
                </DialogTitle>
              </DialogHeader>

              <div className="p-5 space-y-4 text-xs text-gray-700 max-h-[60vh] overflow-y-auto">
                <div>
                  <span className="text-[10px] font-bold text-[#2f4692] uppercase tracking-wider block">Inventors / Authors</span>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{viewingPatent.inventors}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Application Number</span>
                    <p className="font-mono font-semibold text-gray-800 mt-0.5">{viewingPatent.applicationNo || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Patent / Grant Number</span>
                    <p className="font-mono font-bold text-green-700 mt-0.5">{viewingPatent.patentNo || 'Pending / In examination'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Filing Date</span>
                    <p className="font-medium text-gray-800 mt-0.5">{viewingPatent.filedDate || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Publication Date</span>
                    <p className="font-medium text-gray-800 mt-0.5">{viewingPatent.publishedDate || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Grant Date</span>
                    <p className="font-medium text-green-800 font-semibold mt-0.5">{viewingPatent.grantedDate || '-'}</p>
                  </div>
                </div>

                {/* Proof Documents Section in Details */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Proof Documents</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const pat = viewingPatent;
                        setViewingPatent(null);
                        handleOpenProofViewer(pat);
                      }}
                      className="h-6 text-[10px] px-2"
                    >
                      Manage Proofs
                    </Button>
                  </div>
                  {(viewingPatent.proofs && viewingPatent.proofs.length > 0) ? (
                    <div className="space-y-1.5">
                      {viewingPatent.proofs.map((proof) => (
                        <div key={proof.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                          <div className="flex items-center gap-2 truncate">
                            <FileCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="truncate font-medium">{proof.fileName}</span>
                          </div>
                          <a
                            href={getProofViewUrl(proof.driveUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#2f4692] hover:underline font-semibold flex items-center gap-1 shrink-0 ml-2"
                          >
                            <span>{proof.sourceType === 'local_upload' ? 'View Document' : 'Open Drive'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic text-[11px]">No proof document attached yet.</p>
                  )}
                </div>

                {(viewingPatent.partner || Number(viewingPatent.revenue) > 0) && (
                  <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3 bg-emerald-50/40 p-3 rounded-lg border border-emerald-100">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Commercial Partner / Licensee</span>
                      <p className="font-semibold text-gray-900 mt-0.5">{viewingPatent.partner || 'Internal Tech Incubation'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Revenue / Royalty (₹)</span>
                      <p className="font-extrabold text-emerald-700 text-sm mt-0.5">₹{Number(viewingPatent.revenue || 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                )}

                {viewingPatent.patentUrl && (
                  <div className="border-t border-gray-100 pt-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Official Patent Document Link</span>
                    <a
                      href={viewingPatent.patentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#2f4692] hover:underline font-medium text-[11px] mt-0.5 inline-flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{viewingPatent.patentUrl}</span>
                    </a>
                  </div>
                )}

                {viewingPatent.description && (
                  <div className="border-t border-gray-100 pt-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Summary / Abstract</span>
                    <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-150 mt-1 leading-relaxed">
                      {viewingPatent.description}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const pat = viewingPatent;
                    setViewingPatent(null);
                    handleOpenEditModal(pat);
                  }}
                  className="text-xs"
                >
                  <Edit className="w-3.5 h-3.5 mr-1" />
                  Edit Patent
                </Button>
                <Button
                  size="sm"
                  onClick={() => setViewingPatent(null)}
                  className="bg-[#2f4692] text-white hover:bg-[#243877] text-xs px-5"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Clear All Confirmation Dialog */}
      <Dialog open={isClearOpen} onOpenChange={setIsClearOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2 text-base">
              <AlertCircle className="w-5 h-5" />
              Clear Patent Records
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              Are you sure you want to delete all patent records in this scope? This action is irreversible and recorded in audit logs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsClearOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={clearLoading}
              onClick={handleClearAll}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
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
    <AppShell currentPage="research-innovation" onNavigate={onNavigate}>
      {content}
    </AppShell>
  );
}

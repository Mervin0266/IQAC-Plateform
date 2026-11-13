import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent } from './ui/card';
import {
  Award, FileText, TrendingUp, Users, Calendar,
  Building, CheckCircle, Clock, Plus, Search, Trash2, Edit,
  Eye, Download, AlertCircle, Upload, X, ExternalLink,
  Layers, ChevronRight, Check, RefreshCw, DollarSign, ShieldCheck,
  Paperclip, Link2, FileCheck, FolderOpen, AlertTriangle,
  UploadCloud, FileSpreadsheet, ChevronDown, UserCheck, RotateCcw, RotateCw, Save
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

export interface PatentFacultyAssociation {
  id?: string;
  facultyId?: string | null;
  employeeId: string;
  normalizedEmployeeId?: string;
  facultyName?: string | null;
  designation?: string | null;
  originalDepartment?: string | null;
  originalDepartmentSource?: string;
  currentDepartment?: string | null;
  departmentTransferred?: boolean;
  isValid: boolean;
  email?: string | null;
}

export interface ExternalInventor {
  name: string;
  institution?: string;
}

export interface PatentItem {
  id: string;
  title: string;
  empIdsRaw?: string;
  inventors?: string;
  applicationNo?: string | null;
  patentNo?: string | null;
  status: string; // 'published' | 'granted' | 'commercialized' | 'filed' | 'under_examination'
  patentType: string;
  department?: string;
  publicationYear?: number | null;
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
  proofUrl?: string | null;
  proofSourceType?: string | null;
  hasInvalidEmpIds?: boolean;
  invalidEmpIds?: string[];
  duplicateEmpIds?: string[];
  externalInventors?: ExternalInventor[];
  departments?: string[];
  currentDepartments?: string[];
  originalDepartments?: string[];
  facultyAssociations?: PatentFacultyAssociation[];
  creator?: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
}

export interface PatentMetrics {
  totalPatents: number;
  applicationsFiled: number;
  grantedPatents: number;
  licensedPatents: number;
  publishedPatents?: number;
  totalRevenue: number;
  withProofCount: number;
  missingProofCount: number;
  recordsWithInvalidEmpIds: number;
}

interface PatentsPageProps {
  onNavigate: (page: string) => void;
  hideSidebar?: boolean;
  token?: string;
  userRole?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

const DEFAULT_METRICS: PatentMetrics = {
  totalPatents: 0,
  applicationsFiled: 0,
  grantedPatents: 0,
  licensedPatents: 0,
  publishedPatents: 0,
  totalRevenue: 0,
  withProofCount: 0,
  missingProofCount: 0,
  recordsWithInvalidEmpIds: 0
};

interface PatentFormState {
  title: string;
  empIdsRaw: string;
  externalInventors: ExternalInventor[];
  applicationNo: string;
  patentNo: string;
  status: string;
  patentType: string;
  department: string;
  grantYear: string;
  filedDate: string;
  publishedDate: string;
  grantedDate: string;
  licenseDate: string;
  partner: string;
  revenue: number;
  patentUrl: string;
  description: string;
  proofLinks: string;
}

const EMPTY_FORM: PatentFormState = {
  title: '',
  empIdsRaw: '',
  externalInventors: [],
  applicationNo: '',
  patentNo: '',
  status: 'published',
  patentType: 'National (Indian)',
  department: '',
  grantYear: '',
  filedDate: '',
  publishedDate: '',
  grantedDate: '',
  licenseDate: '',
  partner: '',
  revenue: 0,
  patentUrl: '',
  description: '',
  proofLinks: ''
};

function parseEmpIdsText(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(raw || '').split(/[,;\n\r]+/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const up = trimmed.toUpperCase();
    if (!seen.has(up)) {
      seen.add(up);
      out.push(trimmed);
    }
  }
  return out;
}

function formatDateDisplay(val?: string | null): string {
  if (!val) return '-';
  const str = String(val).trim();
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return `${m[3]}/${m[2]}/${m[1]}`;
  }
  return str;
}

export function PatentsPage({
  onNavigate,
  hideSidebar = false,
  token: propToken,
  userRole: propRole
}: PatentsPageProps) {
  const { user } = useAuth();
  const token = propToken || user?.token || '';
  const currentRole = String(propRole || user?.role || 'faculty').toLowerCase();
  const canModify = currentRole !== 'authority';

  // Filters
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const deptDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedProofFilter, setSelectedProofFilter] = useState('all');
  const [selectedValidationFilter, setSelectedValidationFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Data & Loading
  const [patents, setPatents] = useState<PatentItem[]>([]);
  const [metrics, setMetrics] = useState<PatentMetrics>(DEFAULT_METRICS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  // Add / Edit Modal with Undo / Redo
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PatentItem | null>(null);
  const [formHistory, setFormHistory] = useState<{
    past: PatentFormState[];
    present: PatentFormState;
    future: PatentFormState[];
  }>({
    past: [],
    present: EMPTY_FORM,
    future: []
  });
  const [formProofFile, setFormProofFile] = useState<File | null>(null);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const formFileInputRef = useRef<HTMLInputElement>(null);

  // Searchable Faculty Selector (Method A)
  const [facultyQuery, setFacultyQuery] = useState('');
  const [facultyOptions, setFacultyOptions] = useState<Array<{
    id: string; employeeId: string; name: string; designation?: string; department?: string;
  }>>([]);
  const [facultyLoading, setFacultyLoading] = useState(false);
  const [resolvedFacultyMap, setResolvedFacultyMap] = useState<Record<string, {
    employeeId: string; name: string; designation?: string; department?: string;
  }>>({});

  // Details & Proof Modals
  const [viewingItem, setViewingItem] = useState<PatentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PatentItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [proofTarget, setProofTarget] = useState<PatentItem | null>(null);
  const [proofLinkInput, setProofLinkInput] = useState('');
  const [proofUploadFile, setProofUploadFile] = useState<File | null>(null);
  const [proofSaving, setProofSaving] = useState(false);
  const proofModalFileRef = useRef<HTMLInputElement>(null);

  // Clear All Modal
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  // 5-Step Bulk Upload Modal
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any>(null);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  const { departmentList: dbDepts } = useAcademicHierarchy();
  const departments = useMemo(() => {
    const set = new Set<string>();
    dbDepts.forEach(d => { if (d) set.add(normalizeDepartmentName(d)); });
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

  const publicationYears = useMemo(() => {
    const cur = new Date().getFullYear();
    const yrs = new Set<number>();
    for (let y = cur + 1; y >= cur - 15; y--) yrs.add(y);
    patents.forEach(p => {
      if (p.publicationYear) yrs.add(Number(p.publicationYear));
    });
    return Array.from(yrs).sort((a, b) => b - a);
  }, [patents]);

  // Close multi-dept popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target as Node)) {
        setDeptDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Patents from Backend
  const fetchPatents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(pageSize));
      if (selectedYear !== 'all') params.append('publicationYear', selectedYear);
      if (selectedDepts.length > 0) params.append('department', selectedDepts.join(','));
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (selectedType !== 'all') params.append('patentType', selectedType);
      if (selectedProofFilter !== 'all') params.append('proofStatus', selectedProofFilter);
      if (selectedValidationFilter !== 'all') params.append('validationStatus', selectedValidationFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`${API_BASE}/api/patents?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!json.success && json.rows === undefined && json.data === undefined) {
        setError(json.message || 'Failed to load patent records.');
        return;
      }
      const list = json.rows || json.data || [];
      setPatents(list);
      if (json.metrics) {
        setMetrics({
          totalPatents: json.metrics.totalPatents ?? json.metrics.total ?? list.length,
          applicationsFiled: json.metrics.applicationsFiled ?? json.metrics.filed ?? 0,
          grantedPatents: json.metrics.grantedPatents ?? json.metrics.granted ?? 0,
          licensedPatents: json.metrics.licensedPatents ?? json.metrics.commercialized ?? 0,
          publishedPatents: json.metrics.publishedPatents ?? json.metrics.published ?? 0,
          totalRevenue: json.metrics.totalRevenue ?? 0,
          withProofCount: json.metrics.withProofCount ?? 0,
          missingProofCount: json.metrics.missingProofCount ?? 0,
          recordsWithInvalidEmpIds: json.metrics.recordsWithInvalidEmpIds ?? 0
        });
      }
      setTotalCount(json.total ?? json.count ?? list.length);
      setTotalPages(json.pagination?.totalPages || 1);
    } catch (err: any) {
      setError('Unable to reach server for patent records.');
    } finally {
      setLoading(false);
    }
  }, [token, page, selectedYear, selectedDepts, selectedStatus, selectedType, selectedProofFilter, selectedValidationFilter, searchQuery]);

  useEffect(() => {
    fetchPatents();
  }, [fetchPatents, refreshKey]);

  useEffect(() => {
    setPage(1);
  }, [selectedYear, selectedDepts, selectedStatus, selectedType, selectedProofFilter, selectedValidationFilter, searchQuery]);

  // Search faculty directory for Method A
  useEffect(() => {
    if (!isFormOpen || !token) return;
    const handle = setTimeout(async () => {
      setFacultyLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/patents/faculty-search?q=${encodeURIComponent(facultyQuery)}&limit=60`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setFacultyOptions(json.data);
          setResolvedFacultyMap(prev => {
            const next = { ...prev };
            json.data.forEach((f: any) => {
              next[String(f.employeeId).trim().toUpperCase()] = f;
            });
            return next;
          });
        }
      } catch (_) {} finally {
        setFacultyLoading(false);
      }
    }, 200);
    return () => clearTimeout(handle);
  }, [isFormOpen, facultyQuery, token]);

  const currentForm = formHistory.present;
  const parsedFormEmpIds = useMemo(() => parseEmpIdsText(currentForm.empIdsRaw), [currentForm.empIdsRaw]);

  // Form mutation helper with Undo / Redo history tracking
  const updateFormState = (newPartial: Partial<PatentFormState>) => {
    setFormHistory(prev => ({
      past: [...prev.past, prev.present],
      present: { ...prev.present, ...newPartial },
      future: []
    }));
  };

  const handleUndo = () => {
    setFormHistory(prev => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future]
      };
    });
  };

  const handleRedo = () => {
    setFormHistory(prev => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture
      };
    });
  };

  const toggleFacultyInForm = (fac: { employeeId: string; name: string; designation?: string; department?: string }) => {
    const targetKey = fac.employeeId.trim().toUpperCase();
    const current = parseEmpIdsText(currentForm.empIdsRaw);
    const exists = current.some(id => id.toUpperCase() === targetKey);
    const next = exists
      ? current.filter(id => id.toUpperCase() !== targetKey)
      : [...current, fac.employeeId.trim()];
    updateFormState({ empIdsRaw: next.join(', ') });
    setResolvedFacultyMap(prev => ({ ...prev, [targetKey]: fac }));
  };

  const addExternalInventor = () => {
    const currentList = currentForm.externalInventors || [];
    updateFormState({
      externalInventors: [...currentList, { name: '', institution: '' }]
    });
  };

  const updateExternalInventor = (index: number, field: 'name' | 'institution', value: string) => {
    const currentList = [...(currentForm.externalInventors || [])];
    if (currentList[index]) {
      currentList[index] = { ...currentList[index], [field]: value };
      updateFormState({ externalInventors: currentList });
    }
  };

  const removeExternalInventor = (index: number) => {
    const currentList = (currentForm.externalInventors || []).filter((_, i) => i !== index);
    updateFormState({ externalInventors: currentList });
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormHistory({
      past: [],
      present: EMPTY_FORM,
      future: []
    });
    setFormProofFile(null);
    setFacultyQuery('');
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditModal = (item: PatentItem) => {
    setEditingItem(item);
    const idsStr = item.empIdsRaw || (item.facultyAssociations || []).map(f => f.employeeId).join(', ');
    const preMap: Record<string, any> = {};
    (item.facultyAssociations || []).forEach(a => {
      if (a.isValid && a.employeeId) {
        preMap[a.employeeId.trim().toUpperCase()] = {
          employeeId: a.employeeId,
          name: a.facultyName || '',
          designation: a.designation || '',
          department: a.currentDepartment || a.originalDepartment || ''
        };
      }
    });
    setResolvedFacultyMap(prev => ({ ...prev, ...preMap }));

    const initialFormState: PatentFormState = {
      title: item.title || '',
      empIdsRaw: idsStr,
      externalInventors: Array.isArray(item.externalInventors) ? [...item.externalInventors] : [],
      applicationNo: item.applicationNo || '',
      patentNo: item.patentNo || '',
      status: item.status || 'published',
      patentType: item.patentType || 'National (Indian)',
      department: item.department || '',
      grantYear: item.grantYear ? String(item.grantYear) : '',
      filedDate: item.filedDate ? String(item.filedDate).slice(0, 10) : '',
      publishedDate: item.publishedDate ? String(item.publishedDate).slice(0, 10) : '',
      grantedDate: item.grantedDate ? String(item.grantedDate).slice(0, 10) : '',
      licenseDate: item.licenseDate ? String(item.licenseDate).slice(0, 10) : '',
      partner: item.partner || '',
      revenue: Number(item.revenue || 0),
      patentUrl: item.patentUrl || '',
      description: item.description || '',
      proofLinks: (item.proofs || []).filter(p => p.sourceType === 'drive_link').map(p => p.driveUrl).join('\n')
    };

    setFormHistory({
      past: [],
      present: initialFormState,
      future: []
    });
    setFormProofFile(null);
    setFacultyQuery('');
    setFormError('');
    setIsFormOpen(true);
  };

  const derivedFormPubYear = useMemo(() => {
    if (!currentForm.publishedDate) return null;
    const str = String(currentForm.publishedDate).trim();
    if (/^\d{4}/.test(str)) return str.slice(0, 4);
    return null;
  }, [currentForm.publishedDate]);

  const handleSavePatent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentForm.title.trim()) {
      setFormError('Patent Title is required.');
      return;
    }
    if (parsedFormEmpIds.length === 0 && (currentForm.externalInventors || []).length === 0) {
      setFormError('At least one Inventor (CHRIST Faculty EmpId or External Inventor) is required.');
      return;
    }

    setFormSubmitting(true);
    setFormError('');
    try {
      const url = editingItem
        ? `${API_BASE}/api/patents/${editingItem.id}`
        : `${API_BASE}/api/patents`;
      const method = editingItem ? 'PUT' : 'POST';

      const payload: Record<string, any> = {
        title: currentForm.title.trim(),
        empIdsRaw: parsedFormEmpIds.join(', '),
        externalInventors: currentForm.externalInventors || [],
        applicationNo: currentForm.applicationNo.trim() || null,
        patentNo: currentForm.patentNo.trim() || null,
        status: currentForm.status,
        patentType: currentForm.patentType,
        department: currentForm.department.trim() || undefined,
        filedDate: currentForm.filedDate || null,
        publishedDate: currentForm.publishedDate || null,
        grantedDate: currentForm.grantedDate || null,
        licenseDate: currentForm.licenseDate || null,
        partner: currentForm.partner.trim() || null,
        revenue: Number(currentForm.revenue) || 0,
        patentUrl: currentForm.patentUrl.trim() || null,
        description: currentForm.description.trim() || null,
        proofLinks: currentForm.proofLinks ? currentForm.proofLinks.split('\n').map(s => s.trim()).filter(Boolean) : undefined
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json.success) {
        setFormError(json.message || 'Failed to save patent record.');
        return;
      }

      const savedId = json.data?.id;
      if (savedId && formProofFile) {
        const fd = new FormData();
        fd.append('files', formProofFile);
        const upRes = await fetch(`${API_BASE}/api/patents/${savedId}/proofs`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd
        });
        const upJson = await upRes.json();
        if (!upJson.success) {
          setFormError(`Patent saved, but proof file upload encountered an issue: ${upJson.message}`);
          setRefreshKey(k => k + 1);
          return;
        }
      }

      setIsFormOpen(false);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      setFormError(err.message || 'Server error while saving patent.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/patents/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || 'Failed to delete patent.');
      } else {
        setDeleteTarget(null);
        setRefreshKey(k => k + 1);
      }
    } catch (err: any) {
      alert('Failed to delete patent record.');
    } finally {
      setDeleting(false);
    }
  };

  const handleClearAll = async () => {
    setClearLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/patents/clear-all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || 'Failed to clear patent records.');
      } else {
        setIsClearOpen(false);
        setRefreshKey(k => k + 1);
      }
    } catch (_) {
      alert('Failed to clear patent records.');
    } finally {
      setClearLoading(false);
    }
  };

  // Proof link opening helper
  const handleOpenProofLink = (item: PatentItem) => {
    if (item.proofs && item.proofs.length > 0) {
      const primary = item.proofs.find(p => p.driveUrl) || item.proofs[0];
      if (primary && primary.driveUrl) {
        window.open(primary.driveUrl, '_blank', 'noopener,noreferrer');
        return;
      }
    }
    if (item.patentUrl) {
      window.open(item.patentUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // 5-Step Bulk Upload Handlers
  const handleDownloadTemplate = () => {
    window.open(`${API_BASE}/api/patents/template`, '_blank');
  };

  const handleBulkFileSelect = async (file: File) => {
    setBulkFile(file);
    setBulkError('');
    setBulkPreview(null);
    setBulkResult(null);
    setBulkLoading(true);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/api/patents/bulk/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const json = await res.json();
      if (!json.success) {
        setBulkError(json.message || 'Failed to parse and evaluate patent spreadsheet.');
        return;
      }
      setBulkPreview(json);
    } catch (err: any) {
      setBulkError(err.message || 'Error uploading file for preview.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!bulkFile) return;
    setBulkLoading(true);
    setBulkError('');
    try {
      const fd = new FormData();
      fd.append('file', bulkFile);
      const res = await fetch(`${API_BASE}/api/patents/bulk/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const json = await res.json();
      if (!json.success) {
        setBulkError(json.message || 'Failed to complete patent import.');
        return;
      }
      setBulkResult(json);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      setBulkError(err.message || 'Network error during bulk import.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDownloadImportReport = () => {
    if (!bulkPreview?.rows && !bulkResult?.rows) return;
    const rowsToExport = bulkResult?.rows || bulkPreview?.rows || [];
    const exportData = rowsToExport.map((r: any) => ({
      Row: r.rowNumber,
      Status: r.rowStatus,
      Title: r.data?.title || '',
      EmpIds: r.data?.empIdsRaw || '',
      'Application No': r.data?.applicationNo || '',
      'Patent No': r.data?.patentNo || '',
      'Patent Status': r.data?.status || '',
      'Patent Type': r.data?.patentType || '',
      'Filing Date': r.data?.filingDate || '',
      'Publication Date': r.data?.publicationDate || '',
      'Publication Year': r.data?.publicationYear || '',
      'Grant Date': r.data?.grantDate || '',
      'License Date': r.data?.licenseDate || '',
      'Commercial Partner': r.data?.partner || '',
      Revenue: r.data?.revenue || 0,
      'Proof Link': r.data?.proofUrl || '',
      Warnings: (r.warnings || []).join('; '),
      Errors: (r.errors || []).join('; ')
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import_Report');
    XLSX.writeFile(wb, `Patents_Import_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export Table Data (Excel & CSV)
  const handleExport = (format: 'xlsx' | 'csv') => {
    if (patents.length === 0) {
      alert('No patent records to export.');
      return;
    }
    const data = patents.map((p, idx) => ({
      'S.No': idx + 1,
      Title: p.title,
      'Associated Faculty EmpIds': p.empIdsRaw || (p.facultyAssociations || []).map(f => f.employeeId).join(', '),
      'CHRIST Inventors': (p.facultyAssociations || []).filter(f => f.isValid).map(f => `${f.facultyName || f.employeeId} (${f.employeeId})`).join('; '),
      'External Inventors': (p.externalInventors || []).map(e => `${e.name}${e.institution ? ` [${e.institution}]` : ''}`).join('; '),
      'Original Departments': (p.originalDepartments || []).join(', ') || p.department || '',
      'Current Departments': (p.currentDepartments || []).join(', ') || p.department || '',
      'Application No': p.applicationNo || '',
      'Patent No': p.patentNo || '',
      Status: p.status,
      'Patent Type': p.patentType,
      'Filing Date': formatDateDisplay(p.filedDate),
      'Publication Date': formatDateDisplay(p.publishedDate),
      'Publication Year': p.publicationYear || (p.publishedDate ? p.publishedDate.slice(0, 4) : ''),
      'Grant Date': formatDateDisplay(p.grantedDate),
      'License Date': formatDateDisplay(p.licenseDate),
      'Commercial Partner': p.partner || '',
      'Revenue Generated (INR)': p.revenue || 0,
      'Official Patent URL': p.patentUrl || '',
      'Proof Documents': (p.proofs || []).map(pr => pr.driveUrl).join('; ')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Patents');

    const filename = `Patents_Export_${new Date().toISOString().slice(0, 10)}.${format}`;
    if (format === 'xlsx') {
      XLSX.writeFile(wb, filename);
    } else {
      XLSX.writeFile(wb, filename, { bookType: 'csv' });
    }
  };

  const getStatusBadge = (status: string) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('grant')) {
      return <Badge className="bg-[#E8F5ED] text-[#167447] border-[#C6E7D2] text-[10px]">Granted</Badge>;
    }
    if (s.includes('commercial') || s.includes('licens')) {
      return <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">Licensed</Badge>;
    }
    if (s.includes('publish')) {
      return <Badge className="bg-blue-50 text-[#2855B9] border-blue-200 text-[10px]">Published</Badge>;
    }
    if (s.includes('exam')) {
      return <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Under Examination</Badge>;
    }
    return <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px]">Filed</Badge>;
  };

  const content = (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Research & Innovation' },
          { label: 'IPRs' },
          { label: 'Patents' }
        ]}
        title="Patents & IP Repository"
        badge={`${metrics.totalPatents.toLocaleString()} Records`}
        description="Track institutional patent filings, examination status, grants, commercial licensing, multi-faculty inventors, and verified Google Drive proof documents."
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
                  <span>Add Patent</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* KPI Metrics Cards (5 Patent-Specific Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Patents"
          value={metrics.totalPatents.toLocaleString()}
          subtitle="All recorded patent records"
          icon={Award}
        />
        <StatCard
          title="Applications Filed"
          value={metrics.applicationsFiled.toLocaleString()}
          subtitle="Filed / Under examination"
          icon={FileText}
        />
        <StatCard
          title="Granted Patents"
          value={metrics.grantedPatents.toLocaleString()}
          badge={metrics.totalPatents > 0 ? `${Math.round((metrics.grantedPatents / metrics.totalPatents) * 100)}%` : '0%'}
          subtitle="Officially awarded patents"
          icon={ShieldCheck}
        />
        <StatCard
          title="Licensed Patents"
          value={metrics.licensedPatents.toLocaleString()}
          subtitle="Commercialized technologies"
          icon={TrendingUp}
        />
        <StatCard
          title="Revenue Generated"
          value={`₹${(metrics.totalRevenue || 0).toLocaleString('en-IN')}`}
          subtitle="Total commercial royalties / revenue"
          icon={DollarSign}
        />
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <Card className="shadow-sm border-gray-200 bg-white">
        <CardContent className="p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          <div className="relative w-full xl:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search title, application no, patent no, EmpId, faculty..."
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

          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto justify-start sm:justify-end">
            {/* Publication Calendar Year */}
            <div className="w-32">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Pub Year" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Pub Years</SelectItem>
                  {publicationYears.map(yr => (
                    <SelectItem key={yr} value={String(yr)}>{yr}</SelectItem>
                  ))}
                  <SelectItem value="missing">Missing / Blank Date</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department Multi-Select */}
            <div className="relative" ref={deptDropdownRef}>
              <button
                type="button"
                onClick={() => setDeptDropdownOpen(!deptDropdownOpen)}
                className="h-9 px-3 rounded-md border border-gray-200 bg-white text-xs flex items-center gap-2 text-slate-700 hover:bg-slate-50 min-w-[140px] max-w-[200px]"
              >
                <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  {selectedDepts.length === 0
                    ? 'All Departments'
                    : selectedDepts.length === 1
                    ? selectedDepts[0]
                    : `${selectedDepts.length} Depts selected`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-auto shrink-0" />
              </button>

              {deptDropdownOpen && (
                <div className="absolute right-0 mt-1 w-72 max-h-72 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 overflow-y-auto text-xs space-y-1">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 px-1">
                    <span className="font-semibold text-slate-800">Filter by Department</span>
                    {selectedDepts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedDepts([])}
                        className="text-[10px] text-[#2855B9] hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {departments.map(dept => {
                    const isChecked = selectedDepts.includes(dept);
                    return (
                      <label
                        key={dept}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedDepts(selectedDepts.filter(d => d !== dept));
                            } else {
                              setSelectedDepts([...selectedDepts, dept]);
                            }
                          }}
                          className="rounded text-[#2855B9] focus:ring-[#2855B9]"
                        />
                        <span className="truncate">{dept}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Patent Status */}
            <div className="w-36">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {PATENT_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Patent Type */}
            <div className="w-36">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Patent Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {PATENT_TYPE_OPTIONS.map(tp => (
                    <SelectItem key={tp} value={tp}>{tp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Proof Filter */}
            <div className="w-28">
              <Select value={selectedProofFilter} onValueChange={setSelectedProofFilter}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Proof" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Proofs</SelectItem>
                  <SelectItem value="has_proof">With Proof</SelectItem>
                  <SelectItem value="missing">Missing Proof</SelectItem>
                  <SelectItem value="verified">Verified Access</SelectItem>
                  <SelectItem value="issue">Access Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* EmpId Validation Filter */}
            <div className="w-32">
              <Select value={selectedValidationFilter} onValueChange={setSelectedValidationFilter}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Validation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All EmpIds</SelectItem>
                  <SelectItem value="valid">Valid EmpIds</SelectItem>
                  <SelectItem value="invalid_empids">Has Invalid EmpIds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-200 rounded-lg p-0.5 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded text-xs ${viewMode === 'table' ? 'bg-white shadow-xs font-semibold text-[#2855B9]' : 'text-gray-500'}`}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded text-xs ${viewMode === 'cards' ? 'bg-white shadow-xs font-semibold text-[#2855B9]' : 'text-gray-500'}`}
              >
                Cards
              </button>
            </div>

            {canModify && currentRole === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsClearOpen(true)}
                className="h-9 px-2.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                <span>Clear All</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Table View */}
      {viewMode === 'table' ? (
        <Card className="shadow-sm border-gray-200 bg-white overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#1C355B] text-white">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center font-semibold">#</th>
                    <th className="py-3 px-3 font-semibold min-w-[240px]">Patent Title</th>
                    <th className="py-3 px-3 font-semibold min-w-[220px]">Inventors & Faculty</th>
                    <th className="py-3 px-3 font-semibold min-w-[150px]">App No / Patent No</th>
                    <th className="py-3 px-3 font-semibold min-w-[130px]">Status & Type</th>
                    <th className="py-3 px-3 font-semibold min-w-[120px]">Pub Date / Year</th>
                    <th className="py-3 px-3 font-semibold min-w-[120px]">Grant / License</th>
                    <th className="py-3 px-3 font-semibold text-center w-24">Proof</th>
                    <th className="py-3 px-3 font-semibold text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-500">
                        <RefreshCw className="w-5 h-5 mx-auto animate-spin text-[#2855B9] mb-2" />
                        <span>Loading patent records...</span>
                      </td>
                    </tr>
                  ) : patents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-500">
                        <FileText className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                        <p className="font-semibold text-gray-700">No patent records found</p>
                        <p className="text-xs text-gray-400 mt-0.5">Try adjusting your filters or search query.</p>
                      </td>
                    </tr>
                  ) : (
                    patents.map((item, idx) => {
                      const associations = item.facultyAssociations || [];
                      const external = item.externalInventors || [];
                      const hasWarning = item.hasInvalidEmpIds || (item.invalidEmpIds && item.invalidEmpIds.length > 0);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3 text-center text-gray-400 font-mono text-[11px]">
                            {(page - 1) * pageSize + idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <button
                              onClick={() => setViewingItem(item)}
                              className="font-semibold text-slate-900 hover:text-[#2855B9] text-left leading-snug line-clamp-2"
                            >
                              {item.title}
                            </button>
                            {item.description && (
                              <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{item.description}</p>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1 items-center max-w-xs">
                              {associations.map((assoc, aIdx) => (
                                <span
                                  key={aIdx}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                    assoc.isValid
                                      ? assoc.departmentTransferred
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-slate-100 text-slate-800 border-slate-200'
                                      : 'bg-rose-50 text-rose-800 border-rose-200'
                                  }`}
                                  title={`${assoc.facultyName || 'Unrecognized'} (${assoc.employeeId})${
                                    assoc.departmentTransferred ? ` — Transferred from ${assoc.originalDepartment} to ${assoc.currentDepartment}` : ''
                                  }`}
                                >
                                  {assoc.isValid ? <UserCheck className="w-2.5 h-2.5 text-emerald-600" /> : <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />}
                                  <span>{assoc.facultyName ? `${assoc.facultyName} (${assoc.employeeId})` : assoc.employeeId}</span>
                                </span>
                              ))}

                              {external.map((ext, eIdx) => (
                                <span
                                  key={`ext-${eIdx}`}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-800 border border-purple-200"
                                  title={`External: ${ext.name}${ext.institution ? ` (${ext.institution})` : ''}`}
                                >
                                  <Building className="w-2.5 h-2.5 text-purple-600" />
                                  <span>{ext.name}</span>
                                </span>
                              ))}

                              {associations.length === 0 && external.length === 0 && (
                                <span className="text-[11px] text-gray-400 italic">
                                  {item.inventors || 'Not specified'}
                                </span>
                              )}
                            </div>

                            {hasWarning && (
                              <div className="flex items-center gap-1 mt-1 text-[10px] text-rose-700">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                <span>Unrecognized EmpId(s)</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                            <div>{item.applicationNo || '-'}</div>
                            {item.patentNo && (
                              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                Pat: {item.patentNo}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="space-y-1">
                              {getStatusBadge(item.status)}
                              <div className="text-[10px] text-gray-500 truncate max-w-[130px]">
                                {item.patentType}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-mono text-[11px] text-slate-800">
                              {formatDateDisplay(item.publishedDate)}
                            </div>
                            {item.publicationYear ? (
                              <Badge variant="outline" className="text-[9px] mt-0.5 border-blue-200 text-[#2855B9] bg-blue-50/50">
                                Year: {item.publicationYear}
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic block">No pub year</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-[11px]">
                            {item.grantedDate ? (
                              <div className="text-emerald-800 font-medium">
                                Granted: {formatDateDisplay(item.grantedDate)}
                              </div>
                            ) : item.licenseDate ? (
                              <div className="text-purple-800 font-medium">
                                Licensed: {formatDateDisplay(item.licenseDate)}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                            {Number(item.revenue || 0) > 0 && (
                              <div className="text-[10px] font-semibold text-emerald-700 mt-0.5">
                                ₹{Number(item.revenue).toLocaleString('en-IN')}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {item.proofs && item.proofs.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleOpenProofLink(item)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8F5ED] text-[#167447] border border-[#C6E7D2] hover:bg-emerald-100"
                              >
                                <FileCheck className="w-3 h-3" />
                                <span>Proof</span>
                                <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                              </button>
                            ) : item.patentUrl ? (
                              <a
                                href={item.patentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-[#2855B9] border border-blue-200 hover:bg-blue-100"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Link</span>
                              </a>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">None</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setViewingItem(item)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {canModify && (
                                <>
                                  <button
                                    onClick={() => openEditModal(item)}
                                    className="p-1 hover:bg-blue-50 rounded text-slate-500 hover:text-[#2855B9]"
                                    title="Edit Patent"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteTarget(item)}
                                    className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600"
                                    title="Delete Patent"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/40">
              <div>
                Showing {Math.min((page - 1) * pageSize + 1, totalCount)} to {Math.min(page * pageSize, totalCount)} of {totalCount} records
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="h-7 text-xs px-2.5"
                >
                  Previous
                </Button>
                <span className="font-semibold text-slate-700">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="h-7 text-xs px-2.5"
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-12 text-center text-gray-500">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-[#2855B9] mb-2" />
              <span>Loading patent records...</span>
            </div>
          ) : patents.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-500">
              <FileText className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="font-semibold text-gray-700">No patent records found</p>
            </div>
          ) : (
            patents.map(item => (
              <Card key={item.id} className="shadow-sm border-gray-200 bg-white hover:border-[#2855B9]/40 transition-all flex flex-col justify-between">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getStatusBadge(item.status)}
                      <Badge variant="outline" className="text-[10px] text-gray-600">
                        {item.patentType}
                      </Badge>
                    </div>
                    {item.publicationYear && (
                      <Badge variant="secondary" className="text-[10px] bg-blue-50 text-[#2855B9]">
                        {item.publicationYear}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h4
                      onClick={() => setViewingItem(item)}
                      className="font-bold text-slate-900 text-sm hover:text-[#2855B9] cursor-pointer line-clamp-2"
                    >
                      {item.title}
                    </h4>
                    {item.applicationNo && (
                      <p className="text-[11px] font-mono text-gray-500 mt-0.5">
                        App: {item.applicationNo}
                      </p>
                    )}
                  </div>

                  <div className="text-[11px] text-gray-600 border-t border-gray-100 pt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Pub Date:</span>
                      <span className="font-mono">{formatDateDisplay(item.publishedDate)}</span>
                    </div>
                    {item.grantedDate && (
                      <div className="flex items-center justify-between text-emerald-800">
                        <span className="text-gray-400">Granted:</span>
                        <span className="font-mono font-semibold">{formatDateDisplay(item.grantedDate)}</span>
                      </div>
                    )}
                    {Number(item.revenue || 0) > 0 && (
                      <div className="flex items-center justify-between text-emerald-700">
                        <span className="text-gray-400">Revenue:</span>
                        <span className="font-semibold">₹{Number(item.revenue).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 border-t border-gray-100 pt-2">
                    {(item.facultyAssociations || []).slice(0, 3).map((a, idx) => (
                      <span key={idx} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                        {a.facultyName || a.employeeId}
                      </span>
                    ))}
                    {(item.facultyAssociations || []).length > 3 && (
                      <span className="text-[10px] text-gray-400">
                        +{(item.facultyAssociations || []).length - 3} more
                      </span>
                    )}
                  </div>
                </CardContent>

                <div className="p-3 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between text-xs">
                  <Button size="sm" variant="ghost" onClick={() => setViewingItem(item)} className="h-7 text-xs">
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Details
                  </Button>
                  {canModify && (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEditModal(item)} className="h-7 text-xs">
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(item)} className="h-7 text-xs text-rose-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ADD / EDIT PATENT MODAL (With Undo, Redo, and Save buttons)    */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-[#2855B9]" />
                <span>{editingItem ? 'Edit Patent Record' : 'Add New Patent Record'}</span>
              </DialogTitle>
              {/* Form History Toolbar: Undo & Redo */}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={formHistory.past.length === 0}
                  onClick={handleUndo}
                  className="h-8 px-2 text-xs flex items-center gap-1 text-slate-600"
                  title="Undo last change"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={formHistory.future.length === 0}
                  onClick={handleRedo}
                  className="h-8 px-2 text-xs flex items-center gap-1 text-slate-600"
                  title="Redo change"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Redo</span>
                </Button>
              </div>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Provide patent title, associated CHRIST faculty EmpIds, external inventors, key dates, and official proof links.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePatent} className="space-y-4 py-2 text-xs">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Patent Title */}
            <div>
              <Label className="text-xs font-semibold text-slate-800">
                Patent Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="text"
                placeholder="Enter complete title of invention..."
                value={currentForm.title}
                onChange={(e) => updateFormState({ title: e.target.value })}
                className="mt-1 h-9 text-xs"
                required
              />
            </div>

            {/* ── MULTI-FACULTY ASSOCIATIONS SECTION ── */}
            <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#2855B9]" />
                    <span>Associated CHRIST Faculty Inventors</span>
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Supports multiple inventors. Select from directory or type comma-separated EmpIds (e.g. <code>3489, 2043, 1672</code>).
                  </p>
                </div>
              </div>

              {/* Method A: Searchable Selector */}
              <div>
                <Label className="text-[11px] text-slate-600 font-semibold">Search Faculty Directory</Label>
                <div className="relative mt-1">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    placeholder="Search by faculty name, designation, department, or EmpId..."
                    value={facultyQuery}
                    onChange={(e) => setFacultyQuery(e.target.value)}
                    className="pl-8 h-8 text-xs bg-white"
                  />
                  {facultyLoading && (
                    <RefreshCw className="w-3 h-3 text-[#2855B9] animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {facultyQuery && facultyOptions.length > 0 && (
                  <div className="mt-1 max-h-36 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-sm divide-y divide-slate-100">
                    {facultyOptions.map(fac => {
                      const isSelected = parsedFormEmpIds.some(id => id.toUpperCase() === fac.employeeId.toUpperCase());
                      return (
                        <div
                          key={fac.id || fac.employeeId}
                          onClick={() => toggleFacultyInForm(fac)}
                          className={`p-2 flex items-center justify-between cursor-pointer hover:bg-slate-50 text-xs ${isSelected ? 'bg-blue-50/50' : ''}`}
                        >
                          <div>
                            <span className="font-semibold text-slate-800">{fac.name}</span>
                            <span className="font-mono text-[11px] text-slate-500 ml-1.5">({fac.employeeId})</span>
                            <span className="text-[10px] text-slate-400 ml-2">{fac.department}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#2855B9]" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Method B: Comma-Separated Input */}
              <div>
                <Label className="text-[11px] text-slate-600 font-semibold">
                  Manual EmpId Input (Comma-Separated)
                </Label>
                <Input
                  type="text"
                  placeholder="e.g. 3489, 2043, 1672"
                  value={currentForm.empIdsRaw}
                  onChange={(e) => updateFormState({ empIdsRaw: e.target.value })}
                  className="mt-1 h-8 text-xs bg-white font-mono"
                />
              </div>

              {/* Selected Faculty Chips */}
              {parsedFormEmpIds.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-700 block">
                    Selected Faculty ({parsedFormEmpIds.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedFormEmpIds.map(empId => {
                      const info = resolvedFacultyMap[empId.trim().toUpperCase()];
                      const isRecognized = Boolean(info);
                      return (
                        <span
                          key={empId}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                            isRecognized
                              ? 'bg-white border-emerald-200 text-emerald-900 shadow-2xs'
                              : 'bg-amber-50 border-amber-300 text-amber-900'
                          }`}
                        >
                          {isRecognized ? (
                            <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          )}
                          <span className="font-mono font-semibold">{empId}</span>
                          {info?.name && <span>— {info.name}</span>}
                          {info?.department && (
                            <span className="text-[10px] text-slate-500">[{info.department}]</span>
                          )}
                          {!isRecognized && (
                            <span className="text-[10px] text-amber-700 italic">(Unrecognized)</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const next = parsedFormEmpIds.filter(id => id.toUpperCase() !== empId.toUpperCase());
                              updateFormState({ empIdsRaw: next.join(', ') });
                            }}
                            className="text-slate-400 hover:text-rose-600 ml-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── EXTERNAL INVENTORS SECTION ── */}
            <div className="p-4 bg-purple-50/40 border border-purple-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-purple-700" />
                    <span>External / Non-CHRIST Inventors</span>
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Add collaborators from partner institutions or industries. External inventors are not saved in Faculty Management.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addExternalInventor}
                  className="h-7 text-xs border-purple-200 text-purple-800 bg-white hover:bg-purple-50"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add External Inventor
                </Button>
              </div>

              {(currentForm.externalInventors || []).map((ext, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Inventor Full Name..."
                    value={ext.name}
                    onChange={(e) => updateExternalInventor(idx, 'name', e.target.value)}
                    className="h-8 text-xs bg-white flex-1"
                  />
                  <Input
                    type="text"
                    placeholder="Institution / Organization..."
                    value={ext.institution || ''}
                    onChange={(e) => updateExternalInventor(idx, 'institution', e.target.value)}
                    className="h-8 text-xs bg-white flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExternalInventor(idx)}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Application & Patent Numbers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Application Number</Label>
                <Input
                  type="text"
                  placeholder="e.g. 202441012345"
                  value={currentForm.applicationNo}
                  onChange={(e) => updateFormState({ applicationNo: e.target.value })}
                  className="mt-1 h-9 text-xs font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Patent Number (if Granted)</Label>
                <Input
                  type="text"
                  placeholder="e.g. 498123"
                  value={currentForm.patentNo}
                  onChange={(e) => updateFormState({ patentNo: e.target.value })}
                  className="mt-1 h-9 text-xs font-mono"
                />
              </div>
            </div>

            {/* Status & Patent Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Patent Status</Label>
                <Select
                  value={currentForm.status}
                  onValueChange={(val) => updateFormState({ status: val })}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PATENT_STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Patent Type / Jurisdiction</Label>
                <Select
                  value={currentForm.patentType}
                  onValueChange={(val) => updateFormState({ patentType: val })}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PATENT_TYPE_OPTIONS.map(tp => (
                      <SelectItem key={tp} value={tp}>{tp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Key Dates (Filing, Publication, Grant, License) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Filing Date</Label>
                <Input
                  type="date"
                  value={currentForm.filedDate}
                  onChange={(e) => updateFormState({ filedDate: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700">Publication Date</Label>
                  {derivedFormPubYear ? (
                    <Badge variant="secondary" className="text-[10px] bg-blue-50 text-[#2855B9] border border-blue-200">
                      Pub Year: {derivedFormPubYear}
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-gray-400 italic">Auto-derived</span>
                  )}
                </div>
                <Input
                  type="date"
                  value={currentForm.publishedDate}
                  onChange={(e) => updateFormState({ publishedDate: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">
                  Grant Date {currentForm.status === 'granted' && <span className="text-rose-500">*</span>}
                </Label>
                <Input
                  type="date"
                  value={currentForm.grantedDate}
                  onChange={(e) => updateFormState({ grantedDate: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">License Date</Label>
                <Input
                  type="date"
                  value={currentForm.licenseDate}
                  onChange={(e) => updateFormState({ licenseDate: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {/* Commercial Partner & Revenue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Commercial Partner / Licensee</Label>
                <Input
                  type="text"
                  placeholder="e.g. HealthTech Innovations Ltd"
                  value={currentForm.partner}
                  onChange={(e) => updateFormState({ partner: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Revenue Generated (INR)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={currentForm.revenue || ''}
                  onChange={(e) => updateFormState({ revenue: Number(e.target.value) || 0 })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {/* Patent URL */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Official Patent URL</Label>
              <Input
                type="url"
                placeholder="https://ipindiaservices.gov.in/publicsearch or Google Patents..."
                value={currentForm.patentUrl}
                onChange={(e) => updateFormState({ patentUrl: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            {/* Google Drive Proof Links */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Google Drive Proof Link(s)</Label>
              <textarea
                rows={2}
                placeholder="Paste shareable Google Drive links (one per line)..."
                value={currentForm.proofLinks}
                onChange={(e) => updateFormState({ proofLinks: e.target.value })}
                className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            {/* Direct File Proof Upload */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Or Upload Proof Document (PDF, PNG, JPG)</Label>
              <input
                ref={formFileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  if (e.target.files?.[0]) setFormProofFile(e.target.files[0]);
                }}
                className="mt-1 block w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-blue-50 file:text-[#2855B9] hover:file:bg-blue-100"
              />
              {formProofFile && (
                <p className="text-[11px] text-emerald-700 mt-1">
                  Selected file: {formProofFile.name} ({Math.round(formProofFile.size / 1024)} KB)
                </p>
              )}
            </div>

            {/* Abstract / Summary */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Summary / Abstract</Label>
              <textarea
                rows={3}
                placeholder="Brief technical abstract or description of invention..."
                value={currentForm.description}
                onChange={(e) => updateFormState({ description: e.target.value })}
                className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={formHistory.past.length === 0}
                  onClick={handleUndo}
                  className="h-8 text-xs flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={formHistory.future.length === 0}
                  onClick={handleRedo}
                  className="h-8 text-xs flex items-center gap-1"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Redo</span>
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={formSubmitting}
                  className="bg-[#2855B9] hover:bg-[#1C355B] text-white flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{formSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Save Patent'}</span>
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5-STEP BULK UPLOAD MODAL (Exact 15-Column Official Template)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#2855B9]" />
              <span>Patents Bulk Excel Upload</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Upload Excel (.xlsx, .xls, .csv) using the official 15-column template. Multi-inventor EmpIds must be comma-separated. Google Drive links are accepted for proofs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Step 1: Official Template */}
            <div className="p-3.5 bg-[#EAF1FD]/50 border border-[#C8DCFB] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800">Official 15-Column Patent Template</p>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Columns: <code>Title, EmpId, Application No, Patent No, Status, Patent Type, Filing Date, Publication Date, Grant Date, License Date, Commercial Partner, Revenue Generated (INR), Patent URL, Proof, Abstract</code>
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleDownloadTemplate} className="bg-white border-[#C8DCFB] text-[#2855B9] shrink-0 text-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download Template (.xlsx)
              </Button>
            </div>

            {/* Step 2: File Selector */}
            <div>
              <input
                ref={bulkFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleBulkFileSelect(e.target.files[0]); }}
              />
              <div
                onClick={() => bulkFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-[#2855B9] rounded-xl p-6 text-center cursor-pointer bg-slate-50/40"
              >
                <UploadCloud className="w-8 h-8 mx-auto text-[#2855B9] mb-2" />
                <p className="font-semibold text-slate-800">
                  {bulkFile ? `${bulkFile.name} (${Math.round(bulkFile.size / 1024)} KB)` : 'Click to select Patents Excel / CSV file'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Supports .xlsx, .xls, and .csv formats</p>
              </div>
            </div>

            {bulkError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bulkError}</span>
              </div>
            )}

            {/* Step 3: Row-level Preview */}
            {bulkPreview && !bulkResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 block">Total Rows</span>
                    <span className="text-base font-bold text-slate-900">{bulkPreview.summary.totalRows}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] uppercase text-emerald-700 block">Valid (Clean)</span>
                    <span className="text-base font-bold text-emerald-800">{bulkPreview.summary.validCleanCount}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <span className="text-[10px] uppercase text-amber-800 block">EmpId Warning</span>
                    <span className="text-base font-bold text-amber-900">{bulkPreview.summary.warningInvalidEmpIdCount}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                    <span className="text-[10px] uppercase text-blue-700 block">Missing Pub Date</span>
                    <span className="text-base font-bold text-blue-900">{bulkPreview.summary.missingPublicationDateCount}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                    <span className="text-[10px] uppercase text-indigo-700 block">Duplicates (Skip)</span>
                    <span className="text-base font-bold text-indigo-900">{bulkPreview.summary.duplicateCount}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                    <span className="text-[10px] uppercase text-rose-700 block">Errors (Reject)</span>
                    <span className="text-base font-bold text-rose-900">{bulkPreview.summary.invalidErrorCount}</span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2">Row</th>
                        <th className="p-2">EmpIds</th>
                        <th className="p-2">Title</th>
                        <th className="p-2">App / Patent No</th>
                        <th className="p-2">Status / Type</th>
                        <th className="p-2">Pub Date / Yr</th>
                        <th className="p-2">Proof</th>
                        <th className="p-2">Validation Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(bulkPreview.rows || []).map((r: any) => (
                        <tr key={r.rowNumber}>
                          <td className="p-2 font-mono">{r.rowNumber}</td>
                          <td className="p-2 font-mono">{r.data?.empIdsRaw || '-'}</td>
                          <td className="p-2 font-medium max-w-[200px] truncate">{r.data?.title || '-'}</td>
                          <td className="p-2 font-mono">
                            {[r.data?.applicationNo, r.data?.patentNo].filter(Boolean).join(' / ') || '-'}
                          </td>
                          <td className="p-2">
                            <span>{r.data?.status}</span>
                            <span className="text-[10px] text-gray-400 block">{r.data?.patentType}</span>
                          </td>
                          <td className="p-2 font-mono">
                            {r.data?.publicationDate ? `${r.data.publicationDate} (${r.data.publicationYear})` : 'Missing Date'}
                          </td>
                          <td className="p-2">{r.data?.proofUrl ? 'Drive Link' : 'Blank'}</td>
                          <td className="p-2">
                            {r.rowStatus === 'valid' && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Ready</Badge>
                            )}
                            {r.rowStatus === 'warning' && (
                              <div>
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Import w/ Warning</Badge>
                                <p className="text-[10px] text-amber-800 mt-0.5">{(r.warnings || []).join('; ')}</p>
                              </div>
                            )}
                            {r.rowStatus === 'duplicate' && (
                              <div>
                                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px]">Duplicate (Skip)</Badge>
                                <p className="text-[10px] text-indigo-800 mt-0.5">{r.duplicateReason}</p>
                              </div>
                            )}
                            {r.rowStatus === 'error' && (
                              <div>
                                <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">Rejected</Badge>
                                <p className="text-[10px] text-rose-700 mt-0.5">{(r.errors || []).join('; ')}</p>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Step 4 & 5: Final Import Summary */}
            {bulkResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <span>{bulkResult.message}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={handleDownloadImportReport} className="bg-white text-xs">
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download Import Report
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[11px]">
                  <div className="bg-white p-2 rounded border border-emerald-200">Imported: <strong>{bulkResult.summary.importedCount}</strong></div>
                  <div className="bg-white p-2 rounded border border-amber-200">With Invalid EmpIds: <strong>{bulkResult.summary.importedWithInvalidEmpIdsCount}</strong></div>
                  <div className="bg-white p-2 rounded border border-blue-200">Missing Pub Date: <strong>{bulkResult.summary.missingPublicationDateCount || 0}</strong></div>
                  <div className="bg-white p-2 rounded border border-indigo-200">Duplicates Skipped: <strong>{bulkResult.summary.skippedDuplicatesCount}</strong></div>
                  <div className="bg-white p-2 rounded border border-rose-200">Errors Rejected: <strong>{bulkResult.summary.rejectedErrorCount || bulkResult.summary.rejectedMandatoryCount || 0}</strong></div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsBulkOpen(false)}>Close</Button>
            {bulkPreview && !bulkResult && bulkPreview.summary.eligibleCount > 0 && (
              <Button
                size="sm"
                disabled={bulkLoading}
                onClick={handleExecuteImport}
                className="bg-[#2855B9] hover:bg-[#1C355B] text-white"
              >
                {bulkLoading ? 'Importing...' : `Import ${bulkPreview.summary.eligibleCount} Patent(s) (Skip ${bulkPreview.summary.duplicateCount} Duplicates)`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RECORD DETAILS DRAWER / MODAL                                 */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={!!viewingItem} onOpenChange={(open) => !open && setViewingItem(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl">
          {viewingItem && (
            <div className="space-y-5 text-xs">
              <DialogHeader className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {getStatusBadge(viewingItem.status)}
                  <Badge variant="outline" className="text-[10px]">
                    {viewingItem.patentType}
                  </Badge>
                  {viewingItem.publicationYear ? (
                    <Badge variant="secondary" className="text-[10px] bg-blue-50 text-[#2855B9]">
                      Pub Year: {viewingItem.publicationYear}
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-gray-400 italic">No publication year</span>
                  )}
                </div>
                <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                  {viewingItem.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Application No: <span className="font-mono font-semibold text-slate-800">{viewingItem.applicationNo || 'Not specified'}</span>
                  {viewingItem.patentNo && (
                    <span className="ml-3">Patent No: <strong className="font-mono text-emerald-800">{viewingItem.patentNo}</strong></span>
                  )}
                </DialogDescription>
              </DialogHeader>

              {/* Key Dates & Commercial Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Filing Date</span>
                  <span className="font-mono text-slate-800">{formatDateDisplay(viewingItem.filedDate)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Publication Date</span>
                  <span className="font-mono text-slate-800">{formatDateDisplay(viewingItem.publishedDate)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Grant Date</span>
                  <span className="font-mono text-slate-800">{formatDateDisplay(viewingItem.grantedDate)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Revenue (INR)</span>
                  <span className="font-semibold text-emerald-700">₹{Number(viewingItem.revenue || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Internal Faculty Inventors Table */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#2855B9]" />
                  <span>Internal CHRIST Faculty Inventors ({(viewingItem.facultyAssociations || []).length})</span>
                </Label>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-2">EmpId</th>
                        <th className="p-2">Faculty Name</th>
                        <th className="p-2">Designation</th>
                        <th className="p-2">Original Department (Snapshot)</th>
                        <th className="p-2">Current Department (Live)</th>
                        <th className="p-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(viewingItem.facultyAssociations || []).map((assoc, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2 font-mono font-semibold">{assoc.employeeId}</td>
                          <td className="p-2 font-medium">{assoc.facultyName || '-'}</td>
                          <td className="p-2 text-slate-500">{assoc.designation || '-'}</td>
                          <td className="p-2 text-slate-700">{assoc.originalDepartment || '-'}</td>
                          <td className="p-2 text-slate-700">
                            <span>{assoc.currentDepartment || assoc.originalDepartment || '-'}</span>
                            {assoc.departmentTransferred && (
                              <Badge className="ml-1.5 bg-amber-50 text-amber-800 border-amber-200 text-[9px]">Transferred</Badge>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {assoc.isValid ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Verified</Badge>
                            ) : (
                              <Badge className="bg-rose-50 text-rose-800 border-rose-200 text-[10px]">Unrecognized</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(viewingItem.facultyAssociations || []).length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-3 text-center text-slate-400 italic">
                            No internal faculty mapped. Listed as: {viewingItem.inventors || 'None'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* External Inventors Table */}
              {(viewingItem.externalInventors || []).length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-purple-700" />
                    <span>External Collaborating Inventors ({viewingItem.externalInventors?.length})</span>
                  </Label>
                  <div className="border border-purple-200 rounded-xl overflow-hidden bg-purple-50/20">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-purple-100/50 border-b border-purple-200 text-purple-900">
                        <tr>
                          <th className="p-2">Inventor Name</th>
                          <th className="p-2">Institution / Organization</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-100">
                        {viewingItem.externalInventors?.map((ext, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-medium">{ext.name}</td>
                            <td className="p-2 text-slate-600">{ext.institution || 'Independent / Not specified'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Proof Documents & Links */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>Official Documents & Proofs</span>
                </Label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  {viewingItem.patentUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 w-28 shrink-0">Official URL:</span>
                      <a
                        href={viewingItem.patentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#2855B9] hover:underline font-medium truncate flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{viewingItem.patentUrl}</span>
                      </a>
                    </div>
                  )}

                  {(viewingItem.proofs || []).map((proof, pIdx) => (
                    <div key={pIdx} className="flex items-center justify-between gap-2 p-2 bg-white rounded border border-slate-200">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800 truncate">{proof.fileName}</span>
                      </div>
                      <a
                        href={proof.driveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#2855B9] hover:underline shrink-0 text-[11px] font-semibold flex items-center gap-1"
                      >
                        <span>Open Drive Document</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}

                  {!viewingItem.patentUrl && (!viewingItem.proofs || viewingItem.proofs.length === 0) && (
                    <p className="text-slate-400 italic text-[11px]">No proof documents or URLs attached to this record.</p>
                  )}
                </div>
              </div>

              {/* Abstract / Summary */}
              {viewingItem.description && (
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-900">Summary / Abstract</Label>
                  <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed text-[11px]">
                    {viewingItem.description}
                  </p>
                </div>
              )}

              <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => setViewingItem(null)}>
                  Close
                </Button>
                {canModify && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const itm = viewingItem;
                      setViewingItem(null);
                      openEditModal(itm);
                    }}
                    className="bg-[#2855B9] hover:bg-[#1C355B] text-white flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Patent</span>
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2 text-base">
              <AlertCircle className="w-5 h-5" />
              Delete Patent Record
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;? All associated junction mappings will be removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Confirmation Dialog */}
      <Dialog open={isClearOpen} onOpenChange={setIsClearOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2 text-base">
              <AlertCircle className="w-5 h-5" />
              Clear Patent Records
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Are you sure you want to delete all patent records in this scope? This action is recorded in audit logs and is irreversible.
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
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
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

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent } from './ui/card';
import {
  Copyright as CopyrightIcon, FileText, Users, Calendar, Building2, CheckCircle2,
  Clock, Plus, Search, Trash2, Edit, Eye, Download, AlertCircle, Upload, X,
  ExternalLink, Layers, RefreshCw, ShieldCheck, Paperclip, Link2, FileCheck,
  AlertTriangle, FileSpreadsheet, UploadCloud, ChevronDown, Check, UserCheck
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

export interface CopyrightFacultyAssociation {
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

export interface CopyrightItem {
  id: string;
  title: string;
  empIdsRaw?: string;
  dateOfApplication: string;
  calendarYear: number;
  registrationNo?: string | null;
  diaryNumber?: string | null;
  dateOfReceipt?: string | null;
  status: string;
  registrationStatus?: 'registered' | 'pending' | 'draft';
  proofUrl?: string | null;
  proofSourceType?: string | null;
  proofFileName?: string | null;
  proofAccessStatus?: string | null;
  proofAccessRemarks?: string | null;
  hasInvalidEmpIds?: boolean;
  invalidEmpIds?: string[];
  duplicateEmpIds?: string[];
  validFacultyCount?: number;
  departments?: string[];
  currentDepartments?: string[];
  originalDepartments?: string[];
  facultyAssociations?: CopyrightFacultyAssociation[];
  createdBy?: string | null;
  createdAt?: string;
}

export interface CopyrightMetrics {
  totalCopyrights: number;
  applicationsFiled: number;
  registeredCopyrights: number;
  pendingRegistration: number;
  draftCount?: number;
  validFacultyAssociationsCount: number;
  recordsWithInvalidEmpIds: number;
  withProofCount: number;
  missingProofCount: number;
}

interface CopyrightsPageProps {
  onNavigate: (page: string) => void;
  hideSidebar?: boolean;
  token?: string;
  userRole?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DEFAULT_METRICS: CopyrightMetrics = {
  totalCopyrights: 0,
  applicationsFiled: 0,
  registeredCopyrights: 0,
  pendingRegistration: 0,
  validFacultyAssociationsCount: 0,
  recordsWithInvalidEmpIds: 0,
  withProofCount: 0,
  missingProofCount: 0
};

function parseEmpIdsText(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(raw || '').split(/[,;\n\r]+/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function formatDateDisplay(val?: string | null): string {
  if (!val) return '-';
  return String(val).slice(0, 10);
}

export function CopyrightsPage({
  onNavigate,
  hideSidebar = false,
  token: propToken,
  userRole: propRole
}: CopyrightsPageProps) {
  const { user } = useAuth();
  const token = propToken || user?.token || '';
  const currentRole = String(propRole || user?.role || 'faculty').toLowerCase();
  const canModify = currentRole !== 'authority';

  // Filters
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [deptDropdownOpen, setDeptDropdownOpen] = useState(false);
  const deptDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedRegStatus, setSelectedRegStatus] = useState('all');
  const [selectedProofFilter, setSelectedProofFilter] = useState('all');
  const [selectedValidationFilter, setSelectedValidationFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Data
  const [copyrights, setCopyrights] = useState<CopyrightItem[]>([]);
  const [metrics, setMetrics] = useState<CopyrightMetrics>(DEFAULT_METRICS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  // Add / Edit Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CopyrightItem | null>(null);
  const [formEmpIdText, setFormEmpIdText] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDateOfApp, setFormDateOfApp] = useState('');
  const [formRegNo, setFormRegNo] = useState('');
  const [formDiaryNo, setFormDiaryNo] = useState('');
  const [formDateOfReceipt, setFormDateOfReceipt] = useState('');
  const [formProofUrl, setFormProofUrl] = useState('');
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
  const [viewingItem, setViewingItem] = useState<CopyrightItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CopyrightItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [proofTarget, setProofTarget] = useState<CopyrightItem | null>(null);
  const [proofLinkInput, setProofLinkInput] = useState('');
  const [proofUploadFile, setProofUploadFile] = useState<File | null>(null);
  const [proofSaving, setProofSaving] = useState(false);
  const proofModalFileRef = useRef<HTMLInputElement>(null);

  // Bulk Upload Modal
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

  const calendarYears = useMemo(() => {
    const cur = new Date().getFullYear();
    const yrs = new Set<number>();
    for (let y = cur + 1; y >= cur - 15; y--) yrs.add(y);
    copyrights.forEach(c => {
      if (c.calendarYear) yrs.add(Number(c.calendarYear));
    });
    return Array.from(yrs).sort((a, b) => b - a);
  }, [copyrights]);

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

  const fetchCopyrights = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(pageSize));
      if (selectedYear !== 'all') params.append('year', selectedYear);
      if (selectedDepts.length > 0) params.append('department', selectedDepts.join(','));
      if (selectedRegStatus !== 'all') params.append('registrationStatus', selectedRegStatus);
      if (selectedProofFilter !== 'all') params.append('proofStatus', selectedProofFilter);
      if (selectedValidationFilter !== 'all') params.append('validationStatus', selectedValidationFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`${API_BASE}/api/copyrights?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || 'Failed to load copyright records.');
        return;
      }
      setCopyrights(json.data || []);
      setMetrics(json.metrics || DEFAULT_METRICS);
      setTotalCount(json.total ?? (json.data?.length || 0));
      setTotalPages(json.pagination?.totalPages || 1);
    } catch (err: any) {
      setError('Unable to reach server for copyright records.');
    } finally {
      setLoading(false);
    }
  }, [token, page, selectedYear, selectedDepts, selectedRegStatus, selectedProofFilter, selectedValidationFilter, searchQuery]);

  useEffect(() => {
    fetchCopyrights();
  }, [fetchCopyrights, refreshKey]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedYear, selectedDepts, selectedRegStatus, selectedProofFilter, selectedValidationFilter, searchQuery]);

  // Faculty selector directory query
  useEffect(() => {
    if (!isFormOpen || !token) return;
    const handle = setTimeout(async () => {
      setFacultyLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/copyrights/faculty-search?q=${encodeURIComponent(facultyQuery)}&limit=60`, {
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

  const parsedFormEmpIds = useMemo(() => parseEmpIdsText(formEmpIdText), [formEmpIdText]);

  const toggleFacultyInForm = (fac: { employeeId: string; name: string; designation?: string; department?: string }) => {
    const targetKey = fac.employeeId.trim().toUpperCase();
    const current = parseEmpIdsText(formEmpIdText);
    const exists = current.some(id => id.toUpperCase() === targetKey);
    const next = exists
      ? current.filter(id => id.toUpperCase() !== targetKey)
      : [...current, fac.employeeId.trim()];
    setFormEmpIdText(next.join(', '));
    setResolvedFacultyMap(prev => ({ ...prev, [targetKey]: fac }));
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormEmpIdText('');
    setFormTitle('');
    setFormDateOfApp('');
    setFormRegNo('');
    setFormDiaryNo('');
    setFormDateOfReceipt('');
    setFormProofUrl('');
    setFormProofFile(null);
    setFacultyQuery('');
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditModal = (item: CopyrightItem) => {
    setEditingItem(item);
    const idsStr = item.empIdsRaw || (item.facultyAssociations || []).map(f => f.employeeId).join(', ');
    setFormEmpIdText(idsStr);
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
    setFormTitle(item.title || '');
    setFormDateOfApp(item.dateOfApplication ? String(item.dateOfApplication).slice(0, 10) : '');
    setFormRegNo(item.registrationNo || '');
    setFormDiaryNo(item.diaryNumber || '');
    setFormDateOfReceipt(item.dateOfReceipt ? String(item.dateOfReceipt).slice(0, 10) : '');
    setFormProofUrl(item.proofSourceType === 'local_upload' ? '' : (item.proofUrl || ''));
    setFormProofFile(null);
    setFacultyQuery('');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSaveCopyright = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Copyright Title is required.');
      return;
    }
    if (parsedFormEmpIds.length === 0) {
      setFormError('At least one Employee ID (EmpId) is required.');
      return;
    }
    if (!formDateOfApp) {
      setFormError('Date of Application is required.');
      return;
    }

    setFormSubmitting(true);
    setFormError('');
    try {
      const url = editingItem
        ? `${API_BASE}/api/copyrights/${editingItem.id}`
        : `${API_BASE}/api/copyrights`;
      const method = editingItem ? 'PUT' : 'POST';

      const payload: Record<string, any> = {
        empIdsRaw: parsedFormEmpIds.join(', '),
        title: formTitle.trim(),
        dateOfApplication: formDateOfApp,
        registrationNo: formRegNo.trim() || null,
        diaryNumber: formDiaryNo.trim() || null,
        dateOfReceipt: formDateOfReceipt || null
      };
      if (formProofUrl.trim()) {
        payload.proofUrl = formProofUrl.trim();
      } else if (editingItem && editingItem.proofSourceType !== 'local_upload') {
        payload.proofUrl = null;
      }

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
        setFormError(json.message || 'Failed to save copyright record.');
        return;
      }

      const savedId = json.data?.id;
      if (savedId && formProofFile) {
        const fd = new FormData();
        fd.append('file', formProofFile);
        const upRes = await fetch(`${API_BASE}/api/copyrights/${savedId}/proof`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd
        });
        const upJson = await upRes.json();
        if (!upJson.success) {
          setFormError(`Copyright saved, but proof upload failed: ${upJson.message}`);
          setRefreshKey(k => k + 1);
          return;
        }
      }

      setIsFormOpen(false);
      setRefreshKey(k => k + 1);
    } catch (err: any) {
      setFormError(err.message || 'Server error while saving copyright.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/copyrights/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message || 'Failed to delete copyright.');
      } else {
        setDeleteTarget(null);
        setRefreshKey(k => k + 1);
      }
    } catch (err: any) {
      alert('Failed to delete copyright record.');
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenProofLink = async (item: CopyrightItem) => {
    if (!item.proofUrl) return;
    if (item.proofSourceType === 'local_upload') {
      try {
        const res = await fetch(`${API_BASE}/api/copyrights/proofs/file/${item.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          alert('Unable to access proof document.');
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (_) {
        alert('Failed to open proof document.');
      }
      return;
    }
    window.open(item.proofUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSaveProofInModal = async () => {
    if (!proofTarget) return;
    setProofSaving(true);
    try {
      if (proofUploadFile) {
        const fd = new FormData();
        fd.append('file', proofUploadFile);
        const res = await fetch(`${API_BASE}/api/copyrights/${proofTarget.id}/proof`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd
        });
        const json = await res.json();
        if (!json.success) {
          alert(json.message || 'Failed to upload proof document.');
          return;
        }
      } else if (proofLinkInput.trim()) {
        const res = await fetch(`${API_BASE}/api/copyrights/${proofTarget.id}/proof`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ proofUrl: proofLinkInput.trim() })
        });
        const json = await res.json();
        if (!json.success) {
          alert(json.message || 'Invalid Google Drive URL.');
          return;
        }
      } else {
        alert('Please choose a file or enter a Google Drive link.');
        return;
      }

      setProofTarget(null);
      setProofLinkInput('');
      setProofUploadFile(null);
      setRefreshKey(k => k + 1);
    } catch (_) {
      alert('Failed to attach proof.');
    } finally {
      setProofSaving(false);
    }
  };

  // Exports (respecting active filters across full matching set via export=true)
  const handleExport = async (format: 'xlsx' | 'csv') => {
    try {
      const params = new URLSearchParams();
      params.append('export', 'true');
      if (selectedYear !== 'all') params.append('year', selectedYear);
      if (selectedDepts.length > 0) params.append('department', selectedDepts.join(','));
      if (selectedRegStatus !== 'all') params.append('registrationStatus', selectedRegStatus);
      if (selectedProofFilter !== 'all') params.append('proofStatus', selectedProofFilter);
      if (selectedValidationFilter !== 'all') params.append('validationStatus', selectedValidationFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`${API_BASE}/api/copyrights?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      const exportItems: CopyrightItem[] = json.success ? (json.data || []) : copyrights;

      if (exportItems.length === 0) {
        alert('No copyright records match the active filters to export.');
        return;
      }

      const headers = [
        'EmpId',
        'Faculty Names',
        'Current Departments',
        'Original Departments',
        'Title',
        'Date of Application',
        'Calendar Year',
        'Registration No',
        'Diary Number',
        'Date of Receipt',
        'Registration Status',
        'Proof URL',
        'Validation Warnings (Invalid EmpIds)'
      ];

      const recordRows = exportItems.map(c => {
        const assocs = c.facultyAssociations || [];
        const empStr = c.empIdsRaw || assocs.map(a => a.employeeId).join(', ');
        const facNames = assocs.filter(a => a.isValid && a.facultyName).map(a => `${a.facultyName} (${a.employeeId})`).join('; ');
        const curDepts = (c.currentDepartments || []).join('; ');
        const origDepts = (c.originalDepartments || []).join('; ');
        const invalidNote = (c.invalidEmpIds && c.invalidEmpIds.length > 0) ? `Unrecognized: ${c.invalidEmpIds.join(', ')}` : 'All Valid';

        return [
          empStr,
          facNames || 'Unrecognized',
          curDepts,
          origDepts,
          c.title,
          c.dateOfApplication,
          c.calendarYear,
          c.registrationNo || '',
          c.diaryNumber || '',
          c.dateOfReceipt || '',
          c.registrationStatus === 'registered' ? 'Registered' : c.registrationStatus === 'draft' ? 'Draft' : 'Pending Registration',
          c.proofUrl || '',
          invalidNote
        ];
      });

      const dateTag = new Date().toISOString().slice(0, 10);
      if (format === 'csv') {
        const csvLines = [
          headers.map(h => `"${h}"`).join(','),
          ...recordRows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        const blob = new Blob([csvLines], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CHRIST_IQAC_Copyrights_${dateTag}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const wb = XLSX.utils.book_new();
        const wsMain = XLSX.utils.aoa_to_sheet([headers, ...recordRows]);
        XLSX.utils.book_append_sheet(wb, wsMain, 'Copyright Records');

        // Second sheet: explicit 1-to-many Faculty Associations breakdown
        const assocHeaders = [
          'Copyright Title', 'Date of Application', 'Calendar Year', 'Registration No',
          'EmpId', 'Faculty Name', 'Designation', 'Original Department',
          'Original Dept Source', 'Current Department', 'Department Transferred', 'EmpId Status'
        ];
        const assocRows: any[][] = [];
        exportItems.forEach(c => {
          (c.facultyAssociations || []).forEach(a => {
            assocRows.push([
              c.title,
              c.dateOfApplication,
              c.calendarYear,
              c.registrationNo || '',
              a.employeeId,
              a.facultyName || 'Unrecognized',
              a.designation || '-',
              a.originalDepartment || '-',
              a.originalDepartmentSource || '-',
              a.currentDepartment || '-',
              a.departmentTransferred ? 'Yes' : 'No',
              a.isValid ? 'Valid' : 'Unrecognized'
            ]);
          });
        });
        const wsAssoc = XLSX.utils.aoa_to_sheet([assocHeaders, ...assocRows]);
        XLSX.utils.book_append_sheet(wb, wsAssoc, 'Faculty Associations');

        XLSX.writeFile(wb, `CHRIST_IQAC_Copyrights_${dateTag}.xlsx`);
      }
    } catch (_) {
      alert('Failed to export copyright records.');
    }
  };

  // Bulk Upload Handlers
  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/copyrights/template`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        alert('Failed to download official template.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CHRIST_IQAC_Copyrights_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (_) {
      alert('Failed to download template.');
    }
  };

  const handleBulkFileSelect = async (file: File) => {
    setBulkFile(file);
    setBulkError('');
    setBulkResult(null);
    setBulkPreview(null);
    setBulkLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/api/copyrights/bulk/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const json = await res.json();
      if (!json.success) {
        setBulkError(json.message || 'Failed to parse spreadsheet.');
      } else {
        setBulkPreview(json.data);
      }
    } catch (err: any) {
      setBulkError('Server error while validating spreadsheet.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleConfirmBulkImport = async () => {
    if (!bulkFile) return;
    setBulkLoading(true);
    setBulkError('');
    try {
      const fd = new FormData();
      fd.append('file', bulkFile);
      const res = await fetch(`${API_BASE}/api/copyrights/bulk/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const json = await res.json();
      if (!json.success) {
        setBulkError(json.message || 'Bulk import failed.');
      } else {
        setBulkResult(json);
        setRefreshKey(k => k + 1);
      }
    } catch (_) {
      setBulkError('Server error during bulk import.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDownloadImportReport = () => {
    if (!bulkResult || !Array.isArray(bulkResult.rowResults)) return;
    const headers = ['Spreadsheet Row', 'Status', 'Title', 'EmpIds', 'Warnings / Reason'];
    const rows = bulkResult.rowResults.map((r: any) => [
      r.rowNumber,
      r.status,
      r.title || '',
      r.empIds || '',
      r.reason || (Array.isArray(r.warnings) ? r.warnings.join('; ') : '')
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Import Report');
    XLSX.writeFile(wb, `Copyright_Bulk_Import_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const renderStatusBadge = (item: CopyrightItem) => {
    if (item.status === 'draft') {
      return <Badge className="bg-slate-100 text-slate-700 border-slate-300 text-[11px]">Draft</Badge>;
    }
    if (item.registrationNo && item.registrationNo.trim() !== '') {
      return (
        <Badge className="bg-[#E8F5ED] text-[#167447] border-[#C6E7D2] font-semibold text-[11px] inline-flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Registered
        </Badge>
      );
    }
    return (
      <Badge className="bg-[#FFF4D8] text-[#9A6700] border-[#FFE5A3] font-semibold text-[11px] inline-flex items-center gap-1">
        <Clock className="w-3 h-3" /> Pending Reg.
      </Badge>
    );
  };

  const renderProofCell = (item: CopyrightItem) => {
    if (!item.proofUrl) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (canModify) {
              setProofTarget(item);
              setProofLinkInput('');
              setProofUploadFile(null);
            }
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#E2E8F0] bg-[#F1F5F9] text-[#475569] hover:bg-slate-200/70"
        >
          <Paperclip className="w-3 h-3" />
          <span>Missing Proof</span>
        </button>
      );
    }

    if (item.proofAccessStatus === 'access_issue') {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenProofLink(item);
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF2F2] text-[#B42318] border border-[#FECDCA]"
          title={item.proofAccessRemarks || 'Drive link access issue'}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>Access Issue</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleOpenProofLink(item);
        }}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E8F5ED] text-[#167447] border border-[#C6E7D2] hover:bg-emerald-100"
      >
        <FileCheck className="w-3 h-3" />
        <span>View Proof</span>
        <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
      </button>
    );
  };

  const derivedFormYear = formDateOfApp && /^\d{4}-\d{2}-\d{2}$/.test(formDateOfApp)
    ? formDateOfApp.slice(0, 4)
    : null;

  const content = (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Research & Innovation' },
          { label: 'IPRs' },
          { label: 'Copyrights' }
        ]}
        title="Copyrights Repository"
        badge={`${metrics.totalCopyrights.toLocaleString()} Records`}
        description="Track institutional copyright applications, registrations, multi-faculty associations, and verified proof documents."
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
                  <span>Add Copyright</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* KPI Metrics Cards (Strictly 4 Copyright-Specific Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Copyrights"
          value={metrics.totalCopyrights.toLocaleString()}
          subtitle={`${metrics.validFacultyAssociationsCount} faculty association(s)`}
          icon={CopyrightIcon}
        />
        <StatCard
          title="Applications Filed"
          value={metrics.applicationsFiled.toLocaleString()}
          subtitle="Submitted copyright applications"
          icon={FileText}
        />
        <StatCard
          title="Registered Copyrights"
          value={metrics.registeredCopyrights.toLocaleString()}
          badge={metrics.applicationsFiled > 0 ? `${Math.round((metrics.registeredCopyrights / metrics.applicationsFiled) * 100)}%` : '0%'}
          subtitle="With valid Registration No."
          icon={ShieldCheck}
        />
        <StatCard
          title="Pending Registration"
          value={metrics.pendingRegistration.toLocaleString()}
          subtitle={metrics.recordsWithInvalidEmpIds > 0 ? `${metrics.recordsWithInvalidEmpIds} record(s) need EmpId check` : 'Submitted & awaiting ROC'}
          icon={Clock}
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
              placeholder="Search title, EmpId, faculty, reg no, diary no..."
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
            {/* Application Calendar Year */}
            <div className="w-32">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Years</SelectItem>
                  {calendarYears.map(yr => (
                    <SelectItem key={yr} value={String(yr)}>{yr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Multi-Department Filter */}
            <div className="relative" ref={deptDropdownRef}>
              <button
                type="button"
                onClick={() => setDeptDropdownOpen(o => !o)}
                className="h-9 px-3 rounded-md border border-gray-200 bg-white text-xs text-gray-700 flex items-center justify-between gap-2 min-w-[180px] max-w-[230px]"
              >
                <span className="truncate">
                  {selectedDepts.length === 0
                    ? 'All Departments'
                    : selectedDepts.length === 1
                    ? selectedDepts[0]
                    : `${selectedDepts.length} Departments`}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              </button>
              {deptDropdownOpen && (
                <div className="absolute right-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2 max-h-72 overflow-y-auto space-y-1">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 mb-1">
                    <span className="text-[11px] font-semibold text-slate-600">Select Department(s)</span>
                    {selectedDepts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedDepts([])}
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {departments.map(dept => {
                    const checked = selectedDepts.includes(dept);
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => {
                          setSelectedDepts(prev =>
                            prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
                          );
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-slate-50 flex items-center gap-2"
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          checked ? 'bg-[#2855B9] border-[#2855B9] text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {checked && <Check className="w-3 h-3" />}
                        </span>
                        <span className="truncate text-slate-700">{dept}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Registration Status */}
            <div className="w-40">
              <Select value={selectedRegStatus} onValueChange={setSelectedRegStatus}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Reg. Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="pending">Pending Registration</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Proof Status */}
            <div className="w-36">
              <Select value={selectedProofFilter} onValueChange={setSelectedProofFilter}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Proof" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Proofs</SelectItem>
                  <SelectItem value="has_proof">With Proof</SelectItem>
                  <SelectItem value="missing">Missing Proof</SelectItem>
                  <SelectItem value="issue">Access Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* EmpId Validation Status */}
            <div className="w-40">
              <Select value={selectedValidationFilter} onValueChange={setSelectedValidationFilter}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="EmpId Check" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Validation</SelectItem>
                  <SelectItem value="valid">Valid EmpIds</SelectItem>
                  <SelectItem value="invalid_empids">Flagged Invalid EmpIds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-gray-50">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs ${viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                title="Table View"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-md text-xs ${viewMode === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                title="Card View"
              >
                <Layers className="w-4 h-4" />
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRefreshKey(k => k + 1)}
              className="h-9 w-9 p-0 text-gray-500 hover:text-gray-900"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {loading ? (
        <Card className="border-gray-200 p-12 text-center bg-white">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-[#2855B9] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-500 font-medium">Loading copyright records...</p>
          </div>
        </Card>
      ) : copyrights.length === 0 ? (
        <Card className="border-dashed border-2 p-12 text-center border-gray-200 bg-white">
          <CopyrightIcon className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <h3 className="text-sm font-semibold text-gray-800">No Copyrights Found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            No copyright records matched your active filters. Try clearing filters or add a new copyright.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedYear('all');
                setSelectedDepts([]);
                setSelectedRegStatus('all');
                setSelectedProofFilter('all');
                setSelectedValidationFilter('all');
                setSearchQuery('');
              }}
              className="text-xs"
            >
              Reset Filters
            </Button>
            {canModify && (
              <Button size="sm" onClick={openAddModal} className="bg-[#2855B9] text-white text-xs font-semibold">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add First Copyright
              </Button>
            )}
          </div>
        </Card>
      ) : viewMode === 'table' ? (
        <Card className="shadow-xs border border-[#E2E8F0] overflow-hidden bg-white rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0] text-slate-700 font-semibold text-xs">
                  <th className="p-3 pl-4 min-w-[230px]">Copyright Title</th>
                  <th className="p-3 min-w-[200px]">Associated Faculty (EmpId)</th>
                  <th className="p-3 min-w-[160px]">Department(s)</th>
                  <th className="p-3 min-w-[125px]">Application Date / Year</th>
                  <th className="p-3 min-w-[155px]">Reg. No / Diary No</th>
                  <th className="p-3 min-w-[120px]">Status</th>
                  <th className="p-3 text-center min-w-[110px]">Proof</th>
                  <th className="p-3 text-right pr-4 min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {copyrights.map((item) => {
                  const assocs = item.facultyAssociations || [];
                  const primaryAssoc = assocs[0];
                  const extraCount = Math.max(0, assocs.length - 1);
                  const depts = item.currentDepartments && item.currentDepartments.length > 0
                    ? item.currentDepartments
                    : (item.departments || []);

                  return (
                    <tr key={item.id} className="hover:bg-[#F1F5F9] transition-colors">
                      <td className="p-3 pl-4">
                        <div
                          onClick={() => setViewingItem(item)}
                          className="font-semibold text-gray-800 hover:text-[#2855B9] cursor-pointer line-clamp-2 leading-snug"
                          title={item.title}
                        >
                          {item.title}
                        </div>
                        {item.hasInvalidEmpIds && (
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-800">
                            <AlertTriangle className="w-3 h-3" />
                            Unrecognized EmpId: {(item.invalidEmpIds || []).join(', ')}
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {primaryAssoc ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-medium ${primaryAssoc.isValid ? 'text-slate-800' : 'text-amber-700'}`}>
                                {primaryAssoc.isValid ? (primaryAssoc.facultyName || primaryAssoc.employeeId) : `Unknown (${primaryAssoc.employeeId})`}
                              </span>
                              <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                                {primaryAssoc.employeeId}
                              </Badge>
                              {extraCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setViewingItem(item)}
                                  className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-semibold hover:bg-blue-100"
                                >
                                  +{extraCount} more
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">{item.empIdsRaw || '-'}</span>
                        )}
                      </td>

                      <td className="p-3">
                        {depts.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-[11px] font-medium text-slate-700 line-clamp-1">{depts[0]}</span>
                            {depts.length > 1 && (
                              <Badge variant="outline" className="text-[10px] bg-slate-50">
                                +{depts.length - 1} dept
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700 italic">Unassigned (Invalid EmpId)</span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="font-mono text-slate-700">{formatDateDisplay(item.dateOfApplication)}</div>
                        <Badge variant="secondary" className="mt-0.5 text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                          {item.calendarYear}
                        </Badge>
                      </td>

                      <td className="p-3 font-mono text-[11px]">
                        {item.registrationNo ? (
                          <span className="font-bold text-emerald-700 block">{item.registrationNo}</span>
                        ) : (
                          <span className="text-slate-400 italic font-sans block">Not registered</span>
                        )}
                        {item.diaryNumber && (
                          <span className="text-[10px] text-slate-500 block">Diary: {item.diaryNumber}</span>
                        )}
                        {item.dateOfReceipt && (
                          <span className="text-[10px] text-slate-400 block font-sans">Rcpt: {formatDateDisplay(item.dateOfReceipt)}</span>
                        )}
                      </td>

                      <td className="p-3">{renderStatusBadge(item)}</td>
                      <td className="p-3 text-center">{renderProofCell(item)}</td>

                      <td className="p-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingItem(item)}
                            className="h-7 w-7 p-0 text-gray-500 hover:text-[#2855B9] hover:bg-blue-50"
                            title="Inspect Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {canModify && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(item)}
                                className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                                title="Edit Copyright"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTarget(item)}
                                className="h-7 w-7 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                title="Delete Copyright"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex flex-wrap justify-between items-center px-4 gap-2">
            <span>
              Showing {copyrights.length} of {totalCount} distinct copyright records
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-7 text-xs">
                  Previous
                </Button>
                <span className="font-mono text-[11px]">Page {page} / {totalPages}</span>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="h-7 text-xs">
                  Next
                </Button>
              </div>
            )}
          </div>
        </Card>
      ) : (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {copyrights.map(item => (
            <Card key={item.id} className="shadow-xs hover:shadow-sm border border-[#E2E8F0] bg-white rounded-xl relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2855B9]" />
              <CardContent className="p-4 pl-5 space-y-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {renderStatusBadge(item)}
                      <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-800">
                        Year: {item.calendarYear}
                      </Badge>
                      {renderProofCell(item)}
                      {item.hasInvalidEmpIds && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                          Invalid EmpId Flag
                        </Badge>
                      )}
                    </div>
                    <h3
                      onClick={() => setViewingItem(item)}
                      className="font-bold text-gray-900 text-sm hover:text-[#2855B9] cursor-pointer line-clamp-2"
                    >
                      {item.title}
                    </h3>
                  </div>
                  {canModify && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(item)} className="h-7 w-7 p-0">
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(item)} className="h-7 w-7 p-0 text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-slate-600">
                  <Users className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{item.empIdsRaw || '-'}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-gray-50/70 p-2.5 rounded-lg border border-gray-100">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Application Date</span>
                    <span className="font-mono text-gray-700">{formatDateDisplay(item.dateOfApplication)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Registration No</span>
                    <span className="font-mono font-semibold text-emerald-700">{item.registrationNo || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Diary Number</span>
                    <span className="font-mono text-gray-700">{item.diaryNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-semibold">Department(s)</span>
                    <span className="text-gray-700 truncate block">{(item.currentDepartments || []).join(', ') || 'Unassigned'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ADD / EDIT COPYRIGHT MODAL */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <CopyrightIcon className="w-5 h-5 text-[#2855B9]" />
              <span>{editingItem ? 'Edit Copyright Record' : 'Add Copyright Record'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Associate one or more Faculty Employee IDs. Calendar year is automatically derived from Date of Application.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCopyright} className="space-y-4 py-2 text-xs">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* EmpId: Method A (Searchable Selector) + Method B (Manual Comma-Separated) */}
            <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <Label className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  EmpId (Multiple Faculty Supported) <span className="text-red-500">*</span>
                </Label>
                <span className="text-[10px] text-slate-500">{parsedFormEmpIds.length} unique ID(s) entered</span>
              </div>

              {/* Method B: Direct comma-separated EmpId entry */}
              <div>
                <Label className="text-[11px] font-medium text-slate-600 mb-1 block">
                  Manual Entry (comma-separated EmpIds, e.g. CU001, CU015, CU028)
                </Label>
                <Input
                  placeholder="e.g. CU001, CU015, CU028"
                  value={formEmpIdText}
                  onChange={(e) => setFormEmpIdText(e.target.value)}
                  className="h-9 text-xs font-mono bg-white"
                />
              </div>

              {/* Method A: Searchable Multi-Select Faculty Selector */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-medium text-slate-600 block">
                  Faculty Selector (Search by Employee ID or Faculty Name)
                </Label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <Input
                    placeholder="Type EmpId or Faculty Name to search Faculty Management..."
                    value={facultyQuery}
                    onChange={(e) => setFacultyQuery(e.target.value)}
                    className="h-8 pl-8 text-xs bg-white"
                  />
                </div>
                <div className="border border-slate-200 rounded-lg bg-white max-h-36 overflow-y-auto divide-y divide-slate-100">
                  {facultyLoading ? (
                    <div className="p-2.5 text-center text-slate-400 text-[11px]">Searching faculty directory...</div>
                  ) : facultyOptions.length === 0 ? (
                    <div className="p-2.5 text-center text-slate-400 text-[11px]">No matching faculty found in Faculty Management.</div>
                  ) : (
                    facultyOptions.map(fac => {
                      const selected = parsedFormEmpIds.some(id => id.toUpperCase() === fac.employeeId.trim().toUpperCase());
                      return (
                        <button
                          key={fac.id || fac.employeeId}
                          type="button"
                          onClick={() => toggleFacultyInForm(fac)}
                          className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center justify-between gap-2 hover:bg-slate-50 ${
                            selected ? 'bg-blue-50/70' : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="font-mono font-bold text-[#2855B9] mr-2">{fac.employeeId}</span>
                            <span className="font-semibold text-slate-800">{fac.name}</span>
                            <span className="text-slate-500 ml-1.5">
                              • {fac.designation || 'Faculty'} ({fac.department || 'General'})
                            </span>
                          </div>
                          {selected ? (
                            <Badge className="bg-[#2855B9] text-white text-[10px] shrink-0">Selected</Badge>
                          ) : (
                            <span className="text-[10px] text-blue-600 shrink-0">+ Select</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Selected EmpId chips + immediate recognition status preview */}
              {parsedFormEmpIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {parsedFormEmpIds.map(empId => {
                    const matched = resolvedFacultyMap[empId.toUpperCase()];
                    return (
                      <span
                        key={empId}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] border ${
                          matched
                            ? 'bg-blue-50 border-blue-200 text-blue-900'
                            : 'bg-amber-50 border-amber-300 text-amber-900'
                        }`}
                      >
                        {matched ? (
                          <>
                            <UserCheck className="w-3 h-3 text-blue-600" />
                            <span className="font-mono font-semibold">{empId}</span>
                            <span>{matched.name}</span>
                            <span className="text-[10px] text-blue-700">({matched.department || 'General'})</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span className="font-mono font-semibold">{empId}</span>
                            <span className="text-[10px]">Unrecognized (will be flagged)</span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const next = parsedFormEmpIds.filter(x => x.toUpperCase() !== empId.toUpperCase());
                            setFormEmpIdText(next.join(', '));
                          }}
                          className="hover:text-red-600 ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Title & Application Date */}
            <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">
                  Copyright Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Smart Agricultural Monitoring System"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="h-9 text-xs bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="font-semibold text-gray-700">
                      Date of Application <span className="text-red-500">*</span>
                    </Label>
                    {derivedFormYear && (
                      <Badge className="text-[10px] bg-blue-50 text-blue-800 border-blue-200">
                        Derived Calendar Year: {derivedFormYear}
                      </Badge>
                    )}
                  </div>
                  <Input
                    type="date"
                    value={formDateOfApp}
                    onChange={(e) => setFormDateOfApp(e.target.value)}
                    className="h-9 text-xs bg-white"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Date of Receipt (Optional)</Label>
                  <Input
                    type="date"
                    value={formDateOfReceipt}
                    onChange={(e) => setFormDateOfReceipt(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Registration No (Optional)</Label>
                  <Input
                    placeholder="e.g. SW-18421/2025"
                    value={formRegNo}
                    onChange={(e) => setFormRegNo(e.target.value)}
                    className="h-9 text-xs font-mono bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Diary Number (Optional)</Label>
                  <Input
                    placeholder="e.g. 3421/2025-CO/SW"
                    value={formDiaryNo}
                    onChange={(e) => setFormDiaryNo(e.target.value)}
                    className="h-9 text-xs font-mono bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Proof (Optional: Drive URL or File Upload) */}
            <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
              <Label className="font-semibold text-gray-700 block">
                Proof Document (Optional — Google Drive Link or File Upload)
              </Label>
              <Input
                placeholder="https://drive.google.com/file/d/..."
                value={formProofUrl}
                onChange={(e) => setFormProofUrl(e.target.value)}
                className="h-9 text-xs font-mono bg-white"
              />
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={formFileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setFormProofFile(e.target.files[0]);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => formFileInputRef.current?.click()}
                  className="h-8 text-xs bg-white"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {formProofFile ? formProofFile.name : 'Upload Proof File (PDF/JPG/PNG)'}
                </Button>
                {formProofFile && (
                  <button
                    type="button"
                    onClick={() => setFormProofFile(null)}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Clear file
                  </button>
                )}
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={formSubmitting}
                className="bg-[#2855B9] hover:bg-[#1C355B] text-white font-semibold px-5"
              >
                {formSubmitting ? 'Saving...' : editingItem ? 'Update Copyright' : 'Save Copyright'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* COPYRIGHT DETAILS MODAL */}
      <Dialog open={!!viewingItem} onOpenChange={(o) => !o && setViewingItem(null)}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto bg-white p-0">
          {viewingItem && (
            <div>
              <DialogHeader className="p-5 pb-3 border-b border-gray-100 bg-gray-50/60">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {renderStatusBadge(viewingItem)}
                  <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-800 border-blue-200">
                    Calendar Year: {viewingItem.calendarYear}
                  </Badge>
                  {viewingItem.hasInvalidEmpIds && (
                    <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">
                      Needs EmpId Correction
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-base font-bold text-gray-900 leading-snug">
                  {viewingItem.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Distinct Copyright Record • {viewingItem.validFacultyCount ?? 0} verified faculty association(s)
                </DialogDescription>
              </DialogHeader>

              <div className="p-5 space-y-4 text-xs">
                {viewingItem.hasInvalidEmpIds && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Unrecognized Employee IDs Flagged</p>
                        <p className="text-[11px] mt-0.5">
                          The following EmpIds do not match active Faculty Management records and are excluded from department attribution: <span className="font-mono font-bold">{(viewingItem.invalidEmpIds || []).join(', ')}</span>
                        </p>
                      </div>
                    </div>
                    {canModify && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const target = viewingItem;
                          setViewingItem(null);
                          openEditModal(target);
                        }}
                        className="h-7 text-[11px] border-amber-400 text-amber-900 bg-white shrink-0"
                      >
                        Fix EmpIds
                      </Button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Date of Application</span>
                    <span className="font-mono font-semibold text-slate-900">{formatDateDisplay(viewingItem.dateOfApplication)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Registration No</span>
                    <span className="font-mono font-semibold text-emerald-700">{viewingItem.registrationNo || 'Not Assigned'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Diary Number</span>
                    <span className="font-mono font-semibold text-slate-800">{viewingItem.diaryNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Date of Receipt</span>
                    <span className="font-mono text-slate-700">{formatDateDisplay(viewingItem.dateOfReceipt)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Proof Document</span>
                    {viewingItem.proofUrl ? (
                      <button
                        type="button"
                        onClick={() => handleOpenProofLink(viewingItem)}
                        className="text-[#2855B9] hover:underline font-semibold inline-flex items-center gap-1 mt-0.5"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>{viewingItem.proofFileName || 'Open Proof Document'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-slate-400 italic">No proof attached</span>
                    )}
                  </div>
                </div>

                {/* Associated Faculty Table showing Original vs Current Departments */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#2855B9]" />
                    <span>Associated Faculty Members ({(viewingItem.facultyAssociations || []).length})</span>
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600 font-semibold">
                          <th className="p-2.5">EmpId</th>
                          <th className="p-2.5">Faculty Name</th>
                          <th className="p-2.5">Designation</th>
                          <th className="p-2.5">Original Dept (At Application)</th>
                          <th className="p-2.5">Current Dept (Faculty Master)</th>
                          <th className="p-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(viewingItem.facultyAssociations || []).map((a, i) => (
                          <tr key={a.id || `${a.employeeId}-${i}`}>
                            <td className="p-2.5 font-mono font-semibold text-slate-900">{a.employeeId}</td>
                            <td className="p-2.5">{a.isValid ? (a.facultyName || '-') : <span className="text-amber-700 italic">Not in Faculty Directory</span>}</td>
                            <td className="p-2.5 text-slate-600">{a.designation || '-'}</td>
                            <td className="p-2.5">
                              {a.originalDepartment ? (
                                <div>
                                  <span className="font-medium text-slate-800">{a.originalDepartment}</span>
                                  <span className="block text-[9px] text-slate-400 uppercase">
                                    {a.originalDepartmentSource === 'verified_history'
                                      ? 'Verified History'
                                      : a.originalDepartmentSource === 'academic_year_record'
                                      ? 'AY Record'
                                      : 'Creation Snapshot'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-2.5">
                              {a.currentDepartment ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-medium text-slate-800">{a.currentDepartment}</span>
                                  {a.departmentTransferred && (
                                    <Badge className="text-[9px] bg-indigo-50 text-indigo-700 border-indigo-200">
                                      Transferred
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              {a.isValid ? (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Valid</Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Invalid</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <DialogFooter className="p-4 border-t border-gray-100 bg-gray-50/50">
                {canModify && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const target = viewingItem;
                      setViewingItem(null);
                      openEditModal(target);
                    }}
                    className="text-xs"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" />
                    Edit Copyright
                  </Button>
                )}
                <Button size="sm" onClick={() => setViewingItem(null)} className="bg-[#2855B9] text-white text-xs">
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PROOF ATTACH MODAL */}
      <Dialog open={!!proofTarget} onOpenChange={(o) => !o && setProofTarget(null)}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Attach Proof — {proofTarget?.title}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Provide a Google Drive link or upload a PDF/image proof document.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Google Drive Link</Label>
              <Input
                placeholder="https://drive.google.com/file/d/..."
                value={proofLinkInput}
                onChange={(e) => setProofLinkInput(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
            <div>
              <input
                ref={proofModalFileRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) setProofUploadFile(e.target.files[0]); }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => proofModalFileRef.current?.click()}
                className="w-full h-9 text-xs"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {proofUploadFile ? proofUploadFile.name : 'Or Upload Proof File (Max 10MB)'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setProofTarget(null)}>Cancel</Button>
            <Button size="sm" disabled={proofSaving} onClick={handleSaveProofInModal} className="bg-[#2855B9] text-white">
              {proofSaving ? 'Saving...' : 'Save Proof'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK UPLOAD MODAL */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#2855B9]" />
              <span>Copyrights Bulk Excel Upload</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Upload Excel (.xlsx, .xls, .csv) using the official 7-column template. Multiple EmpIds must be comma-separated; Proof accepts Google Drive links.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Step 1: Official Template */}
            <div className="p-3.5 bg-[#EAF1FD]/50 border border-[#C8DCFB] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800">Official 7-Column Copyright Template</p>
                <p className="text-[11px] text-slate-600">
                  Columns: <code>EmpId, Title, Date of Application, Registration No, Diary Number, Date of Receipt, Proof</code>
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
                  {bulkFile ? `${bulkFile.name} (${Math.round(bulkFile.size / 1024)} KB)` : 'Click to select Copyrights Excel / CSV file'}
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
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
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
                        <th className="p-2">App Date / Yr</th>
                        <th className="p-2">Reg / Diary No</th>
                        <th className="p-2">Proof</th>
                        <th className="p-2">Validation Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(bulkPreview.rows || []).map((r: any) => (
                        <tr key={r.rowNumber}>
                          <td className="p-2 font-mono">{r.rowNumber}</td>
                          <td className="p-2 font-mono">{r.normalized?.empIdsRaw || '-'}</td>
                          <td className="p-2 font-medium max-w-[200px] truncate">{r.normalized?.title || '-'}</td>
                          <td className="p-2 font-mono">
                            {r.normalized?.dateOfApplication ? `${r.normalized.dateOfApplication} (${r.normalized.calendarYear})` : 'Invalid'}
                          </td>
                          <td className="p-2 font-mono">
                            {[r.normalized?.registrationNo, r.normalized?.diaryNumber].filter(Boolean).join(' / ') || '-'}
                          </td>
                          <td className="p-2">{r.normalized?.proofUrl ? 'Drive Link' : 'Blank'}</td>
                          <td className="p-2">
                            {r.status === 'valid' && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Ready</Badge>}
                            {r.status === 'warning' && (
                              <div>
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Import w/ Warning</Badge>
                                <p className="text-[10px] text-amber-800 mt-0.5">{r.warnings.join('; ')}</p>
                              </div>
                            )}
                            {r.status === 'duplicate' && (
                              <div>
                                <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[10px]">Duplicate (Skip)</Badge>
                                <p className="text-[10px] text-indigo-800 mt-0.5">{r.duplicateReason}</p>
                              </div>
                            )}
                            {r.status === 'invalid' && (
                              <div>
                                <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">Rejected</Badge>
                                <p className="text-[10px] text-rose-700 mt-0.5">{r.errors.join('; ')}</p>
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

            {/* Step 4: Final Import Summary */}
            {bulkResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
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
                  <div className="bg-white p-2 rounded border border-indigo-200">Duplicates Skipped: <strong>{bulkResult.summary.skippedDuplicatesCount}</strong></div>
                  <div className="bg-white p-2 rounded border border-rose-200">Mandatory Errors: <strong>{bulkResult.summary.rejectedMandatoryCount}</strong></div>
                  <div className="bg-white p-2 rounded border border-rose-200">Other Errors: <strong>{bulkResult.summary.rejectedValidationCount}</strong></div>
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
                onClick={handleConfirmBulkImport}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {bulkLoading ? 'Importing...' : `Import ${bulkPreview.summary.eligibleCount} Eligible Record(s)`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION MODAL */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2 text-base">
              <AlertCircle className="w-5 h-5" />
              Delete Copyright Record
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              Are you sure you want to permanently delete <strong>{deleteTarget?.title}</strong> and its faculty associations? This action is recorded in the audit log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button size="sm" disabled={deleting} onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? 'Deleting...' : 'Delete Copyright'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (hideSidebar) return content;

  return (
    <AppShell currentPage="copyrights" onNavigate={onNavigate}>
      {content}
    </AppShell>
  );
}


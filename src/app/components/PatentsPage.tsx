import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Award, FileText, TrendingUp, Users, Calendar,
  Building, CheckCircle, Clock, Plus, Search, Trash2, Edit,
  Eye, Download, AlertCircle, Upload, X, ExternalLink,
  Layers, ChevronRight, Check, RefreshCw, DollarSign, ShieldCheck
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { useAuth } from '../contexts/AuthContext';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';
import { normalizeDepartmentName } from './FacultyDetailsPage';

export interface PatentItem {
  id: string;
  title: string;
  inventors: string; // Comma separated or string
  applicationNo?: string | null;
  patentNo?: string | null;
  status: string; // 'filed' | 'published' | 'granted' | 'commercialized' | 'under_examination'
  patentType: string; // 'National (Indian)' | 'International (PCT)' | 'USPTO (USA)' | 'EPO (Europe)' | 'Other'
  department?: string;
  academicYear: string;
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

const EMPTY_FORM: Omit<PatentItem, 'id' | 'createdAt' | 'creator'> = {
  title: '',
  inventors: '',
  applicationNo: '',
  patentNo: '',
  status: 'published',
  patentType: 'National (Indian)',
  department: '',
  academicYear: '2024-2025',
  filedDate: '',
  publishedDate: '',
  grantedDate: '',
  licenseDate: '',
  partner: '',
  revenue: 0,
  patentUrl: '',
  description: '',
  approvalStatus: 'approved'
};

export function PatentsPage({
  onNavigate,
  hideSidebar = false,
  token: propToken,
  userRole: propRole
}: PatentsPageProps) {
  const { user, logout } = useAuth();
  const token = propToken || user?.token || '';
  const currentRole = propRole || user?.role || 'faculty';

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
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
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // Bulk Upload Modal
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState('');
  const [bulkDefaultDept, setBulkDefaultDept] = useState('');
  const [bulkDefaultYear, setBulkDefaultYear] = useState('2024-2025');

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

  const academicYears = useMemo(() => {
    const current = new Date().getFullYear();
    const list: string[] = [];
    for (let y = current + 1; y >= current - 5; y--) {
      list.push(`${y}-${y + 1}`);
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
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (selectedType !== 'all') params.append('patentType', selectedType);
      if (selectedYear !== 'all') params.append('academicYear', selectedYear);
      if (selectedDept !== 'all') params.append('department', selectedDept);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

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
  }, [token, selectedStatus, selectedType, selectedYear, selectedDept, searchQuery]);

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
    });

    return {
      total,
      published,
      granted,
      commercialized,
      filed,
      totalRevenue
    };
  }, [patents]);

  // Form handling
  const handleOpenAddModal = () => {
    setEditingPatent(null);
    setFormData({
      ...EMPTY_FORM,
      department: departments[0] || '',
      academicYear: '2024-2025'
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (patent: PatentItem) => {
    setEditingPatent(patent);
    setFormData({
      title: patent.title || '',
      inventors: patent.inventors || '',
      applicationNo: patent.applicationNo || '',
      patentNo: patent.patentNo || '',
      status: patent.status || 'published',
      patentType: patent.patentType || 'National (Indian)',
      department: patent.department || '',
      academicYear: patent.academicYear || '2024-2025',
      filedDate: patent.filedDate ? patent.filedDate.split('T')[0] : '',
      publishedDate: patent.publishedDate ? patent.publishedDate.split('T')[0] : '',
      grantedDate: patent.grantedDate ? patent.grantedDate.split('T')[0] : '',
      licenseDate: patent.licenseDate ? patent.licenseDate.split('T')[0] : '',
      partner: patent.partner || '',
      revenue: patent.revenue !== null && patent.revenue !== undefined ? Number(patent.revenue) : 0,
      patentUrl: patent.patentUrl || '',
      description: patent.description || '',
      approvalStatus: patent.approvalStatus || 'approved'
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const validateForm = () => {
    const errs: { [key: string]: string } = {};
    if (!formData.title.trim()) errs.title = 'Patent / Invention Title is required.';
    if (!formData.inventors.trim()) errs.inventors = 'Inventor Name(s) are required.';
    if (!formData.status.trim()) errs.status = 'Patent Status is required.';
    if (!formData.patentType.trim()) errs.patentType = 'Patent Type is required.';
    if (!formData.academicYear.trim()) errs.academicYear = 'Academic Year is required.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSavePatent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const url = editingPatent
        ? `${API_BASE}/api/patents/${editingPatent.id}`
        : `${API_BASE}/api/patents`;

      const method = editingPatent ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        revenue: Number(formData.revenue) || 0
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
      if (data.success) {
        setIsAddModalOpen(false);
        setRefreshKey(k => k + 1);
      } else {
        alert(data.message || 'Failed to save patent');
      }
    } catch (err: any) {
      console.error('Save patent error:', err);
      alert('An error occurred while saving the patent record.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePatent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this patent record?')) return;
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
        if (viewingPatent?.id === id) setViewingPatent(null);
      } else {
        alert(data.message || 'Failed to delete patent');
      }
    } catch (err) {
      console.error('Delete patent error:', err);
      alert('Failed to delete patent');
    }
  };

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
        alert(data.message || 'Failed to clear records');
      }
    } catch (err) {
      console.error('Clear all patents error:', err);
      alert('Failed to clear patents');
    } finally {
      setClearLoading(false);
    }
  };

  // ----------------------------------------------------
  // BULK UPLOAD HANDLING (BOTH EXCEL & CSV)
  // ----------------------------------------------------
  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.csv') && !lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      setBulkErrors(['Please upload a valid CSV or Excel file (.csv, .xlsx, .xls).']);
      return;
    }

    setBulkFile(file);
    setBulkErrors([]);
    setBulkSuccess('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        if (!buffer) return;

        let parsedRows: any[] = [];
        if (lower.endsWith('.csv')) {
          const text = new TextDecoder('utf-8').decode(buffer as ArrayBuffer);
          const workbook = XLSX.read(text, { type: 'string' });
          const sheetName = workbook.SheetNames[0];
          parsedRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
        } else {
          const workbook = XLSX.read(buffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          parsedRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
        }

        if (parsedRows.length === 0) {
          setBulkErrors(['The uploaded file contains no data rows.']);
          setBulkPreview([]);
          return;
        }

        const errors: string[] = [];
        const validated = parsedRows.map((row: any, idx: number) => {
          const title = row['Title'] || row['Patent Title'] || row['Title of Invention'] || row['title'] || '';
          const rawInventors = row['Inventors'] || row['Inventor Name'] || row['Inventor Names'] || row['Authors'] || row['inventors'] || '';
          const applicationNo = row['Application No'] || row['Application Number'] || row['Application No.'] || row['applicationNo'] || '';
          const patentNo = row['Patent No'] || row['Patent Number'] || row['Patent No.'] || row['patentNo'] || '';
          const rawStatus = row['Status'] || row['Patent Status'] || row['Stage'] || row['status'] || 'Published';
          const rawType = row['Patent Type'] || row['Type'] || row['Jurisdiction'] || row['patentType'] || 'National (Indian)';
          const academicYear = row['Academic Year'] || row['Year'] || row['academicYear'] || bulkDefaultYear || '2024-2025';
          const department = row['Department'] || row['department'] || bulkDefaultDept || '';
          const filedDate = row['Filing Date'] || row['Filed Date'] || row['Date of Filing'] || row['filedDate'] || '';
          const publishedDate = row['Publication Date'] || row['Published Date'] || row['Date of Publication'] || row['publishedDate'] || '';
          const grantedDate = row['Grant Date'] || row['Granted Date'] || row['Date of Grant'] || row['grantedDate'] || '';
          const partner = row['Commercial Partner'] || row['Partner'] || row['Licensee'] || row['partner'] || '';
          const revenue = row['Revenue'] || row['Revenue Generated'] || row['Royalty'] || row['revenue'] || 0;
          const patentUrl = row['URL'] || row['Patent Link'] || row['Document URL'] || row['patentUrl'] || '';
          const description = row['Abstract'] || row['Description'] || row['Summary'] || row['description'] || '';

          const rowNum = idx + 1;
          const missing: string[] = [];
          if (!String(title).trim()) missing.push('Patent Title');
          if (!String(rawInventors).trim()) missing.push('Inventor Name(s)');

          if (missing.length > 0) {
            errors.push(`Row ${rowNum}: Missing required ${missing.join(', ')}`);
          }

          let normalizedStatus = String(rawStatus).trim().toLowerCase();
          if (normalizedStatus.includes('commercial') || normalizedStatus.includes('license')) {
            normalizedStatus = 'commercialized';
          } else if (normalizedStatus.includes('grant')) {
            normalizedStatus = 'granted';
          } else if (normalizedStatus.includes('publish')) {
            normalizedStatus = 'published';
          } else if (normalizedStatus.includes('exam')) {
            normalizedStatus = 'under_examination';
          } else {
            normalizedStatus = 'filed';
          }

          let normalizedType = String(rawType).trim();
          const lowerType = normalizedType.toLowerCase();
          if (lowerType.includes('pct') || lowerType.includes('wipo')) {
            normalizedType = 'International (PCT)';
          } else if (lowerType.includes('uspto') || lowerType.includes('usa')) {
            normalizedType = 'USPTO (USA)';
          } else if (lowerType.includes('epo') || lowerType.includes('europe')) {
            normalizedType = 'EPO (Europe)';
          } else if (lowerType.includes('international') || lowerType.includes('foreign')) {
            normalizedType = 'Other International';
          } else {
            normalizedType = 'National (Indian)';
          }

          const inventorsStr = Array.isArray(rawInventors) ? rawInventors.join(', ') : String(rawInventors);

          return {
            title: String(title).trim(),
            inventors: inventorsStr.trim(),
            applicationNo: applicationNo ? String(applicationNo).trim() : null,
            patentNo: patentNo ? String(patentNo).trim() : null,
            status: normalizedStatus,
            patentType: normalizedType,
            department: String(department).trim(),
            academicYear: String(academicYear).trim(),
            filedDate: filedDate ? String(filedDate).trim() : null,
            publishedDate: publishedDate ? String(publishedDate).trim() : null,
            grantedDate: grantedDate ? String(grantedDate).trim() : null,
            partner: partner ? String(partner).trim() : null,
            revenue: revenue ? parseFloat(String(revenue).replace(/[^0-9.]/g, '')) || 0 : 0,
            patentUrl: patentUrl ? String(patentUrl).trim() : null,
            description: description ? String(description).trim() : null,
            isValid: missing.length === 0
          };
        });

        setBulkPreview(validated);
        setBulkErrors(errors);
      } catch (err: any) {
        console.error('Patent file parsing error:', err);
        setBulkErrors(['Failed to parse file. Ensure it is a valid CSV or Excel file.']);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleExecuteBulkUpload = async () => {
    if (bulkPreview.length === 0) return;
    setBulkLoading(true);
    setBulkErrors([]);
    try {
      const res = await fetch(`${API_BASE}/api/patents/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: bulkPreview,
          defaultDepartment: bulkDefaultDept,
          defaultYear: bulkDefaultYear
        })
      });

      const data = await res.json();
      if (data.success) {
        setBulkSuccess(`Successfully uploaded ${data.count} patent records.`);
        setTimeout(() => {
          setIsBulkOpen(false);
          setBulkFile(null);
          setBulkPreview([]);
          setRefreshKey(k => k + 1);
        }, 1200);
      } else {
        setBulkErrors(data.errors || [data.message || 'Failed to upload patent records.']);
      }
    } catch (err: any) {
      console.error('Bulk upload execution error:', err);
      setBulkErrors(['Server communication error during bulk upload.']);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDownloadTemplate = (format: 'csv' | 'xlsx') => {
    const headers = [
      'Title',
      'Inventors',
      'Application No',
      'Patent No',
      'Status',
      'Patent Type',
      'Department',
      'Academic Year',
      'Filing Date',
      'Publication Date',
      'Grant Date',
      'Commercial Partner',
      'Revenue',
      'URL',
      'Abstract'
    ];

    const sampleRows = [
      [
        'IoT-Based Edge Computational Device for Real-Time Agricultural Water Level Sensing',
        'Dr. Rajesh Kumar, Dr. Priya Sharma, Dr. Anand V',
        'IN202441012345',
        'PAT-IN-489021',
        'Granted',
        'National (Indian)',
        'Computer Science and Engineering',
        '2024-2025',
        '2023-04-12',
        '2023-10-15',
        '2024-05-20',
        'AgriTech Automation Solutions Pvt. Ltd.',
        '450000',
        'https://ipindiaservices.gov.in',
        'An edge gateway device with automated duty cycling for precision irrigation flow control.'
      ],
      [
        'Compact Dual-Band MIMO Antenna System for 5G Cellular and Satellite Telemetry',
        'Dr. Anand V, Dr. Priya Sharma',
        'PCT/IB2023/056789',
        'US11894520B2',
        'Commercialized',
        'International (PCT)',
        'Electronics and Communication Engineering',
        '2023-2024',
        '2022-08-10',
        '2023-02-14',
        '2023-11-28',
        'Qualcomm Technologies Inc. (Global Licensing)',
        '1250000',
        'https://patents.google.com',
        'High-isolation compact antenna array for integrated millimeter-wave transceivers.'
      ]
    ];

    if (format === 'csv') {
      const csvContent = [
        headers.map(h => `"${h}"`).join(','),
        ...sampleRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', 'patents_bulk_template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const wsData = [headers, ...sampleRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Patents');
      XLSX.writeFile(wb, 'patents_bulk_template.xlsx');
    }
  };

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
      'Academic Year',
      'Filing Date',
      'Publication Date',
      'Grant Date',
      'Commercial Partner',
      'Revenue',
      'URL'
    ];

    const dataRows = patents.map(p => [
      p.title,
      p.inventors,
      p.applicationNo || '',
      p.patentNo || '',
      p.status,
      p.patentType,
      p.department || '',
      p.academicYear,
      p.filedDate || '',
      p.publishedDate || '',
      p.grantedDate || '',
      p.partner || '',
      p.revenue || 0,
      p.patentUrl || ''
    ]);

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

  const content = (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-1">
            <span>Academics</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>Research</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#2f4692] font-semibold">Patents</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Award className="w-6 h-6 text-[#2f4692]" />
            Intellectual Property & Patents Portfolio
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Comprehensive tracking of filed, published, granted, and commercialized patents across Christ University.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportData('xlsx')}
            className="text-xs border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
            title="Export filtered records to Excel"
          >
            <Download className="w-3.5 h-3.5 text-green-600" />
            <span>Excel</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportData('csv')}
            className="text-xs border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center gap-1.5"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>CSV</span>
          </Button>

          {/* Bulk Upload Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setBulkFile(null);
              setBulkPreview([]);
              setBulkErrors([]);
              setBulkSuccess('');
              setIsBulkOpen(true);
            }}
            className="text-xs border-[#2f4692] text-[#2f4692] hover:bg-blue-50 font-medium flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk Upload (Excel / CSV)</span>
          </Button>

          {/* Add Patent Button */}
          <Button
            size="sm"
            onClick={handleOpenAddModal}
            className="bg-[#2f4692] hover:bg-[#243877] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Patent</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#2f4692] shadow-sm bg-white">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Patents</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-[#2f4692] mt-1">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-[11px] text-gray-500">
            Across National & International jurisdictions
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600 shadow-sm bg-white">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Patents Published</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-blue-700 mt-1">{stats.published}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-[11px] text-gray-500">
            Official Patent Gazette published
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600 shadow-sm bg-white">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold text-green-600 uppercase tracking-wider">Patents Granted</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-green-700 mt-1">{stats.granted}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-[11px] text-gray-500">
            Fully certified & issued patents
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600 shadow-sm bg-white">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Commercialized & Royalties</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-emerald-700 mt-1">
              ₹{stats.totalRevenue.toLocaleString('en-IN')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-[11px] text-gray-500">
            {stats.commercialized} active licensing partnerships
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-sm border-gray-200 bg-white">
        <CardContent className="p-4 flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full lg:w-80">
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
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
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

            {/* Academic Year Filter */}
            <div className="w-32">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {academicYears.map(yr => (
                    <SelectItem key={yr} value={yr}>{yr}</SelectItem>
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
                  <th className="p-3 min-w-[180px]">Inventor(s)</th>
                  <th className="p-3 min-w-[130px]">Status</th>
                  <th className="p-3 min-w-[140px]">Type / Jurisdiction</th>
                  <th className="p-3 min-w-[150px]">App / Patent No.</th>
                  <th className="p-3 min-w-[150px]">Department</th>
                  <th className="p-3 text-center min-w-[90px]">Year</th>
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
                      <Badge variant="secondary" className="text-[10px] font-medium bg-gray-100 text-gray-700">
                        {patent.academicYear}
                      </Badge>
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
              <CardHeader className="p-4 pb-2 pl-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getStatusBadge(patent.status)}
                    <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-700 border-gray-200">
                      {patent.patentType}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-700">
                      AY {patent.academicYear}
                    </Badge>
                  </div>
                  {patent.revenue !== undefined && Number(patent.revenue) > 0 && (
                    <Badge variant="outline" className="text-[10px] border-emerald-300 bg-emerald-50 text-emerald-800 font-bold">
                      ₹{Number(patent.revenue).toLocaleString('en-IN')}
                    </Badge>
                  )}
                </div>
                <CardTitle
                  onClick={() => setViewingPatent(patent)}
                  className="text-sm font-bold text-gray-900 hover:text-[#2f4692] cursor-pointer leading-snug line-clamp-2"
                >
                  {patent.title}
                </CardTitle>
                <CardDescription className="text-xs text-gray-600 font-medium mt-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="line-clamp-1">{patent.inventors}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-1 pl-5 text-xs text-gray-500">
                <div className="border-t border-gray-100 pt-2.5 space-y-1.5">
                  {patent.patentNo && (
                    <div className="text-[11px] text-green-800 font-medium">
                      Patent No: <span className="font-bold font-mono">{patent.patentNo}</span>
                    </div>
                  )}

                  {patent.applicationNo && (
                    <div className="text-[11px] text-gray-600">
                      App No: <span className="font-mono text-gray-800">{patent.applicationNo}</span>
                    </div>
                  )}

                  {patent.department && (
                    <div className="text-[11px] text-gray-500">
                      Dept: <span className="font-semibold text-gray-700">{patent.department}</span>
                    </div>
                  )}

                  {patent.partner && (
                    <div className="text-[11px] text-emerald-800 font-medium flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 shrink-0" />
                      <span>Partner: {patent.partner}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-3">
                  <span className="text-[10px] text-gray-400">
                    {patent.grantedDate ? `Granted: ${patent.grantedDate}` : patent.filedDate ? `Filed: ${patent.filedDate}` : 'Patent Recorded'}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingPatent(patent)}
                      className="h-7 w-7 p-0 text-gray-500 hover:text-[#2f4692] hover:bg-blue-50"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditModal(patent)}
                      className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePatent(patent.id)}
                      className="h-7 w-7 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* ADD / EDIT PATENT DIALOG */}
      {/* ---------------------------------------------------- */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          <DialogHeader className="p-5 pb-3 border-b border-gray-100 bg-gray-50/50">
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-[#2f4692]" />
              {editingPatent ? 'Edit Patent Record' : 'Add Patent / Invention'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Record intellectual property filing, grant, and commercialization metadata.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePatent} className="p-5 space-y-4 text-xs">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-gray-700">Title of Invention / Patent *</Label>
              <Input
                placeholder="e.g. IoT-Based Edge Computational Device for Agricultural Sensing"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, inventors: e.target.value })}
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
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
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

            {/* Department & Academic Year */}
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
                <Label className="font-semibold text-gray-700">Academic Year *</Label>
                <Select
                  value={formData.academicYear}
                  onValueChange={(val) => setFormData({ ...formData, academicYear: val })}
                >
                  <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((yr) => (
                      <SelectItem key={yr} value={yr}>{yr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  onChange={(e) => setFormData({ ...formData, grantedDate: e.target.value })}
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
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-5 pb-3 border-b border-gray-100 bg-gray-50/50">
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#2f4692]" />
              Bulk Upload Patents (Excel & CSV)
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Upload multi-row patent spreadsheets (.xlsx, .xls, .csv). Required columns: Title, Inventors.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-5 text-xs">
            {/* Step 1: Download Templates */}
            <div className="p-3.5 bg-blue-50/60 rounded-lg border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-blue-900">Need the template format?</p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Download a pre-formatted template with sample patent rows and column structure.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadTemplate('xlsx')}
                  className="text-xs bg-white border-blue-200 text-blue-800 hover:bg-blue-50"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-green-600" />
                  Excel Template (.xlsx)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadTemplate('csv')}
                  className="text-xs bg-white border-blue-200 text-blue-800 hover:bg-blue-50"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  CSV Template (.csv)
                </Button>
              </div>
            </div>

            {/* Step 2: Defaults selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Default Department (if blank in file)</Label>
                <Select value={bulkDefaultDept} onValueChange={setBulkDefaultDept}>
                  <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                    <SelectValue placeholder="Select Default Department" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Default Academic Year (if blank in file)</Label>
                <Select value={bulkDefaultYear} onValueChange={setBulkDefaultYear}>
                  <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                    <SelectValue placeholder="Select Default Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((yr) => (
                      <SelectItem key={yr} value={yr}>{yr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Step 3: File Drop / Select */}
            <div className="border-2 border-dashed border-gray-300 hover:border-[#2f4692] rounded-xl p-6 text-center transition-colors bg-gray-50/50">
              <Upload className="w-8 h-8 text-[#2f4692] mx-auto mb-2" />
              <p className="text-xs font-semibold text-gray-700">
                {bulkFile ? bulkFile.name : 'Select or drag your .xlsx, .xls, or .csv file here'}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Maximum file size: 10MB
              </p>
              <label className="mt-3 inline-block">
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleBulkFileSelect}
                  className="hidden"
                />
                <span className="px-4 py-1.5 bg-[#2f4692] text-white rounded-md text-xs font-semibold cursor-pointer hover:bg-[#243877] shadow-sm inline-block">
                  Browse File
                </span>
              </label>
            </div>

            {/* Validation errors */}
            {bulkErrors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs space-y-1 max-h-36 overflow-y-auto">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>Validation Warnings ({bulkErrors.length})</span>
                </div>
                {bulkErrors.map((err, idx) => (
                  <p key={idx} className="text-[11px] ml-5">• {err}</p>
                ))}
              </div>
            )}

            {bulkSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                <span className="font-semibold">{bulkSuccess}</span>
              </div>
            )}

            {/* Preview Table */}
            {bulkPreview.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-800">
                    Preview Data ({bulkPreview.length} records parsed)
                  </p>
                  <span className="text-[11px] text-gray-500">
                    {bulkPreview.filter(r => r.isValid).length} valid records ready
                  </span>
                </div>

                <div className="border border-gray-200 rounded-lg max-h-56 overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-gray-100 text-gray-700 sticky top-0">
                      <tr>
                        <th className="p-2 pl-3">#</th>
                        <th className="p-2">Title</th>
                        <th className="p-2">Inventors</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Year</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bulkPreview.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className={row.isValid ? 'hover:bg-gray-50' : 'bg-red-50/30'}>
                          <td className="p-2 pl-3 text-gray-400 font-mono">{idx + 1}</td>
                          <td className="p-2 font-medium text-gray-800 max-w-[200px] truncate" title={row.title}>{row.title || '-'}</td>
                          <td className="p-2 text-gray-700 max-w-[150px] truncate">{row.inventors || '-'}</td>
                          <td className="p-2 font-semibold capitalize text-blue-700">{row.status}</td>
                          <td className="p-2">{row.patentType || 'National (Indian)'}</td>
                          <td className="p-2">{row.academicYear || '-'}</td>
                          <td className="p-2">
                            {row.isValid ? (
                              <span className="text-green-600 flex items-center gap-1 font-semibold">
                                <Check className="w-3 h-3" /> Valid
                              </span>
                            ) : (
                              <span className="text-red-500 font-semibold">Incomplete</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBulkOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={bulkLoading || bulkPreview.length === 0}
              onClick={handleExecuteBulkUpload}
              className="bg-[#2f4692] text-white hover:bg-[#243877] px-5"
            >
              {bulkLoading ? 'Uploading...' : `Upload ${bulkPreview.filter(r => r.isValid).length} Records`}
            </Button>
          </DialogFooter>
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
                  <Badge variant="secondary" className="text-[10px]">
                    AY {viewingPatent.academicYear}
                  </Badge>
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

                {(viewingPatent.partner || Number(viewingPatent.revenue) > 0) && (
                  <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3 bg-emerald-50/40 p-3 rounded-lg border border-emerald-100">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Commercial Partner / Licensee</span>
                      <p className="font-semibold text-gray-900 mt-0.5">{viewingPatent.partner || 'Internal Christian Tech Incubation'}</p>
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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar currentPage="research-innovation" onNavigate={onNavigate} />
      <div className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {content}
      </div>
    </div>
  );
}

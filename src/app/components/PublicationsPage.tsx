import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  BookOpen, FileText, Award, TrendingUp, Users, Calendar,
  Building, CheckCircle, Clock, Plus, Search, Trash2, Edit,
  Eye, Download, AlertCircle, Upload, X, Filter, ExternalLink,
  Layers, ChevronRight, Check, RefreshCw
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

export interface PublicationItem {
  id: string;
  authorName: string;
  title: string;
  journalName: string;
  journalType: string; // 'Scopus' | 'WoS (Web of Science)' | other
  department?: string;
  academicYear: string;
  publicationDate?: string | null;
  doi?: string | null;
  issn?: string | null;
  volume?: string | null;
  issue?: string | null;
  pageNumber?: string | null;
  impactFactor?: number | string | null;
  citationCount?: number | null;
  paperUrl?: string | null;
  abstract?: string | null;
  status: string;
  createdAt?: string;
  creator?: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
}

interface PublicationsPageProps {
  onNavigate: (page: string) => void;
  hideSidebar?: boolean;
  token?: string;
  userRole?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const JOURNAL_TYPE_OPTIONS = [
  'Scopus',
  'WoS (Web of Science)',
  'Scopus & WoS',
  'UGC-CARE',
  'Peer-Reviewed / Other'
];

const EMPTY_FORM: Omit<PublicationItem, 'id' | 'status' | 'createdAt' | 'creator'> = {
  authorName: '',
  title: '',
  journalName: '',
  journalType: 'Scopus',
  department: '',
  academicYear: '2024-2025',
  publicationDate: '',
  doi: '',
  issn: '',
  volume: '',
  issue: '',
  pageNumber: '',
  impactFactor: '',
  citationCount: 0,
  paperUrl: '',
  abstract: ''
};

export function PublicationsPage({
  onNavigate,
  hideSidebar = false,
  token: propToken,
  userRole: propRole
}: PublicationsPageProps) {
  const { user, logout } = useAuth();
  const token = propToken || user?.token || '';
  const currentRole = propRole || user?.role || 'faculty';

  // Filters
  const [selectedJournalType, setSelectedJournalType] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  // Data & Loading
  const [publications, setPublications] = useState<PublicationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPub, setEditingPub] = useState<PublicationItem | null>(null);
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
  const [viewingPub, setViewingPub] = useState<PublicationItem | null>(null);

  // Delete & Clear
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  // Fetch publications from API
  const fetchPublications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedJournalType !== 'all') params.append('journalType', selectedJournalType);
      if (selectedYear !== 'all') params.append('academicYear', selectedYear);
      if (selectedDept !== 'all') params.append('department', selectedDept);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`${API_BASE}/api/publications?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setPublications(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch publications');
      }
    } catch (err: any) {
      console.error('Fetch publications error:', err);
      setError('Unable to load publications from server.');
    } finally {
      setLoading(false);
    }
  }, [token, selectedJournalType, selectedYear, selectedDept, searchQuery]);

  useEffect(() => {
    fetchPublications();
  }, [fetchPublications, refreshKey]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = publications.length;
    let scopus = 0;
    let wos = 0;
    let scopusAndWos = 0;
    let totalCitations = 0;

    publications.forEach(p => {
      const type = (p.journalType || '').toLowerCase();
      const hasScopus = type.includes('scopus');
      const hasWos = type.includes('wos') || type.includes('web of science');

      if (hasScopus && hasWos) {
        scopusAndWos++;
        scopus++;
        wos++;
      } else if (hasScopus) {
        scopus++;
      } else if (hasWos) {
        wos++;
      }
      totalCitations += Number(p.citationCount) || 0;
    });

    return {
      total,
      scopus,
      wos,
      scopusAndWos,
      totalCitations
    };
  }, [publications]);

  // Form handling
  const handleOpenAddModal = () => {
    setEditingPub(null);
    setFormData({
      ...EMPTY_FORM,
      department: departments[0] || '',
      academicYear: '2024-2025'
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (pub: PublicationItem) => {
    setEditingPub(pub);
    setFormData({
      authorName: pub.authorName || '',
      title: pub.title || '',
      journalName: pub.journalName || '',
      journalType: pub.journalType || 'Scopus',
      department: pub.department || '',
      academicYear: pub.academicYear || '2024-2025',
      publicationDate: pub.publicationDate ? pub.publicationDate.split('T')[0] : '',
      doi: pub.doi || '',
      issn: pub.issn || '',
      volume: pub.volume || '',
      issue: pub.issue || '',
      pageNumber: pub.pageNumber || '',
      impactFactor: pub.impactFactor !== null && pub.impactFactor !== undefined ? String(pub.impactFactor) : '',
      citationCount: pub.citationCount || 0,
      paperUrl: pub.paperUrl || '',
      abstract: pub.abstract || ''
    });
    setFormErrors({});
    setIsAddModalOpen(true);
  };

  const validateForm = () => {
    const errs: { [key: string]: string } = {};
    if (!formData.authorName.trim()) errs.authorName = 'Author Name is required.';
    if (!formData.title.trim()) errs.title = 'Publication Title is required.';
    if (!formData.journalName.trim()) errs.journalName = 'Journal Name is required.';
    if (!formData.journalType.trim()) errs.journalType = 'Journal Type is required.';
    if (!formData.academicYear.trim()) errs.academicYear = 'Academic Year is required.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSavePublication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const url = editingPub
        ? `${API_BASE}/api/publications/${editingPub.id}`
        : `${API_BASE}/api/publications`;

      const method = editingPub ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        impactFactor: formData.impactFactor ? parseFloat(String(formData.impactFactor)) : null,
        citationCount: Number(formData.citationCount) || 0
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
        alert(data.message || 'Failed to save publication');
      }
    } catch (err: any) {
      console.error('Save publication error:', err);
      alert('An error occurred while saving the publication.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePublication = async (id: string) => {
    if (!confirm('Are you sure you want to delete this publication record?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/publications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setRefreshKey(k => k + 1);
        if (viewingPub?.id === id) setViewingPub(null);
      } else {
        alert(data.message || 'Failed to delete publication');
      }
    } catch (err) {
      console.error('Delete publication error:', err);
      alert('Failed to delete publication');
    }
  };

  const handleClearAll = async () => {
    setClearLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/publications/clear-all`, {
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
      console.error('Clear all error:', err);
      alert('Failed to clear publications');
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

        // Validate preview rows
        const errors: string[] = [];
        const validated = parsedRows.map((row: any, idx: number) => {
          const authorName = row['Author Name'] || row['Author'] || row['Authors'] || row['authorName'] || '';
          const title = row['Title'] || row['Publication Title'] || row['Paper Title'] || row['title'] || '';
          const journalName = row['Journal Name'] || row['Journal'] || row['Publisher'] || row['journalName'] || '';
          const rawJournalType = row['Journal Type'] || row['Indexing'] || row['Type'] || row['journalType'] || 'Scopus';
          const academicYear = row['Academic Year'] || row['Year'] || row['academicYear'] || bulkDefaultYear || '2024-2025';
          const department = row['Department'] || row['department'] || bulkDefaultDept || '';
          const publicationDate = row['Publication Date'] || row['Date'] || row['publicationDate'] || '';
          const doi = row['DOI'] || row['DOI Number'] || row['doi'] || '';
          const issn = row['ISSN'] || row['ISBN'] || row['issn'] || '';
          const volume = row['Volume'] || row['volume'] || '';
          const issue = row['Issue'] || row['issue'] || '';
          const pageNumber = row['Page Number'] || row['Pages'] || row['pageNumber'] || '';
          const impactFactor = row['Impact Factor'] || row['impactFactor'] || '';
          const citationCount = row['Citations'] || row['citationCount'] || 0;
          const paperUrl = row['URL'] || row['Paper Link'] || row['paperUrl'] || '';
          const abstract = row['Abstract'] || row['abstract'] || '';

          const rowNum = idx + 1;
          const missing: string[] = [];
          if (!String(authorName).trim()) missing.push('Author Name');
          if (!String(title).trim()) missing.push('Title');
          if (!String(journalName).trim()) missing.push('Journal Name');

          if (missing.length > 0) {
            errors.push(`Row ${rowNum}: Missing required ${missing.join(', ')}`);
          }

          let normalizedType = String(rawJournalType).trim();
          const lowerType = normalizedType.toLowerCase();
          if (lowerType.includes('scopus') && (lowerType.includes('wos') || lowerType.includes('web of science'))) {
            normalizedType = 'Scopus & WoS';
          } else if (lowerType.includes('scopus')) {
            normalizedType = 'Scopus';
          } else if (lowerType.includes('wos') || lowerType.includes('web of science')) {
            normalizedType = 'WoS (Web of Science)';
          }

          return {
            authorName: String(authorName).trim(),
            title: String(title).trim(),
            journalName: String(journalName).trim(),
            journalType: normalizedType,
            department: String(department).trim(),
            academicYear: String(academicYear).trim(),
            publicationDate: publicationDate ? String(publicationDate).trim() : null,
            doi: doi ? String(doi).trim() : null,
            issn: issn ? String(issn).trim() : null,
            volume: volume ? String(volume).trim() : null,
            issue: issue ? String(issue).trim() : null,
            pageNumber: pageNumber ? String(pageNumber).trim() : null,
            impactFactor: impactFactor ? parseFloat(String(impactFactor)) : null,
            citationCount: Number(citationCount) || 0,
            paperUrl: paperUrl ? String(paperUrl).trim() : null,
            abstract: abstract ? String(abstract).trim() : null,
            isValid: missing.length === 0
          };
        });

        setBulkPreview(validated);
        setBulkErrors(errors);
      } catch (err: any) {
        console.error('File parsing error:', err);
        setBulkErrors(['Failed to parse file. Ensure it is a properly structured CSV or Excel file.']);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleExecuteBulkUpload = async () => {
    if (bulkPreview.length === 0) return;
    setBulkLoading(true);
    setBulkErrors([]);
    try {
      const res = await fetch(`${API_BASE}/api/publications/bulk`, {
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
        setBulkSuccess(`Successfully uploaded ${data.count} publications.`);
        setTimeout(() => {
          setIsBulkOpen(false);
          setBulkFile(null);
          setBulkPreview([]);
          setRefreshKey(k => k + 1);
        }, 1200);
      } else {
        setBulkErrors(data.errors || [data.message || 'Failed to upload publications.']);
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
      'Author Name',
      'Title',
      'Journal Name',
      'Journal Type',
      'Department',
      'Academic Year',
      'Publication Date',
      'DOI',
      'ISSN',
      'Volume',
      'Issue',
      'Page Number',
      'Impact Factor',
      'Citations',
      'URL',
      'Abstract'
    ];

    const sampleRows = [
      [
        'Dr. Rajesh Kumar, Dr. Priya Sharma',
        'Deep Learning Framework for Edge IoT Healthcare Sensors',
        'IEEE Transactions on Industrial Informatics',
        'Scopus',
        'Computer Science and Engineering',
        '2024-2025',
        '2024-04-10',
        '10.1109/TII.2024.1234567',
        '1551-3203',
        '20',
        '4',
        '2890-2902',
        '11.7',
        '18',
        'https://ieeexplore.ieee.org',
        'A comprehensive study on lightweight neural networks for wearable heart monitoring.'
      ],
      [
        'Dr. Deepa Singh, Dr. Suresh Menon',
        'Sustainable High-Volume Fly Ash Concrete Under High Temperatures',
        'Journal of Cleaner Production (Elsevier)',
        'WoS (Web of Science)',
        'Civil Engineering',
        '2024-2025',
        '2024-02-18',
        '10.1016/j.jclepro.2024.140890',
        '0959-6526',
        '435',
        '1',
        '140-155',
        '11.1',
        '12',
        'https://sciencedirect.com',
        'Investigation into structural fire resistance and carbonation depth of alkali-activated slag binders.'
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
      link.setAttribute('download', 'publications_bulk_template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const wsData = [headers, ...sampleRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Publications');
      XLSX.writeFile(wb, 'publications_bulk_template.xlsx');
    }
  };

  const handleExportData = (format: 'csv' | 'xlsx') => {
    if (publications.length === 0) {
      alert('No publication records to export.');
      return;
    }

    const headers = [
      'Author Name',
      'Title',
      'Journal Name',
      'Journal Type',
      'Department',
      'Academic Year',
      'Publication Date',
      'DOI',
      'ISSN',
      'Volume',
      'Issue',
      'Page Number',
      'Impact Factor',
      'Citations',
      'URL',
      'Status'
    ];

    const dataRows = publications.map(p => [
      p.authorName,
      p.title,
      p.journalName,
      p.journalType,
      p.department || '',
      p.academicYear,
      p.publicationDate || '',
      p.doi || '',
      p.issn || '',
      p.volume || '',
      p.issue || '',
      p.pageNumber || '',
      p.impactFactor || '',
      p.citationCount || 0,
      p.paperUrl || '',
      p.status
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
      link.setAttribute('download', `publications_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const wsData = [headers, ...dataRows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Publications');
      XLSX.writeFile(wb, `publications_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
  };

  const getJournalBadge = (type: string) => {
    const lower = (type || '').toLowerCase();
    if (lower.includes('scopus') && (lower.includes('wos') || lower.includes('web of science'))) {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-semibold text-[11px]">Scopus & WoS</Badge>;
    }
    if (lower.includes('scopus')) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-semibold text-[11px]">Scopus Indexed</Badge>;
    }
    if (lower.includes('wos') || lower.includes('web of science')) {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-semibold text-[11px]">Web of Science (WoS)</Badge>;
    }
    return <Badge variant="outline" className="text-gray-700 bg-gray-50 border-gray-300 text-[11px]">{type || 'Journal'}</Badge>;
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
            <span className="text-[#2f4692] font-semibold">Publications</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-[#2f4692]" />
            Research Publications & Journal Articles
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Institutional repository tracking Scopus, Web of Science (WoS), and indexed scholarly publications.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export Dropdown / Buttons */}
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

          {/* Add Publication Button */}
          <Button
            size="sm"
            onClick={handleOpenAddModal}
            className="bg-[#2f4692] hover:bg-[#243877] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Publication</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#2f4692] shadow-sm bg-white">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Publications</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-[#2f4692] mt-1">{stats.total}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-[11px] text-gray-500">
            Across all departments & academic years
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-600 shadow-sm bg-white">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Scopus Indexed</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-blue-700 mt-1">{stats.scopus}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-[11px] text-gray-500">
            {stats.total > 0 ? `${Math.round((stats.scopus / stats.total) * 100)}% of total indexed` : '0% of total'}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-white">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Web of Science (WoS)</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-amber-600 mt-1">{stats.wos}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-[11px] text-gray-500">
            Clarivate Analytics indexed papers
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600 shadow-sm bg-white">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Citations</CardDescription>
            <CardTitle className="text-2xl font-extrabold text-emerald-700 mt-1">{stats.totalCitations}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-[11px] text-gray-500">
            Cumulative citation impact
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-sm border-gray-200 bg-white">
        <CardContent className="p-4 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full xl:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search author, title, journal, DOI..."
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
            {/* Journal Type Filter */}
            <div className="w-36">
              <Select value={selectedJournalType} onValueChange={setSelectedJournalType}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Journal Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Journal Types</SelectItem>
                  <SelectItem value="Scopus">Scopus</SelectItem>
                  <SelectItem value="WoS (Web of Science)">WoS (Web of Science)</SelectItem>
                  <SelectItem value="UGC-CARE">UGC-CARE</SelectItem>
                  <SelectItem value="Peer-Reviewed / Other">Other / Peer-Reviewed</SelectItem>
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
            <p className="text-xs text-gray-500 font-medium">Loading research publications...</p>
          </div>
        </Card>
      ) : publications.length === 0 ? (
        <Card className="border-dashed border-2 p-12 text-center border-gray-200 bg-white">
          <BookOpen className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <h3 className="text-sm font-semibold text-gray-800">No Publications Found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            No publication records matched your filter criteria. Try changing the filters or add a new publication.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedJournalType('all');
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
              Add First Publication
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
                  <th className="p-3 pl-4 min-w-[180px]">Author Name</th>
                  <th className="p-3 min-w-[260px]">Title</th>
                  <th className="p-3 min-w-[180px]">Journal Name</th>
                  <th className="p-3 min-w-[130px]">Journal Type</th>
                  <th className="p-3 min-w-[150px]">Department</th>
                  <th className="p-3 text-center min-w-[90px]">Year</th>
                  <th className="p-3 text-center min-w-[80px]">Citations</th>
                  <th className="p-3 min-w-[120px]">DOI / ISSN</th>
                  <th className="p-3 text-right pr-4 min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {publications.map((pub) => (
                  <tr key={pub.id} className="hover:bg-blue-50/30 transition-colors group">
                    {/* Author Name */}
                    <td className="p-3 pl-4 font-medium text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="line-clamp-2 leading-relaxed">{pub.authorName}</span>
                      </div>
                    </td>

                    {/* Title */}
                    <td className="p-3">
                      <div
                        onClick={() => setViewingPub(pub)}
                        className="font-semibold text-gray-800 hover:text-[#2f4692] cursor-pointer line-clamp-2 leading-snug"
                        title={pub.title}
                      >
                        {pub.title}
                      </div>
                      {pub.abstract && (
                        <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{pub.abstract}</p>
                      )}
                    </td>

                    {/* Journal Name */}
                    <td className="p-3 text-gray-700">
                      <div className="flex items-center gap-1.5 font-medium text-gray-800">
                        <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="line-clamp-2">{pub.journalName}</span>
                      </div>
                      {(pub.volume || pub.issue) && (
                        <span className="text-[10px] text-gray-500 block mt-0.5">
                          {pub.volume ? `Vol. ${pub.volume}` : ''} {pub.issue ? `(Issue ${pub.issue})` : ''} {pub.pageNumber ? `pp. ${pub.pageNumber}` : ''}
                        </span>
                      )}
                    </td>

                    {/* Journal Type */}
                    <td className="p-3">
                      {getJournalBadge(pub.journalType)}
                    </td>

                    {/* Department */}
                    <td className="p-3 text-gray-600">
                      <span className="line-clamp-2 text-[11px] font-medium">{pub.department || 'General'}</span>
                    </td>

                    {/* Year */}
                    <td className="p-3 text-center">
                      <Badge variant="secondary" className="text-[10px] font-medium bg-gray-100 text-gray-700">
                        {pub.academicYear}
                      </Badge>
                    </td>

                    {/* Citations */}
                    <td className="p-3 text-center font-bold text-gray-800">
                      {pub.citationCount || 0}
                    </td>

                    {/* DOI / ISSN */}
                    <td className="p-3 text-[11px]">
                      {pub.doi ? (
                        <a
                          href={pub.doi.startsWith('http') ? pub.doi : `https://doi.org/${pub.doi.replace(/^doi:\s*/i, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#2f4692] hover:underline font-mono flex items-center gap-1 truncate max-w-[130px]"
                          title={pub.doi}
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{pub.doi}</span>
                        </a>
                      ) : pub.issn ? (
                        <span className="text-gray-500 font-mono text-[10px]">ISSN: {pub.issn}</span>
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
                          onClick={() => setViewingPub(pub)}
                          className="h-7 w-7 p-0 text-gray-500 hover:text-[#2f4692] hover:bg-blue-50"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditModal(pub)}
                          className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                          title="Edit Publication"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePublication(pub.id)}
                          className="h-7 w-7 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                          title="Delete Publication"
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
            <span>Showing {publications.length} publication entries</span>
            {(currentRole === 'admin' || currentRole === 'hod') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsClearOpen(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-[11px] h-7 px-2"
              >
                Clear All Publications
              </Button>
            )}
          </div>
        </Card>
      ) : (
        /* CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {publications.map((pub) => (
            <Card key={pub.id} className="shadow-sm hover:shadow-md transition-shadow border-gray-200 relative overflow-hidden bg-white">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2f4692]" />
              <CardHeader className="p-4 pb-2 pl-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getJournalBadge(pub.journalType)}
                    <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-700">
                      AY {pub.academicYear}
                    </Badge>
                  </div>
                  {pub.citationCount != null && pub.citationCount > 0 && (
                    <Badge variant="outline" className="text-[10px] border-emerald-300 bg-emerald-50 text-emerald-800 font-bold">
                      {pub.citationCount} Citations
                    </Badge>
                  )}
                </div>
                <CardTitle
                  onClick={() => setViewingPub(pub)}
                  className="text-sm font-bold text-gray-900 hover:text-[#2f4692] cursor-pointer leading-snug line-clamp-2"
                >
                  {pub.title}
                </CardTitle>
                <CardDescription className="text-xs text-gray-600 font-medium mt-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="line-clamp-1">{pub.authorName}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-1 pl-5 text-xs text-gray-500">
                <div className="border-t border-gray-100 pt-2.5 space-y-1.5">
                  <div className="flex items-center gap-2 text-gray-700 font-medium">
                    <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="line-clamp-1">{pub.journalName}</span>
                  </div>

                  {pub.department && (
                    <div className="text-[11px] text-gray-500">
                      Dept: <span className="font-semibold text-gray-700">{pub.department}</span>
                    </div>
                  )}

                  {pub.doi && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#2f4692] pt-0.5">
                      <FileText className="w-3 h-3 shrink-0" />
                      <a
                        href={pub.doi.startsWith('http') ? pub.doi : `https://doi.org/${pub.doi.replace(/^doi:\s*/i, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline font-mono truncate"
                      >
                        {pub.doi}
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-3">
                  <span className="text-[10px] text-gray-400">
                    {pub.publicationDate ? `Date: ${pub.publicationDate}` : 'Publication Recorded'}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingPub(pub)}
                      className="h-7 w-7 p-0 text-gray-500 hover:text-[#2f4692] hover:bg-blue-50"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditModal(pub)}
                      className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePublication(pub.id)}
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
      {/* ADD / EDIT PUBLICATION DIALOG */}
      {/* ---------------------------------------------------- */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
          <DialogHeader className="p-5 pb-3 border-b border-gray-100 bg-gray-50/50">
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#2f4692]" />
              {editingPub ? 'Edit Research Publication' : 'Add Research Publication'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Provide bibliographic information for indexed journal publication records.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePublication} className="p-5 space-y-4 text-xs">
            {/* Author Name */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-gray-700">Author Name(s) *</Label>
              <Input
                placeholder="e.g. Dr. Rajesh Kumar, Dr. Priya Sharma"
                value={formData.authorName}
                onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                className={`h-9 text-xs border-gray-200 focus-visible:ring-[#2f4692] ${
                  formErrors.authorName ? 'border-red-500 bg-red-50/20' : ''
                }`}
              />
              {formErrors.authorName && (
                <p className="text-red-500 text-[11px] font-medium">{formErrors.authorName}</p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-gray-700">Publication Title *</Label>
              <Input
                placeholder="Full title of the research paper / article"
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

            {/* Journal Name & Journal Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Journal Name *</Label>
                <Input
                  placeholder="e.g. IEEE Access / Springer Nature"
                  value={formData.journalName}
                  onChange={(e) => setFormData({ ...formData, journalName: e.target.value })}
                  className={`h-9 text-xs border-gray-200 focus-visible:ring-[#2f4692] ${
                    formErrors.journalName ? 'border-red-500 bg-red-50/20' : ''
                  }`}
                />
                {formErrors.journalName && (
                  <p className="text-red-500 text-[11px] font-medium">{formErrors.journalName}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Journal Type (Indexing) *</Label>
                <Select
                  value={formData.journalType}
                  onValueChange={(val) => setFormData({ ...formData, journalType: val })}
                >
                  <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                    <SelectValue placeholder="Select Journal Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {JOURNAL_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            {/* Publication Date, DOI, ISSN */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Publication Date</Label>
                <Input
                  type="date"
                  value={formData.publicationDate || ''}
                  onChange={(e) => setFormData({ ...formData, publicationDate: e.target.value })}
                  className="h-9 text-xs border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">DOI</Label>
                <Input
                  placeholder="e.g. 10.1109/..."
                  value={formData.doi || ''}
                  onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                  className="h-9 text-xs border-gray-200 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">ISSN / ISBN</Label>
                <Input
                  placeholder="e.g. 1551-3203"
                  value={formData.issn || ''}
                  onChange={(e) => setFormData({ ...formData, issn: e.target.value })}
                  className="h-9 text-xs border-gray-200 font-mono"
                />
              </div>
            </div>

            {/* Volume, Issue, Page Number */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Volume</Label>
                <Input
                  placeholder="e.g. 14"
                  value={formData.volume || ''}
                  onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                  className="h-9 text-xs border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Issue</Label>
                <Input
                  placeholder="e.g. 3"
                  value={formData.issue || ''}
                  onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                  className="h-9 text-xs border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Page Number</Label>
                <Input
                  placeholder="e.g. 120-135"
                  value={formData.pageNumber || ''}
                  onChange={(e) => setFormData({ ...formData, pageNumber: e.target.value })}
                  className="h-9 text-xs border-gray-200"
                />
              </div>
            </div>

            {/* Impact Factor, Citations, Paper URL */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Impact Factor</Label>
                <Input
                  type="number"
                  step="0.001"
                  placeholder="e.g. 4.8"
                  value={formData.impactFactor || ''}
                  onChange={(e) => setFormData({ ...formData, impactFactor: e.target.value })}
                  className="h-9 text-xs border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Citation Count</Label>
                <Input
                  type="number"
                  placeholder="e.g. 12"
                  value={formData.citationCount || 0}
                  onChange={(e) => setFormData({ ...formData, citationCount: parseInt(e.target.value) || 0 })}
                  className="h-9 text-xs border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Paper URL / Link</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={formData.paperUrl || ''}
                  onChange={(e) => setFormData({ ...formData, paperUrl: e.target.value })}
                  className="h-9 text-xs border-gray-200"
                />
              </div>
            </div>

            {/* Abstract */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-gray-700">Abstract / Summary</Label>
              <textarea
                rows={3}
                placeholder="Brief abstract or synopsis of the research work..."
                value={formData.abstract || ''}
                onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
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
                {submitting ? 'Saving...' : editingPub ? 'Update Publication' : 'Save Publication'}
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
              Bulk Upload Publications (Excel & CSV)
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Upload multi-row publication spreadsheets (.xlsx, .xls, .csv). Required headers: Author Name, Title, Journal Name, Journal Type.
            </DialogDescription>
          </DialogHeader>

          <div className="p-5 space-y-5 text-xs">
            {/* Step 1: Download Templates */}
            <div className="p-3.5 bg-blue-50/60 rounded-lg border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-blue-900">Need the template format?</p>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Download a pre-formatted template with sample rows and column structure.
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

            {/* Validation errors / messages */}
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
                        <th className="p-2">Author Name</th>
                        <th className="p-2">Title</th>
                        <th className="p-2">Journal Name</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Year</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bulkPreview.slice(0, 50).map((row, idx) => (
                        <tr key={idx} className={row.isValid ? 'hover:bg-gray-50' : 'bg-red-50/30'}>
                          <td className="p-2 pl-3 text-gray-400 font-mono">{idx + 1}</td>
                          <td className="p-2 font-medium text-gray-800">{row.authorName || '-'}</td>
                          <td className="p-2 text-gray-700 max-w-[200px] truncate" title={row.title}>{row.title || '-'}</td>
                          <td className="p-2 text-gray-600 truncate max-w-[150px]">{row.journalName || '-'}</td>
                          <td className="p-2 font-semibold text-blue-700">{row.journalType || 'Scopus'}</td>
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
      {/* PUBLICATION DETAILS SHEET / MODAL */}
      {/* ---------------------------------------------------- */}
      <Dialog open={!!viewingPub} onOpenChange={(open) => !open && setViewingPub(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {viewingPub && (
            <div>
              <DialogHeader className="p-5 pb-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-2 mb-1">
                  {getJournalBadge(viewingPub.journalType)}
                  <Badge variant="secondary" className="text-[10px]">
                    AY {viewingPub.academicYear}
                  </Badge>
                  {viewingPub.department && (
                    <Badge variant="outline" className="text-[10px]">
                      {viewingPub.department}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-base font-bold text-gray-900 leading-snug">
                  {viewingPub.title}
                </DialogTitle>
              </DialogHeader>

              <div className="p-5 space-y-4 text-xs text-gray-700 max-h-[60vh] overflow-y-auto">
                <div>
                  <span className="text-[10px] font-bold text-[#2f4692] uppercase tracking-wider block">Authors</span>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">{viewingPub.authorName}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Journal / Publisher</span>
                    <p className="font-semibold text-gray-800 mt-0.5">{viewingPub.journalName}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Journal Type</span>
                    <p className="font-semibold text-blue-700 mt-0.5">{viewingPub.journalType}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Volume & Issue</span>
                    <p className="font-medium text-gray-800 mt-0.5">
                      {viewingPub.volume ? `Vol. ${viewingPub.volume}` : '-'} {viewingPub.issue ? `(Issue ${viewingPub.issue})` : ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Pages</span>
                    <p className="font-medium text-gray-800 mt-0.5">{viewingPub.pageNumber || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Publication Date</span>
                    <p className="font-medium text-gray-800 mt-0.5">{viewingPub.publicationDate || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-gray-100 pt-3">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">DOI</span>
                    {viewingPub.doi ? (
                      <a
                        href={viewingPub.doi.startsWith('http') ? viewingPub.doi : `https://doi.org/${viewingPub.doi.replace(/^doi:\s*/i, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#2f4692] hover:underline font-mono text-[11px] font-semibold mt-0.5 block truncate"
                      >
                        {viewingPub.doi}
                      </a>
                    ) : (
                      <p className="text-gray-400 mt-0.5">-</p>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">ISSN / ISBN</span>
                    <p className="font-mono text-gray-800 mt-0.5">{viewingPub.issn || '-'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Citations</span>
                    <p className="font-bold text-emerald-700 text-sm mt-0.5">{viewingPub.citationCount || 0}</p>
                  </div>
                </div>

                {viewingPub.impactFactor && (
                  <div className="border-t border-gray-100 pt-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Impact Factor</span>
                    <p className="font-semibold text-gray-800 mt-0.5">{viewingPub.impactFactor}</p>
                  </div>
                )}

                {viewingPub.abstract && (
                  <div className="border-t border-gray-100 pt-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Abstract</span>
                    <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-150 mt-1 leading-relaxed">
                      {viewingPub.abstract}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const pub = viewingPub;
                    setViewingPub(null);
                    handleOpenEditModal(pub);
                  }}
                  className="text-xs"
                >
                  <Edit className="w-3.5 h-3.5 mr-1" />
                  Edit Publication
                </Button>
                <Button
                  size="sm"
                  onClick={() => setViewingPub(null)}
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
              Clear Publication Records
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              Are you sure you want to delete all publication records in this scope? This action is irreversible and recorded in audit logs.
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
      <Sidebar currentPage="publications" onNavigate={onNavigate} />
      <main className="ml-64 flex-1 min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          {content}
        </div>
      </main>
    </div>
  );
}

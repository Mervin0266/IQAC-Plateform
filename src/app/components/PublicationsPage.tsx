import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  BookOpen, FileText, Award, TrendingUp, Users, Calendar,
  Building, CheckCircle, Clock, Plus, Search, Trash2, Edit,
  Eye, Download, AlertCircle, Upload, X, Filter, ExternalLink,
  Layers, ChevronRight, Check, RefreshCw, BarChart2, AlertTriangle
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
import { AppShell, PageHeader, StatCard } from './design-system';
import { BulkUploadDialog } from './BulkUploadDialog';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

export interface PublicationItem {
  id: string;
  authorName: string;
  authorFullNames?: string | null;
  title: string;
  journalName: string;
  publisher?: string | null;
  journalType: string; // 'Scopus' | 'WoS (Web of Science)' | other
  department?: string;
  academicYear?: string;
  publicationYear?: string | number | null;
  publicationDate?: string | null;
  doi?: string | null;
  issn?: string | null;
  isbn?: string | null;
  coden?: string | null;
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
  authorFullNames: '',
  title: '',
  journalName: '',
  publisher: '',
  journalType: 'Scopus',
  department: '',
  academicYear: '',
  publicationYear: new Date().getFullYear().toString(),
  publicationDate: '',
  doi: '',
  issn: '',
  isbn: '',
  coden: '',
  volume: '',
  issue: '',
  pageNumber: '',
  impactFactor: '',
  citationCount: null,
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
  const [formServerError, setFormServerError] = useState('');
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
  const [activePubDetailTab, setActivePubDetailTab] = useState<'overview' | 'citations'>('overview');
  const [citationAnalytics, setCitationAnalytics] = useState<any | null>(null);
  const [loadingCitations, setLoadingCitations] = useState(false);
  const [citationsError, setCitationsError] = useState<string | null>(null);

  useEffect(() => {
    if (!viewingPub) {
      setCitationAnalytics(null);
      setCitationsError(null);
      setActivePubDetailTab('overview');
      return;
    }

    const fetchCitationDetails = async () => {
      setLoadingCitations(true);
      setCitationsError(null);
      try {
        const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const baseUrl = rawApi.replace(/\/+$/, '');
        const res = await fetch(`${baseUrl}/api/publications/${viewingPub.id}/citations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setCitationAnalytics(data);
        } else {
          setCitationsError(data.message || 'Failed to fetch citations');
        }
      } catch (err: any) {
        setCitationsError(err.message || 'Network error fetching citations');
      } finally {
        setLoadingCitations(false);
      }
    };

    fetchCitationDetails();
  }, [viewingPub, token]);

  // Verified Correction Dialog & Preview state
  const [isCorrectionDialogOpen, setIsCorrectionDialogOpen] = useState(false);
  const [loadingCorrectionPreview, setLoadingCorrectionPreview] = useState(false);
  const [applyingCorrection, setApplyingCorrection] = useState(false);
  const [correctionPreview, setCorrectionPreview] = useState<any | null>(null);
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [correctionSourceFile, setCorrectionSourceFile] = useState<File | null>(null);

  const fetchCorrectionPreview = async (fileOverride?: File) => {
    if (!viewingPub) return;
    setLoadingCorrectionPreview(true);
    setCorrectionError(null);
    try {
      const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const baseUrl = rawApi.replace(/\/+$/, '');

      let bodyPayload: any = {};
      const fileToUse = fileOverride || correctionSourceFile;
      if (fileToUse) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(fileToUse);
        });
        bodyPayload = {
          fileContentBase64: base64,
          filename: fileToUse.name
        };
      }

      const res = await fetch(`${baseUrl}/api/publications/${viewingPub.id}/citations/preview-correction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (data.success && data.preview) {
        setCorrectionPreview(data.preview);
        setCorrectionError(null);
      } else {
        setCorrectionPreview(null);
        setCorrectionError(data.message || 'Failed to generate correction preview.');
      }
    } catch (err: any) {
      setCorrectionPreview(null);
      setCorrectionError(err.message || 'Error generating correction preview.');
    } finally {
      setLoadingCorrectionPreview(false);
    }
  };

  const handleOpenCorrectionDialog = () => {
    setIsCorrectionDialogOpen(true);
    setCorrectionSourceFile(null);
    setCorrectionError(null);
    fetchCorrectionPreview();
  };

  const handleConfirmAuditedCorrection = async () => {
    if (!viewingPub || !correctionPreview) return;
    setApplyingCorrection(true);
    try {
      const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const baseUrl = rawApi.replace(/\/+$/, '');
      const res = await fetch(`${baseUrl}/api/publications/${viewingPub.id}/citations/apply-correction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          verificationToken: correctionPreview.verificationToken,
          fileContentBase64: correctionPreview.fileContentBase64,
          sourceRow: correctionPreview.sourceRow
        })
      });
      const data = await res.json();
      if (data.success) {
        setCitationAnalytics((prev: any) => ({
          ...prev,
          currentTotal: data.currentTotal,
          hasValidYearlyBreakdown: true,
          latestSnapshot: data.latestSnapshot,
          history: [
            {
              id: data.latestSnapshot.id,
              sourceFile: data.latestSnapshot.sourceFile,
              employeeId: data.latestSnapshot.employeeId,
              facultyName: data.latestSnapshot.facultyName,
              citationSource: data.latestSnapshot.citationSource,
              reportedTotal: data.currentTotal,
              previousTotal: data.latestSnapshot.previousTotal,
              difference: (data.latestSnapshot.previousTotal !== null && data.latestSnapshot.previousTotal !== undefined)
                ? (data.currentTotal - data.latestSnapshot.previousTotal)
                : null,
              reconciliationStatus: data.latestSnapshot.reconciliationStatus || 'reconciled',
              createdAt: new Date().toISOString()
            },
            ...(prev?.history || [])
          ]
        }));
        setViewingPub((prev: any) => prev ? { ...prev, citationCount: data.currentTotal } : prev);
        setPublications((prev) => prev.map(p => p.id === viewingPub.id ? { ...p, citationCount: data.currentTotal } : p));
        setIsCorrectionDialogOpen(false);
      } else {
        alert(data.message || 'Failed to apply citation correction.');
      }
    } catch (err: any) {
      alert(err.message || 'Error applying citation correction.');
    } finally {
      setApplyingCorrection(false);
    }
  };
  const [copiedUrl, setCopiedUrl] = useState(false);

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

  const publicationYears = useMemo(() => {
    const current = new Date().getFullYear();
    const set = new Set<string>();
    for (let y = current + 1; y >= current - 8; y--) {
      set.add(String(y));
    }
    publications.forEach(p => {
      if (p.publicationYear) {
        const m = String(p.publicationYear).match(/\b(19\d\d|20\d\d)\b/);
        if (m) set.add(m[1]);
      }
    });
    return Array.from(set).sort().reverse();
  }, [publications]);

  // Fetch publications from API
  const fetchPublications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('all', 'true');
      if (selectedJournalType !== 'all') params.append('journalType', selectedJournalType);
      if (selectedYear !== 'all') params.append('year', selectedYear);
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
      if (p.citationCount !== null && p.citationCount !== undefined) {
        totalCitations += Number(p.citationCount) || 0;
      }
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
      publicationYear: new Date().getFullYear().toString()
    });
    setFormErrors({});
    setFormServerError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (pub: PublicationItem) => {
    setEditingPub(pub);
    setFormData({
      authorName: pub.authorName || '',
      authorFullNames: pub.authorFullNames || '',
      title: pub.title || '',
      journalName: pub.journalName || '',
      publisher: pub.publisher || '',
      journalType: pub.journalType || 'Scopus',
      department: pub.department || '',
      academicYear: pub.academicYear || '',
      publicationYear: String(pub.publicationYear || (pub.academicYear && pub.academicYear.match(/\b\d{4}\b/)?.[0]) || new Date().getFullYear()),
      publicationDate: pub.publicationDate ? pub.publicationDate.split('T')[0] : '',
      doi: pub.doi || '',
      issn: pub.issn || '',
      isbn: pub.isbn || '',
      coden: pub.coden || '',
      volume: pub.volume || '',
      issue: pub.issue || '',
      pageNumber: pub.pageNumber || '',
      impactFactor: pub.impactFactor !== null && pub.impactFactor !== undefined ? String(pub.impactFactor) : '',
      citationCount: pub.citationCount !== null && pub.citationCount !== undefined ? pub.citationCount : null,
      paperUrl: pub.paperUrl || '',
      abstract: pub.abstract || ''
    });
    setFormErrors({});
    setFormServerError('');
    setIsAddModalOpen(true);
  };

  const validateForm = () => {
    const errs: { [key: string]: string } = {};
    if (!formData.authorName.trim() && !formData.authorFullNames?.trim()) {
      errs.authorName = 'Authors is required.';
    }
    if (!formData.title.trim()) errs.title = 'Publication Title is required.';
    if (!formData.journalName.trim()) errs.journalName = 'Journal Name is required.';
    if (!formData.journalType.trim()) errs.journalType = 'Journal Type is required.';
    const yr = String(formData.publicationYear || '').trim();
    if (!yr || !/^\d{4}$/.test(yr)) {
      errs.publicationYear = 'Valid 4-digit Year is required (e.g. 2024).';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSavePublication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setFormServerError('');
    try {
      const url = editingPub
        ? `${API_BASE}/api/publications/${editingPub.id}`
        : `${API_BASE}/api/publications`;

      const method = editingPub ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        authorName: (formData.authorName || formData.authorFullNames || '').trim(),
        publicationYear: String(formData.publicationYear).trim(),
        impactFactor: formData.impactFactor ? parseFloat(String(formData.impactFactor)) : null,
        citationCount: (formData.citationCount !== null && formData.citationCount !== undefined && String(formData.citationCount).trim() !== '')
          ? parseInt(String(formData.citationCount), 10)
          : null
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
        setFormServerError(data.message || 'Failed to save publication');
      }
    } catch (err: any) {
      console.error('Save publication error:', err);
      setFormServerError('An error occurred while saving the publication.');
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
      const res = await fetch(`${API_BASE}/api/publications/clear-all?confirmAll=true&confirmation=CONFIRM_UNIVERSITY_CLEAR`, {
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
      'Authors',
      'Author Full Names',
      'Title',
      'Journal Name',
      'Publisher',
      'Journal Type',
      'Department',
      'Year',
      'Publication Date',
      'DOI',
      'ISSN',
      'ISBN',
      'CODEN',
      'Volume',
      'Issue',
      'Page Number',
      'Impact Factor',
      'Citations',
      'URL',
      'Status'
    ];

    const dataRows = publications.map(p => [
      p.authorName || '',
      p.authorFullNames || '',
      p.title || '',
      p.journalName || '',
      p.publisher || '',
      p.journalType || '',
      p.department || '',
      p.publicationYear || p.academicYear || '',
      p.publicationDate || '',
      p.doi || '',
      p.issn || '',
      p.isbn || '',
      p.coden || '',
      p.volume || '',
      p.issue || '',
      p.pageNumber || '',
      p.impactFactor || '',
      p.citationCount !== null && p.citationCount !== undefined ? p.citationCount : '',
      p.paperUrl || '',
      p.status || ''
    ]);

    const sanitizeCsvCell = (val: any) => {
      let str = String(val ?? '');
      if (/^[\=\+\-\@]/.test(str)) {
        str = "'" + str;
      }
      return `"${str.replace(/"/g, '""')}"`;
    };

    if (format === 'csv') {
      const csvContent = [
        headers.map(h => `"${h}"`).join(','),
        ...dataRows.map(row => row.map(sanitizeCsvCell).join(','))
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
      <PageHeader
        breadcrumbs={[
          { label: 'Academics' },
          { label: 'Research' },
          { label: 'Publications' }
        ]}
        title="Research Publications & Journal Articles"
        badge={`${stats.total.toLocaleString()} Articles`}
        description="Institutional repository tracking Scopus, Web of Science (WoS), and indexed scholarly publications."
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
              onClick={() => {
                setBulkFile(null);
                setBulkPreview([]);
                setBulkErrors([]);
                setBulkSuccess('');
                setIsBulkOpen(true);
              }}
              className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              <span>Bulk Upload</span>
            </Button>

            <Button
              size="sm"
              onClick={handleOpenAddModal}
              className="bg-[#2855B9] hover:bg-[#1C355B] text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Add Publication</span>
            </Button>
          </div>
        }
      />

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Publications"
          value={stats.total.toLocaleString()}
          subtitle="Across all departments & academic years"
          icon={BookOpen}
        />
        <StatCard
          title="Scopus Indexed"
          value={stats.scopus.toLocaleString()}
          badge={stats.total > 0 ? `${Math.round((stats.scopus / stats.total) * 100)}%` : '0%'}
          subtitle="Scopus indexed scholarly papers"
          icon={FileText}
        />
        <StatCard
          title="Web of Science (WoS)"
          value={stats.wos.toLocaleString()}
          subtitle="Clarivate Analytics indexed papers"
          icon={Award}
        />
        <StatCard
          title="Total Citations"
          value={stats.totalCitations.toLocaleString()}
          subtitle="Cumulative citation impact"
          icon={TrendingUp}
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

            {/* Year Filter */}
            <div className="w-32">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {publicationYears.map(yr => (
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
            <div className="w-8 h-8 border-2 border-[#2855B9] border-t-transparent rounded-full animate-spin" />
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
              className="bg-[#2855B9] text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add First Publication
            </Button>
          </div>
        </Card>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <Card className="shadow-xs border border-[#E2E8F0] overflow-hidden bg-white rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0] text-slate-700 font-semibold text-xs">
                  <th className="p-3 pl-4 min-w-[180px]">Authors</th>
                  <th className="p-3 min-w-[260px]">Title</th>
                  <th className="p-3 min-w-[180px]">Journal Name</th>
                  <th className="p-3 min-w-[130px]">Journal Type</th>
                  <th className="p-3 min-w-[150px]">Department</th>
                  <th className="p-3 text-center min-w-[90px]">Year</th>
                  <th className="p-3 text-center min-w-[80px]">Citations</th>
                  <th className="p-3 min-w-[120px]">DOI / Identifiers</th>
                  <th className="p-3 text-right pr-4 min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs sm:text-[13px]">
                {publications.map((pub) => (
                  <tr key={pub.id} className="hover:bg-[#F1F5F9] transition-colors group">
                    {/* Authors */}
                    <td className="p-3 pl-4 font-medium text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="line-clamp-2 leading-relaxed" title={pub.authorFullNames || pub.authorName}>
                          {pub.authorFullNames || pub.authorName}
                        </span>
                      </div>
                    </td>

                    {/* Title */}
                    <td className="p-3">
                      <div
                        onClick={() => setViewingPub(pub)}
                        className="font-semibold text-gray-800 hover:text-[#2855B9] cursor-pointer line-clamp-2 leading-snug"
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
                      {pub.publisher && (
                        <span className="text-[10px] text-gray-400 block mt-0.5 truncate max-w-[180px]" title={pub.publisher}>
                          {pub.publisher}
                        </span>
                      )}
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
                        {pub.publicationYear || pub.academicYear || '—'}
                      </Badge>
                    </td>

                    {/* Citations */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setViewingPub(pub);
                          setActivePubDetailTab('citations');
                        }}
                        className="inline-flex items-center justify-center font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                        title="Click to view citation history and analytics"
                      >
                        {pub.citationCount !== null && pub.citationCount !== undefined ? pub.citationCount : '—'}
                      </button>
                    </td>

                    {/* DOI / Identifiers */}
                    <td className="p-3 text-[11px]">
                      {pub.doi ? (
                        <a
                          href={pub.doi.startsWith('http') ? pub.doi : `https://doi.org/${pub.doi.replace(/^doi:\s*/i, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#2855B9] hover:underline font-mono flex items-center gap-1 truncate max-w-[130px]"
                          title={pub.doi}
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{pub.doi}</span>
                        </a>
                      ) : pub.issn ? (
                        <span className="text-gray-500 font-mono text-[10px]" title={`ISSN: ${pub.issn}`}>ISSN: {pub.issn}</span>
                      ) : pub.isbn ? (
                        <span className="text-gray-500 font-mono text-[10px]" title={`ISBN: ${pub.isbn}`}>ISBN: {pub.isbn}</span>
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
                          className="h-7 w-7 p-0 text-gray-500 hover:text-[#2855B9] hover:bg-blue-50"
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
            <Card key={pub.id} className="shadow-xs hover:shadow-sm transition-shadow border border-[#E2E8F0] relative overflow-hidden bg-white rounded-xl">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#2855B9]" />
              <CardHeader className="p-4 pb-2 pl-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getJournalBadge(pub.journalType)}
                    <Badge variant="secondary" className="text-[10px] bg-gray-100 text-gray-700">
                      {pub.publicationYear || pub.academicYear || '—'}
                    </Badge>
                  </div>
                  {pub.citationCount !== null && pub.citationCount !== undefined && (
                    <button
                      type="button"
                      onClick={() => {
                        setViewingPub(pub);
                        setActivePubDetailTab('citations');
                      }}
                      className="cursor-pointer"
                      title="Click to view citation history and analytics"
                    >
                      <Badge variant="outline" className="text-[10px] border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold transition-colors">
                        {pub.citationCount} Citations
                      </Badge>
                    </button>
                  )}
                </div>
                <CardTitle
                  onClick={() => setViewingPub(pub)}
                  className="text-sm font-bold text-gray-900 hover:text-[#2855B9] cursor-pointer leading-snug line-clamp-2"
                >
                  {pub.title}
                </CardTitle>
                <CardDescription className="text-xs text-gray-600 font-medium mt-1 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="line-clamp-1">{pub.authorFullNames || pub.authorName}</span>
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
                    <div className="flex items-center gap-1.5 text-[11px] text-[#2855B9] pt-0.5">
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
                      className="h-7 w-7 p-0 text-gray-500 hover:text-[#2855B9] hover:bg-blue-50"
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
      {/* ADD / EDIT PUBLICATION DIALOG (SINGLE ENTRY) */}
      {/* ---------------------------------------------------- */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[88vh] overflow-y-auto bg-white p-6 rounded-2xl">
          <DialogHeader className="border-b border-gray-100 pb-3">
            <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#2855B9]" />
              <span>{editingPub ? 'Edit Publication Record' : 'Record New Publication'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Record scholarly journal publication metadata, indexing classification, citation impact, and research synopsis (NIRF & NAAC 3.4).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePublication} className="space-y-4 py-2 text-xs">
            {formServerError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-start gap-2.5 font-medium">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-red-800">Submission Error</p>
                  <p className="text-[11px] leading-relaxed">{formServerError}</p>
                </div>
              </div>
            )}

            {/* SECTION A — PUBLICATION & AUTHOR DETAILS */}
            <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#2855B9]" />
                <span>Section A — Publication & Author Details</span>
              </h4>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">
                  Publication Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Deep Learning Framework for Edge IoT Healthcare Sensors"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (formErrors.title) setFormErrors({ ...formErrors, title: '' });
                  }}
                  className={`h-9 text-xs border-gray-200 bg-white focus-visible:ring-[#2855B9] ${
                    formErrors.title ? 'border-red-500 bg-red-50/20' : ''
                  }`}
                />
                {formErrors.title && (
                  <p className="text-red-500 text-[11px] font-medium">{formErrors.title}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">
                    Authors <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Nair M., Menon S. (or Dr. Rajesh Kumar, Dr. Priya Sharma)"
                    value={formData.authorName}
                    onChange={(e) => {
                      setFormData({ ...formData, authorName: e.target.value });
                      if (formErrors.authorName) setFormErrors({ ...formErrors, authorName: '' });
                    }}
                    className={`h-9 text-xs border-gray-200 bg-white focus-visible:ring-[#2855B9] ${
                      formErrors.authorName ? 'border-red-500 bg-red-50/20' : ''
                    }`}
                  />
                  {formErrors.authorName && (
                    <p className="text-red-500 text-[11px] font-medium">{formErrors.authorName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">
                    Author Full Names
                  </Label>
                  <Input
                    placeholder="e.g. Nair, Meera; Menon, Suresh"
                    value={formData.authorFullNames || ''}
                    onChange={(e) => setFormData({ ...formData, authorFullNames: e.target.value })}
                    className="h-9 text-xs border-gray-200 bg-white focus-visible:ring-[#2855B9]"
                  />
                  <p className="text-[10px] text-gray-400">Full bibliographic author names from Scopus export</p>
                </div>
              </div>

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
            </div>

            {/* SECTION B — JOURNAL & INDEXING CLASSIFICATION */}
            <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#2855B9]" />
                <span>Section B — Journal & Indexing Classification</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">
                    Journal Name (Source Title) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. IEEE Access / Nature Communications"
                    value={formData.journalName}
                    onChange={(e) => {
                      setFormData({ ...formData, journalName: e.target.value });
                      if (formErrors.journalName) setFormErrors({ ...formErrors, journalName: '' });
                    }}
                    className={`h-9 text-xs border-gray-200 bg-white focus-visible:ring-[#2855B9] ${
                      formErrors.journalName ? 'border-red-500 bg-red-50/20' : ''
                    }`}
                  />
                  {formErrors.journalName && (
                    <p className="text-red-500 text-[11px] font-medium">{formErrors.journalName}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">
                    Publisher (Optional)
                  </Label>
                  <Input
                    placeholder="e.g. IEEE, Springer Nature, Elsevier"
                    value={formData.publisher || ''}
                    onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    className="h-9 text-xs border-gray-200 bg-white focus-visible:ring-[#2855B9]"
                  />
                  <p className="text-[10px] text-gray-400">Kept distinct from Journal / Source title</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">
                    Journal Type (Indexing) <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.journalType}
                    onValueChange={(val) => {
                      setFormData({ ...formData, journalType: val });
                      if (formErrors.journalType) setFormErrors({ ...formErrors, journalType: '' });
                    }}
                  >
                    <SelectTrigger className={`h-9 text-xs border-gray-200 bg-white ${formErrors.journalType ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Select Journal Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOURNAL_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.journalType && (
                    <p className="text-red-500 text-[11px] font-medium">{formErrors.journalType}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">
                    Year <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. 2024"
                    maxLength={4}
                    value={formData.publicationYear || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setFormData({ ...formData, publicationYear: val, academicYear: val });
                      if (formErrors.publicationYear) setFormErrors({ ...formErrors, publicationYear: '' });
                    }}
                    className={`h-9 text-xs border-gray-200 bg-white focus-visible:ring-[#2855B9] font-mono ${
                      formErrors.publicationYear ? 'border-red-500 bg-red-50/20' : ''
                    }`}
                  />
                  {formErrors.publicationYear && (
                    <p className="text-red-500 text-[11px] font-medium">{formErrors.publicationYear}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Publication Date</Label>
                  <Input
                    type="date"
                    value={formData.publicationDate || ''}
                    onChange={(e) => setFormData({ ...formData, publicationDate: e.target.value })}
                    className="h-9 text-xs border-gray-200 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* SECTION C — IDENTIFIERS & VOLUME DETAILS */}
            <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#2855B9]" />
                <span>Section C — Identifiers & Publication Volume</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">DOI (Digital Object Identifier)</Label>
                  <Input
                    placeholder="e.g. 10.1109/ACCESS.2024.1234567"
                    value={formData.doi || ''}
                    onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                    className="h-9 text-xs border-gray-200 bg-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">ISSN</Label>
                  <Input
                    placeholder="e.g. 1551-3203"
                    value={formData.issn || ''}
                    onChange={(e) => setFormData({ ...formData, issn: e.target.value })}
                    className="h-9 text-xs border-gray-200 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">ISBN</Label>
                  <Input
                    placeholder="e.g. 978-3-16-148410-0"
                    value={formData.isbn || ''}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    className="h-9 text-xs border-gray-200 bg-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">CODEN</Label>
                  <Input
                    placeholder="e.g. JACSAT"
                    value={formData.coden || ''}
                    onChange={(e) => setFormData({ ...formData, coden: e.target.value })}
                    className="h-9 text-xs border-gray-200 bg-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Volume</Label>
                  <Input
                    placeholder="e.g. 20"
                    value={formData.volume || ''}
                    onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                    className="h-9 text-xs border-gray-200 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Issue</Label>
                  <Input
                    placeholder="e.g. 4"
                    value={formData.issue || ''}
                    onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                    className="h-9 text-xs border-gray-200 bg-white"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Page Number(s)</Label>
                  <Input
                    placeholder="e.g. 2890-2902"
                    value={formData.pageNumber || ''}
                    onChange={(e) => setFormData({ ...formData, pageNumber: e.target.value })}
                    className="h-9 text-xs border-gray-200 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* SECTION D — CITATION METRICS & IMPACT */}
            <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#2855B9]" />
                <span>Section D — Citation Metrics & Impact</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Impact Factor (JCR / SJR)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="e.g. 4.8"
                    value={formData.impactFactor || ''}
                    onChange={(e) => setFormData({ ...formData, impactFactor: e.target.value })}
                    className="h-9 text-xs border-gray-200 bg-white font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Citation Count</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 12 (leave blank if unknown)"
                    value={formData.citationCount !== null && formData.citationCount !== undefined ? formData.citationCount : ''}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      setFormData({ ...formData, citationCount: val === '' ? null : parseInt(val, 10) });
                    }}
                    className="h-9 text-xs border-gray-200 bg-white font-mono"
                  />
                  <p className="text-[10px] text-gray-400">Blank displays as "—"; explicit 0 represents zero citations</p>
                </div>
              </div>
            </div>

            {/* SECTION E — ONLINE ACCESS & ABSTRACT SUMMARY */}
            <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#2855B9]" />
                <span>Section E — Online Access & Research Synopsis</span>
              </h4>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Official Paper URL / Publisher Link</Label>
                <div className="relative">
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                  <Input
                    type="url"
                    placeholder="https://doi.org/... or https://ieeexplore.ieee.org/..."
                    value={formData.paperUrl || ''}
                    onChange={(e) => setFormData({ ...formData, paperUrl: e.target.value })}
                    className="h-9 pl-8 text-xs border-gray-200 bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold text-gray-700">Abstract / Summary of Research</Label>
                <textarea
                  rows={3}
                  placeholder="Brief abstract, methodology synopsis, or research highlights..."
                  value={formData.abstract || ''}
                  onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                  className="w-full rounded-md border border-gray-200 p-2.5 text-xs outline-none focus:border-[#2855B9] bg-white"
                />
              </div>
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
                className="bg-[#2855B9] text-white hover:bg-[#1C355B] px-5 font-semibold text-xs"
              >
                {submitting ? 'Saving...' : editingPub ? 'Update Publication Record' : 'Save Publication Record'}
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
        onSuccess={fetchPublications}
        uploadType="publications"
      />

      {/* ---------------------------------------------------- */}
      {/* PUBLICATION DETAILS SHEET / MODAL */}
      {/* ---------------------------------------------------- */}
      <Dialog open={!!viewingPub} onOpenChange={(open) => !open && setViewingPub(null)}>
        <DialogContent className="w-[92vw] sm:max-w-[850px] md:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200">
          {viewingPub && (
            <>
              {/* Region 1: Fixed Header */}
              <DialogHeader className="p-5 pb-4 border-b border-slate-100 bg-slate-50/70 shrink-0 pr-12">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {getJournalBadge(viewingPub.journalType)}
                  <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                    Year {viewingPub.publicationYear || viewingPub.academicYear || '—'}
                  </Badge>
                  {viewingPub.department && (
                    <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-600">
                      {viewingPub.department}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 leading-snug break-words">
                  {viewingPub.title || 'Untitled Publication'}
                </DialogTitle>

                {/* Tab Switcher: Overview vs Citations */}
                <div className="flex items-center gap-2 mt-4 pt-1 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActivePubDetailTab('overview')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      activePubDetailTab === 'overview'
                        ? 'bg-[#2855B9] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Overview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePubDetailTab('citations')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      activePubDetailTab === 'citations'
                        ? 'bg-[#2855B9] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Citations</span>
                    {viewingPub.citationCount !== null && viewingPub.citationCount !== undefined && (
                      <span className="ml-1 text-[10px] font-mono font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full">
                        {viewingPub.citationCount}
                      </span>
                    )}
                  </button>
                </div>
              </DialogHeader>

              {/* Region 2: Scrollable Details Body */}
              <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-5 text-xs text-slate-700">
                {activePubDetailTab === 'overview' ? (
                  <>
                {/* 1. Authors Section */}
                <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold text-[#2855B9] uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#2855B9]" />
                    Author Full Names
                  </span>
                  <p className="text-sm font-semibold text-slate-900 leading-relaxed break-words">
                    {viewingPub.authorFullNames || viewingPub.authorName || '—'}
                  </p>

                  {/* Expandable Abbreviated / Metadata Section */}
                  {viewingPub.authorFullNames && viewingPub.authorName && viewingPub.authorFullNames !== viewingPub.authorName && (
                    <details className="group mt-2 pt-2 border-t border-slate-200/80 text-xs">
                      <summary className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer select-none flex items-center gap-1">
                        <span>Show Abbreviated Author List</span>
                      </summary>
                      <div className="mt-2 p-2.5 bg-white rounded-lg border border-slate-200 font-mono text-[11px] text-slate-600 leading-relaxed break-words">
                        {viewingPub.authorName}
                      </div>
                    </details>
                  )}
                </div>

                {/* 2. Journal & Publication Information */}
                <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <BookOpen className="w-3.5 h-3.5 text-[#2855B9]" />
                    Journal & Publication Information
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Journal Name (Source Title)</span>
                      <p className="font-semibold text-slate-900 text-xs mt-0.5 break-words">{viewingPub.journalName || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Publisher</span>
                      <p className="font-semibold text-slate-800 text-xs mt-0.5 break-words">{viewingPub.publisher || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Journal Type / Indexing</span>
                      <p className="font-semibold text-[#2855B9] text-xs mt-0.5">{viewingPub.journalType || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Publication Year</span>
                      <p className="font-medium text-slate-800 text-xs mt-0.5">{viewingPub.publicationYear || viewingPub.academicYear || '—'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Volume & Issue</span>
                      <p className="font-medium text-slate-800 text-xs mt-0.5">
                        {viewingPub.volume ? `Vol. ${viewingPub.volume}` : '—'} {viewingPub.issue ? `(Issue ${viewingPub.issue})` : ''}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pages</span>
                      <p className="font-medium text-slate-800 text-xs mt-0.5">{viewingPub.pageNumber || '—'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Publication Date</span>
                      <p className="font-medium text-slate-800 text-xs mt-0.5">{viewingPub.publicationDate || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* 3. Bibliographic Identifiers & Citations */}
                <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <Award className="w-3.5 h-3.5 text-[#2855B9]" />
                    Bibliographic Identifiers & Citations
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DOI</span>
                      {viewingPub.doi ? (
                        <a
                          href={viewingPub.doi.startsWith('http') ? viewingPub.doi : `https://doi.org/${viewingPub.doi.replace(/^doi:\s*/i, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#2855B9] hover:underline font-mono text-[11px] font-semibold mt-1 block break-all"
                          title={viewingPub.doi}
                        >
                          {viewingPub.doi}
                        </a>
                      ) : (
                        <p className="text-slate-400 mt-1 font-mono text-[11px]">—</p>
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ISSN</span>
                      <p className="font-mono font-semibold text-slate-800 text-[11px] mt-1">{viewingPub.issn || '—'}</p>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ISBN</span>
                      <p className="font-mono font-semibold text-slate-800 text-[11px] mt-1">{viewingPub.isbn || '—'}</p>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CODEN</span>
                      <p className="font-mono font-semibold text-slate-800 text-[11px] mt-1">{viewingPub.coden || '—'}</p>
                    </div>

                    <div
                      onClick={() => setActivePubDetailTab('citations')}
                      className="p-2.5 bg-emerald-50/60 hover:bg-emerald-100/70 rounded-lg border border-emerald-200/80 cursor-pointer transition-all group"
                      title="Click to view year-wise citation graph & history"
                    >
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
                        <span>Citations</span>
                        <TrendingUp className="w-3 h-3 text-emerald-600 group-hover:scale-110 transition-transform" />
                      </span>
                      <p className="font-bold text-emerald-700 text-sm mt-0.5">
                        {(viewingPub.citationCount !== null && viewingPub.citationCount !== undefined)
                          ? String(viewingPub.citationCount)
                          : '—'}
                      </p>
                      <span className="text-[9px] text-emerald-700 font-medium block mt-0.5 group-hover:underline">View History →</span>
                    </div>
                  </div>

                  {viewingPub.impactFactor && (
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Impact Factor:</span>
                      <span className="font-semibold text-slate-800 text-xs">{viewingPub.impactFactor}</span>
                    </div>
                  )}
                </div>

                {/* 4. Publication Links */}
                <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Publication Link</span>
                  {viewingPub.paperUrl ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <ExternalLink className="w-4 h-4 text-[#2855B9] shrink-0" />
                        <span className="font-mono text-[11px] text-slate-600 truncate" title={viewingPub.paperUrl}>
                          {viewingPub.paperUrl}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (viewingPub.paperUrl) {
                              navigator.clipboard.writeText(viewingPub.paperUrl);
                              setCopiedUrl(true);
                              setTimeout(() => setCopiedUrl(false), 2000);
                            }
                          }}
                          className="h-7 text-[11px] px-2.5 border-slate-200 text-slate-700"
                        >
                          {copiedUrl ? 'Copied!' : 'Copy Link'}
                        </Button>
                        <a
                          href={viewingPub.paperUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-7 px-3 rounded-lg bg-[#2855B9] hover:bg-[#1C355B] text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                        >
                          <span>{viewingPub.paperUrl.includes('scopus') ? 'Open in Scopus' : 'Open Publication'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-xs italic">—</p>
                  )}
                </div>

                {/* 5. Abstract (if available) */}
                {viewingPub.abstract && (
                  <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Abstract</span>
                    <p className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-lg border border-slate-200 leading-relaxed break-words">
                      {viewingPub.abstract}
                    </p>
                  </div>
                )}
                  </>
                ) : (
                  /* CITATIONS TAB */
                  <div className="space-y-5">
                    {loadingCitations ? (
                      <div className="py-12 text-center text-slate-400 space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#2855B9]" />
                        <p className="text-xs">Loading citation history and yearly analytics...</p>
                      </div>
                    ) : citationAnalytics?.hasHistory ? (
                      <>
                        {/* 1. Summary Card */}
                        <div className="p-4 bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 border border-emerald-200 rounded-xl space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                                <Award className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Approved Total Citations</span>
                                <span className="text-2xl font-bold font-mono text-emerald-900 leading-tight">
                                  {citationAnalytics.currentTotal ?? viewingPub.citationCount ?? 0}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-white border-emerald-300 text-emerald-800 text-[10px]">
                                Source: {citationAnalytics.latestSnapshot?.citationSource || 'Scopus'}
                              </Badge>
                              <Badge variant="outline" className={`text-[10px] ${
                                citationAnalytics.latestSnapshot?.reconciliationStatus === 'reconciled'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {citationAnalytics.latestSnapshot?.reconciliationStatus === 'reconciled'
                                  ? 'Reconciled'
                                  : citationAnalytics.latestSnapshot?.hasCorruptPeriods
                                    ? 'Unverified Breakdown'
                                    : 'Partial Breakdown'}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-emerald-200/60 text-[11px] text-slate-600">
                            <div>
                              <span className="text-slate-400 text-[10px] block">Source File:</span>
                              <span className="font-mono font-medium text-slate-800 truncate block">
                                {citationAnalytics.latestSnapshot?.sourceFile || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] block">Verified Faculty:</span>
                              <span className="font-medium text-slate-800 truncate block">
                                {citationAnalytics.latestSnapshot?.facultyName ? `${citationAnalytics.latestSnapshot.facultyName} (Emp: ${citationAnalytics.latestSnapshot.employeeId})` : (citationAnalytics.latestSnapshot?.employeeId ? `Emp ID: ${citationAnalytics.latestSnapshot.employeeId}` : '—')}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] block">Last Approved Import:</span>
                              <span className="font-medium text-slate-800 block">
                                {citationAnalytics.latestSnapshot?.createdAt ? new Date(citationAnalytics.latestSnapshot.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Unverified Legacy Breakdown Alert Banner (if corrupt period numbers exist in DB) */}
                        {citationAnalytics.latestSnapshot?.hasCorruptPeriods && (
                          <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start justify-between gap-3 text-xs text-amber-900">
                            <div className="flex items-start gap-2.5">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold block text-amber-950">Unverified Legacy Breakdown Detected</span>
                                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                                  Stored snapshot contains author report-summary totals ({citationAnalytics.latestSnapshot.yearlyDetails.filter((d: any) => !/^([<>≤≥]\s*)?(19\d{2}|20\d{2})$/.test(d.period) && d.periodType !== 'subtotal').map((d: any) => d.period).join(', ')}) from a previous multi-row header parse error.
                                  Click <strong>Apply Verified Correction</strong> to review and restore the verified annual breakdown for this publication from the faculty source file.
                                </p>
                              </div>
                            </div>
                            {(currentRole === 'admin' || currentRole === 'iqac_admin' || currentRole === 'coordinator' || currentRole === 'hod') && (
                              <Button
                                size="sm"
                                onClick={handleOpenCorrectionDialog}
                                disabled={loadingCorrectionPreview || applyingCorrection}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] h-7 px-3 rounded-lg shrink-0 font-medium shadow-xs"
                              >
                                Apply Verified Correction
                              </Button>
                            )}
                          </div>
                        )}

                        {/* 2. Dynamic Year-wise Citation Graph */}
                        {(() => {
                          const validPeriodRegex = /^([<>≤≥]\s*)?(19\d{2}|20\d{2})$/;
                          const getSortKey = (p: string) => {
                            const s = String(p || '').trim();
                            if (/^[<≤]/.test(s)) {
                              const yr = parseInt(s.replace(/\D/g, ''), 10) || 0;
                              return yr - 0.5;
                            }
                            if (/^[>≥]/.test(s)) {
                              const yr = parseInt(s.replace(/\D/g, ''), 10) || 0;
                              return yr + 0.5;
                            }
                            const yr = parseInt(s, 10);
                            return isNaN(yr) ? 99999 : yr;
                          };

                          const rawDetails = citationAnalytics.latestSnapshot?.yearlyDetails || [];
                          const chartData = rawDetails
                            .filter((d: any) => d.periodType !== 'subtotal' && d.periodType !== 'total' && validPeriodRegex.test(String(d.period || '').trim()))
                            .filter((d: any) => {
                              const isGrouped = d.periodType === 'grouped' || /^[<>≤≥]/.test(String(d.period || '').trim());
                              // Grouped periods displayed only when actually present with citations
                              if (isGrouped) {
                                return d.citationCount !== null && d.citationCount > 0;
                              }
                              return true;
                            })
                            .map((d: any) => ({
                              period: String(d.period || '').trim(),
                              citations: d.citationCount !== null ? d.citationCount : 0,
                              isGrouped: d.periodType === 'grouped' || /^[<>≤≥]/.test(String(d.period || '').trim()),
                              isUnknown: d.citationCount === null
                            }))
                            .sort((a: any, b: any) => getSortKey(a.period) - getSortKey(b.period));

                          const hasGroupedPeriods = chartData.some((d: any) => d.isGrouped);

                          if (chartData.length === 0) {
                            return (
                              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <TrendingUp className="w-3.5 h-3.5 text-[#2855B9]" />
                                    Annual Citation Progression & Period Breakdown
                                  </h4>
                                </div>
                                <div className="h-44 flex flex-col items-center justify-center text-slate-400 space-y-2 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                                  <BarChart2 className="w-7 h-7 text-slate-300" />
                                  <p className="text-xs font-semibold text-slate-600">Year-wise citation data is not available.</p>
                                  <p className="text-[11px] text-slate-400 text-center max-w-sm">
                                    Approved citation total is recorded ({citationAnalytics.currentTotal ?? viewingPub.citationCount ?? 0}), but no verified annual breakdown is on file.
                                  </p>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <TrendingUp className="w-3.5 h-3.5 text-[#2855B9]" />
                                  Annual Citation Progression & Period Breakdown
                                </h4>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-xs bg-[#2855B9] inline-block" />
                                    Calendar Year
                                  </span>
                                  {hasGroupedPeriods && (
                                    <span className="flex items-center gap-1">
                                      <span className="w-2.5 h-2.5 rounded-xs bg-[#7C3AED] inline-block" />
                                      Grouped Period
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="h-56 w-full pt-2">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis
                                      dataKey="period"
                                      tick={{ fontSize: 10, fill: '#64748B' }}
                                      interval={0}
                                      angle={chartData.length <= 6 ? 0 : -40}
                                      textAnchor={chartData.length <= 6 ? 'middle' : 'end'}
                                      height={chartData.length <= 6 ? 28 : 45}
                                    />
                                    <YAxis
                                      allowDecimals={false}
                                      domain={[0, (dataMax: number) => Math.max(dataMax + 1, 4)]}
                                      tick={{ fontSize: 10, fill: '#64748B' }}
                                    />
                                    <Tooltip
                                      contentStyle={{
                                        backgroundColor: '#FFFFFF',
                                        borderRadius: '8px',
                                        border: '1px solid #E2E8F0',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        fontSize: '11px'
                                      }}
                                      formatter={(val: any, _name: any, item: any) => [
                                        `${val} citation${val !== 1 ? 's' : ''}${item.payload.isUnknown ? ' (Unknown/Not reported)' : ''}`,
                                        item.payload.isGrouped ? 'Grouped Period' : 'Year'
                                      ]}
                                    />
                                    <Bar dataKey="citations" radius={[4, 4, 0, 0]} maxBarSize={48}>
                                      {chartData.map((entry: any, index: number) => (
                                        <Cell
                                          key={`cell-${index}`}
                                          fill={entry.isGrouped ? '#7C3AED' : '#2855B9'}
                                        />
                                      ))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          );
                        })()}

                        {/* 3. Year-wise Citation Breakdown Table */}
                        {(() => {
                          const validPeriodRegex = /^([<>≤≥]\s*)?(19\d{2}|20\d{2})$/;
                          const getSortKey = (p: string) => {
                            const s = String(p || '').trim();
                            if (/^[<≤]/.test(s)) {
                              const yr = parseInt(s.replace(/\D/g, ''), 10) || 0;
                              return yr - 0.5;
                            }
                            if (/^[>≥]/.test(s)) {
                              const yr = parseInt(s.replace(/\D/g, ''), 10) || 0;
                              return yr + 0.5;
                            }
                            const yr = parseInt(s, 10);
                            return isNaN(yr) ? 99999 : yr;
                          };

                          const rawDetails = citationAnalytics.latestSnapshot?.yearlyDetails || [];
                          const tableDetails = rawDetails
                            .filter((yd: any) => {
                              const isSubtotal = yd.periodType === 'subtotal' || String(yd.period).toLowerCase() === 'subtotal';
                              if (isSubtotal) return true;
                              const isGrouped = yd.periodType === 'grouped' || /^[<>≤≥]/.test(String(yd.period || '').trim());
                              if (isGrouped) {
                                return yd.citationCount !== null && yd.citationCount > 0;
                              }
                              return validPeriodRegex.test(String(yd.period || '').trim());
                            })
                            .sort((a: any, b: any) => {
                              if (a.periodType === 'subtotal') return 1;
                              if (b.periodType === 'subtotal') return -1;
                              return getSortKey(a.period) - getSortKey(b.period);
                            });

                          return (
                            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                              <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                                Year-Wise Citation Breakdown
                              </h4>
                              <div className="border border-slate-150 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 sticky top-0">
                                    <tr>
                                      <th className="py-2 px-3">Citation Year / Period</th>
                                      <th className="py-2 px-3">Period Type</th>
                                      <th className="py-2 px-3 text-right">Citations Received</th>
                                      <th className="py-2 px-3">Data Source</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {tableDetails.length === 0 ? (
                                      <tr>
                                        <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                                          <p className="font-medium text-slate-500">Year-wise citation data is not available.</p>
                                          <p className="text-[11px] text-slate-400 mt-0.5">Import verified Scopus citation file to view period breakdown.</p>
                                        </td>
                                      </tr>
                                    ) : (
                                      tableDetails.map((yd: any, idx: number) => (
                                        <tr key={idx} className={yd.periodType === 'subtotal' ? 'bg-slate-50 font-bold' : ''}>
                                          <td className="py-2 px-3 font-mono">{yd.period}</td>
                                          <td className="py-2 px-3 capitalize text-slate-500">{yd.periodType}</td>
                                          <td className="py-2 px-3 text-right font-mono font-bold">
                                            {yd.citationCount !== null ? yd.citationCount : <span className="text-slate-400 font-normal">— (Not reported)</span>}
                                          </td>
                                          <td className="py-2 px-3 text-slate-500">Scopus</td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              {/* Separate Reconciliation Summary (Section 10) */}
                              {tableDetails.length > 0 && (() => {
                                const annualSum = rawDetails
                                  .filter((d: any) => d.periodType === 'year' && validPeriodRegex.test(String(d.period || '').trim()))
                                  .reduce((sum: number, d: any) => sum + (d.citationCount || 0), 0);
                                const groupedSum = rawDetails
                                  .filter((d: any) => (d.periodType === 'grouped' || /^[<>≤≥]/.test(String(d.period || '').trim())) && validPeriodRegex.test(String(d.period || '').trim()))
                                  .reduce((sum: number, d: any) => sum + (d.citationCount || 0), 0);
                                const subtotalEntry = rawDetails.find((d: any) => d.periodType === 'subtotal');
                                const sourceSubtotal = subtotalEntry?.citationCount ?? annualSum;
                                const sourceTotal = citationAnalytics.latestSnapshot?.reportedTotal ?? viewingPub.citationCount ?? (annualSum + groupedSum);
                                const status = citationAnalytics.latestSnapshot?.reconciliationStatus || 'reconciled';

                                return (
                                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs mt-2">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Reconciliation Summary</div>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                                      <div className="bg-white p-2 rounded border border-slate-200">
                                        <span className="text-[10px] text-slate-400 block">Annual Citation Sum</span>
                                        <span className="font-mono font-bold text-slate-800 text-sm">{annualSum}</span>
                                      </div>
                                      <div className="bg-white p-2 rounded border border-slate-200">
                                        <span className="text-[10px] text-slate-400 block">Source Subtotal</span>
                                        <span className="font-mono font-bold text-slate-800 text-sm">{sourceSubtotal}</span>
                                      </div>
                                      <div className="bg-white p-2 rounded border border-slate-200">
                                        <span className="text-[10px] text-slate-400 block">Grouped Period Citations</span>
                                        <span className="font-mono font-bold text-slate-800 text-sm">{groupedSum}</span>
                                      </div>
                                      <div className="bg-white p-2 rounded border border-slate-200">
                                        <span className="text-[10px] text-slate-400 block">Source Total</span>
                                        <span className="font-mono font-bold text-[#2855B9] text-sm">{sourceTotal}</span>
                                      </div>
                                      <div className="bg-white p-2 rounded border border-slate-200 col-span-2 sm:col-span-1">
                                        <span className="text-[10px] text-slate-400 block">Status</span>
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold capitalize ${
                                          status === 'reconciled' ? 'bg-emerald-100 text-emerald-800' :
                                          status === 'incomplete' ? 'bg-amber-100 text-amber-800' :
                                          'bg-rose-100 text-rose-800'
                                        }`}>
                                          {status}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })()}

                        {/* 4. Past Approved Snapshots */}
                        {citationAnalytics.history && citationAnalytics.history.length > 0 && (
                          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                            <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                              Past Approved Citation Snapshots
                            </h4>
                            <div className="border border-slate-150 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 sticky top-0">
                                  <tr>
                                    <th className="py-2 px-3">Import Date</th>
                                    <th className="py-2 px-3">Source File</th>
                                    <th className="py-2 px-3">Faculty Member</th>
                                    <th className="py-2 px-3 text-center">Previous</th>
                                    <th className="py-2 px-3 text-center">Imported</th>
                                    <th className="py-2 px-3 text-center">Diff</th>
                                    <th className="py-2 px-3">Reconciliation</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                  {citationAnalytics.history.map((h: any, idx: number) => (
                                    <tr key={idx}>
                                      <td className="py-2 px-3 whitespace-nowrap text-[11px] text-slate-500">
                                        {new Date(h.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                      </td>
                                      <td className="py-2 px-3 font-mono text-[11px] truncate max-w-[140px]" title={h.sourceFile}>
                                        {h.sourceFile}
                                      </td>
                                      <td className="py-2 px-3 text-[11px] truncate max-w-[120px]">
                                        {h.facultyName ? `${h.facultyName} (${h.employeeId})` : (h.employeeId || '—')}
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono font-medium text-slate-500">
                                        {h.previousTotal !== null && h.previousTotal !== undefined ? h.previousTotal : '—'}
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">
                                        {h.reportedTotal}
                                      </td>
                                      <td className="py-2 px-3 text-center font-mono font-bold">
                                        {h.difference !== null && h.difference !== undefined ? (
                                          h.difference > 0 ? (
                                            <span className="text-emerald-600">+{h.difference}</span>
                                          ) : h.difference < 0 ? (
                                            <span className="text-amber-600">{h.difference}</span>
                                          ) : (
                                            <span className="text-slate-400">0</span>
                                          )
                                        ) : (
                                          <span className="text-slate-400">—</span>
                                        )}
                                      </td>
                                      <td className="py-2 px-3">
                                        <span className="text-[10px] font-medium text-slate-600 capitalize">
                                          {h.reconciliationStatus || 'reconciled'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Existing publication without history */
                      <div className="py-10 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                          <Award className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-800">
                            Current Approved Citations:{' '}
                            <span className="font-mono text-emerald-700 font-bold">
                              {viewingPub.citationCount !== null && viewingPub.citationCount !== undefined ? viewingPub.citationCount : 0}
                            </span>
                          </h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Year-wise citation history not available for this publication.
                          </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-w-md mx-auto text-[11px] text-slate-600">
                          Import this paper's citation overview report via <strong>Bulk Upload → Citations</strong> to automatically generate dynamic year-wise charts, verified snapshots, and annual analytics.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Region 3: Fixed Footer */}
              <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/70 shrink-0 flex items-center justify-between sm:justify-between m-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewingPub(null)}
                  className="border-slate-200 text-slate-700 hover:bg-slate-100 text-xs px-4 rounded-xl"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const pub = viewingPub;
                    setViewingPub(null);
                    handleOpenEditModal(pub);
                  }}
                  className="bg-[#2855B9] text-white hover:bg-[#1C355B] text-xs px-4 rounded-xl shadow-xs flex items-center gap-1.5 font-semibold"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Publication</span>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Verified Citation Correction Confirmation Dialog (Section 7) */}
      <Dialog open={isCorrectionDialogOpen} onOpenChange={setIsCorrectionDialogOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
          <DialogHeader className="space-y-1.5 border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#2855B9]" />
              Review & Confirm Verified Citation Correction
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Review the verified citation history extracted from the faculty's Scopus report before applying changes.
            </DialogDescription>
          </DialogHeader>

          {loadingCorrectionPreview ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-7 h-7 text-[#2855B9] animate-spin" />
              <p className="text-xs font-medium text-slate-600">Analyzing citation source records and computing reconciliation...</p>
            </div>
          ) : correctionError && !correctionPreview ? (
            <div className="py-6 space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold block text-amber-950">Source File Verification</span>
                  <p className="text-[11px] text-amber-800 leading-relaxed">{correctionError}</p>
                </div>
              </div>
              <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center space-y-2">
                <Upload className="w-7 h-7 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">Upload Faculty Scopus Citation File</p>
                <p className="text-[11px] text-slate-400">Select the author's verified citation export (.csv or .xlsx) to match this publication.</p>
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#2855B9] file:text-white hover:file:bg-[#1E3F8A] cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCorrectionSourceFile(file);
                      fetchCorrectionPreview(file);
                    }
                  }}
                />
              </div>
            </div>
          ) : correctionPreview ? (
            <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
              {/* Publication Metadata Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Publication</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{correctionPreview.publicationTitle}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Publication Year:</span>
                    <span className="font-mono font-medium text-slate-800">{correctionPreview.publicationYear || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">ISSN:</span>
                    <span className="font-mono font-medium text-slate-800">{correctionPreview.issn || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Source File:</span>
                    <span className="font-mono font-medium text-slate-800 truncate block" title={correctionPreview.sourceFile}>{correctionPreview.sourceFile}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Matched Source Row:</span>
                    <span className="font-mono font-bold text-[#2855B9]">Row {correctionPreview.sourceRow}</span>
                  </div>
                </div>
              </div>

              {/* Comparison Header Card */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Existing Approved</span>
                  <span className="text-xl font-bold font-mono text-slate-800 block mt-1">{correctionPreview.existingTotal ?? 0}</span>
                </div>
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-center">
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block">Verified Source Total</span>
                  <span className="text-xl font-bold font-mono text-emerald-800 block mt-1">{correctionPreview.proposedTotal}</span>
                </div>
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-center">
                  <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider block">Difference</span>
                  <span className={`text-xl font-bold font-mono block mt-1 ${correctionPreview.difference >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {correctionPreview.difference > 0 ? `+${correctionPreview.difference}` : correctionPreview.difference}
                  </span>
                </div>
              </div>

              {/* Proposed Verified Breakdown Table */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Proposed Year-wise Breakdown (From Source Row {correctionPreview.sourceRow})
                </span>
                <div className="border border-slate-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 sticky top-0">
                      <tr>
                        <th className="py-1.5 px-3">Period</th>
                        <th className="py-1.5 px-3">Type</th>
                        <th className="py-1.5 px-3 text-right">Citations</th>
                        <th className="py-1.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {correctionPreview.proposedBreakdown.map((item: any, idx: number) => (
                        <tr key={idx} className={item.periodType === 'subtotal' ? 'bg-slate-50 font-bold' : ''}>
                          <td className="py-1.5 px-3">{item.period}</td>
                          <td className="py-1.5 px-3 capitalize font-sans text-slate-500 text-[10px]">{item.periodType}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-slate-900">{item.citationCount !== null ? item.citationCount : '—'}</td>
                          <td className="py-1.5 px-3 text-right font-sans text-[10px] text-slate-400">{item.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reconciliation Summary Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Reconciliation Summary</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Annual Sum</span>
                    <span className="font-mono font-bold text-slate-800">{correctionPreview.annualCitationSum}</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Subtotal</span>
                    <span className="font-mono font-bold text-slate-800">{correctionPreview.sourceSubtotal}</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Grouped</span>
                    <span className="font-mono font-bold text-slate-800">{correctionPreview.groupedPeriodCitations}</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Source Total</span>
                    <span className="font-mono font-bold text-[#2855B9]">{correctionPreview.sourceTotal}</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 block">Status</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 capitalize">
                      {correctionPreview.reconciliationStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCorrectionDialogOpen(false)}
              disabled={applyingCorrection}
              className="h-8 text-xs rounded-lg"
            >
              Cancel
            </Button>
            {correctionPreview && (
              <Button
                size="sm"
                onClick={handleConfirmAuditedCorrection}
                disabled={applyingCorrection || loadingCorrectionPreview}
                className="bg-[#2855B9] hover:bg-[#1E3F8A] text-white h-8 px-4 text-xs rounded-lg font-medium shadow-xs"
              >
                {applyingCorrection ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Applying Correction...
                  </span>
                ) : (
                  'Confirm Verified Correction'
                )}
              </Button>
            )}
          </DialogFooter>
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
    <AppShell currentPage="publications" onNavigate={onNavigate}>
      {content}
    </AppShell>
  );
}

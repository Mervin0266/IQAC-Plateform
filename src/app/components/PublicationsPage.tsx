import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTableVirtualization } from '../hooks/useTableVirtualization';
import * as XLSX from 'xlsx';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  FolderUp,
  BookOpen, FileText, Award, TrendingUp, Users, Calendar,
  Building, CheckCircle, Clock, Plus, Search, Trash2, Edit,
  Eye, Download, AlertCircle, Upload, X, Filter, ExternalLink,
  Layers, ChevronRight, Check, RefreshCw, BarChart2, AlertTriangle, Sparkles,
  FileSpreadsheet, Printer, Globe
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
import { CitationsBulkUploadFlow } from './CitationsBulkUploadFlow';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Cell, Legend } from 'recharts';

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
  quartile?: string | null;
  quartileStatus?: string | null;
  scopusSourceId?: string | null;
  scopusUrl?: string | null;
  scopusCitedByUrl?: string | null;
  citationStatus?: string | null;
  citeScoreYear?: number | null;
  citeScoreValue?: number | string | null;
  scopusEnrichment?: any | null;
  facultyAssociations?: Array<{
    id?: string;
    facultyId?: string;
    employeeId?: string;
    facultyName?: string;
    department?: string;
    sourceFile?: string;
    indexing?: string;
  }>;
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
  const [selectedQuartile, setSelectedQuartile] = useState('all');
  const [hoveredQuartile, setHoveredQuartile] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4' | null>(null);
  const [pinnedQuartile, setPinnedQuartile] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [refreshingQuartileId, setRefreshingQuartileId] = useState<string | null>(null);

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
  const [bulkUploadInitialMode, setBulkUploadInitialMode] = useState<'publications' | 'citations'>('publications');

  // Details Sheet
  const [viewingPub, setViewingPub] = useState<PublicationItem | null>(null);
  const [activePubDetailTab, setActivePubDetailTab] = useState<'overview' | 'citations' | 'journal-metrics'>('overview');
  const [citationAnalytics, setCitationAnalytics] = useState<any | null>(null);
  const [loadingCitations, setLoadingCitations] = useState(false);
  const [citationsError, setCitationsError] = useState<string | null>(null);
  const [citationSeriesType, setCitationSeriesType] = useState<'all' | 'excludingSelf' | 'both'>('all');
  const [isCitationsBulkOpen, setIsCitationsBulkOpen] = useState(false);
  const [citationSourceFilter, setCitationSourceFilter] = useState<'all' | 'Uploaded' | 'Scopus'>('all');
  const [refreshingAllJournals, setRefreshingAllJournals] = useState(false);

  const pubTableContainerRef = useRef<HTMLDivElement>(null);
  const {
    isVirtual: isPubTableVirtual,
    paddingTop: pubTablePaddingTop,
    paddingBottom: pubTablePaddingBottom,
    renderedItems: renderedPubItems,
  } = useTableVirtualization<PublicationItem>({
    rows: publications,
    parentRef: pubTableContainerRef,
    estimateRowHeight: 56,
    threshold: 25,
    mode: 'auto',
    getItemKey: (idx) => publications[idx]?.id || idx,
  });

  const handleRefreshAllJournalMetrics = async () => {
    try {
      setRefreshingAllJournals(true);
      const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const baseUrl = rawApi.replace(/\/+$/, '');
      const res = await fetch(`${baseUrl}/api/publications/journal-sources/refresh-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && viewingPub) {
        fetchJournalMetrics(viewingPub.id);
      }
    } catch (err: any) {
      console.error('Error refreshing all journals:', err);
    } finally {
      setRefreshingAllJournals(false);
    }
  };

  // Journal Metrics (Workflow B)
  const [journalMetricsData, setJournalMetricsData] = useState<any | null>(null);
  const [loadingJournalMetrics, setLoadingJournalMetrics] = useState(false);
  const [journalMetricsError, setJournalMetricsError] = useState<string | null>(null);
  const [refreshingJournalMetrics, setRefreshingJournalMetrics] = useState(false);
  const [selectedMetricCategory, setSelectedMetricCategory] = useState<string>('all');

  const fetchJournalMetrics = useCallback(async (pubId: string) => {
    setLoadingJournalMetrics(true);
    setJournalMetricsError(null);
    try {
      const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const baseUrl = rawApi.replace(/\/+$/, '');
      const res = await fetch(`${baseUrl}/api/publications/${pubId}/journal-metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setJournalMetricsData(data);
      } else {
        setJournalMetricsError(data.message || 'Failed to fetch journal metrics');
      }
    } catch (err: any) {
      setJournalMetricsError(err.message || 'Network error fetching journal metrics');
    } finally {
      setLoadingJournalMetrics(false);
    }
  }, [token]);

  const handleRefreshJournalMetrics = async (pubId: string) => {
    setRefreshingJournalMetrics(true);
    try {
      const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const baseUrl = rawApi.replace(/\/+$/, '');
      const res = await fetch(`${baseUrl}/api/publications/${pubId}/refresh-journal-metrics`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setJournalMetricsData(data);
        if (data.metrics?.scopusSourceId) {
          setPublications(prev => prev.map(p => p.id === pubId ? { ...p, scopusSourceId: data.metrics.scopusSourceId } : p));
          if (viewingPub && viewingPub.id === pubId) {
            setViewingPub(prev => prev ? { ...prev, scopusSourceId: data.metrics.scopusSourceId } : prev);
          }
        }
      } else {
        alert(data.message || 'Could not refresh journal metrics.');
      }
    } catch (err: any) {
      alert(err.message || 'Error refreshing journal metrics.');
    } finally {
      setRefreshingJournalMetrics(false);
    }
  };

  const handleExportExcelDossier = (pubId: string) => {
    const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const baseUrl = rawApi.replace(/\/+$/, '');
    window.open(`${baseUrl}/api/publications/${pubId}/export?format=excel`, '_blank');
  };

  const fetchCitationDetails = useCallback(async (pubId: string) => {
    setLoadingCitations(true);
    setCitationsError(null);
    try {
      const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const baseUrl = rawApi.replace(/\/+$/, '');
      const res = await fetch(`${baseUrl}/api/publications/${pubId}/citations`, {
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
  }, [token]);

  useEffect(() => {
    if (!viewingPub) {
      setCitationAnalytics(null);
      setCitationsError(null);
      setJournalMetricsData(null);
      setJournalMetricsError(null);
      setActivePubDetailTab('overview');
      return;
    }

    fetchCitationDetails(viewingPub.id);
    fetchJournalMetrics(viewingPub.id);
  }, [viewingPub, fetchCitationDetails, fetchJournalMetrics]);

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
      if (selectedQuartile !== 'all') params.append('quartile', selectedQuartile);
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
  }, [token, selectedJournalType, selectedYear, selectedDept, selectedQuartile, searchQuery]);

  const handleRefreshQuartile = async (pubId: string) => {
    setRefreshingQuartileId(pubId);
    try {
      const res = await fetch(`${API_BASE}/api/publications/${pubId}/refresh-quartile`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPublications(prev => prev.map(p => p.id === pubId ? { ...p, ...data.data } : p));
        if (viewingPub && viewingPub.id === pubId) {
          setViewingPub(prev => prev ? { ...prev, ...data.data } : prev);
        }
      } else {
        alert(data.message || 'Could not enrich Scopus CiteScore Quartile.');
      }
    } catch (err: any) {
      alert(err.message || 'Error refreshing quartile.');
    } finally {
      setRefreshingQuartileId(null);
    }
  };

  const [refreshingCitationId, setRefreshingCitationId] = useState<string | null>(null);
  const handleRefreshCitation = async (pubId: string) => {
    setRefreshingCitationId(pubId);
    try {
      const res = await fetch(`${API_BASE}/api/publications/${pubId}/refresh-citation`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.data) {
        setPublications(prev => prev.map(p => p.id === pubId ? { ...p, ...data.data } : p));
        if (viewingPub && viewingPub.id === pubId) {
          setViewingPub(prev => prev ? { ...prev, ...data.data } : prev);
        }
      } else {
        alert(data.message || 'Could not refresh Scopus citations.');
      }
    } catch (err: any) {
      alert(err.message || 'Error connecting to server.');
    } finally {
      setRefreshingCitationId(null);
    }
  };

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
    const quartileDistribution = {
      Q1: 0,
      Q2: 0,
      Q3: 0,
      Q4: 0,
      Unavailable: 0
    };
    const quartileDepartmentBreakdown: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', Record<string, number>> = {
      Q1: {},
      Q2: {},
      Q3: {},
      Q4: {}
    };

    publications.forEach(p => {
      const q = (p.quartile || '').toUpperCase().trim();
      if (q === 'Q1') quartileDistribution.Q1++;
      else if (q === 'Q2') quartileDistribution.Q2++;
      else if (q === 'Q3') quartileDistribution.Q3++;
      else if (q === 'Q4') quartileDistribution.Q4++;
      else quartileDistribution.Unavailable++;

      if (q === 'Q1' || q === 'Q2' || q === 'Q3' || q === 'Q4') {
        const targetQ = q as 'Q1' | 'Q2' | 'Q3' | 'Q4';
        const depts = new Set<string>();
        if (Array.isArray(p.facultyAssociations) && p.facultyAssociations.length > 0) {
          p.facultyAssociations.forEach((fa: any) => {
            const d = (fa.department || '').trim();
            if (d) depts.add(d);
          });
        }
        if (depts.size === 0) {
          const d = (p.department || '').trim();
          if (d) depts.add(d);
          else depts.add('Unassigned');
        }
        depts.forEach((dept) => {
          quartileDepartmentBreakdown[targetQ][dept] = (quartileDepartmentBreakdown[targetQ][dept] || 0) + 1;
        });
      }

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
      totalCitations,
      quartileDistribution,
      quartileDepartmentBreakdown
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
                setBulkUploadInitialMode('publications');
                setIsBulkOpen(true);
              }}
              className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-xs"
              title="Bulk upload publications via Excel/CSV"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              <span>Bulk Upload</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setBulkUploadInitialMode('citations');
                setIsBulkOpen(true);
              }}
              className="border-blue-200 text-[#2855B9] bg-blue-50/50 hover:bg-blue-100/60 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-xs"
              title="Bulk upload citation reports via Excel/CSV"
            >
              <FolderUp className="w-3.5 h-3.5 mr-1.5 text-[#2855B9]" />
              <span>Upload Citations</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
        <div 
          className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between relative"
          onMouseLeave={() => { if (!pinnedQuartile) setHoveredQuartile(null); }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Journal Quartiles</span>
            <span className="text-[10px] font-semibold text-[#2855B9] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Scopus CiteScore
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 my-2">
            {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => {
              const count = stats.quartileDistribution[q];
              const isSelected = selectedQuartile === q;
              const isHovered = (hoveredQuartile === q || pinnedQuartile === q);

              const colorConfigs = {
                Q1: {
                  selected: 'bg-emerald-100 border-emerald-400 text-emerald-950 font-bold ring-2 ring-emerald-400',
                  default: 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100 text-emerald-800',
                  activeRing: 'ring-2 ring-emerald-400',
                  title: 'Filter & view Q1 (Top 25%)'
                },
                Q2: {
                  selected: 'bg-blue-100 border-blue-400 text-blue-950 font-bold ring-2 ring-blue-400',
                  default: 'bg-blue-50/60 border-blue-200 hover:bg-blue-100 text-blue-800',
                  activeRing: 'ring-2 ring-blue-400',
                  title: 'Filter & view Q2 (Top 50%)'
                },
                Q3: {
                  selected: 'bg-amber-100 border-amber-400 text-amber-950 font-bold ring-2 ring-amber-400',
                  default: 'bg-amber-50/60 border-amber-200 hover:bg-amber-100 text-amber-800',
                  activeRing: 'ring-2 ring-amber-400',
                  title: 'Filter & view Q3 (Top 75%)'
                },
                Q4: {
                  selected: 'bg-orange-100 border-orange-400 text-orange-950 font-bold ring-2 ring-orange-400',
                  default: 'bg-orange-50/60 border-orange-200 hover:bg-orange-100 text-orange-800',
                  activeRing: 'ring-2 ring-orange-400',
                  title: 'Filter & view Q4 (Bottom 25%)'
                }
              }[q];

              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setSelectedQuartile(selectedQuartile === q ? 'all' : q);
                    // On touch/click, toggle pinned popover
                    setPinnedQuartile(pinnedQuartile === q ? null : q);
                  }}
                  onMouseEnter={() => setHoveredQuartile(q)}
                  onMouseLeave={() => { if (!pinnedQuartile) setHoveredQuartile(null); }}
                  onFocus={() => setHoveredQuartile(q)}
                  onBlur={() => { if (!pinnedQuartile) setHoveredQuartile(null); }}
                  className={`flex flex-col items-center p-1.5 rounded-lg border transition-all cursor-pointer relative ${
                    isSelected ? colorConfigs.selected : colorConfigs.default
                  } ${isHovered && !isSelected ? colorConfigs.activeRing : ''}`}
                  title={colorConfigs.title}
                  aria-haspopup="dialog"
                  aria-expanded={isHovered}
                >
                  <span className="text-[10px] font-bold">{q}</span>
                  <span className="text-sm font-extrabold">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Department Breakdown Popover */}
          {(hoveredQuartile || pinnedQuartile) && (() => {
            const activeQ = pinnedQuartile || hoveredQuartile;
            if (!activeQ) return null;
            const qCount = stats.quartileDistribution[activeQ];
            const deptBreakdown = stats.quartileDepartmentBreakdown?.[activeQ] || {};
            const deptEntries = Object.entries(deptBreakdown).sort((a, b) => b[1] - a[1]);
            const totalDeptAttributions = deptEntries.reduce((sum, [, val]) => sum + val, 0);

            const qMeta = {
              Q1: { label: 'Q1 - Top 25%', rank: 'CiteScore 75th-99th percentile', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', bar: 'bg-emerald-500' },
              Q2: { label: 'Q2 - Top 50%', rank: 'CiteScore 50th-74th percentile', badge: 'bg-blue-100 text-blue-800 border-blue-300', bar: 'bg-blue-500' },
              Q3: { label: 'Q3 - Top 75%', rank: 'CiteScore 25th-49th percentile', badge: 'bg-amber-100 text-amber-800 border-amber-300', bar: 'bg-amber-500' },
              Q4: { label: 'Q4 - Bottom 25%', rank: 'CiteScore 1st-24th percentile', badge: 'bg-orange-100 text-orange-800 border-orange-300', bar: 'bg-orange-500' },
            }[activeQ];

            return (
              <div
                className="absolute top-full left-0 right-0 sm:right-auto sm:w-88 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200/95 p-3.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
                onMouseEnter={() => setHoveredQuartile(activeQ)}
                onMouseLeave={() => { if (!pinnedQuartile) setHoveredQuartile(null); }}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${qMeta.badge}`}>
                      {qMeta.label}
                    </span>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">({qMeta.rank})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-800 font-mono">
                      {qCount} {qCount === 1 ? 'publication' : 'publications'}
                    </span>
                    {pinnedQuartile && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPinnedQuartile(null);
                          setHoveredQuartile(null);
                        }}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                        title="Close popover"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                  <span>Department Breakdown</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    {deptEntries.length} {deptEntries.length === 1 ? 'department' : 'departments'}
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                  {deptEntries.length === 0 ? (
                    <div className="py-3 text-center text-slate-400 text-[11px]">
                      No department publications recorded for {activeQ}.
                    </div>
                  ) : (
                    deptEntries.map(([deptName, deptCount]) => {
                      const share = qCount > 0 ? Math.round((deptCount / qCount) * 100) : 0;
                      return (
                        <div key={deptName} className="pt-1.5 first:pt-0">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-medium text-slate-700 truncate max-w-[210px]" title={deptName}>
                              {deptName}
                            </span>
                            <span className="font-bold text-slate-900 font-mono shrink-0 ml-2">
                              {deptCount}{' '}
                              <span className="text-[10px] font-normal text-slate-400">
                                ({share}%)
                              </span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${qMeta.bar}`}
                              style={{ width: `${Math.min(100, share)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-500 leading-tight">
                  <span className="font-semibold text-slate-600">Note:</span> Multi-department co-authored papers count once under every contributing department. Department sum ({totalDeptAttributions}) may exceed distinct publications ({qCount}).
                </div>
              </div>
            );
          })()}

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
            <span>Unavailable / Other:</span>
            <button
              type="button"
              onClick={() => setSelectedQuartile(selectedQuartile === 'Unavailable' ? 'all' : 'Unavailable')}
              className={`font-semibold hover:underline cursor-pointer ${selectedQuartile === 'Unavailable' ? 'text-blue-700 font-bold' : ''}`}
            >
              {stats.quartileDistribution.Unavailable} records
            </button>
          </div>
        </div>
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

            {/* Scopus CiteScore Quartile Filter */}
            <div className="w-36">
              <Select value={selectedQuartile} onValueChange={setSelectedQuartile}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Quartile" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Quartiles</SelectItem>
                  <SelectItem value="Q1">Q1 (Top 25%)</SelectItem>
                  <SelectItem value="Q2">Q2 (Top 50%)</SelectItem>
                  <SelectItem value="Q3">Q3 (Top 75%)</SelectItem>
                  <SelectItem value="Q4">Q4 (Bottom 25%)</SelectItem>
                  <SelectItem value="Unavailable">Unavailable</SelectItem>
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
          <div
            ref={pubTableContainerRef}
            className={`overflow-x-auto ${isPubTableVirtual ? 'max-h-[620px] overflow-y-auto' : ''}`}
          >
            <table className="w-full text-left border-collapse text-xs">
              <thead className={isPubTableVirtual ? 'sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_#E2E8F0]' : ''}>
                <tr className="bg-slate-50 border-b border-[#E2E8F0] text-slate-700 font-semibold text-xs">
                  <th className="p-3 pl-4 min-w-[180px]">Authors</th>
                  <th className="p-3 min-w-[260px]">Title</th>
                  <th className="p-3 min-w-[180px]">Journal Name</th>
                  <th className="p-3 min-w-[130px]">Journal Type</th>
                  <th className="p-3 text-center min-w-[90px]">Quartile</th>
                  <th className="p-3 min-w-[150px]">Department</th>
                  <th className="p-3 text-center min-w-[90px]">Year</th>
                  <th className="p-3 text-center min-w-[80px]">Citations</th>
                  <th className="p-3 min-w-[120px]">DOI / Identifiers</th>
                  <th className="p-3 text-right pr-4 min-w-[100px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs sm:text-[13px]">
                {isPubTableVirtual && pubTablePaddingTop > 0 && (
                  <tr style={{ height: `${pubTablePaddingTop}px` }} aria-hidden="true" className="border-0 p-0 pointer-events-none">
                    <td colSpan={10} style={{ padding: 0, border: 0, height: `${pubTablePaddingTop}px` }} />
                  </tr>
                )}
                {renderedPubItems.map(({ item: pub }) => (
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

                    {/* Quartile (Scopus CiteScore) */}
                    <td className="p-3 text-center whitespace-nowrap">
                      {pub.quartile === 'Q1' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                          Q1
                        </span>
                      ) : pub.quartile === 'Q2' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs">
                          Q2
                        </span>
                      ) : pub.quartile === 'Q3' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                          Q3
                        </span>
                      ) : pub.quartile === 'Q4' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-300 shadow-2xs">
                          Q4
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-slate-500 bg-slate-100 border border-slate-200" title={pub.quartileStatus || 'Not Available'}>
                          {pub.quartileStatus === 'Not Indexed' ? 'Not Indexed' : pub.quartileStatus === 'Lookup Failed' ? 'Failed' : pub.quartileStatus === 'Pending' ? 'Pending' : '—'}
                        </span>
                      )}
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
                {isPubTableVirtual && pubTablePaddingBottom > 0 && (
                  <tr style={{ height: `${pubTablePaddingBottom}px` }} aria-hidden="true" className="border-0 p-0 pointer-events-none">
                    <td colSpan={10} style={{ padding: 0, border: 0, height: `${pubTablePaddingBottom}px` }} />
                  </tr>
                )}
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
                    {pub.quartile && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        pub.quartile === 'Q1' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        pub.quartile === 'Q2' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        pub.quartile === 'Q3' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        'bg-orange-100 text-orange-800 border-orange-300'
                      }`}>
                        {pub.quartile}
                      </span>
                    )}
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

                <div className="space-y-1.5 col-span-2 sm:col-span-1 p-2.5 rounded-lg bg-blue-50/70 border border-blue-100">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1E3A8A]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Automatic Scopus Citations</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    Citation counts and Scopus EIDs are retrieved automatically from Elsevier Scopus via DOI and refreshed on a weekly schedule.
                  </p>
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
        onSuccess={() => {
          fetchPublications();
          if (viewingPub) {
            fetchCitationDetails(viewingPub.id);
          }
        }}
        uploadType="publications"
        initialMode={bulkUploadInitialMode}
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

                {/* Tab Switcher: Overview vs Citations vs Journal Metrics */}
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
                  <button
                    type="button"
                    onClick={() => setActivePubDetailTab('journal-metrics')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      activePubDetailTab === 'journal-metrics'
                        ? 'bg-[#2855B9] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Journal Metrics</span>
                    {(journalMetricsData?.metrics?.currentCiteScore?.bestQuartile || viewingPub.quartile) && (
                      <span className="ml-1 text-[10px] font-bold px-1.5 py-0.2 bg-blue-100 text-[#1E3A8A] rounded-full">
                        {journalMetricsData?.metrics?.currentCiteScore?.bestQuartile || viewingPub.quartile}
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

                {/* Scopus CiteScore & Subject Category Quartiles Section */}
                <div className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-[#2855B9]" />
                      <span>Scopus CiteScore & Subject Category Quartiles</span>
                    </h4>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={refreshingQuartileId === viewingPub.id}
                      onClick={() => handleRefreshQuartile(viewingPub.id)}
                      className="h-7 text-[11px] px-2.5 border-slate-200 text-[#2855B9] hover:bg-blue-50 flex items-center gap-1 font-semibold"
                    >
                      <RefreshCw className={`w-3 h-3 ${refreshingQuartileId === viewingPub.id ? 'animate-spin' : ''}`} />
                      <span>{refreshingQuartileId === viewingPub.id ? 'Enriching...' : 'Refresh CiteScore'}</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Best Quartile</span>
                      <div className="mt-1">
                        {viewingPub.quartile === 'Q1' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Q1 (Top 25%)
                          </span>
                        ) : viewingPub.quartile === 'Q2' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-300">
                            Q2 (Top 50%)
                          </span>
                        ) : viewingPub.quartile === 'Q3' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                            Q3 (Top 75%)
                          </span>
                        ) : viewingPub.quartile === 'Q4' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-orange-100 text-orange-800 border border-orange-300">
                            Q4 (Bottom 25%)
                          </span>
                        ) : (
                          <span className="text-slate-500 font-semibold text-xs">
                            {viewingPub.quartileStatus || 'Not Available'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CiteScore Metric</span>
                      <p className="font-mono font-bold text-slate-800 text-sm mt-1">
                        {viewingPub.citeScoreValue !== null && viewingPub.citeScoreValue !== undefined
                          ? `${viewingPub.citeScoreValue}`
                          : '—'}
                      </p>
                      {viewingPub.citeScoreYear && (
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">Year: {viewingPub.citeScoreYear}</span>
                      )}
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scopus Source ID</span>
                      <p className="font-mono font-semibold text-slate-800 text-[11px] mt-1 truncate" title={viewingPub.scopusSourceId || '—'}>
                        {viewingPub.scopusSourceId || '—'}
                      </p>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Indexing Status</span>
                      <p className="font-semibold text-slate-700 text-xs mt-1">
                        {viewingPub.quartileStatus || (viewingPub.quartile ? 'Available' : 'Pending')}
                      </p>
                    </div>
                  </div>

                  {/* Subject Categories Table */}
                  {viewingPub.scopusEnrichment?.categories && viewingPub.scopusEnrichment.categories.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Subject Categories & Percentiles ({viewingPub.scopusEnrichment.categories.length})
                      </span>
                      <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 sticky top-0">
                            <tr>
                              <th className="py-2 px-3">Category</th>
                              <th className="py-2 px-3 text-center">Rank</th>
                              <th className="py-2 px-3 text-center">Percentile</th>
                              <th className="py-2 px-3 text-center">Quartile</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[11px]">
                            {viewingPub.scopusEnrichment.categories.map((cat: any, cIdx: number) => (
                              <tr key={cIdx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-2 px-3 font-medium text-slate-800">
                                  {cat.category || 'General'}
                                  {cat.code && <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({cat.code})</span>}
                                </td>
                                <td className="py-2 px-3 text-center font-mono text-slate-600">
                                  {cat.rank && cat.rankTotal ? `#${cat.rank} / ${cat.rankTotal}` : cat.rank ? `#${cat.rank}` : '—'}
                                </td>
                                <td className="py-2 px-3 text-center font-mono font-semibold text-slate-800">
                                  {cat.percentile !== null && cat.percentile !== undefined ? `${cat.percentile}%` : '—'}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                    cat.quartile === 'Q1' ? 'bg-emerald-100 text-emerald-800' :
                                    cat.quartile === 'Q2' ? 'bg-blue-100 text-blue-800' :
                                    cat.quartile === 'Q3' ? 'bg-amber-100 text-amber-800' :
                                    cat.quartile === 'Q4' ? 'bg-orange-100 text-orange-800' :
                                    'bg-slate-100 text-slate-500'
                                  }`}>
                                    {cat.quartile || '—'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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
                ) : activePubDetailTab === 'citations' ? (
                  /* CITATIONS TAB (Workflow A) */
                  <div className="space-y-5">
                    {loadingCitations ? (
                      <div className="py-12 text-center text-slate-400 space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#2855B9]" />
                        <p className="text-xs">Loading citation history and yearly analytics...</p>
                      </div>
                    ) : (
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
                                  {citationAnalytics?.currentTotal ?? viewingPub.citationCount ?? 0}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="bg-white border-emerald-300 text-emerald-800 text-[10px]">
                                Source: {citationAnalytics?.latestSnapshot?.citationSource || 'Scopus'}
                              </Badge>
                              <Badge variant="outline" className={`text-[10px] ${
                                citationAnalytics?.latestSnapshot?.reconciliationStatus === 'reconciled'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {citationAnalytics?.latestSnapshot?.reconciliationStatus === 'reconciled'
                                  ? 'Reconciled'
                                  : citationAnalytics?.latestSnapshot?.hasCorruptPeriods
                                    ? 'Unverified Breakdown'
                                    : 'Live Scopus API'}
                              </Badge>
                              <Button
                                type="button"
                                size="sm"
                                disabled={refreshingCitationId === viewingPub.id}
                                onClick={() => handleRefreshCitation(viewingPub.id)}
                                className="bg-[#1E3A8A] text-white hover:bg-[#152865] text-[11px] h-7 px-2.5 rounded-lg flex items-center gap-1 shadow-xs ml-auto"
                              >
                                <RefreshCw className={`w-3 h-3 ${refreshingCitationId === viewingPub.id ? 'animate-spin' : ''}`} />
                                <span>{refreshingCitationId === viewingPub.id ? 'Refreshing...' : 'Refresh from Scopus'}</span>
                              </Button>
                              {(citationAnalytics?.scopusIdentifiers?.scopusUrl || viewingPub.scopusUrl) && (
                                <a
                                  href={citationAnalytics?.scopusIdentifiers?.scopusUrl || viewingPub.scopusUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] h-7 px-2.5 rounded-lg border border-slate-200 text-[#1E3A8A] hover:bg-slate-50 font-semibold"
                                >
                                  <span>View in Scopus</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                              {(citationAnalytics?.scopusIdentifiers?.scopusCitedByUrl || viewingPub.scopusCitedByUrl) && (
                                <a
                                  href={citationAnalytics?.scopusIdentifiers?.scopusCitedByUrl || viewingPub.scopusCitedByUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] h-7 px-2.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold"
                                >
                                  <span>Citing Articles</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-emerald-200/60 text-[11px] text-slate-600">
                            <div>
                              <span className="text-slate-400 text-[10px] block">Source / Retrieval Mode:</span>
                              <span className="font-mono font-medium text-slate-800 truncate block">
                                {citationAnalytics?.latestSnapshot?.sourceFile || 'Scopus API Live Retrieval'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] block">Verified Faculty:</span>
                              <span className="font-medium text-slate-800 truncate block">
                                {citationAnalytics?.verifiedFaculty?.name
                                  ? `${citationAnalytics.verifiedFaculty.name} (Emp ID: ${citationAnalytics.verifiedFaculty.employeeId})`
                                  : citationAnalytics?.latestSnapshot?.facultyName
                                    ? `${citationAnalytics.latestSnapshot.facultyName} (Emp ID: ${citationAnalytics.latestSnapshot.employeeId})`
                                    : (citationAnalytics?.latestSnapshot?.employeeId && citationAnalytics.latestSnapshot.employeeId !== 'SCOPUS_API'
                                        ? `Emp ID: ${citationAnalytics.latestSnapshot.employeeId}`
                                        : 'Institutional Research')}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[10px] block">Last Synchronized:</span>
                              <span className="font-medium text-slate-800 block">
                                {citationAnalytics?.latestSnapshot?.createdAt
                                  ? new Date(citationAnalytics.latestSnapshot.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                                  : (viewingPub.createdAt ? new Date(viewingPub.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Unverified Legacy Breakdown Alert Banner (if corrupt period numbers exist in DB) */}
                        {citationAnalytics?.latestSnapshot?.hasCorruptPeriods && (
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

                          // Source Separation: filter by Uploaded vs Scopus vs All
                          const activeSnapshot = (() => {
                            if (citationSourceFilter === 'Uploaded') {
                              return (citationAnalytics?.history || []).find((h: any) => h.citationSource === 'Uploaded' && h.yearlyDetails?.length > 0) ||
                                     (citationAnalytics?.latestSnapshot?.citationSource === 'Uploaded' ? citationAnalytics.latestSnapshot : null);
                            }
                            if (citationSourceFilter === 'Scopus') {
                              return (citationAnalytics?.history || []).find((h: any) => h.citationSource === 'Scopus' && h.yearlyDetails?.length > 0) ||
                                     (citationAnalytics?.latestSnapshot?.citationSource === 'Scopus' ? citationAnalytics.latestSnapshot : null);
                            }
                            if (citationAnalytics?.latestSnapshot?.yearlyDetails && citationAnalytics.latestSnapshot.yearlyDetails.length > 0) {
                              return citationAnalytics.latestSnapshot;
                            }
                            return (citationAnalytics?.history || []).find((h: any) => h.yearlyDetails && h.yearlyDetails.length > 0) || citationAnalytics?.latestSnapshot;
                          })();

                          const rawDetails = activeSnapshot?.yearlyDetails || [];

                          // Dynamic X-axis range calculation from earliest to latest year
                          const yearNumbers = rawDetails
                            .filter((d: any) => d.periodType === 'year' && /^\d{4}$/.test(String(d.period || '').trim()))
                            .map((d: any) => parseInt(String(d.period).trim(), 10))
                            .filter((y: number) => !isNaN(y));

                          const minYear = yearNumbers.length > 0 ? Math.min(...yearNumbers) : null;
                          const maxYear = yearNumbers.length > 0 ? Math.max(...yearNumbers) : null;

                          const chartData = (minYear !== null && maxYear !== null) ? (() => {
                            const detailMap = new Map();
                            rawDetails.forEach((d: any) => {
                              const p = String(d.period || '').trim();
                              detailMap.set(p, d);
                            });

                            const list: any[] = [];
                            rawDetails.filter((d: any) => /^[<≤]/.test(String(d.period || '').trim())).forEach((d: any) => {
                              list.push({
                                period: String(d.period).trim(),
                                citations: d.citationCount !== null ? d.citationCount : null,
                                excludingSelf: d.excludingSelfCount !== null ? d.excludingSelfCount : null,
                                isGrouped: true,
                                isUnknown: d.citationCount === null
                              });
                            });

                            for (let y = minYear; y <= maxYear; y++) {
                              const yStr = String(y);
                              const entry = detailMap.get(yStr);
                              list.push({
                                period: yStr,
                                citations: entry ? (entry.citationCount !== null ? entry.citationCount : null) : null,
                                excludingSelf: entry ? (entry.excludingSelfCount !== null ? entry.excludingSelfCount : null) : null,
                                isGrouped: false,
                                isUnknown: !entry || entry.citationCount === null
                              });
                            }

                            rawDetails.filter((d: any) => /^[>≥]/.test(String(d.period || '').trim())).forEach((d: any) => {
                              list.push({
                                period: String(d.period).trim(),
                                citations: d.citationCount !== null ? d.citationCount : null,
                                excludingSelf: d.excludingSelfCount !== null ? d.excludingSelfCount : null,
                                isGrouped: true,
                                isUnknown: d.citationCount === null
                              });
                            });

                            return list;
                          })() : rawDetails
                            .filter((d: any) => d.periodType !== 'subtotal' && d.periodType !== 'total' && validPeriodRegex.test(String(d.period || '').trim()))
                            .map((d: any) => ({
                              period: String(d.period || '').trim(),
                              citations: d.citationCount !== null ? d.citationCount : null,
                              excludingSelf: d.excludingSelfCount !== null && d.excludingSelfCount !== undefined ? d.excludingSelfCount : null,
                              isGrouped: d.periodType === 'grouped' || /^[<>≤≥]/.test(String(d.period || '').trim()),
                              isUnknown: d.citationCount === null
                            }))
                            .sort((a: any, b: any) => getSortKey(a.period) - getSortKey(b.period));

                          const hasGroupedPeriods = chartData.some((d: any) => d.isGrouped);
                          const hasExclSelfData = chartData.some((d: any) => d.excludingSelf !== null);

                          if (chartData.length === 0) {
                            return (
                              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <TrendingUp className="w-3.5 h-3.5 text-[#2855B9]" />
                                    Annual Citation Progression & Period Breakdown
                                  </h4>
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 text-xs text-slate-700">
                                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                  <div className="space-y-2 flex-1">
                                    <div>
                                      <p className="font-semibold text-slate-900">
                                        Total Scopus Citations Verified ({citationAnalytics?.currentTotal ?? viewingPub.citationCount ?? 0}), Annual Time-Series Not Reported
                                      </p>
                                      <p className="text-[11px] text-slate-600 leading-relaxed mt-0.5">
                                        The cumulative citation count is verified directly from Elsevier Scopus Search and Abstract APIs.
                                        The annual time-series endpoint (<code className="px-1 py-0.5 bg-slate-200 rounded text-[10px]">/content/abstract/citations</code>) requires institutional entitlement (<code className="px-1 py-0.5 bg-slate-200 rounded text-[10px]">insttoken</code>) on this Elsevier API key, or historical publication citation snapshots to generate the yearly timeline.
                                      </p>
                                    </div>
                                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-2">
                                      <span className="text-[11px] text-slate-600 font-medium">To display annual breakdown & progression graph:</span>
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => {
                                          setBulkUploadInitialMode('citations');
                                          setIsBulkOpen(true);
                                        }}
                                        className="bg-[#2855B9] hover:bg-[#1E3F8A] text-white text-[11px] h-7 px-3 rounded-lg flex items-center gap-1 font-semibold shadow-xs"
                                      >
                                        <FolderUp className="w-3.5 h-3.5" />
                                        <span>Upload Citation File / Folder</span>
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-5">
                              {/* 2a. Annual Breakdown BarChart */}
                              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                      <TrendingUp className="w-3.5 h-3.5 text-[#2855B9]" />
                                      Annual Citation Progression
                                    </h4>
                                    {/* Source Separation Tabs */}
                                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px]">
                                      <button
                                        type="button"
                                        onClick={() => setCitationSourceFilter('all')}
                                        className={`px-2 py-0.5 rounded font-semibold transition-all ${
                                          citationSourceFilter === 'all' ? 'bg-[#2855B9] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                      >
                                        All / Reconciled
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setCitationSourceFilter('Uploaded')}
                                        className={`px-2 py-0.5 rounded font-semibold transition-all ${
                                          citationSourceFilter === 'Uploaded' ? 'bg-[#2855B9] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                      >
                                        Uploaded Citations
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setCitationSourceFilter('Scopus')}
                                        className={`px-2 py-0.5 rounded font-semibold transition-all ${
                                          citationSourceFilter === 'Scopus' ? 'bg-[#2855B9] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                      >
                                        Scopus Live Retrieval
                                      </button>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {hasExclSelfData && (
                                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                                        <button
                                          type="button"
                                          onClick={() => setCitationSeriesType('all')}
                                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                            citationSeriesType === 'all' ? 'bg-[#2855B9] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                          }`}
                                        >
                                          All Citations
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setCitationSeriesType('excludingSelf')}
                                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                            citationSeriesType === 'excludingSelf' ? 'bg-[#2855B9] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                          }`}
                                        >
                                          Excl. Self
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setCitationSeriesType('both')}
                                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                                            citationSeriesType === 'both' ? 'bg-[#2855B9] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                                          }`}
                                        >
                                          Both
                                        </button>
                                      </div>
                                    )}
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
                                      />
                                      {(citationSeriesType === 'all' || citationSeriesType === 'both') && (
                                        <Bar dataKey="citations" name="All Citations" fill="#2855B9" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                      )}
                                      {(citationSeriesType === 'excludingSelf' || citationSeriesType === 'both') && hasExclSelfData && (
                                        <Bar dataKey="excludingSelf" name="Excl. Self-Citations" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                      )}
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>

                              {/* 2b. Cumulative Progression Graph */}
                              {citationAnalytics?.cumulativeSeries && citationAnalytics.cumulativeSeries.length > 0 && (
                                <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                      Cumulative Citation Progression Trajectory
                                    </h4>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                      <span className="flex items-center gap-1">
                                        <span className="w-2.5 h-0.5 bg-emerald-600 inline-block" />
                                        Cumulative Total
                                      </span>
                                    </div>
                                  </div>
                                  <div className="h-48 w-full pt-2">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <AreaChart data={citationAnalytics.cumulativeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                                        <defs>
                                          <linearGradient id="cumCitationGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                                          </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                        <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748B' }} />
                                        <YAxis allowDecimals={false} domain={[0, 'auto']} tick={{ fontSize: 10, fill: '#64748B' }} />
                                        <Tooltip
                                          contentStyle={{
                                            backgroundColor: '#FFFFFF',
                                            borderRadius: '8px',
                                            border: '1px solid #E2E8F0',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                            fontSize: '11px'
                                          }}
                                          formatter={(val: any) => [`${val} cumulative citations`, 'Cumulative Total']}
                                        />
                                        <Area type="monotone" dataKey="cumulativeAll" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#cumCitationGrad)" />
                                      </AreaChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                              )}
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

                          const activeSnapshot = (() => {
                            if (citationSourceFilter === 'Uploaded') {
                              return (citationAnalytics?.history || []).find((h: any) => h.citationSource === 'Uploaded' && h.yearlyDetails?.length > 0) ||
                                     (citationAnalytics?.latestSnapshot?.citationSource === 'Uploaded' ? citationAnalytics.latestSnapshot : null);
                            }
                            if (citationSourceFilter === 'Scopus') {
                              return (citationAnalytics?.history || []).find((h: any) => h.citationSource === 'Scopus' && h.yearlyDetails?.length > 0) ||
                                     (citationAnalytics?.latestSnapshot?.citationSource === 'Scopus' ? citationAnalytics.latestSnapshot : null);
                            }
                            if (citationAnalytics?.latestSnapshot?.yearlyDetails && citationAnalytics.latestSnapshot.yearlyDetails.length > 0) {
                              return citationAnalytics.latestSnapshot;
                            }
                            return (citationAnalytics?.history || []).find((h: any) => h.yearlyDetails && h.yearlyDetails.length > 0) || citationAnalytics?.latestSnapshot;
                          })();

                          const rawDetails = activeSnapshot?.yearlyDetails || citationAnalytics?.latestSnapshot?.yearlyDetails || [];
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
                                      <th className="py-2 px-3 text-right">All Citations</th>
                                      <th className="py-2 px-3 text-right">Excl. Self</th>
                                      <th className="py-2 px-3">Data Source</th>
                                      <th className="py-2 px-3">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {tableDetails.length === 0 ? (
                                      <tr>
                                        <td colSpan={6} className="py-6 text-center text-slate-400 text-xs">
                                          <p className="font-medium text-slate-500">Year-wise breakdown not reported by Scopus API.</p>
                                          <p className="text-[11px] text-slate-400 mt-0.5">The verified cumulative total ({citationAnalytics?.currentTotal ?? viewingPub.citationCount ?? 0}) is active and referenced across all IQAC portfolios and reports.</p>
                                        </td>
                                      </tr>
                                    ) : (
                                      tableDetails.map((yd: any, idx: number) => (
                                        <tr key={idx} className={yd.periodType === 'subtotal' ? 'bg-slate-50 font-bold' : ''}>
                                          <td className="py-2 px-3 font-mono">{yd.period}</td>
                                          <td className="py-2 px-3 capitalize text-slate-500">{yd.periodType}</td>
                                          <td className="py-2 px-3 text-right font-mono font-bold">
                                            {yd.citationCount !== null ? yd.citationCount : <span className="text-slate-400 font-normal">—</span>}
                                          </td>
                                          <td className="py-2 px-3 text-right font-mono font-medium text-slate-600">
                                            {yd.excludingSelfCount !== null && yd.excludingSelfCount !== undefined ? yd.excludingSelfCount : '—'}
                                          </td>
                                          <td className="py-2 px-3 text-slate-500">{yd.source || 'Scopus'}</td>
                                          <td className="py-2 px-3">
                                            <span className="text-[10px] text-emerald-700 font-medium">Reconciled</span>
                                          </td>
                                        </tr>
                                      ))
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              {/* Reconciliation Summary */}
                              {tableDetails.length > 0 && (() => {
                                const annualSum = rawDetails
                                  .filter((d: any) => d.periodType === 'year' && validPeriodRegex.test(String(d.period || '').trim()))
                                  .reduce((sum: number, d: any) => sum + (d.citationCount || 0), 0);
                                const groupedSum = rawDetails
                                  .filter((d: any) => (d.periodType === 'grouped' || /^[<>≤≥]/.test(String(d.period || '').trim())) && validPeriodRegex.test(String(d.period || '').trim()))
                                  .reduce((sum: number, d: any) => sum + (d.citationCount || 0), 0);
                                const subtotalEntry = rawDetails.find((d: any) => d.periodType === 'subtotal');
                                const sourceSubtotal = subtotalEntry?.citationCount ?? annualSum;
                                const sourceTotal = citationAnalytics?.latestSnapshot?.reportedTotal ?? viewingPub.citationCount ?? (annualSum + groupedSum);
                                const status = citationAnalytics?.latestSnapshot?.reconciliationStatus || 'reconciled';

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
                        {citationAnalytics?.history && citationAnalytics.history.length > 0 && (
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
                    )}
                  </div>
                ) : (
                  /* JOURNAL METRICS TAB (Workflow B) */
                  <div className="space-y-5">
                    {loadingJournalMetrics ? (
                      <div className="py-12 text-center text-slate-400 space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#2855B9]" />
                        <p className="text-xs font-medium">Retrieving Scopus CiteScore & Journal Metrics from Elsevier API...</p>
                      </div>
                    ) : journalMetricsError ? (
                      <div className="p-6 bg-rose-50/70 border border-rose-200 rounded-xl text-center space-y-3">
                        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                        <div>
                          <p className="font-semibold text-rose-900 text-sm">Could Not Retrieve Journal Metrics</p>
                          <p className="text-xs text-rose-700 mt-1 max-w-md mx-auto">{journalMetricsError}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => fetchJournalMetrics(viewingPub.id)}
                          className="bg-[#2855B9] text-white hover:bg-[#1C355B] text-xs px-3 py-1.5 rounded-lg"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                          Retry Lookup
                        </Button>
                      </div>
                    ) : (() => {
                      const metrics = journalMetricsData?.metrics || {};
                      const journalTitle = metrics.sourceTitle || viewingPub.journalName || 'Journal Source';
                      const sourceId = metrics.scopusSourceId || viewingPub.scopusSourceId;
                      const publisher = metrics.publisher || viewingPub.publisher || 'Elsevier / Indexed Serial';
                      const issn = metrics.issn || viewingPub.issn || metrics.eIssn || '—';
                      const sourceType = metrics.sourceType || 'Journal';
                      const scopusUrl = metrics.scopusUrl || (sourceId ? `https://www.scopus.com/sourceid/${sourceId}` : null);

                      const currentCs = metrics.currentCiteScore || {};
                      const trackerCs = metrics.trackerCiteScore || {};
                      const sjrMap = metrics.sjrByYear || {};
                      const snipMap = metrics.snipByYear || {};
                      const outputMap = metrics.scholarlyOutputByYear || {};
                      const citeScoresMap = metrics.citeScoresByYear || {};

                      const sjrYears = Object.keys(sjrMap).map(Number).sort((a, b) => b - a);
                      const latestSjrYear = sjrYears[0];
                      const latestSjr = latestSjrYear ? sjrMap[latestSjrYear] : null;

                      const snipYears = Object.keys(snipMap).map(Number).sort((a, b) => b - a);
                      const latestSnipYear = snipYears[0];
                      const latestSnip = latestSnipYear ? snipMap[latestSnipYear] : null;

                      const outputYears = Object.keys(outputMap).map(Number).sort((a, b) => b - a);
                      const latestOutputYear = outputYears[0];
                      const latestOutput = latestOutputYear ? outputMap[latestOutputYear] : null;

                      // Historical CiteScore Chart Data
                      const csYears = Object.keys(citeScoresMap).map(Number).sort((a, b) => a - b);
                      const csChartData = csYears.map(yr => ({
                        year: String(yr),
                        citeScore: citeScoresMap[yr]?.citeScore ?? null,
                        status: citeScoresMap[yr]?.status || 'Complete'
                      })).filter(d => d.citeScore !== null);

                      // Scholarly Output Chart Data
                      const allOutputYears = Array.from(new Set([...csYears, ...outputYears])).sort((a, b) => a - b);
                      const outputChartData = allOutputYears.map(yr => ({
                        year: String(yr),
                        documents: outputMap[yr] ?? citeScoresMap[yr]?.scholarlyOutput ?? 0
                      })).filter(d => d.documents > 0);

                      // SJR & SNIP Chart Data
                      const metricYears = Array.from(new Set([...sjrYears, ...snipYears])).sort((a, b) => a - b);
                      const sjrSnipChartData = metricYears.map(yr => ({
                        year: String(yr),
                        sjr: sjrMap[yr] ?? null,
                        snip: snipMap[yr] ?? null
                      }));

                      // Categories
                      const categories = currentCs.categories || [];
                      const allCategoryNames = Array.from(new Set(
                        Object.values(citeScoresMap).flatMap((yInfo: any) => (yInfo.categories || []).map((c: any) => c.category))
                      )) as string[];

                      const activeCat = selectedMetricCategory === 'all' && categories.length > 0
                        ? categories[0]?.category
                        : (selectedMetricCategory !== 'all' ? selectedMetricCategory : null);

                      const percentileChartData = activeCat ? csYears.map(yr => {
                        const yrInfo = citeScoresMap[yr];
                        const matchCat = (yrInfo?.categories || []).find((c: any) => c.category === activeCat);
                        return {
                          year: String(yr),
                          percentile: matchCat?.percentile ?? null,
                          rank: matchCat?.rank ? `#${matchCat.rank}${matchCat.rankTotal ? ' / ' + matchCat.rankTotal : ''}` : '—'
                        };
                      }).filter(d => d.percentile !== null) : [];

                      return (
                        <>
                          {/* 1. Journal Metadata Card */}
                          <div className="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200 rounded-xl space-y-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="space-y-0.5 max-w-xl">
                                <span className="text-[10px] font-bold text-[#1E3A8A] uppercase tracking-wider block">
                                  {sourceType} Details & Indexing
                                </span>
                                <h3 className="text-base font-bold text-slate-900 leading-snug">{journalTitle}</h3>
                                <p className="text-[11px] text-slate-500">
                                  Published by <span className="font-semibold text-slate-700">{publisher}</span>
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={refreshingJournalMetrics}
                                  onClick={() => handleRefreshJournalMetrics(viewingPub.id)}
                                  className="bg-[#1E3A8A] text-white hover:bg-[#152865] text-[11px] h-7 px-2.5 rounded-lg flex items-center gap-1 shadow-xs"
                                >
                                  <RefreshCw className={`w-3 h-3 ${refreshingJournalMetrics ? 'animate-spin' : ''}`} />
                                  <span>{refreshingJournalMetrics ? 'Refreshing...' : 'Update Metrics'}</span>
                                </Button>
                                {(currentRole === 'admin' || currentRole === 'iqac_admin' || currentRole === 'coordinator') && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={refreshingAllJournals}
                                    onClick={handleRefreshAllJournalMetrics}
                                    className="bg-indigo-600 text-white hover:bg-indigo-700 text-[11px] h-7 px-2.5 rounded-lg flex items-center gap-1 shadow-xs"
                                  >
                                    <RefreshCw className={`w-3 h-3 ${refreshingAllJournals ? 'animate-spin' : ''}`} />
                                    <span>{refreshingAllJournals ? 'Refreshing All...' : 'Refresh All Journal Metrics'}</span>
                                  </Button>
                                )}
                                {scopusUrl && (
                                  <a
                                    href={scopusUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] h-7 px-2.5 rounded-lg border border-slate-200 text-[#1E3A8A] hover:bg-slate-50 font-semibold"
                                  >
                                    <span>Scopus Source Page</span>
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-blue-200/60 text-[11px] text-slate-600">
                              <div>
                                <span className="text-slate-400 text-[10px] block">Scopus Source ID:</span>
                                <span className="font-mono font-medium text-slate-800">{sourceId || '—'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] block">ISSN / eISSN:</span>
                                <span className="font-mono font-medium text-slate-800">{issn}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] block">Source Type:</span>
                                <span className="font-medium text-slate-800">{sourceType}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 text-[10px] block">Last Metrics Fetch:</span>
                                <span className="font-medium text-slate-800">
                                  {metrics.lastFetchedAt ? new Date(metrics.lastFetchedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 2. Key Metrics KPI Cards (5-Grid) */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current CiteScore</span>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold font-mono text-[#2855B9]">
                                  {currentCs.value !== null && currentCs.value !== undefined ? currentCs.value : '—'}
                                </span>
                                {currentCs.bestQuartile && (
                                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                    currentCs.bestQuartile === 'Q1' ? 'bg-emerald-100 text-emerald-800' :
                                    currentCs.bestQuartile === 'Q2' ? 'bg-blue-100 text-blue-800' :
                                    currentCs.bestQuartile === 'Q3' ? 'bg-amber-100 text-amber-800' :
                                    'bg-orange-100 text-orange-800'
                                  }`}>
                                    {currentCs.bestQuartile}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 block">
                                {currentCs.year ? `${currentCs.year} Complete` : 'Completed Score'}
                              </span>
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CiteScore Tracker</span>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold font-mono text-indigo-700">
                                  {trackerCs.value !== null && trackerCs.value !== undefined ? trackerCs.value : '—'}
                                </span>
                              </div>
                              <span className="text-[10px] text-indigo-600 font-medium block">
                                {trackerCs.year ? `${trackerCs.year} In-Progress` : 'In-Progress Tracker'}
                              </span>
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SCImago Rank (SJR)</span>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold font-mono text-amber-700">
                                  {latestSjr !== null ? latestSjr : '—'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 block">
                                {latestSjrYear ? `Year ${latestSjrYear}` : 'Latest Year'}
                              </span>
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Impact/Paper (SNIP)</span>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold font-mono text-purple-700">
                                  {latestSnip !== null ? latestSnip : '—'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 block">
                                {latestSnipYear ? `Year ${latestSnipYear}` : 'Latest Year'}
                              </span>
                            </div>

                            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scholarly Output</span>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-bold font-mono text-emerald-800">
                                  {latestOutput !== null ? latestOutput.toLocaleString() : '—'}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 block">
                                {latestOutputYear ? `Docs in ${latestOutputYear}` : 'Annual Documents'}
                              </span>
                            </div>
                          </div>

                          {/* 3. Trend Graphs */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* CiteScore Historical Trend */}
                            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <TrendingUp className="w-3.5 h-3.5 text-[#2855B9]" />
                                  CiteScore Historical Trend
                                </h4>
                                <span className="text-[10px] text-slate-500">15+ Year Horizon</span>
                              </div>
                              <div className="h-52 w-full pt-2">
                                {csChartData.length > 0 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={csChartData} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748B' }} />
                                      <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                                      <Tooltip
                                        contentStyle={{
                                          backgroundColor: '#FFFFFF',
                                          borderRadius: '8px',
                                          border: '1px solid #E2E8F0',
                                          fontSize: '11px'
                                        }}
                                        formatter={(val: any, _name: any, item: any) => [
                                          `CiteScore: ${val}`,
                                          item.payload.status === 'In-Progress' ? 'In-Progress Tracker' : 'Complete Score'
                                        ]}
                                      />
                                      <Line type="monotone" dataKey="citeScore" stroke="#2855B9" strokeWidth={2.5} dot={{ r: 3, fill: '#2855B9' }} activeDot={{ r: 5 }} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                                    No historical CiteScores recorded.
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* CiteScore Percentile Trend */}
                            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <Award className="w-3.5 h-3.5 text-indigo-600" />
                                  Percentile Trend by Category
                                </h4>
                                {allCategoryNames.length > 1 && (
                                  <select
                                    value={selectedMetricCategory}
                                    onChange={(e) => setSelectedMetricCategory(e.target.value)}
                                    className="text-[11px] px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-700 max-w-[180px] truncate"
                                  >
                                    {allCategoryNames.map((catName, idx) => (
                                      <option key={idx} value={catName}>{catName}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                              <div className="h-52 w-full pt-2">
                                {percentileChartData.length > 0 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={percentileChartData} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748B' }} />
                                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748B' }} />
                                      <Tooltip
                                        contentStyle={{
                                          backgroundColor: '#FFFFFF',
                                          borderRadius: '8px',
                                          border: '1px solid #E2E8F0',
                                          fontSize: '11px'
                                        }}
                                        formatter={(val: any, _name: any, item: any) => [
                                          `${val}th Percentile (${item.payload.rank})`,
                                          activeCat || 'Subject Category'
                                        ]}
                                      />
                                      <Line type="monotone" dataKey="percentile" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366F1' }} activeDot={{ r: 5 }} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                                    Percentile history not available for this category.
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Scholarly Output Output BarChart */}
                            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                                  Annual Scholarly Output
                                </h4>
                                <span className="text-[10px] text-slate-500">Document Count</span>
                              </div>
                              <div className="h-52 w-full pt-2">
                                {outputChartData.length > 0 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={outputChartData} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748B' }} />
                                      <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                                      <Tooltip
                                        contentStyle={{
                                          backgroundColor: '#FFFFFF',
                                          borderRadius: '8px',
                                          border: '1px solid #E2E8F0',
                                          fontSize: '11px'
                                        }}
                                        formatter={(val: any) => [`${val.toLocaleString()} documents`, 'Scholarly Output']}
                                      />
                                      <Bar dataKey="documents" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                                    No scholarly output figures reported.
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* SJR & SNIP Comparative Trend */}
                            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                                  SJR & SNIP Journal Impact Trends
                                </h4>
                                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-0.5 bg-[#F59E0B] inline-block" />
                                    SJR
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="w-2.5 h-0.5 bg-[#8B5CF6] inline-block" />
                                    SNIP
                                  </span>
                                </div>
                              </div>
                              <div className="h-52 w-full pt-2">
                                {sjrSnipChartData.length > 0 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={sjrSnipChartData} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748B' }} />
                                      <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                                      <Tooltip
                                        contentStyle={{
                                          backgroundColor: '#FFFFFF',
                                          borderRadius: '8px',
                                          border: '1px solid #E2E8F0',
                                          fontSize: '11px'
                                        }}
                                      />
                                      <Line type="monotone" dataKey="sjr" name="SJR" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
                                      <Line type="monotone" dataKey="snip" name="SNIP" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                ) : (
                                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                                    SJR / SNIP historical data not recorded.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 4. Subject Category Rankings Table */}
                          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                            <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                              Scopus Subject Category Rankings & Percentiles
                            </h4>
                            <div className="border border-slate-150 rounded-lg overflow-hidden">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500">
                                  <tr>
                                    <th className="py-2.5 px-3">Subject Category</th>
                                    <th className="py-2.5 px-3 text-center">Category Code</th>
                                    <th className="py-2.5 px-3 text-center">Rank</th>
                                    <th className="py-2.5 px-3 text-center">Percentile</th>
                                    <th className="py-2.5 px-3 text-center">Quartile</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                                  {categories.length === 0 ? (
                                    <tr>
                                      <td colSpan={5} className="py-5 text-center text-slate-400 text-xs">
                                        No specific category rankings reported by Scopus for this source.
                                      </td>
                                    </tr>
                                  ) : (
                                    categories.map((cat: any, idx: number) => (
                                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-2 px-3 font-medium text-slate-800">
                                          {cat.category || 'General'}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono text-slate-500 text-[10px]">
                                          {cat.code || '—'}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono text-slate-700">
                                          {cat.rank ? `#${cat.rank}${cat.rankTotal ? ' / ' + cat.rankTotal : ''}` : '—'}
                                        </td>
                                        <td className="py-2 px-3 text-center font-mono font-semibold text-slate-900">
                                          {cat.percentile !== null && cat.percentile !== undefined ? `${cat.percentile}%` : '—'}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            cat.quartile === 'Q1' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                                            cat.quartile === 'Q2' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                            cat.quartile === 'Q3' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                            cat.quartile === 'Q4' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                            'bg-slate-100 text-slate-500'
                                          }`}>
                                            {cat.quartile || '—'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* 5. Dossier Export Section */}
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-900 text-xs block">Export Institutional Dossier</span>
                              <p className="text-[11px] text-slate-500">
                                Download complete multi-worksheet Excel workbook containing Publication Overview, Citations, CiteScores, Category Ranks, and Trends.
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleExportExcelDossier(viewingPub.id)}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs font-semibold"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                              <span>Export Dossier (Excel)</span>
                            </Button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Region 3: Fixed Footer */}
              <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/70 shrink-0 flex items-center justify-between sm:justify-between m-0">
                <div className="flex items-center gap-2">
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
                    variant="outline"
                    onClick={() => handleExportExcelDossier(viewingPub.id)}
                    className="border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs px-3 rounded-xl flex items-center gap-1.5 font-medium"
                    title="Export publication overview, citations, and journal metrics across 6 worksheets"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export Dossier</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.print()}
                    className="border-slate-200 text-slate-600 hover:bg-slate-100 text-xs px-3 rounded-xl flex items-center gap-1.5"
                    title="Print dossier report"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Print Dossier</span>
                  </Button>
                </div>
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

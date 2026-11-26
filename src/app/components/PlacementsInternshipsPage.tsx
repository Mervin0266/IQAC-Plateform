import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTableVirtualization } from '../hooks/useTableVirtualization';
import * as XLSX from 'xlsx';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  UserCheck, Briefcase, TrendingUp, Building2, Award, DollarSign,
  Users, BarChart3, Upload, Filter, RotateCcw, Search, Download,
  Plus, Edit, Trash2, Eye, X, CheckCircle, Clock, AlertCircle,
  LayoutGrid, Table as TableIcon, Calendar, GraduationCap, MapPin,
  ExternalLink, Sparkles, ChevronRight, FileSpreadsheet, RefreshCw, AlertTriangle,
  Paperclip, FileText
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../contexts/AuthContext';
import { BulkUploadDialog } from './BulkUploadDialog';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';
import { normalizeDepartmentName, normalizeAcademicYear } from './FacultyDetailsPage';
import { AppShell, PageHeader, StatCard } from './design-system';
import { DynamicFormFieldsRenderer } from './DynamicFormFieldsRenderer';
import { useSystemConfig } from '../contexts/SystemConfigContext';

interface PlacementsInternshipsPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
  hideSidebar?: boolean;
  token?: string;
  userRole?: string;
  mode?: 'placement' | 'internship' | 'all';
}

export interface PlacementItem {
  id: string;
  studentName: string;
  studentId: string;
  department: string;
  course?: string;
  batch: string;
  academicYear?: string;
  company: string;
  role?: string;
  package: number | string | null;
  monthlyStipend?: number | string | null;
  placementType: 'placement' | 'internship';
  placementDate?: string | null;
  location?: string | null;
  campus?: string | null;
  school?: string | null;
  offerLetterUrl?: string | null;
  offerLetterFileName?: string | null;
  offerLetterDriveId?: string | null;
  customFields?: Record<string, any>;
  createdAt?: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ACADEMIC_YEARS = [
  '2026-2027',
  '2025-2026',
  '2024-2025',
  '2023-2024',
  '2022-2023',
  '2021-2022',
  '2020-2021'
];

const EMPTY_FORM = {
  studentName: '',
  studentId: '',
  department: '',
  course: '',
  batch: '2024-2025',
  company: '',
  role: '',
  package: '',
  placementType: 'placement' as 'placement' | 'internship',
  placementDate: new Date().toISOString().split('T')[0],
  location: ''
};

interface KpiCardWithPopoverProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: any;
  popoverTitle: string;
  children: React.ReactNode;
}

function KpiCardWithPopover({
  title,
  value,
  subtitle,
  icon: Icon,
  popoverTitle,
  children
}: KpiCardWithPopoverProps) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => {
      setOpen(false);
    }, 180);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          tabIndex={0}
          role="button"
          aria-label={`${title}: ${value}. Click or hover to inspect details.`}
          className="outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A] rounded-xl transition-all cursor-pointer group select-none text-left"
        >
          <StatCard
            title={title}
            value={value}
            subtitle={subtitle}
            icon={Icon}
            className="group-hover:border-slate-300 group-hover:shadow-sm"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-80 sm:w-96 p-4 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl rounded-xl z-50 text-xs space-y-3"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            {Icon && <Icon className="w-4 h-4 text-[#1E3A8A]" />}
            <span>{popoverTitle}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">KPI Breakdown</span>
        </div>
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function PlacementsInternshipsPage({
  onNavigate,
  isPublicView = false,
  hideSidebar = false,
  token: propToken,
  userRole: propUserRole,
  mode = 'all'
}: PlacementsInternshipsPageProps) {
  const { user, logout } = useAuth();
  const { academicYears: runtimeAcademicYears } = useSystemConfig();
  const configuredAcademicYears = useMemo(() => {
    return Array.isArray(runtimeAcademicYears) && runtimeAcademicYears.length > 0
      ? Array.from(new Set([...runtimeAcademicYears, ...ACADEMIC_YEARS]))
      : ACADEMIC_YEARS;
  }, [runtimeAcademicYears]);
  const effectiveToken = propToken || user?.token || '';
  const effectiveRole = propUserRole || user?.role || 'faculty';
  const isAdminOrCoordinator = effectiveRole === 'admin' || effectiveRole === 'coordinator' || effectiveRole === 'hod';

  const [placements, setPlacements] = useState<PlacementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtering & View Mode State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'placement' | 'internship'>(
    mode === 'placement' ? 'placement' : mode === 'internship' ? 'internship' : 'all'
  );
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'analytics'>('table');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 12;

  // Modals & Drawers
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PlacementItem | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [lookingUpStudent, setLookingUpStudent] = useState(false);
  const [studentLookupStatus, setStudentLookupStatus] = useState<{
    verified: boolean;
    message?: string;
  } | null>(null);

  const [viewingItem, setViewingItem] = useState<PlacementItem | null>(null);
  const [offerLetterLoading, setOfferLetterLoading] = useState(false);
  const detailOfferLetterInputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const handleClearAll = async () => {
    try {
      setClearLoading(true);
      const res = await fetch(`${API_BASE}/api/placements/clear-all?confirmAll=true&confirmation=CONFIRM_UNIVERSITY_CLEAR`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${effectiveToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setPlacements([]);
        setIsClearOpen(false);
      } else {
        alert(data.message || 'Failed to clear placement records');
      }
    } catch (err) {
      console.error('Error clearing placements:', err);
      alert('Network error while clearing placements');
    } finally {
      setClearLoading(false);
    }
  };

  const handleViewOfferLetter = async (item: PlacementItem) => {
    if (!item) return;
    if (item.offerLetterUrl && (item.offerLetterUrl.startsWith('http') || item.offerLetterUrl.startsWith('data:'))) {
      window.open(item.offerLetterUrl, '_blank');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/placements/${item.id}/offer-letter/file`, {
        headers: { Authorization: `Bearer ${effectiveToken}` }
      });
      if (!res.ok) {
        alert('Could not open offer letter file.');
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('Failed to view offer letter', err);
      alert('Failed to view offer letter file.');
    }
  };

  const handleDownloadOfferLetter = async (item: PlacementItem) => {
    if (!item) return;
    try {
      const res = await fetch(`${API_BASE}/api/placements/${item.id}/offer-letter/file`, {
        headers: { Authorization: `Bearer ${effectiveToken}` }
      });
      if (!res.ok) {
        alert('Could not download offer letter file.');
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = item.offerLetterFileName || `Offer_Letter_${item.studentId || item.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download offer letter', err);
      alert('Failed to download offer letter.');
    }
  };

  const handleUploadOfferLetterInDetail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !viewingItem) return;

    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some(ext => lowerName.endsWith(ext));
    if (!hasValidExt) {
      alert('Invalid file format. Please upload a PDF, JPG, or PNG document.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10MB limit.');
      return;
    }

    try {
      setOfferLetterLoading(true);
      const fd = new FormData();
      fd.append('offerLetter', file);

      const res = await fetch(`${API_BASE}/api/placements/${viewingItem.id}/offer-letter`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${effectiveToken}`
        },
        body: fd
      });
      const data = await res.json();
      if (data.success && data.placement) {
        const updated = data.placement;
        setViewingItem(prev => (prev ? { ...prev, ...updated } : null));
        setPlacements(prev => prev.map(p => (p.id === updated.id ? { ...p, ...updated } : p)));
      } else {
        alert(data.message || 'Failed to upload offer letter.');
      }
    } catch (err) {
      console.error('Error uploading offer letter:', err);
      alert('Failed to upload offer letter.');
    } finally {
      setOfferLetterLoading(false);
      if (detailOfferLetterInputRef.current) {
        detailOfferLetterInputRef.current.value = '';
      }
    }
  };

  const handleDeleteOfferLetterInDetail = async () => {
    if (!viewingItem) return;
    if (!window.confirm('Are you sure you want to remove the offer letter document for this candidate?')) return;

    try {
      setOfferLetterLoading(true);
      const res = await fetch(`${API_BASE}/api/placements/${viewingItem.id}/offer-letter`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${effectiveToken}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setViewingItem(prev => (prev ? { ...prev, offerLetterUrl: null, offerLetterFileName: null, offerLetterDriveId: null } : null));
        setPlacements(prev => prev.map(p => (p.id === viewingItem.id ? { ...p, offerLetterUrl: null, offerLetterFileName: null, offerLetterDriveId: null } : p)));
      } else {
        alert(data.message || 'Failed to remove offer letter.');
      }
    } catch (err) {
      console.error('Error deleting offer letter:', err);
      alert('Failed to remove offer letter.');
    } finally {
      setOfferLetterLoading(false);
    }
  };

  const { departmentList: dbDepts } = useAcademicHierarchy();

  // Fetch placements
  const fetchPlacements = useCallback(async () => {
    if (!effectiveToken) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/placements?all=true`, {
        headers: {
          'Authorization': `Bearer ${effectiveToken}`
        }
      });

      if (response.status === 401) {
        logout();
        return;
      }

      const data = await response.json();
      if (data.success) {
        setPlacements(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch placement records');
      }
    } catch (err: any) {
      console.error('Error fetching placements:', err);
      setError('Unable to connect to placement server');
    } finally {
      setLoading(false);
    }
  }, [effectiveToken, logout]);

  useEffect(() => {
    fetchPlacements();
  }, [fetchPlacements]);

  // Derived options for dropdowns
  const uniqueDepartments = useMemo(() => {
    const set = new Set<string>();
    dbDepts.forEach(d => {
      if (d) set.add(normalizeDepartmentName(d));
    });
    placements.forEach(p => {
      if (p.department) set.add(normalizeDepartmentName(p.department));
    });
    if (set.size === 0) {
      return [
        'Civil Engineering',
        'Computer Science and Engineering',
        'Electronics and Communication Engineering',
        'Electrical and Electronics Engineering',
        'Mechanical and Automobile Engineering',
        'Sciences and Humanities (Engineering)',
        'AI and Data Science Engineering',
        'School of Architecture'
      ];
    }
    return Array.from(set).filter(Boolean).sort();
  }, [dbDepts, placements]);

  const uniqueCourses = useMemo(() => {
    const set = new Set<string>();
    placements.forEach(p => {
      if (p.course && p.course.trim()) set.add(p.course.trim().replace(/\s+/g, ' '));
    });
    return Array.from(set).sort();
  }, [placements]);

  const uniqueBatches = useMemo(() => {
    const set = new Set<string>();
    ACADEMIC_YEARS.forEach(y => set.add(normalizeAcademicYear(y)));
    placements.forEach(p => {
      const norm = normalizeAcademicYear(p.batch);
      if (norm) set.add(norm);
    });
    return Array.from(set).filter(Boolean).sort().reverse();
  }, [placements]);

  // Format LPA
  const formatLPA = (val: number | string | null | undefined) => {
    if (val === null || val === undefined || val === '') return '₹ 0.0 LPA';
    const num = parseFloat(String(val));
    if (isNaN(num)) return '₹ 0.0 LPA';
    return `₹ ${num.toFixed(1).replace(/\.0$/, '')} LPA`;
  };

  // Format Stipend
  const formatStipend = (val: number | string | null | undefined) => {
    if (val === null || val === undefined || val === '') return 'Not Provided';
    const num = parseFloat(String(val));
    if (isNaN(num)) return 'Not Provided';
    if (num === 0) return 'Unpaid';
    return `₹${Math.round(num).toLocaleString('en-IN')}/month`;
  };

  // Filtered Placements & Internships
  const filteredRecords = useMemo(() => {
    return placements.filter(item => {
      // Type Filter (or locked mode)
      const effectiveType = mode === 'placement' ? 'placement' : mode === 'internship' ? 'internship' : selectedType;
      if (effectiveType !== 'all' && item.placementType !== effectiveType) {
        return false;
      }

      // Search Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = (item.studentName || '').toLowerCase().includes(query);
        const matchesId = (item.studentId || '').toLowerCase().includes(query);
        const matchesCompany = (item.company || '').toLowerCase().includes(query);
        const matchesRole = (item.role || '').toLowerCase().includes(query);
        const matchesDept = (item.department || '').toLowerCase().includes(query);
        const matchesCourse = (item.course || '').toLowerCase().includes(query);
        if (!matchesName && !matchesId && !matchesCompany && !matchesRole && !matchesDept && !matchesCourse) {
          return false;
        }
      }

      // Department Filter
      if (selectedDept !== 'all' && normalizeDepartmentName(item.department) !== normalizeDepartmentName(selectedDept)) {
        return false;
      }

      // Course Filter
      if (selectedCourse !== 'all' && (item.course || '').trim().replace(/\s+/g, ' ') !== selectedCourse) {
        return false;
      }

      // Batch Filter
      if (selectedBatch !== 'all' && normalizeAcademicYear(item.batch) !== normalizeAcademicYear(selectedBatch)) {
        return false;
      }

      return true;
    });
  }, [placements, selectedType, searchQuery, selectedDept, selectedCourse, selectedBatch]);

  // Sorted Records
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      switch (sortBy) {
        case 'package-desc':
          return (parseFloat(String(b.package || 0)) || 0) - (parseFloat(String(a.package || 0)) || 0);
        case 'package-asc':
          return (parseFloat(String(a.package || 0)) || 0) - (parseFloat(String(b.package || 0)) || 0);
        case 'name-asc':
          return (a.studentName || '').localeCompare(b.studentName || '');
        case 'name-desc':
          return (b.studentName || '').localeCompare(a.studentName || '');
        case 'company-asc':
          return (a.company || '').localeCompare(b.company || '');
        case 'company-desc':
          return (b.company || '').localeCompare(a.company || '');
        case 'date-asc':
          return new Date(a.placementDate || a.createdAt || 0).getTime() - new Date(b.placementDate || b.createdAt || 0).getTime();
        case 'date-desc':
        default:
          return new Date(b.placementDate || b.createdAt || 0).getTime() - new Date(a.placementDate || a.createdAt || 0).getTime();
      }
    });
  }, [filteredRecords, sortBy]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / recordsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return sortedRecords.slice(start, start + recordsPerPage);
  }, [sortedRecords, currentPage, recordsPerPage]);

  const placementTableContainerRef = useRef<HTMLDivElement>(null);
  const {
    isVirtual: isPlacementTableVirtual,
    paddingTop: placementTablePaddingTop,
    paddingBottom: placementTablePaddingBottom,
    renderedItems: renderedPlacementItems,
  } = useTableVirtualization<PlacementItem>({
    rows: paginatedRecords,
    parentRef: placementTableContainerRef,
    estimateRowHeight: 56,
    threshold: 20,
    mode: 'auto',
    getItemKey: (idx) => paginatedRecords[idx]?.id || idx,
  });

  // Dynamic KPI Stats calculated from filtered records using standardized per-student values
  const kpiStats = useMemo(() => {
    const placementList = filteredRecords.filter(p => p.placementType === 'placement');
    const internshipList = filteredRecords.filter(p => p.placementType === 'internship');

    // Group placements by unique student (highest valid package per studentId)
    const studentPlacementMap = new Map<string, {
      studentId: string;
      studentName: string;
      department: string;
      course?: string;
      school?: string;
      batch: string;
      offers: PlacementItem[];
      highestOffer: PlacementItem;
      maxPackage: number;
    }>();

    placementList.forEach(p => {
      const regNo = (p.studentId || '').trim() || p.id;
      const rawPkg = typeof p.package === 'number' ? p.package : parseFloat(String(p.package || 0));
      const pkg = (!isNaN(rawPkg) && rawPkg > 0) ? rawPkg : 0;

      const existing = studentPlacementMap.get(regNo);
      if (!existing) {
        studentPlacementMap.set(regNo, {
          studentId: p.studentId || regNo,
          studentName: p.studentName || 'Student',
          department: normalizeDepartmentName(p.department || 'Other'),
          course: p.course || '',
          school: p.school || '',
          batch: p.batch || '',
          offers: [p],
          highestOffer: p,
          maxPackage: pkg
        });
      } else {
        existing.offers.push(p);
        if (pkg > existing.maxPackage) {
          existing.maxPackage = pkg;
          existing.highestOffer = p;
        }
      }
    });

    const uniquePlacedStudents = Array.from(studentPlacementMap.values());
    const totalPlacedCount = uniquePlacedStudents.length;
    const totalOffersCount = placementList.length;
    const multiOfferCount = uniquePlacedStudents.filter(s => s.offers.length > 1).length;

    // Valid positive packages derived strictly per unique student
    const validStudentPackages = uniquePlacedStudents
      .map(s => s.maxPackage)
      .filter(p => p > 0);

    const validStudentsCount = validStudentPackages.length;

    // 1. Mean CTC (LPA) across unique students
    const avgPkg = validStudentsCount > 0
      ? validStudentPackages.reduce((sum, val) => sum + val, 0) / validStudentsCount
      : 0;

    // 2. Highest CTC (LPA) across unique students
    const maxPkg = validStudentsCount > 0 ? Math.max(...validStudentPackages) : 0;

    // Tied students for highest package
    const tiedStudents = maxPkg > 0
      ? uniquePlacedStudents.filter(s => Math.abs(s.maxPackage - maxPkg) < 0.001)
      : [];

    const topCompaniesForMax = Array.from(new Set(tiedStudents.map(s => s.highestOffer.company).filter(Boolean)));

    // Top 3 unique highest packages
    const topPackagesDesc = Array.from(new Set(validStudentPackages))
      .sort((a, b) => b - a)
      .slice(0, 3);

    // 3. Median Package across unique students (sorted ascending)
    const sortedPackages = [...validStudentPackages].sort((a, b) => a - b);
    let medianPkg = 0;
    let q1Pkg = 0;
    let q3Pkg = 0;
    let iqrPkg = 0;

    if (validStudentsCount > 0) {
      const mid = Math.floor(validStudentsCount / 2);
      if (validStudentsCount % 2 === 1) {
        medianPkg = sortedPackages[mid];
      } else {
        medianPkg = (sortedPackages[mid - 1] + sortedPackages[mid]) / 2;
      }

      if (validStudentsCount >= 4) {
        const q1Idx = Math.floor(validStudentsCount * 0.25);
        const q3Idx = Math.floor(validStudentsCount * 0.75);
        q1Pkg = sortedPackages[q1Idx];
        q3Pkg = sortedPackages[q3Idx];
        iqrPkg = q3Pkg - q1Pkg;
      }
    }

    // Package Distribution ranges (<5, 5-10, 10-15, 15+)
    const distBelow5 = validStudentPackages.filter(p => p < 5).length;
    const dist5to10 = validStudentPackages.filter(p => p >= 5 && p < 10).length;
    const dist10to15 = validStudentPackages.filter(p => p >= 10 && p < 15).length;
    const dist15Plus = validStudentPackages.filter(p => p >= 15).length;

    // Department-wise placed students & averages
    const deptStudentMap: Record<string, { count: number; packages: number[] }> = {};
    uniquePlacedStudents.forEach(s => {
      const d = s.department || 'Other';
      if (!deptStudentMap[d]) deptStudentMap[d] = { count: 0, packages: [] };
      deptStudentMap[d].count++;
      if (s.maxPackage > 0) deptStudentMap[d].packages.push(s.maxPackage);
    });

    const topDeptsByCount = Object.entries(deptStudentMap)
      .map(([name, data]) => ({ name, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topDeptsByAvg = Object.entries(deptStudentMap)
      .filter(([_, data]) => data.packages.length > 0)
      .map(([name, data]) => ({
        name,
        avg: data.packages.reduce((a, b) => a + b, 0) / data.packages.length,
        count: data.packages.length
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);

    // Department whose median is closest to overall median
    let closestDeptToMedian = '';
    let minDiffToMedian = Infinity;
    Object.entries(deptStudentMap).forEach(([name, data]) => {
      if (data.packages.length > 0) {
        const sorted = [...data.packages].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const deptMed = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        const diff = Math.abs(deptMed - medianPkg);
        if (diff < minDiffToMedian) {
          minDiffToMedian = diff;
          closestDeptToMedian = `${name} (${deptMed.toFixed(2)} LPA)`;
        }
      }
    });

    // Recruiters analytics
    const companyStatsMap: Record<string, { placedCount: number; offersCount: number; maxPkg: number; totalPkg: number; pkgCount: number }> = {};
    filteredRecords.forEach(r => {
      const comp = (r.company || '').trim();
      if (!comp) return;
      if (!companyStatsMap[comp]) {
        companyStatsMap[comp] = { placedCount: 0, offersCount: 0, maxPkg: 0, totalPkg: 0, pkgCount: 0 };
      }
      companyStatsMap[comp].offersCount++;
      const pNum = typeof r.package === 'number' ? r.package : parseFloat(String(r.package || 0));
      if (!isNaN(pNum) && pNum > 0) {
        if (pNum > companyStatsMap[comp].maxPkg) companyStatsMap[comp].maxPkg = pNum;
        companyStatsMap[comp].totalPkg += pNum;
        companyStatsMap[comp].pkgCount++;
      }
    });

    uniquePlacedStudents.forEach(s => {
      const compSet = new Set(s.offers.map(o => (o.company || '').trim()).filter(Boolean));
      compSet.forEach(comp => {
        if (companyStatsMap[comp]) companyStatsMap[comp].placedCount++;
      });
    });

    const totalCompanies = Object.keys(companyStatsMap).length;
    const topRecruiters = Object.entries(companyStatsMap)
      .map(([name, stat]) => ({
        name,
        placedCount: stat.placedCount || stat.offersCount,
        avgPkg: stat.pkgCount > 0 ? stat.totalPkg / stat.pkgCount : 0,
        maxPkg: stat.maxPkg
      }))
      .sort((a, b) => b.placedCount - a.placedCount)
      .slice(0, 5);

    const marqueeCompanies = Object.values(companyStatsMap).filter(c => c.maxPkg >= 15).length;
    const dreamCompanies = Object.values(companyStatsMap).filter(c => c.maxPkg >= 8 && c.maxPkg < 15).length;
    const regularCompanies = Object.values(companyStatsMap).filter(c => c.maxPkg < 8).length;
    const multiOfferCompanies = Object.values(companyStatsMap).filter(c => c.offersCount > 1).length;

    // Internships statistics (isolated from placements LPA)
    const validStipends = internshipList
      .map(p => parseFloat(String((p.monthlyStipend !== undefined && p.monthlyStipend !== null) ? p.monthlyStipend : (p.package || 0))))
      .filter(s => s > 0);
    const avgStipend = validStipends.length > 0
      ? validStipends.reduce((sum, val) => sum + val, 0) / validStipends.length
      : 0;
    const maxStipend = validStipends.length > 0 ? Math.max(...validStipends) : 0;
    const uniqueInternStudents = new Set(internshipList.map(p => (p.studentId || '').trim() || p.id)).size;
    const paidInternsCount = validStipends.length;
    const unpaidInternsCount = internshipList.length - paidInternsCount;
    const internCompanies = Array.from(new Set(internshipList.map(p => p.company).filter(Boolean)));

    return {
      totalPlacements: totalPlacedCount,
      totalOffers: totalOffersCount,
      multiOfferCount,
      uniquePlacedStudents,
      avgPackageLPA: avgPkg,
      maxPackageLPA: maxPkg,
      tiedStudents,
      topCompaniesForMax,
      topPackagesDesc,
      medianPackageLPA: medianPkg,
      q1Pkg,
      q3Pkg,
      iqrPkg,
      closestDeptToMedian,
      distBelow5,
      dist5to10,
      dist10to15,
      dist15Plus,
      validStudentsCount,
      topDeptsByCount,
      topDeptsByAvg,
      totalCompanies,
      topRecruiters,
      marqueeCompanies,
      dreamCompanies,
      regularCompanies,
      multiOfferCompanies,
      // Internship stats
      totalInternships: internshipList.length,
      avgStipend,
      maxStipend,
      uniqueInternStudents,
      paidInternsCount,
      unpaidInternsCount,
      internCompaniesCount: internCompanies.length,
      totalRecords: filteredRecords.length
    };
  }, [filteredRecords]);

  // Department Analytics breakdown
  const departmentAnalytics = useMemo(() => {
    const map: Record<string, { placements: PlacementItem[]; internships: PlacementItem[] }> = {};

    filteredRecords.forEach(r => {
      const dept = normalizeDepartmentName(r.department || 'Other');
      if (!map[dept]) {
        map[dept] = { placements: [], internships: [] };
      }
      if (r.placementType === 'internship') {
        map[dept].internships.push(r);
      } else {
        map[dept].placements.push(r);
      }
    });

    return Object.keys(map).map(dept => {
      const { placements: pList, internships: iList } = map[dept];
      const validPackages = pList.map(p => parseFloat(String(p.package || 0))).filter(p => p > 0);
      const avg = validPackages.length > 0 ? validPackages.reduce((a, b) => a + b, 0) / validPackages.length : 0;
      const max = validPackages.length > 0 ? Math.max(...validPackages) : 0;
      const min = validPackages.length > 0 ? Math.min(...validPackages) : 0;

      const topCompanies = Array.from(new Set([...pList, ...iList].map(p => p.company))).filter(Boolean).slice(0, 5);

      return {
        department: dept,
        placedCount: pList.length,
        internCount: iList.length,
        avgPackage: formatLPA(avg),
        maxPackage: formatLPA(max),
        minPackage: formatLPA(min),
        topCompanies
      };
    });
  }, [filteredRecords]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedType(mode === 'placement' ? 'placement' : mode === 'internship' ? 'internship' : 'all');
    setSelectedDept('all');
    setSelectedCourse('all');
    setSelectedBatch('all');
    setSortBy('date-desc');
    setCurrentPage(1);
  };

  const handleStudentLookup = async (regNo: string, targetAY: string) => {
    const cleanReg = (regNo || '').trim();
    if (!cleanReg || cleanReg.length < 3) {
      setStudentLookupStatus(null);
      return;
    }
    setLookingUpStudent(true);
    setStudentLookupStatus(null);
    try {
      const res = await fetch(`${API_BASE}/api/students/lookup/${encodeURIComponent(cleanReg)}?academicYear=${encodeURIComponent(targetAY)}`, {
        headers: { Authorization: `Bearer ${effectiveToken}` }
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        const student = data.data;
        const targetEnrollment = data.targetEnrollment;
        const resolvedDept = (targetEnrollment && targetEnrollment.department) || student.department || '';
        const resolvedCourse = (targetEnrollment && targetEnrollment.course) || student.course || '';
        setFormData(prev => ({
          ...prev,
          studentName: student.name || prev.studentName,
          department: resolvedDept || prev.department,
          course: resolvedCourse || prev.course
        }));
        setStudentLookupStatus({
          verified: true,
          message: `Verified in ${targetAY}: ${student.name} (${resolvedDept})`
        });
        setFormError('');
      } else {
        const errMsg = data.message || `No enrollment found for "${cleanReg}" in ${targetAY}.`;
        setStudentLookupStatus({
          verified: false,
          message: errMsg
        });
        if (mode === 'internship') {
          setFormError(errMsg);
        }
      }
    } catch (err: any) {
      setStudentLookupStatus({
        verified: false,
        message: 'Could not connect to student registry.'
      });
    } finally {
      setLookingUpStudent(false);
    }
  };

  // Open Form for Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    const initialType = mode === 'internship' ? 'internship' : 'placement';
    setFormData({
      ...EMPTY_FORM,
      placementType: initialType,
      department: uniqueDepartments[0] || 'AI and Data Science Engineering'
    });
    setCustomFieldValues({});
    setFormError('');
    setStudentLookupStatus(null);
    setShowFormModal(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (item: PlacementItem) => {
    setEditingItem(item);
    const initialPkg = (item.monthlyStipend !== undefined && item.monthlyStipend !== null)
      ? String(item.monthlyStipend)
      : (item.package !== undefined && item.package !== null ? String(item.package) : '');
    setFormData({
      studentName: item.studentName || '',
      studentId: item.studentId || '',
      department: item.department || '',
      course: item.course || '',
      batch: item.batch || '2024-2025',
      company: item.company || '',
      role: item.role || '',
      package: initialPkg,
      placementType: item.placementType || 'placement',
      placementDate: item.placementDate || new Date().toISOString().split('T')[0],
      location: item.location || ''
    });
    setCustomFieldValues(item.customFields && typeof item.customFields === 'object' ? { ...item.customFields } : {});
    setFormError('');
    setStudentLookupStatus({
      verified: true,
      message: `Enrolled: ${item.studentName} (${item.department})`
    });
    setShowFormModal(true);
  };

  // Save Placement/Internship Form
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentName.trim() || !formData.studentId.trim() || !formData.company.trim()) {
      setFormError('Please fill in Student Name, Register Number, and Company.');
      return;
    }
    if (formData.placementType === 'placement' && (!formData.package || String(formData.package).trim() === '')) {
      setFormError('Please enter the Annual Salary Package (LPA).');
      return;
    }
    if (formData.placementType === 'internship' && studentLookupStatus && studentLookupStatus.verified === false) {
      setFormError(studentLookupStatus.message || 'Student must be enrolled in the selected academic year.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    const rawPkg = formData.package && String(formData.package).trim() !== '' ? parseFloat(formData.package) : null;
    const payload = {
      ...formData,
      package: rawPkg !== null && !isNaN(rawPkg) ? rawPkg : (formData.placementType === 'placement' ? 0 : null),
      monthlyStipend: formData.placementType === 'internship' ? (rawPkg !== null && !isNaN(rawPkg) ? rawPkg : null) : null,
      customFields: customFieldValues
    };

    try {
      const url = editingItem
        ? `${API_BASE}/api/placements/${editingItem.id}`
        : `${API_BASE}/api/placements`;
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${effectiveToken}`
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        logout();
        alert('Your authentication session has expired or is invalid. Please sign in again.');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setShowFormModal(false);
        fetchPlacements();
      } else {
        setFormError(data.message || 'Failed to save placement record');
      }
    } catch (err: any) {
      console.error('Save placement error:', err);
      setFormError('Server error while saving record');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Placement
  const handleDeletePlacement = async () => {
    if (!deletingId) return;
    try {
      const response = await fetch(`${API_BASE}/api/placements/${deletingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${effectiveToken}`
        }
      });
      if (response.status === 401) {
        logout();
        alert('Your authentication session has expired or is invalid. Please sign in again.');
        return;
      }
      const data = await response.json();
      if (data.success) {
        setDeletingId(null);
        fetchPlacements();
      } else {
        alert(data.message || 'Failed to delete placement record');
      }
    } catch (err) {
      console.error('Delete placement error:', err);
      alert('Server error while deleting');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert('No records to export with current filters');
      return;
    }

    const exportRows = filteredRecords.map((r, i) => ({
      'Sl. No': i + 1,
      'Student Name': r.studentName,
      'Register Number': r.studentId,
      'Type': r.placementType === 'placement' ? 'Campus Placement' : 'Corporate Internship',
      'Department': r.department,
      'Course': r.course || 'N/A',
      'Academic Year (AY)': r.batch,
      'Recruiting Company': r.company,
      'Job Designation / Role': r.role || 'N/A',
      'Package / Stipend': r.placementType === 'placement' ? `${r.package} LPA` : `₹ ${r.package}/mo`,
      'Location': r.location || 'N/A',
      'Placement Date': r.placementDate || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Placements & Internships');
    XLSX.writeFile(wb, `CHRIST_Placements_Internships_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      alert('No records to export with current filters');
      return;
    }

    const headers = ['Register No', 'Student Name', 'Type', 'Department', 'Course', 'AY', 'Company', 'Role', 'Package_LPA_or_Stipend', 'Location', 'Date'];
    const rows = filteredRecords.map(r => [
      `"${r.studentId || ''}"`,
      `"${(r.studentName || '').replace(/"/g, '""')}"`,
      `"${r.placementType || ''}"`,
      `"${(r.department || '').replace(/"/g, '""')}"`,
      `"${(r.course || '').replace(/"/g, '""')}"`,
      `"${r.batch || ''}"`,
      `"${(r.company || '').replace(/"/g, '""')}"`,
      `"${(r.role || '').replace(/"/g, '""')}"`,
      `"${r.package || ''}"`,
      `"${(r.location || '').replace(/"/g, '""')}"`,
      `"${r.placementDate || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CHRIST_Placements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pageContent = (
    <div className="space-y-6">

          {/* ========================================================================= */}
          {/* 1. MASTER HEADER & ACTION BAR                                             */}
          {/* ========================================================================= */}
          <PageHeader
            breadcrumbs={[
              { label: 'Performance' },
              { label: mode === 'placement' ? 'Placements' : mode === 'internship' ? 'Internships' : 'Placements & Internships' }
            ]}
            title={mode === 'placement' ? 'Campus Placements' : mode === 'internship' ? 'Internships & Industry Traineeships' : 'Placements & Internships'}
            badge={`${filteredRecords.length.toLocaleString()} Records`}
            description={
              mode === 'placement'
                ? 'Institutional corporate placements, recruitment drives, salary packages (LPA), and career outcomes.'
                : mode === 'internship'
                ? 'Student industry internships, practical training, corporate traineeships, and monthly stipend records.'
                : 'Comprehensive repository for student campus placements, corporate internships, compensation analytics, and recruiters data.'
            }
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchPlacements}
                  className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium h-9 px-3.5 rounded-lg shadow-xs"
                  title="Refresh Records"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium h-9 px-3.5 rounded-lg shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                  <span>CSV</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportExcel}
                  className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium h-9 px-3.5 rounded-lg shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  <span>Excel</span>
                </Button>

                {isAdminOrCoordinator && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsClearOpen(true)}
                    className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 text-xs font-medium h-9 px-3.5 rounded-lg shadow-xs"
                    title={`Clear All ${mode === 'internship' ? 'Internship' : 'Placement'} Data`}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    <span>Clear Data</span>
                  </Button>
                )}

                {isAdminOrCoordinator && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBulkDialog(true)}
                    className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium h-9 px-3.5 rounded-lg shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    <span>Bulk Upload</span>
                  </Button>
                )}

                {isAdminOrCoordinator && (
                  <Button
                    size="sm"
                    onClick={handleOpenCreate}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium h-9 px-3.5 rounded-lg shadow-xs"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    <span>{mode === 'internship' ? 'Add Internship' : 'Add Placement'}</span>
                  </Button>
                )}
              </div>
            }
          />

          {/* ========================================================================= */}
          {/* 2. KPI METRIC CARDS WITH INTERACTIVE HOVER / FOCUS POPOVERS                */}
          {/* ========================================================================= */}
          {mode === 'internship' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <KpiCardWithPopover
                title="Total Internships"
                value={kpiStats.totalInternships}
                subtitle={`${kpiStats.uniqueInternStudents || kpiStats.totalInternships} unique student interns`}
                icon={Briefcase}
                popoverTitle="Internship Records"
              >
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Total Offers</span>
                      <span className="text-base font-bold text-slate-900 font-mono">{kpiStats.totalInternships}</span>
                    </div>
                    <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Unique Interns</span>
                      <span className="text-base font-bold text-blue-700 font-mono">{kpiStats.uniqueInternStudents || kpiStats.totalInternships}</span>
                    </div>
                  </div>
                </div>
              </KpiCardWithPopover>

              <KpiCardWithPopover
                title="Paid Internships"
                value={kpiStats.paidInternsCount || 0}
                subtitle={kpiStats.totalInternships > 0 ? `${Math.round(((kpiStats.paidInternsCount || 0) / kpiStats.totalInternships) * 100)}% stipend-bearing` : '0%'}
                icon={Award}
                popoverTitle="Stipend-Bearing Internships"
              >
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-slate-600">Paid Trainees:</span>
                    <span className="font-mono font-bold text-emerald-700">{kpiStats.paidInternsCount || 0}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Unpaid / Academic:</span>
                    <span className="font-mono font-bold text-slate-600">{kpiStats.unpaidInternsCount || 0}</span>
                  </div>
                </div>
              </KpiCardWithPopover>

              <KpiCardWithPopover
                title="Avg Monthly Stipend"
                value={kpiStats.avgStipend > 0 ? `₹${(kpiStats.avgStipend / 1000).toFixed(1)}K/mo` : 'Unpaid'}
                subtitle="Mean stipend across paid interns"
                icon={DollarSign}
                popoverTitle="Average Monthly Stipend"
              >
                <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-100">
                  <span className="text-[10px] text-blue-700 font-semibold uppercase block">Mean Monthly Stipend</span>
                  <span className="text-base font-bold text-blue-900 font-mono">
                    ₹{Math.round(kpiStats.avgStipend).toLocaleString('en-IN')}/mo
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-1">Calculated across {kpiStats.paidInternsCount || 0} stipend-bearing records</span>
                </div>
              </KpiCardWithPopover>

              <KpiCardWithPopover
                title="Highest Stipend"
                value={kpiStats.maxStipend > 0 ? `₹${(kpiStats.maxStipend / 1000).toFixed(1)}K/mo` : 'N/A'}
                subtitle="Peak monthly stipend offer"
                icon={TrendingUp}
                popoverTitle="Highest Monthly Stipend"
              >
                <div className="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-semibold uppercase block">Max Monthly Stipend</span>
                  <span className="text-base font-bold text-emerald-900 font-mono">
                    ₹{Math.round(kpiStats.maxStipend || 0).toLocaleString('en-IN')}/mo
                  </span>
                </div>
              </KpiCardWithPopover>

              <KpiCardWithPopover
                title="Host Companies"
                value={kpiStats.internCompaniesCount || 0}
                subtitle="Active internship partners"
                icon={Building2}
                popoverTitle="Internship Partner Organizations"
              >
                <p className="text-slate-600 text-xs">
                  {kpiStats.internCompaniesCount || 0} industry organizations have engaged students for technical and professional internships.
                </p>
              </KpiCardWithPopover>
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Total Placed */}
            <KpiCardWithPopover
              title="Total Placed"
              value={kpiStats.totalPlacements}
              subtitle={kpiStats.totalOffers > 0 ? `${kpiStats.totalOffers} offers (${kpiStats.multiOfferCount} multi-offer)` : 'Campus recruitment offers'}
              icon={UserCheck}
              popoverTitle="Total Placed Students"
            >
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Placed</span>
                    <span className="text-base font-bold text-slate-900 font-mono">{kpiStats.totalPlacements}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">Offers</span>
                    <span className="text-base font-bold text-blue-700 font-mono">{kpiStats.totalOffers}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">2+ Offers</span>
                    <span className="text-base font-bold text-emerald-700 font-mono">{kpiStats.multiOfferCount}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1.5">Top Departments by Placed Students</span>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {kpiStats.topDeptsByCount.length > 0 ? (
                      kpiStats.topDeptsByCount.map(d => (
                        <div key={d.name} className="flex items-center justify-between py-0.5 text-[11px]">
                          <span className="text-slate-600 truncate max-w-[200px]" title={d.name}>{d.name}</span>
                          <span className="font-semibold text-slate-900 font-mono shrink-0">{d.count}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">No department data</span>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">
                  * Offers exceed placed count when students receive multiple placement selections.
                </p>
              </div>
            </KpiCardWithPopover>

            {/* Card 2: Avg Package */}
            <KpiCardWithPopover
              title="Avg Package"
              value={formatLPA(kpiStats.avgPackageLPA)}
              subtitle="Mean CTC (per student)"
              icon={DollarSign}
              popoverTitle="Average Compensation (CTC)"
            >
              <div className="space-y-3">
                <div className="p-2.5 bg-blue-50/60 rounded-lg border border-blue-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-blue-700 font-semibold uppercase block">Mean Package</span>
                    <span className="text-base font-bold text-blue-900 font-mono">{kpiStats.avgPackageLPA.toFixed(2)} LPA</span>
                  </div>
                  <span className="text-[11px] text-blue-600 font-medium font-mono">
                    {kpiStats.validStudentsCount} students
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1.5">Package Distribution</span>
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-slate-600">&lt; 5 LPA:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {kpiStats.distBelow5} ({kpiStats.validStudentsCount > 0 ? ((kpiStats.distBelow5 / kpiStats.validStudentsCount) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-slate-600">5 – 10 LPA:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {kpiStats.dist5to10} ({kpiStats.validStudentsCount > 0 ? ((kpiStats.dist5to10 / kpiStats.validStudentsCount) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-slate-600">10 – 15 LPA:</span>
                      <span className="font-mono font-medium text-slate-800">
                        {kpiStats.dist10to15} ({kpiStats.validStudentsCount > 0 ? ((kpiStats.dist10to15 / kpiStats.validStudentsCount) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-slate-600">15+ LPA:</span>
                      <span className="font-mono font-semibold text-emerald-700">
                        {kpiStats.dist15Plus} ({kpiStats.validStudentsCount > 0 ? ((kpiStats.dist15Plus / kpiStats.validStudentsCount) * 100).toFixed(1) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1">Top Departments by Average CTC</span>
                  <div className="space-y-0.5">
                    {kpiStats.topDeptsByAvg.slice(0, 3).map(d => (
                      <div key={d.name} className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-600 truncate max-w-[200px]" title={d.name}>{d.name}</span>
                        <span className="font-mono font-semibold text-slate-800">{d.avg.toFixed(2)} LPA</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">
                  * Calculated strictly using each student's highest placement offer.
                </p>
              </div>
            </KpiCardWithPopover>

            {/* Card 3: Highest Package */}
            <KpiCardWithPopover
              title="Highest Package"
              value={formatLPA(kpiStats.maxPackageLPA)}
              subtitle={kpiStats.topCompaniesForMax.length > 1 ? `${kpiStats.topCompaniesForMax.length} Companies (Tied)` : (kpiStats.topCompaniesForMax[0] || 'Marquee corporate offer')}
              icon={Award}
              popoverTitle="Highest Placement Offer"
            >
              <div className="space-y-3">
                <div className="p-2.5 bg-amber-50/70 rounded-lg border border-amber-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-800 font-semibold uppercase block">Peak Compensation</span>
                    <span className="text-lg font-bold text-amber-900 font-mono">{kpiStats.maxPackageLPA.toFixed(2)} LPA</span>
                  </div>
                  <span className="text-[10px] text-amber-700 font-semibold px-2 py-0.5 bg-white rounded border border-amber-200">
                    {kpiStats.tiedStudents.length} student{kpiStats.tiedStudents.length > 1 ? 's tied' : ''}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1.5">Top Placed Candidate(s)</span>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {kpiStats.tiedStudents.slice(0, 3).map((st, i) => (
                      <div key={st.studentId + i} className="p-2 bg-slate-50 rounded border border-slate-100 text-[11px]">
                        <div className="flex justify-between font-semibold text-slate-900">
                          <span className="truncate max-w-[170px]">{st.studentName}</span>
                          <span className="font-mono text-slate-500">{st.studentId}</span>
                        </div>
                        <div className="text-slate-600 truncate mt-0.5">
                          {st.highestOffer.company} {st.highestOffer.role ? `• ${st.highestOffer.role}` : ''}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {st.department} {st.course ? `(${st.course})` : ''}
                        </div>
                      </div>
                    ))}
                    {kpiStats.tiedStudents.length > 3 && (
                      <div className="text-[10px] text-slate-500 text-center font-medium">
                        ...and {kpiStats.tiedStudents.length - 3} more student(s) at {kpiStats.maxPackageLPA.toFixed(2)} LPA
                      </div>
                    )}
                  </div>
                </div>

                {kpiStats.topPackagesDesc.length > 1 && (
                  <div className="pt-1 border-t border-slate-100">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">Top Tier Packages</span>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      {kpiStats.topPackagesDesc.map((pkg, idx) => (
                        <span key={pkg} className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-800">
                          #{idx + 1}: {pkg.toFixed(1)} LPA
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </KpiCardWithPopover>

            {/* Card 4: Median Package (REPLACES INTERNSHIP CARD) */}
            <KpiCardWithPopover
              title="Median Package"
              value={formatLPA(kpiStats.medianPackageLPA)}
              subtitle="50th percentile CTC"
              icon={TrendingUp}
              popoverTitle="Median Compensation (50th %ile)"
            >
              <div className="space-y-3">
                <div className="p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-200/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-800 font-semibold uppercase block">Median CTC</span>
                    <span className="text-lg font-bold text-emerald-900 font-mono">{kpiStats.medianPackageLPA.toFixed(2)} LPA</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 font-medium">
                    Midpoint CTC
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[9px] text-slate-500 uppercase block font-semibold">Q1 (25th)</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">{kpiStats.q1Pkg.toFixed(2)} LPA</span>
                  </div>
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[9px] text-slate-500 uppercase block font-semibold">Q3 (75th)</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">{kpiStats.q3Pkg.toFixed(2)} LPA</span>
                  </div>
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[9px] text-slate-500 uppercase block font-semibold">IQR</span>
                    <span className="text-xs font-bold text-slate-800 font-mono">{kpiStats.iqrPkg.toFixed(2)} LPA</span>
                  </div>
                </div>

                <div className="p-2 bg-slate-50/80 rounded border border-slate-100 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Mean vs Median:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {kpiStats.avgPackageLPA.toFixed(2)} vs {kpiStats.medianPackageLPA.toFixed(2)} LPA
                    </span>
                  </div>
                  {kpiStats.closestDeptToMedian && (
                    <div className="flex justify-between text-[10px] pt-1 border-t border-slate-200/50">
                      <span className="text-slate-500">Closest Dept:</span>
                      <span className="font-semibold text-slate-700 truncate max-w-[160px]" title={kpiStats.closestDeptToMedian}>
                        {kpiStats.closestDeptToMedian}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-100">
                  * 50% of placed students received a package of at least this amount. Unaffected by extreme high/low salary outliers.
                </p>
              </div>
            </KpiCardWithPopover>

            {/* Card 5: Recruiters */}
            <KpiCardWithPopover
              title="Recruiters"
              value={kpiStats.totalCompanies}
              subtitle="Corporate hiring partners"
              icon={Building2}
              popoverTitle="Corporate Recruiters"
            >
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
                    <span className="text-slate-500 block">Marquee &ge;15</span>
                    <span className="font-bold font-mono text-emerald-700 text-xs">{kpiStats.marqueeCompanies}</span>
                  </div>
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
                    <span className="text-slate-500 block">Dream 8-15</span>
                    <span className="font-bold font-mono text-blue-700 text-xs">{kpiStats.dreamCompanies}</span>
                  </div>
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
                    <span className="text-slate-500 block">Regular &lt;8</span>
                    <span className="font-bold font-mono text-slate-700 text-xs">{kpiStats.regularCompanies}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-700 block mb-1.5">Top Hiring Partners</span>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {kpiStats.topRecruiters.map(r => (
                      <div key={r.name} className="flex justify-between items-center text-[11px] py-0.5">
                        <span className="text-slate-700 truncate max-w-[180px]" title={r.name}>{r.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0 font-mono">
                          <span className="font-semibold text-slate-900">{r.placedCount} placed</span>
                          {r.avgPkg > 0 && (
                            <span className="text-[10px] text-slate-400">({r.avgPkg.toFixed(1)} LPA)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-1 border-t border-slate-100 text-[10px] text-slate-500 flex justify-between">
                  <span>Multiple offers made:</span>
                  <span className="font-semibold text-slate-700 font-mono">{kpiStats.multiOfferCompanies} organizations</span>
                </div>
              </div>
            </KpiCardWithPopover>
          </div>
          )}

          {/* ========================================================================= */}
          {/* 3. SINGLE UNIFIED FILTER & VIEW TOOLBAR (CLEAN, NO DUPLICATES)            */}
          {/* ========================================================================= */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              {/* Real-time Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search student name, register no, company, role, course..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-4 h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white rounded-lg focus:ring-blue-500/20 focus:border-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* View Switcher & Reset Filters */}
              <div className="flex items-center gap-2 self-end lg:self-auto">
                {(searchQuery || selectedType !== 'all' || selectedDept !== 'all' || selectedCourse !== 'all' || selectedBatch !== 'all' || sortBy !== 'date-desc') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetFilters}
                    className="h-9 px-3 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </Button>
                )}

                {/* View Mode Pills */}
                <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/80">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                      viewMode === 'table'
                        ? 'bg-[#2855B9] text-white shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Table</span>
                  </button>

                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                      viewMode === 'cards'
                        ? 'bg-[#2855B9] text-white shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>

                  <button
                    onClick={() => setViewMode('analytics')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                      viewMode === 'analytics'
                        ? 'bg-[#2855B9] text-white shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Analytics</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 pt-1">
              {/* Type Select */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Record Type
                </label>
                <Select value={selectedType} onValueChange={(val: any) => { setSelectedType(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-xl">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All (Placements & Interns)</SelectItem>
                    <SelectItem value="placement">Campus Placements</SelectItem>
                    <SelectItem value="internship">Corporate Internships</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Department Select */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Department
                </label>
                <Select value={selectedDept} onValueChange={(val) => { setSelectedDept(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-xl">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {uniqueDepartments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Course Select */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Course
                </label>
                <Select value={selectedCourse} onValueChange={(val) => { setSelectedCourse(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-xl">
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {uniqueCourses.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Academic Year (AY) */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Academic Year (AY)
                </label>
                <Select value={selectedBatch} onValueChange={(val) => { setSelectedBatch(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-xl">
                    <SelectValue placeholder="All AY" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Academic Years</SelectItem>
                    {uniqueBatches.map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Sort Order
                </label>
                <Select value={sortBy} onValueChange={(val) => setSortBy(val)}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-xl">
                    <SelectValue placeholder="Sort Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="package-desc">Package: High to Low</SelectItem>
                    <SelectItem value="package-asc">Package: Low to High</SelectItem>
                    <SelectItem value="name-asc">Student Name: A-Z</SelectItem>
                    <SelectItem value="company-asc">Company: A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. VIEW CONTENT AREA (TABLE / CARDS / ANALYTICS)                          */}
          {/* ========================================================================= */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mb-3" />
              <p className="text-sm font-medium text-slate-600">Loading placement records...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl text-center">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
              <p className="font-semibold text-sm">{error}</p>
              <Button onClick={fetchPlacements} variant="outline" size="sm" className="mt-3 bg-white">
                Retry Fetching
              </Button>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No records match your criteria</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try clearing search terms or selecting 'All Departments' / 'All Academic Years'.
              </p>
              <Button size="sm" variant="outline" onClick={handleResetFilters} className="rounded-xl">
                Reset All Filters
              </Button>
            </div>
          ) : viewMode === 'table' ? (
            /* ======================================================================= */
            /* VIEW 1: TABLE VIEW                                                      */
            /* ======================================================================= */
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-xs overflow-hidden">
              <div
                ref={placementTableContainerRef}
                className={`overflow-x-auto ${isPlacementTableVirtual ? 'max-h-[620px] overflow-y-auto' : ''}`}
              >
                <table className="w-full text-left border-collapse text-xs sm:text-[13px] text-slate-700">
                  <thead className={isPlacementTableVirtual ? 'sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_#E2E8F0]' : ''}>
                    <tr className="bg-slate-50 border-b border-[#E2E8F0] text-xs font-semibold text-slate-700 tracking-normal">
                      <th className="py-3 px-4">Student Details</th>
                      {mode === 'placement' || mode === 'internship' ? (
                        <th className="py-3 px-3">Academic Year</th>
                      ) : (
                        <th className="py-3 px-3">Type</th>
                      )}
                      <th className="py-3 px-3">Department & Course</th>
                      {mode === 'all' && <th className="py-3 px-3">AY (Batch)</th>}
                      <th className="py-3 px-4">{mode === 'internship' ? 'Host Company & Role' : 'Recruiting Company & Role'}</th>
                      <th className="py-3 px-3">{mode === 'internship' ? 'Monthly Stipend' : 'Package (LPA)'}</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {isPlacementTableVirtual && placementTablePaddingTop > 0 && (
                      <tr style={{ height: `${placementTablePaddingTop}px` }} aria-hidden="true" className="border-0 p-0 pointer-events-none">
                        <td colSpan={mode === 'all' ? 8 : 7} style={{ padding: 0, border: 0, height: `${placementTablePaddingTop}px` }} />
                      </tr>
                    )}
                    {renderedPlacementItems.map(({ item }) => (
                      <tr key={item.id} className="hover:bg-[#F1F5F9] transition-colors group">
                        {/* Student Details */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 group-hover:text-[#2855B9] transition-colors flex items-center gap-1.5">
                            <span>{item.studentName}</span>
                            {(item.offerLetterUrl || item.offerLetterFileName) && (
                              <span title="Offer Letter Attached">
                                <Paperclip className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            Reg: {item.studentId}
                          </div>
                        </td>

                        {/* Column 2: Academic Year when in dedicated mode, or Type Badge when in all mode */}
                        {mode === 'placement' || mode === 'internship' ? (
                          <td className="py-3 px-3 font-mono font-medium text-slate-700">
                            {item.academicYear || item.batch}
                          </td>
                        ) : (
                          <td className="py-3 px-3">
                            {item.placementType === 'placement' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#E8F5ED] text-[#167447] border border-[#C6E7D2]">
                                <UserCheck className="w-3 h-3" />
                                <span>Placement</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#EAF1FD] text-[#2855B9] border border-[#C8DCFB]">
                                <Briefcase className="w-3 h-3" />
                                <span>Internship</span>
                              </span>
                            )}
                          </td>
                        )}

                        {/* Department & Course */}
                        <td className="py-3.5 px-3 max-w-[200px]">
                          <div className="font-medium text-slate-800 truncate" title={item.department}>
                            {item.department}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate" title={item.course || ''}>
                            {item.course || 'Degree Program'}
                          </div>
                        </td>

                        {/* Batch/AY if in all mode */}
                        {mode === 'all' && (
                          <td className="py-3.5 px-3 font-mono text-slate-600">
                            {item.batch}
                          </td>
                        )}

                        {/* Company & Role */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.company}</span>
                          </div>
                          {item.role && (
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {item.role}
                            </div>
                          )}
                        </td>

                        {/* Package / Stipend */}
                        <td className="py-3.5 px-3 font-mono font-bold text-slate-900">
                          {item.placementType === 'placement' ? (
                            <span className="text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-100">
                              {formatLPA(item.package)}
                            </span>
                          ) : (
                            <span className="text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-100">
                              {formatStipend(item.monthlyStipend !== undefined && item.monthlyStipend !== null ? item.monthlyStipend : item.package)}
                            </span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-3 text-slate-500 font-mono text-[11px]">
                          {item.placementDate || '-'}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingItem(item)}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                              title="View Candidate Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {isAdminOrCoordinator && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(item)}
                                className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Edit Record"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            )}

                            {isAdminOrCoordinator && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingId(item.id)}
                                className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                title="Delete Record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {isPlacementTableVirtual && placementTablePaddingBottom > 0 && (
                      <tr style={{ height: `${placementTablePaddingBottom}px` }} aria-hidden="true" className="border-0 p-0 pointer-events-none">
                        <td colSpan={mode === 'all' ? 8 : 7} style={{ padding: 0, border: 0, height: `${placementTablePaddingBottom}px` }} />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 gap-3">
                <div className="text-xs text-slate-500">
                  Showing <span className="font-semibold text-slate-800">{(currentPage - 1) * recordsPerPage + 1}</span> to{' '}
                  <span className="font-semibold text-slate-800">{Math.min(currentPage * recordsPerPage, sortedRecords.length)}</span> of{' '}
                  <span className="font-semibold text-slate-800">{sortedRecords.length}</span> records
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3 text-xs bg-white rounded-lg border-slate-200"
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-semibold text-slate-700 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 text-xs bg-white rounded-lg border-slate-200"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          ) : viewMode === 'cards' ? (
            /* ======================================================================= */
            /* VIEW 2: CARD GRID VIEW                                                  */
            /* ======================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedRecords.map((item) => (
                <Card
                  key={item.id}
                  className="border border-slate-200/80 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl overflow-hidden group flex flex-col justify-between"
                >
                  <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/30">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {item.placementType === 'placement' ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-[10px]">
                              Placement
                            </Badge>
                          ) : (
                            <Badge className="bg-purple-50 text-purple-700 border-purple-200 font-semibold text-[10px]">
                              Internship
                            </Badge>
                          )}
                          <span className="text-[11px] font-mono text-slate-500">{item.batch}</span>
                          {(item.offerLetterUrl || item.offerLetterFileName) && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" title="Offer Letter Attached">
                              <Paperclip className="w-2.5 h-2.5" /> Letter
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {item.studentName}
                        </CardTitle>
                        <CardDescription className="text-xs font-mono text-slate-500 mt-0.5">
                          Reg No: {item.studentId}
                        </CardDescription>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold font-mono text-emerald-700 block">
                          {item.placementType === 'placement' ? formatLPA(item.package) : formatStipend(item.package)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3 flex-1 text-xs">
                    <div className="flex items-center gap-2 text-slate-800 font-semibold">
                      <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{item.company}</span>
                    </div>

                    {item.role && (
                      <div className="text-[11px] text-slate-600 flex items-center gap-2">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{item.role}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                        {item.department}
                      </Badge>
                      {item.course && (
                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                          {item.course}
                        </Badge>
                      )}
                    </div>
                  </CardContent>

                  <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.placementDate || 'Date: N/A'}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingItem(item)}
                        className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900 rounded-lg"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View
                      </Button>
                      {isAdminOrCoordinator && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(item)}
                          className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                      )}
                      {isAdminOrCoordinator && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingId(item.id)}
                          className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            /* ======================================================================= */
            /* VIEW 3: DEPARTMENT ANALYTICS VIEW                                       */
            /* ======================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {departmentAnalytics.map((dept, index) => (
                <Card key={index} className="border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow bg-white rounded-2xl overflow-hidden">
                  <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-emerald-600" />
                        <span>{dept.department}</span>
                      </CardTitle>
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
                        {dept.placedCount} Placed
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div className="bg-blue-50/60 border border-blue-100/80 p-2.5 rounded-xl">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Avg Package</p>
                        <p className="text-sm font-bold text-blue-900 mt-0.5">{dept.avgPackage}</p>
                      </div>

                      <div className="bg-emerald-50/60 border border-emerald-100/80 p-2.5 rounded-xl">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Highest</p>
                        <p className="text-sm font-bold text-emerald-900 mt-0.5">{dept.maxPackage}</p>
                      </div>

                      <div className="bg-amber-50/60 border border-amber-100/80 p-2.5 rounded-xl">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Interns</p>
                        <p className="text-sm font-bold text-amber-900 mt-0.5">{dept.internCount}</p>
                      </div>
                    </div>

                    {dept.topCompanies.length > 0 && (
                      <div>
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Key Recruiting Partners:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {dept.topCompanies.map((c, i) => (
                            <Badge key={i} variant="secondary" className="text-xs bg-slate-100 text-slate-700 border-slate-200">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}


      {/* ========================================================================= */}
      {/* 5. ADD / EDIT RECORD MODAL DIALOG                                         */}
      {/* ========================================================================= */}
      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              <span>
                {editingItem
                  ? `Edit ${formData.placementType === 'internship' ? 'Internship' : 'Placement'} Record`
                  : `Add New ${formData.placementType === 'internship' ? 'Internship' : 'Placement'} Record`}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {formData.placementType === 'internship'
                ? 'Enter student industry internship and corporate training details with exact academic year verification.'
                : 'Enter official campus recruitment and placement details for institutional records.'}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSaveForm} className="space-y-4 pt-2">
            {/* Record Type Toggle - only show if mode === 'all' */}
            {mode === 'all' && (
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 block">
                  Type of Opportunity *
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, placementType: 'placement' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      formData.placementType === 'placement'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Campus Placement</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, placementType: 'internship' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      formData.placementType === 'internship'
                        ? 'bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-500'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Briefcase className="w-4 h-4" />
                    <span>Corporate Internship</span>
                  </button>
                </div>
              </div>
            )}

            {/* Academic Year Selection */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                Academic Year (AY) *
              </Label>
              <Select
                value={formData.batch}
                onValueChange={(val) => {
                  setFormData({ ...formData, batch: val });
                  if (formData.studentId.trim()) {
                    handleStudentLookup(formData.studentId, val);
                  }
                }}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Select Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  {configuredAcademicYears.map(yr => (
                    <SelectItem key={yr} value={yr}>{yr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Student ID / Register Number Lookup */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                Student Register Number *
              </Label>
              <div className="flex gap-2">
                <Input
                  value={formData.studentId}
                  onChange={(e) => {
                    setFormData({ ...formData, studentId: e.target.value });
                    setStudentLookupStatus(null);
                  }}
                  onBlur={() => {
                    if (formData.studentId.trim()) {
                      handleStudentLookup(formData.studentId, formData.batch);
                    }
                  }}
                  placeholder="e.g. 2160350"
                  className="h-9 text-xs rounded-xl font-mono flex-1"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleStudentLookup(formData.studentId, formData.batch)}
                  disabled={lookingUpStudent || !formData.studentId.trim()}
                  className="h-9 text-xs px-3 rounded-xl border-slate-200 shrink-0"
                >
                  {lookingUpStudent ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  ) : (
                    <span>Verify</span>
                  )}
                </Button>
              </div>
              {studentLookupStatus && (
                <div className={`mt-1.5 p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
                  studentLookupStatus.verified
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}>
                  {studentLookupStatus.verified ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  )}
                  <span>{studentLookupStatus.message}</span>
                </div>
              )}
            </div>

            {/* Student Full Name & Degree Program */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Student Full Name *
                </Label>
                <Input
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  placeholder="Student name"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Degree / Program Course
                </Label>
                <Input
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  placeholder="e.g. BTech in Computer Science"
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                Department *
              </Label>
              <Select
                value={formData.department}
                onValueChange={(val) => setFormData({ ...formData, department: val })}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueDepartments.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Company & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  {formData.placementType === 'internship' ? 'Host Company / Organization *' : 'Recruiting Company *'}
                </Label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g. Microsoft, Infosys, Cisco"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  {formData.placementType === 'internship' ? 'Trainee Role / Domain' : 'Job Designation / Role'}
                </Label>
                <Input
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder={formData.placementType === 'internship' ? 'e.g. ML Intern, Trainee' : 'e.g. Software Engineer'}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Package / Stipend & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  {formData.placementType === 'placement'
                    ? 'Annual Package (₹ in LPA) *'
                    : 'Monthly Stipend (Full INR, Optional)'}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.package}
                  onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                  placeholder={formData.placementType === 'placement' ? 'e.g. 8.5' : 'e.g. 15000 (leave blank for unpaid)'}
                  className="h-9 text-xs rounded-xl font-mono"
                  required={formData.placementType === 'placement'}
                />
                {formData.placementType === 'internship' && (
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Entered in full INR (e.g. 15000), displayed as ₹15.0K/mo. Leave blank if unpaid.
                  </span>
                )}
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  {formData.placementType === 'internship' ? 'Commencement Date' : 'Offer / Placement Date'}
                </Label>
                <Input
                  type="date"
                  value={formData.placementDate}
                  onChange={(e) => setFormData({ ...formData, placementDate: e.target.value })}
                  className="h-9 text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                Work Location / City
              </Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Bangalore, Hyderabad, Remote"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <DynamicFormFieldsRenderer
              formKey="placements-internships-form"
              mode={editingItem ? 'edit' : 'create'}
              coreValues={formData}
              customValues={customFieldValues}
              onChangeCustomValue={(fieldKey, value) =>
                setCustomFieldValues((prev) => ({ ...prev, [fieldKey]: value }))
              }
            />

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFormModal(false)}
                className="h-9 px-4 text-xs rounded-xl border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={formLoading}
                className="h-9 px-5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
              >
                {formLoading ? 'Saving...' : editingItem ? 'Update Record' : 'Create Record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 6. SLIDE-OVER DETAIL INSPECTION DRAWER                                    */}
      {/* ========================================================================= */}
      <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
        <DialogContent className="max-w-lg bg-white rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                {viewingItem?.placementType === 'placement' ? 'Campus Placement' : 'Corporate Internship'}
              </Badge>
              <span className="text-xs font-mono text-slate-500">{viewingItem?.batch}</span>
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {viewingItem?.studentName}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-mono">
              Register No: {viewingItem?.studentId}
            </DialogDescription>
          </DialogHeader>

          {viewingItem && (
            <div className="space-y-4 pt-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Recruiting Company</span>
                  <span className="font-semibold text-slate-900 text-sm">{viewingItem.company}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Role / Designation</span>
                  <span className="font-semibold text-slate-900">{viewingItem.role || 'Software Trainee'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Package / Compensation</span>
                  <span className="font-bold text-emerald-700 text-sm font-mono">
                    {viewingItem.placementType === 'placement'
                      ? formatLPA(viewingItem.package)
                      : formatStipend(viewingItem.monthlyStipend !== undefined && viewingItem.monthlyStipend !== null ? viewingItem.monthlyStipend : viewingItem.package)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Location</span>
                  <span className="font-medium text-slate-700">{viewingItem.location || 'Bangalore, India'}</span>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-semibold text-slate-800">{viewingItem.department}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Degree Program:</span>
                  <span className="font-semibold text-slate-800">{viewingItem.course || 'Undergraduate'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Campus:</span>
                  <span className="font-semibold text-slate-800">{viewingItem.campus || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">School:</span>
                  <span className="font-semibold text-slate-800">{viewingItem.school || '-'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Offer Date:</span>
                  <span className="font-mono text-slate-700">{viewingItem.placementDate || '-'}</span>
                </div>
              </div>

              {/* Offer Letter Document Section */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-600" />
                    Offer Letter Document
                  </span>
                  {viewingItem.offerLetterUrl || viewingItem.offerLetterFileName ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-medium">
                      Attached
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500 border-slate-300 text-[10px]">
                      Not Uploaded
                    </Badge>
                  )}
                </div>

                {viewingItem.offerLetterUrl || viewingItem.offerLetterFileName ? (
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2 min-w-0 mr-2">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-mono text-xs text-slate-800 truncate" title={viewingItem.offerLetterFileName || 'Offer_Letter.pdf'}>
                        {viewingItem.offerLetterFileName || 'Offer_Letter.pdf'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewOfferLetter(viewingItem)}
                        className="h-7 px-2 text-xs text-blue-700 hover:bg-blue-50"
                      >
                        <ExternalLink className="w-3.5 h-3.5 mr-1" />
                        View
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadOfferLetter(viewingItem)}
                        className="h-7 px-2 text-xs text-slate-700 hover:bg-slate-100"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Download
                      </Button>
                      {isAdminOrCoordinator && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={offerLetterLoading}
                            onClick={() => detailOfferLetterInputRef.current?.click()}
                            className="h-7 px-2 text-xs text-amber-700 hover:bg-amber-50"
                          >
                            Replace
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={offerLetterLoading}
                            onClick={handleDeleteOfferLetterInDetail}
                            className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-dashed border-slate-300">
                    <span className="text-slate-500 text-xs italic">No offer letter has been attached to this record yet.</span>
                    {isAdminOrCoordinator && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={offerLetterLoading}
                        onClick={() => detailOfferLetterInputRef.current?.click()}
                        className="h-7 px-2 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 shrink-0"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1" />
                        Upload File
                      </Button>
                    )}
                  </div>
                )}

                <input
                  type="file"
                  ref={detailOfferLetterInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  onChange={handleUploadOfferLetterInDetail}
                />
              </div>

              <DynamicFormFieldsRenderer
                formKey="placements-internships-form"
                mode="view"
                coreValues={viewingItem}
                customValues={viewingItem.customFields || {}}
              />

              <DialogFooter className="pt-3">
                <Button
                  onClick={() => setViewingItem(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
                >
                  Close Inspection
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 7. DELETE CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              <span>Confirm Deletion</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-2">
              Are you sure you want to permanently delete this placement record? This action will update departmental placement statistics in real time.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeletingId(null)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDeletePlacement}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
            >
              Delete Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 8. BULK UPLOAD MODAL DIALOG                                               */}
      {/* ========================================================================= */}
      <BulkUploadDialog
        isOpen={showBulkDialog}
        onClose={() => setShowBulkDialog(false)}
        token={effectiveToken}
        onSuccess={fetchPlacements}
        uploadType="placements"
        defaultPlacementType={mode === 'internship' ? 'internship' : 'placement'}
      />

      {/* Clear Placements Confirmation Dialog */}
      <Dialog open={isClearOpen} onOpenChange={setIsClearOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Clear All Placements & Internships Data
            </DialogTitle>
            <DialogDescription className="py-2 text-slate-600">
              Are you sure you want to permanently delete all placement and internship records? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsClearOpen(false)}
              disabled={clearLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAll}
              disabled={clearLoading}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            >
              {clearLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{clearLoading ? 'Clearing...' : 'Confirm Clear Data'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (hideSidebar) {
    return pageContent;
  }

  return (
    <AppShell currentPage="placements-internships" onNavigate={onNavigate}>
      {pageContent}
    </AppShell>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  User,
  UserCheck,
  MapPin,
  Search, 
  Plus, 
  Building2, 
  Eye, 
  Edit, 
  Trash2, 
  X, 
  Download,
  Mail,
  Phone,
  BookOpen,
  Award,
  CheckCircle,
  Briefcase,
  FileText,
  Upload,
  RefreshCw,
  GraduationCap,
  Table as TableIcon,
  LayoutGrid,
  BarChart3,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Layers,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BulkUploadDialog } from './BulkUploadDialog';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';
import { sanitizeSpreadsheetCell } from '../utils/spreadsheetSanitizer';
import {
  AppShell,
  PageHeader,
  StatCard,
  FilterToolbar,
  StatusBadge,
  ConfirmDialog,
  FormModal,
  FormField,
  FormInput,
  FormSelect,
  SectionCard,
} from './design-system';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface FacultyDetailsPageProps {
  onNavigate: (page: string) => void;
}

export function normalizeDepartmentName(dept?: string): string {
  if (!dept) return 'Unassigned';
  const clean = dept.trim().replace(/\s+/g, ' ');
  const upper = clean.toUpperCase();

  if (upper.includes('ARCHITECTURE') || upper.includes('SOA') || upper.includes('B.ARCH') || upper.includes('M.ARCH') || upper.includes('ARCH')) return 'School of Architecture';
  if (upper.includes('CIVIL')) return 'Civil Engineering';
  if (upper.includes('COMPUTER SCIENCE') || upper.includes('CSE')) return 'Computer Science and Engineering';
  if (upper.includes('AI AND DATA') || upper.includes('ARTIFICIAL INTELLIGENCE') || upper.includes('DATA SCIENCE') || upper.includes('ADSE')) return 'AI and Data Science Engineering';
  if (upper.includes('ELECTRICAL') || upper.includes('EEE')) return 'Electrical and Electronics Engineering';
  if (upper.includes('ELECTRONICS') || upper.includes('COMMUNICATION') || upper.includes('ECE')) return 'Electronics and Communication Engineering';
  if (upper.includes('MECHANICAL') || upper.includes('AUTOMOBILE') || upper.includes('MECH')) return 'Mechanical and Automobile Engineering';
  if (upper.includes('SCIENCE') && upper.includes('HUMANITIES')) return 'Sciences and Humanities (Engineering)';

  return clean
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function normalizeDesignationName(desig?: string): string {
  if (!desig) return 'Assistant Professor';
  const clean = desig.trim().replace(/\s+/g, ' ');
  const upper = clean.toUpperCase();

  if (upper.includes('HEAD OF DEPARTMENT') || upper.includes('HOD') || upper.includes('HEAD')) return 'Head of Department';
  if (upper.includes('ASSOCIATE PROFESSOR') || upper.includes('ASSOC')) return 'Associate Professor';
  if (upper.includes('ASSISTANT PROFESSOR') || upper.includes('ASST')) return 'Assistant Professor';
  if (upper.includes('PROFESSOR OF PRACTICE')) return 'Professor of Practice';
  if (upper.includes('ADJUNCT')) return 'Adjunct Faculty';
  if (upper.includes('GUEST')) return 'Guest Faculty';
  if (upper.includes('PROFESSOR') || upper.includes('PROF')) return 'Professor';
  if (upper.includes('DEAN')) return 'Dean';

  return clean
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function normalizeAcademicYear(year?: string): string {
  if (!year) return '';
  const clean = year.trim().replace(/\s+/g, '');
  // Match range e.g. 2024-2025 or 2024-25 or 2024/2025
  const matchRange = clean.match(/^(\d{4})[-/](\d{2,4})$/);
  if (matchRange) {
    const start = matchRange[1];
    let end = matchRange[2];
    if (end.length === 2) {
      end = start.slice(0, 2) + end;
    }
    return `${start}-${end}`;
  }
  // If single 4-digit year like 2027
  const matchSingle = clean.match(/^(\d{4})$/);
  if (matchSingle) {
    const y = parseInt(matchSingle[1], 10);
    return `${y - 1}-${y}`;
  }
  return clean;
}

export interface Qualifications {
  ug: string;
  pg: string;
  phd?: string;
  further?: string;
}

export interface Faculty {
  id: string;
  sNo?: number;
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  academicYear?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dateOfBirth?: string;
  panCardNo?: string;
  dateOfJoining?: string;
  prevTeachingExpYears?: string;
  prevTeachingExpMonths?: string;
  prevIndustryExpYears?: string;
  prevIndustryExpMonths?: string;
  qualificationLevel?: string;
  highestQualification?: string;
  cuExpYears?: string;
  cuExpMonths?: string;
  email?: string;
  phone?: string;
  qualifications?: Qualifications;
  specialization?: string;
  status?: 'Active' | 'On Sabbatical' | 'Relieved';
  publicationsCount?: number;
  patentsCount?: number;
}

function parseExpValue(val: any): number | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s || ['nil', 'n/a', '-', 'none', 'null', 'undefined', 'nan'].includes(s.toLowerCase())) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function formatExperienceDuration(months: number | null): string {
  if (months === null || months < 0 || isNaN(months)) return '—';
  const totalMonths = Math.round(months);
  const years = Math.floor(totalMonths / 12);
  const remMonths = totalMonths % 12;
  return `${years}Y, ${remMonths}M`;
}

function formatDateSafe(val?: string | null): string {
  if (!val) return '—';
  const str = String(val).trim();
  if (!str || ['nil', 'n/a', '-', 'none', 'null', 'undefined', 'invalid date'].includes(str.toLowerCase())) {
    return '—';
  }
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const year = m[1];
    const monthIdx = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${months[monthIdx]} ${year}`;
    }
  }
  const m2 = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m2) {
    const day = parseInt(m2[1], 10);
    const monthIdx = parseInt(m2[2], 10) - 1;
    const year = m2[3];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${months[monthIdx]} ${year}`;
    }
  }
  return str;
}

function computeFacultyExperience(f: Faculty) {
  // Check if cumulative month fields exist directly
  const rawCuMonths = parseExpValue((f as any)['Experience in CU - Months'] ?? (f as any).experienceInCuMonths);
  const rawTotalMonths = parseExpValue((f as any)['Total Current experience - Months'] ?? (f as any).totalExperienceMonths);
  const rawOtherMonths = parseExpValue((f as any)['Other Experience - Months'] ?? (f as any).otherExperienceMonths);

  let cuMonths: number | null = null;
  if (rawCuMonths !== null) {
    cuMonths = rawCuMonths;
  } else {
    const cuy = parseExpValue(f.cuExpYears);
    const cum = parseExpValue(f.cuExpMonths);
    if (cuy !== null || cum !== null) {
      cuMonths = (cuy ?? 0) * 12 + (cum ?? 0);
    }
  }

  let teachingMonths: number | null = null;
  const pty = parseExpValue(f.prevTeachingExpYears);
  const ptm = parseExpValue(f.prevTeachingExpMonths);
  if (pty !== null || ptm !== null) {
    teachingMonths = (pty ?? 0) * 12 + (ptm ?? 0);
  }

  let industryMonths: number | null = null;
  const piy = parseExpValue(f.prevIndustryExpYears);
  const pim = parseExpValue(f.prevIndustryExpMonths);
  if (piy !== null || pim !== null) {
    industryMonths = (piy ?? 0) * 12 + (pim ?? 0);
  }

  let otherMonths: number | null = null;
  if (rawOtherMonths !== null) {
    otherMonths = rawOtherMonths;
  } else if (teachingMonths !== null || industryMonths !== null) {
    otherMonths = (teachingMonths ?? 0) + (industryMonths ?? 0);
  }

  let totalMonths: number | null = null;
  if (rawTotalMonths !== null) {
    totalMonths = rawTotalMonths;
    if (otherMonths === null && cuMonths !== null && totalMonths >= cuMonths) {
      otherMonths = totalMonths - cuMonths;
    }
  } else if (cuMonths !== null || otherMonths !== null) {
    totalMonths = (cuMonths ?? 0) + (otherMonths ?? 0);
  }

  // Safety check: if total is less than CU, display neutral unavailable
  if (totalMonths !== null && cuMonths !== null && totalMonths < cuMonths) {
    totalMonths = null;
    otherMonths = null;
  }

  const hasSubBreakdown = (teachingMonths !== null && teachingMonths > 0) || (industryMonths !== null && industryMonths > 0);

  return {
    otherExpDisplay: formatExperienceDuration(otherMonths),
    totalExpDisplay: formatExperienceDuration(totalMonths),
    cuExpDisplay: formatExperienceDuration(cuMonths),
    teachingDisplay: formatExperienceDuration(teachingMonths),
    industryDisplay: formatExperienceDuration(industryMonths),
    hasSubBreakdown
  };
}

export function FacultyDetailsPage({ onNavigate }: FacultyDetailsPageProps) {
  const { user, logout } = useAuth();

  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'analytics'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  // Dynamic KPI Stats from backend
  const [stats, setStats] = useState({
    total: 0,
    phdCount: 0,
    phdPercent: '0',
    seniorCadre: 0,
    seniorPercent: '0',
    depts: 0,
    avgExp: '0'
  });

  const [departmentCounts, setDepartmentCounts] = useState<Record<string, number>>({});
  const [designationCounts, setDesignationCounts] = useState<Record<string, number>>({});
  const [dbAcademicYears, setDbAcademicYears] = useState<string[]>([]);

  // Filters & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [academicYearFilter, setAcademicYearFilter] = useState('All');
  const [designationFilter, setDesignationFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [sortBy, setSortBy] = useState<string>('name-asc');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingFaculty, setViewingFaculty] = useState<Faculty | null>(null);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  // Close drawer on Escape key and lock body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && viewingFaculty) {
        setViewingFaculty(null);
      }
    };
    if (viewingFaculty) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [viewingFaculty]);

  // Form State
  const [formData, setFormData] = useState<Omit<Faculty, 'id'>>({
    employeeId: '',
    name: '',
    designation: 'Assistant Professor',
    department: 'Computer Science and Engineering',
    academicYear: '2024-2025',
    gender: undefined,
    dateOfBirth: '',
    panCardNo: '',
    dateOfJoining: '',
    prevTeachingExpYears: '0',
    prevTeachingExpMonths: '0',
    prevIndustryExpYears: '0',
    prevIndustryExpMonths: '0',
    qualificationLevel: '',
    highestQualification: '',
    cuExpYears: '0',
    cuExpMonths: '0',
    status: 'Active'
  });

  const { departmentList: departmentsList } = useAcademicHierarchy();

  // Full designation list for Add & Edit faculty forms
  const designationsList = [
    'Head of Department',
    'Professor',
    'Associate Professor',
    'Assistant Professor',
    'Dean',
    'Professor of Practice',
    'Adjunct Faculty'
  ];

  // Simplified designation list for the filter toolbar dropdown only (Phases 6 & 7)
  const filterDesignationsList = [
    'Professor',
    'Associate Professor',
    'Assistant Professor',
    'Adjunct Faculty'
  ];

  // Debounce search input by 300ms
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchFaculty = async (page = 1) => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(pageSize));
      if (academicYearFilter !== 'All') {
        params.append('academicYear', academicYearFilter);
      }
      if (departmentFilter !== 'All') {
        params.append('department', departmentFilter);
      }
      if (designationFilter !== 'All') {
        params.append('designation', designationFilter);
      }
      if (genderFilter !== 'All') {
        params.append('gender', genderFilter);
      }
      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }
      if (sortBy) {
        params.append('sortBy', sortBy);
      }

      const response = await fetch(`${API_BASE}/api/faculty?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.status === 401) {
        logout();
        return;
      }
      const data = await response.json();
      if (data.success) {
        setFacultyList(data.data || []);
        if (data.pagination) {
          setTotalCount(data.pagination.total);
          setTotalPages(data.pagination.totalPages);
          setCurrentPage(data.pagination.page);
        } else {
          setTotalCount(data.total || (data.data || []).length);
        }
        if (data.stats) {
          setStats(data.stats);
        }
        if (data.distribution) {
          if (data.distribution.departments) setDepartmentCounts(data.distribution.departments);
          if (data.distribution.designations) setDesignationCounts(data.distribution.designations);
          if (data.distribution.academicYears) setDbAcademicYears(data.distribution.academicYears);
        }
      }
    } catch (err) {
      console.error('Error fetching faculty:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever user, active filters or debounced search change
  React.useEffect(() => {
    fetchFaculty(1);
  }, [user, academicYearFilter, departmentFilter, designationFilter, genderFilter, debouncedSearch, sortBy]);

  // Dynamically compute available Academic Years from DB distribution and faculty records
  const availableAcademicYears = useMemo(() => {
    const yearsSet = new Set<string>();
    if (dbAcademicYears && dbAcademicYears.length > 0) {
      dbAcademicYears.forEach(y => yearsSet.add(y));
    }
    facultyList.forEach(fac => {
      if (fac.academicYear) {
        yearsSet.add(fac.academicYear);
      }
    });
    if (yearsSet.size === 0) {
      return ['2026-2027', '2025-2026', '2024-2025', '2023-2024', '2022-2023'];
    }
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [dbAcademicYears, facultyList]);

  // For display, facultyList is already server-side filtered and paginated
  const filteredFaculty = facultyList;

  const resetForm = () => {
    setFormData({
      employeeId: '',
      name: '',
      designation: 'Assistant Professor',
      department: 'Computer Science and Engineering',
      academicYear: '2024-2025',
      gender: undefined,
      dateOfBirth: '',
      panCardNo: '',
      dateOfJoining: '',
      prevTeachingExpYears: '0',
      prevTeachingExpMonths: '0',
      prevIndustryExpYears: '0',
      prevIndustryExpMonths: '0',
      qualificationLevel: '',
      highestQualification: '',
      cuExpYears: '0',
      cuExpMonths: '0',
      status: 'Active'
    });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (user?.token) {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/faculty`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.success && data.data) {
          setFacultyList([data.data, ...facultyList]);
        } else {
          const newFaculty: Faculty = { ...formData, id: `FAC00${Date.now()}` };
          setFacultyList([newFaculty, ...facultyList]);
        }
      } else {
        const newFaculty: Faculty = { ...formData, id: `FAC00${Date.now()}` };
        setFacultyList([newFaculty, ...facultyList]);
      }
    } catch (err) {
      console.error(err);
      const newFaculty: Faculty = { ...formData, id: `FAC00${Date.now()}` };
      setFacultyList([newFaculty, ...facultyList]);
    }
    setIsAddModalOpen(false);
    resetForm();
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFaculty) return;
    try {
      if (user?.token && editingFaculty.id && !editingFaculty.id.startsWith('FAC')) {
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/faculty/${editingFaculty.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify(editingFaculty)
        });
      }
      setFacultyList(facultyList.map(f => f.id === editingFaculty.id ? { ...editingFaculty } : f));
    } catch (err) {
      console.error(err);
      setFacultyList(facultyList.map(f => f.id === editingFaculty.id ? { ...editingFaculty } : f));
    }
    setEditingFaculty(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this faculty record?')) {
      try {
        if (user?.token && !id.startsWith('FAC')) {
          await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/faculty/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${user.token}` }
          });
        }
        setFacultyList(facultyList.filter(f => f.id !== id));
      } catch (err) {
        console.error(err);
        setFacultyList(facultyList.filter(f => f.id !== id));
      }
    }
  };

  const exportToCSV = async () => {
    try {
      let exportDataset = filteredFaculty;
      if (user?.token) {
        const params = new URLSearchParams();
        params.append('export', 'true');
        if (academicYearFilter !== 'All') {
          params.append('academicYear', academicYearFilter);
        }
        if (departmentFilter !== 'All') {
          params.append('department', departmentFilter);
        }
        if (designationFilter !== 'All') {
          params.append('designation', designationFilter);
        }
        if (genderFilter !== 'All') {
          params.append('gender', genderFilter);
        }
        if (debouncedSearch.trim()) {
          params.append('search', debouncedSearch.trim());
        }

        const res = await fetch(`${API_BASE}/api/faculty?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          exportDataset = data.data;
          if (academicYearFilter !== 'All') {
            exportDataset = exportDataset.filter(f => f.academicYear === academicYearFilter);
          }
          if (departmentFilter !== 'All') {
            exportDataset = exportDataset.filter(f => f.department === departmentFilter);
          }
          if (designationFilter !== 'All') {
            exportDataset = exportDataset.filter(f => (f.designation || '').toLowerCase() === designationFilter.toLowerCase());
          }
          if (genderFilter !== 'All') {
            exportDataset = exportDataset.filter(f => (f.gender || '').toLowerCase() === genderFilter.toLowerCase());
          }
          if (searchTerm) {
            const q = searchTerm.toLowerCase();
            exportDataset = exportDataset.filter(f => (f.name || '').toLowerCase().includes(q) || (f.employeeId || '').toLowerCase().includes(q));
          }
        }
      }

      const headerRow = 'S.No,EmpId,Name,Designation,Department,Academic Year,Gender,Date of birth,PanCard No,Date Of Joining,Previous Teaching Experience Years,Previous Teaching Experience Months,Previous Industry Experience Years,Previous Industry Experience Months,Qualification Level,Highest Qualification,Experience in CU - Years,Experience in CU - Months';
      const rows = exportDataset.map((f, idx) => {
        const sNo = sanitizeSpreadsheetCell(f.sNo ?? idx + 1);
        const empId = sanitizeSpreadsheetCell(f.employeeId);
        const name = sanitizeSpreadsheetCell(f.name);
        const desig = sanitizeSpreadsheetCell(f.designation);
        const dept = sanitizeSpreadsheetCell(f.department);
        const year = sanitizeSpreadsheetCell(f.academicYear || '2024-2025');
        const gender = sanitizeSpreadsheetCell(f.gender || '');
        const dob = sanitizeSpreadsheetCell(f.dateOfBirth || '');
        const pan = sanitizeSpreadsheetCell(f.panCardNo || '');
        const doj = sanitizeSpreadsheetCell(f.dateOfJoining || '');
        const pty = sanitizeSpreadsheetCell(f.prevTeachingExpYears ?? 0);
        const ptm = sanitizeSpreadsheetCell(f.prevTeachingExpMonths ?? 0);
        const piy = sanitizeSpreadsheetCell(f.prevIndustryExpYears ?? 0);
        const pim = sanitizeSpreadsheetCell(f.prevIndustryExpMonths ?? 0);
        const ql = sanitizeSpreadsheetCell(f.qualificationLevel || '');
        const hq = sanitizeSpreadsheetCell(f.highestQualification || '');
        const cuy = sanitizeSpreadsheetCell(f.cuExpYears ?? 0);
        const cum = sanitizeSpreadsheetCell(f.cuExpMonths ?? 0);
        return `${sNo},"${empId}","${name}","${desig}","${dept}","${year}","${gender}","${dob}","${pan}","${doj}",${pty},${ptm},${piy},${pim},"${ql}","${hq}",${cuy},${cum}`;
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow, ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Faculty_Directory_${academicYearFilter}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export faculty CSV error:', err);
    }
  };

  const handleClearAll = async () => {
    setClearLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/faculty/clear-all?confirmAll=true&confirmation=CONFIRM_UNIVERSITY_CLEAR`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.token || localStorage.getItem('token') || ''}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        setIsClearOpen(false);
        fetchFaculty();
      } else {
        alert(data.message || 'Failed to clear faculty records');
      }
    } catch (err) {
      console.error('Clear all faculty error:', err);
      alert('Failed to connect to backend server');
    } finally {
      setClearLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('All');
    setAcademicYearFilter('All');
    setDesignationFilter('All');
    setGenderFilter('All');
    setSortBy('name-asc');
  };

  return (
    <AppShell currentPage="faculty-details" onNavigate={onNavigate}>
      {/* 1. Universal Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Academics' },
          { label: 'Faculty Management', active: true },
        ]}
        title="Faculty Intelligence Directory"
        badge={`${totalCount.toLocaleString()} Members`}
        description="Institutional faculty Details, doctorate cadre, qualifications hierarchy, and academic profiles across engineering disciplines."
        actions={
          <>
            <button
              type="button"
              onClick={() => fetchFaculty()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-xs disabled:opacity-50"
              title="Refresh Records"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Data</span>
            </button>

            <button
              type="button"
              onClick={exportToCSV}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Report</span>
            </button>

            {user && (user.role === 'admin' || user.role === 'hod' || user.role === 'coordinator') && (
              <>
                <button
                  type="button"
                  onClick={() => setIsClearOpen(true)}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-semibold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-xl transition-colors shadow-xs"
                  title="Clear All Faculty Data"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Data</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsBulkUploadOpen(true)}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>Bulk Upload</span>
                </button>

                <button
                  type="button"
                  onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Faculty</span>
                </button>
              </>
            )}
          </>
        }
      />

      {/* 2. 5 Unified Institutional KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Faculty Details"
          value={stats.total.toLocaleString()}
          subtitle="100% active profiles"
          icon={Users}
        />
        <StatCard
          title="Doctorates (PhD)"
          value={stats.phdCount.toLocaleString()}
          subtitle={`${stats.phdPercent}% doctoral ratio`}
          icon={GraduationCap}
        />
        <StatCard
          title="Senior Cadre"
          value={stats.seniorCadre.toLocaleString()}
          subtitle={`${stats.seniorPercent}% leadership ratio`}
          icon={Award}
        />
        <StatCard
          title="Departments"
          value={stats.depts}
          subtitle="Academic disciplines"
          icon={Building2}
        />
        <StatCard
          title="Avg Experience"
          value={`${stats.avgExp} Yrs`}
          subtitle="Academic & industry exp"
          icon={Briefcase}
        />
      </div>

      {/* 3. Universal Filter Toolbar & View Mode Switcher */}
      <FilterToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search faculty name, emp ID, qualification, dept..."
        onReset={clearFilters}
        hasActiveFilters={
          Boolean(searchTerm) ||
          departmentFilter !== 'All' ||
          academicYearFilter !== 'All' ||
          designationFilter !== 'All' ||
          genderFilter !== 'All'
        }
        totalResults={totalCount}
        resultLabel={`faculty records (AY ${academicYearFilter})`}
        actions={
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Profiles</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('analytics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'analytics'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>
          </div>
        }
      >
        {/* AY Filter */}
        <select
          value={academicYearFilter}
          onChange={e => setAcademicYearFilter(e.target.value)}
          className="h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="All">All Academic Years</option>
          {availableAcademicYears.map(yr => (
            <option key={yr} value={yr}>AY {yr}</option>
          ))}
        </select>

        {/* Dept Filter */}
        <select
          value={departmentFilter}
          onChange={e => setDepartmentFilter(e.target.value)}
          className="h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[200px]"
        >
          <option value="All">All Departments</option>
          {departmentsList.map((d, i) => (
            <option key={i} value={d}>{d}</option>
          ))}
        </select>

        {/* Designation Filter (Phases 6 & 7: Professor, Associate Professor, Assistant Professor, Adjunct Faculty) */}
        <select
          value={designationFilter}
          onChange={e => setDesignationFilter(e.target.value)}
          className="h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="All">All Designations</option>
          {filterDesignationsList.map((d, i) => (
            <option key={i} value={d}>{d}</option>
          ))}
        </select>

        {/* Gender Filter (Phase 5: All Genders, Male, Female, Other) */}
        <select
          value={genderFilter}
          onChange={e => setGenderFilter(e.target.value)}
          className="h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="All">All Genders</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="name-asc">Sort: Name (A-Z)</option>
          <option value="name-desc">Sort: Name (Z-A)</option>
          <option value="employeeId-asc">Sort: Emp ID</option>
          <option value="department-asc">Sort: Department</option>
        </select>
      </FilterToolbar>

          {/* View Mode 1: Table Matrix */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Displaying Records:</span>
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                    {facultyList.length} of {totalCount.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Click actions to inspect or modify faculty credentials</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4 font-mono w-28">Emp ID</th>
                      <th className="py-3 px-4">Faculty Member</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Highest Qual.</th>
                      <th className="py-3 px-4 text-center">AY</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredFaculty.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-sm">No faculty records found</p>
                          <p className="text-xs mt-0.5">Try clearing filters or uploading data</p>
                        </td>
                      </tr>
                    ) : (
                      filteredFaculty.map((fac, idx) => {
                        const isPhd = (fac.highestQualification && fac.highestQualification.toUpperCase().includes('PHD')) ||
                                      (fac.qualificationLevel && fac.qualificationLevel.toUpperCase().includes('PHD'));
                        
                        const initials = fac.name
                          .split(' ')
                          .filter(Boolean)
                          .map(w => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || 'FA';

                        return (
                          <tr key={fac.id || idx} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-700 font-semibold whitespace-nowrap">
                              {fac.employeeId || '—'}
                            </td>

                            <td className="py-3 px-4">
                              <div>
                                <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {fac.name}
                                </p>
                                {fac.email && (
                                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{fac.email}</p>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60 max-w-[260px] truncate">
                                <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                <span className="truncate">{fac.department}</span>
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/80">
                                {fac.designation}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              {fac.highestQualification ? (
                                <span className="inline-flex items-center gap-1 font-medium text-[11px] text-slate-800">
                                  {fac.highestQualification}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                                {fac.academicYear || '2024-25'}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  onClick={() => setViewingFaculty(fac)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md"
                                  title="View Full Profile"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>

                                {user && (user.role === 'admin' || user.role === 'hod' || user.role === 'coordinator') && (
                                  <>
                                    <Button
                                      onClick={() => setEditingFaculty(fac)}
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                                      title="Edit Record"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      onClick={() => handleDelete(fac.id)}
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                                      title="Delete"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
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
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <div className="text-xs text-slate-500 font-medium">
                    Showing <span className="font-bold text-slate-700">{totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to <span className="font-bold text-slate-700">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="font-bold text-slate-700">{totalCount}</span> faculty members
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1 || loading}
                      onClick={() => fetchFaculty(currentPage - 1)}
                      className="text-xs h-8 px-3"
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-slate-600 px-2 font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages || loading}
                      onClick={() => fetchFaculty(currentPage + 1)}
                      className="text-xs h-8 px-3"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View Mode 2: Card Grid */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFaculty.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200/80">
                  <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-700">No faculty records match your filters</p>
                </div>
              ) : (
                filteredFaculty.map((fac, idx) => {
                  const initials = fac.name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'FA';

                  return (
                    <div
                      key={fac.id || idx}
                      className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center justify-center text-xs font-semibold">
                              {initials}
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors leading-snug">
                                {fac.name}
                              </h3>
                              <p className="text-[11px] font-mono text-slate-500">
                                {fac.employeeId || 'ID: UNASSIGNED'}
                              </p>
                            </div>
                          </div>

                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/80">
                            {fac.designation}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate font-medium">{fac.department}</span>
                          </div>

                          {fac.highestQualification && (
                            <div className="flex items-center gap-1.5">
                              <GraduationCap className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                              <span className="font-medium text-slate-800">
                                {fac.highestQualification} {fac.qualificationLevel ? `(${fac.qualificationLevel})` : ''}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>Experience in CU: <strong className="text-slate-700 font-semibold">{fac.cuExpYears || 0}Y {fac.cuExpMonths || 0}M</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-mono font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200/60">
                          AY {fac.academicYear || '2024-25'}
                        </span>

                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => setViewingFaculty(fac)}
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs font-medium text-blue-600 hover:bg-slate-100 rounded-md px-2"
                          >
                            Inspect
                          </Button>
                          {user && (user.role === 'admin' || user.role === 'hod' || user.role === 'coordinator') && (
                            <Button
                              onClick={() => setEditingFaculty(fac)}
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md px-2"
                            >
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* View Mode 3: Analytics & Distribution */}
          {viewMode === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Department Distribution */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Faculty Distribution by Department</h3>
                    <p className="text-xs text-slate-500">Headcount representation across disciplines</p>
                  </div>
                  <Building2 className="w-4 h-4 text-slate-500" />
                </div>

                <div className="space-y-3">
                  {Object.entries(departmentCounts).map(([dept, count]) => {
                    const pct = ((count / (stats.total || 1)) * 100).toFixed(0);
                    return (
                      <div key={dept} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700 truncate pr-2">{dept}</span>
                          <span className="font-semibold text-slate-900 tabular-nums">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Designation & Cadre Distribution */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Academic Hierarchy & Cadre Ratio</h3>
                    <p className="text-xs text-slate-500">Distribution across faculty ranks</p>
                  </div>
                  <Award className="w-4 h-4 text-slate-500" />
                </div>

                <div className="space-y-3">
                  {Object.entries(designationCounts).map(([desig, count]) => {
                    const pct = ((count / (stats.total || 1)) * 100).toFixed(0);
                    return (
                      <div key={desig} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700 truncate pr-2">{desig}</span>
                          <span className="font-semibold text-slate-900 tabular-nums">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-slate-800 h-1.5 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        token={user?.token || ''}
        uploadType="faculty"
        onSuccess={fetchFaculty}
      />

      {/* View Faculty Detail Slide-over Drawer (Redesigned per IQAC Balanced Refresh) */}
      {viewingFaculty && (() => {
        const expMetrics = computeFacultyExperience(viewingFaculty);
        const hasPermanentAddress = Boolean(
          (viewingFaculty as any).permanentCity ||
          (viewingFaculty as any).permanentState ||
          (viewingFaculty as any).permanentCountry ||
          (viewingFaculty as any).address
        );

        return (
          <div
            className="fixed inset-0 z-50 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="faculty-drawer-title"
          >
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-200"
              onClick={() => setViewingFaculty(null)}
              aria-hidden="true"
            />

            {/* Right-side Drawer Panel */}
            <div className="fixed inset-y-0 right-0 flex max-w-full pointer-events-none pl-4 sm:pl-10">
              <div
                className="w-screen sm:max-w-[580px] pointer-events-auto bg-[#F5F7FB] shadow-2xl flex flex-col border-l border-[#E2E8F0] transform transition-transform duration-200 ease-out"
              >
                {/* STICKY PROFILE HEADER (PHASE 4) */}
                <div className="sticky top-0 z-10 bg-white border-b border-[#E2E8F0] px-5 sm:px-6 py-4 sm:py-5 shadow-2xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[#2855B9]/10 text-[#2855B9] flex items-center justify-center shrink-0 border border-[#2855B9]/15">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h2
                          id="faculty-drawer-title"
                          className="text-base sm:text-lg font-bold text-[#172B4D] truncate leading-tight"
                        >
                          {viewingFaculty.name || 'Faculty Profile'}
                        </h2>
                        <p className="text-xs text-[#475569] font-mono mt-0.5">
                          Employee ID: <span className="font-semibold text-slate-800">{viewingFaculty.employeeId || '—'}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewingFaculty(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-hidden focus:ring-2 focus:ring-[#2855B9]"
                      aria-label="Close drawer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Badges Row */}
                  <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-slate-100">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#2855B9]/10 text-[#2855B9] border border-[#2855B9]/20">
                      {viewingFaculty.designation || 'Assistant Professor'}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      {viewingFaculty.department || 'Christ University'}
                    </span>
                    {viewingFaculty.status && viewingFaculty.status !== 'Active' && (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        viewingFaculty.status === 'On Sabbatical'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}>
                        {viewingFaculty.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* SCROLLABLE INFORMATION CARDS (PHASE 5) */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                  {/* SECTION 1 — PERSONAL & EMPLOYMENT DETAILS */}
                  <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#E2E8F0] shadow-2xs">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3.5">
                      <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#2855B9] flex items-center justify-center">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                        Personal & Employment Details
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Gender</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{viewingFaculty.gender || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Nationality</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{(viewingFaculty as any).nationality || 'Indian'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Official Email</p>
                        {viewingFaculty.email ? (
                          <a
                            href={`mailto:${viewingFaculty.email}`}
                            className="text-sm font-semibold text-[#2855B9] hover:underline mt-0.5 block truncate"
                            title={viewingFaculty.email}
                          >
                            {viewingFaculty.email}
                          </a>
                        ) : (
                          <p className="text-sm font-semibold text-slate-900 mt-0.5">—</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Employee Type</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">
                          {(viewingFaculty as any).employeeType || (viewingFaculty.status ? (viewingFaculty.status === 'Active' ? 'Permanent' : viewingFaculty.status) : 'Permanent')}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Date of Joining</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{formatDateSafe(viewingFaculty.dateOfJoining)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Date of Resignation</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{formatDateSafe((viewingFaculty as any).dateOfResignation)}</p>
                      </div>
                      {viewingFaculty.dateOfBirth && (
                        <div>
                          <p className="text-[11px] font-medium text-slate-500">Date of Birth</p>
                          <p className="text-sm font-semibold text-slate-900 mt-0.5">{formatDateSafe(viewingFaculty.dateOfBirth)}</p>
                        </div>
                      )}
                      {viewingFaculty.phone && (
                        <div>
                          <p className="text-[11px] font-medium text-slate-500">Contact Number</p>
                          <p className="text-sm font-semibold text-slate-900 mt-0.5 font-mono">{viewingFaculty.phone}</p>
                        </div>
                      )}
                      {viewingFaculty.panCardNo && (
                        <div>
                          <p className="text-[11px] font-medium text-slate-500">PAN Card No</p>
                          <p className="text-sm font-semibold text-slate-900 mt-0.5 font-mono">{viewingFaculty.panCardNo}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION 2 — DEPARTMENT & ACADEMIC INFORMATION */}
                  <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#E2E8F0] shadow-2xs">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3.5">
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                        Department & Academic Information
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Department</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{viewingFaculty.department || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Current Designation</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{viewingFaculty.designation || '—'}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-[11px] font-medium text-slate-500 mb-1.5">Academic Year</p>
                        {Array.isArray((viewingFaculty as any).academicYearHistory) && (viewingFaculty as any).academicYearHistory.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(viewingFaculty as any).academicYearHistory.map((yr: string) => (
                              <span key={yr} className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                {yr}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                            {viewingFaculty.academicYear || '2024–2025'}
                          </span>
                        )}
                      </div>
                      {viewingFaculty.specialization && (
                        <div className="sm:col-span-2">
                          <p className="text-[11px] font-medium text-slate-500">Specialization / Domain</p>
                          <p className="text-sm font-semibold text-slate-900 mt-0.5">{viewingFaculty.specialization}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SECTION 3 — QUALIFICATIONS & ACADEMICS */}
                  <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#E2E8F0] shadow-2xs">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3.5">
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <GraduationCap className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                        Qualifications & Academics
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Highest Qualification</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{viewingFaculty.highestQualification || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">Qualification Level</p>
                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{viewingFaculty.qualificationLevel || '—'}</p>
                      </div>
                      {viewingFaculty.qualifications && (
                        <>
                          {viewingFaculty.qualifications.ug && (
                            <div>
                              <p className="text-[11px] font-medium text-slate-500">Undergraduate (UG)</p>
                              <p className="text-sm font-semibold text-slate-900 mt-0.5">{viewingFaculty.qualifications.ug}</p>
                            </div>
                          )}
                          {viewingFaculty.qualifications.pg && (
                            <div>
                              <p className="text-[11px] font-medium text-slate-500">Postgraduate (PG)</p>
                              <p className="text-sm font-semibold text-slate-900 mt-0.5">{viewingFaculty.qualifications.pg}</p>
                            </div>
                          )}
                          {viewingFaculty.qualifications.phd && (
                            <div>
                              <p className="text-[11px] font-medium text-slate-500">Doctoral (Ph.D.)</p>
                              <p className="text-sm font-semibold text-slate-900 mt-0.5">{viewingFaculty.qualifications.phd}</p>
                            </div>
                          )}
                          {viewingFaculty.qualifications.further && (
                            <div>
                              <p className="text-[11px] font-medium text-slate-500">Post-Doctoral / Other</p>
                              <p className="text-sm font-semibold text-slate-900 mt-0.5">{viewingFaculty.qualifications.further}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* SECTION 4 — EXPERIENCE METRICS (PRIMARY VISUAL REFRESH) */}
                  <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#E2E8F0] shadow-2xs">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3.5">
                      <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                        <Briefcase className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                        Experience Metrics
                      </h3>
                    </div>

                    {/* 3 Equal Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Card 1: Other Experience */}
                      <div className="bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl p-3 sm:p-3.5 text-center flex flex-col items-center justify-center">
                        <span className="text-base sm:text-lg font-bold text-[#172B4D] font-mono tracking-tight">
                          {expMetrics.otherExpDisplay}
                        </span>
                        <span className="text-[11px] font-medium text-[#475569] mt-1 leading-snug">
                          Other Experience
                        </span>
                      </div>

                      {/* Card 2: Total Experience */}
                      <div className="bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl p-3 sm:p-3.5 text-center flex flex-col items-center justify-center">
                        <span className="text-base sm:text-lg font-bold text-[#172B4D] font-mono tracking-tight">
                          {expMetrics.totalExpDisplay}
                        </span>
                        <span className="text-[11px] font-medium text-[#475569] mt-1 leading-snug">
                          Total Experience
                        </span>
                      </div>

                      {/* Card 3: Experience in CU */}
                      <div className="bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl p-3 sm:p-3.5 text-center flex flex-col items-center justify-center">
                        <span className="text-base sm:text-lg font-bold text-[#172B4D] font-mono tracking-tight">
                          {expMetrics.cuExpDisplay}
                        </span>
                        <span className="text-[11px] font-medium text-[#475569] mt-1 leading-snug">
                          Experience in CU
                        </span>
                      </div>
                    </div>

                    {/* Contextual breakdown footer if underlying previous experience is present */}
                    {expMetrics.hasSubBreakdown && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
                        <span>Teaching: <strong className="font-semibold text-slate-700">{expMetrics.teachingDisplay}</strong></span>
                        <span>Industry: <strong className="font-semibold text-slate-700">{expMetrics.industryDisplay}</strong></span>
                        <span>CU: <strong className="font-semibold text-slate-700">{expMetrics.cuExpDisplay}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* SECTION 5 (OPTIONAL) — PERMANENT ADDRESS */}
                  {hasPermanentAddress && (
                    <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#E2E8F0] shadow-2xs">
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3.5">
                        <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                          Permanent Address
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                        <div>
                          <p className="text-[11px] font-medium text-slate-500">Permanent City</p>
                          <p className="text-sm font-semibold text-slate-900 mt-0.5">{(viewingFaculty as any).permanentCity || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-500">Permanent State</p>
                          <p className="text-sm font-semibold text-slate-900 mt-0.5">{(viewingFaculty as any).permanentState || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-slate-500">Permanent Country</p>
                          <p className="text-sm font-semibold text-slate-900 mt-0.5">{(viewingFaculty as any).permanentCountry || 'India'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* STICKY FOOTER (PHASE 10) */}
                <div className="sticky bottom-0 z-10 bg-white border-t border-[#E2E8F0] px-5 sm:px-6 py-3.5 flex items-center justify-end shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setViewingFaculty(null)}
                    className="px-5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#2855B9]"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add Faculty Modal */}
      <FormModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        title="Register Faculty Member"
        description="Add a new academic faculty member to the institutional registry."
        icon={Plus}
        submitLabel="Save Faculty Profile"
        onSubmit={handleAddSubmit}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Faculty Full Name" required>
            <FormInput 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
              placeholder="e.g. Dr. Jane Smith"
              required 
            />
          </FormField>
          <FormField label="Employee ID" required>
            <FormInput 
              value={formData.employeeId} 
              onChange={e => setFormData({ ...formData, employeeId: e.target.value })} 
              placeholder="e.g. CU1045"
              required 
            />
          </FormField>
          <FormField label="Department" required>
            <FormSelect 
              value={formData.department} 
              onChange={e => setFormData({ ...formData, department: e.target.value })} 
            >
              {departmentsList.map((d, i) => <option key={i} value={d}>{d}</option>)}
            </FormSelect>
          </FormField>
          <FormField label="Designation" required>
            <FormSelect 
              value={formData.designation} 
              onChange={e => setFormData({ ...formData, designation: e.target.value })} 
            >
              {designationsList.map((d, i) => <option key={i} value={d}>{d}</option>)}
            </FormSelect>
          </FormField>
          <FormField label="Academic Year" required>
            <FormSelect 
              value={formData.academicYear || '2024-2025'} 
              onChange={e => setFormData({ ...formData, academicYear: e.target.value })} 
            >
              <option value="2025-2026">2025-2026</option>
              <option value="2024-2025">2024-2025</option>
              <option value="2023-2024">2023-2024</option>
            </FormSelect>
          </FormField>
          <FormField label="Highest Qualification">
            <FormInput 
              value={formData.highestQualification || ''} 
              onChange={e => setFormData({ ...formData, highestQualification: e.target.value })} 
              placeholder="e.g. Ph.D. in Computer Science"
            />
          </FormField>
        </div>
      </FormModal>

      {/* Edit Faculty Modal */}
      <FormModal
        open={!!editingFaculty}
        onOpenChange={(open) => !open && setEditingFaculty(null)}
        title="Edit Faculty Profile"
        description="Update faculty credentials, academic department assignment, and qualifications."
        icon={Edit}
        submitLabel="Update Profile"
        onSubmit={handleEditSubmit}
      >
        {editingFaculty && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Faculty Full Name" required>
              <FormInput 
                value={editingFaculty.name} 
                onChange={e => setEditingFaculty({ ...editingFaculty, name: e.target.value })} 
                required 
              />
            </FormField>
            <FormField label="Employee ID" required>
              <FormInput 
                value={editingFaculty.employeeId} 
                onChange={e => setEditingFaculty({ ...editingFaculty, employeeId: e.target.value })} 
                required 
              />
            </FormField>
            <FormField label="Designation" required>
              <FormSelect 
                value={editingFaculty.designation} 
                onChange={e => setEditingFaculty({ ...editingFaculty, designation: e.target.value })} 
              >
                {designationsList.map((d, i) => <option key={i} value={d}>{d}</option>)}
              </FormSelect>
            </FormField>
            <FormField label="Department" required>
              <FormSelect 
                value={editingFaculty.department} 
                onChange={e => setEditingFaculty({ ...editingFaculty, department: e.target.value })} 
              >
                {departmentsList.map((d, i) => <option key={i} value={d}>{d}</option>)}
              </FormSelect>
            </FormField>
            <FormField label="Highest Qualification">
              <FormInput 
                value={editingFaculty.highestQualification || ''} 
                onChange={e => setEditingFaculty({ ...editingFaculty, highestQualification: e.target.value })} 
              />
            </FormField>
            <FormField label="Experience in CU (Years)">
              <FormInput 
                value={editingFaculty.cuExpYears || '0'} 
                onChange={e => setEditingFaculty({ ...editingFaculty, cuExpYears: e.target.value })} 
              />
            </FormField>
          </div>
        )}
      </FormModal>

      {/* Clear All Confirmation Dialog */}
      <Dialog open={isClearOpen} onOpenChange={setIsClearOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2 text-base">
              <AlertCircle className="w-5 h-5" />
              Clear Faculty Records
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Are you sure you want to delete all faculty records in this section? This action is irreversible.
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
    </AppShell>
  );
}

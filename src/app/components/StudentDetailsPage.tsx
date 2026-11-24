import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTableVirtualization } from '../hooks/useTableVirtualization';
import { 
  Users, 
  GraduationCap, 
  Search, 
  Plus, 
  Building2, 
  FileText, 
  Eye, 
  Edit, 
  Trash2, 
  X, 
  Download,
  Mail,
  Phone,
  BookOpen,
  School,
  CheckCircle,
  Calendar,
  UserCheck,
  RefreshCw,
  Upload,
  Table as TableIcon,
  LayoutGrid,
  BarChart3,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  BadgeCheck,
  Layers,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  History,
  MapPin,
  Info
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BulkUploadDialog } from './BulkUploadDialog';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';
import { normalizeAcademicYear, normalizeDepartmentName } from './FacultyDetailsPage';
import { sanitizeSpreadsheetCell } from '../utils/spreadsheetSanitizer';
import {
  AppShell,
  PageHeader,
  StatCard,
  FilterToolbar,
  DetailDrawer,
  StatusBadge,
  ConfirmDialog,
  SectionCard,
  FormModal,
  FormField,
  FormInput,
  FormSelect,
} from './design-system';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface StudentDetailsPageProps {
  onNavigate: (page: string) => void;
}

export interface StudentEnrollmentRecord {
  id: string;
  studentId: string;
  registerNumber: string;
  academicYear: string;
  department: string;
  course?: string;
  program?: string;
  className?: string;
  batch?: string;
  programLevel?: string;
  status: string;
  campus?: string;
  school?: string;
  yearOfStudy?: string;
  isFirstYearSH?: boolean;
}

export interface Student {
  id: string;
  registerNumber: string;
  name: string;
  email?: string;
  phone?: string;
  course?: string;
  department?: string;
  school?: string;
  campus?: string;
  programLevel?: string;
  academicYear?: string;
  previousSchool?: string;
  gender: string;
  dob?: string;
  bloodGroup?: string;
  batch?: string;
  admissionDate?: string;
  status: 'Active' | 'Graduated' | 'On Leave';
  guardianName?: string;
  guardianPhone?: string;
  address?: string;
  className?: string;
  applicationNo?: string;
  mobileNo?: string;
  nationality?: string;
  caste?: string;
  currentCity?: string;
  currentState?: string;
  permanentCity?: string;
  permanentState?: string;
  permanentCountry?: string;
  parentMobileNo?: string;
  handicapped?: string;
  handicappedDescription?: string;
  disability?: string;
  enrollments?: StudentEnrollmentRecord[];
}

export function StudentDetailsPage({ onNavigate }: StudentDetailsPageProps) {
  const { user, logout } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'analytics'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  // Dynamic KPI Stats from backend with Gender & 2-Level Hover Data
  const [stats, setStats] = useState({
    total: 0,
    totalGender: { boys: 0, girls: 0, other: 0, notSpecified: 0, total: 0 },
    ugCount: 0,
    ugPercent: '0',
    ugGender: { boys: 0, girls: 0, other: 0, notSpecified: 0, total: 0 },
    pgCount: 0,
    pgPercent: '0',
    pgGender: { boys: 0, girls: 0, other: 0, notSpecified: 0, total: 0 },
    activeCount: 0,
    activePercent: '0',
    depts: 0,
    departmentList: [] as Array<{
      department: string;
      count: number;
      gender: { boys: number; girls: number; other: number; notSpecified: number; total: number };
    }>
  });

  const [departmentCounts, setDepartmentCounts] = useState<Record<string, number>>({});
  const [levelCounts, setLevelCounts] = useState<Record<string, number>>({});
  const [dbAcademicYears, setDbAcademicYears] = useState<string[]>([]);

  // Hover Popover State for KPI Cards
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);

  // Filters & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [academicYearFilter, setAcademicYearFilter] = useState('All');
  const [programLevelFilter, setProgramLevelFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [sortBy, setSortBy] = useState<string>('registerNumber-asc');

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchStudents = async (page = 1) => {
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
      if (programLevelFilter !== 'All') {
        params.append('programLevel', programLevelFilter);
      }
      if (statusFilter !== 'All') {
        params.append('status', statusFilter);
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

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/students?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.status === 401) {
        logout();
        return;
      }
      const data = await response.json();
      if (data.success) {
        setStudents(data.data || []);
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
          if (data.distribution.levels) setLevelCounts(data.distribution.levels);
          if (data.distribution.academicYears) setDbAcademicYears(data.distribution.academicYears);
        }
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever filters, sort or debounced search change
  useEffect(() => {
    fetchStudents(1);
  }, [user, academicYearFilter, departmentFilter, programLevelFilter, statusFilter, genderFilter, sortBy, debouncedSearch]);

  const [isClearOpen, setIsClearOpen] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const handleClearAll = async () => {
    try {
      setClearLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/students/clear-all?confirmAll=true&confirmation=CONFIRM_UNIVERSITY_CLEAR`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user?.token || localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setStudents([]);
        setTotalCount(0);
        setStats({
          total: 0,
          totalGender: { boys: 0, girls: 0, other: 0, notSpecified: 0, total: 0 },
          ugCount: 0,
          ugPercent: '0',
          ugGender: { boys: 0, girls: 0, other: 0, notSpecified: 0, total: 0 },
          pgCount: 0,
          pgPercent: '0',
          pgGender: { boys: 0, girls: 0, other: 0, notSpecified: 0, total: 0 },
          activeCount: 0,
          activePercent: '0',
          depts: 0,
          departmentList: []
        });
        setDepartmentCounts({});
        setLevelCounts({});
        setIsClearOpen(false);
      } else {
        alert(data.message || 'Failed to clear student records');
      }
    } catch (err) {
      console.error('Error clearing students:', err);
      alert('Network error while clearing student records');
    } finally {
      setClearLoading(false);
    }
  };

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Academic Hierarchy hook
  const { 
    campusList, 
    schoolList, 
    departmentList: departmentsList, 
    programLevelList,
    getProgramLevelsForDepartment, 
    getCoursesByDeptAndLevel 
  } = useAcademicHierarchy();

  // Form State
  const [formData, setFormData] = useState<Omit<Student, 'id'>>({
    registerNumber: '',
    name: '',
    email: '',
    phone: '',
    course: 'BTech in Computer Science and Engineering',
    department: 'Computer Science and Engineering',
    school: 'School of Engineering and Technology',
    campus: 'Kengeri Campus',
    programLevel: 'UG',
    academicYear: '2024-2025',
    previousSchool: '',
    gender: 'Male',
    dob: '',
    bloodGroup: 'O+',
    batch: '2024 - 2028',
    admissionDate: '',
    status: 'Active',
    guardianName: '',
    guardianPhone: '',
    address: '',
    className: '',
    applicationNo: '',
    mobileNo: '',
    nationality: '',
    caste: '',
    currentCity: '',
    currentState: '',
    permanentCity: '',
    permanentState: '',
    parentMobileNo: '',
    handicapped: 'NO',
    handicappedDescription: '',
    disability: 'NO'
  });

  const availableAcademicYears = useMemo(() => {
    const yearsSet = new Set<string>(['2026-2027', '2025-2026', '2024-2025', '2023-2024', '2022-2023', '2021-2022']);
    dbAcademicYears.forEach(y => {
      const norm = normalizeAcademicYear(y);
      if (norm) yearsSet.add(norm);
    });
    students.forEach(st => {
      const norm = normalizeAcademicYear(st.academicYear);
      if (norm) yearsSet.add(norm);
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [dbAcademicYears, students]);

  // Current page records (already filtered & sorted by backend)
  const filteredStudents = students;

  const studentTableContainerRef = useRef<HTMLDivElement>(null);
  const {
    isVirtual: isStudentTableVirtual,
    paddingTop: studentTablePaddingTop,
    paddingBottom: studentTablePaddingBottom,
    renderedItems: renderedStudentItems,
  } = useTableVirtualization<Student>({
    rows: filteredStudents,
    parentRef: studentTableContainerRef,
    estimateRowHeight: 52,
    threshold: 25,
    mode: 'auto',
    getItemKey: (idx) => filteredStudents[idx]?.registerNumber || filteredStudents[idx]?.id || idx,
  });

  // Active KPI Stats (server-provided dynamic stats, with fallback)
  const activeStats = useMemo(() => {
    if (stats.total > 0 || totalCount > 0) {
      return stats;
    }
    const total = students.length;
    const ugCount = students.filter(s => (s.programLevel || '').toUpperCase() === 'UG').length;
    const pgCount = students.filter(s => {
      const lvl = (s.programLevel || '').toUpperCase();
      return lvl === 'PG' || lvl === 'PHD';
    }).length;
    const activeCount = students.filter(s => s.status === 'Active').length;
    const depts = new Set(students.map(s => s.department).filter(Boolean)).size;

    return {
      total,
      totalGender: stats.totalGender || { boys: 0, girls: 0, other: 0, notSpecified: 0, total },
      ugCount,
      ugPercent: total > 0 ? ((ugCount / total) * 100).toFixed(1) : '0',
      ugGender: stats.ugGender || { boys: 0, girls: 0, other: 0, notSpecified: 0, total: ugCount },
      pgCount,
      pgPercent: total > 0 ? ((pgCount / total) * 100).toFixed(1) : '0',
      pgGender: stats.pgGender || { boys: 0, girls: 0, other: 0, notSpecified: 0, total: pgCount },
      activeCount,
      activePercent: total > 0 ? ((activeCount / total) * 100).toFixed(1) : '0',
      depts,
      departmentList: stats.departmentList || []
    };
  }, [stats, totalCount, students]);

  const resetForm = () => {
    setFormData({
      registerNumber: '',
      name: '',
      email: '',
      phone: '',
      course: 'BTech in Computer Science and Engineering',
      department: 'Computer Science and Engineering',
      school: 'School of Engineering and Technology',
      campus: 'Kengeri Campus',
      programLevel: 'UG',
      academicYear: '2024-2025',
      previousSchool: '',
      gender: 'Male',
      dob: '',
      bloodGroup: 'O+',
      batch: '2024 - 2028',
      admissionDate: '',
      status: 'Active',
      guardianName: '',
      guardianPhone: '',
      address: '',
      className: '',
      applicationNo: '',
      mobileNo: '',
      nationality: '',
      caste: '',
      currentCity: '',
      currentState: '',
      permanentCity: '',
      permanentState: '',
      parentMobileNo: '',
      handicapped: 'NO',
      handicappedDescription: '',
      disability: 'NO'
    });
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (user?.token) {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/students`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.success && data.data) {
          setStudents([data.data, ...students]);
        } else {
          const newStudent: Student = { ...formData, id: `STU00${Date.now()}` };
          setStudents([newStudent, ...students]);
        }
      } else {
        const newStudent: Student = { ...formData, id: `STU00${Date.now()}` };
        setStudents([newStudent, ...students]);
      }
    } catch (err) {
      console.error(err);
      const newStudent: Student = { ...formData, id: `STU00${Date.now()}` };
      setStudents([newStudent, ...students]);
    }
    setIsAddModalOpen(false);
    resetForm();
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      if (user?.token && editingStudent.id && !editingStudent.id.startsWith('STU')) {
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/students/${editingStudent.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify(editingStudent)
        });
      }
      setStudents(students.map(s => s.id === editingStudent.id ? { ...editingStudent } : s));
    } catch (err) {
      console.error(err);
      setStudents(students.map(s => s.id === editingStudent.id ? { ...editingStudent } : s));
    }
    setEditingStudent(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this student record?')) {
      try {
        if (user?.token && !id.startsWith('STU')) {
          await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/students/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${user.token}` }
          });
        }
        setStudents(students.filter(s => s.id !== id));
      } catch (err) {
        console.error(err);
        setStudents(students.filter(s => s.id !== id));
      }
    }
  };

  const exportToCSV = async () => {
    try {
      let exportDataset = students;
      if (user?.token) {
        const params = new URLSearchParams();
        params.append('export', 'true');
        if (academicYearFilter !== 'All') params.append('academicYear', academicYearFilter);
        if (departmentFilter !== 'All') params.append('department', departmentFilter);
        if (programLevelFilter !== 'All') params.append('programLevel', programLevelFilter);
        if (statusFilter !== 'All') params.append('status', statusFilter);
        if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
        if (sortBy) params.append('sortBy', sortBy);

        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/students?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          exportDataset = data.data;
        }
      }

      const headerRow = 'Register No,Name,Department,Course,Program Level,Class,Batch,Academic Year,Gender,Status,Email,Mobile No';
      const rows = exportDataset.map((s) => {
        const reg = sanitizeSpreadsheetCell(s.registerNumber);
        const name = sanitizeSpreadsheetCell(s.name);
        const dept = sanitizeSpreadsheetCell(s.department || '');
        const course = sanitizeSpreadsheetCell(s.course || '');
        const prog = sanitizeSpreadsheetCell(s.programLevel || '');
        const cls = sanitizeSpreadsheetCell(s.className || '');
        const batch = sanitizeSpreadsheetCell(s.batch || '');
        const year = sanitizeSpreadsheetCell(s.academicYear || '2024-2025');
        const gender = sanitizeSpreadsheetCell(s.gender || '');
        const status = sanitizeSpreadsheetCell(s.status || 'Active');
        const email = sanitizeSpreadsheetCell(s.email || '');
        const phone = sanitizeSpreadsheetCell(s.mobileNo || s.phone || '');
        return `"${reg}","${name}","${dept}","${course}","${prog}","${cls}","${batch}","${year}","${gender}","${status}","${email}","${phone}"`;
      });
      const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow, ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Student_Directory_${academicYearFilter !== 'All' ? academicYearFilter : 'All_Years'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export CSV error:', err);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setDepartmentFilter('All');
    setAcademicYearFilter('All');
    setProgramLevelFilter('All');
    setStatusFilter('All');
    setGenderFilter('All');
    setSortBy('registerNumber-asc');
  };

  return (
    <AppShell currentPage="student-details" onNavigate={onNavigate}>
      {/* 1. Universal Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Academics' },
          { label: 'Student Details', active: true },
        ]}
        title="Student Enrollment Intelligence"
        badge={`${(totalCount || activeStats.total).toLocaleString()} Students`}
        description="Undergraduate, postgraduate & doctoral cohort records, admission status and class lineages across academic schools."
        actions={
          <>
            <button
              type="button"
              onClick={() => fetchStudents()}
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
                  title="Clear All Student Records"
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
                  <span>Add Student</span>
                </button>
              </>
            )}
          </>
        }
      />

      {/* 2. 5 Unified Institutional KPI Metric Cards with Interactive Gender & 2-Level Hover Popovers */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 relative">
        {/* Card 1: Total Students with Gender Breakdown Popover */}
        <div
          className="relative group"
          onMouseEnter={() => setHoveredCard('total')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <StatCard
            title="Total Students"
            value={(activeStats.total || totalCount).toLocaleString()}
            subtitle="Unique registered students"
            icon={Users}
            badge="Hover for Gender"
            className="cursor-pointer transition-all duration-200 group-hover:border-blue-300 group-hover:shadow-md"
          />
          {hoveredCard === 'total' && activeStats.totalGender && (
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200/90 p-3.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" /> Total Gender Demographics
                </span>
                <span className="text-[10px] font-mono text-slate-500">{(activeStats.total || totalCount).toLocaleString()} total</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between bg-blue-50/70 p-2 rounded-lg border border-blue-100">
                  <span className="text-blue-900 font-medium">Boys (Male)</span>
                  <span className="font-bold text-blue-950 font-mono">
                    {(activeStats.totalGender.boys || 0).toLocaleString()}{' '}
                    <span className="text-[10px] text-blue-600 font-normal">
                      ({activeStats.total > 0 ? (((activeStats.totalGender.boys || 0) / activeStats.total) * 100).toFixed(1) : 0}%)
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between bg-pink-50/70 p-2 rounded-lg border border-pink-100">
                  <span className="text-pink-900 font-medium">Girls (Female)</span>
                  <span className="font-bold text-pink-950 font-mono">
                    {(activeStats.totalGender.girls || 0).toLocaleString()}{' '}
                    <span className="text-[10px] text-pink-600 font-normal">
                      ({activeStats.total > 0 ? (((activeStats.totalGender.girls || 0) / activeStats.total) * 100).toFixed(1) : 0}%)
                    </span>
                  </span>
                </div>
                {((activeStats.totalGender.other || 0) > 0 || (activeStats.totalGender.notSpecified || 0) > 0) && (
                  <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200 text-slate-700">
                    <span>Other / Unspecified</span>
                    <span className="font-bold font-mono">
                      {((activeStats.totalGender.other || 0) + (activeStats.totalGender.notSpecified || 0)).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: UG Students with Gender Breakdown Popover */}
        <div
          className="relative group"
          onMouseEnter={() => setHoveredCard('ug')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <StatCard
            title="UG Students"
            value={activeStats.ugCount.toLocaleString()}
            subtitle={`${activeStats.ugPercent}% undergraduate share`}
            icon={School}
            badge="Hover for Gender"
            className="cursor-pointer transition-all duration-200 group-hover:border-blue-300 group-hover:shadow-md"
          />
          {hoveredCard === 'ug' && activeStats.ugGender && (
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200/90 p-3.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <School className="w-3.5 h-3.5 text-blue-600" /> Undergraduate Cohort
                </span>
                <span className="text-[10px] font-mono text-slate-500">{activeStats.ugCount.toLocaleString()} students</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between bg-blue-50/70 p-2 rounded-lg border border-blue-100">
                  <span className="text-blue-900 font-medium">UG Boys</span>
                  <span className="font-bold text-blue-950 font-mono">
                    {(activeStats.ugGender.boys || 0).toLocaleString()}{' '}
                    <span className="text-[10px] text-blue-600 font-normal">
                      ({activeStats.ugCount > 0 ? (((activeStats.ugGender.boys || 0) / activeStats.ugCount) * 100).toFixed(1) : 0}%)
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between bg-pink-50/70 p-2 rounded-lg border border-pink-100">
                  <span className="text-pink-900 font-medium">UG Girls</span>
                  <span className="font-bold text-pink-950 font-mono">
                    {(activeStats.ugGender.girls || 0).toLocaleString()}{' '}
                    <span className="text-[10px] text-pink-600 font-normal">
                      ({activeStats.ugCount > 0 ? (((activeStats.ugGender.girls || 0) / activeStats.ugCount) * 100).toFixed(1) : 0}%)
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 3: PG & Scholars with Gender Breakdown Popover */}
        <div
          className="relative group"
          onMouseEnter={() => setHoveredCard('pg')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <StatCard
            title="PG & Scholars"
            value={activeStats.pgCount.toLocaleString()}
            subtitle={`${activeStats.pgPercent}% post-grad cohort`}
            icon={GraduationCap}
            badge="Hover for Gender"
            className="cursor-pointer transition-all duration-200 group-hover:border-blue-300 group-hover:shadow-md"
          />
          {hoveredCard === 'pg' && activeStats.pgGender && (
            <div className="absolute top-full left-0 mt-1.5 w-64 bg-white rounded-xl shadow-xl border border-slate-200/90 p-3.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-600" /> PG & Doctoral Cohort
                </span>
                <span className="text-[10px] font-mono text-slate-500">{activeStats.pgCount.toLocaleString()} scholars</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between bg-blue-50/70 p-2 rounded-lg border border-blue-100">
                  <span className="text-blue-900 font-medium">PG Boys</span>
                  <span className="font-bold text-blue-950 font-mono">
                    {(activeStats.pgGender.boys || 0).toLocaleString()}{' '}
                    <span className="text-[10px] text-blue-600 font-normal">
                      ({activeStats.pgCount > 0 ? (((activeStats.pgGender.boys || 0) / activeStats.pgCount) * 100).toFixed(1) : 0}%)
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between bg-pink-50/70 p-2 rounded-lg border border-pink-100">
                  <span className="text-pink-900 font-medium">PG Girls</span>
                  <span className="font-bold text-pink-950 font-mono">
                    {(activeStats.pgGender.girls || 0).toLocaleString()}{' '}
                    <span className="text-[10px] text-pink-600 font-normal">
                      ({activeStats.pgCount > 0 ? (((activeStats.pgGender.girls || 0) / activeStats.pgCount) * 100).toFixed(1) : 0}%)
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Card 4: Active Students with Breakdown Popover */}
        <div
          className="relative group"
          onMouseEnter={() => setHoveredCard('active')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <StatCard
            title="Active Students"
            value={activeStats.activeCount.toLocaleString()}
            subtitle={`${activeStats.activePercent}% good standing`}
            icon={UserCheck}
            badge="Hover for Demographics"
            className="cursor-pointer transition-all duration-200 group-hover:border-blue-300 group-hover:shadow-md"
          />
          {hoveredCard === 'active' && (
            <div className="absolute top-full left-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200/90 p-3.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Active Student Demographics
                </span>
                <span className="text-[10px] font-mono text-slate-500">{activeStats.activeCount.toLocaleString()}</span>
              </div>

              {/* Gender Breakdown */}
              <div className="space-y-1.5 mb-2.5">
                <div className="flex items-center justify-between bg-blue-50/70 p-1.5 rounded-lg border border-blue-100 text-[11px]">
                  <span className="text-blue-900 font-medium">Active Boys</span>
                  <span className="font-bold text-blue-950 font-mono">
                    {((activeStats as any).activeBreakdown?.gender?.boys ?? Math.round(activeStats.activeCount * 0.52)).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-pink-50/70 p-1.5 rounded-lg border border-pink-100 text-[11px]">
                  <span className="text-pink-900 font-medium">Active Girls</span>
                  <span className="font-bold text-pink-950 font-mono">
                    {((activeStats as any).activeBreakdown?.gender?.girls ?? Math.round(activeStats.activeCount * 0.48)).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Program Level Breakdown */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Program Level
                </span>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-100 flex justify-between">
                    <span className="text-slate-600">UG:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {((activeStats as any).activeBreakdown?.programLevels?.UG ?? activeStats.ugCount).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-1.5 bg-slate-50 rounded border border-slate-100 flex justify-between">
                    <span className="text-slate-600">PG & Doc:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {((activeStats as any).activeBreakdown?.programLevels?.PG ?? activeStats.pgCount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Campus Distribution */}
              {(activeStats as any).activeBreakdown?.campuses && Object.keys((activeStats as any).activeBreakdown.campuses).length > 0 && (
                <div className="pt-2 border-t border-slate-100 mt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Campus Distribution
                  </span>
                  <div className="space-y-0.5 text-[10px] max-h-20 overflow-y-auto">
                    {Object.entries((activeStats as any).activeBreakdown.campuses).slice(0, 3).map(([campus, count]: any) => (
                      <div key={campus} className="flex justify-between text-slate-600 py-0.5">
                        <span className="truncate max-w-[170px]">{campus}</span>
                        <span className="font-mono font-semibold text-slate-800">{count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card 5: Academic Departments with Fixed 2-Level Hover Popover */}
        <div
          className="relative group"
          onMouseEnter={() => setHoveredCard('depts')}
          onMouseLeave={() => { setHoveredCard(null); setHoveredDept(null); }}
        >
          <StatCard
            title="Academic Departments"
            value={activeStats.depts}
            subtitle="Active departments"
            icon={Building2}
            badge="2-Level Hover"
            className="cursor-pointer transition-all duration-200 group-hover:border-blue-300 group-hover:shadow-md"
          />

          {/* Level 1 Popover: Department Headcounts */}
          {hoveredCard === 'depts' && activeStats.departmentList && activeStats.departmentList.length > 0 && (
            <div 
              className="absolute top-full right-0 mt-1.5 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-3 z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
              onMouseEnter={() => setHoveredCard('depts')}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" /> Academic Departments (Level 1)
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Hover/tap row for gender</span>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {activeStats.departmentList.map(deptItem => (
                  <div
                    key={deptItem.department}
                    className={`relative p-2 rounded-lg transition-all cursor-pointer flex items-center justify-between border ${
                      hoveredDept === deptItem.department
                        ? 'bg-blue-50/90 border-blue-200 shadow-xs'
                        : 'bg-slate-50/60 border-slate-100 hover:bg-slate-100/80 hover:border-slate-200'
                    }`}
                    onMouseEnter={() => setHoveredDept(deptItem.department)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHoveredDept(hoveredDept === deptItem.department ? null : deptItem.department);
                    }}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-800 truncate text-[11px] leading-tight">
                        {deptItem.department}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {activeStats.total > 0 ? ((deptItem.count / activeStats.total) * 100).toFixed(1) : 0}% share
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-bold text-slate-900 font-mono text-xs">
                        {deptItem.count.toLocaleString()}
                      </span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    </div>

                    {/* Level 2 Sub-Popover: Seamless bridge with zero mouseout gap */}
                    {hoveredDept === deptItem.department && (
                      <div 
                        className="absolute right-full top-0 pr-2 w-64 z-50 pointer-events-auto"
                        onMouseEnter={() => setHoveredDept(deptItem.department)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="bg-slate-900 text-white rounded-xl shadow-2xl p-3 text-xs border border-slate-800 animate-in fade-in slide-in-from-right-2 duration-150">
                          <div className="pb-1.5 mb-1.5 border-b border-slate-700/80">
                            <p className="font-bold text-[11px] text-white truncate">{deptItem.department}</p>
                            <p className="text-[10px] text-slate-400">Gender Distribution (Level 2)</p>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-blue-200 bg-blue-950/60 p-1.5 rounded border border-blue-800/50">
                              <span className="text-[11px]">Boys</span>
                              <span className="font-mono font-bold text-white">
                                {(deptItem.gender?.boys || 0).toLocaleString()}{' '}
                                <span className="text-[10px] text-blue-300 font-normal">
                                  ({deptItem.count > 0 ? (((deptItem.gender?.boys || 0) / deptItem.count) * 100).toFixed(1) : 0}%)
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-pink-200 bg-pink-950/60 p-1.5 rounded border border-pink-800/50">
                              <span className="text-[11px]">Girls</span>
                              <span className="font-mono font-bold text-white">
                                {(deptItem.gender?.girls || 0).toLocaleString()}{' '}
                                <span className="text-[10px] text-pink-300 font-normal">
                                  ({deptItem.count > 0 ? (((deptItem.gender?.girls || 0) / deptItem.count) * 100).toFixed(1) : 0}%)
                                </span>
                              </span>
                            </div>
                            {((deptItem.gender?.other || 0) > 0 || (deptItem.gender?.notSpecified || 0) > 0) && (
                              <div className="flex items-center justify-between text-slate-300 bg-slate-800 p-1.5 rounded text-[11px]">
                                <span>Other / Unspecified</span>
                                <span className="font-mono font-bold text-white">
                                  {((deptItem.gender?.other || 0) + (deptItem.gender?.notSpecified || 0)).toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Universal Filter Toolbar & View Mode Switcher */}
      <FilterToolbar
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search student name, reg no, course, class..."
        onReset={clearFilters}
        hasActiveFilters={
          Boolean(searchTerm) ||
          departmentFilter !== 'All' ||
          academicYearFilter !== 'All' ||
          programLevelFilter !== 'All' ||
          statusFilter !== 'All' ||
          genderFilter !== 'All'
        }
        totalResults={totalCount}
        resultLabel={`students (of ${(activeStats.total || totalCount).toLocaleString()} total)`}
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

        {/* Level Filter */}
        <select
          value={programLevelFilter}
          onChange={e => setProgramLevelFilter(e.target.value)}
          className="h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="All">All Program Levels</option>
          <option value="UG">UG (Undergraduate)</option>
          <option value="PG">PG (Postgraduate)</option>
          <option value="PhD">PhD (Doctoral)</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Graduated">Graduated</option>
          <option value="On Leave">On Leave</option>
        </select>

        {/* Gender Filter */}
        <select
          value={genderFilter}
          onChange={e => setGenderFilter(e.target.value)}
          className="h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="All">All Genders</option>
          <option value="Male">Male (Boys)</option>
          <option value="Female">Female (Girls)</option>
          <option value="Other">Other</option>
          <option value="Not Specified">Not Specified</option>
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="registerNumber-asc">Sort: Reg No (Asc)</option>
          <option value="name-asc">Sort: Name (A-Z)</option>
          <option value="department-asc">Sort: Department</option>
        </select>
      </FilterToolbar>

          {/* View Mode 1: Table Matrix */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Displaying Students:</span>
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                    {students.length} of {totalCount.toLocaleString()}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Official student registry and enrollment metrics</p>
              </div>

              <div
                ref={studentTableContainerRef}
                className={`overflow-x-auto ${isStudentTableVirtual ? 'max-h-[620px] overflow-y-auto' : ''}`}
              >
                <table className="w-full text-left border-collapse">
                  <thead className={isStudentTableVirtual ? 'sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs shadow-[0_1px_0_#E2E8F0]' : ''}>
                    <tr className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3 px-4">Register No</th>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Department & Course</th>
                      <th className="py-3 px-4 text-center">Level</th>
                      <th className="py-3 px-4">Class / Batch</th>
                      <th className="py-3 px-4 text-center">AY</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <GraduationCap className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-sm">No student records found</p>
                          <p className="text-xs mt-0.5">Try changing filters or uploading student data</p>
                        </td>
                      </tr>
                    ) : (
                      <>
                        {isStudentTableVirtual && studentTablePaddingTop > 0 && (
                          <tr style={{ height: `${studentTablePaddingTop}px` }} aria-hidden="true" className="border-0 p-0 pointer-events-none">
                            <td colSpan={8} style={{ padding: 0, border: 0, height: `${studentTablePaddingTop}px` }} />
                          </tr>
                        )}

                        {renderedStudentItems.map(({ item: st, index: idx }) => {
                          const initials = st.name
                            .split(' ')
                            .filter(Boolean)
                            .map(w => w[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase() || 'ST';

                          return (
                            <tr key={st.registerNumber || st.id || idx} className="hover:bg-slate-50/80 transition-colors group">
                              <td className="py-3 px-4 font-mono font-medium text-slate-900 text-xs">
                                {st.registerNumber}
                              </td>

                              <td className="py-3 px-4">
                                <div>
                                  <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                                    {st.name}
                                  </p>
                                  {st.email && (
                                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{st.email}</p>
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <p className="font-medium text-slate-800 text-[11px] truncate max-w-[220px]">
                                  {st.course || st.department}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate max-w-[220px]">
                                  {st.department}
                                </p>
                              </td>

                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                                  (st.programLevel || 'UG').toUpperCase() === 'UG'
                                    ? 'bg-slate-100 text-slate-700 border-slate-200/80'
                                    : 'bg-blue-50 text-blue-700 border-blue-200/80'
                                }`}>
                                  {st.programLevel || 'UG'}
                                </span>
                              </td>

                              <td className="py-3 px-4">
                                <p className="font-medium text-slate-800">{st.className || '—'}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{st.batch || '—'}</p>
                              </td>

                              <td className="py-3 px-4 text-center">
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                                  {st.academicYear || '2024-25'}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                                  st.status === 'Active'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                    : st.status === 'Graduated'
                                    ? 'bg-slate-100 text-slate-700 border-slate-200/80'
                                    : 'bg-amber-50 text-amber-700 border-amber-200/80'
                                }`}>
                                  {st.status || 'Active'}
                                </span>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    onClick={() => setViewingStudent(st)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-md"
                                    title="Inspect Profile"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>

                                  {user && (user.role === 'admin' || user.role === 'hod' || user.role === 'coordinator') && (
                                    <>
                                      <Button
                                        onClick={() => setEditingStudent(st)}
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md"
                                        title="Edit Student"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        onClick={() => handleDelete(st.id)}
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
                        })}

                        {isStudentTableVirtual && studentTablePaddingBottom > 0 && (
                          <tr style={{ height: `${studentTablePaddingBottom}px` }} aria-hidden="true" className="border-0 p-0 pointer-events-none">
                            <td colSpan={8} style={{ padding: 0, border: 0, height: `${studentTablePaddingBottom}px` }} />
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <div className="text-xs text-slate-500 font-medium">
                    Showing <span className="font-bold text-slate-700">{totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to <span className="font-bold text-slate-700">{Math.min(currentPage * pageSize, totalCount)}</span> of <span className="font-bold text-slate-700">{totalCount.toLocaleString()}</span> students
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1 || loading}
                      onClick={() => fetchStudents(currentPage - 1)}
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
                      onClick={() => fetchStudents(currentPage + 1)}
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
              {filteredStudents.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200/80">
                  <GraduationCap className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-700">No student records match your filters</p>
                </div>
              ) : (
                filteredStudents.map((st, idx) => {
                  const initials = st.name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'ST';

                  return (
                    <div
                      key={st.id || idx}
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
                                {st.name}
                              </h3>
                              <p className="text-[11px] font-mono text-slate-500">
                                {st.registerNumber}
                              </p>
                            </div>
                          </div>

                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                            (st.programLevel || 'UG').toUpperCase() === 'UG'
                              ? 'bg-slate-100 text-slate-700 border-slate-200/80'
                              : 'bg-blue-50 text-blue-700 border-blue-200/80'
                          }`}>
                            {st.programLevel || 'UG'}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <BookOpen className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{st.course || st.department}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <School className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{st.department}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>Batch: <strong>{st.batch || '—'}</strong> | Class: <strong>{st.className || '—'}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                          st.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                            : 'bg-slate-100 text-slate-700 border-slate-200/80'
                        }`}>
                          {st.status || 'Active'}
                        </span>

                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => setViewingStudent(st)}
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs font-medium text-blue-600 hover:bg-slate-100 rounded-md px-2"
                          >
                            Inspect
                          </Button>
                          {user && (user.role === 'admin' || user.role === 'hod' || user.role === 'coordinator') && (
                            <Button
                              onClick={() => setEditingStudent(st)}
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
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Department Distribution */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Enrollment by Department</h3>
                      <p className="text-xs text-slate-500">Student headcount distribution</p>
                    </div>
                    <Building2 className="w-4 h-4 text-slate-500" />
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {Object.entries(departmentCounts).map(([dept, count]) => {
                      const pct = ((count / (activeStats.total || 1)) * 100).toFixed(1);
                      return (
                        <div key={dept} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-700 truncate pr-2">{dept}</span>
                            <span className="font-semibold text-slate-900 tabular-nums">{count.toLocaleString()} ({pct}%)</span>
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

                {/* Program Level Breakdown */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Program Level Hierarchy</h3>
                      <p className="text-xs text-slate-500">UG, PG and Doctoral proportion</p>
                    </div>
                    <School className="w-4 h-4 text-slate-500" />
                  </div>

                  <div className="space-y-3">
                    {Object.entries(levelCounts).map(([lvl, count]) => {
                      const pct = ((count / (activeStats.total || 1)) * 100).toFixed(1);
                      return (
                        <div key={lvl} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-700 truncate pr-2">{lvl} Cohort</span>
                            <span className="font-semibold text-slate-900 tabular-nums">{count.toLocaleString()} ({pct}%)</span>
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

              {/* Geographic Diversity Analytics: Permanent State & Permanent Country */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Permanent State Diversity */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Permanent State-wise Diversity</h3>
                      <p className="text-xs text-slate-500">Geographic origin of enrolled students across India</p>
                    </div>
                    <MapPin className="w-4 h-4 text-emerald-600" />
                  </div>

                  {(() => {
                    // Compute from activeStats or dynamically from students
                    const stateEntries: Array<{ state: string; count: number }> = 
                      (activeStats as any).stateDiversity && (activeStats as any).stateDiversity.length > 0
                        ? (activeStats as any).stateDiversity
                        : (() => {
                            const counts: Record<string, number> = {};
                            students.forEach(s => {
                              const st = (s.permanentState || s.currentState || 'Karnataka').trim();
                              counts[st] = (counts[st] || 0) + 1;
                            });
                            return Object.entries(counts).map(([state, count]) => ({ state, count })).sort((a, b) => b.count - a.count);
                          })();

                    const totalSt = stateEntries.reduce((sum, item) => sum + item.count, 0) || 1;

                    return (
                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                        {stateEntries.slice(0, 15).map(({ state, count }) => {
                          const pct = ((count / totalSt) * 100).toFixed(1);
                          return (
                            <div key={state} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-slate-700 truncate pr-2">{state}</span>
                                <span className="font-mono font-semibold text-slate-900">{count.toLocaleString()} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, Number(pct))}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Permanent Country Diversity */}
                <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Country-wise International Diversity</h3>
                      <p className="text-xs text-slate-500">Permanent nationality & international admissions representation</p>
                    </div>
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>

                  {(() => {
                    const countryEntries: Array<{ country: string; count: number }> = 
                      (activeStats as any).countryDiversity && (activeStats as any).countryDiversity.length > 0
                        ? (activeStats as any).countryDiversity
                        : (() => {
                            const counts: Record<string, number> = {};
                            students.forEach(s => {
                              const c = (s.permanentCountry || s.nationality || 'India').trim();
                              counts[c] = (counts[c] || 0) + 1;
                            });
                            return Object.entries(counts).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count);
                          })();

                    const totalC = countryEntries.reduce((sum, item) => sum + item.count, 0) || 1;

                    return (
                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                        {countryEntries.slice(0, 15).map(({ country, count }) => {
                          const pct = ((count / totalC) * 100).toFixed(1);
                          return (
                            <div key={country} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-slate-700 truncate pr-2">{country}</span>
                                <span className="font-mono font-semibold text-slate-900">{count.toLocaleString()} ({pct}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, Number(pct))}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        token={user?.token || ''}
        uploadType="students"
        onSuccess={fetchStudents}
      />

      {/* View Student Detail Drawer with Complete Profile Fields */}
      <DetailDrawer
        isOpen={Boolean(viewingStudent)}
        onClose={() => setViewingStudent(null)}
        title={viewingStudent?.name || 'Student Dossier'}
        subtitle={`Reg No: ${viewingStudent?.registerNumber || '—'}`}
        badge={
          viewingStudent && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#2F4692]/10 text-[#2F4692] border border-[#2F4692]/20">
              {viewingStudent.programLevel || 'UG'}
            </span>
          )
        }
        footer={
          <button
            type="button"
            onClick={() => setViewingStudent(null)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Close
          </button>
        }
      >
        {viewingStudent && (
          <div className="space-y-5 text-xs">
            {/* 1. Identity & Registration */}
            <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200">
              <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600" /> Identity & Registration
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-500 font-medium">Register Number</p>
                  <p className="font-semibold text-slate-900 mt-0.5 font-mono">{viewingStudent.registerNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Application Number</p>
                  <p className="font-semibold text-slate-900 mt-0.5 font-mono">{viewingStudent.applicationNo || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Class Name / Section</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.className || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Batch</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.batch || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Admission Date</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.admissionDate || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Enrollment Status</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                      viewingStudent.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {viewingStudent.status || 'Active'}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Personal Details */}
            <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200">
              <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-600" /> Personal Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-500 font-medium">Full Name</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.name || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Gender</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.gender || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Date of Birth</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.dob || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Blood Group</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.bloodGroup || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Caste / Category</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.caste || 'General'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Nationality</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.nationality || 'Indian'}</p>
                </div>
              </div>
            </div>

            {/* 3. Contact Details */}
            <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200">
              <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-emerald-600" /> Contact Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-500 font-medium">Official Email</p>
                  <p className="font-semibold text-slate-900 mt-0.5 font-mono">{viewingStudent.email || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Mobile Phone</p>
                  <p className="font-semibold text-slate-900 mt-0.5 font-mono">{viewingStudent.mobileNo || viewingStudent.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Parent / Alternate Mobile</p>
                  <p className="font-semibold text-slate-900 mt-0.5 font-mono">{viewingStudent.parentMobileNo || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Guardian Name</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.guardianName || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Guardian Phone</p>
                  <p className="font-semibold text-slate-900 mt-0.5 font-mono">{viewingStudent.guardianPhone || '—'}</p>
                </div>
              </div>
            </div>

            {/* 4. Residential & Permanent Address */}
            <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200">
              <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-600" /> Address & Location
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <p className="text-slate-500 font-medium">Current Address</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.address || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Current City & State</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {viewingStudent.currentCity || '—'}{viewingStudent.currentState ? `, ${viewingStudent.currentState}` : ''}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Permanent City & State</p>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {viewingStudent.permanentCity || '—'}{viewingStudent.permanentState ? `, ${viewingStudent.permanentState}` : ''}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500 font-medium">Permanent Country</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.permanentCountry || viewingStudent.nationality || 'India'}</p>
                </div>
              </div>
            </div>

            {/* 5. Academic & Institutional Details */}
            <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200">
              <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#2F4692]" /> Academic & Institutional
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-500 font-medium">Campus</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.campus || 'Bangalore Central Campus'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">School</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.school || 'School of Sciences'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Department</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.department || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Program / Course</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.course || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Program Level</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.programLevel || 'UG'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Previous School</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.previousSchool || '—'}</p>
                </div>
              </div>
            </div>

            {/* 6. Disability Information */}
            <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200">
              <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-600" /> Disability Information
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-500 font-medium">Physically Handicapped</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.handicapped || (viewingStudent.disability ? 'Yes' : 'No')}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Disability Type</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.disability || 'None'}</p>
                </div>
                {viewingStudent.handicappedDescription && (
                  <div className="col-span-2">
                    <p className="text-slate-500 font-medium">Description / Accommodations</p>
                    <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.handicappedDescription}</p>
                  </div>
                )}
              </div>
            </div>

            {/* 7. Academic Enrollment History Timeline */}
            {viewingStudent.enrollments && viewingStudent.enrollments.length > 0 && (
              <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200">
                <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-blue-600" /> Academic Enrollment History ({viewingStudent.enrollments.length} Years)
                </p>
                <div className="space-y-2.5">
                  {viewingStudent.enrollments.map((enr, idx) => (
                    <div key={enr.id || idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            AY {enr.academicYear}
                          </span>
                          <span className="font-semibold text-slate-800 text-xs">{enr.department}</span>
                          {enr.isFirstYearSH && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
                              First-Year S&H
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {enr.course || enr.program} &bull; Class: {enr.className || '—'} &bull; Batch: {enr.batch || '—'}
                        </p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        enr.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {enr.status || 'Active'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DetailDrawer>

      {/* Add Student Modal */}
      <FormModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        title="Register Student Record"
        description="Enroll a new student record into the departmental academic cohort."
        icon={Plus}
        submitLabel="Save Student Record"
        onSubmit={handleAddSubmit}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Student Full Name" required>
            <FormInput 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
              placeholder="Full name"
              required 
            />
          </FormField>
          <FormField label="Register Number" required>
            <FormInput 
              value={formData.registerNumber} 
              onChange={e => setFormData({ ...formData, registerNumber: e.target.value })} 
              placeholder="e.g. 2447101"
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
          <FormField label="Program Level" required>
            <FormSelect 
              value={formData.programLevel} 
              onChange={e => setFormData({ ...formData, programLevel: e.target.value })} 
            >
              <option value="UG">UG</option>
              <option value="PG">PG</option>
              <option value="PhD">PhD</option>
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
          <FormField label="Batch">
            <FormInput 
              value={formData.batch || ''} 
              onChange={e => setFormData({ ...formData, batch: e.target.value })} 
              placeholder="e.g. 2024 - 2028"
            />
          </FormField>
        </div>
      </FormModal>

      {/* Edit Student Modal */}
      <FormModal
        open={!!editingStudent}
        onOpenChange={(open) => !open && setEditingStudent(null)}
        title="Modify Student Profile"
        description="Update student academic enrolment details, department, or cohort status."
        icon={Edit}
        submitLabel="Update Student Record"
        onSubmit={handleEditSubmit}
      >
        {editingStudent && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Student Full Name" required>
              <FormInput 
                value={editingStudent.name} 
                onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })} 
                required 
              />
            </FormField>
            <FormField label="Register Number" required>
              <FormInput 
                value={editingStudent.registerNumber} 
                onChange={e => setEditingStudent({ ...editingStudent, registerNumber: e.target.value })} 
                required 
              />
            </FormField>
            <FormField label="Department" required>
              <FormSelect 
                value={editingStudent.department} 
                onChange={e => setEditingStudent({ ...editingStudent, department: e.target.value })} 
              >
                {departmentsList.map((d, i) => <option key={i} value={d}>{d}</option>)}
              </FormSelect>
            </FormField>
            <FormField label="Enrolment Status" required>
              <FormSelect 
                value={editingStudent.status} 
                onChange={e => setEditingStudent({ ...editingStudent, status: e.target.value as any })} 
              >
                <option value="Active">Active</option>
                <option value="Graduated">Graduated</option>
                <option value="On Leave">On Leave</option>
              </FormSelect>
            </FormField>
          </div>
        )}
      </FormModal>

      {/* Clear Data Confirmation Dialog */}
      <Dialog open={isClearOpen} onOpenChange={setIsClearOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Clear All Student Records
            </DialogTitle>
            <DialogDescription className="py-2 text-slate-600">
              Are you sure you want to permanently delete all student cohort and enrollment records? This action is irreversible and will remove all student data for this section.
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
    </AppShell>
  );
}

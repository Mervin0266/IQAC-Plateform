import React, { useState, useMemo, useEffect } from 'react';
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
  AlertTriangle
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
  parentMobileNo?: string;
  handicapped?: string;
  handicappedDescription?: string;
  disability?: string;
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

  // Dynamic KPI Stats from backend
  const [stats, setStats] = useState({
    total: 0,
    ugCount: 0,
    ugPercent: '0',
    pgCount: 0,
    pgPercent: '0',
    activeCount: 0,
    activePercent: '0',
    depts: 0
  });

  const [departmentCounts, setDepartmentCounts] = useState<Record<string, number>>({});
  const [levelCounts, setLevelCounts] = useState<Record<string, number>>({});
  const [dbAcademicYears, setDbAcademicYears] = useState<string[]>([]);

  // Filters & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [academicYearFilter, setAcademicYearFilter] = useState('All');
  const [programLevelFilter, setProgramLevelFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
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
  }, [user, academicYearFilter, departmentFilter, programLevelFilter, statusFilter, sortBy, debouncedSearch]);

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
          ugCount: 0,
          ugPercent: '0',
          pgCount: 0,
          pgPercent: '0',
          activeCount: 0,
          activePercent: '0',
          depts: 0
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
    handicappedDescription: 'NIL',
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
      ugCount,
      ugPercent: total > 0 ? ((ugCount / total) * 100).toFixed(1) : '0',
      pgCount,
      pgPercent: total > 0 ? ((pgCount / total) * 100).toFixed(1) : '0',
      activeCount,
      activePercent: total > 0 ? ((activeCount / total) * 100).toFixed(1) : '0',
      depts
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
      handicappedDescription: 'NIL',
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

      {/* 2. 5 Unified Institutional KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Enrollment"
          value={activeStats.total.toLocaleString()}
          subtitle="Active & registered students"
          icon={Users}
        />
        <StatCard
          title="UG Cohort"
          value={activeStats.ugCount.toLocaleString()}
          subtitle={`${activeStats.ugPercent}% undergraduate share`}
          icon={School}
        />
        <StatCard
          title="PG & Scholars"
          value={activeStats.pgCount.toLocaleString()}
          subtitle={`${activeStats.pgPercent}% post-grad cohort`}
          icon={GraduationCap}
        />
        <StatCard
          title="Good Standing"
          value={activeStats.activeCount.toLocaleString()}
          subtitle={`${activeStats.activePercent}% active status`}
          icon={UserCheck}
        />
        <StatCard
          title="Disciplines"
          value={activeStats.depts}
          subtitle="Academic departments"
          icon={Building2}
        />
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
          statusFilter !== 'All'
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

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
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
                      filteredStudents.map((st, idx) => {
                        const initials = st.name
                          .split(' ')
                          .filter(Boolean)
                          .map(w => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || 'ST';

                        return (
                          <tr key={st.id || idx} className="hover:bg-slate-50/80 transition-colors group">
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
                      })
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

                <div className="space-y-3">
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
          )}

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        token={user?.token || ''}
        uploadType="students"
        onSuccess={fetchStudents}
      />

      {/* View Student Detail Drawer */}
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
            {/* Academic Enrollment */}
            <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200">
              <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#2F4692]" /> Academic Enrollment
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-500 font-medium">Department</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.department || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Course</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.course || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Class / Section</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.className || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Batch & Academic Year</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.batch || '—'} (AY {viewingStudent.academicYear || '2024-25'})</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Enrollment Status</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.status || 'Active'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Gender</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.gender || '—'}</p>
                </div>
              </div>
            </div>

            {/* Contact & Demographics */}
            <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200">
              <p className="font-semibold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-emerald-600" /> Contact & Demographics
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-500 font-medium">Student Email</p>
                  <p className="font-semibold text-slate-900 mt-0.5 font-mono">{viewingStudent.email || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Mobile Phone</p>
                  <p className="font-semibold text-slate-900 mt-0.5 font-mono">{viewingStudent.mobileNo || viewingStudent.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Guardian Name</p>
                  <p className="font-semibold text-slate-900 mt-0.5">{viewingStudent.guardianName || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Guardian Phone</p>
                  <p className="font-semibold text-slate-900 mt-0.5 font-mono">{viewingStudent.guardianPhone || viewingStudent.parentMobileNo || '—'}</p>
                </div>
              </div>
            </div>
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

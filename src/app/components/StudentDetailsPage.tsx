import React, { useState, useMemo } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
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
  Layers
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BulkUploadDialog } from './BulkUploadDialog';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';

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

  const fetchStudents = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/students`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.status === 401) {
        logout();
        return;
      }
      const data = await response.json();
      if (data.success) {
        setStudents(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStudents();
  }, [user]);

  // Filters & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [academicYearFilter, setAcademicYearFilter] = useState('All');
  const [programLevelFilter, setProgramLevelFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState<string>('registerNumber-asc');

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
    const yearsSet = new Set<string>();
    students.forEach(st => {
      if (st.academicYear) {
        yearsSet.add(st.academicYear);
      }
    });
    if (yearsSet.size === 0) {
      return ['2025-2026', '2024-2025', '2023-2024', '2022-2023', '2021-2022'];
    }
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [students]);

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    let list = students.filter(student => {
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        !searchLower ||
        student.name.toLowerCase().includes(searchLower) ||
        student.registerNumber.toLowerCase().includes(searchLower) ||
        (student.email && student.email.toLowerCase().includes(searchLower)) ||
        (student.course && student.course.toLowerCase().includes(searchLower)) ||
        (student.department && student.department.toLowerCase().includes(searchLower)) ||
        (student.className && student.className.toLowerCase().includes(searchLower)) ||
        (student.campus && student.campus.toLowerCase().includes(searchLower));

      const matchesDept = departmentFilter === 'All' || (student.department || '').toLowerCase().trim() === departmentFilter.toLowerCase().trim();
      const matchesYear = academicYearFilter === 'All' || (student.academicYear || '2024-2025').toLowerCase().trim() === academicYearFilter.toLowerCase().trim();
      const matchesLevel = programLevelFilter === 'All' || (student.programLevel || '').toLowerCase().trim() === programLevelFilter.toLowerCase().trim();
      const matchesStatus = statusFilter === 'All' || (student.status || '').toLowerCase().trim() === statusFilter.toLowerCase().trim();

      return matchesSearch && matchesDept && matchesYear && matchesLevel && matchesStatus;
    });

    return list.sort((a, b) => {
      const [field, order] = sortBy.split('-');
      const isAsc = order === 'asc';

      let valA: any = a[field as keyof Student];
      let valB: any = b[field as keyof Student];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      valA = String(valA).toLowerCase().trim();
      valB = String(valB).toLowerCase().trim();

      if (valA < valB) return isAsc ? -1 : 1;
      if (valA > valB) return isAsc ? 1 : -1;
      return 0;
    });
  }, [students, searchTerm, departmentFilter, academicYearFilter, programLevelFilter, statusFilter, sortBy]);

  // Executive KPI Stats
  const stats = useMemo(() => {
    const total = filteredStudents.length;
    const ugCount = filteredStudents.filter(s => (s.programLevel || '').toUpperCase() === 'UG').length;
    const pgCount = filteredStudents.filter(s => {
      const lvl = (s.programLevel || '').toUpperCase();
      return lvl === 'PG' || lvl === 'PHD';
    }).length;
    const activeCount = filteredStudents.filter(s => s.status === 'Active').length;
    const depts = new Set(filteredStudents.map(s => s.department).filter(Boolean)).size;

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
  }, [filteredStudents]);

  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredStudents.forEach(st => {
      if (st.department) {
        counts[st.department] = (counts[st.department] || 0) + 1;
      }
    });
    return counts;
  }, [filteredStudents]);

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredStudents.forEach(st => {
      const lvl = st.programLevel || 'UG';
      counts[lvl] = (counts[lvl] || 0) + 1;
    });
    return counts;
  }, [filteredStudents]);

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

  const exportToCSV = () => {
    const headerRow = 'Register No,Name,Department,Course,Program Level,Class,Batch,Academic Year,Gender,Status,Email,Mobile No';
    const rows = filteredStudents.map((s) =>
      `"${s.registerNumber}","${s.name}","${s.department || ''}","${s.course || ''}","${s.programLevel || ''}","${s.className || ''}","${s.batch || ''}","${s.academicYear || '2024-2025'}","${s.gender || ''}","${s.status || 'Active'}","${s.email || ''}","${s.mobileNo || s.phone || ''}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Student_Directory_${academicYearFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('All');
    setAcademicYearFilter('All');
    setProgramLevelFilter('All');
    setStatusFilter('All');
    setSortBy('registerNumber-asc');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar currentPage="student-details" onNavigate={onNavigate} />

      <main className="ml-64 flex-1 min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#2f4692] to-[#1e2f65] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#2f4692]/20 ring-4 ring-[#2f4692]/10">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Student Enrollment Intelligence
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Undergraduate, postgraduate & doctoral cohort records, admission status and class lineages
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                onClick={fetchStudents}
                variant="outline"
                className="border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold h-9 rounded-xl flex items-center gap-1.5"
                title="Refresh Records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Sync Data</span>
              </Button>

              <Button
                onClick={exportToCSV}
                variant="outline"
                className="border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold h-9 rounded-xl flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Report</span>
              </Button>

              {user && (user.role === 'admin' || user.role === 'hod' || user.role === 'coordinator') && (
                <>
                  <Button
                    onClick={() => setIsBulkUploadOpen(true)}
                    variant="outline"
                    className="border-teal-200 hover:bg-teal-50 text-teal-700 text-xs font-semibold h-9 rounded-xl flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Bulk Upload</span>
                  </Button>

                  <Button
                    onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                    className="bg-gradient-to-r from-[#2f4692] to-[#1e2f65] hover:from-[#243a7a] hover:to-[#172450] text-white text-xs font-bold h-9 rounded-xl shadow-md shadow-[#2f4692]/20 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Student</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* 5 Enterprise KPI Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Card 1: Total Students */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4692] to-blue-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Enrollment</p>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2f4692] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">{stats.total}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                Active & registered students
              </p>
            </div>

            {/* Card 2: UG Cohort */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">UG Cohort</p>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <School className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-700 tracking-tight mt-2">{stats.ugCount}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                <span className="text-emerald-600 font-bold">{stats.ugPercent}%</span> undergraduate share
              </p>
            </div>

            {/* Card 3: PG & Doctoral */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">PG & Scholars</p>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-purple-700 tracking-tight mt-2">{stats.pgCount}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                <span className="text-purple-600 font-bold">{stats.pgPercent}%</span> post-grad cohort
              </p>
            </div>

            {/* Card 4: Active Enrolled */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Good Standing</p>
                <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">{stats.activeCount}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                <span className="text-emerald-600 font-bold">{stats.activePercent}%</span> active status
              </p>
            </div>

            {/* Card 5: Departments */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Disciplines</p>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">{stats.depts}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                Academic departments
              </p>
            </div>
          </div>

          {/* Single Unified Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search student name, reg no, course, class..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 pr-8 text-xs h-9 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* AY Filter */}
              <select
                value={academicYearFilter}
                onChange={e => setAcademicYearFilter(e.target.value)}
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2f4692]"
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
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2f4692]"
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
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2f4692]"
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
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2f4692]"
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
                className="h-9 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-blue-50/50 text-[#2f4692] focus:outline-none"
              >
                <option value="registerNumber-asc">Sort: Reg No (Asc)</option>
                <option value="name-asc">Sort: Name (A-Z)</option>
                <option value="department-asc">Sort: Department</option>
              </select>

              {(searchTerm || departmentFilter !== 'All' || academicYearFilter !== 'All' || programLevelFilter !== 'All' || statusFilter !== 'All') && (
                <Button
                  onClick={clearFilters}
                  variant="ghost"
                  className="h-9 text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 px-2.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </Button>
              )}
            </div>

            {/* View Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-[#2f4692] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Matrix</span>
              </button>

              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white text-[#2f4692] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Profiles</span>
              </button>

              <button
                onClick={() => setViewMode('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'analytics'
                    ? 'bg-white text-[#2f4692] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Analytics</span>
              </button>
            </div>
          </div>

          {/* View Mode 1: Table Matrix */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Displaying Students:</span>
                  <span className="text-xs font-black text-[#2f4692] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    {filteredStudents.length} of {students.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Official student registry and enrollment metrics</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-4">Register No</th>
                      <th className="py-3.5 px-4">Student Name</th>
                      <th className="py-3.5 px-4">Department & Course</th>
                      <th className="py-3.5 px-4 text-center">Level</th>
                      <th className="py-3.5 px-4">Class / Batch</th>
                      <th className="py-3.5 px-4 text-center">AY</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
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
                          <tr key={st.id || idx} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 text-xs">
                              {st.registerNumber}
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#2f4692] to-[#1e2f65] text-white flex items-center justify-center text-[10px] font-black shadow-sm">
                                  {initials}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 group-hover:text-[#2f4692] transition-colors">
                                    {st.name}
                                  </p>
                                  {st.email && (
                                    <p className="text-[10px] text-slate-400 font-mono">{st.email}</p>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <p className="font-semibold text-slate-800 text-[11px] truncate max-w-[220px]">
                                {st.course || st.department}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate max-w-[220px]">
                                {st.department}
                              </p>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                (st.programLevel || 'UG').toUpperCase() === 'UG'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                  : 'bg-purple-50 text-purple-700 border border-purple-200/60'
                              }`}>
                                {st.programLevel || 'UG'}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <p className="font-semibold text-slate-800">{st.className || '—'}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{st.batch || '—'}</p>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                                {st.academicYear || '2024-25'}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                st.status === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                  : st.status === 'Graduated'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200/60'
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
                                  className="h-7 w-7 p-0 text-slate-500 hover:text-[#2f4692] hover:bg-blue-50 rounded-lg"
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
                                      className="h-7 w-7 p-0 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                                      title="Edit Student"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      onClick={() => handleDelete(st.id)}
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
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
              </div>
            </div>
          )}

          {/* View Mode 2: Card Grid */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
                  <GraduationCap className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-700">No student records match your filters</p>
                </div>
              ) : (
                filteredStudents.map((st, idx) => {
                  const initials = st.name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'ST';

                  return (
                    <div
                      key={st.id || idx}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2f4692] to-[#1e2f65] text-white flex items-center justify-center text-sm font-black shadow-md shadow-blue-200">
                              {initials}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#2f4692] transition-colors leading-snug">
                                {st.name}
                              </h3>
                              <p className="text-[11px] font-mono text-[#2f4692] font-bold">
                                {st.registerNumber}
                              </p>
                            </div>
                          </div>

                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            (st.programLevel || 'UG').toUpperCase() === 'UG'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}>
                            {st.programLevel || 'UG'}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
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
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          st.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {st.status || 'Active'}
                        </span>

                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => setViewingStudent(st)}
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs font-bold text-[#2f4692] hover:bg-blue-50 rounded-lg px-2"
                          >
                            Inspect
                          </Button>
                          {user && (user.role === 'admin' || user.role === 'hod' || user.role === 'coordinator') && (
                            <Button
                              onClick={() => setEditingStudent(st)}
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-lg px-2"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Department Distribution */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Enrollment by Department</h3>
                    <p className="text-xs text-slate-400">Student headcount distribution</p>
                  </div>
                  <Building2 className="w-5 h-5 text-[#2f4692]" />
                </div>

                <div className="space-y-3">
                  {Object.entries(departmentCounts).map(([dept, count]) => {
                    const pct = ((count / (stats.total || 1)) * 100).toFixed(0);
                    return (
                      <div key={dept} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 truncate pr-2">{dept}</span>
                          <span className="font-bold text-slate-900">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#2f4692] to-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Program Level Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Program Level Hierarchy</h3>
                    <p className="text-xs text-slate-400">UG, PG and Doctoral proportion</p>
                  </div>
                  <School className="w-5 h-5 text-emerald-600" />
                </div>

                <div className="space-y-3">
                  {Object.entries(levelCounts).map(([lvl, count]) => {
                    const pct = ((count / (stats.total || 1)) * 100).toFixed(0);
                    return (
                      <div key={lvl} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 truncate pr-2">{lvl} Cohort</span>
                          <span className="font-bold text-slate-900">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full transition-all duration-500"
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
        </div>
      </main>

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        token={user?.token || ''}
        uploadType="students"
        onSuccess={fetchStudents}
      />

      {/* View Student Detail Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewingStudent(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-[#2f4692] to-[#1e2f65] text-white rounded-2xl flex items-center justify-center text-lg font-black shadow-lg shadow-[#2f4692]/20">
                {viewingStudent.name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">{viewingStudent.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-[#2f4692] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    {viewingStudent.registerNumber}
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    {viewingStudent.programLevel || 'UG'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                <p className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#2f4692]" /> Academic Enrollment
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-slate-400 font-medium">Department</p>
                    <p className="font-bold text-slate-900 mt-0.5">{viewingStudent.department || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Course</p>
                    <p className="font-bold text-slate-900 mt-0.5">{viewingStudent.course || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Class Name</p>
                    <p className="font-bold text-slate-900 mt-0.5">{viewingStudent.className || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Batch & AY</p>
                    <p className="font-bold text-slate-900 mt-0.5">{viewingStudent.batch || '—'} (AY {viewingStudent.academicYear || '2024-25'})</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                <p className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-600" /> Contact & Demographics
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-slate-400 font-medium">Email Address</p>
                    <p className="font-bold text-slate-900 mt-0.5 font-mono">{viewingStudent.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Mobile Phone</p>
                    <p className="font-bold text-slate-900 mt-0.5 font-mono">{viewingStudent.mobileNo || viewingStudent.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Guardian Name</p>
                    <p className="font-bold text-slate-900 mt-0.5">{viewingStudent.guardianName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Guardian Phone</p>
                    <p className="font-bold text-slate-900 mt-0.5 font-mono">{viewingStudent.guardianPhone || viewingStudent.parentMobileNo || '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setViewingStudent(null)} className="bg-[#2f4692] hover:bg-[#243a7a] text-white text-xs font-bold rounded-xl px-5 h-9">
                Close Inspection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#2f4692]" /> Register Student Record
            </h2>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student Name</label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    placeholder="Full name"
                    required 
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Register Number</label>
                  <Input 
                    value={formData.registerNumber} 
                    onChange={e => setFormData({ ...formData, registerNumber: e.target.value })} 
                    placeholder="e.g. 2447101"
                    required 
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select 
                    value={formData.department} 
                    onChange={e => setFormData({ ...formData, department: e.target.value })} 
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-white font-medium"
                  >
                    {departmentsList.map((d, i) => <option key={i} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Program Level</label>
                  <select 
                    value={formData.programLevel} 
                    onChange={e => setFormData({ ...formData, programLevel: e.target.value })} 
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-white font-medium"
                  >
                    <option value="UG">UG</option>
                    <option value="PG">PG</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year</label>
                  <select 
                    value={formData.academicYear || '2024-2025'} 
                    onChange={e => setFormData({ ...formData, academicYear: e.target.value })} 
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-white font-medium"
                  >
                    <option value="2025-2026">2025-2026</option>
                    <option value="2024-2025">2024-2025</option>
                    <option value="2023-2024">2023-2024</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Batch</label>
                  <Input 
                    value={formData.batch || ''} 
                    onChange={e => setFormData({ ...formData, batch: e.target.value })} 
                    placeholder="e.g. 2024 - 2028"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} className="rounded-xl text-xs h-9">
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#2f4692] hover:bg-[#243a7a] text-white rounded-xl text-xs font-bold h-9">
                  Save Student Record
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingStudent(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <Edit className="w-5 h-5 text-amber-600" /> Modify Student Profile
            </h2>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student Name</label>
                  <Input 
                    value={editingStudent.name} 
                    onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })} 
                    required 
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Register Number</label>
                  <Input 
                    value={editingStudent.registerNumber} 
                    onChange={e => setEditingStudent({ ...editingStudent, registerNumber: e.target.value })} 
                    required 
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select 
                    value={editingStudent.department} 
                    onChange={e => setEditingStudent({ ...editingStudent, department: e.target.value })} 
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-white"
                  >
                    {departmentsList.map((d, i) => <option key={i} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select 
                    value={editingStudent.status} 
                    onChange={e => setEditingStudent({ ...editingStudent, status: e.target.value as any })} 
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Graduated">Graduated</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setEditingStudent(null)} className="rounded-xl text-xs h-9">
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#2f4692] hover:bg-[#243a7a] text-white rounded-xl text-xs font-bold h-9">
                  Update Student Record
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Users, 
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
  FileSpreadsheet
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BulkUploadDialog } from './BulkUploadDialog';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';

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

export function FacultyDetailsPage({ onNavigate }: FacultyDetailsPageProps) {
  const { user, logout } = useAuth();

  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'analytics'>('table');

  const fetchFaculty = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/faculty`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.status === 401) {
        logout();
        return;
      }
      const data = await response.json();
      if (data.success) {
        setFacultyList(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching faculty:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchFaculty();
  }, [user]);

  // Filters & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [academicYearFilter, setAcademicYearFilter] = useState('All');
  const [designationFilter, setDesignationFilter] = useState('All');
  const [sortBy, setSortBy] = useState<string>('name-asc');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingFaculty, setViewingFaculty] = useState<Faculty | null>(null);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);

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

  const designationsList = [
    'Head of Department',
    'Professor',
    'Associate Professor',
    'Assistant Professor',
    'Dean',
    'Professor of Practice',
    'Adjunct Faculty'
  ];

  // Dynamically compute available Academic Years from faculty records
  const availableAcademicYears = useMemo(() => {
    const yearsSet = new Set<string>();
    facultyList.forEach(fac => {
      if (fac.academicYear) {
        yearsSet.add(fac.academicYear);
      }
    });
    if (yearsSet.size === 0) {
      return ['2025-2026', '2024-2025', '2023-2024', '2022-2023', '2021-2022'];
    }
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [facultyList]);

  // Normalized faculty records to consolidate casing and formatting variations
  const normalizedFacultyList = useMemo(() => {
    return facultyList.map(fac => ({
      ...fac,
      department: normalizeDepartmentName(fac.department),
      designation: normalizeDesignationName(fac.designation)
    }));
  }, [facultyList]);

  // Filtered & Deduplicated Faculty List
  const filteredFaculty = useMemo(() => {
    let list = normalizedFacultyList.filter(fac => {
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        fac.name.toLowerCase().includes(searchLower) ||
        fac.employeeId.toLowerCase().includes(searchLower) ||
        fac.department.toLowerCase().includes(searchLower) ||
        fac.designation.toLowerCase().includes(searchLower) ||
        (fac.email && fac.email.toLowerCase().includes(searchLower)) ||
        (fac.highestQualification && fac.highestQualification.toLowerCase().includes(searchLower)) ||
        (fac.qualificationLevel && fac.qualificationLevel.toLowerCase().includes(searchLower));

      const matchesDept = departmentFilter === 'All' || fac.department.toLowerCase().trim() === departmentFilter.toLowerCase().trim();
      const matchesDesig = designationFilter === 'All' || fac.designation.toLowerCase().trim() === designationFilter.toLowerCase().trim();
      const matchesYear = academicYearFilter === 'All' || (fac.academicYear || '2024-2025').toLowerCase().trim() === academicYearFilter.toLowerCase().trim();

      return matchesSearch && matchesDept && matchesDesig && matchesYear;
    });

    if (academicYearFilter === 'All') {
      const uniqueMap = new Map<string, Faculty>();
      list.forEach(fac => {
        const key = fac.employeeId && fac.employeeId !== 'NIL'
          ? fac.employeeId.toLowerCase().trim()
          : `${fac.name.toLowerCase().trim()}_${fac.department.toLowerCase().trim()}`;

        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, fac);
        } else {
          const existing = uniqueMap.get(key)!;
          const yearCurr = fac.academicYear || '2024-2025';
          const yearExist = existing.academicYear || '2024-2025';
          if (yearCurr.localeCompare(yearExist) > 0) {
            uniqueMap.set(key, fac);
          }
        }
      });
      list = Array.from(uniqueMap.values());
    }

    return list.sort((a, b) => {
      const [field, order] = sortBy.split('-');
      const isAsc = order === 'asc';

      let valA: any = a[field as keyof Faculty];
      let valB: any = b[field as keyof Faculty];

      if (field === 'sNo') {
        const numA = valA !== null && valA !== undefined ? Number(valA) : (isAsc ? Infinity : -Infinity);
        const numB = valB !== null && valB !== undefined ? Number(valB) : (isAsc ? Infinity : -Infinity);
        return isAsc ? numA - numB : numB - numA;
      }

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      valA = String(valA).toLowerCase().trim();
      valB = String(valB).toLowerCase().trim();

      if (valA < valB) return isAsc ? -1 : 1;
      if (valA > valB) return isAsc ? 1 : -1;
      return 0;
    });
  }, [normalizedFacultyList, searchTerm, departmentFilter, designationFilter, academicYearFilter, sortBy]);

  // Statistics Computations
  const stats = useMemo(() => {
    const total = filteredFaculty.length;
    const phdCount = filteredFaculty.filter(f => 
      (f.highestQualification && f.highestQualification.toUpperCase().includes('PHD')) ||
      (f.qualificationLevel && f.qualificationLevel.toUpperCase().includes('PHD')) ||
      (f.highestQualification && f.highestQualification.toUpperCase().includes('DOCTOR'))
    ).length;
    
    const seniorCadre = filteredFaculty.filter(f => 
      f.designation.toLowerCase().includes('professor') ||
      f.designation.toLowerCase().includes('head') ||
      f.designation.toLowerCase().includes('dean')
    ).length;

    const depts = new Set(filteredFaculty.map(f => f.department).filter(Boolean)).size;

    let totalExpYears = 0;
    filteredFaculty.forEach(f => {
      const prevY = parseFloat(f.prevTeachingExpYears || '0') || 0;
      const prevInd = parseFloat(f.prevIndustryExpYears || '0') || 0;
      const cuY = parseFloat(f.cuExpYears || '0') || 0;
      totalExpYears += (prevY + prevInd + cuY);
    });
    const avgExp = total > 0 ? (totalExpYears / total).toFixed(1) : '0';

    return {
      total,
      phdCount,
      phdPercent: total > 0 ? ((phdCount / total) * 100).toFixed(1) : '0',
      seniorCadre,
      seniorPercent: total > 0 ? ((seniorCadre / total) * 100).toFixed(1) : '0',
      depts,
      avgExp
    };
  }, [filteredFaculty]);

  const designationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredFaculty.forEach(fac => {
      if (fac.designation) {
        counts[fac.designation] = (counts[fac.designation] || 0) + 1;
      }
    });
    return counts;
  }, [filteredFaculty]);

  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredFaculty.forEach(fac => {
      if (fac.department) {
        counts[fac.department] = (counts[fac.department] || 0) + 1;
      }
    });
    return counts;
  }, [filteredFaculty]);

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

  const exportToCSV = () => {
    const headerRow = 'S.No,EmpId,Name,Designation,Department,Academic Year,Gender,Date of birth,PanCard No,Date Of Joining,Previous Teaching Experience Years,Previous Teaching Experience Months,Previous Industry Experience Years,Previous Industry Experience Months,Qualification Level,Highest Qualification,Experience in CU - Years,Experience in CU - Months';
    const rows = filteredFaculty.map((f, idx) =>
      `${f.sNo ?? idx + 1},"${f.employeeId}","${f.name}","${f.designation}","${f.department}","${f.academicYear || '2024-2025'}","${f.gender || ''}","${f.dateOfBirth || ''}","${f.panCardNo || ''}","${f.dateOfJoining || ''}",${f.prevTeachingExpYears ?? 0},${f.prevTeachingExpMonths ?? 0},${f.prevIndustryExpYears ?? 0},${f.prevIndustryExpMonths ?? 0},"${f.qualificationLevel || ''}","${f.highestQualification || ''}",${f.cuExpYears ?? 0},${f.cuExpMonths ?? 0}`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Faculty_Directory_${academicYearFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('All');
    setAcademicYearFilter('All');
    setDesignationFilter('All');
    setSortBy('name-asc');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar currentPage="faculty-details" onNavigate={onNavigate} />

      <main className="ml-64 flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#2f4692] to-[#1e2f65] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#2f4692]/20 ring-4 ring-[#2f4692]/10">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Faculty Intelligence Directory
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Institutional faculty census, doctorate cadre, qualifications hierarchy, and academic profiles
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                onClick={fetchFaculty}
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
                    <span>Add Faculty</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* 5 Enterprise KPI Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Card 1: Total Faculty */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4692] to-blue-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faculty Census</p>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2f4692] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">{stats.total}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1 flex items-center gap-1">
                <span className="text-emerald-600 font-bold">100%</span> active profiles
              </p>
            </div>

            {/* Card 2: Doctorates & PhDs */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doctorates (PhD)</p>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-purple-700 tracking-tight mt-2">{stats.phdCount}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                <span className="text-purple-600 font-bold">{stats.phdPercent}%</span> doctoral ratio
              </p>
            </div>

            {/* Card 3: Senior Cadre */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Senior Cadre</p>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">{stats.seniorCadre}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                Professors, HODs & Deans
              </p>
            </div>

            {/* Card 4: Departments */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Departments</p>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">{stats.depts}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                Academic disciplines
              </p>
            </div>

            {/* Card 5: Average Experience */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Experience</p>
                <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">{stats.avgExp} <span className="text-sm font-semibold text-slate-500">Yrs</span></p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                Academic & industry exp
              </p>
            </div>
          </div>

          {/* Unified Single Filter Bar & View Switcher */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search faculty name, emp ID, qualification, dept..."
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

              {/* Designation Filter */}
              <select
                value={designationFilter}
                onChange={e => setDesignationFilter(e.target.value)}
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2f4692]"
              >
                <option value="All">All Designations</option>
                {designationsList.map((d, i) => (
                  <option key={i} value={d}>{d}</option>
                ))}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="h-9 px-3 text-xs font-bold rounded-xl border border-slate-200 bg-blue-50/50 text-[#2f4692] focus:outline-none"
              >
                <option value="name-asc">Sort: Name (A-Z)</option>
                <option value="name-desc">Sort: Name (Z-A)</option>
                <option value="employeeId-asc">Sort: Emp ID</option>
                <option value="department-asc">Sort: Department</option>
              </select>

              {(searchTerm || departmentFilter !== 'All' || academicYearFilter !== 'All' || designationFilter !== 'All') && (
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
                  <span className="text-xs font-bold text-slate-700">Displaying Records:</span>
                  <span className="text-xs font-black text-[#2f4692] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    {filteredFaculty.length} of {facultyList.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Click actions to inspect or modify faculty credentials</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-4 w-12 text-center">#</th>
                      <th className="py-3.5 px-4">Faculty Member</th>
                      <th className="py-3.5 px-4">Emp ID</th>
                      <th className="py-3.5 px-4">Department</th>
                      <th className="py-3.5 px-4">Designation</th>
                      <th className="py-3.5 px-4">Highest Qual.</th>
                      <th className="py-3.5 px-4">Experience</th>
                      <th className="py-3.5 px-4 text-center">AY</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                    {filteredFaculty.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400">
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
                          <tr key={fac.id || idx} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                              {fac.sNo ?? idx + 1}
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2f4692] to-[#1e2f65] text-white flex items-center justify-center text-xs font-black shadow-sm">
                                  {initials}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 group-hover:text-[#2f4692] transition-colors">
                                    {fac.name}
                                  </p>
                                  {fac.email && (
                                    <p className="text-[11px] text-slate-400 font-mono">{fac.email}</p>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4 font-mono text-[11px] text-slate-600 font-bold">
                              {fac.employeeId || '—'}
                            </td>

                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/60 max-w-[200px] truncate">
                                <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                <span className="truncate">{fac.department}</span>
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#2f4692] border border-blue-200/60">
                                {fac.designation}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              {fac.highestQualification ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-slate-800">
                                  {fac.highestQualification}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              <span className="text-[11px] font-medium text-slate-600">
                                {fac.cuExpYears ? `${fac.cuExpYears}Y CU` : '0Y CU'} 
                                {fac.prevTeachingExpYears ? ` + ${fac.prevTeachingExpYears}Y Prev` : ''}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                                {fac.academicYear || '2024-25'}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  onClick={() => setViewingFaculty(fac)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-slate-500 hover:text-[#2f4692] hover:bg-blue-50 rounded-lg"
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
                                      className="h-7 w-7 p-0 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                                      title="Edit Record"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      onClick={() => handleDelete(fac.id)}
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
              {filteredFaculty.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
                  <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-700">No faculty records match your filters</p>
                </div>
              ) : (
                filteredFaculty.map((fac, idx) => {
                  const initials = fac.name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'FA';

                  return (
                    <div
                      key={fac.id || idx}
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
                                {fac.name}
                              </h3>
                              <p className="text-[11px] font-mono text-slate-400 font-semibold">
                                {fac.employeeId || 'ID: UNASSIGNED'}
                              </p>
                            </div>
                          </div>

                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-[#2f4692] border border-blue-200">
                            {fac.designation}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate font-semibold">{fac.department}</span>
                          </div>

                          {fac.highestQualification && (
                            <div className="flex items-center gap-1.5">
                              <GraduationCap className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                              <span className="font-semibold text-slate-800">
                                {fac.highestQualification} {fac.qualificationLevel ? `(${fac.qualificationLevel})` : ''}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>Experience in CU: <strong className="text-slate-700">{fac.cuExpYears || 0}Y {fac.cuExpMonths || 0}M</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          AY {fac.academicYear || '2024-25'}
                        </span>

                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => setViewingFaculty(fac)}
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs font-bold text-[#2f4692] hover:bg-blue-50 rounded-lg px-2"
                          >
                            Inspect
                          </Button>
                          {user && (user.role === 'admin' || user.role === 'hod' || user.role === 'coordinator') && (
                            <Button
                              onClick={() => setEditingFaculty(fac)}
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
                    <h3 className="text-sm font-bold text-slate-900">Faculty Distribution by Department</h3>
                    <p className="text-xs text-slate-400">Headcount representation across disciplines</p>
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

              {/* Designation & Cadre Distribution */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Academic Hierarchy & Cadre Ratio</h3>
                    <p className="text-xs text-slate-400">Distribution across faculty ranks</p>
                  </div>
                  <Award className="w-5 h-5 text-amber-600" />
                </div>

                <div className="space-y-3">
                  {Object.entries(designationCounts).map(([desig, count]) => {
                    const pct = ((count / (stats.total || 1)) * 100).toFixed(0);
                    return (
                      <div key={desig} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 truncate pr-2">{desig}</span>
                          <span className="font-bold text-slate-900">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-500"
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
        uploadType="faculty"
        onSuccess={fetchFaculty}
      />

      {/* View Faculty Detail Slide-over / Modal */}
      {viewingFaculty && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewingFaculty(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
              <div className="w-14 h-14 bg-gradient-to-br from-[#2f4692] to-[#1e2f65] text-white rounded-2xl flex items-center justify-center text-lg font-black shadow-lg shadow-[#2f4692]/20">
                {viewingFaculty.name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">{viewingFaculty.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-[#2f4692] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    {viewingFaculty.designation}
                  </span>
                  <span className="text-xs text-slate-500 font-mono font-semibold">
                    EMP ID: {viewingFaculty.employeeId || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                <p className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-[#2f4692]" /> Department & Affiliation
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-slate-400 font-medium">Department</p>
                    <p className="font-bold text-slate-900 mt-0.5">{viewingFaculty.department}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Academic Year</p>
                    <p className="font-bold text-slate-900 mt-0.5">{viewingFaculty.academicYear || '2024-2025'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Date of Joining</p>
                    <p className="font-bold text-slate-900 mt-0.5">{viewingFaculty.dateOfJoining || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">PAN Card Number</p>
                    <p className="font-bold text-slate-900 mt-0.5 font-mono">{viewingFaculty.panCardNo || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                <p className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-purple-600" /> Qualifications & Academics
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-slate-400 font-medium">Highest Qualification</p>
                    <p className="font-bold text-purple-700 mt-0.5">{viewingFaculty.highestQualification || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Qualification Level</p>
                    <p className="font-bold text-slate-900 mt-0.5">{viewingFaculty.qualificationLevel || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                <p className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-amber-600" /> Experience Metrics
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-slate-400 font-medium">Prev Teaching Exp</p>
                    <p className="font-bold text-slate-900 mt-0.5">{viewingFaculty.prevTeachingExpYears ?? 0}Y {viewingFaculty.prevTeachingExpMonths ?? 0}M</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Prev Industry Exp</p>
                    <p className="font-bold text-slate-900 mt-0.5">{viewingFaculty.prevIndustryExpYears ?? 0}Y {viewingFaculty.prevIndustryExpMonths ?? 0}M</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-medium">Experience in CU</p>
                    <p className="font-bold text-[#2f4692] mt-0.5">{viewingFaculty.cuExpYears ?? 0}Y {viewingFaculty.cuExpMonths ?? 0}M</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setViewingFaculty(null)} className="bg-[#2f4692] hover:bg-[#243a7a] text-white text-xs font-bold rounded-xl px-5 h-9">
                Close Inspection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Faculty Modal */}
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
              <Plus className="w-5 h-5 text-[#2f4692]" /> Register Faculty Member
            </h2>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <Input 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    placeholder="e.g. Dr. Jane Smith"
                    required 
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Employee ID</label>
                  <Input 
                    value={formData.employeeId} 
                    onChange={e => setFormData({ ...formData, employeeId: e.target.value })} 
                    placeholder="e.g. CU1045"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                  <select 
                    value={formData.designation} 
                    onChange={e => setFormData({ ...formData, designation: e.target.value })} 
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-white font-medium"
                  >
                    {designationsList.map((d, i) => <option key={i} value={d}>{d}</option>)}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Highest Qualification</label>
                  <Input 
                    value={formData.highestQualification || ''} 
                    onChange={e => setFormData({ ...formData, highestQualification: e.target.value })} 
                    placeholder="e.g. Ph.D. in Computer Science"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} className="rounded-xl text-xs h-9">
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#2f4692] hover:bg-[#243a7a] text-white rounded-xl text-xs font-bold h-9">
                  Save Faculty Profile
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Faculty Modal */}
      {editingFaculty && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingFaculty(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
              <Edit className="w-5 h-5 text-amber-600" /> Edit Faculty Profile
            </h2>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Faculty Name</label>
                  <Input 
                    value={editingFaculty.name} 
                    onChange={e => setEditingFaculty({ ...editingFaculty, name: e.target.value })} 
                    required 
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Employee ID</label>
                  <Input 
                    value={editingFaculty.employeeId} 
                    onChange={e => setEditingFaculty({ ...editingFaculty, employeeId: e.target.value })} 
                    required 
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                  <select 
                    value={editingFaculty.designation} 
                    onChange={e => setEditingFaculty({ ...editingFaculty, designation: e.target.value })} 
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-white"
                  >
                    {designationsList.map((d, i) => <option key={i} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <select 
                    value={editingFaculty.department} 
                    onChange={e => setEditingFaculty({ ...editingFaculty, department: e.target.value })} 
                    className="w-full border border-slate-200 rounded-xl p-2 text-xs bg-white"
                  >
                    {departmentsList.map((d, i) => <option key={i} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Highest Qualification</label>
                  <Input 
                    value={editingFaculty.highestQualification || ''} 
                    onChange={e => setEditingFaculty({ ...editingFaculty, highestQualification: e.target.value })} 
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Experience in CU (Years)</label>
                  <Input 
                    value={editingFaculty.cuExpYears || '0'} 
                    onChange={e => setEditingFaculty({ ...editingFaculty, cuExpYears: e.target.value })} 
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setEditingFaculty(null)} className="rounded-xl text-xs h-9">
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#2f4692] hover:bg-[#243a7a] text-white rounded-xl text-xs font-bold h-9">
                  Update Profile
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

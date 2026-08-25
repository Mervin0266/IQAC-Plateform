import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
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
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BulkUploadDialog } from './BulkUploadDialog';

interface FacultyDetailsPageProps {
  onNavigate: (page: string) => void;
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
  // Legacy optional fields
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

  // Faculty records (initialized to empty array)
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

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

  const departmentsList = [
    'Computer Science and Engineering',
    'Artificial Intelligence and Data Science',
    'Electronics and Communication Engineering',
    'Electrical and Electronics Engineering',
    'Mechanical and Automobile Engineering',
    'Civil Engineering',
    'Sciences & Humanities'
  ];

  const designationsList = [
    'Head of Department',
    'Professor',
    'Associate Professor',
    'Assistant Professor',
    'Dean'
  ];

  // Filtered Faculty List
  const filteredFaculty = facultyList
    .filter(fac => {
      const matchesSearch =
        fac.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fac.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (fac.email && fac.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (fac.highestQualification && fac.highestQualification.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (fac.qualificationLevel && fac.qualificationLevel.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesDept = departmentFilter === 'All' || fac.department === departmentFilter;
      const matchesDesig = designationFilter === 'All' || fac.designation === designationFilter;

      return matchesSearch && matchesDept && matchesDesig;
    })
    .sort((a, b) => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (['ug', 'pg', 'phd', 'further'].includes(name)) {
      setFormData(prev => ({
        ...prev,
        qualifications: {
          ug: prev.qualifications?.ug ?? '',
          pg: prev.qualifications?.pg ?? '',
          phd: prev.qualifications?.phd,
          further: prev.qualifications?.further,
          [name]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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

  const resetForm = () => {
    setFormData({
      employeeId: '',
      name: '',
      designation: 'Assistant Professor',
      department: 'Computer Science and Engineering',
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

  const exportToCSV = () => {
    const headerRow = 'S.No,EmpId,Name,Designation,Department,Gender,Date of birth,PanCard No,Date Of Joining,Previous Teaching Experince Years,Previous Teaching Experince Months,Previous Industry Experince Years,Previous Industry Experince Months,Qualification Level,Highest Qualification,Experience in CU - Years,Experience in CU - Months';
    const rows = filteredFaculty.map((f, idx) =>
      `${f.sNo ?? idx + 1},"${f.employeeId}","${f.name}","${f.designation}","${f.department}","${f.gender || ''}","${f.dateOfBirth || ''}","${f.panCardNo || ''}","${f.dateOfJoining || ''}",${f.prevTeachingExpYears ?? 0},${f.prevTeachingExpMonths ?? 0},${f.prevIndustryExpYears ?? 0},${f.prevIndustryExpMonths ?? 0},"${f.qualificationLevel || ''}","${f.highestQualification || ''}",${f.cuExpYears ?? 0},${f.cuExpMonths ?? 0}`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headerRow, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Faculty_Details_Report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar currentPage="faculty-details" onNavigate={onNavigate} />

      <main className="ml-64 flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-7 h-7 text-[#2f4692]" />
                Faculty Details Directory
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Comprehensive repository of faculty profiles, academic qualifications (UG, PG, PhD), research focus, and department roles.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={fetchFaculty}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                title="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                onClick={exportToCSV}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
              <Button
                onClick={() => setIsBulkUploadOpen(true)}
                variant="outline"
                className="border-teal-600 text-teal-700 hover:bg-teal-50 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload CSV / Excel
              </Button>
              <Button
                onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                className="bg-[#2f4692] hover:bg-[#243a7a] text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Faculty
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white border-blue-100 shadow-sm">
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="p-3 bg-blue-50 rounded-lg text-[#2f4692]">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Total Faculty Members</p>
                  <p className="text-2xl font-bold text-gray-900">{facultyList.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-indigo-100 shadow-sm">
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Ph.D. Holders</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {facultyList.filter(f => !!f.qualifications?.phd).length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-emerald-100 shadow-sm">
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Professors & HODs</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {facultyList.filter(f => f.designation.includes('Professor') || f.designation.includes('Head')).length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-amber-100 shadow-sm">
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Academic Departments</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Array.from(new Set(facultyList.map(f => f.department))).length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search faculty name, emp id, email, qualifications, or specialization..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 text-sm w-full"
              />
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Filter className="w-4 h-4 text-gray-400" />
                <span>Department:</span>
              </div>
              <select
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Departments</option>
                {departmentsList.map((d, i) => (
                  <option key={i} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={designationFilter}
                onChange={e => setDesignationFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Designations</option>
                {designationsList.map((d, i) => (
                  <option key={i} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-blue-800"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="employeeId-asc">Emp ID (A-Z)</option>
                <option value="employeeId-desc">Emp ID (Z-A)</option>
                <option value="dateOfJoining-asc">Date of Joining (Oldest First)</option>
                <option value="dateOfJoining-desc">Date of Joining (Newest First)</option>
              </select>
            </div>
          </div>

          {/* Faculty Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-700">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                  <tr>
                    <th className="px-4 py-3 whitespace-nowrap">S.No</th>
                    <th className="px-4 py-3 whitespace-nowrap">Emp ID</th>
                    <th className="px-4 py-3 whitespace-nowrap">Name</th>
                    <th className="px-4 py-3 whitespace-nowrap">Designation</th>
                    <th className="px-4 py-3 whitespace-nowrap">Department</th>
                    <th className="px-4 py-3 whitespace-nowrap">Gender</th>
                    <th className="px-4 py-3 whitespace-nowrap">Date of Birth</th>
                    <th className="px-4 py-3 whitespace-nowrap">PAN Card</th>
                    <th className="px-4 py-3 whitespace-nowrap">Date of Joining</th>
                    <th className="px-4 py-3 whitespace-nowrap">Prev. Teaching Exp</th>
                    <th className="px-4 py-3 whitespace-nowrap">Prev. Industry Exp</th>
                    <th className="px-4 py-3 whitespace-nowrap">Qualification Level</th>
                    <th className="px-4 py-3 whitespace-nowrap">Highest Qualification</th>
                    <th className="px-4 py-3 whitespace-nowrap">CU Experience</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredFaculty.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                        No faculty records found matching search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredFaculty.map((faculty, idx) => (
                      <tr key={faculty.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 font-mono text-xs whitespace-nowrap">{faculty.employeeId}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900 whitespace-nowrap">{faculty.name}</p>
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">{faculty.designation}</td>
                        <td className="px-4 py-3 text-xs">{faculty.department}</td>
                        <td className="px-4 py-3 text-xs">{faculty.gender || '-'}</td>
                        <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">{faculty.dateOfBirth || '-'}</td>
                        <td className="px-4 py-3 text-xs font-mono">{faculty.panCardNo || '-'}</td>
                        <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">{faculty.dateOfJoining || '-'}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">{faculty.prevTeachingExpYears ?? 0}Y {faculty.prevTeachingExpMonths ?? 0}M</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">{faculty.prevIndustryExpYears ?? 0}Y {faculty.prevIndustryExpMonths ?? 0}M</td>
                        <td className="px-4 py-3 text-xs">{faculty.qualificationLevel || '-'}</td>
                        <td className="px-4 py-3 text-xs max-w-[160px] truncate" title={faculty.highestQualification}>{faculty.highestQualification || '-'}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">{faculty.cuExpYears ?? 0}Y {faculty.cuExpMonths ?? 0}M</td>
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => setViewingFaculty(faculty)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="View Full Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingFaculty(faculty)}
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                            title="Edit Faculty Record"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(faculty.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Remove Faculty"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        token={user?.token || ''}
        onSuccess={fetchFaculty}
        uploadType="faculty"
      />

      {/* Add Faculty Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#2f4692]" /> Add New Faculty Profile
            </h2>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Faculty Name *</label>
                  <Input name="name" value={formData.name} onChange={handleInputChange} required placeholder="e.g. Dr. Suresh Kumar" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Employee ID *</label>
                  <Input name="employeeId" value={formData.employeeId} onChange={handleInputChange} required placeholder="e.g. EMP-10990" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Designation *</label>
                  <select name="designation" value={formData.designation} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 text-sm">
                    {designationsList.map((d, i) => <option key={i} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Department *</label>
                  <select name="department" value={formData.department} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 text-sm">
                    {departmentsList.map((d, i) => <option key={i} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                  <select name="gender" value={formData.gender || ''} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 text-sm">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
                  <Input type="date" name="dateOfBirth" value={formData.dateOfBirth || ''} onChange={handleInputChange} />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">PAN Card No</label>
                  <Input name="panCardNo" value={formData.panCardNo || ''} onChange={handleInputChange} placeholder="e.g. ABCPK1234D" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Joining</label>
                  <Input type="date" name="dateOfJoining" value={formData.dateOfJoining || ''} onChange={handleInputChange} />
                </div>

                <div className="md:col-span-2">
                  <p className="text-xs font-bold text-[#2f4692] mb-2">Previous Teaching Experience</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Years</label>
                      <Input type="text" name="prevTeachingExpYears" value={formData.prevTeachingExpYears ?? '0'} onChange={handleInputChange} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Months</label>
                      <Input type="text" name="prevTeachingExpMonths" value={formData.prevTeachingExpMonths ?? '0'} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <p className="text-xs font-bold text-[#2f4692] mb-2">Previous Industry Experience</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Years</label>
                      <Input type="text" name="prevIndustryExpYears" value={formData.prevIndustryExpYears ?? '0'} onChange={handleInputChange} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Months</label>
                      <Input type="text" name="prevIndustryExpMonths" value={formData.prevIndustryExpMonths ?? '0'} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Qualification Level</label>
                  <Input name="qualificationLevel" value={formData.qualificationLevel || ''} onChange={handleInputChange} placeholder="e.g. PhD, PG, UG" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Highest Qualification</label>
                  <Input name="highestQualification" value={formData.highestQualification || ''} onChange={handleInputChange} placeholder="e.g. Ph.D. in Computer Science" />
                </div>

                <div className="md:col-span-2">
                  <p className="text-xs font-bold text-[#2f4692] mb-2">Experience in CU</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Years</label>
                      <Input type="text" name="cuExpYears" value={formData.cuExpYears ?? '0'} onChange={handleInputChange} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Months</label>
                      <Input type="text" name="cuExpMonths" value={formData.cuExpMonths ?? '0'} onChange={handleInputChange} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select name="status" value={formData.status || 'Active'} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 text-sm">
                    <option value="Active">Active</option>
                    <option value="On Sabbatical">On Sabbatical</option>
                    <option value="Relieved">Relieved</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#2f4692] text-white">Save Faculty Profile</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Faculty Profile Modal */}
      {viewingFaculty && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewingFaculty(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-4 border-b pb-4 mb-4">
              <div className="w-14 h-14 bg-indigo-100 text-[#2f4692] rounded-full flex items-center justify-center font-bold text-xl">
                {viewingFaculty.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{viewingFaculty.name}</h3>
                <p className="text-xs text-gray-500 font-mono">Emp ID: {viewingFaculty.employeeId}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                  {viewingFaculty.designation} — {viewingFaculty.department}
                </span>
              </div>
            </div>

            <div className="space-y-4 text-xs text-gray-700">
              {/* Personal Details */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="font-bold text-gray-900 text-sm mb-3">Personal Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-400 font-medium">Gender</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{viewingFaculty.gender || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Date of Birth</p>
                    <p className="font-semibold text-gray-900 mt-0.5 font-mono">{viewingFaculty.dateOfBirth || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">PAN Card No</p>
                    <p className="font-semibold text-gray-900 mt-0.5 font-mono">{viewingFaculty.panCardNo || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Date of Joining</p>
                    <p className="font-semibold text-gray-900 mt-0.5 font-mono">{viewingFaculty.dateOfJoining || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Qualifications */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#2f4692]" /> Qualifications
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-400 font-medium">Qualification Level</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{viewingFaculty.qualificationLevel || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Highest Qualification</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{viewingFaculty.highestQualification || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Experience */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="font-bold text-gray-900 text-sm mb-3 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-[#2f4692]" /> Experience
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-gray-400 font-medium">Prev. Teaching Exp</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{viewingFaculty.prevTeachingExpYears ?? 0}Y {viewingFaculty.prevTeachingExpMonths ?? 0}M</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Prev. Industry Exp</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{viewingFaculty.prevIndustryExpYears ?? 0}Y {viewingFaculty.prevIndustryExpMonths ?? 0}M</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Experience in CU</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{viewingFaculty.cuExpYears ?? 0}Y {viewingFaculty.cuExpMonths ?? 0}M</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setViewingFaculty(null)} className="bg-[#2f4692] text-white">Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Faculty Modal */}
      {editingFaculty && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingFaculty(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Edit className="w-5 h-5 text-amber-600" /> Edit Faculty Profile
            </h2>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Faculty Name</label>
                  <Input value={editingFaculty.name} onChange={e => setEditingFaculty({ ...editingFaculty, name: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Employee ID</label>
                  <Input value={editingFaculty.employeeId} onChange={e => setEditingFaculty({ ...editingFaculty, employeeId: e.target.value })} required />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Designation</label>
                  <select value={editingFaculty.designation} onChange={e => setEditingFaculty({ ...editingFaculty, designation: e.target.value as any })} className="w-full border border-gray-300 rounded-md p-2 text-sm">
                    {designationsList.map((d, i) => <option key={i} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
                  <select value={editingFaculty.department} onChange={e => setEditingFaculty({ ...editingFaculty, department: e.target.value })} className="w-full border border-gray-300 rounded-md p-2 text-sm">
                    {departmentsList.map((d, i) => <option key={i} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                  <select value={editingFaculty.gender || ''} onChange={e => setEditingFaculty({ ...editingFaculty, gender: e.target.value as any })} className="w-full border border-gray-300 rounded-md p-2 text-sm">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
                  <Input type="date" value={editingFaculty.dateOfBirth || ''} onChange={e => setEditingFaculty({ ...editingFaculty, dateOfBirth: e.target.value })} />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">PAN Card No</label>
                  <Input value={editingFaculty.panCardNo || ''} onChange={e => setEditingFaculty({ ...editingFaculty, panCardNo: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Joining</label>
                  <Input type="date" value={editingFaculty.dateOfJoining || ''} onChange={e => setEditingFaculty({ ...editingFaculty, dateOfJoining: e.target.value })} />
                </div>

                <div className="md:col-span-2">
                  <p className="text-xs font-bold text-[#2f4692] mb-2">Previous Teaching Experience</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Years</label>
                      <Input type="text" value={editingFaculty.prevTeachingExpYears ?? '0'} onChange={e => setEditingFaculty({ ...editingFaculty, prevTeachingExpYears: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Months</label>
                      <Input type="text" value={editingFaculty.prevTeachingExpMonths ?? '0'} onChange={e => setEditingFaculty({ ...editingFaculty, prevTeachingExpMonths: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <p className="text-xs font-bold text-[#2f4692] mb-2">Previous Industry Experience</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Years</label>
                      <Input type="text" value={editingFaculty.prevIndustryExpYears ?? '0'} onChange={e => setEditingFaculty({ ...editingFaculty, prevIndustryExpYears: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Months</label>
                      <Input type="text" value={editingFaculty.prevIndustryExpMonths ?? '0'} onChange={e => setEditingFaculty({ ...editingFaculty, prevIndustryExpMonths: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Qualification Level</label>
                  <Input value={editingFaculty.qualificationLevel || ''} onChange={e => setEditingFaculty({ ...editingFaculty, qualificationLevel: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Highest Qualification</label>
                  <Input value={editingFaculty.highestQualification || ''} onChange={e => setEditingFaculty({ ...editingFaculty, highestQualification: e.target.value })} />
                </div>

                <div className="md:col-span-2">
                  <p className="text-xs font-bold text-[#2f4692] mb-2">Experience in CU</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Years</label>
                      <Input type="text" value={editingFaculty.cuExpYears ?? '0'} onChange={e => setEditingFaculty({ ...editingFaculty, cuExpYears: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Months</label>
                      <Input type="text" value={editingFaculty.cuExpMonths ?? '0'} onChange={e => setEditingFaculty({ ...editingFaculty, cuExpMonths: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setEditingFaculty(null)}>Cancel</Button>
                <Button type="submit" className="bg-[#2f4692] text-white">Update Profile</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

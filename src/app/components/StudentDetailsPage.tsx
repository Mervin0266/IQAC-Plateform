import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Users, 
  GraduationCap, 
  Search, 
  Plus, 
  Filter, 
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
  Upload
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BulkUploadDialog } from './BulkUploadDialog';

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
  campus?: string;
  disability?: string;
}

export function StudentDetailsPage({ onNavigate }: StudentDetailsPageProps) {
  const { user, logout } = useAuth();

  // Student records (initialized to empty array)
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

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
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState<string>('registerNumber-asc');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<Student, 'id'>>({
    registerNumber: '',
    name: '',
    email: '',
    phone: '',
    course: 'B.Tech Computer Science and Engineering',
    department: 'Computer Science and Engineering',
    previousSchool: '',
    gender: 'Male',
    dob: '',
    bloodGroup: 'O+',
    batch: '2022 - 2026',
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
    campus: 'Kengeri Campus',
    disability: 'NO'
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

  // Filtered Students
  const filteredStudents = students
    .filter(student => {
      const matchesSearch = 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.registerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.previousSchool && student.previousSchool.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.className && student.className.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.campus && student.campus.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesDept = departmentFilter === 'All' || student.department === departmentFilter;
      const matchesStatus = statusFilter === 'All' || student.status === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    })
    .sort((a, b) => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
          const newStudent: Student = { ...formData, id: `STD00${Date.now()}` };
          setStudents([newStudent, ...students]);
        }
      } else {
        const newStudent: Student = { ...formData, id: `STD00${Date.now()}` };
        setStudents([newStudent, ...students]);
      }
    } catch (err) {
      console.error(err);
      const newStudent: Student = { ...formData, id: `STD00${Date.now()}` };
      setStudents([newStudent, ...students]);
    }
    setIsAddModalOpen(false);
    resetForm();
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      if (user?.token && editingStudent.id && !editingStudent.id.startsWith('STD')) {
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
    if (window.confirm('Are you sure you want to delete this student record?')) {
      try {
        if (user?.token && !id.startsWith('STD')) {
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

  const resetForm = () => {
    setFormData({
      registerNumber: '',
      name: '',
      email: '',
      phone: '',
      course: 'B.Tech Computer Science and Engineering',
      department: 'Computer Science and Engineering',
      previousSchool: '',
      gender: 'Male',
      dob: '',
      bloodGroup: 'O+',
      batch: '2022 - 2026',
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
      campus: 'Kengeri Campus',
      disability: 'NO'
    });
  };

  const exportToCSV = () => {
    const headers = ['S. No.,Register No,Student Name,Class Name,Application No,Gender,Date Of Birth,Mobile No,Nationality,Caste,Current City,Current State,Permanent City,Permanent State,Parent Mobile No,Handicapped,Handicapped Description,Campus,Disability: (YES/NO),Department,Batch'];
    const rows = filteredStudents.map((s, idx) => 
      `"${idx + 1}","${s.registerNumber}","${s.name}","${s.className || ''}","${s.applicationNo || ''}","${s.gender || 'Male'}","${s.dob || ''}","${s.mobileNo || ''}","${s.nationality || ''}","${s.caste || ''}","${s.currentCity || ''}","${s.currentState || ''}","${s.permanentCity || ''}","${s.permanentState || ''}","${s.parentMobileNo || ''}","${s.handicapped || 'NO'}","${s.handicappedDescription || 'NIL'}","${s.campus || ''}","${s.disability || 'NO'}","${s.department || ''}","${s.batch || ''}"`
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Student_Details_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar currentPage="student-details" onNavigate={onNavigate} />

      <main className="ml-64 flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <GraduationCap className="w-7 h-7 text-[#2f4692]" />
                Student Details Directory
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage student records, contact information, previous education, and academic status.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={fetchStudents}
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
                className="border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Upload CSV</span>
              </Button>
              <Button 
                onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                className="bg-[#2f4692] hover:bg-[#243a7a] text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Student
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
                  <p className="text-xs text-gray-500 font-medium">Total Registered Students</p>
                  <p className="text-2xl font-bold text-gray-900">{students.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-green-100 shadow-sm">
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="p-3 bg-green-50 rounded-lg text-green-600">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Active Enrolled</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {students.filter(s => s.status === 'Active').length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-purple-100 shadow-sm">
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Departments Covered</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Array.from(new Set(students.map(s => s.department))).length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-amber-100 shadow-sm">
              <CardContent className="p-4 flex items-center space-x-4">
                <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
                  <School className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Previous Schools Tracked</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Array.from(new Set(students.map(s => s.previousSchool))).length}
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
                placeholder="Search student name, register no, email, or school..."
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
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Graduated">Graduated</option>
                <option value="On Leave">On Leave</option>
              </select>

              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-blue-800"
              >
                <option value="registerNumber-asc">Reg Number (Ascending)</option>
                <option value="registerNumber-desc">Reg Number (Descending)</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="batch-asc">Batch (Oldest First)</option>
                <option value="batch-desc">Batch (Newest First)</option>
                <option value="admissionDate-asc">Admission Date (Oldest First)</option>
                <option value="admissionDate-desc">Admission Date (Newest First)</option>
              </select>
            </div>
          </div>

          {/* Student Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-700">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                  <tr>
                    <th className="px-4 py-3">Register No</th>
                    <th className="px-4 py-3">Student Name & Class</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Campus</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3">Disability</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">
                        No student records found matching search filters.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(student => (
                      <tr key={student.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 font-mono text-xs">
                          {student.registerNumber}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{student.name}</p>
                          <div className="flex items-center space-x-3 text-xs text-gray-500 mt-0.5">
                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium">{student.className || 'No Class'}</span>
                            <span>App No: {student.applicationNo || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700">
                          {student.department || '-'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700">
                          {student.campus || '-'}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-600">
                          {student.batch || '-'}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium inline-block ${
                            student.disability === 'YES' || student.handicapped === 'YES'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            Disability: {student.disability || 'NO'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium inline-block ${
                            student.status === 'Active'
                              ? 'bg-green-100 text-green-700'
                              : student.status === 'Graduated'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => setViewingStudent(student)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="View Student Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingStudent(student)}
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                            title="Edit Details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(student.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete Student"
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

      {/* Add Student Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-xs text-gray-700">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#2f4692]" /> Add New Student Record
            </h2>

            <form onSubmit={handleAddSubmit} className="space-y-6">
              {/* Section 1: Academic Info */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-[#2f4692] border-b pb-1">Academic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Register Number *</label>
                    <Input name="registerNumber" value={formData.registerNumber} onChange={handleInputChange} required placeholder="e.g. 2130109" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Student Full Name *</label>
                    <Input name="name" value={formData.name} onChange={handleInputChange} required placeholder="e.g. Rahul Verma" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Class Name</label>
                    <Input name="className" value={formData.className || ''} onChange={handleInputChange} placeholder="e.g. 3A B.Tech CSE" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Application No</label>
                    <Input name="applicationNo" value={formData.applicationNo || ''} onChange={handleInputChange} placeholder="e.g. APP12345" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Campus</label>
                    <Input name="campus" value={formData.campus || ''} onChange={handleInputChange} placeholder="e.g. Kengeri Campus" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
                    <select name="department" value={formData.department || ''} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 text-xs bg-white">
                      {departmentsList.map((d, i) => <option key={i} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Batch Year</label>
                    <Input name="batch" value={formData.batch || ''} onChange={handleInputChange} placeholder="e.g. 2022 - 2026" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Enrollment Status</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 text-xs bg-white">
                      <option value="Active">Active</option>
                      <option value="Graduated">Graduated</option>
                      <option value="On Leave">On Leave</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Personal Info */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-[#2f4692] border-b pb-1">Personal Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                    <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 text-xs bg-white">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
                    <Input type="date" name="dob" value={formData.dob || ''} onChange={handleInputChange} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nationality</label>
                    <Input name="nationality" value={formData.nationality || ''} onChange={handleInputChange} placeholder="e.g. Indian" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Caste</label>
                    <Input name="caste" value={formData.caste || ''} onChange={handleInputChange} placeholder="e.g. General" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Handicapped</label>
                    <select name="handicapped" value={formData.handicapped || 'NO'} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 text-xs bg-white">
                      <option value="NO">NO</option>
                      <option value="YES">YES</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Disability: (YES/NO)</label>
                    <select name="disability" value={formData.disability || 'NO'} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 text-xs bg-white">
                      <option value="NO">NO</option>
                      <option value="YES">YES</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Handicapped Description</label>
                    <textarea name="handicappedDescription" value={formData.handicappedDescription || 'NIL'} onChange={handleInputChange} rows={2} className="w-full border border-gray-300 rounded-md p-2 text-xs" placeholder="Describe disability, or keep NIL..." />
                  </div>
                </div>
              </div>

              {/* Section 3: Contact & Address */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-[#2f4692] border-b pb-1">Contact & Address Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile No</label>
                    <Input name="mobileNo" value={formData.mobileNo || ''} onChange={handleInputChange} placeholder="Student Mobile Number" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Parent Mobile No</label>
                    <Input name="parentMobileNo" value={formData.parentMobileNo || ''} onChange={handleInputChange} placeholder="Parent Mobile Number" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Current City</label>
                    <Input name="currentCity" value={formData.currentCity || ''} onChange={handleInputChange} placeholder="e.g. Bengaluru" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Current State</label>
                    <Input name="currentState" value={formData.currentState || ''} onChange={handleInputChange} placeholder="e.g. Karnataka" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Permanent City</label>
                    <Input name="permanentCity" value={formData.permanentCity || ''} onChange={handleInputChange} placeholder="e.g. Mysuru" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Permanent State</label>
                    <Input name="permanentState" value={formData.permanentState || ''} onChange={handleInputChange} placeholder="e.g. Karnataka" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Full Permanent Address</label>
                    <textarea name="address" value={formData.address || ''} onChange={handleInputChange} rows={2} className="w-full border border-gray-300 rounded-md p-2 text-xs" placeholder="Street name, landmark, address..." />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#2f4692] text-white">Save Student Record</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Student Details Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setViewingStudent(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-4 border-b pb-4 mb-4">
              <div className="w-14 h-14 bg-blue-100 text-[#2f4692] rounded-full flex items-center justify-center font-bold text-xl">
                {viewingStudent.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{viewingStudent.name}</h3>
                <p className="text-xs text-gray-500 font-mono">Reg No: {viewingStudent.registerNumber}</p>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700">
                  {viewingStudent.status}
                </span>
              </div>
            </div>

            <div className="space-y-6 text-xs text-gray-700">
              {/* Section 1: Academic Details */}
              <div>
                <h4 className="font-bold text-sm text-[#2f4692] border-b pb-1 mb-3">Academic Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-150">
                  <div>
                    <p className="text-gray-400 font-medium">Department</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{viewingStudent.department || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Class Name</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{viewingStudent.className || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Application No</p>
                    <p className="font-semibold text-gray-900 mt-0.5 font-mono">{viewingStudent.applicationNo || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Campus</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{viewingStudent.campus || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Batch</p>
                    <p className="font-semibold text-gray-900 mt-0.5 font-mono">{viewingStudent.batch || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Registration Number</p>
                    <p className="font-semibold text-gray-900 mt-0.5 font-mono">{viewingStudent.registerNumber}</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Personal Details */}
              <div>
                <h4 className="font-bold text-sm text-[#2f4692] border-b pb-1 mb-3">Personal Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-150">
                  <div>
                    <p className="text-gray-400 font-medium">Gender</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{viewingStudent.gender || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Date Of Birth</p>
                    <p className="font-semibold text-gray-900 mt-0.5 font-mono">{viewingStudent.dob || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Nationality</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{viewingStudent.nationality || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Caste</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{viewingStudent.caste || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Handicapped</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{viewingStudent.handicapped || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Disability: (YES/NO)</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{viewingStudent.disability || '-'}</p>
                  </div>
                  <div className="md:col-span-3">
                    <p className="text-gray-400 font-medium">Handicapped Description</p>
                    <p className="font-semibold text-gray-900 mt-0.5 bg-white p-2 rounded border border-gray-100">{viewingStudent.handicappedDescription || 'NIL'}</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Contact & Address details */}
              <div>
                <h4 className="font-bold text-sm text-[#2f4692] border-b pb-1 mb-3">Contact & Address Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-150">
                  <div>
                    <p className="text-gray-400 font-medium">Mobile No</p>
                    <p className="font-semibold text-gray-900 mt-0.5 font-mono">{viewingStudent.mobileNo || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Parent Mobile No</p>
                    <p className="font-semibold text-gray-900 mt-0.5 font-mono">{viewingStudent.parentMobileNo || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Current Location</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{viewingStudent.currentCity ? `${viewingStudent.currentCity}, ${viewingStudent.currentState || ''}` : '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Permanent Location</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{viewingStudent.permanentCity ? `${viewingStudent.permanentCity}, ${viewingStudent.permanentState || ''}` : '-'}</p>
                  </div>
                  {viewingStudent.address && (
                    <div className="md:col-span-2">
                      <p className="text-gray-400 font-medium">Full Address Details</p>
                      <p className="font-medium text-gray-800 mt-0.5">{viewingStudent.address}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setViewingStudent(null)} className="bg-[#2f4692] text-white">Close Profile</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-xs text-gray-700">
            <button 
              onClick={() => setEditingStudent(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Edit className="w-5 h-5 text-amber-600" /> Edit Student Record
            </h2>

            <form onSubmit={handleEditSubmit} className="space-y-6">
              {/* Section 1: Academic Info */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-[#2f4692] border-b pb-1">Academic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Register Number *</label>
                    <Input value={editingStudent.registerNumber} onChange={e => setEditingStudent({ ...editingStudent, registerNumber: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Student Full Name *</label>
                    <Input value={editingStudent.name} onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Class Name</label>
                    <Input value={editingStudent.className || ''} onChange={e => setEditingStudent({ ...editingStudent, className: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Application No</label>
                    <Input value={editingStudent.applicationNo || ''} onChange={e => setEditingStudent({ ...editingStudent, applicationNo: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Campus</label>
                    <Input value={editingStudent.campus || ''} onChange={e => setEditingStudent({ ...editingStudent, campus: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
                    <select value={editingStudent.department || ''} onChange={e => setEditingStudent({ ...editingStudent, department: e.target.value })} className="w-full border border-gray-300 rounded-md p-2 text-xs bg-white">
                      {departmentsList.map((d, i) => <option key={i} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Batch Year</label>
                    <Input value={editingStudent.batch || ''} onChange={e => setEditingStudent({ ...editingStudent, batch: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Enrollment Status</label>
                    <select value={editingStudent.status} onChange={e => setEditingStudent({ ...editingStudent, status: e.target.value as any })} className="w-full border border-gray-300 rounded-md p-2 text-xs bg-white">
                      <option value="Active">Active</option>
                      <option value="Graduated">Graduated</option>
                      <option value="On Leave">On Leave</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Personal Info */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-[#2f4692] border-b pb-1">Personal Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                    <select value={editingStudent.gender} onChange={e => setEditingStudent({ ...editingStudent, gender: e.target.value })} className="w-full border border-gray-300 rounded-md p-2 text-xs bg-white">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth</label>
                    <Input type="date" value={editingStudent.dob || ''} onChange={e => setEditingStudent({ ...editingStudent, dob: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nationality</label>
                    <Input value={editingStudent.nationality || ''} onChange={e => setEditingStudent({ ...editingStudent, nationality: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Caste</label>
                    <Input value={editingStudent.caste || ''} onChange={e => setEditingStudent({ ...editingStudent, caste: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Handicapped</label>
                    <select value={editingStudent.handicapped || 'NO'} onChange={e => setEditingStudent({ ...editingStudent, handicapped: e.target.value })} className="w-full border border-gray-300 rounded-md p-2 text-xs bg-white">
                      <option value="NO">NO</option>
                      <option value="YES">YES</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Disability: (YES/NO)</label>
                    <select value={editingStudent.disability || 'NO'} onChange={e => setEditingStudent({ ...editingStudent, disability: e.target.value })} className="w-full border border-gray-300 rounded-md p-2 text-xs bg-white">
                      <option value="NO">NO</option>
                      <option value="YES">YES</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Handicapped Description</label>
                    <textarea value={editingStudent.handicappedDescription || 'NIL'} onChange={e => setEditingStudent({ ...editingStudent, handicappedDescription: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-md p-2 text-xs" placeholder="Describe disability, or keep NIL..." />
                  </div>
                </div>
              </div>

              {/* Section 3: Contact & Address */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-[#2f4692] border-b pb-1">Contact & Address Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile No</label>
                    <Input value={editingStudent.mobileNo || ''} onChange={e => setEditingStudent({ ...editingStudent, mobileNo: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Parent Mobile No</label>
                    <Input value={editingStudent.parentMobileNo || ''} onChange={e => setEditingStudent({ ...editingStudent, parentMobileNo: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Current City</label>
                    <Input value={editingStudent.currentCity || ''} onChange={e => setEditingStudent({ ...editingStudent, currentCity: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Current State</label>
                    <Input value={editingStudent.currentState || ''} onChange={e => setEditingStudent({ ...editingStudent, currentState: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Permanent City</label>
                    <Input value={editingStudent.permanentCity || ''} onChange={e => setEditingStudent({ ...editingStudent, permanentCity: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Permanent State</label>
                    <Input value={editingStudent.permanentState || ''} onChange={e => setEditingStudent({ ...editingStudent, permanentState: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Full Permanent Address</label>
                    <textarea value={editingStudent.address || ''} onChange={e => setEditingStudent({ ...editingStudent, address: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-md p-2 text-xs" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setEditingStudent(null)}>Cancel</Button>
                <Button type="submit" className="bg-[#2f4692] text-white">Update Record</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        token={user?.token || ''}
        onSuccess={fetchStudents}
        uploadType="students"
      />
    </div>
  );
}

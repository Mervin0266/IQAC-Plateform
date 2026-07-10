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
  email: string;
  phone: string;
  course: string;
  department: string;
  previousSchool: string;
  gender: string;
  dob: string;
  bloodGroup: string;
  batch: string;
  admissionDate: string;
  status: 'Active' | 'Graduated' | 'On Leave';
  guardianName?: string;
  guardianPhone?: string;
  address?: string;
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
    address: ''
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
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.previousSchool.toLowerCase().includes(searchTerm.toLowerCase());

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
      address: ''
    });
  };

  const exportToCSV = () => {
    const headers = ['Register Number,Name,Email,Phone,Department,Course,Previous School,Status'];
    const rows = filteredStudents.map(s => 
      `"${s.registerNumber}","${s.name}","${s.email}","${s.phone}","${s.department}","${s.course}","${s.previousSchool}","${s.status}"`
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
                    <th className="px-4 py-3">Student Name & Contact</th>
                    <th className="px-4 py-3">Department & Course</th>
                    <th className="px-4 py-3">Previous School Name</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
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
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{student.email}</span>
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{student.phone}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800 text-xs">{student.department}</p>
                          <p className="text-[11px] text-gray-500">{student.course}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate" title={student.previousSchool}>
                          {student.previousSchool}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-600">
                          {student.batch}
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
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#2f4692]" /> Add New Student Record
            </h2>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Student Full Name *</label>
                  <Input name="name" value={formData.name} onChange={handleInputChange} required placeholder="e.g. Rahul Verma" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Register Number *</label>
                  <Input name="registerNumber" value={formData.registerNumber} onChange={handleInputChange} required placeholder="e.g. 2130109" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address *</label>
                  <Input type="email" name="email" value={formData.email} onChange={handleInputChange} required placeholder="student@student.christuniversity.in" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number *</label>
                  <Input name="phone" value={formData.phone} onChange={handleInputChange} required placeholder="+91 9876543210" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Department *</label>
                  <select name="department" value={formData.department} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 text-sm">
                    {departmentsList.map((d, i) => <option key={i} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Course *</label>
                  <Input name="course" value={formData.course} onChange={handleInputChange} required placeholder="e.g. B.Tech Computer Science" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Previous School Name *</label>
                  <Input name="previousSchool" value={formData.previousSchool} onChange={handleInputChange} required placeholder="e.g. St. Joseph's Pre-University College, Bengaluru" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 text-sm">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Blood Group</label>
                  <Input name="bloodGroup" value={formData.bloodGroup} onChange={handleInputChange} placeholder="e.g. O+" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Batch Year</label>
                  <Input name="batch" value={formData.batch} onChange={handleInputChange} placeholder="e.g. 2021 - 2025" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select name="status" value={formData.status} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 text-sm">
                    <option value="Active">Active</option>
                    <option value="Graduated">Graduated</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Guardian Name</label>
                  <Input name="guardianName" value={formData.guardianName || ''} onChange={handleInputChange} placeholder="Father / Mother Name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Guardian Phone</label>
                  <Input name="guardianPhone" value={formData.guardianPhone || ''} onChange={handleInputChange} placeholder="+91 9876543211" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Permanent Address</label>
                  <textarea name="address" value={formData.address || ''} onChange={handleInputChange} rows={2} className="w-full border border-gray-300 rounded-md p-2 text-sm" placeholder="Street, City, State..." />
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
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
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

            <div className="space-y-4 text-xs text-gray-700">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div>
                  <p className="text-gray-400 font-medium">Department</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{viewingStudent.department}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Course</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{viewingStudent.course}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Batch</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{viewingStudent.batch}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Blood Group</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{viewingStudent.bloodGroup}</p>
                </div>
              </div>

              <div>
                <p className="text-gray-400 font-medium">Previous School Name</p>
                <p className="font-semibold text-gray-900 text-sm mt-0.5">{viewingStudent.previousSchool}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 font-medium">Email</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{viewingStudent.email}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Phone</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{viewingStudent.phone}</p>
                </div>
              </div>

              {viewingStudent.guardianName && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-gray-400 font-medium">Guardian Name</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{viewingStudent.guardianName}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 font-medium">Guardian Phone</p>
                    <p className="font-semibold text-gray-900 mt-0.5">{viewingStudent.guardianPhone}</p>
                  </div>
                </div>
              )}

              {viewingStudent.address && (
                <div className="pt-2 border-t">
                  <p className="text-gray-400 font-medium">Permanent Address</p>
                  <p className="font-medium text-gray-800 mt-0.5">{viewingStudent.address}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setViewingStudent(null)} className="bg-[#2f4692] text-white">Close</Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setEditingStudent(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Edit className="w-5 h-5 text-amber-600" /> Edit Student Record
            </h2>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Student Full Name</label>
                  <Input value={editingStudent.name} onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Register Number</label>
                  <Input value={editingStudent.registerNumber} onChange={e => setEditingStudent({ ...editingStudent, registerNumber: e.target.value })} required />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                  <Input value={editingStudent.email} onChange={e => setEditingStudent({ ...editingStudent, email: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                  <Input value={editingStudent.phone} onChange={e => setEditingStudent({ ...editingStudent, phone: e.target.value })} required />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
                  <select value={editingStudent.department} onChange={e => setEditingStudent({ ...editingStudent, department: e.target.value })} className="w-full border border-gray-300 rounded-md p-2 text-sm">
                    {departmentsList.map((d, i) => <option key={i} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Course</label>
                  <Input value={editingStudent.course} onChange={e => setEditingStudent({ ...editingStudent, course: e.target.value })} required />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Previous School Name</label>
                  <Input value={editingStudent.previousSchool} onChange={e => setEditingStudent({ ...editingStudent, previousSchool: e.target.value })} required />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select value={editingStudent.status} onChange={e => setEditingStudent({ ...editingStudent, status: e.target.value as any })} className="w-full border border-gray-300 rounded-md p-2 text-sm">
                    <option value="Active">Active</option>
                    <option value="Graduated">Graduated</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Batch Year</label>
                  <Input value={editingStudent.batch} onChange={e => setEditingStudent({ ...editingStudent, batch: e.target.value })} />
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

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  X, 
  Download,
  Mail,
  Phone,
  RefreshCw,
  Upload,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { BulkUploadDialog } from './BulkUploadDialog';

interface Department {
  id: string;
  code: string;
  name: string;
  hodName: string;
  hodEmail: string;
  establishedYear: number | null;
  phone: string;
  description: string;
  status: 'Active' | 'Inactive';
}

interface DepartmentDetailsPageProps {
  onNavigate: (page: string) => void;
}

export function DepartmentDetailsPage({ onNavigate }: DepartmentDetailsPageProps) {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name-asc');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [viewingDept, setViewingDept] = useState<Department | null>(null);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  
  // Form states for Add
  const [newDept, setNewDept] = useState({
    code: '',
    name: '',
    hodName: '',
    hodEmail: '',
    establishedYear: '',
    phone: '',
    description: '',
    status: 'Active' as 'Active' | 'Inactive'
  });

  const fetchDepartments = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/departments', {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setDepartments(data.data);
      } else {
        setError(data.message || 'Failed to fetch departments');
      }
    } catch (err: any) {
      setError('Connection error. Is backend server running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [user]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          ...newDept,
          establishedYear: newDept.establishedYear ? parseInt(newDept.establishedYear) : null
        })
      });
      const data = await response.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setNewDept({
          code: '',
          name: '',
          hodName: '',
          hodEmail: '',
          establishedYear: '',
          phone: '',
          description: '',
          status: 'Active'
        });
        fetchDepartments();
      } else {
        setError(data.message || 'Failed to add department');
      }
    } catch (err) {
      setError('Failed to create department. Please check details.');
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    setError('');
    try {
      const response = await fetch(`http://localhost:5000/api/departments/${editingDept.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          ...editingDept,
          establishedYear: editingDept.establishedYear ? Number(editingDept.establishedYear) : null
        })
      });
      const data = await response.json();
      if (data.success) {
        setEditingDept(null);
        fetchDepartments();
      } else {
        setError(data.message || 'Failed to update department');
      }
    } catch (err) {
      setError('Failed to update department.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/departments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        fetchDepartments();
      } else {
        alert(data.message || 'Failed to delete department');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const exportToCSV = () => {
    const headers = ['Code', 'Name', 'HOD Name', 'HOD Email', 'Established Year', 'Phone', 'Description', 'Status'];
    const rows = sortedAndFilteredDepts.map(d => [
      d.code,
      `"${d.name.replace(/"/g, '""')}"`,
      `"${(d.hodName || 'NIL').replace(/"/g, '""')}"`,
      `"${(d.hodEmail || 'NIL').replace(/"/g, '""')}"`,
      d.establishedYear || 'NIL',
      d.phone || 'NIL',
      `"${(d.description || 'NIL').replace(/"/g, '""')}"`,
      d.status
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `departments_directory_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter & Sort logic
  const filteredDepts = departments.filter(d => {
    const matchesSearch = 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.hodName && d.hodName.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const sortedAndFilteredDepts = [...filteredDepts].sort((a, b) => {
    if (sortBy === 'name-asc') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'name-desc') {
      return b.name.localeCompare(a.name);
    }
    if (sortBy === 'code-asc') {
      return a.code.localeCompare(b.code);
    }
    if (sortBy === 'code-desc') {
      return b.code.localeCompare(a.code);
    }
    if (sortBy === 'est-desc') {
      return (b.establishedYear || 0) - (a.establishedYear || 0);
    }
    if (sortBy === 'est-asc') {
      return (a.establishedYear || 0) - (b.establishedYear || 0);
    }
    return 0;
  });

  // Dynamic statistics
  const totalDepartments = departments.length;
  const activeDepartments = departments.filter(d => d.status === 'Active').length;
  const inactiveDepartments = departments.filter(d => d.status === 'Inactive').length;
  const recentEstd = departments.length > 0 
    ? Math.max(...departments.map(d => d.establishedYear || 0).filter(y => y > 0)) 
    : '-';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar currentPage="department-details" onNavigate={onNavigate} />
      
      <main className="flex-1 ml-64 p-8">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-200 mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-7 h-7 text-[#2f4692]" />
              Department Details
            </h1>
            <p className="text-gray-500 text-sm mt-1">Manage institutional departments, HOD assignments, and profiles.</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              onClick={fetchDepartments}
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
              onClick={() => setIsAddModalOpen(true)}
              className="bg-[#2f4692] hover:bg-[#243a7a] text-white flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Department
            </Button>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-md flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-white border border-gray-200 shadow-sm hover:shadow transition-shadow">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Departments</p>
            <p className="text-3xl font-bold text-gray-900">{totalDepartments}</p>
            <div className="text-xs text-gray-400 mt-2">Registered in directory</div>
          </Card>
          
          <Card className="p-6 bg-white border border-gray-200 shadow-sm hover:shadow transition-shadow">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">Active Departments</p>
            <p className="text-3xl font-bold text-green-700">{activeDepartments}</p>
            <div className="text-xs text-gray-400 mt-2">Currently operational</div>
          </Card>

          <Card className="p-6 bg-white border border-gray-200 shadow-sm hover:shadow transition-shadow">
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider mb-1">Inactive Departments</p>
            <p className="text-3xl font-bold text-orange-700">{inactiveDepartments}</p>
            <div className="text-xs text-gray-400 mt-2">Archived / Suspended</div>
          </Card>

          <Card className="p-6 bg-white border border-gray-200 shadow-sm hover:shadow transition-shadow">
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mb-1">Latest Establishment</p>
            <p className="text-3xl font-bold text-purple-700">{recentEstd}</p>
            <div className="text-xs text-gray-400 mt-2">Most recently founded</div>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search by code, department name, or HOD name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 border-gray-300 w-full"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Filter className="w-4 h-4" />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md p-1.5 text-sm bg-white text-gray-700"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-md p-1.5 text-sm bg-white text-gray-700"
            >
              <option value="name-asc">Sort: Name (A-Z)</option>
              <option value="name-desc">Sort: Name (Z-A)</option>
              <option value="code-asc">Sort: Code (A-Z)</option>
              <option value="code-desc">Sort: Code (Z-A)</option>
              <option value="est-desc">Sort: Est Year (Newest)</option>
              <option value="est-asc">Sort: Est Year (Oldest)</option>
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <Card className="overflow-hidden border border-gray-200 shadow-sm bg-white rounded-lg">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 text-center text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2f4692] mb-3" />
                <p className="text-sm font-medium">Fetching departments...</p>
              </div>
            ) : sortedAndFilteredDepts.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-base font-semibold text-gray-700">No departments found</p>
                <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-left w-16">S.No</th>
                    <th className="py-3.5 px-4 text-left w-24">Code</th>
                    <th className="py-3.5 px-4 text-left">Department Name</th>
                    <th className="py-3.5 px-4 text-left">HOD Name</th>
                    <th className="py-3.5 px-4 text-left">HOD Email</th>
                    <th className="py-3.5 px-4 text-center w-24">Est. Year</th>
                    <th className="py-3.5 px-4 text-center w-28">Status</th>
                    <th className="py-3.5 px-4 text-right w-28">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white text-sm">
                  {sortedAndFilteredDepts.map((dept, index) => (
                    <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-gray-400">{index + 1}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#2f4692]">{dept.code}</td>
                      <td className="py-3 px-4 font-semibold text-gray-900">{dept.name}</td>
                      <td className="py-3 px-4 text-gray-700 font-medium">{dept.hodName || 'NIL'}</td>
                      <td className="py-3 px-4 text-gray-500 text-xs truncate max-w-[180px]" title={dept.hodEmail}>
                        {dept.hodEmail ? (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            {dept.hodEmail}
                          </span>
                        ) : 'NIL'}
                      </td>
                      <td className="py-3 px-4 font-mono text-center text-gray-600">{dept.establishedYear || 'NIL'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          dept.status === 'Active' 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {dept.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setViewingDept(dept)}
                            className="p-1 text-gray-400 hover:text-[#2f4692] hover:bg-gray-100 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingDept(dept)}
                            className="p-1 text-gray-400 hover:text-green-600 hover:bg-gray-100 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(dept.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-100 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </main>

      {/* VIEW MODAL */}
      {viewingDept && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-gradient-to-r from-[#2f4692] to-[#243a7a] p-4 text-white flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Department Profile - {viewingDept.code}
              </h2>
              <button onClick={() => setViewingDept(null)} className="text-white hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Department Name</span>
                <p className="text-lg font-bold text-gray-900">{viewingDept.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4 border-gray-100">
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">HOD Name</span>
                  <p className="text-sm font-medium text-gray-800">{viewingDept.hodName || 'NIL'}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">HOD Email</span>
                  <p className="text-sm font-medium text-gray-800">{viewingDept.hodEmail || 'NIL'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-4 border-gray-100">
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Established Year</span>
                  <p className="text-sm font-mono text-gray-800">{viewingDept.establishedYear || 'NIL'}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Contact Phone</span>
                  <p className="text-sm font-mono text-gray-800">{viewingDept.phone || 'NIL'}</p>
                </div>
              </div>

              <div className="border-t pt-4 border-gray-100">
                <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Description</span>
                <p className="text-sm text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-100 mt-1 whitespace-pre-wrap leading-relaxed">
                  {viewingDept.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  viewingDept.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {viewingDept.status}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <Button onClick={() => setViewingDept(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 border-none">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="bg-[#2f4692] p-4 text-white flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Register New Department
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-white hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Code **</label>
                    <Input
                      placeholder="e.g. CSE"
                      value={newDept.code}
                      onChange={e => setNewDept({ ...newDept, code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Department Name **</label>
                    <Input
                      placeholder="e.g. Computer Science..."
                      value={newDept.name}
                      onChange={e => setNewDept({ ...newDept, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">HOD Name</label>
                    <Input
                      placeholder="Dr. John Doe"
                      value={newDept.hodName}
                      onChange={e => setNewDept({ ...newDept, hodName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">HOD Email</label>
                    <Input
                      type="email"
                      placeholder="john.doe@university.in"
                      value={newDept.hodEmail}
                      onChange={e => setNewDept({ ...newDept, hodEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Established Year</label>
                    <Input
                      type="number"
                      placeholder="e.g. 2005"
                      value={newDept.establishedYear}
                      onChange={e => setNewDept({ ...newDept, establishedYear: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                    <Input
                      placeholder="e.g. 080-123456"
                      value={newDept.phone}
                      onChange={e => setNewDept({ ...newDept, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2f4692] focus:border-transparent"
                    placeholder="Enter department scope and description..."
                    rows={3}
                    value={newDept.description}
                    onChange={e => setNewDept({ ...newDept, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={newDept.status}
                    onChange={e => setNewDept({ ...newDept, status: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-[#2f4692] text-white">Save Department</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingDept && (
        <div className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-4 text-white flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Edit Department - {editingDept.code}
              </h2>
              <button onClick={() => setEditingDept(null)} className="text-white hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Code **</label>
                    <Input
                      value={editingDept.code}
                      onChange={e => setEditingDept({ ...editingDept, code: e.target.value.toUpperCase() })}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Department Name **</label>
                    <Input
                      value={editingDept.name}
                      onChange={e => setEditingDept({ ...editingDept, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">HOD Name</label>
                    <Input
                      value={editingDept.hodName || ''}
                      onChange={e => setEditingDept({ ...editingDept, hodName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">HOD Email</label>
                    <Input
                      type="email"
                      value={editingDept.hodEmail || ''}
                      onChange={e => setEditingDept({ ...editingDept, hodEmail: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Established Year</label>
                    <Input
                      type="number"
                      value={editingDept.establishedYear !== null ? String(editingDept.establishedYear) : ''}
                      onChange={e => setEditingDept({ ...editingDept, establishedYear: e.target.value ? parseInt(e.target.value) : null })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                    <Input
                      value={editingDept.phone || ''}
                      onChange={e => setEditingDept({ ...editingDept, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    rows={3}
                    value={editingDept.description || ''}
                    onChange={e => setEditingDept({ ...editingDept, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={editingDept.status}
                    onChange={e => setEditingDept({ ...editingDept, status: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3 border-t">
                <Button type="button" variant="outline" onClick={() => setEditingDept(null)}>Cancel</Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">Update Department</Button>
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
        onSuccess={fetchDepartments}
        uploadType="departments"
      />
    </div>
  );
}

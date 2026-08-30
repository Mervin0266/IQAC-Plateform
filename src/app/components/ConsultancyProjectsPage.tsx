import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  DollarSign, TrendingUp, Briefcase, Plus, Upload, Pencil, Trash2,
  CheckCircle, Clock, AlertCircle, X, Building, Calendar
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { BulkUploadDialog } from './BulkUploadDialog';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';
import { normalizeDepartmentName } from './FacultyDetailsPage';

interface ConsultancyProjectsPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
  hideSidebar?: boolean;
  token?: string;
  userRole?: string;
}

interface ConsultancyProject {
  id: string;
  teacherConsultant: string;
  projectName: string;
  sponsoringAgency: string;
  year: string;
  revenueInLakhs: number;
  department: string;
  status: string;
  createdAt?: string;
  creator?: { name: string; email: string; department: string };
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const YEARS = Array.from({ length: new Date().getFullYear() - 2018 + 1 }, (_, i) => {
  const y = new Date().getFullYear() - i;
  return `${y}-${String(y + 1).slice(-2)}`;
});

const EMPTY_FORM = {
  teacherConsultant: '',
  projectName: '',
  sponsoringAgency: '',
  year: '',
  revenueInLakhs: '',
  department: '',
};

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  draft: { color: 'bg-gray-100 text-gray-700 border-gray-200', icon: <Clock className="w-3 h-3" /> },
  submitted: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Clock className="w-3 h-3" /> },
  under_coordinator_review: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <AlertCircle className="w-3 h-3" /> },
  approved: { color: 'bg-teal-100 text-teal-700 border-teal-200', icon: <CheckCircle className="w-3 h-3" /> },
  finalized: { color: 'bg-green-100 text-green-700 border-green-200', icon: <CheckCircle className="w-3 h-3" /> },
  returned_for_correction: { color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <AlertCircle className="w-3 h-3" /> },
  rejected: { color: 'bg-red-100 text-red-700 border-red-200', icon: <X className="w-3 h-3" /> },
};

function formatStatus(status: string) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function ConsultancyProjectsPage({
  onNavigate, isPublicView = false, hideSidebar = false, token = '', userRole = 'faculty'
}: ConsultancyProjectsPageProps) {
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [projects, setProjects] = useState<ConsultancyProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form dialog
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<ConsultancyProject | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Bulk upload dialog
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedYear !== 'all') params.append('year', selectedYear);
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
      const res = await fetch(`${API_BASE}/api/consultancy-projects?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProjects(data.data);
      } else {
        setError(data.message || 'Failed to load records');
      }
    } catch {
      setError('Connection failed. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  }, [token, selectedYear, selectedDepartment]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Stats computed from loaded data
  const totalRevenue = projects.reduce((sum, p) => sum + Number(p.revenueInLakhs || 0), 0);
  const departmentMap = projects.reduce((acc, p) => {
    const d = p.department || 'Unknown';
    if (!acc[d]) acc[d] = { count: 0, revenue: 0 };
    acc[d].count++;
    acc[d].revenue += Number(p.revenueInLakhs || 0);
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  const activeDepartmentsCount = Object.keys(departmentMap).length;
  const { departmentList: dbDepts } = useAcademicHierarchy();
  const departments = React.useMemo(() => {
    const set = new Set<string>();
    dbDepts.forEach(d => {
      if (d) set.add(normalizeDepartmentName(d));
    });
    projects.forEach(p => {
      if (p.department) set.add(normalizeDepartmentName(p.department));
    });
    if (set.size === 0) {
      return [
        'AI and Data Science Engineering',
        'Civil Engineering',
        'Computer Science and Engineering',
        'Electrical and Electronics Engineering',
        'Electronics and Communication Engineering',
        'Mechanical and Automobile Engineering',
        'Sciences and Humanities (Engineering)'
      ];
    }
    return Array.from(set).sort();
  }, [dbDepts, projects]);

  const handleOpenForm = (project?: ConsultancyProject) => {
    if (project) {
      setEditingProject(project);
      setFormData({
        teacherConsultant: project.teacherConsultant,
        projectName: project.projectName,
        sponsoringAgency: project.sponsoringAgency,
        year: project.year,
        revenueInLakhs: String(project.revenueInLakhs),
        department: project.department || '',
      });
    } else {
      setEditingProject(null);
      setFormData(EMPTY_FORM);
    }
    setFormError('');
    setShowForm(true);
  };

  const handleFormSubmit = async () => {
    if (!formData.teacherConsultant.trim() || !formData.projectName.trim() || !formData.sponsoringAgency.trim() || !formData.year) {
      setFormError('Please fill in all required fields.');
      return;
    }
    setFormLoading(true);
    setFormError('');
    try {
      const url = editingProject
        ? `${API_BASE}/api/consultancy-projects/${editingProject.id}`
        : `${API_BASE}/api/consultancy-projects`;
      const method = editingProject ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          revenueInLakhs: parseFloat(formData.revenueInLakhs) || 0,
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowForm(false);
        fetchProjects();
      } else {
        setFormError(data.message || 'Failed to save record');
      }
    } catch {
      setFormError('Connection failed. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/consultancy-projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDeletingId(null);
        fetchProjects();
      }
    } catch {
      // silently fail
    }
  };

  const canEdit = userRole === 'admin' || userRole === 'coordinator' || userRole === 'hod' || userRole === 'faculty';
  const canDelete = userRole === 'admin' || userRole === 'coordinator';
  const canBulkUpload = userRole === 'admin' || userRole === 'coordinator' || userRole === 'hod' || userRole === 'faculty';

  // ─── PUBLIC VIEW ────────────────────────────────────────────────────────────
  if (isPublicView) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4 mb-4">
              <Briefcase className="w-12 h-12" />
              <div>
                <h1 className="text-4xl font-bold">Consultancy Projects</h1>
                <p className="text-teal-100 mt-2">Bridging academia and industry through innovative solutions</p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12">
            <Card className="border-l-4 border-l-teal-500">
              <CardHeader>
                <CardDescription className="text-xs">Total Projects</CardDescription>
                <CardTitle className="text-3xl font-bold text-teal-600">{projects.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-teal-500">
              <CardHeader>
                <CardDescription className="text-xs">Total Revenue</CardDescription>
                <CardTitle className="text-3xl font-bold text-teal-600">₹{totalRevenue.toFixed(2)}L</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-l-4 border-l-teal-500">
              <CardHeader>
                <CardDescription className="text-xs">Departments</CardDescription>
                <CardTitle className="text-3xl font-bold text-teal-600">{activeDepartmentsCount}</CardTitle>
              </CardHeader>
            </Card>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-teal-600 text-white">
                <tr>
                  <th className="py-3 px-4">S. No.</th>
                  <th className="py-3 px-4">Teacher Consultant</th>
                  <th className="py-3 px-4">Project Name</th>
                  <th className="py-3 px-4">Sponsoring Agency</th>
                  <th className="py-3 px-4">Year</th>
                  <th className="py-3 px-4">Revenue (₹ Lakhs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {projects.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-500 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium">{p.teacherConsultant}</td>
                    <td className="py-3 px-4">{p.projectName}</td>
                    <td className="py-3 px-4 text-gray-600">{p.sponsoringAgency}</td>
                    <td className="py-3 px-4 font-mono">{p.year}</td>
                    <td className="py-3 px-4 font-bold text-teal-700">₹{Number(p.revenueInLakhs).toFixed(2)}</td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-gray-400">No records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── INTERNAL VIEW ──────────────────────────────────────────────────────────
  return (
    <div className={hideSidebar ? '' : 'min-h-screen bg-gray-50'}>
      {!hideSidebar && <Sidebar currentPage="consultancy-projects" onNavigate={onNavigate} />}
      <main className={hideSidebar ? 'p-0' : 'ml-64 p-8'}>
        <div className={hideSidebar ? '' : 'p-6'}>

          {/* Page Title + Actions */}
          <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
            {!hideSidebar ? (
              <div>
                <h1 className="text-2xl font-medium text-gray-900 mb-1">Consultancy Projects</h1>
                <p className="text-gray-500 text-sm">NIRF consultancy data — track teacher consultants, projects and revenue</p>
              </div>
            ) : (
              <div></div>
            )}
            <div className="flex gap-3">
              {canBulkUpload && (
                <Button
                  variant="outline"
                  className="flex items-center gap-2 border-teal-600 text-teal-700 hover:bg-teal-50"
                  onClick={() => setShowBulkUpload(true)}
                >
                  <Upload className="w-4 h-4" />
                  Bulk Upload (CSV/Excel)
                </Button>
              )}
              {canEdit && (
                <Button
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white"
                  onClick={() => handleOpenForm()}
                >
                  <Plus className="w-4 h-4" />
                  Add Entry
                </Button>
              )}
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-l-4 border-l-blue-600">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>Total Entries</CardDescription>
                  <Briefcase className="w-5 h-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{projects.length}</div>
                <p className="text-xs text-gray-500 mt-1">All consultancy records</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-600">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>Total Revenue</CardDescription>
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">₹{totalRevenue.toFixed(2)}L</div>
                <p className="text-xs text-gray-500 mt-1">INR in Lakhs</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-600">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>Departments</CardDescription>
                  <Building className="w-5 h-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{activeDepartmentsCount}</div>
                <p className="text-xs text-gray-500 mt-1">Departments involved</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-600">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>Avg Revenue / Entry</CardDescription>
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  ₹{projects.length ? (totalRevenue / projects.length).toFixed(2) : '0.00'}L
                </div>
                <p className="text-xs text-gray-500 mt-1">Per project</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filter Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Academic Year</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {YEARS.map(y => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Department</label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs: Table view + Department Stats */}
          <Tabs defaultValue="table" className="space-y-6">
            <TabsList>
              <TabsTrigger value="table">All Records</TabsTrigger>
              <TabsTrigger value="department">Department-wise</TabsTrigger>
            </TabsList>

            <TabsContent value="table">
              <Card>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="py-16 text-center text-gray-400">Loading records…</div>
                  ) : error ? (
                    <div className="py-16 text-center text-red-500">{error}</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="py-3 px-4 font-semibold text-gray-600 whitespace-nowrap">S. No.</th>
                            <th className="py-3 px-4 font-semibold text-gray-600 whitespace-nowrap">Teacher Consultant</th>
                            <th className="py-3 px-4 font-semibold text-gray-600 whitespace-nowrap">Project Name</th>
                            <th className="py-3 px-4 font-semibold text-gray-600 whitespace-nowrap">Consulting/Sponsoring Agency</th>
                            <th className="py-3 px-4 font-semibold text-gray-600 whitespace-nowrap">Year</th>
                            <th className="py-3 px-4 font-semibold text-gray-600 whitespace-nowrap">Revenue (₹ Lakhs)</th>
                            <th className="py-3 px-4 font-semibold text-gray-600 whitespace-nowrap">Status</th>
                            {(canEdit || canDelete) && (
                              <th className="py-3 px-4 font-semibold text-gray-600 whitespace-nowrap">Actions</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {projects.map((project, idx) => {
                            const sc = STATUS_CONFIG[project.status] || STATUS_CONFIG['draft'];
                            return (
                              <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 font-mono text-gray-500">{idx + 1}</td>
                                <td className="py-3 px-4 font-semibold text-gray-900 max-w-[160px] truncate" title={project.teacherConsultant}>
                                  {project.teacherConsultant}
                                </td>
                                <td className="py-3 px-4 max-w-[180px] truncate" title={project.projectName}>
                                  {project.projectName}
                                </td>
                                <td className="py-3 px-4 max-w-[200px] truncate text-gray-600" title={project.sponsoringAgency}>
                                  {project.sponsoringAgency}
                                </td>
                                <td className="py-3 px-4 font-mono">{project.year}</td>
                                <td className="py-3 px-4 font-bold text-green-700">₹{Number(project.revenueInLakhs).toFixed(2)}</td>
                                <td className="py-3 px-4">
                                  <Badge className={`${sc.color} flex items-center gap-1 w-fit text-xs`}>
                                    {sc.icon}
                                    {formatStatus(project.status)}
                                  </Badge>
                                </td>
                                {(canEdit || canDelete) && (
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      {canEdit && (
                                        <button
                                          onClick={() => handleOpenForm(project)}
                                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                          title="Edit"
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </button>
                                      )}
                                      {canDelete && (
                                        <button
                                          onClick={() => setDeletingId(project.id)}
                                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                          {projects.length === 0 && (
                            <tr>
                              <td colSpan={8} className="py-16 text-center text-gray-400">
                                No consultancy records found.
                                {canEdit && (
                                  <button
                                    onClick={() => handleOpenForm()}
                                    className="ml-2 text-teal-600 underline hover:text-teal-800"
                                  >
                                    Add the first entry
                                  </button>
                                )}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="department">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Object.entries(departmentMap).map(([dept, stats]) => (
                  <Card key={dept} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-base leading-snug">{dept}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Total Projects</span>
                          <span className="text-xl font-bold text-blue-600">{stats.count}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Total Revenue</span>
                          <span className="text-xl font-bold text-green-600">₹{stats.revenue.toFixed(2)}L</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Avg per Project</span>
                          <span className="text-base font-semibold text-gray-700">
                            ₹{(stats.revenue / stats.count).toFixed(2)}L
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {Object.keys(departmentMap).length === 0 && (
                  <div className="col-span-3 py-16 text-center text-gray-400">No data available</div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* ─── ADD / EDIT FORM DIALOG ─────────────────────────────────────────── */}
      <Dialog open={showForm} onOpenChange={open => !open && setShowForm(false)}>
        <DialogContent className="sm:max-w-[600px] bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-teal-600" />
              {editingProject ? 'Edit Consultancy Project' : 'Add Consultancy Project'}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Enter NIRF consultancy data. Fields marked * are required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  Name of the Teacher Consultant <span className="text-red-500">*</span>
                </Label>
                <input
                  type="text"
                  value={formData.teacherConsultant}
                  onChange={e => setFormData(f => ({ ...f, teacherConsultant: e.target.value }))}
                  placeholder="e.g., Dr. Rajesh Kumar"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  Name of Consultancy Project <span className="text-red-500">*</span>
                </Label>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={e => setFormData(f => ({ ...f, projectName: e.target.value }))}
                  placeholder="e.g., Smart City Infrastructure Planning"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  Consulting/Sponsoring Agency with Contact Details <span className="text-red-500">*</span>
                </Label>
                <textarea
                  value={formData.sponsoringAgency}
                  onChange={e => setFormData(f => ({ ...f, sponsoringAgency: e.target.value }))}
                  placeholder="e.g., Bangalore Smart City Corporation, Ph: 080-12345678, Email: info@bscc.gov.in"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-1.5 block">
                    Department
                  </Label>
                  <Select value={formData.department} onValueChange={v => setFormData(f => ({ ...f, department: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-1.5 block">
                    Academic Year <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.year} onValueChange={v => setFormData(f => ({ ...f, year: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map(y => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-1.5 block">
                    Revenue Generated (₹ Lakhs)
                  </Label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.revenueInLakhs}
                    onChange={e => setFormData(f => ({ ...f, revenueInLakhs: e.target.value }))}
                    placeholder="e.g., 25.50"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {formError}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={formLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleFormSubmit}
              disabled={formLoading}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {formLoading ? 'Saving…' : editingProject ? 'Update Record' : 'Submit Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRM DIALOG ──────────────────────────────────────────── */}
      <Dialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <DialogContent className="sm:max-w-[400px] bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-700 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this consultancy record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingId(null)}>Cancel</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── BULK UPLOAD DIALOG ─────────────────────────────────────────────── */}
      {showBulkUpload && (
        <BulkUploadDialog
          isOpen={showBulkUpload}
          onClose={() => setShowBulkUpload(false)}
          token={token}
          onSuccess={() => {
            setShowBulkUpload(false);
            fetchProjects();
          }}
          uploadType="consultancy"
        />
      )}
    </div>
  );
}
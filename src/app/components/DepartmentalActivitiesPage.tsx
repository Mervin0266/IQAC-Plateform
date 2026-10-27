import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Plus,
  RefreshCw,
  Upload,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Filter,
  Layers,
  ChevronRight,
  BookOpen,
  Award,
  Users,
  GraduationCap,
  Sparkles,
  X,
  FileUp,
  Download,
  FolderOpen,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BulkUploadDialog } from './BulkUploadDialog';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { normalizeAcademicYear, normalizeDepartmentName } from './FacultyDetailsPage';
import { AppShell, PageHeader, StatCard, StatusBadge } from './design-system';

export interface DepartmentalActivity {
  id: string;
  academicYear: string;
  campus: string;
  school: string;
  department: string;
  activityCategory: string;
  title: string;
  reportDetails?: string;
  reportYear?: string;
  eventDate?: string;
  resourcePersons?: string;
  participantsCount?: number;
  documentUrl?: string;
  status: 'Completed' | 'Pending' | 'In Progress';
  pendingNotes?: string;
}

const DEPARTMENTS = [
  'Civil Engineering',
  'Computer Science and Engineering',
  'Electronics and Communication Engineering',
  'Electrical and Electronics Engineering',
  'Mechanical and Automobile Engineering',
  'Sciences and Humanities (Engineering)',
  'AI and Data Science Engineering',
  'School of Architecture'
];

const ACTIVITY_CATEGORIES = [
  'Faculty Development Activities',
  'Seminar / Talks / Training Program',
  'Club Association',
  'Seminar / Conference / Guest Talks',
  'Awards and Recognitions',
  'Workshops and Skill Development',
  'Student Development Program',
  'Industrial Visit',
  'Social Outreach Program',
  'Guest Lectures',
  'Memorandum of Understanding',
  'Extension Activity',
  'Student Publications',
  'Best Practices',
  'SDG Related Events'
];

const CAMPUSES = [
  'Bangalore Kengeri Campus',
  'Bangalore Central Campus',
  'Bangalore Bannerghatta Campus',
  'Delhi NCR Campus',
  'Pune Lavasa Campus'
];

const SCHOOLS = [
  'School of Engineering and Technology',
  'School of Architecture',
  'School of Sciences',
  'School of Business and Management',
  'School of Law',
  'School of Arts and Humanities'
];

interface DepartmentalActivitiesPageProps {
  onNavigate?: (page: string) => void;
  currentPage?: string;
  hideSidebar?: boolean;
}

export function DepartmentalActivitiesPage({ onNavigate, currentPage = 'departmental-activities', hideSidebar = false }: DepartmentalActivitiesPageProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'matrix' | 'directory' | 'pending'>('matrix');

  // Data states
  const [activities, setActivities] = useState<DepartmentalActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Filters
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('All');
  const [campusFilter, setCampusFilter] = useState<string>('All');
  const [schoolFilter, setSchoolFilter] = useState<string>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingActivity, setEditingActivity] = useState<DepartmentalActivity | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState<boolean>(false);
  const [selectedCellData, setSelectedCellData] = useState<{ dept: string; cat: string; items: DepartmentalActivity[] } | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<DepartmentalActivity>>({
    academicYear: '2024-2025',
    campus: 'Bangalore Kengeri Campus',
    school: 'School of Engineering and Technology',
    department: 'AI and Data Science Engineering',
    activityCategory: 'Faculty Development Activities',
    title: '',
    reportDetails: 'Reports 2025',
    eventDate: '',
    resourcePersons: '',
    participantsCount: 0,
    status: 'Completed',
    pendingNotes: ''
  });

  const fetchActivities = async () => {
    setLoading(true);
    setError('');
    try {
      if (user?.token) {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/departmental-activities`, {
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setActivities(data.data);
        } else {
          setActivities([]);
        }
      } else {
        setActivities([]);
      }
    } catch (err) {
      console.error('Fetch departmental activities error:', err);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [user]);

  const getMockActivities = (): DepartmentalActivity[] => [];

  // Dynamically compute available Academic Years from departmental activities records
  const availableAcademicYears = useMemo(() => {
    const yearsSet = new Set<string>(['2026-2027', '2025-2026', '2024-2025', '2023-2024', '2022-2023', '2021-2022']);
    activities.forEach(act => {
      const norm = normalizeAcademicYear(act.academicYear);
      if (norm) {
        yearsSet.add(norm);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [activities]);

  // Dynamic Filtered Activities List
  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      const matchesSearch = !searchTerm ||
        act.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        act.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        act.activityCategory.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (act.reportDetails && act.reportDetails.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesYear = academicYearFilter === 'All' || normalizeAcademicYear(act.academicYear) === normalizeAcademicYear(academicYearFilter);
      const matchesCampus = campusFilter === 'All' || act.campus === campusFilter;
      const matchesSchool = schoolFilter === 'All' || act.school === schoolFilter;
      const matchesDept = departmentFilter === 'All' || normalizeDepartmentName(act.department) === normalizeDepartmentName(departmentFilter);
      const matchesCat = categoryFilter === 'All' || act.activityCategory === categoryFilter;
      const matchesStatus = statusFilter === 'All' || act.status === statusFilter;

      return matchesSearch && matchesYear && matchesCampus && matchesSchool && matchesDept && matchesCat && matchesStatus;
    });
  }, [activities, searchTerm, academicYearFilter, campusFilter, schoolFilter, departmentFilter, categoryFilter, statusFilter]);

  // Dynamic KPI Stats derived from filteredActivities
  const activeDepartmentsCount = useMemo(() => {
    if (departmentFilter !== 'All') return 1;
    const depts = new Set(filteredActivities.map(a => a.department));
    return depts.size;
  }, [filteredActivities, departmentFilter]);

  const completedReportsCount = useMemo(() => {
    return filteredActivities.filter(a => a.status === 'Completed').length;
  }, [filteredActivities]);

  const pendingActivities = useMemo(() => {
    return filteredActivities.filter(a => a.status === 'Pending');
  }, [filteredActivities]);

  const totalParticipants = useMemo(() => {
    return filteredActivities.reduce((acc, a) => acc + (a.participantsCount || 0), 0);
  }, [filteredActivities]);

  // Matrix calculation responding to filteredActivities & selected filters
  const matrixData = useMemo(() => {
    const matrix: Record<string, Record<string, { reportDetails: string; items: DepartmentalActivity[] }>> = {};
    const eventStatus: Record<string, 'Updated' | 'No Events found'> = {};
    const pendingNotesMap: Record<string, string[]> = {};

    const visibleDepts = departmentFilter === 'All' ? DEPARTMENTS : DEPARTMENTS.filter(d => d === departmentFilter);
    const visibleCats = categoryFilter === 'All' ? ACTIVITY_CATEGORIES : ACTIVITY_CATEGORIES.filter(c => c === categoryFilter);

    visibleDepts.forEach(dept => {
      matrix[dept] = {};
      eventStatus[dept] = 'No Events found';
      pendingNotesMap[dept] = [];

      visibleCats.forEach(cat => {
        matrix[dept][cat] = { reportDetails: '-', items: [] };
      });
    });

    filteredActivities.forEach(act => {
      const dept = act.department;
      const cat = act.activityCategory;

      if (matrix[dept] && matrix[dept][cat]) {
        matrix[dept][cat].items.push(act);
        eventStatus[dept] = 'Updated';

        if (act.reportDetails && act.reportDetails !== '-') {
          matrix[dept][cat].reportDetails = act.reportDetails;
        }
      }

      if (act.status === 'Pending' && act.pendingNotes) {
        if (pendingNotesMap[dept] && !pendingNotesMap[dept].includes(act.pendingNotes)) {
          pendingNotesMap[dept].push(act.pendingNotes);
        }
      }
    });

    return { matrix, eventStatus, pendingNotesMap, visibleDepts, visibleCats };
  }, [filteredActivities, departmentFilter, categoryFilter]);

  // Handle Add/Edit Form submission
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingActivity) {
        // Update
        if (user?.token) {
          await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/departmental-activities/${editingActivity.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify(formData)
          });
        }
        setActivities(activities.map(a => a.id === editingActivity.id ? { ...editingActivity, ...formData } as DepartmentalActivity : a));
      } else {
        // Create
        if (user?.token) {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/departmental-activities`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify(formData)
          });
          const data = await res.json();
          if (data.success && data.data) {
            setActivities([data.data, ...activities]);
          } else {
            setActivities([{ ...formData, id: `ACT00${Date.now()}` } as DepartmentalActivity, ...activities]);
          }
        } else {
          setActivities([{ ...formData, id: `ACT00${Date.now()}` } as DepartmentalActivity, ...activities]);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setIsAddModalOpen(false);
    setEditingActivity(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this activity record?')) return;
    try {
      if (user?.token) {
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/departmental-activities/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
      }
      setActivities(activities.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear ALL departmental activity records? This action cannot be undone.')) return;
    try {
      if (user?.token) {
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/departmental-activities/clear-all?confirmAll=true&confirmation=CONFIRM_UNIVERSITY_CLEAR`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${user.token}` }
        });
      }
      setActivities([]);
    } catch (err) {
      console.error(err);
      setActivities([]);
    }
  };

  const pageContent = (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Departmental Administration' },
          { label: 'Activities & Events Matrix', active: true }
        ]}
        title="Departmental Activities Matrix"
        description="Event tracker, spreadsheet activity matrices, and pending documentation status across departments"
        badge="EVENT TRACKER"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchActivities}
              className="text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
            </Button>
            {user?.role === 'admin' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-xs font-medium border-rose-200 text-rose-700 hover:bg-rose-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-500" /> Clear All Data
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBulkUploadOpen(true)}
              className="text-xs font-medium border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload CSV / Excel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditingActivity(null);
                setFormData({
                  academicYear: '2024-2025',
                  campus: 'Bangalore Kengeri Campus',
                  school: 'School of Engineering and Technology',
                  department: 'AI and Data Science Engineering',
                  activityCategory: 'Faculty Development Activities',
                  title: '',
                  reportDetails: 'Reports 2025',
                  status: 'Completed'
                });
                setIsAddModalOpen(true);
              }}
              className="bg-[#2F4692] hover:bg-[#243A7A] text-white font-medium text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Activity Record
            </Button>
          </div>
        }
      />

      {/* 5 Standard StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Total Activities"
          value={filteredActivities.length}
          icon={Layers}
          subtitle="Logged institutional events"
        />
        <StatCard
          title="Active Departments"
          value={activeDepartmentsCount}
          icon={Building2}
          subtitle="Departments reporting"
        />
        <StatCard
          title="Completed Reports"
          value={completedReportsCount}
          icon={CheckCircle2}
          badge="Archived"
        />
        <StatCard
          title="Pending Documentation"
          value={pendingActivities.length}
          icon={Clock}
          badge={pendingActivities.length > 0 ? "Action Required" : undefined}
        />
        <StatCard
          title="Total Participants"
          value={totalParticipants.toLocaleString()}
          icon={Users}
          subtitle="Faculty & student reach"
        />
      </div>

      {/* Dynamic Filter Options Panel */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center space-x-2 text-slate-800 font-semibold text-xs tracking-wider uppercase">
            <Filter className="w-4 h-4 text-[#2F4692]" />
            <span>Filter Criteria</span>
            {(academicYearFilter !== 'All' || campusFilter !== 'All' || schoolFilter !== 'All' || departmentFilter !== 'All' || categoryFilter !== 'All' || statusFilter !== 'All' || searchTerm !== '') && (
              <span className="ml-2 px-2 py-0.5 bg-blue-50 text-[#2F4692] border border-blue-200 text-[10px] font-bold rounded-full">
                Filters Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAcademicYearFilter('All');
                setCampusFilter('All');
                setSchoolFilter('All');
                setDepartmentFilter('All');
                setCategoryFilter('All');
                setStatusFilter('All');
                setSearchTerm('');
              }}
              className="h-7 text-xs text-slate-600 hover:text-slate-900 border-slate-300"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reset Filters
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Academic Year Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Academic Year</label>
            <select
              value={academicYearFilter}
              onChange={e => setAcademicYearFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2F4692]"
            >
              <option value="All">All Academic Years</option>
              {availableAcademicYears.map(yr => (
                <option key={yr} value={yr}>
                  AY {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Campus Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Campus</label>
            <select
              value={campusFilter}
              onChange={e => setCampusFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2F4692]"
            >
              <option value="All">All Campuses</option>
              {CAMPUSES.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* School Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">School</label>
            <select
              value={schoolFilter}
              onChange={e => setSchoolFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2F4692]"
            >
              <option value="All">All Schools</option>
              {SCHOOLS.map((s, i) => (
                <option key={i} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Department</label>
            <select
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2F4692]"
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Activity Category Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Activity Category</label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2F4692]"
            >
              <option value="All">All Categories</option>
              {ACTIVITY_CATEGORIES.map((cat, i) => (
                <option key={i} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2F4692]"
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
            </select>
          </div>
        </div>
      </div>

      {/* View Tab Switcher & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          {/* Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'matrix'
                  ? 'bg-[#0B132B] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Spreadsheet Matrix View
            </button>
            <button
              onClick={() => setActiveTab('directory')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === 'directory'
                  ? 'bg-[#0B132B] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Event Directory ({filteredActivities.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-[#0B132B] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pending Documentation</span>
              {pendingActivities.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-400 text-slate-900 font-bold text-[10px] rounded-full">
                  {pendingActivities.length}
                </span>
              )}
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{filteredActivities.length}</strong> of {activities.length} total records
          </div>
        </div>

        {activeTab === 'directory' && (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by event title, department, activity category, or report details..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 text-xs w-full border-slate-200"
            />
          </div>
        )}
      </div>

          {/* TAB 1: SPREADSHEET MATRIX VIEW */}
          {activeTab === 'matrix' && (
            <Card className="bg-white border border-slate-200 shadow-xs overflow-hidden">
              <CardContent className="p-0">
                <div className="p-3 bg-[#0B132B] text-white font-semibold text-xs md:text-sm tracking-wide border-b border-slate-800 flex items-center justify-between px-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#E8C84A]" />
                    <span>Departmental Activities Matrix — School of Engineering and Technology</span>
                  </div>
                  <span className="text-[11px] text-slate-300 font-mono">
                    AY: {academicYearFilter} • {matrixData.visibleDepts.length} Departments
                  </span>
                </div>

                <div className="overflow-x-auto max-w-full">
                  <table className="w-full text-xs text-left border-collapse border border-gray-300 min-w-[1500px]">
                    <thead className="bg-gray-100 text-gray-800 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="sticky left-0 z-20 border border-gray-300 px-3 py-2 text-center min-w-[210px] max-w-[230px] bg-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)]">
                          No. of Departments
                        </th>
                        {matrixData.visibleCats.map((cat, idx) => (
                          <th key={idx} className="border border-gray-300 px-2 py-2 text-center max-w-[110px] min-w-[95px] bg-gray-100 leading-snug">
                            {cat}
                          </th>
                        ))}
                        <th className="border border-gray-300 px-2 py-2 text-center min-w-[110px] bg-gray-200">
                          Departmental Events
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-center min-w-[220px] bg-amber-100 text-amber-900">
                          Pending Reports
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {matrixData.visibleDepts.map((dept, dIdx) => {
                        const rowData = matrixData.matrix[dept];
                        const eventStatus = matrixData.eventStatus[dept];
                        const pendingNotes = matrixData.pendingNotesMap[dept];

                        return (
                          <tr key={dIdx} className="hover:bg-blue-50/50 transition-colors">
                            {/* Sticky Department Name Column */}
                            <td className="sticky left-0 z-10 border border-gray-300 px-3 py-3 font-bold text-gray-900 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.12)] leading-snug min-w-[210px] max-w-[230px]">
                              {dept}
                            </td>

                            {/* Activity Category Cells */}
                            {matrixData.visibleCats.map((cat, cIdx) => {
                              const cell = rowData[cat];
                              const hasReport = cell && cell.reportDetails !== '-';

                              return (
                                <td
                                  key={cIdx}
                                  onClick={() => setSelectedCellData({ dept, cat, items: cell.items })}
                                  className={`border border-gray-300 px-2 py-2 text-center cursor-pointer transition-all hover:bg-blue-100 ${
                                    hasReport ? 'bg-blue-50/70 font-medium text-blue-900' : 'text-gray-400'
                                  }`}
                                  title="Click to view details"
                                >
                                  {hasReport ? (
                                    <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[10px] border border-blue-200 shadow-2xs">
                                      {cell.reportDetails}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Departmental Events Status */}
                            <td className="border border-gray-300 px-2 py-2 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold ${
                                eventStatus === 'Updated'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-gray-100 text-gray-400 border border-gray-200 font-medium'
                              }`}>
                                {eventStatus}
                              </span>
                            </td>

                            {/* Pending Reports Column */}
                            <td className="border border-gray-300 px-3 py-2 text-left bg-amber-50/40 text-[10px]">
                              {pendingNotes && pendingNotes.length > 0 ? (
                                <div className="space-y-1">
                                  {pendingNotes.map((note, nIdx) => (
                                    <div key={nIdx} className="bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded font-semibold text-[10px] flex items-center gap-1.5">
                                      <AlertTriangle className="w-3 h-3 text-red-600 flex-shrink-0" />
                                      <span className="leading-snug">{note}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">No Pending Reports</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: EVENT DIRECTORY VIEW */}
          {activeTab === 'directory' && (
            <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-gray-50 border-b border-gray-200 font-semibold text-gray-600 uppercase">
                      <tr>
                        <th className="px-4 py-3">Academic Year</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Event Title</th>
                        <th className="px-4 py-3">Report Details</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredActivities.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                            No departmental activity records found.
                          </td>
                        </tr>
                      ) : (
                        filteredActivities.map(act => (
                          <tr key={act.id} className="hover:bg-gray-50/80 transition-colors">
                            <td className="px-4 py-3 font-semibold text-indigo-700">
                              <span className="bg-indigo-50 px-2 py-0.5 rounded-full text-[10px] border border-indigo-100">
                                {act.academicYear}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {act.department}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {act.activityCategory}
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-900 max-w-xs truncate">
                              {act.title}
                            </td>
                            <td className="px-4 py-3">
                              <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded text-[10px] font-semibold border border-blue-100">
                                {act.reportDetails || 'Reports 2025'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                act.status === 'Completed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {act.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right space-x-1">
                              <button
                                onClick={() => {
                                  setEditingActivity(act);
                                  setFormData(act);
                                  setIsAddModalOpen(true);
                                }}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Edit Record"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(act.id)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: PENDING REPORTS TRACKER */}
          {activeTab === 'pending' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500 text-white rounded-lg">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-900 text-sm">Pending Activity Reports Action Center</h3>
                    <p className="text-xs text-amber-700">Track and upload missing activity reports across all 7 departments.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingActivities.length === 0 ? (
                  <div className="col-span-2 bg-white p-8 rounded-xl text-center text-gray-400 border border-gray-200">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-gray-700">All Departmental Activity Reports Up To Date!</p>
                    <p className="text-xs text-gray-400">No pending report submissions required at this time.</p>
                  </div>
                ) : (
                  pendingActivities.map(p => (
                    <Card key={p.id} className="bg-white border border-amber-200 shadow-sm hover:shadow-md transition-all">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                              {p.department}
                            </span>
                            <h4 className="font-bold text-gray-900 text-sm mt-1">{p.title}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">{p.activityCategory}</p>
                          </div>
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Pending Report
                          </span>
                        </div>

                        {p.pendingNotes && (
                          <div className="bg-red-50 text-red-800 text-xs p-2 rounded border border-red-100 flex items-center gap-1.5 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                            <span>Required: {p.pendingNotes}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                          <span className="text-gray-500 font-medium">Academic Year: {p.academicYear}</span>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingActivity(p);
                                setFormData({ ...p, status: 'Completed' });
                                setIsAddModalOpen(true);
                              }}
                              className="text-xs h-7 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Completed
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

        {/* CELL DETAILS MODAL */}
      {selectedCellData && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 relative shadow-2xl">
            <button
              onClick={() => setSelectedCellData(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
                {selectedCellData.dept}
              </span>
              <h3 className="text-base font-bold text-gray-900 mt-1">{selectedCellData.cat}</h3>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {selectedCellData.items.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-xs italic">
                  No event records uploaded for this category yet.
                </div>
              ) : (
                selectedCellData.items.map(item => (
                  <div key={item.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-gray-900">
                      <span>{item.title}</span>
                      <span className="bg-blue-100 text-blue-800 text-[9px] px-1.5 py-0.5 rounded">
                        {item.reportDetails}
                      </span>
                    </div>
                    {item.eventDate && <p className="text-gray-500">Date: {item.eventDate}</p>}
                    {item.resourcePersons && <p className="text-gray-500">Guests: {item.resourcePersons}</p>}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                onClick={() => setSelectedCellData(null)}
                className="bg-[#2f4692] text-white text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT ACTIVITY MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 relative max-h-[90vh] overflow-y-auto shadow-2xl">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#2f4692]" />
              {editingActivity ? 'Edit Departmental Activity Record' : 'Add New Departmental Activity'}
            </h2>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Academic Year *</label>
                  <select
                    value={formData.academicYear || '2024-2025'}
                    onChange={e => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full border border-gray-300 rounded p-2 bg-white"
                  >
                    <option value="2020-2021">2020-2021</option>
                    <option value="2021-2022">2021-2022</option>
                    <option value="2022-2023">2022-2023</option>
                    <option value="2023-2024">2023-2024</option>
                    <option value="2024-2025">2024-2025</option>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                    <option value="2027-2028">2027-2028</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Department *</label>
                  <select
                    value={formData.department || DEPARTMENTS[0]}
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                    className="w-full border border-gray-300 rounded p-2 bg-white font-medium"
                  >
                    {DEPARTMENTS.map((d, i) => (
                      <option key={i} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Activity Category *</label>
                <select
                  value={formData.activityCategory || ACTIVITY_CATEGORIES[0]}
                  onChange={e => setFormData({ ...formData, activityCategory: e.target.value })}
                  className="w-full border border-gray-300 rounded p-2 bg-white"
                >
                  {ACTIVITY_CATEGORIES.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Event Title / Description *</label>
                <Input
                  value={formData.title || ''}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="e.g. FDP on AI & Deep Learning Applications"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Report Details Badge text</label>
                  <Input
                    value={formData.reportDetails || ''}
                    onChange={e => setFormData({ ...formData, reportDetails: e.target.value })}
                    placeholder="e.g. Reports 2025, 2 MoUs 2025"
                    className="text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status || 'Completed'}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full border border-gray-300 rounded p-2 bg-white font-semibold text-emerald-800"
                  >
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending Report</option>
                    <option value="In Progress">In Progress</option>
                  </select>
                </div>
              </div>

              {formData.status === 'Pending' && (
                <div>
                  <label className="block font-semibold text-red-700 mb-1">Pending Report Details / Action Notes</label>
                  <Input
                    value={formData.pendingNotes || ''}
                    onChange={e => setFormData({ ...formData, pendingNotes: e.target.value })}
                    placeholder="e.g. Extension Activity - Reports 2026"
                    className="text-xs border-red-300"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#2f4692] text-white text-xs font-bold"
                >
                  {editingActivity ? 'Save Changes' : 'Create Activity'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK UPLOAD DIALOG */}
      <BulkUploadDialog
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        token={user?.token || ''}
        onSuccess={() => {
          fetchActivities();
          setIsBulkUploadOpen(false);
        }}
        uploadType="departmental-activities"
      />
    </div>
  );

  if (hideSidebar) {
    return <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto space-y-6">{pageContent}</div>;
  }

  return (
    <AppShell currentPage={currentPage} onNavigate={onNavigate || (() => {})}>
      {pageContent}
    </AppShell>
  );
}

export default DepartmentalActivitiesPage;

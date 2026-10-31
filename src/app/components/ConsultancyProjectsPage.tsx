import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  DollarSign, TrendingUp, Briefcase, Plus, Upload, Pencil, Trash2,
  CheckCircle, Clock, AlertCircle, X, Building, Calendar, Search,
  Download, Eye, Filter, LayoutGrid, Table as TableIcon, BarChart3,
  ExternalLink, Sparkles, UserCheck, ChevronRight, RefreshCw,
  FileCheck, Receipt, Paperclip, ShieldCheck, Mail, Phone, Layers, Info
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { BulkUploadDialog } from './BulkUploadDialog';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';
import { normalizeDepartmentName } from './FacultyDetailsPage';
import { AppShell, PageHeader, StatCard } from './design-system';
import {
  calculateProjectDuration,
  deriveConsultancyStartYear,
  VALID_CONSULTANCY_PROJECT_STATUSES,
  ConsultancyProjectStatusType
} from '../utils/projectDurationHelper';

interface ConsultancyProjectsPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
  hideSidebar?: boolean;
  token?: string;
  userRole?: string;
}

export interface ConsultancyDocumentItem {
  id: string;
  projectId: string;
  documentCategory: 'agreement_work_order' | 'invoice' | 'payment_receipt';
  sourceType: 'drive_upload' | 'drive_link' | 'local_upload';
  driveFileId?: string | null;
  driveFolderId?: string | null;
  driveUrl: string;
  fileName: string;
  mimeType?: string | null;
  fileSize?: number | null;
  accessStatus?: string;
  createdAt?: string;
}

export interface ConsultancyProject {
  id: string;
  teacherConsultant: string;
  projectName: string;
  agencyName?: string | null;
  agencyContactEmail?: string | null;
  agencyContactNumber?: string | null;
  sponsoringAgency: string;
  consultancyStartYear?: number | null;
  year: string;
  startDate?: string | null;
  expectedEndDate?: string | null;
  actualCompletionDate?: string | null;
  projectStatus?: 'Sanctioned' | 'On Going' | 'Completed' | null;
  contractValueInLakhs?: number | null;
  revenueInLakhs: number;
  amountReceivedInLakhs?: number | null;
  department: string;
  status?: string | null;
  description?: string | null;
  plannedDurationFormatted?: string | null;
  actualDurationFormatted?: string | null;
  documents?: ConsultancyDocumentItem[];
  agreementWorkOrders?: ConsultancyDocumentItem[];
  invoices?: ConsultancyDocumentItem[];
  paymentReceipts?: ConsultancyDocumentItem[];
  agreementWorkOrderCount?: number;
  invoiceCount?: number;
  paymentReceiptCount?: number;
  totalDocumentCount?: number;
  createdAt?: string;
  updatedAt?: string;
  creator?: { name: string; email: string; department: string };
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CONSULTANCY_START_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

const EMPTY_FORM = {
  projectName: '',
  teacherConsultant: '',
  agencyName: '',
  agencyContactEmail: '',
  agencyContactNumber: '',
  sponsoringAgency: '',
  consultancyStartYear: 2024,
  year: '2024-2025',
  startDate: '',
  expectedEndDate: '',
  actualCompletionDate: '',
  projectStatus: 'On Going' as 'Sanctioned' | 'On Going' | 'Completed',
  contractValueInLakhs: '',
  revenueInLakhs: '',
  amountReceivedInLakhs: '',
  department: '',
  description: ''
};

const PROJECT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'Sanctioned': { label: 'Sanctioned', color: 'text-blue-800', bg: 'bg-blue-50', border: 'border-blue-200' },
  'On Going': { label: 'On Going', color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200' },
  'Completed': { label: 'Completed', color: 'text-emerald-800', bg: 'bg-emerald-50', border: 'border-emerald-200' }
};

function formatProjectStatusBadge(status?: string | null) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
        Review Required
      </span>
    );
  }
  const cfg = PROJECT_STATUS_CONFIG[status] || {
    label: status,
    color: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200'
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {status === 'Completed' ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3" />}
      <span>{cfg.label}</span>
    </span>
  );
}

export function ConsultancyProjectsPage({
  onNavigate,
  isPublicView = false,
  hideSidebar = false,
  token = '',
  userRole = 'faculty'
}: ConsultancyProjectsPageProps) {
  const [projects, setProjects] = useState<ConsultancyProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Filtering & View State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStartYear, setSelectedStartYear] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedProjectStatus, setSelectedProjectStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'department'>('table');

  // Modals & Drawers
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<ConsultancyProject | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Document attachments state
  const [agreementFiles, setAgreementFiles] = useState<File[]>([]);
  const [agreementLinks, setAgreementLinks] = useState('');
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [invoiceLinks, setInvoiceLinks] = useState('');
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [receiptLinks, setReceiptLinks] = useState('');

  const [viewingProject, setViewingProject] = useState<ConsultancyProject | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'financial' | 'documents'>('overview');
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const { departmentList: dbDepts } = useAcademicHierarchy();
  const departments = useMemo(() => {
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
        'School of Architecture',
        'Sciences and Humanities (Engineering)'
      ];
    }
    return Array.from(set).sort();
  }, [dbDepts, projects]);

  const fetchProjects = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedStartYear !== 'all') params.append('consultancyStartYear', selectedStartYear);
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
      if (selectedProjectStatus !== 'all') params.append('projectStatus', selectedProjectStatus);

      const res = await fetch(`${API_BASE}/api/consultancy-projects?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProjects(data.data || []);
      } else {
        setError(data.message || 'Failed to load records');
      }
    } catch {
      setError('Connection failed. Please ensure the backend server is active.');
    } finally {
      setLoading(false);
    }
  }, [token, selectedStartYear, selectedDepartment, selectedProjectStatus]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Live Durations in Form
  const plannedDuration = useMemo(() => {
    return calculateProjectDuration(formData.startDate, formData.expectedEndDate);
  }, [formData.startDate, formData.expectedEndDate]);

  const actualDuration = useMemo(() => {
    return formData.actualCompletionDate ? calculateProjectDuration(formData.startDate, formData.actualCompletionDate) : null;
  }, [formData.startDate, formData.actualCompletionDate]);

  // Handle Start Date change with automatic Start Year derivation
  const handleStartDateChange = (val: string) => {
    const derivedYear = deriveConsultancyStartYear(val);
    setFormData(prev => ({
      ...prev,
      startDate: val,
      consultancyStartYear: derivedYear || prev.consultancyStartYear,
      year: derivedYear ? `${derivedYear - 1}-${derivedYear}` : prev.year
    }));
  };

  // Filtered list
  const filteredProjects = useMemo(() => {
    return projects.filter(item => {
      if (selectedStartYear !== 'all') {
        const itemYear = item.consultancyStartYear ? String(item.consultancyStartYear) : (item.year ? item.year.split('-')[0] : '');
        if (itemYear !== selectedStartYear) return false;
      }
      if (selectedDepartment !== 'all' && item.department !== selectedDepartment) return false;
      if (selectedProjectStatus !== 'all') {
        if ((item.projectStatus || 'Review Required') !== selectedProjectStatus) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.projectName?.toLowerCase().includes(q);
        const consultantMatch = item.teacherConsultant?.toLowerCase().includes(q);
        const agencyMatch = (item.agencyName || item.sponsoringAgency)?.toLowerCase().includes(q);
        const deptMatch = item.department?.toLowerCase().includes(q);
        if (!titleMatch && !consultantMatch && !agencyMatch && !deptMatch) return false;
      }
      return true;
    });
  }, [projects, selectedStartYear, selectedDepartment, selectedProjectStatus, searchQuery]);

  // Aggregate stats
  const totalRevenue = useMemo(() => {
    return filteredProjects.reduce((sum, p) => sum + Number(p.revenueInLakhs || 0), 0);
  }, [filteredProjects]);

  const uniqueConsultants = useMemo(() => {
    const set = new Set<string>();
    filteredProjects.forEach(p => {
      if (p.teacherConsultant) {
        p.teacherConsultant.split(',').forEach(name => {
          const trimmed = name.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return set.size;
  }, [filteredProjects]);

  const departmentMap = useMemo(() => {
    return filteredProjects.reduce((acc, p) => {
      const d = p.department || 'General';
      if (!acc[d]) acc[d] = { count: 0, revenue: 0 };
      acc[d].count++;
      acc[d].revenue += Number(p.revenueInLakhs || 0);
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);
  }, [filteredProjects]);

  const activeDepartmentsCount = Object.keys(departmentMap).length;
  const avgRevenuePerProject = filteredProjects.length > 0 ? (totalRevenue / filteredProjects.length) : 0;

  // Handlers
  const handleOpenForm = (project?: ConsultancyProject) => {
    setAgreementFiles([]);
    setAgreementLinks('');
    setInvoiceFiles([]);
    setInvoiceLinks('');
    setReceiptFiles([]);
    setReceiptLinks('');

    if (project) {
      setEditingProject(project);
      setFormData({
        projectName: project.projectName || '',
        teacherConsultant: project.teacherConsultant || '',
        agencyName: project.agencyName || project.sponsoringAgency || '',
        agencyContactEmail: project.agencyContactEmail || '',
        agencyContactNumber: project.agencyContactNumber || '',
        sponsoringAgency: project.sponsoringAgency || '',
        consultancyStartYear: project.consultancyStartYear || 2024,
        year: project.year || '2024-2025',
        startDate: project.startDate ? project.startDate.split('T')[0] : '',
        expectedEndDate: project.expectedEndDate ? project.expectedEndDate.split('T')[0] : '',
        actualCompletionDate: project.actualCompletionDate ? project.actualCompletionDate.split('T')[0] : '',
        projectStatus: (project.projectStatus || 'On Going') as 'Sanctioned' | 'On Going' | 'Completed',
        contractValueInLakhs: project.contractValueInLakhs !== null && project.contractValueInLakhs !== undefined ? String(project.contractValueInLakhs) : '',
        revenueInLakhs: String(project.revenueInLakhs || ''),
        amountReceivedInLakhs: project.amountReceivedInLakhs !== null && project.amountReceivedInLakhs !== undefined ? String(project.amountReceivedInLakhs) : '',
        department: project.department || departments[0] || '',
        description: project.description || ''
      });
    } else {
      setEditingProject(null);
      setFormData({
        ...EMPTY_FORM,
        department: departments[0] || 'Computer Science and Engineering'
      });
    }
    setFormError('');
    setShowForm(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacherConsultant.trim() || !formData.projectName.trim() || !formData.agencyName.trim() || !formData.revenueInLakhs) {
      setFormError('Please fill in all mandatory fields: Consultant Name, Project Title, Agency Name, and Revenue Generated.');
      return;
    }

    // Optional email validation
    if (formData.agencyContactEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.agencyContactEmail.trim())) {
        setFormError('Invalid Agency Contact Email format.');
        return;
      }
    }

    // Date order validation
    if (formData.startDate && formData.expectedEndDate) {
      const s = new Date(formData.startDate);
      const eDate = new Date(formData.expectedEndDate);
      if (eDate < s) {
        setFormError('Expected End Date cannot be earlier than Start Date.');
        return;
      }
    }
    if (formData.startDate && formData.actualCompletionDate) {
      const s = new Date(formData.startDate);
      const aDate = new Date(formData.actualCompletionDate);
      if (aDate < s) {
        setFormError('Actual Completion Date cannot be earlier than Start Date.');
        return;
      }
    }

    setFormLoading(true);
    setFormError('');
    try {
      const url = editingProject
        ? `${API_BASE}/api/consultancy-projects/${editingProject.id}`
        : `${API_BASE}/api/consultancy-projects`;
      const method = editingProject ? 'PUT' : 'POST';

      const payload: any = {
        ...formData,
        revenueInLakhs: parseFloat(formData.revenueInLakhs) || 0,
        contractValueInLakhs: formData.contractValueInLakhs ? parseFloat(formData.contractValueInLakhs) : null,
        amountReceivedInLakhs: formData.amountReceivedInLakhs ? parseFloat(formData.amountReceivedInLakhs) : null,
        consultancyStartYear: parseInt(String(formData.consultancyStartYear), 10) || null,
        agreementLinks: agreementLinks.trim() || undefined,
        invoiceLinks: invoiceLinks.trim() || undefined,
        receiptLinks: receiptLinks.trim() || undefined
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) {
        setFormError(data.message || 'Failed to save record.');
        setFormLoading(false);
        return;
      }

      const savedProjectId = editingProject ? editingProject.id : data.data.id;

      // Handle direct file uploads if any
      const uploadCategoryFiles = async (files: File[], category: string) => {
        if (files.length === 0) return;
        const uploadForm = new FormData();
        uploadForm.append('category', category);
        files.forEach(f => uploadForm.append('files', f));

        await fetch(`${API_BASE}/api/consultancy-projects/${savedProjectId}/documents/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: uploadForm
        });
      };

      await Promise.all([
        uploadCategoryFiles(agreementFiles, 'agreement_work_order'),
        uploadCategoryFiles(invoiceFiles, 'invoice'),
        uploadCategoryFiles(receiptFiles, 'payment_receipt')
      ]);

      setShowForm(false);
      fetchProjects();
    } catch {
      setFormError('Connection failed. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/consultancy-projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDeletingId(null);
        if (viewingProject?.id === id) setViewingProject(null);
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!token || !viewingProject) return;
    try {
      const res = await fetch(`${API_BASE}/api/consultancy-projects/${viewingProject.id}/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        // Refresh project details in modal
        const refreshed = await fetch(`${API_BASE}/api/consultancy-projects/${viewingProject.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const refData = await refreshed.json();
        if (refData.success) {
          setViewingProject(refData.data);
        }
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    if (!token) return;
    setClearLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/consultancy-projects/clear-all?confirmAll=true&confirmation=CONFIRM_UNIVERSITY_CLEAR`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setShowClearConfirm(false);
        fetchProjects();
      } else {
        setError(data.message || 'Failed to clear records.');
      }
    } catch {
      setError('Error connecting to server.');
    } finally {
      setClearLoading(false);
    }
  };

  // Export functions with standardized columns
  const handleExportCSV = () => {
    if (filteredProjects.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = [
      'S. No.',
      'Teacher Consultant',
      'Name of Consultancy Project',
      'Agency Name',
      'Agency Contact Email',
      'Agency Contact Number',
      'Consultancy Start Year',
      'Start Date',
      'Expected End Date',
      'Actual Completion Date',
      'Project Status',
      'Contract Value (INR in Lakhs)',
      'Revenue Generated (INR in Lakhs)',
      'Amount Received (INR in Lakhs)',
      'Department',
      'Scope of Work / Deliverables Summary',
      'Agreement / Work Order',
      'Invoice',
      'Payment Receipt'
    ];

    const rows = filteredProjects.map((p, idx) => {
      const agreementUrls = (p.agreementWorkOrders || []).map(d => d.driveUrl).join(' | ');
      const invoiceUrls = (p.invoices || []).map(d => d.driveUrl).join(' | ');
      const receiptUrls = (p.paymentReceipts || []).map(d => d.driveUrl).join(' | ');

      return [
        idx + 1,
        `"${(p.teacherConsultant || '').replace(/"/g, '""')}"`,
        `"${(p.projectName || '').replace(/"/g, '""')}"`,
        `"${(p.agencyName || p.sponsoringAgency || '').replace(/"/g, '""')}"`,
        `"${(p.agencyContactEmail || '').replace(/"/g, '""')}"`,
        `"${(p.agencyContactNumber || '').replace(/"/g, '""')}"`,
        p.consultancyStartYear || (p.year ? p.year.split('-')[0] : ''),
        p.startDate ? p.startDate.split('T')[0] : '',
        p.expectedEndDate ? p.expectedEndDate.split('T')[0] : '',
        p.actualCompletionDate ? p.actualCompletionDate.split('T')[0] : '',
        `"${p.projectStatus || 'Review Required'}"`,
        p.contractValueInLakhs !== null && p.contractValueInLakhs !== undefined ? Number(p.contractValueInLakhs).toFixed(2) : '',
        Number(p.revenueInLakhs || 0).toFixed(2),
        p.amountReceivedInLakhs !== null && p.amountReceivedInLakhs !== undefined ? Number(p.amountReceivedInLakhs).toFixed(2) : '',
        `"${(p.department || '').replace(/"/g, '""')}"`,
        `"${(p.description || '').replace(/"/g, '""')}"`,
        `"${agreementUrls.replace(/"/g, '""')}"`,
        `"${invoiceUrls.replace(/"/g, '""')}"`,
        `"${receiptUrls.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `consultancy_projects_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (filteredProjects.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = [
      'S. No.',
      'Teacher Consultant',
      'Name of Consultancy Project',
      'Agency Name',
      'Agency Contact Email',
      'Agency Contact Number',
      'Consultancy Start Year',
      'Start Date',
      'Expected End Date',
      'Actual Completion Date',
      'Project Status',
      'Contract Value (INR in Lakhs)',
      'Revenue Generated (INR in Lakhs)',
      'Amount Received (INR in Lakhs)',
      'Department',
      'Scope of Work / Deliverables Summary',
      'Agreement / Work Order',
      'Invoice',
      'Payment Receipt'
    ];

    const rows = filteredProjects.map((p, idx) => {
      const agreementUrls = (p.agreementWorkOrders || []).map(d => d.driveUrl).join('\n');
      const invoiceUrls = (p.invoices || []).map(d => d.driveUrl).join('\n');
      const receiptUrls = (p.paymentReceipts || []).map(d => d.driveUrl).join('\n');

      return [
        idx + 1,
        p.teacherConsultant,
        p.projectName,
        p.agencyName || p.sponsoringAgency,
        p.agencyContactEmail || '',
        p.agencyContactNumber || '',
        p.consultancyStartYear || (p.year ? p.year.split('-')[0] : ''),
        p.startDate ? p.startDate.split('T')[0] : '',
        p.expectedEndDate ? p.expectedEndDate.split('T')[0] : '',
        p.actualCompletionDate ? p.actualCompletionDate.split('T')[0] : '',
        p.projectStatus || 'Review Required',
        p.contractValueInLakhs !== null && p.contractValueInLakhs !== undefined ? Number(p.contractValueInLakhs) : '',
        Number(p.revenueInLakhs || 0),
        p.amountReceivedInLakhs !== null && p.amountReceivedInLakhs !== undefined ? Number(p.amountReceivedInLakhs) : '',
        p.department,
        p.description || '',
        agreementUrls,
        invoiceUrls,
        receiptUrls
      ];
    });

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consultancy Projects');
    XLSX.writeFile(wb, `consultancy_projects_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const canEdit = userRole === 'admin' || userRole === 'coordinator' || userRole === 'hod' || userRole === 'faculty';
  const canDelete = userRole === 'admin' || userRole === 'coordinator' || userRole === 'hod';
  const canBulkUpload = userRole === 'admin' || userRole === 'coordinator' || userRole === 'hod' || userRole === 'faculty';

  // ─── PUBLIC VIEW ────────────────────────────────────────────────────────────
  if (isPublicView) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-slate-900 text-white py-12 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-4 mb-2">
              <div className="p-3 bg-white/10 rounded-xl border border-white/10">
                <Briefcase className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Consultancy Projects & Advisory Services</h1>
                <p className="text-slate-400 text-xs mt-1">
                  Industry solutions, commercial testing, and technical advisory undertaken by faculty consultants
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-200">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Total Assignments</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{filteredProjects.length}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
                  <Briefcase className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-200">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Total Revenue</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">₹{totalRevenue.toFixed(2)}L</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                  <DollarSign className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-200">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Faculty Consultants</p>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">{uniqueConsultants}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700">
                  <UserCheck className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white ring-1 ring-gray-200">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Active Depts</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">{activeDepartmentsCount}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
                  <Building className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-800 text-white font-semibold">
                <tr>
                  <th className="py-3 px-4">S. No.</th>
                  <th className="py-3 px-4">Teacher Consultant</th>
                  <th className="py-3 px-4">Project Name</th>
                  <th className="py-3 px-4">Agency Name</th>
                  <th className="py-3 px-4">Start Year</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Revenue (₹ Lakhs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProjects.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900">{p.teacherConsultant}</td>
                    <td className="py-3 px-4 text-gray-800">{p.projectName}</td>
                    <td className="py-3 px-4 text-gray-600">{p.agencyName || p.sponsoringAgency}</td>
                    <td className="py-3 px-4 font-mono">{p.consultancyStartYear || p.year}</td>
                    <td className="py-3 px-4">{formatProjectStatusBadge(p.projectStatus)}</td>
                    <td className="py-3 px-4 font-bold text-emerald-700 text-right">₹{Number(p.revenueInLakhs).toFixed(2)} Lakhs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── INTERNAL WORKSPACE VIEW ────────────────────────────────────────────────
  const internalContent = (
    <div className="space-y-6">

      {/* Top Section Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Academics' },
          { label: 'Research' },
          { label: 'Consultancy Projects' }
        ]}
        title="Consultancy Projects & Advisory"
        badge={`${filteredProjects.length.toLocaleString()} Projects`}
        description="Industry solutions, commercial testing, and technical advisory undertaken by faculty consultants."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {canDelete && projects.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearConfirm(true)}
                className="border-rose-200 bg-white text-rose-700 hover:bg-rose-50 text-xs font-medium h-9 px-3.5 rounded-lg shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                <span>Clear Data</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium h-9 px-3.5 rounded-lg shadow-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <span>CSV</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium h-9 px-3.5 rounded-lg shadow-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              <span>Excel</span>
            </Button>

            {canBulkUpload && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkUpload(true)}
                className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-medium h-9 px-3.5 rounded-lg shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                <span>Bulk Upload</span>
              </Button>
            )}

            {canEdit && (
              <Button
                size="sm"
                onClick={() => handleOpenForm()}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium h-9 px-3.5 rounded-lg shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                <span>Add Consultancy</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Key Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Projects"
          value={filteredProjects.length.toLocaleString()}
          subtitle="Across all departments"
          icon={Briefcase}
        />
        <StatCard
          title="Total Revenue"
          value={`₹${totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}L`}
          subtitle="Earned via external contracts"
          icon={DollarSign}
        />
        <StatCard
          title="Faculty Consultants"
          value={uniqueConsultants.toLocaleString()}
          subtitle="Active faculty advisors"
          icon={UserCheck}
        />
        <StatCard
          title="Active Departments"
          value={activeDepartmentsCount.toLocaleString()}
          badge={`of ${departments.length}`}
          subtitle="Engaged disciplines"
          icon={Building}
        />
        <StatCard
          title="Avg / Project"
          value={`₹${avgRevenuePerProject.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}L`}
          subtitle="Average contract size"
          icon={TrendingUp}
        />
      </div>

      {/* Search, Filter & View Controls */}
      <Card className="border border-gray-200/80 shadow-sm rounded-xl bg-white">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by project title, consultant, agency..."
                className="pl-9 h-9 text-xs border-gray-200 focus-visible:ring-teal-600"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Consultancy Start Year Filter */}
            <div className="w-[150px]">
              <Select value={selectedStartYear} onValueChange={setSelectedStartYear}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Start Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Start Years</SelectItem>
                  {CONSULTANCY_START_YEARS.map(y => (
                    <SelectItem key={y} value={String(y)}>CSY {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div className="w-[175px]">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Status Filter */}
            <div className="w-[140px]">
              <Select value={selectedProjectStatus} onValueChange={setSelectedProjectStatus}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Project Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Project Statuses</SelectItem>
                  {VALID_CONSULTANCY_PROJECT_STATUSES.map(st => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                  <SelectItem value="Review Required">Review Required</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filter button */}
            {(selectedStartYear !== 'all' || selectedDepartment !== 'all' || selectedProjectStatus !== 'all' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedStartYear('all');
                  setSelectedDepartment('all');
                  setSelectedProjectStatus('all');
                  setSearchQuery('');
                }}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-9 px-2"
              >
                Reset
              </Button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'cards' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('department')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'department' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Department Analytics"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Dept Analytics</span>
            </button>
          </div>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchProjects}
            className="h-9 w-9 p-0 text-gray-500 hover:text-gray-900"
            title="Refresh Consultancy Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-24 text-center space-y-3 bg-white rounded-xl border border-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-700 mx-auto"></div>
          <p className="text-xs text-gray-500 font-medium">Loading consultancy records from database...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-red-50 text-red-700 rounded-xl border border-red-200 space-y-2">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <p className="font-semibold">{error}</p>
          <Button size="sm" variant="outline" onClick={fetchProjects} className="mt-2 text-xs">
            Try Again
          </Button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="border border-dashed border-gray-300 shadow-none rounded-xl p-12 text-center bg-white">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">No Consultancy Projects Found</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-5">
            {searchQuery || selectedStartYear !== 'all' || selectedDepartment !== 'all' || selectedProjectStatus !== 'all'
              ? 'No project records matched your active filter criteria. Try resetting the filters.'
              : 'Start by recording faculty consultancy assignments or upload bulk spreadsheets.'}
          </p>
          <div className="flex justify-center gap-3">
            {canEdit && (
              <Button size="sm" onClick={() => handleOpenForm()} className="bg-teal-700 hover:bg-teal-800 text-white text-xs">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                <span>Add First Record</span>
              </Button>
            )}
            {canBulkUpload && (
              <Button size="sm" variant="outline" onClick={() => setShowBulkUpload(true)} className="text-xs">
                <Upload className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
                <span>Bulk Upload Spreadsheet</span>
              </Button>
            )}
          </div>
        </Card>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <Card className="border border-gray-200/80 shadow-sm rounded-xl overflow-hidden bg-white">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-gray-200">
                <tr className="text-gray-700 font-semibold">
                  <th className="py-3 px-3.5 w-12 text-center">#</th>
                  <th className="py-3 px-3.5 min-w-[200px]">Project Name</th>
                  <th className="py-3 px-3.5 min-w-[160px]">Teacher Consultant</th>
                  <th className="py-3 px-3.5 min-w-[180px]">Agency Details</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Start Year</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Project Status</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap font-bold text-emerald-800">Revenue (₹ Lakhs)</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Documents</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProjects.map((project, idx) => (
                  <tr key={project.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3 px-3.5 text-center font-mono text-gray-400">{idx + 1}</td>
                    <td className="py-3 px-3.5">
                      <button
                        onClick={() => setViewingProject(project)}
                        className="font-bold text-gray-900 hover:text-teal-700 text-left line-clamp-2 transition-colors"
                      >
                        {project.projectName}
                      </button>
                      <div className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[220px]">
                        {project.department || 'General'}
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                          {project.teacherConsultant?.charAt(0) || 'T'}
                        </span>
                        <span className="font-semibold text-gray-800 truncate max-w-[150px]" title={project.teacherConsultant}>
                          {project.teacherConsultant}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-gray-900 truncate max-w-[180px]" title={project.agencyName || project.sponsoringAgency}>
                        {project.agencyName || project.sponsoringAgency}
                      </div>
                      {(project.agencyContactEmail || project.agencyContactNumber) && (
                        <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                          {project.agencyContactEmail && <span className="truncate max-w-[120px]">{project.agencyContactEmail}</span>}
                          {project.agencyContactEmail && project.agencyContactNumber && <span>•</span>}
                          {project.agencyContactNumber && <span>{project.agencyContactNumber}</span>}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-center font-mono text-gray-700 whitespace-nowrap">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                        {project.consultancyStartYear ? `CSY ${project.consultancyStartYear}` : project.year}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      {formatProjectStatusBadge(project.projectStatus)}
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap font-mono">
                      <div className="font-bold text-emerald-700">₹{Number(project.revenueInLakhs || 0).toFixed(2)}L</div>
                      {project.contractValueInLakhs !== null && project.contractValueInLakhs !== undefined && (
                        <div className="text-[10px] text-slate-500">Val: ₹{Number(project.contractValueInLakhs).toFixed(2)}L</div>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1 text-[10px]">
                        <span className={`px-1.5 py-0.5 rounded font-mono ${project.agreementWorkOrderCount ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-gray-50 text-gray-400'}`} title="Agreement / Work Order">
                          A:{project.agreementWorkOrderCount || 0}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-mono ${project.invoiceCount ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-gray-50 text-gray-400'}`} title="Invoice">
                          I:{project.invoiceCount || 0}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-mono ${project.paymentReceiptCount ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-50 text-gray-400'}`} title="Payment Receipt">
                          R:{project.paymentReceiptCount || 0}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingProject(project)}
                          className="h-7 w-7 p-0 text-gray-500 hover:text-teal-700"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenForm(project)}
                            className="h-7 w-7 p-0 text-gray-500 hover:text-blue-700"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingId(project.id)}
                            className="h-7 w-7 p-0 text-gray-500 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((project) => (
            <Card
              key={project.id}
              className="border border-gray-200/80 shadow-sm rounded-xl overflow-hidden hover:shadow-md transition-all flex flex-col justify-between bg-white group"
            >
              <CardHeader className="p-5 pb-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] font-mono text-teal-800 bg-teal-50 border-teal-200">
                    {project.consultancyStartYear ? `CSY ${project.consultancyStartYear}` : project.year}
                  </Badge>
                  {formatProjectStatusBadge(project.projectStatus)}
                </div>
                <CardTitle className="text-sm font-bold text-gray-900 group-hover:text-teal-700 transition-colors line-clamp-2">
                  {project.projectName}
                </CardTitle>
                <CardDescription className="text-xs text-gray-600 flex items-center gap-1.5 pt-1">
                  <UserCheck className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                  <span className="font-semibold text-gray-800 truncate">{project.teacherConsultant}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 text-xs">
                  <div className="text-[11px] text-gray-500 font-medium truncate" title={project.agencyName || project.sponsoringAgency}>
                    <span className="font-semibold text-gray-700">Client:</span> {project.agencyName || project.sponsoringAgency}
                  </div>
                  <div className="text-[11px] text-gray-500 truncate" title={project.department}>
                    <span className="font-semibold text-gray-700">Dept:</span> {project.department}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Revenue</span>
                    <span className="text-base font-extrabold text-emerald-700 font-mono">
                      ₹{Number(project.revenueInLakhs || 0).toFixed(2)} Lakhs
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewingProject(project)}
                    className="text-xs text-teal-700 border-teal-200 hover:bg-teal-50 h-8"
                  >
                    Inspect
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* DEPARTMENT ANALYTICS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Object.entries(departmentMap).map(([dept, stats]) => (
            <Card key={dept} className="border border-gray-200/80 shadow-sm rounded-xl hover:shadow-md transition-shadow bg-white">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                    <Building className="w-4 h-4" />
                  </div>
                  <CardTitle className="text-sm font-bold text-gray-900 truncate" title={dept}>
                    {dept}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-3 text-xs">
                <div className="space-y-2 border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Consultancy Projects:</span>
                    <span className="font-bold text-gray-900 font-mono">{stats.count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Total Revenue Generated:</span>
                    <span className="font-extrabold text-emerald-700 font-mono">₹{stats.revenue.toFixed(2)} Lakhs</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Average / Project:</span>
                    <span className="font-semibold text-gray-700 font-mono">
                      ₹{(stats.revenue / (stats.count || 1)).toFixed(2)} Lakhs
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* DIALOG: ADD/EDIT CONSULTANCY PROJECT (6 STRUCTURED SECTIONS) */}
      {/* ======================================================== */}
      {showForm && (
        <Dialog open={showForm} onOpenChange={(open) => !open && setShowForm(false)}>
          <DialogContent className="sm:max-w-[700px] max-h-[88vh] overflow-y-auto bg-white p-6 rounded-2xl">
            <DialogHeader className="border-b border-gray-100 pb-3">
              <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-teal-700" />
                <span>{editingProject ? 'Edit Consultancy Project' : 'Record New Consultancy Project'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Track client advisory contracts, multi-document evidence, and revenue recognition (NIRF & NAAC 3.5).
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleFormSubmit} className="space-y-4 py-2 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* SECTION A — CONSULTANCY DETAILS */}
              <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-teal-700" />
                  <span>Section A — Consultancy Details</span>
                </h4>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Project Title / Assignment Name <span className="text-red-500">*</span></Label>
                  <Input
                    required
                    placeholder="e.g. AI-Powered Smart City Infrastructure Planning"
                    className="h-9 text-xs border-gray-200 bg-white focus-visible:ring-teal-600"
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700">Name of Teacher Consultant(s) <span className="text-red-500">*</span></Label>
                    <Input
                      required
                      placeholder="e.g. Dr. Rajesh Kumar, Dr. Priya Sharma"
                      className="h-9 text-xs border-gray-200 bg-white focus-visible:ring-teal-600"
                      value={formData.teacherConsultant}
                      onChange={(e) => setFormData({ ...formData, teacherConsultant: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700">Department</Label>
                    <Select
                      value={formData.department}
                      onValueChange={(val) => setFormData({ ...formData, department: val })}
                    >
                      <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* SECTION B — AGENCY INFORMATION (SPLIT INTO THREE FIELDS) */}
              <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-teal-700" />
                  <span>Section B — Client / Sponsoring Agency</span>
                </h4>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Agency Name <span className="text-red-500">*</span></Label>
                  <Input
                    required
                    placeholder="e.g. Bangalore Smart City Corporation / Infosys BPM"
                    className="h-9 text-xs border-gray-200 bg-white focus-visible:ring-teal-600"
                    value={formData.agencyName}
                    onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700">Agency Contact Email (Optional)</Label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                      <Input
                        type="email"
                        placeholder="e.g. contact@bscc.gov.in"
                        className="h-9 pl-8 text-xs border-gray-200 bg-white focus-visible:ring-teal-600"
                        value={formData.agencyContactEmail}
                        onChange={(e) => setFormData({ ...formData, agencyContactEmail: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700">Agency Contact Number (Optional)</Label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                      <Input
                        placeholder="e.g. +91 9876543210 or 080-12345678"
                        className="h-9 pl-8 text-xs border-gray-200 bg-white focus-visible:ring-teal-600"
                        value={formData.agencyContactNumber}
                        onChange={(e) => setFormData({ ...formData, agencyContactNumber: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION C — PROJECT TIMELINE & DURATION */}
              <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-700" />
                  <span>Section C — Project Timeline & Lifecycle</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700">Consultancy Start Year <span className="text-red-500">*</span></Label>
                    <Select
                      value={String(formData.consultancyStartYear)}
                      onValueChange={(val) => {
                        const y = parseInt(val, 10);
                        setFormData({
                          ...formData,
                          consultancyStartYear: y,
                          year: `${y - 1}-${y}`
                        });
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                        <SelectValue placeholder="Start Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONSULTANCY_START_YEARS.map(y => (
                          <SelectItem key={y} value={String(y)}>CSY {y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700">Start Date</Label>
                    <Input
                      type="date"
                      className="h-9 text-xs border-gray-200 bg-white focus-visible:ring-teal-600"
                      value={formData.startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700">Expected End Date</Label>
                    <Input
                      type="date"
                      className="h-9 text-xs border-gray-200 bg-white focus-visible:ring-teal-600"
                      value={formData.expectedEndDate}
                      onChange={(e) => setFormData({ ...formData, expectedEndDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700">Actual Completion Date</Label>
                    <Input
                      type="date"
                      className="h-9 text-xs border-gray-200 bg-white focus-visible:ring-teal-600"
                      value={formData.actualCompletionDate}
                      onChange={(e) => setFormData({ ...formData, actualCompletionDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700">Planned Duration</Label>
                    <div className="h-9 px-3 rounded-md border border-gray-200 bg-white flex items-center gap-1.5 font-mono text-[11px] text-teal-800 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="truncate">{plannedDuration.formatted}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700">Project Status <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.projectStatus}
                      onValueChange={(val: any) => setFormData({ ...formData, projectStatus: val })}
                    >
                      <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sanctioned">Sanctioned</SelectItem>
                        <SelectItem value="On Going">On Going</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {actualDuration && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
                    <span className="font-semibold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                      Actual Project Duration:
                    </span>
                    <span className="font-mono font-bold">{actualDuration.formatted}</span>
                  </div>
                )}
              </div>

              {/* SECTION D — FINANCIAL INFORMATION */}
              <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-teal-700" />
                  <span>Section D — Financial Tracking (₹ in Lakhs)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700">Contract Value (INR Lakhs)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 35.00"
                      className="h-9 text-xs border-gray-200 bg-white focus-visible:ring-teal-600"
                      value={formData.contractValueInLakhs}
                      onChange={(e) => setFormData({ ...formData, contractValueInLakhs: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700">Revenue Generated (INR Lakhs) <span className="text-red-500">*</span></Label>
                    <Input
                      required
                      type="number"
                      step="0.01"
                      placeholder="e.g. 25.00"
                      className="h-9 text-xs border-gray-200 bg-white font-bold text-emerald-700 focus-visible:ring-teal-600"
                      value={formData.revenueInLakhs}
                      onChange={(e) => setFormData({ ...formData, revenueInLakhs: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700">Amount Received (INR Lakhs)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 15.00"
                      className="h-9 text-xs border-gray-200 bg-white focus-visible:ring-teal-600"
                      value={formData.amountReceivedInLakhs}
                      onChange={(e) => setFormData({ ...formData, amountReceivedInLakhs: e.target.value })}
                    />
                  </div>
                </div>

                {formData.revenueInLakhs && formData.amountReceivedInLakhs && Number(formData.revenueInLakhs) > Number(formData.amountReceivedInLakhs) && (
                  <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 flex items-center justify-between">
                    <span>Estimated Earned Revenue Not Yet Received:</span>
                    <span className="font-mono font-bold">
                      ₹{(Number(formData.revenueInLakhs) - Number(formData.amountReceivedInLakhs)).toFixed(2)} Lakhs
                    </span>
                  </div>
                )}
              </div>

              {/* SECTION E — SUPPORTING DOCUMENTS (THREE DISTINCT CATEGORIES) */}
              <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-teal-700" />
                  <span>Section E — Supporting Documents (Google Drive Integration)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Category 1: Agreement / Work Order */}
                  <div className="p-3 bg-white rounded-lg border border-blue-200 space-y-2">
                    <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                      Agreement / Work Order
                    </span>
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setAgreementFiles(Array.from(e.target.files || []))}
                      className="h-8 text-[11px] cursor-pointer"
                    />
                    <textarea
                      rows={2}
                      placeholder="Or paste Drive URL (one per line)"
                      value={agreementLinks}
                      onChange={(e) => setAgreementLinks(e.target.value)}
                      className="w-full p-1.5 text-[11px] border border-gray-200 rounded focus:ring-1 focus:ring-teal-500 font-mono"
                    />
                  </div>

                  {/* Category 2: Invoice */}
                  <div className="p-3 bg-white rounded-lg border border-purple-200 space-y-2">
                    <span className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-purple-600" />
                      Invoice
                    </span>
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setInvoiceFiles(Array.from(e.target.files || []))}
                      className="h-8 text-[11px] cursor-pointer"
                    />
                    <textarea
                      rows={2}
                      placeholder="Or paste Drive URL (one per line)"
                      value={invoiceLinks}
                      onChange={(e) => setInvoiceLinks(e.target.value)}
                      className="w-full p-1.5 text-[11px] border border-gray-200 rounded focus:ring-1 focus:ring-teal-500 font-mono"
                    />
                  </div>

                  {/* Category 3: Payment Receipt */}
                  <div className="p-3 bg-white rounded-lg border border-emerald-200 space-y-2">
                    <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                      Payment Receipt
                    </span>
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setReceiptFiles(Array.from(e.target.files || []))}
                      className="h-8 text-[11px] cursor-pointer"
                    />
                    <textarea
                      rows={2}
                      placeholder="Or paste Drive URL (one per line)"
                      value={receiptLinks}
                      onChange={(e) => setReceiptLinks(e.target.value)}
                      className="w-full p-1.5 text-[11px] border border-gray-200 rounded focus:ring-1 focus:ring-teal-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION F — ADDITIONAL INFORMATION */}
              <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-teal-700" />
                  <span>Section F — Scope of Work & Review Workflow</span>
                </h4>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Scope of Work / Deliverables Summary</Label>
                  <textarea
                    rows={2}
                    placeholder="Optional summary of deliverables, testing protocols, advisory outcomes..."
                    className="w-full rounded-md border border-gray-200 p-2.5 outline-none focus:border-teal-600 text-xs bg-white"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm(false)}
                  disabled={formLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-teal-700 hover:bg-teal-800 text-white font-semibold"
                  disabled={formLoading}
                >
                  {formLoading ? 'Saving...' : editingProject ? 'Update Consultancy Record' : 'Record Consultancy Project'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ======================================================== */}
      {/* DRAWER: VIEW DETAILS MODAL */}
      {/* ======================================================== */}
      {viewingProject && (
        <Dialog open={!!viewingProject} onOpenChange={(open) => !open && setViewingProject(null)}>
          <DialogContent className="sm:max-w-[720px] max-h-[88vh] overflow-y-auto bg-white p-6 rounded-2xl">
            <DialogHeader className="border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {viewingProject.consultancyStartYear ? `CSY ${viewingProject.consultancyStartYear}` : `AY ${viewingProject.year}`}
                </Badge>
                {formatProjectStatusBadge(viewingProject.projectStatus)}
                {(viewingProject.plannedDurationFormatted || (viewingProject.startDate && viewingProject.expectedEndDate)) && (
                  <Badge variant="outline" className="text-[10px] font-mono bg-teal-50 text-teal-800 border-teal-200">
                    Planned: {viewingProject.plannedDurationFormatted || calculateProjectDuration(viewingProject.startDate, viewingProject.expectedEndDate).formatted}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-lg font-bold text-gray-900 leading-snug">
                {viewingProject.projectName}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Department: <span className="font-semibold text-gray-700">{viewingProject.department || 'General'}</span>
              </DialogDescription>
            </DialogHeader>

            {/* Team Banner */}
            <div className="p-3 bg-teal-50/50 rounded-lg border border-teal-200 text-xs">
              <span className="text-gray-500 block text-[10px] uppercase font-bold tracking-wider">Teacher Consultant(s)</span>
              <span className="text-gray-900 font-bold text-sm mt-0.5 block">{viewingProject.teacherConsultant}</span>
            </div>

            {/* Navigation Tabs */}
            <Tabs value={detailTab} onValueChange={(val: any) => setDetailTab(val)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="financial" className="text-xs">Financials</TabsTrigger>
                <TabsTrigger value="documents" className="text-xs">Documents ({viewingProject.totalDocumentCount || 0})</TabsTrigger>
              </TabsList>

              {/* TAB 1: OVERVIEW */}
              <TabsContent value="overview" className="space-y-3 pt-3 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3.5 rounded-lg border border-gray-200">
                  <div>
                    <span className="text-gray-500 block text-[11px]">Agency Name</span>
                    <span className="font-semibold text-gray-900">{viewingProject.agencyName || viewingProject.sponsoringAgency}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Agency Contact Email</span>
                    <span className="font-semibold text-gray-900">{viewingProject.agencyContactEmail || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Agency Contact Number</span>
                    <span className="font-semibold text-gray-900">{viewingProject.agencyContactNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Consultancy Start Year</span>
                    <span className="font-mono font-semibold text-gray-900">
                      {viewingProject.consultancyStartYear ? `CSY ${viewingProject.consultancyStartYear}` : viewingProject.year}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Start Date</span>
                    <span className="font-semibold text-gray-900">{viewingProject.startDate ? viewingProject.startDate.split('T')[0] : '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Expected End Date</span>
                    <span className="font-semibold text-gray-900">{viewingProject.expectedEndDate ? viewingProject.expectedEndDate.split('T')[0] : '-'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Planned Duration</span>
                    <span className="font-semibold text-teal-800 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      {viewingProject.plannedDurationFormatted || (viewingProject.startDate && viewingProject.expectedEndDate ? calculateProjectDuration(viewingProject.startDate, viewingProject.expectedEndDate).formatted : 'Not Available')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Actual Completion Date</span>
                    <span className="font-semibold text-gray-900">{viewingProject.actualCompletionDate ? viewingProject.actualCompletionDate.split('T')[0] : 'In Progress'}</span>
                  </div>
                  {viewingProject.actualCompletionDate && (
                    <div className="col-span-2 pt-1 border-t border-gray-200">
                      <span className="text-gray-500 block text-[11px]">Actual Duration</span>
                      <span className="font-semibold text-emerald-800 flex items-center gap-1 mt-0.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {viewingProject.actualDurationFormatted || calculateProjectDuration(viewingProject.startDate, viewingProject.actualCompletionDate).formatted}
                      </span>
                    </div>
                  )}
                </div>

                {viewingProject.description && (
                  <div className="p-3 bg-white border border-gray-200 rounded-lg">
                    <span className="text-[11px] font-bold text-gray-700 block mb-1">Scope of Work & Deliverables</span>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{viewingProject.description}</p>
                  </div>
                )}

                {viewingProject.creator && (
                  <div className="border-t border-gray-100 pt-2 flex items-center justify-between text-[11px] text-gray-400">
                    <span>Submitted by: <strong>{viewingProject.creator.name}</strong> ({viewingProject.creator.department})</span>
                    <span>{viewingProject.createdAt ? new Date(viewingProject.createdAt).toLocaleDateString() : ''}</span>
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: FINANCIALS */}
              <TabsContent value="financial" className="space-y-3 pt-3 text-xs">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <span className="text-[10px] text-blue-700 uppercase font-semibold block">Contract Value</span>
                    <span className="text-sm font-bold font-mono text-blue-900">
                      {viewingProject.contractValueInLakhs !== null && viewingProject.contractValueInLakhs !== undefined
                        ? `₹${Number(viewingProject.contractValueInLakhs).toFixed(2)}L`
                        : 'Not Specified'}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Revenue Generated</span>
                    <span className="text-sm font-bold font-mono text-emerald-900">
                      ₹{Number(viewingProject.revenueInLakhs || 0).toFixed(2)}L
                    </span>
                  </div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-[10px] text-amber-700 uppercase font-semibold block">Amount Received</span>
                    <span className="text-sm font-bold font-mono text-amber-900">
                      {viewingProject.amountReceivedInLakhs !== null && viewingProject.amountReceivedInLakhs !== undefined
                        ? `₹${Number(viewingProject.amountReceivedInLakhs).toFixed(2)}L`
                        : 'Not Specified'}
                    </span>
                  </div>
                </div>

                {viewingProject.revenueInLakhs && viewingProject.amountReceivedInLakhs && Number(viewingProject.revenueInLakhs) > Number(viewingProject.amountReceivedInLakhs) && (
                  <div className="p-2.5 rounded-lg border bg-amber-50/50 border-amber-200 flex items-center justify-between text-[11px] text-amber-800">
                    <span className="font-semibold">Earned Revenue Not Yet Received:</span>
                    <span className="font-mono font-bold">
                      ₹{(Number(viewingProject.revenueInLakhs) - Number(viewingProject.amountReceivedInLakhs)).toFixed(2)} Lakhs
                    </span>
                  </div>
                )}
              </TabsContent>

              {/* TAB 3: DOCUMENTS */}
              <TabsContent value="documents" className="space-y-4 pt-3 text-xs">
                {/* 1. Agreement / Work Order */}
                <div className="border border-blue-200 rounded-lg overflow-hidden">
                  <div className="bg-blue-50 px-3 py-2 font-bold text-blue-900 text-[11px] flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                      Agreement / Work Order
                    </span>
                    <span className="font-mono text-[10px] text-blue-700">{(viewingProject.agreementWorkOrders || []).length} attached</span>
                  </div>
                  <div className="p-2.5 space-y-1.5 bg-white">
                    {(viewingProject.agreementWorkOrders || []).length === 0 ? (
                      <p className="text-gray-400 italic text-[11px] py-1">Missing / No documents attached</p>
                    ) : (
                      (viewingProject.agreementWorkOrders || []).map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                          <a href={doc.driveUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 font-semibold hover:underline flex items-center gap-1.5 truncate max-w-[400px]">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            {doc.fileName}
                          </a>
                          {canEdit && (
                            <button onClick={() => handleDeleteDocument(doc.id)} className="text-red-500 hover:text-red-700 text-[10px] font-semibold">
                              Remove
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. Invoice */}
                <div className="border border-purple-200 rounded-lg overflow-hidden">
                  <div className="bg-purple-50 px-3 py-2 font-bold text-purple-900 text-[11px] flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-purple-600" />
                      Invoice
                    </span>
                    <span className="font-mono text-[10px] text-purple-700">{(viewingProject.invoices || []).length} attached</span>
                  </div>
                  <div className="p-2.5 space-y-1.5 bg-white">
                    {(viewingProject.invoices || []).length === 0 ? (
                      <p className="text-gray-400 italic text-[11px] py-1">Missing / No documents attached</p>
                    ) : (
                      (viewingProject.invoices || []).map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                          <a href={doc.driveUrl} target="_blank" rel="noopener noreferrer" className="text-purple-700 font-semibold hover:underline flex items-center gap-1.5 truncate max-w-[400px]">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            {doc.fileName}
                          </a>
                          {canEdit && (
                            <button onClick={() => handleDeleteDocument(doc.id)} className="text-red-500 hover:text-red-700 text-[10px] font-semibold">
                              Remove
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. Payment Receipt */}
                <div className="border border-emerald-200 rounded-lg overflow-hidden">
                  <div className="bg-emerald-50 px-3 py-2 font-bold text-emerald-900 text-[11px] flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                      Payment Receipt
                    </span>
                    <span className="font-mono text-[10px] text-emerald-700">{(viewingProject.paymentReceipts || []).length} attached</span>
                  </div>
                  <div className="p-2.5 space-y-1.5 bg-white">
                    {(viewingProject.paymentReceipts || []).length === 0 ? (
                      <p className="text-gray-400 italic text-[11px] py-1">Missing / No documents attached</p>
                    ) : (
                      (viewingProject.paymentReceipts || []).map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                          <a href={doc.driveUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 font-semibold hover:underline flex items-center gap-1.5 truncate max-w-[400px]">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            {doc.fileName}
                          </a>
                          {canEdit && (
                            <button onClick={() => handleDeleteDocument(doc.id)} className="text-red-500 hover:text-red-700 text-[10px] font-semibold">
                              Remove
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-3 border-t border-gray-100 flex justify-between items-center sm:justify-between">
              {canDelete ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const id = viewingProject.id;
                    setViewingProject(null);
                    setDeletingId(id);
                  }}
                  className="text-xs text-red-600 hover:bg-red-50 border-red-200"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>
              ) : <div></div>}

              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const p = viewingProject;
                      setViewingProject(null);
                      handleOpenForm(p);
                    }}
                    className="text-xs text-blue-700 border-blue-200"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setViewingProject(null)}
                  className="bg-gray-800 text-white hover:bg-gray-900 text-xs"
                >
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {deletingId && (
        <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
          <DialogContent className="sm:max-w-[420px] bg-white p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>Confirm Deletion</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-600 mt-2">
                Are you sure you want to delete this consultancy project record? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeletingId(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => deletingId && handleDelete(deletingId)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
              >
                Delete Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* CONFIRM CLEAR ALL DIALOG */}
      {showClearConfirm && (
        <Dialog open={showClearConfirm} onOpenChange={(open) => !open && setShowClearConfirm(false)}>
          <DialogContent className="sm:max-w-[440px] bg-white p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>Clear All Consultancy Records</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-600 mt-2 leading-relaxed">
                This will permanently delete all {projects.length} consultancy projects from the platform. Are you sure you want to proceed?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowClearConfirm(false)} disabled={clearLoading} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleClearAll}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                disabled={clearLoading}
              >
                {clearLoading ? 'Clearing...' : 'Yes, Delete All'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* BULK CSV / EXCEL UPLOAD DIALOG */}
      {showBulkUpload && (
        <BulkUploadDialog
          isOpen={showBulkUpload}
          onClose={() => setShowBulkUpload(false)}
          token={token}
          onSuccess={() => {
            fetchProjects();
          }}
          uploadType="consultancy"
        />
      )}
    </div>
  );

  if (hideSidebar) {
    return internalContent;
  }

  return (
    <AppShell currentPage="consultancy-projects" onNavigate={onNavigate}>
      {internalContent}
    </AppShell>
  );
}

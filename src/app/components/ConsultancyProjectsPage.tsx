import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  DollarSign, TrendingUp, Briefcase, Plus, Upload, Pencil, Trash2,
  CheckCircle, Clock, AlertCircle, X, Building, Calendar, Search,
  Download, Eye, Filter, LayoutGrid, Table as TableIcon, BarChart3,
  ExternalLink, Sparkles, UserCheck, ChevronRight, RefreshCw,
  FileCheck, Receipt, Paperclip, ShieldCheck, Mail, Phone, Layers, Info,
  Check, Users, Tag
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

export interface FacultyAssociationItem {
  id?: string;
  facultyId?: string | null;
  employeeId: string;
  normalizedEmployeeId?: string;
  name: string;
  designation?: string | null;
  originalDepartment?: string | null;
  originalDepartmentSource?: string;
  currentDepartment?: string | null;
  school?: string | null;
  campus?: string | null;
  isValid?: boolean;
  displayOrder?: number;
}

export interface FacultyDirectoryItem {
  id: string;
  employeeId: string;
  name: string;
  designation?: string;
  department?: string;
  school?: string;
  campus?: string;
  email?: string;
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
  projectType?: 'Collaborative' | 'Sole' | 'MOU_Based' | 'Private_Consulting' | 'Others' | null;
  otherProjectTypeDescription?: string | null;
  projectStatus?: 'Sanctioned' | 'On Going' | 'Completed' | null;
  contractValueInLakhs?: number | null;
  revenueInLakhs: number;
  amountReceivedInLakhs?: number | null;
  department: string;
  status?: string | null;
  description?: string | null;
  empIdsRaw?: string | null;
  hasInvalidEmpIds?: boolean;
  invalidEmpIds?: string[];
  plannedDurationFormatted?: string | null;
  actualDurationFormatted?: string | null;
  facultyAssociations?: FacultyAssociationItem[];
  associatedFaculty?: FacultyAssociationItem[];
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

const VALID_PROJECT_TYPES = [
  'Collaborative',
  'Sole',
  'MOU_Based',
  'Private_Consulting',
  'Others'
] as const;

type ProjectTypeOption = typeof VALID_PROJECT_TYPES[number];

const PROJECT_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'Collaborative': { label: 'Collaborative', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  'Sole': { label: 'Sole', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  'MOU_Based': { label: 'MOU Based', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  'Private_Consulting': { label: 'Private Consulting', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  'Others': { label: 'Others', color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200' }
};

function formatProjectTypeBadge(type?: string | null, otherDesc?: string | null) {
  if (!type) return <span className="text-slate-400 text-xs">-</span>;
  const cfg = PROJECT_TYPE_CONFIG[type] || {
    label: type,
    color: 'text-slate-700',
    bg: 'bg-slate-50',
    border: 'border-slate-200'
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <span>{cfg.label}</span>
      {type === 'Others' && otherDesc && <span className="font-normal text-[11px] text-amber-900">({otherDesc})</span>}
    </span>
  );
}

const PROJECT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'Sanctioned': { label: 'Sanctioned', color: 'text-[#9A6700]', bg: 'bg-[#FFF4D8]', border: 'border-[#FFE5A3]' },
  'On Going': { label: 'On Going', color: 'text-[#2855B9]', bg: 'bg-[#EAF1FD]', border: 'border-[#C8DCFB]' },
  'Completed': { label: 'Completed', color: 'text-[#167447]', bg: 'bg-[#E8F5ED]', border: 'border-[#C6E7D2]' }
};

function formatProjectStatusBadge(status?: string | null) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">
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

const EMPTY_FORM = {
  projectName: '',
  teacherConsultant: '',
  empIdsRaw: '',
  agencyName: '',
  agencyContactEmail: '',
  agencyContactNumber: '',
  sponsoringAgency: '',
  consultancyStartYear: 2024,
  year: '2024-2025',
  startDate: '',
  expectedEndDate: '',
  actualCompletionDate: '',
  projectType: 'Collaborative' as ProjectTypeOption,
  otherProjectTypeDescription: '',
  projectStatus: 'On Going' as 'Sanctioned' | 'On Going' | 'Completed',
  contractValueInLakhs: '',
  revenueInLakhs: '',
  amountReceivedInLakhs: '',
  department: '',
  description: ''
};

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
  const [selectedProjectType, setSelectedProjectType] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'department' | 'projectType'>('table');

  // Modals & Drawers
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<ConsultancyProject | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Multi-Faculty Selection State
  const [selectedFacultyList, setSelectedFacultyList] = useState<FacultyDirectoryItem[]>([]);
  const [facultyQuery, setFacultyQuery] = useState('');
  const [facultyOptions, setFacultyOptions] = useState<FacultyDirectoryItem[]>([]);
  const [facultyLoading, setFacultyLoading] = useState(false);

  // Document attachments state
  const [agreementFiles, setAgreementFiles] = useState<File[]>([]);
  const [agreementLinks, setAgreementLinks] = useState('');
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [invoiceLinks, setInvoiceLinks] = useState('');
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [receiptLinks, setReceiptLinks] = useState('');

  const [viewingProject, setViewingProject] = useState<ConsultancyProject | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'faculty' | 'financial' | 'documents'>('overview');
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
      if (p.associatedFaculty) {
        p.associatedFaculty.forEach(fa => {
          if (fa.currentDepartment) set.add(normalizeDepartmentName(fa.currentDepartment));
          if (fa.originalDepartment) set.add(normalizeDepartmentName(fa.originalDepartment));
        });
      }
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
      if (selectedProjectType !== 'all') params.append('projectType', selectedProjectType);

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
  }, [token, selectedStartYear, selectedDepartment, selectedProjectStatus, selectedProjectType]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Search faculty directory for form autocomplete
  useEffect(() => {
    if (!showForm || !facultyQuery.trim() || !token) {
      setFacultyOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setFacultyLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/consultancy-projects/faculty-search?q=${encodeURIComponent(facultyQuery.trim())}&limit=30`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setFacultyOptions(data.data || []);
        }
      } catch (err) {
        console.error('Faculty search error:', err);
      } finally {
        setFacultyLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [showForm, facultyQuery, token]);

  // Live Durations in Form
  const plannedDuration = useMemo(() => {
    return calculateProjectDuration(formData.startDate, formData.expectedEndDate);
  }, [formData.startDate, formData.expectedEndDate]);

  const actualDuration = useMemo(() => {
    return formData.actualCompletionDate ? calculateProjectDuration(formData.startDate, formData.actualCompletionDate) : null;
  }, [formData.startDate, formData.actualCompletionDate]);

  // Handle Start Date change with strictly derived Consultancy Start Year
  const handleStartDateChange = (val: string) => {
    let derivedYear: number | null = null;
    if (val) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        derivedYear = d.getFullYear();
      }
    }
    setFormData(prev => ({
      ...prev,
      startDate: val,
      consultancyStartYear: derivedYear || prev.consultancyStartYear,
      year: derivedYear ? `${derivedYear - 1}-${derivedYear}` : prev.year
    }));
  };

  // Add / Remove faculty in form
  const handleAddFaculty = (fac: FacultyDirectoryItem) => {
    const exists = selectedFacultyList.some(
      f => f.employeeId.toUpperCase() === fac.employeeId.toUpperCase()
    );
    if (!exists) {
      const updated = [...selectedFacultyList, fac];
      setSelectedFacultyList(updated);
      const newEmpIdsRaw = updated.map(f => f.employeeId).join(', ');
      setFormData(prev => ({
        ...prev,
        empIdsRaw: newEmpIdsRaw,
        teacherConsultant: updated.map(f => f.name).join(', ')
      }));
    }
    setFacultyQuery('');
    setFacultyOptions([]);
  };

  const handleRemoveFaculty = (employeeId: string) => {
    const updated = selectedFacultyList.filter(
      f => f.employeeId.toUpperCase() !== employeeId.toUpperCase()
    );
    setSelectedFacultyList(updated);
    const newEmpIdsRaw = updated.map(f => f.employeeId).join(', ');
    setFormData(prev => ({
      ...prev,
      empIdsRaw: newEmpIdsRaw,
      teacherConsultant: updated.map(f => f.name).join(', ')
    }));
  };

  // Manual comma-separated EmpId input handler
  const handleManualEmpIdsChange = (val: string) => {
    setFormData(prev => ({ ...prev, empIdsRaw: val }));
  };

  // Filtered list
  const filteredProjects = useMemo(() => {
    return projects.filter(item => {
      if (selectedStartYear !== 'all') {
        const itemYear = item.consultancyStartYear ? String(item.consultancyStartYear) : (item.year ? item.year.split('-')[0] : '');
        if (itemYear !== selectedStartYear) return false;
      }
      if (selectedDepartment !== 'all') {
        const deptMatch = item.department === selectedDepartment ||
          (item.associatedFaculty && item.associatedFaculty.some(
            fa => fa.originalDepartment === selectedDepartment || fa.currentDepartment === selectedDepartment
          ));
        if (!deptMatch) return false;
      }
      if (selectedProjectStatus !== 'all') {
        if ((item.projectStatus || 'Review Required') !== selectedProjectStatus) return false;
      }
      if (selectedProjectType !== 'all') {
        if (item.projectType !== selectedProjectType) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.projectName?.toLowerCase().includes(q);
        const consultantMatch = item.teacherConsultant?.toLowerCase().includes(q);
        const agencyMatch = (item.agencyName || item.sponsoringAgency)?.toLowerCase().includes(q);
        const deptMatch = item.department?.toLowerCase().includes(q);
        const empIdMatch = item.empIdsRaw?.toLowerCase().includes(q) ||
          (item.associatedFaculty && item.associatedFaculty.some(fa => fa.employeeId.toLowerCase().includes(q) || fa.name.toLowerCase().includes(q)));
        if (!titleMatch && !consultantMatch && !agencyMatch && !deptMatch && !empIdMatch) return false;
      }
      return true;
    });
  }, [projects, selectedStartYear, selectedDepartment, selectedProjectStatus, selectedProjectType, searchQuery]);

  // Aggregate stats
  const totalRevenue = useMemo(() => {
    return filteredProjects.reduce((sum, p) => sum + Number(p.revenueInLakhs || 0), 0);
  }, [filteredProjects]);

  const uniqueConsultants = useMemo(() => {
    const set = new Set<string>();
    filteredProjects.forEach(p => {
      if (p.associatedFaculty && p.associatedFaculty.length > 0) {
        p.associatedFaculty.forEach(fa => {
          if (fa.employeeId) set.add(fa.employeeId.toUpperCase());
        });
      } else if (p.teacherConsultant) {
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

  const projectTypeMap = useMemo(() => {
    return filteredProjects.reduce((acc, p) => {
      const t = p.projectType || 'Collaborative';
      if (!acc[t]) acc[t] = { count: 0, revenue: 0 };
      acc[t].count++;
      acc[t].revenue += Number(p.revenueInLakhs || 0);
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
    setFacultyQuery('');
    setFacultyOptions([]);

    if (project) {
      setEditingProject(project);
      // Preload associated faculty
      const preloadedFac: FacultyDirectoryItem[] = (project.associatedFaculty || []).map(fa => ({
        id: fa.facultyId || fa.id || fa.employeeId,
        employeeId: fa.employeeId,
        name: fa.name,
        designation: fa.designation || undefined,
        department: fa.currentDepartment || fa.originalDepartment || undefined,
        school: fa.school || undefined,
        campus: fa.campus || undefined
      }));
      setSelectedFacultyList(preloadedFac);

      setFormData({
        projectName: project.projectName || '',
        teacherConsultant: project.teacherConsultant || '',
        empIdsRaw: project.empIdsRaw || (project.associatedFaculty ? project.associatedFaculty.map(f => f.employeeId).join(', ') : ''),
        agencyName: project.agencyName || project.sponsoringAgency || '',
        agencyContactEmail: project.agencyContactEmail || '',
        agencyContactNumber: project.agencyContactNumber || '',
        sponsoringAgency: project.sponsoringAgency || '',
        consultancyStartYear: project.consultancyStartYear || 2024,
        year: project.year || '2024-2025',
        startDate: project.startDate ? project.startDate.split('T')[0] : '',
        expectedEndDate: project.expectedEndDate ? project.expectedEndDate.split('T')[0] : '',
        actualCompletionDate: project.actualCompletionDate ? project.actualCompletionDate.split('T')[0] : '',
        projectType: (project.projectType || 'Collaborative') as ProjectTypeOption,
        otherProjectTypeDescription: project.otherProjectTypeDescription || '',
        projectStatus: (project.projectStatus || 'On Going') as 'Sanctioned' | 'On Going' | 'Completed',
        contractValueInLakhs: project.contractValueInLakhs !== null && project.contractValueInLakhs !== undefined ? String(project.contractValueInLakhs) : '',
        revenueInLakhs: String(project.revenueInLakhs || ''),
        amountReceivedInLakhs: project.amountReceivedInLakhs !== null && project.amountReceivedInLakhs !== undefined ? String(project.amountReceivedInLakhs) : '',
        department: project.department || departments[0] || '',
        description: project.description || ''
      });
    } else {
      setEditingProject(null);
      setSelectedFacultyList([]);
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
    if (!formData.projectName.trim()) {
      setFormError('Name of Consultancy Project is required.');
      return;
    }
    if (!formData.agencyName.trim()) {
      setFormError('Agency Name is required.');
      return;
    }
    if (!formData.startDate) {
      setFormError('Start Date is required to derive Consultancy Start Year.');
      return;
    }
    if (!formData.empIdsRaw.trim() && selectedFacultyList.length === 0) {
      setFormError('Please select or enter at least one faculty owner (EmpId).');
      return;
    }
    if (formData.projectType === 'Others' && !formData.otherProjectTypeDescription.trim()) {
      setFormError('Please specify the description when Project Type is "Others".');
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
        empIds: formData.empIdsRaw.trim(),
        revenueInLakhs: parseFloat(formData.revenueInLakhs) || 0,
        contractValueInLakhs: formData.contractValueInLakhs ? parseFloat(formData.contractValueInLakhs) : null,
        amountReceivedInLakhs: formData.amountReceivedInLakhs ? parseFloat(formData.amountReceivedInLakhs) : null,
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

  // Export functions with official 17 columns
  const handleExportCSV = () => {
    if (filteredProjects.length === 0) {
      alert('No records available to export.');
      return;
    }

    const headers = [
      'EmpId',
      'Name of Consultancy Project',
      'Agency Name',
      'Agency Contact Email',
      'Agency Contact Number',
      'Start Date',
      'Expected End Date',
      'Project Type',
      'Actual Completion Date',
      'Project Status',
      'Contract Value (INR in Lakhs)',
      'Revenue Generated (INR in Lakhs)',
      'Amount Received (INR in Lakhs)',
      'Scope of Work / Deliverables Summary',
      'Agreement / Work Order',
      'Invoice',
      'Payment Receipt'
    ];

    const rows = filteredProjects.map(p => {
      const agreementUrls = (p.agreementWorkOrders || []).map(d => d.driveUrl).join(' | ');
      const invoiceUrls = (p.invoices || []).map(d => d.driveUrl).join(' | ');
      const receiptUrls = (p.paymentReceipts || []).map(d => d.driveUrl).join(' | ');

      const empIdsDisplay = (p.associatedFaculty && p.associatedFaculty.length > 0)
        ? p.associatedFaculty.map(fa => fa.employeeId).join(', ')
        : (p.empIdsRaw || '');

      const projectTypeDisplay = p.projectType === 'Others' && p.otherProjectTypeDescription
        ? `Others - ${p.otherProjectTypeDescription}`
        : (p.projectType || 'Collaborative');

      return [
        `"${empIdsDisplay.replace(/"/g, '""')}"`,
        `"${(p.projectName || '').replace(/"/g, '""')}"`,
        `"${(p.agencyName || p.sponsoringAgency || '').replace(/"/g, '""')}"`,
        `"${(p.agencyContactEmail || '').replace(/"/g, '""')}"`,
        `"${(p.agencyContactNumber || '').replace(/"/g, '""')}"`,
        p.startDate ? p.startDate.split('T')[0] : '',
        p.expectedEndDate ? p.expectedEndDate.split('T')[0] : '',
        `"${projectTypeDisplay.replace(/"/g, '""')}"`,
        p.actualCompletionDate ? p.actualCompletionDate.split('T')[0] : '',
        `"${p.projectStatus || 'On Going'}"`,
        p.contractValueInLakhs !== null && p.contractValueInLakhs !== undefined ? Number(p.contractValueInLakhs).toFixed(2) : '',
        Number(p.revenueInLakhs || 0).toFixed(2),
        p.amountReceivedInLakhs !== null && p.amountReceivedInLakhs !== undefined ? Number(p.amountReceivedInLakhs).toFixed(2) : '',
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
      'EmpId',
      'Name of Consultancy Project',
      'Agency Name',
      'Agency Contact Email',
      'Agency Contact Number',
      'Start Date',
      'Expected End Date',
      'Project Type',
      'Actual Completion Date',
      'Project Status',
      'Contract Value (INR in Lakhs)',
      'Revenue Generated (INR in Lakhs)',
      'Amount Received (INR in Lakhs)',
      'Scope of Work / Deliverables Summary',
      'Agreement / Work Order',
      'Invoice',
      'Payment Receipt'
    ];

    const rows = filteredProjects.map(p => {
      const agreementUrls = (p.agreementWorkOrders || []).map(d => d.driveUrl).join('\n');
      const invoiceUrls = (p.invoices || []).map(d => d.driveUrl).join('\n');
      const receiptUrls = (p.paymentReceipts || []).map(d => d.driveUrl).join('\n');

      const empIdsDisplay = (p.associatedFaculty && p.associatedFaculty.length > 0)
        ? p.associatedFaculty.map(fa => fa.employeeId).join(', ')
        : (p.empIdsRaw || '');

      const projectTypeDisplay = p.projectType === 'Others' && p.otherProjectTypeDescription
        ? `Others - ${p.otherProjectTypeDescription}`
        : (p.projectType || 'Collaborative');

      return [
        empIdsDisplay,
        p.projectName,
        p.agencyName || p.sponsoringAgency,
        p.agencyContactEmail || '',
        p.agencyContactNumber || '',
        p.startDate ? p.startDate.split('T')[0] : '',
        p.expectedEndDate ? p.expectedEndDate.split('T')[0] : '',
        projectTypeDisplay,
        p.actualCompletionDate ? p.actualCompletionDate.split('T')[0] : '',
        p.projectStatus || 'On Going',
        p.contractValueInLakhs !== null && p.contractValueInLakhs !== undefined ? Number(p.contractValueInLakhs) : '',
        Number(p.revenueInLakhs || 0),
        p.amountReceivedInLakhs !== null && p.amountReceivedInLakhs !== undefined ? Number(p.amountReceivedInLakhs) : '',
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

          <div className="overflow-x-auto bg-white rounded-xl shadow-xs border border-[#E2E8F0]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-[#E2E8F0] text-slate-700 font-semibold text-xs">
                <tr>
                  <th className="py-3 px-4">S. No.</th>
                  <th className="py-3 px-4">Faculty Owner(s)</th>
                  <th className="py-3 px-4">Project Name</th>
                  <th className="py-3 px-4">Agency Name</th>
                  <th className="py-3 px-4">Project Type</th>
                  <th className="py-3 px-4">Start Year</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Revenue (₹ Lakhs)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs sm:text-[13px]">
                {filteredProjects.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-[#F1F5F9] transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-500">{idx + 1}</td>
                    <td className="py-3 px-4">
                      {p.associatedFaculty && p.associatedFaculty.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.associatedFaculty.map((fa, fIdx) => (
                            <span key={fIdx} className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                              <span>{fa.name}</span>
                              <span className="font-mono text-[10px] text-slate-500">({fa.employeeId})</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="font-semibold text-gray-900">{p.teacherConsultant}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-800 font-medium">{p.projectName}</td>
                    <td className="py-3 px-4 text-gray-600">{p.agencyName || p.sponsoringAgency}</td>
                    <td className="py-3 px-4">{formatProjectTypeBadge(p.projectType, p.otherProjectTypeDescription)}</td>
                    <td className="py-3 px-4 font-mono">{p.consultancyStartYear ? `CSY ${p.consultancyStartYear}` : p.year}</td>
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
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by title, faculty, agency, EmpId..."
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

            {/* Project Type Filter */}
            <div className="w-[160px]">
              <Select value={selectedProjectType} onValueChange={setSelectedProjectType}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Project Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Project Types</SelectItem>
                  {VALID_PROJECT_TYPES.map(pt => (
                    <SelectItem key={pt} value={pt}>{PROJECT_TYPE_CONFIG[pt]?.label || pt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Consultancy Start Year Filter */}
            <div className="w-[140px]">
              <Select value={selectedStartYear} onValueChange={setSelectedStartYear}>
                <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                  <SelectValue placeholder="Start Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {CONSULTANCY_START_YEARS.map(y => (
                    <SelectItem key={y} value={String(y)}>CSY {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div className="w-[170px]">
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
                  <SelectItem value="all">All Statuses</SelectItem>
                  {VALID_CONSULTANCY_PROJECT_STATUSES.map(st => (
                    <SelectItem key={st} value={st}>{st}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filter button */}
            {(selectedStartYear !== 'all' || selectedDepartment !== 'all' || selectedProjectStatus !== 'all' || selectedProjectType !== 'all' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedStartYear('all');
                  setSelectedDepartment('all');
                  setSelectedProjectStatus('all');
                  setSelectedProjectType('all');
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
              onClick={() => setViewMode('projectType')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'projectType' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
              title="Project Type Analytics"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Type Analytics</span>
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
            {searchQuery || selectedStartYear !== 'all' || selectedDepartment !== 'all' || selectedProjectStatus !== 'all' || selectedProjectType !== 'all'
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
        <Card className="border border-[#E2E8F0] shadow-xs rounded-xl overflow-hidden bg-white">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                <tr className="text-slate-700 font-semibold text-xs">
                  <th className="py-3 px-3.5 w-10 text-center">#</th>
                  <th className="py-3 px-3.5 min-w-[200px]">Project Name</th>
                  <th className="py-3 px-3.5 min-w-[180px]">Faculty Owners (EmpIds)</th>
                  <th className="py-3 px-3.5 min-w-[160px]">Agency Name</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Project Type</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Start Date / Year</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Status</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap font-bold text-emerald-800">Revenue (₹ Lakhs)</th>
                  <th className="py-3 px-3.5 text-center whitespace-nowrap">Docs</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs sm:text-[13px]">
                {filteredProjects.map((project, idx) => (
                  <tr key={project.id} className="hover:bg-[#F1F5F9] transition-colors group">
                    <td className="py-3 px-3.5 text-center font-mono text-gray-400">{idx + 1}</td>
                    <td className="py-3 px-3.5">
                      <button
                        onClick={() => {
                          setViewingProject(project);
                          setDetailTab('overview');
                        }}
                        className="font-bold text-gray-900 hover:text-teal-700 text-left line-clamp-2 transition-colors"
                      >
                        {project.projectName}
                      </button>
                      <div className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[220px]">
                        {project.department || 'General'}
                      </div>
                    </td>
                    <td className="py-3 px-3.5">
                      {project.associatedFaculty && project.associatedFaculty.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[240px]">
                          {project.associatedFaculty.map((fa, fIdx) => (
                            <span
                              key={fIdx}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                                fa.isValid !== false ? 'bg-slate-100 text-slate-800 border-slate-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                              title={`${fa.name} (${fa.employeeId}) - Dept: ${fa.originalDepartment || fa.currentDepartment || 'N/A'}`}
                            >
                              <span className="truncate max-w-[120px]">{fa.name}</span>
                              <span className="font-mono text-[10px] text-slate-500">({fa.employeeId})</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                            {project.teacherConsultant?.charAt(0) || 'F'}
                          </span>
                          <span className="font-semibold text-gray-800 truncate max-w-[140px]" title={project.teacherConsultant}>
                            {project.teacherConsultant || project.empIdsRaw}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-gray-900 truncate max-w-[160px]" title={project.agencyName || project.sponsoringAgency}>
                        {project.agencyName || project.sponsoringAgency}
                      </div>
                      {(project.agencyContactEmail || project.agencyContactNumber) && (
                        <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                          {project.agencyContactEmail && <span className="truncate max-w-[110px]">{project.agencyContactEmail}</span>}
                          {project.agencyContactEmail && project.agencyContactNumber && <span>•</span>}
                          {project.agencyContactNumber && <span>{project.agencyContactNumber}</span>}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                      {formatProjectTypeBadge(project.projectType, project.otherProjectTypeDescription)}
                    </td>
                    <td className="py-3 px-3.5 text-center font-mono text-gray-700 whitespace-nowrap">
                      <div>{project.startDate ? project.startDate.split('T')[0] : '-'}</div>
                      <span className="bg-slate-100 px-1.5 py-0.2 rounded text-[10px] border border-slate-200 text-slate-600">
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
                      <button
                        onClick={() => {
                          setViewingProject(project);
                          setDetailTab('documents');
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title="View attached Agreement, Invoice, Payment Receipt"
                      >
                        <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                        <span className="font-mono text-xs font-semibold">{project.totalDocumentCount || 0}</span>
                      </button>
                    </td>
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setViewingProject(project);
                            setDetailTab('overview');
                          }}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                          title="Inspect Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenForm(project)}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                            title="Edit Consultancy Project"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingId(project.id)}
                            className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700"
                            title="Delete Record"
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px] font-mono text-teal-800 bg-teal-50 border-teal-200">
                      {project.consultancyStartYear ? `CSY ${project.consultancyStartYear}` : project.year}
                    </Badge>
                    {formatProjectTypeBadge(project.projectType, project.otherProjectTypeDescription)}
                  </div>
                  {formatProjectStatusBadge(project.projectStatus)}
                </div>
                <CardTitle className="text-sm font-bold text-gray-900 group-hover:text-teal-700 transition-colors line-clamp-2">
                  {project.projectName}
                </CardTitle>
                <div className="text-xs text-gray-600 pt-1">
                  {project.associatedFaculty && project.associatedFaculty.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {project.associatedFaculty.map((fa, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-800 text-[10px] px-1.5 py-0.5 rounded font-medium border border-slate-200">
                          {fa.name} ({fa.employeeId})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="font-semibold text-gray-800">{project.teacherConsultant}</span>
                  )}
                </div>
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
                    onClick={() => {
                      setViewingProject(project);
                      setDetailTab('overview');
                    }}
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
      ) : viewMode === 'projectType' ? (
        /* PROJECT TYPE ANALYTICS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {VALID_PROJECT_TYPES.map(pt => {
            const stats = projectTypeMap[pt] || { count: 0, revenue: 0 };
            const cfg = PROJECT_TYPE_CONFIG[pt];
            return (
              <Card key={pt} className="border border-gray-200/80 shadow-sm rounded-xl hover:shadow-md transition-shadow bg-white">
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${cfg.bg} ${cfg.color}`}>
                        <Tag className="w-4 h-4" />
                      </div>
                      <CardTitle className="text-sm font-bold text-gray-900">
                        {cfg.label}
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className={`text-xs ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                      {stats.count} Projects
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 pt-0 space-y-3 text-xs">
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Total Projects:</span>
                      <span className="font-bold text-gray-900 font-mono">{stats.count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Revenue Generated:</span>
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
            );
          })}
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
      {/* DIALOG: ADD/EDIT CONSULTANCY PROJECT (MULTI-FACULTY & DERIVED YEAR) */}
      {/* ======================================================== */}
      {showForm && (
        <Dialog open={showForm} onOpenChange={(open) => !open && setShowForm(false)}>
          <DialogContent className="sm:max-w-[720px] max-h-[88vh] overflow-y-auto bg-white p-6 rounded-2xl">
            <DialogHeader className="border-b border-gray-100 pb-3">
              <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-teal-700" />
                <span>{editingProject ? 'Edit Consultancy Project' : 'Record New Consultancy Project'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500">
                Track client advisory contracts, multi-faculty ownership, derived start year, and revenue recognition.
              </DialogDescription>
            </DialogHeader>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-5 pt-2 text-xs">

              {/* SECTION A — PROJECT TITLE & PROJECT TYPE */}
              <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-teal-700" />
                  <span>Section A — Project Identification & Classification</span>
                </h4>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Name of Consultancy Project <span className="text-red-500">*</span></Label>
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
                    <Label className="font-semibold text-gray-700">Project Type <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.projectType}
                      onValueChange={(val: ProjectTypeOption) => setFormData({ ...formData, projectType: val })}
                    >
                      <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                        <SelectValue placeholder="Select Project Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {VALID_PROJECT_TYPES.map(pt => (
                          <SelectItem key={pt} value={pt}>{PROJECT_TYPE_CONFIG[pt]?.label || pt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.projectType === 'Others' ? (
                    <div className="space-y-1.5">
                      <Label className="font-semibold text-gray-700">Specify Other Project Type <span className="text-red-500">*</span></Label>
                      <Input
                        required
                        placeholder="e.g. Industry Advisory Engagement"
                        className="h-9 text-xs border-gray-200 bg-white focus-visible:ring-teal-600"
                        value={formData.otherProjectTypeDescription}
                        onChange={(e) => setFormData({ ...formData, otherProjectTypeDescription: e.target.value })}
                      />
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>

              {/* SECTION B — FACULTY OWNERSHIP & EMPID ASSOCIATION */}
              <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-teal-700" />
                    <span>Section B — Faculty Owners & EmpId Association</span>
                  </div>
                  <span className="text-[11px] text-slate-500 normal-case font-normal">Supports multiple faculty owners</span>
                </h4>

                {/* Selected Faculty Pills */}
                {selectedFacultyList.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-slate-700">Associated Faculty Members ({selectedFacultyList.length}):</Label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-white rounded-lg border border-slate-200 max-h-32 overflow-y-auto">
                      {selectedFacultyList.map(fac => (
                        <span
                          key={fac.employeeId}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium"
                        >
                          <span className="font-semibold">{fac.name}</span>
                          <span className="font-mono text-[11px] text-blue-700">({fac.employeeId})</span>
                          {fac.department && <span className="text-[10px] text-blue-500">• {fac.department}</span>}
                          <button
                            type="button"
                            onClick={() => handleRemoveFaculty(fac.employeeId)}
                            className="text-blue-400 hover:text-rose-600 ml-0.5"
                            title="Remove"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Method A: Searchable Selector */}
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Search Faculty Directory (By Name or EmpId)</Label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                    <Input
                      placeholder="Type faculty name or EmpId to search..."
                      className="h-9 pl-8 text-xs border-gray-200 bg-white focus-visible:ring-teal-600"
                      value={facultyQuery}
                      onChange={(e) => setFacultyQuery(e.target.value)}
                    />
                    {facultyLoading && (
                      <RefreshCw className="w-3 h-3 text-blue-600 animate-spin absolute right-2.5 top-3" />
                    )}
                  </div>

                  {facultyOptions.length > 0 && (
                    <div className="border border-slate-200 rounded-lg bg-white shadow-md divide-y divide-slate-100 max-h-40 overflow-y-auto">
                      {facultyOptions.map(fac => (
                        <div
                          key={fac.employeeId}
                          onClick={() => handleAddFaculty(fac)}
                          className="p-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-slate-800">{fac.name}</span>
                            <span className="font-mono text-[11px] text-slate-500 ml-1.5">({fac.employeeId})</span>
                            {fac.department && <span className="text-[10px] text-slate-400 ml-2">{fac.department}</span>}
                          </div>
                          <Plus className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Method B: Comma-Separated Input */}
                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Manual EmpId(s) Input (Comma-Separated) <span className="text-red-500">*</span></Label>
                  <Input
                    required
                    placeholder="e.g. 3489, 2043, 1672"
                    className="h-9 text-xs border-gray-200 bg-white font-mono focus-visible:ring-teal-600"
                    value={formData.empIdsRaw}
                    onChange={(e) => handleManualEmpIdsChange(e.target.value)}
                  />
                  <p className="text-[11px] text-slate-500">
                    Enter verified Employee IDs separated by commas. Details will be automatically fetched from Faculty Management.
                  </p>
                </div>
              </div>

              {/* SECTION C — AGENCY INFORMATION */}
              <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-teal-700" />
                  <span>Section C — Client / Sponsoring Agency</span>
                </h4>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Agency Name <span className="text-red-500">*</span></Label>
                  <Input
                    required
                    placeholder="e.g. Apex Robotics Ltd / CleanTech Energy Solutions"
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
                        placeholder="e.g. projects@apexrobotics.in"
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
                        placeholder="e.g. +91 98765 43210"
                        className="h-9 pl-8 text-xs border-gray-200 bg-white focus-visible:ring-teal-600"
                        value={formData.agencyContactNumber}
                        onChange={(e) => setFormData({ ...formData, agencyContactNumber: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION D — TIMELINE & DERIVED START YEAR */}
              <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-700" />
                  <span>Section D — Project Timeline & Lifecycle</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700">Start Date <span className="text-red-500">*</span></Label>
                    <Input
                      required
                      type="date"
                      className="h-9 text-xs border-gray-200 bg-white focus-visible:ring-teal-600"
                      value={formData.startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700">Consultancy Start Year</Label>
                    <div className="h-9 px-3 rounded-md border border-gray-200 bg-slate-100 flex items-center gap-1.5 font-mono text-xs font-bold text-slate-800">
                      <span>{formData.consultancyStartYear ? `CSY ${formData.consultancyStartYear}` : 'Derived from Start Date'}</span>
                      <span className="text-[10px] text-slate-500 font-normal ml-auto">(Auto-derived)</span>
                    </div>
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
                        {VALID_CONSULTANCY_PROJECT_STATUSES.map(st => (
                          <SelectItem key={st} value={st}>{st}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* SECTION E — FINANCIALS (INR IN LAKHS) */}
              <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-teal-700" />
                  <span>Section E — Financial Details (INR in Lakhs)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700">Contract Value (₹ in Lakhs)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 15.50"
                      className="h-9 text-xs border-gray-200 bg-white font-mono focus-visible:ring-teal-600"
                      value={formData.contractValueInLakhs}
                      onChange={(e) => setFormData({ ...formData, contractValueInLakhs: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700">Revenue Generated (₹ in Lakhs) <span className="text-red-500">*</span></Label>
                    <Input
                      required
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 12.00"
                      className="h-9 text-xs border-gray-200 bg-white font-mono font-bold text-emerald-800 focus-visible:ring-teal-600"
                      value={formData.revenueInLakhs}
                      onChange={(e) => setFormData({ ...formData, revenueInLakhs: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700">Amount Received (₹ in Lakhs)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 8.00"
                      className="h-9 text-xs border-gray-200 bg-white font-mono focus-visible:ring-teal-600"
                      value={formData.amountReceivedInLakhs}
                      onChange={(e) => setFormData({ ...formData, amountReceivedInLakhs: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION F — DELIVERABLES SUMMARY & DOCUMENTS */}
              <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-teal-700" />
                  <span>Section F — Deliverables & Supporting Documents</span>
                </h4>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-gray-700">Scope of Work / Deliverables Summary</Label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of consulting scope, objectives, and deliverables..."
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-lg bg-white focus-visible:ring-teal-600"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700 flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Agreement / Work Order (Drive URL)</span>
                    </Label>
                    <Input
                      placeholder="https://drive.google.com/..."
                      className="h-9 text-xs border-gray-200 bg-white"
                      value={agreementLinks}
                      onChange={(e) => setAgreementLinks(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700 flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5 text-purple-600" />
                      <span>Invoice (Drive URL)</span>
                    </Label>
                    <Input
                      placeholder="https://drive.google.com/..."
                      className="h-9 text-xs border-gray-200 bg-white"
                      value={invoiceLinks}
                      onChange={(e) => setInvoiceLinks(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold text-gray-700 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Payment Receipt (Drive URL)</span>
                    </Label>
                    <Input
                      placeholder="https://drive.google.com/..."
                      className="h-9 text-xs border-gray-200 bg-white"
                      value={receiptLinks}
                      onChange={(e) => setReceiptLinks(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  disabled={formLoading}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-4"
                >
                  {formLoading ? 'Saving...' : editingProject ? 'Update Consultancy Project' : 'Save Consultancy Project'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ======================================================== */}
      {/* DIALOG: VIEW CONSULTANCY PROJECT DETAILS */}
      {/* ======================================================== */}
      {viewingProject && (
        <Dialog open={!!viewingProject} onOpenChange={(open) => !open && setViewingProject(null)}>
          <DialogContent className="sm:max-w-[720px] max-h-[88vh] overflow-y-auto bg-white p-6 rounded-2xl">
            <DialogHeader className="border-b border-gray-100 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono bg-teal-50 border-teal-200 text-teal-800">
                    {viewingProject.consultancyStartYear ? `CSY ${viewingProject.consultancyStartYear}` : viewingProject.year}
                  </Badge>
                  {formatProjectTypeBadge(viewingProject.projectType, viewingProject.otherProjectTypeDescription)}
                  {formatProjectStatusBadge(viewingProject.projectStatus)}
                </div>
              </div>
              <DialogTitle className="text-base font-bold text-gray-900 mt-2 text-left">
                {viewingProject.projectName}
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 text-left">
                Agency: <strong>{viewingProject.agencyName || viewingProject.sponsoringAgency}</strong> • Dept: {viewingProject.department || 'General'}
              </DialogDescription>
            </DialogHeader>

            <Tabs value={detailTab} onValueChange={(v: any) => setDetailTab(v)} className="pt-2">
              <TabsList className="grid grid-cols-4 bg-slate-100 p-1 rounded-lg text-xs">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="faculty" className="text-xs">Faculty Owners</TabsTrigger>
                <TabsTrigger value="financial" className="text-xs">Financials</TabsTrigger>
                <TabsTrigger value="documents" className="text-xs">
                  Documents ({(viewingProject.documents || []).length})
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: OVERVIEW */}
              <TabsContent value="overview" className="space-y-4 pt-3 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <span className="text-gray-500 block text-[11px]">Agency Name</span>
                    <span className="font-semibold text-gray-900">{viewingProject.agencyName || viewingProject.sponsoringAgency}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Agency Contact</span>
                    <span className="text-gray-800">
                      {viewingProject.agencyContactEmail || viewingProject.agencyContactNumber || 'Not Provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Project Type</span>
                    <span className="font-semibold text-gray-900">
                      {viewingProject.projectType || 'Collaborative'}
                      {viewingProject.projectType === 'Others' && viewingProject.otherProjectTypeDescription && ` (${viewingProject.otherProjectTypeDescription})`}
                    </span>
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
                      {viewingProject.plannedDurationFormatted || 'Not Available'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Actual Completion Date</span>
                    <span className="font-semibold text-gray-900">{viewingProject.actualCompletionDate ? viewingProject.actualCompletionDate.split('T')[0] : 'In Progress'}</span>
                  </div>
                </div>

                {viewingProject.description && (
                  <div className="p-3 bg-white border border-gray-200 rounded-lg">
                    <span className="text-[11px] font-bold text-gray-700 block mb-1">Scope of Work & Deliverables</span>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{viewingProject.description}</p>
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: FACULTY OWNERS */}
              <TabsContent value="faculty" className="space-y-3 pt-3 text-xs">
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800">Associated Faculty Members & Departments:</span>
                  {viewingProject.associatedFaculty && viewingProject.associatedFaculty.length > 0 ? (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white overflow-hidden">
                      {viewingProject.associatedFaculty.map((fa, idx) => (
                        <div key={idx} className="p-3 flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{fa.name}</span>
                              <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                                EmpId: {fa.employeeId}
                              </span>
                              {!fa.isValid && (
                                <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">
                                  Unrecognized EmpId
                                </Badge>
                              )}
                            </div>
                            <div className="text-slate-600 text-[11px]">
                              {fa.designation && <span>{fa.designation} • </span>}
                              <span>Dept: <strong>{fa.currentDepartment || fa.originalDepartment || 'General'}</strong></span>
                              {fa.originalDepartment && fa.currentDepartment && fa.originalDepartment !== fa.currentDepartment && (
                                <span className="text-slate-400 text-[10px]"> (Orig: {fa.originalDepartment})</span>
                              )}
                            </div>
                            {(fa.school || fa.campus) && (
                              <div className="text-slate-400 text-[10px]">
                                {fa.school && <span>{fa.school}</span>}
                                {fa.school && fa.campus && <span> • </span>}
                                {fa.campus && <span>{fa.campus}</span>}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">Owner #{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
                      <span className="font-semibold">{viewingProject.teacherConsultant || 'Unassigned'}</span>
                      {viewingProject.empIdsRaw && <span className="font-mono text-slate-500 ml-2">({viewingProject.empIdsRaw})</span>}
                    </div>
                  )}

                  {viewingProject.hasInvalidEmpIds && viewingProject.invalidEmpIds && viewingProject.invalidEmpIds.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>Unverified EmpIds requiring correction: <strong>{viewingProject.invalidEmpIds.join(', ')}</strong></span>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TAB 3: FINANCIALS */}
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

              {/* TAB 4: DOCUMENTS */}
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
                      <p className="text-gray-400 italic text-[11px]">No agreement or work order attached.</p>
                    ) : (
                      (viewingProject.agreementWorkOrders || []).map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                          <span className="font-medium text-slate-800 truncate max-w-[320px]">{doc.fileName}</span>
                          <div className="flex items-center gap-2">
                            <a
                              href={doc.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold text-[11px]"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open</span>
                            </a>
                            {canEdit && (
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="text-rose-500 hover:text-rose-700 ml-2"
                                title="Delete Document"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
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
                      Invoice Documents
                    </span>
                    <span className="font-mono text-[10px] text-purple-700">{(viewingProject.invoices || []).length} attached</span>
                  </div>
                  <div className="p-2.5 space-y-1.5 bg-white">
                    {(viewingProject.invoices || []).length === 0 ? (
                      <p className="text-gray-400 italic text-[11px]">No invoice documents attached.</p>
                    ) : (
                      (viewingProject.invoices || []).map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                          <span className="font-medium text-slate-800 truncate max-w-[320px]">{doc.fileName}</span>
                          <div className="flex items-center gap-2">
                            <a
                              href={doc.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 hover:text-purple-800 flex items-center gap-1 font-semibold text-[11px]"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open</span>
                            </a>
                            {canEdit && (
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="text-rose-500 hover:text-rose-700 ml-2"
                                title="Delete Document"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. Payment Receipt */}
                <div className="border border-emerald-200 rounded-lg overflow-hidden">
                  <div className="bg-emerald-50 px-3 py-2 font-bold text-emerald-900 text-[11px] flex justify-between items-center">
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      Payment Receipts
                    </span>
                    <span className="font-mono text-[10px] text-emerald-700">{(viewingProject.paymentReceipts || []).length} attached</span>
                  </div>
                  <div className="p-2.5 space-y-1.5 bg-white">
                    {(viewingProject.paymentReceipts || []).length === 0 ? (
                      <p className="text-gray-400 italic text-[11px]">No payment receipts attached.</p>
                    ) : (
                      (viewingProject.paymentReceipts || []).map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100">
                          <span className="font-medium text-slate-800 truncate max-w-[320px]">{doc.fileName}</span>
                          <div className="flex items-center gap-2">
                            <a
                              href={doc.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:text-emerald-800 flex items-center gap-1 font-semibold text-[11px]"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open</span>
                            </a>
                            {canEdit && (
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="text-rose-500 hover:text-rose-700 ml-2"
                                title="Delete Document"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-3 border-t border-gray-100">
              <Button size="sm" variant="outline" onClick={() => setViewingProject(null)} className="text-xs">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ======================================================== */}
      {/* DIALOG: DELETE CONFIRMATION */}
      {/* ======================================================== */}
      {deletingId && (
        <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
          <DialogContent className="sm:max-w-[420px] bg-white p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <span>Confirm Deletion</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 pt-1">
                Are you sure you want to delete this consultancy project? All associated faculty links and uploaded document records will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4 flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setDeletingId(null)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => deletingId && handleDelete(deletingId)}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
              >
                Delete Record
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ======================================================== */}
      {/* DIALOG: CLEAR ALL CONFIRMATION */}
      {/* ======================================================== */}
      {showClearConfirm && (
        <Dialog open={showClearConfirm} onOpenChange={(open) => !open && setShowClearConfirm(false)}>
          <DialogContent className="sm:max-w-[440px] bg-white p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-rose-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <span>Clear All Consultancy Projects</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-600 pt-1">
                This will delete all consultancy project records within your authorized scope. This action is logged and cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4 flex items-center justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowClearConfirm(false)} disabled={clearLoading} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleClearAll}
                disabled={clearLoading}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
              >
                {clearLoading ? 'Clearing...' : 'Yes, Clear All'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ======================================================== */}
      {/* BULK CSV / EXCEL UPLOAD DIALOG (5-STEP METADATA-FREE WORKFLOW) */}
      {/* ======================================================== */}
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

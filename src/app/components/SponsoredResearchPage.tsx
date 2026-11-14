import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent } from './ui/card';
import {
  TrendingUp, FileText, Award, Users, Calendar,
  Building, CheckCircle, Clock, Plus, Search, Trash2, Edit,
  Eye, Download, AlertCircle, Upload, X, ExternalLink,
  Layers, ChevronRight, Check, RefreshCw, DollarSign, ShieldCheck,
  FileCheck, Receipt, AlertTriangle, Paperclip, UploadCloud, FileSpreadsheet,
  HelpCircle, UserCheck
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { useAuth } from '../contexts/AuthContext';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';
import { normalizeDepartmentName } from './FacultyDetailsPage';
import { AppShell, PageHeader, StatCard } from './design-system';
import { calculateProjectDuration } from '../utils/projectDurationHelper';

export interface SponsoredDocumentItem {
  id: string;
  projectId: string;
  documentCategory: 'agreement_letter' | 'payment_receipt';
  sourceType: 'drive_upload' | 'drive_link' | 'local_upload';
  driveFileId?: string | null;
  driveFolderId?: string | null;
  driveUrl: string;
  fileName: string;
  mimeType?: string | null;
  fileSize?: number | null;
  accessStatus?: string;
  accessRemarks?: string | null;
  createdAt?: string;
}

export interface SponsoredInstallmentItem {
  id: string;
  projectId: string;
  installmentNumber?: number | null;
  paymentDate?: string | null;
  amount: number;
  paymentReference?: string | null;
  notes?: string | null;
  createdAt?: string;
}

export interface SponsoredFacultyAssociation {
  id?: string;
  facultyId?: string | null;
  employeeId: string;
  normalizedEmployeeId?: string;
  role: 'PI' | 'Co-PI';
  facultyName?: string | null;
  designation?: string | null;
  department?: string | null;
  originalDepartment?: string | null;
  originalDepartmentSource?: string;
  school?: string | null;
  campus?: string | null;
  isValid: boolean;
  displayOrder?: number;
}

export interface SponsoredProjectItem {
  id: string;
  title: string;
  principalInvestigator?: string;
  principalInvestigatorEmpId?: string | null;
  principalInvestigatorDepartment?: string | null;
  coInvestigators?: string | null;
  fundingAgency: string;
  scheme?: string | null;
  schemeProgram?: string | null;
  agencyType: string;
  sanctionOrderNo?: string | null;
  sanctionDate?: string | null;
  sanctionYear?: number | null;
  academicYear?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  duration?: string | null;
  durationFormatted?: string;
  sanctionedAmount: number | string;
  amountReceived?: number | string | null;
  effectiveAmountReceived?: number;
  balanceYetToBeReceived?: number;
  status: string; // 'Ongoing' | 'Completed' | 'Sanctioned' | 'Proposal Submitted' | 'Terminated'
  progressPercentage?: number | null;
  department?: string;
  school?: string | null;
  campus?: string | null;
  projectUrl?: string | null;
  description?: string | null;
  approvalStatus?: string;
  empIdsRaw?: string;
  hasInvalidEmpIds?: boolean;
  invalidEmpIds?: string[];
  duplicateEmpIds?: string[];
  unresolvedPI?: boolean;
  facultyAssociations?: SponsoredFacultyAssociation[];
  piAssociation?: SponsoredFacultyAssociation | null;
  coPiAssociations?: SponsoredFacultyAssociation[];
  agreementLetters?: SponsoredDocumentItem[];
  paymentReceipts?: SponsoredDocumentItem[];
  agreementLetterCount?: number;
  paymentReceiptCount?: number;
  documents?: SponsoredDocumentItem[];
  installments?: SponsoredInstallmentItem[];
  creator?: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
  createdAt?: string;
}

export interface FacultyDirectoryItem {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  email?: string;
  school?: string;
  campus?: string;
}

interface SponsoredResearchPageProps {
  onNavigate: (page: string) => void;
  hideSidebar?: boolean;
  token?: string;
  userRole?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PROJECT_STATUS_OPTIONS = [
  { value: 'Ongoing', label: 'Ongoing Research' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Sanctioned', label: 'Sanctioned / Awaiting Funds' },
  { value: 'Proposal Submitted', label: 'Proposal Submitted / Under Review' },
  { value: 'Terminated', label: 'Terminated / Closed' }
];

const AGENCY_TYPE_OPTIONS = [
  'Government (National)',
  'Government (State)',
  'International Agency',
  'Industry / Corporate',
  'University Seed Money / Internal',
  'Non-Governmental Organization (NGO)'
];

export function SponsoredResearchPage({
  onNavigate,
  hideSidebar = false,
  token: propToken,
  userRole: propRole
}: SponsoredResearchPageProps) {
  const { user: authUser } = useAuth();
  const token = propToken || authUser?.token;
  const currentRole = propRole || authUser?.role || 'faculty';
  const isPrivileged = ['admin', 'coordinator', 'hod', 'faculty', 'iqac_admin'].includes(currentRole);

  const [projects, setProjects] = useState<SponsoredProjectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedAgencyType, setSelectedAgencyType] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [availableYears, setAvailableYears] = useState<number[]>(() => {
    const cur = new Date().getFullYear();
    const yrs: number[] = [];
    for (let y = cur + 1; y >= cur - 15; y--) yrs.push(y);
    return yrs;
  });

  // Add / Edit Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<SponsoredProjectItem | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    fundingAgency: '',
    scheme: '',
    agencyType: 'Government (National)',
    sanctionOrderNo: '',
    sanctionDate: '',
    sanctionYear: '',
    startDate: '',
    endDate: '',
    duration: '',
    sanctionedAmount: '',
    amountReceived: '',
    status: 'Ongoing',
    projectUrl: '',
    description: '',
    department: ''
  });

  // Multi-investigator selectors (PI is single, Co-PI is multiple)
  const [piFaculty, setPiFaculty] = useState<FacultyDirectoryItem | null>(null);
  const [coPiFacultyList, setCoPiFacultyList] = useState<FacultyDirectoryItem[]>([]);
  const [piQuery, setPiQuery] = useState('');
  const [piOptions, setPiOptions] = useState<FacultyDirectoryItem[]>([]);
  const [piLoading, setPiLoading] = useState(false);

  const [coPiQuery, setCoPiQuery] = useState('');
  const [coPiOptions, setCoPiOptions] = useState<FacultyDirectoryItem[]>([]);
  const [coPiLoading, setCoPiLoading] = useState(false);

  // View Details Drawer / Modal
  const [viewingProject, setViewingProject] = useState<SponsoredProjectItem | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'financial' | 'documents'>('overview');

  // 5-Step Bulk Upload Modal
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkStep, setBulkStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any>(null);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const [bulkError, setBulkError] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

  // Clear All Modal
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  // Hierarchy departments
  const { departmentList } = useAcademicHierarchy();
  const departments = useMemo(() => {
    const set = new Set<string>();
    departmentList.forEach(d => { if (d) set.add(normalizeDepartmentName(d)); });
    projects.forEach(p => { if (p.department) set.add(p.department); });
    return Array.from(set).sort();
  }, [departmentList, projects]);

  // Fetch Projects from Backend
  const fetchProjects = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('all', 'true');
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (selectedAgencyType !== 'all') params.append('agencyType', selectedAgencyType);
      if (selectedYear !== 'all') params.append('sanctionYear', selectedYear);
      if (selectedDept !== 'all') params.append('department', selectedDept);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`${API_BASE}/api/sponsored-projects?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success || data.rows) {
        const list: SponsoredProjectItem[] = data.rows || data.data || [];
        setProjects(list);

        setAvailableYears(prev => {
          const yearsSet = new Set<number>(prev);
          const currentYear = new Date().getFullYear();
          for (let y = currentYear + 1; y >= currentYear - 15; y--) {
            yearsSet.add(y);
          }
          list.forEach(p => {
            if (p.sanctionYear) yearsSet.add(Number(p.sanctionYear));
          });
          return Array.from(yearsSet).sort((a, b) => b - a);
        });
      }
    } catch (err) {
      console.error('Fetch sponsored projects error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedStatus, selectedAgencyType, selectedYear, selectedDept, searchQuery]);

  // Fetch KPI Stats
  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (selectedYear !== 'all') params.append('sanctionYear', selectedYear);
      if (selectedDept !== 'all') params.append('department', selectedDept);

      const res = await fetch(`${API_BASE}/api/sponsored-projects/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Fetch sponsored project stats error:', err);
    }
  }, [token, selectedYear, selectedDept]);

  useEffect(() => {
    fetchProjects();
    fetchStats();
  }, [fetchProjects, fetchStats]);

  // PI Faculty Autocomplete Search
  useEffect(() => {
    if (!isFormOpen || !piQuery.trim() || !token) {
      setPiOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setPiLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/sponsored-projects/faculty-search?q=${encodeURIComponent(piQuery.trim())}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setPiOptions(data.data || []);
        }
      } catch {
        // silent
      } finally {
        setPiLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [isFormOpen, piQuery, token]);

  // Co-PI Faculty Autocomplete Search
  useEffect(() => {
    if (!isFormOpen || !coPiQuery.trim() || !token) {
      setCoPiOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setCoPiLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/sponsored-projects/faculty-search?q=${encodeURIComponent(coPiQuery.trim())}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setCoPiOptions(data.data || []);
        }
      } catch {
        // silent
      } finally {
        setCoPiLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [isFormOpen, coPiQuery, token]);

  // Handle Sanction Date change with strictly derived Sanction Year
  const handleSanctionDateChange = (val: string) => {
    let derivedYear = '';
    if (val) {
      const match = val.match(/^(\d{4})/);
      if (match) derivedYear = match[1];
    }
    setFormData(prev => ({
      ...prev,
      sanctionDate: val,
      sanctionYear: derivedYear
    }));
  };

  // Handle Start & End Date changes with calculated Duration
  const handleStartDateChange = (val: string) => {
    let dur = '';
    if (val && formData.endDate) {
      dur = calculateProjectDuration(val, formData.endDate).formatted;
    } else if (val) {
      dur = 'Ongoing (Start date recorded)';
    }
    setFormData(prev => ({
      ...prev,
      startDate: val,
      duration: dur
    }));
  };

  const handleEndDateChange = (val: string) => {
    let dur = '';
    if (formData.startDate && val) {
      dur = calculateProjectDuration(formData.startDate, val).formatted;
    } else if (formData.startDate) {
      dur = 'Ongoing (Start date recorded)';
    }
    setFormData(prev => ({
      ...prev,
      endDate: val,
      duration: dur
    }));
  };

  // Add / Remove Co-PI
  const handleAddCoPi = (fac: FacultyDirectoryItem) => {
    if (piFaculty && piFaculty.employeeId === fac.employeeId) {
      alert('This faculty member is already assigned as the Principal Investigator (PI).');
      return;
    }
    const exists = coPiFacultyList.some(f => f.employeeId === fac.employeeId);
    if (!exists) {
      setCoPiFacultyList(prev => [...prev, fac]);
    }
    setCoPiQuery('');
    setCoPiOptions([]);
  };

  const handleRemoveCoPi = (empId: string) => {
    setCoPiFacultyList(prev => prev.filter(f => f.employeeId !== empId));
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingProject(null);
    setFormError('');
    setFormData({
      title: '',
      fundingAgency: '',
      scheme: '',
      agencyType: 'Government (National)',
      sanctionOrderNo: '',
      sanctionDate: '',
      sanctionYear: '',
      startDate: '',
      endDate: '',
      duration: '',
      sanctionedAmount: '',
      amountReceived: '',
      status: 'Ongoing',
      projectUrl: '',
      description: '',
      department: ''
    });
    setPiFaculty(null);
    setCoPiFacultyList([]);
    setPiQuery('');
    setCoPiQuery('');
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (project: SponsoredProjectItem) => {
    setEditingProject(project);
    setFormError('');
    setFormData({
      title: project.title,
      fundingAgency: project.fundingAgency,
      scheme: project.scheme || project.schemeProgram || '',
      agencyType: project.agencyType || 'Government (National)',
      sanctionOrderNo: project.sanctionOrderNo || '',
      sanctionDate: project.sanctionDate ? project.sanctionDate.split('T')[0] : '',
      sanctionYear: String(project.sanctionYear || ''),
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : '',
      duration: project.duration || project.durationFormatted || '',
      sanctionedAmount: String(project.sanctionedAmount || ''),
      amountReceived: project.amountReceived !== null && project.amountReceived !== undefined ? String(project.amountReceived) : '',
      status: project.status || 'Ongoing',
      projectUrl: project.projectUrl || '',
      description: project.description || '',
      department: project.department || ''
    });

    const piAssoc = project.piAssociation || (project.facultyAssociations || []).find(a => a.role === 'PI');
    if (piAssoc) {
      setPiFaculty({
        id: piAssoc.facultyId || piAssoc.employeeId,
        employeeId: piAssoc.employeeId,
        name: piAssoc.facultyName || `Faculty (${piAssoc.employeeId})`,
        designation: piAssoc.designation || '',
        department: piAssoc.department || '',
        school: piAssoc.school || undefined,
        campus: piAssoc.campus || undefined
      });
    } else if (project.principalInvestigatorEmpId || project.principalInvestigator) {
      setPiFaculty({
        id: project.principalInvestigatorEmpId || 'pi',
        employeeId: project.principalInvestigatorEmpId || 'N/A',
        name: project.principalInvestigator || 'Unassigned PI',
        designation: '',
        department: project.principalInvestigatorDepartment || project.department || ''
      });
    } else {
      setPiFaculty(null);
    }

    const coPiAssocs = project.coPiAssociations || (project.facultyAssociations || []).filter(a => a.role === 'Co-PI');
    setCoPiFacultyList(coPiAssocs.map(a => ({
      id: a.facultyId || a.employeeId,
      employeeId: a.employeeId,
      name: a.facultyName || `Faculty (${a.employeeId})`,
      designation: a.designation || '',
      department: a.department || '',
      school: a.school || undefined,
      campus: a.campus || undefined
    })));

    setPiQuery('');
    setCoPiQuery('');
    setIsFormOpen(true);
  };

  // Submit Project Add / Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Project title is required.');
      return;
    }
    if (!piFaculty) {
      setFormError('Principal Investigator (PI) is required.');
      return;
    }
    if (!formData.fundingAgency.trim()) {
      setFormError('Funding Agency is required.');
      return;
    }
    if (!formData.sanctionDate) {
      setFormError('Sanction Date is required to derive Sanction Year.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const payload = {
        title: formData.title.trim(),
        piEmpId: piFaculty.employeeId,
        principalInvestigator: piFaculty.name,
        principalInvestigatorEmpId: piFaculty.employeeId,
        principalInvestigatorDepartment: piFaculty.department,
        coPiEmpIds: coPiFacultyList.map(f => f.employeeId).join(', '),
        coInvestigators: coPiFacultyList.map(f => f.name).join(', '),
        fundingAgency: formData.fundingAgency.trim(),
        scheme: formData.scheme.trim() || null,
        agencyType: formData.agencyType,
        sanctionOrderNo: formData.sanctionOrderNo.trim() || null,
        sanctionDate: formData.sanctionDate,
        sanctionYear: formData.sanctionYear ? parseInt(formData.sanctionYear, 10) : undefined,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        sanctionedAmount: parseFloat(formData.sanctionedAmount) || 0,
        amountReceived: formData.amountReceived !== '' ? (parseFloat(formData.amountReceived) || 0) : null,
        status: formData.status,
        department: piFaculty.department || formData.department.trim() || null,
        projectUrl: formData.projectUrl.trim() || null,
        description: formData.description.trim() || null
      };

      const url = editingProject
        ? `${API_BASE}/api/sponsored-projects/${editingProject.id}`
        : `${API_BASE}/api/sponsored-projects`;
      const method = editingProject ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setIsFormOpen(false);
        fetchProjects();
        fetchStats();
      } else {
        setFormError(data.message || 'Failed to save grant record.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error saving project.');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Single Project
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sponsored research project?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/sponsored-projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        if (viewingProject?.id === id) setViewingProject(null);
        fetchProjects();
        fetchStats();
      } else {
        alert(data.message || 'Failed to delete record.');
      }
    } catch {
      alert('Error connecting to server.');
    }
  };

  // Clear All
  const handleClearAll = async () => {
    setClearLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sponsored-projects/clear-all?confirmAll=true&confirmation=CONFIRM_UNIVERSITY_CLEAR`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setIsClearOpen(false);
        fetchProjects();
        fetchStats();
      } else {
        alert(data.message || 'Failed to clear records.');
      }
    } catch {
      alert('Error clearing records.');
    } finally {
      setClearLoading(false);
    }
  };

  // Bulk Upload File Handlers (5-Step Stepper)
  const handleBulkFileSelect = async (file: File) => {
    setBulkFile(file);
    setBulkError('');
    setBulkStep(2);
    setBulkLoading(true);

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`${API_BASE}/api/sponsored-projects/bulk/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      const data = await res.json();

      if (data.success) {
        setBulkPreview(data);
        setBulkStep(3);
      } else {
        setBulkError(data.message || 'Failed to parse spreadsheet file.');
        setBulkStep(1);
      }
    } catch (err: any) {
      setBulkError(err.message || 'Failed to upload spreadsheet.');
      setBulkStep(1);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!bulkPreview || !bulkPreview.rows) return;
    setBulkLoading(true);
    setBulkError('');
    setBulkStep(4);

    try {
      const res = await fetch(`${API_BASE}/api/sponsored-projects/bulk/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ rows: bulkPreview.rows })
      });
      const data = await res.json();

      if (data.success) {
        setBulkResult(data.result);
        setBulkStep(5);
        fetchProjects();
        fetchStats();
      } else {
        setBulkError(data.message || 'Import failed.');
        setBulkStep(3);
      }
    } catch (err: any) {
      setBulkError(err.message || 'Error processing import.');
      setBulkStep(3);
    } finally {
      setBulkLoading(false);
    }
  };

  // Template Download
  const handleDownloadTemplate = (format: 'xlsx' | 'csv') => {
    window.open(`${API_BASE}/api/sponsored-projects/template?format=${format}`, '_blank');
  };

  // Export Data (Excel & CSV)
  const handleExport = (format: 'xlsx' | 'csv') => {
    if (projects.length === 0) {
      alert('No sponsored research records to export.');
      return;
    }

    const data = projects.map((p, idx) => ({
      'S.No': idx + 1,
      'Project Title': p.title,
      'Principal Investigator': p.piAssociation ? `${p.piAssociation.facultyName} (${p.piAssociation.employeeId})` : p.principalInvestigator,
      'Co-Investigators': (p.coPiAssociations || []).map(f => `${f.facultyName} (${f.employeeId})`).join('; ') || p.coInvestigators || '',
      'Funding Agency': p.fundingAgency,
      'Scheme / Program': p.scheme || p.schemeProgram || '',
      'Agency Type': p.agencyType,
      'Sanction Order No': p.sanctionOrderNo || '',
      'Sanction Date': p.sanctionDate || '',
      'Sanction Year': p.sanctionYear || '',
      'Start Date': p.startDate || '',
      'End Date': p.endDate || '',
      'Project Duration': p.duration || p.durationFormatted || '',
      'Sanctioned Amount (INR)': p.sanctionedAmount,
      'Amount Received (INR)': p.amountReceived || 0,
      'Status': p.status,
      'Host Department': p.department || '',
      'Project URL': p.projectUrl || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'External_Research');

    const filename = `External_Research_Export_${new Date().toISOString().slice(0, 10)}.${format}`;
    if (format === 'xlsx') {
      XLSX.writeFile(wb, filename);
    } else {
      XLSX.writeFile(wb, filename, { bookType: 'csv' });
    }
  };

  const formatINR = (val: number | string | null | undefined) => {
    const num = typeof val === 'string' ? parseFloat(val) : (val || 0);
    if (!num) return '₹0.00';
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakhs`;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const getStatusBadge = (status: string) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('ongoing') || s.includes('active')) {
      return <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">Ongoing</Badge>;
    }
    if (s.includes('completed')) {
      return <Badge className="bg-blue-50 text-[#2855B9] border-blue-200 text-[10px]">Completed</Badge>;
    }
    if (s.includes('sanction')) {
      return <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">Sanctioned</Badge>;
    }
    if (s.includes('proposal') || s.includes('submit')) {
      return <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Proposal Submitted</Badge>;
    }
    return <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">Terminated</Badge>;
  };

  const content = (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Research & Innovation' },
          { label: 'Sponsored Research & Grants' },
          { label: 'External Research' }
        ]}
        title="External Research & Grants"
        badge={`${projects.length} Grants`}
        description="Externally funded research grants, government & corporate sponsors, multi-faculty PI / Co-PI investigators, and financial reconciliation."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('xlsx')}
              className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 mr-1.5" />
              <span>Excel</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('csv')}
              className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
              <span>CSV</span>
            </Button>
            {isPrivileged && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBulkFile(null);
                    setBulkPreview(null);
                    setBulkResult(null);
                    setBulkError('');
                    setBulkStep(1);
                    setIsBulkOpen(true);
                  }}
                  className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  <span>Bulk Upload</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleOpenAdd}
                  className="bg-[#2855B9] hover:bg-[#1C355B] text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  <span>Add External Grant</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* KPI Cards (IPRs Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Grants"
          value={(stats?.totalProjects || projects.length).toLocaleString()}
          subtitle="All recorded external grants"
          icon={Award}
        />
        <StatCard
          title="Sanctioned Amount"
          value={formatINR(stats?.totalSanctionedAmount || 0)}
          subtitle="Total sanctioned funding"
          icon={DollarSign}
        />
        <StatCard
          title="Funds Received"
          value={formatINR(stats?.totalFundsReceived || 0)}
          subtitle="Disbursed grant funds"
          icon={Receipt}
        />
        <StatCard
          title="Ongoing Projects"
          value={(stats?.ongoingCount || 0).toLocaleString()}
          subtitle="Active grant research"
          icon={Clock}
        />
        <StatCard
          title="Completed Projects"
          value={(stats?.completedCount || 0).toLocaleString()}
          subtitle="Fully finalized grants"
          icon={CheckCircle}
        />
      </div>

      {/* Filter and Search Bar */}
      <Card className="border border-slate-200 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search title, PI name, EmpId, agency, scheme, sanction ref..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-slate-200"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Sanction Year Filter */}
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[130px] h-9 text-xs rounded-xl border-slate-200">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Years</SelectItem>
                  {availableYears.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Department Filter */}
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="w-[170px] h-9 text-xs rounded-xl border-slate-200 truncate">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[160px] h-9 text-xs rounded-xl border-slate-200">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Statuses</SelectItem>
                  {PROJECT_STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Agency Type Filter */}
              <Select value={selectedAgencyType} onValueChange={setSelectedAgencyType}>
                <SelectTrigger className="w-[170px] h-9 text-xs rounded-xl border-slate-200 truncate">
                  <SelectValue placeholder="All Agency Types" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Agency Types</SelectItem>
                  {AGENCY_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isPrivileged && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsClearOpen(true)}
                  className="h-9 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 rounded-xl"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span>Clear All</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#0B1B3D] text-white">
              <tr>
                <th className="p-3.5 font-semibold text-[11px] uppercase tracking-wider w-12 text-center">#</th>
                <th className="p-3.5 font-semibold text-[11px] uppercase tracking-wider min-w-[280px]">Project Title & Sponsor</th>
                <th className="p-3.5 font-semibold text-[11px] uppercase tracking-wider min-w-[220px]">Investigators (PI & Co-PI)</th>
                <th className="p-3.5 font-semibold text-[11px] uppercase tracking-wider min-w-[120px]">Sanction Year</th>
                <th className="p-3.5 font-semibold text-[11px] uppercase tracking-wider min-w-[140px]">Timeline / Duration</th>
                <th className="p-3.5 font-semibold text-[11px] uppercase tracking-wider min-w-[140px] text-right">Financials (Sanctioned)</th>
                <th className="p-3.5 font-semibold text-[11px] uppercase tracking-wider min-w-[100px] text-center">Status</th>
                <th className="p-3.5 font-semibold text-[11px] uppercase tracking-wider min-w-[100px] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#2855B9] mb-2" />
                    <span>Loading external research grants...</span>
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    <Award className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">No External Research Grants Found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try adjusting your filters or search query.</p>
                  </td>
                </tr>
              ) : (
                projects.map((project, idx) => (
                  <tr key={project.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 text-center font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 leading-snug">{project.title}</div>
                      <div className="text-[11px] text-[#2855B9] font-medium mt-0.5">
                        {project.fundingAgency} {project.scheme ? `• ${project.scheme}` : ''}
                      </div>
                      {project.sanctionOrderNo && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">Ref: {project.sanctionOrderNo}</div>
                      )}
                    </td>
                    <td className="p-3.5">
                      {/* Principal Investigator Badge */}
                      <div className="mb-1">
                        <Badge className="bg-[#EAF1FD] text-[#2855B9] border-[#C8DCFB] text-[10px] font-semibold">
                          PI: {project.piAssociation?.facultyName || project.principalInvestigator || 'Unassigned'}
                          {project.piAssociation?.employeeId ? ` (${project.piAssociation.employeeId})` : ''}
                        </Badge>
                      </div>
                      {/* Co-Investigators Badges */}
                      {(project.coPiAssociations || []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {project.coPiAssociations?.map(co => (
                            <Badge key={co.employeeId} variant="outline" className="text-[9px] border-slate-200 text-slate-600">
                              Co-PI: {co.facultyName || co.employeeId}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[11px] font-mono font-semibold">
                        {project.sanctionYear || 'N/A'}
                      </Badge>
                    </td>
                    <td className="p-3.5">
                      <div className="text-slate-800 font-medium">{project.startDate || 'No Start Date'}</div>
                      <div className="text-[11px] text-slate-500">
                        {project.endDate ? `End: ${project.endDate}` : 'Ongoing'}
                      </div>
                      {(project.duration || project.durationFormatted) && (
                        <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                          {project.duration || project.durationFormatted}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-mono">
                      <div className="font-bold text-slate-900">{formatINR(project.sanctionedAmount)}</div>
                      {project.amountReceived !== null && project.amountReceived !== undefined && (
                        <div className="text-[11px] text-emerald-700">Rec: {formatINR(project.amountReceived)}</div>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      {getStatusBadge(project.status)}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingProject(project)}
                          className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {isPrivileged && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(project)}
                              className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(project.id)}
                              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RECORD DETAIL DIALOG (IPRs Style)                             */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={!!viewingProject} onOpenChange={(open) => !open && setViewingProject(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-[#2855B9]">
              <Award className="w-5 h-5" />
              <DialogTitle className="text-base font-bold text-slate-900">
                External Research Project Details
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Grant sanction information, investigators, and financials.
            </DialogDescription>
          </DialogHeader>

          {viewingProject && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  {getStatusBadge(viewingProject.status)}
                  <Badge variant="outline" className="font-mono text-[10px]">
                    Sanction Year: {viewingProject.sanctionYear}
                  </Badge>
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{viewingProject.title}</h3>
                <p className="text-xs text-[#2855B9] font-medium mt-1">
                  {viewingProject.fundingAgency} {viewingProject.scheme ? `• ${viewingProject.scheme}` : ''}
                </p>
              </div>

              {/* Research Team Banner */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-3 bg-[#EAF1FD]/20">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#2855B9] block">Principal Investigator (PI)</span>
                  <div className="text-xs font-bold text-slate-900 mt-0.5">
                    {viewingProject.piAssociation?.facultyName || viewingProject.principalInvestigator}
                    {viewingProject.piAssociation?.employeeId ? ` (EmpID: ${viewingProject.piAssociation.employeeId})` : ''}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {viewingProject.piAssociation?.designation ? `${viewingProject.piAssociation.designation} • ` : ''}
                    {viewingProject.piAssociation?.department || viewingProject.department}
                  </div>
                </div>

                {(viewingProject.coPiAssociations || []).length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-600 block">Co-Investigators (Co-PI)</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {viewingProject.coPiAssociations?.map(co => (
                        <Badge key={co.employeeId} variant="outline" className="text-[10px] border-slate-300 bg-white">
                          {co.facultyName || co.employeeId} (EmpID: {co.employeeId})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase text-slate-400 block">Sanction Order No</span>
                  <span className="text-xs font-mono font-semibold text-slate-800">{viewingProject.sanctionOrderNo || 'N/A'}</span>
                </div>
                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase text-slate-400 block">Sanction Date</span>
                  <span className="text-xs font-medium text-slate-800">{viewingProject.sanctionDate || 'N/A'}</span>
                </div>
                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase text-slate-400 block">Project Duration</span>
                  <span className="text-xs font-semibold text-slate-700">{viewingProject.duration || viewingProject.durationFormatted || 'N/A'}</span>
                </div>
                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase text-slate-400 block">Sanctioned Amount</span>
                  <span className="text-sm font-bold text-slate-900">{formatINR(viewingProject.sanctionedAmount)}</span>
                </div>
                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase text-slate-400 block">Amount Received</span>
                  <span className="text-sm font-bold text-emerald-700">{formatINR(viewingProject.amountReceived)}</span>
                </div>
                <div className="p-3 bg-slate-50/60 rounded-lg border border-slate-100">
                  <span className="text-[10px] uppercase text-slate-400 block">Host Department</span>
                  <span className="text-xs font-medium text-slate-800">{viewingProject.department || 'General'}</span>
                </div>
              </div>

              {/* Documents */}
              {((viewingProject.agreementLetters?.length || 0) + (viewingProject.paymentReceipts?.length || 0)) > 0 && (
                <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">Attached Grant Documents</span>
                  <div className="divide-y divide-slate-100">
                    {(viewingProject.agreementLetters || []).map(doc => (
                      <div key={doc.id} className="py-2 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">Sanction Letter: {doc.fileName}</span>
                        <a href={doc.driveUrl} target="_blank" rel="noopener noreferrer" className="text-[#2855B9] font-medium flex items-center gap-1 hover:underline">
                          <span>View in Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                    {(viewingProject.paymentReceipts || []).map(doc => (
                      <div key={doc.id} className="py-2 flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">Fund Receipt / UC: {doc.fileName}</span>
                        <a href={doc.driveUrl} target="_blank" rel="noopener noreferrer" className="text-[#2855B9] font-medium flex items-center gap-1 hover:underline">
                          <span>View in Drive</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button variant="outline" size="sm" onClick={() => setViewingProject(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* SINGLE-ENTRY ADD / EDIT DIALOG                                */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingProject ? 'Edit External Research Grant' : 'Record New External Research Grant'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Enter sponsored research details, assign Principal Investigator & Co-Investigators.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-4 py-2 text-xs">
            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* A. Project Information */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Project Title *</Label>
                <Input
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Official title of the sponsored research project"
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Funding Agency *</Label>
                  <Input
                    value={formData.fundingAgency}
                    onChange={e => setFormData(prev => ({ ...prev, fundingAgency: e.target.value }))}
                    placeholder="e.g. DST, SERB, ISRO, DRDO"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Scheme / Program</Label>
                  <Input
                    value={formData.scheme}
                    onChange={e => setFormData(prev => ({ ...prev, scheme: e.target.value }))}
                    placeholder="e.g. Core Research Grant"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700">Agency Type</Label>
                  <Select
                    value={formData.agencyType}
                    onValueChange={val => setFormData(prev => ({ ...prev, agencyType: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {AGENCY_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* B. Investigators (PI & Co-PI) */}
            <div className="border border-slate-200 rounded-xl p-3.5 space-y-3 bg-slate-50/40">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#2855B9]" />
                <span>Investigators Hierarchy (PI & Co-PIs)</span>
              </Label>

              {/* Principal Investigator (Single Required) */}
              <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                <Label className="text-[11px] font-bold text-[#2855B9]">Principal Investigator (PI) *</Label>
                {piFaculty ? (
                  <div className="flex items-center justify-between p-2 bg-[#EAF1FD] border border-[#C8DCFB] rounded-lg">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{piFaculty.name} (EmpID: {piFaculty.employeeId})</div>
                      <div className="text-[10px] text-slate-500">{piFaculty.designation} • {piFaculty.department}</div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPiFaculty(null)}
                      className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search PI by EmpID or Name..."
                      value={piQuery}
                      onChange={e => setPiQuery(e.target.value)}
                      className="pl-8 h-8 text-xs bg-white"
                    />
                    {piLoading && (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    )}

                    {piOptions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-40 overflow-y-auto divide-y divide-slate-100">
                        {piOptions.map(opt => (
                          <div
                            key={opt.employeeId}
                            onClick={() => {
                              setPiFaculty(opt);
                              setPiQuery('');
                              setPiOptions([]);
                            }}
                            className="p-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <div className="font-semibold text-slate-800 text-xs">{opt.name}</div>
                              <div className="text-[10px] text-slate-500">{opt.designation} • {opt.department}</div>
                            </div>
                            <Badge variant="outline" className="font-mono text-[10px]">EmpID: {opt.employeeId}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Co-Investigators (Multiple Optional) */}
              <div className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                <Label className="text-[11px] font-bold text-slate-700">Co-Investigators (Co-PI)</Label>
                <div className="flex flex-wrap gap-1.5 min-h-[28px] mb-1">
                  {coPiFacultyList.length === 0 ? (
                    <span className="text-slate-400 text-[11px] italic">No Co-Investigators added.</span>
                  ) : (
                    coPiFacultyList.map(co => (
                      <Badge
                        key={co.employeeId}
                        variant="outline"
                        className="border-slate-300 text-slate-700 text-[11px] flex items-center gap-1.5 pr-1"
                      >
                        <span>{co.name} ({co.employeeId})</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCoPi(co.employeeId)}
                          className="hover:bg-slate-200 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3 text-slate-500" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Search Co-PI by EmpID or Name to add..."
                    value={coPiQuery}
                    onChange={e => setCoPiQuery(e.target.value)}
                    className="pl-8 h-8 text-xs bg-white"
                  />
                  {coPiLoading && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  )}

                  {coPiOptions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-40 overflow-y-auto divide-y divide-slate-100">
                      {coPiOptions.map(opt => (
                        <div
                          key={opt.employeeId}
                          onClick={() => handleAddCoPi(opt)}
                          className="p-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-slate-800 text-xs">{opt.name}</div>
                            <div className="text-[10px] text-slate-500">{opt.designation} • {opt.department}</div>
                          </div>
                          <Badge variant="outline" className="font-mono text-[10px]">EmpID: {opt.employeeId}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* C. Sanction Information & Timeline */}
            <div className="border border-slate-200 rounded-xl p-3.5 space-y-3 bg-slate-50/40">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#2855B9]" />
                <span>Sanction & Timeline Information</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Sanction Order Number</Label>
                  <Input
                    value={formData.sanctionOrderNo}
                    onChange={e => setFormData(prev => ({ ...prev, sanctionOrderNo: e.target.value }))}
                    placeholder="Order / Reference No"
                    className="h-8 text-xs bg-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Sanction Date *</Label>
                  <Input
                    type="date"
                    value={formData.sanctionDate}
                    onChange={e => handleSanctionDateChange(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Sanction Year (Derived)</Label>
                  <Input
                    value={formData.sanctionYear}
                    readOnly
                    placeholder="Auto-derived from date"
                    className="h-8 text-xs bg-slate-100 text-slate-700 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Commencement / Start Date</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={e => handleStartDateChange(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Completion / End Date</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={e => handleEndDateChange(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Project Duration (Calculated)</Label>
                  <Input
                    value={formData.duration}
                    readOnly
                    placeholder="Auto-calculated"
                    className="h-8 text-xs bg-slate-100 text-slate-700"
                  />
                </div>
              </div>
            </div>

            {/* D. Financial Information & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Sanctioned Amount (INR) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.sanctionedAmount}
                  onChange={e => setFormData(prev => ({ ...prev, sanctionedAmount: e.target.value }))}
                  placeholder="e.g. 4500000"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Amount Received (INR)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.amountReceived}
                  onChange={e => setFormData(prev => ({ ...prev, amountReceived: e.target.value }))}
                  placeholder="e.g. 1500000"
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={val => setFormData(prev => ({ ...prev, status: val }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {PROJECT_STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* E. Project URL & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Project URL</Label>
                <Input
                  value={formData.projectUrl}
                  onChange={e => setFormData(prev => ({ ...prev, projectUrl: e.target.value }))}
                  placeholder="https://..."
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Description / Abstract</Label>
                <Input
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief objectives & deliverables"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={formLoading} className="bg-[#2855B9] text-white hover:bg-[#1C355B]">
                {formLoading ? 'Saving...' : editingProject ? 'Update Grant' : 'Record Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5-STEP BULK UPLOAD MODAL (Exact 18-Column Template)           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-[#2855B9]">
              <FileSpreadsheet className="w-5 h-5" />
              <DialogTitle className="text-base font-bold text-slate-900">
                External Research Bulk Excel Upload
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Upload Excel (.xlsx, .xls) or CSV (.csv) using the official 18-column template. Multi-investigator EmpIDs must be comma-separated (Position 1 = PI, subsequent = Co-PI).
            </DialogDescription>
          </DialogHeader>

          {/* Stepper Header (5 Equal Steps) */}
          <div className="py-2 border-b border-slate-100">
            <div className="grid grid-cols-5 text-center text-xs">
              {[
                { num: 1, label: 'Upload' },
                { num: 2, label: 'Validation' },
                { num: 3, label: 'Preview' },
                { num: 4, label: 'Confirmation' },
                { num: 5, label: 'Summary' }
              ].map(st => (
                <div key={st.num} className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      bulkStep === st.num
                        ? 'bg-[#2855B9] text-white ring-2 ring-blue-200'
                        : bulkStep > st.num
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {bulkStep > st.num ? <Check className="w-3.5 h-3.5" /> : st.num}
                  </div>
                  <span className={`text-[11px] mt-1 ${bulkStep === st.num ? 'font-bold text-[#2855B9]' : 'text-slate-500'}`}>
                    {st.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 py-2 text-xs">
            {/* Step 1: Upload */}
            {bulkStep === 1 && (
              <div className="space-y-4">
                <div className="p-3.5 bg-[#EAF1FD]/50 border border-[#C8DCFB] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-800">Official 18-Column External Research Template</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Columns: <code>Project Title, Investigators EmpId, Funding Agency, Scheme / Program, Agency Type, Sanction Order No, Sanction Date, Sanction Year, Start Date, End Date, Project Duration, Sanctioned Amount (INR), Amount Received (INR), Status, Sanction Letter, Fund Receipt / UC, Project URL, Description</code>
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleDownloadTemplate('xlsx')} className="bg-white border-[#C8DCFB] text-[#2855B9] text-xs">
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Excel (.xlsx)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDownloadTemplate('csv')} className="bg-white border-[#C8DCFB] text-slate-600 text-xs">
                      <Download className="w-3.5 h-3.5 mr-1" />
                      CSV (.csv)
                    </Button>
                  </div>
                </div>

                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleBulkFileSelect(e.target.files[0]); }}
                />

                <div
                  onClick={() => bulkFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-[#2855B9] rounded-xl p-8 text-center cursor-pointer bg-slate-50/40 transition-colors"
                >
                  <UploadCloud className="w-10 h-10 mx-auto text-[#2855B9] mb-2" />
                  <p className="font-semibold text-slate-800">
                    {bulkFile ? `${bulkFile.name} (${Math.round(bulkFile.size / 1024)} KB)` : 'Click to select External Research Excel / CSV file'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Supports .xlsx, .xls, and .csv formats</p>
                </div>
              </div>
            )}

            {/* Step 2: Validating */}
            {bulkStep === 2 && bulkLoading && (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2855B9]" />
                <p className="font-semibold text-slate-700">Validating External Research Spreadsheet...</p>
                <p className="text-[11px] text-slate-400">Resolving PI & Co-PI EmpIDs, deriving Sanction Years, and calculating durations.</p>
              </div>
            )}

            {/* Step 3: Preview */}
            {bulkStep === 3 && bulkPreview && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-500 block">Total Rows</span>
                    <span className="text-base font-bold text-slate-900">{bulkPreview.totalRows}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] uppercase text-emerald-700 block">Valid Rows</span>
                    <span className="text-base font-bold text-emerald-800">{bulkPreview.validRows}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                    <span className="text-[10px] uppercase text-amber-800 block">Invalid EmpID (Skip)</span>
                    <span className="text-base font-bold text-amber-900">{bulkPreview.skippedInvalidEmpIdCount || 0}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-[10px] uppercase text-slate-700 block">Missing EmpID (Skip)</span>
                    <span className="text-base font-bold text-slate-900">{bulkPreview.skippedMissingEmpIdCount || 0}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                    <span className="text-[10px] uppercase text-indigo-700 block">Duplicates</span>
                    <span className="text-base font-bold text-indigo-900">{bulkPreview.duplicates}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                    <span className="text-[10px] uppercase text-rose-700 block">Fatal Errors</span>
                    <span className="text-base font-bold text-rose-900">{bulkPreview.errors}</span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="p-2">Row</th>
                        <th className="p-2">Title</th>
                        <th className="p-2">PI & Co-PIs</th>
                        <th className="p-2">Funding Agency</th>
                        <th className="p-2">Sanction Date / Yr</th>
                        <th className="p-2 text-right">Amount (INR)</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Validation Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(bulkPreview.rows || []).map((r: any) => (
                        <tr key={r.rowNumber} className={r.rowStatus === 'ERROR' ? 'bg-rose-50/40' : undefined}>
                          <td className="p-2 font-mono">{r.rowNumber}</td>
                          <td className="p-2 font-medium max-w-[200px] truncate">{r.title}</td>
                          <td className="p-2">
                            <span className="font-semibold text-slate-800">
                              {r.piFaculty ? `PI: ${r.piFaculty.facultyName} (${r.piFaculty.employeeId})` : 'Unresolved PI'}
                            </span>
                            {r.invalidEmpIds?.length > 0 && (
                              <span className="text-[10px] text-amber-700 block">Unverified: {r.invalidEmpIds.join(', ')}</span>
                            )}
                          </td>
                          <td className="p-2">{r.fundingAgency}</td>
                          <td className="p-2 font-mono">{r.sanctionDate} ({r.sanctionYear})</td>
                          <td className="p-2 text-right font-mono font-semibold">{formatINR(r.sanctionedAmount)}</td>
                          <td className="p-2">{getStatusBadge(r.status)}</td>
                          <td className="p-2">
                            {r.rowStatus === 'VALID' && (
                              <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Valid</Badge>
                            )}
                            {r.rowStatus === 'SKIPPED_INVALID_EMPID' && (
                              <div>
                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">Skipped (Invalid EmpID)</Badge>
                                <p className="text-[10px] text-amber-800 mt-0.5">{r.skipReason || (r.errors || []).join('; ')}</p>
                              </div>
                            )}
                            {r.rowStatus === 'SKIPPED_MISSING_EMPID' && (
                              <div>
                                <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px]">Skipped (Missing EmpID)</Badge>
                                <p className="text-[10px] text-slate-700 mt-0.5">{r.skipReason || 'Required EmpID is missing.'}</p>
                              </div>
                            )}
                            {r.rowStatus === 'WARNING' && (
                              <Badge className="bg-amber-100 text-amber-800 text-[10px]">Warning</Badge>
                            )}
                            {r.rowStatus === 'DUPLICATE' && (
                              <Badge className="bg-indigo-100 text-indigo-800 text-[10px]">Duplicate</Badge>
                            )}
                            {r.rowStatus === 'ERROR' && (
                              <Badge className="bg-rose-100 text-rose-800 text-[10px]">Error</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Step 4: Confirmation */}
            {bulkStep === 4 && bulkLoading && (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2855B9]" />
                <p className="font-semibold text-slate-700">Importing External Research Grants...</p>
                <p className="text-[11px] text-slate-400">Saving records, PI/Co-PI associations, and drive links in transaction.</p>
              </div>
            )}

            {/* Step 5: Summary */}
            {bulkStep === 5 && bulkResult && (
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-3">
                <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-900">Bulk Import Complete!</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 max-w-lg mx-auto text-xs">
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="block text-[10px] text-emerald-700 uppercase">Imported</span>
                    <span className="text-base font-bold text-emerald-900">{bulkResult.successfulImports}</span>
                  </div>
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="block text-[10px] text-amber-700 uppercase">Invalid EmpID (Skip)</span>
                    <span className="text-base font-bold text-amber-900">{bulkResult.skippedInvalidEmpIdCount || 0}</span>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="block text-[10px] text-slate-700 uppercase">Missing EmpID (Skip)</span>
                    <span className="text-base font-bold text-slate-900">{bulkResult.skippedMissingEmpIdCount || 0}</span>
                  </div>
                  <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <span className="block text-[10px] text-indigo-700 uppercase">Duplicates Skipped</span>
                    <span className="text-base font-bold text-indigo-900">{bulkResult.duplicatesSkipped || 0}</span>
                  </div>
                  <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="block text-[10px] text-rose-700 uppercase">Errors Skipped</span>
                    <span className="text-base font-bold text-rose-900">{bulkResult.errorsSkipped || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {bulkError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bulkError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3">
            {bulkStep === 3 && (
              <div className="flex justify-between w-full">
                <Button variant="outline" size="sm" onClick={() => setBulkStep(1)}>
                  Upload Different File
                </Button>
                <Button
                  size="sm"
                  onClick={handleExecuteImport}
                  className="bg-[#2855B9] hover:bg-[#1C355B] text-white"
                >
                  Confirm & Import ({bulkPreview?.validRows || 0} Eligible Rows)
                </Button>
              </div>
            )}
            {bulkStep === 5 && (
              <Button size="sm" onClick={() => setIsBulkOpen(false)} className="bg-[#2855B9] text-white">
                Done
              </Button>
            )}
            {(bulkStep === 1 || bulkStep === 2) && (
              <Button variant="outline" size="sm" onClick={() => setIsBulkOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Confirmation Modal */}
      <Dialog open={isClearOpen} onOpenChange={setIsClearOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span>Clear Sponsored Research Projects?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to delete all sponsored project records and attached documents in your scope? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsClearOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleClearAll}
              disabled={clearLoading}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {clearLoading ? 'Clearing...' : 'Yes, Delete All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (hideSidebar) {
    return content;
  }

  return (
    <AppShell currentPage="sponsored-research" onNavigate={onNavigate}>
      {content}
    </AppShell>
  );
}

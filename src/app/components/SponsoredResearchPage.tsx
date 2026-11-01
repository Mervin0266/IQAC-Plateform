import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  TrendingUp, FileText, Award, Users, Calendar,
  Building, CheckCircle, Clock, Plus, Search, Trash2, Edit,
  Eye, Download, AlertCircle, Upload, X, ExternalLink,
  Layers, ChevronRight, Check, RefreshCw, DollarSign, ShieldCheck, PieChart, Landmark,
  FileCheck, Receipt, AlertTriangle, Paperclip, ArrowRight
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
import { BulkUploadDialog } from './BulkUploadDialog';
import { AppShell, PageHeader, StatCard } from './design-system';
import { calculateProjectDuration, deriveSanctionYear } from '../utils/projectDurationHelper';

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

export interface SponsoredProjectItem {
  id: string;
  title: string;
  principalInvestigator: string;
  coInvestigators?: string | null;
  fundingAgency: string;
  scheme?: string | null;
  agencyType: string;
  sanctionOrderNo?: string | null;
  sanctionDate?: string | null;
  sanctionYear?: number | null;
  academicYear: string;
  startDate?: string | null;
  endDate?: string | null;
  sanctionedAmount: number | string;
  amountReceived?: number | string | null;
  status: string; // 'Ongoing' | 'Completed' | 'Sanctioned' | 'Proposal Submitted' | 'Terminated'
  progressPercentage?: number | null;
  department?: string;
  projectUrl?: string | null;
  description?: string | null;
  approvalStatus?: string;
  createdAt?: string;
  // Computed & attached fields
  durationFormatted?: string;
  effectiveAmountReceived?: number;
  installmentTotal?: number;
  balanceYetToBeReceived?: number;
  reconciliationStatus?: string;
  reconciliationDiff?: number;
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
}

interface SponsoredResearchPageProps {
  onNavigate: (page: string) => void;
  hideSidebar?: boolean;
  token?: string;
  userRole?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Exact five original statuses preserved
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

const EMPTY_FORM = {
  title: '',
  principalInvestigator: '',
  coInvestigators: '',
  fundingAgency: '',
  scheme: '',
  agencyType: 'Government (National)',
  sanctionOrderNo: '',
  sanctionDate: '',
  sanctionYear: '',
  startDate: '',
  endDate: '',
  sanctionedAmount: 0,
  amountReceived: '' as string | number,
  status: 'Ongoing',
  progressPercentage: 0,
  department: '',
  projectUrl: '',
  description: '',
  approvalStatus: 'approved'
};

export function SponsoredResearchPage({
  onNavigate,
  hideSidebar = false,
  token: propToken,
  userRole: propRole
}: SponsoredResearchPageProps) {
  const { user: authUser, logout } = useAuth();
  const token = propToken || authUser?.token;
  const currentRole = propRole || authUser?.role || 'faculty';
  const isPrivileged = ['admin', 'coordinator', 'hod'].includes(currentRole);

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

  // Add / Edit Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<SponsoredProjectItem | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Document attachments state for modal
  const [agreementFiles, setAgreementFiles] = useState<File[]>([]);
  const [agreementLinks, setAgreementLinks] = useState('');
  const [paymentFiles, setPaymentFiles] = useState<File[]>([]);
  const [paymentLinks, setPaymentLinks] = useState('');

  // Installment entry inside Add/Edit modal
  const [tempInstallments, setTempInstallments] = useState<Array<{
    id?: string;
    installmentNumber?: number;
    paymentDate: string;
    amount: number;
    paymentReference: string;
    notes: string;
  }>>([]);
  const [newInstDate, setNewInstDate] = useState('');
  const [newInstAmount, setNewInstAmount] = useState('');
  const [newInstRef, setNewInstRef] = useState('');

  // View Details Drawer / Modal
  const [viewingProject, setViewingProject] = useState<SponsoredProjectItem | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'financial' | 'documents'>('overview');

  // Bulk Upload Modal
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isClearOpen, setIsClearOpen] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  // Hierarchy departments
  const { departmentList } = useAcademicHierarchy();
  const departments = useMemo(() => {
    const set = new Set<string>();
    departmentList.forEach(d => {
      if (d) set.add(normalizeDepartmentName(d));
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
  }, [departmentList]);

  // Sanction Years for filter dropdown (2020 to 2028)
  const sanctionYears = useMemo(() => {
    const current = new Date().getFullYear();
    const list: number[] = [];
    for (let y = current + 2; y >= current - 6; y--) {
      list.push(y);
    }
    return list;
  }, []);

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
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 401) {
        logout();
        return;
      }

      const data = await res.json();
      if (data.success) {
        setProjects(data.data || []);
      }
    } catch (err) {
      console.error('Fetch sponsored projects error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedStatus, selectedAgencyType, selectedYear, selectedDept, searchQuery, logout]);

  // Fetch Aggregate Stats
  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams();
      if (selectedYear !== 'all') params.append('sanctionYear', selectedYear);
      if (selectedDept !== 'all') params.append('department', selectedDept);

      const res = await fetch(`${API_BASE}/api/sponsored-projects/stats?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Fetch sponsored stats error:', err);
    }
  }, [token, selectedYear, selectedDept]);

  useEffect(() => {
    fetchProjects();
    fetchStats();
  }, [fetchProjects, fetchStats]);

  // Currency Formatter
  const formatCurrency = (val: number | string | undefined | null) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase().trim();
    if (s.includes('ongoing')) {
      return <Badge className="bg-[#EAF1FD] text-[#2855B9] border-[#C8DCFB] text-[10px] font-semibold">Ongoing Research</Badge>;
    }
    if (s.includes('complete')) {
      return <Badge className="bg-[#E8F5ED] text-[#167447] border-[#C6E7D2] text-[10px] font-semibold">Completed</Badge>;
    }
    if (s.includes('sanction')) {
      return <Badge className="bg-[#FFF4D8] text-[#9A6700] border-[#FFE5A3] text-[10px] font-semibold">Sanctioned / Awaiting Funds</Badge>;
    }
    if (s.includes('proposal') || s.includes('submit')) {
      return <Badge className="bg-[#FFF4D8] text-[#9A6700] border-[#FFE5A3] text-[10px] font-semibold">Proposal Submitted / Under Review</Badge>;
    }
    if (s.includes('terminate')) {
      return <Badge className="bg-[#FEF2F2] text-[#B42318] border-[#FECDCA] text-[10px] font-semibold">Terminated / Closed</Badge>;
    }
    return <Badge variant="outline" className="text-[10px] bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]">{status || 'Ongoing'}</Badge>;
  };

  const getAgencyBadge = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('government') || t.includes('national')) {
      return <Badge variant="secondary" className="bg-[#EAF1FD] text-[#2855B9] border-[#C8DCFB] text-[10px]">National Govt</Badge>;
    }
    if (t.includes('state')) {
      return <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-[#E2E8F0] text-[10px]">State Govt</Badge>;
    }
    if (t.includes('international')) {
      return <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-[#E2E8F0] text-[10px]">International</Badge>;
    }
    if (t.includes('industry')) {
      return <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-[#E2E8F0] text-[10px]">Industry</Badge>;
    }
    return <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-[#E2E8F0]">Internal/Other</Badge>;
  };

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingProject(null);
    setFormData({
      ...EMPTY_FORM,
      department: authUser?.department || (departments[0] || '')
    });
    setAgreementFiles([]);
    setAgreementLinks('');
    setPaymentFiles([]);
    setPaymentLinks('');
    setTempInstallments([]);
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (proj: SponsoredProjectItem) => {
    setEditingProject(proj);
    setFormData({
      title: proj.title || '',
      principalInvestigator: proj.principalInvestigator || '',
      coInvestigators: proj.coInvestigators || '',
      fundingAgency: proj.fundingAgency || '',
      scheme: proj.scheme || '',
      agencyType: proj.agencyType || 'Government (National)',
      sanctionOrderNo: proj.sanctionOrderNo || '',
      sanctionDate: proj.sanctionDate ? proj.sanctionDate.split('T')[0] : '',
      sanctionYear: proj.sanctionYear ? String(proj.sanctionYear) : '',
      startDate: proj.startDate ? proj.startDate.split('T')[0] : '',
      endDate: proj.endDate ? proj.endDate.split('T')[0] : '',
      sanctionedAmount: Number(proj.sanctionedAmount) || 0,
      amountReceived: proj.amountReceived !== null && proj.amountReceived !== undefined ? proj.amountReceived : '',
      status: proj.status || 'Ongoing',
      progressPercentage: proj.progressPercentage || 0,
      department: proj.department || '',
      projectUrl: proj.projectUrl || '',
      description: proj.description || '',
      approvalStatus: proj.approvalStatus || 'approved'
    });
    setAgreementFiles([]);
    setAgreementLinks('');
    setPaymentFiles([]);
    setPaymentLinks('');
    setTempInstallments((proj.installments || []).map(i => ({
      id: i.id,
      installmentNumber: i.installmentNumber || undefined,
      paymentDate: i.paymentDate ? i.paymentDate.split('T')[0] : '',
      amount: Number(i.amount) || 0,
      paymentReference: i.paymentReference || '',
      notes: i.notes || ''
    })));
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Live duration calculation for Add/Edit Form
  const liveDuration = useMemo(() => {
    return calculateProjectDuration(formData.startDate, formData.endDate);
  }, [formData.startDate, formData.endDate]);

  // Live financial reconciliation for Add/Edit Form
  const liveFinancials = useMemo(() => {
    const sAmt = parseFloat(String(formData.sanctionedAmount)) || 0;
    const hasManualRec = formData.amountReceived !== '' && formData.amountReceived !== null && formData.amountReceived !== undefined;
    const manualRec = hasManualRec ? (parseFloat(String(formData.amountReceived)) || 0) : null;
    const instTotal = tempInstallments.reduce((sum, inst) => sum + (Number(inst.amount) || 0), 0);

    let effective = 0;
    let recStatus = 'none';
    let diff = 0;

    if (manualRec !== null && tempInstallments.length === 0) {
      effective = manualRec;
      recStatus = 'manual_only';
    } else if (manualRec === null && tempInstallments.length > 0) {
      effective = instTotal;
      recStatus = 'installments_only';
    } else if (manualRec !== null && tempInstallments.length > 0) {
      effective = manualRec;
      diff = Math.abs(manualRec - instTotal);
      recStatus = diff < 0.01 ? 'matched' : 'mismatched';
    }

    const balance = Math.max(0, sAmt - effective);

    return {
      sanctionedAmount: sAmt,
      effectiveReceived: effective,
      installmentTotal: instTotal,
      balanceYetToBeReceived: balance,
      recStatus,
      diff
    };
  }, [formData.sanctionedAmount, formData.amountReceived, tempInstallments]);

  // Form Submit Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) errors.title = 'Project Title is required';
    if (!formData.principalInvestigator.trim()) errors.principalInvestigator = 'Principal Investigator (PI) is required';
    if (!formData.fundingAgency.trim()) errors.fundingAgency = 'Funding Agency name is required';
    if (Number(formData.sanctionedAmount) < 0) errors.sanctionedAmount = 'Sanctioned amount must be positive';

    if (formData.startDate && formData.endDate) {
      const dur = calculateProjectDuration(formData.startDate, formData.endDate);
      if (!dur.isValid) {
        errors.endDate = dur.error || 'End Date cannot be earlier than Start Date';
      }
    }

    if (formData.sanctionYear && formData.sanctionYear.trim()) {
      const y = parseInt(formData.sanctionYear.trim(), 10);
      if (isNaN(y) || y < 1950 || y > 2100) {
        errors.sanctionYear = 'Sanction Year must be a valid 4-digit calendar year (e.g., 2024)';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        title: formData.title,
        principalInvestigator: formData.principalInvestigator,
        coInvestigators: formData.coInvestigators,
        fundingAgency: formData.fundingAgency,
        scheme: formData.scheme,
        agencyType: formData.agencyType,
        sanctionOrderNo: formData.sanctionOrderNo,
        sanctionDate: formData.sanctionDate || null,
        sanctionYear: formData.sanctionYear ? parseInt(formData.sanctionYear, 10) : null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        sanctionedAmount: formData.sanctionedAmount,
        amountReceived: formData.amountReceived !== '' ? formData.amountReceived : null,
        status: formData.status,
        progressPercentage: formData.progressPercentage,
        department: formData.department,
        projectUrl: formData.projectUrl,
        description: formData.description,
        approvalStatus: formData.approvalStatus
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
      if (!res.ok || !data.success) {
        setFormErrors({ submit: data.message || 'Operation failed' });
        setSubmitting(false);
        return;
      }

      const savedProjectId = editingProject ? editingProject.id : data.data.id;

      // 1. Process Agreement Letter Files Upload
      if (agreementFiles.length > 0) {
        const formDataFiles = new FormData();
        agreementFiles.forEach(f => formDataFiles.append('files', f));
        await fetch(`${API_BASE}/api/sponsored-projects/${savedProjectId}/documents/upload?category=agreement_letter`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formDataFiles
        });
      }

      // 2. Process Agreement Letter Drive Links
      if (agreementLinks.trim()) {
        const links = agreementLinks.split(/[\r\n;,]+/).map(s => s.trim()).filter(Boolean);
        if (links.length > 0) {
          await fetch(`${API_BASE}/api/sponsored-projects/${savedProjectId}/documents/links`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ category: 'agreement_letter', links })
          });
        }
      }

      // 3. Process Payment Receipt Files Upload
      if (paymentFiles.length > 0) {
        const formDataReceipts = new FormData();
        paymentFiles.forEach(f => formDataReceipts.append('files', f));
        await fetch(`${API_BASE}/api/sponsored-projects/${savedProjectId}/documents/upload?category=payment_receipt`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formDataReceipts
        });
      }

      // 4. Process Payment Receipt Drive Links
      if (paymentLinks.trim()) {
        const links = paymentLinks.split(/[\r\n;,]+/).map(s => s.trim()).filter(Boolean);
        if (links.length > 0) {
          await fetch(`${API_BASE}/api/sponsored-projects/${savedProjectId}/documents/links`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ category: 'payment_receipt', links })
          });
        }
      }

      setIsFormOpen(false);
      fetchProjects();
      fetchStats();
    } catch (err: any) {
      setFormErrors({ submit: err.message || 'Connection error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Add an installment to active project
  const handleAddInstallment = async () => {
    if (!newInstAmount || Number(newInstAmount) <= 0) {
      alert('Please enter a valid installment amount.');
      return;
    }

    if (editingProject) {
      try {
        const res = await fetch(`${API_BASE}/api/sponsored-projects/${editingProject.id}/installments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            installmentNumber: tempInstallments.length + 1,
            paymentDate: newInstDate || null,
            amount: parseFloat(newInstAmount),
            paymentReference: newInstRef || null
          })
        });
        const data = await res.json();
        if (data.success && data.data) {
          setTempInstallments(prev => [...prev, data.data]);
        }
      } catch (err) {
        console.error('Add installment error:', err);
      }
    } else {
      setTempInstallments(prev => [
        ...prev,
        {
          installmentNumber: prev.length + 1,
          paymentDate: newInstDate,
          amount: parseFloat(newInstAmount),
          paymentReference: newInstRef,
          notes: ''
        }
      ]);
    }

    setNewInstAmount('');
    setNewInstDate('');
    setNewInstRef('');
  };

  // Remove an installment
  const handleRemoveInstallment = async (idx: number, instId?: string) => {
    if (editingProject && instId) {
      try {
        await fetch(`${API_BASE}/api/sponsored-projects/${editingProject.id}/installments/${instId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Delete installment error:', err);
      }
    }
    setTempInstallments(prev => prev.filter((_, i) => i !== idx));
  };

  // Delete attached document
  const handleDeleteDocument = async (docId: string, projectId: string) => {
    if (!window.confirm('Are you sure you want to remove this attached document?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/sponsored-projects/${projectId}/documents/${docId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        fetchProjects();
        if (viewingProject && viewingProject.id === projectId) {
          setViewingProject(prev => {
            if (!prev) return null;
            const updatedDocs = (prev.documents || []).filter(d => d.id !== docId);
            return {
              ...prev,
              documents: updatedDocs,
              agreementLetters: updatedDocs.filter(d => d.documentCategory === 'agreement_letter'),
              paymentReceipts: updatedDocs.filter(d => d.documentCategory === 'payment_receipt')
            };
          });
        }
      }
    } catch (err) {
      console.error('Delete document error:', err);
    }
  };

  // Delete Project Handler
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this sponsored research grant record? All attached Agreement Letters and Payment Receipts will also be removed.')) return;
    try {
      const res = await fetch(`${API_BASE}/api/sponsored-projects/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        fetchProjects();
        fetchStats();
        if (viewingProject?.id === id) setViewingProject(null);
      } else {
        alert(data.message || 'Failed to delete record');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to connect to backend server');
    }
  };

  // Clear All Projects in scope
  const handleClearAll = async () => {
    setClearLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sponsored-projects/clear-all?confirmAll=true&confirmation=CONFIRM_UNIVERSITY_CLEAR`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token || localStorage.getItem('token') || ''}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      if (res.ok) {
        setIsClearOpen(false);
        fetchProjects();
        fetchStats();
      } else {
        alert(data.message || 'Failed to clear records');
      }
    } catch (err) {
      console.error('Clear all error:', err);
      alert('Failed to clear sponsored projects');
    } finally {
      setClearLoading(false);
    }
  };

  // Export to Excel / CSV
  const handleExport = (format: 'xlsx' | 'csv') => {
    if (projects.length === 0) {
      alert('No sponsored project records to export.');
      return;
    }

    const exportRows = projects.map((p, idx) => ({
      'S.No': idx + 1,
      'Project Title': p.title,
      'Principal Investigator': p.principalInvestigator,
      'Co-Investigators': p.coInvestigators || '-',
      'Funding Agency': p.fundingAgency,
      'Scheme / Program': p.scheme || '-',
      'Agency Type': p.agencyType,
      'Sanction Order No': p.sanctionOrderNo || '-',
      'Sanction Date': p.sanctionDate || '-',
      'Sanction Year': p.sanctionYear || p.academicYear || '-',
      'Start Date': p.startDate || '-',
      'End Date': p.endDate || '-',
      'Project Duration': p.durationFormatted || (p.startDate && p.endDate ? calculateProjectDuration(p.startDate, p.endDate).formatted : '-'),
      'Sanctioned Amount (INR)': Number(p.sanctionedAmount) || 0,
      'Amount Received (INR)': p.amountReceived !== null && p.amountReceived !== undefined ? Number(p.amountReceived) : (p.effectiveAmountReceived || 0),
      'Balance Yet to Be Received (INR)': p.balanceYetToBeReceived ?? Math.max(0, (Number(p.sanctionedAmount) || 0) - (Number(p.amountReceived) || 0)),
      'Status': p.status,
      'Milestone Progress (%)': p.progressPercentage ?? (p.status === 'Completed' ? 100 : 50),
      'Department': p.department || 'General',
      'Agreement Letters': (p.agreementLetters || []).map(d => d.driveUrl).join('\n') || '-',
      'Payment Receipts': (p.paymentReceipts || []).map(d => d.driveUrl).join('\n') || '-',
      'Project URL': p.projectUrl || '-',
      'Description': p.description || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sponsored Research');

    const fileName = `CHRIST_Sponsored_Research_${new Date().toISOString().slice(0, 10)}.${format}`;
    if (format === 'xlsx') {
      XLSX.writeFile(wb, fileName);
    } else {
      XLSX.writeFile(wb, fileName, { bookType: 'csv' });
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Academics' },
          { label: 'Research' },
          { label: 'Sponsored Research & Grants' }
        ]}
        title="Sponsored Research & Grants"
        badge={`${(stats?.totalProjects ?? projects.length).toLocaleString()} Grants`}
        description="Track funded research projects, principal investigators, sanctioned grants, financial installments, agreement letters, and payment receipts."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => handleExport('xlsx')}
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-xs"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              <span>Export Excel</span>
            </Button>

            <Button
              onClick={() => setIsBulkOpen(true)}
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold h-9 px-3.5 rounded-xl shadow-xs"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              <span>Bulk Upload</span>
            </Button>

            <Button
              onClick={handleOpenAdd}
              size="sm"
              className="bg-[#2855B9] hover:bg-[#1C355B] text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Record Grant</span>
            </Button>
          </div>
        }
      />

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Grants"
          value={(stats?.totalProjects ?? projects.length).toLocaleString()}
          subtitle="Across active departments"
          icon={FileText}
        />
        <StatCard
          title="Total Sanctioned"
          value={formatCurrency(stats?.totalSanctionedAmount ?? projects.reduce((sum, p) => sum + (Number(p.sanctionedAmount) || 0), 0))}
          subtitle="Approved funding"
          icon={DollarSign}
        />
        <StatCard
          title="Funds Received"
          value={formatCurrency(stats?.totalFundsReceived ?? projects.reduce((sum, p) => sum + (Number(p.effectiveAmountReceived || p.amountReceived) || 0), 0))}
          subtitle="Credited to date"
          icon={Landmark}
        />
        <StatCard
          title="Balance Receivable"
          value={formatCurrency(stats?.totalBalanceReceivable ?? projects.reduce((sum, p) => sum + (Number(p.balanceYetToBeReceived) || 0), 0))}
          subtitle="Remaining grant funds"
          icon={TrendingUp}
        />
        <StatCard
          title="Active Projects"
          value={(stats?.ongoingCount ?? projects.filter(p => (p.status || '').toLowerCase().includes('ongoing')).length).toLocaleString()}
          subtitle="Ongoing Research"
          icon={Clock}
        />
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-gray-200 shadow-sm bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <Input
                placeholder="Search by Title, Principal Investigator, Agency, Scheme, Sanction Ref..."
                className="pl-9 h-9 text-xs border-gray-200 focus-visible:ring-[#2855B9]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter (5 Statuses + All) */}
              <div className="w-[160px]">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {PROJECT_STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sanction Year Filter */}
              <div className="w-[130px]">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                    <SelectValue placeholder="Sanction Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {sanctionYears.map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Department Filter */}
              <div className="w-[160px]">
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={`h-8 px-2.5 text-xs ${viewMode === 'table' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'}`}
                >
                  Table
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className={`h-8 px-2.5 text-xs ${viewMode === 'cards' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'}`}
                >
                  Cards
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects List Content */}
      {loading ? (
        <Card className="p-12 text-center border-gray-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#2855B9] mb-2" />
          <p className="text-xs text-gray-500 font-medium">Loading sponsored research grants...</p>
        </Card>
      ) : projects.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-gray-300">
          <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <h3 className="text-sm font-bold text-gray-700">No sponsored research projects found</h3>
          <p className="text-xs text-gray-500 mt-1">Try adjusting your filters, or record a new grant.</p>
          <Button onClick={handleOpenAdd} size="sm" className="mt-4 bg-[#2855B9] text-white text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" /> Record New Grant
          </Button>
        </Card>
      ) : viewMode === 'cards' ? (
        /* CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((proj) => {
            const progressVal = proj.progressPercentage ?? (proj.status === 'Completed' ? 100 : 50);
            return (
              <Card key={proj.id} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getStatusBadge(proj.status)}
                      {getAgencyBadge(proj.agencyType)}
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {proj.sanctionYear ? `SY ${proj.sanctionYear}` : `AY ${proj.academicYear}`}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-sm font-bold text-gray-900 mt-2 line-clamp-2 leading-snug" title={proj.title}>
                    {proj.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-500 mt-0.5">
                    PI: <span className="font-semibold text-gray-700">{proj.principalInvestigator}</span>
                    {proj.department && <span> • {proj.department}</span>}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <div className="p-2.5 bg-gray-50 rounded-lg text-xs space-y-1.5 border border-gray-150">
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Funding Agency:</span>
                      <span className="font-semibold text-gray-800 truncate max-w-[170px]" title={proj.fundingAgency}>{proj.fundingAgency}</span>
                    </div>
                    {proj.sanctionOrderNo && (
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Sanction Ref:</span>
                        <span className="font-mono text-[11px] text-gray-700 truncate max-w-[170px]">{proj.sanctionOrderNo}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Project Duration:</span>
                      <span className="font-mono text-[11px] text-gray-700">{proj.durationFormatted || 'Not Available'}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Sanctioned:</span>
                      <span className="font-mono font-bold text-teal-800">{formatCurrency(proj.sanctionedAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Received:</span>
                      <span className="font-mono font-semibold text-emerald-700">{formatCurrency(proj.effectiveAmountReceived || proj.amountReceived || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Balance Receivable:</span>
                      <span className="font-mono font-semibold text-amber-700">{formatCurrency(proj.balanceYetToBeReceived || 0)}</span>
                    </div>
                  </div>

                  {/* Document Attachment Badges */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 flex items-center gap-1.5 text-[11px] text-gray-600">
                      <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Agreement:</span>
                      {proj.agreementLetterCount && proj.agreementLetterCount > 0 ? (
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0">
                          {proj.agreementLetterCount} {proj.agreementLetterCount === 1 ? 'Doc' : 'Docs'}
                        </Badge>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">Missing</span>
                      )}
                    </div>
                    <div className="flex-1 flex items-center gap-1.5 text-[11px] text-gray-600">
                      <Receipt className="w-3.5 h-3.5 text-purple-600" />
                      <span>Receipt:</span>
                      {proj.paymentReceiptCount && proj.paymentReceiptCount > 0 ? (
                        <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-1.5 py-0">
                          {proj.paymentReceiptCount} {proj.paymentReceiptCount === 1 ? 'Doc' : 'Docs'}
                        </Badge>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]">Missing</span>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewingProject(proj)}
                      className="text-xs text-[#2855B9] font-semibold hover:bg-blue-50 h-8 px-2"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" /> View Details
                    </Button>

                    <div className="flex items-center gap-1">
                      {isPrivileged && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(proj)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(proj.id)}
                            className="h-8 w-8 p-0 text-gray-500 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="border border-[#E2E8F0] shadow-xs bg-white rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0] text-slate-700 font-semibold text-xs">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3 min-w-[220px]">Project Title & PI</th>
                  <th className="py-3 px-3 min-w-[150px]">Agency & Category</th>
                  <th className="py-3 px-3 min-w-[90px] text-center">Sanction Year</th>
                  <th className="py-3 px-3 min-w-[130px]">Duration</th>
                  <th className="py-3 px-3 text-right min-w-[140px]">Grant Finances</th>
                  <th className="py-3 px-3 text-center min-w-[100px]">Status</th>
                  <th className="py-3 px-3 text-center min-w-[100px]">Agreement Letter</th>
                  <th className="py-3 px-3 text-center min-w-[100px]">Payment Receipt</th>
                  <th className="py-3 px-3 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs sm:text-[13px] text-slate-700">
                {projects.map((proj, idx) => {
                  return (
                    <tr key={proj.id} className="hover:bg-[#F1F5F9] transition-colors">
                      <td className="py-3 px-3 text-center font-mono text-gray-400">{idx + 1}</td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-900 line-clamp-2 max-w-[260px]" title={proj.title}>
                          {proj.title}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-gray-700">PI: {proj.principalInvestigator}</span>
                          {proj.department && <span className="text-gray-400">• {proj.department}</span>}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-medium text-gray-800 truncate max-w-[150px]" title={proj.fundingAgency}>{proj.fundingAgency}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {getAgencyBadge(proj.agencyType)}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold text-gray-800">
                        {proj.sanctionYear ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                            {proj.sanctionYear}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[10px] italic">Pending</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-gray-700">
                        {proj.durationFormatted || 'Not Available'}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="font-mono font-bold text-teal-800">{formatCurrency(proj.sanctionedAmount)}</div>
                        <div className="text-[10px] text-emerald-700 font-mono">
                          Rec: {formatCurrency(proj.effectiveAmountReceived || proj.amountReceived || 0)}
                        </div>
                        <div className="text-[10px] text-amber-700 font-mono">
                          Bal: {formatCurrency(proj.balanceYetToBeReceived || 0)}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {getStatusBadge(proj.status)}
                      </td>

                      {/* Agreement Letter Column */}
                      <td className="py-3 px-3 text-center">
                        {proj.agreementLetterCount && proj.agreementLetterCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E8F5ED] text-[#167447] border border-[#C6E7D2] text-[10px] font-semibold">
                            <FileCheck className="w-3 h-3 text-[#167447]" />
                            {proj.agreementLetterCount} {proj.agreementLetterCount === 1 ? 'Doc' : 'Docs'}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[10px] italic">Missing</span>
                        )}
                      </td>

                      {/* Payment Receipt Column */}
                      <td className="py-3 px-3 text-center">
                        {proj.paymentReceiptCount && proj.paymentReceiptCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E8F5ED] text-[#167447] border border-[#C6E7D2] text-[10px] font-semibold">
                            <Receipt className="w-3 h-3 text-[#167447]" />
                            {proj.paymentReceiptCount} {proj.paymentReceiptCount === 1 ? 'Doc' : 'Docs'}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[10px] italic">Missing</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingProject(proj)}
                            className="h-7 w-7 p-0 text-gray-500 hover:text-gray-900 rounded-md"
                            title="View Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {isPrivileged && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEdit(proj)}
                                className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 rounded-md"
                                title="Edit"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(proj.id)}
                                className="h-7 w-7 p-0 text-gray-500 hover:text-red-600 rounded-md"
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
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center px-4">
            <span>Showing {projects.length} sponsored project records</span>
            {isPrivileged && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsClearOpen(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-[11px] h-7 px-2"
              >
                Clear All Grants
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* ======================================================== */}
      {/* RECORD / EDIT SPONSORED PROJECT DIALOG */}
      {/* ======================================================== */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto bg-white p-6 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#2855B9]" />
              <span>{editingProject ? 'Edit Sponsored Research Project' : 'Record New Sponsored Research Grant'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Fill in all sanctioned grant details, Principal Investigator information, timeline, financial installments, and upload supporting documents.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 py-2 text-xs">
            {formErrors.submit && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formErrors.submit}</span>
              </div>
            )}

            {/* SECTION A — PROJECT INFORMATION */}
            <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#2855B9]" />
                <span>Section A — Project Information</span>
              </h4>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Project Title <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Full sanctioned project title..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 h-9 text-xs bg-white"
                />
                {formErrors.title && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.title}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Principal Investigator (PI) <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="e.g., Dr. Rajesh Kumar"
                    value={formData.principalInvestigator}
                    onChange={(e) => setFormData({ ...formData, principalInvestigator: e.target.value })}
                    className="mt-1 h-9 text-xs bg-white"
                  />
                  {formErrors.principalInvestigator && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.principalInvestigator}</p>}
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Co-Investigators (Co-PI)</Label>
                  <Input
                    placeholder="e.g., Dr. Priya Sharma, Dr. Arun Kumar"
                    value={formData.coInvestigators || ''}
                    onChange={(e) => setFormData({ ...formData, coInvestigators: e.target.value })}
                    className="mt-1 h-9 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Funding Agency <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="e.g., DST - SERB, AICTE, ICMR, ISRO"
                    value={formData.fundingAgency}
                    onChange={(e) => setFormData({ ...formData, fundingAgency: e.target.value })}
                    className="mt-1 h-9 text-xs bg-white"
                  />
                  {formErrors.fundingAgency && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.fundingAgency}</p>}
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Scheme / Program Name</Label>
                  <Input
                    placeholder="e.g., Core Research Grant (CRG), RPS, FIST"
                    value={formData.scheme || ''}
                    onChange={(e) => setFormData({ ...formData, scheme: e.target.value })}
                    className="mt-1 h-9 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Funding Agency Category</Label>
                  <Select
                    value={formData.agencyType}
                    onValueChange={(val) => setFormData({ ...formData, agencyType: val })}
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                      <SelectValue placeholder="Select Agency Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENCY_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Sanction Order Number / Ref ID</Label>
                  <Input
                    placeholder="e.g., DST/SERB/CRG/2023/004821"
                    value={formData.sanctionOrderNo || ''}
                    onChange={(e) => setFormData({ ...formData, sanctionOrderNo: e.target.value })}
                    className="mt-1 h-9 text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            {/* SECTION B — FINANCIAL INFORMATION */}
            <div className="space-y-3 p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl">
              <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                  Section B — Financial Information & Installments
                </span>
                {liveFinancials.recStatus === 'matched' && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">Reconciliation: Matched</Badge>
                )}
                {liveFinancials.recStatus === 'mismatched' && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                    Discrepancy: Difference of {formatCurrency(liveFinancials.diff)}
                  </Badge>
                )}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Total Sanctioned Amount (₹) <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 4850000"
                    value={formData.sanctionedAmount}
                    onChange={(e) => setFormData({ ...formData, sanctionedAmount: parseFloat(e.target.value) || 0 })}
                    className="mt-1 h-9 text-xs font-mono bg-white font-semibold text-teal-900"
                  />
                  {formErrors.sanctionedAmount && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.sanctionedAmount}</p>}
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Reported Amount Received (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 2425000"
                    value={formData.amountReceived !== null && formData.amountReceived !== undefined ? formData.amountReceived : ''}
                    onChange={(e) => setFormData({ ...formData, amountReceived: e.target.value })}
                    className="mt-1 h-9 text-xs font-mono bg-white text-emerald-800 font-semibold"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Balance Receivable (₹)</Label>
                  <div className="mt-1 h-9 px-3 bg-white rounded-md border border-gray-200 flex items-center font-mono font-bold text-amber-700">
                    {formatCurrency(liveFinancials.balanceYetToBeReceived)}
                  </div>
                </div>
              </div>

              {/* Installments Tracker */}
              <div className="mt-2 pt-2 border-t border-emerald-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
                    <Landmark className="w-3.5 h-3.5 text-emerald-700" />
                    Funding Installments ({tempInstallments.length})
                  </span>
                  <span className="text-[11px] font-mono text-gray-600">
                    Sum: <strong className="text-emerald-700">{formatCurrency(liveFinancials.installmentTotal)}</strong>
                  </span>
                </div>

                {/* Add Installment Row */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-white p-2 rounded-lg border border-emerald-200">
                  <Input
                    type="date"
                    value={newInstDate}
                    onChange={(e) => setNewInstDate(e.target.value)}
                    className="h-8 text-[11px]"
                    placeholder="Payment Date"
                  />
                  <Input
                    type="number"
                    value={newInstAmount}
                    onChange={(e) => setNewInstAmount(e.target.value)}
                    className="h-8 text-[11px] font-mono"
                    placeholder="Amount (₹)"
                  />
                  <Input
                    type="text"
                    value={newInstRef}
                    onChange={(e) => setNewInstRef(e.target.value)}
                    className="h-8 text-[11px]"
                    placeholder="Ref / UTR / PFMS No"
                  />
                  <Button
                    type="button"
                    onClick={handleAddInstallment}
                    size="sm"
                    className="h-8 bg-emerald-700 text-white hover:bg-emerald-800 text-[11px]"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Installment
                  </Button>
                </div>

                {/* Existing Installments List */}
                {tempInstallments.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {tempInstallments.map((inst, i) => (
                      <div key={i} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-gray-200 text-[11px]">
                        <span className="font-semibold text-gray-700">Installment #{i + 1}</span>
                        <span className="text-gray-500">{inst.paymentDate || 'Date N/A'}</span>
                        <span className="font-mono font-bold text-emerald-800">{formatCurrency(inst.amount)}</span>
                        <span className="font-mono text-gray-500 text-[10px] truncate max-w-[100px]">{inst.paymentReference || '-'}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInstallment(i, inst.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SECTION C — PROJECT TIMELINE */}
            <div className="space-y-3 p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl">
              <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-700" />
                <span>Section C — Project Timeline & Duration</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Sanction Date</Label>
                  <Input
                    type="date"
                    value={formData.sanctionDate || ''}
                    onChange={(e) => {
                      const newDate = e.target.value;
                      const derived = deriveSanctionYear(newDate);
                      setFormData({
                        ...formData,
                        sanctionDate: newDate,
                        sanctionYear: derived ? String(derived) : formData.sanctionYear
                      });
                    }}
                    className="mt-1 h-9 text-xs bg-white"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">Automatically derives calendar Sanction Year</p>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Sanction Year (Calendar Year)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 2024"
                    value={formData.sanctionYear || ''}
                    onChange={(e) => setFormData({ ...formData, sanctionYear: e.target.value })}
                    className="mt-1 h-9 text-xs bg-white font-mono"
                  />
                  {formErrors.sanctionYear && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.sanctionYear}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Start Date</Label>
                  <Input
                    type="date"
                    value={formData.startDate || ''}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="mt-1 h-9 text-xs bg-white"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Completion / End Date</Label>
                  <Input
                    type="date"
                    value={formData.endDate || ''}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="mt-1 h-9 text-xs bg-white"
                  />
                  {formErrors.endDate && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.endDate}</p>}
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Calculated Project Duration</Label>
                  <div className={`mt-1 h-9 px-3 rounded-md border flex items-center font-mono text-[11px] font-semibold ${
                    liveDuration.isValid ? 'bg-white text-blue-900 border-blue-200' : 'bg-gray-100 text-gray-400 border-gray-200'
                  }`}>
                    <Clock className="w-3.5 h-3.5 mr-1 text-blue-600 shrink-0" />
                    <span>{liveDuration.formatted}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION D — PROJECT CLASSIFICATION */}
            <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#2855B9]" />
                <span>Section D — Project Classification & Progress</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Project Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => {
                      setFormData({
                        ...formData,
                        status: val,
                        progressPercentage: val === 'Completed' ? 100 : (val === 'Sanctioned' ? 10 : formData.progressPercentage)
                      });
                    }}
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUS_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Milestone Progress (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0 - 100"
                    value={formData.progressPercentage || 0}
                    onChange={(e) => setFormData({ ...formData, progressPercentage: parseInt(e.target.value, 10) || 0 })}
                    className="mt-1 h-9 text-xs font-mono bg-white"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-gray-700">Host Department</Label>
                  <Select
                    value={formData.department || ''}
                    onValueChange={(val) => setFormData({ ...formData, department: val })}
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* SECTION E — SUPPORTING DOCUMENTS (TWO SEPARATE CATEGORIES) */}
            <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-[#2855B9]" />
                <span>Section E — Supporting Documents (Google Drive Integration)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. AGREEMENT LETTER */}
                <div className="p-3 bg-white rounded-lg border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-blue-600" />
                      Agreement Letter
                    </span>
                    <span className="text-[10px] text-gray-400">PDF, JPG, PNG (Max 10MB)</span>
                  </div>

                  <div>
                    <Label className="text-[11px] text-gray-600 block mb-1">Upload File(s)</Label>
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setAgreementFiles(Array.from(e.target.files || []))}
                      className="h-8 text-[11px] cursor-pointer"
                    />
                    {agreementFiles.length > 0 && (
                      <p className="text-[10px] text-emerald-600 mt-1 font-medium">{agreementFiles.length} file(s) selected for upload</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-[11px] text-gray-600 block mb-1">Or Existing Google Drive Link(s)</Label>
                    <textarea
                      rows={2}
                      placeholder="https://drive.google.com/file/d/... (one per line)"
                      value={agreementLinks}
                      onChange={(e) => setAgreementLinks(e.target.value)}
                      className="w-full p-1.5 text-[11px] border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  {/* Show existing attached agreement letters if editing */}
                  {editingProject && editingProject.agreementLetters && editingProject.agreementLetters.length > 0 && (
                    <div className="pt-1.5 border-t border-gray-150 space-y-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Attached ({editingProject.agreementLetters.length}):</span>
                      {editingProject.agreementLetters.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded">
                          <a href={doc.driveUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[180px] flex items-center gap-1">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            {doc.fileName}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id, editingProject.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Remove Document"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. PAYMENT RECEIPT */}
                <div className="p-3 bg-white rounded-lg border border-purple-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-purple-600" />
                      Payment Receipt
                    </span>
                    <span className="text-[10px] text-gray-400">PDF, JPG, PNG (Max 10MB)</span>
                  </div>

                  <div>
                    <Label className="text-[11px] text-gray-600 block mb-1">Upload File(s)</Label>
                    <Input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setPaymentFiles(Array.from(e.target.files || []))}
                      className="h-8 text-[11px] cursor-pointer"
                    />
                    {paymentFiles.length > 0 && (
                      <p className="text-[10px] text-emerald-600 mt-1 font-medium">{paymentFiles.length} receipt(s) selected for upload</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-[11px] text-gray-600 block mb-1">Or Existing Google Drive Link(s)</Label>
                    <textarea
                      rows={2}
                      placeholder="https://drive.google.com/file/d/... (one per line)"
                      value={paymentLinks}
                      onChange={(e) => setPaymentLinks(e.target.value)}
                      className="w-full p-1.5 text-[11px] border border-gray-200 rounded focus:ring-1 focus:ring-purple-500 font-mono"
                    />
                  </div>

                  {/* Show existing attached payment receipts if editing */}
                  {editingProject && editingProject.paymentReceipts && editingProject.paymentReceipts.length > 0 && (
                    <div className="pt-1.5 border-t border-gray-150 space-y-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Attached ({editingProject.paymentReceipts.length}):</span>
                      {editingProject.paymentReceipts.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between text-[11px] bg-slate-50 p-1.5 rounded">
                          <a href={doc.driveUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline truncate max-w-[180px] flex items-center gap-1">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            {doc.fileName}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id, editingProject.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Remove Receipt"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION F — ADDITIONAL INFORMATION */}
            <div className="space-y-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-[#2855B9]" />
                <span>Section F — Additional Information</span>
              </h4>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Project / Sanction Letter URL</Label>
                <Input
                  placeholder="https://serbonline.in/grant/..."
                  value={formData.projectUrl || ''}
                  onChange={(e) => setFormData({ ...formData, projectUrl: e.target.value })}
                  className="mt-1 h-9 text-xs bg-white"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Project Objectives & Deliverables</Label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of research scope, objectives, and deliverables..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full mt-1 p-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2855B9] bg-white"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-gray-150 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={submitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#2855B9] text-white hover:bg-[#1C355B] text-xs font-semibold"
              >
                {submitting ? 'Saving...' : editingProject ? 'Update Grant' : 'Record Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* VIEW PROJECT DETAILS MODAL */}
      {/* ======================================================== */}
      <Dialog open={!!viewingProject} onOpenChange={(open) => !open && setViewingProject(null)}>
        <DialogContent className="sm:max-w-[720px] max-h-[88vh] overflow-y-auto bg-white p-6 rounded-xl">
          {viewingProject && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {getStatusBadge(viewingProject.status)}
                  {getAgencyBadge(viewingProject.agencyType)}
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {viewingProject.sanctionYear ? `SY ${viewingProject.sanctionYear}` : `AY ${viewingProject.academicYear}`}
                  </Badge>
                  {(viewingProject.durationFormatted || (viewingProject.startDate && viewingProject.endDate)) && (
                    <Badge variant="outline" className="text-[10px] font-mono bg-[#EAF1FD] text-[#2855B9] border-[#C8DCFB]">
                      Duration: {viewingProject.durationFormatted || calculateProjectDuration(viewingProject.startDate, viewingProject.endDate).formatted}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-lg font-bold text-gray-900 leading-snug">
                  {viewingProject.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Host Department: <span className="font-semibold text-gray-700">{viewingProject.department || 'General'}</span>
                </DialogDescription>
              </DialogHeader>

              {/* Research Team Banner */}
              <div className="p-3 bg-[#EAF1FD]/40 rounded-lg border border-[#C8DCFB] text-xs">
                <div className="font-semibold text-[#2855B9]">Principal Investigator (PI):</div>
                <div className="text-gray-900 font-bold text-sm mt-0.5">{viewingProject.principalInvestigator}</div>
                {viewingProject.coInvestigators && (
                  <div className="text-gray-600 mt-1">
                    <span className="font-semibold">Co-Investigators:</span> {viewingProject.coInvestigators}
                  </div>
                )}
              </div>

              {/* Navigation Tabs */}
              <Tabs value={detailTab} onValueChange={(val: any) => setDetailTab(val)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="financial" className="text-xs">Finances & Installments</TabsTrigger>
                  <TabsTrigger value="documents" className="text-xs">Documents ({((viewingProject.agreementLetters?.length || 0) + (viewingProject.paymentReceipts?.length || 0))})</TabsTrigger>
                </TabsList>

                {/* TAB 1: OVERVIEW */}
                <TabsContent value="overview" className="space-y-3 pt-3 text-xs">
                  <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <div>
                      <span className="text-gray-500 block text-[11px]">Funding Agency</span>
                      <span className="font-semibold text-gray-900">{viewingProject.fundingAgency}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Scheme / Program</span>
                      <span className="font-semibold text-gray-900">{viewingProject.scheme || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Sanction Order Number</span>
                      <span className="font-mono font-semibold text-gray-900">{viewingProject.sanctionOrderNo || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Sanction Date</span>
                      <span className="font-semibold text-gray-900">{viewingProject.sanctionDate ? viewingProject.sanctionDate.split('T')[0] : '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Commencement / Start Date</span>
                      <span className="font-semibold text-gray-900">{viewingProject.startDate ? viewingProject.startDate.split('T')[0] : '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Completion / End Date</span>
                      <span className="font-semibold text-gray-900">{viewingProject.endDate ? viewingProject.endDate.split('T')[0] : '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Project Duration</span>
                      <span className="font-semibold text-[#2855B9] flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-[#2855B9] shrink-0" />
                        {viewingProject.durationFormatted || (viewingProject.startDate && viewingProject.endDate ? calculateProjectDuration(viewingProject.startDate, viewingProject.endDate).formatted : 'Not Available')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Sanction Year</span>
                      <span className="font-mono font-semibold text-gray-900 mt-0.5 block">
                        {viewingProject.sanctionYear ? `SY ${viewingProject.sanctionYear}` : (viewingProject.academicYear ? `AY ${viewingProject.academicYear}` : '-')}
                      </span>
                    </div>
                  </div>

                  {viewingProject.description && (
                    <div className="p-3 bg-white border border-gray-200 rounded-lg">
                      <span className="text-[11px] font-bold text-gray-700 block mb-1">Objectives & Deliverables</span>
                      <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{viewingProject.description}</p>
                    </div>
                  )}

                  {viewingProject.projectUrl && (
                    <div className="flex items-center justify-between p-2.5 bg-[#EAF1FD]/40 border border-[#C8DCFB] rounded-lg">
                      <span className="text-gray-600">External Research Portal:</span>
                      <a
                        href={viewingProject.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#2855B9] font-semibold hover:underline flex items-center gap-1"
                      >
                        Visit Portal <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </TabsContent>

                {/* TAB 2: FINANCIAL */}
                <TabsContent value="financial" className="space-y-3 pt-3 text-xs">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                      <span className="text-[10px] text-teal-700 uppercase font-semibold block">Total Sanctioned</span>
                      <span className="text-sm font-bold font-mono text-teal-900">{formatCurrency(viewingProject.sanctionedAmount)}</span>
                    </div>
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Amount Received</span>
                      <span className="text-sm font-bold font-mono text-emerald-900">{formatCurrency(viewingProject.effectiveAmountReceived || viewingProject.amountReceived || 0)}</span>
                    </div>
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <span className="text-[10px] text-amber-700 uppercase font-semibold block">Balance Receivable</span>
                      <span className="text-sm font-bold font-mono text-amber-900">{formatCurrency(viewingProject.balanceYetToBeReceived || 0)}</span>
                    </div>
                  </div>

                  {/* Reconciliation Banner */}
                  <div className="p-2.5 rounded-lg border flex items-center justify-between text-[11px] bg-slate-50 border-slate-200">
                    <span className="font-semibold text-gray-700">Financial Reconciliation Status:</span>
                    {viewingProject.reconciliationStatus === 'matched' && (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Matched (Installments equal reported funds)
                      </span>
                    )}
                    {viewingProject.reconciliationStatus === 'mismatched' && (
                      <span className="text-amber-700 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Discrepancy: Difference of {formatCurrency(viewingProject.reconciliationDiff || 0)}
                      </span>
                    )}
                    {viewingProject.reconciliationStatus === 'manual_only' && (
                      <span className="text-gray-600">Manual Aggregate (No installments entered)</span>
                    )}
                    {viewingProject.reconciliationStatus === 'installments_only' && (
                      <span className="text-emerald-700 font-semibold">Derived from installments sum</span>
                    )}
                  </div>

                  {/* Installments Table */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 font-bold text-gray-800 text-[11px] flex justify-between items-center">
                      <span>Installments History</span>
                      <span className="text-gray-500 font-mono font-normal">{(viewingProject.installments || []).length} credited</span>
                    </div>
                    {(viewingProject.installments || []).length === 0 ? (
                      <div className="p-4 text-center text-gray-400 italic">No individual funding installments recorded yet.</div>
                    ) : (
                      <table className="w-full text-left text-[11px]">
                        <thead>
                          <tr className="bg-gray-100 text-gray-600 border-b border-gray-200">
                            <th className="py-1.5 px-3">#</th>
                            <th className="py-1.5 px-3">Date</th>
                            <th className="py-1.5 px-3 text-right">Amount</th>
                            <th className="py-1.5 px-3">Reference / UTR</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(viewingProject.installments || []).map((inst, i) => (
                            <tr key={inst.id || i}>
                              <td className="py-1.5 px-3 font-semibold">{i + 1}</td>
                              <td className="py-1.5 px-3">{inst.paymentDate ? inst.paymentDate.split('T')[0] : '-'}</td>
                              <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-800">{formatCurrency(inst.amount)}</td>
                              <td className="py-1.5 px-3 font-mono text-gray-600">{inst.paymentReference || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </TabsContent>

                {/* TAB 3: DOCUMENTS */}
                <TabsContent value="documents" className="space-y-4 pt-3 text-xs">
                  {/* Agreement Letters */}
                  <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/20 space-y-2">
                    <h5 className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-blue-600" />
                      Agreement Letters & Sanction Orders ({(viewingProject.agreementLetters || []).length})
                    </h5>
                    {(viewingProject.agreementLetters || []).length === 0 ? (
                      <p className="text-gray-400 italic text-[11px]">No Agreement Letters attached yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {(viewingProject.agreementLetters || []).map(doc => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded border border-blue-100 text-[11px]">
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="font-medium text-gray-800 truncate" title={doc.fileName}>{doc.fileName}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={doc.driveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-[10px] flex items-center gap-1"
                              >
                                View in Drive <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payment Receipts */}
                  <div className="border border-purple-200 rounded-lg p-3 bg-purple-50/20 space-y-2">
                    <h5 className="font-bold text-purple-900 text-xs flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-purple-600" />
                      Payment Receipts & UC Documents ({(viewingProject.paymentReceipts || []).length})
                    </h5>
                    {(viewingProject.paymentReceipts || []).length === 0 ? (
                      <p className="text-gray-400 italic text-[11px]">No Payment Receipts attached yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {(viewingProject.paymentReceipts || []).map(doc => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded border border-purple-100 text-[11px]">
                            <div className="flex items-center gap-2 truncate">
                              <Receipt className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              <span className="font-medium text-gray-800 truncate" title={doc.fileName}>{doc.fileName}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={doc.driveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold text-[10px] flex items-center gap-1"
                              >
                                View in Drive <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="pt-3 border-t border-gray-150">
                <Button variant="outline" size="sm" onClick={() => setViewingProject(null)} className="text-xs">
                  Close
                </Button>
                {isPrivileged && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const proj = viewingProject;
                      setViewingProject(null);
                      handleOpenEdit(proj);
                    }}
                    className="bg-[#2855B9] text-white hover:bg-[#1C355B] text-xs font-semibold"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit Grant
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* BULK UPLOAD MODAL */}
      <BulkUploadDialog
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        token={token || ''}
        onSuccess={() => {
          fetchProjects();
          fetchStats();
        }}
        uploadType="sponsored-projects"
      />

      {/* Clear All Confirmation Dialog */}
      <Dialog open={isClearOpen} onOpenChange={setIsClearOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2 text-base">
              <AlertCircle className="w-5 h-5" />
              Clear Sponsored Project Records
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              Are you sure you want to delete all sponsored project records and attached documents in your scope? This action is irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsClearOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
              disabled={clearLoading}
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
    <AppShell currentPage="research-innovation" onNavigate={onNavigate}>
      {content}
    </AppShell>
  );
}

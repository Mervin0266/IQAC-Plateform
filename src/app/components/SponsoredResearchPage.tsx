import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  TrendingUp, FileText, Award, Users, Calendar,
  Building, CheckCircle, Clock, Plus, Search, Trash2, Edit,
  Eye, Download, AlertCircle, Upload, X, ExternalLink,
  Layers, ChevronRight, Check, RefreshCw, DollarSign, ShieldCheck, PieChart, Landmark
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
  startDate?: string | null;
  endDate?: string | null;
  sanctionedAmount: number | string;
  amountReceived?: number | string | null;
  status: string; // 'Ongoing' | 'Completed' | 'Sanctioned' | 'Proposal Submitted' | 'Terminated'
  progressPercentage?: number | null;
  department?: string;
  academicYear: string;
  projectUrl?: string | null;
  description?: string | null;
  approvalStatus?: string;
  createdAt?: string;
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

const EMPTY_FORM: Omit<SponsoredProjectItem, 'id' | 'createdAt' | 'creator'> = {
  title: '',
  principalInvestigator: '',
  coInvestigators: '',
  fundingAgency: '',
  scheme: '',
  agencyType: 'Government (National)',
  sanctionOrderNo: '',
  sanctionDate: '',
  startDate: '',
  endDate: '',
  sanctionedAmount: 0,
  amountReceived: 0,
  status: 'Ongoing',
  progressPercentage: 0,
  department: '',
  academicYear: '2024-2025',
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
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  // Add / Edit Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<SponsoredProjectItem | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // View Details Drawer / Modal
  const [viewingProject, setViewingProject] = useState<SponsoredProjectItem | null>(null);

  // Bulk Upload Modal
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState('');
  const [bulkDefaultYear, setBulkDefaultYear] = useState('2024-2025');
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

  const academicYears = useMemo(() => {
    const current = new Date().getFullYear();
    const list: string[] = [];
    for (let y = current + 1; y >= current - 5; y--) {
      list.push(`${y}-${y + 1}`);
    }
    return list;
  }, []);

  // Fetch Projects from Backend
  const fetchProjects = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus !== 'all') params.append('status', selectedStatus);
      if (selectedAgencyType !== 'all') params.append('agencyType', selectedAgencyType);
      if (selectedYear !== 'all') params.append('academicYear', selectedYear);
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
      if (selectedYear !== 'all') params.append('academicYear', selectedYear);
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

  // Handle Form Open for Add
  const handleOpenAdd = () => {
    setEditingProject(null);
    setFormData({
      ...EMPTY_FORM,
      department: authUser?.department || (departments[0] || '')
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Handle Form Open for Edit
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
      sanctionDate: proj.sanctionDate || '',
      startDate: proj.startDate || '',
      endDate: proj.endDate || '',
      sanctionedAmount: proj.sanctionedAmount || 0,
      amountReceived: proj.amountReceived || 0,
      status: proj.status || 'Ongoing',
      progressPercentage: proj.progressPercentage || 0,
      department: proj.department || '',
      academicYear: proj.academicYear || '2024-2025',
      projectUrl: proj.projectUrl || '',
      description: proj.description || '',
      approvalStatus: proj.approvalStatus || 'approved'
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  // Form Submit Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.title.trim()) errors.title = 'Project Title is required';
    if (!formData.principalInvestigator.trim()) errors.principalInvestigator = 'Principal Investigator (PI) is required';
    if (!formData.fundingAgency.trim()) errors.fundingAgency = 'Funding Agency name is required';
    if (Number(formData.sanctionedAmount) < 0) errors.sanctionedAmount = 'Sanctioned amount must be positive';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
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
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.success) {
        setIsFormOpen(false);
        fetchProjects();
        fetchStats();
      } else {
        setFormErrors({ submit: data.message || 'Operation failed' });
      }
    } catch (err: any) {
      setFormErrors({ submit: err.message || 'Connection error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Project Handler
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this sponsored research grant record?')) return;
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
      const res = await fetch(`${API_BASE}/api/sponsored-projects/clear-all`, {
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
      'Start Date': p.startDate || '-',
      'End Date': p.endDate || '-',
      'Sanctioned Amount (INR)': Number(p.sanctionedAmount) || 0,
      'Amount Received (INR)': Number(p.amountReceived) || 0,
      'Status': p.status,
      'Milestone Progress (%)': p.progressPercentage ?? (p.status === 'Completed' ? 100 : 50),
      'Department': p.department || '-',
      'Academic Year': p.academicYear,
      'Project Portal URL': p.projectUrl || '-',
      'Description / Scope': p.description || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sponsored_Projects');

    const fileName = `sponsored_research_grants_${new Date().toISOString().split('T')[0]}.${format}`;
    if (format === 'xlsx') {
      XLSX.writeFile(wb, fileName);
    } else {
      XLSX.writeFile(wb, fileName, { bookType: 'csv' });
    }
  };

  // Format INR Currency nicely
  const formatCurrency = (amount: number | string | undefined | null) => {
    const num = Number(amount) || 0;
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  // Status Badge Colors
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('completed')) {
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-[11px] font-medium">Completed</Badge>;
    }
    if (s.includes('ongoing')) {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 text-[11px] font-medium">Ongoing Research</Badge>;
    }
    if (s.includes('sanction')) {
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-[11px] font-medium">Sanctioned</Badge>;
    }
    if (s.includes('proposal') || s.includes('submit')) {
      return <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 text-[11px] font-medium">Under Review</Badge>;
    }
    return <Badge variant="outline" className="text-gray-700 text-[11px] capitalize">{status}</Badge>;
  };

  // Agency Type Badges
  const getAgencyBadge = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('international')) {
      return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">International</Badge>;
    }
    if (t.includes('industry') || t.includes('corporate')) {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]">Industry Sponsored</Badge>;
    }
    if (t.includes('seed') || t.includes('internal')) {
      return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">Seed Money</Badge>;
    }
    return <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-[10px]">Govt Grant</Badge>;
  };

  // ----------------------------------------------------
  // ROBUST BULK UPLOAD HANDLING (EXCEL & CSV)
  // ----------------------------------------------------
  const extractProjectValue = (row: any, ...aliases: string[]): any => {
    if (!row || typeof row !== 'object') return '';
    const rowKeys = Object.keys(row);
    for (const alias of aliases) {
      const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const rk of rowKeys) {
        const cleanRk = rk.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanRk === cleanAlias && row[rk] !== undefined && row[rk] !== null && String(row[rk]).trim() !== '') {
          return row[rk];
        }
      }
    }
    return '';
  };

  const formatProjectDate = (val: any): string | null => {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val.getTime())) {
      return val.toISOString().split('T')[0];
    }
    if (typeof val === 'number') {
      const d = new Date((val - 25569) * 86400 * 1000);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    const str = String(val).trim();
    if (!str) return null;
    const lower = str.toLowerCase();
    if (['n/a', 'na', 'nil', 'null', '-', '--', 'pending', 'under examination', 'not applicable', 'none', 'tbd', 'ongoing'].includes(lower)) {
      return null;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    const parts = str.split(/[\/\-\.]/);
    if (parts.length === 3) {
      let p1 = parts[0].trim();
      let p2 = parts[1].trim();
      let p3 = parts[2].trim();
      if (p1.length === 4) {
        return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
      }
      let day = p1.padStart(2, '0');
      let month = p2.padStart(2, '0');
      let year = p3.length === 2 ? '20' + p3 : p3;
      const m = parseInt(month, 10);
      const d = parseInt(day, 10);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${year}-${month}-${day}`;
      }
    }
    if (/^\d{4}$/.test(str)) return `${str}-01-01`;

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const iso = d.toISOString().split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
    }
    return null;
  };

  // Download Sample Bulk Templates
  const handleDownloadBulkTemplate = (format: 'csv' | 'xlsx') => {
    const headers = [
      'Project Title',
      'Principal Investigator',
      'Co-Investigators',
      'Funding Agency',
      'Scheme / Program',
      'Agency Type',
      'Sanction Order No',
      'Sanction Date',
      'Start Date',
      'End Date',
      'Sanctioned Amount (INR)',
      'Amount Received (INR)',
      'Status',
      'Progress (%)',
      'Department',
      'Academic Year',
      'Project URL',
      'Description'
    ];

    const sampleRows = [
      [
        'Development of Edge AI Gateway and Deep Learning Sensors for Real-Time Cardiac Monitoring',
        'Dr. Rajesh Kumar',
        'Dr. Priya Sharma, Dr. Arun Kumar',
        'Department of Science & Technology (DST - SERB)',
        'Core Research Grant (CRG)',
        'Government (National)',
        'DST/SERB/CRG/2023/004821',
        '2023-09-15',
        '2023-10-01',
        '2026-09-30',
        4850000,
        2800000,
        'Ongoing',
        65,
        'Computer Science and Engineering',
        '2024-2025',
        'https://serbonline.in',
        'Miniaturized wearable ECG/SpO2 IoT edge devices with sub-10ms anomaly detection.'
      ],
      [
        'Sustainable High-Performance Geopolymer Structural Binders Utilizing Fly Ash and Slag',
        'Dr. Suresh Menon',
        'Dr. Anita Rao',
        'AICTE - Research Promotion Scheme (RPS)',
        'Research Promotion Scheme (RPS)',
        'Government (National)',
        'AICTE/RPS/CIVIL/2023/892',
        '2023-11-20',
        '2024-01-05',
        '2026-01-04',
        2200000,
        1450000,
        'Ongoing',
        50,
        'Civil Engineering',
        '2024-2025',
        'https://aicte-india.org',
        'Experimental investigation of zero-cement alkali-activated green concrete.'
      ]
    ];

    const fileName = `sponsored_research_template.${format}`;
    if (format === 'csv') {
      const csvContent = headers.join(',') + '\n' + sampleRows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      XLSX.writeFile(wb, fileName);
    }
  };

  // Handle Bulk File Upload Parse with Validation
  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.csv') && !lower.endsWith('.xlsx') && !lower.endsWith('.xls')) {
      setBulkErrors(['Please upload a valid CSV or Excel file (.csv, .xlsx, .xls).']);
      return;
    }

    setBulkFile(file);
    setBulkErrors([]);
    setBulkSuccess('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result;
        if (!buffer) return;

        const workbook = XLSX.read(new Uint8Array(buffer as ArrayBuffer), {
          type: 'array',
          cellDates: true,
          dateNF: 'yyyy-mm-dd'
        });
        const sheetName = workbook.SheetNames[0];
        const rawParsedRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

        if (rawParsedRows.length === 0) {
          setBulkErrors(['The uploaded file contains no data rows.']);
          setBulkPreview([]);
          return;
        }

        const errors: string[] = [];
        const validated: any[] = [];

        rawParsedRows.forEach((row: any, idx: number) => {
          const title = extractProjectValue(
            row,
            'Project Title', 'Title', 'Title of Project', 'Project Name',
            'Research Title', 'Name of Project', 'Title of Research Project', 'Grant Title'
          );
          const pi = extractProjectValue(
            row,
            'Principal Investigator', 'PI', 'Principal Investigator (PI)', 'PI Name',
            'Name of PI', 'Project Leader', 'Lead Investigator', 'Faculty Name',
            'Name of Principal Investigator', 'Investigator', 'Author Name'
          );
          const coPi = extractProjectValue(
            row,
            'Co-Investigators', 'Co Investigators', 'Co-PI', 'Co-Principal Investigator',
            'Co PIs', 'Co-PIs', 'Other Investigators', 'Team Members', 'Team'
          );
          const agency = extractProjectValue(
            row,
            'Funding Agency', 'Agency', 'Sponsoring Agency', 'Funding Organization',
            'Organization', 'Sponsor', 'Funding Body', 'Name of Agency'
          );
          const scheme = extractProjectValue(
            row,
            'Scheme', 'Funding Scheme', 'Scheme / Program', 'Scheme Name',
            'Call', 'Program', 'Subcategory', 'Grant Scheme'
          );
          const agencyType = extractProjectValue(
            row,
            'Agency Type', 'Funding Type', 'Type of Agency', 'Category', 'Sponsor Type'
          ) || 'Government (National)';
          const sanctionOrderNo = extractProjectValue(
            row,
            'Sanction Order No', 'Sanction Order Number', 'Sanction Number',
            'Sanction No', 'Sanction Order No.', 'Project ID', 'Sanction Reference',
            'Reference No', 'Ref No', 'Order No'
          );
          const sanctionDate = formatProjectDate(extractProjectValue(
            row,
            'Sanction Date', 'Award Date', 'Date of Sanction', 'Sanctioned Date', 'Grant Date'
          ));
          const startDate = formatProjectDate(extractProjectValue(
            row,
            'Start Date', 'Commencement Date', 'Date of Commencement', 'Project Start Date', 'Date'
          ));
          const endDate = formatProjectDate(extractProjectValue(
            row,
            'End Date', 'Completion Date', 'Date of Completion', 'Project End Date', 'Target Date'
          ));
          const rawSanctionedAmount = extractProjectValue(
            row,
            'Sanctioned Amount (INR)', 'Sanctioned Amount', 'Grant Amount', 'Sanction Amount',
            'Total Grant (INR)', 'Amount Sanctioned', 'Amount', 'Total Grant', 'Grant Value'
          );
          const rawAmountReceived = extractProjectValue(
            row,
            'Amount Received (INR)', 'Amount Received', 'Funds Released', 'Funds Released (INR)',
            'Funds Received', 'Received Amount (INR)', 'Released Amount'
          );
          const rawStatus = extractProjectValue(
            row,
            'Status', 'Project Status', 'Current Status', 'Stage'
          ) || 'Ongoing';
          const rawProgress = extractProjectValue(
            row,
            'Progress (%)', 'Progress', 'Milestone Progress', 'Completion (%)', 'Percentage'
          );
          const rawDept = extractProjectValue(
            row,
            'Department', 'Dept', 'Host Department', 'Department Name', 'School', 'Branch'
          ) || authUser?.department || 'General';
          const rawYear = extractProjectValue(
            row,
            'Academic Year', 'Year', 'AY', 'Period', 'Session'
          ) || bulkDefaultYear || '2024-2025';
          const projectUrl = extractProjectValue(
            row,
            'Project URL', 'URL', 'Link', 'Document URL', 'Website', 'Project Link', 'Project Portal URL'
          );
          const description = extractProjectValue(
            row,
            'Description', 'Project Summary', 'Abstract', 'Objectives', 'Brief Description', 'Summary', 'Description / Scope'
          );

          // Skip completely empty rows
          if (!String(title).trim() && !String(pi).trim() && !String(agency).trim() && !String(rawSanctionedAmount).trim()) {
            return;
          }

          const rowNum = idx + 1;
          const missing: string[] = [];
          if (!String(title).trim()) missing.push('Project Title');
          if (!String(pi).trim()) missing.push('Principal Investigator');
          if (!String(agency).trim()) missing.push('Funding Agency');

          if (missing.length > 0) {
            errors.push(`Row ${rowNum}: Missing required ${missing.join(', ')}`);
          }

          const sanctionedAmount = typeof rawSanctionedAmount === 'number'
            ? rawSanctionedAmount
            : parseFloat(String(rawSanctionedAmount || '0').replace(/[^0-9.]/g, '')) || 0;

          const amountReceived = typeof rawAmountReceived === 'number'
            ? rawAmountReceived
            : (rawAmountReceived ? parseFloat(String(rawAmountReceived).replace(/[^0-9.]/g, '')) || 0 : sanctionedAmount);

          let progress = parseInt(String(rawProgress || ''), 10);
          if (isNaN(progress)) {
            const stLower = String(rawStatus).toLowerCase();
            progress = stLower.includes('complete') ? 100 : (stLower.includes('sanction') ? 10 : 50);
          }

          validated.push({
            title: String(title).trim(),
            principalInvestigator: String(pi).trim(),
            coInvestigators: coPi ? String(coPi).trim() : null,
            fundingAgency: String(agency).trim(),
            scheme: scheme ? String(scheme).trim() : null,
            agencyType: String(agencyType).trim(),
            sanctionOrderNo: sanctionOrderNo ? String(sanctionOrderNo).trim() : null,
            sanctionDate,
            startDate,
            endDate,
            sanctionedAmount,
            amountReceived,
            status: String(rawStatus).trim(),
            progressPercentage: progress,
            department: String(rawDept).trim(),
            academicYear: String(rawYear).trim(),
            projectUrl: projectUrl ? String(projectUrl).trim() : null,
            description: description ? String(description).trim() : null,
            isValid: missing.length === 0,
            missingFields: missing
          });
        });

        if (validated.length === 0) {
          setBulkErrors(['No valid data rows found. Please check your file content.']);
          setBulkPreview([]);
          return;
        }

        setBulkErrors(errors);
        setBulkPreview(validated);
      } catch (err: any) {
        console.error('File parsing error:', err);
        setBulkErrors([`Failed to parse file: ${err.message || 'Unknown format error'}`]);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Submit Bulk Upload
  const handleExecuteBulkUpload = async () => {
    const validRows = bulkPreview.filter(r => r.isValid);
    if (validRows.length === 0) {
      setBulkErrors(['No valid rows to upload. Please fix the missing required fields first.']);
      return;
    }

    setBulkLoading(true);
    setBulkErrors([]);
    setBulkSuccess('');

    try {
      const res = await fetch(`${API_BASE}/api/sponsored-projects/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items: validRows,
          defaultDepartment: authUser?.department || 'General',
          defaultYear: bulkDefaultYear
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBulkSuccess(`Successfully imported ${data.count || validRows.length} sponsored research project(s).`);
        fetchProjects();
        if (typeof fetchStats === 'function') fetchStats();
        setTimeout(() => {
          setIsBulkOpen(false);
          setBulkFile(null);
          setBulkPreview([]);
          setBulkSuccess('');
        }, 1500);
      } else {
        const errorMsg = data.message || 'Failed to upload research records.';
        const detailedErrors: string[] = data.errors && Array.isArray(data.errors) ? data.errors : [errorMsg];
        setBulkErrors(detailedErrors);
      }
    } catch (err: any) {
      console.error('Bulk upload execution error:', err);
      setBulkErrors(['Server communication error during bulk upload.']);
    } finally {
      setBulkLoading(false);
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Academics' },
          { label: 'Research' },
          { label: 'Sponsored Research' }
        ]}
        title="Sponsored Research Grants"
        badge="NAAC 3.1 & NIRF"
        description="Track funded research projects, principal investigators, funding agencies, sanctioned grants, and milestone deliverables."
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
              className="bg-[#2F4692] hover:bg-[#243A7A] text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Add Grant</span>
            </Button>
          </div>
        }
      />

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total Grants"
          value={stats?.totalProjects ?? projects.length}
          subtitle="Across active departments"
          icon={FileText}
        />
        <StatCard
          title="Total Sanctioned"
          value={formatCurrency(stats?.totalSanctionedAmount ?? projects.reduce((sum, p) => sum + (Number(p.sanctionedAmount) || 0), 0))}
          subtitle="Aggregate awarded funding"
          icon={DollarSign}
        />
        <StatCard
          title="Funds Received"
          value={formatCurrency(stats?.totalFundsReceived ?? projects.reduce((sum, p) => sum + (Number(p.amountReceived) || 0), 0))}
          subtitle="Installments credited to date"
          icon={Landmark}
        />
        <StatCard
          title="Ongoing Projects"
          value={stats?.ongoingCount ?? projects.filter(p => (p.status || '').toLowerCase().includes('ongoing')).length}
          subtitle="Active milestone tracking"
          icon={Clock}
        />
        <StatCard
          title="Completed"
          value={stats?.completedCount ?? projects.filter(p => (p.status || '').toLowerCase().includes('complete')).length}
          subtitle="Finalized & UCs submitted"
          icon={CheckCircle}
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
                className="pl-9 h-9 text-xs border-gray-200 focus-visible:ring-[#2f4692]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-[150px]">
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

              <div className="w-[170px]">
                <Select value={selectedAgencyType} onValueChange={setSelectedAgencyType}>
                  <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                    <SelectValue placeholder="All Agency Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agency Types</SelectItem>
                    {AGENCY_TYPE_OPTIONS.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[130px]">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                    <SelectValue placeholder="Academic Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="2025-2026">2025-2026</SelectItem>
                    <SelectItem value="2024-2025">2024-2025</SelectItem>
                    <SelectItem value="2023-2024">2023-2024</SelectItem>
                    <SelectItem value="2022-2023">2022-2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[180px]">
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-md text-xs transition-colors ${viewMode === 'cards' ? 'bg-white text-[#2f4692] shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-900'}`}
                  title="Card View"
                >
                  <Layers className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md text-xs transition-colors ${viewMode === 'table' ? 'bg-white text-[#2f4692] shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-900'}`}
                  title="Table View"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Refresh Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { fetchProjects(); fetchStats(); }}
                className="h-9 w-9 p-0 text-gray-500 hover:text-gray-900"
                title="Refresh Sponsored Grants"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>

              {(selectedStatus !== 'all' || selectedAgencyType !== 'all' || selectedYear !== 'all' || selectedDept !== 'all' || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedStatus('all');
                    setSelectedAgencyType('all');
                    setSelectedYear('all');
                    setSelectedDept('all');
                    setSearchQuery('');
                  }}
                  className="text-xs text-red-600 hover:text-red-700 h-9 px-2"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main List Rendering */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-3 border-[#2f4692] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">Loading sponsored research grants...</p>
        </div>
      ) : projects.length === 0 ? (
        <Card className="border-dashed border-2 py-16 text-center border-gray-200 bg-white">
          <CardContent>
            <TrendingUp className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p className="text-base font-semibold text-gray-800">No sponsored research projects found</p>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              No grants matched your selected search and filtering criteria. Try modifying your filters or record a new sponsored grant.
            </p>
            <Button onClick={handleOpenAdd} size="sm" className="mt-4 bg-[#2f4692] text-white">
              <Plus className="w-4 h-4 mr-1.5" /> Add Sponsored Project
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'cards' ? (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => {
            const progressVal = proj.progressPercentage ?? (proj.status === 'Completed' ? 100 : (proj.status === 'Sanctioned' ? 15 : 50));
            return (
              <Card key={proj.id} className="shadow-sm hover:shadow-md transition-all border-gray-200 bg-white overflow-hidden flex flex-col justify-between relative group">
                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${proj.status === 'Completed' ? 'bg-emerald-500' : proj.status === 'Ongoing' ? 'bg-[#2f4692]' : 'bg-amber-500'}`} />

                <CardHeader className="pb-2 pt-4 pl-5 pr-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getStatusBadge(proj.status)}
                      {getAgencyBadge(proj.agencyType)}
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal text-gray-600">
                        AY {proj.academicYear}
                      </Badge>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-teal-700 font-mono bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {formatCurrency(proj.sanctionedAmount)}
                      </span>
                    </div>
                  </div>

                  <CardTitle className="text-base font-bold text-gray-900 leading-snug group-hover:text-[#2f4692] transition-colors line-clamp-2" title={proj.title}>
                    {proj.title}
                  </CardTitle>

                  <div className="text-xs text-gray-600 mt-1.5 flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="font-semibold text-gray-800 truncate" title={proj.principalInvestigator}>
                        PI: {proj.principalInvestigator}
                      </span>
                      {proj.coInvestigators && (
                        <span className="text-gray-500 text-[11px] truncate" title={proj.coInvestigators}>
                          (+ {proj.coInvestigators})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Building className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="font-medium text-gray-700 truncate" title={proj.fundingAgency}>
                        {proj.fundingAgency}
                      </span>
                      {proj.scheme && <span className="text-blue-600 font-mono">({proj.scheme})</span>}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pb-4 pt-1 pl-5 pr-4 text-xs">
                  {proj.description && (
                    <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-150 line-clamp-2 mb-3 leading-relaxed">
                      {proj.description}
                    </p>
                  )}

                  {/* Milestone Progress Bar */}
                  <div className="mb-3 space-y-1">
                    <div className="flex justify-between items-center text-[11px] font-medium text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" /> Milestone Progress
                      </span>
                      <span className="font-mono font-bold text-gray-800">{progressVal}%</span>
                    </div>
                    <div className="w-full bg-gray-150 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${proj.status === 'Completed' ? 'bg-emerald-500' : 'bg-[#2f4692]'}`}
                        style={{ width: `${progressVal}%` }}
                      />
                    </div>
                  </div>

                  {/* Financial Mini Summary */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px] mb-3">
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase">Sanctioned</span>
                      <span className="font-mono font-bold text-gray-900">{formatCurrency(proj.sanctionedAmount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px] uppercase">Funds Released</span>
                      <span className="font-mono font-bold text-emerald-700">{formatCurrency(proj.amountReceived || proj.sanctionedAmount)}</span>
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 mt-2">
                    <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                      {proj.sanctionOrderNo ? (
                        <span className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 truncate max-w-[170px]" title={proj.sanctionOrderNo}>
                          Ref: {proj.sanctionOrderNo}
                        </span>
                      ) : (
                        <span>{proj.department || 'Christ University'}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingProject(proj)}
                        className="h-7 w-7 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                        title="View Full Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>

                      {isPrivileged && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(proj)}
                            className="h-7 w-7 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                            title="Edit Grant Record"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(proj.id)}
                            className="h-7 w-7 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                            title="Delete Record"
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
        <Card className="border-gray-200 shadow-sm bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 min-w-[240px]">Project Title & PI</th>
                  <th className="py-3 px-4 min-w-[180px]">Funding Agency & Scheme</th>
                  <th className="py-3 px-4 min-w-[120px]">Sanction Ref</th>
                  <th className="py-3 px-4 text-right min-w-[130px]">Grant Value</th>
                  <th className="py-3 px-4 text-center min-w-[110px]">Status</th>
                  <th className="py-3 px-4 min-w-[110px]">Progress</th>
                  <th className="py-3 px-4 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {projects.map((proj, idx) => {
                  const progressVal = proj.progressPercentage ?? (proj.status === 'Completed' ? 100 : 50);
                  return (
                    <tr key={proj.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-gray-400">{idx + 1}</td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 line-clamp-2 max-w-[280px]" title={proj.title}>
                          {proj.title}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-gray-700">PI: {proj.principalInvestigator}</span>
                          {proj.department && <span className="text-gray-400">• {proj.department}</span>}
                          <span className="text-gray-400">• AY {proj.academicYear}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-800">{proj.fundingAgency}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {getAgencyBadge(proj.agencyType)}
                          {proj.scheme && <span className="text-[10px] text-gray-500 truncate max-w-[120px]">{proj.scheme}</span>}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-gray-600">
                        {proj.sanctionOrderNo ? (
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                            {proj.sanctionOrderNo}
                          </span>
                        ) : '-'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold text-teal-800">{formatCurrency(proj.sanctionedAmount)}</div>
                        {proj.amountReceived ? (
                          <div className="text-[10px] text-gray-500 font-mono">Rec: {formatCurrency(proj.amountReceived)}</div>
                        ) : null}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(proj.status)}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${proj.status === 'Completed' ? 'bg-emerald-500' : 'bg-[#2f4692]'}`}
                              style={{ width: `${progressVal}%` }}
                            />
                          </div>
                          <span className="font-mono text-[10px] text-gray-600 font-semibold">{progressVal}%</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
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

      {/* ADD / EDIT PROJECT DIALOG */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white p-6 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#2f4692]" />
              <span>{editingProject ? 'Edit Sponsored Research Project' : 'Record New Sponsored Research Grant'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Fill in all sanctioned grant details, Principal Investigator information, and milestone deliverables.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 py-2 text-xs">
            {formErrors.submit && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formErrors.submit}</span>
              </div>
            )}

            {/* Project Title */}
            <div>
              <Label className="text-xs font-semibold text-gray-700">Project Title <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Full sanctioned project title..."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
              {formErrors.title && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.title}</p>}
            </div>

            {/* PI & Co-PIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Principal Investigator (PI) <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g., Dr. Rajesh Kumar"
                  value={formData.principalInvestigator}
                  onChange={(e) => setFormData({ ...formData, principalInvestigator: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
                {formErrors.principalInvestigator && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.principalInvestigator}</p>}
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Co-Investigators (Co-PI)</Label>
                <Input
                  placeholder="e.g., Dr. Priya Sharma, Dr. Arun Kumar"
                  value={formData.coInvestigators || ''}
                  onChange={(e) => setFormData({ ...formData, coInvestigators: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {/* Funding Agency & Scheme */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Funding Agency <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g., DST - SERB, AICTE, ICMR, ISRO"
                  value={formData.fundingAgency}
                  onChange={(e) => setFormData({ ...formData, fundingAgency: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
                {formErrors.fundingAgency && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.fundingAgency}</p>}
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Scheme / Program Name</Label>
                <Input
                  placeholder="e.g., Core Research Grant (CRG), RPS, FIST"
                  value={formData.scheme || ''}
                  onChange={(e) => setFormData({ ...formData, scheme: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {/* Agency Type & Sanction Order Number */}
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
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {/* Financial Amounts (Sanctioned & Received) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Total Sanctioned Grant Amount (₹) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 4850000"
                  value={formData.sanctionedAmount}
                  onChange={(e) => setFormData({ ...formData, sanctionedAmount: parseFloat(e.target.value) || 0 })}
                  className="mt-1 h-9 text-xs font-mono"
                />
                {formErrors.sanctionedAmount && <p className="text-[11px] text-red-500 mt-0.5">{formErrors.sanctionedAmount}</p>}
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Amount Received to Date (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 2800000"
                  value={formData.amountReceived || 0}
                  onChange={(e) => setFormData({ ...formData, amountReceived: parseFloat(e.target.value) || 0 })}
                  className="mt-1 h-9 text-xs font-mono text-emerald-800"
                />
              </div>
            </div>

            {/* Timeline Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-700">Sanction Date</Label>
                <Input
                  type="date"
                  value={formData.sanctionDate || ''}
                  onChange={(e) => setFormData({ ...formData, sanctionDate: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Start Date</Label>
                <Input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Completion / End Date</Label>
                <Input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {/* Status, Progress & Academic Year */}
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
                  className="mt-1 h-9 text-xs font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Academic Year</Label>
                <Select
                  value={formData.academicYear}
                  onValueChange={(val) => setFormData({ ...formData, academicYear: val })}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs bg-white">
                    <SelectValue placeholder="Academic Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025-2026">2025-2026</SelectItem>
                    <SelectItem value="2024-2025">2024-2025</SelectItem>
                    <SelectItem value="2023-2024">2023-2024</SelectItem>
                    <SelectItem value="2022-2023">2022-2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Department & Portal Link */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div>
                <Label className="text-xs font-semibold text-gray-700">Project / Sanction Letter URL</Label>
                <Input
                  placeholder="https://serbonline.in/grant/..."
                  value={formData.projectUrl || ''}
                  onChange={(e) => setFormData({ ...formData, projectUrl: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {/* Project Summary / Scope */}
            <div>
              <Label className="text-xs font-semibold text-gray-700">Project Objectives & Deliverables Summary</Label>
              <textarea
                rows={3}
                placeholder="Brief summary of research scope, objectives, experimental setup, and anticipated deliverables..."
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full mt-1 p-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2f4692]"
              />
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
                className="bg-[#2f4692] text-white hover:bg-[#243a7a] text-xs font-semibold"
              >
                {submitting ? 'Saving...' : editingProject ? 'Update Grant' : 'Record Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW DETAILS MODAL */}
      <Dialog open={!!viewingProject} onOpenChange={(open) => !open && setViewingProject(null)}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto bg-white p-6 rounded-xl">
          {viewingProject && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(viewingProject.status)}
                  {getAgencyBadge(viewingProject.agencyType)}
                  <Badge variant="secondary" className="text-[10px]">AY {viewingProject.academicYear}</Badge>
                </div>
                <DialogTitle className="text-lg font-bold text-gray-900 leading-snug">
                  {viewingProject.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Host Department: <span className="font-semibold text-gray-700">{viewingProject.department || 'General'}</span>
                </DialogDescription>
              </DialogHeader>

              {/* Research Team Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#2f4692]" />
                  <span className="font-semibold text-gray-900">Principal Investigator:</span>
                  <span className="font-bold text-[#2f4692]">{viewingProject.principalInvestigator}</span>
                </div>
                {viewingProject.coInvestigators && (
                  <div className="text-gray-600 pl-6">
                    <span className="font-medium text-gray-700">Co-Investigators:</span> {viewingProject.coInvestigators}
                  </div>
                )}
              </div>

              {/* Funding Breakdown */}
              <div className="grid grid-cols-2 gap-3 bg-teal-50/50 border border-teal-100 rounded-lg p-3 text-xs">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold">Total Grant Sanctioned</span>
                  <span className="text-lg font-bold font-mono text-teal-900">{formatCurrency(viewingProject.sanctionedAmount)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-semibold">Funds Received</span>
                  <span className="text-lg font-bold font-mono text-emerald-700">
                    {formatCurrency(viewingProject.amountReceived || viewingProject.sanctionedAmount)}
                  </span>
                </div>
              </div>

              {/* Agency & Sanction Details */}
              <div className="grid grid-cols-2 gap-3 text-xs border border-gray-150 rounded-lg p-3 bg-white">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Funding Agency</span>
                  <span className="font-semibold text-gray-800">{viewingProject.fundingAgency}</span>
                  {viewingProject.scheme && <p className="text-[11px] text-blue-600 font-mono mt-0.5">Scheme: {viewingProject.scheme}</p>}
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-semibold">Sanction Order Reference</span>
                  <span className="font-mono text-gray-700">{viewingProject.sanctionOrderNo || 'N/A'}</span>
                </div>
              </div>

              {/* Timeline Dates */}
              <div className="grid grid-cols-3 gap-2 text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                <div>
                  <span className="text-gray-400 text-[10px] block">Sanction Date</span>
                  <span className="font-medium text-gray-800">{viewingProject.sanctionDate ? new Date(viewingProject.sanctionDate).toLocaleDateString() : '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">Commencement</span>
                  <span className="font-medium text-gray-800">{viewingProject.startDate ? new Date(viewingProject.startDate).toLocaleDateString() : '-'}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">Completion Date</span>
                  <span className="font-medium text-gray-800">{viewingProject.endDate ? new Date(viewingProject.endDate).toLocaleDateString() : '-'}</span>
                </div>
              </div>

              {/* Scope & Objectives */}
              {viewingProject.description && (
                <div className="space-y-1 text-xs">
                  <h4 className="font-semibold text-gray-900">Project Scope & Objectives</h4>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-150 leading-relaxed">
                    {viewingProject.description}
                  </p>
                </div>
              )}

              {/* Project Portal URL */}
              {viewingProject.projectUrl && (
                <div className="pt-1">
                  <a
                    href={viewingProject.projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
                  >
                    <span>View Grant Document / Project Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              <DialogFooter className="pt-3 border-t border-gray-150">
                <Button variant="outline" size="sm" onClick={() => setViewingProject(null)} className="text-xs">
                  Close
                </Button>
                {isPrivileged && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const p = viewingProject;
                      setViewingProject(null);
                      handleOpenEdit(p);
                    }}
                    className="bg-[#2f4692] text-white text-xs"
                  >
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit Project
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------- */}
      {/* BULK UPLOAD MODAL (EXCEL & CSV) - REDESIGNED */}
      {/* ---------------------------------------------------- */}
      <BulkUploadDialog
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        token={token || ''}
        onSuccess={fetchProjects}
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
              Are you sure you want to delete all sponsored project and grant records? This action is irreversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsClearOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={clearLoading}
              onClick={handleClearAll}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
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

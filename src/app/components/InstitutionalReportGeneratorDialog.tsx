import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import {
  FileText,
  FileSpreadsheet,
  Layers,
  Settings2,
  Calendar,
  Building,
  GraduationCap,
  Award,
  Briefcase,
  Download,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  Bookmark,
  History,
  Sparkles,
  TrendingUp,
  PieChart,
  BarChart3,
  Filter,
  Search,
  X,
  Trash2,
  RefreshCw,
  Clock,
  Save,
  Check,
  Info,
  Users,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Presentation
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SectionAccordionList } from './report-builder/SectionAccordionList';
import {
  GranularContentConfig,
  getDefaultGranularConfig,
  REPORT_FIELD_CATALOG
} from '../report-builder/reportFieldCatalog';

export interface InstitutionalReportGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialScope?: {
    campus?: string;
    school?: string;
    departments?: string[];
    academicYears?: string[];
  };
}

type BuilderStep = 'type_format' | 'scope_faculty' | 'content' | 'comparisons' | 'preview';

interface CampusItem {
  id: string;
  name: string;
}

interface SchoolItem {
  id: string;
  name: string;
  campusId?: string;
}

interface DepartmentItem {
  id: string;
  name: string;
  shortName?: string;
  schoolId?: string;
}

interface FacultyDirectoryItem {
  id: string;
  employeeId: string;
  name: string;
  department: string;
  designation?: string;
  highestQualification?: string;
}

export function InstitutionalReportGeneratorDialog({
  isOpen,
  onClose,
  initialScope
}: InstitutionalReportGeneratorDialogProps) {
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const isAdmin = Boolean(
    user && (
      user.role === 'admin' ||
      user.role === 'system_admin' ||
      user.role === 'iqac_admin' ||
      (user as any)?.isSystemAdmin
    )
  );

  // Step state
  const [currentStep, setCurrentStep] = useState<BuilderStep>('type_format');

  // STEP 1: REPORT TYPE & FORMAT
  const [reportType, setReportType] = useState<'summary' | 'analytical' | 'detailed'>('analytical');
  const [outputFormat, setOutputFormat] = useState<'pdf' | 'docx' | 'pptx'>('pdf');
  const [approvalStatus, setApprovalStatus] = useState<string>('Verified');
  const [showValidationDetails, setShowValidationDetails] = useState<boolean>(false);

  // V2.1 Granular Section-wise Field Configuration
  const [granularConfig, setGranularConfig] = useState<GranularContentConfig>(() =>
    getDefaultGranularConfig('analytical')
  );

  const handleReportTypeChange = (newType: 'summary' | 'analytical' | 'detailed') => {
    setReportType(newType);
    setGranularConfig(prev => {
      const next = getDefaultGranularConfig(newType);
      return {
        ...next,
        sections: {
          ...next.sections,
          ...prev.sections,
          comparativeAnalytics: newType === 'summary' ? false : prev.sections.comparativeAnalytics
        }
      };
    });
    setSubsections(prev => ({
      ...prev,
      charts: newType !== 'summary',
      detailedTables: newType === 'detailed'
    }));
  };

  // STEP 2: SCOPE & FACULTY FILTER
  const [campuses, setCampuses] = useState<CampusItem[]>([]);
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);

  const [selectedCampuses, setSelectedCampuses] = useState<string[]>(['All']);
  const [selectedSchools, setSelectedSchools] = useState<string[]>(['All']);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(['All']);

  const availableAcademicYears = [
    '2026-27',
    '2025-26',
    '2024-25',
    '2023-24',
    '2022-23',
    '2021-22',
    '2020-21'
  ];
  const [selectedYears, setSelectedYears] = useState<string[]>(['2026-27', '2025-26', '2024-25', '2023-24']);

  // Global Faculty Filter
  const [facultyMode, setFacultyMode] = useState<'all' | 'selected'>('all');
  const [facultyDirectory, setFacultyDirectory] = useState<FacultyDirectoryItem[]>([]);
  const [selectedFacultyEmpIds, setSelectedFacultyEmpIds] = useState<string[]>([]);
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [loadingFaculty, setLoadingFaculty] = useState(false);

  // Search filters inside scope selectors
  const [campusSearch, setCampusSearch] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [deptSearch, setDeptSearch] = useState('');

  // STEP 3: CONTENT CUSTOMIZATION
  const [sections, setSections] = useState({
    executiveOverview: true,
    academicFaculty: true,
    researchInnovation: true,
    placements: true,
    accreditation: true,
    comparativeAnalytics: true,
    insightsActionPlan: true,
    appendix: true
  });

  const [subsections, setSubsections] = useState({
    publications: true,
    quartiles: true,
    citations: true,
    patents: true,
    copyrights: true,
    consultancy: true,
    sponsoredProjects: true,
    awards: true,
    eContents: true,
    periodicals: true,
    kpiCards: true,
    summaryTables: true,
    detailedTables: true,
    charts: true
  });

  // STEP 4: COMPARISONS & ANALYTICS (6 Official Categories)
  const [comparisons, setComparisons] = useState({
    yearWise: true,
    departmentWise: true,
    schoolWise: true,
    campusWise: true,
    externalBenchmark: true,
    performanceTrends: true,
    quartileWise: true,
    targetVsActual: true
  });

  // STEP 5: DOCUMENT PREVIEW & EXPORT
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [refreshingSnapshot, setRefreshingSnapshot] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);

  // SAVED TEMPLATES & HISTORY DRAWERS
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [savedConfigs, setSavedConfigs] = useState<any[]>([]);
  const [reportHistory, setReportHistory] = useState<any[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveAsSystemTemplate, setSaveAsSystemTemplate] = useState(false);

  // Load Initial Scope & Metadata
  useEffect(() => {
    if (!isOpen) return;

    async function loadConfig() {
      try {
        const token = user?.token;
        const res = await fetch(`${API_URL}/api/institutional-analytics/report-config`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setCampuses(json.data.campuses || []);
            setSchools(json.data.schools || []);
            setDepartments(json.data.departments || []);
          }
        }
      } catch (err) {
        console.warn('Failed to load report configuration:', err);
      }
    }

    loadConfig();

    if (initialScope) {
      if (initialScope.campus) setSelectedCampuses([initialScope.campus]);
      if (initialScope.school) setSelectedSchools([initialScope.school]);
      if (initialScope.departments && initialScope.departments.length > 0) {
        setSelectedDepartments(initialScope.departments);
      }
      if (initialScope.academicYears && initialScope.academicYears.length > 0) {
        setSelectedYears(initialScope.academicYears);
      }
    }
  }, [isOpen, API_URL, user?.token]);

  // Load Faculty Directory for Global Faculty Filter
  useEffect(() => {
    if (!isOpen) return;

    async function loadFaculty() {
      setLoadingFaculty(true);
      try {
        const token = user?.token;
        const queryParams = new URLSearchParams();
        if (!selectedCampuses.includes('All')) {
          queryParams.append('campuses', selectedCampuses.join(','));
        }
        if (!selectedSchools.includes('All')) {
          queryParams.append('schools', selectedSchools.join(','));
        }
        if (!selectedDepartments.includes('All')) {
          queryParams.append('departments', selectedDepartments.join(','));
        }

        const res = await fetch(`${API_URL}/api/institutional-analytics/faculty-directory?${queryParams.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setFacultyDirectory(json.faculties || []);
          }
        }
      } catch (err) {
        console.warn('Failed to load faculty directory:', err);
      } finally {
        setLoadingFaculty(false);
      }
    }

    loadFaculty();
  }, [isOpen, selectedCampuses, selectedSchools, selectedDepartments, API_URL, user?.token]);

  // Dependent School filtering based on selected campuses
  const filteredSchoolsByCampus = useMemo(() => {
    if (selectedCampuses.includes('All') || selectedCampuses.length === 0) {
      return schools;
    }
    const campusIds = campuses
      .filter(c => selectedCampuses.includes(c.name) || selectedCampuses.includes(c.id))
      .map(c => c.id);
    return schools.filter(s => s.campusId && campusIds.includes(s.campusId));
  }, [schools, campuses, selectedCampuses]);

  // Dependent Department filtering based on selected schools
  const filteredDepartmentsBySchool = useMemo(() => {
    if (selectedSchools.includes('All') || selectedSchools.length === 0) {
      if (selectedCampuses.includes('All') || selectedCampuses.length === 0) {
        return departments;
      }
      const schoolIds = filteredSchoolsByCampus.map(s => s.id);
      return departments.filter(d => d.schoolId && schoolIds.includes(d.schoolId));
    }
    const schoolIds = filteredSchoolsByCampus
      .filter(s => selectedSchools.includes(s.name) || selectedSchools.includes(s.id))
      .map(s => s.id);
    return departments.filter(d => d.schoolId && schoolIds.includes(d.schoolId));
  }, [departments, filteredSchoolsByCampus, selectedSchools, selectedCampuses]);

  // Parent-child revalidation: if selected schools are not under selected campuses, clear them
  useEffect(() => {
    if (!selectedSchools.includes('All') && selectedSchools.length > 0) {
      const validNames = new Set(filteredSchoolsByCampus.map(s => s.name));
      const validIds = new Set(filteredSchoolsByCampus.map(s => s.id));
      const revalidated = selectedSchools.filter(s => validNames.has(s) || validIds.has(s));
      if (revalidated.length !== selectedSchools.length) {
        setSelectedSchools(revalidated.length > 0 ? revalidated : ['All']);
      }
    }
  }, [filteredSchoolsByCampus]);

  // Parent-child revalidation for departments
  useEffect(() => {
    if (!selectedDepartments.includes('All') && selectedDepartments.length > 0) {
      const validNames = new Set(filteredDepartmentsBySchool.map(d => d.name));
      const validShorts = new Set(filteredDepartmentsBySchool.map(d => d.shortName).filter(Boolean));
      const validIds = new Set(filteredDepartmentsBySchool.map(d => d.id));
      const revalidated = selectedDepartments.filter(d => validNames.has(d) || validShorts.has(d) || validIds.has(d));
      if (revalidated.length !== selectedDepartments.length) {
        setSelectedDepartments(revalidated.length > 0 ? revalidated : ['All']);
      }
    }
  }, [filteredDepartmentsBySchool]);

  // Search filtered lists
  const displayCampuses = useMemo(() => {
    if (!campusSearch.trim()) return campuses;
    return campuses.filter(c => c.name.toLowerCase().includes(campusSearch.toLowerCase()));
  }, [campuses, campusSearch]);

  const displaySchools = useMemo(() => {
    if (!schoolSearch.trim()) return filteredSchoolsByCampus;
    return filteredSchoolsByCampus.filter(s => s.name.toLowerCase().includes(schoolSearch.toLowerCase()));
  }, [filteredSchoolsByCampus, schoolSearch]);

  const displayDepartments = useMemo(() => {
    if (!deptSearch.trim()) return filteredDepartmentsBySchool;
    return filteredDepartmentsBySchool.filter(d =>
      d.name.toLowerCase().includes(deptSearch.toLowerCase()) ||
      (d.shortName && d.shortName.toLowerCase().includes(deptSearch.toLowerCase()))
    );
  }, [filteredDepartmentsBySchool, deptSearch]);

  const displayFaculties = useMemo(() => {
    if (!facultySearchQuery.trim()) return facultyDirectory;
    const q = facultySearchQuery.toLowerCase();
    return facultyDirectory.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.employeeId.toLowerCase().includes(q) ||
      f.department.toLowerCase().includes(q)
    );
  }, [facultyDirectory, facultySearchQuery]);

  // Scope toggle handlers
  const handleToggleCampus = (campusName: string) => {
    if (campusName === 'All') {
      setSelectedCampuses(['All']);
      return;
    }
    setSelectedCampuses(prev => {
      const withoutAll = prev.filter(c => c !== 'All');
      if (withoutAll.includes(campusName)) {
        const next = withoutAll.filter(c => c !== campusName);
        return next.length > 0 ? next : ['All'];
      } else {
        return [...withoutAll, campusName];
      }
    });
  };

  const handleToggleSchool = (schoolName: string) => {
    if (schoolName === 'All') {
      setSelectedSchools(['All']);
      return;
    }
    setSelectedSchools(prev => {
      const withoutAll = prev.filter(s => s !== 'All');
      if (withoutAll.includes(schoolName)) {
        const next = withoutAll.filter(s => s !== schoolName);
        return next.length > 0 ? next : ['All'];
      } else {
        return [...withoutAll, schoolName];
      }
    });
  };

  const handleToggleDepartment = (deptName: string) => {
    if (deptName === 'All') {
      setSelectedDepartments(['All']);
      return;
    }
    setSelectedDepartments(prev => {
      const withoutAll = prev.filter(d => d !== 'All');
      if (withoutAll.includes(deptName)) {
        const next = withoutAll.filter(d => d !== deptName);
        return next.length > 0 ? next : ['All'];
      } else {
        return [...withoutAll, deptName];
      }
    });
  };

  const handleToggleYear = (year: string) => {
    setSelectedYears(prev => {
      if (prev.includes(year)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(y => y !== year);
      } else {
        return [...prev, year];
      }
    });
  };

  const handleToggleFaculty = (empId: string) => {
    setSelectedFacultyEmpIds(prev => {
      if (prev.includes(empId)) {
        return prev.filter(id => id !== empId);
      } else {
        return [...prev, empId];
      }
    });
  };

  // Generate Preview Handler
  const handleFetchPreview = async () => {
    setLoadingPreview(true);
    setPreviewError(null);
    try {
      const token = user?.token;
      const payload = {
        reportType,
        outputFormat,
        approvalStatus,
        scopeConfig: {
          campuses: selectedCampuses,
          schools: selectedSchools,
          departments: selectedDepartments,
          academicYears: selectedYears,
          facultyMode,
          selectedFacultyEmpIds
        },
        contentConfig: {
          sections: granularConfig.sections,
          subsections,
          fieldSelections: granularConfig.fieldSelections,
          placementRecords: granularConfig.placementRecords
        },
        comparisonConfig: {
          dimensions: Object.keys(comparisons).filter(k => (comparisons as any)[k])
        }
      };

      const res = await fetch(`${API_URL}/api/institutional-analytics/builder-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to generate report preview.');
      }

      const json = await res.json();
      if (json.success && json.reportData) {
        setPreviewData(json.reportData);
        setCurrentPageIndex(0);
      } else {
        throw new Error('Invalid preview response structure.');
      }
    } catch (err: any) {
      setPreviewError(err.message || 'Failed to load report preview.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Auto-fetch preview when navigating to preview step
  useEffect(() => {
    if (currentStep === 'preview') {
      handleFetchPreview();
    }
  }, [currentStep]);

  // Refresh Snapshot Handler (Recalculates fresh data and issues a new point-in-time snapshot)
  const handleRefreshSnapshot = async () => {
    const currentSnapId = previewData?.snapshotId || previewData?.meta?.snapshotId;
    if (!currentSnapId) {
      await handleFetchPreview();
      return;
    }
    setRefreshingSnapshot(true);
    setPreviewError(null);
    try {
      const token = user?.token;
      const res = await fetch(`${API_URL}/api/institutional-analytics/report-builder/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ snapshotId: currentSnapId })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to refresh snapshot.');
      }
      const json = await res.json();
      if (json.success && json.reportData) {
        setPreviewData(json.reportData);
        setExportSuccessMessage(`Snapshot refreshed (New ID: ${json.reportData.snapshotId || json.reportData.meta?.snapshotId})`);
        setTimeout(() => setExportSuccessMessage(null), 3500);
      }
    } catch (err: any) {
      setPreviewError(err.message || 'Failed to refresh snapshot.');
    } finally {
      setRefreshingSnapshot(false);
    }
  };

  // Export Document Handler (Consumes identical point-in-time snapshot)
  const handleExport = async (formatOverride?: 'pdf' | 'docx' | 'pptx') => {
    const fmt = formatOverride || outputFormat;
    setIsExporting(true);
    setPreviewError(null);
    setExportSuccessMessage(null);

    try {
      const token = user?.token;
      const payload = {
        name: `CHRIST IQAC Report (${reportType.toUpperCase()})`,
        reportType,
        outputFormat: fmt,
        approvalStatus,
        snapshotId: previewData?.snapshotId || previewData?.meta?.snapshotId,
        scopeConfig: {
          campuses: selectedCampuses,
          schools: selectedSchools,
          departments: selectedDepartments,
          academicYears: selectedYears,
          facultyMode,
          selectedFacultyEmpIds
        },
        contentConfig: {
          sections: granularConfig.sections,
          subsections,
          fieldSelections: granularConfig.fieldSelections,
          placementRecords: granularConfig.placementRecords
        },
        comparisonConfig: {
          dimensions: Object.keys(comparisons).filter(k => (comparisons as any)[k])
        }
      };

      const res = await fetch(`${API_URL}/api/institutional-analytics/builder-export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed to export ${fmt.toUpperCase()} document.`);
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      let ext = 'pdf';
      if (fmt === 'docx') ext = 'docx';
      else if (fmt === 'pptx') ext = 'pptx';
      let filename = `CHRIST_IQAC_Report_${reportType.toUpperCase()}.${ext}`;
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setExportSuccessMessage(`${fmt.toUpperCase()} document downloaded successfully.`);
      setTimeout(() => setExportSuccessMessage(null), 4000);
    } catch (err: any) {
      setPreviewError(err.message || 'Export failed.');
    } finally {
      setIsExporting(false);
    }
  };

  // Saved Templates CRUD
  const handleLoadSavedConfigs = async () => {
    try {
      const token = user?.token;
      const res = await fetch(`${API_URL}/api/institutional-analytics/saved-configs`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setSavedConfigs(json.configs || []);
      }
    } catch (e) {
      console.warn('Failed to load saved templates:', e);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    try {
      const token = user?.token;
      const payload = {
        name: templateName.trim(),
        reportType,
        outputFormat,
        scopeConfig: {
          campuses: selectedCampuses,
          schools: selectedSchools,
          departments: selectedDepartments,
          academicYears: selectedYears,
          facultyMode,
          selectedFacultyEmpIds
        },
        contentConfig: { sections, subsections },
        comparisonConfig: { dimensions: Object.keys(comparisons).filter(k => (comparisons as any)[k]) }
      };

      const res = await fetch(`${API_URL}/api/institutional-analytics/saved-configs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setTemplateName('');
        await handleLoadSavedConfigs();
        setExportSuccessMessage('Report configuration saved successfully.');
        setTimeout(() => setExportSuccessMessage(null), 3000);
      }
    } catch (e) {
      console.warn('Failed to save template:', e);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleApplyConfig = (cfg: any) => {
    if (cfg.reportType) setReportType(cfg.reportType);
    if (cfg.outputFormat) setOutputFormat(cfg.outputFormat);
    if (cfg.scopeConfig) {
      if (cfg.scopeConfig.campuses) setSelectedCampuses(cfg.scopeConfig.campuses);
      if (cfg.scopeConfig.schools) setSelectedSchools(cfg.scopeConfig.schools);
      if (cfg.scopeConfig.departments) setSelectedDepartments(cfg.scopeConfig.departments);
      if (cfg.scopeConfig.academicYears) setSelectedYears(cfg.scopeConfig.academicYears);
      if (cfg.scopeConfig.facultyMode) setFacultyMode(cfg.scopeConfig.facultyMode);
      if (cfg.scopeConfig.selectedFacultyEmpIds) setSelectedFacultyEmpIds(cfg.scopeConfig.selectedFacultyEmpIds);
    }
    if (cfg.contentConfig?.sections) setSections(cfg.contentConfig.sections);
    if (cfg.contentConfig?.subsections) setSubsections(cfg.contentConfig.subsections);
    setIsSavedDrawerOpen(false);
    setExportSuccessMessage(`Loaded "${cfg.name}" configuration.`);
    setTimeout(() => setExportSuccessMessage(null), 3000);
  };

  const handleDeleteConfig = async (id: string) => {
    try {
      const token = user?.token;
      const res = await fetch(`${API_URL}/api/institutional-analytics/saved-configs/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        setSavedConfigs(prev => prev.filter(c => c.id !== id));
      }
    } catch (e) {
      console.warn('Failed to delete config:', e);
    }
  };

  // Report History CRUD
  const handleLoadHistory = async () => {
    try {
      const token = user?.token;
      const res = await fetch(`${API_URL}/api/institutional-analytics/history`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) setReportHistory(json.history || []);
      }
    } catch (e) {
      console.warn('Failed to load report history:', e);
    }
  };

  const STEPS: Array<{ id: BuilderStep; label: string; number: number; icon: any }> = [
    { id: 'type_format', label: 'Type & Format', number: 1, icon: Settings2 },
    { id: 'scope_faculty', label: 'Scope & Faculty', number: 2, icon: Building },
    { id: 'content', label: 'Content Selection', number: 3, icon: Layers },
    { id: 'comparisons', label: 'Comparisons', number: 4, icon: TrendingUp },
    { id: 'preview', label: 'Preview & Export', number: 5, icon: Eye }
  ];

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      {/* EXACT PERIODICALS BULK UPLOAD DIMENSIONS */}
      <DialogContent className="w-full sm:max-w-[750px] md:max-w-[800px] lg:max-w-[850px] max-h-[88vh] h-[88vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-2xl">
        {/* Region 1: Fixed Header */}
        <div className="px-6 pt-5 pb-0 shrink-0">
          <div className="flex items-center justify-between">
            <DialogHeader className="pr-10">
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#2855B9]" />
                <span>Institutional Report Builder</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Configure, customize, preview and generate official quality assurance & intelligence reports.
              </DialogDescription>
            </DialogHeader>

            {/* Quick Template & History Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  handleLoadSavedConfigs();
                  setIsSavedDrawerOpen(prev => !prev);
                  setIsHistoryDrawerOpen(false);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  isSavedDrawerOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="Saved Report Templates"
              >
                <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Templates</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleLoadHistory();
                  setIsHistoryDrawerOpen(prev => !prev);
                  setIsSavedDrawerOpen(false);
                }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                  isHistoryDrawerOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="Generated Report History"
              >
                <History className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">History</span>
              </button>
            </div>
          </div>

          {/* 5-Step Stepper Progress Indicator */}
          <div className="bg-slate-50 border-y border-slate-200/80 -mx-6 px-6 py-2.5 mt-3 flex items-center justify-between gap-1 overflow-x-auto shrink-0">
            {STEPS.map((s, idx) => {
              const isCurrent = currentStep === s.id;
              const isPassed = currentStepIndex > idx;
              const StepIcon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCurrentStep(s.id)}
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                    isCurrent
                      ? 'bg-[#2855B9] text-white shadow-xs font-semibold'
                      : isPassed
                      ? 'text-slate-700 hover:bg-slate-200/60'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCurrent
                      ? 'bg-white text-[#2855B9]'
                      : isPassed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {isPassed ? <Check className="w-3 h-3" /> : s.number}
                  </span>
                  <span className="hidden md:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Region 2: Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4 text-xs">
          {/* Notifications / Alerts */}
          {exportSuccessMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportSuccessMessage}</span>
            </div>
          )}
          {previewError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{previewError}</span>
            </div>
          )}

          {/* TEMPLATES DRAWER OVERLAY */}
          {isSavedDrawerOpen && (
            <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-indigo-600" />
                  <span>Saved Report Templates</span>
                </h4>
                <button type="button" onClick={() => setIsSavedDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Save current config */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    placeholder="Enter template name (e.g. Annual Research & Quartile Benchmark)..."
                    className="h-8 text-xs bg-white"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveTemplate}
                    disabled={!templateName.trim() || savingTemplate}
                    className="bg-[#2855B9] text-white text-xs h-8 px-3 shrink-0"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    <span>Save Config</span>
                  </Button>
                </div>
                {isAdmin && (
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <Checkbox
                      checked={saveAsSystemTemplate}
                      onCheckedChange={c => setSaveAsSystemTemplate(Boolean(c))}
                    />
                    <span className="text-[11px] font-semibold text-indigo-900">
                      Publish as Official System Template (Visible to all users, locked from non-admin editing)
                    </span>
                  </label>
                )}
              </div>

              {savedConfigs.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No saved configurations yet. Save your favorite report setup above.</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {savedConfigs.map(cfg => (
                    <div key={cfg.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-slate-900 text-xs">{cfg.name}</p>
                          {cfg.isSystemTemplate && (
                            <Badge className="text-[9px] bg-indigo-600 text-white py-0 px-1.5">
                              System Template v{cfg.version || 1}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {cfg.reportType?.toUpperCase()} • {cfg.outputFormat?.toUpperCase()} • {cfg.scopeConfig?.scopeLabel || 'University-wide'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => handleApplyConfig(cfg)} className="h-7 text-[11px] px-2.5">
                          Load
                        </Button>
                        {(!cfg.isSystemTemplate || isAdmin) && (
                          <button type="button" onClick={() => handleDeleteConfig(cfg.id)} className="p-1 text-slate-400 hover:text-rose-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HISTORY DRAWER OVERLAY */}
          {isHistoryDrawerOpen && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <History className="w-4 h-4 text-[#2855B9]" />
                  <span>Generated Report History</span>
                </h4>
                <button type="button" onClick={() => setIsHistoryDrawerOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {reportHistory.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">No reports have been exported yet in this session.</p>
              ) : (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {reportHistory.map(h => (
                    <div key={h.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900 text-xs">{h.reportName}</p>
                        <p className="text-[10px] text-slate-500">
                          {h.outputFormat?.toUpperCase()} • {h.reportingPeriod || 'Annual'} • {new Date(h.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                          {h.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 1: REPORT TYPE AND FORMAT */}
          {currentStep === 'type_format' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Select Report Level & Scope Depth</h3>
                <p className="text-xs text-slate-500">Choose the level of analytical detail suited for leadership, IQAC, or accreditation audit.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Summary Report */}
                <div
                  onClick={() => handleReportTypeChange('summary')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer space-y-2 ${
                    reportType === 'summary'
                      ? 'border-[#2855B9] bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">Summary Report</span>
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">No Visual Charts</Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Executive overview, vital institutional KPIs, key achievements, summary tables, and high-priority observations.
                  </p>
                  <div className="pt-2 text-[10px] text-amber-700 flex items-center gap-1 font-medium">
                    <Info className="w-3 h-3 text-amber-600" />
                    <span>Strictly NO visual charts — KPI scorecards & concise tables only</span>
                  </div>
                </div>

                {/* Analytical Report */}
                <div
                  onClick={() => handleReportTypeChange('analytical')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer space-y-2 ${
                    reportType === 'analytical'
                      ? 'border-[#2855B9] bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">Analytical Report</span>
                    <Badge className="text-[10px] bg-[#2855B9] text-white">Recommended</Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    KPI analysis, visual charts, multi-year progression, mandatory Quartile analytics, cross-department comparisons, and action plan.
                  </p>
                  <div className="pt-2 text-[10px] text-emerald-700 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Complete charts & comparisons</span>
                  </div>
                </div>

                {/* Detailed Report */}
                <div
                  onClick={() => handleReportTypeChange('detailed')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer space-y-2 ${
                    reportType === 'detailed'
                      ? 'border-[#2855B9] bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">Detailed Report</span>
                    <Badge variant="outline" className="text-[10px] bg-white border-slate-200">Audit Ready</Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Exhaustive documentation for NAAC/NIRF accreditation preparation, full section tables, faculty attribution, and methodology notes.
                  </p>
                  <div className="pt-2 text-[10px] text-indigo-700 flex items-center gap-1 font-medium">
                    <FileText className="w-3 h-3 text-indigo-600" />
                    <span>Full tables & records breakdown</span>
                  </div>
                </div>
              </div>

              {/* Document Output Format Selector */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">Document Export Format</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div
                    onClick={() => setOutputFormat('pdf')}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                      outputFormat === 'pdf' ? 'border-[#2855B9] bg-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Adobe PDF (.pdf)</p>
                      <p className="text-[10px] text-slate-500">Official print-ready publication with CHRIST header, footer & page numbers</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setOutputFormat('docx')}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                      outputFormat === 'docx' ? 'border-[#2855B9] bg-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Microsoft Word (.docx)</p>
                      <p className="text-[10px] text-slate-500">Editable native tables, styles, and table of contents for administrative reports</p>
                    </div>
                  </div>

                  <div
                    onClick={() => setOutputFormat('pptx')}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                      outputFormat === 'pptx' ? 'border-[#2855B9] bg-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                      <Presentation className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">PowerPoint (.pptx)</p>
                      <p className="text-[10px] text-slate-500">Native editable 16:9 widescreen presentation with CHRIST navy/gold theme</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: INSTITUTIONAL SCOPE & FACULTY FILTER */}
          {currentStep === 'scope_faculty' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Hierarchical Scope & Global Faculty Selection</h3>
                <p className="text-xs text-slate-500">Filter report metrics across campuses, schools, departments, and specific faculty contributors.</p>
              </div>

              {/* Scope Selectors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Campuses Selector */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">1. Campuses</span>
                    <button
                      type="button"
                      onClick={() => handleToggleCampus('All')}
                      className="text-[10px] text-[#2855B9] font-semibold hover:underline"
                    >
                      {selectedCampuses.includes('All') ? 'All Selected' : 'Select All'}
                    </button>
                  </div>
                  <Input
                    placeholder="Search campus..."
                    value={campusSearch}
                    onChange={e => setCampusSearch(e.target.value)}
                    className="h-7 text-[11px]"
                  />
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                    <label className="flex items-center gap-2 p-1 rounded hover:bg-slate-50 cursor-pointer text-xs">
                      <Checkbox
                        checked={selectedCampuses.includes('All')}
                        onCheckedChange={() => handleToggleCampus('All')}
                      />
                      <span className="font-semibold text-slate-900">All Campuses</span>
                    </label>
                    {displayCampuses.map(c => (
                      <label key={c.id} className="flex items-center gap-2 p-1 rounded hover:bg-slate-50 cursor-pointer text-xs">
                        <Checkbox
                          checked={selectedCampuses.includes(c.name)}
                          onCheckedChange={() => handleToggleCampus(c.name)}
                        />
                        <span className="text-slate-700">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Schools Selector */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">2. Schools</span>
                    <button
                      type="button"
                      onClick={() => handleToggleSchool('All')}
                      className="text-[10px] text-[#2855B9] font-semibold hover:underline"
                    >
                      {selectedSchools.includes('All') ? 'All Selected' : 'Select All'}
                    </button>
                  </div>
                  <Input
                    placeholder="Search school..."
                    value={schoolSearch}
                    onChange={e => setSchoolSearch(e.target.value)}
                    className="h-7 text-[11px]"
                  />
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                    <label className="flex items-center gap-2 p-1 rounded hover:bg-slate-50 cursor-pointer text-xs">
                      <Checkbox
                        checked={selectedSchools.includes('All')}
                        onCheckedChange={() => handleToggleSchool('All')}
                      />
                      <span className="font-semibold text-slate-900">All Schools</span>
                    </label>
                    {displaySchools.map(s => (
                      <label key={s.id} className="flex items-center gap-2 p-1 rounded hover:bg-slate-50 cursor-pointer text-xs">
                        <Checkbox
                          checked={selectedSchools.includes(s.name)}
                          onCheckedChange={() => handleToggleSchool(s.name)}
                        />
                        <span className="text-slate-700 truncate" title={s.name}>{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Departments Selector */}
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs">3. Departments</span>
                    <button
                      type="button"
                      onClick={() => handleToggleDepartment('All')}
                      className="text-[10px] text-[#2855B9] font-semibold hover:underline"
                    >
                      {selectedDepartments.includes('All') ? 'All Selected' : 'Select All'}
                    </button>
                  </div>
                  <Input
                    placeholder="Search department..."
                    value={deptSearch}
                    onChange={e => setDeptSearch(e.target.value)}
                    className="h-7 text-[11px]"
                  />
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                    <label className="flex items-center gap-2 p-1 rounded hover:bg-slate-50 cursor-pointer text-xs">
                      <Checkbox
                        checked={selectedDepartments.includes('All')}
                        onCheckedChange={() => handleToggleDepartment('All')}
                      />
                      <span className="font-semibold text-slate-900">All Departments</span>
                    </label>
                    {displayDepartments.map(d => (
                      <label key={d.id} className="flex items-center gap-2 p-1 rounded hover:bg-slate-50 cursor-pointer text-xs">
                        <Checkbox
                          checked={selectedDepartments.includes(d.name)}
                          onCheckedChange={() => handleToggleDepartment(d.name)}
                        />
                        <span className="text-slate-700 truncate" title={d.name}>{d.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reporting Periods / Academic Years */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#2855B9]" />
                    <span>Reporting Academic Years</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedYears(availableAcademicYears)}
                      className="text-[10px] text-[#2855B9] font-semibold hover:underline"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedYears(['2025-26'])}
                      className="text-[10px] text-slate-500 hover:underline"
                    >
                      Current Only
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {availableAcademicYears.map(yr => {
                    const isSelected = selectedYears.includes(yr);
                    return (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => handleToggleYear(yr)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          isSelected
                            ? 'bg-[#2855B9] text-white border-[#2855B9] shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {yr}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* GLOBAL FACULTY FILTER */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#2855B9]" />
                      <span>Global Faculty Filter</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Applies globally across all faculty-attributable sections (Publications, Citations, Patents, Grants).
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setFacultyMode('all')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                        facultyMode === 'all' ? 'bg-[#2855B9] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Entire Faculty ({facultyDirectory.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFacultyMode('selected')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                        facultyMode === 'selected' ? 'bg-[#2855B9] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Selected Faculty ({selectedFacultyEmpIds.length})
                    </button>
                  </div>
                </div>

                {facultyMode === 'selected' && (
                  <div className="space-y-2 pt-2 border-t border-slate-200/80">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                        <Input
                          placeholder="Search faculty by name, EmpID, or department..."
                          value={facultySearchQuery}
                          onChange={e => setFacultySearchQuery(e.target.value)}
                          className="pl-8 h-8 text-xs bg-white"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedFacultyEmpIds(facultyDirectory.map(f => f.employeeId))}
                        className="h-8 text-xs shrink-0"
                      >
                        Select All ({facultyDirectory.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedFacultyEmpIds([])}
                        className="h-8 text-xs shrink-0"
                      >
                        Clear All
                      </Button>
                    </div>

                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 bg-white p-2 rounded-lg border border-slate-200">
                      {loadingFaculty ? (
                        <p className="text-center py-4 text-xs text-slate-400">Loading verified faculty directory...</p>
                      ) : displayFaculties.length === 0 ? (
                        <p className="text-center py-4 text-xs text-slate-400">No faculty members found matching your search.</p>
                      ) : (
                        displayFaculties.map(f => {
                          const isSelected = selectedFacultyEmpIds.includes(f.employeeId);
                          return (
                            <label
                              key={f.id || f.employeeId}
                              className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                                isSelected ? 'bg-blue-50/60 border-blue-200' : 'bg-white border-slate-100 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleToggleFaculty(f.employeeId)}
                                />
                                <div>
                                  <p className="font-semibold text-slate-900 text-xs">{f.name}</p>
                                  <p className="text-[10px] text-slate-500">EmpID: {f.employeeId} • {f.designation || 'Faculty'}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[10px] bg-slate-50 border-slate-200 max-w-[200px] truncate">
                                {f.department}
                              </Badge>
                            </label>
                          );
                        })
                      )}
                    </div>

                    <p className="text-[10px] text-slate-500 italic">
                      * Co-authored publications are deduplicated at institutional level. Non-faculty sections (e.g. Placements) maintain institutional totals.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: INDEPENDENT CONTENT CUSTOMIZATION (INLINE ACCORDION) */}
          {currentStep === 'content' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Section-wise Field Customization & Granular Selection
                  </h3>
                  <p className="text-xs text-slate-500">
                    Expand each report section below to customize specific KPIs, charts, summary tables, detailed records, and narrative insights.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const allSecs: Record<string, boolean> = {};
                      const allFields: Record<string, boolean> = {};
                      REPORT_FIELD_CATALOG.forEach(s => {
                        allSecs[s.id] = true;
                        s.items.forEach(i => {
                          if (!(reportType === 'summary' && i.notAllowedInSummary) && !(i.requiresDetailed && reportType !== 'detailed')) {
                            allFields[i.id] = true;
                          }
                        });
                        if (s.subModules) {
                          s.subModules.forEach(sm => sm.items.forEach(i => {
                            if (!(reportType === 'summary' && i.notAllowedInSummary) && !(i.requiresDetailed && reportType !== 'detailed')) {
                              allFields[i.id] = true;
                            }
                          }));
                        }
                      });
                      setGranularConfig(prev => ({
                        ...prev,
                        sections: allSecs,
                        fieldSelections: allFields
                      }));
                      setSections({
                        executiveOverview: true,
                        academicFaculty: true,
                        researchInnovation: true,
                        placements: true,
                        accreditation: true,
                        comparativeAnalytics: reportType !== 'summary',
                        insightsActionPlan: true,
                        appendix: true
                      });
                    }}
                    className="h-7 text-[11px] px-2.5"
                  >
                    Select All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const allSecs: Record<string, boolean> = {};
                      const allFields: Record<string, boolean> = {};
                      REPORT_FIELD_CATALOG.forEach(s => {
                        allSecs[s.id] = false;
                        s.items.forEach(i => { allFields[i.id] = false; });
                        if (s.subModules) {
                          s.subModules.forEach(sm => sm.items.forEach(i => { allFields[i.id] = false; }));
                        }
                      });
                      setGranularConfig(prev => ({
                        ...prev,
                        sections: allSecs,
                        fieldSelections: allFields
                      }));
                      setSections({
                        executiveOverview: false,
                        academicFaculty: false,
                        researchInnovation: false,
                        placements: false,
                        accreditation: false,
                        comparativeAnalytics: false,
                        insightsActionPlan: false,
                        appendix: false
                      });
                    }}
                    className="h-7 text-[11px] px-2.5"
                  >
                    Deselect All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const resetCfg = getDefaultGranularConfig(reportType);
                      setGranularConfig(resetCfg);
                      setSections(resetCfg.sections as any);
                    }}
                    className="h-7 text-[11px] px-2.5 text-[#2855B9]"
                  >
                    Reset Defaults
                  </Button>
                </div>
              </div>

              {/* Accordion List */}
              <SectionAccordionList
                reportType={reportType}
                config={granularConfig}
                onChange={cfg => {
                  setGranularConfig(cfg);
                  setSections(cfg.sections as any);
                }}
                availableDepartments={departments.map(d => d.name)}
              />

              {/* Selection Summary Footer */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-semibold text-slate-800">
                    Configuration Status:
                  </span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-[11px]">
                    {Object.values(granularConfig.sections).filter(Boolean).length} / 8 Sections Active
                  </Badge>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[11px]">
                    {Object.values(granularConfig.fieldSelections).filter(Boolean).length} Fields Selected
                  </Badge>
                  {reportType === 'detailed' && granularConfig.placementRecords.enabled && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200 text-[11px]">
                      Placement Register ({granularConfig.placementRecords.columns.length} Cols, Top {granularConfig.placementRecords.topN})
                    </Badge>
                  )}
                </div>
                <span className="text-[11px] text-slate-500 italic">
                  Changes take effect immediately upon generating document preview.
                </span>
              </div>
            </div>
          )}

          {/* STEP 4: CUSTOM COMPARISONS AND ANALYTICS */}
          {currentStep === 'comparisons' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Custom Comparison Dimensions & Safeguards</h3>
                <p className="text-xs text-slate-500">Configure cross-sectional, temporal, and external benchmarking with strict statistical safeguards.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Academic Year vs Academic Year */}
                <label className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-900 text-xs">1. Academic Year Progression</p>
                      <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700">Chronological</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">Multi-year output trajectory with zero-denominator safe growth %.</p>
                  </div>
                  <Checkbox
                    checked={comparisons.yearWise}
                    onCheckedChange={c => setComparisons(p => ({ ...p, yearWise: !!c }))}
                  />
                </label>

                {/* 2. Department vs Department */}
                <label className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-900 text-xs">2. Department vs Department</p>
                      <Badge variant="outline" className="text-[9px] bg-slate-50">Cross-Benchmarking</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">Faculty cadre, publication quartiles, external funding & citations.</p>
                  </div>
                  <Checkbox
                    checked={comparisons.departmentWise}
                    onCheckedChange={c => setComparisons(p => ({ ...p, departmentWise: !!c }))}
                  />
                </label>

                {/* 3. School vs School */}
                <label className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-900 text-xs">3. School / Deanery Benchmarking</p>
                      <Badge variant="outline" className="text-[9px] bg-slate-50">Deanery Level</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">Deanery-level scholarly productivity and research funding footprint.</p>
                  </div>
                  <Checkbox
                    checked={comparisons.schoolWise}
                    onCheckedChange={c => setComparisons(p => ({ ...p, schoolWise: !!c }))}
                  />
                </label>

                {/* 4. Campus vs Campus */}
                <label className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-900 text-xs">4. Campus vs Campus</p>
                      <Badge variant="outline" className="text-[9px] bg-slate-50">Multi-Campus</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">Bengaluru Central, Kengeri, Yeshwanthpur, Delhi NCR, and Pune Lavasa.</p>
                  </div>
                  <Checkbox
                    checked={comparisons.campusWise}
                    onCheckedChange={c => setComparisons(p => ({ ...p, campusWise: !!c }))}
                  />
                </label>

                {/* 5. External Institutional Benchmarking */}
                <label className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-900 text-xs">5. External NIRF Benchmarking</p>
                      <Badge className="text-[9px] bg-emerald-600 text-white">Official MoE 2024</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">Official Ministry of Education NIRF Rank 63, TLR, RPC, GO, OI, PR scores.</p>
                  </div>
                  <Checkbox
                    checked={comparisons.externalBenchmark}
                    onCheckedChange={c => setComparisons(p => ({ ...p, externalBenchmark: !!c }))}
                  />
                </label>

                {/* 6. Institutional Performance Trends */}
                <label className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-900 text-xs">6. Institutional Performance Trends</p>
                      <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700">Trajectory</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">Longitudinal trajectories in research density, citation impact & IPR.</p>
                  </div>
                  <Checkbox
                    checked={comparisons.performanceTrends}
                    onCheckedChange={c => setComparisons(p => ({ ...p, performanceTrends: !!c }))}
                  />
                </label>
              </div>

              {/* Safeguards Card */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                <h4 className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Audited Comparison Safeguards Active</span>
                </h4>
                <ul className="text-[11px] text-emerald-800 space-y-1 list-disc pl-4">
                  <li>Zero previous value: Displays &quot;Baseline 0&quot; rather than calculating misleading infinite growth percentages.</li>
                  <li>Missing vs Zero: Records with unavailable historic data are marked &quot;Insufficient data&quot; rather than assumed zero.</li>
                  <li>Quartile missing: Unclassified publications are tracked separately and strictly never counted in Q4.</li>
                  <li>Attribution deduplication: Multi-author institutional publications are counted as exactly 1 institutional output.</li>
                </ul>
              </div>
            </div>
          )}

          {/* STEP 5: COMPLETE DOCUMENT PREVIEW */}
          {currentStep === 'preview' && (
            <div className="space-y-4">
              {/* Snapshot Freshness & Immutability Bar */}
              <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between flex-wrap gap-3 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-200">DATA SNAPSHOT:</span>
                      <span className="font-mono text-xs font-bold text-amber-300">
                        {previewData?.snapshotId || previewData?.meta?.snapshotId || 'SNAP-PENDING'}
                      </span>
                      <span className="text-[11px] text-slate-500">|</span>
                      <span className="text-[11px] text-slate-300 font-semibold">WORKFLOW:</span>
                      <select
                        value={approvalStatus}
                        onChange={(e) => setApprovalStatus(e.target.value)}
                        className="bg-slate-800 text-emerald-300 text-[11px] font-bold border border-slate-700 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-emerald-400"
                      >
                        <option value="Draft">Draft</option>
                        <option value="Generated">Generated</option>
                        <option value="Pending IQAC Verification">Pending IQAC Verification</option>
                        <option value="Verified">Verified</option>
                        <option value="Pending Approval">Pending Approval</option>
                        <option value="Approved">Approved</option>
                        <option value="Published">Published</option>
                      </select>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Immutable verified data freeze • Captured{' '}
                      {previewData?.dataProvenance?.extractedAt
                        ? new Date(previewData.dataProvenance.extractedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : 'just now'}
                      {' • '}PDF, Word & PPTX exports will use this identical snapshot
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={refreshingSnapshot || loadingPreview}
                  onClick={handleRefreshSnapshot}
                  className="h-7 text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700 flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingSnapshot ? 'animate-spin text-amber-400' : 'text-slate-300'}`} />
                  <span>{refreshingSnapshot ? 'Refreshing...' : 'Refresh Data'}</span>
                </Button>
              </div>

              {/* Data Quality & Reconciliation Engine Status Card */}
              {previewData?.validation && (
                <div className={`p-3 rounded-xl border text-xs transition-all ${
                  (previewData.validation.criticalErrors || 0) > 0 || !previewData.validation.isValid
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : ((previewData.validation.summary?.warnings || 0) > 0
                        ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                        : 'bg-emerald-50/80 border-emerald-200 text-emerald-900')
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={`w-4 h-4 shrink-0 ${
                        (previewData.validation.criticalErrors || 0) > 0
                          ? 'text-rose-600'
                          : ((previewData.validation.summary?.warnings || 0) > 0 ? 'text-amber-600' : 'text-emerald-600')
                      }`} />
                      <span className="font-bold">
                        {previewData.validation.isValid ? 'IQAC Data Reconciled & Validated' : 'Reconciliation Inconsistencies Detected'}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded font-mono font-semibold bg-white/90 border border-current shadow-xs">
                        {previewData.validation.summary?.passed || 0}/{previewData.validation.summary?.totalChecks || 0} checks passed
                      </span>
                      {((previewData.validation.summary?.warnings || 0) > 0) && (
                        <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                          {previewData.validation.summary.warnings} observation{(previewData.validation.summary?.warnings || 0) > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowValidationDetails(prev => !prev)}
                      className="text-[11px] font-medium underline flex items-center gap-1 text-slate-700 hover:text-slate-900 cursor-pointer"
                    >
                      {showValidationDetails ? 'Hide Audit Log' : 'View Reconciliation Audit'}
                      <ChevronDown className={`w-3.5 h-3.5 transform transition-transform ${showValidationDetails ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  {showValidationDetails && (
                    <div className="mt-2.5 pt-2.5 border-t border-current/20 space-y-1.5 text-[11px]">
                      {(previewData.validation.details || []).map((chk: any, cIdx: number) => (
                        <div key={cIdx} className="flex items-start gap-1.5 font-mono">
                          {chk.status === 'VALIDATED' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <span className="font-bold">{chk.checkId}:</span> {chk.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preview Navigation & Zoom Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-2 p-2.5 bg-slate-100 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPageIndex(p => Math.max(0, p - 1))}
                    disabled={currentPageIndex === 0 || loadingPreview}
                    className="h-7 text-xs px-2"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </Button>
                  <span className="text-xs font-semibold text-slate-700 px-2">
                    Page {currentPageIndex + 1} of {previewData?.pages?.length || 1}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPageIndex(p => Math.min((previewData?.pages?.length || 1) - 1, p + 1))}
                    disabled={!previewData || currentPageIndex >= (previewData.pages.length - 1) || loadingPreview}
                    className="h-7 text-xs px-2"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Section jumping pill dropdown */}
                {previewData?.pages && (
                  <select
                    value={currentPageIndex}
                    onChange={e => setCurrentPageIndex(Number(e.target.value))}
                    className="h-7 text-xs bg-white border border-slate-200 rounded-lg px-2 max-w-[220px]"
                  >
                    {previewData.pages.map((p: any, idx: number) => (
                      <option key={idx} value={idx}>
                        P.{idx + 1}: {p.title || p.pageType}
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setZoomLevel(z => Math.max(75, z - 10))}
                    className="p-1 text-slate-600 hover:bg-slate-200 rounded"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-semibold text-slate-600 w-10 text-center">{zoomLevel}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(z => Math.min(130, z + 10))}
                    className="p-1 text-slate-600 hover:bg-slate-200 rounded"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(100)}
                    className="p-1 text-slate-600 hover:bg-slate-200 rounded"
                    title="Reset Zoom"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Live Multi-Page Interactive Preview Canvas */}
              {loadingPreview ? (
                <div className="p-12 text-center space-y-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <RefreshCw className="w-6 h-6 text-[#2855B9] animate-spin mx-auto" />
                  <p className="font-semibold text-slate-700 text-xs">Generating verified multi-page report preview...</p>
                  <p className="text-[11px] text-slate-400">Compiling deduplicated metrics, quartile classifications, and comparative analytics.</p>
                </div>
              ) : previewData?.pages && previewData.pages.length > 0 ? (
                <div
                  className="overflow-x-auto p-4 bg-slate-200/70 rounded-2xl flex justify-center"
                  style={{ minHeight: '380px' }}
                >
                  {/* Single Page Sheet */}
                  {(() => {
                    const page = previewData.pages[currentPageIndex];
                    if (!page) return null;

                    return (
                      <div
                        className="bg-white rounded-xl shadow-lg border border-slate-300 p-6 space-y-4 text-xs transition-transform origin-top w-full max-w-[760px]"
                        style={{ transform: `scale(${zoomLevel / 100})` }}
                      >
                        {/* Page Header */}
                        <div className="flex items-center justify-between pb-2 border-b-2 border-[#2855B9]">
                          <div>
                            <span className="font-bold text-[#1C355B] text-xs uppercase tracking-wide">
                              CHRIST (Deemed to be University) • IQAC
                            </span>
                            <p className="text-[10px] text-slate-500">{page.sectionCode || 'INSTITUTIONAL PERFORMANCE'}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] bg-slate-50">
                            Page {currentPageIndex + 1} of {previewData.pages.length}
                          </Badge>
                        </div>

                        {/* Page Body according to pageType */}
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm mb-1">{page.title}</h3>
                          {page.description && <p className="text-xs text-slate-500 mb-3">{page.description}</p>}

                          {/* COVER PAGE */}
                          {page.pageType === 'cover' && (
                            <div className="py-6 space-y-6 text-center">
                              <div className="inline-block px-3 py-1 bg-blue-50 text-[#2855B9] rounded-full text-xs font-semibold">
                                {page.confidentiality}
                              </div>
                              <div>
                                <h1 className="text-xl font-bold text-[#1C355B]">{page.title}</h1>
                                <p className="text-xs text-slate-600 mt-1">{page.subtitle}</p>
                              </div>
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-w-md mx-auto text-xs space-y-1">
                                <p><strong className="text-slate-700">Scope:</strong> {page.scope}</p>
                                <p><strong className="text-slate-700">Reporting Years:</strong> {page.academicYears}</p>
                                <p><strong className="text-slate-700">Faculty Attribution:</strong> {page.facultyAttribution}</p>
                              </div>

                              {/* Summary Cards */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                                {page.summaryCards?.map((c: any, idx: number) => (
                                  <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl text-center space-y-1 shadow-2xs">
                                    <p className="text-[10px] text-slate-500">{c.label}</p>
                                    <p className="text-base font-bold text-[#1C355B]">{c.value}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* EXECUTIVE OVERVIEW */}
                          {page.pageType === 'executive_overview' && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {page.kpis?.map((kpi: any, idx: number) => (
                                  <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                                    <p className="text-[10px] text-slate-500">{kpi.label}</p>
                                    <p className="text-sm font-bold text-[#1C355B]">{kpi.value}</p>
                                    <p className="text-[10px] text-blue-600 font-medium">{kpi.note}</p>
                                  </div>
                                ))}
                              </div>

                              <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-1 text-xs">
                                <p className="font-bold text-[#1C355B]">Verified Institutional Highlights:</p>
                                <ul className="list-disc pl-4 space-y-1 text-slate-700 text-[11px]">
                                  {page.positiveHighlights?.map((h: string, idx: number) => (
                                    <li key={idx}>{h}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}

                          {/* UNIVERSAL KPI GRID (FOR PAGES WITH KPI CARDS) */}
                          {page.pageType !== 'cover' && page.pageType !== 'executive_overview' && (
                            (() => {
                              const kpisToRender = page.kpis || page.facultyKpis || page.researchKpis || page.publicationKpis || page.citationKpis || page.facultySummaryKpis || page.patentKpis || page.fundingKpis || page.accreditationKpis || page.comparativeKpis || page.actionPlanKpis;
                              if (!kpisToRender || kpisToRender.length === 0) return null;
                              return (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                  {kpisToRender.slice(0, 4).map((kpi: any, idx: number) => (
                                    <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                                      <p className="text-[10px] text-slate-500 font-medium">{kpi.label}</p>
                                      <p className="text-sm font-bold text-[#1C355B]">{kpi.value}</p>
                                      {kpi.note && <p className="text-[10px] text-blue-600 truncate">{kpi.note}</p>}
                                    </div>
                                  ))}
                                </div>
                              );
                            })()
                          )}

                          {/* RESEARCH & QUARTILE ANALYTICS */}
                          {(page.pageType === 'research_quartiles' || page.pageType === 'publication_analytics') && (
                            <div className="space-y-4">
                              {/* Quartile Breakdown Visual Progress */}
                              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                                  <span>Quartile Coverage: {page.quartileCoveragePct}%</span>
                                  <span>Scopus SJR Validated</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {page.quartileBreakdown?.slice(0, 4).map((q: any, idx: number) => (
                                    <div key={idx} className="p-2 bg-white rounded-lg border border-slate-200">
                                      <p className="font-bold text-xs" style={{ color: q.color || '#2855B9' }}>{q.label}</p>
                                      <p className="text-sm font-bold text-slate-900">{q.count} papers</p>
                                      <p className="text-[10px] text-slate-500">{q.percentage}% of classified</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* CITATION ANALYTICS */}
                          {page.pageType === 'citation_analytics' && page.topCitedPublications && (
                            <div className="border border-slate-200 rounded-xl overflow-hidden mt-3">
                              <div className="bg-[#1C355B] text-white p-2 font-bold text-xs flex justify-between">
                                <span>High Impact Publications</span>
                                <span>Citations</span>
                              </div>
                              <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                                {page.topCitedPublications.slice(0, 5).map((p: any, idx: number) => (
                                  <div key={idx} className="p-2 flex items-center justify-between text-xs">
                                    <div className="max-w-[80%]">
                                      <p className="font-semibold text-slate-800 truncate">{p.title}</p>
                                      <p className="text-[10px] text-slate-500">{p.journal} • {p.year}</p>
                                    </div>
                                    <Badge variant="outline" className="text-xs font-bold text-blue-700 bg-blue-50">
                                      {p.citations}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* FACULTY RESEARCH CONTRIBUTION */}
                          {page.pageType === 'faculty_contribution' && page.topFaculty && (
                            <div className="border border-slate-200 rounded-xl overflow-hidden mt-3">
                              <div className="bg-[#1C355B] text-white p-2 font-bold text-xs flex justify-between">
                                <span>Faculty Researcher</span>
                                <span>Output & Citations</span>
                              </div>
                              <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                                {page.topFaculty.slice(0, 6).map((f: any, idx: number) => (
                                  <div key={idx} className="p-2 flex items-center justify-between text-xs">
                                    <div>
                                      <p className="font-semibold text-slate-800">{f.name}</p>
                                      <p className="text-[10px] text-slate-500">{f.department}</p>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-bold text-slate-800">{f.publications} pubs</span>
                                      <span className="text-[10px] text-slate-500 ml-2">({f.citations} cites)</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ACCREDITATION BENCHMARKS */}
                          {page.pageType === 'accreditation' && page.criteriaBenchmarks && (
                            <div className="border border-slate-200 rounded-xl overflow-hidden mt-3">
                              <div className="bg-[#1C355B] text-white p-2 font-bold text-xs flex justify-between">
                                <span>Quality Dimension</span>
                                <span>Status</span>
                              </div>
                              <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                                {page.criteriaBenchmarks.map((c: any, idx: number) => (
                                  <div key={idx} className="p-2 flex items-center justify-between text-xs">
                                    <div>
                                      <p className="font-semibold text-slate-800">{c.metric}</p>
                                      <p className="text-[10px] text-slate-500">Target: {c.target} • Actual: {c.actual}</p>
                                    </div>
                                    <Badge className={`text-[10px] ${c.status === 'Achieved' ? 'bg-emerald-600' : (c.status === 'On Track' ? 'bg-blue-600' : 'bg-rose-600')} text-white`}>
                                      {c.status}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* PLACEMENTS */}
                          {page.pageType === 'placements' && (
                            <div className="space-y-4">
                              {page.topRecruiters && page.topRecruiters.length > 0 && (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                  <div className="bg-[#1C355B] text-white p-2 font-bold text-xs">
                                    Top Campus Recruiters
                                  </div>
                                  <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto">
                                    {page.topRecruiters.map((r: any, idx: number) => (
                                      <div key={idx} className="p-2 flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-800">{r.company}</span>
                                        <Badge variant="outline" className="text-[10px] bg-slate-50">
                                          {r.offers} verified offers
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* ACTION PLAN */}
                          {(page.pageType === 'insights_action_plan' || page.pageType === 'action_plan') && (
                            <div className="space-y-2">
                              <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="bg-[#1C355B] text-white p-2 font-bold text-xs">
                                  IQAC Action Plan & Recommendations
                                </div>
                                <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                                  {page.actionPlan?.map((a: any, idx: number) => (
                                    <div key={idx} className="p-2.5 space-y-1 text-xs">
                                      <div className="flex items-center justify-between">
                                        <Badge className={`text-[9px] ${a.priority === 'High' ? 'bg-rose-600' : 'bg-amber-600'} text-white`}>
                                          {a.priority} Priority
                                        </Badge>
                                        <span className="text-[10px] text-slate-500">Target: {a.targetDate}</span>
                                      </div>
                                      <p className="font-semibold text-slate-900">{a.area}: {a.observation}</p>
                                      <p className="text-[11px] text-slate-600">{a.actionItem}</p>
                                      <p className="text-[10px] text-[#2855B9] font-medium">Lead: {a.responsibleDepartment}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* COMPARATIVE ANALYTICS & BENCHMARKING */}
                          {page.pageType === 'comparative_analytics' && (
                            <div className="space-y-4">
                              {/* External NIRF Benchmarking */}
                              {page.externalBenchmark && (
                                <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-3.5 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-emerald-950 text-xs">Official NIRF 2024 External Benchmarking</span>
                                    <Badge className="text-[10px] bg-emerald-700 text-white">NIRF University Rank 63</Badge>
                                  </div>
                                  <p className="text-[10px] text-emerald-800">
                                    Ministry of Education verified scores • NAAC {page.externalBenchmark.accreditationGrade || 'A++ (CGPA 3.74)'}
                                  </p>
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                                    {page.externalBenchmark.comparisonData?.map((item: any, idx: number) => (
                                      <div key={idx} className="p-2 bg-white rounded-lg border border-emerald-200 text-center space-y-0.5">
                                        <p className="text-[9px] font-bold text-slate-500">{item.category}</p>
                                        <p className="text-xs font-bold text-[#1C355B]">{item.christScore}</p>
                                        <p className="text-[9px] text-slate-400">Top 10: {item.nirfBenchmarkTop10}</p>
                                      </div>
                                    ))}
                                  </div>
                                  <p className="text-[9px] text-emerald-700 italic">
                                    Source: Ministry of Education (MoE) National Institutional Ranking Framework (NIRF) 2024.
                                  </p>
                                </div>
                              )}

                              {/* Multi-Campus Comparison */}
                              {page.campusTable && page.campusTable.length > 0 && (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                  <div className="bg-slate-100 p-2 font-bold text-slate-800 text-xs flex justify-between">
                                    <span>Campus-Wise Performance</span>
                                    <span>Faculty & Outputs</span>
                                  </div>
                                  <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                                    {page.campusTable.map((camp: any, idx: number) => (
                                      <div key={idx} className="p-2 flex items-center justify-between text-xs">
                                        <div>
                                          <p className="font-semibold text-slate-800">{camp.campusName}</p>
                                          <p className="text-[10px] text-slate-500">{camp.departmentsCount} depts • {camp.schoolsCount} schools</p>
                                        </div>
                                        <div className="text-right">
                                          <span className="font-bold text-slate-800">{camp.totalPublications} pubs</span>
                                          <span className="text-[10px] text-slate-500 ml-2">({camp.facultyStrength} faculty)</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* School Comparison */}
                              {page.schoolTable && page.schoolTable.length > 0 && (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                  <div className="bg-slate-100 p-2 font-bold text-slate-800 text-xs flex justify-between">
                                    <span>Deanery / School Productivity</span>
                                    <span>Scholarly Volume</span>
                                  </div>
                                  <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                                    {page.schoolTable.map((sch: any, idx: number) => (
                                      <div key={idx} className="p-2 flex items-center justify-between text-xs">
                                        <div>
                                          <p className="font-semibold text-slate-800">{sch.schoolName}</p>
                                          <p className="text-[10px] text-slate-500">{sch.facultyStrength} faculty • {sch.phdPercentage}% Ph.D.</p>
                                        </div>
                                        <span className="font-bold text-slate-800">{sch.totalPublications} outputs</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Longitudinal Performance Trends */}
                              {page.performanceTrends && page.performanceTrends.length > 0 && (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                  <div className="bg-slate-100 p-2 font-bold text-slate-800 text-xs flex justify-between">
                                    <span>Year-on-Year Growth Trajectory</span>
                                    <span>Growth %</span>
                                  </div>
                                  <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto">
                                    {page.performanceTrends.map((trend: any, idx: number) => (
                                      <div key={idx} className="p-2 flex items-center justify-between text-xs">
                                        <span className="font-semibold text-slate-800">{trend.academicYear}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-slate-600">{trend.publications} publications</span>
                                          {trend.publicationGrowthPct !== 0 && (
                                            <Badge variant="outline" className={`text-[9px] ${trend.publicationGrowthPct > 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                                              {trend.publicationGrowthPct > 0 ? `+${trend.publicationGrowthPct}%` : `${trend.publicationGrowthPct}%`}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* GENERIC TABLES FOR OTHER PAGES */}
                          {page.pageType !== 'comparative_analytics' && page.departmentTable && (
                            <div className="border border-slate-200 rounded-xl overflow-hidden mt-3">
                              <div className="bg-slate-100 p-2 font-bold text-slate-800 text-xs flex justify-between">
                                <span>Department Breakdown</span>
                                <span>Strength & Outputs</span>
                              </div>
                              <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                                {page.departmentTable.map((row: any, idx: number) => (
                                  <div key={idx} className="p-2 flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-800">{row.department}</span>
                                    <span className="text-slate-600">{row.facultyStrength ? `${row.facultyStrength} faculty (${row.phdCount || 0} Ph.D.)` : `${row.total || row.totalPublications || 0} outputs`}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Page Footer */}
                        <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                          <span>CHRIST (Deemed to be University) • Confidential Quality Report</span>
                          <span>Verified Database Query • Generated {previewData.meta?.generatedAt}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Region 3: Fixed Footer with Navigation & Action Controls */}
        <DialogFooter className="px-6 py-3.5 border-t border-slate-200 bg-white shrink-0 flex justify-between items-center sm:justify-between m-0">
          <div>
            {currentStepIndex > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const prevStep = STEPS[currentStepIndex - 1].id;
                  setCurrentStep(prevStep);
                }}
                className="text-xs h-8 px-3 rounded-lg border-slate-200 text-slate-700"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                <span>Previous Step</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs h-8 px-3 rounded-lg border-slate-200 text-slate-700"
              >
                Cancel
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStep === 'preview' ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSavedDrawerOpen(true)}
                  className="text-xs h-8 px-3 rounded-lg border-slate-200 text-slate-700"
                >
                  <Bookmark className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                  <span>Save Template</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  disabled={isExporting}
                  onClick={() => handleExport('pdf')}
                  className="bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold h-8 px-3.5 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export PDF</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  disabled={isExporting}
                  onClick={() => handleExport('docx')}
                  className="bg-[#2855B9] hover:bg-[#1C355B] text-white text-xs font-bold h-8 px-3.5 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Word</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  disabled={isExporting}
                  onClick={() => handleExport('pptx')}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-8 px-3.5 rounded-lg shadow-xs flex items-center gap-1.5"
                >
                  <Presentation className="w-3.5 h-3.5" />
                  <span>Export PPTX</span>
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const nextStep = STEPS[currentStepIndex + 1].id;
                  setCurrentStep(nextStep);
                }}
                className="bg-[#2855B9] hover:bg-[#1C355B] text-white text-xs font-bold h-8 px-4 rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <span>{currentStepIndex === STEPS.length - 2 ? 'Generate Preview' : 'Next Step'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

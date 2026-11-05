import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Layers,
  Calendar,
  Building,
  CheckSquare,
  ShieldCheck,
  Download,
  Info,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ResearchReportGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PeriodItem {
  key: string;
  label: string;
  cyLabel: string;
  fyLabel: string;
  startYear?: number;
}

interface StatusOption {
  value: string;
  label: string;
}

interface ReportPreviewData {
  scope: string;
  department: string | null;
  scopeDisplay: string;
  periods: PeriodItem[];
  sections: string[];
  generatedAt: string;
  iprMetrics?: {
    publishedByPeriod: Record<string, number>;
    grantedByPeriod: Record<string, number>;
    totalContributingPatents: number;
  };
  sponsoredMetrics?: {
    projectsByPeriod: Record<string, number>;
    agenciesByPeriod: Record<string, number>;
    amountByPeriod: Record<string, number>;
    amountFormattedByPeriod: Record<string, string>;
    amountInWordsByPeriod: Record<string, string>;
    totalContributingProjects: number;
  };
  consultancyMetrics?: {
    projectsByPeriod: Record<string, number>;
    agenciesByPeriod: Record<string, number>;
    amountByPeriod: Record<string, number>;
    amountFormattedByPeriod: Record<string, string>;
    amountInWordsByPeriod: Record<string, string>;
    totalContributingProjects: number;
  };
  warnings: string[];
  isComplete: boolean;
  sourceRecords?: Array<{
    section: string;
    metric: string;
    period: string;
    sourceId: string;
    title: string;
    department: string;
    status: string;
    agency: string;
    amountFormatted: string;
    note: string;
  }>;
}

export function ResearchReportGeneratorDialog({
  isOpen,
  onClose
}: ResearchReportGeneratorDialogProps) {
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [activeTab, setActiveTab] = useState<'configure' | 'preview'>('configure');
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Configuration options from server
  const [availablePeriods, setAvailablePeriods] = useState<PeriodItem[]>([
    { key: '2024-25', label: '2024–25', cyLabel: 'CY 2024', fyLabel: 'FY 2024–25', startYear: 2024 },
    { key: '2023-24', label: '2023–24', cyLabel: 'CY 2023', fyLabel: 'FY 2023–24', startYear: 2023 },
    { key: '2022-23', label: '2022–23', cyLabel: 'CY 2022', fyLabel: 'FY 2022–23', startYear: 2022 },
    { key: '2021-22', label: '2021–22', cyLabel: 'CY 2021', fyLabel: 'FY 2021–22', startYear: 2021 },
    { key: '2020-21', label: '2020–21', cyLabel: 'CY 2020', fyLabel: 'FY 2020–21', startYear: 2020 }
  ]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [isPrivilegedRole, setIsPrivilegedRole] = useState(false);

  // User selections
  const [selectedSections, setSelectedSections] = useState<string[]>(['ipr', 'sponsored', 'consultancy']);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>(['2024-25', '2023-24', '2022-23']);
  const [statuses, setStatuses] = useState<{
    ipr: string[];
    sponsored: string[];
    consultancy: string[];
  }>({
    ipr: ['approved'],
    sponsored: ['approved'],
    consultancy: ['approved', 'finalized']
  });
  const [selectedScope, setSelectedScope] = useState<'university' | 'department'>('university');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | 'both'>('excel');
  const [includeSourceBreakdown, setIncludeSourceBreakdown] = useState<boolean>(false);

  // Preview Data
  const [previewData, setPreviewData] = useState<ReportPreviewData | null>(null);

  // Status definitions
  const iprStatusOptions: StatusOption[] = [
    { value: 'approved', label: 'Approved' },
    { value: 'pending', label: 'Pending' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const sponsoredStatusOptions: StatusOption[] = [
    { value: 'approved', label: 'Approved' },
    { value: 'pending', label: 'Pending' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const consultancyStatusOptions: StatusOption[] = [
    { value: 'approved', label: 'Approved' },
    { value: 'finalized', label: 'Finalized' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_coordinator_review', label: 'Under Review (Coord)' },
    { value: 'under_hod_review', label: 'Under Review (HOD)' },
    { value: 'rejected', label: 'Rejected' }
  ];

  // Fetch report configuration when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    setLoadingConfig(true);
    setValidationError(null);
    try {
      const token = user?.token || localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/research-reports/config`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.periods && data.data.periods.length > 0) {
          setAvailablePeriods(data.data.periods);
          if (data.data.defaultPeriods && data.data.defaultPeriods.length > 0) {
            setSelectedPeriods(data.data.defaultPeriods);
          }
        }
        if (data.data.availableDepartments) {
          setAvailableDepartments(data.data.availableDepartments);
        }
        const privileged = user?.role === 'admin' || user?.role === 'authority';
        setIsPrivilegedRole(privileged);
        if (!privileged) {
          setSelectedScope('department');
          setSelectedDepartment(user?.department || 'all');
        } else {
          setSelectedScope('university');
        }
      }
    } catch (err) {
      console.warn('Failed to fetch report config options from server, using local defaults', err);
      const privileged = user?.role === 'admin' || user?.role === 'authority';
      setIsPrivilegedRole(privileged);
      if (!privileged) {
        setSelectedScope('department');
        setSelectedDepartment(user?.department || 'all');
      }
    } finally {
      setLoadingConfig(false);
    }
  };

  // Section toggle helpers
  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections(prev => {
      if (prev.includes(sectionId)) {
        return prev.filter(s => s !== sectionId);
      } else {
        return [...prev, sectionId];
      }
    });
  };

  const handleSelectAllSections = () => {
    setSelectedSections(['ipr', 'sponsored', 'consultancy']);
  };

  const handleClearSections = () => {
    setSelectedSections([]);
  };

  // Period toggle helpers
  const handlePeriodToggle = (periodKey: string) => {
    setSelectedPeriods(prev => {
      if (prev.includes(periodKey)) {
        return prev.filter(p => p !== periodKey);
      } else {
        return [...prev, periodKey];
      }
    });
  };

  const handleSelectAllPeriods = () => {
    setSelectedPeriods(availablePeriods.map(p => p.key));
  };

  const handleClearPeriods = () => {
    setSelectedPeriods([]);
  };

  // Status toggle helpers
  const handleStatusToggle = (section: 'ipr' | 'sponsored' | 'consultancy', value: string) => {
    setStatuses(prev => {
      const cur = prev[section] || [];
      const updated = cur.includes(value)
        ? cur.filter(v => v !== value)
        : [...cur, value];
      return { ...prev, [section]: updated };
    });
  };

  const handleSelectAllStatuses = (section: 'ipr' | 'sponsored' | 'consultancy') => {
    let allVals: string[] = [];
    if (section === 'ipr') allVals = iprStatusOptions.map(o => o.value);
    if (section === 'sponsored') allVals = sponsoredStatusOptions.map(o => o.value);
    if (section === 'consultancy') allVals = consultancyStatusOptions.map(o => o.value);
    setStatuses(prev => ({ ...prev, [section]: allVals }));
  };

  // Validate configuration before preview or export
  const validateConfig = (): boolean => {
    if (selectedSections.length === 0) {
      setValidationError('Please select at least one report section (IPR, Sponsored Research, or Consultancy).');
      return false;
    }
    if (selectedPeriods.length === 0) {
      setValidationError('Please select at least one reporting period.');
      return false;
    }
    for (const sec of selectedSections) {
      if (!statuses[sec as keyof typeof statuses] || statuses[sec as keyof typeof statuses].length === 0) {
        setValidationError(`Please select at least one approval status for ${sec.toUpperCase()} section.`);
        return false;
      }
    }
    setValidationError(null);
    return true;
  };

  // Fetch Report Preview
  const fetchPreview = async () => {
    if (!validateConfig()) return;

    setLoadingPreview(true);
    setValidationError(null);
    try {
      const token = user?.token || localStorage.getItem('token');
      const payload = {
        sections: selectedSections,
        periods: selectedPeriods,
        statuses,
        scope: selectedScope,
        department: selectedScope === 'department' && selectedDepartment !== 'all' ? selectedDepartment : null,
        includeSourceBreakdown
      };

      const res = await fetch(`${API_URL}/api/research-reports/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate preview');
      }

      setPreviewData(data.data);
      setActiveTab('preview');
    } catch (err: any) {
      setValidationError(err.message || 'Failed to generate report preview. Please check your network and settings.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Trigger File Download
  const downloadFile = async (format: 'excel' | 'pdf') => {
    const token = user?.token || localStorage.getItem('token');
    const payload = {
      sections: selectedSections,
      periods: selectedPeriods,
      statuses,
      scope: selectedScope,
      department: selectedScope === 'department' && selectedDepartment !== 'all' ? selectedDepartment : null,
      format,
      includeSourceBreakdown
    };

    const res = await fetch(`${API_URL}/api/research-reports/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error((errJson && errJson.message) || `Failed to export ${format.toUpperCase()}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `CHRIST_IQAC_Research_Report_${timestamp}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Handle Export Action
  const handleExport = async (overrideFormat?: 'excel' | 'pdf' | 'both') => {
    if (!validateConfig()) return;

    const fmt = overrideFormat || exportFormat;
    setExporting(true);
    setExportMessage(null);
    setValidationError(null);

    try {
      if (fmt === 'both') {
        setExportMessage('Downloading Excel workbook (.xlsx)...');
        await downloadFile('excel');
        setExportMessage('Downloading PDF report (.pdf)...');
        await downloadFile('pdf');
        setExportMessage('Both Excel and PDF reports downloaded successfully.');
      } else {
        setExportMessage(`Generating and downloading ${fmt.toUpperCase()} report...`);
        await downloadFile(fmt);
        setExportMessage(`${fmt === 'excel' ? 'Excel workbook (.xlsx)' : 'PDF report (.pdf)'} downloaded successfully.`);
      }
    } catch (err: any) {
      setValidationError(err.message || 'Failed to export report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-full sm:max-w-[750px] md:max-w-[800px] lg:max-w-[850px] max-h-[88vh] h-[88vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-2xl">
        {/* Fixed Header */}
        <div className="bg-[#1C355B] px-6 py-4 text-white shrink-0 flex items-start justify-between pr-14">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider font-bold bg-[#2855B9] px-2 py-0.5 rounded text-white/95">
                IQAC Centralized Reporting
              </span>
              {/* <span className="text-xs text-slate-300 font-medium">Version 1.5</span> */}
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold text-white mt-1.5 flex items-center gap-2">
              <FileDown className="w-5 h-5 text-blue-300 shrink-0" />
              <span>Research & Innovation Report Generator</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-300 mt-0.5">
              Consolidated annual comparative reporting across IPR, Sponsored Research Grants, and Consultancy Projects.
            </DialogDescription>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow Step Indicator */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-2.5 shrink-0">
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'configure' | 'preview')} className="w-full">
            <TabsList className="bg-slate-200/80 p-0.5 rounded-lg border border-slate-300/60 w-full grid grid-cols-2">
              <TabsTrigger
                value="configure"
                className="text-xs font-semibold py-1.5 rounded-md data-[state=active]:bg-[#2855B9] data-[state=active]:text-white transition-all text-slate-700"
              >
                1. Configure Report Parameters
              </TabsTrigger>
              <TabsTrigger
                value="preview"
                className="text-xs font-semibold py-1.5 rounded-md data-[state=active]:bg-[#2855B9] data-[state=active]:text-white transition-all text-slate-700 flex items-center justify-center gap-1.5"
              >
                <span>2. Interactive Preview & Validation</span>
                {previewData && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-emerald-100 text-emerald-800 border-emerald-300 font-bold">
                    Ready
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">
          {/* Validation Alert */}
          {validationError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Configuration Error:</span> {validationError}
              </div>
            </div>
          )}

          {/* Export Success Message */}
          {exportMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>{exportMessage}</div>
            </div>
          )}

          {activeTab === 'configure' ? (
            <div className="space-y-5">
              {/* 1. REPORT SECTIONS */}
              <div className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#2855B9]" />
                    <h3 className="text-sm font-bold text-slate-900">1. Select Report Sections</h3>
                    <span className="text-[11px] text-slate-500">(At least one required)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAllSections}
                      className="text-[#2855B9] hover:underline font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearSections}
                      className="text-slate-500 hover:text-slate-800 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1 items-stretch">
                  {/* IPR Section */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all select-none h-full ${
                      selectedSections.includes('ipr')
                        ? 'border-[#2855B9] bg-blue-50/50 shadow-xs ring-1 ring-[#2855B9]/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-300'
                    }`}
                  >
                    <Checkbox
                      checked={selectedSections.includes('ipr')}
                      onCheckedChange={() => handleSectionToggle('ipr')}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 leading-tight">IPR Details</div>
                      <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Patents Published & Granted (Calendar Year)
                      </div>
                    </div>
                  </label>

                  {/* Sponsored Research Section */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all select-none h-full ${
                      selectedSections.includes('sponsored')
                        ? 'border-[#2855B9] bg-blue-50/50 shadow-xs ring-1 ring-[#2855B9]/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-300'
                    }`}
                  >
                    <Checkbox
                      checked={selectedSections.includes('sponsored')}
                      onCheckedChange={() => handleSectionToggle('sponsored')}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 leading-tight">Sponsored Research Details</div>
                      <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Projects, Funding Agencies, Sanctioned Funding (FY)
                      </div>
                    </div>
                  </label>

                  {/* Consultancy Section */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all select-none h-full ${
                      selectedSections.includes('consultancy')
                        ? 'border-[#2855B9] bg-blue-50/50 shadow-xs ring-1 ring-[#2855B9]/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-300'
                    }`}
                  >
                    <Checkbox
                      checked={selectedSections.includes('consultancy')}
                      onCheckedChange={() => handleSectionToggle('consultancy')}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 leading-tight">Consultancy Project Details</div>
                      <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Projects, Client Orgs, Contract Values in INR (FY)
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2. COMMON REPORTING YEARS */}
              <div className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#2855B9]" />
                    <h3 className="text-sm font-bold text-slate-900">2. Common Reporting Years</h3>
                    <span className="text-[11px] text-slate-500">(Multi-select, newest first)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAllPeriods}
                      className="text-[#2855B9] hover:underline font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearPeriods}
                      className="text-slate-500 hover:text-slate-800 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#2855B9] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">Display Convention: </span>
                    IPR columns display <strong>Calendar Year (CY)</strong>. Sponsored Research & Consultancy columns display <strong>Financial Year (FY)</strong> using verified year-range grouping. Never labeled Academic Year.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                  {availablePeriods.map(period => (
                    <label
                      key={period.key}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                        selectedPeriods.includes(period.key)
                          ? 'border-[#2855B9] bg-blue-50/50 text-[#1C355B] font-bold shadow-2xs ring-1 ring-[#2855B9]/20'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50/80 hover:border-slate-300 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          checked={selectedPeriods.includes(period.key)}
                          onCheckedChange={() => handlePeriodToggle(period.key)}
                          className="shrink-0"
                        />
                        <span className="font-bold text-slate-900">{period.label}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-normal shrink-0 ml-2 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/60">
                        {period.cyLabel} / {period.fyLabel}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 3. SECTION-SPECIFIC APPROVAL STATUSES */}
              <div className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-2xs space-y-3.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#2855B9]" />
                  <h3 className="text-sm font-bold text-slate-900">3. Section-Specific Approval Statuses</h3>
                  <span className="text-[11px] text-slate-500">(Independent checkbox groups per selected section)</span>
                </div>

                <div className={`grid grid-cols-1 ${selectedSections.length === 3 ? 'md:grid-cols-3' : selectedSections.length === 2 ? 'sm:grid-cols-2' : ''} gap-3.5 items-stretch`}>
                  {/* IPR Approval Status */}
                  {selectedSections.includes('ipr') && (
                    <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-2">
                          <span className="text-xs font-bold text-slate-900">IPR Status</span>
                          <button
                            type="button"
                            onClick={() => handleSelectAllStatuses('ipr')}
                            className="text-[11px] text-[#2855B9] hover:underline font-semibold"
                          >
                            Select All
                          </button>
                        </div>
                        <div className="space-y-2">
                          {iprStatusOptions.map(opt => (
                            <label key={opt.value} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                              <Checkbox
                                checked={(statuses.ipr || []).includes(opt.value)}
                                onCheckedChange={() => handleStatusToggle('ipr', opt.value)}
                              />
                              <span>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sponsored Approval Status */}
                  {selectedSections.includes('sponsored') && (
                    <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-2">
                          <span className="text-xs font-bold text-slate-900">Sponsored Status</span>
                          <button
                            type="button"
                            onClick={() => handleSelectAllStatuses('sponsored')}
                            className="text-[11px] text-[#2855B9] hover:underline font-semibold"
                          >
                            Select All
                          </button>
                        </div>
                        <div className="space-y-2">
                          {sponsoredStatusOptions.map(opt => (
                            <label key={opt.value} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                              <Checkbox
                                checked={(statuses.sponsored || []).includes(opt.value)}
                                onCheckedChange={() => handleStatusToggle('sponsored', opt.value)}
                              />
                              <span>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Consultancy Approval Status */}
                  {selectedSections.includes('consultancy') && (
                    <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-2.5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-2">
                          <span className="text-xs font-bold text-slate-900">Consultancy Status</span>
                          <button
                            type="button"
                            onClick={() => handleSelectAllStatuses('consultancy')}
                            className="text-[11px] text-[#2855B9] hover:underline font-semibold"
                          >
                            Select All
                          </button>
                        </div>
                        <div className="space-y-2">
                          {consultancyStatusOptions.map(opt => (
                            <label key={opt.value} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                              <Checkbox
                                checked={(statuses.consultancy || []).includes(opt.value)}
                                onCheckedChange={() => handleStatusToggle('consultancy', opt.value)}
                              />
                              <span>{opt.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. REPORTING SCOPE & EXPORT OPTIONS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                {/* Reporting Scope */}
                <div className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-[#2855B9]" />
                      <h3 className="text-sm font-bold text-slate-900">4. Reporting Scope</h3>
                    </div>

                    <div className="space-y-2.5">
                      {isPrivilegedRole ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                              <input
                                type="radio"
                                name="scope"
                                value="university"
                                checked={selectedScope === 'university'}
                                onChange={() => setSelectedScope('university')}
                                className="text-[#2855B9]"
                              />
                              <span>University-wide</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                              <input
                                type="radio"
                                name="scope"
                                value="department"
                                checked={selectedScope === 'department'}
                                onChange={() => setSelectedScope('department')}
                                className="text-[#2855B9]"
                              />
                              <span>Specific Department</span>
                            </label>
                          </div>

                          {selectedScope === 'department' && (
                            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                              <SelectTrigger className="h-9 text-xs border-slate-200 rounded-xl bg-white">
                                <SelectValue placeholder="Select Department" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Authorized Departments</SelectItem>
                                {availableDepartments.map(d => (
                                  <SelectItem key={d} value={d}>
                                    {d}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ) : (
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                          <span className="font-semibold">Departmental Scope:</span> Locked to{' '}
                          <Badge variant="outline" className="text-xs bg-white text-slate-800 font-bold ml-1">
                            {user?.department || 'Authorized Department'}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-100">
                    * Campus scoping disabled: records link directly to host departments.
                  </div>
                </div>

                {/* Export Options */}
                <div className="p-4 bg-white border border-slate-200/90 rounded-xl shadow-2xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-[#2855B9]" />
                      <h3 className="text-sm font-bold text-slate-900">5. Export Options</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="format"
                            value="excel"
                            checked={exportFormat === 'excel'}
                            onChange={() => setExportFormat('excel')}
                            className="text-[#2855B9]"
                          />
                          <span>Excel (.xlsx)</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="format"
                            value="pdf"
                            checked={exportFormat === 'pdf'}
                            onChange={() => setExportFormat('pdf')}
                            className="text-[#2855B9]"
                          />
                          <span>PDF (.pdf)</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                          <input
                            type="radio"
                            name="format"
                            value="both"
                            checked={exportFormat === 'both'}
                            onChange={() => setExportFormat('both')}
                            className="text-[#2855B9]"
                          />
                          <span>Both</span>
                        </label>
                      </div>

                      <label className="flex items-start gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer select-none">
                        <Checkbox
                          checked={includeSourceBreakdown}
                          onCheckedChange={(checked) => setIncludeSourceBreakdown(!!checked)}
                          className="mt-0.5 shrink-0"
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-800">Include Source Breakdown</div>
                          <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
                            Adds Sheet 2 in Excel / Appendix in PDF detailing contributing records.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* PREVIEW TAB */
            <div className="space-y-5">
              {/* Preview Banner */}
              {previewData ? (
                <>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-[#1C355B]">
                        CHRIST (DEEMED TO BE UNIVERSITY) — IQAC REPORT PREVIEW
                      </div>
                      <Badge variant="outline" className="bg-white text-slate-700 text-xs">
                        Generated: {previewData.generatedAt}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-600 flex flex-wrap gap-4">
                      <span><strong>Scope:</strong> {previewData.scopeDisplay}</span>
                      <span><strong>Reporting Periods:</strong> {previewData.periods.map(p => p.fyLabel).join(', ')}</span>
                    </div>
                  </div>

                  {/* Data Quality & Warnings Box */}
                  {previewData.warnings && previewData.warnings.length > 0 ? (
                    <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Data Quality Summary & Warnings ({previewData.warnings.length} items flagged)</span>
                      </div>
                      <div className="text-[11px] text-amber-800 space-y-1 pl-6 list-disc max-h-32 overflow-y-auto">
                        {previewData.warnings.map((w, i) => (
                          <div key={i} className="leading-tight">• {w}</div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Data Completeness Verified: All eligible contributing records mapped cleanly into reporting periods.</span>
                    </div>
                  )}

                  {/* Table 1: IPR Details */}
                  {selectedSections.includes('ipr') && previewData.iprMetrics && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#1C355B] uppercase tracking-wider">
                          1. IPR Details (Patents & Intellectual Property)
                        </h4>
                        <span className="text-[11px] text-slate-500">Columns in Calendar Year (CY)</span>
                      </div>
                      <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                        <table className="w-full text-xs text-left min-w-[500px]">
                          <thead className="bg-[#2855B9] text-white">
                            <tr>
                              <th className="py-2.5 px-3.5 font-bold">Metric / Particulars</th>
                              {previewData.periods.map(p => (
                                <th key={p.key} className="py-2.5 px-3.5 font-bold text-center">
                                  {p.cyLabel}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-3.5 font-medium text-slate-800">Number of Patents Published</td>
                              {previewData.periods.map(p => (
                                <td key={p.key} className="py-2.5 px-3.5 text-center font-bold text-slate-800">
                                  {previewData.iprMetrics?.publishedByPeriod[p.key] ?? 0}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-slate-50 bg-slate-50/50">
                              <td className="py-2.5 px-3.5 font-medium text-slate-800">Number of Patents Granted</td>
                              {previewData.periods.map(p => (
                                <td key={p.key} className="py-2.5 px-3.5 text-center font-bold text-slate-800">
                                  {previewData.iprMetrics?.grantedByPeriod[p.key] ?? 0}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Table 2: Sponsored Research Details */}
                  {selectedSections.includes('sponsored') && previewData.sponsoredMetrics && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#1C355B] uppercase tracking-wider">
                          {selectedSections.includes('ipr') ? '2' : '1'}. Sponsored Research Details (Research Grants)
                        </h4>
                        <span className="text-[11px] text-slate-500">Columns in Financial Year (FY)</span>
                      </div>
                      <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                        <table className="w-full text-xs text-left min-w-[500px]">
                          <thead className="bg-[#2855B9] text-white">
                            <tr>
                              <th className="py-2.5 px-3.5 font-bold">Metric / Particulars</th>
                              {previewData.periods.map(p => (
                                <th key={p.key} className="py-2.5 px-3.5 font-bold text-center">
                                  {p.fyLabel}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-3.5 font-medium text-slate-800">Total Sponsored Projects</td>
                              {previewData.periods.map(p => (
                                <td key={p.key} className="py-2.5 px-3.5 text-center font-bold text-slate-800">
                                  {previewData.sponsoredMetrics?.projectsByPeriod[p.key] ?? 0}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-slate-50 bg-slate-50/50">
                              <td className="py-2.5 px-3.5 font-medium text-slate-800">Total Funding Agencies</td>
                              {previewData.periods.map(p => (
                                <td key={p.key} className="py-2.5 px-3.5 text-center font-bold text-slate-800">
                                  {previewData.sponsoredMetrics?.agenciesByPeriod[p.key] ?? 0}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-blue-50/40 bg-blue-50/20">
                              <td className="py-2.5 px-3.5 font-bold text-[#1C355B]">
                                Total Amount Received (INR)
                              </td>
                              {previewData.periods.map(p => (
                                <td key={p.key} className="py-2.5 px-3.5 text-center font-bold text-[#2855B9]">
                                  {previewData.sponsoredMetrics?.amountFormattedByPeriod[p.key] ?? '—'}
                                </td>
                              ))}
                            </tr>
                            <tr className="bg-slate-50/80">
                              <td className="py-2 px-3.5 text-[11px] font-medium text-slate-500 italic">
                                Amount in Words
                              </td>
                              {previewData.periods.map(p => (
                                <td key={p.key} className="py-2 px-3.5 text-center text-[10px] text-slate-600 italic">
                                  {previewData.sponsoredMetrics?.amountInWordsByPeriod[p.key] ?? '—'}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="text-[11px] text-slate-500 italic">
                        * Methodology Note: Total Amount Received reflects sum of sanctioned funding amounts in accordance with IQAC reporting guidelines.
                      </div>
                    </div>
                  )}

                  {/* Table 3: Consultancy Project Details */}
                  {selectedSections.includes('consultancy') && previewData.consultancyMetrics && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#1C355B] uppercase tracking-wider">
                          {selectedSections.length === 3 ? '3' : (selectedSections.includes('ipr') || selectedSections.includes('sponsored') ? '2' : '1')}. Consultancy Project Details
                        </h4>
                        <span className="text-[11px] text-slate-500">Columns in Financial Year (FY)</span>
                      </div>
                      <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                        <table className="w-full text-xs text-left min-w-[500px]">
                          <thead className="bg-[#2855B9] text-white">
                            <tr>
                              <th className="py-2.5 px-3.5 font-bold">Metric / Particulars</th>
                              {previewData.periods.map(p => (
                                <th key={p.key} className="py-2.5 px-3.5 font-bold text-center">
                                  {p.fyLabel}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            <tr className="hover:bg-slate-50">
                              <td className="py-2.5 px-3.5 font-medium text-slate-800">Total Consultancy Projects</td>
                              {previewData.periods.map(p => (
                                <td key={p.key} className="py-2.5 px-3.5 text-center font-bold text-slate-800">
                                  {previewData.consultancyMetrics?.projectsByPeriod[p.key] ?? 0}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-slate-50 bg-slate-50/50">
                              <td className="py-2.5 px-3.5 font-medium text-slate-800">Total Client Organizations</td>
                              {previewData.periods.map(p => (
                                <td key={p.key} className="py-2.5 px-3.5 text-center font-bold text-slate-800">
                                  {previewData.consultancyMetrics?.agenciesByPeriod[p.key] ?? 0}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-blue-50/40 bg-blue-50/20">
                              <td className="py-2.5 px-3.5 font-bold text-[#1C355B]">
                                Total Amount Received (INR)
                              </td>
                              {previewData.periods.map(p => (
                                <td key={p.key} className="py-2.5 px-3.5 text-center font-bold text-[#2855B9]">
                                  {previewData.consultancyMetrics?.amountFormattedByPeriod[p.key] ?? '—'}
                                </td>
                              ))}
                            </tr>
                            <tr className="bg-slate-50/80">
                              <td className="py-2 px-3.5 text-[11px] font-medium text-slate-500 italic">
                                Amount in Words
                              </td>
                              {previewData.periods.map(p => (
                                <td key={p.key} className="py-2 px-3.5 text-center text-[10px] text-slate-600 italic">
                                  {previewData.consultancyMetrics?.amountInWordsByPeriod[p.key] ?? '—'}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="text-[11px] text-slate-500 italic">
                        * Methodology Note: Total Amount Received reflects sum of contract values (in Lakhs converted to INR) in accordance with IQAC reporting guidelines.
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-12 text-center text-slate-500 space-y-3">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <div className="text-sm font-semibold text-slate-700">No Preview Generated Yet</div>
                  <div className="text-xs text-slate-400 max-w-sm mx-auto">
                    Click "Generate Preview" to compute institutional comparative totals across selected periods.
                  </div>
                  <Button
                    onClick={fetchPreview}
                    disabled={loadingPreview}
                    className="bg-[#2855B9] hover:bg-[#1C355B] text-white text-xs h-9 px-4 rounded-xl"
                  >
                    {loadingPreview ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    ) : (
                      <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Generate Preview Now
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between m-0">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            size="sm"
            className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold h-9 px-4 rounded-xl"
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            {activeTab === 'configure' ? (
              <>
                <Button
                  type="button"
                  onClick={fetchPreview}
                  disabled={loadingPreview}
                  variant="outline"
                  size="sm"
                  className="border-slate-300 text-slate-700 bg-white hover:bg-slate-100 text-xs font-semibold h-9 px-4 rounded-xl shadow-2xs flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPreview ? 'animate-spin' : ''}`} />
                  <span>{loadingPreview ? 'Calculating...' : 'Preview Report →'}</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => handleExport()}
                  disabled={exporting || loadingPreview}
                  size="sm"
                  className="bg-[#2855B9] hover:bg-[#1C355B] text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Download className={`w-3.5 h-3.5 ${exporting ? 'animate-bounce' : ''}`} />
                  <span>{exporting ? 'Exporting...' : `Export ${exportFormat.toUpperCase()}`}</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={() => setActiveTab('configure')}
                  variant="outline"
                  size="sm"
                  className="border-slate-300 text-slate-700 bg-white hover:bg-slate-100 text-xs font-semibold h-9 px-4 rounded-xl"
                >
                  ← Edit Settings
                </Button>

                <Button
                  type="button"
                  onClick={fetchPreview}
                  disabled={loadingPreview}
                  variant="outline"
                  size="sm"
                  className="border-slate-300 text-slate-700 bg-white hover:bg-slate-100 text-xs font-semibold h-9 px-4 rounded-xl flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPreview ? 'animate-spin' : ''}`} />
                  <span>Refresh Preview</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => handleExport('excel')}
                  disabled={exporting}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-3.5 rounded-xl shadow-xs flex items-center gap-1.5"
                  title="Download Excel Spreadsheet"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Download Excel</span>
                </Button>

                <Button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  disabled={exporting}
                  size="sm"
                  className="bg-[#2855B9] hover:bg-[#1C355B] text-white text-xs font-semibold h-9 px-3.5 rounded-xl shadow-xs flex items-center gap-1.5"
                  title="Download PDF Document"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

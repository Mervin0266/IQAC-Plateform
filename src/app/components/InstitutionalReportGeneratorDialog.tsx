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
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Layers,
  Calendar,
  Building,
  GraduationCap,
  Award,
  Briefcase,
  BookOpen,
  Download,
  Info,
  X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface InstitutionalReportGeneratorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialScope?: {
    campus?: string;
    school?: string;
    departments?: string[];
    academicYears?: string[];
  };
}

export function InstitutionalReportGeneratorDialog({
  isOpen,
  onClose,
  initialScope
}: InstitutionalReportGeneratorDialogProps) {
  const { user } = useAuth();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const [activeTab, setActiveTab] = useState<'configure' | 'preview'>('configure');
  const [reportLevel, setReportLevel] = useState<'summary' | 'analytical' | 'detailed'>('summary');
  const [selectedFormat, setSelectedFormat] = useState<'excel' | 'pdf' | 'word' | 'all'>('excel');
  const [includeSourceBreakdown, setIncludeSourceBreakdown] = useState(false);

  // Filter selections
  const [selectedCampus, setSelectedCampus] = useState<string>('All');
  const [selectedSchool, setSelectedSchool] = useState<string>('All');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>(['AY 2026–27', 'AY 2025–26', 'AY 2024–25', 'AY 2023–24']);

  // Metadata from backend config
  const [campuses, setCampuses] = useState<Array<{ id: string; name: string }>>([]);
  const [schools, setSchools] = useState<Array<{ id: string; name: string; campusId?: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; shortName?: string; schoolId?: string }>>([]);
  const availableYears = [
    'AY 2026–27',
    'AY 2025–26',
    'AY 2024–25',
    'AY 2023–24',
    'AY 2022–23',
    'AY 2021–22',
    'AY 2020–21'
  ];

  // State
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync initial scope if passed from dashboard
  useEffect(() => {
    if (initialScope) {
      if (initialScope.campus) setSelectedCampus(initialScope.campus);
      if (initialScope.school) setSelectedSchool(initialScope.school);
      if (initialScope.departments && initialScope.departments.length > 0) {
        setSelectedDepartments(initialScope.departments);
      }
      if (initialScope.academicYears && initialScope.academicYears.length > 0) {
        setSelectedYears(initialScope.academicYears);
      }
    }
  }, [initialScope, isOpen]);

  // Load configuration metadata
  useEffect(() => {
    if (!isOpen) return;

    async function loadConfig() {
      setLoadingConfig(true);
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
      } finally {
        setLoadingConfig(false);
      }
    }

    loadConfig();
  }, [isOpen, user?.token, API_URL]);

  // Toggle department multi-selection
  const handleToggleDepartment = (deptName: string) => {
    setSelectedDepartments(prev => {
      if (prev.includes(deptName)) {
        return prev.filter(d => d !== deptName);
      } else {
        return [...prev, deptName];
      }
    });
  };

  // Toggle Academic Year selection
  const handleToggleYear = (year: string) => {
    setSelectedYears(prev => {
      if (prev.includes(year)) {
        if (prev.length === 1) return prev; // Keep at least one year
        return prev.filter(y => y !== year);
      } else {
        return [...prev, year];
      }
    });
  };

  // Generate Preview
  const handleGeneratePreview = async () => {
    setLoadingPreview(true);
    setErrorMessage(null);
    try {
      const token = user?.token;
      const res = await fetch(`${API_URL}/api/institutional-analytics/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          campus: selectedCampus,
          school: selectedSchool,
          departments: selectedDepartments,
          academicYears: selectedYears,
          reportLevel,
          includeSourceBreakdown
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to generate report preview.');
      }

      const json = await res.json();
      if (json.success && json.preview) {
        setPreviewData(json.preview);
        setActiveTab('preview');
      } else {
        throw new Error('Invalid preview response structure.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate preview.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Execute File Export
  const handleExport = async (formatOverride?: 'excel' | 'pdf' | 'word') => {
    const targetFormat = formatOverride || selectedFormat;
    setExporting(true);
    setExportMessage(null);
    setErrorMessage(null);

    const formatsToDownload = targetFormat === 'all' ? ['excel', 'pdf', 'word'] : [targetFormat];

    try {
      const token = user?.token;
      for (const fmt of formatsToDownload) {
        setExportMessage(`Generating ${fmt.toUpperCase()} report document...`);

        const res = await fetch(`${API_URL}/api/institutional-analytics/export`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            format: fmt,
            reportLevel,
            includeSourceBreakdown,
            campus: selectedCampus,
            school: selectedSchool,
            departments: selectedDepartments,
            academicYears: selectedYears
          })
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.message || `Failed to export ${fmt.toUpperCase()} document.`);
        }

        const blob = await res.blob();
        const disposition = res.headers.get('Content-Disposition') || '';
        let filename = `CHRIST_IQAC_Institutional_Report_${reportLevel.toUpperCase()}.${fmt === 'excel' ? 'xlsx' : fmt === 'word' ? 'docx' : 'pdf'}`;
        const match = disposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }

      setExportMessage('Document(s) successfully generated and downloaded.');
      setTimeout(() => setExportMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-xl bg-white border border-slate-200 shadow-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600/30 rounded-lg border border-blue-400/30 text-blue-300">
                <Sparkles className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-white tracking-tight">
                  Complete Institutional Report Generator
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                  Authoritative institutional reporting across Executive, Academic, Research, Placements, and Accreditation sections.
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 text-xs px-2.5 py-1">
              All 5 Sections Guaranteed
            </Badge>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-4 flex space-x-2">
            <button
              onClick={() => setActiveTab('configure')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'configure'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              1. Report Configuration
            </button>
            <button
              onClick={() => {
                if (!previewData) handleGeneratePreview();
                else setActiveTab('preview');
              }}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'preview'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              2. Interactive Preview {previewData && '✓'}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2.5 text-red-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {exportMessage && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center space-x-2 text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{exportMessage}</span>
            </div>
          )}

          {activeTab === 'configure' && (
            <div className="space-y-6">
              {/* Step 1: Report Level Card Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
                  1. Select Report Detail Level
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Summary */}
                  <div
                    onClick={() => setReportLevel('summary')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      reportLevel === 'summary'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-slate-900">Summary Report</span>
                      {reportLevel === 'summary' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Compact executive summaries and core KPI tables across all 5 sections. Ideal for board and leadership reviews.
                    </p>
                    <div className="mt-3 flex items-center space-x-1.5 text-[11px] text-blue-700 font-medium">
                      <span>• Fast generation</span>
                      <span>• Compact tables</span>
                    </div>
                  </div>

                  {/* Analytical */}
                  <div
                    onClick={() => setReportLevel('analytical')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      reportLevel === 'analytical'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-slate-900">Analytical Report</span>
                      {reportLevel === 'analytical' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      All 5 sections with key KPIs, multi-year progression tables, and department-level comparative breakdowns.
                    </p>
                    <div className="mt-3 flex items-center space-x-1.5 text-[11px] text-blue-700 font-medium">
                      <span>• Multi-year trends</span>
                      <span>• Department comparison</span>
                    </div>
                  </div>

                  {/* Detailed */}
                  <div
                    onClick={() => setReportLevel('detailed')}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      reportLevel === 'detailed'
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-bold text-slate-900">Detailed Report</span>
                      {reportLevel === 'detailed' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Comprehensive tables, department breakdowns, methodology, data-quality notes, and optional supporting source records appendix.
                    </p>
                    <div className="mt-3 flex items-center space-x-1.5 text-[11px] text-blue-700 font-medium">
                      <span>• Granular breakdowns</span>
                      <span>• Source records appendix</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Academic Year Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    2. Academic Year(s) Included
                  </label>
                  <span className="text-[11px] text-slate-500">Supports multi-year comparative reporting</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableYears.map(year => {
                    const isSelected = selectedYears.includes(year);
                    return (
                      <button
                        key={year}
                        type="button"
                        onClick={() => handleToggleYear(year)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all flex items-center space-x-1.5 ${
                          isSelected
                            ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5 opacity-80" />
                        <span>{year}</span>
                        {isSelected && <span className="ml-1 text-[10px] text-blue-300 font-bold">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Scope & Department Filters */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  3. Institutional Scope & Organizational Filtering
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campus */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Campus</label>
                    <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                      <SelectTrigger className="w-full bg-white h-9 text-xs">
                        <SelectValue placeholder="All Campuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Campuses (University-wide)</SelectItem>
                        {campuses.map(c => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* School */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">School</label>
                    <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                      <SelectTrigger className="w-full bg-white h-9 text-xs">
                        <SelectValue placeholder="All Schools" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Schools</SelectItem>
                        {schools.map(s => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Department Multi-Select Pills */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-700">
                      Departments ({selectedDepartments.length === 0 ? 'All Departments' : `${selectedDepartments.length} Selected`})
                    </label>
                    {selectedDepartments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedDepartments([])}
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        Reset to All
                      </button>
                    )}
                  </div>
                  <div className="max-h-32 overflow-y-auto p-2 bg-white border border-slate-200 rounded-md grid grid-cols-2 md:grid-cols-3 gap-2">
                    {departments.map(d => {
                      const isChecked = selectedDepartments.includes(d.name);
                      return (
                        <label
                          key={d.id}
                          className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900 select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleDepartment(d.name)}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="truncate" title={d.name}>{d.shortName || d.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Step 4: Export Format & Options */}
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1">
                      4. Primary Export Document Format
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
                        { id: 'pdf', label: 'PDF (.pdf)', icon: FileText },
                        { id: 'word', label: 'Word (.docx)', icon: FileText },
                        { id: 'all', label: 'All 3 Formats', icon: Download }
                      ].map(fmt => (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => setSelectedFormat(fmt.id as any)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border flex items-center space-x-1.5 transition-all ${
                            selectedFormat === fmt.id
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          <fmt.icon className="w-3.5 h-3.5" />
                          <span>{fmt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {reportLevel === 'detailed' && (
                    <label className="flex items-center space-x-2 text-xs text-slate-800 cursor-pointer pt-2 md:pt-0">
                      <input
                        type="checkbox"
                        checked={includeSourceBreakdown}
                        onChange={e => setIncludeSourceBreakdown(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Include Supporting Contributing Records Appendix</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-500">
                  All 5 sections generated with verified data & official CHRIST styling.
                </span>
                <div className="flex items-center space-x-2.5">
                  <Button variant="outline" size="sm" onClick={onClose} disabled={exporting}>
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePreview}
                    disabled={loadingPreview || exporting}
                    className="border-slate-300 text-slate-700"
                  >
                    {loadingPreview ? (
                      <RefreshCw className="w-4 h-4 mr-1.5 animate-spin text-slate-600" />
                    ) : (
                      <Layers className="w-4 h-4 mr-1.5 text-slate-600" />
                    )}
                    Generate Live Preview
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleExport()}
                    disabled={exporting}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium"
                  >
                    {exporting ? (
                      <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-1.5" />
                    )}
                    Download {selectedFormat.toUpperCase()}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preview' && (
            <div className="space-y-6">
              {!previewData ? (
                <div className="py-12 text-center text-slate-500">
                  <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-600 mb-3" />
                  <p className="text-sm">Calculating institutional aggregates...</p>
                </div>
              ) : (
                <>
                  {/* Summary Header */}
                  <div className="p-4 bg-slate-900 text-white rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold tracking-tight">Institutional Intelligence Report</span>
                        <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 text-[10px]">
                          {reportLevel.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Scope: {previewData.scopeDisplay} | Periods: {previewData.academicYears.join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExport('excel')}
                        disabled={exporting}
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-8"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Excel
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExport('pdf')}
                        disabled={exporting}
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-8"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" /> PDF
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExport('word')}
                        disabled={exporting}
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-8"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" /> Word
                      </Button>
                    </div>
                  </div>

                  {/* 5 Section Preview Cards */}
                  <div className="space-y-4">
                    {/* Section 1 */}
                    <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center space-x-2">
                          <Building className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            Section 1: Executive Overview
                          </span>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          Verified
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-3">
                        <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                          <span className="text-[10px] text-slate-500 uppercase">Students</span>
                          <p className="text-base font-bold text-slate-900 mt-0.5">
                            {(previewData.executiveOverview.totalStudents || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                          <span className="text-[10px] text-slate-500 uppercase">Faculty</span>
                          <p className="text-base font-bold text-slate-900 mt-0.5">
                            {(previewData.executiveOverview.totalFaculty || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                          <span className="text-[10px] text-slate-500 uppercase">SFR</span>
                          <p className="text-base font-bold text-slate-900 mt-0.5">
                            {previewData.executiveOverview.studentFacultyRatio}:1
                          </p>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                          <span className="text-[10px] text-slate-500 uppercase">Publications</span>
                          <p className="text-base font-bold text-slate-900 mt-0.5">
                            {(previewData.executiveOverview.totalPublications || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                          <span className="text-[10px] text-slate-500 uppercase">Citations</span>
                          <p className="text-base font-bold text-slate-900 mt-0.5">
                            {(previewData.executiveOverview.totalCitations || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded border border-slate-100">
                          <span className="text-[10px] text-slate-500 uppercase">Placement %</span>
                          <p className="text-base font-bold text-slate-900 mt-0.5">
                            {previewData.executiveOverview.placementRate}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Section 2 */}
                    <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center space-x-2">
                          <GraduationCap className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            Section 2: Academic & Faculty Intelligence
                          </span>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          Verified
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                        <div>
                          <span className="text-slate-500">PhD Faculty:</span>{' '}
                          <strong className="text-slate-900">{previewData.academicFaculty.phdFacultyCount} ({previewData.academicFaculty.phdPercentage}%)</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Senior Faculty:</span>{' '}
                          <strong className="text-slate-900">{previewData.academicFaculty.seniorFacultyCount}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">UG/PG Ratio:</span>{' '}
                          <strong className="text-slate-900">{previewData.academicFaculty.ugPgRatio}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Scholars:</span>{' '}
                          <strong className="text-slate-900">{previewData.academicFaculty.researchScholarsCount}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Section 3 */}
                    <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            Section 3: Research, Innovations & Extension
                          </span>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          Verified
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                        <div>
                          <span className="text-slate-500">Sponsored Grants:</span>{' '}
                          <strong className="text-slate-900">₹ {previewData.researchInnovation.totalSponsoredAmountLakhs} L</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Consultancy:</span>{' '}
                          <strong className="text-slate-900">₹ {previewData.researchInnovation.totalConsultancyAmountLakhs} L</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Funding Agencies:</span>{' '}
                          <strong className="text-slate-900">{previewData.researchInnovation.distinctFundingAgenciesCount} Distinct</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Patents Published/Granted:</span>{' '}
                          <strong className="text-slate-900">{previewData.researchInnovation.patentsPublished} / {previewData.researchInnovation.patentsGranted}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Section 4 */}
                    <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center space-x-2">
                          <Briefcase className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            Section 4: Placements & Higher Education
                          </span>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          Verified
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                        <div>
                          <span className="text-slate-500">Unique Placed:</span>{' '}
                          <strong className="text-slate-900">{previewData.placementsInternships.uniquePlaced} Students</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Total Offers:</span>{' '}
                          <strong className="text-slate-900">{previewData.placementsInternships.totalOffers} Offers</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Average LPA:</span>{' '}
                          <strong className="text-slate-900">₹ {previewData.placementsInternships.avgPackageLpa} LPA</strong>
                        </div>
                        <div>
                          <span className="text-slate-500">Peak LPA:</span>{' '}
                          <strong className="text-slate-900">₹ {previewData.placementsInternships.highestPackageLpa} LPA</strong>
                        </div>
                      </div>
                    </div>

                    {/* Section 5 */}
                    <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center space-x-2">
                          <Award className="w-4 h-4 text-violet-600" />
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            Section 5: Accreditation & Rankings
                          </span>
                        </div>
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                          Reference Value
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                        <div>
                          <span className="text-slate-500">NAAC Grade:</span>{' '}
                          <strong className="text-slate-900">{previewData.accreditationRankings.naacGrade} ({previewData.accreditationRankings.naacCgpa})</strong>
                          <span className="block text-[10px] text-amber-600 font-medium">Cycle 4 Valid Benchmark</span>
                        </div>
                        <div>
                          <span className="text-slate-500">NIRF Overall:</span>{' '}
                          <strong className="text-slate-900">Rank #{previewData.accreditationRankings.nirfOverall}</strong>
                          <span className="block text-[10px] text-amber-600 font-medium">Reference Benchmark</span>
                        </div>
                        <div>
                          <span className="text-slate-500">NIRF Engg:</span>{' '}
                          <strong className="text-slate-900">Rank #{previewData.accreditationRankings.nirfEngg}</strong>
                          <span className="block text-[10px] text-amber-600 font-medium">Reference Benchmark</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Strategic Goals:</span>{' '}
                          <strong className="text-slate-900">{previewData.accreditationRankings.strategicGoalAttainment}% Completed</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('configure')}>
                      Back to Configuration
                    </Button>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleExport()}
                        disabled={exporting}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium"
                      >
                        {exporting ? (
                          <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-1.5" />
                        )}
                        Download {selectedFormat.toUpperCase()} Report
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

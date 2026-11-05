import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet, AlertTriangle, CheckCircle, UploadCloud, Info,
  RefreshCw, X, AlertCircle, FolderUp, FilePlus, Eye, Check, Award
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';

export type CitationUploadStage = 'upload' | 'validation' | 'preview' | 'confirm' | 'summary';

const STAGES: { id: CitationUploadStage; label: string; number: number }[] = [
  { id: 'upload', label: '1. Upload', number: 1 },
  { id: 'validation', label: '2. Validation', number: 2 },
  { id: 'preview', label: '3. Preview', number: 3 },
  { id: 'confirm', label: '4. Confirmation', number: 4 },
  { id: 'summary', label: '5. Summary', number: 5 }
];

interface CitationsBulkUploadFlowProps {
  token: string | null;
  onSuccess: () => void;
  onClose: () => void;
}

export function CitationsBulkUploadFlow({ token, onSuccess, onClose }: CitationsBulkUploadFlowProps) {
  const [currentStage, setCurrentStage] = useState<CitationUploadStage>('upload');
  const [citationFiles, setCitationFiles] = useState<{ file: File; employeeId: string | null; warning?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Validation / Preview state from backend
  const [parsedFiles, setParsedFiles] = useState<any[]>([]);
  const [citationRecords, setCitationRecords] = useState<any[]>([]);
  const [citationSummary, setCitationSummary] = useState<any>(null);
  const [citationFilter, setCitationFilter] = useState<'all' | 'Matched' | 'Needs Review' | 'Ambiguous' | 'Not Found' | 'Duplicate' | 'Conflicting'>('all');
  
  // Row detail modal state
  const [viewingRecord, setViewingRecord] = useState<any | null>(null);

  // Confirmation state
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultSummary, setResultSummary] = useState<{ updatedCount: number; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Extract Employee ID before first underscore
  const extractEmpId = (name: string): string | null => {
    if (!name) return null;
    const base = name.replace(/\.[^/.]+$/, '').trim();
    const match = base.match(/^([A-Za-z0-9]+)(?:[_\-\s]|$)/);
    if (match) {
      const token = match[1].trim();
      if (!['citation', 'citations', 'overview', 'scopus', 'export', 'data'].includes(token.toLowerCase())) {
        return token;
      }
    }
    return null;
  };

  const handleProcessFiles = (fileList: FileList | File[]) => {
    const list = Array.from(fileList);
    const newItems: { file: File; employeeId: string | null; warning?: string }[] = [];

    for (const f of list) {
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (ext !== 'csv' && ext !== 'xlsx') {
        continue;
      }

      const empId = extractEmpId(f.name);
      let warning: string | undefined;
      if (!empId) {
        warning = 'Missing or invalid Employee ID in filename. Expected: EmpID_Name.csv or EmpID_Name.xlsx';
      }

      newItems.push({ file: f, employeeId: empId, warning });
    }

    setCitationFiles(prev => {
      const existing = new Set(prev.map(p => p.file.name));
      const filtered = newItems.filter(p => !existing.has(p.file.name));
      return [...prev, ...filtered];
    });
    setErrorMsg('');
  };

  const handleValidateFiles = async () => {
    if (citationFiles.length === 0) return;
    setLoading(true);
    setErrorMsg('');

    try {
      const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const baseUrl = rawApi.replace(/\/+$/, '');

      const filePayloads = await Promise.all(
        citationFiles.map(async cf => {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(cf.file);
          });
          return {
            filename: cf.file.name,
            content: base64
          };
        })
      );

      const res = await fetch(`${baseUrl}/api/publications/citations/validate-and-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ files: filePayloads })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Validation failed.');
      }

      setParsedFiles(data.files || []);
      setCitationRecords(data.records || []);
      setCitationSummary(data.summary || null);
      setCurrentStage('validation');
    } catch (err: any) {
      setErrorMsg(err.message || 'Validation failed. Please verify file formats.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUpdates = async () => {
    const eligible = citationRecords.filter(r => r.status === 'Matched' && r.matchedPublicationId);
    if (eligible.length === 0) {
      setErrorMsg('No eligible matched publication records found to update.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const baseUrl = rawApi.replace(/\/+$/, '');

      const confirmedUpdates = eligible.map(r => ({
        publicationId: r.matchedPublicationId,
        reportedTotal: r.importedTotal,
        reconciliationStatus: r.reconciliationStatus,
        sourceFile: r.sourceFile,
        employeeId: r.employeeId,
        facultyName: r.facultyName,
        yearlyDetails: r.yearlyDetails
      }));

      const res = await fetch(`${baseUrl}/api/publications/citations/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          confirmedUpdates,
          batchMetadata: parsedFiles
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to confirm citation updates.');
      }

      setResultSummary({
        updatedCount: data.updatedCount,
        message: data.message
      });
      setCurrentStage('summary');
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update citations.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter records in preview
  const filteredRecords = React.useMemo(() => {
    if (citationFilter === 'all') return citationRecords;
    return citationRecords.filter(r => r.status === citationFilter);
  }, [citationRecords, citationFilter]);

  // Check if any matched records decrease existing citation count
  const decreasingRecords = React.useMemo(() => {
    return citationRecords.filter(r => r.status === 'Matched' && r.isDecrease);
  }, [citationRecords]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 5-Stage Stepper Progress Bar */}
      <div className="bg-slate-50 border-y border-slate-200/80 -mx-6 px-6 py-2.5 flex items-center justify-between gap-1 overflow-x-auto shrink-0">
        {STAGES.map((s, idx) => {
          const isCurrent = currentStage === s.id;
          const isPassed = STAGES.findIndex(item => item.id === currentStage) > idx;
          return (
            <div key={s.id} className="flex items-center gap-1.5 shrink-0">
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                  isCurrent
                    ? 'bg-[#2855B9] text-white shadow-xs ring-2 ring-[#2855B9]/20'
                    : isPassed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                }`}
              >
                {isPassed ? '✓' : s.number}
              </span>
              <span
                className={`text-xs font-semibold ${
                  isCurrent ? 'text-slate-900 font-bold' : isPassed ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {s.label.replace(/^\d+\.\s*/, '')}
              </span>
              {idx < STAGES.length - 1 && (
                <div className="w-4 sm:w-8 h-0.5 bg-slate-200 mx-1 hidden sm:block" />
              )}
            </div>
          );
        })}
      </div>

      {/* Scrollable Stage Content Body */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4 text-xs">
        {/* STAGE 1: UPLOAD */}
        {currentStage === 'upload' && (
          <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
              <Info className="w-5 h-5 text-[#2855B9] shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <div>
                  <p className="font-bold text-slate-900 text-xs">Citation Overview Import Requirements</p>
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                    Import faculty citation overview reports in <strong>.csv</strong> or <strong>.xlsx</strong> format.
                    Annual citations are linked directly to existing Christ University IQAC publication records.
                  </p>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-[11px] space-y-1.5 text-slate-700">
                  <p className="font-semibold text-slate-800">
                    • <strong>Required Filename Convention:</strong>{' '}
                    <code className="font-mono bg-blue-50 text-blue-900 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                      EmpID_Name.csv
                    </code>{' '}
                    or{' '}
                    <code className="font-mono bg-blue-50 text-blue-900 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                      EmpID_Name.xlsx
                    </code>{' '}
                    (e.g., <span className="font-mono text-slate-900">3489_Suresh_K.csv</span>,{' '}
                    <span className="font-mono text-slate-900">2043_Adarsh_S_V.xlsx</span>)
                  </p>
                  <p className="text-slate-600">
                    • <strong>Dynamic Years:</strong> Handles variable citation periods (&lt;2001, 2001–2026, &gt;2026, Total) dynamically without hardcoding.
                  </p>
                  <p className="text-slate-600">
                    • <strong>Safe Matching:</strong> Matches against existing papers using Document Title + ISSN + Publication Year. Unmatched records do not create new papers.
                  </p>
                </div>
              </div>
            </div>

            {/* Upload Toolbar with Only Two Controls */}
            <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/40 border border-blue-200/80 p-4 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-xs text-[#2855B9] uppercase tracking-wider flex items-center gap-1.5">
                    <FolderUp className="w-4 h-4 text-[#2855B9]" />
                    Faculty Citation Reports
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Select one or multiple citation spreadsheets, or an entire local folder.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept=".csv,.xlsx"
                    onChange={(e) => e.target.files && handleProcessFiles(e.target.files)}
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={folderInputRef}
                    multiple
                    accept=".csv,.xlsx"
                    {...({ webkitdirectory: '', directory: '' } as any)}
                    onChange={(e) => e.target.files && handleProcessFiles(e.target.files)}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="bg-white border-blue-300 text-[#2855B9] hover:bg-blue-50 text-xs font-semibold h-8 px-3 shadow-2xs"
                  >
                    <FilePlus className="w-3.5 h-3.5 mr-1.5" />
                    Select File
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => folderInputRef.current?.click()}
                    disabled={loading}
                    className="bg-[#2855B9] hover:bg-[#1C355B] text-white text-xs font-semibold h-8 px-3 shadow-2xs"
                  >
                    <FolderUp className="w-3.5 h-3.5 mr-1.5" />
                    Select Folder
                  </Button>
                </div>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleProcessFiles(e.dataTransfer.files);
                  }
                }}
                className="border-2 border-dashed border-blue-200 hover:border-[#2855B9] rounded-xl p-5 bg-white/70 hover:bg-blue-50/50 transition-all text-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="w-8 h-8 text-[#2855B9] mx-auto mb-2 opacity-80" />
                <p className="text-xs font-semibold text-slate-800">
                  Drag and drop citation overview spreadsheets (.csv, .xlsx) or click to browse
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Single file, multiple files, or full folder containing citation overviews
                </p>
              </div>
            </div>

            {/* Selected Files Card List */}
            {citationFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 px-1">
                  <span>Selected Citation Files ({citationFiles.length} file{citationFiles.length > 1 ? 's' : ''})</span>
                  <button
                    type="button"
                    onClick={() => setCitationFiles([])}
                    className="text-red-600 hover:text-red-800 text-[11px] font-medium"
                  >
                    Clear All Files
                  </button>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {citationFiles.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all ${
                        item.warning ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <FileSpreadsheet className={`w-4 h-4 shrink-0 ${item.warning ? 'text-amber-600' : 'text-[#2855B9]'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-800 truncate text-[11px]">{item.file.name}</span>
                            <Badge variant="secondary" className="text-[9px] uppercase font-mono px-1.5 py-0">
                              {item.file.name.split('.').pop()}
                            </Badge>
                            {item.employeeId ? (
                              <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200 font-mono">
                                Emp ID: {item.employeeId}
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[9px]">
                                Missing Emp ID
                              </Badge>
                            )}
                          </div>
                          {item.warning && (
                            <p className="text-[10px] text-amber-700 mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>{item.warning}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {(item.file.size / 1024).toFixed(1)} KB
                        </span>
                        <button
                          type="button"
                          onClick={() => setCitationFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-600 p-1 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* STAGE 2: VALIDATION */}
        {currentStage === 'validation' && (
          <div className="space-y-4">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Selected Files</span>
                <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">{parsedFiles.length}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Citation Rows</span>
                <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">{citationSummary?.totalRecords ?? 0}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Matched Publications</span>
                <span className="text-base font-bold text-emerald-700 font-mono mt-0.5 block">{citationSummary?.matchedCount ?? 0}</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-center">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Needs Review / Ambiguous</span>
                <span className="text-base font-bold text-amber-700 font-mono mt-0.5 block">
                  {(citationSummary?.needsReviewCount || 0) + (citationSummary?.ambiguousCount || 0)}
                </span>
              </div>
            </div>

            {/* File-by-File Breakdown */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 block">Faculty Citation File Summaries:</span>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {parsedFiles.map((pf, i) => (
                  <div key={i} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-[#2855B9]" />
                        <span className="font-semibold text-slate-900 text-xs">{pf.filename}</span>
                        {pf.employeeId && (
                          <Badge variant="outline" className="text-[10px] font-mono bg-blue-50 text-blue-700 border-blue-200">
                            Emp ID: {pf.employeeId}
                          </Badge>
                        )}
                      </div>
                      <div>
                        {pf.verifiedFaculty ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                            Verified: {pf.verifiedFaculty.name} ({pf.verifiedFaculty.department})
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            {pf.warning || 'Unverified Faculty'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Detected citation years */}
                    {pf.detectedPeriods && pf.detectedPeriods.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="font-medium text-slate-600">Detected Years ({pf.detectedPeriods.length}):</span>
                        <span className="font-mono text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                          {pf.detectedPeriods.slice(0, 8).join(', ')}
                          {pf.detectedPeriods.length > 8 ? ` +${pf.detectedPeriods.length - 8} more` : ''}
                        </span>
                        <span className="ml-auto font-medium text-slate-600">
                          {pf.matchedCount} matched / {pf.recordCount} rows
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: PREVIEW */}
        {currentStage === 'preview' && (
          <div className="space-y-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {(['all', 'Matched', 'Needs Review', 'Ambiguous', 'Not Found', 'Duplicate', 'Conflicting'] as const).map(tab => {
                const count = tab === 'all'
                  ? citationRecords.length
                  : citationRecords.filter(r => r.status === tab).length;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setCitationFilter(tab)}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                      citationFilter === tab
                        ? 'bg-[#2855B9] text-white font-bold shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab === 'all' ? 'All' : tab} ({count})
                  </button>
                );
              })}
            </div>

            {/* Record Table (Scrollable within itself) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto max-h-[46vh]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                    <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Source File</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Document Title</th>
                      <th className="py-2.5 px-3">Pub Year</th>
                      <th className="py-2.5 px-3 min-w-[180px]">Matched Publication</th>
                      <th className="py-2.5 px-3 text-center">Existing</th>
                      <th className="py-2.5 px-3 text-center">Imported</th>
                      <th className="py-2.5 px-3 text-center">Diff</th>
                      <th className="py-2.5 px-3">Reconciliation</th>
                      <th className="py-2.5 px-3">Match Status</th>
                      <th className="py-2.5 px-3 text-center">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400">
                          No citation records match filter "{citationFilter}".
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((rec) => {
                        const isMatch = rec.status === 'Matched';
                        const isReview = rec.status === 'Needs Review';
                        const isAmbiguous = rec.status === 'Ambiguous';
                        const isNotFound = rec.status === 'Not Found';
                        const isDup = rec.status === 'Duplicate';
                        const isConflict = rec.status === 'Conflicting';

                        return (
                          <tr key={rec.recordId} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-mono text-[10px] text-slate-600 block">{rec.sourceFile}</span>
                              {rec.employeeId && (
                                <span className="text-[9px] text-blue-600 font-semibold font-mono">Emp: {rec.employeeId}</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 max-w-[220px]">
                              <p className="font-semibold text-slate-900 truncate" title={rec.documentTitle}>
                                {rec.documentTitle || '—'}
                              </p>
                              {rec.issn && (
                                <p className="text-[10px] font-mono text-slate-400">ISSN: {rec.issn}</p>
                              )}
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                              {rec.publicationYear || '—'}
                            </td>

                            <td className="py-2.5 px-3 max-w-[200px]">
                              {rec.matchedPublicationTitle ? (
                                <div>
                                  <p className="font-medium text-emerald-800 truncate" title={rec.matchedPublicationTitle}>
                                    {rec.matchedPublicationTitle}
                                  </p>
                                  <span className="text-[9px] text-slate-400">Method: {rec.matchMethod}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">No match</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-600">
                              {rec.existingTotal !== null ? rec.existingTotal : '—'}
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                              {rec.importedTotal !== null ? rec.importedTotal : '—'}
                            </td>

                            <td className="py-2.5 px-3 text-center font-mono font-bold">
                              {rec.difference !== null ? (
                                rec.difference > 0 ? (
                                  <span className="text-emerald-600">+{rec.difference}</span>
                                ) : rec.difference < 0 ? (
                                  <span className="text-amber-600">{rec.difference}</span>
                                ) : (
                                  <span className="text-slate-400">0</span>
                                )
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {rec.reconciliationStatus === 'reconciled' ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Reconciled
                                </span>
                              ) : rec.reconciliationStatus === 'incomplete' ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  Partial Breakdown
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                                  Unreconciled
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {isMatch && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                  Matched
                                </span>
                              )}
                              {isReview && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                  Needs Review
                                </span>
                              )}
                              {isAmbiguous && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-800 border border-orange-300">
                                  Ambiguous
                                </span>
                              )}
                              {isNotFound && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  Not Found
                                </span>
                              )}
                              {isDup && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  Duplicate
                                </span>
                              )}
                              {isConflict && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                  Conflicting
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setViewingRecord(rec)}
                                className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600"
                                title="View Record Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 4: CONFIRMATION */}
        {currentStage === 'confirm' && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200/80 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <h4 className="font-bold text-sm text-emerald-900">
                  Ready to Update {citationSummary?.eligibleUpdatesCount ?? 0} Publications
                </h4>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                Confirmed citation reports will update the approved citation totals on each matched publication and save the full yearly breakdown into citation history.
              </p>
            </div>

            {/* Warnings on decreases */}
            {decreasingRecords.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-bold text-amber-900">
                    Warning: {decreasingRecords.length} publication{decreasingRecords.length > 1 ? 's have' : ' has'} an imported count lower than current total
                  </span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto pl-6 pr-1 font-mono text-[11px] text-amber-800">
                  {decreasingRecords.map(dr => (
                    <div key={dr.recordId} className="flex justify-between gap-2">
                      <span className="truncate">{dr.documentTitle}</span>
                      <span className="font-bold">{dr.existingTotal} → {dr.importedTotal} ({dr.difference})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Excluded items note */}
            {((citationSummary?.needsReviewCount || 0) + (citationSummary?.notFoundCount || 0) + (citationSummary?.ambiguousCount || 0)) > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                <span className="font-semibold text-slate-800 block">Excluded from this update:</span>
                <p>• {citationSummary?.notFoundCount || 0} unmatched records will NOT create new publications.</p>
                <p>• {(citationSummary?.needsReviewCount || 0) + (citationSummary?.ambiguousCount || 0)} records needing review will be held safely until resolved.</p>
                <p>• {citationSummary?.duplicateCount || 0} duplicate citation records across coauthor reports will not double-count.</p>
              </div>
            )}

            {/* Confirmation Checkbox */}
            <div className="pt-2 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="citation-confirm-chk"
                checked={confirmCheckbox}
                onChange={(e) => setConfirmCheckbox(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-[#2855B9] focus:ring-[#2855B9]"
              />
              <label htmlFor="citation-confirm-chk" className="text-xs text-slate-700 cursor-pointer select-none">
                I verify that the imported citation reports are authorized and authorize updating the official Christ University IQAC database records.
              </label>
            </div>
          </div>
        )}

        {/* STAGE 5: SUMMARY */}
        {currentStage === 'summary' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <Check className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                Citation Overview Import Completed Successfully!
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                Updated citation totals and recorded year-wise citation snapshots for{' '}
                <strong className="font-bold text-slate-900">{resultSummary?.updatedCount ?? 0}</strong> publications.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Footer */}
      <div className="px-6 py-3.5 border-t border-slate-200 bg-white shrink-0 flex justify-between items-center sm:justify-between m-0">
        {currentStage === 'summary' ? (
          <div className="w-full flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={onClose}
              className="bg-[#2855B9] hover:bg-[#1C355B] text-white text-xs px-5 shadow-2xs font-semibold"
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <div>
              {currentStage === 'upload' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="text-xs text-slate-600 hover:text-slate-900 border-slate-300"
                >
                  Cancel
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loading || isSubmitting}
                  onClick={() => {
                    if (currentStage === 'validation') setCurrentStage('upload');
                    else if (currentStage === 'preview') setCurrentStage('validation');
                    else if (currentStage === 'confirm') setCurrentStage('preview');
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 border-slate-300"
                >
                  Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStage === 'upload' && (
                <Button
                  type="button"
                  size="sm"
                  disabled={citationFiles.length === 0 || loading}
                  onClick={handleValidateFiles}
                  className="bg-[#2855B9] hover:bg-[#1C355B] text-white text-xs px-4 shadow-2xs font-semibold"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    `Validate Citation Files (${citationFiles.length}) →`
                  )}
                </Button>
              )}

              {currentStage === 'validation' && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setCurrentStage('preview')}
                  className="bg-[#2855B9] hover:bg-[#1C355B] text-white text-xs px-4 shadow-2xs font-semibold"
                >
                  Proceed to Preview ({citationRecords.length} records) →
                </Button>
              )}

              {currentStage === 'preview' && (
                <Button
                  type="button"
                  size="sm"
                  disabled={(citationSummary?.eligibleUpdatesCount || 0) === 0}
                  onClick={() => setCurrentStage('confirm')}
                  className="bg-[#2855B9] hover:bg-[#1C355B] text-white text-xs px-4 shadow-2xs font-semibold"
                >
                  Proceed to Confirmation ({citationSummary?.eligibleUpdatesCount ?? 0} eligible) →
                </Button>
              )}

              {currentStage === 'confirm' && (
                <Button
                  type="button"
                  size="sm"
                  disabled={!confirmCheckbox || isSubmitting || (citationSummary?.eligibleUpdatesCount || 0) === 0}
                  onClick={handleConfirmUpdates}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-5 shadow-2xs font-bold"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    `Confirm Citation Updates (${citationSummary?.eligibleUpdatesCount ?? 0})`
                  )}
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Row Details Modal */}
      {viewingRecord && (
        <Dialog open={!!viewingRecord} onOpenChange={(open) => !open && setViewingRecord(null)}>
          <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto bg-white p-5 rounded-2xl border border-slate-200 shadow-2xl">
            <DialogHeader className="pb-3 border-b border-slate-100">
              <DialogTitle className="text-base font-bold text-slate-900">
                Citation Record Inspection
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Source File: {viewingRecord.sourceFile} (Row {viewingRecord.rowIndex})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              {/* Document Info */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Citation Document</span>
                <p className="font-semibold text-slate-900 text-sm">{viewingRecord.documentTitle}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-slate-400 text-[10px] block">ISSN:</span>
                    <span className="font-mono text-slate-700">{viewingRecord.issn || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Pub Year:</span>
                    <span className="font-mono text-slate-700">{viewingRecord.publicationYear || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Volume / Issue:</span>
                    <span className="text-slate-700">{viewingRecord.volume || '—'} / {viewingRecord.issue || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Journal:</span>
                    <span className="text-slate-700 truncate block">{viewingRecord.journalTitle || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Matched Publication */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Matched IQAC Publication</span>
                {viewingRecord.matchedPublicationTitle ? (
                  <div className="space-y-1">
                    <p className="font-semibold text-emerald-800">{viewingRecord.matchedPublicationTitle}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>Method: <strong className="text-slate-700">{viewingRecord.matchMethod}</strong></span>
                      <span>•</span>
                      <span>Confidence: <strong className="text-slate-700">{viewingRecord.matchConfidence}</strong></span>
                      <span>•</span>
                      <span>Dept: <strong className="text-slate-700">{viewingRecord.matchedPublicationDepartment || '—'}</strong></span>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-400 italic">No matching publication in IQAC database.</p>
                )}
              </div>

              {/* Dynamic Year-wise Breakdown Table */}
              {viewingRecord.yearlyDetails && viewingRecord.yearlyDetails.length > 0 && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">
                    Dynamic Citation Period Breakdown
                  </span>
                  <div className="overflow-x-auto max-h-44 border border-slate-150 rounded-lg">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500">
                        <tr>
                          <th className="py-1.5 px-3">Period</th>
                          <th className="py-1.5 px-3">Type</th>
                          <th className="py-1.5 px-3 text-right">Count</th>
                          <th className="py-1.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingRecord.yearlyDetails.map((yd: any, idx: number) => (
                          <tr key={idx} className={yd.periodType === 'subtotal' ? 'bg-slate-50 font-semibold' : ''}>
                            <td className="py-1.5 px-3 font-mono">{yd.period}</td>
                            <td className="py-1.5 px-3 capitalize text-slate-500">{yd.periodType}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-bold">
                              {yd.citationCount !== null ? yd.citationCount : '—'}
                            </td>
                            <td className="py-1.5 px-3 text-center">
                              <span className={`inline-flex px-1.5 py-0.2 rounded text-[9px] ${
                                yd.status === 'known' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {yd.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Review notes */}
              {viewingRecord.reviewReasons && viewingRecord.reviewReasons.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1 text-xs">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">Validation & Reconciliation Notes:</span>
                  {viewingRecord.reviewReasons.map((r: string, idx: number) => (
                    <p key={idx} className="text-amber-800 flex items-center gap-1">• {r}</p>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-slate-100 flex justify-end">
              <Button size="sm" onClick={() => setViewingRecord(null)} className="bg-[#2855B9] text-white text-xs px-4">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  BookOpen, FileText, Award, TrendingUp, Users, Calendar, 
  Building, CheckCircle, Clock, DollarSign, Plus, Search, 
  Trash2, Edit, Eye, Download, AlertCircle, Briefcase, Upload, X, BarChart3,
  Layers, Sparkles, HelpCircle, Save, FileSpreadsheet, UploadCloud, CheckCircle2,
  AlertTriangle, FileCheck, ArrowRight, RefreshCw, FileDown
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import { PatentsPage } from './PatentsPage';
import { SponsoredResearchPage } from './SponsoredResearchPage';
import { ConsultancyProjectsPage } from './ConsultancyProjectsPage';
import { PublicationsPage } from './PublicationsPage';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';
import { normalizeDepartmentName } from './FacultyDetailsPage';
import { Button } from './ui/button';

interface ResearchPageProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function ResearchPage({ onNavigate, currentPage }: ResearchPageProps) {
  const { user } = useAuth();
  
  // Navigation sync helper
  const getTabFromPage = (page: string) => {
    switch (page) {
      case 'research-metrics': return 'metrics';
      case 'publications': return 'publications';
      case 'research-innovation': return 'patents';
      case 'sponsored-research': return 'sponsored';
      case 'consultancy-projects': return 'consultancy';
      default: return 'metrics';
    }
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case 'metrics':
        onNavigate('research-metrics');
        break;
      case 'publications':
        onNavigate('publications');
        break;
      case 'patents':
        onNavigate('research-innovation');
        break;
      case 'sponsored':
        onNavigate('sponsored-research');
        break;
      case 'consultancy':
        onNavigate('consultancy-projects');
        break;
    }
  };

  const activeTab = getTabFromPage(currentPage);

  // --- Aggregate Metrics Grid States ---
  const [researchMetrics, setResearchMetrics] = useState<any[]>([]);
  const [breakdownType, setBreakdownType] = useState<'dept' | 'monthly'>('dept');
  const [metricYear, setMetricYear] = useState('2024-2025');
  const [metricDept, setMetricDept] = useState('AI and Data Science Engineering');
  const [isEditingGrid, setIsEditingGrid] = useState(false);
  const [editableGridData, setEditableGridData] = useState<any[]>([]);
  const [loadingGrid, setLoadingGrid] = useState(false);

  // Excel Upload & Export States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { departmentList: dbDepts } = useAcademicHierarchy();
  const departments = React.useMemo(() => {
    const set = new Set<string>();
    dbDepts.forEach(d => {
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
  }, [dbDepts]);

  const months = [
    'June', 'July', 'August', 'September', 'October', 'November', 'December',
    'January', 'February', 'March', 'April', 'May'
  ];

  const getPeriodValueForMonth = (monthName: string, acYear: string) => {
    const parts = acYear.split('-');
    const yearStart = parts[0];
    const yearEnd = parts[1];
    const isSecondHalf = ['January', 'February', 'March', 'April', 'May'].includes(monthName);
    const year = isSecondHalf ? yearEnd : yearStart;
    return `${monthName} - ${year}`;
  };

  // Fetch Aggregate Research Metrics from DB
  const fetchResearchMetrics = async () => {
    if (!user?.token) return;
    setLoadingGrid(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/research-metrics?academicYear=${metricYear}`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const json = await res.json();
      if (json.success) {
        setResearchMetrics(json.data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingGrid(false);
    }
  };

  const [isClearOpen, setIsClearOpen] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const handleClearAll = async () => {
    try {
      setClearLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/research-metrics/clear-all`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user?.token || localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setResearchMetrics([]);
        setIsClearOpen(false);
      } else {
        alert(data.message || 'Failed to clear research metrics');
      }
    } catch (err) {
      console.error('Error clearing metrics:', err);
      alert('Network error while clearing research metrics');
    } finally {
      setClearLoading(false);
    }
  };

  useEffect(() => {
    fetchResearchMetrics();
  }, [user?.token, metricYear]);

  // Construct Spreadsheet rows
  useEffect(() => {
    if (breakdownType === 'dept') {
      const rows = departments.map(dept => {
        const found = researchMetrics.find(
          m => (m.periodType === 'academic_year' || m.periodType === 'yearly') && 
               m.academicYear === metricYear && 
               m.department?.toLowerCase() === dept.toLowerCase()
        );
        return {
          department: dept,
          periodValue: metricYear,
          periodType: 'academic_year',
          academicYear: metricYear,
          books: found?.books || 0,
          chapters: found?.chapters || 0,
          scopusJournals: found?.scopusJournals || 0,
          nationalJournals: found?.nationalJournals || 0,
          internationalJournals: found?.internationalJournals || 0,
          citations: found?.citations || 0,
          patentsIndian: found?.patentsIndian || 0,
          patentsInternational: found?.patentsInternational || 0,
          conferencesNational: found?.conferencesNational || 0,
          conferencesInternational: found?.conferencesInternational || 0,
          consultancyCount: found?.consultancyCount || 0,
          consultancyAmount: found?.consultancyAmount || 0,
          seedMoneyCount: found?.seedMoneyCount || 0,
          seedMoneyAmount: found?.seedMoneyAmount || 0,
          externalProjectsCount: found?.externalProjectsCount || 0,
          externalProjectsAmount: found?.externalProjectsAmount || 0,
        };
      });
      setEditableGridData(rows);
    } else {
      const rows = months.map(mName => {
        const periodVal = getPeriodValueForMonth(mName, metricYear);
        const found = researchMetrics.find(
          m => (m.periodType === 'month' || m.periodType === 'monthly') && 
               m.academicYear === metricYear && 
               m.periodValue === periodVal && 
               m.department?.toLowerCase() === metricDept.toLowerCase()
        );
        return {
          department: metricDept,
          periodValue: periodVal,
          periodType: 'month',
          academicYear: metricYear,
          books: found?.books || 0,
          chapters: found?.chapters || 0,
          scopusJournals: found?.scopusJournals || 0,
          nationalJournals: found?.nationalJournals || 0,
          internationalJournals: found?.internationalJournals || 0,
          citations: found?.citations || 0,
          patentsIndian: found?.patentsIndian || 0,
          patentsInternational: found?.patentsInternational || 0,
          conferencesNational: found?.conferencesNational || 0,
          conferencesInternational: found?.conferencesInternational || 0,
          consultancyCount: found?.consultancyCount || 0,
          consultancyAmount: found?.consultancyAmount || 0,
          seedMoneyCount: found?.seedMoneyCount || 0,
          seedMoneyAmount: found?.seedMoneyAmount || 0,
          externalProjectsCount: found?.externalProjectsCount || 0,
          externalProjectsAmount: found?.externalProjectsAmount || 0,
        };
      });
      setEditableGridData(rows);
    }
  }, [breakdownType, metricYear, metricDept, researchMetrics, departments]);

  const handleCellChange = (rowIndex: number, field: string, value: string) => {
    const updated = [...editableGridData];
    const num = field.includes('Amount') ? parseFloat(value) || 0 : parseInt(value) || 0;
    updated[rowIndex] = { ...updated[rowIndex], [field]: num };
    setEditableGridData(updated);
  };

  const handleSaveGrid = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/research-metrics/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ metrics: editableGridData })
      });
      const json = await res.json();
      if (json.success) {
        setIsEditingGrid(false);
        fetchResearchMetrics();
      } else {
        alert(json.message || 'Failed to update research metrics grid.');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating research metrics.');
    }
  };

  const handleExportCSV = () => {
    const headersRow = [
      breakdownType === 'dept' ? 'Department' : 'Month',
      'Books', 'Chapters', 'Scopus Journals', 'National Journals', 'International Journals', 'Citations',
      'Patents (Indian)', 'Patents (International)',
      'Conferences (National)', 'Conferences (International)',
      'Consultancy (Count)', 'Consultancy (Amount in Lakhs)',
      'Seed Money (Count)', 'Seed Money (Amount in Lakhs)',
      'Externally Funded Projects (Count)', 'Externally Funded Projects (Amount in Lakhs)'
    ];

    let csvContent = headersRow.join(',') + '\n';

    editableGridData.forEach(row => {
      const rowData = [
        `"${breakdownType === 'dept' ? row.department : row.periodValue}"`,
        row.books, row.chapters, row.scopusJournals, row.nationalJournals, row.internationalJournals, row.citations,
        row.patentsIndian, row.patentsInternational,
        row.conferencesNational, row.conferencesInternational,
        row.consultancyCount, row.consultancyAmount,
        row.seedMoneyCount, row.seedMoneyAmount,
        row.externalProjectsCount, row.externalProjectsAmount
      ];
      csvContent += rowData.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', breakdownType === 'dept' 
      ? `research_metrics_dept_${metricYear}.csv` 
      : `research_metrics_monthly_${metricDept}_${metricYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const headers = [
      breakdownType === 'dept' ? 'Department' : 'Month',
      'Books', 'Chapters', 'Scopus Journals', 'National Journals', 'International Journals', 'Citations',
      'Patents (Indian)', 'Patents (International)',
      'Conferences (National)', 'Conferences (International)',
      'Consultancy (Count)', 'Consultancy (Amount in Lakhs)',
      'Seed Money (Count)', 'Seed Money (Amount in Lakhs)',
      'Externally Funded Projects (Count)', 'Externally Funded Projects (Amount in Lakhs)'
    ];

    const dataRows = editableGridData.map(row => [
      breakdownType === 'dept' ? row.department : row.periodValue,
      row.books, row.chapters, row.scopusJournals, row.nationalJournals, row.internationalJournals, row.citations,
      row.patentsIndian, row.patentsInternational,
      row.conferencesNational, row.conferencesInternational,
      row.consultancyCount, row.consultancyAmount,
      row.seedMoneyCount, row.seedMoneyAmount,
      row.externalProjectsCount, row.externalProjectsAmount
    ]);

    const summaryRow = [
      'TOTAL SUMMARY',
      gridTotals.books, gridTotals.chapters, gridTotals.scopusJournals, gridTotals.nationalJournals, gridTotals.internationalJournals, gridTotals.citations,
      gridTotals.patentsIndian, gridTotals.patentsInternational,
      gridTotals.conferencesNational, gridTotals.conferencesInternational,
      gridTotals.consultancyCount, Number(gridTotals.consultancyAmount).toFixed(2),
      gridTotals.seedMoneyCount, Number(gridTotals.seedMoneyAmount).toFixed(2),
      gridTotals.externalProjectsCount, Number(gridTotals.externalProjectsAmount).toFixed(2)
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows, summaryRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Research_Metrics_Grid');
    
    const fileName = breakdownType === 'dept'
      ? `CHRIST_Research_Metrics_Dept_${metricYear}.xlsx`
      : `CHRIST_Research_Metrics_${metricDept.replace(/\s+/g, '_')}_${metricYear}.xlsx`;

    XLSX.writeFile(wb, fileName);
  };

  const handleDownloadExcelTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Department Matrix Template
    const deptHeaders = [
      'Department', 'Academic Year',
      'Books', 'Chapters', 'Scopus Journals', 'National Journals', 'International Journals', 'Citations',
      'Patents (Indian)', 'Patents (International)',
      'Conferences (National)', 'Conferences (International)',
      'Consultancy (Count)', 'Consultancy (Amount in Lakhs)',
      'Seed Money (Count)', 'Seed Money (Amount in Lakhs)',
      'Externally Funded Projects (Count)', 'Externally Funded Projects (Amount in Lakhs)'
    ];
    const deptRows = departments.map(d => [
      d, metricYear,
      0, 0, 0, 0, 0, 0,
      0, 0,
      0, 0,
      0, 0.0,
      0, 0.0,
      0, 0.0
    ]);
    const wsDept = XLSX.utils.aoa_to_sheet([deptHeaders, ...deptRows]);
    XLSX.utils.book_append_sheet(wb, wsDept, 'Department_Metrics');

    // Sheet 2: Monthly Matrix Template
    const monthHeaders = [
      'Month', 'Department', 'Academic Year',
      'Books', 'Chapters', 'Scopus Journals', 'National Journals', 'International Journals', 'Citations',
      'Patents (Indian)', 'Patents (International)',
      'Conferences (National)', 'Conferences (International)',
      'Consultancy (Count)', 'Consultancy (Amount in Lakhs)',
      'Seed Money (Count)', 'Seed Money (Amount in Lakhs)',
      'Externally Funded Projects (Count)', 'Externally Funded Projects (Amount in Lakhs)'
    ];
    const monthRows = months.map(m => [
      m, metricDept, metricYear,
      0, 0, 0, 0, 0, 0,
      0, 0,
      0, 0,
      0, 0.0,
      0, 0.0,
      0, 0.0
    ]);
    const wsMonth = XLSX.utils.aoa_to_sheet([monthHeaders, ...monthRows]);
    XLSX.utils.book_append_sheet(wb, wsMonth, 'Monthly_Metrics');

    XLSX.writeFile(wb, `CHRIST_Research_Metrics_Template_${metricYear}.xlsx`);
  };

  // Normalizes header keys to standard metric fields
  const normalizeExcelHeaderKey = (rawHeader: string): string => {
    const clean = String(rawHeader || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (/^(dept|department|school|departmentname)$/.test(clean)) return 'department';
    if (/^(month|period|periodvalue|academicmonth)$/.test(clean)) return 'periodValue';
    if (/^(academicyear|ay|year)$/.test(clean)) return 'academicYear';
    if (/^(books|authoredbooks|book)$/.test(clean)) return 'books';
    if (/^(chapters|bookchapters|chapter)$/.test(clean)) return 'chapters';
    if (/^(scopus|scopusjournals|scopuswos|wos|scopusindexedjournals)$/.test(clean)) return 'scopusJournals';
    if (/^(nationaljournals|nationaljournal|national)$/.test(clean)) return 'nationalJournals';
    if (/^(internationaljournals|internationaljournal|intljournals|international)$/.test(clean)) return 'internationalJournals';
    if (/^(citations|totalcitations|citation)$/.test(clean)) return 'citations';
    if (/^(patentsindian|indianpatents|patentindian|patentsin)$/.test(clean)) return 'patentsIndian';
    if (/^(patentsinternational|internationalpatents|patentinternational|patentsintl)$/.test(clean)) return 'patentsInternational';
    if (/^(conferencesnational|nationalconferences|conferencenational)$/.test(clean)) return 'conferencesNational';
    if (/^(conferencesinternational|internationalconferences|conferenceinternational|intlconferences)$/.test(clean)) return 'conferencesInternational';
    if (/^(consultancycount|consultancyprojects|consultancycontracts|consultancy)$/.test(clean)) return 'consultancyCount';
    if (/^(consultancyamount|consultancyamountinlakhs|consultancyrevenue|consultancylakhs)$/.test(clean)) return 'consultancyAmount';
    if (/^(seedmoneycount|seedmoneyprojects|seedgrants|seedcount)$/.test(clean)) return 'seedMoneyCount';
    if (/^(seedmoneyamount|seedmoneyamountinlakhs|seedamount|seedmoneylakhs)$/.test(clean)) return 'seedMoneyAmount';
    if (/^(externalprojectscount|externallyfundedprojectscount|fundedprojectscount|externalgrants)$/.test(clean)) return 'externalProjectsCount';
    if (/^(externalprojectsamount|externallyfundedprojectsamountinlakhs|externalgrantsamount|externalprojectsamountinlakhs|externalgrantsamountinlakhs)$/.test(clean)) return 'externalProjectsAmount';
    return clean;
  };

  const handleFileProcess = (file: File) => {
    setUploadFile(file);
    setUploadErrors([]);
    setUploadSuccessMessage(null);

    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const lowerName = file.name.toLowerCase();
    if (!validExtensions.some(ext => lowerName.endsWith(ext))) {
      setUploadErrors(['Please select a valid Excel (.xlsx, .xls) or CSV (.csv) file.']);
      setPreviewRows([]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          setUploadErrors(['The uploaded file is empty or has no readable data rows.']);
          setPreviewRows([]);
          return;
        }

        const errors: string[] = [];
        const parsedList: any[] = [];

        rawJson.forEach((row, idx) => {
          const rowNum = idx + 2;
          const mapped: any = {};
          Object.keys(row).forEach(key => {
            const normalizedKey = normalizeExcelHeaderKey(key);
            mapped[normalizedKey] = row[key];
          });

          // Detect department and periodValue
          let dept = mapped.department ? normalizeDepartmentName(String(mapped.department).trim()) : '';
          let periodVal = mapped.periodValue ? String(mapped.periodValue).trim() : '';
          let acYear = mapped.academicYear ? String(mapped.academicYear).trim() : metricYear;

          // If in monthly breakdown and department missing, use active department
          if (!dept && breakdownType === 'monthly') {
            dept = metricDept;
          } else if (!dept && breakdownType === 'dept' && !periodVal) {
            const firstColVal = Object.values(row)[0];
            if (firstColVal) dept = normalizeDepartmentName(String(firstColVal).trim());
          }

          // If periodVal is a month name e.g. "June", convert to "June - 2024"
          let periodType: 'academic_year' | 'month' = 'academic_year';
          if (periodVal && months.includes(periodVal)) {
            periodVal = getPeriodValueForMonth(periodVal, acYear);
            periodType = 'month';
          } else if (periodVal && periodVal.includes('-') && months.some(m => periodVal.startsWith(m))) {
            periodType = 'month';
          } else if (breakdownType === 'monthly') {
            periodType = 'month';
            if (!periodVal) {
              const monthName = months[idx % months.length];
              periodVal = getPeriodValueForMonth(monthName, acYear);
            }
          } else {
            periodType = 'academic_year';
            periodVal = acYear;
          }

          if (!dept) {
            errors.push(`Row ${rowNum}: Missing Department name.`);
          }

          const parsedRow = {
            academicYear: acYear,
            periodType,
            periodValue: periodVal,
            department: dept || 'General',
            books: parseInt(mapped.books, 10) || 0,
            chapters: parseInt(mapped.chapters, 10) || 0,
            scopusJournals: parseInt(mapped.scopusJournals, 10) || 0,
            nationalJournals: parseInt(mapped.nationalJournals, 10) || 0,
            internationalJournals: parseInt(mapped.internationalJournals, 10) || 0,
            citations: parseInt(mapped.citations, 10) || 0,
            patentsIndian: parseInt(mapped.patentsIndian, 10) || 0,
            patentsInternational: parseInt(mapped.patentsInternational, 10) || 0,
            conferencesNational: parseInt(mapped.conferencesNational, 10) || 0,
            conferencesInternational: parseInt(mapped.conferencesInternational, 10) || 0,
            consultancyCount: parseInt(mapped.consultancyCount, 10) || 0,
            consultancyAmount: parseFloat(mapped.consultancyAmount) || 0.00,
            seedMoneyCount: parseInt(mapped.seedMoneyCount, 10) || 0,
            seedMoneyAmount: parseFloat(mapped.seedMoneyAmount) || 0.00,
            externalProjectsCount: parseInt(mapped.externalProjectsCount, 10) || 0,
            externalProjectsAmount: parseFloat(mapped.externalProjectsAmount) || 0.00,
          };

          parsedList.push(parsedRow);
        });

        if (errors.length > 5) {
          setUploadErrors([
            `${errors.length} validation issues detected:`,
            ...errors.slice(0, 5),
            `...and ${errors.length - 5} more.`
          ]);
        } else if (errors.length > 0) {
          setUploadErrors(errors);
        }

        setPreviewRows(parsedList);
      } catch (err: any) {
        console.error(err);
        setUploadErrors([`Failed to read spreadsheet: ${err.message || 'Invalid format'}`]);
        setPreviewRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveUploadedMetrics = async () => {
    if (!previewRows || previewRows.length === 0) return;
    setIsUploading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/research-metrics/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ metrics: previewRows })
      });
      const json = await res.json();
      if (json.success) {
        setUploadSuccessMessage(`Successfully imported ${previewRows.length} research metric records!`);
        fetchResearchMetrics();
        setTimeout(() => {
          setIsUploadModalOpen(false);
          setPreviewRows([]);
          setUploadFile(null);
          setUploadSuccessMessage(null);
        }, 1200);
      } else {
        setUploadErrors([json.message || 'Failed to save uploaded metrics.']);
      }
    } catch (e: any) {
      console.error(e);
      setUploadErrors(['Server communication error saving metrics.']);
    } finally {
      setIsUploading(false);
    }
  };

  // Real-time Summation for the grid totals row
  const gridTotals = React.useMemo(() => ({
    books: editableGridData.reduce((sum, r) => sum + (r.books || 0), 0),
    chapters: editableGridData.reduce((sum, r) => sum + (r.chapters || 0), 0),
    scopusJournals: editableGridData.reduce((sum, r) => sum + (r.scopusJournals || 0), 0),
    nationalJournals: editableGridData.reduce((sum, r) => sum + (r.nationalJournals || 0), 0),
    internationalJournals: editableGridData.reduce((sum, r) => sum + (r.internationalJournals || 0), 0),
    citations: editableGridData.reduce((sum, r) => sum + (r.citations || 0), 0),
    patentsIndian: editableGridData.reduce((sum, r) => sum + (r.patentsIndian || 0), 0),
    patentsInternational: editableGridData.reduce((sum, r) => sum + (r.patentsInternational || 0), 0),
    conferencesNational: editableGridData.reduce((sum, r) => sum + (r.conferencesNational || 0), 0),
    conferencesInternational: editableGridData.reduce((sum, r) => sum + (r.conferencesInternational || 0), 0),
    consultancyCount: editableGridData.reduce((sum, r) => sum + (r.consultancyCount || 0), 0),
    consultancyAmount: editableGridData.reduce((sum, r) => sum + (Number(r.consultancyAmount) || 0), 0),
    seedMoneyCount: editableGridData.reduce((sum, r) => sum + (r.seedMoneyCount || 0), 0),
    seedMoneyAmount: editableGridData.reduce((sum, r) => sum + (Number(r.seedMoneyAmount) || 0), 0),
    externalProjectsCount: editableGridData.reduce((sum, r) => sum + (r.externalProjectsCount || 0), 0),
    externalProjectsAmount: editableGridData.reduce((sum, r) => sum + (Number(r.externalProjectsAmount) || 0), 0),
  }), [editableGridData]);

  const totalPublicationsCount = gridTotals.scopusJournals + gridTotals.nationalJournals + gridTotals.internationalJournals;
  const totalPatentsCount = gridTotals.patentsIndian + gridTotals.patentsInternational;

  const isEditableRole = user?.role === 'admin' || user?.role === 'hod' || user?.role === 'coordinator';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      
      <main className="ml-64 flex-1 min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-300">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Master Tabs Header */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-gradient-to-br from-[#1e3a5f] to-[#2f4692] text-white rounded-xl shadow-md">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                      Research & Innovation Workspace
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Unified ecosystem managing publications, patents, sponsored research grants, consultancy projects, and NAAC/NIRF metrics
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions on Metrics Grid View */}
              {activeTab === 'metrics' && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Refresh Button */}
                  <Button
                    onClick={fetchResearchMetrics}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1.5 border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-sm"
                    title="Refresh Research Metrics"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingGrid ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </Button>

                  {/* Export Excel (.xlsx) */}
                  <Button 
                    onClick={handleExportExcel}
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1.5 border-emerald-200 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100/80 text-xs font-bold shadow-sm"
                    title="Export current research metrics matrix to Excel spreadsheet (.xlsx)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export Excel</span>
                  </Button>

                  {/* Export CSV */}
                  <Button 
                    onClick={handleExportCSV}
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-1.5 border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-xs font-semibold shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-500" />
                    <span>Export CSV</span>
                  </Button>
                  
                  {isEditableRole && (
                    <>
                      {/* Clear Data Button */}
                      <Button
                        onClick={() => setIsClearOpen(true)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5 border-red-200 text-red-600 bg-white hover:bg-red-50 text-xs font-semibold shadow-sm"
                        title="Clear All Research Metrics"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear Data</span>
                      </Button>
                      {/* Upload in Excel Button */}
                      <Button 
                        onClick={() => {
                          setUploadFile(null);
                          setPreviewRows([]);
                          setUploadErrors([]);
                          setUploadSuccessMessage(null);
                          setIsUploadModalOpen(true);
                        }}
                        size="sm"
                        className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white text-xs font-bold shadow-sm"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload in Excel</span>
                      </Button>

                      {isEditingGrid ? (
                        <div className="flex items-center gap-2">
                          <Button 
                            onClick={() => {
                              setIsEditingGrid(false);
                              fetchResearchMetrics();
                            }}
                            variant="outline" 
                            size="sm"
                            className="text-gray-700 border-gray-200 text-xs"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleSaveGrid}
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm flex items-center gap-1.5"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Changes</span>
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => setIsEditingGrid(true)}
                          size="sm"
                          className="flex items-center gap-1.5 bg-[#2f4692] hover:bg-[#243a7a] text-white text-xs font-semibold shadow-sm"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit Grid Data</span>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Master Tabs List */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="bg-slate-100 p-1.5 rounded-xl w-full flex flex-wrap justify-start gap-1 border border-slate-200 shadow-inner h-auto">
                <TabsTrigger 
                  value="metrics" 
                  className="py-2 px-3.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all data-[state=active]:bg-white data-[state=active]:text-[#1e3a5f] data-[state=active]:shadow-sm"
                >
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <span>Research Metrics Grid</span>
                </TabsTrigger>

                <TabsTrigger 
                  value="publications" 
                  className="py-2 px-3.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all data-[state=active]:bg-white data-[state=active]:text-[#1e3a5f] data-[state=active]:shadow-sm"
                >
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>Publications</span>
                </TabsTrigger>

                <TabsTrigger 
                  value="patents" 
                  className="py-2 px-3.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all data-[state=active]:bg-white data-[state=active]:text-[#1e3a5f] data-[state=active]:shadow-sm"
                >
                  <Award className="w-4 h-4 text-amber-600" />
                  <span>Patents & IP</span>
                </TabsTrigger>

                <TabsTrigger 
                  value="sponsored" 
                  className="py-2 px-3.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all data-[state=active]:bg-white data-[state=active]:text-[#1e3a5f] data-[state=active]:shadow-sm"
                >
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Sponsored Research</span>
                </TabsTrigger>

                <TabsTrigger 
                  value="consultancy" 
                  className="py-2 px-3.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all data-[state=active]:bg-white data-[state=active]:text-[#1e3a5f] data-[state=active]:shadow-sm"
                >
                  <Briefcase className="w-4 h-4 text-teal-600" />
                  <span>Consultancy</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* TAB 1: RESEARCH METRICS GRID */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              
              {/* Institution KPI Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white shadow-sm rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Indexed Journals</span>
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                        <BookOpen className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-gray-900">{gridTotals.scopusJournals}</span>
                      <span className="text-[10px] text-blue-600 font-medium">Scopus / WoS</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">{totalPublicationsCount} total journal publications</p>
                  </CardContent>
                </Card>

                <Card className="border border-amber-100 bg-gradient-to-br from-amber-50/70 to-white shadow-sm rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Patents & IP</span>
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                        <Award className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-gray-900">{totalPatentsCount}</span>
                      <span className="text-[10px] text-amber-600 font-medium">Filed & Granted</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">{gridTotals.patentsIndian} Indian / {gridTotals.patentsInternational} International</p>
                  </CardContent>
                </Card>

                <Card className="border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white shadow-sm rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Sponsored Grants</span>
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-emerald-700 font-mono">
                        ₹{Number(gridTotals.externalProjectsAmount).toFixed(2)}L
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium">({gridTotals.externalProjectsCount} Projects)</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">Total external grants sanctioned</p>
                  </CardContent>
                </Card>

                <Card className="border border-teal-100 bg-gradient-to-br from-teal-50/70 to-white shadow-sm rounded-xl">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider">Consultancy Revenue</span>
                      <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                        <Briefcase className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-teal-700 font-mono">
                        ₹{Number(gridTotals.consultancyAmount).toFixed(2)}L
                      </span>
                      <span className="text-[10px] text-teal-600 font-medium">({gridTotals.consultancyCount} Contracts)</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">Industry contracts & advisory</p>
                  </CardContent>
                </Card>
              </div>

              {/* Grid Control Bar */}
              <Card className="shadow-sm border-gray-200 rounded-xl bg-white">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {/* View Type Toggle */}
                    <div className="bg-gray-100 p-0.5 rounded-lg border border-gray-200 inline-flex">
                      <button
                        onClick={() => {
                          if (isEditingGrid) {
                            alert('Please save or cancel your grid modifications first.');
                            return;
                          }
                          setBreakdownType('dept');
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          breakdownType === 'dept' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        Department-wise Breakdown
                      </button>
                      <button
                        onClick={() => {
                          if (isEditingGrid) {
                            alert('Please save or cancel your grid modifications first.');
                            return;
                          }
                          setBreakdownType('monthly');
                        }}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          breakdownType === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        Monthly Breakdown
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Academic Year select */}
                    <div className="w-[155px]">
                      <Select 
                        value={metricYear} 
                        onValueChange={(val) => {
                          if (isEditingGrid) {
                            alert('Please save or cancel your grid modifications first.');
                            return;
                          }
                          setMetricYear(val);
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs border-gray-200 bg-white font-medium">
                          <SelectValue placeholder="Academic Year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2026-2027">AY 2026-2027</SelectItem>
                          <SelectItem value="2025-2026">AY 2025-2026</SelectItem>
                          <SelectItem value="2024-2025">AY 2024-2025</SelectItem>
                          <SelectItem value="2023-2024">AY 2023-2024</SelectItem>
                          <SelectItem value="2022-2023">AY 2022-2023</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Department Select (Only active in Monthly Breakdown) */}
                    {breakdownType === 'monthly' && (
                      <div className="w-[210px]">
                        <Select 
                          value={metricDept} 
                          onValueChange={(val) => {
                            if (isEditingGrid) {
                              alert('Please save or cancel your grid modifications first.');
                              return;
                            }
                            setMetricDept(val);
                          }}
                        >
                          <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                            <SelectValue placeholder="Department" />
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
                </CardContent>
              </Card>

              {/* Spreadsheet Table Container */}
              <Card className="shadow-sm border-gray-200 rounded-xl overflow-hidden bg-white">
                <CardHeader className="bg-[#243a7a] text-white p-4">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-teal-400" />
                      <span>
                        {breakdownType === 'dept' 
                          ? `Publications, Patents, Consultancy & Grants Matrix — Academic Year ${metricYear}` 
                          : `Research Profile Matrix — Department of ${metricDept} (${metricYear})`
                        }
                      </span>
                    </div>
                    {isEditingGrid && (
                      <Badge className="bg-amber-500 text-white text-[10px] animate-pulse">
                        Editing Active
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      {/* Sub-Header Spans */}
                      <tr className="bg-slate-100 text-slate-800 font-bold border-b border-gray-300 text-center">
                        <th rowSpan={2} className="border-r border-gray-300 p-2.5 text-left font-bold min-w-[170px] bg-slate-200 text-slate-900">
                          {breakdownType === 'dept' ? 'Department' : 'Month'}
                        </th>
                        <th colSpan={5} className="border-r border-gray-300 p-2 text-center bg-blue-50 text-blue-900 font-extrabold">
                          Publications & Articles
                        </th>
                        <th rowSpan={2} className="border-r border-gray-300 p-2 text-center bg-slate-50">Citations</th>
                        <th colSpan={2} className="border-r border-gray-300 p-1.5 text-center bg-amber-50 text-amber-900 font-extrabold">Patents</th>
                        <th colSpan={2} className="border-r border-gray-300 p-1.5 text-center bg-yellow-50 text-yellow-900 font-extrabold">Conferences</th>
                        <th colSpan={2} className="border-r border-gray-300 p-1.5 text-center bg-teal-50 text-teal-900 font-extrabold">Consultancy</th>
                        <th colSpan={2} className="border-r border-gray-300 p-1.5 text-center bg-purple-50 text-purple-900 font-extrabold">Seed Money</th>
                        <th colSpan={2} className="p-1.5 text-center bg-emerald-50 text-emerald-900 font-extrabold">Externally Funded Grants</th>
                      </tr>
                      {/* Secondary Columns */}
                      <tr className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-300 text-center text-[10px]">
                        <th className="border-r border-gray-200 p-1 bg-blue-50/40">Books</th>
                        <th className="border-r border-gray-200 p-1 bg-blue-50/40">Chapters</th>
                        <th className="border-r border-gray-200 p-1 bg-blue-50/70 font-bold text-blue-950">Scopus</th>
                        <th className="border-r border-gray-200 p-1 bg-blue-50/40">National</th>
                        <th className="border-r border-gray-200 p-1 bg-blue-50/40">International</th>

                        {/* Patents */}
                        <th className="border-r border-gray-200 p-1 bg-amber-50/30">Indian</th>
                        <th className="border-r border-gray-200 p-1 bg-amber-50/30">International</th>
                        {/* Conference */}
                        <th className="border-r border-gray-200 p-1 bg-yellow-50/20">National</th>
                        <th className="border-r border-gray-200 p-1 bg-yellow-50/20">International</th>
                        {/* Consultancy */}
                        <th className="border-r border-gray-200 p-1 bg-teal-50/30">Count</th>
                        <th className="border-r border-gray-200 p-1 bg-teal-50/30">₹ Lakhs</th>
                        {/* Seed Money */}
                        <th className="border-r border-gray-200 p-1 bg-purple-50/30">Count</th>
                        <th className="border-r border-gray-200 p-1 bg-purple-50/30">₹ Lakhs</th>
                        {/* External Projects */}
                        <th className="border-r border-gray-200 p-1 bg-emerald-50/30">Count</th>
                        <th className="p-1 bg-emerald-50/30">₹ Lakhs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editableGridData.map((row, rowIndex) => (
                        <tr 
                          key={rowIndex} 
                          className={`hover:bg-teal-50/30 transition-colors border-b border-gray-200 ${
                            rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                          }`}
                        >
                          {/* Label row */}
                          <td className="border-r border-gray-300 p-2.5 font-bold text-gray-800 bg-slate-50/80 text-[11px]">
                            {breakdownType === 'dept' ? row.department : row.periodValue}
                          </td>
                          
                          {/* Books */}
                          <td className="border-r border-gray-200 p-1.5 text-center">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5 bg-white font-mono" 
                                value={row.books} 
                                onChange={(e) => handleCellChange(rowIndex, 'books', e.target.value)}
                              />
                            ) : row.books}
                          </td>

                          {/* Chapters */}
                          <td className="border-r border-gray-200 p-1.5 text-center">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5 bg-white font-mono" 
                                value={row.chapters} 
                                onChange={(e) => handleCellChange(rowIndex, 'chapters', e.target.value)}
                              />
                            ) : row.chapters}
                          </td>

                          {/* Scopus */}
                          <td className="border-r border-gray-200 p-1.5 text-center font-bold text-blue-900 bg-blue-50/20">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5 bg-white font-mono font-bold text-blue-900" 
                                value={row.scopusJournals} 
                                onChange={(e) => handleCellChange(rowIndex, 'scopusJournals', e.target.value)}
                              />
                            ) : row.scopusJournals}
                          </td>

                          {/* National Journals */}
                          <td className="border-r border-gray-200 p-1.5 text-center">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5 bg-white font-mono" 
                                value={row.nationalJournals} 
                                onChange={(e) => handleCellChange(rowIndex, 'nationalJournals', e.target.value)}
                              />
                            ) : row.nationalJournals}
                          </td>

                          {/* International Journals */}
                          <td className="border-r border-gray-200 p-1.5 text-center">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5 bg-white font-mono" 
                                value={row.internationalJournals} 
                                onChange={(e) => handleCellChange(rowIndex, 'internationalJournals', e.target.value)}
                              />
                            ) : row.internationalJournals}
                          </td>

                          {/* Citations */}
                          <td className="border-r border-gray-200 p-1.5 text-center font-mono">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-14 h-6 text-center border rounded p-0.5 bg-white font-mono" 
                                value={row.citations} 
                                onChange={(e) => handleCellChange(rowIndex, 'citations', e.target.value)}
                              />
                            ) : row.citations}
                          </td>

                          {/* Patent Indian */}
                          <td className="border-r border-gray-200 p-1.5 text-center">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5 bg-white font-mono" 
                                value={row.patentsIndian} 
                                onChange={(e) => handleCellChange(rowIndex, 'patentsIndian', e.target.value)}
                              />
                            ) : row.patentsIndian}
                          </td>

                          {/* Patent International */}
                          <td className="border-r border-gray-200 p-1.5 text-center">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5 bg-white font-mono" 
                                value={row.patentsInternational} 
                                onChange={(e) => handleCellChange(rowIndex, 'patentsInternational', e.target.value)}
                              />
                            ) : row.patentsInternational}
                          </td>

                          {/* Conf National */}
                          <td className="border-r border-gray-200 p-1.5 text-center">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5 bg-white font-mono" 
                                value={row.conferencesNational} 
                                onChange={(e) => handleCellChange(rowIndex, 'conferencesNational', e.target.value)}
                              />
                            ) : row.conferencesNational}
                          </td>

                          {/* Conf International */}
                          <td className="border-r border-gray-200 p-1.5 text-center">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5 bg-white font-mono" 
                                value={row.conferencesInternational} 
                                onChange={(e) => handleCellChange(rowIndex, 'conferencesInternational', e.target.value)}
                              />
                            ) : row.conferencesInternational}
                          </td>

                          {/* Consultancy Count */}
                          <td className="border-r border-gray-200 p-1.5 text-center">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5 bg-white font-mono" 
                                value={row.consultancyCount} 
                                onChange={(e) => handleCellChange(rowIndex, 'consultancyCount', e.target.value)}
                              />
                            ) : row.consultancyCount}
                          </td>

                          {/* Consultancy Amount */}
                          <td className="border-r border-gray-200 p-1.5 text-right font-bold text-teal-800 font-mono">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                step="0.01"
                                className="w-20 h-6 text-right border rounded p-0.5 bg-white font-mono" 
                                value={row.consultancyAmount} 
                                onChange={(e) => handleCellChange(rowIndex, 'consultancyAmount', e.target.value)}
                              />
                            ) : `₹${Number(row.consultancyAmount).toFixed(2)}`}
                          </td>

                          {/* Seed Money Count */}
                          <td className="border-r border-gray-200 p-1.5 text-center">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5 bg-white font-mono" 
                                value={row.seedMoneyCount} 
                                onChange={(e) => handleCellChange(rowIndex, 'seedMoneyCount', e.target.value)}
                              />
                            ) : row.seedMoneyCount}
                          </td>

                          {/* Seed Money Amount */}
                          <td className="border-r border-gray-200 p-1.5 text-right font-medium text-purple-900 font-mono">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                step="0.01"
                                className="w-20 h-6 text-right border rounded p-0.5 bg-white font-mono" 
                                value={row.seedMoneyAmount} 
                                onChange={(e) => handleCellChange(rowIndex, 'seedMoneyAmount', e.target.value)}
                              />
                            ) : `₹${Number(row.seedMoneyAmount).toFixed(2)}`}
                          </td>

                          {/* External Projects Count */}
                          <td className="border-r border-gray-200 p-1.5 text-center">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5 bg-white font-mono" 
                                value={row.externalProjectsCount} 
                                onChange={(e) => handleCellChange(rowIndex, 'externalProjectsCount', e.target.value)}
                              />
                            ) : row.externalProjectsCount}
                          </td>

                          {/* External Projects Amount */}
                          <td className="p-1.5 text-right font-bold text-emerald-800 font-mono">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                step="0.01"
                                className="w-20 h-6 text-right border rounded p-0.5 bg-white font-mono" 
                                value={row.externalProjectsAmount} 
                                onChange={(e) => handleCellChange(rowIndex, 'externalProjectsAmount', e.target.value)}
                              />
                            ) : `₹${Number(row.externalProjectsAmount).toFixed(2)}`}
                          </td>
                        </tr>
                      ))}

                      {/* TOTAL SUMMARY ROW */}
                      <tr className="bg-[#243a7a] font-extrabold border-t-2 border-[#243a7a] text-white text-center">
                        <td className="border-r border-[#243a7a] p-3 text-left font-extrabold uppercase text-amber-400">
                          Total Summary
                        </td>
                        <td className="border-r border-[#243a7a] p-2 text-center">{gridTotals.books}</td>
                        <td className="border-r border-[#243a7a] p-2 text-center">{gridTotals.chapters}</td>
                        <td className="border-r border-[#243a7a] p-2 text-center text-blue-300 font-extrabold">{gridTotals.scopusJournals}</td>
                        <td className="border-r border-[#243a7a] p-2 text-center">{gridTotals.nationalJournals}</td>
                        <td className="border-r border-[#243a7a] p-2 text-center">{gridTotals.internationalJournals}</td>
                        <td className="border-r border-[#243a7a] p-2 text-center font-mono">{gridTotals.citations}</td>
                        
                        {/* Patents */}
                        <td className="border-r border-slate-700 p-2 text-center text-amber-300">{gridTotals.patentsIndian}</td>
                        <td className="border-r border-slate-700 p-2 text-center text-amber-300">{gridTotals.patentsInternational}</td>
                        
                        {/* Conference */}
                        <td className="border-r border-slate-700 p-2 text-center">{gridTotals.conferencesNational}</td>
                        <td className="border-r border-slate-700 p-2 text-center">{gridTotals.conferencesInternational}</td>
                        
                        {/* Consultancy */}
                        <td className="border-r border-slate-700 p-2 text-center">{gridTotals.consultancyCount}</td>
                        <td className="border-r border-slate-700 p-2 text-right text-teal-300 font-mono font-extrabold">
                          ₹{gridTotals.consultancyAmount.toFixed(2)}
                        </td>
                        
                        {/* Seed Money */}
                        <td className="border-r border-slate-700 p-2 text-center">{gridTotals.seedMoneyCount}</td>
                        <td className="border-r border-slate-700 p-2 text-right text-purple-300 font-mono font-extrabold">
                          ₹{gridTotals.seedMoneyAmount.toFixed(2)}
                        </td>
                        
                        {/* External Projects */}
                        <td className="border-r border-slate-700 p-2 text-center">{gridTotals.externalProjectsCount}</td>
                        <td className="p-2 text-right text-emerald-300 font-mono font-extrabold">
                          ₹{gridTotals.externalProjectsAmount.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

            </div>
          )}

          {/* TAB 2: PUBLICATIONS */}
          {activeTab === 'publications' && (
            <PublicationsPage hideSidebar={true} onNavigate={onNavigate} token={user?.token} userRole={user?.role} />
          )}

          {/* TAB 3: PATENTS */}
          {activeTab === 'patents' && (
            <PatentsPage hideSidebar={true} onNavigate={onNavigate} token={user?.token} userRole={user?.role} />
          )}

          {/* TAB 4: SPONSORED RESEARCH */}
          {activeTab === 'sponsored' && (
            <SponsoredResearchPage hideSidebar={true} onNavigate={onNavigate} token={user?.token} userRole={user?.role} />
          )}

          {/* TAB 5: CONSULTANCY */}
          {activeTab === 'consultancy' && (
            <ConsultancyProjectsPage hideSidebar={true} onNavigate={onNavigate} token={user?.token || ''} userRole={user?.role || 'faculty'} />
          )}

        </div>
      </main>

      {/* EXCEL UPLOAD MODAL DIALOG */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
          <DialogHeader className="space-y-2 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 tracking-tight">
                  Import Research Metrics via Excel
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Upload Excel (.xlsx, .xls) or CSV (.csv) spreadsheets to automatically populate Departmental or Monthly Research Metrics.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-4">
            
            {/* Step 1: Download Template Helper */}
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <FileCheck className="w-5 h-5 text-[#2f4692] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Need the official spreadsheet structure?</h4>
                  <p className="text-[11px] text-slate-600">
                    Download the pre-structured Excel template with all CHRIST University departments & 12-month period headers.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleDownloadExcelTemplate}
                size="sm"
                variant="outline"
                className="bg-white border-blue-300 text-[#2f4692] hover:bg-blue-100/50 text-xs font-bold shadow-sm whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download Excel Template (.xlsx)
              </Button>
            </div>

            {/* Step 2: Drag and Drop Upload Zone */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileProcess(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/60 ring-4 ring-emerald-100'
                    : uploadFile
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/60 bg-slate-50/20'
                }`}
              >
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                    uploadFile ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {uploadFile ? <FileCheck className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
                  </div>
                  <div>
                    {uploadFile ? (
                      <>
                        <p className="text-sm font-bold text-slate-900">{uploadFile.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 font-mono">
                          {(uploadFile.size / 1024).toFixed(1)} KB — Click or drag to replace file
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-slate-800">
                          Click to browse or drag & drop your Excel spreadsheet
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Supports Microsoft Excel (.xlsx, .xls) and CSV (.csv) files
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Error notifications */}
            {uploadErrors.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1 text-rose-800 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Validation Notices:</span>
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                  {uploadErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success notification */}
            {uploadSuccessMessage && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2.5 text-emerald-900 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>{uploadSuccessMessage}</span>
              </div>
            )}

            {/* Parsed Rows Preview Table */}
            {previewRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Parsed Records Preview</span>
                    <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                      {previewRows.length} Rows Ready
                    </Badge>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Academic Year: <strong>{previewRows[0]?.academicYear || metricYear}</strong>
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56 bg-white shadow-inner">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 text-slate-700 font-bold">
                      <tr>
                        <th className="p-2 border-r border-slate-200">#</th>
                        <th className="p-2 border-r border-slate-200 min-w-[150px]">Department</th>
                        <th className="p-2 border-r border-slate-200">Period</th>
                        <th className="p-2 border-r border-slate-200 text-center">Books</th>
                        <th className="p-2 border-r border-slate-200 text-center">Chapters</th>
                        <th className="p-2 border-r border-slate-200 text-center bg-blue-50/60 font-bold text-blue-900">Scopus</th>
                        <th className="p-2 border-r border-slate-200 text-center">Citations</th>
                        <th className="p-2 border-r border-slate-200 text-center">Patents (IN/INTL)</th>
                        <th className="p-2 border-r border-slate-200 text-center">Conferences</th>
                        <th className="p-2 border-r border-slate-200 text-right">Consultancy (₹L)</th>
                        <th className="p-2 text-right">Grants (₹L)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewRows.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50 font-mono">
                          <td className="p-2 text-slate-400 border-r border-slate-100">{i + 1}</td>
                          <td className="p-2 font-sans font-semibold text-slate-800 border-r border-slate-100">{r.department}</td>
                          <td className="p-2 text-slate-600 border-r border-slate-100">{r.periodValue}</td>
                          <td className="p-2 text-center text-slate-700 border-r border-slate-100">{r.books}</td>
                          <td className="p-2 text-center text-slate-700 border-r border-slate-100">{r.chapters}</td>
                          <td className="p-2 text-center font-bold text-blue-900 bg-blue-50/20 border-r border-slate-100">{r.scopusJournals}</td>
                          <td className="p-2 text-center text-slate-700 border-r border-slate-100">{r.citations}</td>
                          <td className="p-2 text-center text-slate-700 border-r border-slate-100">{r.patentsIndian}/{r.patentsInternational}</td>
                          <td className="p-2 text-center text-slate-700 border-r border-slate-100">{r.conferencesNational + r.conferencesInternational}</td>
                          <td className="p-2 text-right text-teal-800 font-bold border-r border-slate-100">₹{Number(r.consultancyAmount).toFixed(2)}</td>
                          <td className="p-2 text-right text-emerald-800 font-bold">₹{Number(r.externalProjectsAmount).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsUploadModalOpen(false);
                setPreviewRows([]);
                setUploadFile(null);
                setUploadErrors([]);
                setUploadSuccessMessage(null);
              }}
              className="text-xs border-slate-200 text-slate-700"
            >
              Cancel
            </Button>
            
            <Button
              disabled={previewRows.length === 0 || isUploading}
              onClick={handleSaveUploadedMetrics}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing Data...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Import {previewRows.length > 0 ? `(${previewRows.length} Records)` : ''} & Save</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Research Metrics Confirmation Dialog */}
      <Dialog open={isClearOpen} onOpenChange={setIsClearOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Clear Research Metrics Data
            </DialogTitle>
            <DialogDescription className="py-2 text-slate-600">
              Are you sure you want to permanently delete all aggregate research metrics data for academic year {metricYear}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setIsClearOpen(false)}
              disabled={clearLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAll}
              disabled={clearLoading}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            >
              {clearLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{clearLoading ? 'Clearing...' : 'Confirm Clear Data'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

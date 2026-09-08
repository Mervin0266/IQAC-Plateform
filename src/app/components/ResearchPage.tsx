import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  BookOpen, FileText, Award, TrendingUp, Users, Calendar, 
  Building, CheckCircle, Clock, DollarSign, Plus, Search, 
  Trash2, Edit, Eye, Download, AlertCircle, Briefcase, Upload, X, BarChart3,
  Layers, Sparkles, HelpCircle, Save
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
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

  useEffect(() => {
    fetchResearchMetrics();
  }, [user?.token, metricYear]);

  // Construct Spreadsheet rows
  useEffect(() => {
    if (breakdownType === 'dept') {
      const rows = departments.map(dept => {
        const found = researchMetrics.find(
          m => m.periodType === 'academic_year' && 
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
          m => m.periodType === 'month' && 
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
      
      <main className="flex-1 ml-64 p-8">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          
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
                <div className="flex items-center gap-2.5">
                  <Button 
                    onClick={handleExportCSV}
                    variant="outline" 
                    size="sm"
                    className="flex items-center gap-2 border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-xs font-semibold shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-500" />
                    <span>Export Grid (CSV)</span>
                  </Button>
                  
                  {isEditableRole && (
                    isEditingGrid ? (
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
                    )
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

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  BookOpen, FileText, Award, TrendingUp, Users, Calendar, 
  Building, CheckCircle, Clock, DollarSign, Plus, Search, 
  Trash2, Edit, Eye, Download, AlertCircle, Briefcase, Upload, X, BarChart3
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../contexts/AuthContext';
import { ResearchInnovationPage } from './ResearchInnovationPage';
import { ConsultancyProjectsPage } from './ConsultancyProjectsPage';
import { BulkUploadDialog } from './BulkUploadDialog';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface ResearchPageProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function ResearchPage({ onNavigate, currentPage }: ResearchPageProps) {
  const { user, logout } = useAuth();
  
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

  // Common filters for standard tabs
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Achievements State (for Publications and Sponsored Research)
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // --- Aggregate Metrics Grid States ---
  const [researchMetrics, setResearchMetrics] = useState<any[]>([]);
  const [breakdownType, setBreakdownType] = useState<'dept' | 'monthly'>('dept');
  const [metricYear, setMetricYear] = useState('2024-2025');
  const [metricDept, setMetricDept] = useState('AIML & Data Science');
  const [isEditingGrid, setIsEditingGrid] = useState(false);
  const [editableGridData, setEditableGridData] = useState<any[]>([]);

  // Add/Edit Modals state (standard achievements tabs)
  const [isPubDialogOpen, setIsPubDialogOpen] = useState(false);
  const [pubToEdit, setPubToEdit] = useState<any>(null);

  const [isProjDialogOpen, setIsProjDialogOpen] = useState(false);
  const [projToEdit, setProjToEdit] = useState<any>(null);

  const [viewingRecord, setViewingRecord] = useState<any>(null);

  // Form Fields - Publications
  const [pubForm, setPubForm] = useState({
    title: '',
    description: '',
    subcategory: 'Journal Article',
    participants: '', // Authors
    organization: '', // Journal/Publisher
    date: '',
    year: '2024-2025',
    department: '',
    impact: '', // DOI / Impact Factor
  });

  // Form Fields - Sponsored Research
  const [projForm, setProjForm] = useState({
    title: '',
    description: '',
    organization: '', // Funding Agency
    participants: '', // PI & Team
    date: '', // Start Date
    year: '2024-2025',
    score: '', // Value (₹)
    rank: 'Ongoing', // Status (Ongoing/Completed)
    impact: '', // Reference Number
    progress: '0', // Milestone progress %
  });

  const departments = [
    'CSE',
    'Computer Science and Engineering',
    'ECE',
    'Electronics and Communication Engineering',
    'EEE',
    'Electrical and Electronics Engineering',
    'MECH',
    'Mechanical Engineering',
    'CIVIL',
    'Civil Engineering',
    'Sciences and Humanities',
    'School of Architecture',
    'AIML & Data Science'
  ];

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

  // Load achievements from DB
  const fetchAchievements = async () => {
    if (!user?.token) return;
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/achievements`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      if (response.status === 401) {
        logout();
        return;
      }
      const data = await response.json();
      if (data.success) {
        setAchievements(data.data);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load Research aggregate metrics from DB
  const fetchResearchMetrics = async () => {
    if (!user?.token) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/research-metrics`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setResearchMetrics(data.data);
      }
    } catch (error) {
      console.error('Error fetching research metrics:', error);
    }
  };

  useEffect(() => {
    fetchAchievements();
    fetchResearchMetrics();
  }, [user]);

  // Synchronize current grid view when states change
  useEffect(() => {
    if (isEditingGrid) return; // Preserve user inputs while editing

    if (breakdownType === 'dept') {
      const rows = departments.map(deptName => {
        const found = researchMetrics.find(m => 
          m.academicYear === metricYear && 
          m.periodType === 'yearly' && 
          m.department === deptName
        );
        if (found) return { ...found };
        
        return {
          academicYear: metricYear,
          periodType: 'yearly',
          periodValue: `AY ${metricYear.substring(2, 4)}-${metricYear.substring(7, 9)}`,
          department: deptName,
          books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
          patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
          consultancyCount: 0, consultancyAmount: 0, seedMoneyCount: 0, seedMoneyAmount: 0, externalProjectsCount: 0, externalProjectsAmount: 0
        };
      });
      setEditableGridData(rows);
    } else {
      const rows = months.map(mName => {
        const pVal = getPeriodValueForMonth(mName, metricYear);
        const found = researchMetrics.find(m => 
          m.academicYear === metricYear && 
          m.periodType === 'monthly' && 
          m.department === metricDept && 
          m.periodValue === pVal
        );
        if (found) return { ...found };

        return {
          academicYear: metricYear,
          periodType: 'monthly',
          periodValue: pVal,
          department: metricDept,
          books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
          patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
          consultancyCount: 0, consultancyAmount: 0, seedMoneyCount: 0, seedMoneyAmount: 0, externalProjectsCount: 0, externalProjectsAmount: 0
        };
      });
      setEditableGridData(rows);
    }
  }, [researchMetrics, breakdownType, metricYear, metricDept, isEditingGrid]);

  // Handle in-place grid input change
  const handleCellChange = (rowIndex: number, fieldName: string, value: string) => {
    setEditableGridData(prev => prev.map((row, idx) => {
      if (idx !== rowIndex) return row;
      
      const parsedVal = fieldName.includes('Amount') 
        ? parseFloat(value) || 0 
        : parseInt(value, 10) || 0;
        
      return {
        ...row,
        [fieldName]: parsedVal
      };
    }));
  };

  // Submit Grid to Backend
  const handleSaveGrid = async () => {
    if (!user?.token) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/research-metrics/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ metrics: editableGridData })
      });
      const data = await response.json();
      if (data.success) {
        alert('Research metrics grid updated successfully!');
        setIsEditingGrid(false);
        fetchResearchMetrics();
      } else {
        alert(data.message || 'Failed to save research metrics.');
      }
    } catch (error) {
      console.error('Error saving metrics:', error);
      alert('Error connecting to the server to save grid.');
    }
  };

  // Export Grid data to CSV
  const handleExportCSV = () => {
    let headersRow = [
      breakdownType === 'dept' ? 'Department' : 'Month',
      'Books', 'Chapters', 'Scopus Journals', 'National Journals', 'International Journals', 'Citation',
      'Patents (Indian)', 'Patents (International)',
      'Conference (National)', 'Conference (International)',
      'Consultancy (Count)', 'Consultancy (Amount)',
      'Seed Money (Count)', 'Seed Money (Amount)',
      'Externally Funded Projects (Count)', 'Externally Funded Projects (Amount)'
    ];

    let csvContent = headersRow.join(',') + '\n';

    editableGridData.forEach(row => {
      const rowData = [
        breakdownType === 'dept' ? row.department : row.periodValue,
        row.books, row.chapters, row.scopusJournals, row.nationalJournals, row.internationalJournals, row.citations,
        row.patentsIndian, row.patentsInternational,
        row.conferencesNational, row.conferencesInternational,
        row.consultancyCount, row.consultancyAmount,
        row.seedMoneyCount, row.seedMoneyAmount,
        row.externalProjectsCount, row.externalProjectsAmount
      ];
      csvContent += rowData.map(v => typeof v === 'string' ? `"${v}"` : v).join(',') + '\n';
    });

    // Add totals row
    const totals = {
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
    };

    const totalsRow = [
      'Total',
      totals.books, totals.chapters, totals.scopusJournals, totals.nationalJournals, totals.internationalJournals, totals.citations,
      totals.patentsIndian, totals.patentsInternational,
      totals.conferencesNational, totals.conferencesInternational,
      totals.consultancyCount, totals.consultancyAmount,
      totals.seedMoneyCount, totals.seedMoneyAmount,
      totals.externalProjectsCount, totals.externalProjectsAmount
    ];
    csvContent += totalsRow.join(',') + '\n';

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

  // Fallback mocks for standard Publications & Sponsored Research lists if DB is empty
  const mockPublications = [
    {
      id: 'PUB-MOCK-1',
      title: 'Optimized Edge Computing Gateway for Smart Irrigation Systems',
      description: 'Paper proposing an energy-efficient wireless sensor network node for precision farming.',
      category: 'research',
      subcategory: 'Journal Article',
      organization: 'Springer Journal of Ambient Intelligence',
      participants: 'Dr. Priya Sharma, Dr. Rajesh Kumar',
      date: '2024-03-12',
      year: '2024-2025',
      department: 'Computer Science and Engineering',
      impact: 'DOI: 10.1007/s12652-024-04782-1',
      status: 'approved'
    },
    {
      id: 'PUB-MOCK-2',
      title: 'Performance Analysis of Hybrid Geopolymer block binders',
      description: 'Testing the compressive strength and longevity of recycled fly-ash binders.',
      category: 'research',
      subcategory: 'Conference Proceeding',
      organization: 'IEEE International Conference on Sustainable Building Materials',
      participants: 'Dr. Suresh Menon',
      date: '2023-11-20',
      year: '2023-2024',
      department: 'Civil Engineering',
      impact: 'DOI: 10.1109/ICSBM.2023.10234',
      status: 'approved'
    }
  ];

  const mockProjects = [
    {
      id: 'PROJ-MOCK-1',
      title: 'Development of AI-Powered IoT Framework for Remote Health Monitoring',
      description: 'Research grant for building an edge-computing gateway for real-time heart rate and SpO2 tracking.',
      category: 'research',
      subcategory: 'Sponsored Research',
      organization: 'DST - Department of Science and Technology',
      participants: 'Dr. Rajesh Kumar (PI), Dr. Priya Sharma (Co-PI)',
      date: '2023-09-01',
      year: '2023-2024',
      score: 3500000,
      rank: 'Ongoing',
      impact: 'DST/SERB/2023/00892',
      status: 'approved'
    }
  ];

  const dbPublications = achievements.filter(a => a.category === 'research' && a.subcategory !== 'Sponsored Research');
  const dbProjects = achievements.filter(a => a.category === 'research' && a.subcategory === 'Sponsored Research');

  const publicationsList = dbPublications.length > 0 ? dbPublications : mockPublications;
  const projectsList = dbProjects.length > 0 ? dbProjects.map(p => ({
    ...p,
    score: Number(p.score) || 0
  })) : mockProjects;

  // Filter Publications list
  const filteredPubs = publicationsList.filter(pub => {
    if (selectedYear !== 'all' && pub.year !== selectedYear) return false;
    if (selectedDept !== 'all' && pub.department && pub.department.toLowerCase().replace(/[^a-z]/g, '') !== selectedDept.toLowerCase().replace(/[^a-z]/g, '')) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleMatch = pub.title?.toLowerCase().includes(q);
      const authorsMatch = pub.participants?.toLowerCase().includes(q);
      const journalMatch = pub.organization?.toLowerCase().includes(q);
      if (!titleMatch && !authorsMatch && !journalMatch) return false;
    }
    return true;
  });

  // Filter Projects list
  const filteredProjects = projectsList.filter(proj => {
    if (selectedYear !== 'all' && proj.year !== selectedYear) return false;
    if (selectedDept !== 'all' && proj.department && proj.department.toLowerCase().replace(/[^a-z]/g, '') !== selectedDept.toLowerCase().replace(/[^a-z]/g, '')) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleMatch = proj.title?.toLowerCase().includes(q);
      const piMatch = proj.participants?.toLowerCase().includes(q);
      const agencyMatch = proj.organization?.toLowerCase().includes(q);
      if (!titleMatch && !piMatch && !agencyMatch) return false;
    }
    return true;
  });

  // Publications Stats
  const pubStats = {
    total: filteredPubs.length,
    journals: filteredPubs.filter(p => p.subcategory?.toLowerCase().includes('journal')).length,
    conferences: filteredPubs.filter(p => p.subcategory?.toLowerCase().includes('conference')).length,
    chapters: filteredPubs.filter(p => p.subcategory?.toLowerCase().includes('book') || p.subcategory?.toLowerCase().includes('chapter')).length,
  };

  // Projects Stats
  const projStats = {
    total: filteredProjects.length,
    ongoing: filteredProjects.filter(p => p.rank === 'Ongoing').length,
    completed: filteredProjects.filter(p => p.rank === 'Completed').length,
    totalFunding: filteredProjects.reduce((sum, p) => sum + (Number(p.score) || 0), 0)
  };

  // Achievements handlers
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    if (id.startsWith('PUB-MOCK-') || id.startsWith('PROJ-MOCK-')) {
      alert('Mock records cannot be deleted.');
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/achievements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      const data = await response.json();
      if (data.success) {
        alert('Deleted successfully!');
        fetchAchievements();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSavePublication = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...pubForm, category: 'research', status: 'approved' };
    try {
      let response;
      if (pubToEdit) {
        response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/achievements/${pubToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/achievements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` },
          body: JSON.stringify(payload)
        });
      }
      const data = await response.json();
      if (data.success) {
        setIsPubDialogOpen(false);
        setPubToEdit(null);
        fetchAchievements();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...projForm,
      category: 'research',
      subcategory: 'Sponsored Research',
      score: parseFloat(projForm.score) || 0,
      status: 'approved'
    };
    try {
      let response;
      if (projToEdit) {
        response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/achievements/${projToEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/achievements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user?.token}` },
          body: JSON.stringify(payload)
        });
      }
      const data = await response.json();
      if (data.success) {
        setIsProjDialogOpen(false);
        setProjToEdit(null);
        fetchAchievements();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditPubClick = (pub: any) => {
    setPubToEdit(pub);
    setPubForm({
      title: pub.title || '',
      description: pub.description || '',
      subcategory: pub.subcategory || 'Journal Article',
      participants: pub.participants || '',
      organization: pub.organization || '',
      date: pub.date || '',
      year: pub.year || '2024-2025',
      department: pub.department || '',
      impact: pub.impact || '',
    });
    setIsPubDialogOpen(true);
  };

  const handleEditProjClick = (proj: any) => {
    setProjToEdit(proj);
    setProjForm({
      title: proj.title || '',
      description: proj.description || '',
      organization: proj.organization || '',
      participants: proj.participants || '',
      date: proj.date || '',
      year: proj.year || '2024-2025',
      score: proj.score ? String(proj.score) : '',
      rank: proj.rank || 'Ongoing',
      impact: proj.impact || '',
      progress: proj.progress ? String(proj.progress) : '0',
    });
    setIsProjDialogOpen(true);
  };

  const handleAddPubClick = () => {
    setPubToEdit(null);
    setPubForm({
      title: '', description: '', subcategory: 'Journal Article', participants: '',
      organization: '', date: '', year: '2024-2025', department: user?.department || '', impact: '',
    });
    setIsPubDialogOpen(true);
  };

  const handleAddProjClick = () => {
    setProjToEdit(null);
    setProjForm({
      title: '', description: '', organization: '', participants: '', date: '',
      year: '2024-2025', score: '', rank: 'Ongoing', impact: '', progress: '0',
    });
    setIsProjDialogOpen(true);
  };

  // Real-time Summation for the grid totals row
  const gridTotals = {
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
  };

  const isEditableRole = user?.role === 'admin' || user?.role === 'hod' || user?.role === 'coordinator';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      
      <main className="flex-1 ml-64 p-8">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          
          {/* Header Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Research & Innovation</h1>
              <p className="text-sm text-gray-500 mt-1">
                Unified workspace managing publications, patented designs, sponsored research grants, and consultancy projects.
              </p>
            </div>
            
            {/* Quick Actions (only for standard achievements list views) */}
            {(activeTab === 'publications' || activeTab === 'sponsored') && (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setIsBulkOpen(true)}
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2 border-gray-200 text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>Bulk Upload (CSV/Excel)</span>
                </Button>
                
                <Button 
                  onClick={activeTab === 'publications' ? handleAddPubClick : handleAddProjClick}
                  size="sm"
                  className="flex items-center gap-2 bg-[#2f4692] text-white hover:bg-[#243a7a] shadow-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>{activeTab === 'publications' ? 'Add Publication' : 'Add Project'}</span>
                </Button>
              </div>
            )}
            
            {/* Quick Actions for Metrics Grid View */}
            {activeTab === 'metrics' && (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleExportCSV}
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2 border-gray-200 text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Grid</span>
                </Button>
                
                {isEditableRole && (
                  isEditingGrid ? (
                    <div className="flex items-center gap-2">
                      <Button 
                        onClick={() => {
                          setIsEditingGrid(false);
                          fetchResearchMetrics(); // Reload original values
                        }}
                        variant="outline"
                        size="sm"
                        className="text-gray-700 border-gray-200"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSaveGrid}
                        size="sm"
                        className="bg-green-600 text-white hover:bg-green-700 shadow-sm font-medium"
                      >
                        Save Changes
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => setIsEditingGrid(true)}
                      size="sm"
                      className="flex items-center gap-2 bg-[#2f4692] text-white hover:bg-[#243a7a] shadow-sm font-medium"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit Grid</span>
                    </Button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Filters Bar (Only show for standard Lists) */}
          {(activeTab === 'publications' || activeTab === 'sponsored') && (
            <Card className="shadow-sm border-gray-200">
              <CardContent className="p-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[240px] relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input 
                    placeholder="Search by title, researchers, or publisher..." 
                    className="pl-9 h-9 text-xs border-gray-200 focus-visible:ring-[#2f4692]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="w-[180px]">
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="h-9 text-xs border-gray-200">
                      <SelectValue placeholder="Academic Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Academic Years</SelectItem>
                      <SelectItem value="2024-2025">2024-25</SelectItem>
                      <SelectItem value="2023-2024">2023-24</SelectItem>
                      <SelectItem value="2022-2023">2022-23</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-[200px]">
                  <Select value={selectedDept} onValueChange={setSelectedDept}>
                    <SelectTrigger className="h-9 text-xs border-gray-200">
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

                {(selectedYear !== 'all' || selectedDept !== 'all' || searchQuery) && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedYear('all');
                      setSelectedDept('all');
                      setSearchQuery('');
                    }}
                    className="text-xs text-red-600 hover:text-red-700 p-2 h-auto"
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Master Tabs List */}
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
            <TabsList className="bg-gray-150 p-1 rounded-xl w-full flex justify-between md:w-auto md:inline-flex border border-gray-200 shadow-sm">
              <TabsTrigger value="metrics" className="py-2 px-4 text-xs font-semibold rounded-lg flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span>Research Metrics Grid</span>
              </TabsTrigger>
              <TabsTrigger value="publications" className="py-2 px-4 text-xs font-semibold rounded-lg flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Publications</span>
              </TabsTrigger>
              <TabsTrigger value="patents" className="py-2 px-4 text-xs font-semibold rounded-lg flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span>Patents</span>
              </TabsTrigger>
              <TabsTrigger value="sponsored" className="py-2 px-4 text-xs font-semibold rounded-lg flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>Sponsored Research</span>
              </TabsTrigger>
              <TabsTrigger value="consultancy" className="py-2 px-4 text-xs font-semibold rounded-lg flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span>Consultancy</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB CONTENT: RESEARCH METRICS GRID */}
            <TabsContent value="metrics" className="space-y-6 outline-none">
              
              {/* Grid Control Bar */}
              <Card className="shadow-sm border-gray-200">
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
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
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
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          breakdownType === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        Monthly Breakdown
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Academic Year select */}
                    <div className="w-[150px]">
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
                        <SelectTrigger className="h-9 text-xs border-gray-200 bg-white">
                          <SelectValue placeholder="Academic Year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2024-2025">AY 2024-2025</SelectItem>
                          <SelectItem value="2025-2026">AY 2025-2026</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Department Select (Only active in Monthly Breakdown) */}
                    {breakdownType === 'monthly' && (
                      <div className="w-[200px]">
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
              <Card className="shadow-sm border-gray-200 overflow-hidden bg-white">
                <CardHeader className="bg-[#1e3a5f]/5 border-b border-gray-150 p-4">
                  <CardTitle className="text-sm font-bold text-[#1e3a5f] flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>
                      {breakdownType === 'dept' 
                        ? `Publications, Patents, Consultancy & Funding Breakdown - Academic Year ${metricYear}` 
                        : `Publications & Research Profile - Department of ${metricDept} (${metricYear})`
                      }
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      {/* Sub-Header Spans */}
                      <tr className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-200 text-center">
                        <th rowSpan={2} className="border-r border-gray-250 p-2.5 text-left font-bold min-w-[150px] bg-slate-100 text-gray-800">
                          {breakdownType === 'dept' ? 'Department' : 'Month'}
                        </th>
                        <th rowSpan={2} className="border-r border-gray-200 p-2 text-center bg-green-50/50">Books</th>
                        <th rowSpan={2} className="border-r border-gray-200 p-2 text-center bg-green-50/50">Chapters</th>
                        <th rowSpan={2} className="border-r border-gray-200 p-2 text-center bg-green-50/50">Scopus Journals</th>
                        <th rowSpan={2} className="border-r border-gray-200 p-2 text-center bg-green-50/50">National Journals</th>
                        <th rowSpan={2} className="border-r border-gray-200 p-2 text-center bg-green-50/50">International Journals</th>
                        <th rowSpan={2} className="border-r border-gray-200 p-2 text-center bg-blue-50/30">Citation</th>
                        <th colSpan={2} className="border-r border-gray-200 p-1.5 text-center bg-teal-50/30">Patents</th>
                        <th colSpan={2} className="border-r border-gray-200 p-1.5 text-center bg-yellow-50/20">Conference</th>
                        <th colSpan={2} className="border-r border-gray-200 p-1.5 text-center bg-indigo-50/20">Consultancy</th>
                        <th colSpan={2} className="border-r border-gray-200 p-1.5 text-center bg-purple-50/20">Seed Money</th>
                        <th colSpan={2} className="p-1.5 text-center bg-emerald-50/20">Externally Funded Projects</th>
                      </tr>
                      {/* Secondary Columns */}
                      <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 text-center">
                        {/* Patents */}
                        <th className="border-r border-gray-200 p-1 text-[10px] bg-teal-50/20">Indian</th>
                        <th className="border-r border-gray-200 p-1 text-[10px] bg-teal-50/20">International</th>
                        {/* Conference */}
                        <th className="border-r border-gray-200 p-1 text-[10px] bg-yellow-50/10">National</th>
                        <th className="border-r border-gray-200 p-1 text-[10px] bg-yellow-50/10">International</th>
                        {/* Consultancy */}
                        <th className="border-r border-gray-200 p-1 text-[10px] bg-indigo-50/10">Count</th>
                        <th className="border-r border-gray-200 p-1 text-[10px] bg-indigo-50/10">Amount</th>
                        {/* Seed Money */}
                        <th className="border-r border-gray-200 p-1 text-[10px] bg-purple-50/10">Count</th>
                        <th className="border-r border-gray-200 p-1 text-[10px] bg-purple-50/10">Amount</th>
                        {/* External Projects */}
                        <th className="border-r border-gray-200 p-1 text-[10px] bg-emerald-50/10">Count</th>
                        <th className="p-1 text-[10px] bg-emerald-50/10">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Row List */}
                      {editableGridData.map((row, rowIndex) => (
                        <tr 
                          key={rowIndex} 
                          className={`hover:bg-slate-50 transition-colors border-b border-gray-200 ${
                            rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                          }`}
                        >
                          {/* Label row */}
                          <td className="border-r border-gray-250 p-2.5 font-semibold text-gray-800 bg-slate-50/60 text-[10px] uppercase">
                            {breakdownType === 'dept' ? row.department : row.periodValue}
                          </td>
                          
                          {/* Books */}
                          <td className="border-r border-gray-200 p-1.5 text-center bg-green-50/10">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5" 
                                value={row.books} 
                                onChange={(e) => handleCellChange(rowIndex, 'books', e.target.value)}
                              />
                            ) : row.books}
                          </td>

                          {/* Chapters */}
                          <td className="border-r border-gray-200 p-1.5 text-center bg-green-50/10">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5" 
                                value={row.chapters} 
                                onChange={(e) => handleCellChange(rowIndex, 'chapters', e.target.value)}
                              />
                            ) : row.chapters}
                          </td>

                          {/* Scopus */}
                          <td className="border-r border-gray-200 p-1.5 text-center bg-green-50/10">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5" 
                                value={row.scopusJournals} 
                                onChange={(e) => handleCellChange(rowIndex, 'scopusJournals', e.target.value)}
                              />
                            ) : row.scopusJournals}
                          </td>

                          {/* National Journals */}
                          <td className="border-r border-gray-200 p-1.5 text-center bg-green-50/10">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5" 
                                value={row.nationalJournals} 
                                onChange={(e) => handleCellChange(rowIndex, 'nationalJournals', e.target.value)}
                              />
                            ) : row.nationalJournals}
                          </td>

                          {/* International Journals */}
                          <td className="border-r border-gray-200 p-1.5 text-center bg-green-50/10">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5" 
                                value={row.internationalJournals} 
                                onChange={(e) => handleCellChange(rowIndex, 'internationalJournals', e.target.value)}
                              />
                            ) : row.internationalJournals}
                          </td>

                          {/* Citations */}
                          <td className="border-r border-gray-200 p-1.5 text-center bg-blue-50/10">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-14 h-6 text-center border rounded p-0.5" 
                                value={row.citations} 
                                onChange={(e) => handleCellChange(rowIndex, 'citations', e.target.value)}
                              />
                            ) : row.citations}
                          </td>

                          {/* Patent Indian */}
                          <td className="border-r border-gray-200 p-1.5 text-center bg-teal-50/10">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5" 
                                value={row.patentsIndian} 
                                onChange={(e) => handleCellChange(rowIndex, 'patentsIndian', e.target.value)}
                              />
                            ) : row.patentsIndian}
                          </td>

                          {/* Patent International */}
                          <td className="border-r border-gray-200 p-1.5 text-center bg-teal-50/10">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5" 
                                value={row.patentsInternational} 
                                onChange={(e) => handleCellChange(rowIndex, 'patentsInternational', e.target.value)}
                              />
                            ) : row.patentsInternational}
                          </td>

                          {/* Conf National */}
                          <td className="border-r border-gray-200 p-1.5 text-center bg-yellow-50/5">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5" 
                                value={row.conferencesNational} 
                                onChange={(e) => handleCellChange(rowIndex, 'conferencesNational', e.target.value)}
                              />
                            ) : row.conferencesNational}
                          </td>

                          {/* Conf International */}
                          <td className="border-r border-gray-200 p-1.5 text-center bg-yellow-50/5">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5" 
                                value={row.conferencesInternational} 
                                onChange={(e) => handleCellChange(rowIndex, 'conferencesInternational', e.target.value)}
                              />
                            ) : row.conferencesInternational}
                          </td>

                          {/* Consultancy Count */}
                          <td className="border-r border-gray-200 p-1.5 text-center bg-indigo-50/5">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5" 
                                value={row.consultancyCount} 
                                onChange={(e) => handleCellChange(rowIndex, 'consultancyCount', e.target.value)}
                              />
                            ) : row.consultancyCount}
                          </td>

                          {/* Consultancy Amount */}
                          <td className="border-r border-gray-200 p-1.5 text-right font-medium text-indigo-900 bg-indigo-50/5">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                step="0.01"
                                className="w-24 h-6 text-right border rounded p-0.5" 
                                value={row.consultancyAmount} 
                                onChange={(e) => handleCellChange(rowIndex, 'consultancyAmount', e.target.value)}
                              />
                            ) : `₹${Number(row.consultancyAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                          </td>

                          {/* Seed Money Count */}
                          <td className="border-r border-gray-200 p-1.5 text-center bg-purple-50/5">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5" 
                                value={row.seedMoneyCount} 
                                onChange={(e) => handleCellChange(rowIndex, 'seedMoneyCount', e.target.value)}
                              />
                            ) : row.seedMoneyCount}
                          </td>

                          {/* Seed Money Amount */}
                          <td className="border-r border-gray-200 p-1.5 text-right font-medium text-purple-900 bg-purple-50/5">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                step="0.01"
                                className="w-24 h-6 text-right border rounded p-0.5" 
                                value={row.seedMoneyAmount} 
                                onChange={(e) => handleCellChange(rowIndex, 'seedMoneyAmount', e.target.value)}
                              />
                            ) : `₹${Number(row.seedMoneyAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                          </td>

                          {/* External Projects Count */}
                          <td className="border-r border-gray-200 p-1.5 text-center bg-emerald-50/5">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                className="w-12 h-6 text-center border rounded p-0.5" 
                                value={row.externalProjectsCount} 
                                onChange={(e) => handleCellChange(rowIndex, 'externalProjectsCount', e.target.value)}
                              />
                            ) : row.externalProjectsCount}
                          </td>

                          {/* External Projects Amount */}
                          <td className="p-1.5 text-right font-medium text-emerald-900 bg-emerald-50/5">
                            {isEditingGrid ? (
                              <input 
                                type="number" 
                                step="0.01"
                                className="w-24 h-6 text-right border rounded p-0.5" 
                                value={row.externalProjectsAmount} 
                                onChange={(e) => handleCellChange(rowIndex, 'externalProjectsAmount', e.target.value)}
                              />
                            ) : `₹${Number(row.externalProjectsAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                          </td>
                        </tr>
                      ))}

                      {/* TOTAL ROW */}
                      <tr className="bg-orange-50/80 font-bold border-t-2 border-gray-300 text-gray-900 text-center">
                        <td className="border-r border-gray-250 p-3 text-left font-extrabold uppercase bg-orange-100/50">
                          Total Summary
                        </td>
                        <td className="border-r border-gray-200 p-2 text-center">{gridTotals.books}</td>
                        <td className="border-r border-gray-200 p-2 text-center">{gridTotals.chapters}</td>
                        <td className="border-r border-gray-200 p-2 text-center">{gridTotals.scopusJournals}</td>
                        <td className="border-r border-gray-200 p-2 text-center">{gridTotals.nationalJournals}</td>
                        <td className="border-r border-gray-200 p-2 text-center">{gridTotals.internationalJournals}</td>
                        <td className="border-r border-gray-200 p-2 text-center">{gridTotals.citations}</td>
                        {/* Patents */}
                        <td className="border-r border-gray-200 p-2 text-center">{gridTotals.patentsIndian}</td>
                        <td className="border-r border-gray-200 p-2 text-center">{gridTotals.patentsInternational}</td>
                        {/* Conference */}
                        <td className="border-r border-gray-200 p-2 text-center">{gridTotals.conferencesNational}</td>
                        <td className="border-r border-gray-200 p-2 text-center">{gridTotals.conferencesInternational}</td>
                        {/* Consultancy */}
                        <td className="border-r border-gray-200 p-2 text-center">{gridTotals.consultancyCount}</td>
                        <td className="border-r border-gray-200 p-2 text-right text-indigo-900 font-extrabold">
                          {`₹${gridTotals.consultancyAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                        </td>
                        {/* Seed Money */}
                        <td className="border-r border-gray-200 p-2 text-center">{gridTotals.seedMoneyCount}</td>
                        <td className="border-r border-gray-200 p-2 text-right text-purple-900 font-extrabold">
                          {`₹${gridTotals.seedMoneyAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                        </td>
                        {/* External Projects */}
                        <td className="border-r border-gray-200 p-2 text-center">{gridTotals.externalProjectsCount}</td>
                        <td className="p-2 text-right text-emerald-900 font-extrabold">
                          {`₹${gridTotals.externalProjectsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

            </TabsContent>

            {/* TAB CONTENT: PUBLICATIONS */}
            <TabsContent value="publications" className="space-y-6 outline-none">
              
              {/* Publications Stats Header */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-medium text-gray-500 uppercase">Total Articles</CardDescription>
                    <CardTitle className="text-3xl font-bold text-[#2f4692]">{pubStats.total}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-l-4 border-l-green-500 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-medium text-gray-500 uppercase">Journal Papers</CardDescription>
                    <CardTitle className="text-3xl font-bold text-green-600">{pubStats.journals}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-medium text-gray-500 uppercase">Conference Papers</CardDescription>
                    <CardTitle className="text-3xl font-bold text-orange-500">{pubStats.conferences}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-l-4 border-l-purple-500 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-medium text-gray-500 uppercase">Book Chapters</CardDescription>
                    <CardTitle className="text-3xl font-bold text-purple-600">{pubStats.chapters}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Publications List */}
              <div className="grid grid-cols-1 gap-4">
                {loading ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500">Loading publications from server...</p>
                  </div>
                ) : filteredPubs.length === 0 ? (
                  <Card className="border-dashed border-2 py-12 text-center border-gray-200">
                    <CardContent>
                      <BookOpen className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-700">No publications found</p>
                      <p className="text-xs text-gray-500 mt-1">Try modifying your filters or add a new publication manually.</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredPubs.map((pub) => (
                    <Card key={pub.id} className="shadow-sm hover:shadow-md transition-shadow border-gray-200 relative overflow-hidden group">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2f4692]"></div>
                      <CardHeader className="pb-3 pr-20">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] py-0 px-1.5">
                            {pub.subcategory || 'Journal Article'}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                            AY {pub.year}
                          </Badge>
                          {pub.department && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                              {pub.department}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-base font-bold text-gray-900 group-hover:text-[#2f4692] transition-colors leading-snug">
                          {pub.title}
                        </CardTitle>
                        <CardDescription className="text-xs text-gray-600 font-medium mt-1">
                          Authors: <span className="text-gray-800 font-semibold">{pub.participants}</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-4 pt-0 text-xs text-gray-500">
                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-3">
                          <div className="flex flex-wrap gap-4">
                            <span className="flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5 text-gray-400" />
                              Publisher: <span className="font-semibold text-gray-700">{pub.organization}</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              Published: <span className="font-semibold text-gray-700">{new Date(pub.date).toLocaleDateString()}</span>
                            </span>
                            {pub.impact && (
                              <span className="flex items-center gap-1.5 text-[#2f4692] font-medium">
                                <FileText className="w-3.5 h-3.5" />
                                {pub.impact}
                              </span>
                            )}
                          </div>
                          
                          {/* Card Actions */}
                          <div className="flex items-center gap-1.5">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="View Details"
                              onClick={() => setViewingRecord(pub)}
                              className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Edit Record"
                              onClick={() => handleEditPubClick(pub)}
                              className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Delete Record"
                              onClick={() => handleDelete(pub.id)}
                              className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* TAB CONTENT: PATENTS */}
            <TabsContent value="patents" className="outline-none">
              <ResearchInnovationPage hideSidebar={true} onNavigate={onNavigate} />
            </TabsContent>

            {/* TAB CONTENT: SPONSORED RESEARCH */}
            <TabsContent value="sponsored" className="space-y-6 outline-none">
              
              {/* Sponsored Stats Header */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-medium text-gray-500 uppercase">Total Grants</CardDescription>
                    <CardTitle className="text-3xl font-bold text-[#2f4692]">{projStats.total}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-medium text-gray-500 uppercase">Ongoing Projects</CardDescription>
                    <CardTitle className="text-3xl font-bold text-orange-500">{projStats.ongoing}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-l-4 border-l-green-500 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-medium text-gray-500 uppercase">Completed Projects</CardDescription>
                    <CardTitle className="text-3xl font-bold text-green-600">{projStats.completed}</CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-l-4 border-l-teal-500 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-medium text-gray-500 uppercase">Total Funding</CardDescription>
                    <CardTitle className="text-2xl font-bold text-teal-600">₹{projStats.totalFunding.toLocaleString('en-IN')}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Projects Grid */}
              <div className="grid grid-cols-1 gap-4">
                {loading ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500">Loading sponsored projects...</p>
                  </div>
                ) : filteredProjects.length === 0 ? (
                  <Card className="border-dashed border-2 py-12 text-center border-gray-200">
                    <CardContent>
                      <TrendingUp className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-700">No sponsored projects found</p>
                      <p className="text-xs text-gray-500 mt-1">Try modifying your filters or add a new grant manually.</p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredProjects.map((proj) => {
                    const progressVal = proj.progress ? parseInt(proj.progress, 10) : (proj.rank === 'Completed' ? 100 : 50);
                    return (
                      <Card key={proj.id} className="shadow-sm hover:shadow-md transition-shadow border-gray-200 overflow-hidden relative">
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${proj.rank === 'Completed' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                        <CardHeader className="pb-2 pr-20">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge className={proj.rank === 'Completed' ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100 text-[10px] py-0 px-1.5' : 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100 text-[10px] py-0 px-1.5'}>
                              {proj.rank || 'Ongoing'}
                            </Badge>
                            <Badge variant="outline" className="text-teal-700 border-teal-200 bg-teal-50 text-[10px] py-0 px-1.5">
                              Value: ₹{proj.score?.toLocaleString('en-IN')}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                              AY {proj.year}
                            </Badge>
                          </div>
                          <CardTitle className="text-base font-bold text-gray-950 leading-snug">
                            {proj.title}
                          </CardTitle>
                          <p className="text-xs text-gray-600 font-semibold mt-1">
                            Principal Investigator: <span className="text-gray-800">{proj.participants}</span>
                          </p>
                        </CardHeader>
                        
                        <CardContent className="pb-4 pt-2 text-xs text-gray-500">
                          <p className="text-xs text-gray-600 mb-4 bg-gray-50 p-2.5 rounded border border-gray-150 leading-relaxed">
                            {proj.description}
                          </p>

                          <div className="mb-4">
                            <div className="flex justify-between items-center mb-1 text-[11px] font-medium text-gray-600">
                              <span>Milestone Progress</span>
                              <span>{progressVal}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full ${proj.rank === 'Completed' ? 'bg-green-500' : 'bg-[#2f4692]'}`} 
                                style={{ width: `${progressVal}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-3">
                            <div className="flex flex-wrap gap-4">
                              <span className="flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 text-gray-400" />
                                Funding Agency: <span className="font-semibold text-gray-700">{proj.organization}</span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                Start Date: <span className="font-semibold text-gray-700">{new Date(proj.date).toLocaleDateString()}</span>
                              </span>
                              {proj.impact && (
                                <span className="flex items-center gap-1.5">
                                  <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                                  Ref ID: <span className="font-semibold text-gray-700">{proj.impact}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="View Details"
                                onClick={() => setViewingRecord(proj)}
                                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="Edit Record"
                                onClick={() => handleEditProjClick(proj)}
                                className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                title="Delete Record"
                                onClick={() => handleDelete(proj.id)}
                                className="h-8 w-8 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* TAB CONTENT: CONSULTANCY */}
            <TabsContent value="consultancy" className="outline-none">
              <ConsultancyProjectsPage hideSidebar={true} onNavigate={onNavigate} token={user?.token || ''} userRole={user?.role || 'faculty'} />
            </TabsContent>
          </Tabs>

        </div>
      </main>

      {/* DIALOG: VIEW DETAILS */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl bg-white shadow-2xl rounded-xl border border-gray-200">
            <CardHeader className="border-b border-gray-100 pb-3 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg font-bold text-gray-900">Research Record Details</CardTitle>
                <CardDescription className="text-xs">Comprehensive profile sheet of the selected entry.</CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 rounded-full"
                onClick={() => setViewingRecord(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 text-sm text-gray-700 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#2f4692] uppercase tracking-wider block">Record Title</span>
                <p className="text-base font-bold text-gray-950 leading-snug">{viewingRecord.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Sub-Category</span>
                  <Badge variant="secondary" className="mt-1 font-semibold text-xs text-gray-800 bg-gray-100 hover:bg-gray-100">
                    {viewingRecord.subcategory}
                  </Badge>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Academic Year</span>
                  <p className="font-semibold text-gray-800 mt-1">{viewingRecord.year}</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <span className="text-[10px] font-bold text-[#2f4692] uppercase tracking-wider block">
                  {viewingRecord.subcategory === 'Sponsored Research' ? 'Principal Investigators & Team' : 'Authors / Presenters'}
                </span>
                <p className="font-semibold text-gray-800 mt-1">{viewingRecord.participants}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3">
                <div>
                  <span className="text-[10px] font-bold text-[#2f4692] uppercase tracking-wider block">
                    {viewingRecord.subcategory === 'Sponsored Research' ? 'Funding Agency' : 'Publisher / Journal'}
                  </span>
                  <p className="font-semibold text-gray-800 mt-1">{viewingRecord.organization}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#2f4692] uppercase tracking-wider block">Date of Action</span>
                  <p className="font-semibold text-gray-800 mt-1">{new Date(viewingRecord.date).toLocaleDateString()}</p>
                </div>
              </div>

              {viewingRecord.subcategory === 'Sponsored Research' && (
                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-3">
                  <div>
                    <span className="text-[10px] font-bold text-[#2f4692] uppercase tracking-wider block">Grant Value (₹)</span>
                    <p className="font-bold text-teal-600 mt-1 text-base">₹{Number(viewingRecord.score).toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[#2f4692] uppercase tracking-wider block">Project Status</span>
                    <Badge className={viewingRecord.rank === 'Completed' ? 'bg-green-100 text-green-800 border-green-200 mt-1 text-xs' : 'bg-orange-100 text-orange-800 border-orange-200 mt-1 text-xs'}>
                      {viewingRecord.rank || 'Ongoing'}
                    </Badge>
                  </div>
                </div>
              )}

              {viewingRecord.department && (
                <div className="border-t border-gray-100 pt-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Department Mapping</span>
                  <p className="font-semibold text-gray-800 mt-1">{viewingRecord.department}</p>
                </div>
              )}

              {viewingRecord.impact && (
                <div className="border-t border-gray-100 pt-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">DOI / Impact Index / Reference ID</span>
                  <p className="font-mono text-xs text-[#2f4692] font-semibold mt-1">{viewingRecord.impact}</p>
                </div>
              )}

              {viewingRecord.description && (
                <div className="border-t border-gray-100 pt-3 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Summary / Description</span>
                  <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-150 leading-relaxed">
                    {viewingRecord.description}
                  </p>
                </div>
              )}
            </CardContent>
            <div className="border-t border-gray-100 p-4 flex justify-end">
              <Button onClick={() => setViewingRecord(null)} size="sm" className="bg-[#2f4692] text-white hover:bg-[#243a7a] px-5">
                Close Sheet
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* DIALOG: ADD/EDIT PUBLICATION */}
      {isPubDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl bg-white shadow-2xl rounded-xl border border-gray-200">
            <CardHeader className="border-b border-gray-100 pb-3 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-bold text-gray-900">
                  {pubToEdit ? 'Edit Research Publication' : 'Add New Publication'}
                </CardTitle>
                <CardDescription className="text-xs">
                  Fill in detail credentials for the published research work.
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 rounded-full"
                onClick={() => setIsPubDialogOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSavePublication}>
              <CardContent className="p-6 text-xs text-gray-700 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="font-semibold text-gray-700">Publication Title **</label>
                  <Input 
                    required 
                    placeholder="Enter full research paper/book title..." 
                    className="border-gray-200 focus-visible:ring-[#2f4692] h-9 text-xs"
                    value={pubForm.title}
                    onChange={(e) => setPubForm({...pubForm, title: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Category Type **</label>
                    <Select 
                      value={pubForm.subcategory} 
                      onValueChange={(val) => setPubForm({...pubForm, subcategory: val})}
                    >
                      <SelectTrigger className="border-gray-200 h-9 text-xs">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Journal Article">Journal Article</SelectItem>
                        <SelectItem value="Conference Proceeding">Conference Proceeding</SelectItem>
                        <SelectItem value="Book">Book</SelectItem>
                        <SelectItem value="Book Chapter">Book Chapter</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Academic Year **</label>
                    <Select 
                      value={pubForm.year} 
                      onValueChange={(val) => setPubForm({...pubForm, year: val})}
                    >
                      <SelectTrigger className="border-gray-200 h-9 text-xs">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-2025">2024-25</SelectItem>
                        <SelectItem value="2023-2024">2023-24</SelectItem>
                        <SelectItem value="2022-2023">2022-23</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Authors (Comma separated) **</label>
                    <Input 
                      required 
                      placeholder="e.g. Dr. Rajesh Kumar, Dr. Priya Sharma" 
                      className="border-gray-200 focus-visible:ring-[#2f4692] h-9 text-xs"
                      value={pubForm.participants}
                      onChange={(e) => setPubForm({...pubForm, participants: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Journal / Publisher **</label>
                    <Input 
                      required 
                      placeholder="e.g. IEEE Access / Springer / Nature" 
                      className="border-gray-200 focus-visible:ring-[#2f4692] h-9 text-xs"
                      value={pubForm.organization}
                      onChange={(e) => setPubForm({...pubForm, organization: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Publication Date **</label>
                    <Input 
                      required 
                      type="date" 
                      className="border-gray-200 focus-visible:ring-[#2f4692] h-9 text-xs"
                      value={pubForm.date}
                      onChange={(e) => setPubForm({...pubForm, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">DOI / ISBN Index Number</label>
                    <Input 
                      placeholder="e.g. DOI: 10.1109/..." 
                      className="border-gray-200 focus-visible:ring-[#2f4692] h-9 text-xs"
                      value={pubForm.impact}
                      onChange={(e) => setPubForm({...pubForm, impact: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-gray-700">Primary Department **</label>
                  <Select 
                    value={pubForm.department} 
                    onValueChange={(val) => setPubForm({...pubForm, department: val})}
                  >
                    <SelectTrigger className="border-gray-200 h-9 text-xs">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-gray-700">Abstract / Notes Description</label>
                  <textarea 
                    rows={3}
                    placeholder="Provide a brief summary of the paper and findings..." 
                    className="w-full rounded-md border border-gray-200 p-2.5 outline-none focus:border-[#2f4692] text-xs font-normal"
                    value={pubForm.description}
                    onChange={(e) => setPubForm({...pubForm, description: e.target.value})}
                  />
                </div>
              </CardContent>
              <div className="border-t border-gray-100 p-4 flex justify-end gap-2">
                <Button 
                  type="button" 
                  onClick={() => setIsPubDialogOpen(false)}
                  variant="outline" 
                  size="sm"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  className="bg-[#2f4692] text-white hover:bg-[#243a7a] px-5"
                >
                  Save Publication
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* DIALOG: ADD/EDIT SPONSORED PROJECT */}
      {isProjDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-xl bg-white shadow-2xl rounded-xl border border-gray-200">
            <CardHeader className="border-b border-gray-100 pb-3 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-bold text-gray-900">
                  {projToEdit ? 'Edit Sponsored Project Details' : 'Add Sponsored Research Project'}
                </CardTitle>
                <CardDescription className="text-xs">
                  Fill in grant and funding parameters for the sponsored research project.
                </CardDescription>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 rounded-full"
                onClick={() => setIsProjDialogOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <form onSubmit={handleSaveProject}>
              <CardContent className="p-6 text-xs text-gray-700 space-y-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="font-semibold text-gray-700">Project Title **</label>
                  <Input 
                    required 
                    placeholder="Enter project name..." 
                    className="border-gray-200 focus-visible:ring-[#2f4692] h-9 text-xs"
                    value={projForm.title}
                    onChange={(e) => setProjForm({...projForm, title: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Funding Agency **</label>
                    <Input 
                      required 
                      placeholder="e.g. DST / ISRO / DRDO / AICTE" 
                      className="border-gray-200 focus-visible:ring-[#2f4692] h-9 text-xs"
                      value={projForm.organization}
                      onChange={(e) => setProjForm({...projForm, organization: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Principal Investigators (PIs) **</label>
                    <Input 
                      required 
                      placeholder="e.g. Dr. Rajesh Kumar (PI), Dr. Priya Sharma" 
                      className="border-gray-200 focus-visible:ring-[#2f4692] h-9 text-xs"
                      value={projForm.participants}
                      onChange={(e) => setProjForm({...projForm, participants: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Total Funding Value (INR) **</label>
                    <Input 
                      required 
                      type="number" 
                      placeholder="e.g. 2500000" 
                      className="border-gray-200 focus-visible:ring-[#2f4692] h-9 text-xs"
                      value={projForm.score}
                      onChange={(e) => setProjForm({...projForm, score: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Project Status **</label>
                    <Select 
                      value={projForm.rank} 
                      onValueChange={(val) => setProjForm({...projForm, rank: val})}
                    >
                      <SelectTrigger className="border-gray-200 h-9 text-xs">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ongoing">Ongoing</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Planned">Planned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Start Date **</label>
                    <Input 
                      required 
                      type="date" 
                      className="border-gray-200 focus-visible:ring-[#2f4692] h-9 text-xs"
                      value={projForm.date}
                      onChange={(e) => setProjForm({...projForm, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Project Reference No / ID</label>
                    <Input 
                      placeholder="e.g. DST/SERB/2024/00123" 
                      className="border-gray-200 focus-visible:ring-[#2f4692] h-9 text-xs"
                      value={projForm.impact}
                      onChange={(e) => setProjForm({...projForm, impact: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Academic Year **</label>
                    <Select 
                      value={projForm.year} 
                      onValueChange={(val) => setProjForm({...projForm, year: val})}
                    >
                      <SelectTrigger className="border-gray-200 h-9 text-xs">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024-2025">2024-25</SelectItem>
                        <SelectItem value="2023-2024">2023-24</SelectItem>
                        <SelectItem value="2022-2023">2022-23</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-gray-700">Milestone Progress (%)</label>
                    <Input 
                      type="number"
                      min={0}
                      max={100}
                      placeholder="e.g. 60" 
                      className="border-gray-200 focus-visible:ring-[#2f4692] h-9 text-xs"
                      value={projForm.progress}
                      onChange={(e) => setProjForm({...projForm, progress: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-gray-700">Project Scope / Summary Description</label>
                  <textarea 
                    rows={3}
                    placeholder="Provide a brief summary of the research scope and deliverables..." 
                    className="w-full rounded-md border border-gray-200 p-2.5 outline-none focus:border-[#2f4692] text-xs font-normal"
                    value={projForm.description}
                    onChange={(e) => setProjForm({...projForm, description: e.target.value})}
                  />
                </div>
              </CardContent>
              <div className="border-t border-gray-100 p-4 flex justify-end gap-2">
                <Button 
                  type="button" 
                  onClick={() => setIsProjDialogOpen(false)}
                  variant="outline" 
                  size="sm"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  className="bg-[#2f4692] text-white hover:bg-[#243a7a] px-5"
                >
                  Save Project
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* DIALOG: BULK CSV UPLOAD */}
      {isBulkOpen && (
        <BulkUploadDialog 
          isOpen={isBulkOpen}
          onClose={() => setIsBulkOpen(false)}
          token={user?.token || ''}
          onSuccess={() => {
            fetchAchievements();
          }}
          uploadType="achievements"
        />
      )}

    </div>
  );
}

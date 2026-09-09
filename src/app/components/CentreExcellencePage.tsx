import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  Award, Users, Building, BookOpen, TrendingUp, Star, CheckCircle,
  Briefcase, Search, Filter, Plus, Edit, Trash2, Eye, Download,
  ExternalLink, Sparkles, Cpu, Layers, BarChart3, LayoutGrid,
  Table as TableIcon, X, CheckCircle2, Clock, AlertCircle, Wrench,
  FileSpreadsheet, Shield, Zap, Compass, FolderGit2
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { useAuth } from '../contexts/AuthContext';

interface CentreExcellencePageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
  hideSidebar?: boolean;
}

export interface CentreItem {
  id: string;
  name: string;
  shortName: string;
  category: string;
  head: string;
  headRole: string;
  establishedYear: string;
  department: string;
  focusAreas: string[];
  labs: string[];
  equipment: string[];
  software: string[];
  facultyTeam: Array<{ name: string; role: string; specialization: string }>;
  achievements: string[];
  projectsCount: number;
  publicationsCount: number;
  patentsCount: number;
  fundingAmount: string;
  corporatePartners: string[];
  status: 'Active' | 'Expanding' | 'Proposed';
}

const INITIAL_CENTRES: CentreItem[] = [
  {
    id: 'COE-001',
    name: 'Centre for Artificial Intelligence and Machine Learning',
    shortName: 'CAIML',
    category: 'Artificial Intelligence & Data',
    head: 'Dr. Rajesh Kumar',
    headRole: 'Professor & Director (AI Centre)',
    establishedYear: '2020',
    department: 'AI and Data Science Engineering',
    focusAreas: ['Deep Learning & LLMs', 'Computer Vision', 'Edge AI & IoT', 'Natural Language Processing', 'Generative AI'],
    labs: ['NVIDIA High-Performance AI Lab', 'Edge Intelligence & Robotics Lab', 'Vision & Biometrics Compute Centre'],
    equipment: [
      'NVIDIA A100 Tensor Core GPU Server Array',
      'Dual RTX 4090 Deep Learning Workstations (12 Units)',
      'Jetson AGX Orin & Xavier Edge AI Kits',
      'High-Density Multi-Spectral Sensor Testbed'
    ],
    software: ['PyTorch 2.4 Enterprise', 'TensorFlow', 'CUDA Toolkit 12.3', 'HuggingFace Transformers', 'MLflow'],
    facultyTeam: [
      { name: 'Dr. Rajesh Kumar', role: 'Director & Lead PI', specialization: 'Deep Learning & Neural Architectures' },
      { name: 'Dr. Priya Sharma', role: 'Co-Lead (NLP)', specialization: 'Large Language Models & Text Analytics' },
      { name: 'Dr. Arun Menon', role: 'Research Faculty', specialization: 'Computer Vision & Autonomous Robotics' },
      { name: 'Dr. Deepa Singh', role: 'Postdoc Fellow', specialization: 'Explainable AI & Ethical Frameworks' }
    ],
    achievements: [
      'Published 28+ Scopus/WoS Q1 journal papers with total citations exceeding 450+',
      'Filed 4 Patents in AI Diagnostic Imaging and Edge Sensor Compression',
      'Secured ₹2.5 Crore DST-SERB grant for real-time edge medical diagnostics',
      'Trained 450+ undergraduate and postgraduate researchers in deep learning'
    ],
    projectsCount: 14,
    publicationsCount: 32,
    patentsCount: 4,
    fundingAmount: '₹ 2.80 Crores',
    corporatePartners: ['NVIDIA AI Academic Alliance', 'Microsoft Research India', 'Intel Labs', 'Wipro AI Centre'],
    status: 'Active'
  },
  {
    id: 'COE-002',
    name: 'Centre for Sustainable Infrastructure Development',
    shortName: 'CSID',
    category: 'Sustainable Engineering & Materials',
    head: 'Dr. Suresh Rao',
    headRole: 'Professor & Head (CSID)',
    establishedYear: '2019',
    department: 'Civil Engineering',
    focusAreas: ['Green Building Geopolymers', 'Smart Urban Resilience', 'Zero-Carbon Concrete', 'Water Reclamation'],
    labs: ['Advanced Structural Geopolymer Lab', 'Environmental Water Quality Testing Lab', 'Smart Materials & Sensorics'],
    equipment: [
      'Universal Testing Machine (2000 kN Servo-Hydraulic)',
      'Automated Concrete Durability & Carbonation Chamber',
      'Atomic Absorption Spectrophotometer',
      'High-Resolution Triaxial Soil Shear Apparatus'
    ],
    software: ['STAAD.Pro Connect', 'ETABS 2024', 'ANSYS Mechanical', 'AutoCAD Civil 3D', 'ArcGIS Pro'],
    facultyTeam: [
      { name: 'Dr. Suresh Rao', role: 'Director & Lead PI', specialization: 'Geopolymer Concrete & Sustainable Binders' },
      { name: 'Dr. Meera Nair', role: 'Co-Lead (Urban Systems)', specialization: 'Smart Infrastructure & Water Audits' },
      { name: 'Dr. Ramesh Kumar', role: 'Research Faculty', specialization: 'Environmental Sensing & Waste Utilization' }
    ],
    achievements: [
      'Executed 12+ Consultancy Projects for Municipal Corporations & Urban Metro',
      'Granted 3 Indian Patents in Low-Carbon High-Strength Concrete',
      'Awarded AICTE-RPS Grant of ₹45 Lakhs for fly-ash geopolymer research',
      'Formulated regional sustainable building standards in collaboration with CPWD'
    ],
    projectsCount: 18,
    publicationsCount: 38,
    patentsCount: 3,
    fundingAmount: '₹ 3.40 Crores',
    corporatePartners: ['UltraTech R&D', 'L&T Construction', 'Bangalore Metro Rail Corp (BMRCL)', 'Tata Consulting Engineers'],
    status: 'Active'
  },
  {
    id: 'COE-003',
    name: 'Centre for Renewable Energy and Smart Microgrids',
    shortName: 'CRESM',
    category: 'Clean Energy & Power',
    head: 'Dr. Lakshmi Prasad',
    headRole: 'Professor & Chair (Energy Research)',
    establishedYear: '2021',
    department: 'Electrical and Electronics Engineering',
    focusAreas: ['Photovoltaic Micro-Inverters', 'BESS Battery Management', 'Smart Grid Protection', 'Electric Mobility Charging'],
    labs: ['Microgrid Simulation & RTDS Lab', 'Power Electronics & EV Drive Lab', 'Photovoltaic Cell Characterization'],
    equipment: [
      'OPAL-RT Real-Time Grid Hardware-in-the-Loop Simulator',
      '50 kW Programmable Grid Simulator & Load Bank',
      'Multi-Channel Battery Cycler & Thermal Testing Chamber',
      'Precision Power Quality Analyzers (Class A)'
    ],
    software: ['MATLAB Simulink Real-Time', 'PSCAD / EMTDC', 'HOMER Energy Pro', 'PVsyst 7.4', 'ETAP Grid'],
    facultyTeam: [
      { name: 'Dr. Lakshmi Prasad', role: 'Director & Lead PI', specialization: 'Renewable Microgrid Integration' },
      { name: 'Dr. Sunil Kumar', role: 'Co-Lead (EV Tech)', specialization: 'Power Electronics & Fast Chargers' },
      { name: 'Dr. Vikram Patel', role: 'Research Fellow', specialization: 'Solid-State Battery Energy Storage' }
    ],
    achievements: [
      'Commissioned 250 kW Rooftop Solar Microgrid with Active Peak Shaving on Campus',
      'Filed 2 Patents for Adaptive Dual-Inverter MPPT Algorithms',
      'Received MNRE National Renewable Energy Grant of ₹65 Lakhs',
      'Collaborated with IEEE Power & Energy Society on smart meter test protocols'
    ],
    projectsCount: 11,
    publicationsCount: 26,
    patentsCount: 2,
    fundingAmount: '₹ 2.60 Crores',
    corporatePartners: ['Schneider Electric', 'ABB India R&D', 'Delta Electronics', 'Tata Power Renewables'],
    status: 'Active'
  },
  {
    id: 'COE-004',
    name: 'Centre for Advanced Robotics & Additive Manufacturing',
    shortName: 'CARAM',
    category: 'Industry 4.0 & Robotics',
    head: 'Dr. Karthik Iyer',
    headRole: 'Professor & Lead Scientist (CARAM)',
    establishedYear: '2020',
    department: 'Mechanical and Automobile Engineering',
    focusAreas: ['Industrial 6-Axis Robotics', 'Direct Metal Laser Sintering (DMLS)', 'Digital Twins', 'Autonomous AGVs'],
    labs: ['Robotics & Cyber-Physical Lab', 'Additive Manufacturing & Prototyping Centre', 'CNC Precision Machining Cell'],
    equipment: [
      'KUKA KR-16 Industrial 6-Axis Robotic Arm Cell',
      'Industrial SLA & Metal 3D Printers (Markforged Metal X)',
      '5-Axis High-Precision CNC Machining Centre',
      'Omron Autonomous Mobile Robot (AMR) Navigation Platform'
    ],
    software: ['SolidWorks 2024 Simulation', 'KUKA.Sim Pro', 'Siemens NX CAM & Digital Twin', 'ROS 2 Iron', 'LabVIEW'],
    facultyTeam: [
      { name: 'Dr. Karthik Iyer', role: 'Director & Lead PI', specialization: 'Additive Manufacturing & Advanced Alloys' },
      { name: 'Dr. Anita Kumar', role: 'Co-Lead (Robotics)', specialization: 'Industrial Manipulators & ROS Control' },
      { name: 'Dr. Prakash Sharma', role: 'Research Faculty', specialization: 'Digital Twin & Smart Factory Telemetry' }
    ],
    achievements: [
      'Designed and deployed indigenous AMR payload carriers for campus smart library',
      'Filed 3 Patents in Additive Lattice Structures for Lightweight Aerospace',
      'ISRO-RESPOND Grant recipient for Ceramic Thermal Barrier Coatings',
      'Certified over 300 engineering students in Industry 4.0 automation tools'
    ],
    projectsCount: 15,
    publicationsCount: 28,
    patentsCount: 3,
    fundingAmount: '₹ 2.90 Crores',
    corporatePartners: ['KUKA Robotics India', 'Bosch Rexroth', 'Siemens Industry Software', 'Titan Engineering'],
    status: 'Active'
  }
];

export function CentreExcellencePage({
  onNavigate,
  isPublicView = false,
  hideSidebar = false
}: CentreExcellencePageProps) {
  const { user } = useAuth();
  const isAdminOrCoordinator = user?.role === 'admin' || user?.role === 'coordinator' || user?.role === 'hod';

  const [centres, setCentres] = useState<CentreItem[]>(INITIAL_CENTRES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'cards' | 'details' | 'analytics'>('cards');
  const [activeCentreId, setActiveCentreId] = useState<string>(centres[0].id);

  // Modals & Drawers
  const [inspectingCentre, setInspectingCentre] = useState<CentreItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCentre, setEditingCentre] = useState<CentreItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    category: 'Artificial Intelligence & Data',
    head: '',
    headRole: 'Professor & Lead PI',
    establishedYear: '2024',
    department: 'AI and Data Science Engineering',
    focusAreas: '',
    labs: '',
    fundingAmount: '₹ 1.50 Crores'
  });

  // Unique categories for dropdown
  const categories = useMemo(() => {
    const set = new Set<string>();
    centres.forEach(c => set.add(c.category));
    return Array.from(set);
  }, [centres]);

  // Filtered Centres
  const filteredCentres = useMemo(() => {
    return centres.filter(c => {
      if (selectedCategory !== 'all' && c.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q) || c.shortName.toLowerCase().includes(q);
        const matchesHead = c.head.toLowerCase().includes(q);
        const matchesFocus = c.focusAreas.some(f => f.toLowerCase().includes(q));
        const matchesDept = c.department.toLowerCase().includes(q);
        if (!matchesName && !matchesHead && !matchesFocus && !matchesDept) return false;
      }
      return true;
    });
  }, [centres, selectedCategory, searchQuery]);

  // Active Centre for deep dive
  const activeCentre = useMemo(() => {
    return centres.find(c => c.id === activeCentreId) || centres[0];
  }, [centres, activeCentreId]);

  // Overall KPI statistics
  const kpiStats = useMemo(() => {
    const totalCentres = centres.length;
    const totalPubs = centres.reduce((sum, c) => sum + c.publicationsCount, 0);
    const totalPatents = centres.reduce((sum, c) => sum + c.patentsCount, 0);
    const totalProjects = centres.reduce((sum, c) => sum + c.projectsCount, 0);
    const totalPartners = new Set(centres.flatMap(c => c.corporatePartners)).size;

    return {
      totalCentres,
      totalPubs,
      totalPatents,
      totalProjects,
      totalPartners,
      totalFunding: '₹ 11.70+ Crores'
    };
  }, [centres]);

  // Handle Save Centre
  const handleSaveCentre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.head.trim()) return;

    if (editingCentre) {
      setCentres(prev =>
        prev.map(c =>
          c.id === editingCentre.id
            ? {
                ...c,
                name: formData.name,
                shortName: formData.shortName || c.shortName,
                category: formData.category,
                head: formData.head,
                headRole: formData.headRole,
                establishedYear: formData.establishedYear,
                department: formData.department,
                focusAreas: formData.focusAreas.split(',').map(s => s.trim()).filter(Boolean),
                labs: formData.labs.split(',').map(s => s.trim()).filter(Boolean),
                fundingAmount: formData.fundingAmount
              }
            : c
        )
      );
    } else {
      const newCentre: CentreItem = {
        id: `COE-00${centres.length + 1}`,
        name: formData.name,
        shortName: formData.shortName || `COE-${centres.length + 1}`,
        category: formData.category,
        head: formData.head,
        headRole: formData.headRole,
        establishedYear: formData.establishedYear,
        department: formData.department,
        focusAreas: formData.focusAreas.split(',').map(s => s.trim()).filter(Boolean),
        labs: formData.labs.split(',').map(s => s.trim()).filter(Boolean),
        equipment: ['High Performance Compute Nodes', 'Specialized Research Instrument Bench'],
        software: ['Specialized Research Software Suite'],
        facultyTeam: [{ name: formData.head, role: formData.headRole, specialization: formData.category }],
        achievements: ['Newly established Centre of Excellence funded under institutional growth initiative.'],
        projectsCount: 2,
        publicationsCount: 4,
        patentsCount: 1,
        fundingAmount: formData.fundingAmount,
        corporatePartners: ['Industry Academic Partner'],
        status: 'Active'
      };
      setCentres([...centres, newCentre]);
    }

    setShowAddModal(false);
    setEditingCentre(null);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportRows = filteredCentres.map((c, i) => ({
      'Sl. No': i + 1,
      'Centre Code': c.id,
      'Centre Name': c.name,
      'Abbreviation': c.shortName,
      'Research Domain': c.category,
      'Centre Director / Head': c.head,
      'Department': c.department,
      'Established': c.establishedYear,
      'Active Projects': c.projectsCount,
      'Publications': c.publicationsCount,
      'Patents': c.patentsCount,
      'Total Research Grant': c.fundingAmount,
      'Key Corporate Partners': c.corporatePartners.join(', ')
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Centres of Excellence');
    XLSX.writeFile(wb, `CHRIST_Centres_Of_Excellence_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Code', 'Name', 'Domain', 'Director', 'Department', 'Established', 'Projects', 'Publications', 'Patents', 'Funding'];
    const rows = filteredCentres.map(c => [
      `"${c.id}"`,
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.category}"`,
      `"${c.head}"`,
      `"${c.department}"`,
      `"${c.establishedYear}"`,
      `"${c.projectsCount}"`,
      `"${c.publicationsCount}"`,
      `"${c.patentsCount}"`,
      `"${c.fundingAmount}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CHRIST_Centres_Of_Excellence_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {!hideSidebar && <Sidebar currentPage="centre-excellence" onNavigate={onNavigate} />}

      <main className={hideSidebar ? 'p-4 sm:p-6 lg:p-8 w-full' : 'ml-64 flex-1 min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-300'}>
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ========================================================================= */}
          {/* 1. MASTER HEADER & ACTION TOOLBAR                                         */}
          {/* ========================================================================= */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
                  Flagship R&D Hubs
                </Badge>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">Interdisciplinary Research & Industry Incubators</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Centres of Excellence (CoE)
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Advanced specialized research centres fostering multi-disciplinary breakthroughs, sponsored grant execution, patent generation, and high-impact industry collaboration.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Export Toolbar */}
              <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportExcel}
                  className="h-9 px-3 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-1.5"
                  title="Export to Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Excel</span>
                </Button>
                <div className="h-4 w-px bg-slate-200" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportCSV}
                  className="h-9 px-3 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg flex items-center gap-1.5"
                  title="Export to CSV (.csv)"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>CSV</span>
                </Button>
              </div>

              {/* Add Centre Button */}
              {isAdminOrCoordinator && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingCentre(null);
                    setFormData({
                      name: '',
                      shortName: '',
                      category: 'Artificial Intelligence & Data',
                      head: '',
                      headRole: 'Professor & Lead PI',
                      establishedYear: '2024',
                      department: 'AI and Data Science Engineering',
                      focusAreas: 'Edge AI, Deep Learning, Autonomous Robotics',
                      labs: 'Advanced Research Lab, GPU Compute Facility',
                      fundingAmount: '₹ 1.50 Crores'
                    });
                    setShowAddModal(true);
                  }}
                  className="h-9 px-4 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-sm flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Centre of Excellence</span>
                </Button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. 5 KPI METRIC CARDS                                                     */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Active CoEs */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Centres</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <Star className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {kpiStats.totalCentres} CoEs
                  </div>
                  <div className="text-[11px] text-amber-700 font-medium mt-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Specialized Research Hubs</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Cumulative Research Funding */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Grant Funding</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-emerald-600 tracking-tight">
                    {kpiStats.totalFunding}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">
                    Government & Industry Grants
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Indexed Publications */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scopus / WoS Papers</span>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {kpiStats.totalPubs}+ Papers
                  </div>
                  <div className="text-[11px] text-blue-700 font-medium mt-1">
                    High Impact Research Outputs
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 4: Patents & IPR */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Patents & IPR</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {kpiStats.totalPatents} Patents
                  </div>
                  <div className="text-[11px] text-purple-700 font-medium mt-1">
                    Granted & Published Tech
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 5: Corporate Partners */}
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Corporate Alliances</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Building className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {kpiStats.totalPartners}+ Partners
                  </div>
                  <div className="text-[11px] text-indigo-700 font-medium mt-1">
                    Joint Innovation & Lab MoUs
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* 3. UNIFIED TOOLBAR & VIEW MODE SWITCHER                                   */}
          {/* ========================================================================= */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search CoE name, director, domain, focus areas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 h-10 text-xs bg-slate-50/50 border-slate-200 focus:bg-white rounded-xl focus:ring-amber-500"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* View Modes & Category Filter */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-xl min-w-[180px]">
                    <SelectValue placeholder="All Research Domains" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Research Domains</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* View Pills */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'cards'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>

                  <button
                    onClick={() => setViewMode('details')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'details'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Deep Dive</span>
                  </button>

                  <button
                    onClick={() => setViewMode('analytics')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'analytics'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Analytics</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. VIEW MODES (CARDS / DEEP DIVE / ANALYTICS)                             */}
          {/* ========================================================================= */}
          {filteredCentres.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Centres of Excellence match your criteria</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try resetting search queries or choosing 'All Research Domains'.
              </p>
              <Button size="sm" variant="outline" onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }} className="rounded-xl">
                Reset Filters
              </Button>
            </div>
          ) : viewMode === 'cards' ? (
            /* ======================================================================= */
            /* VIEW 1: CARDS GRID VIEW                                                 */
            /* ======================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCentres.map((centre) => (
                <Card
                  key={centre.id}
                  className="border border-slate-200/80 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl overflow-hidden flex flex-col justify-between group"
                >
                  <CardHeader className="pb-4 bg-slate-50/40 border-b border-slate-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[10px] font-mono">
                            {centre.shortName}
                          </Badge>
                          <span className="text-xs font-semibold text-slate-500">{centre.category}</span>
                        </div>
                        <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-amber-700 transition-colors leading-snug">
                          {centre.name}
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-600 mt-1 font-medium flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{centre.head} • {centre.headRole}</span>
                        </CardDescription>
                      </div>

                      <span className="text-sm font-bold font-mono text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex-shrink-0">
                        {centre.fundingAmount}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4 flex-1 text-xs">
                    {/* Focus Areas Chips */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Key Research Thrust Areas
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {centre.focusAreas.map((area, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[11px] bg-slate-100 text-slate-700 border-slate-200">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Labs Infrastructure */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Research Labs</span>
                        <span className="font-bold text-slate-800 text-xs">{centre.labs.length} Dedicated Labs</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Patents & Papers</span>
                        <span className="font-bold text-slate-800 text-xs">{centre.patentsCount} Patents • {centre.publicationsCount} Papers</span>
                      </div>
                    </div>
                  </CardContent>

                  <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      Est. {centre.establishedYear} • {centre.department}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActiveCentreId(centre.id);
                          setViewMode('details');
                        }}
                        className="h-8 px-3 text-xs text-slate-700 hover:bg-slate-100 rounded-xl"
                      >
                        <Layers className="w-3.5 h-3.5 mr-1" /> Deep Dive
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => setInspectingCentre(centre)}
                        className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Inspect
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : viewMode === 'details' ? (
            /* ======================================================================= */
            /* VIEW 2: DETAILED DEEP DIVE VIEW                                         */
            /* ======================================================================= */
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Selector List */}
              <div className="lg:col-span-1 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 block mb-2">
                  Select Research Centre
                </span>
                {centres.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCentreId(c.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                      activeCentreId === c.id
                        ? 'bg-amber-500 text-white border-amber-600 shadow-md font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-mono opacity-80">{c.shortName}</div>
                    <div className="text-xs font-semibold leading-tight mt-0.5">{c.name}</div>
                  </button>
                ))}
              </div>

              {/* Right Detail Pane */}
              <div className="lg:col-span-3 space-y-5">
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-mono font-bold">
                          {activeCentre.id} • {activeCentre.shortName}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-slate-500">
                          {activeCentre.department}
                        </Badge>
                      </div>
                      <h2 className="text-xl font-bold text-slate-900">{activeCentre.name}</h2>
                      <p className="text-xs text-slate-500 mt-1 font-medium">
                        Head: <span className="text-slate-800 font-bold">{activeCentre.head}</span> ({activeCentre.headRole})
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-bold font-mono text-emerald-700 block">
                        {activeCentre.fundingAmount}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">Active Research Grant</span>
                    </div>
                  </div>

                  {/* Labs & Equipment */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-amber-600" />
                        <span>Dedicated Lab Facilities</span>
                      </h4>
                      <ul className="space-y-1 text-xs text-slate-600 pl-4 list-disc">
                        {activeCentre.labs.map((lab, i) => (
                          <li key={i}>{lab}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-indigo-600" />
                        <span>Core High-End Instrumentation</span>
                      </h4>
                      <ul className="space-y-1 text-xs text-slate-600 pl-4 list-disc">
                        {activeCentre.equipment.map((eq, i) => (
                          <li key={i}>{eq}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Faculty Team */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>Investigator & Research Team</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeCentre.facultyTeam.map((fac, i) => (
                        <div key={i} className="p-3 rounded-xl border border-slate-200 bg-white text-xs">
                          <div className="font-bold text-slate-900">{fac.name}</div>
                          <div className="text-[11px] text-slate-500">{fac.role}</div>
                          <div className="text-[11px] text-indigo-700 font-medium mt-1">{fac.specialization}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Key Achievements */}
                  <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Major Research Outcomes & Milestones</span>
                    </h4>
                    <ul className="space-y-1.5 text-xs text-emerald-900 pl-4 list-disc font-medium">
                      {activeCentre.achievements.map((ach, i) => (
                        <li key={i}>{ach}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Corporate Partners */}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Active Corporate & Industry Partners
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {activeCentre.corporatePartners.map((cp, idx) => (
                        <Badge key={idx} className="bg-slate-100 text-slate-800 border-slate-200 px-3 py-1 text-xs">
                          {cp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================================= */
            /* VIEW 3: RESEARCH ANALYTICS VIEW                                         */
            /* ======================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {centres.map((centre) => (
                <Card key={centre.id} className="border border-slate-200/80 shadow-sm bg-white rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-bold font-mono text-amber-600">{centre.shortName}</span>
                      <h3 className="text-base font-bold text-slate-900">{centre.name}</h3>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-xs">
                      {centre.fundingAmount}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                      <span className="text-[10px] font-bold text-blue-600 uppercase block">Projects</span>
                      <span className="font-bold text-blue-900 text-sm">{centre.projectsCount} Active</span>
                    </div>
                    <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
                      <span className="text-[10px] font-bold text-purple-600 uppercase block">Publications</span>
                      <span className="font-bold text-purple-900 text-sm">{centre.publicationsCount} Scopus</span>
                    </div>
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                      <span className="text-[10px] font-bold text-amber-600 uppercase block">Patents</span>
                      <span className="font-bold text-amber-900 text-sm">{centre.patentsCount} Filed</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Research Thrust Areas
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {centre.focusAreas.map((f, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px] bg-slate-100 text-slate-700">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* ========================================================================= */}
      {/* 5. ADD / EDIT CENTRE MODAL DIALOG                                         */}
      {/* ========================================================================= */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-xl bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-600" />
              <span>{editingCentre ? 'Edit Centre of Excellence' : 'Add Centre of Excellence'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Establish and record institutional specialized research centre details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCentre} className="space-y-4 pt-2 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                Centre Full Title *
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Centre for Quantum Computing & Cryptography"
                className="h-9 text-xs rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Short Code / Acronym *
                </Label>
                <Input
                  value={formData.shortName}
                  onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                  placeholder="e.g. CQCC"
                  className="h-9 text-xs rounded-xl font-mono"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Research Domain *
                </Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Quantum & Cyber Security"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Director / Lead PI *
                </Label>
                <Input
                  value={formData.head}
                  onChange={(e) => setFormData({ ...formData, head: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Allocated Research Grant *
                </Label>
                <Input
                  value={formData.fundingAmount}
                  onChange={(e) => setFormData({ ...formData, fundingAmount: e.target.value })}
                  placeholder="e.g. ₹ 2.50 Crores"
                  className="h-9 text-xs rounded-xl font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700 mb-1 block">
                Core Thrust Areas (Comma-separated)
              </Label>
              <Input
                value={formData.focusAreas}
                onChange={(e) => setFormData({ ...formData, focusAreas: e.target.value })}
                placeholder="e.g. Quantum Algorithms, Post-Quantum Cryptography, QKD"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddModal(false)}
                className="h-9 px-4 text-xs rounded-xl border-slate-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-9 px-5 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold"
              >
                Save Centre
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 6. INSPECTION DRAWER MODAL                                                */}
      {/* ========================================================================= */}
      <Dialog open={!!inspectingCentre} onOpenChange={() => setInspectingCentre(null)}>
        <DialogContent className="max-w-lg bg-white rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-mono">
                {inspectingCentre?.shortName}
              </Badge>
              <span className="text-xs text-slate-500 font-medium">Est. {inspectingCentre?.establishedYear}</span>
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {inspectingCentre?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Department of {inspectingCentre?.department}
            </DialogDescription>
          </DialogHeader>

          {inspectingCentre && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Lead PI</span>
                  <span className="font-bold text-slate-900">{inspectingCentre.head}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Funding</span>
                  <span className="font-bold text-emerald-700 font-mono">{inspectingCentre.fundingAmount}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Thrust Areas:</span>
                <div className="flex flex-wrap gap-1">
                  {inspectingCentre.focusAreas.map((f, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] bg-slate-100">{f}</Badge>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Key Milestones:</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                  {inspectingCentre.achievements.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  onClick={() => setInspectingCentre(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl"
                >
                  Close Inspection
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState, useMemo } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Lightbulb, 
  Users, 
  TrendingUp, 
  Award, 
  Building, 
  Calendar, 
  DollarSign, 
  Rocket, 
  Search, 
  Plus, 
  Download, 
  Table as TableIcon, 
  LayoutGrid, 
  BarChart3, 
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  X,
  Briefcase
} from 'lucide-react';
import { Badge } from './ui/badge';

interface IncubationsPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
}

export function IncubationsPage({ onNavigate, isPublicView = false }: IncubationsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [stageFilter, setStageFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'analytics'>('cards');

  const startupsData = [
    {
      id: 1,
      name: 'EduTech Solutions',
      founder: 'Rahul Sharma (CSE 2022)',
      sector: 'Education Technology',
      stage: 'Seed Funding',
      funding: '₹50 Lakhs',
      fundingAmount: 50,
      incubatedSince: '2023-06-15',
      employees: 8,
      description: 'AI-powered personalized learning platform for K-12 students with adaptive curriculum matching.',
      status: 'Active'
    },
    {
      id: 2,
      name: 'GreenEnergy Innovations',
      founder: 'Priya Menon (EEE 2021)',
      sector: 'Clean Energy',
      stage: 'Series A',
      funding: '₹2.5 Crores',
      fundingAmount: 250,
      incubatedSince: '2022-09-20',
      employees: 15,
      description: 'Sustainable solar panel recycling and energy management solutions with zero-waste recovery.',
      status: 'Active'
    },
    {
      id: 3,
      name: 'HealthCare AI',
      founder: 'Dr. Arjun Kumar (AI&DS 2020)',
      sector: 'HealthTech',
      stage: 'Pre-Series A',
      funding: '₹1.2 Crores',
      fundingAmount: 120,
      incubatedSince: '2023-01-10',
      employees: 12,
      description: 'ML-based diagnostic assistance for early disease detection and radiology workflow triage.',
      status: 'Active'
    },
    {
      id: 4,
      name: 'AgriTech Connect',
      founder: 'Suresh Patil (ECE 2022)',
      sector: 'AgriTech',
      stage: 'Seed Funding',
      funding: '₹75 Lakhs',
      fundingAmount: 75,
      incubatedSince: '2023-03-25',
      employees: 10,
      description: 'IoT-based precision farming, soil moisture telemetry, and automated crop yield prediction platform.',
      status: 'Active'
    },
    {
      id: 5,
      name: 'TechVenture Labs',
      founder: 'Alumni 2018',
      sector: 'Software Development',
      stage: 'Graduated',
      funding: '₹25 Crores (Valuation)',
      fundingAmount: 2500,
      incubatedSince: '2020-04-12',
      employees: 45,
      description: 'Enterprise workflow automations and cloud migration tools for Fortune 500 banks.',
      status: 'Graduated'
    },
    {
      id: 6,
      name: 'Smart Mobility Solutions',
      founder: 'Alumni 2019',
      sector: 'Transportation',
      stage: 'Graduated',
      funding: '₹18 Crores (Valuation)',
      fundingAmount: 1800,
      incubatedSince: '2021-02-18',
      employees: 32,
      description: 'Autonomous logistics routing and EV battery swapping network for urban deliveries.',
      status: 'Graduated'
    },
  ];

  const filteredStartups = useMemo(() => {
    return startupsData.filter(st => {
      const matchesSearch = !searchTerm ||
        st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.founder.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.sector.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSector = sectorFilter === 'All' || st.sector === sectorFilter;
      const matchesStage = stageFilter === 'All' || 
        (stageFilter === 'Active' && st.status === 'Active') ||
        (stageFilter === 'Graduated' && st.status === 'Graduated');
      return matchesSearch && matchesSector && matchesStage;
    });
  }, [startupsData, searchTerm, sectorFilter, stageFilter]);

  const sectorsList = useMemo(() => {
    return Array.from(new Set(startupsData.map(s => s.sector)));
  }, [startupsData]);

  const activeCount = startupsData.filter(s => s.status === 'Active').length;
  const gradCount = startupsData.filter(s => s.status === 'Graduated').length;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {!isPublicView && <Sidebar currentPage="incubations" onNavigate={onNavigate} />}

      <main className={`${isPublicView ? 'w-full' : 'ml-64 flex-1 min-w-0'} p-4 sm:p-6 lg:p-8 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#2f4692] to-[#1e2f65] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#2f4692]/20 ring-4 ring-[#2f4692]/10">
                <Rocket className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Startup Incubation & Entrepreneurship
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Venture acceleration, seed funding tracking, founder lineages and technology commercialization
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                className="border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold h-9 rounded-xl flex items-center gap-1.5"
                onClick={() => {
                  const header = 'Startup Name,Founder,Sector,Stage,Funding / Valuation,Employees,Status';
                  const rows = filteredStartups.map(s => `"${s.name}","${s.founder}","${s.sector}","${s.stage}","${s.funding}",${s.employees},"${s.status}"`);
                  const csv = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
                  const link = document.createElement('a');
                  link.href = encodeURI(csv);
                  link.download = 'Incubation_Startups_Report.csv';
                  link.click();
                }}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Report</span>
              </Button>
            </div>
          </div>

          {/* 5 Executive KPI Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4692] to-blue-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Startups</p>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2f4692] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Rocket className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">{activeCount}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">In incubation</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Funding</p>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-700 tracking-tight mt-2">₹12.5 Cr</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">Raised by founders</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Graduated</p>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-purple-700 tracking-tight mt-2">{gradCount}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">Market scaled ventures</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jobs Created</p>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">120+</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">Direct employment</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mentor Pool</p>
                <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">35+</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">Industry leaders</p>
            </div>
          </div>

          {/* Unified Single Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search startup name, founder, sector..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 pr-8 text-xs h-9 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <select
                value={sectorFilter}
                onChange={e => setSectorFilter(e.target.value)}
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2f4692]"
              >
                <option value="All">All Tech Sectors</option>
                {sectorsList.map((s, i) => (
                  <option key={i} value={s}>{s}</option>
                ))}
              </select>

              <select
                value={stageFilter}
                onChange={e => setStageFilter(e.target.value)}
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2f4692]"
              >
                <option value="All">All Incubation Statuses</option>
                <option value="Active">Active Incubating</option>
                <option value="Graduated">Graduated / Scale-up</option>
              </select>

              {(searchTerm || sectorFilter !== 'All' || stageFilter !== 'All') && (
                <Button
                  onClick={() => { setSearchTerm(''); setSectorFilter('All'); setStageFilter('All'); }}
                  variant="ghost"
                  className="h-9 text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 px-2.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'cards' ? 'bg-white text-[#2f4692] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Startups</span>
              </button>

              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table' ? 'bg-white text-[#2f4692] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Matrix</span>
              </button>
            </div>
          </div>

          {/* View Mode 1: Cards */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStartups.map((st) => (
                <div key={st.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-black text-slate-900 group-hover:text-[#2f4692] transition-colors">{st.name}</h3>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            st.status === 'Active' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {st.stage}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          Founder: <strong className="text-slate-800">{st.founder}</strong>
                        </p>
                      </div>

                      <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Lightbulb className="w-5 h-5" />
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {st.description}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sector</p>
                        <p className="font-bold text-slate-800 mt-0.5">{st.sector}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Capital / Funding</p>
                        <p className="font-black text-emerald-700 mt-0.5">{st.funding}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Team Size</p>
                        <p className="font-bold text-slate-800 mt-0.5">{st.employees} members</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>Incubated: <strong className="text-slate-600 font-mono">{st.incubatedSince}</strong></span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                      {st.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* View Mode 2: Table Matrix */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-4">Startup Venture</th>
                    <th className="py-3.5 px-4">Founder / Department</th>
                    <th className="py-3.5 px-4">Sector</th>
                    <th className="py-3.5 px-4">Funding Raised</th>
                    <th className="py-3.5 px-4 text-center">Team</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredStartups.map((st) => (
                    <tr key={st.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{st.name}</td>
                      <td className="py-3.5 px-4 font-medium">{st.founder}</td>
                      <td className="py-3.5 px-4">{st.sector}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">{st.funding}</td>
                      <td className="py-3.5 px-4 text-center font-mono">{st.employees}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          st.status === 'Active' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {st.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
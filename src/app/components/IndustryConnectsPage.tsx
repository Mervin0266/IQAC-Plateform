import React, { useState, useMemo } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Briefcase, 
  Users, 
  Calendar, 
  Award, 
  TrendingUp, 
  Building2, 
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
  Layers,
  Network
} from 'lucide-react';
import { Badge } from './ui/badge';

interface IndustryConnectsPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
}

export function IndustryConnectsPage({ onNavigate, isPublicView = false }: IndustryConnectsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'analytics'>('cards');

  const activities = [
    {
      id: 1,
      title: 'Industry Expert Lecture Series',
      date: '2024-02-15',
      type: 'Guest Lecture',
      partner: 'Microsoft India',
      participants: 180,
      description: 'Cloud Computing, generative AI architectures and Azure cloud developer certifications.',
    },
    {
      id: 2,
      title: 'Global Hackathon 2024',
      date: '2024-03-10',
      type: 'Competition',
      partner: 'Google Developer Groups',
      participants: 250,
      description: '24-hour coding marathon focused on edge AI, healthcare sensors, and smart city applications.',
    },
    {
      id: 3,
      title: 'Advanced Manufacturing Plant Immersion',
      date: '2024-01-20',
      type: 'Industry Visit',
      partner: 'Bosch India',
      participants: 60,
      description: 'Exposure to Industry 4.0, smart factory robotics, and automated sensor quality inspection.',
    },
    {
      id: 4,
      title: 'Corporate Readiness Skill Development',
      date: '2024-02-28',
      type: 'Workshop',
      partner: 'TCS iON',
      participants: 120,
      description: 'Professional Agile sprint workflows, enterprise code reviews, and technical interview simulations.',
    },
  ];

  const industryPartners = [
    { name: 'Microsoft India', category: 'Technology', mous: 2, projects: 5, domain: 'Cloud & AI Innovation' },
    { name: 'Google Cloud & GDG', category: 'Technology', mous: 1, projects: 3, domain: 'Developer Technologies' },
    { name: 'Bosch India', category: 'Engineering', mous: 3, projects: 7, domain: 'Industry 4.0 & Automotive' },
    { name: 'Siemens Healthineers', category: 'Engineering', mous: 2, projects: 4, domain: 'Medical Robotics' },
    { name: 'Tata Consultancy Services', category: 'IT Services', mous: 2, projects: 6, domain: 'Software Engineering' },
    { name: 'Infosys Springboard', category: 'IT Services', mous: 2, projects: 5, domain: 'Digital Skilling' },
  ];

  const filteredPartners = useMemo(() => {
    return industryPartners.filter(p => {
      const matchesSearch = !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.domain.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [industryPartners, searchTerm, categoryFilter]);

  const categoriesList = useMemo(() => {
    return Array.from(new Set(industryPartners.map(p => p.category)));
  }, [industryPartners]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {!isPublicView && <Sidebar currentPage="industry-connects" onNavigate={onNavigate} />}

      <main className={`${isPublicView ? 'w-full' : 'ml-64 flex-1 min-w-0'} p-4 sm:p-6 lg:p-8 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#2f4692] to-[#1e2f65] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#2f4692]/20 ring-4 ring-[#2f4692]/10">
                <Network className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Industry Interface & Corporate Connects
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Strategic corporate partnerships, active MoUs, industry expert lectures and technology transfer projects
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                className="border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold h-9 rounded-xl flex items-center gap-1.5"
                onClick={() => {
                  const header = 'Partner Name,Category,Active MoUs,Joint Projects,Domain';
                  const rows = filteredPartners.map(p => `"${p.name}","${p.category}",${p.mous},${p.projects},"${p.domain}"`);
                  const csv = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
                  const link = document.createElement('a');
                  link.href = encodeURI(csv);
                  link.download = 'Industry_Partners_Report.csv';
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
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Industry Partners</p>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2f4692] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">45+</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">Global corporations</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active MoUs</p>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-700 tracking-tight mt-2">32</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">Formal pacts signed</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Students Trained</p>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-purple-700 tracking-tight mt-2">1,250+</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">Industry immersion</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Joint Projects</p>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">30+</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">Sponsored R&D</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Events Held</p>
                <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">28</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">Workshops & hackathons</p>
            </div>
          </div>

          {/* Unified Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search partner corporation, sector, domain..."
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
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2f4692]"
              >
                <option value="All">All Industry Sectors</option>
                {categoriesList.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>

              {(searchTerm || categoryFilter !== 'All') && (
                <Button
                  onClick={() => { setSearchTerm(''); setCategoryFilter('All'); }}
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
                <span>Partners</span>
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
            <div className="space-y-6">
              {/* Partner Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPartners.map((partner, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2f4692] to-[#1e2f65] text-white flex items-center justify-center font-bold">
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#2f4692] transition-colors">{partner.name}</h3>
                            <p className="text-[11px] text-slate-500 font-semibold">{partner.domain}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          {partner.category}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Active MoUs</p>
                          <p className="text-base font-black text-slate-900 mt-0.5">{partner.mous}</p>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Joint Projects</p>
                          <p className="text-base font-black text-emerald-700 mt-0.5">{partner.projects}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-emerald-700 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active Alliance
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent Industry Engagements */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
                <h3 className="text-base font-black text-slate-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#2f4692]" /> Recent Collaborative Engagements & Hackathons
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activities.map((act) => (
                    <div key={act.id} className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900">{act.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {act.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mb-3">{act.description}</p>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 pt-2 border-t border-slate-200/60">
                        <span>Partner: <strong className="text-slate-800">{act.partner}</strong></span>
                        <span>{act.participants} attendees</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* View Mode 2: Table */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-4">Corporation / Partner</th>
                    <th className="py-3.5 px-4">Industry Sector</th>
                    <th className="py-3.5 px-4">Domain Focus</th>
                    <th className="py-3.5 px-4 text-center">Active MoUs</th>
                    <th className="py-3.5 px-4 text-center">Joint Projects</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredPartners.map((partner, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{partner.name}</td>
                      <td className="py-3.5 px-4">{partner.category}</td>
                      <td className="py-3.5 px-4 font-medium">{partner.domain}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-[#2f4692]">{partner.mous}</td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-700">{partner.projects}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
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
import React, { useState, useMemo } from 'react';
import { AppShell, PageHeader, StatCard } from './design-system';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Globe, 
  Users, 
  BookOpen, 
  Award, 
  Calendar, 
  MapPin, 
  GraduationCap, 
  Plane, 
  Building, 
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
  Compass
} from 'lucide-react';
import { Badge } from './ui/badge';

interface InternationalInteractionsPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
}

export function InternationalInteractionsPage({ onNavigate, isPublicView = false }: InternationalInteractionsPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [countryFilter, setCountryFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'partnerships' | 'conferences' | 'students' | 'faculty'>('partnerships');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const partnerships = [
    {
      id: 'MOU-001',
      institution: 'University of Oxford',
      country: 'United Kingdom',
      type: 'Research Collaboration',
      signedDate: '2023-09-15',
      duration: '5 years',
      focusAreas: ['AI Research', 'Data Science', 'Machine Learning'],
      status: 'Active',
    },
    {
      id: 'MOU-002',
      institution: 'Massachusetts Institute of Technology (MIT)',
      country: 'United States',
      type: 'Student Exchange',
      signedDate: '2023-07-20',
      duration: '3 years',
      focusAreas: ['Engineering', 'Innovation', 'Entrepreneurship'],
      status: 'Active',
    },
    {
      id: 'MOU-003',
      institution: 'National University of Singapore',
      country: 'Singapore',
      type: 'Joint Research',
      signedDate: '2024-01-10',
      duration: '4 years',
      focusAreas: ['Sustainability', 'Urban Planning', 'Smart Cities'],
      status: 'Active',
    },
    {
      id: 'MOU-004',
      institution: 'Technical University of Munich',
      country: 'Germany',
      type: 'Faculty Exchange',
      signedDate: '2023-11-05',
      duration: '5 years',
      focusAreas: ['Automotive Engineering', 'Robotics', 'Manufacturing'],
      status: 'Active',
    },
  ];

  const conferences = [
    {
      id: 'CONF-001',
      name: 'IEEE International Conference on AI and ML',
      location: 'San Francisco, USA',
      country: 'United States',
      date: '2024-06-15',
      participants: ['Dr. Rajesh Kumar', 'Dr. Priya Sharma', 'Dr. Arun Menon'],
      papers: 3,
      type: 'Paper Presentation',
    },
    {
      id: 'CONF-002',
      name: 'World Engineering Summit',
      location: 'Tokyo, Japan',
      country: 'Japan',
      date: '2024-08-20',
      participants: ['Dr. Suresh Rao', 'Dr. Lakshmi Prasad'],
      papers: 2,
      type: 'Keynote Speaker',
    },
    {
      id: 'CONF-003',
      name: 'International Conference on Sustainable Development',
      location: 'Paris, France',
      country: 'France',
      date: '2024-09-10',
      participants: ['Dr. Meera Nair', 'Dr. Karthik Iyer'],
      papers: 1,
      type: 'Panel Discussion',
    },
  ];

  const studentExchanges = [
    {
      id: 'EX-001',
      studentName: 'Arjun Sharma',
      department: 'Computer Science',
      destinationUniversity: 'University of Melbourne',
      country: 'Australia',
      duration: '1 Semester',
      startDate: '2024-01-15',
      endDate: '2024-06-30',
      program: 'Research Internship',
    },
    {
      id: 'EX-002',
      studentName: 'Priya Reddy',
      department: 'Civil Engineering',
      destinationUniversity: 'ETH Zurich',
      country: 'Switzerland',
      duration: '6 Months',
      startDate: '2024-02-01',
      endDate: '2024-07-31',
      program: 'Student Exchange',
    },
    {
      id: 'EX-003',
      studentName: 'Vikram Patel',
      department: 'Electrical Engineering',
      destinationUniversity: 'TU Delft',
      country: 'Netherlands',
      duration: '1 Year',
      startDate: '2023-09-01',
      endDate: '2024-08-31',
      program: 'Dual Degree',
    },
  ];

  const visitingFaculty = [
    {
      id: 'VF-001',
      name: 'Prof. John Smith',
      designation: 'Professor of AI',
      institution: 'Stanford University',
      country: 'United States',
      visitDate: '2024-03-15',
      duration: '2 Weeks',
      activities: ['Guest Lectures', 'Workshop on Deep Learning', 'Research Collaboration'],
    },
    {
      id: 'VF-002',
      name: 'Dr. Maria Garcia',
      designation: 'Associate Professor',
      institution: 'University of Barcelona',
      country: 'Spain',
      visitDate: '2024-04-10',
      duration: '1 Week',
      activities: ['Seminar on Renewable Energy', 'Student Mentoring'],
    },
  ];

  const countriesList = useMemo(() => {
    const set = new Set<string>();
    partnerships.forEach(p => set.add(p.country));
    conferences.forEach(c => set.add(c.country));
    studentExchanges.forEach(s => set.add(s.country));
    visitingFaculty.forEach(f => set.add(f.country));
    return Array.from(set);
  }, [partnerships, conferences, studentExchanges, visitingFaculty]);

  const filteredPartnerships = useMemo(() => {
    return partnerships.filter(p => {
      const matchesSearch = !searchTerm ||
        p.institution.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.focusAreas.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCountry = countryFilter === 'All' || p.country === countryFilter;
      return matchesSearch && matchesCountry;
    });
  }, [partnerships, searchTerm, countryFilter]);

  return (
    <AppShell currentPage="international-interactions" onNavigate={onNavigate} hideSidebar={isPublicView}>
          
      <PageHeader
        breadcrumbs={[
          { label: 'Global' },
          { label: 'International Relations & Global Immersion', active: true },
        ]}
        title="International Relations & Global Immersion"
        badge={`${partnerships.length} Partnerships`}
        description="Global academic MoUs, foreign exchange programs, visiting professorships and world conferences."
        actions={
          <Button
            variant="outline"
            className="border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium h-9 px-3.5 rounded-lg shadow-xs flex items-center gap-1.5"
            onClick={() => {
              const header = 'Institution / Partner,Country,Type,Duration,Status';
              const rows = filteredPartnerships.map(p => `"${p.institution}","${p.country}","${p.type}","${p.duration}","${p.status}"`);
              const csv = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
              const link = document.createElement('a');
              link.href = encodeURI(csv);
              link.download = 'International_MoUs_Report.csv';
              link.click();
            }}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Report</span>
          </Button>
        }
      />

      {/* 5 Executive KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          title="Global MoUs"
          value={partnerships.length}
          subtitle="Tier-1 universities"
          icon={Building}
        />
        <StatCard
          title="Countries"
          value={countriesList.length}
          subtitle="Active nations"
          icon={Globe}
        />
        <StatCard
          title="Exchange Scholars"
          value={studentExchanges.length}
          subtitle="Global internships"
          icon={GraduationCap}
        />
        <StatCard
          title="Conferences"
          value={conferences.length}
          subtitle="World summits"
          icon={Award}
        />
        <StatCard
          title="Visiting Faculty"
          value={visitingFaculty.length}
          subtitle="International chairs"
          icon={Plane}
        />
      </div>

          {/* Tab Selection */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            {[
              { id: 'partnerships', label: 'MoUs & Global Alliances', count: partnerships.length },
              { id: 'conferences', label: 'International Conferences', count: conferences.length },
              { id: 'students', label: 'Student Exchange Programs', count: studentExchanges.length },
              { id: 'faculty', label: 'Visiting Professors', count: visitingFaculty.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-[#2f4692] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Unified Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search international universities, countries, focus areas..."
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
                value={countryFilter}
                onChange={e => setCountryFilter(e.target.value)}
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2f4692]"
              >
                <option value="All">All Countries</option>
                {countriesList.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>

              {(searchTerm || countryFilter !== 'All') && (
                <Button
                  onClick={() => { setSearchTerm(''); setCountryFilter('All'); }}
                  variant="ghost"
                  className="h-9 text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 px-2.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </Button>
              )}
            </div>
          </div>

          {/* Tab Content: Partnerships */}
          {activeTab === 'partnerships' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPartnerships.map((mou) => (
                <div key={mou.id} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-colors flex flex-col justify-between group">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center justify-center">
                          <Globe className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{mou.institution}</h3>
                          <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" /> {mou.country}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                        {mou.status}
                      </span>
                    </div>

                    <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Collaboration Type:</span>
                        <strong className="text-slate-800">{mou.type}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Pact Duration:</span>
                        <strong className="text-slate-800">{mou.duration}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Signed Date:</span>
                        <strong className="text-slate-800 font-mono">{mou.signedDate}</strong>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Research Focus Areas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {mou.focusAreas.map((area, i) => (
                          <span key={i} className="text-[11px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-lg border border-blue-100">
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab Content: Conferences */}
          {activeTab === 'conferences' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {conferences.map((conf) => (
                <div key={conf.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-5 h-5 text-amber-600" />
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        {conf.type}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{conf.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {conf.location}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 text-xs">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Participating Faculty</p>
                      <p className="font-semibold text-slate-800">{conf.participants.join(', ')}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>Date: <strong className="text-slate-600 font-mono">{conf.date}</strong></span>
                    <span className="font-bold text-emerald-700">{conf.papers} Papers Published</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab Content: Student Exchanges */}
          {activeTab === 'students' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studentExchanges.map((ex) => (
                <div key={ex.id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <GraduationCap className="w-5 h-5 text-purple-600" />
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        {ex.program}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">{ex.studentName}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{ex.department}</p>

                    <div className="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                      <p className="text-slate-400">Destination University:</p>
                      <p className="font-bold text-slate-900">{ex.destinationUniversity}</p>
                      <p className="text-[11px] text-slate-500 font-semibold">{ex.country} • {ex.duration}</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-500">
                    Term: {ex.startDate} to {ex.endDate}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tab Content: Visiting Faculty */}
          {activeTab === 'faculty' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visitingFaculty.map((vf) => (
                <div key={vf.id} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
                        <Plane className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{vf.name}</h3>
                        <p className="text-xs text-slate-500">{vf.designation} • {vf.institution} ({vf.country})</p>
                      </div>
                    </div>

                    <div className="mt-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Key Immersion Activities</p>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium">
                        {vf.activities.map((act, i) => (
                          <li key={i}>{act}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span>Visit Date: <strong className="font-mono text-slate-800">{vf.visitDate}</strong></span>
                    <span>Duration: <strong>{vf.duration}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
    </AppShell>
  );
}
import React, { useState, useMemo } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Layers, 
  Building2, 
  Cpu, 
  Microscope, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Table as TableIcon, 
  LayoutGrid, 
  BarChart3, 
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  CheckCircle2,
  X
} from 'lucide-react';
import { Badge } from './ui/badge';

interface InfrastructureFacilitiesPageProps {
  onNavigate: (page: string) => void;
  isPublicView?: boolean;
}

export function InfrastructureFacilitiesPage({ onNavigate, isPublicView = false }: InfrastructureFacilitiesPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'analytics'>('cards');

  const departmentInfrastructure = [
    {
      department: 'Computer Science and Engineering',
      labs: [
        {
          name: 'AI & Machine Learning Lab',
          newEquipments: [
            { item: 'NVIDIA RTX 4090 GPU Workstations', quantity: 15, value: '₹45 Lakhs', acquired: '2024-01-15' },
            { item: 'High-Performance Computing Cluster', quantity: 1, value: '₹1.2 Crores', acquired: '2023-12-10' },
            { item: 'Deep Learning Development Kits', quantity: 25, value: '₹12 Lakhs', acquired: '2024-02-20' },
          ],
          totalValue: '₹1.77 Crores',
          capacity: 60,
        },
        {
          name: 'Cloud Computing & IoT Lab',
          newEquipments: [
            { item: 'Raspberry Pi 4 Development Kits', quantity: 50, value: '₹8 Lakhs', acquired: '2024-01-05' },
            { item: 'IoT Sensor Modules & Gateways', quantity: 100, value: '₹15 Lakhs', acquired: '2023-11-20' },
            { item: 'Cloud Infrastructure (AWS Credits)', quantity: 1, value: '₹20 Lakhs', acquired: '2024-03-01' },
          ],
          totalValue: '₹43 Lakhs',
          capacity: 50,
        },
      ],
    },
    {
      department: 'Electronics and Communication Engineering',
      labs: [
        {
          name: 'VLSI Design Lab',
          newEquipments: [
            { item: 'Cadence VLSI Design Suite Licenses', quantity: 30, value: '₹25 Lakhs', acquired: '2024-02-10' },
            { item: 'FPGA Development Boards (Xilinx)', quantity: 40, value: '₹18 Lakhs', acquired: '2023-12-05' },
            { item: 'Mixed Signal Oscilloscopes', quantity: 15, value: '₹22 Lakhs', acquired: '2024-01-20' },
          ],
          totalValue: '₹65 Lakhs',
          capacity: 40,
        },
        {
          name: 'Communication Systems Lab',
          newEquipments: [
            { item: 'Software Defined Radio Kits', quantity: 20, value: '₹16 Lakhs', acquired: '2024-02-15' },
            { item: 'Network Analyzers', quantity: 8, value: '₹28 Lakhs', acquired: '2023-11-25' },
            { item: '5G Testing Equipment', quantity: 5, value: '₹45 Lakhs', acquired: '2024-03-10' },
          ],
          totalValue: '₹89 Lakhs',
          capacity: 50,
        },
      ],
    },
    {
      department: 'Electrical and Electronics Engineering',
      labs: [
        {
          name: 'Power Systems Lab',
          newEquipments: [
            { item: 'Smart Grid Simulation Systems', quantity: 5, value: '₹35 Lakhs', acquired: '2024-01-25' },
            { item: 'Digital Power Analyzers', quantity: 10, value: '₹18 Lakhs', acquired: '2023-12-15' },
            { item: 'Renewable Energy Test Bench', quantity: 3, value: '₹22 Lakhs', acquired: '2024-02-05' },
          ],
          totalValue: '₹75 Lakhs',
          capacity: 40,
        },
        {
          name: 'Control Systems & Automation Lab',
          newEquipments: [
            { item: 'Industrial PLCs (Siemens S7-1500)', quantity: 12, value: '₹24 Lakhs', acquired: '2024-01-10' },
            { item: 'SCADA System Setup', quantity: 2, value: '₹32 Lakhs', acquired: '2023-11-30' },
            { item: 'Servo Motor Drive Systems', quantity: 15, value: '₹16 Lakhs', acquired: '2024-02-20' },
          ],
          totalValue: '₹72 Lakhs',
          capacity: 45,
        },
      ],
    },
    {
      department: 'Mechanical and Automobile Engineering',
      labs: [
        {
          name: 'CAD/CAM Lab',
          newEquipments: [
            { item: 'SolidWorks Premium Licenses', quantity: 50, value: '₹20 Lakhs', acquired: '2024-01-15' },
            { item: '3D Printers (Industrial Grade)', quantity: 5, value: '₹35 Lakhs', acquired: '2023-12-20' },
            { item: 'CNC Milling Machines', quantity: 3, value: '₹48 Lakhs', acquired: '2024-02-10' },
          ],
          totalValue: '₹1.03 Crores',
          capacity: 50,
        },
        {
          name: 'Automobile Engineering Lab',
          newEquipments: [
            { item: 'Engine Testing Dynamometer', quantity: 1, value: '₹45 Lakhs', acquired: '2024-01-05' },
            { item: 'Vehicle Diagnostic Equipment', quantity: 8, value: '₹16 Lakhs', acquired: '2023-11-15' },
            { item: 'Electric Vehicle Simulator', quantity: 2, value: '₹28 Lakhs', acquired: '2024-03-01' },
          ],
          totalValue: '₹89 Lakhs',
          capacity: 40,
        },
      ],
    },
    {
      department: 'Civil Engineering',
      labs: [
        {
          name: 'Structural Engineering Lab',
          newEquipments: [
            { item: 'Universal Testing Machine (2000 kN)', quantity: 2, value: '₹55 Lakhs', acquired: '2024-02-01' },
            { item: 'Non-Destructive Testing Equipment', quantity: 1, value: '₹18 Lakhs', acquired: '2024-01-10' },
            { item: 'Concrete Compression Testing Machine', quantity: 3, value: '₹12 Lakhs', acquired: '2023-12-05' },
          ],
          totalValue: '₹85 Lakhs',
          capacity: 35,
        },
        {
          name: 'Environmental Engineering Lab',
          newEquipments: [
            { item: 'Water Quality Analysis Systems', quantity: 5, value: '₹22 Lakhs', acquired: '2024-01-20' },
            { item: 'Air Pollution Monitoring Kits', quantity: 8, value: '₹16 Lakhs', acquired: '2023-11-25' },
            { item: 'Soil Testing Equipment', quantity: 10, value: '₹14 Lakhs', acquired: '2024-02-15' },
          ],
          totalValue: '₹52 Lakhs',
          capacity: 40,
        },
      ],
    },
    {
      department: 'Artificial Intelligence and Data Science',
      labs: [
        {
          name: 'Data Science Lab',
          newEquipments: [
            { item: 'High-End Data Analytics Workstations', quantity: 40, value: '₹80 Lakhs', acquired: '2024-01-12' },
            { item: 'Big Data Processing Cluster', quantity: 1, value: '₹95 Lakhs', acquired: '2023-12-18' },
            { item: 'Data Visualization Tools Suite', quantity: 50, value: '₹15 Lakhs', acquired: '2024-02-08' },
          ],
          totalValue: '₹1.90 Crores',
          capacity: 60,
        },
      ],
    },
  ];

  const filteredDepts = useMemo(() => {
    return departmentInfrastructure.filter(dept => {
      const matchesDept = departmentFilter === 'All' || dept.department === departmentFilter;
      const matchesSearch = !searchTerm ||
        dept.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.labs.some(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.newEquipments.some(e => e.item.toLowerCase().includes(searchTerm.toLowerCase())));
      return matchesDept && matchesSearch;
    });
  }, [departmentInfrastructure, departmentFilter, searchTerm]);

  const totalLabs = useMemo(() => {
    return filteredDepts.reduce((sum, d) => sum + d.labs.length, 0);
  }, [filteredDepts]);

  const totalEquipments = useMemo(() => {
    return filteredDepts.reduce((sum, d) => sum + d.labs.reduce((s, l) => s + l.newEquipments.length, 0), 0);
  }, [filteredDepts]);

  const allDepartmentsList = useMemo(() => {
    return departmentInfrastructure.map(d => d.department);
  }, [departmentInfrastructure]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {!isPublicView && <Sidebar currentPage="infrastructure-facilities" onNavigate={onNavigate} />}

      <main className={`${isPublicView ? 'w-full' : 'ml-64 flex-1'} p-8`}>
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#2f4692] to-[#1e2f65] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#2f4692]/20 ring-4 ring-[#2f4692]/10">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Infrastructure & Research Facilities
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  State-of-the-art specialized laboratories, high-performance computing, testing benches and capital equipment
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                className="border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold h-9 rounded-xl flex items-center gap-1.5"
                onClick={() => {
                  const header = 'Department,Laboratory,Total Value,Student Capacity,Equipments Count';
                  const rows: string[] = [];
                  filteredDepts.forEach(d => {
                    d.labs.forEach(l => {
                      rows.push(`"${d.department}","${l.name}","${l.totalValue}",${l.capacity},${l.newEquipments.length}`);
                    });
                  });
                  const csv = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
                  const link = document.createElement('a');
                  link.href = encodeURI(csv);
                  link.download = 'Infrastructure_Laboratories_Report.csv';
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
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Labs</p>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2f4692] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">{totalLabs}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">Specialized labs</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Capital Value</p>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-emerald-700 tracking-tight mt-2">₹7.79 Cr</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">Installed apparatus</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Equipment Items</p>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Cpu className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-purple-700 tracking-tight mt-2">{totalEquipments}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">Advanced test units</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lab Capacity</p>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Microscope className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">550+</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">Simultaneous seats</p>
            </div>

            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Engineering Depts</p>
                <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">{filteredDepts.length}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">Disciplines outfitted</p>
            </div>
          </div>

          {/* Unified Filter Bar & View Switcher */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search labs, equipment, GPU cluster, department..."
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
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value)}
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2f4692]"
              >
                <option value="All">All Departments</option>
                {allDepartmentsList.map((d, i) => (
                  <option key={i} value={d}>{d}</option>
                ))}
              </select>

              {(searchTerm || departmentFilter !== 'All') && (
                <Button
                  onClick={() => { setSearchTerm(''); setDepartmentFilter('All'); }}
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
                <span>Lab Grid</span>
              </button>

              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table' ? 'bg-white text-[#2f4692] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Equipment Matrix</span>
              </button>
            </div>
          </div>

          {/* View Mode 1: Lab Cards Grid */}
          {viewMode === 'cards' && (
            <div className="space-y-6">
              {filteredDepts.map((dept, deptIdx) => (
                <div key={deptIdx} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden p-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#2f4692] flex items-center justify-center font-bold">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-black text-slate-900">{dept.department}</h2>
                        <p className="text-xs text-slate-500">{dept.labs.length} specialized laboratory installations</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {dept.labs.map((lab, labIdx) => (
                      <div key={labIdx} className="bg-slate-50/50 rounded-2xl p-5 border border-slate-200/80 hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                              <Microscope className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm">{lab.name}</h3>
                              <p className="text-[11px] text-slate-500">Student Capacity: <strong className="text-slate-800">{lab.capacity} seats</strong></p>
                            </div>
                          </div>
                          <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            {lab.totalValue}
                          </span>
                        </div>

                        <div className="space-y-2 mt-4 pt-3 border-t border-slate-200/60">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Key Capital Equipment</p>
                          {lab.newEquipments.map((eq, eqIdx) => (
                            <div key={eqIdx} className="bg-white rounded-xl p-2.5 border border-slate-200/60 flex items-center justify-between text-xs">
                              <div>
                                <p className="font-bold text-slate-800">{eq.item}</p>
                                <p className="text-[10px] text-slate-400">Qty: {eq.quantity} | Acquired: {eq.acquired}</p>
                              </div>
                              <span className="text-xs font-mono font-bold text-[#2f4692]">{eq.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
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
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Lab Name</th>
                    <th className="py-3.5 px-4">Apparatus / Equipment</th>
                    <th className="py-3.5 px-4 text-center">Qty</th>
                    <th className="py-3.5 px-4 text-center">Acquired Date</th>
                    <th className="py-3.5 px-4 text-right">Equipment Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredDepts.flatMap((dept) =>
                    dept.labs.flatMap((lab) =>
                      lab.newEquipments.map((eq, idx) => (
                        <tr key={`${dept.department}-${lab.name}-${idx}`} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">{dept.department}</td>
                          <td className="py-3 px-4 font-bold text-[#2f4692]">{lab.name}</td>
                          <td className="py-3 px-4 font-medium">{eq.item}</td>
                          <td className="py-3 px-4 text-center font-mono font-bold">{eq.quantity}</td>
                          <td className="py-3 px-4 text-center font-mono text-slate-500">{eq.acquired}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">{eq.value}</td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
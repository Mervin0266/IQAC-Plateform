import React from 'react';
import {
  Filter,
  RotateCcw,
  Calendar,
  Sparkles,
  ChevronDown,
  Layers,
  GraduationCap,
  Building2,
  Check
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export interface FilterState {
  campus: string;
  school: string;
  department: string;
  academicYears: string[];
  programLevel: string;
  batch: string;
  indexing: string;
}

interface UniversalFilterBarProps {
  filters: FilterState;
  onChange: (updated: Partial<FilterState>) => void;
  onReset: () => void;
  availableYears: string[];
  campuses: Array<{ id: string; name: string }>;
  schools: Array<{ id: string; name: string; campusId?: string }>;
  departments: Array<{ id: string; name: string; shortName?: string; schoolId?: string }>;
  isLoading?: boolean;
}

export function UniversalFilterBar({
  filters,
  onChange,
  onReset,
  availableYears,
  campuses,
  schools,
  departments,
  isLoading = false
}: UniversalFilterBarProps) {
  // Cascaded schools based on selected campus
  const filteredSchools = React.useMemo(() => {
    if (filters.campus === 'All') return schools;
    return schools.filter(s => s.campusId === filters.campus || !s.campusId);
  }, [schools, filters.campus]);

  // Cascaded departments based on selected school
  const filteredDepartments = React.useMemo(() => {
    if (filters.school === 'All') return departments;
    return departments.filter(d => d.schoolId === filters.school || !d.schoolId);
  }, [departments, filters.school]);

  const handleToggleYear = (yr: string) => {
    const prev = filters.academicYears;
    if (prev.includes(yr)) {
      if (prev.length === 1) return; // Keep at least one year
      onChange({ academicYears: prev.filter(y => y !== yr) });
    } else {
      onChange({ academicYears: [...prev, yr] });
    }
  };

  const handleSelectAllYears = () => {
    if (filters.academicYears.length === availableYears.length) {
      onChange({ academicYears: ['AY 2026–27', 'AY 2025–26', 'AY 2024–25', 'AY 2023–24'] });
    } else {
      onChange({ academicYears: [...availableYears] });
    }
  };

  const isFiltered =
    filters.campus !== 'All' ||
    filters.school !== 'All' ||
    filters.department !== 'All' ||
    filters.programLevel !== 'All' ||
    filters.batch !== 'All' ||
    filters.indexing !== 'All' ||
    filters.academicYears.length !== 4;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
      {/* Top Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Institutional Hierarchy & Temporal Filters
          </span>
          <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 bg-slate-100 rounded-full">
            Scope Aware
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleSelectAllYears}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
          >
            {filters.academicYears.length === availableYears.length ? 'Default 4 Years' : 'All Academic Years'}
          </button>

          {isFiltered && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center space-x-1 text-xs text-slate-600 hover:text-blue-600 px-2 py-1 rounded hover:bg-slate-50 transition-colors"
              title="Reset all filters to university-wide defaults"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Select Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {/* Campus Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Campus</label>
          <Select
            value={filters.campus}
            onValueChange={v => {
              onChange({ campus: v, school: 'All', department: 'All' });
            }}
          >
            <SelectTrigger className="w-full bg-slate-50 h-8 text-xs border border-slate-200">
              <SelectValue placeholder="All Campuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Campuses (University-wide)</SelectItem>
              {campuses.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* School Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">School / Faculty</label>
          <Select
            value={filters.school}
            onValueChange={v => {
              onChange({ school: v, department: 'All' });
            }}
          >
            <SelectTrigger className="w-full bg-slate-50 h-8 text-xs border border-slate-200">
              <SelectValue placeholder="All Schools" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Schools</SelectItem>
              {filteredSchools.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Department Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Department</label>
          <Select
            value={filters.department}
            onValueChange={v => onChange({ department: v })}
          >
            <SelectTrigger className="w-full bg-slate-50 h-8 text-xs border border-slate-200">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="All">All Departments</SelectItem>
              {filteredDepartments.map(d => (
                <SelectItem key={d.id} value={d.name}>
                  {d.shortName ? `${d.shortName} – ${d.name}` : d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Academic Years Multi-Select Popover */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Academic Years ({filters.academicYears.length})
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-full bg-slate-50 h-8 text-xs border border-slate-200 rounded-md px-2.5 flex items-center justify-between text-slate-700 hover:bg-slate-100 transition-colors focus:outline-hidden"
              >
                <span className="truncate">
                  {filters.academicYears.length === availableYears.length
                    ? 'All Academic Years (7)'
                    : filters.academicYears.length === 1
                    ? filters.academicYears[0]
                    : `${filters.academicYears.length} Years Selected`}
                </span>
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3 bg-white border border-slate-200 shadow-lg rounded-xl z-50">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-800">Select Academic Years</span>
                <button
                  type="button"
                  onClick={handleSelectAllYears}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                >
                  {filters.academicYears.length === availableYears.length ? 'Reset Default' : 'Select All'}
                </button>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {availableYears.map(yr => {
                  const isChecked = filters.academicYears.includes(yr);
                  return (
                    <label
                      key={yr}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs"
                    >
                      <span className={`font-medium ${isChecked ? 'text-slate-900' : 'text-slate-500'}`}>
                        {yr}
                      </span>
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => handleToggleYear(yr)}
                      />
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Program Level Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Academic Level</label>
          <Select
            value={filters.programLevel}
            onValueChange={v => onChange({ programLevel: v })}
          >
            <SelectTrigger className="w-full bg-slate-50 h-8 text-xs border border-slate-200">
              <SelectValue placeholder="All Levels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Levels</SelectItem>
              <SelectItem value="Undergraduate">Undergraduate (UG)</SelectItem>
              <SelectItem value="Postgraduate">Postgraduate (PG)</SelectItem>
              <SelectItem value="Doctoral">Doctoral (PhD)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Graduating Cohort / Batch Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Graduating Batch</label>
          <Select
            value={filters.batch}
            onValueChange={v => onChange({ batch: v })}
          >
            <SelectTrigger className="w-full bg-slate-50 h-8 text-xs border border-slate-200">
              <SelectValue placeholder="All Batches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Batches</SelectItem>
              <SelectItem value="2026-27">Batch 2026–27</SelectItem>
              <SelectItem value="2025-26">Batch 2025–26</SelectItem>
              <SelectItem value="2024-25">Batch 2024–25</SelectItem>
              <SelectItem value="2023-24">Batch 2023–24</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Indexing Type Filter */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">Indexing Tier</label>
          <Select
            value={filters.indexing}
            onValueChange={v => onChange({ indexing: v })}
          >
            <SelectTrigger className="w-full bg-slate-50 h-8 text-xs border border-slate-200">
              <SelectValue placeholder="All Indexing" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Indexing Tiers</SelectItem>
              <SelectItem value="Scopus">Scopus Indexed</SelectItem>
              <SelectItem value="Web of Science">Web of Science (WoS)</SelectItem>
              <SelectItem value="UGC-CARE">UGC-CARE Group I/II</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filter Pills Bar */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-700">Active Scope:</span>
        <Badge variant="outline" className="text-[11px] font-normal py-0 bg-slate-50 border-slate-200">
          Campus: {filters.campus === 'All' ? 'All Campuses' : campuses.find(c => c.id === filters.campus)?.name || filters.campus}
        </Badge>
        <Badge variant="outline" className="text-[11px] font-normal py-0 bg-slate-50 border-slate-200">
          School: {filters.school === 'All' ? 'All Schools' : schools.find(s => s.id === filters.school)?.name || filters.school}
        </Badge>
        <Badge variant="outline" className="text-[11px] font-normal py-0 bg-slate-50 border-slate-200">
          Dept: {filters.department === 'All' ? 'All Departments' : filters.department}
        </Badge>
        <Badge variant="outline" className="text-[11px] font-normal py-0 bg-blue-50 text-blue-700 border-blue-200">
          {filters.academicYears.length === availableYears.length
            ? 'All Academic Years (7)'
            : filters.academicYears.join(', ')}
        </Badge>
        {filters.programLevel !== 'All' && (
          <Badge variant="outline" className="text-[11px] font-normal py-0 bg-indigo-50 text-indigo-700 border-indigo-200">
            Level: {filters.programLevel}
          </Badge>
        )}
        {isLoading && (
          <span className="inline-flex items-center text-blue-600 font-medium ml-2 animate-pulse">
            Syncing analytics...
          </span>
        )}
      </div>
    </div>
  );
}

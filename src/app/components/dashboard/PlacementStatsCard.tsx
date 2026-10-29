/**
 * PlacementStatsCard — The placement statistics card with 3 views.
 *
 * Extracted from DashboardPage lines 751-1044.
 * Owns the placement view toggle, department/batch dropdowns,
 * and all chart views (departmentwise, overall, single-department).
 */

import React from 'react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { PlacementTooltip } from './CustomTooltip';
import type {
  PlacementView,
  DepartmentPlacementData,
  BatchOverallData,
  SingleBatchStats,
} from '../../types/dashboard';

interface PlacementStatsCardProps {
  placementView: PlacementView;
  setPlacementView: (v: PlacementView) => void;
  selectedDepartment: string;
  setSelectedDepartment: (v: string) => void;
  selectedBatch: string;
  setSelectedBatch: (v: string) => void;
  deptData: DepartmentPlacementData[];
  overallData: BatchOverallData[];
  activeSingleDept: SingleBatchStats;
  departmentsList: string[];
  batchesList: string[];
  hasLiveData: boolean;
}

export function PlacementStatsCard({
  placementView,
  setPlacementView,
  selectedDepartment,
  setSelectedDepartment,
  selectedBatch,
  setSelectedBatch,
  deptData,
  overallData,
  activeSingleDept,
  departmentsList,
  batchesList,
  hasLiveData,
}: PlacementStatsCardProps) {
  return (
    <div className="mb-8 mt-6">
      <div className="p-6 bg-white rounded-xl border border-slate-200/80 shadow-xs">
        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 gap-4">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Placement Statistics</p>
            <p className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
              {placementView === 'departmentwise' &&
                (selectedBatch === 'All'
                  ? 'Departmentwise Analytics (All Batches)'
                  : `Departmentwise Analytics (${selectedBatch})`)}
              {placementView === 'overall' && 'Overall Trends (Batchwise)'}
              {placementView === 'single-department' &&
                (selectedBatch === 'All'
                  ? `${selectedDepartment || 'Department'} Details (All Batches)`
                  : `${selectedDepartment || 'Department'} Details (${selectedBatch})`)}
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">
              {placementView === 'departmentwise' && `${deptData.length} Departments Tracked`}
              {placementView === 'overall' &&
                `${overallData.reduce((sum, item) => sum + item.placed, 0).toLocaleString()} Total Placed`}
              {placementView === 'single-department' && 'Granular Salary & Recruiting Analysis'}
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Department Dropdown (Single Department view) */}
            {placementView === 'single-department' && (
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium max-w-[200px]"
              >
                {departmentsList.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            )}

            {/* Batch Dropdown (not shown in Overall view) */}
            {placementView !== 'overall' && (
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium max-w-[200px]"
              >
                <option value="All">All Batches</option>
                {batchesList.map((b) => (
                  <option key={b} value={b}>
                    Batch {b}
                  </option>
                ))}
              </select>
            )}

            {/* View Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/80">
              {(['departmentwise', 'overall', 'single-department'] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setPlacementView(view)}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    placementView === view
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
                  }`}
                >
                  {view === 'departmentwise' ? 'Departmentwise' : view === 'overall' ? 'Overall' : 'By Department'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Empty state when no placement data in database */}
        {!hasLiveData && deptData.length === 0 && overallData.length === 0 && (
          <div className="py-14 text-center space-y-2 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <p className="text-sm font-semibold text-slate-700">No Placement Records in Database</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              The database is currently clean without student placement records. Upload placement and internship spreadsheets in the Placements workspace to generate live analytics.
            </p>
          </div>
        )}

        {/* Single Department View */}
        {placementView === 'single-department' && (hasLiveData || deptData.length > 0) && (
          <div className="space-y-6">
            {/* Key stats row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Placed Students', value: activeSingleDept.totalPlaced },
                { label: 'Total Interns', value: activeSingleDept.totalInterns },
                {
                  label: 'Avg Package',
                  value: activeSingleDept.avgPackage > 0 ? `${activeSingleDept.avgPackage} LPA` : 'N/A',
                },
                {
                  label: 'Highest Package',
                  value: activeSingleDept.highestPackage > 0 ? `${activeSingleDept.highestPackage} LPA` : 'N/A',
                },
                {
                  label: 'Lowest Package',
                  value: activeSingleDept.lowestPackage > 0 ? `${activeSingleDept.lowestPackage} LPA` : 'N/A',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-slate-50/70 p-3 rounded-lg border border-slate-200/80 text-center"
                >
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{stat.label}</p>
                  <p className="text-lg font-bold text-slate-900 tabular-nums mt-1">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Recruiters */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80">
                <p className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                  Top Recruiter Counts
                </p>
                <div className="h-[200px]">
                  {(activeSingleDept.topEmployers || []).length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                      No recruitment counts available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={activeSingleDept.topEmployers || []}
                        margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fill: '#64748B' }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} name="Hired Students" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Salary Distribution */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80">
                <p className="text-xs font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                  Salary Distribution Tiers
                </p>
                <div className="h-[200px]">
                  {(activeSingleDept.salaryDistribution || []).length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">
                      No package records available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={activeSingleDept.salaryDistribution || []}
                        margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748B' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                        <Tooltip />
                        <Bar dataKey="value" name="Students" radius={[4, 4, 0, 0]}>
                          {(activeSingleDept.salaryDistribution || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Departmentwise & Overall Views */}
        {(placementView === 'departmentwise' || placementView === 'overall') && (hasLiveData || deptData.length > 0 || overallData.length > 0) && (
          <>
            <div className="w-full h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                {placementView === 'departmentwise' ? (
                  <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip content={<PlacementTooltip view="departmentwise" />} />
                    <Bar dataKey="placed" name="Placed Students" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="total" name="Total Students" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={overallData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPlacedBatch" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorOffersBatch" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#64748B" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#64748B" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="batch" tick={{ fontSize: 11, fill: '#64748B' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip content={<PlacementTooltip view="overall" />} />
                    <Area
                      type="monotone"
                      dataKey="placed"
                      name="Placed Students"
                      stroke="#2563EB"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPlacedBatch)"
                    />
                    <Area
                      type="monotone"
                      dataKey="offers"
                      name="Total Offers"
                      stroke="#64748B"
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill="url(#colorOffersBatch)"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center space-x-6 mt-3 pt-3 border-t border-slate-100 text-xs">
              {placementView === 'departmentwise' ? (
                <>
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 rounded bg-blue-600 mr-2" />
                    <span className="text-slate-600">Placed Students</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 rounded bg-slate-400 mr-2" />
                    <span className="text-slate-600">Total Students</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 rounded bg-blue-600 mr-2" />
                    <span className="text-slate-600">Placed Students</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 rounded bg-slate-500 mr-2" />
                    <span className="text-slate-600">Total Offers</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

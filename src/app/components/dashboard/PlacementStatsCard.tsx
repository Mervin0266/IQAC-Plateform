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
import { Card } from '../ui/card';
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
      <Card className="p-6 bg-gradient-to-br from-white to-amber-50 shadow-sm border">
        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-6 gap-4">
          <div>
            <p className="text-sm text-gray-600 font-medium">Placement Statistics</p>
            <p className="text-2xl font-semibold text-gray-900">
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
            <p className="text-xs text-green-600 font-medium mt-0.5">
              {placementView === 'departmentwise' && `${deptData.length} Departments Tracked`}
              {placementView === 'overall' &&
                `${overallData.reduce((sum, item) => sum + item.placed, 0).toLocaleString()} Total Placed`}
              {placementView === 'single-department' && 'Granular Salary & Recruiting Analysis'}
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Department Dropdown (Single Department view) */}
            {placementView === 'single-department' && (
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium max-w-[200px]"
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
                className="px-2 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium max-w-[200px]"
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
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
              {(['departmentwise', 'overall', 'single-department'] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setPlacementView(view)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    placementView === view
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                  }`}
                >
                  {view === 'departmentwise' ? 'Departmentwise' : view === 'overall' ? 'Overall' : 'By Department'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Single Department View */}
        {placementView === 'single-department' && (
          <div className="space-y-6">
            {/* Key stats row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Placed Students', value: activeSingleDept.totalPlaced, color: 'text-blue-600' },
                { label: 'Total Interns', value: activeSingleDept.totalInterns, color: 'text-orange-600' },
                {
                  label: 'Avg Package',
                  value: activeSingleDept.avgPackage > 0 ? `${activeSingleDept.avgPackage} LPA` : 'N/A',
                  color: 'text-green-600',
                },
                {
                  label: 'Highest Package',
                  value: activeSingleDept.highestPackage > 0 ? `${activeSingleDept.highestPackage} LPA` : 'N/A',
                  color: 'text-teal-600',
                },
                {
                  label: 'Lowest Package',
                  value: activeSingleDept.lowestPackage > 0 ? `${activeSingleDept.lowestPackage} LPA` : 'N/A',
                  color: 'text-purple-600',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white p-3 rounded-lg border border-gray-150 shadow-sm text-center"
                >
                  <p className="text-[10px] text-gray-500 font-medium uppercase">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color} mt-1`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Recruiters */}
              <div className="bg-white p-4 rounded-lg border border-gray-150 shadow-sm">
                <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wider">
                  Top Recruiter Counts
                </p>
                <div className="h-[200px]">
                  {(activeSingleDept.topEmployers || []).length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-gray-500 font-medium">
                      No recruitment counts available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={activeSingleDept.topEmployers || []}
                        margin={{ top: 5, right: 15, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 9 }} />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#2f4692" radius={[0, 4, 4, 0]} name="Hired Students" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Salary Distribution */}
              <div className="bg-white p-4 rounded-lg border border-gray-150 shadow-sm">
                <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wider">
                  Salary Distribution Tiers
                </p>
                <div className="h-[200px]">
                  {(activeSingleDept.salaryDistribution || []).length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-gray-500 font-medium">
                      No package records available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={activeSingleDept.salaryDistribution || []}
                        margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
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
        {(placementView === 'departmentwise' || placementView === 'overall') && (
          <>
            <div className="w-full h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                {placementView === 'departmentwise' ? (
                  <BarChart data={deptData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#4B5563' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#4B5563' }} />
                    <Tooltip content={<PlacementTooltip view="departmentwise" />} />
                    <Bar dataKey="placed" name="Placed Students" fill="#2f4692" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="total" name="Total Students" fill="#a0bbf5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : (
                  <AreaChart data={overallData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPlacedBatch" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2f4692" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#2f4692" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="colorOffersBatch" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5a7bd4" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#5a7bd4" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="batch" tick={{ fontSize: 11, fill: '#4B5563' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#4B5563' }} />
                    <Tooltip content={<PlacementTooltip view="overall" />} />
                    <Area
                      type="monotone"
                      dataKey="placed"
                      name="Placed Students"
                      stroke="#2f4692"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorPlacedBatch)"
                    />
                    <Area
                      type="monotone"
                      dataKey="offers"
                      name="Total Offers"
                      stroke="#5a7bd4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorOffersBatch)"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center space-x-6 mt-3 pt-3 border-t border-gray-100 text-xs">
              {placementView === 'departmentwise' ? (
                <>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded bg-[#2f4692] mr-2" />
                    <span className="text-gray-600">Placed Students</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded bg-[#a0bbf5] mr-2" />
                    <span className="text-gray-600">Total Students</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded bg-[#2f4692] mr-2" />
                    <span className="text-gray-600">Placed Students</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded bg-[#5a7bd4] mr-2" />
                    <span className="text-gray-600">Total Offers</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

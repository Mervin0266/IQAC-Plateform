/**
 * DashboardPage — Placement Statistics Focused Dashboard.
 *
 * Dedicated dashboard view focusing exclusively on Placement Statistics analytics,
 * departmentwise placement rates, overall trends, and granular recruiter/salary metrics.
 */

import React from 'react';
import { Sidebar } from './Sidebar';
import { RoleIndicator } from './RoleIndicator';
import { useDashboardData } from '../hooks/useDashboardData';

// Dashboard sub-components
import { DashboardHeader } from './dashboard/DashboardHeader';
import { PlacementStatsCard } from './dashboard/PlacementStatsCard';

import { Card } from './ui/card';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
}

export function DashboardPage({ onNavigate }: DashboardPageProps) {
  const dashboard = useDashboardData();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage="dashboard" onNavigate={onNavigate} />
      <main className="ml-64 p-8">
        <div className="p-6">
          {/* Dashboard Header */}
          <DashboardHeader
            loading={dashboard.loading}
            onRefresh={dashboard.refetchDashboard}
          />

          {/* Role Indicator */}
          <RoleIndicator />

          {/* Academic Hierarchy Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Campuses</p>
                <p className="text-2xl font-bold text-gray-950 mt-1">{dashboard.liveStats.totalCampuses || 1}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100/80 rounded-lg flex items-center justify-center text-blue-600 font-bold text-lg">C</div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Schools</p>
                <p className="text-2xl font-bold text-gray-950 mt-1">{dashboard.liveStats.totalSchools || 1}</p>
              </div>
              <div className="w-10 h-10 bg-purple-100/80 rounded-lg flex items-center justify-center text-purple-600 font-bold text-lg">S</div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Departments</p>
                <p className="text-2xl font-bold text-gray-950 mt-1">{dashboard.liveStats.totalDepartments || 7}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-100/80 rounded-lg flex items-center justify-center text-emerald-600 font-bold text-lg">D</div>
            </Card>
            <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100 flex items-center justify-between shadow-sm">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Programs</p>
                <p className="text-2xl font-bold text-gray-950 mt-1">{dashboard.liveStats.totalCourses || 27}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  UG: <span className="font-semibold text-amber-700">{dashboard.liveStats.totalUGPrograms || 18}</span> | PG: <span className="font-semibold text-amber-700">{dashboard.liveStats.totalPGPrograms || 6}</span> | PhD: <span className="font-semibold text-amber-700">{dashboard.liveStats.totalPhDPrograms || 7}</span>
                </p>
              </div>
              <div className="w-10 h-10 bg-amber-100/80 rounded-lg flex items-center justify-center text-amber-600 font-bold text-lg">P</div>
            </Card>
          </div>

          {/* Placement Statistics (Primary Dashboard View) */}
          <PlacementStatsCard
            placementView={dashboard.placementView}
            setPlacementView={dashboard.setPlacementView}
            selectedDepartment={dashboard.selectedDepartment}
            setSelectedDepartment={dashboard.setSelectedDepartment}
            selectedBatch={dashboard.selectedBatch}
            setSelectedBatch={dashboard.setSelectedBatch}
            deptData={dashboard.deptData}
            overallData={dashboard.overallData}
            activeSingleDept={dashboard.activeSingleDept}
            departmentsList={dashboard.departmentsList}
            batchesList={dashboard.batchesList}
            hasLiveData={dashboard.rawPlacements.length > 0}
          />
        </div>
      </main>
    </div>
  );
}
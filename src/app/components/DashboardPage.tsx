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
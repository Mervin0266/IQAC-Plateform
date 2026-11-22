import React, { Suspense } from 'react';
import { Outlet } from 'react-router';

function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-[#2855B9] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading Dashboard Workspace...</p>
      </div>
    </div>
  );
}

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <Suspense fallback={<DashboardLoading />}>
        <Outlet />
      </Suspense>
    </div>
  );
}

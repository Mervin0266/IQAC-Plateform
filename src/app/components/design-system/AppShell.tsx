import React from 'react';
import { Sidebar } from '../Sidebar';
import { useSidebarWidth } from '../../hooks/useSidebarWidth';

export interface AppShellProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
  className?: string;
  hideSidebar?: boolean;
}

export function AppShell({
  currentPage,
  onNavigate,
  children,
  className = '',
  hideSidebar = false,
}: AppShellProps) {
  const { sidebarWidth, isResizing } = useSidebarWidth();

  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-slate-900 flex ${isResizing ? 'select-none cursor-col-resize' : ''}`}>
      {/* Fixed Institutional Resizable Sidebar */}
      {!hideSidebar && (
        <Sidebar
          currentPage={currentPage}
          onNavigate={onNavigate}
        />
      )}

      {/* Main Content Area coordinated with dynamic sidebar width */}
      <main
        style={{
          marginLeft: hideSidebar ? 0 : `${sidebarWidth}px`,
          transition: isResizing ? 'none' : 'margin-left 0.15s ease-out'
        }}
        className={`flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 ${className}`}
      >
        <div className="max-w-[1600px] w-full mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}

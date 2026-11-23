import React, { lazy, Suspense, useState } from 'react';
import { Menu, X } from 'lucide-react';
import '../../../styles/section-experience.css';
import { Sidebar } from '../Sidebar';
import { useSidebarWidth } from '../../hooks/useSidebarWidth';

import { useAuth } from '../../contexts/AuthContext';
import { isReportSection } from '../../publicReports';

const PublicReportEditor = lazy(() => import('../PublicReportEditor').then(module => ({ default: module.PublicReportEditor })));
const reportPages: Record<string, string> = {
  dashboard: 'profile',
  'department-details': 'profile',
  ranking: 'rankings',
  'nirf-ranking': 'rankings',
  'india-today-ranking': 'rankings',
  'the-world-ranking': 'rankings',
  'qs-india-ranking': 'rankings',
  accreditation: 'rankings',
  'naac-accreditation': 'rankings',
  'internal-research': 'research-innovation',
  'external-research': 'research-innovation',
  copyrights: 'research-innovation',
  patents: 'research-innovation',
  publications: 'research-innovation',
  'sponsored-research': 'research-innovation',
  'research-metrics': 'research-innovation',
  'infrastructure-facilities': 'infrastructure',
};

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
  const { user } = useAuth();
  const reportSection = reportPages[currentPage] ?? currentPage;
  const { sidebarWidth, isResizing } = useSidebarWidth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = (page: string) => { setMobileOpen(false); onNavigate(page); window.scrollTo(0, 0); };

  return (
    <div className={`iq-workspace iq-section-view min-h-screen bg-[#F8FAFC] text-slate-900 flex ${isResizing ? 'select-none cursor-col-resize' : ''}`}>
      {/* Fixed Institutional Resizable Sidebar */}
      {!hideSidebar && (
        <div id="workspace-navigation" className={`iq-sidebar-container ${mobileOpen ? 'is-open' : ''}`} onKeyDown={event => { if (event.key === 'Escape') { setMobileOpen(false); document.getElementById('workspace-menu-toggle')?.focus(); } }}>
        <Sidebar
          currentPage={currentPage}
          onNavigate={navigate}
        />
        </div>
      )}

      {/* Main Content Area coordinated with dynamic sidebar width */}
      <main
        style={{
          marginLeft: hideSidebar ? 0 : `${sidebarWidth}px`,
          transition: isResizing ? 'none' : 'margin-left 0.15s ease-out'
        }}
        className={`iq-workspace-main flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6 ${className}`}
      >
        {!hideSidebar && <button id="workspace-menu-toggle" className="iq-workspace-menu" aria-expanded={mobileOpen} aria-controls="workspace-navigation" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={18} /> : <Menu size={18} />} {mobileOpen ? 'Close navigation' : 'Navigation'}</button>}
        <div key={currentPage} className="iq-section-content max-w-[1600px] w-full mx-auto space-y-6">
          {!hideSidebar && user?.role === 'admin' && isReportSection(reportSection) &&
            <Suspense fallback={null}><PublicReportEditor key={reportSection} section={reportSection} /></Suspense>}
          {children}
        </div>
      </main>
    </div>
  );
}

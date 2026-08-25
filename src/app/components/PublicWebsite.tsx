import React, { useState, Suspense } from 'react';
import { PublicNavBar } from './PublicNavBar';
import { PublicFooter } from './PublicFooter';
import { PublicHomePage } from './PublicHomePage';

// ── Lazy-loaded public pages ─────────────────────────────────────
// These were previously statically imported, preventing code-splitting
// of AchievementsPage, RankingPage, etc. from App.tsx lazy imports.
const AchievementsPage = React.lazy(() => import('./AchievementsPage').then(m => ({ default: m.AchievementsPage })));
const ResearchInnovationPage = React.lazy(() => import('./ResearchInnovationPage').then(m => ({ default: m.ResearchInnovationPage })));
const RankingPage = React.lazy(() => import('./RankingPage').then(m => ({ default: m.RankingPage })));
const PlacementsInternshipsPage = React.lazy(() => import('./PlacementsInternshipsPage').then(m => ({ default: m.PlacementsInternshipsPage })));
const InfrastructureFacilitiesPage = React.lazy(() => import('./InfrastructureFacilitiesPage').then(m => ({ default: m.InfrastructureFacilitiesPage })));
const InternationalInteractionsPage = React.lazy(() => import('./InternationalInteractionsPage').then(m => ({ default: m.InternationalInteractionsPage })));
const CentreExcellencePage = React.lazy(() => import('./CentreExcellencePage').then(m => ({ default: m.CentreExcellencePage })));
const IncubationsPage = React.lazy(() => import('./IncubationsPage').then(m => ({ default: m.IncubationsPage })));
const IndustryConnectsPage = React.lazy(() => import('./IndustryConnectsPage').then(m => ({ default: m.IndustryConnectsPage })));
const ConsultancyProjectsPage = React.lazy(() => import('./ConsultancyProjectsPage').then(m => ({ default: m.ConsultancyProjectsPage })));

/** Lightweight loading spinner for public page transitions */
function PublicPageLoading() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-[#2f4692] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400 font-medium">Loading...</p>
      </div>
    </div>
  );
}

interface PublicWebsiteProps {
  onLoginClick: () => void;
}

export function PublicWebsite({ onLoginClick }: PublicWebsiteProps) {
  const [currentSection, setCurrentSection] = useState('home');

  const renderContent = () => {
    switch (currentSection) {
      case 'home':
        return <PublicHomePage onNavigate={setCurrentSection} />;
      case 'achievements':
        return <AchievementsPage onNavigate={setCurrentSection} isPublicView={true} />;
      case 'research-innovation':
        return <ResearchInnovationPage onNavigate={setCurrentSection} isPublicView={true} />;
      case 'rankings':
        return <RankingPage onNavigate={setCurrentSection} isPublicView={true} />;
      case 'placements-internships':
        return <PlacementsInternshipsPage onNavigate={setCurrentSection} isPublicView={true} />;
      case 'infrastructure':
        return <InfrastructureFacilitiesPage onNavigate={setCurrentSection} isPublicView={true} />;
      case 'international-interactions':
        return <InternationalInteractionsPage onNavigate={setCurrentSection} isPublicView={true} />;
      case 'centre-excellence':
        return <CentreExcellencePage onNavigate={setCurrentSection} isPublicView={true} />;
      case 'incubations':
        return <IncubationsPage onNavigate={setCurrentSection} isPublicView={true} />;
      case 'industry-connects':
        return <IndustryConnectsPage onNavigate={setCurrentSection} isPublicView={true} />;
      case 'consultancy-projects':
        return <ConsultancyProjectsPage onNavigate={setCurrentSection} isPublicView={true} />;
      default:
        return <PublicHomePage onNavigate={setCurrentSection} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PublicNavBar 
        currentSection={currentSection} 
        onNavigate={setCurrentSection} 
      />
      <main className="flex-1">
        <Suspense fallback={<PublicPageLoading />}>
          {renderContent()}
        </Suspense>
      </main>
      <PublicFooter onLoginClick={onLoginClick} />
    </div>
  );
}

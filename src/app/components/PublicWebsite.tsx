import React, { useState } from 'react';
import { PublicNavBar } from './PublicNavBar';
import { PublicFooter } from './PublicFooter';
import { PublicHomePage } from './PublicHomePage';
import { AchievementsPage } from './AchievementsPage';
import { ResearchInnovationPage } from './ResearchInnovationPage';
import { RankingPage } from './RankingPage';
import { PlacementsInternshipsPage } from './PlacementsInternshipsPage';
import { InfrastructureFacilitiesPage } from './InfrastructureFacilitiesPage';
import { InternationalInteractionsPage } from './InternationalInteractionsPage';
import { CentreExcellencePage } from './CentreExcellencePage';
import { IncubationsPage } from './IncubationsPage';
import { IndustryConnectsPage } from './IndustryConnectsPage';
import { ConsultancyProjectsPage } from './ConsultancyProjectsPage';

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
        {renderContent()}
      </main>
      <PublicFooter onLoginClick={onLoginClick} />
    </div>
  );
}

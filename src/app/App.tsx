import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { PublicWebsite } from './components/PublicWebsite';
import { DashboardPage } from './components/DashboardPage';
import { AchievementsPage } from './components/AchievementsPage';
import { CourseFilesPage } from './components/CourseFilesPage';
import { PlaceholderPage } from './components/PlaceholderPage';
import { StrategicPlanPage } from './components/StrategicPlanPage';
import { DepartmentTrackingPage } from './components/DepartmentTrackingPage';
import { UserRolesPage } from './components/UserRolesPage';
import { UserManagementPage } from './components/UserManagementPage';
import { RankingPage } from './components/RankingPage';
import { ResearchInnovationPage } from './components/ResearchInnovationPage';
import { IncubationsPage } from './components/IncubationsPage';
import { IndustryConnectsPage } from './components/IndustryConnectsPage';
import { ConsultancyProjectsPage } from './components/ConsultancyProjectsPage';
import { InternationalInteractionsPage } from './components/InternationalInteractionsPage';
import { CentreExcellencePage } from './components/CentreExcellencePage';
import { InfrastructureFacilitiesPage } from './components/InfrastructureFacilitiesPage';
import { PlacementsInternshipsPage } from './components/PlacementsInternshipsPage';
import { StudentDetailsPage } from './components/StudentDetailsPage';
import { FacultyDetailsPage } from './components/FacultyDetailsPage';
import { DepartmentDetailsPage } from './components/DepartmentDetailsPage';
import { hasPageAccess } from './config/permissions';

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showLogin, setShowLogin] = useState(false);

  // If not authenticated and not explicitly showing login, show public website
  if (!isAuthenticated || !user) {
    if (showLogin) {
      return <LoginPage onBack={() => setShowLogin(false)} />;
    }
    return <PublicWebsite onLoginClick={() => setShowLogin(true)} />;
  }

  // Check if user has access to current page
  if (!hasPageAccess(user.role, currentPage)) {
    setCurrentPage('dashboard'); // Redirect to dashboard if no access
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={setCurrentPage} />;
      case 'faculty-details':
        return <FacultyDetailsPage onNavigate={setCurrentPage} />;
      case 'student-details':
        return <StudentDetailsPage onNavigate={setCurrentPage} />;
      case 'department-details':
        return <DepartmentDetailsPage onNavigate={setCurrentPage} />;
      case 'achievements':
        return <AchievementsPage onNavigate={setCurrentPage} />;
      case 'course-files':
        return <CourseFilesPage onNavigate={setCurrentPage} />;
      case 'ranking':
      case 'nirf-ranking':
      case 'india-today-ranking':
      case 'the-world-ranking':
      case 'qs-india-ranking':
        return <RankingPage onNavigate={setCurrentPage} />;
      case 'research-innovation':
        return <ResearchInnovationPage onNavigate={setCurrentPage} />;
      case 'publications':
        return <PlaceholderPage 
          title="Publications" 
          description="Manage and track research publications, journal papers, and academic articles."
          onNavigate={setCurrentPage}
          currentPage={currentPage}
        />;
      case 'sponsored-research':
        return <PlaceholderPage 
          title="Sponsored Research" 
          description="Track sponsored research projects, funding bodies, grants, and project milestones."
          onNavigate={setCurrentPage}
          currentPage={currentPage}
        />;
      case 'incubations':
        return <IncubationsPage onNavigate={setCurrentPage} />;
      case 'industry-connects':
        return <IndustryConnectsPage onNavigate={setCurrentPage} />;
      case 'consultancy-projects':
        return <ConsultancyProjectsPage onNavigate={setCurrentPage} />;
      case 'international-interactions':
        return <InternationalInteractionsPage onNavigate={setCurrentPage} />;
      case 'centre-excellence':
        return <CentreExcellencePage onNavigate={setCurrentPage} />;
      case 'infrastructure-facilities':
        return <InfrastructureFacilitiesPage onNavigate={setCurrentPage} />;
      case 'placements-internships':
        return <PlacementsInternshipsPage onNavigate={setCurrentPage} />;
      case 'strategic-plan':
        return <StrategicPlanPage onNavigate={setCurrentPage} />;
      case 'strategic-plan-civil-engineering':
        return <DepartmentTrackingPage onNavigate={setCurrentPage} departmentId="civil-engineering" />;
      case 'strategic-plan-electronics-communication-engineering':
        return <DepartmentTrackingPage onNavigate={setCurrentPage} departmentId="electronics-communication-engineering" />;
      case 'strategic-plan-electrical-electronics-engineering':
        return <DepartmentTrackingPage onNavigate={setCurrentPage} departmentId="electrical-electronics-engineering" />;
      case 'strategic-plan-mechanical-automobile-engineering':
        return <DepartmentTrackingPage onNavigate={setCurrentPage} departmentId="mechanical-automobile-engineering" />;
      case 'strategic-plan-computer-science-engineering':
        return <DepartmentTrackingPage onNavigate={setCurrentPage} departmentId="computer-science-engineering" />;
      case 'strategic-plan-science-humanities-engineering':
        return <DepartmentTrackingPage onNavigate={setCurrentPage} departmentId="science-humanities-engineering" />;
      case 'strategic-plan-school-architecture':
        return <DepartmentTrackingPage onNavigate={setCurrentPage} departmentId="school-architecture" />;
      case 'strategic-plan-ai-data-science':
        return <DepartmentTrackingPage onNavigate={setCurrentPage} departmentId="ai-data-science" />;
      case 'naac-accreditation':
        return <PlaceholderPage 
          title="NAAC Accreditation" 
          description="Manage NAAC accreditation processes, documentation, and assessment criteria."
          onNavigate={setCurrentPage}
          currentPage={currentPage}
        />;
      case 'nba-tracking':
        return <PlaceholderPage 
          title="NBA Tracking" 
          description="Track NBA accreditation progress, requirements, and compliance status."
          onNavigate={setCurrentPage}
          currentPage={currentPage}
        />;
      case 'event-logs':
        return <PlaceholderPage 
          title="Event Logs and Report" 
          description="View system events, activity logs, and generate comprehensive reports."
          onNavigate={setCurrentPage}
          currentPage={currentPage}
        />;
      case 'user-roles':
        return <UserRolesPage onNavigate={setCurrentPage} />;
      case 'user-management':
        return <UserManagementPage onNavigate={setCurrentPage} />;
      default:
        return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderPage()}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
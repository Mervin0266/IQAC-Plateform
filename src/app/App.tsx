import React, { useState, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/LoginPage';
import { PublicWebsite } from './components/PublicWebsite';
import { hasPageAccess } from './config/permissions';

// ── Lazy-loaded page components ──────────────────────────────────
// Code-splitting: each page is a separate chunk loaded on demand.
// This reduces the initial bundle from ~1,655 KB to ~400 KB.
const DashboardPage = React.lazy(() => import('./components/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AchievementsPage = React.lazy(() => import('./components/AchievementsPage').then(m => ({ default: m.AchievementsPage })));
const CourseFilesPage = React.lazy(() => import('./components/CourseFilesPage').then(m => ({ default: m.CourseFilesPage })));
const PlaceholderPage = React.lazy(() => import('./components/PlaceholderPage').then(m => ({ default: m.PlaceholderPage })));
const StrategicPlanPage = React.lazy(() => import('./components/StrategicPlanPage').then(m => ({ default: m.StrategicPlanPage })));
const DepartmentTrackingPage = React.lazy(() => import('./components/DepartmentTrackingPage').then(m => ({ default: m.DepartmentTrackingPage })));
const UserRolesPage = React.lazy(() => import('./components/UserRolesPage').then(m => ({ default: m.UserRolesPage })));
const UserManagementPage = React.lazy(() => import('./components/UserManagementPage').then(m => ({ default: m.UserManagementPage })));
const RankingPage = React.lazy(() => import('./components/RankingPage').then(m => ({ default: m.RankingPage })));
const ResearchPage = React.lazy(() => import('./components/ResearchPage').then(m => ({ default: m.ResearchPage })));
const IncubationsPage = React.lazy(() => import('./components/IncubationsPage').then(m => ({ default: m.IncubationsPage })));
const IndustryConnectsPage = React.lazy(() => import('./components/IndustryConnectsPage').then(m => ({ default: m.IndustryConnectsPage })));
const InternationalInteractionsPage = React.lazy(() => import('./components/InternationalInteractionsPage').then(m => ({ default: m.InternationalInteractionsPage })));
const CentreExcellencePage = React.lazy(() => import('./components/CentreExcellencePage').then(m => ({ default: m.CentreExcellencePage })));
const InfrastructureFacilitiesPage = React.lazy(() => import('./components/InfrastructureFacilitiesPage').then(m => ({ default: m.InfrastructureFacilitiesPage })));
const PlacementsInternshipsPage = React.lazy(() => import('./components/PlacementsInternshipsPage').then(m => ({ default: m.PlacementsInternshipsPage })));
const StudentDetailsPage = React.lazy(() => import('./components/StudentDetailsPage').then(m => ({ default: m.StudentDetailsPage })));
const FacultyDetailsPage = React.lazy(() => import('./components/FacultyDetailsPage').then(m => ({ default: m.FacultyDetailsPage })));
const DepartmentDetailsPage = React.lazy(() => import('./components/DepartmentDetailsPage').then(m => ({ default: m.DepartmentDetailsPage })));
const DynamicParameterMaster = React.lazy(() => import('./components/DynamicParameterMaster').then(m => ({ default: m.DynamicParameterMaster })));
const PageSkeleton = React.lazy(() => import('./components/PageSkeleton').then(m => ({ default: m.PageSkeleton })));

/** Minimal inline fallback for the Suspense boundary (avoids circular lazy deps) */
function SuspenseFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-[#2f4692] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading...</p>
      </div>
    </div>
  );
}

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
      case 'research-metrics':
      case 'publications':
      case 'research-innovation':
      case 'sponsored-research':
      case 'consultancy-projects':
        return <ResearchPage onNavigate={setCurrentPage} currentPage={currentPage} />;
      case 'incubations':
        return <IncubationsPage onNavigate={setCurrentPage} />;
      case 'industry-connects':
        return <IndustryConnectsPage onNavigate={setCurrentPage} />;
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
      case 'nba-tracking':
        return <DynamicParameterMaster onNavigate={setCurrentPage} />;
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
      <Suspense fallback={<SuspenseFallback />}>
        {renderPage()}
      </Suspense>
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
import React, { Suspense } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from 'react-router';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SystemConfigProvider } from './contexts/SystemConfigContext';
import { LoginPage } from './components/LoginPage';
import { PublicLayout } from './components/layouts/PublicLayout';
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { ProtectedRoute } from './components/routing/ProtectedRoute';
import { RoleBasedRoute } from './components/routing/RoleBasedRoute';
import { NotFoundPage } from './components/routing/NotFoundPage';

// ── Lazy-loaded page components ──────────────────────────────────
// Code-splitting: each page is a separate chunk loaded on demand.
const PublicHomePage = React.lazy(() => import('./components/PublicHomePage').then(m => ({ default: m.PublicHomePage })));
const CareerOutcomesPage = React.lazy(() => import('./components/CareerOutcomesPage').then(m => ({ default: m.CareerOutcomesPage })));
const ConsultancyProjectsPage = React.lazy(() => import('./components/ConsultancyProjectsPage').then(m => ({ default: m.ConsultancyProjectsPage })));
const ResearchInnovationPage = React.lazy(() => import('./components/ResearchInnovationPage').then(m => ({ default: m.ResearchInnovationPage })));

const DashboardPage = React.lazy(() => import('./components/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AchievementsPage = React.lazy(() => import('./components/AchievementsPage').then(m => ({ default: m.AchievementsPage })));
const AwardsPage = React.lazy(() => import('./components/AwardsPage').then(m => ({ default: m.AwardsPage })));
const EContentsPage = React.lazy(() => import('./components/EContentsPage').then(m => ({ default: m.EContentsPage })));
const ProfessionalDevelopmentsPage = React.lazy(() => import('./components/ProfessionalDevelopmentsPage').then(m => ({ default: m.ProfessionalDevelopmentsPage })));
const InvitedTalksPage = React.lazy(() => import('./components/InvitedTalksPage').then(m => ({ default: m.InvitedTalksPage })));
const PeriodicalsPage = React.lazy(() => import('./components/PeriodicalsPage').then(m => ({ default: m.PeriodicalsPage })));
const CourseFilesPage = React.lazy(() => import('./components/CourseFilesPage').then(m => ({ default: m.CourseFilesPage })));
const PlaceholderPage = React.lazy(() => import('./components/PlaceholderPage').then(m => ({ default: m.PlaceholderPage })));
const StrategicPlanPage = React.lazy(() => import('./components/StrategicPlanPage').then(m => ({ default: m.StrategicPlanPage })));
const DepartmentTrackingPage = React.lazy(() => import('./components/DepartmentTrackingPage').then(m => ({ default: m.DepartmentTrackingPage })));
const UserRolesPage = React.lazy(() => import('./components/UserRolesPage').then(m => ({ default: m.UserRolesPage })));
const UserManagementPage = React.lazy(() => import('./components/UserManagementPage').then(m => ({ default: m.UserManagementPage })));
const SystemAdminPortal = React.lazy(() => import('./components/SystemAdminPortal').then(m => ({ default: m.SystemAdminPortal })));
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
const DepartmentalActivitiesPage = React.lazy(() => import('./components/DepartmentalActivitiesPage').then(m => ({ default: m.DepartmentalActivitiesPage })));
const DynamicParameterMaster = React.lazy(() => import('./components/DynamicParameterMaster').then(m => ({ default: m.DynamicParameterMaster })));

/** Minimal inline fallback for the Suspense boundary */
function SuspenseFallback() {
  return (
    <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-3 border-[#2855B9] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading...</p>
      </div>
    </div>
  );
}

/** Helper component to provide public navigation helpers to public views */
function PublicHomeRoute() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleNavigate = (section: string) => {
    if (section.startsWith('#')) {
      const destination = document.getElementById(section.slice(1));
      destination?.focus({ preventScroll: true });
      destination?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      });
      return;
    }
    const targetPath = section === 'home' ? '/' : `/${section}`;
    navigate(targetPath);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <PublicHomePage
      onNavigate={handleNavigate}
      onLoginClick={() => navigate('/login')}
      onDashboardClick={() => navigate('/dashboard')}
      isAuthenticated={isAuthenticated}
    />
  );
}

/** Wrapper for public section-detail pages */
function PublicSectionRoute({ component: Component, ...extraProps }: { component: React.ComponentType<any>; [key: string]: any }) {
  const navigate = useNavigate();
  const handleNavigate = (section: string) => {
    if (section.startsWith('#')) {
      navigate('/');
      requestAnimationFrame(() => {
        const destination = document.getElementById(section.slice(1));
        destination?.focus({ preventScroll: true });
        destination?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        });
      });
      return;
    }
    const targetPath = section === 'home' ? '/' : `/${section}`;
    navigate(targetPath);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return <Component onNavigate={handleNavigate} {...extraProps} />;
}

/** Dashboard page dispatcher mapping /dashboard/:section to authorized views */
function DashboardSectionDispatcher() {
  const { section = 'dashboard' } = useParams<{ section: string }>();
  const navigate = useNavigate();

  const handleDashboardNavigate = (page: string) => {
    if (page === 'home' || page === 'public') {
      navigate('/');
      return;
    }
    if (page === 'dashboard') {
      navigate('/dashboard');
      return;
    }
    if (page.startsWith('strategic-plan-')) {
      const deptId = page.replace('strategic-plan-', '');
      navigate(`/dashboard/strategic-plan/${deptId}`);
      return;
    }
    navigate(`/dashboard/${page}`);
  };

  if (section.startsWith('strategic-plan-')) {
    const deptId = section.replace('strategic-plan-', '');
    return (
      <RoleBasedRoute pageId="strategic-plan">
        <DepartmentTrackingPage onNavigate={handleDashboardNavigate} departmentId={deptId} />
      </RoleBasedRoute>
    );
  }

  const renderSection = () => {
    switch (section) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleDashboardNavigate} />;
      case 'faculty-details':
        return <FacultyDetailsPage onNavigate={handleDashboardNavigate} />;
      case 'professional-developments':
        return <ProfessionalDevelopmentsPage onNavigate={handleDashboardNavigate} />;
      case 'invited-talks':
        return <InvitedTalksPage onNavigate={handleDashboardNavigate} />;
      case 'periodicals':
        return <PeriodicalsPage onNavigate={handleDashboardNavigate} />;
      case 'student-details':
        return <StudentDetailsPage onNavigate={handleDashboardNavigate} />;
      case 'department-details':
        return <DepartmentDetailsPage onNavigate={handleDashboardNavigate} />;
      case 'departmental-activities':
        return <DepartmentalActivitiesPage onNavigate={handleDashboardNavigate} />;
      case 'achievements':
        return <AchievementsPage onNavigate={handleDashboardNavigate} />;
      case 'awards':
        return <AwardsPage onNavigate={handleDashboardNavigate} />;
      case 'e-contents':
        return <EContentsPage onNavigate={handleDashboardNavigate} />;
      case 'course-files':
        return <CourseFilesPage onNavigate={handleDashboardNavigate} />;
      case 'ranking':
      case 'nirf-ranking':
      case 'india-today-ranking':
      case 'the-world-ranking':
      case 'qs-india-ranking':
        return <RankingPage onNavigate={handleDashboardNavigate} currentPage={section} />;
      case 'publications':
        return <ResearchPage onNavigate={handleDashboardNavigate} currentPage="publications" />;
      case 'patents':
        return <ResearchPage onNavigate={handleDashboardNavigate} currentPage="research-innovation" />;
      case 'copyrights':
        return <ResearchPage onNavigate={handleDashboardNavigate} currentPage="copyrights" />;
      case 'research-metrics':
      case 'research-innovation':
      case 'sponsored-research':
      case 'external-research':
      case 'internal-research':
      case 'consultancy-projects':
        return <ResearchPage onNavigate={handleDashboardNavigate} currentPage={section} />;
      case 'incubations':
        return <IncubationsPage onNavigate={handleDashboardNavigate} />;
      case 'industry-connects':
        return <IndustryConnectsPage onNavigate={handleDashboardNavigate} />;
      case 'international-interactions':
        return <InternationalInteractionsPage onNavigate={handleDashboardNavigate} />;
      case 'centre-excellence':
        return <CentreExcellencePage onNavigate={handleDashboardNavigate} />;
      case 'infrastructure-facilities':
        return <InfrastructureFacilitiesPage onNavigate={handleDashboardNavigate} />;
      case 'placements':
        return <PlacementsInternshipsPage onNavigate={handleDashboardNavigate} mode="placement" />;
      case 'internships':
        return <PlacementsInternshipsPage onNavigate={handleDashboardNavigate} mode="internship" />;
      case 'placements-internships':
        return <PlacementsInternshipsPage onNavigate={handleDashboardNavigate} mode="all" />;
      case 'strategic-plan':
        return <StrategicPlanPage onNavigate={handleDashboardNavigate} />;
      case 'accreditation':
      case 'naac-accreditation':
      case 'nba-tracking':
        return <DynamicParameterMaster onNavigate={handleDashboardNavigate} currentPage={section} />;
      case 'event-logs':
        return (
          <PlaceholderPage
            title="Event Logs and Report"
            description="View system events, activity logs, and generate comprehensive reports."
            onNavigate={handleDashboardNavigate}
            currentPage={section}
          />
        );
      case 'user-roles':
        return <UserRolesPage onNavigate={handleDashboardNavigate} />;
      case 'user-management':
        return <UserManagementPage onNavigate={handleDashboardNavigate} />;
      case 'system-admin':
        return <SystemAdminPortal onNavigate={handleDashboardNavigate} />;
      default:
        return <NotFoundPage />;
    }
  };

  return <RoleBasedRoute pageId={section}>{renderSection()}</RoleBasedRoute>;
}

/** Strategic Plan tracking with department ID parameter */
function StrategicPlanDepartmentRoute() {
  const { deptId = '' } = useParams<{ deptId: string }>();
  const navigate = useNavigate();

  const handleDashboardNavigate = (page: string) => {
    if (page === 'home' || page === 'public') {
      navigate('/');
      return;
    }
    if (page === 'dashboard') {
      navigate('/dashboard');
      return;
    }
    navigate(`/dashboard/${page}`);
  };

  return (
    <RoleBasedRoute pageId="strategic-plan">
      <DepartmentTrackingPage onNavigate={handleDashboardNavigate} departmentId={deptId} />
    </RoleBasedRoute>
  );
}

/** Dashboard Index Route Component */
function DashboardIndexRoute() {
  const navigate = useNavigate();

  const handleDashboardNavigate = (page: string) => {
    if (page === 'home' || page === 'public') {
      navigate('/');
      return;
    }
    if (page === 'dashboard') {
      navigate('/dashboard');
      return;
    }
    if (page.startsWith('strategic-plan-')) {
      const deptId = page.replace('strategic-plan-', '');
      navigate(`/dashboard/strategic-plan/${deptId}`);
      return;
    }
    navigate(`/dashboard/${page}`);
  };

  return <DashboardPage onNavigate={handleDashboardNavigate} />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <Routes>
        {/* ── 1. PUBLIC WEBSITE ROUTES (Always Accessible, No Session Redirects) ── */}
        <Route element={<PublicLayout />}>
          <Route index element={<PublicHomeRoute />} />
          <Route path="home" element={<PublicHomeRoute />} />
          <Route
            path="achievements"
            element={<PublicSectionRoute component={AchievementsPage} isPublicView={true} hideSidebar />}
          />
          <Route
            path="research-innovation"
            element={<PublicSectionRoute component={ResearchInnovationPage} isPublicView={true} hideSidebar />}
          />
          <Route
            path="rankings"
            element={<PublicSectionRoute component={RankingPage} isPublicView={true} hideSidebar />}
          />
          <Route
            path="ranking"
            element={<PublicSectionRoute component={RankingPage} isPublicView={true} hideSidebar />}
          />
          <Route
            path="placements"
            element={<PublicSectionRoute component={CareerOutcomesPage} page="placements" isPublic={true} />}
          />
          <Route
            path="placements-internships"
            element={<PublicSectionRoute component={CareerOutcomesPage} page="placements" isPublic={true} />}
          />
          <Route
            path="internships"
            element={<PublicSectionRoute component={CareerOutcomesPage} page="internships" isPublic={true} />}
          />
          <Route
            path="alumni"
            element={<PublicSectionRoute component={CareerOutcomesPage} page="alumni" isPublic={true} />}
          />
          <Route
            path="infrastructure"
            element={<PublicSectionRoute component={InfrastructureFacilitiesPage} isPublicView={true} />}
          />
          <Route
            path="international-interactions"
            element={<PublicSectionRoute component={InternationalInteractionsPage} isPublicView={true} />}
          />
          <Route
            path="centre-excellence"
            element={<PublicSectionRoute component={CentreExcellencePage} isPublicView={true} hideSidebar />}
          />
          <Route
            path="incubations"
            element={<PublicSectionRoute component={IncubationsPage} isPublicView={true} />}
          />
          <Route
            path="industry-connects"
            element={<PublicSectionRoute component={IndustryConnectsPage} isPublicView={true} />}
          />
          <Route
            path="consultancy-projects"
            element={<PublicSectionRoute component={ConsultancyProjectsPage} isPublicView={true} hideSidebar />}
          />
        </Route>

        {/* ── 2. AUTHENTICATION ROUTE (/login) ───────────────────────── */}
        <Route path="login" element={<LoginPage />} />

        {/* ── 3. PROTECTED DASHBOARD ROUTES (/dashboard/*) ───────────── */}
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardIndexRoute />} />
          <Route path="strategic-plan/:deptId" element={<StrategicPlanDepartmentRoute />} />
          <Route path=":section" element={<DashboardSectionDispatcher />} />
        </Route>

        {/* ── 4. BACKWARDS-COMPATIBILITY REDIRECTS FOR INTERNAL PAGES ── */}
        <Route path="faculty-details" element={<Navigate to="/dashboard/faculty-details" replace />} />
        <Route path="professional-developments" element={<Navigate to="/dashboard/professional-developments" replace />} />
        <Route path="invited-talks" element={<Navigate to="/dashboard/invited-talks" replace />} />
        <Route path="periodicals" element={<Navigate to="/dashboard/periodicals" replace />} />
        <Route path="student-details" element={<Navigate to="/dashboard/student-details" replace />} />
        <Route path="department-details" element={<Navigate to="/dashboard/department-details" replace />} />
        <Route path="departmental-activities" element={<Navigate to="/dashboard/departmental-activities" replace />} />
        <Route path="awards" element={<Navigate to="/dashboard/awards" replace />} />
        <Route path="e-contents" element={<Navigate to="/dashboard/e-contents" replace />} />
        <Route path="course-files" element={<Navigate to="/dashboard/course-files" replace />} />
        <Route path="publications" element={<Navigate to="/dashboard/publications" replace />} />
        <Route path="patents" element={<Navigate to="/dashboard/patents" replace />} />
        <Route path="copyrights" element={<Navigate to="/dashboard/copyrights" replace />} />
        <Route path="sponsored-research" element={<Navigate to="/dashboard/sponsored-research" replace />} />
        <Route path="strategic-plan" element={<Navigate to="/dashboard/strategic-plan" replace />} />
        <Route path="accreditation" element={<Navigate to="/dashboard/accreditation" replace />} />
        <Route path="user-roles" element={<Navigate to="/dashboard/user-roles" replace />} />
        <Route path="user-management" element={<Navigate to="/dashboard/user-management" replace />} />
        <Route path="system-admin" element={<Navigate to="/dashboard/system-admin" replace />} />

        {/* ── 5. CATCH-ALL 404 ROUTE ─────────────────────────────────── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SystemConfigProvider>
          <AppRoutes />
        </SystemConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
import React, { useEffect, useRef, Suspense } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { PublicNavBar, publicPath } from './PublicNavBar';
import { PublicFooter } from './PublicFooter';
import { PublicReportPage } from './PublicReportView';
import { isReportSection } from '../publicReports';
import { PublicHomePage } from './PublicHomePage';
import '../../styles/public-website.css';
import '../../styles/homepage-motion.css';
import '../../styles/section-experience.css';

// ── Lazy-loaded public pages ─────────────────────────────────────
// These were previously statically imported, preventing code-splitting
// of AchievementsPage, RankingPage, etc. from App.tsx lazy imports.
const AchievementsPage = React.lazy(() => import('./AchievementsPage').then(m => ({ default: m.AchievementsPage })));
const PatentsPage = React.lazy(() => import('./PatentsPage').then(m => ({ default: m.PatentsPage })));
const RankingPage = React.lazy(() => import('./RankingPage').then(m => ({ default: m.RankingPage })));
const CareerOutcomesPage = React.lazy(() => import('./CareerOutcomesPage').then(m => ({ default: m.CareerOutcomesPage })));
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

export function PublicWebsite() {
  const { section } = useParams();
  const currentSection = section === 'placements' ? 'placements-internships' : section ?? 'home';
  const { pathname, hash } = useLocation();
  const previousLocation = useRef(pathname + hash);
  const routerNavigate = useNavigate();
  const navigate = (key: string) => routerNavigate(publicPath(key));
  const onLoginClick = () => routerNavigate('/login');

  useEffect(() => {
    const location = pathname + hash;
    if (!hash && previousLocation.current === location) return;
    previousLocation.current = location;
    const target = hash ? document.getElementById(hash.slice(1)) : document.getElementById('public-content');
    target?.focus({ preventScroll: true });
    if (hash) target?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  const renderContent = () => {
    switch (currentSection) {
      case 'home':
        return <PublicHomePage onLoginClick={onLoginClick} />;
      case 'achievements':
        return <AchievementsPage onNavigate={navigate} isPublicView={true} hideSidebar />;
      case 'research-innovation':
        return <PatentsPage onNavigate={navigate} isPublicView hideSidebar />;
      case 'rankings':
        return <RankingPage onNavigate={navigate} isPublicView={true} hideSidebar />;
      case 'placements-internships':
      case 'internships':
      case 'alumni':
        return <CareerOutcomesPage page={currentSection} onNavigate={navigate} isPublic />;
      case 'infrastructure':
        return <InfrastructureFacilitiesPage onNavigate={navigate} isPublicView={true} />;
      case 'international-interactions':
        return <InternationalInteractionsPage onNavigate={navigate} isPublicView={true} />;
      case 'centre-excellence':
        return <CentreExcellencePage onNavigate={navigate} isPublicView={true} hideSidebar />;
      case 'incubations':
        return <IncubationsPage onNavigate={navigate} isPublicView={true} />;
      case 'industry-connects':
        return <IndustryConnectsPage onNavigate={navigate} isPublicView={true} />;
      case 'consultancy-projects':
        return <ConsultancyProjectsPage onNavigate={navigate} isPublicView={true} hideSidebar />;
      default:
        return <div><h1>Page not found</h1><Link to="/">Return to IQAC</Link></div>;
    }
  };

  return (
    <div className="iq-site min-h-screen bg-gray-50 flex flex-col">
      <PublicNavBar />
      <main id="public-content" tabIndex={-1} className={currentSection === 'home' ? 'flex-1' : 'flex-1 iq-section-view iq-public-section iq-explore-layout'} key={currentSection}>
        <Suspense fallback={<PublicPageLoading />}>
          {isReportSection(currentSection) && currentSection !== 'profile'
            ? <PublicReportPage section={currentSection} />
            : renderContent()}
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  );
}

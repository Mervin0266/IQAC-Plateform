import React, { Suspense } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { PublicNavBar } from '../PublicNavBar';
import { PublicFooter } from '../PublicFooter';
import { useAuth } from '../../contexts/AuthContext';
import '../../../styles/public-website.css';
import '../../../styles/homepage-motion.css';
import '../../../styles/section-experience.css';

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

export function PublicLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  const rawPath = location.pathname.replace(/^\/+/, '').split('/')[0];
  const currentSection =
    rawPath === ''
      ? 'home'
      : rawPath === 'ranking'
      ? 'rankings'
      : rawPath === 'placements'
      ? 'placements-internships'
      : rawPath;

  const handleNavigate = (section: string) => {
    if (section.startsWith('#')) {
      if (location.pathname !== '/') {
        navigate('/');
      }
      requestAnimationFrame(() => {
        const destination = document.getElementById(section.slice(1));
        destination?.focus({ preventScroll: true });
        destination?.scrollIntoView({
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'instant'
            : 'smooth',
        });
      });
      return;
    }

    const targetPath = section === 'home' ? '/' : `/${section}`;
    navigate(targetPath);
    window.scrollTo({ top: 0, behavior: 'instant' });
    requestAnimationFrame(() => {
      document.getElementById('public-content')?.focus();
    });
  };

  /**
   * Enforces fresh login when accessing institutional portal from public homepage/layout.
   * Clears any active local session and requires credentials re-entry.
   */
  const handleInstitutionalAccess = () => {
    if (isAuthenticated) {
      logout(false);
    }
    navigate('/login?fresh=true');
  };

  return (
    <div className="iq-site min-h-screen bg-gray-50 flex flex-col">
      <PublicNavBar
        currentSection={currentSection}
        onNavigate={handleNavigate}
        onLoginClick={handleInstitutionalAccess}
        onDashboardClick={handleInstitutionalAccess}
        isAuthenticated={isAuthenticated}
      />
      <main
        id="public-content"
        tabIndex={-1}
        className={currentSection === 'home' ? 'flex-1' : 'flex-1 iq-public-section'}
        key={location.pathname}
      >
        <Suspense fallback={<PublicPageLoading />}>
          <Outlet context={{ onNavigate: handleNavigate, onLoginClick: handleInstitutionalAccess, onDashboardClick: handleInstitutionalAccess }} />
        </Suspense>
      </main>
      <PublicFooter
        onLoginClick={handleInstitutionalAccess}
        onDashboardClick={handleInstitutionalAccess}
        isAuthenticated={isAuthenticated}
        onNavigate={handleNavigate}
      />
    </div>
  );
}

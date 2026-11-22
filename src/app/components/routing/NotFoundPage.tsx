import React from 'react';
import { useNavigate } from 'react-router';
import { Compass, Home, LayoutDashboard, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import christLogo from '../../../assets/logo.png';

export function NotFoundPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
      {/* Top Header */}
      <header className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={christLogo} alt="CHRIST (Deemed to be University)" className="h-10 object-contain" />
          <div className="h-6 w-px bg-slate-300 hidden sm:block" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#2855B9] hidden sm:block">
            IQAC Platform
          </span>
        </div>
        <button
          onClick={() => navigate('/')}
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Homepage
        </button>
      </header>

      {/* Main 404 Notice */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#2855B9] shadow-sm">
            <Compass className="w-10 h-10 animate-spin" style={{ animationDuration: '12s' }} />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Error 404 • Page Not Found
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Page Not Found
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
              The destination you requested does not exist, has been moved, or requires authenticated institutional access.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#2855B9] hover:bg-[#1E3F8A] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Home className="w-4 h-4" />
              <span>Public Homepage</span>
            </button>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <span>Institutional Login</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        CHRIST (Deemed to be University) • Internal Quality Assurance Cell (IQAC)
      </footer>
    </div>
  );
}

import React from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemConfig } from '../../contexts/SystemConfigContext';
import { hasPageAccess } from '../../config/permissions';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface RoleBasedRouteProps {
  pageId: string;
  children?: React.ReactNode;
  fallbackToDashboard?: boolean;
}

export function RoleBasedRoute({
  pageId,
  children,
  fallbackToDashboard = false
}: RoleBasedRouteProps) {
  const { user } = useAuth();
  const { isSystemAdmin } = useSystemConfig();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const allowed = hasPageAccess(user.role, pageId, isSystemAdmin);

  if (!allowed) {
    if (fallbackToDashboard) {
      return <Navigate to="/dashboard" replace />;
    }

    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-[#F5F7FB]">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              Access Restricted
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-2">
              Unauthorized Module Access
            </h2>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Your active institutional role (<span className="font-semibold uppercase text-slate-800">{user.role}</span>) does not have authorization to view the <strong>{pageId}</strong> module.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#2855B9] hover:bg-[#1E3F8A] text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Institutional Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}

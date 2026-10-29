/**
 * DashboardHeader — Premium dashboard page header.
 *
 * Replaces the bare h1 + "Syncing with database..." text
 * with a greeting, date display, and animated sync indicator.
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getRoleDisplayName } from '../../config/permissions';
import { ClearDatabaseButton } from '../ClearDatabaseButton';

interface DashboardHeaderProps {
  loading: boolean;
  onRefresh?: () => void;
}

export function DashboardHeader({ loading, onRefresh }: DashboardHeaderProps) {
  const { user } = useAuth();

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {greeting},{' '}
          <span className="text-blue-600">
            {user?.username || getRoleDisplayName(user?.role || 'faculty')}
          </span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">{dateStr}</p>
      </div>

      <div className="flex items-center gap-3">
        {user?.role === 'admin' && (
          <ClearDatabaseButton onSuccess={onRefresh} />
        )}
        {loading && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200/80">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            <span className="text-xs text-blue-700 font-medium">Syncing...</span>
          </div>
        )}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs disabled:opacity-50"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}

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
        <h1 className="text-2xl font-semibold text-gray-900">
          {greeting},{' '}
          <span className="bg-gradient-to-r from-[#2f4692] to-[#5a7bd4] bg-clip-text text-transparent">
            {user?.username || getRoleDisplayName(user?.role || 'faculty')}
          </span>
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{dateStr}</p>
      </div>

      <div className="flex items-center gap-3">
        {user?.role === 'admin' && (
          <ClearDatabaseButton onSuccess={onRefresh} />
        )}
        {loading && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs text-blue-600 font-medium">Syncing...</span>
          </div>
        )}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}

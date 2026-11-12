import React, { useEffect, useState } from 'react';
import {
  Users, Shield, Building2, Layers, FileText, Settings,
  Sliders, Database, History, ArrowRight, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';
import { StatCard } from '../design-system';
import { Badge } from '../ui/badge';
import { adminFetch } from './adminApi';

interface AdminOverviewTabProps {
  token: string;
  onSelectTab: (tabKey: string) => void;
}

export function AdminOverviewTab({ token, onSelectTab }: AdminOverviewTabProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/overview', token);
      setData(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load administration overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [token]);

  if (loading && !data) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
        Loading real-time institutional administration overview...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const users = data?.users || { total: 0, active: 0, inactive: 0 };
  const structure = data?.structure || { campuses: 0, schools: 0, departments: 0, programs: 0 };
  const modules = data?.modules || { total: 0, active: 0, disabled: 0 };

  const shortcuts = [
    { key: 'users', title: 'User Management V2.0', desc: 'Accounts, Excel bulk import, multi-org scopes, permission overrides & sessions', icon: Users },
    { key: 'roles', title: 'Roles & Permissions', desc: 'Custom roles, 8-action RBAC matrix, scope levels & lockout safeguards', icon: Shield },
    { key: 'forms', title: 'Form Builder V2.0', desc: 'Configure existing forms, 18 field types, conditional rules & archival', icon: FileText },
    { key: 'structure', title: 'Institutional Structure', desc: 'Campuses, schools, departments & programs with Option A/B preview', icon: Building2 },
    { key: 'configs', title: 'System Configuration', desc: 'Academic years, upload limits, statuses, document categories & branding', icon: Settings },
    { key: 'modules', title: 'Module Management', desc: 'Enable/disable IQAC modules safely with zero data loss', icon: Sliders },
    { key: 'backups', title: 'Data & Configuration', desc: 'Configuration snapshots, version diffs, rollback & safe restore', icon: Database },
    { key: 'audits', title: 'Audit Logs V2.0', desc: 'Immutable log filterable by administrator, action, module & diff', icon: History }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Administrative Telemetry</h2>
          <p className="text-xs text-slate-500">Live platform metrics computed directly from PostgreSQL</p>
        </div>
        <button
          type="button"
          onClick={loadOverview}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Registered Users"
          value={users.total}
          subtitle={`${users.active} Active • ${users.inactive} Inactive`}
          icon={Users}
          className="border-t-2 border-t-blue-600"
          onClick={() => onSelectTab('users')}
        />
        <StatCard
          title="Active Roles"
          value={data?.rolesCount || 0}
          subtitle="RBAC & Custom Roles"
          icon={Shield}
          className="border-t-2 border-t-indigo-600"
          onClick={() => onSelectTab('roles')}
        />
        <StatCard
          title="Institutional Units"
          value={`${structure.campuses} / ${structure.schools} / ${structure.departments}`}
          subtitle={`Campuses / Schools / Depts • ${structure.programs} Programs`}
          icon={Building2}
          className="border-t-2 border-t-teal-600"
          onClick={() => onSelectTab('structure')}
        />
        <StatCard
          title="Active Modules"
          value={`${modules.active} / ${modules.total}`}
          subtitle={modules.disabled > 0 ? `${modules.disabled} Module(s) Disabled` : 'All Modules Operational'}
          icon={Layers}
          className="border-t-2 border-t-emerald-600"
          onClick={() => onSelectTab('modules')}
        />
      </div>

      {/* Quick Navigation Shortcuts */}
      <div>
        <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
          Administration Workspaces
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectTab(item.key)}
                className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:bg-blue-50/20 transition-colors group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                      <Icon className="w-4 h-4" />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <p className="text-xs font-semibold text-slate-900">{item.title}</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Config Versions & Recent Audit Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Recently Modified Configurations</h3>
            <button
              type="button"
              onClick={() => onSelectTab('backups')}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              View Versions
            </button>
          </div>
          {(!data?.recentConfigurations || data.recentConfigurations.length === 0) ? (
            <p className="text-xs text-slate-400 py-6 text-center">No configuration versions recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentConfigurations.map((v: any) => (
                <div key={v.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{v.entityName}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      v{v.versionNumber} • {v.adminIdentity}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0 bg-slate-50">
                    {v.entityType}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Recent Administrative Activities</h3>
            <button
              type="button"
              onClick={() => onSelectTab('audits')}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Full Audit Trail
            </button>
          </div>
          {(!data?.recentActivities || data.recentActivities.length === 0) ? (
            <p className="text-xs text-slate-400 py-6 text-center">No audit events recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentActivities.map((log: any) => (
                <div key={log.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{log.achievementTitle || log.action}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {log.adminIdentity || log.userName} • {new Date(log.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <Badge className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {log.result || 'Success'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


import React, { useState } from 'react';
import {
  LayoutGrid,
  Users,
  Shield,
  FileText,
  Building2,
  Settings,
  Sliders,
  Database,
  History,
  ShieldAlert
} from 'lucide-react';
import { AppShell, PageHeader } from './design-system';
import { useAuth } from '../contexts/AuthContext';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import { AdminOverviewTab } from './admin/AdminOverviewTab';
import { AdminUserManagementTab } from './admin/AdminUserManagementTab';
import { AdminRolesPermissionsTab } from './admin/AdminRolesPermissionsTab';
import { AdminFormBuilderTab } from './admin/AdminFormBuilderTab';
import { AdminStructureTab } from './admin/AdminStructureTab';
import { AdminSystemConfigTab } from './admin/AdminSystemConfigTab';
import { AdminModuleManagementTab } from './admin/AdminModuleManagementTab';
import { AdminConfigBackupTab } from './admin/AdminConfigBackupTab';
import { AdminAuditLogsTab } from './admin/AdminAuditLogsTab';

export type AdminTabKey =
  | 'overview'
  | 'users'
  | 'roles'
  | 'forms'
  | 'structure'
  | 'configs'
  | 'modules'
  | 'backups'
  | 'audits';

interface SystemAdminPortalProps {
  onNavigate: (page: string) => void;
  initialTab?: AdminTabKey;
}

const ADMIN_TABS: Array<{ key: AdminTabKey; label: string; icon: any }> = [
  { key: 'overview', label: 'Overview', icon: LayoutGrid },
  { key: 'users', label: 'User Management', icon: Users },
  { key: 'roles', label: 'Roles & Permissions', icon: Shield },
  { key: 'forms', label: 'Form Builder', icon: FileText },
  { key: 'structure', label: 'Institutional Structure', icon: Building2 },
  { key: 'configs', label: 'System Configuration', icon: Settings },
  { key: 'modules', label: 'Module Management', icon: Sliders },
  { key: 'backups', label: 'Data & Configuration', icon: Database },
  { key: 'audits', label: 'Audit Logs', icon: History }
];

export function SystemAdminPortal({ onNavigate, initialTab = 'overview' }: SystemAdminPortalProps) {
  const { user } = useAuth();
  const { isSystemAdmin, refreshRuntimeConfig } = useSystemConfig();
  const [activeTab, setActiveTab] = useState<AdminTabKey>(initialTab);

  // Defense-in-depth UI restriction (Backend independently enforces on every /api/admin/* request)
  if (!user || !isSystemAdmin) {
    return (
      <AppShell currentPage="system-admin" onNavigate={onNavigate}>
        <div className="bg-white border border-rose-200 rounded-xl p-8 text-center space-y-3 max-w-lg mx-auto mt-10">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Access Restricted — System Administrator Only</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            System Administration V2.0 is restricted exclusively to authenticated System Administrators. Your current role does not hold administrative governance privileges.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell currentPage="system-admin" onNavigate={onNavigate}>
      <PageHeader
        breadcrumbs={[{ label: 'Administration' }, { label: 'System Administration V2.0', active: true }]}
        title="System Administration V2.0"
        badge="System Administrator Exclusive"
        description="Centralized institutional governance for user accounts, RBAC roles, dynamic form fields, hierarchy structures, system configurations, module lifecycles, backups, and immutable audit logs."
      />

      {/* Clean Institutional Tab Navigation Bar */}
      <div className="bg-slate-100 p-1 rounded-xl border border-slate-200/80 overflow-x-auto">
        <nav className="flex flex-wrap items-center gap-1" aria-label="System Administration sections">
          {ADMIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-xs border border-slate-200 font-semibold ring-1 ring-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-medium'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Section Content */}
      {activeTab === 'overview' && (
        <AdminOverviewTab token={user.token} onSelectTab={(k) => setActiveTab(k as AdminTabKey)} />
      )}
      {activeTab === 'users' && (
        <AdminUserManagementTab token={user.token} currentUserId={user.id} onConfigChanged={refreshRuntimeConfig} />
      )}
      {activeTab === 'roles' && (
        <AdminRolesPermissionsTab token={user.token} onConfigChanged={refreshRuntimeConfig} />
      )}
      {activeTab === 'forms' && (
        <AdminFormBuilderTab token={user.token} onConfigChanged={refreshRuntimeConfig} />
      )}
      {activeTab === 'structure' && (
        <AdminStructureTab token={user.token} onConfigChanged={refreshRuntimeConfig} />
      )}
      {activeTab === 'configs' && (
        <AdminSystemConfigTab token={user.token} onConfigChanged={refreshRuntimeConfig} />
      )}
      {activeTab === 'modules' && (
        <AdminModuleManagementTab token={user.token} onConfigChanged={refreshRuntimeConfig} />
      )}
      {activeTab === 'backups' && (
        <AdminConfigBackupTab token={user.token} onConfigChanged={refreshRuntimeConfig} />
      )}
      {activeTab === 'audits' && (
        <AdminAuditLogsTab token={user.token} />
      )}
    </AppShell>
  );
}


import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getRoleDisplayName } from '../config/permissions';
import { Shield, User, Users, Info } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

export function RoleIndicator() {
  const { user } = useAuth();

  if (!user) return null;

  const roleConfig = {
    admin: {
      icon: Shield,
      bg: 'bg-blue-50/70 border-blue-200/60 text-slate-700',
      iconColor: 'text-[#2F4692]',
      badge: 'Full Access',
      description: 'System Administration & Institutional Controls',
    },
    authority: {
      icon: Shield,
      bg: 'bg-indigo-50/70 border-indigo-200/60 text-slate-700',
      iconColor: 'text-indigo-600',
      badge: 'Executive Oversight',
      description: 'University-wide Read-Only Inspection & Analytics',
    },
    hod: {
      icon: Users,
      bg: 'bg-amber-50/70 border-amber-200/60 text-slate-700',
      iconColor: 'text-amber-600',
      badge: 'Department Admin',
      description: `Department Administration & Roster Verification${user.department ? ` • ${user.department}` : ''}`,
    },
    coordinator: {
      icon: Users,
      bg: 'bg-purple-50/70 border-purple-200/60 text-slate-700',
      iconColor: 'text-purple-600',
      badge: 'Criteria Coordinator',
      description: 'Criterion Verification & Data Entry Oversight',
    },
    faculty: {
      icon: User,
      bg: 'bg-emerald-50/70 border-emerald-200/60 text-slate-700',
      iconColor: 'text-emerald-600',
      badge: 'Faculty Member',
      description: 'Self-Service Research, Publications & Curriculum Submissions',
    },
  };

  const config = roleConfig[user.role] || roleConfig.admin;
  const Icon = config.icon;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl border ${config.bg} shadow-2xs mb-5 transition-all text-xs`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-5 h-5 rounded-md bg-white/80 border border-slate-200/60 flex items-center justify-center shrink-0">
          <Icon className={`h-3.5 w-3.5 ${config.iconColor}`} />
        </div>
        <span className="font-bold text-slate-900 truncate">
          {getRoleDisplayName(user.role)}
        </span>
        <span className="text-slate-400 hidden sm:inline">•</span>
        <span className="text-slate-600 font-medium truncate hidden sm:inline">
          {config.description}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white border border-slate-200/80 text-slate-700 shadow-2xs">
          {config.badge}
        </span>
      </div>
    </div>
  );
}

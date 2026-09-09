import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  Shield, User, Users, Check, X, ShieldCheck, Lock, 
  KeyRound, FileText, CheckCircle2, AlertCircle, Eye, 
  Settings, UserCheck, Sparkles, Building2, ChevronRight
} from 'lucide-react';
import { ROLE_PERMISSIONS, getRoleDisplayName } from '../config/permissions';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface UserRolesPageProps {
  onNavigate: (page: string) => void;
  hideSidebar?: boolean;
}

export function UserRolesPage({ onNavigate, hideSidebar = false }: UserRolesPageProps) {
  const roles = [
    {
      role: 'admin',
      title: 'Administrator',
      icon: Shield,
      color: 'bg-blue-600',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      accent: 'border-l-blue-600',
      description: 'Superuser with full institutional system access, database administration, role provisioning, and universal edit/delete rights.',
      userScope: 'System Administrators, Registrar, IQAC Directors'
    },
    {
      role: 'authority',
      title: 'Dean / Higher Authority',
      icon: Building2,
      color: 'bg-indigo-600',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      accent: 'border-l-indigo-600',
      description: 'Institutional leadership with university-wide viewing, strategic audit approval, and executive report export capabilities.',
      userScope: 'Vice Chancellor, Deans of Faculty Schools'
    },
    {
      role: 'hod',
      title: 'Head of Department (HOD)',
      icon: Users,
      color: 'bg-purple-600',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      accent: 'border-l-purple-600',
      description: 'Departmental head with verification rights over department faculty, student data, sponsored projects, and departmental activities.',
      userScope: 'Department HODs, Program Chairs'
    },
    {
      role: 'coordinator',
      title: 'IQAC Coordinator',
      icon: Sparkles,
      color: 'bg-amber-600',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      accent: 'border-l-amber-600',
      description: 'Quality assurance coordinators managing NAAC/NBA metric submissions, AQAR generation, and institutional compliance.',
      userScope: 'Departmental IQAC Coordinators, Criteria Leads'
    },
    {
      role: 'faculty',
      title: 'Faculty / Researcher',
      icon: User,
      color: 'bg-emerald-600',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      accent: 'border-l-emerald-600',
      description: 'Faculty member with profile management, publication entry, research grants recording, and individual milestone tracking.',
      userScope: 'Professors, Associate Professors, Assistant Professors'
    }
  ];

  const featurePermissions = [
    { feature: 'View Dashboard & Analytics', admin: true, authority: true, hod: true, coordinator: true, faculty: true },
    { feature: 'View Academic Directories (Faculty/Students)', admin: true, authority: true, hod: true, coordinator: true, faculty: true },
    { feature: 'Add & Edit Research Publications & Patents', admin: true, authority: true, hod: true, coordinator: true, faculty: true },
    { feature: 'Bulk Upload Records (Excel / CSV)', admin: true, authority: false, hod: true, coordinator: true, faculty: false },
    { feature: 'Verify & Approve Department Submissions', admin: true, authority: true, hod: true, coordinator: true, faculty: false },
    { feature: 'Accreditation Metric Data Entry (NAAC/NBA)', admin: true, authority: false, hod: true, coordinator: true, faculty: true },
    { feature: 'Strategic Plan & Budget Allocation', admin: true, authority: true, hod: true, coordinator: false, faculty: false },
    { feature: 'User Provisioning & Role Management', admin: true, authority: false, hod: false, coordinator: false, faculty: false },
    { feature: 'System Clear Database & Master Resets', admin: true, authority: false, hod: false, coordinator: false, faculty: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {!hideSidebar && <Sidebar currentPage="user-roles" onNavigate={onNavigate} />}

      <main className={hideSidebar ? 'p-4 sm:p-6 lg:p-8 w-full' : 'ml-64 flex-1 min-w-0 p-4 sm:p-6 lg:p-8 transition-all duration-300'}>
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ========================================================================= */}
          {/* 1. MASTER HEADER                                                          */}
          {/* ========================================================================= */}
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
                  Security & Access Control
                </Badge>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-medium">Role-Based Access Control (RBAC) Architecture</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                User Roles & Permissions Matrix
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                Understand user roles, access hierarchy, data modification permissions, and administrative privileges across the IQAC platform.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => onNavigate('user-management')}
              className="h-9 px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm flex items-center gap-2 self-start xl:self-auto"
            >
              <Users className="w-4 h-4" />
              <span>Manage User Accounts</span>
            </Button>
          </div>

          {/* ========================================================================= */}
          {/* 2. 5 KPI CARDS                                                            */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Roles</span>
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <Shield className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">5 Roles</div>
                  <div className="text-[11px] text-blue-700 font-medium mt-1">Tiered Hierarchy</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Protected Modules</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Lock className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">18 Modules</div>
                  <div className="text-[11px] text-indigo-700 font-medium mt-1">Route Guards Active</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Authentication</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-emerald-600 tracking-tight">JWT Bearer</div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">Encrypted Sessions</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bulk Capabilities</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <KeyRound className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">Admin & HOD</div>
                  <div className="text-[11px] text-amber-700 font-medium mt-1">Authorized Uploads</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200/80 shadow-sm bg-white hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Audit Trail</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">Full Log</div>
                  <div className="text-[11px] text-purple-700 font-medium mt-1">Creator Tracking</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ========================================================================= */}
          {/* 3. ROLE CARDS GRID                                                        */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {roles.map((r) => {
              const Icon = r.icon;
              return (
                <Card
                  key={r.role}
                  className="border border-slate-200/80 shadow-sm hover:shadow-md transition-all bg-white rounded-2xl overflow-hidden flex flex-col justify-between"
                >
                  <CardHeader className="pb-3 bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${r.color} text-white flex items-center justify-center shadow-sm`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold text-slate-900 leading-snug">
                          {r.title}
                        </CardTitle>
                        <Badge className={`${r.badgeColor} text-[10px] font-mono mt-0.5`}>
                          Role: {r.role}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-3 flex-1 text-xs">
                    <p className="text-slate-600 leading-relaxed">
                      {r.description}
                    </p>

                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Applicable Users:
                      </span>
                      <p className="text-slate-700 font-medium text-[11px]">
                        {r.userScope}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* 4. PERMISSION MATRIX TABLE                                                */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4 p-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <span>Feature Permission & Action Matrix</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Detailed access privileges across all 5 system roles for data operations and workflows.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 font-semibold text-slate-900">
                    <th className="py-3.5 px-4">Feature / Operation</th>
                    <th className="py-3.5 px-3 text-center">Admin</th>
                    <th className="py-3.5 px-3 text-center">Dean</th>
                    <th className="py-3.5 px-3 text-center">HOD</th>
                    <th className="py-3.5 px-3 text-center">Coordinator</th>
                    <th className="py-3.5 px-3 text-center">Faculty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {featurePermissions.map((fp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {fp.feature}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {fp.admin ? (
                          <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 text-emerald-600">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-50 text-slate-300">
                            <X className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {fp.authority ? (
                          <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 text-emerald-600">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-50 text-slate-300">
                            <X className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {fp.hod ? (
                          <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 text-emerald-600">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-50 text-slate-300">
                            <X className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {fp.coordinator ? (
                          <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 text-emerald-600">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-50 text-slate-300">
                            <X className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {fp.faculty ? (
                          <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 text-emerald-600">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-50 text-slate-300">
                            <X className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Users, Search, UserPlus, Upload, Download, Edit2, Eye, KeyRound,
  Power, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Plus, Trash2, LogOut
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { adminFetch, API_BASE } from './adminApi';

interface AdminUserManagementTabProps {
  token: string;
  currentUserId: string;
  onConfigChanged: () => Promise<void>;
}

const PERM_MODULES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'faculty-details', label: 'Faculty Management' },
  { key: 'student-details', label: 'Student Details' },
  { key: 'publications', label: 'Publications' },
  { key: 'patents', label: 'Patents & IP' },
  { key: 'sponsored-research', label: 'Sponsored Research' },
  { key: 'consultancy-projects', label: 'Consultancy' },
  { key: 'placements-internships', label: 'Placements & Internships' }
];
const PERMS = ['view', 'add', 'edit', 'delete', 'approve', 'export', 'import', 'manage'];

export function AdminUserManagementTab({ token, currentUserId, onConfigChanged }: AdminUserManagementTabProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [structure, setStructure] = useState<any>({ campuses: [], schools: [], departments: [] });
  const [loading, setLoading] = useState(false);

  // Directory filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [campusFilter, setCampusFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');

  // Create/Edit Modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm, setUserForm] = useState<any>({
    name: '', email: '', password: '', role: 'faculty', campus: '', school: '', department: '',
    employeeId: '', phone: '', mustChangePassword: true, organizationalScopes: []
  });

  // Details & Permission Overrides Modal
  const [detailsUser, setDetailsUser] = useState<any>(null);
  const [overridesDraft, setOverridesDraft] = useState<any[]>([]);

  // Password Reset & Deactivation Modals
  const [resetTarget, setResetTarget] = useState<any>(null);
  const [newResetPwd, setNewResetPwd] = useState('');
  const [forceChangePwd, setForceChangePwd] = useState(true);
  const [deactivateTarget, setDeactivateTarget] = useState<any>(null);
  const [deactivateReason, setDeactivateReason] = useState('');

  // Bulk Excel Upload Modal
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<any>(null);
  const [bulkRawRows, setBulkRawRows] = useState<any[]>([]);
  const [bulkResult, setBulkResult] = useState<any>(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDirectory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (campusFilter !== 'all') params.set('campus', campusFilter);
      if (schoolFilter !== 'all') params.set('school', schoolFilter);
      if (deptFilter !== 'all') params.set('department', deptFilter);

      const [usersRes, rolesRes, structRes] = await Promise.all([
        adminFetch(`/api/admin/users?${params.toString()}`, token),
        adminFetch('/api/admin/roles', token),
        adminFetch('/api/admin/structure', token)
      ]);
      setUsers(usersRes.data || []);
      setRoles(rolesRes.data || []);
      setStructure(structRes.data || { campuses: [], schools: [], departments: [] });
    } catch (err: any) {
      setError(err.message || 'Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, [token, roleFilter, statusFilter, campusFilter, schoolFilter, deptFilter]);

  const openCreateModal = () => {
    setEditingUser(null);
    setUserForm({
      name: '', email: '', password: '', role: 'faculty',
      campus: structure.campuses[0]?.name || '',
      school: structure.schools[0]?.name || '',
      department: '',
      employeeId: '', phone: '', mustChangePassword: true,
      organizationalScopes: []
    });
    setError('');
    setUserModalOpen(true);
  };

  const openEditModal = async (u: any) => {
    setError('');
    try {
      const res = await adminFetch(`/api/admin/users/${u.id}`, token);
      const full = res.data;
      setEditingUser(full);
      setUserForm({
        name: full.name,
        email: full.email,
        password: '',
        role: full.role,
        campus: full.campus || '',
        school: full.school || '',
        department: full.department || '',
        employeeId: full.employeeId || '',
        phone: full.phone || '',
        mustChangePassword: Boolean(full.mustChangePassword),
        organizationalScopes: (full.organizationalScopes || []).filter((s: any) => s.id !== 'legacy-primary')
      });
      setUserModalOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to load user record.');
    }
  };

  const addOrgScopeRow = () => {
    setUserForm((prev: any) => ({
      ...prev,
      organizationalScopes: [
        ...(prev.organizationalScopes || []),
        { scopeType: 'department', campusName: '', schoolName: '', departmentName: structure.departments[0]?.name || '' }
      ]
    }));
  };

  const handleSaveUser = async () => {
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      if (editingUser) {
        await adminFetch(`/api/admin/users/${editingUser.id}`, token, {
          method: 'PUT',
          body: JSON.stringify(userForm)
        });
        setMessage(`Updated user account '${userForm.email}'.`);
      } else {
        await adminFetch('/api/admin/users', token, {
          method: 'POST',
          body: JSON.stringify(userForm)
        });
        setMessage(`Created user account '${userForm.email}'.`);
      }
      setUserModalOpen(false);
      await loadDirectory();
      await onConfigChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to save user.');
    } finally {
      setSubmitting(false);
    }
  };

  const openUserDetails = async (u: any) => {
    setError('');
    try {
      const res = await adminFetch(`/api/admin/users/${u.id}`, token);
      setDetailsUser(res.data);
      setOverridesDraft(JSON.parse(JSON.stringify(res.data.overrides || [])));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const setOverrideState = (moduleKey: string, permission: string, effect: 'inherit' | 'grant' | 'restrict') => {
    setOverridesDraft((prev) => {
      const filtered = prev.filter((o) => !(o.moduleKey === moduleKey && o.permission === permission));
      if (effect === 'inherit') return filtered;
      return [...filtered, { moduleKey, permission, effect }];
    });
  };

  const handleSaveOverrides = async () => {
    if (!detailsUser) return;
    setSubmitting(true);
    try {
      await adminFetch(`/api/admin/users/${detailsUser.id}/permissions`, token, {
        method: 'PUT',
        body: JSON.stringify({ overrides: overridesDraft, reason: 'Updated individual permission overrides' })
      });
      setMessage(`Permission overrides updated for ${detailsUser.email}.`);
      await openUserDetails(detailsUser);
      await loadDirectory();
      await onConfigChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateConfirm = async () => {
    if (!deactivateTarget) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await adminFetch(`/api/admin/users/${deactivateTarget.id}/deactivate`, token, {
        method: 'POST',
        body: JSON.stringify({ reason: deactivateReason || 'Deactivated by System Administrator' })
      });
      setDeactivateTarget(null);
      setDeactivateReason('');
      setMessage(res.message);
      await loadDirectory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateUser = async (u: any) => {
    try {
      const res = await adminFetch(`/api/admin/users/${u.id}/activate`, token, { method: 'POST' });
      setMessage(res.message);
      await loadDirectory();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRevokeSessions = async (u: any) => {
    try {
      const res = await adminFetch(`/api/admin/users/${u.id}/revoke-sessions`, token, { method: 'POST' });
      setMessage(res.message);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await adminFetch(`/api/admin/users/${resetTarget.id}/reset-password`, token, {
        method: 'POST',
        body: JSON.stringify({ newPassword: newResetPwd.trim() || undefined, forceChangeOnNextLogin: forceChangePwd })
      });
      setResetTarget(null);
      setNewResetPwd('');
      setMessage(res.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const res = await fetch(`${API_BASE}/api/admin/users/bulk-template`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'IQAC_Bulk_Users_Template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setBulkResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      setBulkRawRows(rows);

      const res = await adminFetch('/api/admin/users/bulk-preview', token, {
        method: 'POST',
        body: JSON.stringify({ rows })
      });
      setBulkPreview(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to parse or validate Excel upload.');
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmBulkImport = async () => {
    setSubmitting(true);
    try {
      const res = await adminFetch('/api/admin/users/bulk-import', token, {
        method: 'POST',
        body: JSON.stringify({ rows: bulkRawRows })
      });
      setBulkResult(res.data);
      setBulkPreview(null);
      await loadDirectory();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">{error}</div>}
      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Header & Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">User Directory & Access Governance</h3>
              <p className="text-[11px] text-slate-500">
                Manage accounts, Excel bulk provisioning, multi-organizational scopes, permission overrides, and active sessions.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { setBulkOpen(true); setBulkPreview(null); setBulkResult(null); }} className="h-8 text-xs">
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Bulk Excel Import
            </Button>
            <Button size="sm" onClick={openCreateModal} className="h-8 text-xs bg-[#2855B9] hover:bg-[#1e4296]">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Add User
            </Button>
          </div>
        </div>

        {/* 6 Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
          <div className="relative lg:col-span-2 flex gap-1">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadDirectory()}
                placeholder="Search name, email, Employee ID..."
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Button size="sm" variant="outline" onClick={loadDirectory} className="h-8 px-2.5 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs">
            <option value="all">All Roles</option>
            {roles.map((r) => <option key={r.id} value={r.code}>{r.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs">
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
          <select value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)} className="h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs">
            <option value="all">All Campuses</option>
            {(structure.campuses || []).map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="h-8 rounded border border-slate-200 bg-slate-50 px-2 text-xs">
            <option value="all">All Departments</option>
            {(structure.departments || []).map((d: any) => <option key={d.id} value={d.name}>{d.shortName || d.name}</option>)}
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">User / Identity</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Organizational Scope</th>
                <th className="py-2.5 px-3">Account Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">No users match the selected filters.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-900">{u.name}</p>
                      <p className="text-[11px] text-slate-500">{u.email} {u.employeeId ? `• ${u.employeeId}` : ''}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                          {u.roleName || u.role}
                        </Badge>
                        {u.overridesCount > 0 && (
                          <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700 border-violet-200">
                            +{u.overridesCount} override(s)
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <p>{u.department || 'University-wide'}</p>
                      {u.scopesCount > 0 && (
                        <span className="text-[10px] text-slate-400">{u.scopesCount} assigned scope(s)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          u.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => openUserDetails(u)} className="h-7 px-2 text-xs text-slate-700" title="View Details & Permission Overrides">
                        <Eye className="w-3.5 h-3.5 mr-1" /> Access
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditModal(u)} className="h-7 px-2 text-xs text-blue-600" title="Edit User & Scopes">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setResetTarget(u); setNewResetPwd(''); setForceChangePwd(true); }} className="h-7 px-2 text-xs text-amber-700" title="Reset Password">
                        <KeyRound className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRevokeSessions(u)} className="h-7 px-2 text-xs text-slate-600" title="Revoke Active Sessions">
                        <LogOut className="w-3.5 h-3.5" />
                      </Button>
                      {u.id !== currentUserId && (
                        u.isActive ? (
                          <Button size="sm" variant="ghost" onClick={() => { setDeactivateTarget(u); setDeactivateReason(''); }} className="h-7 px-2 text-xs text-rose-600" title="Deactivate Account">
                            <Power className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => handleActivateUser(u)} className="h-7 px-2 text-xs text-emerald-600" title="Activate Account">
                            <Power className="w-3.5 h-3.5" />
                          </Button>
                        )
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit User & Multi-Org Scope Modal */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">{editingUser ? `Edit User: ${editingUser.email}` : 'Create New User Account'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs max-h-[72vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium mb-1">Full Name *</label>
                <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="h-8 text-xs" />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1">Institutional Email *</label>
                <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="h-8 text-xs" />
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-[11px] font-medium mb-1">Initial Password (blank = auto-generated secure temp)</label>
                  <Input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} placeholder="Min 10 chars mixed or blank" className="h-8 text-xs" />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-medium mb-1">Assigned Role *</label>
                <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="w-full h-8 rounded border border-slate-200 px-2 text-xs">
                  {roles.filter((r) => r.isActive).map((r) => (
                    <option key={r.id} value={r.code}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1">Employee ID</label>
                <Input value={userForm.employeeId} onChange={(e) => setUserForm({ ...userForm, employeeId: e.target.value })} className="h-8 text-xs" />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1">Primary Department</label>
                <select value={userForm.department} onChange={(e) => setUserForm({ ...userForm, department: e.target.value })} className="w-full h-8 rounded border border-slate-200 px-2 text-xs">
                  <option value="">University-wide / Unassigned</option>
                  {(structure.departments || []).map((d: any) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
            </div>

            {/* Multiple Organizational Scopes Section */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">Multiple Organizational Access Scopes</p>
                  <p className="text-[10px] text-slate-500">Assign multiple Campuses, Schools, or Departments enforced by backend APIs</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addOrgScopeRow} className="h-7 text-[11px]">
                  <Plus className="w-3 h-3 mr-1" /> Add Scope
                </Button>
              </div>

              {(userForm.organizationalScopes || []).map((sc: any, idx: number) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <select
                    value={sc.scopeType}
                    onChange={(e) => {
                      const next = [...userForm.organizationalScopes];
                      next[idx] = { ...sc, scopeType: e.target.value };
                      setUserForm({ ...userForm, organizationalScopes: next });
                    }}
                    className="col-span-3 h-7 rounded border border-slate-200 bg-white px-1.5 text-[11px]"
                  >
                    <option value="department">Department</option>
                    <option value="school">School</option>
                    <option value="campus">Campus</option>
                    <option value="university">University-wide</option>
                  </select>
                  <div className="col-span-8">
                    {sc.scopeType === 'department' && (
                      <select
                        value={sc.departmentName || ''}
                        onChange={(e) => {
                          const d = structure.departments?.find((x: any) => x.name === e.target.value);
                          const next = [...userForm.organizationalScopes];
                          next[idx] = { ...sc, departmentId: d?.id || null, departmentName: e.target.value };
                          setUserForm({ ...userForm, organizationalScopes: next });
                        }}
                        className="w-full h-7 rounded border border-slate-200 bg-white px-2 text-[11px]"
                      >
                        <option value="">Select department...</option>
                        {(structure.departments || []).map((d: any) => <option key={d.id} value={d.name}>{d.name}</option>)}
                      </select>
                    )}
                    {sc.scopeType === 'school' && (
                      <select
                        value={sc.schoolName || ''}
                        onChange={(e) => {
                          const s = structure.schools?.find((x: any) => x.name === e.target.value);
                          const next = [...userForm.organizationalScopes];
                          next[idx] = { ...sc, schoolId: s?.id || null, schoolName: e.target.value };
                          setUserForm({ ...userForm, organizationalScopes: next });
                        }}
                        className="w-full h-7 rounded border border-slate-200 bg-white px-2 text-[11px]"
                      >
                        <option value="">Select school...</option>
                        {(structure.schools || []).map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    )}
                    {sc.scopeType === 'campus' && (
                      <select
                        value={sc.campusName || ''}
                        onChange={(e) => {
                          const c = structure.campuses?.find((x: any) => x.name === e.target.value);
                          const next = [...userForm.organizationalScopes];
                          next[idx] = { ...sc, campusId: c?.id || null, campusName: e.target.value };
                          setUserForm({ ...userForm, organizationalScopes: next });
                        }}
                        className="w-full h-7 rounded border border-slate-200 bg-white px-2 text-[11px]"
                      >
                        <option value="">Select campus...</option>
                        {(structure.campuses || []).map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    )}
                    {sc.scopeType === 'university' && (
                      <span className="text-[11px] text-slate-600 px-2">Full University-wide Oversight</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setUserForm({
                        ...userForm,
                        organizationalScopes: userForm.organizationalScopes.filter((_: any, i: number) => i !== idx)
                      });
                    }}
                    className="col-span-1 h-7 p-0 text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setUserModalOpen(false)} className="text-xs">Cancel</Button>
            <Button size="sm" disabled={submitting} onClick={handleSaveUser} className="text-xs bg-[#2855B9]">
              {submitting ? 'Saving...' : 'Save User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Details & Individual Permission Overrides Modal */}
      <Dialog open={!!detailsUser} onOpenChange={() => setDetailsUser(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>User Effective Access & Overrides: {detailsUser?.name}</span>
            </DialogTitle>
          </DialogHeader>
          {detailsUser && (
            <div className="space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div><span className="text-slate-500">Email:</span><p className="font-medium truncate">{detailsUser.email}</p></div>
                <div><span className="text-slate-500">Role:</span><p className="font-medium">{detailsUser.roleRecord?.name || detailsUser.role}</p></div>
                <div><span className="text-slate-500">Status:</span><p className="font-medium">{detailsUser.isActive ? 'Active' : 'Deactivated'}</p></div>
                <div><span className="text-slate-500">Last Login:</span><p className="font-medium">{detailsUser.lastLogin ? new Date(detailsUser.lastLogin).toLocaleDateString('en-IN') : 'Never'}</p></div>
              </div>

              {!detailsUser.isActive && detailsUser.deactivatedAt && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
                  Deactivated on {new Date(detailsUser.deactivatedAt).toLocaleString('en-IN')} &bull; Reason: {detailsUser.deactivationReason || 'N/A'}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-slate-800">Individual Permission Overrides (Role Inherited vs Granted vs Restricted)</p>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">I = Inherited</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">G = Granted Override</span>
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">R = Restricted Override</span>
                  </div>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2.5 text-left">Module</th>
                        {PERMS.map((p) => <th key={p} className="py-2 px-1.5 text-center">{p}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {PERM_MODULES.map((m) => (
                        <tr key={m.key}>
                          <td className="py-1.5 px-2.5 font-medium text-slate-800">{m.label}</td>
                          {PERMS.map((p) => {
                            const existingOv = overridesDraft.find((o) => o.moduleKey === m.key && o.permission === p);
                            const inherited = Boolean(detailsUser.roleRecord?.permissions?.[m.key]?.[p]);
                            const val = existingOv ? existingOv.effect : 'inherit';
                            return (
                              <td key={p} className="py-1.5 px-1 text-center">
                                <select
                                  value={val}
                                  disabled={detailsUser.isSystemAdmin}
                                  onChange={(e) => setOverrideState(m.key, p, e.target.value as any)}
                                  className={`h-6 rounded border px-1 text-[10px] font-semibold ${
                                    val === 'grant'
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                      : val === 'restrict'
                                      ? 'bg-rose-50 border-rose-300 text-rose-800'
                                      : inherited
                                      ? 'bg-blue-50/70 border-blue-200 text-blue-800'
                                      : 'bg-slate-50 border-slate-200 text-slate-400'
                                  }`}
                                >
                                  <option value="inherit">{inherited ? 'I (Yes)' : 'I (No)'}</option>
                                  <option value="grant">G (Grant)</option>
                                  <option value="restrict">R (Restrict)</option>
                                </select>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDetailsUser(null)} className="text-xs">Close</Button>
            {!detailsUser?.isSystemAdmin && (
              <Button size="sm" disabled={submitting} onClick={handleSaveOverrides} className="text-xs bg-[#2855B9]">
                Save Permission Overrides
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Account Modal */}
      <Dialog open={!!deactivateTarget} onOpenChange={() => setDeactivateTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Deactivate User: {deactivateTarget?.name}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <p className="text-slate-600">
              Deactivating immediately blocks login and revokes all active JWT sessions while preserving all submitted IQAC records, approvals, documents, and audit history.
            </p>
            <div>
              <label className="block text-[11px] font-medium mb-1">Reason for Deactivation</label>
              <Input value={deactivateReason} onChange={(e) => setDeactivateReason(e.target.value)} placeholder="e.g., Relieved / Transferred" className="h-8 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeactivateTarget(null)} className="text-xs">Cancel</Button>
            <Button size="sm" disabled={submitting} onClick={handleDeactivateConfirm} className="text-xs bg-rose-600 hover:bg-rose-700 text-white">
              Confirm Deactivate & Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Modal */}
      <Dialog open={!!resetTarget} onOpenChange={() => setResetTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Reset Credentials: {resetTarget?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-medium mb-1">New Temporary Password (leave blank to force reset on next login only)</label>
              <Input type="password" value={newResetPwd} onChange={(e) => setNewResetPwd(e.target.value)} placeholder="Min 10 chars mixed" className="h-8 text-xs" />
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={forceChangePwd} onChange={(e) => setForceChangePwd(e.target.checked)} />
              <span>Require password change on next login &amp; revoke active sessions</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setResetTarget(null)} className="text-xs">Cancel</Button>
            <Button size="sm" disabled={submitting} onClick={handleResetPassword} className="text-xs bg-[#2855B9]">Apply Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk User Excel Upload Modal */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Bulk User Provisioning (Excel)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs max-h-[70vh] overflow-y-auto">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-800">Step 1: Download & Populate Standard Template</p>
                <p className="text-[11px] text-slate-500">Existing accounts are strictly protected and never silently overwritten.</p>
              </div>
              <Button size="sm" variant="outline" onClick={handleDownloadTemplate} className="h-8 text-xs shrink-0">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download .xlsx Template
              </Button>
            </div>

            <div className="p-3 border border-dashed border-slate-300 rounded-lg text-center">
              <label className="inline-flex items-center gap-2 cursor-pointer text-blue-700 font-semibold">
                <Upload className="w-4 h-4" />
                <span>Select Populated Excel (.xlsx / .csv) File to Preview</span>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleBulkFileSelected} className="hidden" />
              </label>
            </div>

            {bulkPreview && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <span>Total: {bulkPreview.totalRows}</span>
                  <span className="text-emerald-700">Valid: {bulkPreview.validCount}</span>
                  <span className="text-rose-700">Invalid / Duplicates: {bulkPreview.invalidCount}</span>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-60">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="py-1.5 px-2 text-left">Row</th>
                        <th className="py-1.5 px-2 text-left">Email</th>
                        <th className="py-1.5 px-2 text-left">Role</th>
                        <th className="py-1.5 px-2 text-left">Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {bulkPreview.rows.map((r: any) => (
                        <tr key={r.rowNumber}>
                          <td className="py-1.5 px-2">#{r.rowNumber}</td>
                          <td className="py-1.5 px-2">{r.normalized.email}</td>
                          <td className="py-1.5 px-2">{r.normalized.role}</td>
                          <td className="py-1.5 px-2">
                            {r.valid ? (
                              <span className="text-emerald-700 font-medium">Ready</span>
                            ) : (
                              <span className="text-rose-700">{r.errors.join('; ')}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {bulkResult && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
                <p className="font-semibold text-emerald-900">
                  Import Summary: {bulkResult.importedCount} created, {bulkResult.skippedCount} skipped.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(false)} className="text-xs">Close</Button>
            {bulkPreview && bulkPreview.validCount > 0 && (
              <Button size="sm" disabled={submitting} onClick={handleConfirmBulkImport} className="text-xs bg-[#2855B9]">
                {submitting ? 'Importing...' : `Import ${bulkPreview.validCount} Valid User(s)`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


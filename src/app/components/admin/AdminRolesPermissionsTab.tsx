import React, { useEffect, useState } from 'react';
import { Shield, Plus, Edit2, Power, Users, Lock, CheckCircle2, AlertTriangle, Save } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { adminFetch } from './adminApi';

const PERM_COLS = ['view', 'add', 'edit', 'delete', 'approve', 'export', 'import', 'manage'];
const MODULES = [
  { key: 'dashboard', label: 'Dashboard V2.0' },
  { key: 'faculty-details', label: 'Faculty Management' },
  { key: 'student-details', label: 'Student Details' },
  { key: 'department-details', label: 'Department Details' },
  { key: 'departmental-activities', label: 'Dept Activities' },
  { key: 'publications', label: 'Publications & Citations' },
  { key: 'patents', label: 'Patents & IP' },
  { key: 'sponsored-research', label: 'Sponsored Research' },
  { key: 'consultancy-projects', label: 'Consultancy' },
  { key: 'placements-internships', label: 'Placements & Internships' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'naac-accreditation', label: 'NAAC Accreditation' },
  { key: 'nba-tracking', label: 'NBA Tracking' },
  { key: 'ranking', label: 'Rankings' },
  { key: 'strategic-plan', label: 'Strategic Plan' }
];

interface AdminRolesPermissionsTabProps {
  token: string;
  onConfigChanged: () => Promise<void>;
}

export function AdminRolesPermissionsTab({ token, onConfigChanged }: AdminRolesPermissionsTabProps) {
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({ name: '', description: '', defaultScope: 'department' });

  const [editingPerms, setEditingPerms] = useState<Record<string, Record<string, boolean>>>({});
  const [editName, setEditName] = useState('');
  const [editScope, setEditScope] = useState('department');
  const [editDesc, setEditDesc] = useState('');

  const [deactivateTarget, setDeactivateTarget] = useState<any>(null);
  const [reassignRoleCode, setReassignRoleCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRoles = async () => {
    try {
      const res = await adminFetch('/api/admin/roles', token);
      const list = res.data || [];
      setRoles(list);
      if (list.length > 0 && !selectedRole) {
        selectRoleForEdit(list[0]);
      } else if (selectedRole) {
        const refreshed = list.find((r: any) => r.id === selectedRole.id);
        if (refreshed) selectRoleForEdit(refreshed);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load roles.');
    }
  };

  useEffect(() => {
    loadRoles();
  }, [token]);

  const selectRoleForEdit = (role: any) => {
    setSelectedRole(role);
    setEditName(role.name);
    setEditScope(role.defaultScope || 'department');
    setEditDesc(role.description || '');
    setEditingPerms(JSON.parse(JSON.stringify(role.permissions || {})));
    setError('');
    setMessage('');
  };

  const togglePerm = (modKey: string, perm: string) => {
    if (selectedRole?.isSystemAdmin) return;
    setEditingPerms((prev) => ({
      ...prev,
      [modKey]: {
        ...(prev[modKey] || {}),
        [perm]: !prev[modKey]?.[perm]
      }
    }));
  };

  const handleSaveRole = async () => {
    if (!selectedRole) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await adminFetch(`/api/admin/roles/${selectedRole.id}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName,
          description: editDesc,
          defaultScope: editScope,
          permissions: editingPerms
        })
      });
      setMessage(`Role '${editName}' permissions saved and propagated.`);
      await loadRoles();
      await onConfigChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to save role.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    setError('');
    try {
      const res = await adminFetch('/api/admin/roles', token, {
        method: 'POST',
        body: JSON.stringify(newRoleForm)
      });
      setIsCreateOpen(false);
      setNewRoleForm({ name: '', description: '', defaultScope: 'department' });
      setMessage(`Custom role '${res.data.name}' created.`);
      await loadRoles();
      await onConfigChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to create role.');
    }
  };

  const handleDeactivateRole = async () => {
    if (!deactivateTarget) return;
    setError('');
    try {
      await adminFetch(`/api/admin/roles/${deactivateTarget.id}/deactivate`, token, {
        method: 'POST',
        body: JSON.stringify({
          reassignToRoleCode: reassignRoleCode || undefined,
          reason: 'Deactivated via System Administration'
        })
      });
      setDeactivateTarget(null);
      setReassignRoleCode('');
      setMessage('Role deactivated safely.');
      await loadRoles();
      await onConfigChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate role.');
    }
  };

  const handleActivateRole = async (roleId: string) => {
    try {
      await adminFetch(`/api/admin/roles/${roleId}/activate`, token, { method: 'POST' });
      setMessage('Role activated.');
      await loadRoles();
      await onConfigChanged();
    } catch (err: any) {
      setError(err.message);
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Role Selector */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 h-fit">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-semibold text-slate-900">Platform Roles</h3>
            </div>
            <Button size="sm" onClick={() => setIsCreateOpen(true)} className="h-7 px-2.5 text-[11px] bg-[#2855B9]">
              <Plus className="w-3 h-3 mr-1" />
              New Role
            </Button>
          </div>

          <div className="space-y-1.5">
            {roles.map((r) => {
              const active = selectedRole?.id === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => selectRoleForEdit(r)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${
                    active ? 'bg-blue-50 border-blue-200 text-blue-950' : 'bg-white border-slate-200/70 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate">{r.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {r.isSystemAdmin && (
                        <Badge className="text-[9px] bg-slate-900 text-white px-1.5 py-0">SYS ADMIN</Badge>
                      )}
                      {!r.isActive && (
                        <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-800">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                    <span>Scope: {r.defaultScope}</span>
                    <span>{r.userCount || 0} user(s)</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Role Editor & Permission Matrix */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          {selectedRole ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{selectedRole.name}</h3>
                    {selectedRole.isSystemAdmin && (
                      <Badge className="text-[10px] bg-blue-100 text-blue-800 border-blue-200">
                        <Lock className="w-3 h-3 mr-1" />
                        Protected System Admin Role
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Code: <span className="font-mono">{selectedRole.code}</span> &bull; {selectedRole.userCount || 0} assigned user(s)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!selectedRole.isSystemAdmin && (
                    selectedRole.isActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDeactivateTarget(selectedRole);
                          setReassignRoleCode('');
                        }}
                        className="h-8 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                      >
                        <Power className="w-3.5 h-3.5 mr-1" />
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleActivateRole(selectedRole.id)}
                        className="h-8 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      >
                        Activate Role
                      </Button>
                    )
                  )}
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={handleSaveRole}
                    className="h-8 text-xs bg-[#2855B9] hover:bg-[#1e4296]"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {saving ? 'Saving...' : 'Save Permissions'}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Role Display Name</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={selectedRole.isSystemAdmin}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Default Data-Access Scope</label>
                  <select
                    value={editScope}
                    disabled={selectedRole.isSystemAdmin}
                    onChange={(e) => setEditScope(e.target.value)}
                    className="w-full h-8 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs"
                  >
                    <option value="university">University-wide</option>
                    <option value="campus">Campus-specific</option>
                    <option value="school">School-specific</option>
                    <option value="department">Department-specific</option>
                    <option value="own">Own Records Only</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Role Description</label>
                  <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>

              {/* 8-Action RBAC Matrix */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">IQAC Module</th>
                        {PERM_COLS.map((p) => (
                          <th key={p} className="py-2 px-2 text-center">{p}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {MODULES.map((m) => (
                        <tr key={m.key} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-medium text-slate-800">{m.label}</td>
                          {PERM_COLS.map((p) => (
                            <td key={p} className="py-2 px-2 text-center">
                              <input
                                type="checkbox"
                                checked={selectedRole.isSystemAdmin ? true : Boolean(editingPerms[m.key]?.[p])}
                                disabled={selectedRole.isSystemAdmin}
                                onChange={() => togglePerm(m.key, p)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Create Custom Role Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">Create Custom Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Role Name *</label>
              <Input
                value={newRoleForm.name}
                onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                placeholder="e.g., Research Reviewer"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Default Scope</label>
              <select
                value={newRoleForm.defaultScope}
                onChange={(e) => setNewRoleForm({ ...newRoleForm, defaultScope: e.target.value })}
                className="w-full h-8 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs"
              >
                <option value="department">Department-specific</option>
                <option value="school">School-specific</option>
                <option value="campus">Campus-specific</option>
                <option value="university">University-wide</option>
                <option value="own">Own Records</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">Description</label>
              <Input
                value={newRoleForm.description}
                onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                placeholder="Describe responsibilities..."
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)} className="text-xs">Cancel</Button>
            <Button size="sm" onClick={handleCreateRole} className="text-xs bg-[#2855B9]">Create Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Role & Reassignment Modal */}
      <Dialog open={!!deactivateTarget} onOpenChange={() => setDeactivateTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Deactivate Role: {deactivateTarget?.name}</span>
            </DialogTitle>
          </DialogHeader>
          {deactivateTarget && (
            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Deactivating preserves historical audit logs and prevents new assignments to this role.
              </p>
              {deactivateTarget.assignedUsers?.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                  <p className="font-semibold text-amber-900">
                    {deactivateTarget.assignedUsers.length} user(s) must be reassigned:
                  </p>
                  <ul className="list-disc pl-4 text-[11px] text-amber-800 max-h-24 overflow-y-auto">
                    {deactivateTarget.assignedUsers.map((u: any) => (
                      <li key={u.id}>{u.name} ({u.email})</li>
                    ))}
                  </ul>
                  <div>
                    <label className="block text-[11px] font-medium text-amber-900 mb-1">Reassign Affected Users To *</label>
                    <select
                      value={reassignRoleCode}
                      onChange={(e) => setReassignRoleCode(e.target.value)}
                      className="w-full h-8 rounded border border-amber-300 bg-white px-2 text-xs"
                    >
                      <option value="">Select target active role...</option>
                      {roles
                        .filter((r) => r.id !== deactivateTarget.id && r.isActive && !r.isSystemAdmin)
                        .map((r) => (
                          <option key={r.id} value={r.code}>{r.name}</option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeactivateTarget(null)} className="text-xs">Cancel</Button>
            <Button
              size="sm"
              disabled={deactivateTarget?.assignedUsers?.length > 0 && !reassignRoleCode}
              onClick={handleDeactivateRole}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
            >
              Confirm Deactivation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


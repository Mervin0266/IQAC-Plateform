import React, { useEffect, useState } from 'react';
import { Building2, Plus, Edit2, Power, GitMerge, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { adminFetch } from './adminApi';

interface AdminStructureTabProps {
  token: string;
  onConfigChanged: () => Promise<void>;
}

export function AdminStructureTab({ token, onConfigChanged }: AdminStructureTabProps) {
  const [data, setData] = useState<any>({ campuses: [], schools: [], departments: [], programLevels: [], courses: [], lineages: [] });
  const [activeEntityTab, setActiveEntityTab] = useState<'campuses' | 'schools' | 'departments' | 'courses'>('departments');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<any>({ entityType: 'department', name: '', code: '', shortName: '', campusId: '', schoolId: '', departmentId: '', programLevelId: '', duration: '' });

  const [editTarget, setEditTarget] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [impactPreview, setImpactPreview] = useState<any>(null);
  const [selectedMode, setSelectedMode] = useState<'A' | 'B' | ''>('');
  const [reason, setReason] = useState('');

  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeForm, setMergeForm] = useState<{ sourceDeptId: string; targetDeptId: string; mode: 'A' | 'B' | '' }>({ sourceDeptId: '', targetDeptId: '', mode: '' });
  const [mergePreview, setMergePreview] = useState<any>(null);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadStructure = async () => {
    try {
      const res = await adminFetch('/api/admin/structure', token);
      setData(res.data || {});
    } catch (err: any) {
      setError(err.message || 'Failed to load structure.');
    }
  };

  useEffect(() => {
    loadStructure();
  }, [token]);

  const handleCreate = async () => {
    setSubmitting(true);
    setError('');
    try {
      await adminFetch(`/api/admin/structure/${createForm.entityType}`, token, {
        method: 'POST',
        body: JSON.stringify(createForm)
      });
      setCreateOpen(false);
      setMessage(`Created ${createForm.entityType} '${createForm.name}'.`);
      await loadStructure();
      await onConfigChanged();
    } catch (err: any) {
      setError(err.message || 'Create failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (entityType: string, item: any) => {
    setEditTarget({ entityType, item });
    setEditForm({
      name: item.name,
      code: item.code,
      shortName: item.shortName || '',
      schoolId: item.schoolId || '',
      campusId: item.campusId || '',
      duration: item.duration || ''
    });
    setImpactPreview(null);
    setSelectedMode('');
    setReason('');
    setError('');
  };

  const handlePreviewEdit = async () => {
    if (!editTarget) return;
    setError('');
    const isRenaming = editForm.name?.trim() !== editTarget.item.name;
    if (!isRenaming || editTarget.entityType === 'course') {
      await applyEdit();
      return;
    }

    try {
      const res = await adminFetch('/api/admin/structure/preview', token, {
        method: 'POST',
        body: JSON.stringify({
          entityType: editTarget.entityType,
          id: editTarget.item.id,
          operation: 'rename',
          newName: editForm.name.trim()
        })
      });
      setImpactPreview(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate impact preview.');
    }
  };

  const applyEdit = async () => {
    if (!editTarget) return;
    setSubmitting(true);
    setError('');
    try {
      await adminFetch(`/api/admin/structure/${editTarget.entityType}/${editTarget.item.id}`, token, {
        method: 'PUT',
        body: JSON.stringify({
          ...editForm,
          propagationMode: selectedMode || undefined,
          reason
        })
      });
      setEditTarget(null);
      setImpactPreview(null);
      setMessage('Institutional structure updated and propagated.');
      await loadStructure();
      await onConfigChanged();
    } catch (err: any) {
      setError(err.message || 'Update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (entityType: string, item: any) => {
    const next = item.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await adminFetch(`/api/admin/structure/${entityType}/${item.id}/status`, token, {
        method: 'POST',
        body: JSON.stringify({ status: next, confirmed: true, reason: `Status changed to ${next}` })
      });
      setMessage(res.message);
      await loadStructure();
      await onConfigChanged();
    } catch (err: any) {
      setError(err.message || 'Status update failed.');
    }
  };

  const handlePreviewMerge = async () => {
    if (!mergeForm.sourceDeptId || !mergeForm.targetDeptId) return;
    try {
      const res = await adminFetch('/api/admin/structure/preview', token, {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'department',
          id: mergeForm.sourceDeptId,
          operation: 'merge',
          mergeTargetId: mergeForm.targetDeptId
        })
      });
      setMergePreview(res.data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleConfirmMerge = async () => {
    if (!mergeForm.mode) return;
    setSubmitting(true);
    try {
      const res = await adminFetch('/api/admin/structure/department/merge', token, {
        method: 'POST',
        body: JSON.stringify({
          sourceDeptId: mergeForm.sourceDeptId,
          targetDeptId: mergeForm.targetDeptId,
          propagationMode: mergeForm.mode,
          confirmed: true,
          reason
        })
      });
      setMergeOpen(false);
      setMergePreview(null);
      setMessage(res.message);
      await loadStructure();
      await onConfigChanged();
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

      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-blue-600" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Institutional Hierarchy & Organizational Structure</h3>
            <p className="text-[11px] text-slate-500">
              Manage Campuses, Schools, Departments, and Programs with mandatory Option A / B historical impact preview.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setMergeOpen(true);
              setMergePreview(null);
              setMergeForm({ sourceDeptId: '', targetDeptId: '', mode: '' });
            }}
            className="h-8 text-xs"
          >
            <GitMerge className="w-3.5 h-3.5 mr-1.5" />
            Merge Departments
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setCreateForm({
                entityType: activeEntityTab === 'campuses' ? 'campus' : activeEntityTab === 'schools' ? 'school' : activeEntityTab === 'courses' ? 'course' : 'department',
                name: '', code: '', shortName: '', campusId: data.campuses[0]?.id || '', schoolId: data.schools[0]?.id || '', departmentId: data.departments[0]?.id || '', programLevelId: data.programLevels[0]?.id || '', duration: ''
              });
              setCreateOpen(true);
            }}
            className="h-8 text-xs bg-[#2855B9] hover:bg-[#1e4296]"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Entity
          </Button>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
        {[
          { key: 'campuses', label: `Campuses (${data.campuses?.length || 0})` },
          { key: 'schools', label: `Schools (${data.schools?.length || 0})` },
          { key: 'departments', label: `Departments (${data.departments?.length || 0})` },
          { key: 'courses', label: `Programs / Courses (${data.courses?.length || 0})` }
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveEntityTab(t.key as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeEntityTab === t.key ? 'bg-white text-blue-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table for Active Entity Type */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Code</th>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Parent / Details</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeEntityTab === 'campuses' && (data.campuses || []).map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-mono">{c.code}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900">{c.name}</td>
                  <td className="py-2.5 px-3 text-slate-500">University Campus Hub</td>
                  <td className="py-2.5 px-3"><Badge variant="outline" className="text-[10px]">{c.status}</Badge></td>
                  <td className="py-2.5 px-3 text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit('campus', c)} className="h-7 px-2 text-xs text-blue-600">
                      <Edit2 className="w-3 h-3 mr-1" /> Edit/Rename
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleToggleStatus('campus', c)} className="h-7 px-2 text-xs">
                      <Power className="w-3 h-3 mr-1" /> {c.status === 'Active' ? 'Deactivate' : 'Restore'}
                    </Button>
                  </td>
                </tr>
              ))}
              {activeEntityTab === 'schools' && (data.schools || []).map((s: any) => {
                const parentCampus = data.campuses?.find((c: any) => c.id === s.campusId);
                return (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono">{s.code}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{s.name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{parentCampus?.name || '—'}</td>
                    <td className="py-2.5 px-3"><Badge variant="outline" className="text-[10px]">{s.status}</Badge></td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit('school', s)} className="h-7 px-2 text-xs text-blue-600">
                        <Edit2 className="w-3 h-3 mr-1" /> Edit/Move
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleToggleStatus('school', s)} className="h-7 px-2 text-xs">
                        <Power className="w-3 h-3 mr-1" /> {s.status === 'Active' ? 'Deactivate' : 'Restore'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {activeEntityTab === 'departments' && (data.departments || []).map((d: any) => {
                const parentSchool = data.schools?.find((s: any) => s.id === d.schoolId);
                return (
                  <tr key={d.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono">{d.shortName || d.code}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{d.name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{parentSchool?.name || 'School of Engineering & Tech'}</td>
                    <td className="py-2.5 px-3">
                      <Badge variant="outline" className={`text-[10px] ${d.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {d.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit('department', d)} className="h-7 px-2 text-xs text-blue-600">
                        <Edit2 className="w-3 h-3 mr-1" /> Rename/Move
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleToggleStatus('department', d)} className="h-7 px-2 text-xs">
                        <Power className="w-3 h-3 mr-1" /> {d.status === 'Active' ? 'Deactivate' : 'Restore'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {activeEntityTab === 'courses' && (data.courses || []).map((cr: any) => {
                const parentDept = data.departments?.find((d: any) => d.id === cr.departmentId);
                const level = data.programLevels?.find((p: any) => p.id === cr.programLevelId);
                return (
                  <tr key={cr.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono">{cr.code}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">{cr.name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{parentDept?.name || '—'} ({level?.code || 'UG'})</td>
                    <td className="py-2.5 px-3"><Badge variant="outline" className="text-[10px]">{cr.status}</Badge></td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit('course', cr)} className="h-7 px-2 text-xs text-blue-600">
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleToggleStatus('course', cr)} className="h-7 px-2 text-xs">
                        <Power className="w-3 h-3 mr-1" /> {cr.status === 'Active' ? 'Deactivate' : 'Restore'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Entity Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Add Institutional Entity</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-medium mb-1">Entity Type</label>
              <select
                value={createForm.entityType}
                onChange={(e) => setCreateForm({ ...createForm, entityType: e.target.value })}
                className="w-full h-8 rounded border border-slate-200 px-2 text-xs"
              >
                <option value="campus">Campus</option>
                <option value="school">School</option>
                <option value="department">Department</option>
                <option value="course">Program / Course</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Code *</label>
              <Input value={createForm.code} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <label className="block text-[11px] font-medium mb-1">Name *</label>
              <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="h-8 text-xs" />
            </div>
            {createForm.entityType === 'school' && (
              <div>
                <label className="block text-[11px] font-medium mb-1">Campus *</label>
                <select value={createForm.campusId} onChange={(e) => setCreateForm({ ...createForm, campusId: e.target.value })} className="w-full h-8 rounded border border-slate-200 px-2 text-xs">
                  {(data.campuses || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {createForm.entityType === 'department' && (
              <>
                <div>
                  <label className="block text-[11px] font-medium mb-1">Short Name (e.g. CSE)</label>
                  <Input value={createForm.shortName} onChange={(e) => setCreateForm({ ...createForm, shortName: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1">Parent School</label>
                  <select value={createForm.schoolId} onChange={(e) => setCreateForm({ ...createForm, schoolId: e.target.value })} className="w-full h-8 rounded border border-slate-200 px-2 text-xs">
                    {(data.schools || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </>
            )}
            {createForm.entityType === 'course' && (
              <>
                <div>
                  <label className="block text-[11px] font-medium mb-1">Department</label>
                  <select value={createForm.departmentId} onChange={(e) => setCreateForm({ ...createForm, departmentId: e.target.value })} className="w-full h-8 rounded border border-slate-200 px-2 text-xs">
                    {(data.departments || []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1">Program Level</label>
                  <select value={createForm.programLevelId} onChange={(e) => setCreateForm({ ...createForm, programLevelId: e.target.value })} className="w-full h-8 rounded border border-slate-200 px-2 text-xs">
                    {(data.programLevels || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)} className="text-xs">Cancel</Button>
            <Button size="sm" disabled={submitting} onClick={handleCreate} className="text-xs bg-[#2855B9]">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit / Rename / Option A vs B Preview Modal */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Edit {editTarget?.entityType}: {editTarget?.item?.name}
            </DialogTitle>
          </DialogHeader>
          {editTarget && (
            <div className="space-y-3 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-medium mb-1">Official Name</label>
                  <Input value={editForm.name || ''} onChange={(e) => { setEditForm({ ...editForm, name: e.target.value }); setImpactPreview(null); }} className="h-8 text-xs" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-1">Code</label>
                  <Input value={editForm.code || ''} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} className="h-8 text-xs" />
                </div>
                {editTarget.entityType === 'department' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium mb-1">Short Name</label>
                      <Input value={editForm.shortName || ''} onChange={(e) => setEditForm({ ...editForm, shortName: e.target.value })} className="h-8 text-xs" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[11px] font-medium mb-1">Parent School</label>
                      <select value={editForm.schoolId || ''} onChange={(e) => setEditForm({ ...editForm, schoolId: e.target.value })} className="w-full h-8 rounded border border-slate-200 px-2 text-xs">
                        {(data.schools || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {impactPreview && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-950 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Structural Impact Analysis ({impactPreview.totalAffectedRecords} Total Records)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    {Object.values(impactPreview.breakdown || {}).map((b: any, i: number) => (
                      <div key={i} className="bg-white px-2 py-1.5 rounded border border-amber-200/70">
                        <span className="text-slate-500">{b.label}:</span>{' '}
                        <strong className="text-slate-900">{b.total}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 pt-1">
                    <p className="font-semibold text-slate-800">Choose Mandatory Historical Data Policy:</p>
                    <label className={`block p-2.5 rounded-lg border cursor-pointer ${selectedMode === 'A' ? 'bg-blue-50 border-blue-400' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <input type="radio" name="optMode" checked={selectedMode === 'A'} onChange={() => setSelectedMode('A')} />
                        <span>{impactPreview.options.A.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 pl-5 mt-0.5">{impactPreview.options.A.description}</p>
                    </label>
                    <label className={`block p-2.5 rounded-lg border cursor-pointer ${selectedMode === 'B' ? 'bg-blue-50 border-blue-400' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <input type="radio" name="optMode" checked={selectedMode === 'B'} onChange={() => setSelectedMode('B')} />
                        <span>{impactPreview.options.B.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 pl-5 mt-0.5">{impactPreview.options.B.description}</p>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium mb-1">Change Reason</label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Audit log reason..." className="h-8 text-xs" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditTarget(null)} className="text-xs">Cancel</Button>
            {!impactPreview && editForm.name?.trim() !== editTarget?.item?.name && editTarget?.entityType !== 'course' ? (
              <Button size="sm" onClick={handlePreviewEdit} className="text-xs bg-[#2855B9]">Analyze Impact & Preview</Button>
            ) : (
              <Button
                size="sm"
                disabled={submitting || (Boolean(impactPreview) && !selectedMode)}
                onClick={applyEdit}
                className="text-xs bg-[#2855B9]"
              >
                {submitting ? 'Applying...' : 'Confirm & Apply'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Departments Modal */}
      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Safe Department Merge</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium mb-1">Source Department (Will become Inactive)</label>
                <select value={mergeForm.sourceDeptId} onChange={(e) => setMergeForm({ ...mergeForm, sourceDeptId: e.target.value })} className="w-full h-8 rounded border border-slate-200 px-2 text-xs">
                  <option value="">Select source...</option>
                  {(data.departments || []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1">Target Department</label>
                <select value={mergeForm.targetDeptId} onChange={(e) => setMergeForm({ ...mergeForm, targetDeptId: e.target.value })} className="w-full h-8 rounded border border-slate-200 px-2 text-xs">
                  <option value="">Select target...</option>
                  {(data.departments || []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            {mergePreview && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <p className="font-semibold text-amber-900">
                  Total Affected Records: {mergePreview.totalAffectedRecords} ({mergePreview.currentAcademicYearRecords} current AY)
                </p>
                <label className="flex items-center gap-2">
                  <input type="radio" name="mergeMode" checked={mergeForm.mode === 'A'} onChange={() => setMergeForm({ ...mergeForm, mode: 'A' })} />
                  <span>Option A — Reassign all current and historical records</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="mergeMode" checked={mergeForm.mode === 'B'} onChange={() => setMergeForm({ ...mergeForm, mode: 'B' })} />
                  <span>Option B — Reassign current AY & users only; keep historical records under source name</span>
                </label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMergeOpen(false)} className="text-xs">Cancel</Button>
            {!mergePreview ? (
              <Button size="sm" disabled={!mergeForm.sourceDeptId || !mergeForm.targetDeptId} onClick={handlePreviewMerge} className="text-xs bg-[#2855B9]">
                Preview Merge Impact
              </Button>
            ) : (
              <Button size="sm" disabled={submitting || !mergeForm.mode} onClick={handleConfirmMerge} className="text-xs bg-amber-600 hover:bg-amber-700 text-white">
                Confirm Merge
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


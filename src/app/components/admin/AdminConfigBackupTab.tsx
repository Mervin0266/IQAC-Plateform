import React, { useEffect, useState } from 'react';
import { Database, Download, Upload, RotateCcw, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { adminFetch, API_BASE } from './adminApi';

interface AdminConfigBackupTabProps {
  token: string;
  onConfigChanged: () => Promise<void>;
}

export function AdminConfigBackupTab({ token, onConfigChanged }: AdminConfigBackupTabProps) {
  const [backups, setBackups] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [backupName, setBackupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [previewRestore, setPreviewRestore] = useState<any>(null);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      const res = await adminFetch('/api/admin/backups', token);
      setBackups(res.data?.backups || []);
      setVersions(res.data?.versions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load configuration backups.');
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleCreateBackup = async () => {
    setCreating(true);
    setError('');
    setMessage('');
    try {
      await adminFetch('/api/admin/backups', token, {
        method: 'POST',
        body: JSON.stringify({ name: backupName.trim() || undefined })
      });
      setBackupName('');
      setMessage('Configuration snapshot created successfully.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create backup.');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadBackup = async (backupId: string) => {
    const res = await fetch(`${API_BASE}/api/admin/backups/${backupId}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iqac-config-backup-${backupId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreviewRestoreFromId = async (backupId: string) => {
    setError('');
    try {
      const res = await adminFetch('/api/admin/backups/preview-restore', token, {
        method: 'POST',
        body: JSON.stringify({ backupId })
      });
      setPreviewRestore({ ...res.data, backupId });
    } catch (err: any) {
      setError(err.message || 'Failed to validate backup.');
    }
  };

  const handleFileUploadRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const text = await file.text();
      const snapshot = JSON.parse(text);
      const res = await adminFetch('/api/admin/backups/preview-restore', token, {
        method: 'POST',
        body: JSON.stringify({ snapshot })
      });
      setPreviewRestore({ ...res.data, snapshot });
    } catch (err: any) {
      setError(err.message || 'Invalid backup JSON file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmRestore = async () => {
    if (!previewRestore) return;
    setRestoring(true);
    setError('');
    try {
      const res = await adminFetch('/api/admin/backups/restore', token, {
        method: 'POST',
        body: JSON.stringify({
          backupId: previewRestore.backupId,
          snapshot: previewRestore.snapshot,
          confirmed: true,
          reason: 'Explicitly confirmed configuration restore'
        })
      });
      setPreviewRestore(null);
      setMessage(res.message || 'Configuration restored.');
      await loadData();
      await onConfigChanged();
    } catch (err: any) {
      setError(err.message || 'Restore failed.');
    } finally {
      setRestoring(false);
    }
  };

  const handleRollbackVersion = async (versionId: string) => {
    setError('');
    setMessage('');
    try {
      const res = await adminFetch(`/api/admin/configurations/versions/${versionId}/rollback`, token, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Administrator version rollback' })
      });
      setMessage(res.message || 'Configuration rolled back.');
      await loadData();
      await onConfigChanged();
    } catch (err: any) {
      setError(err.message || 'Rollback failed.');
    }
  };

  return (
    <div className="space-y-6">
      {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">{error}</div>}
      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Backup & Restore Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Configuration Backup & Safe Restore</h3>
              <p className="text-[11px] text-slate-500">
                Backs up roles, forms, fields, structure, settings, and modules. Never modifies student, faculty, or research records.
              </p>
            </div>
          </div>

          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100">
            <Upload className="w-3.5 h-3.5" />
            <span>Restore from JSON File</span>
            <input type="file" accept=".json" onChange={handleFileUploadRestore} className="hidden" />
          </label>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-100">
          <Input
            value={backupName}
            onChange={(e) => setBackupName(e.target.value)}
            placeholder="Snapshot name (e.g., Pre-NAAC Cycle 4 Config Snapshot)"
            className="h-9 text-xs flex-1"
          />
          <Button
            size="sm"
            disabled={creating}
            onClick={handleCreateBackup}
            className="h-9 text-xs bg-[#2855B9] hover:bg-[#1e4296]"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            {creating ? 'Creating Snapshot...' : 'Create Config Backup'}
          </Button>
        </div>

        {/* Saved Backups List */}
        <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
          {backups.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-400">No configuration backups created yet.</p>
          ) : (
            backups.map((b) => (
              <div key={b.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <p className="font-semibold text-slate-900">{b.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {b.createdByName} &bull; {new Date(b.createdAt).toLocaleString('en-IN')} &bull; Schema v{b.schemaVersion}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleDownloadBackup(b.id)} className="h-7 text-[11px]">
                    <Download className="w-3 h-3 mr-1" />
                    Export JSON
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePreviewRestoreFromId(b.id)}
                    className="h-7 text-[11px] text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Preview Restore
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Configuration Version History */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Configuration Version History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Ver</th>
                <th className="py-2 px-3">Entity</th>
                <th className="py-2 px-3">Changed By</th>
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-right">Recovery</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {versions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">No configuration versions logged yet.</td>
                </tr>
              ) : (
                versions.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 font-mono font-semibold text-slate-800">v{v.versionNumber}</td>
                    <td className="py-2 px-3">
                      <p className="font-medium text-slate-900">{v.entityName}</p>
                      <span className="text-[10px] text-slate-500">{v.entityType}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-700">{v.adminIdentity}</td>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{new Date(v.createdAt).toLocaleString('en-IN')}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-[10px]">{v.changeStatus}</Badge>
                    </td>
                    <td className="py-2 px-3 text-right">
                      {v.entityType === 'system_configuration' && v.previousConfig && v.changeStatus === 'applied' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRollbackVersion(v.id)}
                          className="h-7 px-2 text-[11px] text-blue-600 hover:bg-blue-50"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Rollback
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restore Preview Modal */}
      <Dialog open={!!previewRestore} onOpenChange={() => setPreviewRestore(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Configuration Restore Compatibility Preview</span>
            </DialogTitle>
          </DialogHeader>
          {previewRestore && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <p><strong>Schema Compatible:</strong> Yes (v{previewRestore.schemaVersion})</p>
                <p><strong>Snapshot Timestamp:</strong> {new Date(previewRestore.exportedAt).toLocaleString('en-IN')}</p>
                <p><strong>Operational Data Affected:</strong> No (Students, Faculty, Research & Placements preserved)</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-3 space-y-1">
                <p className="font-semibold text-slate-800 mb-1">Entities to Restore:</p>
                {Object.entries(previewRestore.summary || {}).map(([k, val]: [string, any]) => (
                  <div key={k} className="flex justify-between text-[11px]">
                    <span className="capitalize text-slate-600">{k}:</span>
                    <span className="font-medium text-slate-900">Current {val.current} &rarr; Backup {val.incoming}</span>
                  </div>
                ))}
              </div>
              {previewRestore.conflicts?.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-[11px]">
                  {previewRestore.conflicts.join(' ')}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPreviewRestore(null)} className="text-xs">
              Cancel
            </Button>
            <Button size="sm" disabled={restoring} onClick={handleConfirmRestore} className="text-xs bg-[#2855B9]">
              {restoring ? 'Restoring...' : 'Confirm & Restore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


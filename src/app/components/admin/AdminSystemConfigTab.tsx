import React, { useEffect, useState } from 'react';
import { Settings, Save, RotateCcw, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { adminFetch } from './adminApi';

interface AdminSystemConfigTabProps {
  token: string;
  onConfigChanged: () => Promise<void>;
}

export function AdminSystemConfigTab({ token, onConfigChanged }: AdminSystemConfigTabProps) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [jsonEditorText, setJsonEditorText] = useState('');
  const [reason, setReason] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const loadConfigs = async () => {
    try {
      const res = await adminFetch('/api/admin/configurations', token);
      const list = res.data?.configurations || [];
      setConfigs(list);
      if (list.length > 0 && !selectedConfig) {
        setSelectedConfig(list[0]);
        setJsonEditorText(JSON.stringify(list[0].value, null, 2));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load configurations.');
    }
  };

  useEffect(() => {
    loadConfigs();
  }, [token]);

  const handleSelectConfig = (cfg: any) => {
    setSelectedConfig(cfg);
    setJsonEditorText(JSON.stringify(cfg.value, null, 2));
    setReason('');
    setError('');
    setSuccess('');
  };

  const handlePreviewSave = async () => {
    if (!selectedConfig) return;
    setError('');
    setSuccess('');
    let parsedValue: any;
    try {
      parsedValue = JSON.parse(jsonEditorText);
    } catch {
      setError('Invalid JSON format in configuration editor.');
      return;
    }

    try {
      const res = await adminFetch(`/api/admin/configurations/${selectedConfig.configKey}/preview`, token, {
        method: 'POST',
        body: JSON.stringify({ value: parsedValue })
      });
      setPreviewData({ ...res.data, parsedValue });
    } catch (err: any) {
      setError(err.message || 'Failed to preview configuration update.');
    }
  };

  const handleConfirmSave = async () => {
    if (!previewData || !selectedConfig) return;
    setSaving(true);
    setError('');
    try {
      const res = await adminFetch(`/api/admin/configurations/${selectedConfig.configKey}`, token, {
        method: 'PUT',
        body: JSON.stringify({ value: previewData.parsedValue, reason })
      });
      setPreviewData(null);
      setSuccess(res.message || 'Configuration saved and propagated.');
      await loadConfigs();
      setSelectedConfig(res.data);
      setJsonEditorText(JSON.stringify(res.data.value, null, 2));
      await onConfigChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Category Directory */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 h-fit">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Settings className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-slate-900">Configuration Categories</h3>
        </div>
        <div className="space-y-1">
          {configs.map((cfg) => {
            const active = selectedConfig?.configKey === cfg.configKey;
            return (
              <button
                key={cfg.configKey}
                type="button"
                onClick={() => handleSelectConfig(cfg)}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors border ${
                  active
                    ? 'bg-blue-50 border-blue-200 text-blue-900 font-semibold'
                    : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{cfg.label}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    v{cfg.version}
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">{cfg.category}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Configuration Editor */}
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        {selectedConfig ? (
          <>
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{selectedConfig.label}</h3>
                  <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                    Version {selectedConfig.version}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">{selectedConfig.description}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setJsonEditorText(JSON.stringify(selectedConfig.value, null, 2))}
                className="h-8 text-xs shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset Edits
              </Button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">{error}</div>
            )}
            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Configuration Value (Structured JSON)
              </label>
              <textarea
                value={jsonEditorText}
                onChange={(e) => setJsonEditorText(e.target.value)}
                rows={12}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Reason for Configuration Change
                </label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Added AY 2027-28 or updated max file size"
                  className="h-9 text-xs"
                />
              </div>
              <Button
                onClick={handlePreviewSave}
                className="h-9 text-xs bg-[#2855B9] hover:bg-[#1e4296]"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Preview & Apply
              </Button>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-xs text-slate-400">
            Select a configuration category to inspect and edit.
          </div>
        )}
      </div>

      {/* Mandatory Impact Preview Dialog */}
      <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Configuration Change Impact Preview</span>
            </DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <p><strong>Configuration:</strong> {previewData.label}</p>
                <p><strong>Affected Modules:</strong> {(previewData.affectedModules || []).join(', ')}</p>
                <p><strong>Migration Required:</strong> No &bull; <strong>Reversible:</strong> Yes (via Version Rollback)</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <p className="font-semibold text-slate-700 mb-1">Previous</p>
                  <pre className="p-2 bg-slate-50 border rounded text-[10px] max-h-48 overflow-auto">
                    {JSON.stringify(previewData.previousValue, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="font-semibold text-slate-700 mb-1">Proposed</p>
                  <pre className="p-2 bg-blue-50/50 border border-blue-200 rounded text-[10px] max-h-48 overflow-auto">
                    {JSON.stringify(previewData.proposedValue, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPreviewData(null)} className="text-xs">
              Return to Editing
            </Button>
            <Button size="sm" disabled={saving} onClick={handleConfirmSave} className="text-xs bg-[#2855B9]">
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? 'Applying...' : 'Confirm & Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


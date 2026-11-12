import React, { useEffect, useState } from 'react';
import { Sliders, Lock, Power, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { adminFetch } from './adminApi';

interface AdminModuleManagementTabProps {
  token: string;
  onConfigChanged: () => Promise<void>;
}

export function AdminModuleManagementTab({ token, onConfigChanged }: AdminModuleManagementTabProps) {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const loadModules = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/modules', token);
      setModules(res.data || []);
    } catch (err) {
      console.error('Load modules error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModules();
  }, [token]);

  const handleOpenTogglePreview = async (mod: any) => {
    setFeedback('');
    setReason('');
    try {
      const res = await adminFetch(`/api/admin/modules/${mod.moduleKey}/preview`, token, { method: 'POST' });
      setPreviewData(res.data);
    } catch (err: any) {
      setFeedback(err.message || 'Failed to preview module impact.');
    }
  };

  const handleConfirmToggle = async () => {
    if (!previewData) return;
    setSubmitting(true);
    try {
      const enable = previewData.proposedStatus === 'Enabled';
      const res = await adminFetch(`/api/admin/modules/${previewData.moduleKey}/toggle`, token, {
        method: 'PUT',
        body: JSON.stringify({ isEnabled: enable, confirmed: true, reason })
      });
      setPreviewData(null);
      setFeedback(res.message || 'Module status updated.');
      await loadModules();
      await onConfigChanged();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to toggle module.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900">IQAC Module Management</h3>
            <p className="text-[11px] text-slate-500">
              Enable or disable operational modules cleanly. Disabling never deletes database tables, historical records, or audit logs.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={loadModules} className="h-8 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {feedback && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((mod) => (
          <div
            key={mod.id}
            className={`bg-white border rounded-xl p-4 shadow-xs flex flex-col justify-between ${
              mod.isEnabled ? 'border-slate-200' : 'border-amber-200 bg-amber-50/20'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-xs font-bold text-slate-900">{mod.moduleName}</h4>
                <Badge
                  variant="outline"
                  className={`text-[10px] shrink-0 ${
                    mod.isEnabled
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {mod.isEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{mod.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                  Records: {mod.recordCount?.toLocaleString('en-IN') ?? 0}
                </span>
                {Array.isArray(mod.dependencies) && mod.dependencies.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                    Depends on: {mod.dependencies.join(', ')}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                {mod.lastChangedAt
                  ? `Updated ${new Date(mod.lastChangedAt).toLocaleDateString('en-IN')}`
                  : `Config v${mod.version || 1}`}
              </span>
              {mod.isCritical ? (
                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600">
                  <Lock className="w-3 h-3 mr-1" />
                  Core Protected
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant={mod.isEnabled ? 'outline' : 'default'}
                  onClick={() => handleOpenTogglePreview(mod)}
                  className={`h-7 px-2.5 text-[11px] ${
                    mod.isEnabled
                      ? 'text-amber-700 border-amber-200 hover:bg-amber-50'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Power className="w-3 h-3 mr-1" />
                  {mod.isEnabled ? 'Disable Module' : 'Enable Module'}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mandatory Impact Preview & Confirmation Modal */}
      <Dialog open={!!previewData} onOpenChange={() => setPreviewData(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Confirm Module Status Change</span>
            </DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <p><strong>Module:</strong> {previewData.moduleName}</p>
                <p><strong>Change:</strong> {previewData.currentStatus} &rarr; <strong>{previewData.proposedStatus}</strong></p>
                <p><strong>Affected Routes:</strong> {(previewData.affectedRoutes || []).join(', ') || 'None'}</p>
                {previewData.dependentModules?.length > 0 && (
                  <p className="text-amber-800">
                    <strong>Dependent Modules:</strong> {previewData.dependentModules.map((d: any) => d.moduleName).join(', ')}
                  </p>
                )}
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                <p className="font-semibold">Data Safety Guarantee</p>
                <p className="mt-0.5 text-[11px]">{previewData.warning}</p>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">Reason for Change (Optional)</label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Seasonal module freeze after AQAR submission"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setPreviewData(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={submitting || previewData?.isCritical}
              onClick={handleConfirmToggle}
              className="text-xs bg-[#2855B9] hover:bg-[#1e4296]"
            >
              {submitting ? 'Applying...' : 'Confirm & Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


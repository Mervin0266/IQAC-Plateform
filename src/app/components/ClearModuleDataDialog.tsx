import React, { useState } from 'react';
import { AlertCircle, Trash2, X, Loader2, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface ClearModuleDataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  moduleName: string; // e.g. 'Professional Developments', 'Invited Talks', 'E-Contents', 'Awards', 'Periodicals'
  apiEndpoint: string; // e.g. '/api/professional-developments/clear-all'
  token: string;
  onSuccess: () => void;
}

export function ClearModuleDataDialog({
  isOpen,
  onClose,
  moduleName,
  apiEndpoint,
  token,
  onSuccess
}: ClearModuleDataDialogProps) {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = typedConfirmation.trim() === moduleName;

  const handleClose = () => {
    if (loading) return;
    setTypedConfirmation('');
    setError(null);
    onClose();
  };

  const handleClear = async () => {
    if (!isConfirmed || loading) return;
    setLoading(true);
    setError(null);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const cleanEndpoint = apiEndpoint.startsWith('/') ? apiEndpoint : `/${apiEndpoint}`;
      const url = `${baseUrl}${cleanEndpoint}`;

      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Failed to clear ${moduleName} data.`);
      }

      setTypedConfirmation('');
      onClose();
      onSuccess();
    } catch (err: any) {
      console.error(`Clear ${moduleName} error:`, err);
      setError(err.message || 'An error occurred while clearing module data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md p-6 bg-white rounded-2xl shadow-2xl border border-red-100">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-2.5 text-red-600">
            <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 leading-tight">
                Clear All {moduleName}
              </DialogTitle>
              <span className="text-[11px] font-semibold text-red-600 tracking-wider uppercase">
                Irreversible Administrative Action
              </span>
            </div>
          </div>

          <DialogDescription className="text-xs text-slate-600 leading-relaxed bg-red-50/60 p-3 rounded-xl border border-red-200/60">
            This operation will permanently delete all records and contributor junction data for{' '}
            <strong className="text-red-700">{moduleName}</strong>. Faculty, student, and other departmental
            records will remain untouched.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-2">
          <label className="text-xs font-medium text-slate-700 block">
            To proceed, type <span className="font-mono font-bold text-slate-900 select-all">{moduleName}</span> below:
          </label>
          <Input
            value={typedConfirmation}
            onChange={(e) => setTypedConfirmation(e.target.value)}
            placeholder={`Type ${moduleName} to confirm`}
            className="font-mono text-xs border-slate-300 focus:border-red-500 focus:ring-red-200"
            disabled={loading}
            autoFocus
          />

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={loading}
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleClear}
            disabled={!isConfirmed || loading}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs gap-1.5 transition-colors shadow-2xs disabled:bg-slate-200 disabled:text-slate-400"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Clearing Data...
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                Permanently Delete All
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

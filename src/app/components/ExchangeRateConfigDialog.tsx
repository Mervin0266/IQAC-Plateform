import React, { useState } from 'react';
import { DollarSign, RefreshCw, CheckCircle2, ShieldCheck, AlertCircle, Info, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { useAuth } from '../contexts/AuthContext';

interface ExchangeRateConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRateUpdated?: () => void;
}

export function ExchangeRateConfigDialog({ isOpen, onClose, onRateUpdated }: ExchangeRateConfigDialogProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { rateInfo, setOverride, resetOverride, refetch, loading } = useExchangeRate();

  const [inputRate, setInputRate] = useState<string>(String(rateInfo.rate));
  const [notes, setNotes] = useState<string>(rateInfo.notes || '');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setInputRate(String(rateInfo.rate));
      setNotes(rateInfo.notes || '');
      setStatusMsg(null);
    }
  }, [isOpen, rateInfo]);

  const handleSaveOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const num = parseFloat(inputRate);
    if (isNaN(num) || num <= 0) {
      setStatusMsg({ type: 'error', text: 'Please enter a valid positive exchange rate.' });
      return;
    }

    setSaving(true);
    setStatusMsg(null);
    try {
      await setOverride(num, notes);
      setStatusMsg({ type: 'success', text: `Exchange rate manually locked at 1 USD = ₹${num.toFixed(2)} INR.` });
      if (onRateUpdated) onRateUpdated();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update exchange rate.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToAuto = async () => {
    if (!isAdmin) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      await resetOverride();
      setStatusMsg({ type: 'success', text: 'Reverted to automated market reference rate.' });
      if (onRateUpdated) onRateUpdated();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to reset exchange rate.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6 bg-white rounded-2xl shadow-2xl border border-slate-200">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 text-[#2855B9]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 leading-tight">
                Currency Conversion Rate (USD / INR)
              </DialogTitle>
              <span className="text-[11px] font-medium text-slate-500">
                Institutional Research & Innovation Metric Conversions
              </span>
            </div>
          </div>
          <DialogDescription className="text-xs text-slate-600 leading-relaxed pt-1">
            Converted USD values are secondary indicators computed from authoritative INR project records.
            The rate can be automatically updated or administratively fixed.
          </DialogDescription>
        </DialogHeader>

        <div className="my-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Effective Exchange Rate:</span>
            <span className="font-mono font-bold text-sm text-slate-900">
              1 USD = ₹{Number(rateInfo.rate).toFixed(2)} INR
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Rate Status:</span>
            <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-[11px] ${
              rateInfo.isManualOverride
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {rateInfo.isManualOverride ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-amber-700" />
                  Manual Override
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  Automated Market Reference
                </>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Source:</span>
            <span className="font-mono font-medium text-slate-700">{rateInfo.source || 'system_reference'}</span>
          </div>
          {rateInfo.effectiveDate && (
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Effective Date:</span>
              <span>{rateInfo.effectiveDate}</span>
            </div>
          )}
        </div>

        {isAdmin ? (
          <form onSubmit={handleSaveOverride} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Override Rate (INR per 1 USD):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  max="500"
                  value={inputRate}
                  onChange={(e) => setInputRate(e.target.value)}
                  disabled={saving}
                  className="pl-7 text-xs font-mono font-semibold"
                  placeholder="86.85"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Administrative Notes / Justification:
              </label>
              <Input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={saving}
                className="text-xs"
                placeholder="e.g. Official RBI reference rate for FY 2024-25"
              />
            </div>

            {statusMsg && (
              <div className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium ${
                statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{statusMsg.text}</span>
              </div>
            )}

            <DialogFooter className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              {rateInfo.isManualOverride && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetToAuto}
                  disabled={saving}
                  className="text-xs text-slate-600 gap-1.5 hover:bg-slate-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Revert to Automated
                </Button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving} className="text-xs">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="bg-[#2855B9] hover:bg-[#1C355B] text-white font-semibold text-xs gap-1.5"
                >
                  {saving ? 'Updating...' : 'Save Override'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 italic flex items-center gap-1.5 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
              <Info className="w-4 h-4 text-blue-500 shrink-0" />
              Only System Administrators can customize or override the reference exchange rate.
            </p>
            <DialogFooter className="pt-2">
              <Button type="button" size="sm" onClick={onClose} className="text-xs ml-auto">
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

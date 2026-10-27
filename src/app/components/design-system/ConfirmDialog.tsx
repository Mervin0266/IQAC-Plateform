import React, { useEffect } from 'react';
import { AlertTriangle, AlertCircle, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const isDanger = variant === 'danger';
  const Icon = isDanger ? AlertTriangle : AlertCircle;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={() => !loading && onClose()}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="w-full max-w-md transform overflow-hidden rounded-xl bg-white p-6 text-left shadow-xl transition-all border border-slate-200">
          <div className="flex items-start gap-4">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                isDanger
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <div className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                {message}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2f4692]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#2f4692]/20"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors focus:outline-none focus:ring-2 ${
                isDanger
                  ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500/30'
                  : 'bg-[#2f4692] hover:bg-[#243a7a] focus:ring-[#2f4692]/30'
              } disabled:opacity-50`}
            >
              {loading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

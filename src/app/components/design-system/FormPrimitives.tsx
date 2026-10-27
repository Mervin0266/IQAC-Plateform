import React from 'react';
import { AlertCircle, RefreshCw, X, LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';

export interface FormFieldProps {
  label?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  required,
  hint,
  error,
  htmlFor,
  className = '',
  children,
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-xs font-semibold text-slate-700 tracking-tight"
        >
          {label}
          {required && (
            <span className="text-red-500 font-bold ml-1" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-[11px] text-slate-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1 font-medium mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className = '', hasError, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full h-9 rounded-xl border bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors shadow-xs ${
          hasError
            ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
            : 'border-slate-300 focus:border-[#2F4692] focus:ring-1 focus:ring-[#2F4692]'
        } disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    );
  }
);
FormInput.displayName = 'FormInput';

export interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ className = '', hasError, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full h-9 rounded-xl border bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none transition-colors shadow-xs font-medium cursor-pointer ${
          hasError
            ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
            : 'border-slate-300 focus:border-[#2F4692] focus:ring-1 focus:ring-[#2F4692]'
        } disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
FormSelect.displayName = 'FormSelect';

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className = '', hasError, rows = 3, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={`w-full rounded-xl border bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-colors shadow-xs ${
          hasError
            ? 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
            : 'border-slate-300 focus:border-[#2F4692] focus:ring-1 focus:ring-[#2F4692]'
        } disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    );
  }
);
FormTextarea.displayName = 'FormTextarea';

export interface FormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
  error?: string;
  loading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit: (e: React.FormEvent) => void;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  children: React.ReactNode;
}

export function FormModal({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  badge,
  error,
  loading = false,
  submitLabel = 'Save Record',
  cancelLabel = 'Cancel',
  onSubmit,
  maxWidth = '2xl',
  children,
}: FormModalProps) {
  const maxWidthClass = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
  }[maxWidth];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${maxWidthClass} max-h-[90vh] overflow-y-auto p-0 bg-white rounded-2xl shadow-xl border border-slate-200`}>
        <form onSubmit={onSubmit} className="flex flex-col h-full">
          {/* Institutional Header */}
          <DialogHeader className="p-5 pb-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {Icon && (
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-[#2F4692] flex items-center justify-center shrink-0 shadow-2xs">
                    <Icon className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-base font-bold text-slate-900 tracking-tight">
                      {title}
                    </DialogTitle>
                    {badge && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#2F4692] border border-blue-200">
                        {badge}
                      </span>
                    )}
                  </div>
                  {description && (
                    <DialogDescription className="text-xs text-slate-500 mt-0.5">
                      {description}
                    </DialogDescription>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Form Body */}
          <div className="p-5 sm:p-6 space-y-4 text-xs overflow-y-auto">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}
            {children}
          </div>

          {/* Institutional Footer */}
          <DialogFooter className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 text-xs font-semibold text-slate-700 border-slate-200 rounded-xl hover:bg-slate-100"
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-9 px-5 text-xs font-bold bg-[#2F4692] hover:bg-[#243A7A] text-white rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Processing...' : submitLabel}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

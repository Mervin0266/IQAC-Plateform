import React from 'react';

export type StatusVariant =
  | 'active'
  | 'approved'
  | 'published'
  | 'completed'
  | 'success'
  | 'pending'
  | 'review'
  | 'warning'
  | 'inactive'
  | 'rejected'
  | 'withdrawn'
  | 'error'
  | 'info'
  | 'verified'
  | 'neutral';

export interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  showDot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({
  status,
  variant,
  showDot = true,
  size = 'md',
  className = '',
}: StatusBadgeProps) {
  // Infer variant from status string if not explicitly given
  const normalized = (variant || status || '').toLowerCase();

  let styleConfig = {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  };

  if (
    ['active', 'approved', 'published', 'completed', 'success', 'verified'].some((v) =>
      normalized.includes(v)
    )
  ) {
    styleConfig = {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
    };
  } else if (
    ['pending', 'review', 'warning', 'submitted', 'in progress', 'ongoing'].some((v) =>
      normalized.includes(v)
    )
  ) {
    styleConfig = {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
    };
  } else if (
    ['inactive', 'rejected', 'withdrawn', 'error', 'failed', 'dropped'].some((v) =>
      normalized.includes(v)
    )
  ) {
    styleConfig = {
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
      dot: 'bg-rose-500',
    };
  } else if (['info', 'registered', 'applied', 'new'].some((v) => normalized.includes(v))) {
    styleConfig = {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      dot: 'bg-[#2f4692]',
    };
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] font-medium'
      : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${styleConfig.bg} ${styleConfig.text} ${styleConfig.border} ${sizeClasses} tracking-tight ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${styleConfig.dot}`}
          aria-hidden="true"
        />
      )}
      <span className="capitalize">{status}</span>
    </span>
  );
}

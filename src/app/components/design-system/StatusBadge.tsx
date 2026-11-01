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
    bg: 'bg-[#F1F5F9]',
    text: 'text-[#475569]',
    border: 'border-[#E2E8F0]',
    dot: 'bg-[#94A3B8]',
  };

  if (
    ['approved', 'published', 'completed', 'success', 'verified', 'granted', 'proof available'].some((v) =>
      normalized.includes(v)
    )
  ) {
    styleConfig = {
      bg: 'bg-[#E8F5ED]',
      text: 'text-[#167447]',
      border: 'border-[#C6E7D2]',
      dot: 'bg-[#167447]',
    };
  } else if (
    ['active', 'ongoing', 'on going', 'info', 'registered', 'applied', 'national govt', 'state govt'].some((v) =>
      normalized.includes(v)
    )
  ) {
    styleConfig = {
      bg: 'bg-[#EAF1FD]',
      text: 'text-[#2855B9]',
      border: 'border-[#C8DCFB]',
      dot: 'bg-[#2855B9]',
    };
  } else if (
    ['pending', 'review', 'warning', 'submitted', 'in progress', 'under examination', 'examination', 'filed', 'sanctioned'].some((v) =>
      normalized.includes(v)
    )
  ) {
    styleConfig = {
      bg: 'bg-[#FFF4D8]',
      text: 'text-[#9A6700]',
      border: 'border-[#FFE5A3]',
      dot: 'bg-[#9A6700]',
    };
  } else if (
    ['inactive', 'rejected', 'withdrawn', 'error', 'failed', 'dropped', 'terminated', 'access issue'].some((v) =>
      normalized.includes(v)
    )
  ) {
    styleConfig = {
      bg: 'bg-[#FEF2F2]',
      text: 'text-[#B42318]',
      border: 'border-[#FECDCA]',
      dot: 'bg-[#B42318]',
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

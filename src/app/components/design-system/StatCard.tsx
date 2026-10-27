import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: {
    value: string | number;
    positive?: boolean;
    neutral?: boolean;
    label?: string;
  };
  icon?: LucideIcon;
  badge?: string;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  badge,
  loading = false,
  onClick,
  className = '',
}: StatCardProps) {
  const content = (
    <div
      className={`h-full flex flex-col justify-between bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs relative transition-all duration-150 ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-sm' : ''
      } ${className}`}
    >
      {/* Subtle top indicator bar - institutional blue */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100/80 rounded-t-2xl overflow-hidden">
        <div className="h-full bg-[#2F4692] w-12" />
      </div>

      {/* Top Header Row: Title, Badge, and Icon */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {title}
            </span>
            {badge && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#2F4692] border border-blue-200/60 shrink-0">
                {badge}
              </span>
            )}
          </div>
        </div>

        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-[#2F4692]">
            <Icon className="w-4 h-4 text-[#2F4692]" />
          </div>
        )}
      </div>

      {/* Metric Value: Bold & Prominent */}
      <div className="my-auto py-1">
        {loading ? (
          <div className="h-8 w-24 bg-slate-100 animate-pulse rounded my-1" />
        ) : (
          <div className="text-2xl lg:text-[26px] font-bold tracking-tight text-[#0B132B] tabular-nums truncate leading-none">
            {value}
          </div>
        )}
      </div>

      {/* Bottom Row: Subtitle & Trend Change Pinned to Bottom */}
      {(subtitle || change) && (
        <div className="mt-auto pt-3 border-t border-slate-100/80 flex items-center gap-1.5 text-xs">
          {change && (
            <span
              className={`inline-flex items-center font-bold shrink-0 ${
                change.neutral
                  ? 'text-slate-500'
                  : change.positive
                  ? 'text-emerald-700'
                  : 'text-rose-700'
              }`}
            >
              {change.positive && '+'}
              {change.value}
              {change.label && <span className="text-slate-500 ml-1 font-normal">{change.label}</span>}
            </span>
          )}
          {subtitle && (
            <span className="text-slate-500 truncate" title={subtitle}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full h-full text-left focus:outline-none focus:ring-2 focus:ring-[#2F4692]/20 rounded-2xl block"
      >
        {content}
      </button>
    );
  }

  return content;
}

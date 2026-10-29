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

/**
 * StatCard — Minimal Enterprise SaaS Metric Card
 * Structured for modern analytics dashboards (Stripe / Datadog style):
 * - Clean white container with subtle 1px border
 * - Rounded corners (rounded-xl)
 * - Inter tabular typography
 * - Restrained status colors for trends and badges
 * - No decorative stripes or gradients
 */
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
      className={`h-full flex flex-col justify-between bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs relative transition-colors duration-150 ${
        onClick ? 'cursor-pointer hover:border-slate-300 hover:bg-slate-50/30' : ''
      } ${className}`}
    >
      {/* Top Header Row: Title, Badge, and Restrained Icon */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              {title}
            </span>
            {badge && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/60 shrink-0">
                {badge}
              </span>
            )}
          </div>
        </div>

        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 text-slate-600">
            <Icon className="w-4 h-4 text-slate-600" />
          </div>
        )}
      </div>

      {/* Metric Value: Bold & Prominent Inter Tabular Numbers */}
      <div className="my-auto py-1">
        {loading ? (
          <div className="h-8 w-24 bg-slate-100 rounded my-1" />
        ) : (
          <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums truncate leading-none">
            {value}
          </div>
        )}
      </div>

      {/* Bottom Row: Subtitle & Restrained Trend Indicator */}
      {(subtitle || change) && (
        <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs">
          {change && (
            <span
              className={`inline-flex items-center font-medium shrink-0 ${
                change.neutral
                  ? 'text-slate-600'
                  : change.positive
                  ? 'text-emerald-700'
                  : 'text-rose-700'
              }`}
            >
              {change.positive && '+'}
              {change.value}
              {change.label && (
                <span className="text-slate-500 ml-1 font-normal">{change.label}</span>
              )}
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
        className="w-full h-full text-left focus:outline-none focus:ring-2 focus:ring-slate-900/10 rounded-xl block"
      >
        {content}
      </button>
    );
  }

  return content;
}

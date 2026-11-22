import React, { useState, useRef, useEffect } from 'react';
import { LucideIcon, Info, ChevronRight } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';

export interface MetricBreakdownItem {
  label: string;
  value: string | number;
  subtext?: string;
  badge?: string;
  percent?: number;
}

export interface MetricBreakdownSection {
  title?: string;
  items: MetricBreakdownItem[];
}

export interface MetricBreakdownData {
  title?: string;
  subtitle?: string;
  badge?: string;
  sections: MetricBreakdownSection[];
  footer?: string;
}

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
  breakdown?: MetricBreakdownData;
  hoverContent?: React.ReactNode;
}

/**
 * StatCard — Minimal Enterprise SaaS Metric Card with Contextual Hover Details
 * Structured for modern analytics dashboards:
 * - Clean white container with subtle 1px border
 * - Rounded corners (rounded-xl)
 * - Inter tabular typography
 * - Contextual hover popover on desktop, tap on mobile, keyboard accessible
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
  breakdown,
  hoverContent,
}: StatCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInteractiveDetails = Boolean(breakdown || hoverContent);

  const handleMouseEnter = () => {
    if (!hasInteractiveDetails) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 120);
  };

  const handleMouseLeave = () => {
    if (!hasInteractiveDetails) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!hasInteractiveDetails) return;
    if (e.key === 'Enter' || e.key === ' ') {
      if (!onClick) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const cardInner = (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      tabIndex={hasInteractiveDetails ? 0 : undefined}
      role={hasInteractiveDetails ? 'region' : undefined}
      aria-label={hasInteractiveDetails ? `${title} metric with contextual details` : undefined}
      className={`h-full flex flex-col justify-between bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-xs relative transition-all duration-150 ${
        onClick
          ? 'cursor-pointer hover:border-slate-300 hover:bg-slate-50/50'
          : hasInteractiveDetails
          ? 'cursor-help hover:border-slate-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2855B9]/20'
          : ''
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
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-[#E2E8F0] shrink-0">
                {badge}
              </span>
            )}
            {hasInteractiveDetails && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-blue-500/80 animate-pulse"
                title="Contextual breakdown available"
                aria-hidden="true"
              />
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-[#E2E8F0] flex items-center justify-center shrink-0 text-slate-600">
              <Icon className="w-4 h-4 text-slate-600" />
            </div>
          )}
        </div>
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
      {(subtitle || change || hasInteractiveDetails) && (
        <div className="mt-auto pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-1.5 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
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

          {hasInteractiveDetails && (
            <span className="text-[10px] text-blue-600 font-medium shrink-0 flex items-center gap-0.5 opacity-70 group-hover:opacity-100">
              <span>Details</span>
              <ChevronRight className="w-2.5 h-2.5" />
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (!hasInteractiveDetails) {
    if (onClick) {
      return (
        <button
          type="button"
          onClick={onClick}
          className="w-full h-full text-left focus:outline-none focus:ring-2 focus:ring-slate-900/10 rounded-xl block"
        >
          {cardInner}
        </button>
      );
    }
    return cardInner;
  }

  // Popover breakdown content rendering
  const popoverBody = hoverContent ? (
    hoverContent
  ) : breakdown ? (
    <div className="space-y-3.5">
      {/* Popover Header */}
      <div className="border-b border-slate-100 pb-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {breakdown.subtitle || `${title} Breakdown`}
          </span>
          {breakdown.badge && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              {breakdown.badge}
            </span>
          )}
        </div>
        <div className="flex items-baseline justify-between mt-1">
          <h4 className="text-sm font-bold text-slate-900">{breakdown.title || title}</h4>
          <span className="text-sm font-extrabold text-blue-900 tabular-nums">{value}</span>
        </div>
      </div>

      {/* Breakdown Sections */}
      <div className="space-y-3">
        {breakdown.sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1.5">
            {section.title && (
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-0.5 border-b border-slate-100/60 flex items-center justify-between">
                <span>{section.title}</span>
                <span className="text-[9px] font-normal text-slate-400">
                  {section.items.length} {section.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            )}
            <div className="divide-y divide-slate-50">
              {section.items.map((item, iIdx) => (
                <div key={iIdx} className="py-1.5 first:pt-0.5 last:pb-0.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="text-slate-700 font-medium truncate" title={item.label}>
                        {item.label}
                      </div>
                      {item.subtext && (
                        <div className="text-[10px] text-slate-400 truncate">{item.subtext}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                          {item.badge}
                        </span>
                      )}
                      <span className="font-semibold text-slate-900 tabular-nums">
                        {item.value}
                      </span>
                    </div>
                  </div>
                  {item.percent !== undefined && (
                    <div className="w-full bg-slate-100 rounded-full h-1 mt-1 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, item.percent))}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Popover Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span>{breakdown.footer || 'Verified records • No sensitive PII'}</span>
        <span className="text-slate-300">•</span>
        <span className="text-slate-400">IQAC Intelligence</span>
      </div>
    </div>
  ) : null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            className="w-full h-full text-left focus:outline-none focus:ring-2 focus:ring-slate-900/10 rounded-xl block group"
          >
            {cardInner}
          </button>
        ) : (
          <div
            onClick={() => setIsOpen(prev => !prev)}
            className="w-full h-full block group"
          >
            {cardInner}
          </div>
        )}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-80 sm:w-96 max-h-[75vh] overflow-y-auto p-4 bg-white border border-slate-200/90 rounded-xl shadow-xl z-50 text-slate-800 text-xs focus:outline-none"
      >
        {popoverBody}
      </PopoverContent>
    </Popover>
  );
}

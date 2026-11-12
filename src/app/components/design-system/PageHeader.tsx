import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader — Minimal Enterprise SaaS View Header
 * Clean hierarchy: Breadcrumbs -> Title with status/count badge -> Subtitle -> Action toolbar
 */
export function PageHeader({
  title,
  description,
  badge,
  breadcrumbs,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <header className={`iq-page-header bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs ${className}`}>
      <svg className="iq-page-orbit" viewBox="0 0 240 180" fill="none" aria-hidden="true"><circle cx="120" cy="90" r="66" /><ellipse cx="120" cy="90" rx="110" ry="35" transform="rotate(-28 120 90)" /><path d="M120 6v168M30 90h180" /><circle cx="180" cy="62" r="5" fill="currentColor" /></svg>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-1">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  {crumb.onClick && !crumb.active ? (
                    <button
                      type="button"
                      onClick={crumb.onClick}
                      className="hover:text-slate-900 transition-colors focus:outline-none focus:underline"
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className={crumb.active ? 'text-slate-900 font-medium' : ''}>
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          {/* Title and Restrained Badge */}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            {badge && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 tracking-normal">
                {badge}
              </span>
            )}
          </div>

          {/* Subtitle */}
          {description && (
            <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {/* Action Controls */}
        {actions && (
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

import React from 'react';

export interface SectionCardProps {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footer?: React.ReactNode;
}

export function SectionCard({
  title,
  subtitle,
  badge,
  actions,
  children,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footer,
}: SectionCardProps) {
  return (
    <div className={`bg-white border border-slate-200/80 rounded-xl shadow-xs overflow-hidden ${className}`}>
      {(title || actions) && (
        <div
          className={`px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${headerClassName}`}
        >
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
              {badge}
            </div>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>

          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}

      <div className={`p-5 ${bodyClassName}`}>{children}</div>

      {footer && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
          {footer}
        </div>
      )}
    </div>
  );
}

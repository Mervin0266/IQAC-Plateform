import React from 'react';
import { Search, X, RotateCcw } from 'lucide-react';

export interface FilterToolbarProps {
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  onReset?: () => void;
  hasActiveFilters?: boolean;
  totalResults?: number;
  resultLabel?: string;
  className?: string;
  actions?: React.ReactNode;
}

export function FilterToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',
  children,
  onReset,
  hasActiveFilters = false,
  totalResults,
  resultLabel = 'records',
  className = '',
  actions,
}: FilterToolbarProps) {
  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs space-y-3 ${className}`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input */}
        {onSearchChange && (
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-9 pl-9 pr-8 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2f4692]/20 focus:border-[#2f4692] transition-colors"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Filter slots & Reset */}
        <div className="flex flex-wrap items-center gap-2">
          {children}

          {onReset && hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#2f4692]/20"
              title="Reset all active filters"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset</span>
            </button>
          )}

          {actions}
        </div>
      </div>

      {/* Result counter indicator */}
      {typeof totalResults === 'number' && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800 font-semibold">{totalResults}</strong> {resultLabel}
          </span>
          {hasActiveFilters && (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#2f4692] font-medium bg-[#2f4692]/5 px-2 py-0.5 rounded-full border border-[#2f4692]/10">
              Filters applied
            </span>
          )}
        </div>
      )}
    </div>
  );
}

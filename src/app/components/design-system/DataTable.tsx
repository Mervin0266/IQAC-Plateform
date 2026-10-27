import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface PaginationConfig {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  emptySubtitle?: string;
  emptyAction?: React.ReactNode;
  pagination?: PaginationConfig;
  className?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = 'No records found',
  emptySubtitle = 'Try adjusting your search query or filters to find what you are looking for.',
  emptyAction,
  pagination,
  className = '',
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className={`bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-xs ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  style={{ width: col.width }}
                  className={`py-3 px-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  } ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm text-slate-700">
            {loading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="py-3.5 px-4">
                      <div className="h-4 bg-slate-100 rounded w-4/5" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length} className="py-12 px-4 text-center">
                  <div className="max-w-sm mx-auto flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-1">
                      {emptyMessage}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                      {emptySubtitle}
                    </p>
                    {emptyAction}
                  </div>
                </td>
              </tr>
            ) : (
              // Data rows
              data.map((item, index) => (
                <tr
                  key={keyExtractor(item, index)}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-slate-50/80' : 'hover:bg-slate-50/50'
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`py-3.5 px-4 align-middle ${
                        col.align === 'right'
                          ? 'text-right tabular-nums'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {col.render
                        ? col.render(item, index)
                        : (item as Record<string, any>)[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div className="bg-slate-50/60 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <span>
              Page <strong className="font-semibold text-slate-900">{pagination.currentPage}</strong> of{' '}
              <strong className="font-semibold text-slate-900">{pagination.totalPages || 1}</strong>
              <span className="text-slate-400 ml-2">
                ({pagination.totalRecords} total records)
              </span>
            </span>

            {pagination.onPageSizeChange && pagination.pageSizeOptions && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Rows:</span>
                <select
                  value={pagination.pageSize || 10}
                  onChange={(e) => pagination.onPageSizeChange!(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#2f4692]"
                >
                  {pagination.pageSizeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.currentPage <= 1 || loading}
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage <= 1 || loading}
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 py-1 font-medium text-slate-800">
              {pagination.currentPage}
            </span>
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage >= pagination.totalPages || loading}
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => pagination.onPageChange(pagination.totalPages)}
              disabled={pagination.currentPage >= pagination.totalPages || loading}
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              aria-label="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

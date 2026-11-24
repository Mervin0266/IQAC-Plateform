import React from 'react';
import { useTableVirtualization, VirtualizationMode } from '../../hooks/useTableVirtualization';

export interface VirtualizedTableBodyProps<T> {
  /** The full array of items to render */
  items: T[];
  /** Ref to the scrollable container element (must have overflow-y-auto and a defined height/max-height) */
  parentRef: React.RefObject<HTMLDivElement | null>;
  /** Total number of table columns (used for spacer row colSpan) */
  colSpan: number;
  /** Estimated row height in pixels (default 48) */
  estimateRowHeight?: number;
  /** Overscan rows (default 8) */
  overscan?: number;
  /** Activation threshold (default 30 rows) */
  threshold?: number;
  /** Mode: 'auto' | 'enabled' | 'disabled' (default 'auto') */
  mode?: VirtualizationMode;
  /** Render prop for each row */
  renderRow: (item: T, index: number, isVirtual: boolean) => React.ReactNode;
  /** Optional empty state renderer */
  renderEmpty?: () => React.ReactNode;
  /** Key extractor */
  keyExtractor?: (item: T, index: number) => string | number;
  /** Optional className for <tbody> */
  className?: string;
}

/**
 * Reusable VirtualizedTableBody component using TanStack Virtual.
 * Uses spacer rows (top and bottom) inside native <tbody> to maintain accurate scroll geometry
 * and standard table column widths without breaking table border-collapse or alignment.
 */
export function VirtualizedTableBody<T>({
  items,
  parentRef,
  colSpan,
  estimateRowHeight = 48,
  overscan = 8,
  threshold = 30,
  mode = 'auto',
  renderRow,
  renderEmpty,
  keyExtractor,
  className = 'divide-y divide-[#E2E8F0] text-xs sm:text-[13px] text-slate-700',
}: VirtualizedTableBodyProps<T>) {
  const {
    isVirtual,
    paddingTop,
    paddingBottom,
    renderedItems,
  } = useTableVirtualization<T>({
    rows: items,
    parentRef,
    estimateRowHeight,
    overscan,
    threshold,
    mode,
    getItemKey: keyExtractor ? (idx) => keyExtractor(items[idx], idx) : undefined,
  });

  if (items.length === 0 && renderEmpty) {
    return (
      <tbody className={className}>
        {renderEmpty()}
      </tbody>
    );
  }

  return (
    <tbody className={className}>
      {isVirtual && paddingTop > 0 && (
        <tr style={{ height: `${paddingTop}px` }} aria-hidden="true" className="border-0 p-0 pointer-events-none">
          <td colSpan={colSpan} style={{ padding: 0, border: 0, height: `${paddingTop}px` }} />
        </tr>
      )}

      {renderedItems.map(({ item, index }) => (
        <React.Fragment key={keyExtractor ? keyExtractor(item, index) : index}>
          {renderRow(item, index, isVirtual)}
        </React.Fragment>
      ))}

      {isVirtual && paddingBottom > 0 && (
        <tr style={{ height: `${paddingBottom}px` }} aria-hidden="true" className="border-0 p-0 pointer-events-none">
          <td colSpan={colSpan} style={{ padding: 0, border: 0, height: `${paddingBottom}px` }} />
        </tr>
      )}
    </tbody>
  );
}

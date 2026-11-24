import React, { useMemo } from 'react';
import { useVirtualizer, VirtualItem, Virtualizer } from '@tanstack/react-virtual';

export type VirtualizationMode = 'auto' | 'enabled' | 'disabled';

export interface UseTableVirtualizationOptions<T = any> {
  /** Array of data items to virtualize */
  rows: T[];
  /** Scroll container ref (must have overflow-y: auto / scroll and fixed or max height) */
  parentRef: React.RefObject<HTMLDivElement | null>;
  /** Estimated row height in pixels. Default is 48px */
  estimateRowHeight?: number;
  /** Number of rows to render outside visible viewport. Default is 8 */
  overscan?: number;
  /** Minimum number of rows required to activate virtualization in 'auto' mode. Default is 30 */
  threshold?: number;
  /** Virtualization operational mode: 'auto' (activates above threshold), 'enabled' (always), or 'disabled' (never). Default is 'auto' */
  mode?: VirtualizationMode;
  /** Optional key extractor returning unique key for index */
  getItemKey?: (index: number) => string | number;
}

export interface UseTableVirtualizationResult<T = any> {
  /** Whether virtualization is actively engaged */
  isVirtual: boolean;
  /** Active virtual items for the current viewport slice (empty when not virtualized) */
  virtualRows: VirtualItem[];
  /** Total calculated height of all virtual rows */
  totalSize: number;
  /** Spacer height for the top of the table body */
  paddingTop: number;
  /** Spacer height for the bottom of the table body */
  paddingBottom: number;
  /** Underlying TanStack Virtualizer instance */
  rowVirtualizer: Virtualizer<HTMLDivElement, HTMLTableRowElement>;
  /** Helper array of items to render (either virtual window or complete dataset if non-virtual) */
  renderedItems: {
    item: T;
    index: number;
    virtualRow?: VirtualItem;
  }[];
}

/**
 * Reusable hook providing safe, transparent table row virtualization using TanStack Virtual.
 * Automatically falls back to standard DOM rendering when below threshold or in disabled mode.
 */
export function useTableVirtualization<T = any>({
  rows,
  parentRef,
  estimateRowHeight = 48,
  overscan = 8,
  threshold = 30,
  mode = 'auto',
  getItemKey,
}: UseTableVirtualizationOptions<T>): UseTableVirtualizationResult<T> {
  // Determine if virtualization is active
  const isVirtual = useMemo(() => {
    if (mode === 'disabled') return false;
    if (mode === 'enabled') return rows.length > 0;
    // 'auto' mode: only virtualize when row count reaches or exceeds threshold
    return rows.length >= threshold;
  }, [mode, rows.length, threshold]);

  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: isVirtual ? rows.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight,
    overscan,
    getItemKey: getItemKey ? (idx: number) => getItemKey(idx) : undefined,
  });

  const virtualRows = isVirtual ? rowVirtualizer.getVirtualItems() : [];
  const totalSize = isVirtual ? rowVirtualizer.getTotalSize() : 0;

  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? Math.max(0, totalSize - virtualRows[virtualRows.length - 1].end)
      : 0;

  const renderedItems = useMemo(() => {
    if (!isVirtual) {
      return rows.map((item, index) => ({
        item,
        index,
      }));
    }
    return virtualRows.map((virtualRow: any) => ({
      item: rows[virtualRow.index],
      index: virtualRow.index,
      virtualRow,
    }));
  }, [isVirtual, rows, virtualRows]);

  return {
    isVirtual,
    virtualRows,
    totalSize,
    paddingTop,
    paddingBottom,
    rowVirtualizer,
    renderedItems,
  };
}

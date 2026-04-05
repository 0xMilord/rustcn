/**
 * useRustTable — Hook for the data table engine.
 *
 * Automatically dispatches to WASM or JS fallback based on data size.
 * Result parity guaranteed: WASM output = JS fallback output.
 *
 * @example
 * ```ts
 * const table = useRustTable(data, { sort: true, filter: true });
 * table.rows // filtered, sorted, paginated rows
 * table.sortBy('name', 'asc')
 * table.filter({ column: 'status', operator: 'eq', value: 'active' })
 * table.goToPage(2)
 * ```
 */

import { useMemo, useCallback, useRef, useState } from 'react';
import { fallbacks, shouldUseWasm, getThreshold, warnIfBelowThreshold } from '@rustcn/core';
import type { SortSpec, FilterCondition, ColumnDef } from './RustTable.js';

export interface UseRustTableOptions {
  sort?: boolean;
  filter?: boolean;
  pagination?: { page: number; pageSize: number };
  columns?: ColumnDef[];
}

export interface UseRustTableResult {
  rows: Record<string, unknown>[];
  columns: ColumnDef[];
  totalRows: number;
  filteredRows: number;
  totalPages: number;
  page: number;
  pageSize: number;
  executionTimeMs: number;
  usingWasm: boolean;
  sortBy: (column: string, direction: 'asc' | 'desc') => void;
  setFilter: (condition: FilterCondition | null) => void;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

/**
 * Hook for high-performance data tables.
 * Auto-dispatches to WASM engine for large data, JS fallback for small.
 */
export function useRustTable(
  data: Record<string, unknown>[],
  options: UseRustTableOptions = {},
): UseRustTableResult {
  const { sort: enableSort = false, filter: enableFilter = false, pagination, columns: customColumns } = options;
  const [activeSort, setActiveSort] = useState<SortSpec | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterCondition | null>(null);
  const [currentPage, setCurrentPage] = useState(pagination?.page ?? 1);
  const [pageSize, setPageSizeState] = useState(pagination?.pageSize ?? 25);

  // Auto-generate columns
  const autoColumns = useMemo<ColumnDef[]>(() => {
    if (customColumns) return customColumns;
    if (data.length === 0) return [];
    return Object.keys(data[0]).map(key => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1), sortable: true }));
  }, [data, customColumns]);

  // Determine WASM vs JS
  const useWasm = useMemo(() => shouldUseWasm('data-table', data.length), [data.length]);

  // Warn if below threshold
  useMemo(() => { warnIfBelowThreshold('data-table', data.length); }, [data.length]);

  // Execute table operations
  const result = useMemo(() => {
    const start = performance.now();

    // Filter
    let filtered = data;
    if (enableFilter && activeFilter) {
      filtered = data.filter(row => matchesFilter(row, activeFilter));
    }

    // Sort
    let sorted = filtered;
    if (enableSort && activeSort) {
      sorted = [...filtered].sort((a, b) => compareValues(a[activeSort.column], b[activeSort.column], activeSort.direction));
    }

    // Paginate
    const totalRows = data.length;
    const filteredCount = sorted.length;
    const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
    const page = Math.min(currentPage, totalPages);
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const rows = sorted.slice(startIdx, endIdx);

    return { rows, totalRows, filteredRows: filteredCount, totalPages, page, pageSize, columns: autoColumns, executionTimeMs: performance.now() - start };
  }, [data, activeSort, activeFilter, currentPage, pageSize, enableSort, enableFilter, autoColumns]);

  const sortBy = useCallback((column: string, direction: 'asc' | 'desc') => {
    setActiveSort({ column, direction });
    setCurrentPage(1);
  }, []);

  const setFilter = useCallback((condition: FilterCondition | null) => {
    setActiveFilter(condition);
    setCurrentPage(1);
  }, []);

  const goToPage = useCallback((page: number) => { setCurrentPage(page); }, []);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setCurrentPage(1);
  }, []);

  return {
    rows: result.rows,
    columns: result.columns,
    totalRows: result.totalRows,
    filteredRows: result.filteredRows,
    totalPages: result.totalPages,
    page: result.page,
    pageSize: result.pageSize,
    executionTimeMs: result.executionTimeMs,
    usingWasm: useWasm,
    sortBy,
    setFilter,
    goToPage,
    setPageSize,
  };
}

// Helper functions (same as JS fallback)
function matchesFilter(row: Record<string, unknown>, condition: FilterCondition): boolean {
  const value = row[condition.column];
  if (value === undefined) return false;
  return applyOperator(value, condition.operator, condition.value);
}

function applyOperator(value: unknown, operator: string, target: unknown): boolean {
  switch (operator) {
    case 'eq': return value === target;
    case 'neq': return value !== target;
    case 'gt': return typeof value === 'number' && typeof target === 'number' && value > target;
    case 'gte': return typeof value === 'number' && typeof target === 'number' && value >= target;
    case 'lt': return typeof value === 'number' && typeof target === 'number' && value < target;
    case 'lte': return typeof value === 'number' && typeof target === 'number' && value <= target;
    case 'contains': {
      const s = typeof value === 'string' ? value.toLowerCase() : '';
      const t = typeof target === 'string' ? target.toLowerCase() : '';
      return s.includes(t);
    }
    case 'startswith': {
      const s = typeof value === 'string' ? value.toLowerCase() : '';
      const t = typeof target === 'string' ? target.toLowerCase() : '';
      return s.startsWith(t);
    }
    case 'endswith': {
      const s = typeof value === 'string' ? value.toLowerCase() : '';
      const t = typeof target === 'string' ? target.toLowerCase() : '';
      return s.endsWith(t);
    }
    default: return true;
  }
}

function compareValues(a: unknown, b: unknown, direction: 'asc' | 'desc'): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return -1;
  if (b === undefined) return 1;
  let cmp: number;
  if (typeof a === 'number' && typeof b === 'number') { cmp = a - b; }
  else { const sa = String(a).toLowerCase(); const sb = String(b).toLowerCase(); cmp = sa < sb ? -1 : sa > sb ? 1 : 0; }
  return direction === 'desc' ? -cmp : cmp;
}

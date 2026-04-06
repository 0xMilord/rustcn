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

import { useMemo, useCallback, useState, useEffect } from 'react';
import { fallbacks, shouldUseWasm, getThreshold, warnIfBelowThreshold } from '@rustcn/core';
import { wasm } from '@rustcn/core/wasm';
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

  // Result state (async from WASM or sync from JS)
  const [result, setResult] = useState<{
    rows: Record<string, unknown>[];
    totalRows: number;
    filteredRows: number;
    totalPages: number;
    page: number;
    pageSize: number;
    columns: ColumnDef[];
    executionTimeMs: number;
  } | null>(null);

  const [isWasm, setIsWasm] = useState(false);

  // Auto-generate columns
  const autoColumns = useMemo<ColumnDef[]>(() => {
    if (customColumns) return customColumns;
    if (data.length === 0) return [];
    return Object.keys(data[0]).map(key => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1), sortable: true }));
  }, [data, customColumns]);

  // Determine WASM vs JS
  const useWasm = useMemo(() => shouldUseWasm('data-table', data.length), [data.length]);

  // Warn if below threshold
  useEffect(() => {
    warnIfBelowThreshold('data-table', data.length);
  }, [data.length]);

  // Execute table operations
  useEffect(() => {
    let cancelled = false;

    async function execute() {
      const start = performance.now();

      // Prepare sort specs
      const sortSpecs: Array<{ column: string; direction: 'asc' | 'desc' }> = [];
      if (enableSort && activeSort) {
        sortSpecs.push(activeSort);
      }

      // Prepare filters
      const filters: FilterCondition[] = [];
      if (enableFilter && activeFilter) {
        filters.push(activeFilter);
      }

      // Prepare pagination
      const pag = { page: currentPage, pageSize };

      // Execute via WASM dispatcher (auto-routes to WASM or JS)
      const tableResult = await wasm.executeTable(data, autoColumns, sortSpecs, filters, pag);

      if (!cancelled) {
        setResult({
          rows: tableResult.rows,
          totalRows: tableResult.total_rows,
          filteredRows: tableResult.filtered_rows,
          totalPages: tableResult.total_pages,
          page: tableResult.page,
          pageSize: tableResult.page_size,
          columns: tableResult.columns,
          executionTimeMs: tableResult.execution_time_ms,
        });
        setIsWasm(useWasm);
      }
    }

    execute();

    return () => {
      cancelled = true;
    };
  }, [data, activeSort, activeFilter, currentPage, pageSize, enableSort, enableFilter, autoColumns, useWasm]);

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

  // Return loading state until first execution completes
  if (!result) {
    return {
      rows: [],
      columns: autoColumns,
      totalRows: data.length,
      filteredRows: data.length,
      totalPages: 1,
      page: 1,
      pageSize,
      executionTimeMs: 0,
      usingWasm: false,
      sortBy,
      setFilter,
      goToPage,
      setPageSize,
    };
  }

  return {
    rows: result.rows,
    columns: result.columns,
    totalRows: result.totalRows,
    filteredRows: result.filteredRows,
    totalPages: result.totalPages,
    page: result.page,
    pageSize: result.pageSize,
    executionTimeMs: result.executionTimeMs,
    usingWasm: isWasm,
    sortBy,
    setFilter,
    goToPage,
    setPageSize,
  };
}

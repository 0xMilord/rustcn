/**
 * Pure JS data table fallback.
 * Zero external dependencies. Implements sort, filter, paginate in JS.
 *
 * Result format matches the Rust engine output exactly.
 */

export interface FilterCondition {
  column: string;
  operator: string;
  value: unknown;
}

export interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
}

export interface TableResult {
  rows: Record<string, unknown>[];
  total_rows: number;
  filtered_rows: number;
  page: number;
  page_size: number;
  total_pages: number;
  columns: ColumnDef[];
  execution_time_ms: number;
}

export type SortDirection = 'asc' | 'desc';

/**
 * Execute table operations in pure JS.
 */
export function executeTable(
  rows: Record<string, unknown>[],
  columns: ColumnDef[],
  sortSpecs: Array<{ column: string; direction: SortDirection }>,
  filters: FilterCondition[],
  pagination: { page: number; pageSize: number } | null,
): TableResult {
  const start = performance.now();

  const totalRows = rows.length;

  // Filter
  const filtered = filters.length === 0
    ? [...rows]
    : rows.filter(row => filters.every(f => matchesFilter(row, f)));

  const filteredCount = filtered.length;

  // Sort
  const sorted = sortSpecs.length === 0
    ? filtered
    : [...filtered].sort((a, b) => {
        for (const spec of sortSpecs) {
          const cmp = compareValues(a[spec.column], b[spec.column], spec.direction);
          if (cmp !== 0) return cmp;
        }
        return 0;
      });

  // Paginate
  let page = 1;
  let pageSize = sorted.length;
  let totalPages = 1;
  let pagedRows = sorted;

  if (pagination) {
    pageSize = pagination.pageSize;
    totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    page = Math.min(pagination.page, totalPages);
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    pagedRows = sorted.slice(startIdx, endIdx);
  }

  const executionTimeMs = performance.now() - start;

  return {
    rows: pagedRows,
    total_rows: totalRows,
    filtered_rows: filteredCount,
    page,
    page_size: pageSize,
    total_pages: totalPages,
    columns,
    execution_time_ms: executionTimeMs,
  };
}

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

function compareValues(
  a: unknown,
  b: unknown,
  direction: SortDirection,
): number {
  if (a === undefined && b === undefined) return 0;
  if (a === undefined) return -1;
  if (b === undefined) return 1;

  let cmp: number;
  if (typeof a === 'number' && typeof b === 'number') {
    cmp = a - b;
  } else {
    const sa = String(a).toLowerCase();
    const sb = String(b).toLowerCase();
    cmp = sa < sb ? -1 : sa > sb ? 1 : 0;
  }

  return direction === 'desc' ? -cmp : cmp;
}

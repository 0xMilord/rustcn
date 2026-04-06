/**
 * WASM wrapper for the data table engine.
 *
 * Provides a clean TypeScript interface over the wasm-bindgen exports.
 */

import { getWasmModule } from './singleton.js';
import type { TableResult, ColumnDef, FilterCondition, SortDirection } from '../fallbacks/table.js';

/**
 * WASM-backed data table.
 *
 * Uses builder pattern: `new WasmTable(rows, cols).sortBy(...).filter(...).paginate(...).execute()`
 *
 * @example
 * ```ts
 * const table = new WasmTable(rows, columns);
 * const result = await table
 *   .sortBy('name', 'asc')
 *   .filter([{ column: 'status', operator: 'eq', value: 'active' }])
 *   .paginate(1, 25)
 *   .execute();
 * ```
 */
export class WasmTable {
  private rowsJson: string;
  private columnsJson: string;
  private sortSpecs: Array<{ column: string; direction: SortDirection }> = [];
  private filters: FilterCondition[] = [];
  private pagination: { page: number; pageSize: number } | null = null;

  constructor(rows: Record<string, unknown>[], columns?: ColumnDef[]) {
    this.rowsJson = JSON.stringify(rows);
    this.columnsJson = JSON.stringify(columns ?? this.autoGenerateColumns(rows));
  }

  /**
   * Add a sort specification. Chainable.
   */
  sortBy(column: string, direction: SortDirection = 'asc'): this {
    this.sortSpecs.push({ column, direction });
    return this;
  }

  /**
   * Add filter conditions. Chainable.
   */
  filter(filters: FilterCondition[]): this {
    this.filters = filters;
    return this;
  }

  /**
   * Set pagination. Chainable.
   */
  paginate(page: number, pageSize: number): this {
    this.pagination = { page, pageSize };
    return this;
  }

  /**
   * Execute all operations and return the result.
   */
  async execute(): Promise<TableResult> {
    const handle = await getWasmModule('data-table');
    const { DataTable } = handle.exports as any;

    let table = new DataTable(this.rowsJson, this.columnsJson);

    // Apply sorts (reverse order for stable multi-sort)
    for (let i = this.sortSpecs.length - 1; i >= 0; i--) {
      const spec = this.sortSpecs[i];
      table = table.sortBy(spec.column, spec.direction);
    }

    // Apply filters
    if (this.filters.length > 0) {
      table = table.filter(JSON.stringify(this.filters));
    }

    // Apply pagination
    if (this.pagination) {
      table = table.paginate(this.pagination.page, this.pagination.pageSize);
    }

    // Execute
    const resultJson = table.execute();
    const result = JSON.parse(resultJson) as TableResult;

    table.free?.();
    return result;
  }

  /**
   * Get the row count (for threshold checking).
   */
  rowCount(): number {
    try {
      const rows = JSON.parse(this.rowsJson) as unknown[];
      return rows.length;
    } catch {
      return 0;
    }
  }

  /**
   * Auto-generate column definitions from the first row.
   */
  private autoGenerateColumns(rows: Record<string, unknown>[]): ColumnDef[] {
    if (rows.length === 0) return [];
    const firstRow = rows[0];
    return Object.keys(firstRow).map((key) => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1),
      sortable: true,
    }));
  }
}

/**
 * WASM loader — the critical glue connecting WASM engines to React components.
 *
 * This is the missing piece that makes the "15x faster" claim real.
 *
 * # Mental model
 * 1. Component calls engine (e.g., validate, executeTable, renderMarkdown)
 * 2. Loader checks: WASM supported? Data above threshold?
 * 3. If yes → call WASM engine (fast path)
 * 4. If no → call JS fallback (safe path)
 * 5. Result parity guaranteed either way
 */

import { detectRuntime } from '../detection.js';
import { shouldUseWasm, warnIfBelowThreshold, type EngineType } from '../threshold.js';
import { getWasmModule } from './singleton.js';
import * as fallbacks from '../fallbacks/index.js';

// Re-export types needed by components
export type { ValidationResult, FieldRule, FieldValidationResult } from '../fallbacks/validator.js';
export type { TableResult, FilterCondition, ColumnDef, SortDirection } from '../fallbacks/table.js';
export type { MarkdownOptions } from '../fallbacks/markdown.js';

/**
 * Validate form data using WASM engine or JS fallback.
 *
 * @param schemaJson - JSON schema string
 * @param dataJson - JSON data string
 * @returns Validation result (same format from WASM or JS)
 */
export async function validate(
  schemaJson: string,
  dataJson: string,
): Promise<fallbacks.ValidationResult> {
  const schema = JSON.parse(schemaJson);
  const data = JSON.parse(dataJson);
  const fieldCount = Object.keys(schema).length;

  // Warn if below threshold
  warnIfBelowThreshold('form-validator', fieldCount);

  // Decide: WASM or JS?
  if (useWasm('form-validator', fieldCount)) {
    return validateWasm(schemaJson, dataJson);
  }

  // JS fallback
  return fallbacks.validate(schemaJson, dataJson);
}

/**
 * Validate a single field.
 */
export async function validateField(
  fieldName: string,
  fieldSchema: fallbacks.FieldRule,
  value: unknown,
): Promise<string[]> {
  const schema = { [fieldName]: fieldSchema };
  const data = { [fieldName]: value };

  warnIfBelowThreshold('form-validator', 1);

  if (useWasm('form-validator', 1)) {
    const schemaJson = JSON.stringify({ fields: schema });
    const dataJson = JSON.stringify({ [fieldName]: value });
    const result = await validateWasm(schemaJson, dataJson);
    return result.errors[fieldName] ?? [];
  }

  return fallbacks.validateField(fieldName, fieldSchema as any, value);
}

/**
 * Execute table operations using WASM engine or JS fallback.
 *
 * @param rows - Table data
 * @param columns - Column definitions
 * @param sortSpecs - Sort specifications
 * @param filters - Filter conditions
 * @param pagination - Pagination settings (null for no pagination)
 * @returns Table result (same format from WASM or JS)
 */
export async function executeTable(
  rows: Record<string, unknown>[],
  columns: fallbacks.ColumnDef[],
  sortSpecs: Array<{ column: string; direction: fallbacks.SortDirection }>,
  filters: fallbacks.FilterCondition[],
  pagination: { page: number; pageSize: number } | null,
): Promise<fallbacks.TableResult> {
  const rowCount = rows.length;

  // Warn if below threshold
  warnIfBelowThreshold('data-table', rowCount);

  // Decide: WASM or JS?
  if (useWasm('data-table', rowCount)) {
    return executeTableWasm(rows, columns, sortSpecs, filters, pagination);
  }

  // JS fallback
  return fallbacks.executeTable(rows, columns, sortSpecs, filters, pagination);
}

/**
 * Render markdown using WASM engine or JS fallback.
 *
 * @param markdown - Markdown text
 * @param options - Render options (optional)
 * @returns HTML string
 */
export async function renderMarkdown(
  markdown: string,
  options?: fallbacks.MarkdownOptions,
): Promise<string> {
  const byteCount = new Blob([markdown]).size;

  // Warn if below threshold
  warnIfBelowThreshold('markdown', byteCount);

  // Decide: WASM or JS?
  if (useWasm('markdown', byteCount)) {
    const optionsJson = options ? JSON.stringify(options) : undefined;
    return renderMarkdownWasm(markdown, optionsJson);
  }

  // JS fallback — use the full parser matching Rust engine output
  return fallbacks.renderMarkdown(markdown, options);
}

// ─── WASM Implementation ───────────────────────────────────────────────────

/**
 * Call the WASM validator engine.
 */
async function validateWasm(
  schemaJson: string,
  dataJson: string,
): Promise<fallbacks.ValidationResult> {
  const handle = await getWasmModule('form-validator');
  const { Validator } = handle.exports as any;

  // Create validator instance
  const validator = new Validator(schemaJson);

  // Validate
  const resultJson = validator.validate(dataJson);
  const result = JSON.parse(resultJson) as fallbacks.ValidationResult;

  // Clean up (WASM memory management)
  validator.free?.();

  return result;
}

/**
 * Call the WASM table engine.
 */
async function executeTableWasm(
  rows: Record<string, unknown>[],
  columns: fallbacks.ColumnDef[],
  sortSpecs: Array<{ column: string; direction: fallbacks.SortDirection }>,
  filters: fallbacks.FilterCondition[],
  pagination: { page: number; pageSize: number } | null,
): Promise<fallbacks.TableResult> {
  const handle = await getWasmModule('data-table');
  const { DataTable } = handle.exports as any;

  const rowsJson = JSON.stringify(rows);
  const columnsJson = JSON.stringify(columns);

  // Create table instance
  let table = new DataTable(rowsJson, columnsJson);

  // Apply sorts
  for (const spec of sortSpecs) {
    table = table.sortBy(spec.column, spec.direction);
  }

  // Apply filters
  if (filters.length > 0) {
    table = table.filter(JSON.stringify(filters));
  }

  // Apply pagination
  if (pagination) {
    table = table.paginate(pagination.page, pagination.pageSize);
  }

  // Execute
  const resultJson = table.execute();
  const result = JSON.parse(resultJson) as fallbacks.TableResult;

  // Clean up
  table.free?.();

  return result;
}

/**
 * Call the WASM markdown engine.
 */
async function renderMarkdownWasm(
  markdown: string,
  optionsJson?: string,
): Promise<string> {
  const handle = await getWasmModule('markdown');
  const { MarkdownParser } = handle.exports as any;

  const parser = new MarkdownParser();
  const html = optionsJson
    ? parser.render(markdown, optionsJson)
    : parser.render(markdown);

  // Clean up
  parser.free?.();

  return html;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Decide whether to use WASM or JS fallback.
 *
 * Checks:
 * 1. Is WASM supported in this environment?
 * 2. Is data size above threshold?
 * 3. Is this a low-memory device?
 */
function useWasm(engine: EngineType, dataSize: number): boolean {
  const runtime = detectRuntime();

  // No WASM support
  if (!runtime.wasmSupported) return false;

  // Low memory device
  if (runtime.isLowMemory) return false;

  // SSR/Edge — use JS fallback unless we have Node WASM runtime
  if (runtime.isSSR || runtime.isEdge) {
    // TODO: Add Node.js WASM runtime support
    return false;
  }

  // Data size check
  return shouldUseWasm(engine, dataSize);
}

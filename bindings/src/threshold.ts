/**
 * Serialization cost thresholds.
 *
 * For small datasets, JS fallback is faster than WASM because
 * serialization overhead (JS -> WASM memory -> JS) dominates execution time.
 *
 * These thresholds are based on empirical benchmarking:
 * - Form validator: needs 10+ fields
 * - Data table: needs 1000+ rows
 * - Markdown parser: needs 10KB+
 */

export type EngineType = 'form-validator' | 'data-table' | 'markdown';

/** Minimum data size at which WASM becomes faster than JS */
export const THRESHOLDS: Record<EngineType, number> = {
  'form-validator': 10,    // 10+ fields
  'data-table': 1000,       // 1000+ rows
  'markdown': 10_240,       // 10KB+
} as const;

/**
 * Check whether a given data size justifies WASM execution.
 *
 * @param engine - The engine type being used
 * @param dataSize - The size of the data (field count, row count, or byte count)
 * @returns true if WASM execution will be faster
 */
export function shouldUseWasm(engine: EngineType, dataSize: number): boolean {
  const threshold = THRESHOLDS[engine];
  return dataSize >= threshold;
}

/**
 * Get the threshold for a given engine type.
 */
export function getThreshold(engine: EngineType): number {
  return THRESHOLDS[engine];
}

/**
 * Log a warning if data size is below 50% of threshold.
 * This helps developers understand when they're misusing the tool.
 */
export function warnIfBelowThreshold(engine: EngineType, dataSize: number): void {
  const threshold = THRESHOLDS[engine];
  if (dataSize < threshold * 0.5) {
    console.warn(
      `[rustcn] Data size (${dataSize}) is below 50% of WASM threshold (${threshold}) for ${engine}. ` +
      `JS fallback would be faster. Consider using plain JavaScript instead.`
    );
  }
}

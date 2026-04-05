/**
 * WASM support detection and runtime environment checks.
 *
 * Determines whether the current environment can and should use WASM engines,
 * or whether the JS fallback should be used instead.
 */

export interface RuntimeInfo {
  /** Whether WebAssembly is supported */
  wasmSupported: boolean;
  /** Estimated device memory in GB (if available) */
  deviceMemory: number | undefined;
  /** Whether this is a server-side rendering environment */
  isSSR: boolean;
  /** Whether this is an Edge runtime */
  isEdge: boolean;
  /** Whether this is a low-memory device (< 2GB) */
  isLowMemory: boolean;
}

let _cachedRuntimeInfo: RuntimeInfo | null = null;

/**
 * Detect the current runtime environment.
 * Results are cached for performance.
 */
export function detectRuntime(): RuntimeInfo {
  if (_cachedRuntimeInfo) return _cachedRuntimeInfo;

  const wasmSupported = typeof WebAssembly !== 'undefined'
    && typeof WebAssembly.instantiate !== 'undefined';

  const isSSR = typeof window === 'undefined' && typeof process !== 'undefined';
  const isEdge = typeof EdgeRuntime !== 'undefined'
    || (typeof process !== 'undefined' && !!process.env.VERCEL_EDGE);

  // @ts-expect-error deviceMemory is not in all TS lib definitions
  const deviceMemory: number | undefined = typeof navigator !== 'undefined'
    ? (navigator as { deviceMemory?: number }).deviceMemory
    : undefined;

  const isLowMemory = deviceMemory !== undefined && deviceMemory < 2;

  _cachedRuntimeInfo = {
    wasmSupported,
    deviceMemory,
    isSSR,
    isEdge,
    isLowMemory,
  };

  return _cachedRuntimeInfo;
}

/**
 * Reset the cached runtime info. Useful for testing.
 */
export function resetRuntimeInfo(): void {
  _cachedRuntimeInfo = null;
}

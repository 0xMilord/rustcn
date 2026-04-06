/**
 * WASM singleton manager.
 *
 * Loads WASM modules once and reuses them across calls.
 * Implements the singleton pattern documented in ARCHITECTURE.md.
 *
 * # Mental model
 * 1. First call → load WASM module (~50ms, cached forever)
 * 2. Subsequent calls → reuse loaded module (~0ms)
 * 3. No re-init per render
 */

export interface WasmModuleHandle {
  /** The instantiated WASM module */
  instance: WebAssembly.WebAssemblyInstantiatedSource;
  /** Exports from the WASM module */
  exports: Record<string, WebAssembly.ExportValue>;
  /** When the module was loaded (for debugging) */
  loadedAt: number;
}

type ModuleName = 'form-validator' | 'data-table' | 'markdown';

/** Cache of loaded WASM modules */
const _moduleCache = new Map<ModuleName, WasmModuleHandle>();

/** Promise cache for in-flight loads (prevents race conditions) */
const _loadPromises = new Map<ModuleName, Promise<WasmModuleHandle>>();

/**
 * Get or load a WASM module singleton.
 *
 * @param moduleName - Which engine to load
 * @returns Handle to the loaded WASM module
 */
export async function getWasmModule(moduleName: ModuleName): Promise<WasmModuleHandle> {
  // Return cached instance if available
  const cached = _moduleCache.get(moduleName);
  if (cached) return cached;

  // If already loading, return the existing promise
  const existingPromise = _loadPromises.get(moduleName);
  if (existingPromise) return existingPromise;

  // Start loading
  const loadPromise = loadWasmModule(moduleName);
  _loadPromises.set(moduleName, loadPromise);

  try {
    const handle = await loadPromise;
    _moduleCache.set(moduleName, handle);
    return handle;
  } finally {
    _loadPromises.delete(moduleName);
  }
}

/**
 * Actually load the WASM module from the bundled .wasm file.
 */
async function loadWasmModule(moduleName: ModuleName): Promise<WasmModuleHandle> {
  const startTime = performance.now();

  // Determine the WASM file path (bundled with the package)
  const wasmUrl = getWasmUrl(moduleName);

  // Try streaming instantiation (faster for larger modules)
  let instance: WebAssembly.WebAssemblyInstantiatedSource;

  if (typeof WebAssembly.instantiateStreaming === 'function' && typeof fetch === 'function') {
    instance = await WebAssembly.instantiateStreaming(fetch(wasmUrl));
  } else {
    // Fallback: fetch as ArrayBuffer, then instantiate
    const response = await fetch(wasmUrl);
    const buffer = await response.arrayBuffer();
    instance = await WebAssembly.instantiate(buffer);
  }

  const loadTime = performance.now() - startTime;

  // Log loading time (useful for DevTools later)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.debug(
      `[rustcn] WASM module "${moduleName}" loaded in ${loadTime.toFixed(1)}ms`,
    );
  }

  return {
    instance,
    exports: instance.instance.exports as Record<string, WebAssembly.ExportValue>,
    loadedAt: Date.now(),
  };
}

/**
 * Get the URL to a WASM file based on module name.
 *
 * WASM files are bundled alongside the JS in the dist/ directory.
 */
function getWasmUrl(moduleName: ModuleName): string {
  const fileName = `rustcn_engine_${moduleName.replace('-', '_')}_bg.wasm`;

  // In development, WASM files are served from the package dist/
  // In production, they're bundled with the app
  // This uses import.meta.url for ESM compatibility
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    return new URL(fileName, import.meta.url).href;
  }

  // Fallback for older bundlers
  return `/node_modules/@rustcn/core/dist/${fileName}`;
}

/**
 * Clear the WASM module cache.
 * Useful for testing or hot-reload scenarios.
 */
export function clearWasmCache(): void {
  _moduleCache.clear();
  _loadPromises.clear();
}

/**
 * Check if a module is already loaded.
 */
export function isModuleLoaded(moduleName: ModuleName): boolean {
  return _moduleCache.has(moduleName);
}

/**
 * Get cache statistics (for DevTools).
 */
export function getCacheStats(): Array<{ module: ModuleName; loaded: boolean; ageMs?: number }> {
  const modules: ModuleName[] = ['form-validator', 'data-table', 'markdown'];
  return modules.map((name) => {
    const handle = _moduleCache.get(name);
    return {
      module: name,
      loaded: !!handle,
      ageMs: handle ? Date.now() - handle.loadedAt : undefined,
    };
  });
}

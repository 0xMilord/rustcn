/**
 * WASM engine bindings — the critical glue connecting WASM engines to React components.
 *
 * This is the missing piece that makes the "15x faster" claim real.
 */

// Singleton loader
export {
  getWasmModule,
  clearWasmCache,
  isModuleLoaded,
  getCacheStats,
  type WasmModuleHandle,
} from './singleton.js';

// High-level dispatcher functions (auto WASM/JS routing)
export {
  validate,
  validateField,
  executeTable,
  renderMarkdown,
} from './loader.js';

// WASM-specific wrappers (for direct WASM usage)
export { WasmValidator } from './validator-wasm.js';
export { WasmTable } from './table-wasm.js';
export { WasmMarkdown, type MarkdownOptions } from './markdown-wasm.js';

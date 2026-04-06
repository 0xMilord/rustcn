/**
 * @rustcn/core — Core bindings for rustcn WASM engines.
 *
 * 3-line mental model:
 * 1. Import the engine
 * 2. It auto-chooses Rust or JS based on your data
 * 3. You get faster UI
 *
 * Everything else is optional depth.
 */

export { detectRuntime, resetRuntimeInfo, type RuntimeInfo } from './detection.js';
export { shouldUseWasm, getThreshold, warnIfBelowThreshold, type EngineType, THRESHOLDS } from './threshold.js';
export * as fallbacks from './fallbacks/index.js';

// WASM engine bindings — the critical glue
export * as wasm from './wasm/index.js';

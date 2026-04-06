import { describe, it, expect, afterEach } from 'vitest';
import { detectRuntime, resetRuntimeInfo } from '../detection.js';

describe('detection', () => {
  afterEach(() => { resetRuntimeInfo(); });

  it('detectRuntime returns cached result on second call', () => {
    const first = detectRuntime();
    const second = detectRuntime();
    expect(first).toBe(second); // Same reference (cached)
  });

  it('resetRuntimeInfo clears cache', () => {
    const first = detectRuntime();
    resetRuntimeInfo();
    const second = detectRuntime();
    expect(first).not.toBe(second); // Different reference after reset
  });
});

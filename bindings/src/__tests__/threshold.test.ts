import { describe, it, expect } from 'vitest';
import { shouldUseWasm, getThreshold, warnIfBelowThreshold, THRESHOLDS } from '../threshold.js';

describe('threshold', () => {
  it('shouldUseWasm returns correct values', () => {
    expect(shouldUseWasm('form-validator', 15)).toBe(true);
    expect(shouldUseWasm('form-validator', 5)).toBe(false);
    expect(shouldUseWasm('data-table', 2000)).toBe(true);
    expect(shouldUseWasm('data-table', 500)).toBe(false);
    expect(shouldUseWasm('markdown', 20000)).toBe(true);
    expect(shouldUseWasm('markdown', 5000)).toBe(false);
  });

  it('getThreshold returns correct values', () => {
    expect(getThreshold('form-validator')).toBe(10);
    expect(getThreshold('data-table')).toBe(1000);
    expect(getThreshold('markdown')).toBe(10240);
  });

  it('warnIfBelowThreshold logs for small data', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnIfBelowThreshold('form-validator', 3);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('warnIfBelowThreshold does not log for large data', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnIfBelowThreshold('form-validator', 15);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('THRESHOLDS constant is correct', () => {
    expect(THRESHOLDS).toEqual({
      'form-validator': 10,
      'data-table': 1000,
      'markdown': 10240,
    });
  });
});

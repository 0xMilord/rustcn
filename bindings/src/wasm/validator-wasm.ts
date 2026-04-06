/**
 * WASM wrapper for the form validator engine.
 *
 * Provides a clean TypeScript interface over the wasm-bindgen exports.
 */

import { getWasmModule } from './singleton.js';
import type { ValidationResult, FieldRule } from '../fallbacks/validator.js';

/**
 * WASM-backed form validator.
 *
 * @example
 * ```ts
 * const validator = new WasmValidator(schema);
 * const result = await validator.validate(data);
 * ```
 */
export class WasmValidator {
  private schemaJson: string;

  constructor(schema: Record<string, FieldRule> | string) {
    this.schemaJson = typeof schema === 'string'
      ? schema
      : JSON.stringify({ fields: schema });
  }

  /**
   * Validate all fields.
   */
  async validate(data: Record<string, unknown> | string): Promise<ValidationResult> {
    const handle = await getWasmModule('form-validator');
    const { Validator } = handle.exports as any;

    const validator = new Validator(this.schemaJson);
    const dataJson = typeof data === 'string' ? data : JSON.stringify(data);
    const resultJson = validator.validate(dataJson);
    const result = JSON.parse(resultJson) as ValidationResult;

    validator.free?.();
    return result;
  }

  /**
   * Validate a single field.
   */
  async validateField(fieldName: string, value: unknown): Promise<string[]> {
    const handle = await getWasmModule('form-validator');
    const { Validator } = handle.exports as any;

    const validator = new Validator(this.schemaJson);
    const valueJson = typeof value === 'string' ? JSON.stringify(value) : JSON.stringify(value);
    const resultJson = validator.validateField(fieldName, valueJson);
    const result = JSON.parse(resultJson) as { valid: boolean; errors?: string[] };

    validator.free?.();
    return result.errors ?? [];
  }

  /**
   * Get the field count (for threshold checking).
   */
  async fieldCount(): Promise<number> {
    const handle = await getWasmModule('form-validator');
    const { Validator } = handle.exports as any;

    const validator = new Validator(this.schemaJson);
    const count = validator.fieldCount();

    validator.free?.();
    return count;
  }
}

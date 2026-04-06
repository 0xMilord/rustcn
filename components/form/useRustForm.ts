/**
 * useRustForm — Hook for form validation engine.
 *
 * Auto-dispatches to WASM or JS fallback based on field count.
 * Result parity guaranteed.
 *
 * @example
 * ```ts
 * const form = useRustForm(schema, { email: '', name: '' });
 * form.setValue('email', 'test@test.com');
 * form.validateField('email'); // []
 * form.validate(); // true
 * ```
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import { fallbacks, shouldUseWasm, warnIfBelowThreshold } from '@rustcn/core';
import { wasm } from '@rustcn/core/wasm';

export interface FieldSchema {
  required?: boolean;
  field_type?: 'string' | 'email' | 'number' | 'boolean';
  rules?: Array<Record<string, unknown>>;
  error_message?: string | null;
}

export type Schema = Record<string, FieldSchema>;

export interface UseRustFormResult {
  values: Record<string, unknown>;
  errors: Record<string, string[]>;
  valid: boolean;
  fieldCount: number;
  validationTimeMs: number;
  usingWasm: boolean;
  setValue: (name: string, value: unknown) => void;
  validate: () => Promise<boolean>;
  validateField: (name: string) => Promise<string[]>;
  reset: () => void;
}

export function useRustForm(schema: Schema, defaultValues?: Record<string, unknown>): UseRustFormResult {
  const [values, setValues] = useState<Record<string, unknown>>(defaultValues ?? {});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [validationTimeMs, setValidationTimeMs] = useState(0);
  const [isWasm, setIsWasm] = useState(false);

  const fieldCount = Object.keys(schema).length;
  const useWasm = useMemo(() => shouldUseWasm('form-validator', fieldCount), [schema, fieldCount]);

  useEffect(() => {
    warnIfBelowThreshold('form-validator', fieldCount);
  }, [fieldCount]);

  const validateField = useCallback(async (name: string): Promise<string[]> => {
    const fieldSchema = schema[name];
    if (!fieldSchema) return [];
    const value = values[name];

    // Use WASM dispatcher
    const errs = await wasm.validateField(name, fieldSchema, value);

    setErrors(prev => {
      const next = { ...prev };
      if (errs.length > 0) {
        next[name] = errs;
      } else {
        delete next[name];
      }
      return next;
    });

    return errs;
  }, [schema, values]);

  const validate = useCallback(async (): Promise<boolean> => {
    const schemaJson = JSON.stringify({ fields: schema });
    const dataJson = JSON.stringify(values);

    // Use WASM dispatcher (auto-routes to WASM or JS)
    const result = await wasm.validate(schemaJson, dataJson);

    setErrors(result.errors);
    setTouched(Object.fromEntries(Object.keys(schema).map(name => [name, true])));
    setValidationTimeMs(result.validation_time_ms);
    setIsWasm(useWasm);

    return result.valid;
  }, [schema, values, useWasm]);

  // Live validation on value change
  useEffect(() => {
    if (Object.keys(touched).length === 0) return;

    let cancelled = false;

    async function revalidate() {
      const schemaJson = JSON.stringify({ fields: schema });
      const dataJson = JSON.stringify(values);
      const result = await wasm.validate(schemaJson, dataJson);

      if (!cancelled) {
        setErrors(result.errors);
        setValidationTimeMs(result.validation_time_ms);
        setIsWasm(useWasm);
      }
    }

    revalidate();

    return () => {
      cancelled = true;
    };
  }, [values, schema, touched, useWasm]);

  const setValue = useCallback((name: string, value: unknown) => {
    setValues(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const reset = useCallback(() => {
    setValues(defaultValues ?? {});
    setErrors({});
    setTouched({});
    setValidationTimeMs(0);
  }, [defaultValues]);

  return {
    values,
    errors,
    valid: Object.keys(errors).length === 0,
    fieldCount,
    validationTimeMs,
    usingWasm: isWasm,
    setValue,
    validate,
    validateField,
    reset,
  };
}

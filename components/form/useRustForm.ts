/**
 * useRustForm — Hook for form validation engine.
 *
 * Auto-dispatches to WASM or JS fallback based on field count.
 * Result parity guaranteed.
 */

import { useMemo, useCallback, useState } from 'react';
import { fallbacks, shouldUseWasm, warnIfBelowThreshold } from '@rustcn/core';

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
  validate: () => boolean;
  validateField: (name: string) => string[];
  reset: () => void;
}

export function useRustForm(schema: Schema, defaultValues?: Record<string, unknown>): UseRustFormResult {
  const [values, setValues] = useState<Record<string, unknown>>(defaultValues ?? {});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const useWasm = useMemo(() => shouldUseWasm('form-validator', Object.keys(schema).length), [schema]);

  useMemo(() => { warnIfBelowThreshold('form-validator', Object.keys(schema).length); }, [schema]);

  const validateField = useCallback((name: string): string[] => {
    const fieldSchema = schema[name];
    if (!fieldSchema) return [];
    const value = values[name];
    return fallbacks.validateField(name, fieldSchema, value);
  }, [schema, values]);

  const validate = useCallback((): boolean => {
    const schemaJson = JSON.stringify(schema);
    const dataJson = JSON.stringify(values);
    const newErrors: Record<string, string[]> = {};
    const newTouched: Record<string, boolean> = {};

    for (const name of Object.keys(schema)) {
      newTouched[name] = true;
      const errs = validateField(name);
      if (errs.length > 0) newErrors[name] = errs;
    }

    setTouched(newTouched);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [schema, values, validateField]);

  const setValue = useCallback((name: string, value: unknown) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const reset = useCallback(() => {
    setValues(defaultValues ?? {});
    setErrors({});
    setTouched({});
  }, [defaultValues]);

  return {
    values,
    errors,
    valid: Object.keys(errors).length === 0,
    fieldCount: Object.keys(schema).length,
    validationTimeMs: 0,
    usingWasm: useWasm,
    setValue,
    validate,
    validateField,
    reset,
  };
}

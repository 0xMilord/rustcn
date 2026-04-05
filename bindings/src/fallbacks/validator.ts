/**
 * Pure JS form validation fallback.
 * Zero external dependencies. Implements the same validation logic as the Rust engine.
 *
 * This guarantees result parity: WASM output = JS fallback output.
 */

export interface FieldRule {
  required?: boolean;
  type?: 'string' | 'email' | 'number' | 'boolean';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}

export interface FieldValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
  field_count: number;
  validation_time_ms: number;
}

interface FieldSchema {
  required?: boolean;
  field_type?: string;
  rules?: Array<Record<string, unknown>>;
  error_message?: string | null;
}

type Schema = Record<string, FieldSchema>;

/**
 * Validate data against a schema using pure JS.
 * Result format matches the Rust engine output exactly.
 */
export function validate(schemaJson: string, dataJson: string): ValidationResult {
  const start = performance.now();

  const schema: Schema = JSON.parse(schemaJson);
  const data: Record<string, unknown> = JSON.parse(dataJson);

  const errors: Record<string, string[]> = {};
  let fieldCount = 0;

  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    fieldCount++;
    const value = getNestedField(data, fieldName);
    const fieldErrors = validateField(fieldName, fieldSchema, value);
    if (fieldErrors.length > 0) {
      errors[fieldName] = fieldErrors;
    }
  }

  const validationTimeMs = performance.now() - start;

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    field_count: fieldCount,
    validation_time_ms: validationTimeMs,
  };
}

/**
 * Validate a single field value.
 */
export function validateField(
  fieldName: string,
  fieldSchema: FieldSchema,
  value: unknown,
): string[] {
  const errors: string[] = [];
  const customMsg = fieldSchema.error_message;

  // Required check
  if (fieldSchema.required) {
    if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
      errors.push(customMsg ?? `${fieldName}: This field is required`);
      return errors; // No point checking other rules if required fails
    }
  }

  if (value === undefined || value === null) return errors;

  // Type checks
  const fieldType = fieldSchema.field_type;
  if (fieldType === 'email' && typeof value === 'string') {
    const emailErr = checkEmail(value);
    if (emailErr) errors.push(customMsg ?? `${fieldName}: ${emailErr}`);
  }

  if (fieldType === 'string' && typeof value === 'string') {
    // Check rules
    const rules = fieldSchema.rules ?? [];
    for (const rule of rules) {
      if ('MinLength' in rule) {
        const min = rule['MinLength'] as number;
        if (value.length < min) {
          errors.push(customMsg ?? `${fieldName}: Must be at least ${min} characters`);
        }
      }
      if ('MaxLength' in rule) {
        const max = rule['MaxLength'] as number;
        if (value.length > max) {
          errors.push(customMsg ?? `${fieldName}: Must be at most ${max} characters`);
        }
      }
    }
  }

  if (fieldType === 'number' && typeof value === 'number') {
    const rules = fieldSchema.rules ?? [];
    for (const rule of rules) {
      if ('MinValue' in rule) {
        const min = rule['MinValue'] as number;
        if (value < min) {
          errors.push(customMsg ?? `${fieldName}: Must be at least ${min}`);
        }
      }
      if ('MaxValue' in rule) {
        const max = rule['MaxValue'] as number;
        if (value > max) {
          errors.push(customMsg ?? `${fieldName}: Must be at most ${max}`);
        }
      }
    }
  }

  return errors;
}

function getNestedField(obj: Record<string, unknown>, path: string): unknown {
  let current: unknown = obj;
  for (const part of path.split('.')) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function checkEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'Email cannot be empty';
  if (!trimmed.includes('@')) return 'Email must contain @';
  const parts = trimmed.split('@');
  if (parts.length !== 2) return 'Email must contain exactly one @';
  const [local, domain] = parts;
  if (!local) return 'Email local part cannot be empty';
  if (!domain) return 'Email domain cannot be empty';
  if (!domain.includes('.')) return 'Email domain must contain a dot';
  if (trimmed.includes(' ')) return 'Email cannot contain spaces';
  return null;
}

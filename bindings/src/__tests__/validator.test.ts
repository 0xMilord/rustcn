/**
 * Result parity tests: JS fallback output must match expected validation results.
 */

import { describe, it, expect } from 'vitest';
import { validate, validateField } from '../fallbacks/validator.js';

describe('validator parity', () => {
  const schema = JSON.stringify({
    email: { required: true, field_type: 'email', rules: [], error_message: null },
    name: { required: true, field_type: 'string', rules: [{ MinLength: 2 }, { MaxLength: 50 }], error_message: null },
    age: { required: false, field_type: 'number', rules: [{ MinValue: 0 }, { MaxValue: 150 }], error_message: null },
  });

  it('valid data produces valid result', () => {
    const data = JSON.stringify({ email: 'test@test.com', name: 'John', age: 30 });
    const result = validate(schema, data);
    expect(result.valid).toBe(true);
    expect(result.field_count).toBe(3);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('invalid email produces error', () => {
    const data = JSON.stringify({ email: 'not-valid', name: 'John' });
    const result = validate(schema, data);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('email');
  });

  it('missing required fields produce errors', () => {
    const data = JSON.stringify({});
    const result = validate(schema, data);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('email');
    expect(result.errors).toHaveProperty('name');
  });

  it('name length rules work', () => {
    // Too short
    const r1 = validateField('name', { required: true, field_type: 'string', rules: [{ MinLength: 2 }], error_message: null }, 'A');
    expect(r1.length).toBeGreaterThan(0);

    // Valid
    const r2 = validateField('name', { required: true, field_type: 'string', rules: [{ MinLength: 2 }], error_message: null }, 'John');
    expect(r2).toHaveLength(0);

    // Too long
    const r3 = validateField('name', { required: true, field_type: 'string', rules: [{ MaxLength: 5 }], error_message: null }, 'This is way too long');
    expect(r3.length).toBeGreaterThan(0);
  });

  it('age bounds work', () => {
    const r1 = validateField('age', { required: false, field_type: 'number', rules: [{ MinValue: 0 }, { MaxValue: 150 }], error_message: null }, -5);
    expect(r1.length).toBeGreaterThan(0);

    const r2 = validateField('age', { required: false, field_type: 'number', rules: [{ MinValue: 0 }, { MaxValue: 150 }], error_message: null }, 42);
    expect(r2).toHaveLength(0);
  });

  it('email validation edge cases', () => {
    const r1 = validateField('email', { required: true, field_type: 'email', rules: [], error_message: null }, '');
    expect(r1.length).toBeGreaterThan(0);

    const r2 = validateField('email', { required: true, field_type: 'email', rules: [], error_message: null }, 'no-at-sign');
    expect(r2.length).toBeGreaterThan(0);

    const r3 = validateField('email', { required: true, field_type: 'email', rules: [], error_message: null }, 'test@test.com');
    expect(r3).toHaveLength(0);

    const r4 = validateField('email', { required: true, field_type: 'email', rules: [], error_message: null }, 'two@@at.com');
    expect(r4.length).toBeGreaterThan(0);
  });
});

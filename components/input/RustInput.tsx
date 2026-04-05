/**
 * RustInput — A smart input with real-time validation.
 *
 * Features:
 * - Real-time validation feedback
 * - Type-safe (email, number, password, text)
 * - Auto error display
 * - Accessible (ARIA, labels)
 *
 * Copy-paste this component into your project. You own it.
 */

import React, { useState, useCallback, useMemo, forwardRef } from 'react';

type InputType = 'text' | 'email' | 'number' | 'password' | 'url' | 'tel';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validate?: (value: string) => string | null;
}

export interface RustInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'validate'> {
  type?: InputType;
  label?: string;
  error?: string | null;
  rules?: ValidationRule;
  showValidation?: boolean;
}

function validateEmail(value: string): string | null {
  if (!value) return null; // let required handle empty
  const trimmed = value.trim();
  if (!trimmed.includes('@')) return 'Must be a valid email';
  const parts = trimmed.split('@');
  if (parts.length !== 2) return 'Must be a valid email';
  if (!parts[0] || !parts[1] || !parts[1].includes('.')) return 'Must be a valid email';
  if (trimmed.includes(' ')) return 'Must not contain spaces';
  return null;
}

function validateRules(value: string, rules?: ValidationRule): string[] {
  const errors: string[] = [];
  if (!rules) return errors;
  if (rules.required && (!value || value.trim() === '')) {
    errors.push('This field is required');
    return errors; // Skip other rules if required fails
  }
  if (!value) return errors;
  if (rules.minLength !== undefined && value.length < rules.minLength) {
    errors.push(`Must be at least ${rules.minLength} characters`);
  }
  if (rules.maxLength !== undefined && value.length > rules.maxLength) {
    errors.push(`Must be at most ${rules.maxLength} characters`);
  }
  if (rules.pattern && !rules.pattern.test(value)) {
    errors.push('Does not match required pattern');
  }
  if (rules.validate) {
    const customError = rules.validate(value);
    if (customError) errors.push(customError);
  }
  return errors;
}

export const RustInput = forwardRef<HTMLInputElement, RustInputProps>(function RustInput(
  { type = 'text', label, error: externalError, rules, showValidation = true, className, id, ...props },
  ref,
) {
  const [value, setValue] = useState(props.defaultValue?.toString() ?? props.value?.toString() ?? '');
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);

  const errors = useMemo(() => {
    const ruleErrors = touched ? validateRules(value, rules) : [];
    const typeError = (touched && type === 'email' && value) ? validateEmail(value) : null;
    const allErrors = [...ruleErrors];
    if (typeError) allErrors.push(typeError);
    if (externalError) allErrors.push(externalError);
    return allErrors;
  }, [value, touched, rules, externalError, type]);

  const hasError = errors.length > 0;

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    props.onChange?.(e);
  }, [props]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setTouched(true);
    setFocused(false);
    props.onBlur?.(e);
  }, [props]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    props.onFocus?.(e);
  }, [props]);

  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 8)}`;
  const errorId = `${inputId}-error`;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
          {rules?.required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        aria-invalid={hasError}
        aria-describedby={hasError && showValidation ? errorId : undefined}
        aria-required={rules?.required}
        className={[
          'flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm',
          'transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          hasError
            ? 'border-red-500 focus-visible:ring-red-500'
            : focused
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-input',
          className,
        ].filter(Boolean).join(' ')}
        {...props}
      />
      {hasError && showValidation && (
        <p id={errorId} className="text-xs text-red-500 font-medium" role="alert" aria-live="polite">
          {errors[0]}
        </p>
      )}
    </div>
  );
});

/**
 * Merge CSS class names. Handles conditional classes and removes falsy values.
 * Zero dependencies. Replaces clsx/cn from shadcn.
 *
 * @example
 * cn('px-4', isActive && 'bg-primary', 'rounded')
 */
export type ClassValue = string | undefined | null | false | 0 | ClassArray | ClassObject;
type ClassArray = ClassValue[];
type ClassObject = Record<string, unknown>;

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (input == null || input === false || input === 0) continue;
    if (typeof input === 'string') {
      classes.push(input);
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) classes.push(nested);
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }

  return classes.join(' ');
}

import * as React from 'react';
import { cn } from '../shared/cn.js';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate = false, onChange, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    return (
      <div className="relative">
        <input
          ref={(node) => {
            inputRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          type="checkbox"
          className="peer sr-only"
          onChange={onChange}
          {...props}
        />
        <div
          className={cn(
            'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:border-primary',
            'peer-indeterminate:bg-primary peer-indeterminate:text-primary-foreground peer-indeterminate:border-primary',
            className
          )}
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              'h-4 w-4',
              indeterminate ? 'opacity-100' : 'peer-checked:opacity-100 peer-indeterminate:opacity-100 opacity-0'
            )}
          >
            {indeterminate ? (
              <line x1="5" y1="12" x2="19" y2="12" />
            ) : (
              <polyline points="20 6 9 17 4 12" />
            )}
          </svg>
        </div>
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };

import * as React from 'react';
import { cn } from '../shared/cn.js';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, disabled, ...props }, ref) => {
    return (
      <label
        className={cn(
          'inline-flex items-center cursor-pointer',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <input
          type="checkbox"
          role="switch"
          className="sr-only peer"
          disabled={disabled}
          ref={ref}
          {...props}
        />
        <div
          className={cn(
            'peer relative h-6 w-11 rounded-full bg-input transition-colors',
            'after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-background after:transition-all',
            'peer-checked:bg-primary peer-checked:after:translate-x-5',
            'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background',
            disabled && 'cursor-not-allowed',
            className
          )}
          aria-hidden="true"
        />
      </label>
    );
  }
);
Switch.displayName = 'Switch';

export { Switch };

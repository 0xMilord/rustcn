import * as React from 'react';
import { cn } from '../shared/cn.js';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'sm' | 'lg';
}

const variantClasses = {
  default: 'h-8 w-8 border-4',
  sm: 'h-4 w-4 border-2',
  lg: 'h-12 w-12 border-4',
};

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-block animate-spin rounded-full border-current border-t-transparent text-primary',
          variantClasses[variant],
          className
        )}
        role="status"
        aria-label="Loading"
        {...props}
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);
Spinner.displayName = 'Spinner';

export { Spinner };

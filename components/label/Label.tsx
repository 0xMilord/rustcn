import * as React from 'react';
import { cn } from '../shared/cn.js';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, htmlFor, ...props }, ref) => {
    return (
      <label
        ref={ref}
        htmlFor={htmlFor}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className
        )}
        {...props}
      >
        {props.children}
        {required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
      </label>
    );
  }
);
Label.displayName = 'Label';

export { Label };

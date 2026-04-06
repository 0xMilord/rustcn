import * as React from 'react';
import { cn } from '../shared/cn.js';

// Select Context
interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelectContext() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within a Select');
  }
  return context;
}

// Select Root
export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
}

const Select: React.FC<SelectProps> = ({
  value,
  defaultValue = '',
  onValueChange,
  children,
  className,
  disabled,
  required,
  name,
}) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const activeValue = onValueChange !== undefined ? value : internalValue;

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (onValueChange) {
        onValueChange(newValue);
      } else {
        setInternalValue(newValue);
      }
    },
    [onValueChange]
  );

  React.useEffect(() => {
    if (!onValueChange && value !== undefined) {
      setInternalValue(value);
    }
  }, [value, onValueChange]);

  return (
    <SelectContext.Provider value={{ value: activeValue, onValueChange: handleValueChange }}>
      <div className={cn('relative', disabled && 'opacity-50 pointer-events-none', className)}>
        <select
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          value={activeValue}
          onChange={(e) => handleValueChange(e.target.value)}
          disabled={disabled}
          required={required}
          name={name}
          aria-disabled={disabled}
        />
        {children}
      </div>
    </SelectContext.Provider>
  );
};

// SelectTrigger
export interface SelectTriggerProps extends React.HTMLAttributes<HTMLDivElement> {}

const SelectTrigger = React.forwardRef<HTMLDivElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { value } = useSelectContext();

    return (
      <div
        ref={ref}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        {children || (
          <>
            <span className={cn(!value && 'text-muted-foreground')}>
              {value || 'Select an option'}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 opacity-50 shrink-0"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </>
        )}
      </div>
    );
  }
);
SelectTrigger.displayName = 'SelectTrigger';

// SelectContent
const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    // For a native select, options are rendered inside the select element.
    // This component is a placeholder for visual structure.
    return <div ref={ref} className={cn('hidden', className)} {...props} />;
  }
);
SelectContent.displayName = 'SelectContent';

// SelectItem
export interface SelectItemProps extends React.OptionHTMLAttributes<HTMLOptionElement> {
  value: string;
}

const SelectItem: React.FC<SelectItemProps> = ({ value, children }) => {
  return <option value={value}>{children}</option>;
};
SelectItem.displayName = 'SelectItem';

// SelectValue
const SelectValue: React.FC<{ placeholder?: string; className?: string }> = ({
  placeholder = 'Select an option',
  className,
}) => {
  const { value } = useSelectContext();

  return (
    <span className={cn(!value && 'text-muted-foreground', className)}>
      {value || placeholder}
    </span>
  );
};
SelectValue.displayName = 'SelectValue';

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };

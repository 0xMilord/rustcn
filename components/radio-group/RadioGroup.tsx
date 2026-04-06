import * as React from 'react';
import { cn } from '../shared/cn.js';

// RadioGroup Context
interface RadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
  name: string;
  disabled?: boolean;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

function useRadioGroupContext() {
  const context = React.useContext(RadioGroupContext);
  if (!context) {
    throw new Error('RadioGroup components must be used within a RadioGroup');
  }
  return context;
}

// RadioGroup Root
export interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, defaultValue = '', onValueChange, disabled, name, role = 'radiogroup', ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const activeValue = onValueChange !== undefined ? value : internalValue;
    const uniqueName = React.useRef(name || `radiogroup-${React.useId()}`);

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
      <RadioGroupContext.Provider
        value={{ value: activeValue, onValueChange: handleValueChange, name: uniqueName.current, disabled }}
      >
        <div ref={ref} className={cn('grid gap-2', className)} role={role} {...props} />
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroup.displayName = 'RadioGroup';

// RadioGroupItem
export interface RadioGroupItemProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value: string;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, disabled: itemDisabled, id, ...props }, ref) => {
    const { value: selectedValue, onValueChange, name, disabled } = useRadioGroupContext();
    const isChecked = selectedValue === value;
    const isDisabled = disabled || itemDisabled;
    const uniqueId = id || `radio-${value}-${React.useId()}`;

    return (
      <div className="relative flex items-center gap-2">
        <input
          type="radio"
          id={uniqueId}
          name={name}
          value={value}
          checked={isChecked}
          disabled={isDisabled}
          className="peer sr-only"
          onChange={() => !isDisabled && onValueChange(value)}
          ref={ref}
          {...props}
        />
        <label
          htmlFor={uniqueId}
          className={cn(
            'aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background transition-all',
            'peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
            'peer-checked:border-primary peer-checked:text-primary-foreground',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
            'flex items-center justify-center',
            'cursor-pointer',
            className
          )}
        >
          {isChecked && (
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
              className="h-2.5 w-2.5"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" fill="currentColor" />
            </svg>
          )}
        </label>
      </div>
    );
  }
);
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };

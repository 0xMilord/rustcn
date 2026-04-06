import * as React from 'react';
import { cn } from '../shared/cn.js';
import { Toggle } from '../toggle/Toggle.js';

// ToggleGroup Context
interface ToggleGroupContextValue {
  value: string[];
  onValueChange: (value: string[]) => void;
  disabled?: boolean;
  type: 'single' | 'multiple';
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(null);

function useToggleGroupContext() {
  const context = React.useContext(ToggleGroupContext);
  if (!context) {
    throw new Error('ToggleGroupItem must be used within a ToggleGroup');
  }
  return context;
}

// ToggleGroup Root
export interface ToggleGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  type?: 'single' | 'multiple';
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  disabled?: boolean;
}

const ToggleGroup = React.forwardRef<HTMLDivElement, ToggleGroupProps>(
  (
    { className, type = 'multiple', value, defaultValue = [], onValueChange, disabled, ...props },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState<string[]>(defaultValue);
    const activeValue = onValueChange !== undefined ? value : internalValue;

    const handleValueChange = React.useCallback(
      (newValue: string[]) => {
        if (onValueChange) {
          onValueChange(newValue);
        } else {
          setInternalValue(newValue);
        }
      },
      [onValueChange]
    );

    const toggleValue = React.useCallback(
      (itemValue: string) => {
        if (type === 'single') {
          if (activeValue.includes(itemValue)) {
            handleValueChange([]);
          } else {
            handleValueChange([itemValue]);
          }
        } else {
          if (activeValue.includes(itemValue)) {
            handleValueChange(activeValue.filter((v) => v !== itemValue));
          } else {
            handleValueChange([...activeValue, itemValue]);
          }
        }
      },
      [type, activeValue, handleValueChange]
    );

    React.useEffect(() => {
      if (onValueChange === undefined && value !== undefined) {
        setInternalValue(value);
      }
    }, [value, onValueChange]);

    return (
      <ToggleGroupContext.Provider
        value={{ value: activeValue, onValueChange: handleValueChange, toggleValue, disabled, type }}
      >
        <div
          ref={ref}
          className={cn('inline-flex items-center justify-center gap-1', className)}
          role={type === 'single' ? 'radiogroup' : 'group'}
          {...props}
        />
      </ToggleGroupContext.Provider>
    );
  }
);
ToggleGroup.displayName = 'ToggleGroup';

// ToggleGroupItem
export interface ToggleGroupItemProps extends Omit<React.ComponentProps<typeof Toggle>, 'pressed' | 'defaultPressed' | 'onPressedChange'> {
  value: string;
}

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, value, children, disabled: itemDisabled, onClick, ...props }, ref) => {
    const { value: selectedValues, toggleValue, disabled, type } = useToggleGroupContext();
    const isPressed = selectedValues.includes(value);
    const isDisabled = disabled || itemDisabled;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (isDisabled) return;
      toggleValue(value);
    };

    return (
      <Toggle
        ref={ref}
        pressed={isPressed}
        disabled={isDisabled}
        variant="outline"
        size="sm"
        className={cn('data-[state=on]:bg-accent data-[state=on]:text-accent-foreground', className)}
        aria-pressed={isPressed}
        onClick={handleClick}
        {...props}
      >
        {children}
      </Toggle>
    );
  }
);
ToggleGroupItem.displayName = 'ToggleGroupItem';

// Update context interface to include toggleValue
interface ToggleGroupContextValue {
  value: string[];
  onValueChange: (value: string[]) => void;
  toggleValue: (value: string) => void;
  disabled?: boolean;
  type: 'single' | 'multiple';
}

export { ToggleGroup, ToggleGroupItem };

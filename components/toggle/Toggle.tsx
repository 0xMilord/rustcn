import * as React from 'react';
import { cn } from '../shared/cn.js';

export interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      pressed,
      defaultPressed = false,
      onPressedChange,
      disabled,
      ...props
    },
    ref
  ) => {
    const [internalPressed, setInternalPressed] = React.useState(defaultPressed);
    const isPressed = onPressedChange !== undefined ? pressed : internalPressed;

    const handlePressedChange = React.useCallback(
      (newPressed: boolean) => {
        if (onPressedChange) {
          onPressedChange(newPressed);
        } else {
          setInternalPressed(newPressed);
        }
      },
      [onPressedChange]
    );

    React.useEffect(() => {
      if (onPressedChange === undefined && pressed !== undefined) {
        setInternalPressed(pressed);
      }
    }, [pressed, onPressedChange]);

    const variants = {
      default: cn(
        'hover:bg-muted hover:text-muted-foreground',
        isPressed && 'bg-muted text-muted-foreground'
      ),
      outline: cn(
        'border border-input hover:bg-accent hover:text-accent-foreground',
        isPressed && 'bg-accent text-accent-foreground'
      ),
    };

    const sizes = {
      default: 'h-10 px-3',
      sm: 'h-9 px-2.5',
      lg: 'h-11 px-5',
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={isPressed}
        data-state={isPressed ? 'on' : 'off'}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        onClick={() => handlePressedChange(!isPressed)}
        {...props}
      />
    );
  }
);
Toggle.displayName = 'Toggle';

export { Toggle };

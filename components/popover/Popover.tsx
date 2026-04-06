import * as React from 'react';
import { cn } from '../shared/cn.js';

// Popover Context
interface PopoverContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopoverContext() {
  const context = React.useContext(PopoverContext);
  if (!context) {
    throw new Error('Popover components must be used within a Popover');
  }
  return context;
}

// Popover Root
export interface PopoverProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const Popover: React.FC<PopoverProps> = ({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
}) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isOpen = onOpenChange !== undefined ? open : internalOpen;
  const triggerRef = React.useRef<HTMLElement | null>(null);

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (onOpenChange) {
        onOpenChange(newOpen);
      } else {
        setInternalOpen(newOpen);
      }
    },
    [onOpenChange]
  );

  React.useEffect(() => {
    if (!onOpenChange && open !== undefined) {
      setInternalOpen(open);
    }
  }, [open, onOpenChange]);

  // Close on Escape
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleOpenChange(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleOpenChange]);

  // Close on outside click
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        const target = e.target as Element;
        if (!target?.closest('[data-popover-content]')) {
          handleOpenChange(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, handleOpenChange]);

  return (
    <PopoverContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange, triggerRef }}>
      {children}
    </PopoverContext.Provider>
  );
};

// PopoverTrigger
const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { open, onOpenChange, triggerRef } = usePopoverContext();

  const combinedRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref, triggerRef]
  );

  return (
    <button
      ref={combinedRef}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      className={cn('', className)}
      onClick={(e) => {
        onClick?.(e);
        onOpenChange(!open);
      }}
      {...props}
    />
  );
});
PopoverTrigger.displayName = 'PopoverTrigger';

// PopoverContent
export interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom';
}

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, align = 'center', side = 'bottom', children, ...props }, ref) => {
    const { open } = usePopoverContext();

    if (!open) return null;

    const alignClasses = {
      start: 'left-0',
      center: 'left-1/2 -translate-x-1/2',
      end: 'right-0',
    };

    const sideClasses = {
      top: 'bottom-full mb-2',
      bottom: 'top-full mt-2',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          sideClasses[side],
          alignClasses[align],
          className
        )}
        data-popover-content="true"
        role="dialog"
        {...props}
      >
        {children}
      </div>
    );
  }
);
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent };

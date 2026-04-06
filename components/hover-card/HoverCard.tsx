import * as React from 'react';
import { cn } from '../shared/cn.js';

// HoverCard Context
interface HoverCardContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HoverCardContext = React.createContext<HoverCardContextValue | null>(null);

function useHoverCardContext() {
  const context = React.useContext(HoverCardContext);
  if (!context) {
    throw new Error('HoverCard components must be used within a HoverCard');
  }
  return context;
}

// HoverCard Root
export interface HoverCardProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  openDelay?: number;
  closeDelay?: number;
  children: React.ReactNode;
}

const HoverCard: React.FC<HoverCardProps> = ({
  open,
  defaultOpen = false,
  onOpenChange,
  openDelay = 700,
  closeDelay = 300,
  children,
}) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isOpen = onOpenChange !== undefined ? open : internalOpen;
  const openTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);

      if (newOpen) {
        openTimeoutRef.current = setTimeout(() => {
          if (onOpenChange) {
            onOpenChange(true);
          } else {
            setInternalOpen(true);
          }
        }, openDelay);
      } else {
        closeTimeoutRef.current = setTimeout(() => {
          if (onOpenChange) {
            onOpenChange(false);
          } else {
            setInternalOpen(false);
          }
        }, closeDelay);
      }
    },
    [onOpenChange, openDelay, closeDelay]
  );

  React.useEffect(() => {
    if (!onOpenChange && open !== undefined) {
      setInternalOpen(open);
    }
  }, [open, onOpenChange]);

  React.useEffect(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  return (
    <HoverCardContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      {children}
    </HoverCardContext.Provider>
  );
};

// HoverCardTrigger
const HoverCardTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { onOpenChange } = useHoverCardContext();

  return (
    <div
      ref={ref}
      className={cn('inline-block', className)}
      onMouseEnter={() => onOpenChange(true)}
      onMouseLeave={() => onOpenChange(false)}
      onFocus={() => onOpenChange(true)}
      onBlur={() => onOpenChange(false)}
      {...props}
    >
      {children}
    </div>
  );
});
HoverCardTrigger.displayName = 'HoverCardTrigger';

// HoverCardContent
export interface HoverCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom';
}

const HoverCardContent = React.forwardRef<HTMLDivElement, HoverCardContentProps>(
  ({ className, align = 'center', side = 'bottom', children, ...props }, ref) => {
    const { open } = useHoverCardContext();

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
        data-state={open ? 'open' : 'closed'}
        {...props}
      >
        {children}
      </div>
    );
  }
);
HoverCardContent.displayName = 'HoverCardContent';

export { HoverCard, HoverCardTrigger, HoverCardContent };

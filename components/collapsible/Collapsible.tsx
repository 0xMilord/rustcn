import * as React from 'react';
import { cn } from '../shared/cn.js';

// Collapsible Context
interface CollapsibleContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

function useCollapsibleContext() {
  const context = React.useContext(CollapsibleContext);
  if (!context) {
    throw new Error('Collapsible components must be used within a Collapsible');
  }
  return context;
}

// Collapsible Root
export interface CollapsibleProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

const Collapsible: React.FC<CollapsibleProps> = ({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
  className,
}) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isOpen = onOpenChange !== undefined ? open : internalOpen;

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

  return (
    <CollapsibleContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      <div className={cn('', className)}>{children}</div>
    </CollapsibleContext.Provider>
  );
};

// CollapsibleTrigger
const CollapsibleTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { open, onOpenChange } = useCollapsibleContext();

  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      className={cn('', className)}
      onClick={() => onOpenChange(!open)}
      {...props}
    />
  );
});
CollapsibleTrigger.displayName = 'CollapsibleTrigger';

// CollapsibleContent
const CollapsibleContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { open } = useCollapsibleContext();

    if (!open) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'overflow-hidden transition-all',
          'data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up',
          className
        )}
        data-state={open ? 'open' : 'closed'}
        {...props}
      />
    );
  }
);
CollapsibleContent.displayName = 'CollapsibleContent';

export { Collapsible, CollapsibleTrigger, CollapsibleContent };

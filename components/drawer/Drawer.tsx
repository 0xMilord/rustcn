import * as React from 'react';
import { cn } from '../shared/cn.js';

// Drawer Context
interface DrawerContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DrawerContext = React.createContext<DrawerContextValue | null>(null);

function useDrawerContext() {
  const context = React.useContext(DrawerContext);
  if (!context) {
    throw new Error('Drawer components must be used within a Drawer');
  }
  return context;
}

// Drawer Root
export interface DrawerProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const Drawer: React.FC<DrawerProps> = ({
  open,
  defaultOpen = false,
  onOpenChange,
  children,
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

  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleOpenChange(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleOpenChange]);

  return (
    <DrawerContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      {children}
    </DrawerContext.Provider>
  );
};

// DrawerTrigger
const DrawerTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { onOpenChange } = useDrawerContext();

  return (
    <button
      ref={ref}
      type="button"
      className={cn('', className)}
      onClick={(e) => {
        onClick?.(e);
        onOpenChange(true);
      }}
      {...props}
    />
  );
});
DrawerTrigger.displayName = 'DrawerTrigger';

// DrawerClose
const DrawerClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { onOpenChange } = useDrawerContext();

  return (
    <button
      ref={ref}
      type="button"
      className={cn('', className)}
      onClick={(e) => {
        onClick?.(e);
        onOpenChange(false);
      }}
      {...props}
    />
  );
});
DrawerClose.displayName = 'DrawerClose';

// DrawerOverlay
const DrawerOverlay = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { open } = useDrawerContext();

    if (!open) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'fixed inset-0 z-50 bg-black/80',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          className
        )}
        data-state={open ? 'open' : 'closed'}
        {...props}
      />
    );
  }
);
DrawerOverlay.displayName = 'DrawerOverlay';

// DrawerContent
export interface DrawerContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const DrawerContent = React.forwardRef<HTMLDivElement, DrawerContentProps>(
  ({ className, children, ...props }, ref) => {
    const { open, onOpenChange } = useDrawerContext();
    const overlayRef = React.useRef<HTMLDivElement>(null);

    if (!open) return null;

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) {
        onOpenChange(false);
      }
    };

    return (
      <div ref={overlayRef} className="fixed inset-0 z-50" onClick={handleOverlayClick}>
        <DrawerOverlay ref={overlayRef} />
        <div
          ref={ref}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            className
          )}
          role="dialog"
          aria-modal="true"
          data-state={open ? 'open' : 'closed'}
          {...props}
        >
          {/* Drag handle */}
          <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" aria-hidden="true" />
          {children}
        </div>
      </div>
    );
  }
);
DrawerContent.displayName = 'DrawerContent';

// DrawerHeader
const DrawerHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('grid gap-1.5 p-4 text-center sm:text-left', className)} {...props} />
  )
);
DrawerHeader.displayName = 'DrawerHeader';

// DrawerFooter
const DrawerFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />
  )
);
DrawerFooter.displayName = 'DrawerFooter';

// DrawerTitle
const DrawerTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
  )
);
DrawerTitle.displayName = 'DrawerTitle';

// DrawerDescription
const DrawerDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
DrawerDescription.displayName = 'DrawerDescription';

export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};

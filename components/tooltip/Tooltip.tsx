import * as React from 'react';
import { cn } from '../shared/cn.js';

export interface TooltipProps {
  content: React.ReactNode;
  delayDuration?: number;
  side?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactNode;
  className?: string;
}

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({ className, content, delayDuration = 700, side = 'top', children }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = React.useCallback(() => {
      timeoutRef.current = setTimeout(() => setIsVisible(true), delayDuration);
    }, [delayDuration]);

    const handleMouseLeave = React.useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsVisible(false);
    }, []);

    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, []);

    const sideClasses = {
      top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowClasses = {
      top: 'left-1/2 -translate-x-1/2 top-full -mt-1 border-t-border',
      bottom: 'left-1/2 -translate-x-1/2 bottom-full -mb-1 border-b-border',
      left: 'top-1/2 -translate-y-1/2 left-full -ml-1 border-l-border',
      right: 'top-1/2 -translate-y-1/2 right-full -mr-1 border-r-border',
    };

    return (
      <div
        ref={ref}
        className={cn('relative inline-block', className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
      >
        {children}
        {isVisible && (
          <div
            className={cn(
              'absolute z-50 max-w-xs animate-in fade-in zoom-in-95 rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md',
              sideClasses[side]
            )}
            role="tooltip"
          >
            {content}
            <div
              className={cn('absolute border-4 border-transparent', arrowClasses[side])}
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    );
  }
);
Tooltip.displayName = 'Tooltip';

export { Tooltip };

import * as React from 'react';
import { cn } from '../shared/cn.js';

// ScrollArea Root
export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both';
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, orientation = 'vertical', children, ...props }, ref) => {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    return (
      <div
        ref={ref}
        className={cn('relative overflow-hidden', className)}
        {...props}
      >
        <div
          ref={scrollContainerRef}
          className={cn('h-full w-full overflow-y-auto', {
            'overflow-x-auto': orientation === 'both',
            'overflow-x-hidden': orientation !== 'both',
            'overflow-y-hidden': orientation === 'horizontal',
          })}
        >
          {children}
        </div>
      </div>
    );
  }
);
ScrollArea.displayName = 'ScrollArea';

// ScrollBar
export interface ScrollBarProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal';
}

const ScrollBar = React.forwardRef<HTMLDivElement, ScrollBarProps>(
  ({ className, orientation = 'vertical', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex touch-none select-none transition-colors',
          orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent p-px',
          orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent p-px',
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'relative rounded-full bg-border',
            orientation === 'vertical' && 'w-full',
            orientation === 'horizontal' && 'h-full'
          )}
        />
      </div>
    );
  }
);
ScrollBar.displayName = 'ScrollBar';

export { ScrollArea, ScrollBar };

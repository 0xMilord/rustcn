import * as React from 'react';
import { cn } from '../shared/cn.js';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('animate-pulse rounded-md bg-muted', className)}
        {...props}
        aria-busy="true"
        aria-label="Loading"
      />
    );
  }
);
Skeleton.displayName = 'Skeleton';

export { Skeleton };

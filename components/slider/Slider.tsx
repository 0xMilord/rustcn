import * as React from 'react';
import { cn } from '../shared/cn.js';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  defaultValue?: number[];
  value?: number[];
  min?: number;
  max?: number;
  step?: number;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, min = 0, max = 100, step = 1, value, defaultValue = [0], ...props }, ref) => {
    const currentValue = value ?? defaultValue[0];
    const percentage = ((currentValue - min) / (max - min)) * 100;

    return (
      <div className={cn('relative flex w-full touch-none select-none items-center', className)}>
        <div className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <div
            className="absolute h-full bg-primary transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          className="absolute w-full opacity-0 cursor-pointer peer"
          ref={ref}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={currentValue}
          {...props}
        />
        <div
          className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 pointer-events-none"
          style={{ marginLeft: `calc(${percentage}% - 10px)` }}
          aria-hidden="true"
        />
      </div>
    );
  }
);
Slider.displayName = 'Slider';

export { Slider };

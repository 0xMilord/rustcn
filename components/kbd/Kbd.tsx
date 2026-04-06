import * as React from 'react';
import { cn } from '../shared/cn.js';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  keys: string[];
}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, keys, ...props }, ref) => {
    const formatKey = (key: string): string => {
      const keyMap: Record<string, string> = {
        ' ': 'Space',
        ArrowUp: '\u2191',
        ArrowDown: '\u2193',
        ArrowLeft: '\u2190',
        ArrowRight: '\u2192',
        Enter: '\u23CE',
        Escape: 'Esc',
        Backspace: '\u232B',
        Delete: '\u2326',
        Tab: '\u21E5',
        Shift: '\u21E7',
        Control: 'Ctrl',
        Alt: '\u2325',
        Meta: '\u2318',
        Command: '\u2318',
      };
      return keyMap[key] || key;
    };

    return (
      <kbd
        ref={ref}
        className={cn(
          'inline-flex items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs font-medium text-muted-foreground',
          className
        )}
        {...props}
      >
        {keys.map((key, index) => (
          <React.Fragment key={key}>
            {index > 0 && (
              <span className="mx-0.5 text-muted-foreground/60" aria-hidden="true">
                +
              </span>
            )}
            <span>{formatKey(key)}</span>
          </React.Fragment>
        ))}
      </kbd>
    );
  }
);
Kbd.displayName = 'Kbd';

export { Kbd };

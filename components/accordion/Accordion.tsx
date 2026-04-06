import * as React from 'react';
import { cn } from '../shared/cn.js';

// Accordion Context
interface AccordionContextValue {
  value: string | string[];
  onValueChange: (value: string | string[]) => void;
  collapsible: boolean;
  type: 'single' | 'multiple';
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

function useAccordionContext() {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within an Accordion');
  }
  return context;
}

// Accordion Root
export interface AccordionProps {
  type?: 'single' | 'multiple';
  collapsible?: boolean;
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  children: React.ReactNode;
  className?: string;
}

const Accordion: React.FC<AccordionProps> = ({
  type = 'single',
  collapsible = false,
  value,
  defaultValue,
  onValueChange,
  children,
  className,
}) => {
  const [internalValue, setInternalValue] = React.useState<string | string[]>(
    defaultValue ?? (type === 'multiple' ? [] : '')
  );
  const activeValue = onValueChange !== undefined ? value : internalValue;

  const handleValueChange = React.useCallback(
    (newValue: string | string[]) => {
      if (onValueChange) {
        onValueChange(newValue);
      } else {
        setInternalValue(newValue);
      }
    },
    [onValueChange]
  );

  React.useEffect(() => {
    if (!onValueChange && value !== undefined) {
      setInternalValue(value);
    }
  }, [value, onValueChange]);

  return (
    <AccordionContext.Provider
      value={{ value: activeValue, onValueChange: handleValueChange, collapsible, type }}
    >
      <div className={cn('', className)}>{children}</div>
    </AccordionContext.Provider>
  );
};

// AccordionItem
export interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ className, value, ...props }, ref) => (
    <div ref={ref} className={cn('border-b', className)} data-value={value} {...props} />
  )
);
AccordionItem.displayName = 'AccordionItem';

// AccordionTrigger
export interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { value, onValueChange, collapsible, type } = useAccordionContext();
    const itemValue = (ref as React.RefObject<HTMLButtonElement>)?.current
      ?.closest('[data-value]')
      ?.getAttribute('data-value') ?? '';
    const isActive = type === 'multiple'
      ? Array.isArray(value) && value.includes(itemValue)
      : value === itemValue;

    const handleClick = () => {
      if (type === 'single') {
        if (collapsible && value === itemValue) {
          onValueChange('');
        } else {
          onValueChange(itemValue);
        }
      } else {
        const current = Array.isArray(value) ? value : [];
        if (current.includes(itemValue)) {
          onValueChange(current.filter((v) => v !== itemValue));
        } else {
          onValueChange([...current, itemValue]);
        }
      }
    };

    return (
      <h3>
        <button
          ref={ref}
          type="button"
          aria-expanded={isActive}
          className={cn(
            'flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180',
            className
          )}
          data-state={isActive ? 'open' : 'closed'}
          onClick={handleClick}
          {...props}
        >
          {children}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0 transition-transform duration-200"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </h3>
    );
  }
);
AccordionTrigger.displayName = 'AccordionTrigger';

// AccordionContent
export interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const AccordionContent = React.forwardRef<HTMLDivElement, AccordionContentProps>(
  ({ className, children, ...props }, ref) => {
    const { value, type } = useAccordionContext();
    const itemValue = (ref as React.RefObject<HTMLDivElement>)?.current
      ?.closest('[data-value]')
      ?.getAttribute('data-value') ?? '';
    const isActive = type === 'multiple'
      ? Array.isArray(value) && value.includes(itemValue)
      : value === itemValue;

    if (!isActive) return null;

    return (
      <div
        ref={ref}
        className={cn(
          'overflow-hidden text-sm transition-all',
          'data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up',
          className
        )}
        data-state={isActive ? 'open' : 'closed'}
        {...props}
      >
        <div className="pb-4 pt-0">{children}</div>
      </div>
    );
  }
);
AccordionContent.displayName = 'AccordionContent';

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };

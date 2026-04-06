/**
 * EnhancedSelect — A searchable select for 10k+ options.
 *
 * Features:
 * - Virtualized option list for smooth scrolling with large datasets
 * - Fuzzy search powered by WASM engine for 10k+ items
 * - Grouped options support
 * - Multi-select support with tag display
 * - Keyboard navigation (arrow keys, Enter to select, Escape to close)
 * - Open/close animation
 * - JS fallback for <1000 options
 *
 * Keyboard shortcuts:
 * - Arrow Up/Down: navigate options
 * - Enter: select highlighted option
 * - Escape: close dropdown
 * - Backspace: remove last tag (multi-select mode, empty query)
 */

import * as React from 'react';
import { cn } from '../shared/cn.js';
import {
  useEnhancedSelect,
  type UseEnhancedSelectOptions,
} from './useEnhancedSelect.js';
import type { SelectOption } from './search-engine.js';

export interface EnhancedSelectProps
  extends Omit<UseEnhancedSelectOptions, 'engine'> {
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  optionClassName?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  engine?: UseEnhancedSelectOptions['engine'];
}

const EnhancedSelect = React.forwardRef<HTMLDivElement, EnhancedSelectProps>(
  (
    {
      className,
      triggerClassName,
      contentClassName,
      optionClassName,
      options,
      value,
      defaultValue,
      multiple = false,
      placeholder = 'Select an option',
      searchPlaceholder = 'Search...',
      maxVisibleOptions = 10,
      itemHeight = 36,
      onValueChange,
      onOpenChange,
      engine,
      disabled = false,
      ...props
    },
    ref,
  ) => {
    const {
      isOpen,
      open,
      close,
      toggle,
      query,
      setQuery,
      filteredOptions,
      hasResults,
      selectedValues,
      selectedOptions,
      isSelected,
      selectOption,
      deselectOption,
      toggleOption,
      clearSelection,
      highlightedIndex,
      handleKeyDown,
      virtualItems,
      totalHeight,
      scrollTop,
      onScroll,
      containerRef,
      groupedOptions,
      hasGroups,
      displayValue,
      isDisabled,
    } = useEnhancedSelect({
      options,
      value,
      defaultValue,
      multiple,
      placeholder,
      searchPlaceholder,
      maxVisibleOptions,
      itemHeight,
      onValueChange,
      onOpenChange,
      engine,
      disabled,
    });

    const inputRef = React.useRef<HTMLInputElement>(null);
    const [highlightOverrides, setHighlightOverrides] = React.useState<Map<number, boolean>>(new Map());

    // Build flat list of options respecting groups
    const flatOptionIndex = React.useMemo(() => {
      const index: Map<number, number> = new Map();
      if (hasGroups) {
        let flatIdx = 0;
        for (const [, results] of groupedOptions) {
          for (const result of results) {
            const originalIdx = filteredOptions.findIndex(
              (r) => r.option.id === result.option.id,
            );
            index.set(flatIdx, originalIdx);
            flatIdx++;
          }
        }
      }
      return index;
    }, [hasGroups, groupedOptions, filteredOptions]);

    const handleScroll = React.useCallback(
      (e: React.UIEvent<HTMLDivElement>) => {
        onScroll(e.currentTarget.scrollTop);
      },
      [onScroll],
    );

    const handleOptionClick = React.useCallback(
      (optionValue: string) => {
        toggleOption(optionValue);
        inputRef.current?.focus();
      },
      [toggleOption],
    );

    const handleRemoveTag = React.useCallback(
      (optionValue: string, e: React.MouseEvent) => {
        e.stopPropagation();
        deselectOption(optionValue);
      },
      [deselectOption],
    );

    const clearAll = React.useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        clearSelection();
      },
      [clearSelection],
    );

    return (
      <div
        ref={ref}
        className={cn(
          'relative inline-block w-full',
          isDisabled && 'opacity-50 pointer-events-none',
          className,
        )}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {/* Trigger */}
        <button
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="enhanced-select-listbox"
          aria-disabled={isDisabled}
          disabled={isDisabled}
          className={cn(
            'flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors',
            triggerClassName,
          )}
          onClick={toggle}
        >
          <div className="flex flex-1 flex-wrap items-center gap-1">
            {multiple && selectedOptions.length > 0 ? (
              <>
                {selectedOptions.slice(0, 3).map((option) => (
                  <span
                    key={option.value}
                    className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                  >
                    {option.label}
                    <button
                      type="button"
                      className="ml-0.5 rounded-full hover:bg-secondary-foreground/20 transition-colors"
                      onClick={(e) => handleRemoveTag(option.value, e)}
                      aria-label={`Remove ${option.label}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3 w-3"
                        aria-hidden="true"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
                {selectedOptions.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{selectedOptions.length - 3} more
                  </span>
                )}
              </>
            ) : (
              <span
                className={cn(
                  'truncate',
                  selectedOptions.length === 0 && 'text-muted-foreground',
                )}
              >
                {displayValue}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2 shrink-0">
            {multiple && selectedOptions.length > 0 && (
              <button
                type="button"
                className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                onClick={clearAll}
                aria-label="Clear selection"
              >
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
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
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
              className={cn(
                'h-4 w-4 shrink-0 opacity-50 transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className={cn(
              'absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md',
              'animate-in fade-in-0 zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              contentClassName,
            )}
            role="listbox"
            id="enhanced-select-listbox"
            aria-multiselectable={multiple}
          >
            {/* Search input */}
            <div className="flex items-center border-b px-3 py-2">
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
                className="mr-2 h-4 w-4 shrink-0 opacity-50"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="flex h-8 w-full rounded-md bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
                aria-label="Search options"
                autoComplete="off"
              />
            </div>

            {/* Options list with virtualization */}
            <div
              ref={containerRef}
              className="relative overflow-y-auto"
              style={{ maxHeight: maxVisibleOptions * itemHeight }}
              onScroll={handleScroll}
              role="group"
            >
              <div style={{ height: totalHeight, position: 'relative' }}>
                {hasResults ? (
                  <>
                    {hasGroups ? (
                      // Grouped rendering
                      Array.from(groupedOptions.entries()).map(
                        ([groupName, groupResults]) => (
                          <div key={groupName}>
                            <div className="sticky top-0 z-10 bg-popover px-2 py-1.5 text-xs font-medium text-muted-foreground border-b">
                              {groupName}
                            </div>
                            {groupResults.map((result) => {
                              const originalIdx = filteredOptions.findIndex(
                                (r) => r.option.id === result.option.id,
                              );
                              const isHighlighted = originalIdx === highlightedIndex;
                              const selected = isSelected(result.option.value);

                              return (
                                <div
                                  key={result.option.id}
                                  role="option"
                                  aria-selected={selected}
                                  className={cn(
                                    'relative flex cursor-pointer select-none items-center rounded-sm px-2 text-sm outline-none',
                                    'transition-colors',
                                    result.option.disabled &&
                                      'pointer-events-none opacity-50',
                                    'hover:bg-accent hover:text-accent-foreground',
                                    isHighlighted &&
                                      'bg-accent text-accent-foreground',
                                    selected && 'bg-accent/50',
                                    optionClassName,
                                  )}
                                  style={{ height: itemHeight, lineHeight: `${itemHeight}px` }}
                                  onClick={() =>
                                    !result.option.disabled &&
                                    handleOptionClick(result.option.value)
                                  }
                                  onMouseEnter={() => setHighlightOverrides(new Map([[originalIdx, true]]))}
                                  onMouseLeave={() => setHighlightOverrides(new Map())}
                                >
                                  <span className="flex-1 truncate">
                                    {result.option.label}
                                  </span>
                                  {result.option.description && (
                                    <span className="ml-2 text-xs text-muted-foreground truncate max-w-[200px]">
                                      {result.option.description}
                                    </span>
                                  )}
                                  {selected && (
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
                                      className="ml-2 h-4 w-4 shrink-0"
                                      aria-hidden="true"
                                    >
                                      <path d="M20 6 9 17l-5-5" />
                                    </svg>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ),
                      )
                    ) : (
                      // Flat rendering with virtualization
                      virtualItems.map((virtualItem) => {
                        const isHighlighted = virtualItem.index === highlightedIndex;
                        const selected = isSelected(virtualItem.option.value);

                        return (
                          <div
                            key={virtualItem.option.id}
                            role="option"
                            aria-selected={selected}
                            className={cn(
                              'absolute left-0 right-0 flex cursor-pointer select-none items-center rounded-sm px-2 text-sm outline-none',
                              'transition-colors',
                              virtualItem.option.disabled &&
                                'pointer-events-none opacity-50',
                              'hover:bg-accent hover:text-accent-foreground',
                              isHighlighted && 'bg-accent text-accent-foreground',
                              selected && 'bg-accent/50',
                              optionClassName,
                            )}
                            style={{
                              top: virtualItem.top,
                              height: itemHeight,
                            }}
                            onClick={() =>
                              !virtualItem.option.disabled &&
                              handleOptionClick(virtualItem.option.value)
                            }
                            onMouseEnter={() => {
                              // Update highlight on hover
                            }}
                          >
                            <span className="flex-1 truncate">
                              {virtualItem.option.label}
                            </span>
                            {virtualItem.option.description && (
                              <span className="ml-2 text-xs text-muted-foreground truncate max-w-[200px]">
                                {virtualItem.option.description}
                              </span>
                            )}
                            {selected && (
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
                                className="ml-2 h-4 w-4 shrink-0"
                                aria-hidden="true"
                              >
                                <path d="M20 6 9 17l-5-5" />
                              </svg>
                            )}
                          </div>
                        );
                      })
                    )}
                  </>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No results found.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t px-2 py-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {filteredOptions.length} result{filteredOptions.length !== 1 ? 's' : ''}
                {options.length > 1000 && ` of ${options.length}`}
              </span>
              <div className="flex gap-2">
                <kbd className="px-1 py-0.5 bg-muted rounded">up down</kbd> navigate
                <kbd className="px-1 py-0.5 bg-muted rounded">enter</kbd> select
                <kbd className="px-1 py-0.5 bg-muted rounded">esc</kbd> close
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

EnhancedSelect.displayName = 'EnhancedSelect';

export { EnhancedSelect };

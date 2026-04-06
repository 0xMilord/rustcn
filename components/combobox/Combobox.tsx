/**
 * Combobox — Command palette style combobox with fuzzy search.
 *
 * Features:
 * - Type-ahead search with fuzzy matching
 * - WASM-powered fuzzy search for 10k+ items
 * - Recent/popular item highlighting
 * - Keyboard navigation
 * - Multi-select mode with tag display
 * - JS fallback for small option sets
 *
 * Keyboard shortcuts:
 * - Arrow Up/Down: navigate options
 * - Enter: select highlighted option
 * - Escape: close dropdown
 * - Backspace: remove last tag (multi-select mode, empty query)
 */

import * as React from 'react';
import { cn } from '../shared/cn.js';
import { useCombobox, type UseComboboxOptions } from './useCombobox.js';
import type { ComboboxOption } from './combobox-search-engine.js';

export interface ComboboxProps
  extends Omit<UseComboboxOptions, 'engine'> {
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  optionClassName?: string;
  emptyMessage?: string;
  badgeClassName?: string;
}

const Combobox = React.forwardRef<HTMLDivElement, ComboboxProps>(
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
      placeholder = 'Type to search...',
      searchPlaceholder = 'Search...',
      maxVisibleOptions = 8,
      itemHeight = 40,
      showRecents = true,
      maxRecents = 5,
      onValueChange,
      onOpenChange,
      onSearchChange,
      disabled = false,
      emptyMessage = 'No results found.',
      badgeClassName,
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
      results,
      hasResults,
      showRecents: showRecentsFlag,
      recentOptions,
      selectedValues,
      selectedOptions,
      isSelected,
      selectOption,
      deselectOption,
      toggleOption,
      clearSelection,
      highlightedIndex,
      setHighlightedIndex,
      handleKeyDown,
      handleInputKeyDown,
      virtualItems,
      totalHeight,
      scrollTop,
      onScroll,
      containerRef,
      displayValue,
      isDisabled,
      isEmpty,
      emptyMessage: resolvedEmptyMessage,
    } = useCombobox({
      options,
      value,
      defaultValue,
      multiple,
      placeholder,
      searchPlaceholder,
      maxVisibleOptions,
      itemHeight,
      showRecents,
      maxRecents,
      onValueChange,
      onOpenChange,
      onSearchChange,
      disabled,
      emptyMessage,
    });

    const inputRef = React.useRef<HTMLInputElement>(null);

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

    const handleClearAll = React.useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        clearSelection();
      },
      [clearSelection],
    );

    const handleInputChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        if (!isOpen) {
          open();
        }
      },
      [setQuery, isOpen, open],
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
        {/* Trigger / Input */}
        <div
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls="combobox-listbox"
          aria-disabled={isDisabled}
          className={cn(
            'flex min-h-10 w-full items-center rounded-md border border-input bg-background',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors',
            triggerClassName,
          )}
          onClick={() => {
            if (!isDisabled) toggle();
          }}
        >
          {/* Selected tags (multi-select) */}
          {multiple && selectedOptions.length > 0 && (
            <div className="flex flex-1 flex-wrap items-center gap-1 px-2 py-1">
              {selectedOptions.slice(0, 3).map((option) => (
                <span
                  key={option.value}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground',
                    badgeClassName,
                  )}
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
            </div>
          )}

          {/* Search input */}
          <div className="flex flex-1 items-center px-3">
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
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder={!multiple && selectedOptions.length === 0 ? placeholder : searchPlaceholder}
              className="flex h-9 w-full rounded-md bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
              aria-label={placeholder}
              autoComplete="off"
              role="textbox"
              aria-autocomplete="list"
            />
          </div>

          {/* Clear / Chevron */}
          <div className="flex items-center gap-1 px-2 shrink-0">
            {(selectedOptions.length > 0 || query) && (
              <button
                type="button"
                className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  if (query) {
                    setQuery('');
                  } else {
                    clearSelection();
                  }
                  inputRef.current?.focus();
                }}
                aria-label="Clear"
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
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div
            className={cn(
              'absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md',
              'animate-in fade-in-0 zoom-in-95',
              contentClassName,
            )}
            role="listbox"
            id="combobox-listbox"
            aria-multiselectable={multiple}
          >
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
                    {/* Recent items section */}
                    {showRecentsFlag && !query && recentOptions.length > 0 && (
                      <div>
                        <div className="sticky top-0 z-10 bg-popover px-3 py-1.5 text-xs font-medium text-muted-foreground border-b flex items-center gap-1.5">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3 w-3"
                            aria-hidden="true"
                          >
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                            <path d="M12 7v5l4 2" />
                          </svg>
                          Recent
                        </div>
                        {recentOptions.map((option) => {
                          const resultIdx = results.findIndex(
                            (r) => r.option.id === option.id,
                          );
                          const isHighlighted = resultIdx === highlightedIndex;
                          const selected = isSelected(option.value);

                          return (
                            <div
                              key={option.id}
                              role="option"
                              aria-selected={selected}
                              className={cn(
                                'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 text-sm outline-none',
                                'transition-colors',
                                option.disabled && 'pointer-events-none opacity-50',
                                'hover:bg-accent hover:text-accent-foreground',
                                isHighlighted && 'bg-accent text-accent-foreground',
                                selected && 'bg-accent/50',
                                optionClassName,
                              )}
                              style={{ height: itemHeight }}
                              onClick={() =>
                                !option.disabled && handleOptionClick(option.value)
                              }
                              onMouseEnter={() =>
                                resultIdx >= 0 && setHighlightedIndex(resultIdx)
                              }
                            >
                              {option.icon && (
                                <span className="shrink-0">{option.icon}</span>
                              )}
                              <span className="flex-1 truncate">
                                {option.label}
                              </span>
                              {option.recent && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  Recent
                                </span>
                              )}
                              {option.popularity && option.popularity > 70 && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  Popular
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
                    )}

                    {/* Main results with virtualization */}
                    {(query || !showRecentsFlag || recentOptions.length === 0) &&
                      virtualItems.map((virtualItem) => {
                        const isHighlighted = virtualItem.index === highlightedIndex;
                        const selected = isSelected(virtualItem.result.option.value);

                        return (
                          <div
                            key={virtualItem.result.option.id}
                            role="option"
                            aria-selected={selected}
                            className={cn(
                              'absolute left-0 right-0 flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 text-sm outline-none',
                              'transition-colors',
                              virtualItem.result.option.disabled &&
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
                              !virtualItem.result.option.disabled &&
                              handleOptionClick(virtualItem.result.option.value)
                            }
                            onMouseEnter={() =>
                              setHighlightedIndex(virtualItem.index)
                            }
                          >
                            {virtualItem.result.option.icon && (
                              <span className="shrink-0">
                                {virtualItem.result.option.icon}
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="block truncate">
                                {virtualItem.result.option.label}
                              </span>
                              {virtualItem.result.option.description && (
                                <span className="block text-xs text-muted-foreground truncate">
                                  {virtualItem.result.option.description}
                                </span>
                              )}
                            </div>
                            {virtualItem.result.isRecent && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                Recent
                              </span>
                            )}
                            {virtualItem.result.isPopular && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                Popular
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
                  </>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {isEmpty ? resolvedEmptyMessage : 'No results found.'}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {results.length} result{results.length !== 1 ? 's' : ''}
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

Combobox.displayName = 'Combobox';

export { Combobox };

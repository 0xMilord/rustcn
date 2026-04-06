/**
 * useCombobox — Hook for command palette style combobox.
 *
 * Features:
 * - Type-ahead search with fuzzy matching
 * - WASM-powered fuzzy search for 10k+ items
 * - Recent/popular item highlighting
 * - Keyboard navigation
 * - Multi-select mode
 * - JS fallback for small option sets
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ComboboxSearchEngine,
  type ComboboxOption,
  type ComboboxSearchResult,
  type ComboboxSearchConfig,
} from './combobox-search-engine.js';

export interface UseComboboxOptions {
  options: ComboboxOption[];
  value?: string | string[];
  defaultValue?: string | string[];
  multiple?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  maxVisibleOptions?: number;
  itemHeight?: number;
  showRecents?: boolean;
  maxRecents?: number;
  onValueChange?: (value: string | string[]) => void;
  onOpenChange?: (open: boolean) => void;
  onSearchChange?: (query: string) => void;
  disabled?: boolean;
  emptyMessage?: string;
}

export interface UseComboboxReturn {
  // Open/close state
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;

  // Search
  query: string;
  setQuery: (query: string) => void;
  results: ComboboxSearchResult[];
  hasResults: boolean;
  showRecents: boolean;
  recentOptions: ComboboxOption[];

  // Selection
  selectedValues: string[];
  selectedOptions: ComboboxOption[];
  isSelected: (value: string) => boolean;
  selectOption: (value: string) => void;
  deselectOption: (value: string) => void;
  toggleOption: (value: string) => void;
  clearSelection: () => void;

  // Keyboard navigation
  highlightedIndex: number;
  setHighlightedIndex: (index: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;

  // Virtualization
  virtualItems: {
    index: number;
    result: ComboboxSearchResult;
    top: number;
  }[];
  totalHeight: number;
  scrollTop: number;
  onScroll: (scrollTop: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;

  // Display
  displayValue: string;
  isDisabled: boolean;
  isEmpty: boolean;
  emptyMessage: string;
}

export function useCombobox(options: UseComboboxOptions): UseComboboxReturn {
  const {
    options: allOptions,
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
  } = options;

  // State
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search engine
  const searchEngine = useMemo(
    () => new ComboboxSearchEngine(allOptions, maxRecents),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allOptions.length, maxRecents],
  );

  // Selection state
  const [internalValue, setInternalValue] = useState<string[]>(() => {
    if (multiple) {
      if (Array.isArray(value)) return value;
      if (Array.isArray(defaultValue)) return defaultValue;
      if (typeof defaultValue === 'string') return [defaultValue];
      return [];
    }
    if (typeof value === 'string') return [value];
    if (typeof defaultValue === 'string') return [defaultValue];
    if (Array.isArray(defaultValue) && defaultValue.length > 0) return [defaultValue[0]];
    return [];
  });

  const controlledValue = multiple
    ? (Array.isArray(value) ? value : value ? [value] : undefined)
    : (typeof value === 'string' ? [value] : value ? [value] : undefined);

  const selectedValues = controlledValue ?? internalValue;

  // Search results
  const results = useMemo(() => {
    const config: ComboboxSearchConfig = {
      query,
      maxResults: maxVisibleOptions * 10,
      showRecents,
      maxRecents,
    };

    return searchEngine.search(allOptions, config);
  }, [allOptions, query, maxVisibleOptions, showRecents, maxRecents, searchEngine]);

  const hasResults = results.length > 0;
  const isEmpty = !query && !hasResults;

  // Recent options (when no query)
  const recentOptions = useMemo(() => {
    if (query) return [];
    return searchEngine.getRecents(allOptions);
  }, [query, allOptions, searchEngine]);

  // Selected options
  const selectedOptions = useMemo(
    () => allOptions.filter((opt) => selectedValues.includes(opt.value)),
    [allOptions, selectedValues],
  );

  // Virtualization
  const containerHeight = maxVisibleOptions * itemHeight;
  const visibleCount = Math.min(results.length, maxVisibleOptions);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 2, results.length);

  const virtualItems = useMemo(() => {
    const items: {
      index: number;
      result: ComboboxSearchResult;
      top: number;
    }[] = [];

    for (let i = startIndex; i < endIndex; i++) {
      const result = results[i];
      if (result) {
        items.push({
          index: i,
          result,
          top: i * itemHeight,
        });
      }
    }

    return items;
  }, [results, startIndex, endIndex, itemHeight]);

  const totalHeight = results.length * itemHeight;

  const onScroll = useCallback((newScrollTop: number) => {
    setScrollTop(newScrollTop);
  }, []);

  // Selection helpers
  const isSelected = useCallback(
    (val: string) => selectedValues.includes(val),
    [selectedValues],
  );

  const selectOption = useCallback(
    (val: string) => {
      const option = allOptions.find((o) => o.value === val);
      if (!option || option.disabled) return;

      // Mark as recent
      searchEngine.markRecent(option.id);

      let newValue: string[];
      if (multiple) {
        newValue = selectedValues.includes(val)
          ? selectedValues
          : [...selectedValues, val];
      } else {
        newValue = [val];
        setIsOpen(false);
      }

      setInternalValue(newValue);
      onValueChange?.(multiple ? newValue : newValue[0]);
      setQuery('');
    },
    [allOptions, multiple, selectedValues, onValueChange, searchEngine],
  );

  const deselectOption = useCallback(
    (val: string) => {
      if (!multiple) return;
      const newValue = selectedValues.filter((v) => v !== val);
      setInternalValue(newValue);
      onValueChange?.(newValue);
    },
    [multiple, selectedValues, onValueChange],
  );

  const toggleOption = useCallback(
    (val: string) => {
      if (isSelected(val)) {
        deselectOption(val);
      } else {
        selectOption(val);
      }
    },
    [isSelected, deselectOption, selectOption],
  );

  const clearSelection = useCallback(() => {
    setInternalValue([]);
    onValueChange?.(multiple ? [] : '');
  }, [multiple, onValueChange]);

  // Open/close
  const open = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setHighlightedIndex(0);
    setQuery('');
    onOpenChange?.(true);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [disabled, onOpenChange]);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    onOpenChange?.(false);
  }, [onOpenChange]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  // Reset highlighted index when query changes
  useEffect(() => {
    setHighlightedIndex(0);
    setScrollTop(0);
  }, [query]);

  // Notify search changes
  useEffect(() => {
    onSearchChange?.(query);
  }, [query, onSearchChange]);

  // Keyboard navigation for container
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) {
          open();
        } else {
          setHighlightedIndex((prev) => Math.min(prev + 1, results.length - 1));
          // Scroll into view
          const newIndex = Math.min(highlightedIndex + 1, results.length - 1);
          const itemTop = newIndex * itemHeight;
          const itemBottom = itemTop + itemHeight;
          const containerH = maxVisibleOptions * itemHeight;
          if (itemBottom > scrollTop + containerH) {
            setScrollTop(itemBottom - containerH);
          } else if (itemTop < scrollTop) {
            setScrollTop(itemTop);
          }
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) {
          open();
        } else {
          setHighlightedIndex((prev) => Math.max(prev - 1, 0));
          const newIndex = Math.max(highlightedIndex - 1, 0);
          const itemTop = newIndex * itemHeight;
          if (itemTop < scrollTop) {
            setScrollTop(itemTop);
          }
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (isOpen && results.length > 0) {
          const result = results[highlightedIndex];
          if (result) {
            toggleOption(result.option.value);
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (isOpen) {
          close();
        }
      }
    },
    [
      isOpen,
      results,
      highlightedIndex,
      itemHeight,
      maxVisibleOptions,
      scrollTop,
      open,
      close,
      toggleOption,
    ],
  );

  // Keyboard navigation for input
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !query && multiple && selectedValues.length > 0) {
        deselectOption(selectedValues[selectedValues.length - 1]);
      }
    },
    [query, multiple, selectedValues, deselectOption],
  );

  // Display value
  const displayValue = useMemo(() => {
    if (selectedOptions.length === 0) return '';
    if (multiple) {
      return selectedOptions.map((opt) => opt.label).join(', ');
    }
    return selectedOptions[0]?.label || '';
  }, [selectedOptions, multiple]);

  return {
    isOpen,
    open,
    close,
    toggle,
    query,
    setQuery,
    results,
    hasResults,
    showRecents,
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
    isDisabled: disabled,
    isEmpty,
    emptyMessage,
  };
}

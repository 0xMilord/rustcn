/**
 * useCalendar — Hook for calendar state management and keyboard navigation.
 *
 * Features:
 * - Month/year navigation
 * - Date range selection
 * - Disabled date handling
 * - Keyboard navigation (arrow keys, home/end for month boundaries)
 * - Single or range mode
 * - WASM engine integration for large date sets
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { JsDateEngine, type RustDateEngine, type CalendarConfig, type DateRange, type MonthGrid } from './date-engine.js';

export interface UseCalendarOptions {
  mode?: 'single' | 'range';
  selected?: Date | DateRange;
  defaultMonth?: Date;
  fromDate?: Date;
  toDate?: Date;
  disabledDates?: Date[];
  disabledDaysOfWeek?: number[];
  numberOfMonths?: number;
  onSelectionChange?: (date: Date | DateRange | undefined) => void;
  engine?: RustDateEngine;
}

export interface UseCalendarReturn {
  // Grid data
  months: MonthGrid[];

  // Current display month
  displayMonth: Date;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  goToMonth: (date: Date) => void;

  // Selection
  selectedDate: Date | null;
  selectedRange: DateRange;
  selectDate: (date: Date) => void;
  clearSelection: () => void;

  // Keyboard navigation
  focusedDate: Date | null;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  focusDate: (date: Date) => void;

  // State
  isDateDisabled: (date: Date) => boolean;
  isDateSelected: (date: Date) => boolean;
  isDateInRange: (date: Date) => boolean;
  isDateToday: (date: Date) => boolean;

  // Helpers
  formatMonthYear: (date: Date) => string;
  formatDay: (date: Date) => string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function useCalendar(options: UseCalendarOptions = {}): UseCalendarReturn {
  const {
    mode = 'single',
    selected,
    defaultMonth = new Date(),
    fromDate: minDate,
    toDate: maxDate,
    disabledDates = [],
    disabledDaysOfWeek = [],
    numberOfMonths = 1,
    onSelectionChange,
    engine,
  } = options;

  const today = new Date();
  const dateEngine = engine || new JsDateEngine(today);

  // Display state
  const [displayMonth, setDisplayMonth] = useState(defaultMonth);
  const [focusedDate, setFocusedDate] = useState<Date | null>(null);

  // Selection state
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date | null>(
    mode === 'single' && selected instanceof Date ? selected : null,
  );
  const [internalRange, setInternalRange] = useState<DateRange>(
    mode === 'range' && selected && 'start' in selected
      ? selected as DateRange
      : { start: null, end: null },
  );
  const [rangeAnchor, setRangeAnchor] = useState<Date | null>(null);

  const selectedDate = mode === 'single'
    ? (selected instanceof Date ? selected : internalSelectedDate)
    : internalSelectedDate;

  const selectedRange = mode === 'range'
    ? (selected && 'start' in selected ? selected as DateRange : internalRange)
    : internalRange;

  // Config
  const config: CalendarConfig = useMemo(() => ({
    minDate,
    maxDate,
    disabledDates,
    disabledDaysOfWeek,
    today,
  }), [minDate, maxDate, disabledDates, disabledDaysOfWeek]);

  // Generate month grids
  const months = useMemo(() => {
    const result: MonthGrid[] = [];
    for (let i = 0; i < numberOfMonths; i++) {
      const targetMonth = dateEngine.addMonths(displayMonth, i);
      const grid = dateEngine.generateMonthGrid(
        targetMonth.getFullYear(),
        targetMonth.getMonth(),
        config,
      );

      // Enrich grid with selection info
      for (const week of grid.weeks) {
        for (const day of week) {
          const date = new Date(day.year, day.month, day.day);
          day.isSelected = mode === 'single'
            ? selectedDate ? dateEngine.isSameDay(date, selectedDate) : false
            : (
              (selectedRange.start && dateEngine.isSameDay(date, selectedRange.start)) ||
              (selectedRange.end && dateEngine.isSameDay(date, selectedRange.end))
            );
          day.isRangeStart = selectedRange.start
            ? dateEngine.isSameDay(date, selectedRange.start)
            : false;
          day.isRangeEnd = selectedRange.end
            ? dateEngine.isSameDay(date, selectedRange.end)
            : false;
          day.isInRange = dateEngine.isInDateRange(date, selectedRange);
        }
      }

      result.push(grid);
    }
    return result;
  }, [displayMonth, numberOfMonths, config, selectedDate, selectedRange, mode, dateEngine]);

  // Navigation
  const goToPreviousMonth = useCallback(() => {
    setDisplayMonth((prev) => dateEngine.addMonths(prev, -1));
  }, [dateEngine]);

  const goToNextMonth = useCallback(() => {
    setDisplayMonth((prev) => dateEngine.addMonths(prev, 1));
  }, [dateEngine]);

  const goToMonth = useCallback((date: Date) => {
    setDisplayMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setFocusedDate(date);
  }, []);

  // Selection handlers
  const selectDate = useCallback((date: Date) => {
    if (dateEngine.isDateDisabled(date, config)) return;

    if (mode === 'single') {
      setInternalSelectedDate(date);
      setFocusedDate(date);
      onSelectionChange?.(date);
    } else {
      // Range mode
      if (!rangeAnchor || (internalRange.start && internalRange.end)) {
        // Start new range
        setInternalRange({ start: date, end: null });
        setRangeAnchor(date);
        onSelectionChange?.({ start: date, end: null });
      } else if (!internalRange.end) {
        // Complete the range
        const start = dateEngine.compareDates(rangeAnchor, date) <= 0
          ? rangeAnchor
          : date;
        const end = dateEngine.compareDates(rangeAnchor, date) <= 0
          ? date
          : rangeAnchor;
        const range = { start, end };
        setInternalRange(range);
        setRangeAnchor(null);
        onSelectionChange?.(range);
      }
    }
  }, [mode, dateEngine, config, rangeAnchor, internalRange, onSelectionChange]);

  const clearSelection = useCallback(() => {
    if (mode === 'single') {
      setInternalSelectedDate(null);
      onSelectionChange?.(undefined);
    } else {
      setInternalRange({ start: null, end: null });
      setRangeAnchor(null);
      onSelectionChange?.(undefined);
    }
  }, [mode, onSelectionChange]);

  // Date checkers
  const isDateDisabled = useCallback((date: Date) => {
    return dateEngine.isDateDisabled(date, config);
  }, [dateEngine, config]);

  const isDateSelected = useCallback((date: Date) => {
    if (mode === 'single') {
      return selectedDate ? dateEngine.isSameDay(date, selectedDate) : false;
    }
    return (
      (selectedRange.start && dateEngine.isSameDay(date, selectedRange.start)) ||
      (selectedRange.end && dateEngine.isSameDay(date, selectedRange.end))
    );
  }, [mode, selectedDate, selectedRange, dateEngine]);

  const isDateInRange = useCallback((date: Date) => {
    return dateEngine.isInDateRange(date, selectedRange);
  }, [dateEngine, selectedRange]);

  const isDateToday = useCallback((date: Date) => {
    return dateEngine.isSameDay(date, today);
  }, [dateEngine, today]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const currentDate = focusedDate || displayMonth;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        setFocusedDate(dateEngine.addDays(currentDate, -1));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setFocusedDate(dateEngine.addDays(currentDate, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedDate(dateEngine.addDays(currentDate, -7));
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedDate(dateEngine.addDays(currentDate, 7));
        break;
      case 'Home': {
        e.preventDefault();
        const { firstDay } = dateEngine.getMonthBoundaryDates(
          currentDate.getFullYear(),
          currentDate.getMonth(),
        );
        setFocusedDate(firstDay);
        break;
      }
      case 'End': {
        e.preventDefault();
        const { lastDay } = dateEngine.getMonthBoundaryDates(
          currentDate.getFullYear(),
          currentDate.getMonth(),
        );
        setFocusedDate(lastDay);
        break;
      }
      case 'PageUp':
        e.preventDefault();
        setFocusedDate(dateEngine.addMonths(currentDate, -1));
        break;
      case 'PageDown':
        e.preventDefault();
        setFocusedDate(dateEngine.addMonths(currentDate, 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedDate) {
          selectDate(focusedDate);
        }
        break;
      case 'Escape':
        e.preventDefault();
        clearSelection();
        break;
    }
  }, [focusedDate, displayMonth, dateEngine, selectDate, clearSelection]);

  const focusDate = useCallback((date: Date) => {
    setFocusedDate(date);
  }, []);

  // Format helpers
  const formatMonthYear = useCallback((date: Date) => {
    return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  }, []);

  const formatDay = useCallback((date: Date) => {
    return `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  }, []);

  return {
    months,
    displayMonth,
    goToPreviousMonth,
    goToNextMonth,
    goToMonth,
    selectedDate,
    selectedRange,
    selectDate,
    clearSelection,
    focusedDate,
    handleKeyDown,
    focusDate,
    isDateDisabled,
    isDateSelected,
    isDateInRange,
    isDateToday,
    formatMonthYear,
    formatDay,
  };
}

/**
 * Calendar — A full-featured date picker component.
 *
 * Features:
 * - Month/year navigation with dropdown selectors
 * - Date range selection
 * - Disabled dates support
 * - Keyboard navigation (arrow keys, home/end for month boundaries)
 * - Shows 1-3 months side by side
 * - WASM date engine for large date ranges (1000+ date options)
 * - JS fallback for small ranges
 *
 * Keyboard shortcuts:
 * - Arrow keys: navigate days
 * - Home/End: first/last day of month
 * - PageUp/PageDown: previous/next month
 * - Enter/Space: select date
 * - Escape: clear selection
 */

import * as React from 'react';
import { cn } from '../shared/cn.js';
import { useCalendar, type UseCalendarOptions } from './useCalendar.js';
import { JsDateEngine, type RustDateEngine, type DateRange, getDateEngine } from './date-engine.js';

export interface CalendarProps extends Omit<UseCalendarOptions, 'engine'> {
  className?: string;
  classNames?: {
    months?: string;
    month?: string;
    caption?: string;
    captionLabel?: string;
    nav?: string;
    navButton?: string;
    navButtonPrevious?: string;
    navButtonNext?: string;
    table?: string;
    headRow?: string;
    headCell?: string;
    row?: string;
    cell?: string;
    day?: string;
    dayRangeStart?: string;
    dayRangeEnd?: string;
    dayInRange?: string;
    daySelected?: string;
    dayToday?: string;
    dayDisabled?: string;
    dayOutsideMonth?: string;
  };
  showOutsideDays?: boolean;
  engine?: RustDateEngine;
}

const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  (
    {
      className,
      classNames = {},
      mode = 'single',
      selected,
      defaultMonth,
      fromDate,
      toDate,
      disabledDates,
      disabledDaysOfWeek,
      numberOfMonths = 1,
      onSelectionChange,
      showOutsideDays = false,
      engine,
      ...props
    },
    ref,
  ) => {
    const today = new Date();
    const dateEngine = engine || getDateEngine(numberOfMonths * 42, today);

    const {
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
    } = useCalendar({
      mode,
      selected,
      defaultMonth,
      fromDate,
      toDate,
      disabledDates,
      disabledDaysOfWeek,
      numberOfMonths,
      onSelectionChange,
      engine: dateEngine,
    });

    const [showMonthDropdown, setShowMonthDropdown] = React.useState(false);
    const [showYearDropdown, setShowYearDropdown] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    // Close dropdowns on outside click
    React.useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setShowMonthDropdown(false);
          setShowYearDropdown(false);
        }
      }
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Year range for dropdown
    const yearOptions = React.useMemo(() => {
      const currentYear = today.getFullYear();
      const startYear = fromDate ? fromDate.getFullYear() : currentYear - 50;
      const endYear = toDate ? toDate.getFullYear() : currentYear + 50;
      const years: number[] = [];
      for (let y = startYear; y <= endYear; y++) {
        years.push(y);
      }
      return years;
    }, [today, fromDate, toDate]);

    const monthOptions = React.useMemo(() => [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ], []);

    const handleMonthSelect = React.useCallback((monthIndex: number) => {
      const newDate = new Date(displayMonth.getFullYear(), monthIndex, 1);
      goToMonth(newDate);
      setShowMonthDropdown(false);
    }, [displayMonth, goToMonth]);

    const handleYearSelect = React.useCallback((year: number) => {
      const newDate = new Date(year, displayMonth.getMonth(), 1);
      goToMonth(newDate);
      setShowYearDropdown(false);
    }, [displayMonth, goToMonth]);

    const isPreviousDisabled = React.useMemo(() => {
      if (!fromDate) return false;
      const prevMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1);
      return prevMonth.getFullYear() < fromDate.getFullYear() ||
        (prevMonth.getFullYear() === fromDate.getFullYear() && prevMonth.getMonth() < fromDate.getMonth());
    }, [displayMonth, fromDate]);

    const isNextDisabled = React.useMemo(() => {
      if (!toDate) return false;
      const nextMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1);
      return nextMonth.getFullYear() > toDate.getFullYear() ||
        (nextMonth.getFullYear() === toDate.getFullYear() && nextMonth.getMonth() > toDate.getMonth());
    }, [displayMonth, toDate]);

    const ariaLabel = mode === 'range'
      ? 'Date range picker calendar'
      : 'Date picker calendar';

    return (
      <div
        ref={ref}
        className={cn('rounded-lg border bg-card p-3 shadow-sm', className)}
        role="application"
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {/* Caption with navigation */}
        <div className={cn('flex items-center justify-between mb-3', classNames.caption)}>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={cn(
                'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'disabled:pointer-events-none disabled:opacity-50',
                'h-7 w-7',
                classNames.navButton,
                classNames.navButtonPrevious,
              )}
              onClick={goToPreviousMonth}
              disabled={isPreviousDisabled}
              aria-label="Previous month"
              tabIndex={-1}
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
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          </div>

          {/* Month/Year selector with dropdowns */}
          <div ref={dropdownRef} className="flex items-center gap-1 relative">
            <button
              type="button"
              className={cn(
                'text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md px-2 py-1 transition-colors',
                classNames.captionLabel,
              )}
              onClick={() => {
                setShowMonthDropdown(!showMonthDropdown);
                setShowYearDropdown(false);
              }}
              aria-label="Select month"
              aria-haspopup="listbox"
              aria-expanded={showMonthDropdown}
            >
              {monthOptions[displayMonth.getMonth()]}
            </button>

            {showMonthDropdown && (
              <div
                className={cn(
                  'absolute top-full left-0 z-50 mt-1 rounded-md border bg-popover p-1 shadow-md',
                  'max-h-60 overflow-y-auto',
                  'animate-in fade-in-0 zoom-in-95',
                )}
                role="listbox"
                aria-label="Months"
              >
                {monthOptions.map((month, idx) => (
                  <button
                    key={month}
                    type="button"
                    role="option"
                    aria-selected={idx === displayMonth.getMonth()}
                    className={cn(
                      'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                      'hover:bg-accent hover:text-accent-foreground',
                      idx === displayMonth.getMonth() && 'bg-accent text-accent-foreground font-medium',
                    )}
                    onClick={() => handleMonthSelect(idx)}
                  >
                    {month}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              className={cn(
                'text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md px-2 py-1 transition-colors',
                classNames.captionLabel,
              )}
              onClick={() => {
                setShowYearDropdown(!showYearDropdown);
                setShowMonthDropdown(false);
              }}
              aria-label="Select year"
              aria-haspopup="listbox"
              aria-expanded={showYearDropdown}
            >
              {displayMonth.getFullYear()}
            </button>

            {showYearDropdown && (
              <div
                className={cn(
                  'absolute top-full right-0 z-50 mt-1 rounded-md border bg-popover p-1 shadow-md',
                  'max-h-60 overflow-y-auto',
                  'animate-in fade-in-0 zoom-in-95',
                )}
                role="listbox"
                aria-label="Years"
              >
                {yearOptions.map((year) => (
                  <button
                    key={year}
                    type="button"
                    role="option"
                    aria-selected={year === displayMonth.getFullYear()}
                    className={cn(
                      'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                      'hover:bg-accent hover:text-accent-foreground',
                      year === displayMonth.getFullYear() && 'bg-accent text-accent-foreground font-medium',
                    )}
                    onClick={() => handleYearSelect(year)}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className={cn(
                'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                'disabled:pointer-events-none disabled:opacity-50',
                'h-7 w-7',
                classNames.navButton,
                classNames.navButtonNext,
              )}
              onClick={goToNextMonth}
              disabled={isNextDisabled}
              aria-label="Next month"
              tabIndex={-1}
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
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Month grids */}
        <div className={cn('flex gap-4', numberOfMonths > 1 && 'flex-wrap', classNames.months)}>
          {months.map((monthGrid, monthIndex) => (
            <div key={`${monthGrid.year}-${monthGrid.month}`} className={cn('min-w-[250px]', classNames.month)}>
              {/* Day headers */}
              <table className={cn('w-full border-collapse space-y-1', classNames.table)}>
                <thead>
                  <tr className={cn('flex', classNames.headRow)}>
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                      <th
                        key={day}
                        scope="col"
                        className={cn(
                          'w-9 text-[0.8rem] font-normal text-muted-foreground text-center',
                          classNames.headCell,
                        )}
                        aria-label={day}
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Day cells */}
                <tbody>
                  {monthGrid.weeks.map((week, weekIndex) => (
                    <tr key={weekIndex} className={cn('mt-2 flex w-full', classNames.row)}>
                      {week.map((day, dayIndex) => {
                        const date = new Date(day.year, day.month, day.day);
                        const isOutsideMonth = day.month !== monthGrid.month;
                        const isFocused = focusedDate
                          ? dateEngine.isSameDay(date, focusedDate)
                          : false;

                        if (isOutsideMonth && !showOutsideDays) {
                          return (
                            <td
                              key={dayIndex}
                              className={cn('w-9 h-9 text-center text-sm p-0 relative', classNames.cell)}
                              aria-hidden="true"
                            />
                          );
                        }

                        return (
                          <td
                            key={dayIndex}
                            className={cn('w-9 h-9 text-center text-sm p-0 relative', classNames.cell)}
                          >
                            <button
                              type="button"
                              tabIndex={isFocused ? 0 : -1}
                              className={cn(
                                'inline-flex h-9 w-9 items-center justify-center rounded-md text-sm',
                                'transition-colors hover:bg-accent hover:text-accent-foreground',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                'font-normal',
                                // Outside month styling
                                isOutsideMonth && 'text-muted-foreground opacity-50',
                                // Disabled state
                                day.isDisabled && 'text-muted-foreground opacity-50 cursor-not-allowed pointer-events-none',
                                // Today
                                day.isToday && 'bg-accent text-accent-foreground font-bold',
                                // Selected (single or range boundaries)
                                (day.isSelected || day.isRangeStart || day.isRangeEnd) && [
                                  'bg-primary text-primary-foreground',
                                  'hover:bg-primary hover:text-primary-foreground',
                                  'focus-visible:bg-primary focus-visible:text-primary-foreground',
                                ],
                                // Range middle
                                day.isInRange && !day.isRangeStart && !day.isRangeEnd && [
                                  'bg-accent text-accent-foreground rounded-none',
                                  day.isRangeStart && 'rounded-l-md',
                                  day.isRangeEnd && 'rounded-r-md',
                                ],
                                // Range start/end rounded
                                day.isRangeStart && 'rounded-l-md',
                                day.isRangeEnd && 'rounded-r-md',
                                // Class overrides
                                classNames.day,
                                day.isDisabled && classNames.dayDisabled,
                                isOutsideMonth && classNames.dayOutsideMonth,
                                day.isToday && classNames.dayToday,
                                (day.isSelected || day.isRangeStart || day.isRangeEnd) && classNames.daySelected,
                                day.isInRange && classNames.dayInRange,
                                day.isRangeStart && classNames.dayRangeStart,
                                day.isRangeEnd && classNames.dayRangeEnd,
                              )}
                              disabled={day.isDisabled}
                              onClick={() => !day.isDisabled && selectDate(date)}
                              onMouseEnter={() => focusDate(date)}
                              onFocus={() => focusDate(date)}
                              aria-label={formatDay(date)}
                              aria-disabled={day.isDisabled}
                              aria-pressed={day.isSelected}
                              role="gridcell"
                            >
                              {day.day}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Selected range indicator */}
        {mode === 'range' && selectedRange.start && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground text-center">
            {selectedRange.start.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            {selectedRange.end && (
              <>
                {' \u2013 '}
                {selectedRange.end.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </>
            )}
            {!selectedRange.end && ' \u2013 Select end date'}
          </div>
        )}
      </div>
    );
  },
);

Calendar.displayName = 'Calendar';

export { Calendar };

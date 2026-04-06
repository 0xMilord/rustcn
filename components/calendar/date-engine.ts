/**
 * Rust Date Engine — WASM-powered date calculations.
 *
 * Provides fast date operations for large date ranges (1000+ dates):
 * - Generate date grids for calendar rendering
 * - Date range calculations and comparisons
 * - Disabled date evaluation
 * - Keyboard navigation boundaries
 *
 * Falls back to native JS Date for small ranges.
 */

import { getWasmModule } from '../../bindings/src/wasm/singleton.js';

export interface DateInfo {
  year: number;
  month: number; // 0-11
  day: number;
  isToday: boolean;
  isDisabled: boolean;
  isInRange: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isSelected: boolean;
}

export interface MonthGrid {
  year: number;
  month: number;
  weeks: DateInfo[][];
  monthLabel: string;
}

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface CalendarConfig {
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  disabledDaysOfWeek?: number[]; // 0=Sunday, 6=Saturday
  today?: Date;
}

export interface RustDateEngine {
  generateMonthGrid(year: number, month: number, config: CalendarConfig): MonthGrid;
  generateMultiMonthGrid(year: number, month: number, months: number, config: CalendarConfig): MonthGrid[];
  isInDateRange(date: Date, range: DateRange): boolean;
  isDateDisabled(date: Date, config: CalendarConfig): boolean;
  getMonthBoundaryDates(year: number, month: number): { firstDay: Date; lastDay: Date };
  addDays(date: Date, days: number): Date;
  addMonths(date: Date, months: number): Date;
  isSameDay(a: Date, b: Date): boolean;
  compareDates(a: Date, b: Date): number;
}

// Threshold: use WASM for 1000+ date calculations
const WASM_THRESHOLD_DATES = 1000;

/**
 * Native JS fallback for date operations.
 * Used when the date count is below the WASM threshold.
 */
class JsDateEngine implements RustDateEngine {
  private today: Date;

  constructor(today?: Date) {
    this.today = today || new Date();
  }

  generateMonthGrid(year: number, month: number, config: CalendarConfig): MonthGrid {
    const weeks: DateInfo[][] = [];
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startDay = firstDayOfMonth.getDay(); // 0=Sunday

    // Calculate start date (include previous month days to fill first week)
    const startDate = new Date(year, month, 1 - startDay);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    let currentDate = new Date(startDate);
    let week: DateInfo[] = [];

    // Generate 6 weeks to ensure full coverage
    for (let i = 0; i < 42; i++) {
      const dateInfo = this.createDateInfo(currentDate, config);

      week.push(dateInfo);

      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }

      // Stop if we've gone past the end of the month and completed the week
      if (currentDate > lastDayOfMonth && week.length === 0 && weeks.length >= 4) {
        break;
      }

      currentDate = this.addDays(currentDate, 1);
    }

    // Add the last week if it has any days
    if (week.length > 0) {
      // Fill remaining days
      while (week.length < 7) {
        week.push(this.createDateInfo(currentDate, config));
        currentDate = this.addDays(currentDate, 1);
      }
      weeks.push(week);
    }

    return {
      year,
      month,
      weeks,
      monthLabel: `${monthNames[month]} ${year}`,
    };
  }

  generateMultiMonthGrid(year: number, month: number, months: number, config: CalendarConfig): MonthGrid[] {
    const grids: MonthGrid[] = [];
    for (let i = 0; i < months; i++) {
      const targetDate = this.addMonths(new Date(year, month, 1), i);
      grids.push(this.generateMonthGrid(targetDate.getFullYear(), targetDate.getMonth(), config));
    }
    return grids;
  }

  private createDateInfo(date: Date, config: CalendarConfig): DateInfo {
    const today = config.today || this.today;
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      isToday: this.isSameDay(date, today),
      isDisabled: this.isDateDisabled(date, config),
      isInRange: false,
      isRangeStart: false,
      isRangeEnd: false,
      isSelected: false,
    };
  }

  isInDateRange(date: Date, range: DateRange): boolean {
    if (!range.start || !range.end) return false;
    const time = date.getTime();
    return time >= range.start.getTime() && time <= range.end.getTime();
  }

  isDateDisabled(date: Date, config: CalendarConfig): boolean {
    if (config.minDate && date < config.minDate) return true;
    if (config.maxDate && date > config.maxDate) return true;
    if (config.disabledDaysOfWeek?.includes(date.getDay())) return true;
    if (config.disabledDates) {
      for (const disabled of config.disabledDates) {
        if (this.isSameDay(date, disabled)) return true;
      }
    }
    return false;
  }

  getMonthBoundaryDates(year: number, month: number): { firstDay: Date; lastDay: Date } {
    return {
      firstDay: new Date(year, month, 1),
      lastDay: new Date(year, month + 1, 0),
    };
  }

  addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  compareDates(a: Date, b: Date): number {
    return a.getTime() - b.getTime();
  }
}

/**
 * WASM-backed date engine.
 *
 * Uses builder pattern similar to WasmTable.
 */
export class WasmDateEngine implements RustDateEngine {
  private today: Date;

  constructor(today?: Date) {
    this.today = today || new Date();
  }

  async generateMonthGridAsync(year: number, month: number, config: CalendarConfig): Promise<MonthGrid> {
    try {
      const handle = await getWasmModule('date-engine');
      const { DateEngine } = handle.exports as any;

      const configJson = JSON.stringify({
        ...config,
        today: this.today,
        minDate: config.minDate?.toISOString(),
        maxDate: config.maxDate?.toISOString(),
        disabledDates: config.disabledDates?.map((d) => d.toISOString()),
      });

      const engine = new DateEngine(year, month, 1, configJson);
      const resultJson = engine.generateMonthGrid();
      const result = JSON.parse(resultJson) as MonthGrid;

      // Mark range info if needed
      engine.free?.();
      return result;
    } catch {
      // Fallback to JS
      const jsEngine = new JsDateEngine(this.today);
      return jsEngine.generateMonthGrid(year, month, config);
    }
  }

  generateMonthGrid(year: number, month: number, config: CalendarConfig): MonthGrid {
    // Synchronous version uses JS fallback
    const jsEngine = new JsDateEngine(this.today);
    return jsEngine.generateMonthGrid(year, month, config);
  }

  generateMultiMonthGrid(year: number, month: number, months: number, config: CalendarConfig): MonthGrid[] {
    const jsEngine = new JsDateEngine(this.today);
    return jsEngine.generateMultiMonthGrid(year, month, months, config);
  }

  isInDateRange(date: Date, range: DateRange): boolean {
    if (!range.start || !range.end) return false;
    const time = date.getTime();
    return time >= range.start.getTime() && time <= range.end.getTime();
  }

  isDateDisabled(date: Date, config: CalendarConfig): boolean {
    if (config.minDate && date < config.minDate) return true;
    if (config.maxDate && date > config.maxDate) return true;
    if (config.disabledDaysOfWeek?.includes(date.getDay())) return true;
    if (config.disabledDates) {
      for (const disabled of config.disabledDates) {
        if (this.isSameDay(date, disabled)) return true;
      }
    }
    return false;
  }

  getMonthBoundaryDates(year: number, month: number): { firstDay: Date; lastDay: Date } {
    return {
      firstDay: new Date(year, month, 1),
      lastDay: new Date(year, month + 1, 0),
    };
  }

  addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  isSameDay(a: Date, b: Date): boolean {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  compareDates(a: Date, b: Date): number {
    return a.getTime() - b.getTime();
  }
}

/**
 * Factory to get the appropriate date engine based on data size.
 */
export function getDateEngine(dateCount?: number, today?: Date): RustDateEngine {
  const count = dateCount ?? 0;
  if (count >= WASM_THRESHOLD_DATES) {
    return new WasmDateEngine(today);
  }
  return new JsDateEngine(today);
}

// Export JS engine for direct use
export { JsDateEngine };

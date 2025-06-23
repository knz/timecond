import { TimeConfig } from './config';
import { DateRange, inDateRangeImpl, inRangeImpl, intersectionImpl, processRanges, SortedDateRanges, unionImpl } from './dateRangeImpl';
import { TimeCondVisitor } from './visitor';

/**
 * Abstract base class for time-based conditions.
 * Provides the interface for checking if a given time is within a condition's range
 * and finding the next time when the condition will be true.
 */
export abstract class Cond {
  /**
   * Accepts a visitor for this condition.
   * @param visitor The visitor to accept
   */
  public abstract accept(visitor: TimeCondVisitor): void;

  /**
   * Returns the range of dates that last satisfied the condition, using the given date as reference; the
   * result range includes the date if the condition is active at the given date.
   * The result start date if defined is always equal or earlier than the given date.
   * @param date - The date to check
   * @returns The range of dates that last satisfied the condition, or undefined if the condition is not active at the given date
   */
  public abstract lastActiveRange(date: Date): DateRange | undefined;

  /**
   * Checks if the given date satisfies this condition.
   * @param date - The date to check
   * @returns true if the date is within the condition's range, false otherwise
   */
  public inRange(date: Date): boolean {
    const range = this.lastActiveRange(date);
    return range !== undefined && inDateRangeImpl(date, range);
  }

  /**
   * Finds the very first union of DateRanges where the condition becomes true,
   * with the constraint that the start of this found range must be greater than or equal to searchAfter.
   * @param searchAfter - The reference date to find the next occurrence from
   * @returns The next date range when the condition will be true
   */
  public abstract nextRanges(searchAfter: Date): DateRangeSet;

  /**
   * Finds the next time when this condition will be true.
   * The caller is responsible for checking that the inRange method returns false before
   * calling this method.
   * @param date - The reference date to find the next occurrence from
   * @returns The next date when the condition will be true
   * @throws Error if the condition is already true at the given date
   */
  public nextStart(date: Date): Date | undefined {
    return this.nextRanges(date).firstDate();
  }

  /**
   * Returns when the condition will stop being true if it is currently true.
   * @param date - The date to check
   * @returns When the condition being true, or underfined if the condition is not true at the given date or there is no end to the condition.
   */
  public currentEnd(date: Date): Date | undefined {
    const range = this.lastActiveRange(date);
    if (!range) {
      return undefined;
    }
    return range.end;
  }
}

/**
 * Represents a set of date ranges.
 * The set is a union of the ranges.
 */
export class DateRangeSet {
  /**
   * A set of non-overlapping date ranges.
   * The ranges are maintained in sorted order by start date.
   * Adjacent ranges are automatically merged during construction.
   *
   * Invariants:
   * - the ranges don't overlap.
   * - the end of one range does not coincide with the start of the next (they are merged during extension).
   * - the ranges are sorted by start date.
   */
  public ranges: SortedDateRanges;

  constructor(ranges: DateRange[]) {
    this.ranges = processRanges(ranges);
  }

  /**
   * Return the DateRange that contains the given date, if any.
   * @param date - The date to check
   * @returns The DateRange that contains the given date, if any.
   */
  inRange(date: Date): DateRange | undefined {
    return inRangeImpl(date, this.ranges);
  }

  /**
   * Returns the first date in the set.
   * @returns The first date in the set.
   */
  firstDate(): Date | undefined {
    // NB: the invariant that the ranges are sorted by start date is used here.
    return this.ranges.length > 0 ? this.ranges[0].start : undefined;
  }

  /**
   * Returns the last date in the set, if there is one.
   * @returns The last date in the set.
   */
  lastDate(): Date | undefined {
    // NB: the invariant that the ranges are sorted by start date and do not overlap is used here.
    return this.ranges.length > 0 ? this.ranges[this.ranges.length - 1].end : undefined;
  }

  /**
   * Returns the last date range in the set, if there is one.
   * @returns The last date range in the set.
   */
  lastRange(): DateRange | undefined {
    return this.ranges.length > 0 ? this.ranges[this.ranges.length - 1] : undefined;
  }

  /**
   * Merges this set with another set of ranges.
   * @param other - The other set of ranges
   */
  union(other: DateRangeSet) {
    this.ranges = unionImpl(this.ranges, other.ranges);
  }

  /**
   * Intersects this set with another set of ranges.
   * The current set's ranges will be replaced by the intersection.
   * @param other - The other set of ranges to intersect with.
   */
  intersection(other: DateRangeSet) {
    this.ranges = intersectionImpl(this.ranges, other.ranges);
  }

  /**
   * Creates a deep clone of this DateRangeSet.
   * @returns A new DateRangeSet instance with a deep copy of the ranges.
   */
  clone(): DateRangeSet {
    const newSet = new DateRangeSet([]);
    newSet.ranges = this.ranges.map((range) => ({
      start: new Date(range.start),
      end: range.end ? new Date(range.end) : undefined,
    }));
    return newSet;
  }
}

/**
 * Condition that checks if a time delta has elapsed.
 */
export class TimeDeltaCond extends Cond {
  public readonly delta: number;
  public readonly validFrom: Date;
  constructor(startTime: Date, delta: number) {
    super();
    this.delta = delta;
    this.validFrom = new Date(startTime.getTime() + delta);
  }

  lastActiveRange(date: Date): DateRange | undefined {
    if (date >= this.validFrom) {
      return { start: this.validFrom };
    }
    return undefined;
  }

  nextRanges(searchAfter: Date): DateRangeSet {
    if (this.inRange(searchAfter)) {
      return new DateRangeSet([]);
    }
    return new DateRangeSet([{ start: this.validFrom }]);
  }

  accept(visitor: TimeCondVisitor): void {
    visitor.visitTimeDeltaCond(this);
  }
}

export type DayTime = { hour: number; minute: number };
type DayTimeRange = { start: DayTime; end: DayTime };

/**
 * Condition that checks if the current time falls within a daily time range.
 * Supports ranges that span midnight (e.g., 22:00 to 02:00).
 */
export class TimeBetweenCond extends Cond {
  // The inclusive range for this condition.
  public readonly range: DayTimeRange;

  /**
   * @param range - The range of time.
   * @param inclusive - Whether the range is inclusive. If true, the input range is inclusive,
   *                    and is used as-is. If false, the input range is exclusive, and the end time is adjusted
   *                    so the range inside the condition is inclusive.
   */
  constructor(range: DayTimeRange, inclusive: boolean = false) {
    super();
    this.range = { start: range.start, end: { ...range.end } };
    if (!inclusive) {
      // The provided range is exclusive, but our logic uses an inclusive range.
      // We need to adjust the end time to be inclusive.
      this.range.end.minute--;
      if (this.range.end.minute < 0) {
        this.range.end.minute = 59;
        this.range.end.hour--;
      }
      if (this.range.end.hour < 0) {
        this.range.end.hour = 23;
      }
    }
  }

  private getConcreteRange(date: Date, dayTime: DayTime): Date {
    const d = new Date(date);
    d.setHours(dayTime.hour, dayTime.minute, 0, 0);
    return d;
  }

  /*
    Compute the end of the range starting on 'relativeTo', which
    has the same length of time as the range starting on 'startTime' and ending on 'endTime'.
    @param relativeTo - The date to compute the end of the range relative to.
    @param startTime - The start of the range.
    @param endTime - The end of the range.
    @returns The end of the range.
  */
  private endRange(relativeTo: Date, startTime: Date, endTime: Date): Date {
    let d: Date;
    if (startTime <= endTime) {
      d = this.getConcreteRange(relativeTo, this.range.end);
    } else {
      d = this.getConcreteRange(relativeTo, this.range.end);
      d.setDate(d.getDate() + 1);
    }
    // NB: we add one minute to the end because the end is exclusive.
    d.setMinutes(d.getMinutes() + 1);
    return d;
  }

  lastActiveRange(date: Date): DateRange | undefined {
    const startTime = this.getConcreteRange(date, this.range.start);
    const endTime = this.getConcreteRange(date, this.range.end);

    const actualStart = new Date(startTime);
    if (date >= startTime) {
      // Range is e.g. 09:00 to 17:00, and 'date' is either in 09:00 to 17:00, or later.
      // Alternatively, range is 17:00 to 09:00, and 'date' is in 17:00 or later.
      // Then the range starting in the current day is the last active range.
      // no-op
    } else {
      // Range is e.g. 09:00 to 17:00, and 'date' is 07:00.
      // Then the range starting in the previous day is the last active range.
      actualStart.setDate(actualStart.getDate() - 1);
    }
    const actualEnd = this.endRange(actualStart, startTime, endTime);
    return { start: actualStart, end: actualEnd };
  }

  nextRanges(searchAfter: Date): DateRangeSet {
    const startTime = this.getConcreteRange(searchAfter, this.range.start);
    const endTime = this.getConcreteRange(searchAfter, this.range.end);

    const actualStart = new Date(startTime);
    if (searchAfter >= startTime) {
      // Range is e.g. 09:00 to 17:00, and 'searchAfter' is either in 09:00 to 17:00, or later.
      // Alternatively, range is 17:00 to 09:00, and 'searchAfter' is in 17:00 or later.
      // Then the range starting in the next day is the next range.
      actualStart.setDate(actualStart.getDate() + 1);
    } else {
      // Range is e.g. 09:00 to 17:00, and 'searchAfter' is 07:00.
      // Alternatively, range is 17:00 to 09:00, and 'searchAfter' is 07:00.
      // Then the range starting in the current day is the next range.
      // no-op
    }
    const actualEnd = this.endRange(actualStart, startTime, endTime);
    return new DateRangeSet([{ start: actualStart, end: actualEnd }]);
  }

  accept(visitor: TimeCondVisitor): void {
    visitor.visitTimeBetweenCond(this);
  }
}

/**
 * Condition that checks if the current month falls within a range of months.
 * Supports ranges that span across year boundaries (e.g., November to February).
 */
export class MonthBetweenCond extends Cond {
  constructor(public readonly range: { start: number; end: number }) {
    super();
    if (range.start < 0 || range.start > 11 || range.end < 0 || range.end > 11) {
      throw new Error('Month numbers must be between 0 and 11');
    }
  }

  private endRangeStartingOn(start: Date): Date {
    // NB: we add one to the end month because the end is exclusive.
    if (this.range.start <= this.range.end) {
      return new Date(start.getFullYear(), this.range.end + 1, 1);
    } else {
      return new Date(start.getFullYear() + 1, this.range.end + 1, 1);
    }
  }

  lastActiveRange(date: Date): DateRange | undefined {
    const currentMonth = date.getMonth();
    const currentYear = date.getFullYear();

    const startDate = new Date(currentYear, this.range.start, 1);
    startDate.setHours(0, 0, 0, 0);
    if (currentMonth >= this.range.start) {
      // Range is e.g. June to August, and 'date' is either in June/July/August, or later.
      // Alternatively, range is August to June, and 'date' is in August or later.
      // Then the range starting in the current year is the last active range.
      // no-op
    } else {
      // Range is e.g. June to August, and 'date' is in January.
      // Alternatively, range is August to June, and 'date' is in January.
      // In that case the last active range starts in the last year.
      startDate.setFullYear(startDate.getFullYear() - 1);
    }
    const endDate = this.endRangeStartingOn(startDate);
    return { start: startDate, end: endDate };
  }

  nextRanges(searchAfter: Date): DateRangeSet {
    const searchYear = searchAfter.getFullYear();
    const searchMonth = searchAfter.getMonth();
    const startDate = new Date(searchYear, this.range.start, 1);
    startDate.setHours(0, 0, 0, 0);
    if (searchMonth >= this.range.start) {
      // Range is e.g. June to August, and 'searchAfter' is in June or later.
      // Alternatively, range is August to June, and 'searchAfter' is in August or later.
      // Then the range starting in the year after 'searchAfter' is the next range.
      startDate.setFullYear(startDate.getFullYear() + 1);
    } else {
      // Range is e.g. June to August, and 'searchAfter' is in January.
      // Alternatively, range is August to June, and 'searchAfter' is in January.
      // Then the range starting in the same year as 'searchAfter' is the next range.
      // no-op
    }
    const endDate = this.endRangeStartingOn(startDate);
    return new DateRangeSet([{ start: startDate, end: endDate }]);
  }

  accept(visitor: TimeCondVisitor): void {
    visitor.visitMonthBetweenCond(this);
  }
}

/**
 * Represents a specific date (month and day).
 */
export type MonthDay = { month: number; day: number }; // month is 0-11, day is 1-31

/**
 * Condition that checks if the current date falls within a range of dates (month and day).
 * Supports ranges that span across year boundaries (e.g., December 15 to January 10).
 */
export class DateBetweenCond extends Cond {
  public readonly startMonthDay: MonthDay;
  public readonly endMonthDay: MonthDay;

  constructor(range: { start: MonthDay; end: MonthDay }) {
    super();
    if (
      range.start.month < 0 ||
      range.start.month > 11 ||
      range.end.month < 0 ||
      range.end.month > 11 ||
      range.start.day < 1 ||
      range.start.day > 31 ||
      range.end.day < 1 ||
      range.end.day > 31
    ) {
      throw new Error('Month must be between 0-11 and day between 1-31.');
    }
    // Basic validation for day based on month can be added here if needed,
    // e.g. February having 28/29 days. For now, keeping it simple.
    this.startMonthDay = range.start;
    this.endMonthDay = range.end;
  }

  private getConcreteRange(year: number, monthDay: MonthDay): Date {
    const d = new Date(year, monthDay.month, monthDay.day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Compute the end of the range starting on 'relativeTo', which
   * has the same length of time as the range starting on 'startDate' and ending on 'endDate'.
   * @param relativeTo - The date to compute the end of the range relative to.
   * @param startDate - The start of the range.
   * @param endDate - The end of the range.
   * @returns The end of the range.
   */
  private endRange(relativeTo: Date, startDate: Date, endDate: Date): Date {
    let d: Date;
    if (startDate <= endDate) {
      d = this.getConcreteRange(relativeTo.getFullYear(), this.endMonthDay);
    } else {
      d = this.getConcreteRange(relativeTo.getFullYear() + 1, this.endMonthDay);
    }
    // NB: we add one to the end day because the end is exclusive.
    d.setDate(d.getDate() + 1);
    return d;
  }

  lastActiveRange(date: Date): DateRange | undefined {
    const currentYear = date.getFullYear();
    const startDate = this.getConcreteRange(currentYear, this.startMonthDay);
    const endDate = this.getConcreteRange(currentYear, this.endMonthDay);

    const actualStart = new Date(startDate);
    if (date >= startDate) {
      // Range is e.g. Jun 1 to Aug 31, and 'date' is either in June/July/August, or later.
      // Alternatively, range is Aug 31 to Jun 1, and 'date' is Aug 31 or later.
      // Then the range starting in the current year is the last active range.
      // no-op
    } else {
      // Range is e.g. Jun 1 to Aug 31, and 'date' is in January.
      // Alternatively, range is Aug 31 to Jun 1, and 'date' is in January.
      // In that case the last active range starts in the last year.
      actualStart.setFullYear(actualStart.getFullYear() - 1);
    }
    const actualEnd = this.endRange(actualStart, startDate, endDate);
    return { start: actualStart, end: actualEnd };
  }

  nextRanges(searchAfter: Date): DateRangeSet {
    const currentYear = searchAfter.getFullYear();
    const startDate = this.getConcreteRange(currentYear, this.startMonthDay);
    const endDate = this.getConcreteRange(currentYear, this.endMonthDay);

    const actualStart = new Date(startDate);
    if (searchAfter >= startDate) {
      // Range is e.g. Jun 1 to Aug 31, and 'searchAfter' is either in June/July/August, or later.
      // Alternatively, range is Aug 31 to Jun 1, and 'searchAfter' is Aug 31 or later.
      // Then the range starting in the next year is the next range.
      actualStart.setFullYear(actualStart.getFullYear() + 1);
    } else {
      // Range is e.g. Jun 1 to Aug 31, and 'searchAfter' is in January.
      // Alternatively, range is Aug 31 to Jun 1, and 'searchAfter' is in January.
      // Then the range starting in the current year is the next range.
      // no-op
    }
    const actualEnd = this.endRange(actualStart, startDate, endDate);
    return new DateRangeSet([{ start: actualStart, end: actualEnd }]);
  }

  accept(visitor: TimeCondVisitor): void {
    visitor.visitDateBetweenCond(this);
  }
}

/**
 * Condition that checks if the current day of the month falls within a range of days.
 * Supports ranges that span across month boundaries (e.g., 25th to 5th).
 */
export class DayBetweenCond extends Cond {
  constructor(public readonly range: { start: number; end: number }) {
    super();
    if (range.start < 1 || range.start > 31 || range.end < 1 || range.end > 31) {
      throw new Error('Day numbers must be between 1 and 31');
    }
  }

  private endRangeStartingOn(start: Date): Date {
    // NB: we add one to the end day because the end is exclusive.
    if (this.range.start <= this.range.end) {
      return new Date(start.getFullYear(), start.getMonth(), this.range.end + 1);
    } else {
      return new Date(start.getFullYear(), start.getMonth() + 1, this.range.end + 1);
    }
  }

  lastActiveRange(date: Date): DateRange | undefined {
    const currentDay = date.getDate();
    const currentMonth = date.getMonth();
    const currentYear = date.getFullYear();

    const startDate = new Date(currentYear, currentMonth, this.range.start);
    startDate.setHours(0, 0, 0, 0);
    if (currentDay >= this.range.start) {
      // Range is e.g. 10 to 20, and 'date' is 10 or later.
      // Alternatively, range is 20 to 10, and 'date' is 20 or later.
      // Then the range starting in the current month is the last active range.
      // no-op
    } else {
      // Range is e.g. 10 to 20, and 'date' is on the 5th.
      // Alternatively, range is 20 to 10, and 'date' on the 5th.
      // In that case the last active range starts in the last month.
      startDate.setMonth(startDate.getMonth() - 1);
    }
    const endDate = this.endRangeStartingOn(startDate);
    return { start: startDate, end: endDate };
  }

  nextRanges(searchAfter: Date): DateRangeSet {
    const searchYear = searchAfter.getFullYear();
    const searchMonth = searchAfter.getMonth();
    const searchDay = searchAfter.getDate();
    const startDate = new Date(searchYear, searchMonth, this.range.start);
    startDate.setHours(0, 0, 0, 0);
    if (searchDay >= this.range.start) {
      // Range is e.g. 10 to 20, and 'searchAfter' is 10 or later.
      // Alternatively, range is 20 to 10, and 'searchAfter' is 20 or later.
      // Then the range starting in the next month is the next range.
      startDate.setMonth(startDate.getMonth() + 1);
    } else {
      // Range is e.g. 10 to 20, and 'searchAfter' is on the 5th.
      // Alternatively, range is 20 to 10, and 'searchAfter' on the 5th.
      // Then the range starting in the same month as 'searchAfter' is the next range.
      // no-op
    }
    const endDate = this.endRangeStartingOn(startDate);
    return new DateRangeSet([{ start: startDate, end: endDate }]);
  }

  accept(visitor: TimeCondVisitor): void {
    visitor.visitDayBetweenCond(this);
  }
}

/**
 * Condition that checks if the current time falls within a predefined part of the day.
 * Supports parts like morning, afternoon, evening, and night.
 */
export class DayPartCond extends Cond {
  public readonly cond: Cond;
  public readonly dayPart: string;

  constructor(dayPart: string, timeRange: DayTimeRange) {
    super();
    this.dayPart = dayPart;
    this.cond = new TimeBetweenCond(timeRange, false /* inclusive */);
  }

  lastActiveRange(date: Date): DateRange | undefined {
    return this.cond.lastActiveRange(date);
  }

  nextRanges(searchAfter: Date): DateRangeSet {
    return this.cond.nextRanges(searchAfter);
  }

  accept(visitor: TimeCondVisitor): void {
    visitor.visitDayPartCond(this);
  }
}

/**
 * Condition that checks for a given duration.
 */
export class TimeSpanCond extends Cond {
  public readonly months: number;
  public readonly days: number;
  public readonly hours: number;
  public readonly minutes: number;
  public readonly seconds: number;
  constructor(duration: { months?: number; days?: number; hours?: number; minutes?: number; seconds?: number }) {
    super();
    this.months = duration.months ?? 0;
    this.days = duration.days ?? 0;
    this.hours = duration.hours ?? 0;
    this.minutes = duration.minutes ?? 0;
    this.seconds = duration.seconds ?? 0;
    if (this.months < 0 || this.days < 0 || this.hours < 0 || this.minutes < 0 || this.seconds < 0) {
      throw new Error('Duration must be positive');
    }
    if (this.months === 0 && this.days === 0 && this.hours === 0 && this.minutes === 0 && this.seconds === 0) {
      throw new Error('Duration must be non-zero');
    }
  }

  private endRange(startDate: Date): Date {
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + this.months);
    endDate.setDate(endDate.getDate() + this.days);
    endDate.setHours(endDate.getHours() + this.hours);
    endDate.setMinutes(endDate.getMinutes() + this.minutes);
    endDate.setSeconds(endDate.getSeconds() + this.seconds);
    return endDate;
  }

  lastActiveRange(date: Date): DateRange | undefined {
    const startDate = new Date(date);
    startDate.setMilliseconds(0);
    if (this.seconds === 0) {
      startDate.setSeconds(0);
      if (this.minutes === 0) {
        startDate.setMinutes(0);
        if (this.hours === 0) {
          startDate.setHours(0);
          if (this.days === 0) {
            startDate.setDate(1);
          }
        }
      }
    }
    const endDate = this.endRange(startDate);
    return { start: startDate, end: endDate };
  }

  nextRanges(searchAfter: Date): DateRangeSet {
    const startDate = new Date(searchAfter);
    startDate.setMilliseconds(0);
    if (this.seconds > 0) {
      startDate.setSeconds(startDate.getSeconds() + 1);
    } else {
      startDate.setSeconds(0);
      if (this.minutes > 0) {
        startDate.setMinutes(startDate.getMinutes() + 1);
      } else {
        startDate.setMinutes(0);
        if (this.hours > 0) {
          startDate.setHours(startDate.getHours() + 1);
        } else {
          startDate.setHours(0);
          if (this.days > 0) {
            startDate.setDate(startDate.getDate() + 1);
          } else {
            startDate.setDate(1);
          }
        }
      }
    }
    const endDate = this.endRange(startDate);
    return new DateRangeSet([{ start: startDate, end: endDate }]);
  }

  accept(visitor: TimeCondVisitor): void {
    visitor.visitTimeSpanCond(this);
  }
}

/**
 * Condition that checks if the current day matches a specific day of the week.
 */
export class WeekDay extends Cond {
  constructor(public readonly weekDayNumber: number) {
    super();
    if (weekDayNumber < 0 || weekDayNumber > 6) {
      throw new Error('Week day number must be between 0 and 6');
    }
  }

  lastActiveRange(date: Date): DateRange | undefined {
    const currentDayNumber = date.getDay();

    // Calculate how many days ago the targetDayNumber last occurred
    const daysAgo = (currentDayNumber - this.weekDayNumber + 7) % 7;

    const lastInstanceDate = new Date(date);
    lastInstanceDate.setDate(date.getDate() - daysAgo);
    lastInstanceDate.setHours(0, 0, 0, 0); // Start of that day

    const lastInstanceEnd = new Date(lastInstanceDate);
    lastInstanceEnd.setDate(lastInstanceDate.getDate() + 1); // End of that day (start of next)

    return { start: lastInstanceDate, end: lastInstanceEnd };
  }

  nextRanges(searchAfter: Date): DateRangeSet {
    const currentDay = searchAfter.getDay();
    let daysUntilNextWeekDay = this.weekDayNumber - currentDay;
    if (daysUntilNextWeekDay <= 0) {
      daysUntilNextWeekDay += 7;
    }

    const nextStartDate = new Date(searchAfter);
    nextStartDate.setDate(searchAfter.getDate() + daysUntilNextWeekDay);
    nextStartDate.setHours(0, 0, 0, 0);

    const nextEndDate = new Date(nextStartDate);
    nextEndDate.setDate(nextStartDate.getDate() + 1);

    return new DateRangeSet([{ start: nextStartDate, end: nextEndDate }]);
  }

  accept(visitor: TimeCondVisitor): void {
    visitor.visitWeekDay(this);
  }
}

/**
 * Combines multiple conditions with OR logic.
 * The condition is true if any of the child conditions are true.
 */
export class OrCond extends Cond {
  constructor(public readonly conditions: Cond[]) {
    if (conditions.length === 0) {
      throw new Error('At least one condition is required');
    }
    super();
  }

  lastActiveRange(date: Date): DateRange | undefined {
    let resultSet: SortedDateRanges = [];
    for (const cond of this.conditions) {
      const childNextRangeSet = cond.lastActiveRange(date);
      if (childNextRangeSet) {
        resultSet = unionImpl(resultSet, [childNextRangeSet]);
      }
    }
    if (resultSet.length === 0) {
      return undefined;
    }
    return resultSet[resultSet.length - 1];
  }

  nextRanges(searchAfter: Date): DateRangeSet {
    const resultSet = new DateRangeSet([]);
    for (const cond of this.conditions) {
      const childNextRangeSet = cond.nextRanges(searchAfter);
      resultSet.union(childNextRangeSet); // Union all ranges from all child conditions
    }
    return resultSet;
  }

  accept(visitor: TimeCondVisitor): void {
    visitor.visitOrCond(this);
  }
}

/**
 * Combines multiple conditions with AND logic.
 * The condition is true only if all child conditions are true.
 */
export class AndCond extends Cond {
  constructor(public readonly conditions: Cond[]) {
    if (conditions.length === 0) {
      throw new Error('At least one condition is required');
    }
    super();
  }

  lastActiveRange(date: Date): DateRange | undefined {
    let earliestStart: Date | undefined;
    let latestEnd: Date | undefined;
    for (const cond of this.conditions) {
      const range = cond.lastActiveRange(date);
      if (!range) {
        continue;
      }
      // console.log('AND EARLIEST TRY', cond, range);
      if (!earliestStart || range.start < earliestStart) {
        earliestStart = range.start;
      }
      if (!latestEnd || (range.end && range.end > latestEnd)) {
        latestEnd = range.end;
      }
    }
    //console.log('AND EARLIEST', earliestStart, latestEnd);
    if (!earliestStart) {
      // None of the conditions have a last active range.
      return undefined;
    }
    let earliestStart2: Date | undefined;
    for (const cond of this.conditions) {
      const range = cond.lastActiveRange(earliestStart);
      if (!range) {
        continue;
      }
      // console.log('AND EARLIEST TRY', cond, range);
      if (!earliestStart2 || range.start < earliestStart2) {
        earliestStart2 = range.start;
      }
    }
    // console.log('AND EARLIEST2', earliestStart2);
    if (earliestStart2) {
      earliestStart = earliestStart2;
    }

    const intersection = new DateRangeSet([{ start: earliestStart, end: latestEnd }]);
    // console.log('AND INTERSECTION START', JSON.stringify(intersection));
    for (const cond of this.conditions) {
      // Compute the union of all ranges of this condition that
      // fit inside the largest range.
      //
      // For example, if the current condition has a span of "monday to wednesday"
      // We compute the union of the 3 days.
      const unionRanges = new DateRangeSet([]);

      let refStart = new Date(earliestStart);
      const condRange = cond.lastActiveRange(refStart);
      if (condRange) {
        refStart = condRange.start;
      }
      refStart.setMilliseconds(refStart.getMilliseconds() - 1);
      let condRanges = cond.nextRanges(refStart);
      // console.log('AND UNION RANGES', cond, JSON.stringify(condRanges));
      unionRanges.union(condRanges);
      // console.log('AND UNION RANGES RESULT', cond, JSON.stringify(unionRanges));

      while (condRanges.lastDate() && (latestEnd ? latestEnd >= condRanges.lastDate()! : date >= condRanges.lastDate()!)) {
        condRanges = cond.nextRanges(condRanges.lastDate()!);
        // console.log('AND UNION RANGES NEXT', cond, JSON.stringify(condRanges));
        unionRanges.union(condRanges);
        // console.log('AND UNION RANGES NEXT RESULT', cond, JSON.stringify(unionRanges));
      }

      // Now unionRanges contains all the segments where this condition
      // has a valid range within the largest range.
      // Intersect that with the union from the previous condition.
      intersection.intersection(unionRanges);
      // console.log('AND INTERSECTION', JSON.stringify(intersection));
    }

    // We must only keep ranges that might have started at or before 'date'.
    intersection.ranges = intersection.ranges.filter((r) => date >= r.start);

    return intersection.lastRange();
  }

  nextRanges(searchAfter: Date): DateRangeSet {
    let earliestStart: Date | undefined;
    let latestEnd: Date | undefined;
    for (const cond of this.conditions) {
      const range = cond.lastActiveRange(searchAfter);
      if (!range) {
        continue;
      }
      // console.log('AND EARLIEST TRY1', cond, range);
      if (!earliestStart || range.start < earliestStart) {
        earliestStart = range.start;
      }
      const ranges = cond.nextRanges(searchAfter);
      if (!earliestStart || (ranges.firstDate() && ranges.firstDate()! < earliestStart)) {
        earliestStart = ranges.firstDate();
      }
      if (!latestEnd || (ranges.lastDate() && ranges.lastDate()! > latestEnd)) {
        latestEnd = ranges.lastDate();
      }
    }
    // console.log('AND NEXT RANGES', earliestStart, latestEnd);
    if (!earliestStart) {
      // None of the conditions have a next range.
      return new DateRangeSet([]);
    }

    const intersection = new DateRangeSet([{ start: earliestStart, end: latestEnd }]);
    // console.log('AND NEXT INTERSECTION START', JSON.stringify(intersection));
    for (const cond of this.conditions) {
      // Compute the union of all ranges of this condition that
      // fit inside the largest range.
      //
      // For example, if the current condition has a span of "monday to wednesday"
      // We compute the union of the 3 days.
      const unionRanges = new DateRangeSet([]);

      let refStart = new Date(earliestStart);
      const condRange = cond.lastActiveRange(refStart);
      if (condRange) {
        refStart = condRange.start;
      }
      refStart.setMilliseconds(refStart.getMilliseconds() - 1);
      let condRanges = cond.nextRanges(refStart);
      // console.log('AND NEXT UNION RANGES', cond, JSON.stringify(condRanges));
      unionRanges.union(condRanges);
      // console.log('AND NEXT UNION RANGES RESULT', cond, JSON.stringify(unionRanges));

      while (condRanges.lastDate() && latestEnd && latestEnd >= condRanges.lastDate()!) {
        condRanges = cond.nextRanges(condRanges.lastDate()!);
        // console.log('AND NEXT UNION RANGES NEXT', cond, JSON.stringify(condRanges));
        unionRanges.union(condRanges);
        // console.log('AND NEXT UNION RANGES NEXT RESULT', cond, JSON.stringify(unionRanges));
      }

      // Now unionRanges contains all the segments where this condition
      // has a valid range within the largest range.
      // Intersect that with the union from the previous condition.
      intersection.intersection(unionRanges);
      // console.log('AND INTERSECTION', JSON.stringify(intersection));
    }

    // We must only keep ranges that might have started at or before 'date'.
    intersection.ranges = intersection.ranges.filter((r) => searchAfter < r.start);

    return intersection;
  }

  accept(visitor: TimeCondVisitor): void {
    visitor.visitAndCond(this);
  }
}

/**
 * Combines a condition with an Nth logic.
 * This helps with patterns like "the third monday".
 */
export class NthCond extends Cond {
  public readonly startDate: Date;
  public readonly validFrom: DateRangeSet;
  public readonly n: number;
  public readonly cond: Cond;
  constructor(startDate: Date, n: number, cond: Cond) {
    super();
    this.n = n;
    this.cond = cond;
    this.startDate = startDate;
    this.validFrom = this._nextRanges(startDate);
  }

  lastActiveRange(date: Date): DateRange | undefined {
    const firstDate = this.validFrom.firstDate();
    if (!firstDate || date < firstDate) {
      // Not yet active.
      return undefined;
    }
    const lastDate = this.validFrom.lastDate();
    if (!lastDate) {
      // No end.
      return this.validFrom.lastRange();
    }
    let candidate = this.validFrom;
    let nextRanges = this._nextRanges(lastDate);
    while (nextRanges.ranges.length > 0 && date >= nextRanges.firstDate()! && nextRanges.lastDate()) {
      candidate = nextRanges;
      nextRanges = this._nextRanges(candidate.lastDate()!);
    }
    return candidate.lastRange();
  }

  nextRanges(searchAfter: Date): DateRangeSet {
    let candidate = this._nextRanges(this.startDate);
    while (candidate.ranges.length > 0 && searchAfter >= candidate.firstDate()!) {
      if (!candidate.lastDate()) {
        // There's no further occurrences.
        return new DateRangeSet([]);
      }
      candidate = this._nextRanges(candidate.lastDate()!);
    }
    return candidate;
  }

  _nextRanges(searchAfter: Date): DateRangeSet {
    let condRangeSet = this.cond.nextRanges(searchAfter);
    for (let i = 1; i < this.n; i++) {
      const lastRange = condRangeSet.lastRange();
      if (!lastRange || !lastRange.end) {
        // No further occurrences.
        return new DateRangeSet([]);
      }
      condRangeSet = this.cond.nextRanges(lastRange.end);
    }
    return condRangeSet;
  }

  accept(visitor: TimeCondVisitor): void {
    visitor.visitNthCond(this);
  }
}

/**
 * Condition that is true for the first occurrence of a B condition after a A condition.
 * For example, "first noon after thursday".
 *
 * This evaluates to the first occurrence of the 'after' (B) period that starts after the start of the 'first' (A) period.
 */
export class FirstAfterStartCond extends Cond {
  constructor(public readonly refCond: Cond, public readonly relativeCond: Cond, public readonly inclusive: boolean = false) {
    super();
  }

  lastActiveRange(date: Date): DateRange | undefined {
    const earliestRelativeRange = this.relativeCond.lastActiveRange(date);
    if (!earliestRelativeRange) {
      return undefined;
    }
    if (!this.inclusive) {
      earliestRelativeRange.start.setMilliseconds(earliestRelativeRange.start.getMilliseconds() - 1);
    }
    const earliestRefRange = this.refCond.lastActiveRange(earliestRelativeRange.start);
    if (!earliestRefRange) {
      return undefined;
    }
    if (this.inclusive) {
      earliestRefRange.start.setMilliseconds(earliestRefRange.start.getMilliseconds() - 1);
    }
    const relRanges = this.relativeCond.nextRanges(earliestRefRange.start);
    if (relRanges.ranges.length === 0) {
      return undefined;
    }
    return relRanges.ranges[0];
  }

  nextRanges(searchAfter: Date): DateRangeSet {
    const refRange = this.refCond.lastActiveRange(searchAfter);
    if (refRange && inDateRangeImpl(searchAfter, refRange)) {
      if (this.inclusive) {
        refRange.start.setMilliseconds(refRange.start.getMilliseconds() - 1);
      }
      const rangeSet = this.relativeCond.nextRanges(refRange.start);
      if (rangeSet.ranges.length > 0 && searchAfter < rangeSet.firstDate()!) {
        return rangeSet;
      }
    }
    const refRanges = this.refCond.nextRanges(searchAfter);
    const relativeRanges = new DateRangeSet([]);
    for (const refRange of refRanges.ranges) {
      if (this.inclusive) {
        refRange.start.setMilliseconds(refRange.start.getMilliseconds() - 1);
      }
      const childRanges = this.relativeCond.nextRanges(refRange.start);
      relativeRanges.union(childRanges);
    }
    return relativeRanges;
  }

  accept(visitor: TimeCondVisitor): void {
    visitor.visitFirstAfterStartCond(this);
  }
}

/**
 * Factory class for creating time conditions with consistent configuration.
 */
export class CondFactory {
  constructor(private readonly config: TimeConfig) {}

  /**
   * Creates a WeekDay condition for a specific day of the week.
   * @param weekDay The name of the week day
   * @returns A WeekDay condition
   */
  makeWeekDay(weekDay: string): WeekDay {
    const dayNumber = this.config.weekDayNumbers[weekDay.toLowerCase()];
    if (dayNumber === undefined) {
      throw new Error(`Invalid week day name: ${weekDay}`);
    }
    return new WeekDay(dayNumber);
  }

  /**
   * Creates a condition that is true on weekends.
   * @returns A condition that is true on weekends
   */
  weekend(): Cond {
    const weekendDays = this.config.weekStartsOnMonday
      ? [this.makeWeekDay('saturday'), this.makeWeekDay('sunday')]
      : [this.makeWeekDay('friday'), this.makeWeekDay('saturday')];
    return new OrCond(weekendDays);
  }

  /**
   * Creates a condition that is true on workdays.
   * @returns A condition that is true on workdays
   */
  workday(): Cond {
    const weekdays = [
      this.makeWeekDay('monday'),
      this.makeWeekDay('tuesday'),
      this.makeWeekDay('wednesday'),
      this.makeWeekDay('thursday'),
      this.makeWeekDay(this.config.weekStartsOnMonday ? 'friday' : 'sunday'),
    ];
    return new OrCond(weekdays);
  }

  /**
   * Creates a condition for a specific season.
   * @param season The name of the season
   * @returns A condition that is true for the given season
   */
  season(season: string): Cond {
    const seasonConfig = this.config.seasons[season];
    if (!seasonConfig) {
      throw new Error(`Invalid season name: ${season}`);
    }
    const range = { ...seasonConfig[this.config.southernHemisphere ? 'southern' : 'northern'] };
    range.start = {
      month: range.start.month - 1,
      day: range.start.day,
    };
    range.end = {
      month: range.end.month - 1,
      day: range.end.day,
    };
    return new DateBetweenCond(range);
  }

  /**
   * Creates a condition for a specific day part.
   * @param dayPart The name of the day part
   * @returns A condition that is true for the given day part
   */
  dayPart(dayPart: string): Cond {
    const dayPartConfig = this.config.dayParts[dayPart.toLowerCase()];
    if (!dayPartConfig) {
      throw new Error(`Invalid day part name: ${dayPart}`);
    }
    return new DayPartCond(dayPart, dayPartConfig);
  }
}

import { TimeConfig } from './config';
import {
  AndCond,
  Cond,
  DateBetweenCond,
  DateRangeSet,
  DayBetweenCond,
  DayPartCond,
  FirstAfterStartCond,
  MonthBetweenCond,
  NthCond,
  OrCond,
  TimeBetweenCond,
  TimeDeltaCond,
  TimeSpanCond,
  WeekDay,
} from './timeCond';
import { TimeCondVisitor } from './visitor';

/**
 * Visitor class that generates human-readable descriptions for conditions.
 */
export class DescribeVisitor extends TimeCondVisitor {
  private buffer: string = '';

  constructor(private readonly config: TimeConfig) {
    super();
    this.reset();
  }

  /**
   * Get the generated description
   * @returns The description string
   */
  getDescription(): string {
    return this.buffer;
  }

  /**
   * Clear the buffer and start a new description
   */
  private reset(): void {
    this.buffer = '';
  }

  /**
   * Append text to the buffer
   * @param text The text to append
   */
  private append(text: string): void {
    this.buffer += text;
  }

  visitTimeDeltaCond(cond: TimeDeltaCond): void {
    const deltaInSeconds = cond.delta / 1000;
    const days = Math.floor(deltaInSeconds / 86400);
    const hours = Math.floor((deltaInSeconds % 86400) / 3600);
    const minutes = Math.floor((deltaInSeconds % 3600) / 60);
    const seconds = Math.floor(deltaInSeconds % 60);
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    this.append(`at least ${parts.join(' ')} later`);
  }

  visitTimeBetweenCond(cond: TimeBetweenCond): void {
    const formatTime = (time: { hour: number; minute: number }) => {
      return `${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`;
    };
    this.append(`between ${formatTime(cond.range.start)} and ${formatTime(cond.range.end)}`);
  }

  visitMonthBetweenCond(cond: MonthBetweenCond): void {
    this.append(`between ${this.config.monthNames[cond.range.start]} and ${this.config.monthNames[cond.range.end]}`);
  }

  visitDateBetweenCond(cond: DateBetweenCond): void {
    this.append(
      `between ${this.config.shortMonthNames[cond.startMonthDay.month]} ${cond.startMonthDay.day} and ${
        this.config.shortMonthNames[cond.endMonthDay.month]
      } ${cond.endMonthDay.day}`
    );
  }

  visitDayBetweenCond(cond: DayBetweenCond): void {
    this.append(`between day ${cond.range.start} and day ${cond.range.end} of the month`);
  }

  visitDayPartCond(cond: DayPartCond): void {
    this.append(`during ${cond.dayPart}`);
  }

  visitWeekDay(cond: WeekDay): void {
    this.append(this.config.dayNames[cond.weekDayNumber]);
  }

  visitOrCond(cond: OrCond): void {
    this.append('(');
    for (let i = 0; i < cond.conditions.length; i++) {
      if (i > 0) this.append(') OR (');
      cond.conditions[i].accept(this);
    }
    this.append(')');
  }

  visitAndCond(cond: AndCond): void {
    this.append('(');
    for (let i = 0; i < cond.conditions.length; i++) {
      if (i > 0) this.append(') AND (');
      cond.conditions[i].accept(this);
    }
    this.append(')');
  }

  visitNthCond(cond: NthCond): void {
    this.append(`Nth(${cond.n}, `);
    cond.cond.accept(this);
    this.append(')');
  }

  visitFirstAfterStartCond(cond: FirstAfterStartCond): void {
    this.append('FIRST (');
    cond.relativeCond.accept(this);
    this.append(') AFTER START OF (');
    cond.refCond.accept(this);
    this.append(')');
    if (cond.inclusive) {
      this.append(' INCLUSIVE');
    } else {
      this.append(' EXCLUSIVE');
    }
  }

  visitTimeSpanCond(cond: TimeSpanCond): void {
    this.append('SPAN OF');
    if (cond.months > 0) {
      this.append(` ${cond.months} months`);
    }
    if (cond.days > 0) {
      this.append(` ${cond.days} days`);
    }
    if (cond.hours > 0) {
      this.append(` ${cond.hours} hours`);
    }
    if (cond.minutes > 0) {
      this.append(` ${cond.minutes} minutes`);
    }
    if (cond.seconds > 0) {
      this.append(` ${cond.seconds} seconds`);
    }
  }
}

/**
 * Returns a human-readable description of a condition.
 * @param cond The condition to describe
 * @param config The time configuration to use for localization
 * @returns A string describing the condition
 */
export function describe(cond: Cond, config: TimeConfig): string {
  const visitor = new DescribeVisitor(config);
  cond.accept(visitor);
  return visitor.getDescription();
}

/**
 * Returns a human-readable description of a DateRangeSet.
 * @param set The DateRangeSet to describe
 * @returns A string describing the set
 */
export function describeDateRangeSet(set: DateRangeSet): string {
  if (!set.ranges.length) return '';
  return set.ranges.map((range) => `[${range.start.toLocaleString()}, ${range.end?.toLocaleString() ?? ''})`).join(' OR ');
}

import {
  AndCond,
  DateBetweenCond,
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

/**
 * Visitor interface for time-based conditions.
 * This interface defines methods for visiting each type of condition.
 */
export abstract class TimeCondVisitor {
  /**
   * Visit a TimeDeltaCond
   * @param cond The TimeDeltaCond to visit
   */
  abstract visitTimeDeltaCond(cond: TimeDeltaCond): void;

  /**
   * Visit a TimeBetweenCond
   * @param cond The TimeBetweenCond to visit
   */
  abstract visitTimeBetweenCond(cond: TimeBetweenCond): void;

  /**
   * Visit a MonthBetweenCond
   * @param cond The MonthBetweenCond to visit
   */
  abstract visitMonthBetweenCond(cond: MonthBetweenCond): void;

  /**
   * Visit a DateBetweenCond
   * @param cond The DateBetweenCond to visit
   */
  abstract visitDateBetweenCond(cond: DateBetweenCond): void;

  /**
   * Visit a DayBetweenCond
   * @param cond The DayBetweenCond to visit
   */
  abstract visitDayBetweenCond(cond: DayBetweenCond): void;

  /**
   * Visit a DayPartCond
   * @param cond The DayPartCond to visit
   */
  abstract visitDayPartCond(cond: DayPartCond): void;

  /**
   * Visit a WeekDay
   * @param cond The WeekDay to visit
   */
  abstract visitWeekDay(cond: WeekDay): void;

  /**
   * Visit an OrCond
   * @param cond The OrCond to visit
   */
  abstract visitOrCond(cond: OrCond): void;

  /**
   * Visit an AndCond
   * @param cond The AndCond to visit
   */
  abstract visitAndCond(cond: AndCond): void;

  /**
   * Visit an NthCond
   * @param cond The NthCond to visit
   */
  abstract visitNthCond(cond: NthCond): void;

  /**
   * Visit a FirstAfterStartCond
   * @param cond The FirstAfterStartCond to visit
   */
  abstract visitFirstAfterStartCond(cond: FirstAfterStartCond): void;

  /**
   * Visit a TimeSpanCond
   * @param cond The TimeSpanCond to visit
   */
  abstract visitTimeSpanCond(cond: TimeSpanCond): void;
}

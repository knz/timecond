import { DayBetweenCond } from '../timeCond';
import { defaultTimeConfig } from '../config';
import { describe as describeCond } from '../describe';

describe('DayBetweenCond', () => {
  describe('constructor', () => {
    it('should throw error for invalid day numbers', () => {
      expect(() => new DayBetweenCond({ start: 0, end: 15 })).toThrow('Day numbers must be between 1 and 31');
      expect(() => new DayBetweenCond({ start: 1, end: 32 })).toThrow('Day numbers must be between 1 and 31');
      expect(() => new DayBetweenCond({ start: 35, end: 5 })).toThrow('Day numbers must be between 1 and 31');
    });

    it('should accept valid day numbers', () => {
      expect(() => new DayBetweenCond({ start: 1, end: 31 })).not.toThrow();
      expect(() => new DayBetweenCond({ start: 15, end: 15 })).not.toThrow();
    });
  });

  describe('lastActiveRange', () => {
    it('should return current active range when in range', () => {
      const cond = new DayBetweenCond({ start: 10, end: 20 }); // 10th to 20th
      const date = new Date(2024, 5, 15, 10, 0, 0); // June 15, 2024
      const range = cond.lastActiveRange(date);

      expect(range).toBeDefined();
      expect(range!.start).toEqual(new Date(2024, 5, 10));
      expect(range!.end).toEqual(new Date(2024, 5, 21));
    });

    it('should return last active range when not in range (after)', () => {
      const cond = new DayBetweenCond({ start: 10, end: 20 }); // 10th to 20th
      const date = new Date(2024, 5, 25); // June 25, 2024
      const range = cond.lastActiveRange(date);

      expect(range).toBeDefined();
      expect(range!.start).toEqual(new Date(2024, 5, 10));
      expect(range!.end).toEqual(new Date(2024, 5, 21));
    });

    it('should return last active range when not in range (before)', () => {
      const cond = new DayBetweenCond({ start: 10, end: 20 }); // 10th to 20th
      const date = new Date(2024, 5, 5); // June 5, 2024
      const range = cond.lastActiveRange(date); // Expect May 10th to 21st

      expect(range).toBeDefined();
      expect(range!.start).toEqual(new Date(2024, 4, 10));
      expect(range!.end).toEqual(new Date(2024, 4, 21));
    });

    it('should handle range spanning month boundary (currently in gap)', () => {
      const cond = new DayBetweenCond({ start: 25, end: 5 }); // 25th to 5th of next month
      const date = new Date(2024, 5, 15);
      const range = cond.lastActiveRange(date);

      expect(range).toBeDefined();
      expect(range!.start).toEqual(new Date(2024, 4, 25));
      expect(range!.end).toEqual(new Date(2024, 5, 6));
    });

    it('should handle range spanning month boundary (currently in first part of range)', () => {
      const cond = new DayBetweenCond({ start: 25, end: 5 }); // 25th to 5th
      const date = new Date(2024, 5, 28); // June 28, 2024
      const range = cond.lastActiveRange(date);

      expect(range).toBeDefined();
      expect(range!.start).toEqual(new Date(2024, 5, 25));
      expect(range!.end).toEqual(new Date(2024, 6, 6));
    });

    it('should handle range spanning month boundary (currently in second part of range)', () => {
      const cond = new DayBetweenCond({ start: 25, end: 5 }); // 25th to 5th
      const date = new Date(2024, 6, 3); // July 3, 2024
      const range = cond.lastActiveRange(date);

      expect(range).toBeDefined();
      expect(range!.start).toEqual(new Date(2024, 5, 25));
      expect(range!.end).toEqual(new Date(2024, 6, 6));
    });
  });

  describe('nextRanges', () => {
    it('should return next range when not in range (after)', () => {
      const cond = new DayBetweenCond({ start: 10, end: 20 }); // 10th to 20th
      const date = new Date(2024, 5, 25); // June 25, 2024
      const ranges = cond.nextRanges(date); // Expect July 10th

      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2024, 6, 10));
      expect(ranges.ranges[0].end).toEqual(new Date(2024, 6, 21));
    });

    it('should return next range when not in range (before)', () => {
      const cond = new DayBetweenCond({ start: 10, end: 20 }); // 10th to 20th
      const date = new Date(2024, 5, 5); // June 5, 2024
      const ranges = cond.nextRanges(date); // Expect June 10th

      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2024, 5, 10));
      expect(ranges.ranges[0].end).toEqual(new Date(2024, 5, 21));
    });

    it('should return next range when already in range', () => {
      const cond = new DayBetweenCond({ start: 10, end: 20 }); // 10th to 20th
      const date = new Date(2024, 5, 15); // June 15, 2024
      const ranges = cond.nextRanges(date); // Expect July 10th

      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2024, 6, 10));
      expect(ranges.ranges[0].end).toEqual(new Date(2024, 6, 21));
    });

    it('should handle range spanning month boundary (currently in gap)', () => {
      const cond = new DayBetweenCond({ start: 25, end: 5 }); // 25th to 5th
      const date = new Date(2024, 5, 15); // June 15, 2024
      const ranges = cond.nextRanges(date); // Expect June 25th

      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2024, 5, 25));
      expect(ranges.ranges[0].end).toEqual(new Date(2024, 6, 6));
    });

    it('should handle range spanning month boundary (currently in first part of range, near end of month)', () => {
      const cond = new DayBetweenCond({ start: 28, end: 5 }); // 28th to 5th
      const date = new Date(2024, 1, 28); // Feb 28, 2024 (leap year)
      const ranges = cond.nextRanges(date); // Expect March 28th

      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2024, 2, 28));
      expect(ranges.ranges[0].end).toEqual(new Date(2024, 3, 6));
    });

    it('should handle range spanning month boundary (currently in first part of range)', () => {
      const cond = new DayBetweenCond({ start: 25, end: 5 }); // 25th to 5th
      const date = new Date(2024, 5, 28); // June 28, 2024
      const ranges = cond.nextRanges(date); // Expect July 25th

      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2024, 6, 25));
      expect(ranges.ranges[0].end).toEqual(new Date(2024, 7, 6));
    });

    it('should handle range spanning month boundary (end of first part, next is start of second part)', () => {
      const cond = new DayBetweenCond({ start: 25, end: 5 }); // 25th to 5th
      const date = new Date(2024, 5, 30); // June 30, 2024 (last day of month for June)
      const ranges = cond.nextRanges(date); // Expect July 25th

      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2024, 6, 25));
      expect(ranges.ranges[0].end).toEqual(new Date(2024, 7, 6));
    });

    it('should handle range spanning month boundary (currently in second part of range)', () => {
      const cond = new DayBetweenCond({ start: 25, end: 5 }); // 25th to 5th
      const date = new Date(2024, 6, 3); // July 3, 2024
      const ranges = cond.nextRanges(date); // Expect July 25th

      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2024, 6, 25));
      expect(ranges.ranges[0].end).toEqual(new Date(2024, 7, 6));
    });

    it('should handle range spanning month boundary (end of second part, next is start of first part next month)', () => {
      const cond = new DayBetweenCond({ start: 25, end: 5 }); // 25th to 5th
      const date = new Date(2024, 6, 5); // July 5, 2024
      const ranges = cond.nextRanges(date); // Expect July 25th

      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2024, 6, 25));
      expect(ranges.ranges[0].end).toEqual(new Date(2024, 7, 6));
    });
  });

  describe('describe', () => {
    it('should return the correct description for normal range', () => {
      const cond = new DayBetweenCond({ start: 10, end: 20 });
      expect(describeCond(cond, defaultTimeConfig)).toBe('between day 10 and day 20 of the month');
    });

    it('should return the correct description for spanning range', () => {
      const cond = new DayBetweenCond({ start: 25, end: 5 });
      expect(describeCond(cond, defaultTimeConfig)).toBe('between day 25 and day 5 of the month');
    });

    it('should return the correct description for single day', () => {
      const cond = new DayBetweenCond({ start: 15, end: 15 });
      expect(describeCond(cond, defaultTimeConfig)).toBe('between day 15 and day 15 of the month');
    });
  });
});

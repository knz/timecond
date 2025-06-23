import { DateBetweenCond } from '../timeCond';
import { defaultTimeConfig } from '../config';
import { describe as describeCond } from '../describe';

describe('DateBetweenCond', () => {
  describe('constructor', () => {
    it('should throw error for invalid month or day numbers', () => {
      expect(() => new DateBetweenCond({ start: { month: -1, day: 1 }, end: { month: 5, day: 5 } })).toThrow(
        'Month must be between 0-11 and day between 1-31.'
      );
      expect(() => new DateBetweenCond({ start: { month: 0, day: 1 }, end: { month: 12, day: 5 } })).toThrow(
        'Month must be between 0-11 and day between 1-31.'
      );
      expect(() => new DateBetweenCond({ start: { month: 0, day: 0 }, end: { month: 5, day: 5 } })).toThrow(
        'Month must be between 0-11 and day between 1-31.'
      );
      expect(() => new DateBetweenCond({ start: { month: 0, day: 1 }, end: { month: 5, day: 32 } })).toThrow(
        'Month must be between 0-11 and day between 1-31.'
      );
    });

    it('should accept valid month and day numbers', () => {
      expect(() => new DateBetweenCond({ start: { month: 0, day: 1 }, end: { month: 11, day: 31 } })).not.toThrow();
      expect(() => new DateBetweenCond({ start: { month: 5, day: 15 }, end: { month: 5, day: 15 } })).not.toThrow();
    });
  });

  describe('lastActiveRange', () => {
    // Non-spanning range: March 15 to June 20
    const condNonSpanning = new DateBetweenCond({ start: { month: 2, day: 15 }, end: { month: 5, day: 20 } });

    it('should return current range when in a non-spanning range', () => {
      const date = new Date(2024, 3, 10); // April 10, 2024
      const range = condNonSpanning.lastActiveRange(date);
      expect(range).toBeDefined();
      expect(range!.start).toEqual(new Date(2024, 2, 15));
      expect(range!.end).toEqual(new Date(2024, 5, 21)); // End date is exclusive
    });

    it('should return previous range when before a non-spanning range', () => {
      const date = new Date(2024, 1, 10); // February 10, 2024
      const range = condNonSpanning.lastActiveRange(date);
      expect(range).toBeDefined();
      expect(range!.start).toEqual(new Date(2023, 2, 15));
      expect(range!.end).toEqual(new Date(2023, 5, 21));
    });

    it("should return current year's range when after a non-spanning range in the same year", () => {
      const date = new Date(2024, 7, 1); // August 1, 2024
      const range = condNonSpanning.lastActiveRange(date);
      expect(range).toBeDefined();
      expect(range!.start).toEqual(new Date(2024, 2, 15));
      expect(range!.end).toEqual(new Date(2024, 5, 21));
    });

    // Year-spanning range: December 10 to February 5
    const condSpanning = new DateBetweenCond({ start: { month: 11, day: 10 }, end: { month: 1, day: 5 } });

    it('should return current range when in the first part of a spanning range', () => {
      const date = new Date(2023, 11, 15); // December 15, 2023
      const range = condSpanning.lastActiveRange(date);
      expect(range).toBeDefined();
      expect(range!.start).toEqual(new Date(2023, 11, 10));
      expect(range!.end).toEqual(new Date(2024, 1, 6)); // Feb 6 exclusive
    });

    it('should return current range when in the second part of a spanning range', () => {
      const date = new Date(2024, 0, 20); // January 20, 2024
      const range = condSpanning.lastActiveRange(date);
      expect(range).toBeDefined();
      expect(range!.start).toEqual(new Date(2023, 11, 10));
      expect(range!.end).toEqual(new Date(2024, 1, 6));
    });

    it('should return previous year.s full range when before a spanning range (early in year)', () => {
      const date = new Date(2023, 10, 1); // November 1, 2023 (before Dec 10)
      const range = condSpanning.lastActiveRange(date);
      expect(range).toBeDefined();
      expect(range!.start).toEqual(new Date(2022, 11, 10));
      expect(range!.end).toEqual(new Date(2023, 1, 6));
    });

    it('should return current spanning range when in the gap of a spanning range', () => {
      const date = new Date(2024, 6, 15); // July 15, 2024
      const range = condSpanning.lastActiveRange(date);
      expect(range).toBeDefined();
      // Last active was Dec 10, 2023 to Feb 5, 2024
      expect(range!.start).toEqual(new Date(2023, 11, 10));
      expect(range!.end).toEqual(new Date(2024, 1, 6));
    });
  });

  describe('nextRanges', () => {
    // Non-spanning range: April 1 to May 10
    const condNonSpanning = new DateBetweenCond({ start: { month: 3, day: 1 }, end: { month: 4, day: 10 } });

    it('should return next range when before a non-spanning range', () => {
      const date = new Date(2024, 1, 15); // February 15, 2024
      const ranges = condNonSpanning.nextRanges(date);
      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2024, 3, 1));
      expect(ranges.ranges[0].end).toEqual(new Date(2024, 4, 11));
    });

    it('should return next year.s range when currently in a non-spanning range', () => {
      const date = new Date(2024, 3, 5); // April 5, 2024
      const ranges = condNonSpanning.nextRanges(date);
      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2025, 3, 1));
      expect(ranges.ranges[0].end).toEqual(new Date(2025, 4, 11));
    });

    it('should return next year.s range when just after a non-spanning range in the same year', () => {
      const date = new Date(2024, 4, 15); // May 15, 2024 (after May 10)
      const ranges = condNonSpanning.nextRanges(date);
      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2025, 3, 1));
      expect(ranges.ranges[0].end).toEqual(new Date(2025, 4, 11));
    });

    // Year-spanning range: November 20 to January 10
    const condSpanning = new DateBetweenCond({ start: { month: 10, day: 20 }, end: { month: 0, day: 10 } });

    it('should return current year.s start when before a spanning range (early in year)', () => {
      const date = new Date(2024, 8, 1); // September 1, 2024
      const ranges = condSpanning.nextRanges(date);
      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2024, 10, 20)); // Nov 20, 2024
      expect(ranges.ranges[0].end).toEqual(new Date(2025, 0, 11)); // Jan 11, 2025 (exclusive)
    });

    it('should return next year.s start when in the first part of a spanning range', () => {
      const date = new Date(2024, 10, 25); // November 25, 2024
      const ranges = condSpanning.nextRanges(date);
      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2025, 10, 20)); // Nov 20, 2025
      expect(ranges.ranges[0].end).toEqual(new Date(2026, 0, 11)); // Jan 11, 2026
    });

    it('should return next year.s start when in the second part of a spanning range', () => {
      const date = new Date(2025, 0, 5); // January 5, 2025
      const ranges = condSpanning.nextRanges(date);
      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2025, 10, 20)); // Nov 20, 2025
      expect(ranges.ranges[0].end).toEqual(new Date(2026, 0, 11)); // Jan 11, 2026
    });

    it('should return current year.s start when in the gap of a spanning range', () => {
      const date = new Date(2024, 5, 10); // June 10, 2024
      const ranges = condSpanning.nextRanges(date);
      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2024, 10, 20)); // Nov 20, 2024
      expect(ranges.ranges[0].end).toEqual(new Date(2025, 0, 11)); // Jan 11, 2025
    });
  });

  describe('describe', () => {
    it('should return correct description for normal range', () => {
      const cond = new DateBetweenCond({ start: { month: 2, day: 15 }, end: { month: 5, day: 20 } }); // Mar 15 to Jun 20
      expect(describeCond(cond, defaultTimeConfig)).toBe('between Mar 15 and Jun 20');
    });

    it('should return correct description for range spanning year boundary', () => {
      const cond = new DateBetweenCond({ start: { month: 11, day: 10 }, end: { month: 1, day: 5 } }); // Dec 10 to Feb 5
      expect(describeCond(cond, defaultTimeConfig)).toBe('between Dec 10 and Feb 5');
    });

    it('should return correct description for single day range', () => {
      const cond = new DateBetweenCond({ start: { month: 7, day: 1 }, end: { month: 7, day: 1 } }); // Aug 1 to Aug 1
      expect(describeCond(cond, defaultTimeConfig)).toBe('between Aug 1 and Aug 1');
    });
  });
});

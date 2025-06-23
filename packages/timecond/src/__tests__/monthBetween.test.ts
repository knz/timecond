import { MonthBetweenCond } from '../timeCond';
import { defaultTimeConfig } from '../config';
import { describe as describeCond } from '../describe';

describe('MonthBetweenCond', () => {
  describe('constructor', () => {
    it('should throw error for invalid month numbers', () => {
      expect(() => new MonthBetweenCond({ start: -1, end: 5 })).toThrow('Month numbers must be between 0 and 11');
      expect(() => new MonthBetweenCond({ start: 0, end: 12 })).toThrow('Month numbers must be between 0 and 11');
      expect(() => new MonthBetweenCond({ start: 13, end: 5 })).toThrow('Month numbers must be between 0 and 11');
    });

    it('should accept valid month numbers', () => {
      expect(() => new MonthBetweenCond({ start: 0, end: 11 })).not.toThrow();
      expect(() => new MonthBetweenCond({ start: 5, end: 5 })).not.toThrow();
    });
  });

  describe('lastActiveRange', () => {
    it('should return current month range when in range', () => {
      const cond = new MonthBetweenCond({ start: 3, end: 6 }); // April to July
      const date = new Date(2024, 5, 15); // June 15, 2024
      const range = cond.lastActiveRange(date);

      expect(range).toBeDefined();
      expect(range!.start).toEqual(new Date(2024, 3, 1));
      expect(range!.end).toEqual(new Date(2024, 7, 1));
    });

    it('should return last month in range when not in range', () => {
      const cond = new MonthBetweenCond({ start: 3, end: 6 }); // April to July
      const date = new Date(2024, 8, 15); // September 15, 2024
      const range = cond.lastActiveRange(date);

      expect(range).toBeDefined();
      expect(range!.start).toEqual(new Date(2024, 3, 1)); // April 1, 2024
      expect(range!.end).toEqual(new Date(2024, 7, 1)); // August 1, 2024
    });

    it('should handle range spanning year boundary', () => {
      const cond = new MonthBetweenCond({ start: 10, end: 1 }); // November to February
      const date = new Date(2024, 5, 15); // June 15, 2024
      const range = cond.lastActiveRange(date);

      expect(range).toBeDefined();
      expect(range!.start).toEqual(new Date(2023, 10, 1)); // November 1, 2023
      expect(range!.end).toEqual(new Date(2024, 2, 1)); // March 1, 2024
    });
  });

  describe('nextRanges', () => {
    it('should return next month in range when not in range', () => {
      const cond = new MonthBetweenCond({ start: 3, end: 6 }); // April to July
      const date = new Date(2024, 8, 15); // September 15, 2024
      const ranges = cond.nextRanges(date);

      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2025, 3, 1)); // April 1, 2025
      expect(ranges.ranges[0].end).toEqual(new Date(2025, 7, 1)); // August 1, 2025
    });

    it('should return next month in range when already in range', () => {
      const cond = new MonthBetweenCond({ start: 3, end: 6 }); // April to July
      const date = new Date(2024, 5, 15); // June 15, 2024
      const ranges = cond.nextRanges(date);

      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2025, 3, 1)); // April 1, 2025
      expect(ranges.ranges[0].end).toEqual(new Date(2025, 7, 1)); // August 1, 2025
    });

    it('should handle range spanning year boundary', () => {
      const cond = new MonthBetweenCond({ start: 10, end: 1 }); // November to February
      const date = new Date(2024, 5, 15); // June 15, 2024
      const ranges = cond.nextRanges(date);

      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(new Date(2024, 10, 1)); // November 1, 2024
      expect(ranges.ranges[0].end).toEqual(new Date(2025, 2, 1)); // March 1, 2025
    });
  });

  describe('describe', () => {
    it('should return correct description for normal range', () => {
      const cond = new MonthBetweenCond({ start: 3, end: 6 });
      expect(describeCond(cond, defaultTimeConfig)).toBe('between April and July');
    });

    it('should return correct description for range spanning year boundary', () => {
      const cond = new MonthBetweenCond({ start: 10, end: 1 });
      expect(describeCond(cond, defaultTimeConfig)).toBe('between November and February');
    });

    it('should return correct description for single month', () => {
      const cond = new MonthBetweenCond({ start: 5, end: 5 });
      expect(describeCond(cond, defaultTimeConfig)).toBe('between June and June');
    });
  });
});

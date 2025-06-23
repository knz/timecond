import { TimeBetweenCond } from '../timeCond';
import { defaultTimeConfig } from '../config';
import { describe as describeCond } from '../describe';

describe('TimeBetweenCond', () => {
  // Helper function to create a date with specific time
  const createDate = (year: number, month: number, day: number, hour: number, minute: number) => {
    return new Date(year, month - 1, day, hour, minute, 0);
  };

  describe('lastActiveRange', () => {
    it('should return previous day range when date is before the range', () => {
      const cond = new TimeBetweenCond({
        start: { hour: 9, minute: 0 },
        end: { hour: 17, minute: 0 },
      });
      const date = createDate(2024, 3, 15, 8, 0);
      const range = cond.lastActiveRange(date);
      expect(range).toBeDefined();
      expect(range?.start).toEqual(createDate(2024, 3, 14, 9, 0));
      expect(range?.end).toEqual(createDate(2024, 3, 14, 17, 0));
    });

    it('should return the current day range when date is within range', () => {
      const cond = new TimeBetweenCond({
        start: { hour: 9, minute: 0 },
        end: { hour: 17, minute: 0 },
      });
      const date = createDate(2024, 3, 15, 14, 0);
      const range = cond.lastActiveRange(date);
      expect(range).toBeDefined();
      expect(range?.start).toEqual(createDate(2024, 3, 15, 9, 0));
      expect(range?.end).toEqual(createDate(2024, 3, 15, 17, 0));
    });

    it('should handle overnight ranges correctly', () => {
      const cond = new TimeBetweenCond({
        start: { hour: 22, minute: 0 },
        end: { hour: 2, minute: 0 },
      });

      // Test during the overnight period
      const dateDuring = createDate(2024, 3, 15, 23, 0);
      const rangeDuring = cond.lastActiveRange(dateDuring);
      expect(rangeDuring).toBeDefined();
      expect(rangeDuring?.start).toEqual(createDate(2024, 3, 15, 22, 0));
      expect(rangeDuring?.end).toEqual(createDate(2024, 3, 16, 2, 0));

      // Test before the overnight period
      const dateBefore = createDate(2024, 3, 15, 21, 0);
      const rangeBefore = cond.lastActiveRange(dateBefore);
      expect(rangeBefore).toBeDefined();
      expect(rangeBefore?.start).toEqual(createDate(2024, 3, 14, 22, 0));
      expect(rangeBefore?.end).toEqual(createDate(2024, 3, 15, 2, 0));
    });
  });

  describe('nextRanges', () => {
    it('should return next range when date is before the range', () => {
      const cond = new TimeBetweenCond({
        start: { hour: 9, minute: 0 },
        end: { hour: 17, minute: 0 },
      });
      const date = createDate(2024, 3, 15, 8, 0);
      const ranges = cond.nextRanges(date);
      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(createDate(2024, 3, 15, 9, 0));
      expect(ranges.ranges[0].end).toEqual(createDate(2024, 3, 15, 17, 0));
    });

    it('should return next day range when date is after the range', () => {
      const cond = new TimeBetweenCond({
        start: { hour: 9, minute: 0 },
        end: { hour: 17, minute: 0 },
      });
      const date = createDate(2024, 3, 15, 18, 0);
      const ranges = cond.nextRanges(date);
      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(createDate(2024, 3, 16, 9, 0));
      expect(ranges.ranges[0].end).toEqual(createDate(2024, 3, 16, 17, 0));
    });

    it('should handle overnight ranges correctly', () => {
      const cond = new TimeBetweenCond({
        start: { hour: 22, minute: 0 },
        end: { hour: 2, minute: 0 },
      });

      // Test when date is before the overnight period
      const dateBefore = createDate(2024, 3, 15, 21, 0);
      const rangesBefore = cond.nextRanges(dateBefore);
      expect(rangesBefore.ranges).toHaveLength(1);
      expect(rangesBefore.ranges[0].start).toEqual(createDate(2024, 3, 15, 22, 0));
      expect(rangesBefore.ranges[0].end).toEqual(createDate(2024, 3, 16, 2, 0));

      // Test when date is after the overnight period
      const dateAfter = createDate(2024, 3, 15, 3, 0);
      const rangesAfter = cond.nextRanges(dateAfter);
      expect(rangesAfter.ranges).toHaveLength(1);
      expect(rangesAfter.ranges[0].start).toEqual(createDate(2024, 3, 15, 22, 0));
      expect(rangesAfter.ranges[0].end).toEqual(createDate(2024, 3, 16, 2, 0));
    });
  });

  describe('describe', () => {
    it('should return a human-readable description of the time range', () => {
      const cond = new TimeBetweenCond({
        start: { hour: 9, minute: 0 },
        end: { hour: 17, minute: 0 },
      });
      expect(describeCond(cond, defaultTimeConfig)).toBe('between 09:00 and 16:59');
    });

    it('should handle overnight ranges in description', () => {
      const cond = new TimeBetweenCond({
        start: { hour: 22, minute: 0 },
        end: { hour: 2, minute: 0 },
      });
      expect(describeCond(cond, defaultTimeConfig)).toBe('between 22:00 and 01:59');
    });
  });
});

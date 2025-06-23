import { CondFactory, FirstAfterStartCond, TimeBetweenCond } from '../timeCond';
import { defaultTimeConfig } from '../config';
import { describe as describeCond } from '../describe';

describe('FirstAfterStartCond', () => {
  // Helper function to create a date at a specific time
  const createDate = (year: number, month: number, day: number, hour: number = 0, minute: number = 0) => {
    return new Date(year, month - 1, day, hour, minute, 0);
  };

  describe('lastActiveRange', () => {
    it('should return previous active range when the condition is not currently active', () => {
      // A condition: Thursday
      // B condition: Noon (12:00-13:00)
      const factory = new CondFactory(defaultTimeConfig);
      const aCond = factory.makeWeekDay('thursday');
      const bCond = new TimeBetweenCond({
        start: { hour: 12, minute: 0 },
        end: { hour: 13, minute: 0 },
      });

      const cond = new FirstAfterStartCond(aCond, bCond);

      const date = createDate(2024, 3, 19, 10, 0); // Tuesday 10:00 AM
      const result = cond.lastActiveRange(date);
      expect(result).toBeDefined();
      expect(result?.start).toEqual(createDate(2024, 3, 14, 12, 0));
      expect(result?.end).toEqual(createDate(2024, 3, 14, 13, 0));
    });

    it('should return the first B range that occurred after A became true', () => {
      // A condition: Thursday
      // B condition: Noon (12:00-13:00)
      const factory = new CondFactory(defaultTimeConfig);
      const aCond = factory.makeWeekDay('thursday');
      const bCond = new TimeBetweenCond({
        start: { hour: 12, minute: 0 },
        end: { hour: 13, minute: 0 },
      });

      const cond = new FirstAfterStartCond(aCond, bCond);
      const date = createDate(2024, 3, 21, 12, 30); // Thursday 12:30 PM

      const result = cond.lastActiveRange(date);
      expect(result).toBeDefined();
      expect(result?.start.getHours()).toBe(12);
      expect(result?.start.getMinutes()).toBe(0);
      expect(result?.end?.getHours()).toBe(13);
      expect(result?.end?.getMinutes()).toBe(0);
    });
  });

  describe('nextRanges', () => {
    it('should return the next B range after the next A range', () => {
      // A condition: Thursday
      // B condition: Noon (12:00-13:00)
      const factory = new CondFactory(defaultTimeConfig);
      const aCond = factory.makeWeekDay('thursday');
      const bCond = new TimeBetweenCond({
        start: { hour: 12, minute: 0 },
        end: { hour: 13, minute: 0 },
      });

      const cond = new FirstAfterStartCond(aCond, bCond);
      const date = createDate(2024, 3, 19, 10, 0); // Tuesday 10:00 AM

      const result = cond.nextRanges(date);
      expect(result.ranges.length).toBe(1);
      const nextRange = result.ranges[0];
      expect(nextRange.start.getDay()).toBe(4); // Thursday
      expect(nextRange.start.getHours()).toBe(12);
      expect(nextRange.start.getMinutes()).toBe(0);
      expect(nextRange.end?.getHours()).toBe(13);
      expect(nextRange.end?.getMinutes()).toBe(0);
    });

    it('should handle B condition that spans two days', () => {
      // A condition: Thursday
      // B condition: Night (12:00-13:00)
      const factory = new CondFactory(defaultTimeConfig);
      const aCond = factory.makeWeekDay('thursday');
      const bCond = new TimeBetweenCond({
        start: { hour: 21, minute: 0 },
        end: { hour: 7, minute: 0 },
      });

      const cond = new FirstAfterStartCond(aCond, bCond);
      const date = createDate(2024, 3, 19, 22, 0); // Tuesday 10:00 PM

      const result = cond.nextRanges(date);
      expect(result.ranges.length).toBe(1);
      const nextRange = result.ranges[0];
      expect(nextRange.start.getDay()).toBe(4); // Next Thursday
      expect(nextRange.start.getHours()).toBe(21);
      expect(nextRange.start.getMinutes()).toBe(0);
      expect(nextRange.end?.getDay()).toBe(5); // Next Friday
      expect(nextRange.end?.getHours()).toBe(7);
      expect(nextRange.end?.getMinutes()).toBe(0);
    });

    it('should handle B condition when A is already active', () => {
      // A condition: Thursday
      // B condition: Between 0:00-1:00
      const factory = new CondFactory(defaultTimeConfig);
      const aCond = factory.makeWeekDay('thursday');
      const bCond = new TimeBetweenCond({
        start: { hour: 13, minute: 0 },
        end: { hour: 14, minute: 0 },
      });

      const cond = new FirstAfterStartCond(aCond, bCond);
      const date = createDate(2024, 3, 21, 10, 0); // Thursday 10:00 AM

      const result = cond.nextRanges(date);
      expect(result.ranges.length).toBe(1);
      const nextRange = result.ranges[0];
      expect(nextRange.start.getDay()).toBe(4); // Thursday
      expect(nextRange.start.getHours()).toBe(13);
      expect(nextRange.start.getMinutes()).toBe(0);
      expect(nextRange.end?.getHours()).toBe(14);
      expect(nextRange.end?.getMinutes()).toBe(0);
    });
  });

  describe('describe', () => {
    it('should return a human-readable description', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const aCond = factory.makeWeekDay('thursday');
      const bCond = new TimeBetweenCond({
        start: { hour: 12, minute: 0 },
        end: { hour: 13, minute: 0 },
      });

      const cond1 = new FirstAfterStartCond(aCond, bCond, false);
      expect(describeCond(cond1, defaultTimeConfig)).toBe('FIRST (between 12:00 and 12:59) AFTER START OF (Thursday) EXCLUSIVE');

      const cond2 = new FirstAfterStartCond(aCond, bCond, true);
      expect(describeCond(cond2, defaultTimeConfig)).toBe('FIRST (between 12:00 and 12:59) AFTER START OF (Thursday) INCLUSIVE');
    });
  });
});

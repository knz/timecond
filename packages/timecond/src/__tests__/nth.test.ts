import { CondFactory, NthCond, TimeBetweenCond } from '../timeCond';
import { defaultTimeConfig } from '../config';
import { describe as describeCond } from '../describe';

describe('NthCond', () => {
  // Helper function to create a date at a specific time
  const createDate = (year: number, month: number, day: number, hour = 0, minute = 0) => {
    return new Date(year, month - 1, day, hour, minute, 0);
  };

  describe('lastActiveRange', () => {
    it('should return undefined if date is before the first occurrence', () => {
      const startDate = createDate(2024, 3, 1); // March 1, 2024
      const factory = new CondFactory(defaultTimeConfig);
      const mondayCond = factory.makeWeekDay('monday');
      const thirdMonday = new NthCond(startDate, 3, mondayCond);

      const testDate = createDate(2024, 2, 15); // February 15, 2024
      const result = thirdMonday.lastActiveRange(testDate);

      expect(result).toBeUndefined();
    });

    it('should return the correct range for the Nth occurrence', () => {
      const startDate = createDate(2024, 3, 1); // March 1, 2024
      const factory = new CondFactory(defaultTimeConfig);
      const mondayCond = factory.makeWeekDay('monday');
      const thirdMonday = new NthCond(startDate, 3, mondayCond);

      // March 18, 2024 is the third Monday after March 1
      const testDate = createDate(2024, 3, 20);
      const result = thirdMonday.lastActiveRange(testDate);

      expect(result).toBeDefined();
      expect(result?.start).toEqual(createDate(2024, 3, 18, 0, 0));
      expect(result?.end).toEqual(createDate(2024, 3, 19, 0, 0));
    });

    it('should handle time-based conditions', () => {
      const startDate = createDate(2024, 3, 1, 10, 0); // March 1, 2024 10:00
      const timeCond = new TimeBetweenCond({
        start: { hour: 9, minute: 0 },
        end: { hour: 17, minute: 0 },
      });
      const secondOccurrence = new NthCond(startDate, 2, timeCond);

      // Test during the second occurrence
      const testDate = createDate(2024, 3, 3, 14, 0);
      const result = secondOccurrence.lastActiveRange(testDate);

      expect(result).toBeDefined();
      expect(result?.start).toEqual(createDate(2024, 3, 3, 9, 0));
      expect(result?.end).toEqual(createDate(2024, 3, 3, 17, 0));
    });
  });

  describe('nextRanges', () => {
    it('should find the next Nth occurrence after a given date', () => {
      const startDate = createDate(2024, 3, 1); // March 1, 2024
      const factory = new CondFactory(defaultTimeConfig);
      const mondayCond = factory.makeWeekDay('monday');
      const thirdMonday = new NthCond(startDate, 3, mondayCond);

      const searchAfter = createDate(2024, 3, 5); // March 5, 2024
      const result = thirdMonday.nextRanges(searchAfter);

      expect(result.ranges).toHaveLength(1);
      expect(result.ranges[0].start).toEqual(createDate(2024, 3, 18, 0, 0));
      expect(result.ranges[0].end).toEqual(createDate(2024, 3, 19, 0, 0));
    });
  });

  describe('describe', () => {
    it('should return a human-readable description', () => {
      const startDate = createDate(2024, 3, 1);
      const factory = new CondFactory(defaultTimeConfig);
      const mondayCond = factory.makeWeekDay('monday');
      const thirdMonday = new NthCond(startDate, 3, mondayCond);

      expect(describeCond(thirdMonday, defaultTimeConfig)).toBe('Nth(3, Monday)');
    });
  });
});

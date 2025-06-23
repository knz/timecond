import { CondFactory } from '../timeCond';
import { defaultTimeConfig } from '../config';
import { describe as describeCond } from '../describe';

describe('DayPartCond', () => {
  // Helper function to create a date with specific time
  const createDate = (year: number, month: number, day: number, hour: number, minute: number, second: number) => {
    return new Date(year, month - 1, day, hour, minute, second);
  };

  describe('lastActiveRange', () => {
    it('should return previous day range when date is before the day part range', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const cond = factory.dayPart('morning');
      const date = createDate(2024, 1, 2, 5, 0, 0); // 5:00 AM, before morning (7:00 AM)
      const range = cond.lastActiveRange(date);
      expect(range).toBeDefined();
      expect(range?.start).toEqual(createDate(2024, 1, 1, 7, 0, 0));
      expect(range?.end).toEqual(createDate(2024, 1, 1, 12, 0, 0));
    });

    it('should return the correct range for morning', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const cond = factory.dayPart('morning');
      const date = createDate(2024, 1, 1, 10, 0, 0); // 10:00 AM, during morning
      const range = cond.lastActiveRange(date);
      expect(range).toBeDefined();
      expect(range?.start.getHours()).toBe(7);
      expect(range?.start.getMinutes()).toBe(0);
      expect(range?.end!.getHours()).toBe(12);
      expect(range?.end!.getMinutes()).toBe(0);
    });

    it('should handle overnight ranges like night', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const cond = factory.dayPart('night');
      const date = createDate(2024, 1, 1, 23, 0, 0); // 11:00 PM, during night
      const range = cond.lastActiveRange(date);
      expect(range).toBeDefined();
      expect(range?.start.getHours()).toBe(21);
      expect(range?.start.getMinutes()).toBe(0);
      expect(range?.end!.getHours()).toBe(7);
      expect(range?.end!.getMinutes()).toBe(0);
    });
  });

  describe('nextRanges', () => {
    it('should return the next occurrence of morning', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const cond = factory.dayPart('morning');
      const date = createDate(2024, 1, 1, 5, 0, 0); // 5:00 AM, before morning
      const ranges = cond.nextRanges(date);
      expect(ranges.ranges.length).toBe(1);
      const range = ranges.ranges[0];
      expect(range.start.getHours()).toBe(7);
      expect(range.start.getMinutes()).toBe(0);
      expect(range.end!.getHours()).toBe(12);
      expect(range.end!.getMinutes()).toBe(0);
    });

    it('should return the next occurrence of night when current time is during day', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const cond = factory.dayPart('night');
      const date = createDate(2024, 1, 1, 15, 0, 0); // 3:00 PM, during day
      const ranges = cond.nextRanges(date);
      expect(ranges.ranges.length).toBe(1);
      const range = ranges.ranges[0];
      expect(range.start.getHours()).toBe(21);
      expect(range.start.getMinutes()).toBe(0);
      expect(range.end!.getHours()).toBe(7);
      expect(range.end!.getMinutes()).toBe(0);
    });
  });

  describe('describe', () => {
    it('should return the correct description for each day part', () => {
      const parts = ['dawn', 'morning', 'noon', 'afternoon', 'evening', 'night', 'midnight', 'day', 'anytime'] as const;
      for (const part of parts) {
        const factory = new CondFactory(defaultTimeConfig);
        const cond = factory.dayPart(part);
        expect(describeCond(cond, defaultTimeConfig)).toBe(`during ${part}`);
      }
    });
  });

  describe('inRange', () => {
    it('should return true when time is within the day part range', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const cond = factory.dayPart('morning');
      const date = createDate(2024, 1, 1, 10, 0, 0); // 10:00 AM, during morning
      expect(cond.inRange(date)).toBe(true);
    });

    it('should return false when time is outside the day part range', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const cond = factory.dayPart('morning');
      const date = createDate(2024, 1, 1, 5, 0, 0); // 5:00 AM, before morning
      expect(cond.inRange(date)).toBe(false);
    });

    it('should handle overnight ranges correctly', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const cond = factory.dayPart('night');
      const date = createDate(2024, 1, 1, 23, 0, 0); // 11:00 PM, during night
      expect(cond.inRange(date)).toBe(true);
    });
  });
});

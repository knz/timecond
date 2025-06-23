import { CondFactory } from '../timeCond';
import { defaultTimeConfig } from '../config';
import { describe as describeCond } from '../describe';

describe('WeekDay', () => {
  // Helper function to create a date at a specific time
  const createDate = (year: number, month: number, day: number, hour: number = 0, minute: number = 0, second: number = 0) => {
    return new Date(year, month - 1, day, hour, minute, second);
  };

  describe('lastActiveRange', () => {
    it('should return the correct range for a date on the target day', () => {
      const monday = createDate(2024, 3, 4); // March 4, 2024 is a Monday
      const factory = new CondFactory(defaultTimeConfig);
      const cond = factory.makeWeekDay('monday');
      const range = cond.lastActiveRange(monday);

      expect(range).toBeDefined();
      expect(range?.start).toEqual(createDate(2024, 3, 4, 0, 0, 0));
      expect(range?.end).toEqual(createDate(2024, 3, 5, 0, 0, 0));
    });

    it('should return the correct range for a date after the target day', () => {
      const wednesday = createDate(2024, 3, 6); // March 6, 2024 is a Wednesday
      const factory = new CondFactory(defaultTimeConfig);
      const cond = factory.makeWeekDay('monday');
      const range = cond.lastActiveRange(wednesday);

      expect(range).toBeDefined();
      expect(range?.start).toEqual(createDate(2024, 3, 4, 0, 0, 0));
      expect(range?.end).toEqual(createDate(2024, 3, 5, 0, 0, 0));
    });

    it('should return the correct range for a date before the target day', () => {
      const sunday = createDate(2024, 3, 3); // March 3, 2024 is a Sunday
      const factory = new CondFactory(defaultTimeConfig);
      const cond = factory.makeWeekDay('monday');
      const range = cond.lastActiveRange(sunday);

      expect(range).toBeDefined();
      expect(range?.start).toEqual(createDate(2024, 2, 26, 0, 0, 0));
      expect(range?.end).toEqual(createDate(2024, 2, 27, 0, 0, 0));
    });

    it('should handle all days of the week correctly', () => {
      const testDate = createDate(2024, 3, 6); // March 6, 2024 is a Wednesday
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

      for (const day of days) {
        const factory = new CondFactory(defaultTimeConfig);
        const cond = factory.makeWeekDay(day);
        const range = cond.lastActiveRange(testDate);

        expect(range).toBeDefined();
        expect(range?.start.getDay()).toBe(cond.weekDayNumber);
      }
    });
  });

  describe('nextRanges', () => {
    it('should return the next occurrence of the target day', () => {
      const wednesday = createDate(2024, 3, 6); // March 6, 2024 is a Wednesday
      const factory = new CondFactory(defaultTimeConfig);
      const cond = factory.makeWeekDay('monday');
      const ranges = cond.nextRanges(wednesday);

      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(createDate(2024, 3, 11, 0, 0, 0));
      expect(ranges.ranges[0].end).toEqual(createDate(2024, 3, 12, 0, 0, 0));
    });

    it('should return the next day if search date is on the target day', () => {
      const monday = createDate(2024, 3, 4); // March 4, 2024 is a Monday
      const factory = new CondFactory(defaultTimeConfig);
      const cond = factory.makeWeekDay('monday');
      const ranges = cond.nextRanges(monday);

      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start).toEqual(createDate(2024, 3, 11, 0, 0, 0));
      expect(ranges.ranges[0].end).toEqual(createDate(2024, 3, 12, 0, 0, 0));
    });

    it('should handle all days of the week correctly', () => {
      const testDate = createDate(2024, 3, 6); // March 6, 2024 is a Wednesday
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
      const factory = new CondFactory(defaultTimeConfig);

      for (const day of days) {
        const cond = factory.makeWeekDay(day);
        const ranges = cond.nextRanges(testDate);
        expect(ranges.ranges).toHaveLength(1);
        expect(ranges.ranges[0].start.getDay()).toBe(cond.weekDayNumber);
      }
    });
  });

  describe('describe', () => {
    it('should return the day name', () => {
      const day = 'Monday';
      const factory = new CondFactory(defaultTimeConfig);
      const cond = factory.makeWeekDay(day);
      expect(describeCond(cond, defaultTimeConfig)).toBe(day);
    });
  });
});

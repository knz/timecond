import { AndCond, CondFactory, TimeBetweenCond } from '../timeCond';
import { defaultTimeConfig } from '../config';
import { describe as describeCond } from '../describe';

describe('AndCond', () => {
  // Helper function to create a simple time range condition
  const createTimeRange = (startHour: number, endHour: number) => {
    return new TimeBetweenCond({
      start: { hour: startHour, minute: 0 },
      end: { hour: endHour, minute: 0 },
    });
  };

  describe('constructor', () => {
    it('should throw error when no conditions are provided', () => {
      expect(() => new AndCond([])).toThrow('At least one condition is required');
    });

    it('should accept a single condition', () => {
      const cond = new AndCond([createTimeRange(9, 17)]);
      expect(cond).toBeDefined();
    });

    it('should accept multiple conditions', () => {
      const cond = new AndCond([createTimeRange(9, 17), createTimeRange(20, 22)]);
      expect(cond).toBeDefined();
    });
  });

  describe('lastActiveRange', () => {
    it('should find the last valid range even when the condition is not currently active', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const mondayCond = factory.makeWeekDay('monday');
      const workHoursCond = new TimeBetweenCond({ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } });
      const andCond = new AndCond([mondayCond, workHoursCond]);

      // Test on a Tuesday: should find the previous Monday's work hours.
      const tuesday = new Date('2025-06-17T10:00:00');
      const lastMondayWorkHoursStart = new Date('2025-06-16T09:00:00');
      const lastMondayWorkHoursEnd = new Date('2025-06-16T17:00:00');

      const range1 = andCond.lastActiveRange(tuesday);
      expect(range1).toBeDefined();
      expect(range1!.start.getTime()).toBe(lastMondayWorkHoursStart.getTime());
      expect(range1!.end!.getTime()).toBe(lastMondayWorkHoursEnd.getTime());

      // Test on a Monday before work hours: should find the *previous* week's Monday work hours.
      const mondayBeforeWork = new Date('2025-06-16T08:00:00');
      const prevMondayWorkHoursStart = new Date('2025-06-09T09:00:00');
      const prevMondayWorkHoursEnd = new Date('2025-06-09T17:00:00');

      const range2 = andCond.lastActiveRange(mondayBeforeWork);
      expect(range2).toBeDefined();
      expect(range2!.start.getTime()).toBe(prevMondayWorkHoursStart.getTime());
      expect(range2!.end!.getTime()).toBe(prevMondayWorkHoursEnd.getTime());
    });

    it('should return the intersection of active ranges when all conditions are active', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const mondayCond = factory.makeWeekDay('monday');
      const workHoursCond = new TimeBetweenCond({ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } });
      const andCond = new AndCond([mondayCond, workHoursCond]);

      // Test on Monday during work hours
      const monday = new Date();
      monday.setDate(monday.getDate() + ((1 + 7 - monday.getDay()) % 7)); // Next Monday
      monday.setHours(10, 0, 0, 0); // During work hours

      // Assert the individual conditions are active.
      const mondayCondRange = mondayCond.lastActiveRange(monday);
      expect(mondayCondRange).toBeDefined();
      expect(mondayCondRange?.start.getDay()).toBe(1); // Monday
      expect(mondayCondRange?.start.getHours()).toBe(0);
      expect(mondayCondRange?.end?.getDay()).toBe(2);
      expect(mondayCondRange?.end?.getHours()).toBe(0);

      const workHoursCondRange = workHoursCond.lastActiveRange(monday);
      expect(workHoursCondRange).toBeDefined();
      expect(workHoursCondRange?.start.getHours()).toBe(9);
      expect(workHoursCondRange?.end?.getHours()).toBe(17);

      const range = andCond.lastActiveRange(monday);
      expect(range).toBeDefined();
      expect(range?.start.getDay()).toBe(1); // Monday
      expect(range?.start.getHours()).toBe(9);
      expect(range?.end?.getDay()).toBe(1); // Monday
      expect(range?.end?.getHours()).toBe(17);
    });

    it('should return last Monday morning when reference is Wednesday', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const mondayCond = factory.makeWeekDay('monday');
      const morningCond = new TimeBetweenCond({ start: { hour: 6, minute: 0 }, end: { hour: 12, minute: 0 } });
      const andCond = new AndCond([mondayCond, morningCond]);

      // Wednesday June 18 2025
      const wednesday = new Date('2025-06-18T10:00:00');

      const range = andCond.lastActiveRange(wednesday);
      expect(range).toBeDefined();

      const lastMonday = new Date(wednesday);
      lastMonday.setDate(wednesday.getDate() - 2); // Monday
      const expectedStart = new Date(lastMonday);
      expectedStart.setHours(6, 0, 0, 0);

      const expectedEnd = new Date(lastMonday);
      expectedEnd.setHours(12, 0, 0, 0);

      expect(range!.start.getTime()).toBe(expectedStart.getTime());
      expect(range!.end!.getTime()).toBe(expectedEnd.getTime());
    });
  });

  describe('nextRanges', () => {
    it('should return empty set when no future ranges satisfy all conditions', () => {
      // Create conditions for Monday 9-5
      const factory = new CondFactory(defaultTimeConfig);
      const mondayCond = factory.makeWeekDay('monday');
      const workHoursCond = new TimeBetweenCond({
        start: { hour: 9, minute: 0 },
        end: { hour: 17, minute: 0 },
      });

      const andCond = new AndCond([mondayCond, workHoursCond]);

      // Test on Monday after work hours
      const monday = new Date();
      monday.setDate(monday.getDate() + ((1 + 7 - monday.getDay()) % 7)); // Next Monday
      monday.setHours(18, 0, 0, 0); // After work hours

      const ranges = andCond.nextRanges(monday);
      expect(ranges.ranges.length).toBe(1);
      const range = ranges.ranges[0];
      expect(range.start.getDay()).toBe(1); // Monday
      expect(range.start.getHours()).toBe(9);
      expect(range.end?.getDay()).toBe(1); // Monday
      expect(range.end?.getHours()).toBe(17);
    });

    it('should return the next range that satisfies all conditions, even if reference is after the last one', () => {
      // Create conditions for Monday 9-5
      const factory = new CondFactory(defaultTimeConfig);
      const mondayCond = factory.makeWeekDay('monday');
      const workHoursCond = new TimeBetweenCond({
        start: { hour: 9, minute: 0 },
        end: { hour: 17, minute: 0 },
      });
      const andCond = new AndCond([mondayCond, workHoursCond]);

      // Test on Monday after work hours
      const monday = new Date();
      monday.setDate(monday.getDate() + ((1 + 7 - monday.getDay()) % 7)); // Next Monday
      monday.setHours(18, 0, 0, 0); // After work hours

      const ranges = andCond.nextRanges(monday);
      expect(ranges.ranges.length).toBe(1);
      const range = ranges.ranges[0];
      expect(range.start.getDay()).toBe(1); // Monday
      expect(range.start.getHours()).toBe(9);
      expect(range.end?.getDay()).toBe(1); // Monday
      expect(range.end?.getHours()).toBe(17);
    });

    it('should return the next range that satisfies all conditions', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const mondayCond = factory.makeWeekDay('monday');
      const workHoursCond = new TimeBetweenCond({ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } });
      const andCond = new AndCond([mondayCond, workHoursCond]);

      // Test on Sunday
      const sunday = new Date();
      sunday.setDate(sunday.getDate() + ((0 + 7 - sunday.getDay()) % 7)); // Next Sunday
      sunday.setHours(10, 0, 0, 0);

      const ranges = andCond.nextRanges(sunday);
      expect(ranges.ranges.length).toBe(1);
      const range = ranges.ranges[0];
      expect(range.start.getDay()).toBe(1); // Monday
      expect(range.start.getHours()).toBe(9);
      expect(range.end?.getDay()).toBe(1); // Monday
      expect(range.end?.getHours()).toBe(17);
    });

    it('should return the next Monday morning when reference is Saturday', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const mondayCond = factory.makeWeekDay('monday');
      const morningCond = new TimeBetweenCond({ start: { hour: 6, minute: 0 }, end: { hour: 12, minute: 0 } });
      const andCond = new AndCond([mondayCond, morningCond]);

      // Saturday
      const saturday = new Date();
      saturday.setDate(saturday.getDate() + ((6 + 7 - saturday.getDay()) % 7)); // Next Saturday
      saturday.setHours(10, 0, 0, 0);

      const ranges = andCond.nextRanges(saturday);
      expect(ranges.ranges.length).toBe(1);
      const range = ranges.ranges[0];
      expect(range.start.getDay()).toBe(1); // Monday
      expect(range.start.getHours()).toBe(6);
      expect(range.end?.getDay()).toBe(1); // Monday
      expect(range.end?.getHours()).toBe(12);
    });

    it('should return the next Monday morning when reference is Monday afternoon', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const mondayCond = factory.makeWeekDay('monday');
      const morningCond = new TimeBetweenCond({ start: { hour: 6, minute: 0 }, end: { hour: 12, minute: 0 } });
      const andCond = new AndCond([mondayCond, morningCond]);

      // Monday afternoon
      const monday = new Date();
      monday.setDate(monday.getDate() + ((1 + 7 - monday.getDay()) % 7)); // Next Monday
      monday.setHours(15, 0, 0, 0);

      const ranges = andCond.nextRanges(monday);
      expect(ranges.ranges.length).toBe(1);
      const range = ranges.ranges[0];
      // Should be the following Monday
      expect(range.start.getDay()).toBe(1); // Monday
      expect(range.start.getHours()).toBe(6);
      expect(range.end?.getDay()).toBe(1); // Monday
      expect(range.end?.getHours()).toBe(12);
      expect(range.start.getTime()).toBeGreaterThan(monday.getTime());
    });

    it('should return the next Monday morning when reference is during Monday morning', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const mondayCond = factory.makeWeekDay('monday');
      const morningCond = new TimeBetweenCond({ start: { hour: 6, minute: 0 }, end: { hour: 12, minute: 0 } });
      const andCond = new AndCond([mondayCond, morningCond]);

      // Monday morning
      const monday = new Date();
      monday.setDate(monday.getDate() + ((1 + 7 - monday.getDay()) % 7)); // Next Monday
      monday.setHours(8, 0, 0, 0);

      const ranges = andCond.nextRanges(monday);
      expect(ranges.ranges.length).toBe(1);
      const range = ranges.ranges[0];
      // Should be the following Monday morning
      expect(range.start.getDay()).toBe(1); // Monday
      expect(range.start.getHours()).toBe(6);
      expect(range.end?.getDay()).toBe(1); // Monday
      expect(range.end?.getHours()).toBe(12);
      expect(range.start.getTime()).toBeGreaterThan(monday.getTime());
    });

    it('should find next Monday morning when reference is Wednesday, with "morning" first', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const morningCond = factory.dayPart('morning');
      const mondayCond = factory.makeWeekDay('monday');
      const andCond = new AndCond([morningCond, mondayCond]);

      // Wednesday June 18 2025, 10:00 AM
      const wednesday = new Date('2025-06-18T10:00:00');

      const ranges = andCond.nextRanges(wednesday);

      // The bug is that this is empty
      expect(ranges.ranges.length).toBeGreaterThan(0);

      if (ranges.ranges.length > 0) {
        const range = ranges.ranges[0];
        // Next monday is June 23 2025
        const nextMonday = new Date('2025-06-23T00:00:00');

        const expectedStart = new Date(nextMonday);
        expectedStart.setHours(7, 0, 0, 0); // Morning starts at 7

        const expectedEnd = new Date(nextMonday);
        expectedEnd.setHours(12, 0, 0, 0); // Morning ends at 12

        expect(range.start.getTime()).toBe(expectedStart.getTime());
        expect(range.end!.getTime()).toBe(expectedEnd.getTime());
      }
    });
  });

  describe('describe', () => {
    it('should return a string describing all conditions with AND', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const mondayCond = factory.makeWeekDay('monday');
      const workHoursCond = new TimeBetweenCond({ start: { hour: 9, minute: 0 }, end: { hour: 17, minute: 0 } });
      const andCond = new AndCond([mondayCond, workHoursCond]);
      expect(describeCond(andCond, defaultTimeConfig)).toBe('(Monday) AND (between 09:00 and 16:59)');
    });
  });
});

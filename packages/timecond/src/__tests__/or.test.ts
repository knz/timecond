import { CondFactory, OrCond, TimeBetweenCond } from '../timeCond';
import { defaultTimeConfig } from '../config';
import { describe as describeCond } from '../describe';

describe('OrCond', () => {
  // Helper function to create a simple time range condition
  const createTimeRange = (startHour: number, endHour: number) => {
    return new TimeBetweenCond({
      start: { hour: startHour, minute: 0 },
      end: { hour: endHour, minute: 0 },
    });
  };

  describe('constructor', () => {
    it('should throw error when no conditions are provided', () => {
      expect(() => new OrCond([])).toThrow('At least one condition is required');
    });

    it('should accept a single condition', () => {
      const cond = new OrCond([createTimeRange(9, 17)]);
      expect(cond).toBeDefined();
    });

    it('should accept multiple conditions', () => {
      const cond = new OrCond([createTimeRange(9, 17), createTimeRange(20, 22)]);
      expect(cond).toBeDefined();
    });
  });

  describe('lastActiveRange', () => {
    it('should return the previous day range when no conditions are active', () => {
      const cond = new OrCond([createTimeRange(9, 17)]);
      const date = new Date('2024-01-01T08:00:00');
      const range = cond.lastActiveRange(date);
      expect(range).toBeDefined();
      expect(range?.start).toEqual(new Date('2023-12-31T09:00:00'));
      expect(range?.end).toEqual(new Date('2023-12-31T17:00:00'));
    });

    it('should return the last active range from any condition', () => {
      const morningCond = createTimeRange(9, 12);
      const eveningCond = createTimeRange(18, 22);
      const cond = new OrCond([morningCond, eveningCond]);

      // Test during morning
      const morningDate = new Date('2024-01-01T10:00:00');
      const morningRange = cond.lastActiveRange(morningDate);
      expect(morningRange).toBeDefined();
      expect(morningRange?.start.getHours()).toBe(9);
      expect(morningRange?.end?.getHours()).toBe(12);

      // Test during evening
      const eveningDate = new Date('2024-01-01T20:00:00');
      const eveningRange = cond.lastActiveRange(eveningDate);
      expect(eveningRange).toBeDefined();
      expect(eveningRange?.start.getHours()).toBe(18);
      expect(eveningRange?.end?.getHours()).toBe(22);
    });

    it('should handle overlapping ranges correctly', () => {
      const cond1 = createTimeRange(9, 14);
      const cond2 = createTimeRange(12, 17);
      const cond = new OrCond([cond1, cond2]);

      const date = new Date('2024-01-01T13:00:00');
      const range = cond.lastActiveRange(date);
      expect(range).toBeDefined();
      expect(range?.start.getHours()).toBe(9);
      expect(range?.end?.getHours()).toBe(17);
    });
  });

  describe('nextRanges', () => {
    it('should return the next range from any condition', () => {
      const morningCond = createTimeRange(9, 12);
      const eveningCond = createTimeRange(18, 22);
      const cond = new OrCond([morningCond, eveningCond]);

      // Test before morning
      const beforeMorning = new Date('2024-01-01T08:00:00');
      const nextRange1 = cond.nextRanges(beforeMorning);
      expect(nextRange1.ranges[0].start.getHours()).toBe(9);
      expect(nextRange1.ranges[0].end?.getHours()).toBe(12);

      // Test between morning and evening
      const between = new Date('2024-01-01T14:00:00');
      const nextRange2 = cond.nextRanges(between);
      expect(nextRange2.ranges[0].start.getHours()).toBe(18);
      expect(nextRange2.ranges[0].end?.getHours()).toBe(22);
    });

    it('should handle multiple next ranges correctly', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const mondayCond = factory.makeWeekDay('monday');
      const wednesdayCond = factory.makeWeekDay('wednesday');
      const cond = new OrCond([mondayCond, wednesdayCond]);

      // Test from Sunday
      const sunday = new Date('2024-01-07T00:00:00'); // Sunday
      const nextRanges = cond.nextRanges(sunday);
      expect(nextRanges.ranges.length).toBe(2);
      expect(nextRanges.ranges[0].start.getDay()).toBe(1); // Monday
      expect(nextRanges.ranges[1].start.getDay()).toBe(3); // Wednesday
    });
  });

  describe('describe', () => {
    it('should return the correct description for single condition', () => {
      const cond = new OrCond([createTimeRange(9, 17)]);
      expect(describeCond(cond, defaultTimeConfig)).toBe('(between 09:00 and 16:59)');
    });

    it('should return the correct description for multiple conditions', () => {
      const cond = new OrCond([createTimeRange(9, 12), createTimeRange(14, 17)]);
      expect(describeCond(cond, defaultTimeConfig)).toBe('(between 09:00 and 11:59) OR (between 14:00 and 16:59)');
    });

    it('should return the correct description for mixed conditions', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const cond = new OrCond([createTimeRange(9, 17), factory.makeWeekDay('monday')]);
      expect(describeCond(cond, defaultTimeConfig)).toBe('(between 09:00 and 16:59) OR (Monday)');
    });
  });
});

describe('Weekend', () => {
  describe('with week starting on Monday', () => {
    const factory = new CondFactory({ ...defaultTimeConfig, weekStartsOnMonday: true });
    const weekend = factory.weekend();

    it('should be active on Saturday', () => {
      const saturday = new Date('2024-01-06T12:00:00'); // Saturday
      const range = weekend.lastActiveRange(saturday);
      expect(range).toBeDefined();
      expect(range?.start.getDay()).toBe(6); // Saturday
      expect(range?.end?.getDate()).toBe(7); // Next day
    });

    it('should be active on Sunday', () => {
      const sunday = new Date('2024-01-07T12:00:00'); // Sunday
      const range = weekend.lastActiveRange(sunday);
      expect(range).toBeDefined();
      expect(range?.start.getDay()).toBe(6); // Saturday
      expect(range?.end?.getDate()).toBe(8); // Next day
    });

    it('should not be active on Friday', () => {
      const friday = new Date('2024-01-12T12:00:00'); // Friday
      const range = weekend.lastActiveRange(friday);
      expect(range?.start.getDay()).toBe(6); // Previous Saturday
      expect(range?.start.getDate()).toBe(6); // Jan 6 = Saturday
      expect(range?.end?.getDay()).toBe(1); // End of Sunday = Monday
      expect(range?.end?.getDate()).toBe(8); // Monday
    });

    it('should return next weekend range from Monday', () => {
      const monday = new Date('2024-01-01T12:00:00'); // Monday
      const nextRanges = weekend.nextRanges(monday);
      expect(nextRanges.ranges.length).toBe(1);
      expect(nextRanges.ranges[0].start.getDay()).toBe(6); // Saturday
      expect(nextRanges.ranges[0].start.getDate()).toBe(6); // Jan 6 = Saturday
      expect(nextRanges.ranges[0].start.getHours()).toBe(0);
      expect(nextRanges.ranges[0].end?.getDay()).toBe(1); // Monday
      expect(nextRanges.ranges[0].end?.getDate()).toBe(8); // Monday
      expect(nextRanges.ranges[0].end?.getHours()).toBe(0);
    });

    it('should return the correct description', () => {
      expect(describeCond(weekend, defaultTimeConfig)).toBe('(Saturday) OR (Sunday)');
    });
  });

  describe('with week starting on Sunday', () => {
    const factory = new CondFactory({ ...defaultTimeConfig, weekStartsOnMonday: false });
    const weekend = factory.weekend();

    it('should be active on Friday', () => {
      const friday = new Date('2024-01-05T12:00:00'); // Friday
      const range = weekend.lastActiveRange(friday);
      expect(range).toBeDefined();
      expect(range?.start.getDay()).toBe(5); // Friday
      expect(range?.end?.getDate()).toBe(6); // Next day
    });

    it('should be active on Saturday', () => {
      const saturday = new Date('2024-01-06T12:00:00'); // Saturday
      const range = weekend.lastActiveRange(saturday);
      expect(range).toBeDefined();
      expect(range?.start.getDay()).toBe(5); // Friday
      expect(range?.start.getDate()).toBe(5); // Jan 5 = Friday
      expect(range?.end?.getDay()).toBe(0); // Monday
      expect(range?.end?.getDate()).toBe(7); // Jan 7 = Sunday
    });

    it('should not be active on Thursday', () => {
      const thursday = new Date('2024-01-11T12:00:00'); // Thursday
      const range = weekend.lastActiveRange(thursday);
      expect(range?.start.getDay()).toBe(5); // Previous Friday
      expect(range?.end?.getDate()).toBe(7); // End of Saturday
    });

    it('should return next weekend range from Sunday', () => {
      const sunday = new Date('2024-01-07T12:00:00'); // Sunday
      const nextRanges = weekend.nextRanges(sunday);
      expect(nextRanges.ranges.length).toBe(1);
      expect(nextRanges.ranges[0].start.getDay()).toBe(5); // Friday
      expect(nextRanges.ranges[0].start.getDate()).toBe(12); // Jan 12 = Friday
      expect(nextRanges.ranges[0].start.getHours()).toBe(0);
      expect(nextRanges.ranges[0].end?.getDay()).toBe(0); // Sunday
      expect(nextRanges.ranges[0].end?.getDate()).toBe(14); // Sunday
      expect(nextRanges.ranges[0].end?.getHours()).toBe(0);
    });

    it('should return the correct description', () => {
      expect(describeCond(weekend, defaultTimeConfig)).toBe('(Friday) OR (Saturday)');
    });
  });
});

describe('Workday', () => {
  describe('with week starting on Monday', () => {
    const factory = new CondFactory({ ...defaultTimeConfig, weekStartsOnMonday: true });
    const weekday = factory.workday();

    it('should be active on Monday', () => {
      const monday = new Date('2024-01-01T12:00:00'); // Monday
      const range = weekday.lastActiveRange(monday);
      expect(range).toBeDefined();
      expect(range?.start.getDay()).toBe(1); // Monday
      expect(range?.end?.getDate()).toBe(2); // Tuesday
    });

    it('should be active on Friday', () => {
      const friday = new Date('2024-01-05T12:00:00'); // Friday
      const range = weekday.lastActiveRange(friday);
      expect(range).toBeDefined();
      expect(range?.start.getDay()).toBe(1); // Monday
      expect(range?.end?.getDate()).toBe(6); // Saturday
    });

    it('should return previous weekday range from Saturday', () => {
      const saturday = new Date('2024-01-06T12:00:00'); // Saturday
      const range = weekday.lastActiveRange(saturday);
      expect(range).toBeDefined();
      expect(range?.start.getDate()).toBe(1); // Monday
      expect(range?.end?.getDate()).toBe(6); // Saturday
    });

    it('should return next weekday range from Sunday', () => {
      const sunday = new Date('2024-01-07T12:00:00'); // Sunday
      const nextRanges = weekday.nextRanges(sunday);
      expect(nextRanges.ranges.length).toBe(1);
      expect(nextRanges.ranges[0].start.getDay()).toBe(1); // Monday
      expect(nextRanges.ranges[0].start.getDate()).toBe(8); // Monday
      expect(nextRanges.ranges[0].end?.getDay()).toBe(6); // Saturday
      expect(nextRanges.ranges[0].end?.getDate()).toBe(13); // Saturday
    });

    it('should return the correct description', () => {
      expect(describeCond(weekday, defaultTimeConfig)).toBe('(Monday) OR (Tuesday) OR (Wednesday) OR (Thursday) OR (Friday)');
    });
  });

  describe('with week starting on Sunday', () => {
    const factory = new CondFactory({ ...defaultTimeConfig, weekStartsOnMonday: false });
    const weekday = factory.workday();

    it('should be active on Sunday', () => {
      const sunday = new Date('2024-01-07T12:00:00'); // Sunday
      const range = weekday.lastActiveRange(sunday);
      expect(range).toBeDefined();
      expect(range?.start.getDay()).toBe(0); // Sunday
      expect(range?.end?.getDate()).toBe(8); // Next day
    });

    it('should be active on Thursday', () => {
      const thursday = new Date('2024-01-04T12:00:00'); // Thursday
      const range = weekday.lastActiveRange(thursday);
      expect(range).toBeDefined();
      expect(range?.start.getDay()).toBe(0); // Sunday
      expect(range?.end?.getDate()).toBe(5); // Friday
    });

    it('should return previous weekday range from Friday', () => {
      const friday = new Date('2024-01-05T12:00:00'); // Friday
      const range = weekday.lastActiveRange(friday);
      expect(range).toBeDefined();
      expect(range?.start.getDay()).toBe(0); // Sunday
      expect(range?.start.getDate()).toBe(31); // Sunday
      expect(range?.end?.getDay()).toBe(5); // Friday
      expect(range?.end?.getDate()).toBe(5); // Friday
    });

    it('should return next weekday range from Saturday', () => {
      const saturday = new Date('2024-01-06T12:00:00'); // Saturday
      const nextRanges = weekday.nextRanges(saturday);
      expect(nextRanges.ranges.length).toBe(1);
      expect(nextRanges.ranges[0].start.getDay()).toBe(0); // Sunday
      expect(nextRanges.ranges[0].start.getDate()).toBe(7); // Sunday
      expect(nextRanges.ranges[0].end?.getDay()).toBe(5); // Friday
      expect(nextRanges.ranges[0].end?.getDate()).toBe(12); // Friday
    });

    it('should return the correct description', () => {
      expect(describeCond(weekday, defaultTimeConfig)).toBe('(Monday) OR (Tuesday) OR (Wednesday) OR (Thursday) OR (Sunday)');
    });
  });
});

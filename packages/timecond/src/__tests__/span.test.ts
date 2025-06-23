import { TimeSpanCond } from '../timeCond';
import { defaultTimeConfig } from '../config';
import { describe as describeCond } from '../describe';

describe('TimeSpanCond', () => {
  describe('constructor', () => {
    it('should throw an error for negative duration', () => {
      expect(() => new TimeSpanCond({ days: -1 })).toThrow('Duration must be positive');
    });

    it('should throw an error for zero duration', () => {
      expect(() => new TimeSpanCond({})).toThrow('Duration must be non-zero');
      expect(() => new TimeSpanCond({ days: 0, hours: 0 })).toThrow('Duration must be non-zero');
    });

    it('should correctly assign duration properties', () => {
      const cond = new TimeSpanCond({ months: 1, days: 10, hours: 5, minutes: 30, seconds: 15 });
      expect(cond.months).toBe(1);
      expect(cond.days).toBe(10);
      expect(cond.hours).toBe(5);
      expect(cond.minutes).toBe(30);
      expect(cond.seconds).toBe(15);
    });
  });

  describe('lastActiveRange and inRange', () => {
    it('should handle a simple day span', () => {
      const cond = new TimeSpanCond({ days: 5 });
      const refDate = new Date('2024-07-26T10:00:00Z');
      const range = cond.lastActiveRange(refDate);

      const expectedStart = new Date('2024-07-26T00:00:00Z');
      expectedStart.setHours(0, 0, 0, 0);
      const expectedEnd = new Date(expectedStart);
      expectedEnd.setDate(expectedStart.getDate() + 5);

      expect(range?.start.toISOString()).toBe(expectedStart.toISOString());
      expect(range?.end?.toISOString()).toBe(expectedEnd.toISOString());

      expect(cond.inRange(refDate)).toBe(true);
      expect(cond.inRange(new Date('2024-07-25T23:59:59Z'))).toBe(true);
      expect(cond.inRange(new Date('2024-07-31T00:00:00Z'))).toBe(true);
    });

    it('should handle a simple hour span', () => {
      const cond = new TimeSpanCond({ hours: 3 });
      const refDate = new Date('2024-07-26T10:30:00Z');
      const range = cond.lastActiveRange(refDate);

      const expectedStart = new Date('2024-07-26T10:00:00Z');
      expectedStart.setMinutes(0, 0, 0);
      const expectedEnd = new Date(expectedStart);
      expectedEnd.setHours(expectedStart.getHours() + 3);

      expect(range?.start.toISOString()).toBe(expectedStart.toISOString());
      expect(range?.end?.toISOString()).toBe(expectedEnd.toISOString());

      expect(cond.inRange(refDate)).toBe(true);
      expect(cond.inRange(new Date('2024-07-26T13:00:00Z'))).toBe(true);
    });

    it('should handle a month span', () => {
      const cond = new TimeSpanCond({ months: 1 });
      const refDate = new Date('2024-07-26T10:00:00Z');
      const range = cond.lastActiveRange(refDate);

      const expectedStart = new Date('2024-07-01T00:00:00Z');
      expectedStart.setHours(0, 0, 0, 0);
      const expectedEnd = new Date(expectedStart);
      expectedEnd.setMonth(expectedStart.getMonth() + 1);

      expect(range?.start.toISOString()).toBe(expectedStart.toISOString());
      expect(range?.end?.toISOString()).toBe(expectedEnd.toISOString());

      expect(cond.inRange(refDate)).toBe(true);
      expect(cond.inRange(new Date('2024-07-30T00:00:00Z'))).toBe(true);
    });
  });

  describe('nextRanges', () => {
    it('should return the next consecutive span', () => {
      const cond = new TimeSpanCond({ days: 2 });
      const refDate = new Date('2024-08-01T12:00:00Z'); // Inside a span from 2024-08-01 to 2024-08-03

      const nextRangeSet = cond.nextRanges(refDate);
      const nextRange = nextRangeSet.firstDate();

      const expectedNextStart = new Date(refDate);
      expectedNextStart.setDate(expectedNextStart.getDate() + 1);
      expectedNextStart.setHours(0, 0, 0, 0);
      expect(nextRange?.toISOString()).toBe(expectedNextStart.toISOString());
    });

    it('should return the next span after a gap', () => {
      const cond = new TimeSpanCond({ hours: 1 });
      // refDate is in the middle of the hour span starting at 11:00.
      const refDate = new Date('2024-08-01T11:30:00Z');

      const nextRangeSet = cond.nextRanges(refDate);
      const nextRange = nextRangeSet.firstDate();
      const nextRangeEnd = nextRangeSet.lastDate();

      const expectedNextStart = new Date('2024-08-01T12:00:00.000Z');
      const expectedNextEnd = new Date('2024-08-01T13:00:00.000Z');

      expect(nextRange?.toISOString()).toBe(expectedNextStart.toISOString());
      expect(nextRangeEnd?.toISOString()).toBe(expectedNextEnd.toISOString());
    });
  });

  describe('describe', () => {
    it('should return a human-readable description', () => {
      const cond = new TimeSpanCond({ months: 1, days: 10, hours: 5, minutes: 30, seconds: 15 });
      expect(describeCond(cond, defaultTimeConfig)).toBe('SPAN OF 1 months 10 days 5 hours 30 minutes 15 seconds');
    });
  });
});

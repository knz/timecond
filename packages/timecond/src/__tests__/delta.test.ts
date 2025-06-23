import { TimeDeltaCond } from '../timeCond';
import { defaultTimeConfig } from '../config';
import { describe as describeCond } from '../describe';

describe('TimeDeltaCond', () => {
  const baseTime = new Date('2024-01-01T12:00:00Z');
  const oneHourInMs = 60 * 60 * 1000;
  const twoHoursInMs = 2 * oneHourInMs;

  describe('lastActiveRange', () => {
    it('should return undefined when date is before validFrom', () => {
      const cond = new TimeDeltaCond(baseTime, oneHourInMs);
      const checkTime = new Date(baseTime.getTime() + 30 * 60 * 1000); // 30 minutes after
      expect(cond.lastActiveRange(checkTime)).toBeUndefined();
    });

    it('should return range starting from validFrom when date is after validFrom', () => {
      const cond = new TimeDeltaCond(baseTime, oneHourInMs);
      const checkTime = new Date(baseTime.getTime() + 90 * 60 * 1000); // 90 minutes after
      const range = cond.lastActiveRange(checkTime);
      expect(range).toBeDefined();
      expect(range?.start.getTime()).toBe(baseTime.getTime() + oneHourInMs);
      expect(range?.end).toBeUndefined();
    });

    it('should return range starting from validFrom when date equals validFrom', () => {
      const cond = new TimeDeltaCond(baseTime, oneHourInMs);
      const checkTime = new Date(baseTime.getTime() + oneHourInMs);
      const range = cond.lastActiveRange(checkTime);
      expect(range).toBeDefined();
      expect(range?.start.getTime()).toBe(checkTime.getTime());
      expect(range?.end).toBeUndefined();
    });
  });

  describe('nextRanges', () => {
    it('should return empty set when condition is already active', () => {
      const cond = new TimeDeltaCond(baseTime, oneHourInMs);
      const checkTime = new Date(baseTime.getTime() + 90 * 60 * 1000); // 90 minutes after
      const ranges = cond.nextRanges(checkTime);
      expect(ranges.ranges).toHaveLength(0);
    });

    it('should return range starting from validFrom when date is before validFrom', () => {
      const cond = new TimeDeltaCond(baseTime, oneHourInMs);
      const checkTime = new Date(baseTime.getTime() + 30 * 60 * 1000); // 30 minutes after
      const ranges = cond.nextRanges(checkTime);
      expect(ranges.ranges).toHaveLength(1);
      expect(ranges.ranges[0].start.getTime()).toBe(baseTime.getTime() + oneHourInMs);
      expect(ranges.ranges[0].end).toBeUndefined();
    });
  });

  describe('inRange', () => {
    it('should return false when date is before validFrom', () => {
      const cond = new TimeDeltaCond(baseTime, oneHourInMs);
      const checkTime = new Date(baseTime.getTime() + 30 * 60 * 1000); // 30 minutes after
      expect(cond.inRange(checkTime)).toBe(false);
    });

    it('should return true when date equals validFrom', () => {
      const cond = new TimeDeltaCond(baseTime, oneHourInMs);
      const checkTime = new Date(baseTime.getTime() + oneHourInMs);
      expect(cond.inRange(checkTime)).toBe(true);
    });

    it('should return true when date is after validFrom', () => {
      const cond = new TimeDeltaCond(baseTime, oneHourInMs);
      const checkTime = new Date(baseTime.getTime() + 90 * 60 * 1000); // 90 minutes after
      expect(cond.inRange(checkTime)).toBe(true);
    });
  });

  describe('describe', () => {
    it('should format description with hours only', () => {
      const cond = new TimeDeltaCond(baseTime, oneHourInMs);
      expect(describeCond(cond, defaultTimeConfig)).toBe('at least 1h later');
    });

    it('should format description with hours and minutes', () => {
      const cond = new TimeDeltaCond(baseTime, oneHourInMs + 30 * 60 * 1000);
      expect(describeCond(cond, defaultTimeConfig)).toBe('at least 1h 30m later');
    });

    it('should format description with hours, minutes and seconds', () => {
      const cond = new TimeDeltaCond(baseTime, oneHourInMs + 30 * 60 * 1000 + 45 * 1000);
      expect(describeCond(cond, defaultTimeConfig)).toBe('at least 1h 30m 45s later');
    });

    it('should handle plural forms correctly', () => {
      const cond = new TimeDeltaCond(baseTime, twoHoursInMs);
      expect(describeCond(cond, defaultTimeConfig)).toBe('at least 2h later');
    });
  });
});

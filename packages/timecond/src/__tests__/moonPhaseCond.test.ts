import { defaultTimeConfig } from '../config';
import { describe as describeCond } from '../describe';
import { moonPhaseInstant } from '../moonPhase';
import { AndCond, CondFactory, MoonPhaseCond, OrCond } from '../timeCond';

describe('MoonPhaseCond', () => {
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;

  /**
   * The day-sized window follows the local calendar, so the expected
   * boundaries are derived from the phase instant rather than hardcoded;
   * that keeps these tests independent of the timezone they run in.
   */
  const startOfLocalDay = (date: Date): Date => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  };
  const nextLocalDay = (date: Date): Date => {
    const next = startOfLocalDay(date);
    next.setDate(next.getDate() + 1);
    return next;
  };

  // An arbitrary but fixed lunation, so the tests do not depend on the current date.
  const newMoonIndex = 300; // 2024 April 8
  const fullMoonIndex = 300; // 2024 April 23

  describe('constructor', () => {
    it('should reject negative window bounds', () => {
      expect(() => new MoonPhaseCond('newMoon', { kind: 'around', beforeMs: -1, afterMs: HOUR })).toThrow(
        'Moon phase window bounds must not be negative'
      );
    });

    it('should reject an empty window', () => {
      expect(() => new MoonPhaseCond('newMoon', { kind: 'around', beforeMs: 0, afterMs: 0 })).toThrow(
        'Moon phase window must be non-empty'
      );
    });

    it('should reject a window longer than a synodic month', () => {
      expect(() => new MoonPhaseCond('fullMoon', { kind: 'around', beforeMs: 20 * DAY, afterMs: 20 * DAY })).toThrow(
        'Moon phase window must be shorter than a synodic month'
      );
    });
  });

  describe('day window', () => {
    it('should cover the whole local day of the new moon', () => {
      const cond = new MoonPhaseCond('newMoon');
      const instant = moonPhaseInstant('newMoon', newMoonIndex);
      const range = cond.lastActiveRange(instant);

      expect(range).toBeDefined();
      expect(range?.start).toEqual(startOfLocalDay(instant));
      expect(range?.end).toEqual(nextLocalDay(instant));
      expect(cond.inRange(instant)).toBe(true);
    });

    it('should be active from midnight, before the phase itself occurs', () => {
      const cond = new MoonPhaseCond('newMoon');
      const instant = moonPhaseInstant('newMoon', newMoonIndex);
      const midnight = startOfLocalDay(instant);

      expect(cond.inRange(midnight)).toBe(true);
      expect(cond.inRange(new Date(midnight.getTime() - 1))).toBe(false);
    });

    it('should not be active on the days around the phase', () => {
      const cond = new MoonPhaseCond('fullMoon');
      const instant = moonPhaseInstant('fullMoon', fullMoonIndex);

      expect(cond.inRange(new Date(instant.getTime() - 2 * DAY))).toBe(false);
      expect(cond.inRange(new Date(instant.getTime() + 2 * DAY))).toBe(false);
    });

    it('should report the previous occurrence when between two phases', () => {
      const cond = new MoonPhaseCond('newMoon');
      const instant = moonPhaseInstant('newMoon', newMoonIndex);
      const midway = new Date(instant.getTime() + 14 * DAY);
      const range = cond.lastActiveRange(midway);

      expect(range).toBeDefined();
      expect(range?.start).toEqual(startOfLocalDay(instant));
      expect(cond.inRange(midway)).toBe(false);
    });

    it('should find the next occurrence', () => {
      const cond = new MoonPhaseCond('fullMoon');
      const instant = moonPhaseInstant('fullMoon', fullMoonIndex);
      const nextInstant = moonPhaseInstant('fullMoon', fullMoonIndex + 1);

      const ranges = cond.nextRanges(instant);
      expect(ranges.ranges.length).toBe(1);
      expect(ranges.ranges[0].start).toEqual(startOfLocalDay(nextInstant));
      expect(ranges.ranges[0].end).toEqual(nextLocalDay(nextInstant));
    });

    it('should return the current occurrence when searching from just before its start', () => {
      const cond = new MoonPhaseCond('newMoon');
      const instant = moonPhaseInstant('newMoon', newMoonIndex);
      const midnight = startOfLocalDay(instant);

      const ranges = cond.nextRanges(new Date(midnight.getTime() - 1));
      expect(ranges.ranges[0].start).toEqual(midnight);
    });

    it('should end at the following midnight', () => {
      const cond = new MoonPhaseCond('newMoon');
      const instant = moonPhaseInstant('newMoon', newMoonIndex);
      expect(cond.currentEnd(instant)).toEqual(nextLocalDay(instant));
    });

    it('should step through consecutive lunations', () => {
      const cond = new MoonPhaseCond('newMoon');
      let cursor = moonPhaseInstant('newMoon', newMoonIndex);
      for (let step = 1; step <= 12; step++) {
        const next = cond.nextStart(cursor);
        expect(next).toEqual(startOfLocalDay(moonPhaseInstant('newMoon', newMoonIndex + step)));
        cursor = next!;
      }
    });
  });

  describe('around window', () => {
    it('should cover exactly the requested interval', () => {
      const cond = new MoonPhaseCond('fullMoon', { kind: 'around', beforeMs: 6 * HOUR, afterMs: 6 * HOUR });
      const instant = moonPhaseInstant('fullMoon', fullMoonIndex);
      const range = cond.lastActiveRange(instant);

      expect(range?.start).toEqual(new Date(instant.getTime() - 6 * HOUR));
      expect(range?.end).toEqual(new Date(instant.getTime() + 6 * HOUR));
      expect(cond.inRange(instant)).toBe(true);
      expect(cond.inRange(new Date(instant.getTime() - 7 * HOUR))).toBe(false);
      expect(cond.inRange(new Date(instant.getTime() + 7 * HOUR))).toBe(false);
    });

    it('should support asymmetric bounds', () => {
      const cond = new MoonPhaseCond('newMoon', { kind: 'around', beforeMs: 0, afterMs: 3 * DAY });
      const instant = moonPhaseInstant('newMoon', newMoonIndex);

      expect(cond.inRange(instant)).toBe(true);
      expect(cond.inRange(new Date(instant.getTime() - 1))).toBe(false);
      expect(cond.inRange(new Date(instant.getTime() + 2 * DAY))).toBe(true);
      expect(cond.inRange(new Date(instant.getTime() + 4 * DAY))).toBe(false);
    });

    it('should find the next occurrence', () => {
      const cond = new MoonPhaseCond('newMoon', { kind: 'around', beforeMs: DAY, afterMs: DAY });
      const instant = moonPhaseInstant('newMoon', newMoonIndex);
      const nextInstant = moonPhaseInstant('newMoon', newMoonIndex + 1);

      const ranges = cond.nextRanges(instant);
      expect(ranges.ranges.length).toBe(1);
      expect(ranges.ranges[0].start).toEqual(new Date(nextInstant.getTime() - DAY));
    });
  });

  describe('composition', () => {
    it('should combine with other conditions using OR', () => {
      const cond = new OrCond([new MoonPhaseCond('newMoon'), new MoonPhaseCond('fullMoon')]);
      const newMoon = moonPhaseInstant('newMoon', newMoonIndex);
      const fullMoon = moonPhaseInstant('fullMoon', fullMoonIndex);

      expect(cond.inRange(newMoon)).toBe(true);
      expect(cond.inRange(fullMoon)).toBe(true);
      expect(cond.inRange(new Date(newMoon.getTime() + 7 * DAY))).toBe(false);
    });

    it('should combine with a day part using AND', () => {
      const factory = new CondFactory(defaultTimeConfig);
      const cond = new AndCond([new MoonPhaseCond('fullMoon'), factory.dayPart('evening')]);
      const instant = moonPhaseInstant('fullMoon', fullMoonIndex);

      const evening = startOfLocalDay(instant);
      evening.setHours(18, 0, 0, 0);
      const morning = startOfLocalDay(instant);
      morning.setHours(9, 0, 0, 0);

      expect(cond.inRange(evening)).toBe(true);
      expect(cond.inRange(morning)).toBe(false);
    });
  });

  describe('describe', () => {
    it('should describe a day window', () => {
      expect(describeCond(new MoonPhaseCond('newMoon'), defaultTimeConfig)).toBe('on the day of the new moon');
      expect(describeCond(new MoonPhaseCond('fullMoon'), defaultTimeConfig)).toBe('on the day of the full moon');
    });

    it('should describe a symmetric window', () => {
      const cond = new MoonPhaseCond('fullMoon', { kind: 'around', beforeMs: 6 * HOUR, afterMs: 6 * HOUR });
      expect(describeCond(cond, defaultTimeConfig)).toBe('within 6h of the full moon');
    });

    it('should describe an asymmetric window', () => {
      const cond = new MoonPhaseCond('newMoon', { kind: 'around', beforeMs: 0, afterMs: 3 * DAY });
      expect(describeCond(cond, defaultTimeConfig)).toBe('from 0s before to 3d after the new moon');
    });
  });
});

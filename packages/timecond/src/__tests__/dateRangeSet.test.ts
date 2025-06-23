import { DateRangeSet } from '../timeCond';
import { describeDateRangeSet } from '../describe';

describe('DateRangeSet', () => {
  // Helper function to create dates
  const d = (year: number, month: number, day: number, hour = 0, minute = 0, second = 0) => {
    return new Date(year, month - 1, day, hour, minute, second);
  };

  describe('constructor', () => {
    it('should create an empty set from empty array', () => {
      const set = new DateRangeSet([]);
      expect(set.ranges).toHaveLength(0);
    });

    it('should merge overlapping ranges', () => {
      const ranges = [
        { start: d(2024, 1, 1), end: d(2024, 1, 3) },
        { start: d(2024, 1, 2), end: d(2024, 1, 4) },
      ];
      const set = new DateRangeSet(ranges);
      expect(set.ranges).toHaveLength(1);
      expect(set.ranges[0]).toEqual({
        start: d(2024, 1, 1),
        end: d(2024, 1, 4),
      });
    });

    it('should merge adjacent ranges', () => {
      const ranges = [
        { start: d(2024, 1, 1), end: d(2024, 1, 2) },
        { start: d(2024, 1, 2), end: d(2024, 1, 3) },
      ];
      const set = new DateRangeSet(ranges);
      expect(set.ranges).toHaveLength(1);
      expect(set.ranges[0]).toEqual({
        start: d(2024, 1, 1),
        end: d(2024, 1, 3),
      });
    });

    it('should sort ranges by start date', () => {
      const ranges = [
        { start: d(2024, 1, 4), end: d(2024, 1, 5) },
        { start: d(2024, 1, 1), end: d(2024, 1, 2) },
      ];
      const set = new DateRangeSet(ranges);
      expect(set.ranges[0].start).toEqual(d(2024, 1, 1));
      expect(set.ranges[1].start).toEqual(d(2024, 1, 4));
    });
  });

  describe('inRange', () => {
    it('should return undefined for empty set', () => {
      const set = new DateRangeSet([]);
      expect(set.inRange(d(2024, 1, 1))).toBeUndefined();
    });

    it('should find range containing date', () => {
      const set = new DateRangeSet([
        { start: d(2024, 1, 1), end: d(2024, 1, 3) },
        { start: d(2024, 1, 4), end: d(2024, 1, 6) },
      ]);
      const range = set.inRange(d(2024, 1, 2));
      expect(range).toBeDefined();
      expect(range?.start).toEqual(d(2024, 1, 1));
      expect(range?.end).toEqual(d(2024, 1, 3));
    });

    it('should return undefined for date outside all ranges', () => {
      const set = new DateRangeSet([
        { start: d(2024, 1, 1), end: d(2024, 1, 3) },
        { start: d(2024, 1, 4), end: d(2024, 1, 6) },
      ]);
      expect(set.inRange(d(2024, 1, 7))).toBeUndefined();
    });
  });

  describe('firstDate and lastDate', () => {
    it('should return undefined for empty set', () => {
      const set = new DateRangeSet([]);
      expect(set.firstDate()).toBeUndefined();
      expect(set.lastDate()).toBeUndefined();
    });

    it('should return correct first and last dates', () => {
      const set = new DateRangeSet([
        { start: d(2024, 1, 1), end: d(2024, 1, 3) },
        { start: d(2024, 1, 4), end: d(2024, 1, 6) },
      ]);
      expect(set.firstDate()).toEqual(d(2024, 1, 1));
      expect(set.lastDate()).toEqual(d(2024, 1, 6));
    });

    it('should handle infinite ranges', () => {
      const set = new DateRangeSet([{ start: d(2024, 1, 1) }, { start: d(2024, 1, 4), end: d(2024, 1, 6) }]);
      expect(set.firstDate()).toEqual(d(2024, 1, 1));
      expect(set.lastDate()).toBeUndefined();
    });
  });

  describe('lastRange', () => {
    it('should return undefined for empty set', () => {
      const set = new DateRangeSet([]);
      expect(set.lastRange()).toBeUndefined();
    });

    it('should return the last range', () => {
      const set = new DateRangeSet([
        { start: d(2024, 1, 1), end: d(2024, 1, 3) },
        { start: d(2024, 1, 4), end: d(2024, 1, 6) },
      ]);
      const lastRange = set.lastRange();
      expect(lastRange).toBeDefined();
      expect(lastRange?.start).toEqual(d(2024, 1, 4));
      expect(lastRange?.end).toEqual(d(2024, 1, 6));
    });
  });

  describe('describe', () => {
    it('should return empty string for empty set', () => {
      const set = new DateRangeSet([]);
      expect(describeDateRangeSet(set)).toBe('');
    });

    it('should format ranges correctly', () => {
      const set = new DateRangeSet([
        { start: d(2024, 1, 1, 10, 0), end: d(2024, 1, 1, 12, 0) },
        { start: d(2024, 1, 2, 14, 0), end: d(2024, 1, 2, 16, 0) },
      ]);
      const description = describeDateRangeSet(set);
      expect(description).toContain('1/1/2024, 10:00:00 AM');
      expect(description).toContain('1/1/2024, 12:00:00 PM');
      expect(description).toContain('1/2/2024, 2:00:00 PM');
      expect(description).toContain('1/2/2024, 4:00:00 PM');
    });
  });

  describe('union', () => {
    it('should merge overlapping ranges', () => {
      const set1 = new DateRangeSet([{ start: d(2024, 1, 1), end: d(2024, 1, 3) }]);
      const set2 = new DateRangeSet([{ start: d(2024, 1, 2), end: d(2024, 1, 4) }]);
      set1.union(set2);
      expect(set1.ranges).toHaveLength(1);
      expect(set1.ranges[0]).toEqual({
        start: d(2024, 1, 1),
        end: d(2024, 1, 4),
      });
    });

    it('should handle empty sets', () => {
      const set1 = new DateRangeSet([]);
      const set2 = new DateRangeSet([{ start: d(2024, 1, 1), end: d(2024, 1, 3) }]);
      set1.union(set2);
      expect(set1.ranges).toHaveLength(1);
      expect(set1.ranges[0]).toEqual({
        start: d(2024, 1, 1),
        end: d(2024, 1, 3),
      });
    });
  });

  describe('intersection', () => {
    it('should find overlapping ranges', () => {
      const set1 = new DateRangeSet([{ start: d(2024, 1, 1), end: d(2024, 1, 4) }]);
      const set2 = new DateRangeSet([{ start: d(2024, 1, 2), end: d(2024, 1, 5) }]);
      set1.intersection(set2);
      expect(set1.ranges).toHaveLength(1);
      expect(set1.ranges[0]).toEqual({
        start: d(2024, 1, 2),
        end: d(2024, 1, 4),
      });
    });

    it('should handle non-overlapping ranges', () => {
      const set1 = new DateRangeSet([{ start: d(2024, 1, 1), end: d(2024, 1, 2) }]);
      const set2 = new DateRangeSet([{ start: d(2024, 1, 3), end: d(2024, 1, 4) }]);
      set1.intersection(set2);
      expect(set1.ranges).toHaveLength(0);
    });

    it('should handle empty sets', () => {
      const set1 = new DateRangeSet([]);
      const set2 = new DateRangeSet([{ start: d(2024, 1, 1), end: d(2024, 1, 3) }]);
      set1.intersection(set2);
      expect(set1.ranges).toHaveLength(0);
    });
  });

  describe('clone', () => {
    it('should create a deep copy', () => {
      const original = new DateRangeSet([{ start: d(2024, 1, 1), end: d(2024, 1, 3) }]);
      const clone = original.clone();

      // Verify it's a different object
      expect(clone).not.toBe(original);

      // Verify the ranges are deep copied
      expect(clone.ranges[0]).not.toBe(original.ranges[0]);
      expect(clone.ranges[0].start).not.toBe(original.ranges[0].start);
      expect(clone.ranges[0].end).not.toBe(original.ranges[0].end);

      // Verify the values are the same
      expect(clone.ranges[0].start.getTime()).toBe(original.ranges[0].start.getTime());
      expect(clone.ranges[0].end?.getTime()).toBe(original.ranges[0].end?.getTime());
    });

    it('should handle empty set', () => {
      const original = new DateRangeSet([]);
      const clone = original.clone();
      expect(clone.ranges).toHaveLength(0);
    });

    it('should handle infinite ranges', () => {
      const original = new DateRangeSet([{ start: d(2024, 1, 1) }]);
      const clone = original.clone();
      expect(clone.ranges[0].start.getTime()).toBe(original.ranges[0].start.getTime());
      expect(clone.ranges[0].end).toBeUndefined();
    });
  });
});

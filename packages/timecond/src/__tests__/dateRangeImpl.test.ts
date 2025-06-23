import { DateRange, inDateRangeImpl, inRangeImpl, intersectionImpl, processRanges, unionImpl } from '../dateRangeImpl';

describe('DateRange Implementation', () => {
  describe('inDateRangeImpl', () => {
    it('should return true for date within range', () => {
      const date = new Date('2024-03-15');
      const range: DateRange = {
        start: new Date('2024-03-01'),
        end: new Date('2024-03-31'),
      };
      const result = inDateRangeImpl(date, range);
      expect(result).toBe(true);
    });

    it('should return false for date before range', () => {
      const date = new Date('2024-02-28');
      const range: DateRange = {
        start: new Date('2024-03-01'),
        end: new Date('2024-03-31'),
      };
      const result = inDateRangeImpl(date, range);
      expect(result).toBe(false);
    });

    it('should return false for date after range', () => {
      const date = new Date('2024-04-01');
      const range: DateRange = {
        start: new Date('2024-03-01'),
        end: new Date('2024-03-31'),
      };
      const result = inDateRangeImpl(date, range);
      expect(result).toBe(false);
    });

    it('should handle infinite range (no end date)', () => {
      const date = new Date('2024-04-01');
      const range: DateRange = {
        start: new Date('2024-03-01'),
      };
      const result = inDateRangeImpl(date, range);
      expect(result).toBe(true);
    });
  });

  describe('inRangeImpl', () => {
    it('should find range containing date', () => {
      const date = new Date('2024-03-15');
      const date2 = new Date('2024-04-15');
      const ranges: DateRange[] = [
        { start: new Date('2024-03-01'), end: new Date('2024-03-31') },
        { start: new Date('2024-04-01'), end: new Date('2024-04-30') },
      ];
      const result = inRangeImpl(date, ranges);
      expect(result).toEqual(ranges[0]);
      const result2 = inRangeImpl(date2, ranges);
      expect(result2).toEqual(ranges[1]);
    });

    it('should return undefined for date not in any range', () => {
      const date = new Date('2024-05-01');
      const date2 = new Date('2024-03-02');
      const ranges: DateRange[] = [
        { start: new Date('2024-02-01'), end: new Date('2024-02-31') },
        { start: new Date('2024-04-01'), end: new Date('2024-04-30') },
      ];
      const result = inRangeImpl(date, ranges);
      expect(result).toBeUndefined();
      const result2 = inRangeImpl(date2, ranges);
      expect(result2).toBeUndefined();
    });

    it('should handle empty ranges array', () => {
      const date = new Date('2024-03-15');
      const result = inRangeImpl(date, []);
      expect(result).toBeUndefined();
    });
  });

  describe('processRanges', () => {
    it('should merge overlapping ranges', () => {
      const ranges: DateRange[] = [
        { start: new Date('2024-03-01'), end: new Date('2024-03-15') },
        { start: new Date('2024-03-10'), end: new Date('2024-03-31') },
      ];
      const result = processRanges(ranges);
      expect(result).toEqual([{ start: new Date('2024-03-01'), end: new Date('2024-03-31') }]);
    });

    it('should merge adjacent ranges', () => {
      const ranges: DateRange[] = [
        { start: new Date('2024-03-01'), end: new Date('2024-03-15') },
        { start: new Date('2024-03-15'), end: new Date('2024-03-31') },
      ];
      const result = processRanges(ranges);
      expect(result).toEqual([{ start: new Date('2024-03-01'), end: new Date('2024-03-31') }]);
    });

    it('should handle merging finite and infinite ranges', () => {
      const ranges: DateRange[] = [{ start: new Date('2024-03-01') }, { start: new Date('2024-04-01'), end: new Date('2024-04-30') }];
      const result = processRanges(ranges);
      expect(result).toEqual([{ start: new Date('2024-03-01') }]);
    });

    it('should handle merging infinite ranges', () => {
      const ranges: DateRange[] = [{ start: new Date('2024-03-01') }, { start: new Date('2024-04-01') }];
      const result = processRanges(ranges);
      expect(result).toEqual([{ start: new Date('2024-03-01') }]);
    });

    it('should handle empty array', () => {
      expect(processRanges([])).toEqual([]);
    });

    it('should handle case where next range is completely contained within current range', () => {
      const ranges: DateRange[] = [
        { start: new Date('2024-03-01'), end: new Date('2024-03-31') },
        { start: new Date('2024-03-10'), end: new Date('2024-03-20') },
      ];
      const result = processRanges(ranges);
      expect(result).toEqual([{ start: new Date('2024-03-01'), end: new Date('2024-03-31') }]);
    });

    it('should handle case where current range is infinite and next range is finite', () => {
      const ranges: DateRange[] = [{ start: new Date('2024-03-01') }, { start: new Date('2024-04-01'), end: new Date('2024-04-30') }];
      const result = processRanges(ranges);
      expect(result).toEqual([{ start: new Date('2024-03-01') }]);
    });

    it('should handle non-overlapping ranges', () => {
      const ranges: DateRange[] = [
        { start: new Date('2024-03-01'), end: new Date('2024-03-15') },
        { start: new Date('2024-03-16'), end: new Date('2024-03-31') },
      ];
      const result = processRanges(ranges);
      expect(result).toEqual(ranges);
    });
  });

  describe('unionImpl', () => {
    it('should merge two sets of ranges', () => {
      const rangesA: DateRange[] = [{ start: new Date('2024-03-01'), end: new Date('2024-03-15') }];
      const rangesB: DateRange[] = [{ start: new Date('2024-03-10'), end: new Date('2024-03-31') }];
      const result = unionImpl(rangesA, rangesB);
      expect(result).toEqual([{ start: new Date('2024-03-01'), end: new Date('2024-03-31') }]);
    });

    it('should handle empty input', () => {
      const rangesA: DateRange[] = [];
      const rangesB: DateRange[] = [{ start: new Date('2024-03-01'), end: new Date('2024-03-31') }];
      expect(unionImpl(rangesA, rangesB)).toEqual(rangesB);
      expect(unionImpl(rangesB, rangesA)).toEqual(rangesB);
    });

    it('should return empty array when both inputs are empty', () => {
      expect(unionImpl([], [])).toEqual([]);
    });
  });

  describe('intersectionImpl', () => {
    it('should find intersection of overlapping ranges', () => {
      const rangesA: DateRange[] = [{ start: new Date('2024-03-01'), end: new Date('2024-03-31') }];
      const rangesB: DateRange[] = [{ start: new Date('2024-03-15'), end: new Date('2024-04-15') }];
      const result = intersectionImpl(rangesA, rangesB);
      expect(result).toEqual([{ start: new Date('2024-03-15'), end: new Date('2024-03-31') }]);
    });

    it('should handle non-overlapping ranges', () => {
      const rangesA: DateRange[] = [{ start: new Date('2024-03-01'), end: new Date('2024-03-15') }];
      const rangesB: DateRange[] = [{ start: new Date('2024-03-16'), end: new Date('2024-03-31') }];
      expect(intersectionImpl(rangesA, rangesB)).toEqual([]);
    });

    it('should handle infinite ranges', () => {
      const rangesA: DateRange[] = [{ start: new Date('2024-03-01') }];
      const rangesB: DateRange[] = [{ start: new Date('2024-03-15'), end: new Date('2024-03-31') }];
      const result = intersectionImpl(rangesA, rangesB);
      expect(result).toEqual([{ start: new Date('2024-03-15'), end: new Date('2024-03-31') }]);
    });

    it('should handle empty input', () => {
      const rangesA: DateRange[] = [];
      const rangesB: DateRange[] = [{ start: new Date('2024-03-01'), end: new Date('2024-03-31') }];
      expect(intersectionImpl(rangesA, rangesB)).toEqual([]);
      expect(intersectionImpl(rangesB, rangesA)).toEqual([]);
    });

    it('should handle case where ranges have equal end times', () => {
      const rangesA: DateRange[] = [{ start: new Date('2024-03-01'), end: new Date('2024-03-31') }];
      const rangesB: DateRange[] = [{ start: new Date('2024-03-15'), end: new Date('2024-03-31') }];
      const result = intersectionImpl(rangesA, rangesB);
      expect(result).toEqual([{ start: new Date('2024-03-15'), end: new Date('2024-03-31') }]);
    });

    it('should handle case where both ranges are infinite', () => {
      const rangesA: DateRange[] = [{ start: new Date('2024-03-01') }];
      const rangesB: DateRange[] = [{ start: new Date('2024-03-15') }];
      const result = intersectionImpl(rangesA, rangesB);
      expect(result).toEqual([{ start: new Date('2024-03-15') }]);
    });

    it('should return empty array when both inputs are empty', () => {
      expect(intersectionImpl([], [])).toEqual([]);
    });
  });
});

/**
 * Represents a range of dates.
 * The start date is inclusive and the end date is exclusive.
 * When end is omitted, the range includes all dates after the start date.
 */
export type DateRange = { start: Date; end?: Date };

/**
 * Checks if the given date is within the given range.
 * @param date - The date to check
 * @param range - The range to check
 * @returns true if the date is within the range, false otherwise
 */
export function inDateRangeImpl(date: Date, range: DateRange): boolean {
  return date >= range.start && (range.end === undefined || date < range.end);
}

/*
 * Invariants:
 * - the ranges don't overlap.
 * - the end of one range does not coincide with the start of the next (they are merged during extension).
 * - the ranges are sorted by start date.
 */
export type SortedDateRanges = DateRange[];

/**
 * Return the DateRange that contains the given date, if any.
 * @param date - The date to check
 * @param ranges - The ranges to check
 * @returns The DateRange that contains the given date, if any.
 */
export function inRangeImpl(date: Date, ranges: SortedDateRanges): DateRange | undefined {
  /* NB: We use binary search, utilizing the invariant that the ranges are sorted by start date.
   * This is a performance optimization.
   */
  let left = 0;
  let right = ranges.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const range = ranges[mid];

    if (date < range.start) {
      right = mid - 1;
    } else if (range.end !== undefined && date >= range.end) {
      left = mid + 1;
    } else {
      return range;
    }
  }

  return undefined;
}

/**
 * Internal helper function that merges a sorted array of date ranges.
 * @param sortedRanges - Array of date ranges sorted by start date
 * @returns A new set of ranges that maintains the invariants
 */
function _mergeSortedRanges(sortedRanges: DateRange[]): SortedDateRanges {
  if (sortedRanges.length === 0) {
    // This is already checked by the caller, but duplicated here
    // to assert to the compiler that there's at least one element below.
    return [];
  }

  const mergedRanges: SortedDateRanges = [];
  let currentMerge = { ...sortedRanges[0] }; // Deep copy

  for (let i = 1; i < sortedRanges.length; i++) {
    const nextRange = sortedRanges[i];

    // Check for overlap or adjacency
    // currentMerge.end can be undefined (infinite range)
    // nextRange.start must be before or at currentMerge.end (if currentMerge.end is defined)
    if (currentMerge.end === undefined || nextRange.start.getTime() <= currentMerge.end.getTime()) {
      // Merge: extend the end of currentMerge if nextRange.end is later or undefined
      if (nextRange.end === undefined) {
        currentMerge.end = undefined; // currentMerge now extends to infinity
      } else if (currentMerge.end === undefined) {
        // currentMerge is already infinite, nextRange is absorbed
      } else if (nextRange.end.getTime() > currentMerge.end.getTime()) {
        currentMerge.end = nextRange.end;
      }
    } else {
      // No overlap, push the currentMerge and start a new one
      mergedRanges.push(currentMerge);
      currentMerge = { ...nextRange }; // Deep copy
    }
  }

  // Don't forget to push the last merged range
  mergedRanges.push(currentMerge);

  return mergedRanges;
}

/**
 * Processes a set of date ranges to ensure they maintain the invariants.
 * @param ranges - The set of date ranges to process
 * @returns A new set of ranges that maintains the invariants.
 *
 * Invariants that are created in the result:
 * - the ranges don't overlap.
 * - the end of one range does not coincide with the start of the next (they are merged in that case).
 * - the ranges are sorted by start date.
 */
export function processRanges(ranges: DateRange[]): SortedDateRanges {
  if (ranges.length === 0) {
    return [];
  }

  // Sort ranges by start date
  const sortedRanges = [...ranges].sort((a, b) => a.start.getTime() - b.start.getTime());
  return _mergeSortedRanges(sortedRanges);
}

/**
 * Merges two sets of date ranges.
 * The caller ensures that the ranges maintain the invariants:
 * - the ranges don't overlap.
 * - the end of one range does not coincide with the start of the next (they are merged in that case).
 * - the ranges are sorted by start date.
 * @param thisRanges - The first set of ranges
 * @param otherRanges - The second set of ranges
 * @returns A new set of ranges that is the union of the two input sets.
 */
export function unionImpl(thisRanges: SortedDateRanges, otherRanges: SortedDateRanges): SortedDateRanges {
  if (thisRanges.length === 0) {
    return otherRanges;
  }
  if (otherRanges.length === 0) {
    return thisRanges;
  }

  const combinedRanges = [...thisRanges, ...otherRanges];
  // Sort ranges by start date
  combinedRanges.sort((a, b) => a.start.getTime() - b.start.getTime());
  return _mergeSortedRanges(combinedRanges);
}

/**
 * Computes the intersection of two sets of sorted date ranges.
 * The input ranges must maintain the invariants:
 * - the ranges don't overlap within their own set.
 * - the ranges are sorted by start date within their own set.
 * @param rangesA - The first set of sorted date ranges.
 * @param rangesB - The second set of sorted date ranges.
 * @returns A new set of sorted date ranges representing the intersection.
 */
export function intersectionImpl(rangesA: SortedDateRanges, rangesB: SortedDateRanges): SortedDateRanges {
  if (rangesA.length === 0 || rangesB.length === 0) {
    return [];
  }

  const resultRanges: SortedDateRanges = [];
  let i = 0;
  let j = 0;

  while (i < rangesA.length && j < rangesB.length) {
    const rangeA = rangesA[i];
    const rangeB = rangesB[j];

    // Calculate intersection bounds
    const startA = rangeA.start.getTime();
    const startB = rangeB.start.getTime();
    const endA = rangeA.end ? rangeA.end.getTime() : Infinity;
    const endB = rangeB.end ? rangeB.end.getTime() : Infinity;

    const intersectStartMs = Math.max(startA, startB);
    const intersectEndMs = Math.min(endA, endB);

    if (intersectStartMs < intersectEndMs) {
      // There is a valid intersection
      resultRanges.push({
        start: new Date(intersectStartMs),
        end: intersectEndMs === Infinity ? undefined : new Date(intersectEndMs),
      });
    }

    // Advance pointers
    if (endA < endB) {
      i++;
    } else if (endB < endA) {
      j++;
    } else {
      // Ends are equal (or both are Infinity)
      i++;
      j++;
    }
  }

  return resultRanges;
}

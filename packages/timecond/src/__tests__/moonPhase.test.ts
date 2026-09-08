import {
  approximateMoonPhaseIndex,
  MoonPhaseName,
  moonPhaseIndexAtOrBefore,
  moonPhaseInstant,
  nextMoonPhaseInstant,
  previousMoonPhaseInstant,
  SYNODIC_MONTH_MS,
} from '../moonPhase';

describe('moon phase instants', () => {
  const MINUTE = 60 * 1000;
  const DAY = 24 * 60 * 60 * 1000;

  /**
   * Reference instants taken from published ephemerides (all in UT).
   * The series used here is a truncated one, so the assertions allow a
   * couple of minutes of slack; in practice the differences below are
   * under 30 seconds.
   */
  const knownPhases: { phase: MoonPhaseName; instant: string; label: string }[] = [
    { phase: 'newMoon', instant: '1977-02-18T03:37Z', label: 'new moon of 1977 February (Meeus, example 49.a)' },
    { phase: 'newMoon', instant: '2000-01-06T18:14Z', label: 'new moon of 2000 January 6' },
    { phase: 'fullMoon', instant: '2000-01-21T04:40Z', label: 'full moon of 2000 January 21' },
    { phase: 'fullMoon', instant: '2024-01-25T17:54Z', label: 'full moon of 2024 January 25' },
    { phase: 'newMoon', instant: '2024-04-08T18:21Z', label: 'new moon of 2024 April 8' },
    { phase: 'fullMoon', instant: '2025-03-14T06:55Z', label: 'full moon of 2025 March 14' },
    { phase: 'newMoon', instant: '2026-08-12T17:37Z', label: 'new moon of 2026 August 12' },
  ];

  describe('accuracy', () => {
    for (const { phase, instant, label } of knownPhases) {
      it(`should match the published time of the ${label}`, () => {
        const expected = new Date(instant);
        // Search from one hour past the phase, so the phase itself is the last one.
        const computed = previousMoonPhaseInstant(phase, new Date(expected.getTime() + 60 * MINUTE));
        expect(Math.abs(computed.getTime() - expected.getTime())).toBeLessThan(2 * MINUTE);
      });
    }
  });

  describe('indexing', () => {
    it('should place index 0 at the new moon of 2000 January 6', () => {
      const computed = moonPhaseInstant('newMoon', 0);
      expect(Math.abs(computed.getTime() - new Date('2000-01-06T18:14Z').getTime())).toBeLessThan(2 * MINUTE);
    });

    it('should place full moon index 0 at the full moon that follows new moon index 0', () => {
      const newMoon = moonPhaseInstant('newMoon', 0);
      const fullMoon = moonPhaseInstant('fullMoon', 0);
      expect(fullMoon.getTime()).toBeGreaterThan(newMoon.getTime());
      expect(fullMoon.getTime() - newMoon.getTime()).toBeLessThan(SYNODIC_MONTH_MS);
    });

    it('should produce increasing instants roughly one synodic month apart', () => {
      for (const phase of ['newMoon', 'fullMoon'] as const) {
        let previous = moonPhaseInstant(phase, -1300);
        for (let index = -1299; index <= 1300; index++) {
          const current = moonPhaseInstant(phase, index);
          const gapDays = (current.getTime() - previous.getTime()) / DAY;
          // Individual lunations deviate from the 29.53 day mean by several hours.
          expect(gapDays).toBeGreaterThan(29.2);
          expect(gapDays).toBeLessThan(29.9);
          previous = current;
        }
      }
    });

    it('should approximate the index to within one lunation', () => {
      for (const phase of ['newMoon', 'fullMoon'] as const) {
        for (let index = -1300; index <= 1300; index += 7) {
          const instant = moonPhaseInstant(phase, index);
          // Check the instant itself and dates halfway to either neighbour.
          for (const offset of [-14 * DAY, 0, 14 * DAY]) {
            const approximation = approximateMoonPhaseIndex(phase, new Date(instant.getTime() + offset));
            expect(Math.abs(approximation - index)).toBeLessThanOrEqual(1);
          }
        }
      }
    });

    it('should find the index of the phase at or before a date', () => {
      const phase: MoonPhaseName = 'newMoon';
      for (let index = -400; index <= 400; index += 3) {
        const instant = moonPhaseInstant(phase, index);
        expect(moonPhaseIndexAtOrBefore(phase, instant)).toBe(index);
        expect(moonPhaseIndexAtOrBefore(phase, new Date(instant.getTime() + 1))).toBe(index);
        expect(moonPhaseIndexAtOrBefore(phase, new Date(instant.getTime() - 1))).toBe(index - 1);
      }
    });
  });

  describe('previousMoonPhaseInstant and nextMoonPhaseInstant', () => {
    it('should bracket the given date', () => {
      for (const phase of ['newMoon', 'fullMoon'] as const) {
        const date = new Date('2025-06-15T12:00Z');
        const previous = previousMoonPhaseInstant(phase, date);
        const next = nextMoonPhaseInstant(phase, date);
        expect(previous.getTime()).toBeLessThanOrEqual(date.getTime());
        expect(next.getTime()).toBeGreaterThan(date.getTime());
        expect(next.getTime() - previous.getTime()).toBeLessThan(30 * DAY);
      }
    });

    it('should treat the phase instant itself as already past', () => {
      const instant = moonPhaseInstant('fullMoon', 300);
      expect(previousMoonPhaseInstant('fullMoon', instant)).toEqual(instant);
      expect(nextMoonPhaseInstant('fullMoon', instant)).toEqual(moonPhaseInstant('fullMoon', 301));
    });
  });
});

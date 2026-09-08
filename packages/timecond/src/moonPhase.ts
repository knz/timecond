/**
 * Computation of the instants of new and full moons.
 *
 * Everything here is computed from a closed-form series: there are no
 * network requests, no ephemeris files and no external dependencies.
 *
 * The implementation follows Jean Meeus, "Astronomical Algorithms"
 * (2nd edition, 1998), chapter 49 ("Phases of the Moon"). That chapter
 * gives the instant of a phase as the sum of a mean (uniform) term and a
 * truncated series of periodic corrections. Meeus reports a maximum
 * deviation of about 17 seconds from the full ELP-2000/82 theory over
 * 1980-2020, so the times below are expected to be accurate to well
 * under a minute in the modern era. That is far finer than the day- or
 * hour-sized windows the conditions built on top of this use.
 *
 * Note: the series yields Dynamical Time (TD); it is converted to
 * Universal Time here by subtracting an estimate of Delta-T.
 */

/**
 * Which of the two phases supported by this module.
 * Named phases are used rather than an angle because only the exact
 * new and full moon instants are computed by the series below.
 */
export type MoonPhaseName = 'newMoon' | 'fullMoon';

/**
 * Mean length of a synodic month (new moon to new moon), in milliseconds.
 * This is the mean value used by the series; individual months deviate
 * from it by several hours.
 */
export const SYNODIC_MONTH_MS = 29.530588861 * 24 * 60 * 60 * 1000;

/** Julian Day number of the Unix epoch, 1970-01-01T00:00:00Z. */
const UNIX_EPOCH_JD = 2440587.5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Number of lunations per year, used to map a date to an approximate index. */
const LUNATIONS_PER_YEAR = 12.3685;

const DEG_TO_RAD = Math.PI / 180;

function sinDeg(degrees: number): number {
  return Math.sin(degrees * DEG_TO_RAD);
}

/**
 * Periodic corrections to the mean phase, from Meeus tables 49.a (new moon)
 * and 49.b (full moon). Both tables use the same arguments and differ only
 * in the first four coefficients, so they are tabulated together.
 *
 * Each entry is [newMoonCoeff, fullMoonCoeff, M, M', F, omega, ePower]:
 * the correction is coeff * E^ePower * sin(M*M + M'*M' + F*F + omega*omega),
 * in days.
 */
const PERIODIC_TERMS: [number, number, number, number, number, number, number][] = [
  [-0.4072, -0.40614, 0, 1, 0, 0, 0],
  [0.17241, 0.17302, 1, 0, 0, 0, 1],
  [0.01608, 0.01614, 0, 2, 0, 0, 0],
  [0.01039, 0.01043, 0, 0, 2, 0, 0],
  [0.00739, 0.00734, -1, 1, 0, 0, 1],
  [-0.00514, -0.00515, 1, 1, 0, 0, 1],
  [0.00208, 0.00209, 2, 0, 0, 0, 2],
  [-0.00111, -0.00111, 0, 1, -2, 0, 0],
  [-0.00057, -0.00057, 0, 1, 2, 0, 0],
  [0.00056, 0.00056, 1, 2, 0, 0, 1],
  [-0.00042, -0.00042, 0, 3, 0, 0, 0],
  [0.00042, 0.00042, 1, 0, 2, 0, 1],
  [0.00038, 0.00038, 1, 0, -2, 0, 1],
  [-0.00024, -0.00024, -1, 2, 0, 0, 1],
  [-0.00017, -0.00017, 0, 0, 0, 1, 0],
  [-0.00007, -0.00007, 2, 1, 0, 0, 0],
  [0.00004, 0.00004, 0, 2, -2, 0, 0],
  [0.00004, 0.00004, 3, 0, 0, 0, 0],
  [0.00003, 0.00003, 1, 1, -2, 0, 0],
  [0.00003, 0.00003, 0, 2, 2, 0, 0],
  [-0.00003, -0.00003, 1, 1, 2, 0, 0],
  [0.00003, 0.00003, -1, 1, 2, 0, 0],
  [-0.00002, -0.00002, -1, 1, -2, 0, 0],
  [-0.00002, -0.00002, 1, 3, 0, 0, 0],
  [0.00002, 0.00002, 0, 4, 0, 0, 0],
];

/**
 * Additional corrections due to the planets, from Meeus chapter 49.
 * Each entry is [coefficient in days, constant term, k coefficient, k^2 coefficient]
 * for the argument A = constant + kCoeff*k + kSqCoeff*T^2 (degrees).
 * Only A1 has a T^2 term.
 */
const PLANETARY_TERMS: [number, number, number, number][] = [
  [0.000325, 299.77, 0.107408, -0.009173],
  [0.000165, 251.88, 0.016321, 0],
  [0.000164, 251.83, 26.651886, 0],
  [0.000126, 349.42, 36.412478, 0],
  [0.00011, 84.66, 18.206239, 0],
  [0.000062, 141.74, 53.303771, 0],
  [0.00006, 207.14, 2.453732, 0],
  [0.000056, 154.84, 7.30686, 0],
  [0.000047, 34.52, 27.261239, 0],
  [0.000042, 207.19, 0.121824, 0],
  [0.00004, 291.34, 1.844379, 0],
  [0.000037, 161.72, 24.198154, 0],
  [0.000035, 239.56, 25.513099, 0],
  [0.000023, 331.55, 3.592518, 0],
];

/**
 * Estimates Delta-T (TD - UT) in seconds for a given decimal year.
 *
 * Uses the polynomial expressions published by Espenak & Meeus for the
 * "Five Millennium Canon of Solar Eclipses", with their long-term
 * parabola outside the fitted intervals. The modern-era branches are
 * predictions and can be off by a few seconds; that is small compared to
 * the residual error of the phase series itself.
 */
function deltaTSeconds(year: number): number {
  const longTerm = () => {
    const u = (year - 1820) / 100;
    return -20 + 32 * u * u;
  };
  let t: number;
  if (year < 1900) {
    return longTerm();
  }
  if (year < 1920) {
    t = year - 1900;
    return -2.79 + t * (1.494119 + t * (-0.0598939 + t * (0.0061966 + t * -0.000197)));
  }
  if (year < 1941) {
    t = year - 1920;
    return 21.2 + t * (0.84493 + t * (-0.0761 + t * 0.0020936));
  }
  if (year < 1961) {
    t = year - 1950;
    return 29.07 + 0.407 * t - (t * t) / 233 + (t * t * t) / 2547;
  }
  if (year < 1986) {
    t = year - 1975;
    return 45.45 + 1.067 * t - (t * t) / 260 - (t * t * t) / 718;
  }
  if (year < 2005) {
    t = year - 2000;
    return 63.86 + t * (0.3345 + t * (-0.060374 + t * (0.0017275 + t * (0.000651814 + t * 0.00002373599))));
  }
  if (year < 2050) {
    t = year - 2000;
    return 62.92 + t * (0.32217 + t * 0.005589);
  }
  if (year < 2150) {
    return longTerm() - 0.5628 * (2150 - year);
  }
  return longTerm();
}

/** Converts a Julian Day number (in UT) to a JavaScript Date. */
function julianDayToDate(jd: number): Date {
  return new Date(Math.round((jd - UNIX_EPOCH_JD) * MS_PER_DAY));
}

/**
 * Computes the instant of a lunar phase from Meeus' lunation number.
 * @param k - The lunation argument: an integer for a new moon, an integer
 *            plus 0.5 for a full moon. k = 0 is the new moon of 2000 January 6.
 * @returns The instant of the phase, in UT.
 */
function phaseInstantForK(k: number, phase: MoonPhaseName): Date {
  const t = k / 1236.85;
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;

  // Mean phase.
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * t2 - 0.00000015 * t3 + 0.00000000073 * t4;

  // Eccentricity of the Earth's orbit around the Sun.
  const e = 1 - 0.002516 * t - 0.0000074 * t2;
  // Sun's mean anomaly.
  const m = 2.5534 + 29.1053567 * k - 0.0000014 * t2 - 0.00000011 * t3;
  // Moon's mean anomaly.
  const mp = 201.5643 + 385.81693528 * k + 0.0107582 * t2 + 0.00001238 * t3 - 0.000000058 * t4;
  // Moon's argument of latitude.
  const f = 160.7108 + 390.67050284 * k - 0.0016118 * t2 - 0.00000227 * t3 + 0.000000011 * t4;
  // Longitude of the ascending node of the lunar orbit.
  const omega = 124.7746 - 1.56375588 * k + 0.0020672 * t2 + 0.00000215 * t3;

  const coeffIndex = phase === 'newMoon' ? 0 : 1;
  for (const term of PERIODIC_TERMS) {
    const coeff = term[coeffIndex];
    const argument = term[2] * m + term[3] * mp + term[4] * f + term[5] * omega;
    jde += coeff * Math.pow(e, term[6]) * sinDeg(argument);
  }

  for (const [coeff, constant, kCoeff, kSqCoeff] of PLANETARY_TERMS) {
    jde += coeff * sinDeg(constant + kCoeff * k + kSqCoeff * t2);
  }

  // The series yields Dynamical Time; convert to Universal Time.
  const year = 2000 + k / LUNATIONS_PER_YEAR;
  return julianDayToDate(jde - deltaTSeconds(year) / 86400);
}

/**
 * Returns the instant of the new or full moon with the given index.
 *
 * Index 0 is the new moon of 2000 January 6 for `newMoon`, and the full
 * moon of 2000 January 21 that follows it for `fullMoon`. Indices are
 * consecutive and may be negative (for phases before 2000).
 *
 * @param phase - Which phase to compute.
 * @param index - The index of the phase.
 * @returns The instant of the phase.
 */
export function moonPhaseInstant(phase: MoonPhaseName, index: number): Date {
  return phaseInstantForK(phase === 'newMoon' ? index : index + 0.5, phase);
}

/**
 * Returns an index whose phase instant is close to the given date.
 *
 * The result is derived from the mean lunation rate, so it can be off by
 * one from the index that actually brackets the date; callers must refine
 * it by stepping through neighbouring indices.
 *
 * @param phase - Which phase to index.
 * @param date - The date to locate.
 * @returns An approximate phase index for the date.
 */
export function approximateMoonPhaseIndex(phase: MoonPhaseName, date: Date): number {
  const yearStart = new Date(date.getFullYear(), 0, 1).getTime();
  const nextYearStart = new Date(date.getFullYear() + 1, 0, 1).getTime();
  const decimalYear = date.getFullYear() + (date.getTime() - yearStart) / (nextYearStart - yearStart);
  const offset = phase === 'newMoon' ? 0 : 0.5;
  return Math.round((decimalYear - 2000) * LUNATIONS_PER_YEAR - offset);
}

/**
 * Returns the index of the last phase occurring at or before the given date.
 * @param phase - Which phase to look for.
 * @param date - The reference date.
 * @returns The index of the phase.
 */
export function moonPhaseIndexAtOrBefore(phase: MoonPhaseName, date: Date): number {
  let index = approximateMoonPhaseIndex(phase, date);
  while (moonPhaseInstant(phase, index) > date) {
    index--;
  }
  while (moonPhaseInstant(phase, index + 1) <= date) {
    index++;
  }
  return index;
}

/**
 * Returns the instant of the last new or full moon at or before a date.
 * @param phase - Which phase to look for.
 * @param date - The reference date.
 * @returns The instant of the phase.
 */
export function previousMoonPhaseInstant(phase: MoonPhaseName, date: Date): Date {
  return moonPhaseInstant(phase, moonPhaseIndexAtOrBefore(phase, date));
}

/**
 * Returns the instant of the first new or full moon strictly after a date.
 * @param phase - Which phase to look for.
 * @param date - The reference date.
 * @returns The instant of the phase.
 */
export function nextMoonPhaseInstant(phase: MoonPhaseName, date: Date): Date {
  return moonPhaseInstant(phase, moonPhaseIndexAtOrBefore(phase, date) + 1);
}

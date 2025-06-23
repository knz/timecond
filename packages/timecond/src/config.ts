/**
 * Configuration for time-based conditions, including locale and user preferences.
 */
export interface TimeConfig {
  /**
   * Whether the week starts on Monday (true) or Sunday (false)
   */
  weekStartsOnMonday: boolean;

  /**
   * Names of the days of the week, starting with Sunday
   */
  dayNames: string[];

  /**
   * Names of the months, starting with January
   */
  monthNames: string[];

  /**
   * Short names of the months, starting with January
   */
  shortMonthNames: string[];

  /**
   * User-defined day parts with their time ranges
   */
  dayParts: {
    [key: string]: {
      start: { hour: number; minute: number };
      end: { hour: number; minute: number };
    };
  };

  /**
   * User-defined seasons with their date ranges
   */
  seasons: {
    [key: string]: {
      northern: { start: { month: number; day: number }; end: { month: number; day: number } };
      southern: { start: { month: number; day: number }; end: { month: number; day: number } };
    };
  };

  /**
   * Whether to use southern hemisphere seasons (true) or northern hemisphere seasons (false)
   */
  southernHemisphere: boolean;

  /**
   * Valid week day names and their corresponding indices (0-6)
   */
  weekDayNumbers: {
    [key: string]: number;
  };
}

/**
 * Default time configuration that can be used as a starting point.
 * Users can extend or modify this to suit their needs.
 */
export const defaultTimeConfig: TimeConfig = {
  weekStartsOnMonday: true,
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  shortMonthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayParts: {
    dawn: { start: { hour: 5, minute: 0 }, end: { hour: 7, minute: 0 } },
    morning: { start: { hour: 7, minute: 0 }, end: { hour: 12, minute: 0 } },
    noon: { start: { hour: 11, minute: 30 }, end: { hour: 13, minute: 0 } },
    afternoon: { start: { hour: 12, minute: 0 }, end: { hour: 18, minute: 0 } },
    evening: { start: { hour: 17, minute: 0 }, end: { hour: 22, minute: 30 } },
    night: { start: { hour: 21, minute: 0 }, end: { hour: 7, minute: 0 } },
    midnight: { start: { hour: 23, minute: 30 }, end: { hour: 1, minute: 0 } },
    day: { start: { hour: 7, minute: 0 }, end: { hour: 18, minute: 0 } },
    anytime: { start: { hour: 0, minute: 0 }, end: { hour: 24, minute: 0 } },
  },
  seasons: {
    spring: {
      northern: { start: { month: 3, day: 21 }, end: { month: 6, day: 22 } },
      southern: { start: { month: 9, day: 21 }, end: { month: 12, day: 22 } },
    },
    summer: {
      northern: { start: { month: 6, day: 21 }, end: { month: 9, day: 22 } },
      southern: { start: { month: 12, day: 21 }, end: { month: 3, day: 22 } },
    },
    fall: {
      northern: { start: { month: 9, day: 21 }, end: { month: 12, day: 22 } },
      southern: { start: { month: 3, day: 21 }, end: { month: 6, day: 22 } },
    },
    autumn: {
      northern: { start: { month: 9, day: 21 }, end: { month: 12, day: 22 } },
      southern: { start: { month: 3, day: 21 }, end: { month: 6, day: 22 } },
    },
    winter: {
      northern: { start: { month: 12, day: 21 }, end: { month: 3, day: 22 } },
      southern: { start: { month: 6, day: 21 }, end: { month: 9, day: 22 } },
    },
    summerSolstice: {
      northern: { start: { month: 6, day: 20 }, end: { month: 6, day: 23 } },
      southern: { start: { month: 12, day: 20 }, end: { month: 12, day: 23 } },
    },
    winterSolstice: {
      northern: { start: { month: 12, day: 20 }, end: { month: 12, day: 23 } },
      southern: { start: { month: 6, day: 20 }, end: { month: 6, day: 23 } },
    },
    springEquinox: {
      northern: { start: { month: 3, day: 20 }, end: { month: 3, day: 23 } },
      southern: { start: { month: 9, day: 20 }, end: { month: 9, day: 23 } },
    },
    fallEquinox: {
      northern: { start: { month: 9, day: 20 }, end: { month: 9, day: 23 } },
      southern: { start: { month: 3, day: 20 }, end: { month: 3, day: 23 } },
    },
  },
  southernHemisphere: false,
  weekDayNumbers: {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0,
  },
};

/**
 * Deep clone a TimeConfig object, including nested objects and arrays.
 */
export function cloneTimeConfig(config: TimeConfig): TimeConfig {
  return {
    weekStartsOnMonday: config.weekStartsOnMonday,
    dayNames: [...config.dayNames],
    monthNames: [...config.monthNames],
    shortMonthNames: [...config.shortMonthNames],
    dayParts: Object.fromEntries(Object.entries(config.dayParts).map(([k, v]) => [k, { start: { ...v.start }, end: { ...v.end } }])),
    seasons: Object.fromEntries(
      Object.entries(config.seasons).map(([k, v]) => [
        k,
        {
          northern: { start: { ...v.northern.start }, end: { ...v.northern.end } },
          southern: { start: { ...v.southern.start }, end: { ...v.southern.end } },
        },
      ]),
    ),
    southernHemisphere: config.southernHemisphere,
    weekDayNumbers: { ...config.weekDayNumbers },
  };
}

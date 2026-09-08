# TimeCond Module

The `timecond` module provides a flexible, composable, and extensible
framework for representing, evaluating, and describing complex
time-based conditions in JavaScript/TypeScript. It is designed to
support advanced scheduling, filtering, and rule-based logic for
applications that need to reason about time intervals, recurring
patterns, and human-friendly time expressions.

## Purpose

This module enables you to:

- Define conditions such as "every Monday", "between 9am and 5pm",
  "the third Friday of each month", or "between December 15 and
  January 10".
- Combine these conditions using logical AND/OR/Nth/FirstAfter
  constructs to create arbitrarily complex time rules.
- Query whether a given date/time satisfies a condition, when the next
  or last occurrence is, and describe the condition in human-readable
  form.

## Key Concepts

- **Cond (Condition):** Abstract base class for all time-based
  conditions. Subclasses implement specific logic (e.g., time ranges,
  weekdays, months, etc.).
- **DateRange & DateRangeSet:** Represent single or multiple (possibly
  non-contiguous) intervals of time.
- **Combinators:** `AndCond`, `OrCond`, `NthCond`, and
  `FirstAfterCond` allow for logical composition of conditions.
- **Visitor Pattern:** Used for describing conditions
  (`DescribeVisitor`) and for extensibility.
- **Configurable:** Uses a `TimeConfig` object for localization (e.g.,
  month names, week start day, seasons, day parts).

## Main Classes & Functions

- `Cond` (abstract): Base class for all conditions. Key methods:

  - `inRange(date: Date): boolean` — Is the date in the condition?
  - `lastActiveRange(date: Date): DateRange | undefined` — Last range containing the date.
  - `nextRanges(searchAfter: Date): DateRangeSet` — Next future range(s) after a date.
  - `nextStart(date: Date): Date | undefined` — Next start time after a date.
  - `currentEnd(date: Date): Date | undefined` — End time of current active range.

- **Concrete Condition Types:**

  - `TimeDeltaCond` — True after a time delta from a reference point.
  - `TimeBetweenCond` — True between two times of day (supports overnight spans).
  - `MonthBetweenCond` — True between two months (supports year wrap).
  - `DateBetweenCond` — True between two (month, day) pairs (supports year wrap).
  - `DayBetweenCond` — True between two days of the month (supports month wrap).
  - `DayPartCond` — True during a named part of the day (e.g., "morning").
  - `WeekDay` — True on a specific day of the week.
  - `MoonPhaseCond` — True around the new or full moon.

- **Combinators:**

  - `OrCond` — True if any child condition is true.
  - `AndCond` — True if all child conditions are true.
  - `NthCond` — True for the Nth occurrence of a condition after a start date.
  - `FirstAfterCond` — True for the first occurrence of B after A.

- **Factory:**

  - `CondFactory` — Helper for creating conditions using a `TimeConfig`.

- **Description:**

  - `DescribeVisitor` and `describe()` — Generate human-readable descriptions of conditions.

- **Date Range Utilities:**

  - `processRanges`, `unionImpl`, `intersectionImpl`, etc. — Efficient operations on sorted, non-overlapping date ranges.

- **Moon Phases:**
  - `moonPhaseInstant()`, `previousMoonPhaseInstant()`, `nextMoonPhaseInstant()` — The instants of new and full moons. See "Moon phases" below.

## Example Usage

```ts
import { CondFactory } from './timeCond';
import { defaultTimeConfig } from './timeCondConfig';

const factory = new CondFactory(defaultTimeConfig);
const weekdayCond = factory.makeWeekDay('monday');
const morningCond = factory.dayPart('morning');
const workdayMorning = new AndCond([weekdayCond, morningCond]);

const now = new Date();
console.log('Is now a workday morning?', workdayMorning.inRange(now));
console.log('Next workday morning starts at:', workdayMorning.nextStart(now));
```

## Design Philosophy

- **Composability:** All conditions can be combined using logical operators.
- **Extensibility:** New condition types can be added by subclassing `Cond` and implementing the required methods.
- **Performance:** Uses sorted, non-overlapping date ranges and binary search for efficient queries.
- **Localization:** All human-readable output is configurable via `TimeConfig`.

## When to Use

Use this module if you need to:

- Express and evaluate complex, recurring, or human-friendly time rules.
- Support user-defined schedules, reminders, or filters based on time.
- Generate readable descriptions of time-based logic for UI or logs.

## File Structure

- `timeCond.ts` — Main condition classes and combinators.
- `dateRangeImpl.ts` — Date range utilities and algorithms.
- `timeCondConfig.ts` — Configuration for localization and day/season definitions.
- `timeCondDescribe.ts` — Human-readable descriptions for conditions.
- `timeCondVisitor.ts` — Visitor pattern base class.
- `moonPhase.ts` — Astronomical computation of new and full moon instants.

## Moon phases

`MoonPhaseCond` is true around the new or full moon. The instants of the
phases are computed from a closed-form series (Jean Meeus, _Astronomical
Algorithms_, 2nd ed., chapter 49): the library performs no network
request and reads no ephemeris file. Meeus reports a maximum deviation of
about 17 seconds from the full lunar theory over 1980-2020; the times
produced here agree with published ephemerides to well under a minute in
the modern era.

A phase is an instant, not an interval, so the condition covers a window
around it. Two window shapes are available:

- `{ kind: 'day' }` (the default): the whole local calendar day that
  contains the instant.
- `{ kind: 'around', beforeMs, afterMs }`: the instant extended by
  `beforeMs` before and `afterMs` after. The two bounds together must be
  shorter than a synodic month, so that consecutive windows stay disjoint.

```ts
import { AndCond, CondFactory, defaultTimeConfig, MoonPhaseCond } from '@knz/timecond';

// The whole day of the next full moon.
const fullMoonDay = new MoonPhaseCond('fullMoon');

// Within 6 hours of the exact new moon.
const nearNewMoon = new MoonPhaseCond('newMoon', { kind: 'around', beforeMs: 6 * 3600_000, afterMs: 6 * 3600_000 });

// The night of the full moon.
const factory = new CondFactory(defaultTimeConfig);
const fullMoonNight = new AndCond([fullMoonDay, factory.dayPart('night')]);
```

Note that the day-sized window follows the local calendar day of the
runtime's timezone, while the phase instant itself is absolute.

## DSL Syntax

The parser understands a human-readable language for defining time conditions. The basic building block is a `condition`.

### Top-Level Expression

`expr ::= condition`

### Conditions (`condition`)

A `condition` can be one of the following:

- **Logical Combinators:**

  - `either <condition> or <condition> [or <condition> ...]` : Logical OR.
  - `both <condition> and <condition> [and <condition> ...]` : Logical AND.
  - `( <condition> )` : Grouping.

- **Selectors:**

  - `first <condition> after start of <condition> (exclusive|inclusive)` : Selects the first time the 'after' condition is true, where its period starts after the start of the 'first' condition (either inclusive or exclusive). (See FirstAfterStartCond)

- **Relative to the time of last occurrence:**

  - `nth <number> <condition>` : Selects the Nth occurrence of a `condition`.
  - `after <fractional_number> <unit> [, <fractional_number> <unit>]...` where `unit` can be `days`, `hours`, `minutes`, `seconds`.

- **Recurring Patterns:**

  - `daily from <time> to <time> (exclusive|inclusive)`
  - `daily between <time> and <time> (exclusive|inclusive)`
  - `monthly on day <number>`
  - `monthly from day <number> to [day] <number>`
  - `yearly on month <month>`
  - `yearly from month <month> to [month] <month>`
  - `yearly on date <date>`
  - `yearly from date <date> to [date] <date>`

- **Relative to the current time:**

  - `span of <number> <unit> [, <number> <unit>]...

  Where `unit` can be `months`, `days`, `hours`, `minutes`, `seconds`.

- **Moon Phases:**

  - `new moon` : The local day containing the new moon.
  - `full moon` : The local day containing the full moon.
  - `new moon within <fractional_number> <unit> [, <fractional_number> <unit>]...` : The given duration before and after the exact instant of the new moon. `unit` can be `days`, `hours`, `minutes`, `seconds`.
  - `full moon within <fractional_number> <unit> [, <fractional_number> <unit>]...` : Same, for the full moon.

- **Named Conditions (from config):**
  - `weekend`
  - `workday`
  - `<day_part_name>` (e.g., `morning`, `afternoon`)
  - `<day_name>` (e.g., `monday`, `tuesday`)
  - `<season_name>` (e.g., `summer`, `winter`)
  - `<month_name>` (e.g. `january`)

### Sub-expressions

- **`<time>`:**

  - `HH`
  - `HH:MM`
  - `<time> [am|pm]`
    (e.g., `14`, `9:30`, `17:00`, `9pm`)

- **`<date>`:**

  - `<month_name> <day_number>` (e.g., `January 15`)
  - `<day_number> [of] <month_name>` (e.g., `15 of January`)
  - `<day_number> [of] month <month_number>` (e.g., `15 of month 1`)

- **`<month>`:**

  - `<month_name>` (e.g., `January`, `Jan`)
  - `<month_number>`

- **`<fractional_number>`:** A decimal number.

  - `NN`
  - `.NN`
  - `NN.NN`

- **`<number>`:** An integer.
- **`<..._name>`:** An identifier defined in the `TimeConfig` (e.g. `morning`, `monday`, `summer`).

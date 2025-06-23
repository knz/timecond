# TimeCond Library

## Overview

This repository contains a flexible, composable, and extensible TypeScript library for representing, evaluating, and describing complex conditions on **time ranges**. The support for time ranges is what makes it different from many other popular time scheduling libraries that focus on _events_ (points in time).

The main library is located in [`packages/timecond`](./packages/timecond), and a test/demo UI is available in [`examples/react`](./examples/react).

## Main Components

### 1. `packages/timecond` — TimeCond Library

A reusable TypeScript library for advanced scheduling, filtering, and rule-based logic involving time intervals, recurring patterns, and human-friendly time expressions.

#### **Key Features**

- **Composable Time Conditions:** Express rules like "every Monday", "between 9am and 5pm", "the third Friday of each month", or "between December 15 and January 10".
- **Logical Combinators:** Combine conditions using AND, OR, Nth, and FirstAfter constructs for arbitrarily complex rules.
- **Rich Query API:**
  - Check if a date/time satisfies a condition
  - Find the next or last occurrence
  - Generate human-readable descriptions
- **Extensible:** Add new condition types by subclassing the base `Cond` class.
- **Efficient:** Uses sorted, non-overlapping date ranges and binary search for fast queries.
- **Localization:** Day parts and season hemispheres are configurable via a `TimeConfig` object.
- **DSL Parser:** Supports a human-friendly domain-specific language for defining time conditions (see below).

#### **Example Usage**

```ts
import { CondFactory } from '@knz/timecond';
import { defaultTimeConfig } from '@knz/timecond';

const factory = new CondFactory(defaultTimeConfig);
const weekdayCond = factory.makeWeekDay('monday');
const morningCond = factory.dayPart('morning');
const workdayMorning = new AndCond([weekdayCond, morningCond]);

const now = new Date();
console.log('Is now a workday morning?', workdayMorning.inRange(now));
console.log('Next workday morning starts at:', workdayMorning.nextStart(now));
```

#### **Supported Condition Types**

- Time of day, day of week, day of month, month, date ranges
- Named day parts (e.g., "morning"), seasons, custom ranges
- Logical AND/OR/Nth/FirstAfter combinators
- Relative and recurring patterns (e.g., "after 2 hours", "nth 3 Monday after...", etc.)

#### **Domain-Specific Language (DSL) Examples**

- `either monday or friday`
- `both workday and morning`
- `first tuesday after start of january exclusive`
- `nth 2 friday`
- `daily from 9:00 to 17:00 inclusive`
- `yearly from december 15 to january 10`

See the [library README](./packages/timecond/README.md) for full details.

---

### 2. `examples/react` — Test UI

A React-based demo and test UI for the TimeCond library. This UI allows you to:

- Enter and parse time condition expressions (using the DSL)
- Select reference and evaluation dates
- Visualize the evaluation results, including next/last occurrences and active ranges
- See human-readable descriptions of parsed conditions
- Experiment interactively with all features of the library

To run the test UI, see the instructions in [`examples/react`](./examples/react).

---

## Comparison with Other Libraries

Here are some popular time condition libraries. Note that they are all **event-oriented**: they provide conditions on _points in time_ not entire time ranges. They do not support conditions like "the first night after the start of monday".

- [rSchedule](https://github.com/jorroll/rschedule): Powerful, date-library agnostic, supports iCal, custom rules, and occurrence stream operators. API is inspired by iCal and is very flexible.
- [rrulejs](https://github.com/jakubroztocil/rrule): Implements the iCal RRULE spec, widely used, mature, but less extensible and not as composable for custom logic.
- [laterjs](https://github.com/bunkat/later): Simpler API, supports cron-like schedules, not iCal compatible, less flexible for complex rules, currently unmaintained.
- [dayspan](https://github.com/ClickerMonkey/dayspan): Full-featured for recurring dates, but with a unique API and less focus on composability/extensibility.

## License

[Apache GPL 2.0](./LICENSE)

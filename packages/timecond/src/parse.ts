import moo from 'moo';
import { TimeConfig } from './config';
import { lexer } from './lex';
import {
  AndCond,
  Cond,
  CondFactory,
  DateBetweenCond,
  DayBetweenCond,
  DayTime,
  FirstAfterStartCond,
  MonthBetweenCond,
  MonthDay,
  NthCond,
  OrCond,
  TimeBetweenCond,
  TimeDeltaCond,
  TimeSpanCond,
} from './timeCond';

export class Parser {
  private currentToken: moo.Token | undefined;
  private refDate: Date;
  private factory: CondFactory;
  // Precomputed lowercase maps for efficient lookup
  private dayPartsLower: { [key: string]: string };
  private dayNamesLower: { [key: string]: string };
  private seasonsLower: { [key: string]: string };
  private monthNameToNumberMap: { [key: string]: number };
  private input: string;

  constructor(config: TimeConfig, refDate: Date) {
    this.currentToken = undefined;
    this.input = '';
    this.refDate = refDate;
    this.factory = new CondFactory(config);
    // Precompute lowercase maps: lowercased key -> canonical key
    this.dayPartsLower = {};
    Object.keys(config.dayParts).forEach((k) => {
      this.dayPartsLower[k.toLowerCase()] = k;
    });
    this.dayNamesLower = {};
    config.dayNames.forEach((d) => {
      this.dayNamesLower[d.toLowerCase()] = d;
    });
    this.seasonsLower = {};
    Object.keys(config.seasons).forEach((k) => {
      this.seasonsLower[k.toLowerCase()] = k;
    });
    // Precompute month name to number map (long and short names, case-insensitive)
    this.monthNameToNumberMap = {};
    config.monthNames.forEach((name, idx) => {
      this.monthNameToNumberMap[name.toLowerCase()] = idx;
    });
    config.shortMonthNames.forEach((name, idx) => {
      this.monthNameToNumberMap[name.toLowerCase()] = idx;
    });
  }

  private nextToken(): moo.Token | undefined {
    const token = lexer.next();
    this.currentToken = token;
    return this.currentToken;
  }

  private error(message: string): never {
    let ctx = '';
    if (this.currentToken) {
      ctx = `\n${this.input}\n` + ' '.repeat(this.currentToken.offset) + '^ here';
    }
    throw new Error(`Parse error: ${message}${ctx}`);
  }

  private hasKw(kw: string): boolean {
    return this.currentToken?.type === 'identifier' && this.currentToken.value === kw;
  }

  private hasNext(type: string): boolean {
    return this.currentToken?.type === type;
  }

  private matchKw(kw: string): moo.Token | undefined {
    if (this.currentToken?.type === 'identifier' && this.currentToken.value === kw) {
      const token = this.currentToken;
      this.nextToken();
      return token;
    }
    this.error(`Expected ${kw}, got ${this.currentToken?.value}`);
  }

  private match(type: string): moo.Token {
    if (this.currentToken?.type === type) {
      const token = this.currentToken;
      this.nextToken();
      return token;
    }
    this.error(`Expected ${type}, got ${this.currentToken?.value}`);
  }

  // cond : <number> { TimeDelta(new Date(), $1) }
  //     | either <cond> or <cond> { OrCond($2, $4) }
  public parse(input: string): Cond {
    this.input = input;
    lexer.reset(input);
    this.nextToken();
    const cond = this.parseCond();
    if (this.currentToken) {
      this.error(`Unexpected token at end: ${this.currentToken.value}`);
    }
    return cond;
  }

  private parseNumber(): number {
    const token = this.match('number');
    return parseInt(token.value, 10);
  }

  private parseEither(): Cond {
    this.matchKw('either');
    const left = this.parseCond();
    const conds: Cond[] = [left];
    if (!this.hasKw('or')) {
      this.error(`Expected "or" after "either", got ${this.currentToken?.value}`);
    }
    while (this.hasKw('or')) {
      this.matchKw('or');
      const right = this.parseCond();
      conds.push(right);
    }
    return new OrCond(conds);
  }

  private parseBoth(): Cond {
    this.matchKw('both');
    const left = this.parseCond();
    const conds: Cond[] = [left];
    if (!this.hasKw('and')) {
      this.error(`Expected "and" after "both", got ${this.currentToken?.value}`);
    }
    while (this.hasKw('and')) {
      this.matchKw('and');
      const right = this.parseCond();
      conds.push(right);
    }
    return new AndCond(conds);
  }

  private parseDate(): MonthDay {
    // Recognized syntax:
    // <month name> <number> -> {month: $1, day: $2}
    // <number> [of] <month name> -> {month: $2, day: $1}
    // <number> [of] month <number> -> {month: $2, day: $1}
    if (this.hasNext('number')) {
      const day = this.parseDayNumber();
      if (this.hasKw('of')) {
        this.matchKw('of');
      }
      let month = -1;
      if (this.hasKw('month')) {
        this.matchKw('month');
        month = this.parseMonthNumber();
      } else {
        month = this.parseMonthAsName();
      }
      return { month, day };
    }
    if (this.hasNext('identifier')) {
      const month = this.parseMonthAsName();
      const day = this.parseDayNumber();
      return { month, day };
    }
    this.error(`Expected a number or month name, got ${this.currentToken?.value}`);
  }

  private parseDayNumber(): number {
    const token = this.match('number');
    const day = parseInt(token.value, 10);
    if (day < 1 || day > 31) {
      this.error(`Invalid day number: ${token.value}`);
    }
    return day;
  }

  private parseMonthNumber(): number {
    const token = this.match('number');
    const month = parseInt(token.value, 10);
    if (month < 1 || month > 12) {
      this.error(`Invalid month number: ${token.value}`);
    }
    return month - 1;
  }

  private parseYearly(): Cond {
    // Supported syntax:
    // yearly on month <number> -> MonthBetweenCond({start: n, end: n})
    // yearly on month <name> -> MonthBetweenCond({start: n, end: n})
    // yearly from month <number> to <number> -> MonthBetweenCond({start: n, end: m})
    // yearly from month <name> to <name> -> MonthBetweenCond({start: n, end: m})
    // yearly on date <date> -> DateBetweenCond({start: n, end: n})
    // yearly from date <date> to <date> -> DateBetweenCond({start: n, end: m})
    this.matchKw('yearly');
    if (this.hasKw('on')) {
      this.matchKw('on');
      if (this.hasKw('month')) {
        this.matchKw('month');
        const month = this.parseMonthAsNameOrNumber();
        return new MonthBetweenCond({ start: month, end: month });
      }
      if (this.hasKw('date')) {
        this.matchKw('date');
        const date = this.parseDate();
        return new DateBetweenCond({ start: date, end: date });
      }
      this.error(`Expected "month" or "date" after "on" in "yearly", got ${this.currentToken?.value}`);
    }
    if (this.hasKw('from')) {
      this.matchKw('from');
      return this.parseMonthOrDateBetween(true);
    }
    if (this.hasKw('between')) {
      this.matchKw('between');
      return this.parseMonthOrDateBetween(false);
    }
    this.error(`Expected "on" or "from" or "between" after "yearly", got ${this.currentToken?.value}`);
  }

  private parseMonthOrDateBetween(fromKw: boolean): MonthBetweenCond | DateBetweenCond {
    // Supported syntax:
    // yearly from month <number> to <number> -> MonthBetweenCond({start: n, end: m})
    // yearly from month <name> to <name> -> MonthBetweenCond({start: n, end: m})
    // yearly from date <date> to <date> -> DateBetweenCond({start: n, end: m})
    // yearly between month <number> and <number> -> MonthBetweenCond({start: n, end: m})
    // yearly between month <name> and <name> -> MonthBetweenCond({start: n, end: m})
    // yearly between date <date> and <date> -> DateBetweenCond({start: n, end: m})
    if (this.hasKw('month')) {
      this.matchKw('month');
      const startMonth = this.parseMonthAsNameOrNumber();
      if (fromKw) {
        this.matchKw('to');
      } else {
        // Between syntax.
        this.matchKw('and');
      }
      if (this.hasKw('month')) {
        // Optional 'month' keyword.
        this.matchKw('month');
      }
      const endMonth = this.parseMonthAsNameOrNumber();
      return new MonthBetweenCond({ start: startMonth, end: endMonth });
    }
    if (this.hasKw('date')) {
      this.matchKw('date');
      const startDate = this.parseDate();
      if (fromKw) {
        this.matchKw('to');
      } else {
        // Between syntax.
        this.matchKw('and');
      }
      if (this.hasKw('date')) {
        // Optional 'date' keyword.
        this.matchKw('date');
      }
      const endDate = this.parseDate();
      return new DateBetweenCond({ start: startDate, end: endDate });
    }
    this.error(`Expected "month" or "date" after "from" in "yearly", got ${this.currentToken?.value}`);
  }

  private parseDayBetween(fromKw: boolean): DayBetweenCond {
    // Supported syntax:
    // monthly from day <number> to <number> -> DayBetweenCond({start: n, end: m})
    // monthly between day <number> and <number> -> DayBetweenCond({start: n, end: m})
    this.matchKw('day');
    const startDay = this.parseDayNumber();
    if (fromKw) {
      this.matchKw('to');
    } else {
      // Between syntax.
      this.matchKw('and');
    }
    if (this.hasKw('day')) {
      // Optional 'day' keyword.
      this.matchKw('day');
    }
    const endDay = this.parseDayNumber();
    return new DayBetweenCond({ start: startDay, end: endDay });
  }

  private parseMonthly(): Cond {
    // Supported syntax:
    // monthly on day <number> -> DayBetweenCond({start: n, end: n})
    // monthly from day <number> to <number> -> DayBetweenCond({start: n, end: m})
    // monthly between day <number> and <number> -> DayBetweenCond({start: n, end: m})
    this.matchKw('monthly');
    if (this.hasKw('on')) {
      this.matchKw('on');
      this.matchKw('day');
      const day = this.parseDayNumber();
      return new DayBetweenCond({ start: day, end: day });
    }
    if (this.hasKw('from')) {
      this.matchKw('from');
      return this.parseDayBetween(true);
    }
    if (this.hasKw('between')) {
      this.matchKw('between');
      return this.parseDayBetween(false);
    }
    this.error(`Expected "on" or "from" or "between" after "monthly", got ${this.currentToken?.value}`);
  }

  private parseMonthAsNameOrNumber(): number {
    if (this.hasNext('number')) {
      return this.parseMonthNumber();
    }
    return this.parseMonthAsName();
  }

  private parseMonthAsName(): number {
    if (this.hasNext('identifier')) {
      const maybeMonthName = this.currentToken!.value;
      // return an exception if the month is not found
      const month = this.monthNameToNumberMap[maybeMonthName.toLowerCase()];
      if (month === undefined) {
        this.error(`Unknown month name: ${maybeMonthName}`);
      }
      this.match('identifier');
      return month;
    }
    this.error(`Expected a month name, got ${this.currentToken?.value}`);
  }

  private parseFirstAfter(): Cond {
    // first <cond> after start of <cond> -> FirstAfterStartCond($1, $2)
    this.matchKw('first');
    const relativeCond = this.parseCond();
    this.matchKw('after');
    this.matchKw('start');
    this.matchKw('of');
    const refCond = this.parseCond();
    let inclusive: boolean;
    if (this.hasKw('inclusive')) {
      this.matchKw('inclusive');
      inclusive = true;
    } else if (this.hasKw('exclusive')) {
      this.matchKw('exclusive');
      inclusive = false;
    } else {
      this.error(`Expected "inclusive" or "exclusive", got ${this.currentToken?.value}`);
    }
    return new FirstAfterStartCond(refCond, relativeCond, inclusive);
  }

  private parseNth(): Cond {
    // nth <number> <cond> -> NthCond(..., $2, $3)
    this.matchKw('nth');
    const n = this.parseNumber();
    return new NthCond(this.refDate, n, this.parseCond());
  }

  private parseDayTime(): DayTime {
    // <number>[:<number>] -> {hour: $1, minute: $2}
    let hour = this.parseNumber();
    let minute = 0;
    if (this.hasNext('colon')) {
      this.match('colon');
      minute = this.parseNumber();
    }
    if (this.hasKw('am')) {
      this.matchKw('am');
      if (hour > 12) {
        this.error(`Invalid hour for AM: ${hour}`);
      }
    } else if (this.hasKw('pm')) {
      this.matchKw('pm');
      if (hour > 12) {
        this.error(`Invalid hour for PM: ${hour}`);
      }
      hour += 12;
    } else {
      if (hour > 23) {
        this.error(`Invalid hour: ${hour}`);
      }
    }
    return { hour, minute };
  }

  private parseTimeBetween(fromKw: boolean): TimeBetweenCond {
    const startDayTime = this.parseDayTime();
    if (fromKw) {
      this.matchKw('to');
    } else {
      // Between syntax.
      this.matchKw('and');
    }
    const endDayTime = this.parseDayTime();
    let inclusive: boolean;
    if (this.hasKw('inclusive')) {
      this.matchKw('inclusive');
      inclusive = true;
    } else if (this.hasKw('exclusive')) {
      this.matchKw('exclusive');
      inclusive = false;
    } else {
      this.error(`Expected "inclusive" or "exclusive", got ${this.currentToken?.value}`);
    }
    return new TimeBetweenCond({ start: startDayTime, end: endDayTime }, inclusive);
  }

  private parseDaily(): Cond {
    // daily from <time> to <time> -> TimeBetweenCond({start: $1, end: $2})
    this.matchKw('daily');
    if (this.hasKw('from')) {
      this.matchKw('from');
      return this.parseTimeBetween(true);
    }
    if (this.hasKw('between')) {
      this.matchKw('between');
      return this.parseTimeBetween(false);
    }
    this.error(`Expected "from" or "between" after "daily", got ${this.currentToken?.value}`);
  }

  private parseTimeDelta(): Cond {
    // after <fractional> seconds/minutes/hours/days -> TimeDeltaCond($1, $2)
    // after <part> [, <part>]...
    // fractional:
    //   <number> [. <number>] | . <number>
    this.matchKw('after');

    let totalDelay = 0;
    let hasPart = false;
    while (true) {
      if (hasPart) {
        if (this.hasNext('comma')) {
          this.match('comma');
        } else {
          break;
        }
      } else {
        if (!this.hasNext('number')) {
          this.error(`Expected a number after "after", got ${this.currentToken?.value}`);
        }
      }
      hasPart = true;

      let hasNumber = false;
      let number1 = 0;
      if (this.hasNext('number')) {
        number1 = this.parseNumber();
        hasNumber = true;
      }

      let number2 = 0;
      let magnitude = 0;
      if (this.hasNext('period')) {
        this.match('period');
        if (!this.hasNext('number')) {
          this.error(`Expected a number after ".", got ${this.currentToken?.value}`);
        }
        magnitude = this.currentToken!.value.length;
        number2 = this.parseNumber();
        hasNumber = true;
      }

      if (!hasNumber) {
        this.error(`Expected a number after "after", got ${this.currentToken?.value}`);
      }

      let unit = 1;
      if (this.hasKw('seconds')) {
        this.matchKw('seconds');
        unit = 1000;
      } else if (this.hasKw('minutes')) {
        this.matchKw('minutes');
        unit = 60 * 1000;
      } else if (this.hasKw('hours')) {
        this.matchKw('hours');
        unit = 60 * 60 * 1000;
      } else if (this.hasKw('days')) {
        this.matchKw('days');
        unit = 24 * 60 * 60 * 1000;
      } else {
        this.error(`Expected a time unit, got ${this.currentToken?.value}`);
      }
      const milliseconds = (number1 + number2 * Math.pow(10, -magnitude)) * unit;
      totalDelay += milliseconds;
    }

    return new TimeDeltaCond(this.refDate, totalDelay);
  }

  private parseSpan(): Cond {
    // span of <number> months -> TimeSpanCond({months: $1})
    this.matchKw('span');
    this.matchKw('of');
    let months = 0;
    let days = 0;
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    let hasPart = false;
    while (true) {
      if (hasPart) {
        if (this.hasNext('comma')) {
          this.match('comma');
        } else {
          break;
        }
      }

      const number = this.parseNumber();
      hasPart = true;
      if (this.hasKw('months')) {
        this.matchKw('months');
        months = number;
      } else if (this.hasKw('days')) {
        this.matchKw('days');
        days = number;
      } else if (this.hasKw('hours')) {
        this.matchKw('hours');
        hours = number;
      } else if (this.hasKw('minutes')) {
        this.matchKw('minutes');
        minutes = number;
      } else if (this.hasKw('seconds')) {
        this.matchKw('seconds');
        seconds = number;
      } else {
        this.error(`Unrecognized duration unit: ${this.currentToken?.value}`);
      }
    }
    if (!hasPart) {
      this.error(`Expected a duration part, got ${this.currentToken?.value}`);
    }
    return new TimeSpanCond({ months, days, hours, minutes, seconds });
  }

  private parseCond(): Cond {
    if (this.hasNext('lpar')) {
      this.match('lpar');
      const cond = this.parseCond();
      this.match('rpar');
      return cond;
    }
    if (this.hasKw('either')) {
      return this.parseEither();
    }
    if (this.hasKw('both')) {
      return this.parseBoth();
    }
    if (this.hasKw('after')) {
      return this.parseTimeDelta();
    }
    if (this.hasKw('weekend')) {
      this.matchKw('weekend');
      return this.factory.weekend();
    }
    if (this.hasKw('workday')) {
      this.matchKw('workday');
      return this.factory.workday();
    }
    if (this.hasKw('monthly')) {
      return this.parseMonthly();
    }
    if (this.hasKw('yearly')) {
      return this.parseYearly();
    }
    if (this.hasKw('daily')) {
      return this.parseDaily();
    }
    if (this.hasKw('first')) {
      return this.parseFirstAfter();
    }
    if (this.hasKw('nth')) {
      return this.parseNth();
    }
    if (this.hasKw('span')) {
      return this.parseSpan();
    }

    if (this.currentToken?.type === 'identifier') {
      const tokenValueLower = this.currentToken.value.toLowerCase();
      const dayPartKey = this.dayPartsLower[tokenValueLower];
      if (dayPartKey) {
        this.match('identifier');
        return this.factory.dayPart(dayPartKey);
      }
      const dayName = this.dayNamesLower[tokenValueLower];
      if (dayName) {
        this.match('identifier');
        return this.factory.makeWeekDay(dayName);
      }
      const seasonKey = this.seasonsLower[tokenValueLower];
      if (seasonKey) {
        this.match('identifier');
        return this.factory.season(seasonKey);
      }
      const monthIdx = this.monthNameToNumberMap[tokenValueLower];
      if (monthIdx !== undefined) {
        this.match('identifier');
        return new MonthBetweenCond({ start: monthIdx, end: monthIdx });
      }
    }
    this.error(`Unrecognized condition: ${this.currentToken?.value}`);
  }
}

export function parse(input: string, config: TimeConfig, refDate?: Date): Cond {
  const parser = new Parser(config, refDate ?? new Date());
  return parser.parse(input);
}

import { defaultTimeConfig } from '../config';
import { describe as describeCond } from '../describe';
import { parse } from '../parse';

describe('Time Condition Parser', () => {
  const refDate = new Date('2025-01-01T00:00:00.000Z');

  const testParse = (input: string, expected: string) => {
    it(`should parse: ${input}`, () => {
      const cond = parse(input, defaultTimeConfig, refDate);
      const description = describeCond(cond, defaultTimeConfig);
      expect(description).toBe(expected);
    });
  };

  describe('Logical Combinators', () => {
    testParse('either monday or tuesday', '(Monday) OR (Tuesday)');
    testParse('both workday and morning', '((Monday) OR (Tuesday) OR (Wednesday) OR (Thursday) OR (Friday)) AND (during morning)');
    testParse('(monday)', 'Monday');
    testParse(
      'either (either monday or tuesday) or (either wednesday or thursday)',
      '((Monday) OR (Tuesday)) OR ((Wednesday) OR (Thursday))'
    );
  });

  describe('Selectors', () => {
    testParse('first morning after start of sunday exclusive', 'FIRST (during morning) AFTER START OF (Sunday) EXCLUSIVE');
    testParse('first morning after start of sunday inclusive', 'FIRST (during morning) AFTER START OF (Sunday) INCLUSIVE');
    testParse('nth 3 monday', 'Nth(3, Monday)');
  });

  describe('Recurring Patterns', () => {
    // Daily
    testParse('daily from 9:00 to 17:00 inclusive', 'between 09:00 and 17:00');
    testParse('daily from 9:00 to 17:00 exclusive', 'between 09:00 and 16:59');
    testParse('daily from 9am to 5pm inclusive', 'between 09:00 and 17:00');
    testParse('daily from 9am to 5pm exclusive', 'between 09:00 and 16:59');

    // Monthly
    testParse('monthly on day 15', 'between day 15 and day 15 of the month');
    testParse('monthly from day 10 to 20', 'between day 10 and day 20 of the month');
    testParse('monthly from day 25 to 5', 'between day 25 and day 5 of the month');

    // Yearly
    testParse('yearly on month january', 'between January and January');
    testParse('yearly on month 1', 'between January and January');
    testParse('yearly from month january to march', 'between January and March');
    testParse('yearly on date January 15', 'between Jan 15 and Jan 15');
    testParse('yearly on date 15 of January', 'between Jan 15 and Jan 15');
    testParse('yearly on date 15 of month 1', 'between Jan 15 and Jan 15');
    testParse('yearly from date Dec 25 to Jan 5', 'between Dec 25 and Jan 5');
  });

  describe('Named Conditions', () => {
    testParse('weekend', '(Saturday) OR (Sunday)');
    testParse('workday', '(Monday) OR (Tuesday) OR (Wednesday) OR (Thursday) OR (Friday)');
    testParse('morning', 'during morning');
    testParse('monday', 'Monday');
    testParse('summer', 'between Jun 21 and Sep 22');
    testParse('springEquinox', 'between Mar 20 and Mar 23');
    testParse('fallEquinox', 'between Sep 20 and Sep 23');
    testParse('winterSolstice', 'between Dec 20 and Dec 23');
    testParse('summerSolstice', 'between Jun 20 and Jun 23');
  });

  describe('Complex nested expressions', () => {
    testParse(
      'nth 2 first either (daily from 8 to 12 exclusive) or (daily from 14 to 18 exclusive) after start of first workday after start of yearly on date Jan 1 exclusive exclusive',
      'Nth(2, FIRST ((between 08:00 and 11:59) OR (between 14:00 and 17:59)) AFTER START OF (' +
        'FIRST ((Monday) OR (Tuesday) OR (Wednesday) OR (Thursday) OR (Friday)) ' +
        'AFTER START OF (between Jan 1 and Jan 1) EXCLUSIVE' +
        ') EXCLUSIVE)'
    );
  });

  describe('Time Delta', () => {
    testParse('after 5 seconds', 'at least 5s later');
    testParse('after 10 minutes', 'at least 10m later');
    testParse('after 2 hours', 'at least 2h later');
    testParse('after 3 days', 'at least 3d later');
    testParse('after 1.5 hours', 'at least 1h 30m later');
    testParse('after 1 days, 12 hours', 'at least 1d 12h later');
  });

  describe('Time Span', () => {
    testParse('span of 1 months', 'SPAN OF 1 months');
    testParse('span of 2 days', 'SPAN OF 2 days');
    testParse('span of 3 hours', 'SPAN OF 3 hours');
    testParse('span of 4 minutes', 'SPAN OF 4 minutes');
    testParse('span of 5 seconds', 'SPAN OF 5 seconds');
    testParse('span of 1 months, 2 days, 3 hours, 4 minutes, 5 seconds', 'SPAN OF 1 months 2 days 3 hours 4 minutes 5 seconds');
    testParse('span of 1 months, 2 days', 'SPAN OF 1 months 2 days');
  });
});

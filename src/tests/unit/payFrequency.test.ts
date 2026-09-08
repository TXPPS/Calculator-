import { describe, expect, it } from 'vitest';
import {
  calculateWeeklyDatesInMonth,
  calculateBiweeklyDatesInMonth,
  calculateSemiMonthlyDatesInMonth,
  calculateMonthlyDatesInMonth,
  calculateScheduleForMonth,
  daysInMonth,
  formatPayDateShort,
  PaycheckSchedule,
} from '../../domain/income/payFrequency';

describe('daysInMonth', () => {
  it('handles leap years correctly', () => {
    expect(daysInMonth(2024, 2)).toBe(29); // 2024 is a leap year
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29); // divisible by 400
    expect(daysInMonth(1900, 2)).toBe(28); // divisible by 100, not 400
  });

  it('handles standard month lengths', () => {
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe('weekly schedule', () => {
  it('produces a 4-check month for a typical 30/31-day month', () => {
    // Anchor Sept 4 2026 (Friday), weekly -> Sep 4, 11, 18, 25 = 4 checks
    const dates = calculateWeeklyDatesInMonth('2026-09-04', '2026-09');
    expect(dates).toEqual(['2026-09-04', '2026-09-11', '2026-09-18', '2026-09-25']);
  });

  it('produces a 5-check month when the anchor aligns for a 5th week', () => {
    // Anchor Jan 1 2027 (Friday) weekly -> Jan 1, 8, 15, 22, 29 = 5 checks in a 31-day month
    const dates = calculateWeeklyDatesInMonth('2027-01-01', '2027-01');
    expect(dates).toEqual(['2027-01-01', '2027-01-08', '2027-01-15', '2027-01-22', '2027-01-29']);
  });

  it('calculates correctly for a month far from the anchor, forward and backward', () => {
    const forward = calculateWeeklyDatesInMonth('2020-01-03', '2026-09');
    const backward = calculateWeeklyDatesInMonth('2030-01-04', '2026-09');
    expect(forward.length).toBeGreaterThan(0);
    expect(backward.length).toBeGreaterThan(0);
    // Both anchors are on the same weekday cadence as 2026-09-04, so results should match.
    expect(forward).toEqual(calculateWeeklyDatesInMonth('2026-09-04', '2026-09'));
    expect(backward).toEqual(forward);
  });
});

describe('biweekly schedule', () => {
  it('produces the standard 2-check month', () => {
    const dates = calculateBiweeklyDatesInMonth('2026-09-04', '2026-09');
    expect(dates).toEqual(['2026-09-04', '2026-09-18']);
  });

  it('produces a 3-check month when the cadence lines up', () => {
    // Anchor Jan 1 2027, biweekly -> Jan 1, 15, 29 = 3 checks
    const dates = calculateBiweeklyDatesInMonth('2027-01-01', '2027-01');
    expect(dates).toEqual(['2027-01-01', '2027-01-15', '2027-01-29']);
  });

  it('calculates correctly across a year boundary', () => {
    const dates = calculateBiweeklyDatesInMonth('2026-12-18', '2027-01');
    // Dec 18, Jan 1, Jan 15, Jan 29 — within Jan: 1, 15, 29
    expect(dates).toEqual(['2027-01-01', '2027-01-15', '2027-01-29']);
  });
});

describe('semi-monthly schedule', () => {
  it('supports 1st and 15th', () => {
    const dates = calculateSemiMonthlyDatesInMonth({ first: 1, second: 15 }, '2026-09');
    expect(dates).toEqual(['2026-09-01', '2026-09-15']);
  });

  it('supports 15th and Last Day', () => {
    const dates = calculateSemiMonthlyDatesInMonth({ first: 15, second: 'last' }, '2026-09');
    expect(dates).toEqual(['2026-09-15', '2026-09-30']);
  });

  it('supports a custom pair like 5th and 20th', () => {
    const dates = calculateSemiMonthlyDatesInMonth({ first: 5, second: 20 }, '2026-09');
    expect(dates).toEqual(['2026-09-05', '2026-09-20']);
  });

  it('resolves Last Day correctly in February, including leap years', () => {
    expect(calculateSemiMonthlyDatesInMonth({ first: 1, second: 'last' }, '2026-02')).toEqual([
      '2026-02-01',
      '2026-02-28',
    ]);
    expect(calculateSemiMonthlyDatesInMonth({ first: 1, second: 'last' }, '2024-02')).toEqual([
      '2024-02-01',
      '2024-02-29',
    ]);
  });

  it('deduplicates when both positions resolve to the same day', () => {
    // "Last day" in a 30-day month vs. day 30 configured directly.
    const dates = calculateSemiMonthlyDatesInMonth({ first: 30, second: 'last' }, '2026-09');
    expect(dates).toEqual(['2026-09-30']);
  });
});

describe('monthly schedule', () => {
  it('produces exactly one occurrence', () => {
    const dates = calculateMonthlyDatesInMonth(15, '2026-09');
    expect(dates).toEqual(['2026-09-15']);
  });

  it('clamps a day beyond the month length (e.g. 31st in February)', () => {
    expect(calculateMonthlyDatesInMonth(31, '2026-02')).toEqual(['2026-02-28']);
    expect(calculateMonthlyDatesInMonth('last', '2026-02')).toEqual(['2026-02-28']);
  });
});

describe('calculateScheduleForMonth', () => {
  const biweekly: PaycheckSchedule = {
    frequency: 'biweekly',
    perPaycheckCents: 190000,
    anchorDate: '2026-09-04',
    semiMonthly: null,
    monthlyDay: null,
  };

  it('computes occurrences and total for a standard 2-check month', () => {
    const result = calculateScheduleForMonth(biweekly, '2026-09');
    expect(result.occurrences).toBe(2);
    expect(result.calculatedAmountCents).toBe(380000);
  });

  it('computes a 3-check month correctly, not an average', () => {
    // Biweekly from Sep 4 2026: Oct 2, 16, 30 -> 3 checks in October
    const result = calculateScheduleForMonth(biweekly, '2026-10');
    expect(result.occurrences).toBe(3);
    expect(result.calculatedAmountCents).toBe(570000);
    // Explicitly not the naive average (190000 * 26 / 12 ≈ 411,667).
    expect(result.calculatedAmountCents).not.toBe(Math.round((190000 * 26) / 12));
  });

  it('returns zero occurrences when the anchor is missing', () => {
    const incomplete: PaycheckSchedule = { ...biweekly, anchorDate: null };
    const result = calculateScheduleForMonth(incomplete, '2026-09');
    expect(result.occurrences).toBe(0);
    expect(result.calculatedAmountCents).toBe(0);
    expect(result.payDates).toEqual([]);
  });

  it('computes a manual one-time-style custom schedule via monthly frequency', () => {
    const monthly: PaycheckSchedule = {
      frequency: 'monthly',
      perPaycheckCents: 500000,
      anchorDate: null,
      semiMonthly: null,
      monthlyDay: 1,
    };
    const result = calculateScheduleForMonth(monthly, '2026-11');
    expect(result.occurrences).toBe(1);
    expect(result.calculatedAmountCents).toBe(500000);
  });
});

describe('formatPayDateShort', () => {
  it('formats without a timezone-induced off-by-one', () => {
    expect(formatPayDateShort('2026-09-04')).toBe('Sep 4');
    expect(formatPayDateShort('2026-01-01')).toBe('Jan 1');
    expect(formatPayDateShort('2026-12-31')).toBe('Dec 31');
  });
});

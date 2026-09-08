import { Cents } from '../money/money';
import { MonthKey } from '../monthly-plan/types';

/**
 * All date math here works exclusively in explicit UTC year/month/day
 * integers via Date.UTC / getUTC* accessors. Never construct a plain
 * `new Date(isoString)` or read local getters — both are sensitive to the
 * runtime's local timezone and can shift a calendar date by a day near
 * midnight. A payday is a calendar date, not an instant in time.
 */

export type PayFrequency = 'weekly' | 'biweekly' | 'semiMonthly' | 'monthly';

/** A day-of-month position: a specific day, or the last valid day of the month. */
export type MonthDayPosition = number | 'last';

export interface SemiMonthlySchedule {
  first: MonthDayPosition;
  second: MonthDayPosition;
}

export interface PaycheckSchedule {
  frequency: PayFrequency;
  perPaycheckCents: Cents;
  /** ISO "YYYY-MM-DD" anchor payday, used for weekly/biweekly schedules. */
  anchorDate: string | null;
  /** Used for semiMonthly schedules. */
  semiMonthly: SemiMonthlySchedule | null;
  /** Used for monthly schedules. */
  monthlyDay: MonthDayPosition | null;
}

const MS_PER_DAY = 86_400_000;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Parses "YYYY-MM-DD" into UTC epoch milliseconds at midnight UTC. */
export function isoDateToUtcMs(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y!, (m ?? 1) - 1, d ?? 1);
}

export function utcMsToIsoDate(ms: number): string {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export function monthKeyToUtcRange(monthKey: MonthKey): { startMs: number; endMs: number } {
  const [y, m] = monthKey.split('-').map(Number);
  const startMs = Date.UTC(y!, (m ?? 1) - 1, 1);
  const endMs = Date.UTC(y!, m ?? 1, 0); // day 0 of next month = last day of this month
  return { startMs, endMs };
}

/** Number of calendar days in a given year/month (1-12), leap-year safe. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function resolveDayPosition(position: MonthDayPosition, year: number, month: number): number {
  const dim = daysInMonth(year, month);
  if (position === 'last') return dim;
  return Math.min(Math.max(1, Math.trunc(position)), dim);
}

/**
 * Every date congruent to `anchorIso` modulo `stepDays` that falls within
 * the given month. Works for an anchor before, inside, or after the target
 * month, and for arbitrarily large gaps, using integer division rather
 * than iterating day-by-day from the anchor.
 */
export function calculateRecurringDatesInMonth(
  anchorIso: string,
  stepDays: number,
  monthKey: MonthKey
): string[] {
  const anchorMs = isoDateToUtcMs(anchorIso);
  const { startMs, endMs } = monthKeyToUtcRange(monthKey);
  const stepMs = stepDays * MS_PER_DAY;

  const stepsFromAnchor = Math.floor((startMs - anchorMs) / stepMs);
  let candidateMs = anchorMs + stepsFromAnchor * stepMs;
  while (candidateMs < startMs) candidateMs += stepMs;

  const dates: string[] = [];
  for (let ms = candidateMs; ms <= endMs; ms += stepMs) {
    dates.push(utcMsToIsoDate(ms));
  }
  return dates;
}

export function calculateWeeklyDatesInMonth(anchorIso: string, monthKey: MonthKey): string[] {
  return calculateRecurringDatesInMonth(anchorIso, 7, monthKey);
}

export function calculateBiweeklyDatesInMonth(anchorIso: string, monthKey: MonthKey): string[] {
  return calculateRecurringDatesInMonth(anchorIso, 14, monthKey);
}

export function calculateSemiMonthlyDatesInMonth(
  schedule: SemiMonthlySchedule,
  monthKey: MonthKey
): string[] {
  const [y, m] = monthKey.split('-').map(Number);
  const day1 = resolveDayPosition(schedule.first, y!, m!);
  const day2 = resolveDayPosition(schedule.second, y!, m!);
  const uniqueDays = Array.from(new Set([day1, day2])).sort((a, b) => a - b);
  return uniqueDays.map((d) => `${y}-${pad2(m!)}-${pad2(d)}`);
}

export function calculateMonthlyDatesInMonth(
  day: MonthDayPosition,
  monthKey: MonthKey
): string[] {
  const [y, m] = monthKey.split('-').map(Number);
  const resolved = resolveDayPosition(day, y!, m!);
  return [`${y}-${pad2(m!)}-${pad2(resolved)}`];
}

export interface ScheduleCalculation {
  payDates: string[];
  occurrences: number;
  calculatedAmountCents: Cents;
}

/**
 * Computes the actual expected pay dates and total for a paycheck schedule
 * within one specific calendar month — never an average like paycheck×26/12.
 * A weekly/biweekly schedule missing its anchor, or a semi-monthly schedule
 * missing its day pair, produces zero occurrences rather than guessing.
 */
export function calculateScheduleForMonth(
  schedule: PaycheckSchedule,
  monthKey: MonthKey
): ScheduleCalculation {
  let payDates: string[];
  switch (schedule.frequency) {
    case 'weekly':
      payDates = schedule.anchorDate ? calculateWeeklyDatesInMonth(schedule.anchorDate, monthKey) : [];
      break;
    case 'biweekly':
      payDates = schedule.anchorDate ? calculateBiweeklyDatesInMonth(schedule.anchorDate, monthKey) : [];
      break;
    case 'semiMonthly':
      payDates = schedule.semiMonthly
        ? calculateSemiMonthlyDatesInMonth(schedule.semiMonthly, monthKey)
        : [];
      break;
    case 'monthly':
      payDates = schedule.monthlyDay != null ? calculateMonthlyDatesInMonth(schedule.monthlyDay, monthKey) : [];
      break;
  }
  const occurrences = payDates.length;
  return {
    payDates,
    occurrences,
    calculatedAmountCents: occurrences * schedule.perPaycheckCents,
  };
}

/** Formats an ISO "YYYY-MM-DD" date as e.g. "Sep 4" for compact display. */
export function formatPayDateShort(iso: string): string {
  const ms = isoDateToUtcMs(iso);
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function defaultPaycheckSchedule(frequency: PayFrequency): PaycheckSchedule {
  return {
    frequency,
    perPaycheckCents: 0,
    anchorDate: frequency === 'weekly' || frequency === 'biweekly' ? null : null,
    semiMonthly: frequency === 'semiMonthly' ? { first: 1, second: 15 } : null,
    monthlyDay: frequency === 'monthly' ? 1 : null,
  };
}

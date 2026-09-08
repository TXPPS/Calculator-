import { MonthKey } from '../monthly-plan/types';
import { calculateScheduleForMonth, PaycheckSchedule } from './payFrequency';
import { IncomeEntry, IncomeType } from './types';

/**
 * Normalizes an income entry read from storage so every consumer can rely
 * on the full current shape, whether the record was written by this
 * version of the app or is a pre-upgrade legacy record missing the newer
 * fields entirely (IndexedDB stores whatever shape was last saved — there
 * is no per-record schema enforcement). A legacy record's `amountCents`
 * is preserved exactly as-is and never reinterpreted as a per-paycheck
 * amount: it becomes an `irregular` "expected amount this month" entry,
 * which is financially identical to how the old single-type income model
 * behaved.
 */
export function normalizeIncomeEntry(raw: Partial<IncomeEntry> & { id: string; monthId: string }): IncomeEntry {
  const incomeType: IncomeType = raw.incomeType ?? 'irregular';
  return {
    id: raw.id,
    monthId: raw.monthId,
    description: raw.description ?? '',
    person: raw.person ?? 'person1',
    incomeType,
    amountCents: raw.amountCents ?? 0,
    paycheck: incomeType === 'paycheck' ? raw.paycheck ?? null : null,
    isManualOverride: raw.isManualOverride ?? false,
    calculatedAmountCents: raw.calculatedAmountCents ?? null,
    expectedOccurrences: raw.expectedOccurrences ?? null,
    payDates: raw.payDates ?? [],
    recurring: raw.recurring ?? true,
    notes: raw.notes ?? '',
    templateId: raw.templateId ?? null,
  };
}

export interface IncomeEntryComputation {
  amountCents: number;
  calculatedAmountCents: number | null;
  expectedOccurrences: number | null;
  payDates: string[];
}

/**
 * Computes the fields that feed calculatePlanSummary and the Income UI for
 * one entry within a specific month. For a paycheck entry, `amountCents`
 * is the schedule-calculated total unless `isManualOverride` is set, in
 * which case the caller's overridden occurrences/amount pass through
 * untouched. Every other income type is a pass-through of its own stored
 * amount (no schedule to compute).
 */
export function computeIncomeEntryForMonth(
  entry: Pick<IncomeEntry, 'incomeType' | 'paycheck' | 'isManualOverride' | 'amountCents' | 'expectedOccurrences'>,
  monthKey: MonthKey
): IncomeEntryComputation {
  if (entry.incomeType !== 'paycheck' || !entry.paycheck) {
    return {
      amountCents: entry.amountCents,
      calculatedAmountCents: null,
      expectedOccurrences: null,
      payDates: [],
    };
  }

  const calc = calculateScheduleForMonth(entry.paycheck, monthKey);
  if (entry.isManualOverride) {
    return {
      amountCents: entry.amountCents,
      calculatedAmountCents: calc.calculatedAmountCents,
      expectedOccurrences: entry.expectedOccurrences ?? calc.occurrences,
      payDates: calc.payDates,
    };
  }
  return {
    amountCents: calc.calculatedAmountCents,
    calculatedAmountCents: calc.calculatedAmountCents,
    expectedOccurrences: calc.occurrences,
    payDates: calc.payDates,
  };
}

/** Convenience: builds a full recalculated entry for a given month (used by month-copy). */
export function recalculateEntryForMonth(
  entry: IncomeEntry,
  monthKey: MonthKey,
  opts: { keepOverride: boolean }
): Pick<IncomeEntry, 'amountCents' | 'calculatedAmountCents' | 'expectedOccurrences' | 'payDates' | 'isManualOverride'> {
  const isManualOverride = opts.keepOverride && entry.isManualOverride;
  const computation = computeIncomeEntryForMonth({ ...entry, isManualOverride }, monthKey);
  return { ...computation, isManualOverride };
}

export function paycheckScheduleIsComplete(schedule: PaycheckSchedule): boolean {
  switch (schedule.frequency) {
    case 'weekly':
    case 'biweekly':
      return schedule.anchorDate !== null;
    case 'semiMonthly':
      return schedule.semiMonthly !== null;
    case 'monthly':
      return schedule.monthlyDay !== null;
  }
}

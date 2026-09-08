import { describe, expect, it } from 'vitest';
import { normalizeIncomeEntry, computeIncomeEntryForMonth, recalculateEntryForMonth, paycheckScheduleIsComplete } from '../../domain/income/incomeCalculations';
import { PaycheckSchedule } from '../../domain/income/payFrequency';
import { IncomeEntry } from '../../domain/income/types';

const biweekly: PaycheckSchedule = {
  frequency: 'biweekly',
  perPaycheckCents: 190000,
  anchorDate: '2026-09-04',
  semiMonthly: null,
  monthlyDay: null,
};

function fullEntry(overrides: Partial<IncomeEntry> = {}): IncomeEntry {
  return {
    id: 'e1',
    monthId: 'm1',
    description: 'Main Job',
    person: 'person1',
    incomeType: 'paycheck',
    amountCents: 0,
    paycheck: biweekly,
    isManualOverride: false,
    calculatedAmountCents: null,
    expectedOccurrences: null,
    payDates: [],
    recurring: true,
    notes: '',
    templateId: null,
    ...overrides,
  };
}

describe('normalizeIncomeEntry (migration)', () => {
  it('preserves a legacy pre-upgrade record\'s amount exactly, as irregular income', () => {
    const legacy = {
      id: 'legacy-1',
      monthId: 'm1',
      description: 'Expected monthly income',
      person: 'person1' as const,
      amountCents: 380000,
      recurring: true,
      notes: '',
      templateId: null,
      // No incomeType, paycheck, isManualOverride, calculatedAmountCents, expectedOccurrences, payDates.
    };
    const normalized = normalizeIncomeEntry(legacy);
    expect(normalized.incomeType).toBe('irregular');
    expect(normalized.amountCents).toBe(380000);
    expect(normalized.paycheck).toBeNull();
    expect(normalized.isManualOverride).toBe(false);
    // Critically: never reinterpreted as a per-paycheck amount.
    expect(normalized.amountCents).not.toBe(380000 / 2);
  });

  it('fills in defaults for every missing field without altering provided ones', () => {
    const partial = { id: 'x', monthId: 'm1', description: 'Freelance', person: 'person2' as const, amountCents: 5000 };
    const normalized = normalizeIncomeEntry(partial);
    expect(normalized.description).toBe('Freelance');
    expect(normalized.person).toBe('person2');
    expect(normalized.amountCents).toBe(5000);
    expect(normalized.recurring).toBe(true);
    expect(normalized.payDates).toEqual([]);
  });

  it('is idempotent — normalizing an already-normalized entry changes nothing', () => {
    const entry = fullEntry({ amountCents: 380000, calculatedAmountCents: 380000, expectedOccurrences: 2, payDates: ['2026-09-04', '2026-09-18'] });
    expect(normalizeIncomeEntry(entry)).toEqual(entry);
  });
});

describe('computeIncomeEntryForMonth', () => {
  it('uses the calculated total when not overridden', () => {
    const result = computeIncomeEntryForMonth(fullEntry(), '2026-09');
    expect(result.amountCents).toBe(380000);
    expect(result.expectedOccurrences).toBe(2);
    expect(result.payDates).toEqual(['2026-09-04', '2026-09-18']);
  });

  it('uses the manual override amount and occurrences when overridden', () => {
    const entry = fullEntry({ isManualOverride: true, amountCents: 570000, expectedOccurrences: 3 });
    const result = computeIncomeEntryForMonth(entry, '2026-09');
    expect(result.amountCents).toBe(570000);
    expect(result.expectedOccurrences).toBe(3);
    // calculatedAmountCents still reflects what the schedule would have produced, for comparison in the UI.
    expect(result.calculatedAmountCents).toBe(380000);
  });

  it('returning to automatic recalculates from the schedule again', () => {
    const overridden = fullEntry({ isManualOverride: true, amountCents: 999999, expectedOccurrences: 9 });
    const backToAuto = { ...overridden, isManualOverride: false };
    const result = computeIncomeEntryForMonth(backToAuto, '2026-09');
    expect(result.amountCents).toBe(380000);
    expect(result.expectedOccurrences).toBe(2);
  });

  it('is a pass-through for non-paycheck income types', () => {
    const irregular = fullEntry({ incomeType: 'irregular', paycheck: null, amountCents: 45000 });
    const result = computeIncomeEntryForMonth(irregular, '2026-09');
    expect(result.amountCents).toBe(45000);
    expect(result.calculatedAmountCents).toBeNull();
    expect(result.expectedOccurrences).toBeNull();
  });
});

describe('recalculateEntryForMonth (month copy)', () => {
  it('recalculates occurrences for the destination month, not the source total', () => {
    // September had 2 checks; copying into October (3-check month) must produce 3.
    const septEntry = fullEntry({ amountCents: 380000, calculatedAmountCents: 380000, expectedOccurrences: 2, payDates: ['2026-09-04', '2026-09-18'] });
    const recalculated = recalculateEntryForMonth(septEntry, '2026-10', { keepOverride: false });
    expect(recalculated.expectedOccurrences).toBe(3);
    expect(recalculated.amountCents).toBe(570000);
  });

  it('does not carry a manual override into the copied month by default', () => {
    const overridden = fullEntry({ isManualOverride: true, amountCents: 999999, expectedOccurrences: 9 });
    const recalculated = recalculateEntryForMonth(overridden, '2026-10', { keepOverride: false });
    expect(recalculated.isManualOverride).toBe(false);
    expect(recalculated.amountCents).toBe(570000); // October's real 3-check total
  });
});

describe('paycheckScheduleIsComplete', () => {
  it('requires an anchor for weekly/biweekly', () => {
    expect(paycheckScheduleIsComplete(biweekly)).toBe(true);
    expect(paycheckScheduleIsComplete({ ...biweekly, anchorDate: null })).toBe(false);
  });

  it('requires a semiMonthly config for semiMonthly frequency', () => {
    const sched: PaycheckSchedule = { frequency: 'semiMonthly', perPaycheckCents: 100000, anchorDate: null, semiMonthly: { first: 1, second: 15 }, monthlyDay: null };
    expect(paycheckScheduleIsComplete(sched)).toBe(true);
    expect(paycheckScheduleIsComplete({ ...sched, semiMonthly: null })).toBe(false);
  });

  it('requires a monthlyDay for monthly frequency', () => {
    const sched: PaycheckSchedule = { frequency: 'monthly', perPaycheckCents: 500000, anchorDate: null, semiMonthly: null, monthlyDay: 1 };
    expect(paycheckScheduleIsComplete(sched)).toBe(true);
    expect(paycheckScheduleIsComplete({ ...sched, monthlyDay: null })).toBe(false);
  });
});

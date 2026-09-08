import { describe, expect, it } from 'vitest';
import {
  calculatePlanSummary,
  isHouseholdOverallocated,
  isPersonOverallocated,
} from '../../domain/calculations/planCalculations';
import { IncomeEntry } from '../../domain/income/types';
import { ExpenseEntry } from '../../domain/expenses/types';

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `id-${idCounter}`;
}

function income(person: 'person1' | 'person2', amountCents: number): IncomeEntry {
  return {
    id: nextId(),
    monthId: 'month-1',
    description: 'Income',
    person,
    incomeType: 'irregular',
    amountCents,
    paycheck: null,
    isManualOverride: false,
    calculatedAmountCents: null,
    expectedOccurrences: null,
    payDates: [],
    recurring: true,
    notes: '',
    templateId: null,
  };
}

function expense(partial: Partial<ExpenseEntry> & { amountCents: number }): ExpenseEntry {
  return {
    id: nextId(),
    monthId: 'month-1',
    section: 'bill',
    name: 'Entry',
    categoryId: null,
    owner: 'person1',
    split: { method: 'even' },
    recurring: true,
    dueDay: null,
    notes: '',
    templateId: null,
    ...partial,
  };
}

describe('calculatePlanSummary', () => {
  it('handles a person1-only bill', () => {
    const summary = calculatePlanSummary(
      [income('person1', 400000), income('person2', 300000)],
      [expense({ amountCents: 100000, owner: 'person1' })]
    );
    expect(summary.bills.person1Cents).toBe(100000);
    expect(summary.bills.person2Cents).toBe(0);
    expect(summary.bills.householdCents).toBe(100000);
  });

  it('handles a person2-only bill', () => {
    const summary = calculatePlanSummary(
      [income('person1', 400000), income('person2', 300000)],
      [expense({ amountCents: 50000, owner: 'person2' })]
    );
    expect(summary.bills.person2Cents).toBe(50000);
    expect(summary.bills.person1Cents).toBe(0);
  });

  it('splits a shared bill 50/50 without double counting', () => {
    const summary = calculatePlanSummary(
      [income('person1', 400000), income('person2', 300000)],
      [expense({ amountCents: 200000, owner: 'both', split: { method: 'even' } })]
    );
    expect(summary.bills.person1Cents).toBe(100000);
    expect(summary.bills.person2Cents).toBe(100000);
    expect(summary.bills.householdCents).toBe(200000);
  });

  it('splits a shared bill 60/40', () => {
    const summary = calculatePlanSummary(
      [],
      [expense({ amountCents: 200000, owner: 'both', split: { method: 'percentage', person1Percent: 60 } })]
    );
    expect(summary.bills.person1Cents).toBe(120000);
    expect(summary.bills.person2Cents).toBe(80000);
    expect(summary.bills.householdCents).toBe(200000);
  });

  it('splits a shared bill 65/35', () => {
    const summary = calculatePlanSummary(
      [],
      [expense({ amountCents: 100000, owner: 'both', split: { method: 'percentage', person1Percent: 65 } })]
    );
    expect(summary.bills.person1Cents).toBe(65000);
    expect(summary.bills.person2Cents).toBe(35000);
  });

  it('handles an exact-dollar split', () => {
    const summary = calculatePlanSummary(
      [],
      [expense({ amountCents: 100000, owner: 'both', split: { method: 'exact', person1Cents: 65000 } })]
    );
    expect(summary.bills.person1Cents).toBe(65000);
    expect(summary.bills.person2Cents).toBe(35000);
  });

  it('handles a proportional-income split', () => {
    const summary = calculatePlanSummary(
      [income('person1', 600000), income('person2', 400000)],
      [expense({ amountCents: 200000, owner: 'both', split: { method: 'incomeProportional' } })]
    );
    expect(summary.bills.person1Cents).toBe(120000);
    expect(summary.bills.person2Cents).toBe(80000);
  });

  it('reconciles an odd-cent shared split exactly to the total', () => {
    const summary = calculatePlanSummary(
      [],
      [expense({ amountCents: 10001, owner: 'both', split: { method: 'even' } })]
    );
    expect(summary.bills.person1Cents + summary.bills.person2Cents).toBe(10001);
  });

  it('handles zero income for person1', () => {
    const summary = calculatePlanSummary(
      [income('person2', 500000)],
      [expense({ amountCents: 100000, owner: 'both', split: { method: 'incomeProportional' } })]
    );
    expect(summary.bills.person1Cents).toBe(0);
    expect(summary.bills.person2Cents).toBe(100000);
  });

  it('handles zero income for person2', () => {
    const summary = calculatePlanSummary(
      [income('person1', 500000)],
      [expense({ amountCents: 100000, owner: 'both', split: { method: 'incomeProportional' } })]
    );
    expect(summary.bills.person2Cents).toBe(0);
    expect(summary.bills.person1Cents).toBe(100000);
  });

  it('surfaces an error for zero total combined income on a proportional split', () => {
    const summary = calculatePlanSummary(
      [],
      [expense({ amountCents: 100000, owner: 'both', split: { method: 'incomeProportional' } })]
    );
    expect(summary.splitErrors.length).toBe(1);
    expect(summary.bills.person1Cents).toBe(0);
    expect(summary.bills.person2Cents).toBe(0);
  });

  it('sums multiple income sources per person', () => {
    const summary = calculatePlanSummary(
      [income('person1', 200000), income('person1', 150000), income('person2', 300000)],
      []
    );
    expect(summary.income.person1Cents).toBe(350000);
    expect(summary.income.person2Cents).toBe(300000);
    expect(summary.income.householdCents).toBe(650000);
  });

  it('handles a mix of personal and shared bills without cross-contamination', () => {
    const summary = calculatePlanSummary(
      [income('person1', 400000), income('person2', 400000)],
      [
        expense({ amountCents: 50000, owner: 'person1', name: 'Car payment' }),
        expense({ amountCents: 30000, owner: 'person2', name: 'Phone' }),
        expense({ amountCents: 200000, owner: 'both', split: { method: 'even' }, name: 'Mortgage' }),
      ]
    );
    expect(summary.bills.person1Cents).toBe(50000 + 100000);
    expect(summary.bills.person2Cents).toBe(30000 + 100000);
    expect(summary.bills.householdCents).toBe(50000 + 30000 + 200000);
  });

  it('includes planned spending, family fun, and savings in totals', () => {
    const summary = calculatePlanSummary(
      [income('person1', 500000), income('person2', 500000)],
      [
        expense({ amountCents: 40000, owner: 'person1', section: 'planned' }),
        expense({ amountCents: 40000, owner: 'both', split: { method: 'even' }, section: 'familyFun' }),
        expense({ amountCents: 20000, owner: 'person2', section: 'savings' }),
      ]
    );
    expect(summary.planned.householdCents).toBe(40000);
    expect(summary.familyFun.householdCents).toBe(40000);
    expect(summary.savings.householdCents).toBe(20000);
    expect(summary.totalAllocated.householdCents).toBe(40000 + 40000 + 20000);
  });

  it('flags a household shortfall as a visible negative remaining amount, never clamped', () => {
    const summary = calculatePlanSummary(
      [income('person1', 200000), income('person2', 200000)],
      [expense({ amountCents: 500000, owner: 'both', split: { method: 'even' } })]
    );
    expect(summary.remaining.householdCents).toBe(-100000);
    expect(isHouseholdOverallocated(summary)).toBe(true);
  });

  it('flags a per-person shortfall without clamping to zero', () => {
    const summary = calculatePlanSummary(
      [income('person1', 100000), income('person2', 400000)],
      [expense({ amountCents: 150000, owner: 'person1' })]
    );
    expect(summary.remaining.person1Cents).toBe(-50000);
    expect(isPersonOverallocated(summary, 'person1')).toBe(true);
    expect(isPersonOverallocated(summary, 'person2')).toBe(false);
  });

  it('produces zero remaining when income exactly matches allocation', () => {
    const summary = calculatePlanSummary(
      [income('person1', 100000)],
      [expense({ amountCents: 100000, owner: 'person1' })]
    );
    expect(summary.remaining.person1Cents).toBe(0);
  });

  it('produces a positive remaining when under-allocated', () => {
    const summary = calculatePlanSummary(
      [income('person1', 100000)],
      [expense({ amountCents: 40000, owner: 'person1' })]
    );
    expect(summary.remaining.person1Cents).toBe(60000);
  });

  it('handles very large household values', () => {
    const summary = calculatePlanSummary(
      [income('person1', 10_000_000_00), income('person2', 10_000_000_00)],
      [expense({ amountCents: 5_000_000_00, owner: 'both', split: { method: 'even' } })]
    );
    expect(summary.remaining.householdCents).toBe(15_000_000_00);
  });

  it('never displays negative zero for a fully balanced plan', () => {
    const summary = calculatePlanSummary(
      [income('person1', 0), income('person2', 0)],
      []
    );
    expect(Object.is(summary.remaining.householdCents, -0)).toBe(false);
  });

  it('guarantees household total allocation equals sum of both persons across every section', () => {
    const summary = calculatePlanSummary(
      [income('person1', 700000), income('person2', 300000)],
      [
        expense({ amountCents: 123456, owner: 'both', split: { method: 'incomeProportional' }, section: 'bill' }),
        expense({ amountCents: 54321, owner: 'both', split: { method: 'percentage', person1Percent: 33 }, section: 'planned' }),
        expense({ amountCents: 99999, owner: 'both', split: { method: 'exact', person1Cents: 40000 }, section: 'familyFun' }),
        expense({ amountCents: 10000, owner: 'person1', section: 'savings' }),
      ]
    );
    expect(summary.totalAllocated.person1Cents + summary.totalAllocated.person2Cents).toBe(
      summary.totalAllocated.householdCents
    );
    expect(summary.remaining.person1Cents + summary.remaining.person2Cents).toBe(
      summary.remaining.householdCents
    );
  });
});

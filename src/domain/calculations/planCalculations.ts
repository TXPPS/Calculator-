import { addCents, Cents, subtractCents } from '../money/money';
import { calculateSplit, SplitContext } from '../splits/calculateSplit';
import { ExpenseEntry, ExpenseSection } from '../expenses/types';
import { IncomeEntry } from '../income/types';
import { PersonId } from '../splits/types';

export interface PersonAmounts {
  person1Cents: Cents;
  person2Cents: Cents;
  householdCents: Cents;
}

export interface ExpenseLineCalculated {
  entry: ExpenseEntry;
  person1Cents: Cents;
  person2Cents: Cents;
  splitError?: string;
}

export interface SectionSummary extends PersonAmounts {
  lines: ExpenseLineCalculated[];
}

export interface PlanSummary {
  income: PersonAmounts;
  bills: SectionSummary;
  planned: SectionSummary;
  familyFun: SectionSummary;
  savings: SectionSummary;
  totalAllocated: PersonAmounts;
  remaining: PersonAmounts;
  splitErrors: ExpenseLineCalculated[];
  incomeSharePercent: { person1: number; person2: number };
  allocationSharePercent: { person1: number; person2: number };
}

function sumIncomeByPerson(incomeEntries: IncomeEntry[]): PersonAmounts {
  let person1Cents = 0;
  let person2Cents = 0;
  for (const entry of incomeEntries) {
    if (entry.person === 'person1') person1Cents += entry.amountCents;
    else person2Cents += entry.amountCents;
  }
  return { person1Cents, person2Cents, householdCents: addCents(person1Cents, person2Cents) };
}

function calculateSection(
  entries: ExpenseEntry[],
  section: ExpenseSection,
  splitCtx: SplitContext
): SectionSummary {
  const lines: ExpenseLineCalculated[] = entries
    .filter((e) => e.section === section)
    .map((entry) => {
      if (entry.owner === 'person1') {
        return { entry, person1Cents: entry.amountCents, person2Cents: 0 };
      }
      if (entry.owner === 'person2') {
        return { entry, person1Cents: 0, person2Cents: entry.amountCents };
      }
      const result = calculateSplit(entry.amountCents, entry.split, splitCtx);
      return {
        entry,
        person1Cents: result.person1Cents,
        person2Cents: result.person2Cents,
        splitError: result.error,
      };
    });

  const person1Cents = addCents(...lines.map((l) => l.person1Cents));
  const person2Cents = addCents(...lines.map((l) => l.person2Cents));
  return {
    lines,
    person1Cents,
    person2Cents,
    householdCents: addCents(person1Cents, person2Cents),
  };
}

function percentOf(part: Cents, whole: Cents): number {
  if (whole <= 0) return 0;
  return (part / whole) * 100;
}

/**
 * Computes the complete monthly plan summary: per-person and household totals
 * for income, each expense section, overall allocation, and remaining money.
 * This is the single entry point every screen (Dashboard, Plan Check,
 * Breakdown, print view) should use so figures never drift between views.
 */
export function calculatePlanSummary(
  incomeEntries: IncomeEntry[],
  expenseEntries: ExpenseEntry[]
): PlanSummary {
  const income = sumIncomeByPerson(incomeEntries);
  const splitCtx: SplitContext = {
    person1IncomeCents: income.person1Cents,
    person2IncomeCents: income.person2Cents,
  };

  const bills = calculateSection(expenseEntries, 'bill', splitCtx);
  const planned = calculateSection(expenseEntries, 'planned', splitCtx);
  const familyFun = calculateSection(expenseEntries, 'familyFun', splitCtx);
  const savings = calculateSection(expenseEntries, 'savings', splitCtx);

  const person1Allocated = addCents(
    bills.person1Cents,
    planned.person1Cents,
    familyFun.person1Cents,
    savings.person1Cents
  );
  const person2Allocated = addCents(
    bills.person2Cents,
    planned.person2Cents,
    familyFun.person2Cents,
    savings.person2Cents
  );
  const totalAllocated: PersonAmounts = {
    person1Cents: person1Allocated,
    person2Cents: person2Allocated,
    householdCents: addCents(person1Allocated, person2Allocated),
  };

  const remaining: PersonAmounts = {
    person1Cents: subtractCents(income.person1Cents, person1Allocated),
    person2Cents: subtractCents(income.person2Cents, person2Allocated),
    householdCents: subtractCents(income.householdCents, totalAllocated.householdCents),
  };

  const allLines = [...bills.lines, ...planned.lines, ...familyFun.lines, ...savings.lines];
  const splitErrors = allLines.filter((l) => l.splitError);

  return {
    income,
    bills,
    planned,
    familyFun,
    savings,
    totalAllocated,
    remaining,
    splitErrors,
    incomeSharePercent: {
      person1: percentOf(income.person1Cents, income.householdCents),
      person2: percentOf(income.person2Cents, income.householdCents),
    },
    allocationSharePercent: {
      person1: percentOf(totalAllocated.person1Cents, totalAllocated.householdCents),
      person2: percentOf(totalAllocated.person2Cents, totalAllocated.householdCents),
    },
  };
}

export function isPersonOverallocated(summary: PlanSummary, person: PersonId): boolean {
  const remaining = person === 'person1' ? summary.remaining.person1Cents : summary.remaining.person2Cents;
  return remaining < 0;
}

export function isHouseholdOverallocated(summary: PlanSummary): boolean {
  return summary.remaining.householdCents < 0;
}

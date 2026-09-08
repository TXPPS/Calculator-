import { IncomeEntry } from '../income/types';
import { ExpenseEntry, ExpenseSection } from '../expenses/types';
import { computeSectionSignature, MonthReviewState, ReviewSectionKey } from '../monthly-plan/review';

const EXPENSE_SECTION_FOR_REVIEW: Record<Exclude<ReviewSectionKey, 'income'>, ExpenseSection> = {
  bills: 'bill',
  planned: 'planned',
  familyFun: 'familyFun',
  savings: 'savings',
};

function splitSignatureFields(entry: ExpenseEntry): { splitMethod: string; person1Percent: number | null; person1Cents: number | null } {
  switch (entry.split.method) {
    case 'even':
      return { splitMethod: 'even', person1Percent: null, person1Cents: null };
    case 'percentage':
      return { splitMethod: 'percentage', person1Percent: entry.split.person1Percent, person1Cents: null };
    case 'exact':
      return { splitMethod: 'exact', person1Percent: null, person1Cents: entry.split.person1Cents };
    case 'incomeProportional':
      return { splitMethod: 'incomeProportional', person1Percent: null, person1Cents: null };
  }
}

/**
 * Computes one signature per review section from the month's live entries.
 * Comparing a section's stored (reviewed-at-the-time) signature against its
 * current signature is how "changed since review" is detected — see
 * isSectionStale in review.ts. Only fields that would actually change the
 * numbers a person reviewed are included (amount, owner, split); cosmetic
 * fields like notes are deliberately excluded so editing a note doesn't
 * falsely invalidate a review.
 */
export function computeMonthSignatures(
  incomeEntries: IncomeEntry[],
  expenseEntries: ExpenseEntry[]
): Record<ReviewSectionKey, string> {
  const incomeSignature = computeSectionSignature(
    incomeEntries.map((e) => ({ id: e.id, person: e.person, amountCents: e.amountCents }))
  );

  const result = { income: incomeSignature } as Record<ReviewSectionKey, string>;
  for (const [reviewKey, section] of Object.entries(EXPENSE_SECTION_FOR_REVIEW) as [
    Exclude<ReviewSectionKey, 'income'>,
    ExpenseSection
  ][]) {
    const rows = expenseEntries
      .filter((e) => e.section === section)
      .map((e) => ({
        id: e.id,
        amountCents: e.amountCents,
        owner: e.owner,
        ...splitSignatureFields(e),
      }));
    result[reviewKey] = computeSectionSignature(rows);
  }
  return result;
}

export function anySectionStale(review: MonthReviewState, signatures: Record<ReviewSectionKey, string>): boolean {
  return (Object.keys(signatures) as ReviewSectionKey[]).some(
    (key) => review[key].reviewed && review[key].signature !== signatures[key]
  );
}

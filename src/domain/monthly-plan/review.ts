export type ReviewSectionKey = 'income' | 'bills' | 'planned' | 'familyFun' | 'savings';

export const REVIEW_SECTION_ORDER: ReviewSectionKey[] = [
  'income',
  'bills',
  'planned',
  'familyFun',
  'savings',
];

export interface ReviewSectionState {
  reviewed: boolean;
  reviewedAt: string | null;
  /** Deterministic signature of the section's data at the moment it was marked reviewed. */
  signature: string | null;
}

export type MonthReviewState = Record<ReviewSectionKey, ReviewSectionState>;

export function defaultReviewState(): MonthReviewState {
  const empty: ReviewSectionState = { reviewed: false, reviewedAt: null, signature: null };
  return {
    income: { ...empty },
    bills: { ...empty },
    planned: { ...empty },
    familyFun: { ...empty },
    savings: { ...empty },
  };
}

export function normalizeReviewState(raw: Partial<MonthReviewState> | undefined): MonthReviewState {
  const base = defaultReviewState();
  if (!raw) return base;
  for (const key of REVIEW_SECTION_ORDER) {
    const existing = raw[key];
    if (existing) base[key] = { ...base[key], ...existing };
  }
  return base;
}

/**
 * A deterministic, order-independent signature of a set of {id, amountCents}
 * pairs (and any other primitive fields that should invalidate a review,
 * e.g. an owner or split change). Comparing signatures — not deep-equality
 * of whole objects — is what "changed since review" checks against, so a
 * section is exactly as sensitive to real financial changes as this list.
 */
export function computeSectionSignature(rows: Array<Record<string, string | number | boolean | null>>): string {
  return rows
    .map((row) =>
      Object.keys(row)
        .sort()
        .map((k) => `${k}=${row[k]}`)
        .join(',')
    )
    .sort()
    .join('|');
}

/** True when the section's live signature no longer matches what was reviewed. */
export function isSectionStale(state: ReviewSectionState, currentSignature: string): boolean {
  return state.reviewed && state.signature !== currentSignature;
}

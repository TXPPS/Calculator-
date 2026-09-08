import { MonthReviewState, defaultReviewState, normalizeReviewState } from './review';

/** Month keys are "YYYY-MM" strings, e.g. "2026-09". */
export type MonthKey = string;

export interface MonthlyPlan {
  id: string;
  monthKey: MonthKey;
  notes: string;
  createdAt: string;
  updatedAt: string;
  /** monthKey this plan was copied from, if any. */
  copiedFromMonthKey: string | null;
  /** Monthly Review workflow state; absent on pre-upgrade records. */
  review: MonthReviewState;
}

/** Fills in defaults for a plan read from storage that predates the Monthly Review feature. */
export function normalizeMonthlyPlan(raw: Partial<MonthlyPlan> & { id: string; monthKey: MonthKey }): MonthlyPlan {
  return {
    id: raw.id,
    monthKey: raw.monthKey,
    notes: raw.notes ?? '',
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    copiedFromMonthKey: raw.copiedFromMonthKey ?? null,
    review: raw.review ? normalizeReviewState(raw.review) : defaultReviewState(),
  };
}

export function monthKeyLabel(monthKey: MonthKey): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function currentMonthKey(): MonthKey {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonthKey(monthKey: MonthKey, delta: number): MonthKey {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function compareMonthKeys(a: MonthKey, b: MonthKey): number {
  return a.localeCompare(b);
}

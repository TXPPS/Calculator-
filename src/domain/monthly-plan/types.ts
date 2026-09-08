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

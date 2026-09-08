import { PersonId } from '../splits/types';
import { PaycheckSchedule, PayFrequency, SemiMonthlySchedule, MonthDayPosition } from './payFrequency';

export type { PaycheckSchedule, PayFrequency, SemiMonthlySchedule, MonthDayPosition };

/**
 * Paycheck: a recurring wage/salary payment with a known per-paycheck amount
 *   and frequency; the selected month's total is calculated from actual
 *   expected occurrences (never an average like paycheck×26/12).
 * Other Recurring Income: a recurring amount with no paycheck schedule
 *   (e.g. a fixed monthly stipend) — behaves like the legacy income model.
 * One-Time Income: a single, non-recurring amount expected this month only.
 * Irregular / Custom: variable income entered fresh each month (freelance,
 *   side work, bonuses) — also the landing type for pre-upgrade records.
 */
export type IncomeType = 'paycheck' | 'otherRecurring' | 'oneTime' | 'irregular';

export interface IncomeEntry {
  id: string;
  monthId: string;
  description: string;
  person: PersonId;
  incomeType: IncomeType;
  /**
   * Authoritative amount counted in this month's plan — every downstream
   * calculation (person/household totals, proportional splits, dashboard,
   * print) reads this field and only this field, regardless of incomeType.
   * For a paycheck entry it is either the calculated schedule total or,
   * when isManualOverride is true, the user's overridden total.
   */
  amountCents: number;
  /** Present only when incomeType === 'paycheck'. */
  paycheck: PaycheckSchedule | null;
  /** True when amountCents/expectedOccurrences were set by hand rather than computed from the schedule. */
  isManualOverride: boolean;
  /** Last schedule-calculated total, for paycheck entries; null otherwise. Lets the UI show "calculated vs. overridden". */
  calculatedAmountCents: number | null;
  /** Expected paycheck count this month, for paycheck entries; null otherwise. */
  expectedOccurrences: number | null;
  /** Expected pay dates ("YYYY-MM-DD") within this month, for paycheck entries. */
  payDates: string[];
  recurring: boolean;
  notes: string;
  templateId: string | null;
}

export interface IncomeTemplate {
  id: string;
  description: string;
  person: PersonId;
  incomeType: IncomeType;
  defaultAmountCents: number;
  paycheck: PaycheckSchedule | null;
  recurring: boolean;
  notes: string;
  archived: boolean;
}

import { getDb } from '../database/db';
import { CURRENT_SCHEMA_VERSION } from '../database/schema';
import { calculateSplit } from '../../domain/splits/calculateSplit';
import { normalizeIncomeEntry, paycheckScheduleIsComplete } from '../../domain/income/incomeCalculations';
import { IncomeType } from '../../domain/income/types';

const VALID_INCOME_TYPES: IncomeType[] = ['paycheck', 'otherRecurring', 'oneTime', 'irregular'];
const VALID_FREQUENCIES = ['weekly', 'biweekly', 'semiMonthly', 'monthly'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface DataHealthIssue {
  severity: 'error' | 'warning';
  message: string;
}

export interface DataHealthReport {
  healthy: boolean;
  issues: DataHealthIssue[];
  checkedAt: string;
}

/** Lightweight integrity checker for Admin > Data Health. */
export async function runDataHealthCheck(): Promise<DataHealthReport> {
  const db = await getDb();
  const issues: DataHealthIssue[] = [];

  const household = await db.get('household', 'household');
  if (household && household.schemaVersion > CURRENT_SCHEMA_VERSION) {
    issues.push({ severity: 'error', message: `Schema version ${household.schemaVersion} is not supported by this app version.` });
  }

  const categories = await db.getAll('categories');
  const categoryIds = new Set(categories.map((c) => c.id));

  const months = await db.getAll('months');
  const monthIds = new Set(months.map((m) => m.id));
  const seenMonthKeys = new Set<string>();
  for (const month of months) {
    if (seenMonthKeys.has(month.monthKey)) {
      issues.push({ severity: 'error', message: `Duplicate monthly plan detected for ${month.monthKey}.` });
    }
    seenMonthKeys.add(month.monthKey);
  }

  const rawIncomeEntries = await db.getAll('incomeEntries');
  const incomeEntries = rawIncomeEntries.map(normalizeIncomeEntry);
  for (const entry of incomeEntries) {
    if (!monthIds.has(entry.monthId)) {
      issues.push({ severity: 'warning', message: `Income entry "${entry.description}" references a missing month.` });
    }
    if (entry.person !== 'person1' && entry.person !== 'person2') {
      issues.push({ severity: 'error', message: `Income entry "${entry.description}" has no valid owner.` });
    }
    if (!Number.isFinite(entry.amountCents) || entry.amountCents < 0) {
      issues.push({ severity: 'error', message: `Income entry "${entry.description}" has an invalid amount.` });
    }
    if (!VALID_INCOME_TYPES.includes(entry.incomeType)) {
      issues.push({ severity: 'error', message: `Income entry "${entry.description}" has an unrecognized income type.` });
    }
    if (entry.incomeType === 'paycheck') {
      if (!entry.paycheck) {
        issues.push({ severity: 'error', message: `Paycheck entry "${entry.description}" is missing its schedule.` });
      } else {
        if (!VALID_FREQUENCIES.includes(entry.paycheck.frequency)) {
          issues.push({ severity: 'error', message: `Paycheck entry "${entry.description}" has an unrecognized frequency.` });
        }
        if (!Number.isFinite(entry.paycheck.perPaycheckCents) || entry.paycheck.perPaycheckCents < 0) {
          issues.push({ severity: 'error', message: `Paycheck entry "${entry.description}" has an invalid per-paycheck amount.` });
        }
        if (
          (entry.paycheck.frequency === 'weekly' || entry.paycheck.frequency === 'biweekly') &&
          entry.paycheck.anchorDate !== null &&
          !ISO_DATE.test(entry.paycheck.anchorDate)
        ) {
          issues.push({ severity: 'error', message: `Paycheck entry "${entry.description}" has an invalid pay-date anchor.` });
        }
        if (entry.paycheck.frequency === 'semiMonthly' && entry.paycheck.semiMonthly) {
          const { first, second } = entry.paycheck.semiMonthly;
          const validPosition = (p: number | 'last') => p === 'last' || (Number.isInteger(p) && p >= 1 && p <= 31);
          if (!validPosition(first) || !validPosition(second)) {
            issues.push({ severity: 'error', message: `Paycheck entry "${entry.description}" has an invalid semi-monthly schedule.` });
          }
        }
        if (!paycheckScheduleIsComplete(entry.paycheck)) {
          issues.push({ severity: 'warning', message: `Paycheck entry "${entry.description}" has no schedule configured yet, so it contributes $0 until one is set.` });
        }
      }
      if (entry.expectedOccurrences !== null && (entry.expectedOccurrences < 0 || entry.expectedOccurrences > 6)) {
        issues.push({ severity: 'error', message: `Paycheck entry "${entry.description}" has an implausible expected paycheck count.` });
      }
    }
  }

  const incomeByMonth = new Map<string, { p1: number; p2: number }>();
  for (const entry of incomeEntries) {
    const existing = incomeByMonth.get(entry.monthId) ?? { p1: 0, p2: 0 };
    if (entry.person === 'person1') existing.p1 += entry.amountCents;
    else existing.p2 += entry.amountCents;
    incomeByMonth.set(entry.monthId, existing);
  }

  const expenseEntries = await db.getAll('expenseEntries');
  for (const entry of expenseEntries) {
    if (!monthIds.has(entry.monthId)) {
      issues.push({ severity: 'warning', message: `Entry "${entry.name}" references a missing month.` });
    }
    if (entry.categoryId && !categoryIds.has(entry.categoryId)) {
      issues.push({ severity: 'warning', message: `Entry "${entry.name}" references a category that no longer exists.` });
    }
    if (!Number.isFinite(entry.amountCents) || entry.amountCents < 0) {
      issues.push({ severity: 'error', message: `Entry "${entry.name}" has an invalid amount.` });
    }
    if (entry.split.method === 'percentage') {
      const p = entry.split.person1Percent;
      if (!Number.isFinite(p) || p < 0 || p > 100) {
        issues.push({ severity: 'error', message: `Entry "${entry.name}" has an invalid split percentage.` });
      }
    }
    if (entry.owner === 'both') {
      const income = incomeByMonth.get(entry.monthId) ?? { p1: 0, p2: 0 };
      const result = calculateSplit(entry.amountCents, entry.split, {
        person1IncomeCents: income.p1,
        person2IncomeCents: income.p2,
      });
      if (!result.error && result.person1Cents + result.person2Cents !== entry.amountCents) {
        issues.push({ severity: 'error', message: `Shared entry "${entry.name}" does not reconcile to its total amount.` });
      }
    }
  }

  return {
    healthy: !issues.some((i) => i.severity === 'error'),
    issues,
    checkedAt: new Date().toISOString(),
  };
}

import { monthRepository } from './monthRepository';
import { incomeRepository } from './incomeRepository';
import { expenseRepository } from './expenseRepository';
import { MonthKey, MonthlyPlan } from '../../domain/monthly-plan/types';
import { recalculateEntryForMonth } from '../../domain/income/incomeCalculations';

/**
 * Creates a new month, optionally seeded from the previous month's recurring
 * entries only. One-time (non-recurring) items and notes are never carried
 * forward — the caller (creating a new plan) reviews/edits the copy after.
 *
 * A recurring paycheck entry is never copied as a static total: its
 * schedule (frequency, per-paycheck amount, anchor/semi-monthly days) is
 * carried forward, but the expected occurrences and total are recalculated
 * for the new month's actual calendar — a manual override from the source
 * month is intentionally NOT carried, since "prefer automatic
 * recalculation" means the new month starts from its own real schedule.
 */
export async function createMonth(
  monthKey: MonthKey,
  copyFromMonthId: string | null
): Promise<MonthlyPlan> {
  const plan = await monthRepository.create(
    monthKey,
    copyFromMonthId ? (await monthRepository.getById(copyFromMonthId))?.monthKey ?? null : null
  );

  if (copyFromMonthId) {
    const [incomeEntries, expenseEntries] = await Promise.all([
      incomeRepository.getForMonth(copyFromMonthId),
      expenseRepository.getForMonth(copyFromMonthId),
    ]);

    await Promise.all([
      ...incomeEntries
        .filter((e) => e.recurring)
        .map((e) => {
          const recalculated = recalculateEntryForMonth(e, monthKey, { keepOverride: false });
          return incomeRepository.create({
            monthId: plan.id,
            description: e.description,
            person: e.person,
            incomeType: e.incomeType,
            paycheck: e.paycheck,
            recurring: true,
            notes: '',
            templateId: e.templateId,
            ...recalculated,
          });
        }),
      ...expenseEntries
        .filter((e) => e.recurring)
        .map((e) =>
          expenseRepository.create({
            monthId: plan.id,
            section: e.section,
            name: e.name,
            categoryId: e.categoryId,
            amountCents: e.amountCents,
            owner: e.owner,
            split: e.split,
            recurring: true,
            dueDay: e.dueDay,
            notes: '',
            templateId: e.templateId,
          })
        ),
    ]);
  }

  return plan;
}

import { monthRepository } from './monthRepository';
import { incomeRepository } from './incomeRepository';
import { expenseRepository } from './expenseRepository';
import { MonthKey, MonthlyPlan } from '../../domain/monthly-plan/types';

/**
 * Creates a new month, optionally seeded from the previous month's recurring
 * entries only. One-time (non-recurring) items and notes are never carried
 * forward — the caller (creating a new plan) reviews/edits the copy after.
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
        .map((e) =>
          incomeRepository.create({
            monthId: plan.id,
            description: e.description,
            person: e.person,
            amountCents: e.amountCents,
            recurring: true,
            notes: '',
            templateId: e.templateId,
          })
        ),
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

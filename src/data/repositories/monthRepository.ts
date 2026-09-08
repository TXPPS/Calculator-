import { v4 as uuid } from 'uuid';
import { getDb } from '../database/db';
import { MonthKey, MonthlyPlan, normalizeMonthlyPlan } from '../../domain/monthly-plan/types';
import { defaultReviewState } from '../../domain/monthly-plan/review';

export const monthRepository = {
  async getAll(): Promise<MonthlyPlan[]> {
    const db = await getDb();
    const all = await db.getAll('months');
    return all.map(normalizeMonthlyPlan).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  },

  async getByKey(monthKey: MonthKey): Promise<MonthlyPlan | undefined> {
    const db = await getDb();
    const found = await db.getFromIndex('months', 'by-monthKey', monthKey);
    return found ? normalizeMonthlyPlan(found) : undefined;
  },

  async getById(id: string): Promise<MonthlyPlan | undefined> {
    const db = await getDb();
    const found = await db.get('months', id);
    return found ? normalizeMonthlyPlan(found) : undefined;
  },

  async create(monthKey: MonthKey, copiedFromMonthKey: string | null = null): Promise<MonthlyPlan> {
    const existing = await this.getByKey(monthKey);
    if (existing) {
      throw new Error(`A plan for ${monthKey} already exists.`);
    }
    const now = new Date().toISOString();
    const plan: MonthlyPlan = {
      id: uuid(),
      monthKey,
      notes: '',
      createdAt: now,
      updatedAt: now,
      copiedFromMonthKey,
      review: defaultReviewState(),
    };
    const db = await getDb();
    await db.put('months', plan);
    return plan;
  },

  async save(plan: MonthlyPlan): Promise<void> {
    const db = await getDb();
    await db.put('months', { ...plan, updatedAt: new Date().toISOString() });
  },

  async delete(id: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(['months', 'incomeEntries', 'expenseEntries'], 'readwrite');
    await tx.objectStore('months').delete(id);
    const incomeKeys = await tx.objectStore('incomeEntries').index('by-monthId').getAllKeys(id);
    await Promise.all(incomeKeys.map((k) => tx.objectStore('incomeEntries').delete(k)));
    const expenseKeys = await tx.objectStore('expenseEntries').index('by-monthId').getAllKeys(id);
    await Promise.all(expenseKeys.map((k) => tx.objectStore('expenseEntries').delete(k)));
    await tx.done;
  },
};

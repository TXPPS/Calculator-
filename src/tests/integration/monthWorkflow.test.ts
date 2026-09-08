import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbConnection } from '../../data/database/db';
import { householdRepository } from '../../data/repositories/householdRepository';
import { monthRepository } from '../../data/repositories/monthRepository';
import { incomeRepository } from '../../data/repositories/incomeRepository';
import { expenseRepository } from '../../data/repositories/expenseRepository';
import { categoryRepository } from '../../data/repositories/categoryRepository';
import { createMonth } from '../../data/repositories/monthCopyService';
import { calculatePlanSummary } from '../../domain/calculations/planCalculations';
import { exportBackup, importBackup, validateBackup } from '../../data/import-export/backup';

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  resetDbConnection();
});

describe('monthly plan workflow (integration)', () => {
  it('creates a household, a month, income and bills, and totals update immediately', async () => {
    const household = await householdRepository.get();
    await householdRepository.save({
      ...household,
      personNames: { person1: 'Alex', person2: 'Sam' },
      onboardingComplete: true,
    });

    const categories = await categoryRepository.getAll();
    expect(categories.length).toBeGreaterThan(0);

    const month = await monthRepository.create('2026-09');
    await incomeRepository.create({
      monthId: month.id,
      description: 'Paycheck',
      person: 'person1',
      amountCents: 400000,
      recurring: true,
      notes: '',
      templateId: null,
    });
    await expenseRepository.create({
      monthId: month.id,
      section: 'bill',
      name: 'Mortgage',
      categoryId: categories[0]!.id,
      amountCents: 200000,
      owner: 'both',
      split: { method: 'even' },
      recurring: true,
      dueDay: 1,
      notes: '',
      templateId: null,
    });

    const income = await incomeRepository.getForMonth(month.id);
    const expenses = await expenseRepository.getForMonth(month.id);
    const summary = calculatePlanSummary(income, expenses);
    expect(summary.income.person1Cents).toBe(400000);
    expect(summary.bills.householdCents).toBe(200000);
  });

  it('copies only recurring items to a new month, never one-time items or notes', async () => {
    const monthA = await monthRepository.create('2026-09');
    await monthRepository.save({ ...monthA, notes: 'three-paycheck month' });
    await incomeRepository.create({
      monthId: monthA.id,
      description: 'Recurring paycheck',
      person: 'person1',
      amountCents: 300000,
      recurring: true,
      notes: '',
      templateId: null,
    });
    await incomeRepository.create({
      monthId: monthA.id,
      description: 'One-time bonus',
      person: 'person1',
      amountCents: 50000,
      recurring: false,
      notes: '',
      templateId: null,
    });
    await expenseRepository.create({
      monthId: monthA.id,
      section: 'bill',
      name: 'Recurring rent',
      categoryId: null,
      amountCents: 150000,
      owner: 'person1',
      split: { method: 'even' },
      recurring: true,
      dueDay: null,
      notes: '',
      templateId: null,
    });
    await expenseRepository.create({
      monthId: monthA.id,
      section: 'bill',
      name: 'One-time repair',
      categoryId: null,
      amountCents: 20000,
      owner: 'person1',
      split: { method: 'even' },
      recurring: false,
      dueDay: null,
      notes: '',
      templateId: null,
    });

    const monthB = await createMonth('2026-10', monthA.id);
    expect(monthB.notes).toBe('');

    const copiedIncome = await incomeRepository.getForMonth(monthB.id);
    const copiedExpenses = await expenseRepository.getForMonth(monthB.id);

    expect(copiedIncome).toHaveLength(1);
    expect(copiedIncome[0]!.description).toBe('Recurring paycheck');
    expect(copiedExpenses).toHaveLength(1);
    expect(copiedExpenses[0]!.name).toBe('Recurring rent');
  });

  it('prevents duplicate monthly plans for the same month', async () => {
    await monthRepository.create('2026-09');
    await expect(monthRepository.create('2026-09')).rejects.toThrow();
  });

  it('deletes a month and cascades its entries', async () => {
    const month = await monthRepository.create('2026-09');
    await incomeRepository.create({
      monthId: month.id,
      description: 'Paycheck',
      person: 'person1',
      amountCents: 100000,
      recurring: true,
      notes: '',
      templateId: null,
    });
    await monthRepository.delete(month.id);
    const remaining = await incomeRepository.getForMonth(month.id);
    expect(remaining).toHaveLength(0);
    expect(await monthRepository.getById(month.id)).toBeUndefined();
  });

  it('exports and re-imports a full backup, restoring all data', async () => {
    const month = await monthRepository.create('2026-09');
    await incomeRepository.create({
      monthId: month.id,
      description: 'Paycheck',
      person: 'person1',
      amountCents: 100000,
      recurring: true,
      notes: '',
      templateId: null,
    });

    const backup = await exportBackup();
    const validation = validateBackup(JSON.parse(JSON.stringify(backup)));
    expect(validation.valid).toBe(true);

    await monthRepository.delete(month.id);
    expect(await monthRepository.getAll()).toHaveLength(0);

    await importBackup(backup);
    const restoredMonths = await monthRepository.getAll();
    expect(restoredMonths).toHaveLength(1);
    const restoredIncome = await incomeRepository.getForMonth(restoredMonths[0]!.id);
    expect(restoredIncome).toHaveLength(1);
  });

  it('keeps an archived category from corrupting existing plan entries', async () => {
    const categories = await categoryRepository.getAll();
    const cat = categories[0]!;
    const month = await monthRepository.create('2026-09');
    const entry = await expenseRepository.create({
      monthId: month.id,
      section: 'bill',
      name: 'Electric',
      categoryId: cat.id,
      amountCents: 15000,
      owner: 'person1',
      split: { method: 'even' },
      recurring: true,
      dueDay: null,
      notes: '',
      templateId: null,
    });

    await categoryRepository.archive(cat.id, true);

    const reloaded = await expenseRepository.getForMonth(month.id);
    expect(reloaded.find((e) => e.id === entry.id)?.categoryId).toBe(cat.id);
  });
});

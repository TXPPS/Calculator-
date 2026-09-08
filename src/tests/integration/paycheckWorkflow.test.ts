import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbConnection } from '../../data/database/db';
import { monthRepository } from '../../data/repositories/monthRepository';
import { incomeRepository } from '../../data/repositories/incomeRepository';
import { expenseRepository } from '../../data/repositories/expenseRepository';
import { createMonth } from '../../data/repositories/monthCopyService';
import { calculatePlanSummary } from '../../domain/calculations/planCalculations';
import { computeIncomeEntryForMonth } from '../../domain/income/incomeCalculations';
import { exportBackup, importBackup, validateBackup } from '../../data/import-export/backup';
import { PaycheckSchedule } from '../../domain/income/payFrequency';
import { REVIEW_SECTION_ORDER } from '../../domain/monthly-plan/review';
import { computeMonthSignatures } from '../../domain/calculations/reviewSignatures';

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  resetDbConnection();
});

const biweekly: PaycheckSchedule = {
  frequency: 'biweekly',
  perPaycheckCents: 190000,
  anchorDate: '2026-09-04',
  semiMonthly: null,
  monthlyDay: null,
};

describe('paycheck income feeds household totals and proportional splits', () => {
  it('a paycheck total feeds person income and combined household income', async () => {
    const month = await monthRepository.create('2026-09');
    const computation = computeIncomeEntryForMonth(
      { incomeType: 'paycheck', paycheck: biweekly, isManualOverride: false, amountCents: 0, expectedOccurrences: null },
      month.monthKey
    );
    await incomeRepository.create({
      monthId: month.id,
      description: 'Main Job',
      person: 'person1',
      incomeType: 'paycheck',
      paycheck: biweekly,
      isManualOverride: false,
      recurring: true,
      notes: '',
      templateId: null,
      ...computation,
    });
    await incomeRepository.create({
      monthId: month.id,
      description: 'Side gig',
      person: 'person2',
      incomeType: 'irregular',
      paycheck: null,
      isManualOverride: false,
      calculatedAmountCents: null,
      expectedOccurrences: null,
      payDates: [],
      amountCents: 120000,
      recurring: true,
      notes: '',
      templateId: null,
    });

    const income = await incomeRepository.getForMonth(month.id);
    const summary = calculatePlanSummary(income, []);
    expect(summary.income.person1Cents).toBe(380000); // 2 September checks
    expect(summary.income.person2Cents).toBe(120000);
    expect(summary.income.householdCents).toBe(500000);
  });

  it('an income-proportional shared bill updates when the paycheck count changes month to month', async () => {
    const septMonth = await monthRepository.create('2026-09');
    const septComputation = computeIncomeEntryForMonth(
      { incomeType: 'paycheck', paycheck: biweekly, isManualOverride: false, amountCents: 0, expectedOccurrences: null },
      septMonth.monthKey
    );
    await incomeRepository.create({
      monthId: septMonth.id,
      description: 'Main Job',
      person: 'person1',
      incomeType: 'paycheck',
      paycheck: biweekly,
      isManualOverride: false,
      recurring: true,
      notes: '',
      templateId: null,
      ...septComputation,
    });
    await incomeRepository.create({
      monthId: septMonth.id,
      description: 'Fixed income',
      person: 'person2',
      incomeType: 'irregular',
      paycheck: null,
      isManualOverride: false,
      calculatedAmountCents: null,
      expectedOccurrences: null,
      payDates: [],
      amountCents: 380000,
      recurring: true,
      notes: '',
      templateId: null,
    });
    await expenseRepository.create({
      monthId: septMonth.id,
      section: 'bill',
      name: 'Rent',
      categoryId: null,
      amountCents: 200000,
      owner: 'both',
      split: { method: 'incomeProportional' },
      recurring: true,
      dueDay: null,
      notes: '',
      templateId: null,
    });

    const octMonth = await createMonth('2026-10', septMonth.id);
    const octIncome = await incomeRepository.getForMonth(octMonth.id);
    const octExpenses = await expenseRepository.getForMonth(octMonth.id);
    const octSummary = calculatePlanSummary(octIncome, octExpenses);

    // October has 3 biweekly checks (570000) vs person2's fixed 380000 -> different proportion than September's 50/50.
    expect(octSummary.income.person1Cents).toBe(570000);
    expect(octSummary.income.person2Cents).toBe(380000);
    expect(octSummary.bills.person1Cents + octSummary.bills.person2Cents).toBe(200000); // reconciles, no double counting
    // Person1 now earns more than half of household income, so their proportional share should exceed 50%.
    expect(octSummary.bills.person1Cents).toBeGreaterThan(100000);
  });

  it('one-time income is never copied to a new month, even if similar paycheck income is recurring', async () => {
    const month = await monthRepository.create('2026-09');
    await incomeRepository.create({
      monthId: month.id,
      description: 'Signing bonus',
      person: 'person1',
      incomeType: 'oneTime',
      paycheck: null,
      isManualOverride: false,
      calculatedAmountCents: null,
      expectedOccurrences: null,
      payDates: [],
      amountCents: 500000,
      recurring: false,
      notes: '',
      templateId: null,
    });
    const nextMonth = await createMonth('2026-10', month.id);
    const copied = await incomeRepository.getForMonth(nextMonth.id);
    expect(copied).toHaveLength(0);
  });

  it('an irregular recurring income entry carries forward using its own configured recurring state', async () => {
    const month = await monthRepository.create('2026-09');
    await incomeRepository.create({
      monthId: month.id,
      description: 'Retainer client',
      person: 'person2',
      incomeType: 'irregular',
      paycheck: null,
      isManualOverride: false,
      calculatedAmountCents: null,
      expectedOccurrences: null,
      payDates: [],
      amountCents: 75000,
      recurring: true,
      notes: '',
      templateId: null,
    });
    const nextMonth = await createMonth('2026-10', month.id);
    const copied = await incomeRepository.getForMonth(nextMonth.id);
    expect(copied).toHaveLength(1);
    expect(copied[0]!.amountCents).toBe(75000);
  });
});

describe('backup round-trip preserves paycheck fields', () => {
  it('exports and re-imports a paycheck entry with its full schedule intact', async () => {
    const month = await monthRepository.create('2026-09');
    const computation = computeIncomeEntryForMonth(
      { incomeType: 'paycheck', paycheck: biweekly, isManualOverride: false, amountCents: 0, expectedOccurrences: null },
      month.monthKey
    );
    await incomeRepository.create({
      monthId: month.id,
      description: 'Main Job',
      person: 'person1',
      incomeType: 'paycheck',
      paycheck: biweekly,
      isManualOverride: false,
      recurring: true,
      notes: '',
      templateId: null,
      ...computation,
    });

    const backup = await exportBackup();
    const validation = validateBackup(JSON.parse(JSON.stringify(backup)));
    expect(validation.valid).toBe(true);

    await monthRepository.delete(month.id);
    await importBackup(backup);

    const restoredMonths = await monthRepository.getAll();
    const restoredIncome = await incomeRepository.getForMonth(restoredMonths[0]!.id);
    expect(restoredIncome).toHaveLength(1);
    const entry = restoredIncome[0]!;
    expect(entry.incomeType).toBe('paycheck');
    expect(entry.paycheck?.frequency).toBe('biweekly');
    expect(entry.paycheck?.perPaycheckCents).toBe(190000);
    expect(entry.paycheck?.anchorDate).toBe('2026-09-04');
    expect(entry.amountCents).toBe(380000);
  });

  it('migrates a legacy (pre-upgrade) backup on import without corrupting the amount', async () => {
    const legacyBackup = {
      schemaVersion: 1,
      appVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      household: {
        id: 'household' as const,
        personNames: { person1: 'Alex', person2: 'Sam' },
        appName: 'Household Plan',
        currency: 'USD',
        locale: 'en-US',
        defaultSplitMethod: 'even' as const,
        onboardingComplete: true,
        schemaVersion: 1,
      },
      categories: [],
      months: [
        {
          id: 'month-legacy',
          monthKey: '2026-06',
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          copiedFromMonthKey: null,
          // no `review` field — pre-upgrade shape
        },
      ],
      incomeEntries: [
        {
          id: 'income-legacy',
          monthId: 'month-legacy',
          description: 'Expected monthly income',
          person: 'person1',
          amountCents: 380000,
          recurring: true,
          notes: '',
          templateId: null,
          // no incomeType/paycheck/etc — pre-upgrade shape
        },
      ],
      expenseEntries: [],
      incomeTemplates: [],
      expenseTemplates: [],
      preferences: { id: 'preferences' as const, theme: 'system' as const, lastSelectedMonthKey: null },
    };

    const validation = validateBackup(legacyBackup);
    expect(validation.valid).toBe(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await importBackup(legacyBackup as any);

    const months = await monthRepository.getAll();
    expect(months).toHaveLength(1);
    expect(months[0]!.review).toBeDefined();
    expect(months[0]!.review.income.reviewed).toBe(false);

    const income = await incomeRepository.getForMonth(months[0]!.id);
    expect(income).toHaveLength(1);
    expect(income[0]!.incomeType).toBe('irregular');
    expect(income[0]!.amountCents).toBe(380000);
  });
});

describe('monthly review state', () => {
  it('a fresh month starts with no sections reviewed', async () => {
    const month = await monthRepository.create('2026-09');
    for (const key of REVIEW_SECTION_ORDER) {
      expect(month.review[key].reviewed).toBe(false);
    }
  });

  it('marking a section reviewed persists, and stays valid while data is unchanged', async () => {
    const month = await monthRepository.create('2026-09');
    await incomeRepository.create({
      monthId: month.id,
      description: 'Paycheck',
      person: 'person1',
      incomeType: 'irregular',
      paycheck: null,
      isManualOverride: false,
      calculatedAmountCents: null,
      expectedOccurrences: null,
      payDates: [],
      amountCents: 400000,
      recurring: true,
      notes: '',
      templateId: null,
    });
    const income = await incomeRepository.getForMonth(month.id);
    const signatures = computeMonthSignatures(income, []);

    await monthRepository.save({
      ...month,
      review: { ...month.review, income: { reviewed: true, reviewedAt: new Date().toISOString(), signature: signatures.income } },
    });

    const reloaded = await monthRepository.getById(month.id);
    expect(reloaded!.review.income.reviewed).toBe(true);
    expect(reloaded!.review.income.signature).toBe(signatures.income);

    // Signature recomputed from unchanged data still matches -> not stale.
    const stillSameIncome = await incomeRepository.getForMonth(month.id);
    const recomputed = computeMonthSignatures(stillSameIncome, []);
    expect(recomputed.income).toBe(reloaded!.review.income.signature);
  });

  it('editing income after marking it reviewed changes the signature (review becomes stale)', async () => {
    const month = await monthRepository.create('2026-09');
    const entry = await incomeRepository.create({
      monthId: month.id,
      description: 'Paycheck',
      person: 'person1',
      incomeType: 'irregular',
      paycheck: null,
      isManualOverride: false,
      calculatedAmountCents: null,
      expectedOccurrences: null,
      payDates: [],
      amountCents: 400000,
      recurring: true,
      notes: '',
      templateId: null,
    });
    const beforeEdit = computeMonthSignatures(await incomeRepository.getForMonth(month.id), []);
    await monthRepository.save({
      ...month,
      review: { ...month.review, income: { reviewed: true, reviewedAt: new Date().toISOString(), signature: beforeEdit.income } },
    });

    await incomeRepository.save({ ...entry, amountCents: 450000 });
    const afterEdit = computeMonthSignatures(await incomeRepository.getForMonth(month.id), []);
    const reloaded = await monthRepository.getById(month.id);

    expect(afterEdit.income).not.toBe(reloaded!.review.income.signature);
  });
});

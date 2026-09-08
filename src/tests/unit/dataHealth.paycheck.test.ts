import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { resetDbConnection, getDb } from '../../data/database/db';
import { monthRepository } from '../../data/repositories/monthRepository';
import { incomeRepository } from '../../data/repositories/incomeRepository';
import { runDataHealthCheck } from '../../data/import-export/dataHealth';
import { PaycheckSchedule } from '../../domain/income/payFrequency';

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  resetDbConnection();
});

const validBiweekly: PaycheckSchedule = {
  frequency: 'biweekly',
  perPaycheckCents: 190000,
  anchorDate: '2026-09-04',
  semiMonthly: null,
  monthlyDay: null,
};

async function putRawIncome(raw: Record<string, unknown>) {
  const db = await getDb();
  await db.put('incomeEntries', raw as never);
}

describe('data health: paycheck income', () => {
  it('a fully valid paycheck entry produces no issues at all', async () => {
    const month = await monthRepository.create('2026-09');
    await incomeRepository.create({
      monthId: month.id,
      description: 'Main Job',
      person: 'person1',
      incomeType: 'paycheck',
      paycheck: validBiweekly,
      isManualOverride: false,
      calculatedAmountCents: 380000,
      expectedOccurrences: 2,
      payDates: ['2026-09-04', '2026-09-18'],
      amountCents: 380000,
      recurring: true,
      notes: '',
      templateId: null,
    });

    const report = await runDataHealthCheck();
    expect(report.issues).toEqual([]);
    expect(report.healthy).toBe(true);
  });

  it('flags an unrecognized pay frequency', async () => {
    const month = await monthRepository.create('2026-09');
    await putRawIncome({
      id: 'bad-freq',
      monthId: month.id,
      description: 'Bad freq',
      person: 'person1',
      incomeType: 'paycheck',
      amountCents: 100,
      paycheck: { frequency: 'yearly', perPaycheckCents: 100, anchorDate: null, semiMonthly: null, monthlyDay: null },
      isManualOverride: false,
      calculatedAmountCents: null,
      expectedOccurrences: null,
      payDates: [],
      recurring: true,
      notes: '',
      templateId: null,
    });

    const report = await runDataHealthCheck();
    expect(report.healthy).toBe(false);
    expect(report.issues.some((i) => i.message.includes('unrecognized frequency'))).toBe(true);
  });

  it('flags an invalid pay-date anchor format', async () => {
    const month = await monthRepository.create('2026-09');
    await putRawIncome({
      id: 'bad-anchor',
      monthId: month.id,
      description: 'Bad anchor',
      person: 'person1',
      incomeType: 'paycheck',
      amountCents: 100,
      paycheck: { frequency: 'weekly', perPaycheckCents: 100, anchorDate: '09/04/2026', semiMonthly: null, monthlyDay: null },
      isManualOverride: false,
      calculatedAmountCents: null,
      expectedOccurrences: null,
      payDates: [],
      recurring: true,
      notes: '',
      templateId: null,
    });

    const report = await runDataHealthCheck();
    expect(report.healthy).toBe(false);
    expect(report.issues.some((i) => i.message.includes('invalid pay-date anchor'))).toBe(true);
  });

  it('flags an implausible expected paycheck count (> 6)', async () => {
    const month = await monthRepository.create('2026-09');
    await putRawIncome({
      id: 'too-many',
      monthId: month.id,
      description: 'Too many',
      person: 'person1',
      incomeType: 'paycheck',
      amountCents: 100,
      paycheck: validBiweekly,
      isManualOverride: true,
      calculatedAmountCents: 380000,
      expectedOccurrences: 12,
      payDates: [],
      recurring: true,
      notes: '',
      templateId: null,
    });

    const report = await runDataHealthCheck();
    expect(report.healthy).toBe(false);
    expect(report.issues.some((i) => i.message.includes('implausible expected paycheck count'))).toBe(true);
  });

  it('flags a paycheck entry with an incomplete schedule as a warning, not an error', async () => {
    const month = await monthRepository.create('2026-09');
    await putRawIncome({
      id: 'incomplete',
      monthId: month.id,
      description: 'No anchor yet',
      person: 'person1',
      incomeType: 'paycheck',
      amountCents: 0,
      paycheck: { frequency: 'weekly', perPaycheckCents: 50000, anchorDate: null, semiMonthly: null, monthlyDay: null },
      isManualOverride: false,
      calculatedAmountCents: null,
      expectedOccurrences: null,
      payDates: [],
      recurring: true,
      notes: '',
      templateId: null,
    });

    const report = await runDataHealthCheck();
    const issue = report.issues.find((i) => i.message.includes('no schedule configured yet'));
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe('warning');
    expect(report.healthy).toBe(true); // warnings alone don't make it unhealthy
  });

  it('flags a paycheck entry missing its schedule entirely', async () => {
    const month = await monthRepository.create('2026-09');
    await putRawIncome({
      id: 'missing-schedule',
      monthId: month.id,
      description: 'Missing schedule',
      person: 'person1',
      incomeType: 'paycheck',
      amountCents: 0,
      // no `paycheck` field at all — partially-upgraded legacy shape
      isManualOverride: false,
      calculatedAmountCents: null,
      expectedOccurrences: null,
      payDates: [],
      recurring: true,
      notes: '',
      templateId: null,
    });

    const report = await runDataHealthCheck();
    expect(report.healthy).toBe(false);
    expect(report.issues.some((i) => i.message.includes('missing its schedule'))).toBe(true);
  });
});

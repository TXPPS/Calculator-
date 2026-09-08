import { getDb } from '../database/db';
import { CURRENT_SCHEMA_VERSION } from '../database/schema';
import { HouseholdConfig } from '../../domain/household/types';
import { Category } from '../../domain/categories/types';
import { MonthlyPlan } from '../../domain/monthly-plan/types';
import { IncomeEntry, IncomeTemplate } from '../../domain/income/types';
import { ExpenseEntry, ExpenseTemplate } from '../../domain/expenses/types';
import { Preferences } from '../database/schema';
import { normalizeIncomeEntry } from '../../domain/income/incomeCalculations';
import { normalizeMonthlyPlan } from '../../domain/monthly-plan/types';

export interface BackupFile {
  schemaVersion: number;
  appVersion: string;
  exportedAt: string;
  household: HouseholdConfig;
  categories: Category[];
  months: MonthlyPlan[];
  incomeEntries: IncomeEntry[];
  expenseEntries: ExpenseEntry[];
  incomeTemplates: IncomeTemplate[];
  expenseTemplates: ExpenseTemplate[];
  preferences: Preferences;
}

export const APP_VERSION = '1.0.0';

export async function exportBackup(): Promise<BackupFile> {
  const db = await getDb();
  const [household, categories, months, incomeEntries, expenseEntries, incomeTemplates, expenseTemplates, preferences] =
    await Promise.all([
      db.get('household', 'household'),
      db.getAll('categories'),
      db.getAll('months'),
      db.getAll('incomeEntries'),
      db.getAll('expenseEntries'),
      db.getAll('incomeTemplates'),
      db.getAll('expenseTemplates'),
      db.get('preferences', 'preferences'),
    ]);

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    household: household ?? {
      id: 'household',
      personNames: { person1: 'Person 1', person2: 'Person 2' },
      appName: 'Household Plan',
      currency: 'USD',
      locale: 'en-US',
      defaultSplitMethod: 'even',
      onboardingComplete: false,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    },
    categories,
    months: months.map(normalizeMonthlyPlan),
    incomeEntries: incomeEntries.map(normalizeIncomeEntry),
    expenseEntries,
    incomeTemplates,
    expenseTemplates,
    preferences: preferences ?? { id: 'preferences', theme: 'system', lastSelectedMonthKey: null },
  };
}

export interface ImportValidation {
  valid: boolean;
  errors: string[];
  summary: {
    months: number;
    incomeEntries: number;
    expenseEntries: number;
    categories: number;
  };
}

export function validateBackup(data: unknown): ImportValidation {
  const errors: string[] = [];
  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['File is not a valid backup (not a JSON object).'], summary: { months: 0, incomeEntries: 0, expenseEntries: 0, categories: 0 } };
  }
  const d = data as Partial<BackupFile>;
  if (typeof d.schemaVersion !== 'number') errors.push('Missing or invalid schemaVersion.');
  else if (d.schemaVersion > CURRENT_SCHEMA_VERSION)
    errors.push(`Backup schema version (${d.schemaVersion}) is newer than this app supports (${CURRENT_SCHEMA_VERSION}).`);
  if (!d.household || typeof d.household !== 'object') errors.push('Missing household configuration.');
  if (!Array.isArray(d.categories)) errors.push('Missing or invalid categories.');
  if (!Array.isArray(d.months)) errors.push('Missing or invalid months.');
  if (!Array.isArray(d.incomeEntries)) errors.push('Missing or invalid income entries.');
  if (!Array.isArray(d.expenseEntries)) errors.push('Missing or invalid expense entries.');

  return {
    valid: errors.length === 0,
    errors,
    summary: {
      months: Array.isArray(d.months) ? d.months.length : 0,
      incomeEntries: Array.isArray(d.incomeEntries) ? d.incomeEntries.length : 0,
      expenseEntries: Array.isArray(d.expenseEntries) ? d.expenseEntries.length : 0,
      categories: Array.isArray(d.categories) ? d.categories.length : 0,
    },
  };
}

/**
 * Replaces all local data with the backup's contents. Callers must validate
 * first via validateBackup(). The previous state is returned so the caller
 * can offer recovery if something goes wrong downstream.
 */
export async function importBackup(data: BackupFile): Promise<BackupFile> {
  const previous = await exportBackup();
  const db = await getDb();
  const tx = db.transaction(
    ['household', 'categories', 'months', 'incomeEntries', 'expenseEntries', 'incomeTemplates', 'expenseTemplates', 'preferences'],
    'readwrite'
  );

  await Promise.all([
    tx.objectStore('household').clear(),
    tx.objectStore('categories').clear(),
    tx.objectStore('months').clear(),
    tx.objectStore('incomeEntries').clear(),
    tx.objectStore('expenseEntries').clear(),
    tx.objectStore('incomeTemplates').clear(),
    tx.objectStore('expenseTemplates').clear(),
    tx.objectStore('preferences').clear(),
  ]);

  await tx.objectStore('household').put(data.household);
  await tx.objectStore('preferences').put(data.preferences);
  await Promise.all(data.categories.map((c) => tx.objectStore('categories').put(c)));
  await Promise.all(data.months.map((m) => tx.objectStore('months').put(normalizeMonthlyPlan(m))));
  await Promise.all(
    data.incomeEntries.map((e) => tx.objectStore('incomeEntries').put(normalizeIncomeEntry(e)))
  );
  await Promise.all(data.expenseEntries.map((e) => tx.objectStore('expenseEntries').put(e)));
  await Promise.all(data.incomeTemplates.map((t) => tx.objectStore('incomeTemplates').put(t)));
  await Promise.all(data.expenseTemplates.map((t) => tx.objectStore('expenseTemplates').put(t)));

  await tx.done;
  return previous;
}

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(
    ['household', 'categories', 'months', 'incomeEntries', 'expenseEntries', 'incomeTemplates', 'expenseTemplates', 'preferences'],
    'readwrite'
  );
  await Promise.all([
    tx.objectStore('household').clear(),
    tx.objectStore('categories').clear(),
    tx.objectStore('months').clear(),
    tx.objectStore('incomeEntries').clear(),
    tx.objectStore('expenseEntries').clear(),
    tx.objectStore('incomeTemplates').clear(),
    tx.objectStore('expenseTemplates').clear(),
    tx.objectStore('preferences').clear(),
  ]);
  await tx.done;
}

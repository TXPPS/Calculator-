import { DBSchema } from 'idb';
import { HouseholdConfig } from '../../domain/household/types';
import { Category } from '../../domain/categories/types';
import { MonthlyPlan } from '../../domain/monthly-plan/types';
import { IncomeEntry, IncomeTemplate } from '../../domain/income/types';
import { ExpenseEntry, ExpenseTemplate } from '../../domain/expenses/types';

export const DB_NAME = 'household-spending-plan';
/**
 * Logical data-shape version, independent of the IndexedDB object-store
 * version below. Bumped from 1 to 2 for the paycheck/income-frequency
 * system and Monthly Review state — both are additive (new optional
 * fields normalized at read time by the repositories), so no IndexedDB
 * store/index migration was needed, but backups now carry the richer
 * shape and importing an older (schemaVersion 1) backup remains supported.
 */
export const CURRENT_SCHEMA_VERSION = 2;

export type ThemePreference = 'light' | 'dark' | 'system';

export interface Preferences {
  id: 'preferences';
  theme: ThemePreference;
  lastSelectedMonthKey: string | null;
}

export interface AppSchema extends DBSchema {
  household: {
    key: string;
    value: HouseholdConfig;
  };
  categories: {
    key: string;
    value: Category;
    indexes: { 'by-order': number };
  };
  months: {
    key: string;
    value: MonthlyPlan;
    indexes: { 'by-monthKey': string };
  };
  incomeEntries: {
    key: string;
    value: IncomeEntry;
    indexes: { 'by-monthId': string };
  };
  expenseEntries: {
    key: string;
    value: ExpenseEntry;
    indexes: { 'by-monthId': string; 'by-monthId-section': [string, string] };
  };
  incomeTemplates: {
    key: string;
    value: IncomeTemplate;
  };
  expenseTemplates: {
    key: string;
    value: ExpenseTemplate;
    indexes: { 'by-section': string };
  };
  preferences: {
    key: string;
    value: Preferences;
  };
}

export const STORE_NAMES = [
  'household',
  'categories',
  'months',
  'incomeEntries',
  'expenseEntries',
  'incomeTemplates',
  'expenseTemplates',
  'preferences',
] as const;

import { v4 as uuid } from 'uuid';
import { getDb } from '../database/db';
import { IncomeEntry, IncomeTemplate } from '../../domain/income/types';
import { normalizeIncomeEntry } from '../../domain/income/incomeCalculations';

export const incomeRepository = {
  async getForMonth(monthId: string): Promise<IncomeEntry[]> {
    const db = await getDb();
    const all = await db.getAllFromIndex('incomeEntries', 'by-monthId', monthId);
    return all.map(normalizeIncomeEntry);
  },

  async save(entry: IncomeEntry): Promise<void> {
    const db = await getDb();
    await db.put('incomeEntries', entry);
  },

  async create(entry: Omit<IncomeEntry, 'id'>): Promise<IncomeEntry> {
    const full: IncomeEntry = { ...entry, id: uuid() };
    await this.save(full);
    return full;
  },

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('incomeEntries', id);
  },
};

function normalizeIncomeTemplate(raw: Partial<IncomeTemplate> & { id: string }): IncomeTemplate {
  return {
    id: raw.id,
    description: raw.description ?? '',
    person: raw.person ?? 'person1',
    incomeType: raw.incomeType ?? 'irregular',
    defaultAmountCents: raw.defaultAmountCents ?? 0,
    paycheck: raw.incomeType === 'paycheck' ? raw.paycheck ?? null : null,
    recurring: raw.recurring ?? true,
    notes: raw.notes ?? '',
    archived: raw.archived ?? false,
  };
}

export const incomeTemplateRepository = {
  async getAll(): Promise<IncomeTemplate[]> {
    const db = await getDb();
    const all = await db.getAll('incomeTemplates');
    return all.map(normalizeIncomeTemplate);
  },
  async save(template: IncomeTemplate): Promise<void> {
    const db = await getDb();
    await db.put('incomeTemplates', template);
  },
  async create(template: Omit<IncomeTemplate, 'id'>): Promise<IncomeTemplate> {
    const full: IncomeTemplate = { ...template, id: uuid() };
    await this.save(full);
    return full;
  },
  async archive(id: string, archived: boolean): Promise<void> {
    const db = await getDb();
    const existing = await db.get('incomeTemplates', id);
    if (!existing) return;
    await db.put('incomeTemplates', { ...existing, archived });
  },
  async duplicate(id: string): Promise<IncomeTemplate | undefined> {
    const db = await getDb();
    const existing = await db.get('incomeTemplates', id);
    if (!existing) return undefined;
    const normalized = normalizeIncomeTemplate(existing);
    const copy: IncomeTemplate = { ...normalized, id: uuid(), description: `${normalized.description} (copy)`, archived: false };
    await db.put('incomeTemplates', copy);
    return copy;
  },
};

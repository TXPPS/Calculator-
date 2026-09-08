import { v4 as uuid } from 'uuid';
import { getDb } from '../database/db';
import { IncomeEntry, IncomeTemplate } from '../../domain/income/types';

export const incomeRepository = {
  async getForMonth(monthId: string): Promise<IncomeEntry[]> {
    const db = await getDb();
    return db.getAllFromIndex('incomeEntries', 'by-monthId', monthId);
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

export const incomeTemplateRepository = {
  async getAll(): Promise<IncomeTemplate[]> {
    const db = await getDb();
    return db.getAll('incomeTemplates');
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
};

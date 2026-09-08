import { v4 as uuid } from 'uuid';
import { getDb } from '../database/db';
import { ExpenseEntry, ExpenseSection, ExpenseTemplate } from '../../domain/expenses/types';

export const expenseRepository = {
  async getForMonth(monthId: string): Promise<ExpenseEntry[]> {
    const db = await getDb();
    return db.getAllFromIndex('expenseEntries', 'by-monthId', monthId);
  },

  async getForMonthSection(monthId: string, section: ExpenseSection): Promise<ExpenseEntry[]> {
    const db = await getDb();
    return db.getAllFromIndex('expenseEntries', 'by-monthId-section', [monthId, section]);
  },

  async save(entry: ExpenseEntry): Promise<void> {
    const db = await getDb();
    await db.put('expenseEntries', entry);
  },

  async create(entry: Omit<ExpenseEntry, 'id'>): Promise<ExpenseEntry> {
    const full: ExpenseEntry = { ...entry, id: uuid() };
    await this.save(full);
    return full;
  },

  async duplicate(id: string): Promise<ExpenseEntry | undefined> {
    const db = await getDb();
    const existing = await db.get('expenseEntries', id);
    if (!existing) return undefined;
    const copy: ExpenseEntry = { ...existing, id: uuid(), name: `${existing.name} (copy)` };
    await this.save(copy);
    return copy;
  },

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('expenseEntries', id);
  },
};

export const expenseTemplateRepository = {
  async getAll(): Promise<ExpenseTemplate[]> {
    const db = await getDb();
    return db.getAll('expenseTemplates');
  },
  async getBySection(section: ExpenseSection): Promise<ExpenseTemplate[]> {
    const db = await getDb();
    return db.getAllFromIndex('expenseTemplates', 'by-section', section);
  },
  async save(template: ExpenseTemplate): Promise<void> {
    const db = await getDb();
    await db.put('expenseTemplates', template);
  },
  async create(template: Omit<ExpenseTemplate, 'id'>): Promise<ExpenseTemplate> {
    const full: ExpenseTemplate = { ...template, id: uuid() };
    await this.save(full);
    return full;
  },
  async archive(id: string, archived: boolean): Promise<void> {
    const db = await getDb();
    const existing = await db.get('expenseTemplates', id);
    if (!existing) return;
    await db.put('expenseTemplates', { ...existing, archived });
  },
  async duplicate(id: string): Promise<ExpenseTemplate | undefined> {
    const db = await getDb();
    const existing = await db.get('expenseTemplates', id);
    if (!existing) return undefined;
    const copy: ExpenseTemplate = { ...existing, id: uuid(), name: `${existing.name} (copy)`, archived: false };
    await db.put('expenseTemplates', copy);
    return copy;
  },
};

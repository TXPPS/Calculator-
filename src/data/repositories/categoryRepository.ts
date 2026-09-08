import { v4 as uuid } from 'uuid';
import { getDb } from '../database/db';
import { Category, STARTER_CATEGORIES } from '../../domain/categories/types';

export const categoryRepository = {
  async getAll(): Promise<Category[]> {
    const db = await getDb();
    const all = await db.getAllFromIndex('categories', 'by-order');
    if (all.length === 0) {
      const seeded = STARTER_CATEGORIES.map((c) => ({ ...c, id: uuid() }));
      const tx = db.transaction('categories', 'readwrite');
      await Promise.all(seeded.map((c) => tx.store.put(c)));
      await tx.done;
      return seeded;
    }
    return all;
  },

  async save(category: Category): Promise<void> {
    const db = await getDb();
    await db.put('categories', category);
  },

  async create(name: string, order: number): Promise<Category> {
    const category: Category = { id: uuid(), name, order, archived: false };
    await this.save(category);
    return category;
  },

  async archive(id: string, archived: boolean): Promise<void> {
    const db = await getDb();
    const existing = await db.get('categories', id);
    if (!existing) return;
    await db.put('categories', { ...existing, archived });
  },

  async reorder(idsInOrder: string[]): Promise<void> {
    const db = await getDb();
    const tx = db.transaction('categories', 'readwrite');
    await Promise.all(
      idsInOrder.map(async (id, index) => {
        const existing = await tx.store.get(id);
        if (existing) await tx.store.put({ ...existing, order: index });
      })
    );
    await tx.done;
  },
};

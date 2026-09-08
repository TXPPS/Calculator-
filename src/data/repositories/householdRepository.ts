import { getDb } from '../database/db';
import { DEFAULT_HOUSEHOLD, HouseholdConfig } from '../../domain/household/types';

export const householdRepository = {
  async get(): Promise<HouseholdConfig> {
    const db = await getDb();
    const existing = await db.get('household', 'household');
    if (existing) return existing;
    await db.put('household', DEFAULT_HOUSEHOLD);
    return DEFAULT_HOUSEHOLD;
  },

  async save(config: HouseholdConfig): Promise<void> {
    const db = await getDb();
    await db.put('household', config);
  },
};

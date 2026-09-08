import { getDb } from '../database/db';
import { Preferences } from '../database/schema';

const DEFAULT_PREFERENCES: Preferences = {
  id: 'preferences',
  theme: 'system',
  lastSelectedMonthKey: null,
};

export const preferencesRepository = {
  async get(): Promise<Preferences> {
    const db = await getDb();
    const existing = await db.get('preferences', 'preferences');
    return existing ?? DEFAULT_PREFERENCES;
  },
  async save(prefs: Preferences): Promise<void> {
    const db = await getDb();
    await db.put('preferences', prefs);
  },
};

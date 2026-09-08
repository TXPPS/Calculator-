import { IDBPDatabase, openDB } from 'idb';
import { AppSchema, CURRENT_SCHEMA_VERSION, DB_NAME } from './schema';

let dbPromise: Promise<IDBPDatabase<AppSchema>> | null = null;

export function getDb(): Promise<IDBPDatabase<AppSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<AppSchema>(DB_NAME, CURRENT_SCHEMA_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('household')) {
          db.createObjectStore('household', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('categories')) {
          const store = db.createObjectStore('categories', { keyPath: 'id' });
          store.createIndex('by-order', 'order');
        }
        if (!db.objectStoreNames.contains('months')) {
          const store = db.createObjectStore('months', { keyPath: 'id' });
          store.createIndex('by-monthKey', 'monthKey', { unique: true });
        }
        if (!db.objectStoreNames.contains('incomeEntries')) {
          const store = db.createObjectStore('incomeEntries', { keyPath: 'id' });
          store.createIndex('by-monthId', 'monthId');
        }
        if (!db.objectStoreNames.contains('expenseEntries')) {
          const store = db.createObjectStore('expenseEntries', { keyPath: 'id' });
          store.createIndex('by-monthId', 'monthId');
          store.createIndex('by-monthId-section', ['monthId', 'section']);
        }
        if (!db.objectStoreNames.contains('incomeTemplates')) {
          db.createObjectStore('incomeTemplates', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('expenseTemplates')) {
          const store = db.createObjectStore('expenseTemplates', { keyPath: 'id' });
          store.createIndex('by-section', 'section');
        }
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

/** For tests only: forces a fresh database connection. */
export function resetDbConnection(): void {
  dbPromise = null;
}

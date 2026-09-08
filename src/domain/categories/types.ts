export interface Category {
  id: string;
  name: string;
  order: number;
  archived: boolean;
}

export const STARTER_CATEGORIES: Omit<Category, 'id'>[] = [
  'Housing',
  'Utilities',
  'Groceries',
  'Transportation',
  'Insurance',
  'Medical',
  'Debt',
  'Subscriptions',
  'Household',
  'Dining',
  'Entertainment',
  'Personal',
  'Pets',
  'Children / Family',
  'Savings',
  'Miscellaneous',
].map((name, i) => ({ name, order: i, archived: false }));

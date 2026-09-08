import { Owner } from '../splits/types';
import { Split } from '../splits/types';

export type ExpenseSection = 'bill' | 'planned' | 'familyFun' | 'savings';

export interface ExpenseEntry {
  id: string;
  monthId: string;
  section: ExpenseSection;
  name: string;
  /** Category is optional for familyFun and savings sections. */
  categoryId: string | null;
  amountCents: number;
  owner: Owner;
  split: Split;
  recurring: boolean;
  /** Day of month (1-31), optional, used for bills. */
  dueDay: number | null;
  notes: string;
  templateId: string | null;
}

export interface ExpenseTemplate {
  id: string;
  section: ExpenseSection;
  name: string;
  categoryId: string | null;
  defaultAmountCents: number;
  owner: Owner;
  split: Split;
  recurring: boolean;
  dueDay: number | null;
  archived: boolean;
}

import { PersonId } from '../splits/types';

export interface IncomeEntry {
  id: string;
  monthId: string;
  description: string;
  person: PersonId;
  amountCents: number;
  recurring: boolean;
  notes: string;
  templateId: string | null;
}

export interface IncomeTemplate {
  id: string;
  description: string;
  person: PersonId;
  defaultAmountCents: number;
  archived: boolean;
}

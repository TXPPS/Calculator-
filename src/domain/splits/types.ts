export type PersonId = 'person1' | 'person2';
export type Owner = PersonId | 'both';

export type SplitMethod = 'even' | 'percentage' | 'exact' | 'incomeProportional';

export interface EvenSplit {
  method: 'even';
}

export interface PercentageSplit {
  method: 'percentage';
  /** person1 percentage, 0-100. person2 is derived as 100 - person1Percent. */
  person1Percent: number;
}

export interface ExactSplit {
  method: 'exact';
  /** Exact cents assigned to person1. person2 = total - person1Cents. */
  person1Cents: number;
}

export interface IncomeProportionalSplit {
  method: 'incomeProportional';
}

export type Split = EvenSplit | PercentageSplit | ExactSplit | IncomeProportionalSplit;

export function defaultSplitFor(method: SplitMethod): Split {
  switch (method) {
    case 'even':
      return { method: 'even' };
    case 'percentage':
      return { method: 'percentage', person1Percent: 50 };
    case 'exact':
      return { method: 'exact', person1Cents: 0 };
    case 'incomeProportional':
      return { method: 'incomeProportional' };
  }
}

import { Cents, subtractCents } from '../money/money';
import { PlanSummary } from './planCalculations';

export interface PlanComparison {
  incomeDeltaCents: Cents;
  billsDeltaCents: Cents;
  plannedDeltaCents: Cents;
  familyFunDeltaCents: Cents;
  savingsDeltaCents: Cents;
  remainingDeltaCents: Cents;
}

export function comparePlanSummaries(current: PlanSummary, previous: PlanSummary): PlanComparison {
  return {
    incomeDeltaCents: subtractCents(current.income.householdCents, previous.income.householdCents),
    billsDeltaCents: subtractCents(current.bills.householdCents, previous.bills.householdCents),
    plannedDeltaCents: subtractCents(current.planned.householdCents, previous.planned.householdCents),
    familyFunDeltaCents: subtractCents(
      current.familyFun.householdCents,
      previous.familyFun.householdCents
    ),
    savingsDeltaCents: subtractCents(current.savings.householdCents, previous.savings.householdCents),
    remainingDeltaCents: subtractCents(
      current.remaining.householdCents,
      previous.remaining.householdCents
    ),
  };
}

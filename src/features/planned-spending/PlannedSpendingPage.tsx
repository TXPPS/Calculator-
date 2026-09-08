import { ExpenseSectionPage } from '../../components/shared/ExpenseSectionPage';

export function PlannedSpendingPage() {
  return (
    <ExpenseSectionPage
      section="planned"
      heading="Planned Spending"
      description="Expected variable spending — groceries, fuel, dining, household items, and other planned purchases."
      requireCategory
      addLabel="Add planned spending"
      emptyTitle="No planned spending yet"
      emptyMessage="Add expected variable spending like groceries or fuel to plan for this month."
    />
  );
}

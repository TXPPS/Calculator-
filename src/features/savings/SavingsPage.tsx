import { ExpenseSectionPage } from '../../components/shared/ExpenseSectionPage';

export function SavingsPage() {
  return (
    <ExpenseSectionPage
      section="savings"
      heading="Savings"
      description="Money being set aside this month — emergency fund, vacation, home repairs, and other savings goals."
      requireCategory={false}
      addLabel="Add savings goal"
      emptyTitle="No savings entries yet"
      emptyMessage="Add a savings goal like Emergency Fund or Vacation to plan this month's contributions."
    />
  );
}

import { ExpenseSectionPage } from '../../components/shared/ExpenseSectionPage';

export function BillsPage() {
  return (
    <ExpenseSectionPage
      section="bill"
      heading="Required Bills"
      description="Fixed, must-pay bills for the month — housing, utilities, insurance, debt payments, and more."
      requireCategory
      showDueDay
      addLabel="Add bill"
      emptyTitle="No bills yet"
      emptyMessage="Add your first required bill to start building this month's plan."
    />
  );
}

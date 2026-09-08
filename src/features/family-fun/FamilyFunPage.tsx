import { ExpenseSectionPage } from '../../components/shared/ExpenseSectionPage';

export function FamilyFunPage() {
  return (
    <ExpenseSectionPage
      section="familyFun"
      heading="Family Fun Fund"
      description="Money set aside for enjoying life together. Keep it as one simple total, or break it into date night, outings, and open fun money — whatever works for you."
      requireCategory={false}
      addLabel="Add fun fund item"
      emptyTitle="No Family Fun Fund yet"
      emptyMessage="Add a single monthly total, or split it into a few fun categories like Date Night or Open Fun Money."
    />
  );
}

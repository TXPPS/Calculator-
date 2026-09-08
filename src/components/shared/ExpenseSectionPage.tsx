import { useMemo, useState } from 'react';
import { ExpenseEntry, ExpenseSection } from '../../domain/expenses/types';
import { expenseRepository } from '../../data/repositories/expenseRepository';
import { useAppData } from '../../context/AppDataContext';
import { ExpenseEntryForm, ExpenseFormValues } from './ExpenseEntryForm';
import { ExpenseEntryList } from './ExpenseEntryList';
import { EmptyState } from './EmptyState';
import { Money } from './Money';

interface ExpenseSectionPageProps {
  section: ExpenseSection;
  heading: string;
  description: string;
  requireCategory?: boolean;
  showDueDay?: boolean;
  addLabel: string;
  emptyTitle: string;
  emptyMessage: string;
}

type OwnerFilter = 'all' | 'person1' | 'person2' | 'both';

export function ExpenseSectionPage({
  section,
  heading,
  description,
  requireCategory = true,
  showDueDay = false,
  addLabel,
  emptyTitle,
  emptyMessage,
}: ExpenseSectionPageProps) {
  const { selectedMonth, expenseEntries, refreshEntries, household, categories } = useAppData();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseEntry | undefined>(undefined);
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const sectionEntries = useMemo(
    () => expenseEntries.filter((e) => e.section === section),
    [expenseEntries, section]
  );

  const filtered = useMemo(() => {
    return sectionEntries
      .filter((e) => ownerFilter === 'all' || e.owner === ownerFilter)
      .filter((e) => categoryFilter === 'all' || e.categoryId === categoryFilter)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [sectionEntries, ownerFilter, categoryFilter]);

  const totalCents = sectionEntries.reduce((sum, e) => sum + e.amountCents, 0);

  if (!selectedMonth) {
    return (
      <EmptyState
        title="No month selected"
        message="Create or select a monthly plan first from the Months page."
      />
    );
  }

  const handleSave = async (values: ExpenseFormValues) => {
    if (editing) {
      await expenseRepository.save({ ...editing, ...values });
    } else {
      await expenseRepository.create({ monthId: selectedMonth.id, section, templateId: null, ...values });
    }
    await refreshEntries();
  };

  const usedCategoryIds = new Set(sectionEntries.map((e) => e.categoryId).filter(Boolean) as string[]);
  const filterCategories = categories.filter((c) => usedCategoryIds.has(c.id));

  return (
    <section className="page">
      <header className="page__header">
        <div>
          <h1>{heading}</h1>
          <p className="page__description">{description}</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          {addLabel}
        </button>
      </header>

      <div className="card summary-strip">
        <span>Total</span>
        <Money cents={totalCents} className="summary-strip__amount" />
      </div>

      {sectionEntries.length > 0 && (
        <div className="filter-bar">
          <label className="field field--inline">
            <span className="field__label">Owner</span>
            <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value as OwnerFilter)}>
              <option value="all">All</option>
              <option value="person1">{household.personNames.person1}</option>
              <option value="person2">{household.personNames.person2}</option>
              <option value="both">Shared</option>
            </select>
          </label>
          {filterCategories.length > 0 && (
            <label className="field field--inline">
              <span className="field__label">Category</span>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All</option>
                {filterCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {sectionEntries.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          message={emptyMessage}
          action={
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setEditing(undefined);
                setFormOpen(true);
              }}
            >
              {addLabel}
            </button>
          }
        />
      ) : (
        <ExpenseEntryList
          entries={filtered}
          onEdit={(entry) => {
            setEditing(entry);
            setFormOpen(true);
          }}
          onDuplicate={async (entry) => {
            await expenseRepository.duplicate(entry.id);
            await refreshEntries();
          }}
          onDelete={async (entry) => {
            await expenseRepository.delete(entry.id);
            await refreshEntries();
          }}
        />
      )}

      {formOpen && (
        <ExpenseEntryForm
          section={section}
          initial={editing}
          requireCategory={requireCategory}
          showDueDay={showDueDay}
          title={editing ? `Edit ${editing.name}` : addLabel}
          onSave={handleSave}
          onClose={() => setFormOpen(false)}
        />
      )}
    </section>
  );
}

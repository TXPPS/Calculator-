import { useMemo, useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { incomeRepository } from '../../data/repositories/incomeRepository';
import { IncomeEntry } from '../../domain/income/types';
import { PersonId } from '../../domain/splits/types';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { Money } from '../../components/shared/Money';
import { EmptyState } from '../../components/shared/EmptyState';
import { IncomeForm, IncomeFormValues } from './IncomeForm';
import { IncomeEntryCard } from './IncomeEntryCard';
import { QuickAddIncomeModal } from './QuickAddIncomeModal';
import { computeIncomeEntryForMonth } from '../../domain/income/incomeCalculations';

export function IncomePage() {
  const { selectedMonth, incomeEntries, refreshEntries, household, summary } = useAppData();
  const [formOpen, setFormOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeEntry | undefined>(undefined);
  const [formDefaultPerson, setFormDefaultPerson] = useState<PersonId>('person1');
  const [pendingDelete, setPendingDelete] = useState<IncomeEntry | null>(null);

  const byPerson = useMemo(() => {
    return {
      person1: incomeEntries.filter((e) => e.person === 'person1'),
      person2: incomeEntries.filter((e) => e.person === 'person2'),
    };
  }, [incomeEntries]);

  const threeCheckCount = useMemo(
    () => incomeEntries.filter((e) => e.incomeType === 'paycheck' && (e.expectedOccurrences ?? 0) >= 3).length,
    [incomeEntries]
  );

  if (!selectedMonth) {
    return <EmptyState title="No month selected" message="Create or select a monthly plan first." />;
  }

  const openAddForm = (personId: PersonId) => {
    setEditing(undefined);
    setFormDefaultPerson(personId);
    setFormOpen(true);
  };

  const renderColumn = (personId: PersonId) => {
    const entries = byPerson[personId];
    const label = household.personNames[personId];
    const total = personId === 'person1' ? summary.income.person1Cents : summary.income.person2Cents;
    return (
      <div className="card income-column">
        <div className="income-column__header">
          <h2>{label}</h2>
          <Money cents={total} className="income-column__total" />
        </div>
        {entries.length === 0 ? (
          <p className="income-column__empty">No income sources yet.</p>
        ) : (
          <ul className="entry-list">
            {entries.map((entry) => (
              <IncomeEntryCard
                key={entry.id}
                entry={entry}
                onEdit={() => {
                  setEditing(entry);
                  setFormOpen(true);
                }}
                onDelete={() => setPendingDelete(entry)}
              />
            ))}
          </ul>
        )}
        <button type="button" className="btn btn--secondary" onClick={() => openAddForm(personId)}>
          Add income for {label}
        </button>
      </div>
    );
  };

  return (
    <section className="page">
      <header className="page__header">
        <div>
          <h1>Income</h1>
          <p className="page__description">Expected income for this month, per person.</p>
        </div>
        <div className="page__header-actions">
          <button type="button" className="btn btn--secondary" onClick={() => setQuickAddOpen(true)}>
            Add from template
          </button>
          <button type="button" className="btn btn--primary" onClick={() => openAddForm('person1')}>
            Add income
          </button>
        </div>
      </header>

      <div className="card summary-strip">
        <span>Combined household income</span>
        <Money cents={summary.income.householdCents} className="summary-strip__amount" />
      </div>

      {threeCheckCount > 0 && (
        <p className="income-page__notice">
          {threeCheckCount} paycheck {threeCheckCount === 1 ? 'source has' : 'sources have'} 3 expected paychecks this
          month.
        </p>
      )}

      <div className="two-column">
        {renderColumn('person1')}
        {renderColumn('person2')}
      </div>

      {formOpen && (
        <IncomeForm
          initial={editing}
          defaultPerson={formDefaultPerson}
          monthKey={selectedMonth.monthKey}
          onSave={async (values: IncomeFormValues) => {
            if (editing) {
              await incomeRepository.save({ ...editing, ...values });
            } else {
              await incomeRepository.create({
                monthId: selectedMonth.id,
                templateId: null,
                ...values,
              });
            }
            await refreshEntries();
          }}
          onClose={() => setFormOpen(false)}
        />
      )}

      {quickAddOpen && (
        <QuickAddIncomeModal
          monthKey={selectedMonth.monthKey}
          onAdd={async (template) => {
            const computation =
              template.incomeType === 'paycheck' && template.paycheck
                ? computeIncomeEntryForMonth(
                    { incomeType: 'paycheck', paycheck: template.paycheck, isManualOverride: false, amountCents: 0, expectedOccurrences: null },
                    selectedMonth.monthKey
                  )
                : { amountCents: template.defaultAmountCents, calculatedAmountCents: null, expectedOccurrences: null, payDates: [] };
            await incomeRepository.create({
              monthId: selectedMonth.id,
              description: template.description,
              person: template.person,
              incomeType: template.incomeType,
              paycheck: template.paycheck,
              isManualOverride: false,
              recurring: template.recurring,
              notes: template.notes,
              templateId: template.id,
              ...computation,
            });
            await refreshEntries();
          }}
          onClose={() => setQuickAddOpen(false)}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete income entry?"
        message={`This will permanently delete "${pendingDelete?.description ?? ''}" from this month.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          if (pendingDelete) {
            await incomeRepository.delete(pendingDelete.id);
            await refreshEntries();
          }
          setPendingDelete(null);
        }}
      />
    </section>
  );
}

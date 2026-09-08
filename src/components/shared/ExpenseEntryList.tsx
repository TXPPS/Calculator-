import { useState } from 'react';
import { ExpenseEntry } from '../../domain/expenses/types';
import { useAppData } from '../../context/AppDataContext';
import { Money } from './Money';
import { ConfirmDialog } from './ConfirmDialog';
import { calculateSplit } from '../../domain/splits/calculateSplit';

interface ExpenseEntryListProps {
  entries: ExpenseEntry[];
  onEdit: (entry: ExpenseEntry) => void;
  onDuplicate: (entry: ExpenseEntry) => void;
  onDelete: (entry: ExpenseEntry) => void;
}

export function ExpenseEntryList({ entries, onEdit, onDuplicate, onDelete }: ExpenseEntryListProps) {
  const { household, categories, summary } = useAppData();
  const [pendingDelete, setPendingDelete] = useState<ExpenseEntry | null>(null);

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? null;

  const ownerLabel = (entry: ExpenseEntry) => {
    if (entry.owner === 'person1') return household.personNames.person1;
    if (entry.owner === 'person2') return household.personNames.person2;
    return 'Both';
  };

  const splitCtx = {
    person1IncomeCents: summary.income.person1Cents,
    person2IncomeCents: summary.income.person2Cents,
  };

  return (
    <>
      <ul className="entry-list">
        {entries.map((entry) => {
          const shared = entry.owner === 'both';
          const result = shared ? calculateSplit(entry.amountCents, entry.split, splitCtx) : null;
          return (
            <li key={entry.id} className="entry-card">
              <div className="entry-card__main">
                <div className="entry-card__title-row">
                  <span className="entry-card__name">{entry.name}</span>
                  <Money cents={entry.amountCents} className="entry-card__amount" />
                </div>
                <div className="entry-card__meta">
                  {categoryName(entry.categoryId) && (
                    <span className="chip">{categoryName(entry.categoryId)}</span>
                  )}
                  <span className={`chip chip--owner-${entry.owner}`}>{ownerLabel(entry)}</span>
                  {entry.recurring && <span className="chip chip--muted">Recurring</span>}
                  {entry.dueDay && <span className="chip chip--muted">Due day {entry.dueDay}</span>}
                </div>
                {shared && result && (
                  <p className="entry-card__split">
                    {result.error ? (
                      <span role="alert" className="split-preview__error">
                        {result.error}
                      </span>
                    ) : (
                      <>
                        {household.personNames.person1} <Money cents={result.person1Cents} /> ·{' '}
                        {household.personNames.person2} <Money cents={result.person2Cents} />
                      </>
                    )}
                  </p>
                )}
                {entry.notes && <p className="entry-card__notes">{entry.notes}</p>}
              </div>
              <div className="entry-card__actions">
                <button type="button" className="btn btn--small" onClick={() => onEdit(entry)}>
                  Edit
                </button>
                <button type="button" className="btn btn--small" onClick={() => onDuplicate(entry)}>
                  Duplicate
                </button>
                <button
                  type="button"
                  className="btn btn--small btn--danger-ghost"
                  onClick={() => setPendingDelete(entry)}
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete entry?"
        message={`This will permanently delete "${pendingDelete?.name ?? ''}" from this month.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </>
  );
}

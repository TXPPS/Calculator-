import { FormEvent, useMemo, useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { incomeRepository } from '../../data/repositories/incomeRepository';
import { IncomeEntry } from '../../domain/income/types';
import { PersonId } from '../../domain/splits/types';
import { Modal } from '../../components/shared/Modal';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { CurrencyInput } from '../../components/shared/CurrencyInput';
import { Money } from '../../components/shared/Money';
import { EmptyState } from '../../components/shared/EmptyState';
import { validateAmountCents, validateName } from '../../domain/calculations/validation';

function IncomeForm({
  initial,
  defaultPerson,
  onSave,
  onClose,
}: {
  initial?: IncomeEntry;
  defaultPerson?: PersonId;
  onSave: (values: Omit<IncomeEntry, 'id' | 'monthId' | 'templateId'>) => Promise<void>;
  onClose: () => void;
}) {
  const { household } = useAppData();
  const [description, setDescription] = useState(initial?.description ?? '');
  const [person, setPerson] = useState<PersonId>(initial?.person ?? defaultPerson ?? 'person1');
  const [amountCents, setAmountCents] = useState(initial?.amountCents ?? 0);
  const [recurring, setRecurring] = useState(initial?.recurring ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nameCheck = validateName(description);
    const amountCheck = validateAmountCents(amountCents);
    const found = [nameCheck, amountCheck].filter((r) => !r.valid);
    if (found.length > 0) {
      setErrors(found.map((r) => r.error!).filter(Boolean));
      return;
    }
    setSaving(true);
    try {
      await onSave({ description: description.trim(), person, amountCents, recurring, notes });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="income-form-title">
      <h2 id="income-form-title">{initial ? 'Edit income' : 'Add income'}</h2>
      {errors.length > 0 && (
        <ul className="form-errors" role="alert">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}
      <form className="entry-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">Description</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Paycheck 1"
            required
          />
        </label>
        <fieldset className="owner-fieldset">
          <legend>Person</legend>
          <div className="owner-options">
            <label className="owner-option">
              <input type="radio" checked={person === 'person1'} onChange={() => setPerson('person1')} />
              {household.personNames.person1}
            </label>
            <label className="owner-option">
              <input type="radio" checked={person === 'person2'} onChange={() => setPerson('person2')} />
              {household.personNames.person2}
            </label>
          </div>
        </fieldset>
        <label className="field">
          <span className="field__label">Expected amount this month</span>
          <CurrencyInput cents={amountCents} onChange={setAmountCents} />
        </label>
        <label className="field field--checkbox">
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
          <span>Recurring — carry forward when copying to a new month</span>
        </label>
        <label className="field">
          <span className="field__label">Notes (optional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </label>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function IncomePage() {
  const { selectedMonth, incomeEntries, refreshEntries, household, summary } = useAppData();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeEntry | undefined>(undefined);
  const [pendingDelete, setPendingDelete] = useState<IncomeEntry | null>(null);

  const byPerson = useMemo(() => {
    return {
      person1: incomeEntries.filter((e) => e.person === 'person1'),
      person2: incomeEntries.filter((e) => e.person === 'person2'),
    };
  }, [incomeEntries]);

  if (!selectedMonth) {
    return <EmptyState title="No month selected" message="Create or select a monthly plan first." />;
  }

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
              <li key={entry.id} className="entry-card">
                <div className="entry-card__main">
                  <div className="entry-card__title-row">
                    <span className="entry-card__name">{entry.description}</span>
                    <Money cents={entry.amountCents} className="entry-card__amount" />
                  </div>
                  <div className="entry-card__meta">
                    {entry.recurring && <span className="chip chip--muted">Recurring</span>}
                  </div>
                  {entry.notes && <p className="entry-card__notes">{entry.notes}</p>}
                </div>
                <div className="entry-card__actions">
                  <button
                    type="button"
                    className="btn btn--small"
                    onClick={() => {
                      setEditing(entry);
                      setFormOpen(true);
                    }}
                  >
                    Edit
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
            ))}
          </ul>
        )}
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => {
            setEditing({ person: personId } as IncomeEntry);
            setFormOpen(true);
          }}
        >
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
      </header>

      <div className="card summary-strip">
        <span>Combined household income</span>
        <Money cents={summary.income.householdCents} className="summary-strip__amount" />
      </div>

      <div className="two-column">
        {renderColumn('person1')}
        {renderColumn('person2')}
      </div>

      {formOpen && (
        <IncomeForm
          initial={editing?.id ? editing : undefined}
          defaultPerson={editing?.person}
          onSave={async (values) => {
            if (editing?.id) {
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

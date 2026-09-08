import { FormEvent, useState } from 'react';
import { Modal } from './Modal';
import { CurrencyInput } from './CurrencyInput';
import { CategorySelect } from './CategorySelect';
import { SplitEditor } from './SplitEditor';
import { ExpenseEntry, ExpenseSection } from '../../domain/expenses/types';
import { Owner, Split, defaultSplitFor } from '../../domain/splits/types';
import { validateAmountCents, validateDueDay, validateName } from '../../domain/calculations/validation';
import { useAppData } from '../../context/AppDataContext';

export interface ExpenseFormValues {
  name: string;
  categoryId: string | null;
  amountCents: number;
  owner: Owner;
  split: Split;
  recurring: boolean;
  dueDay: number | null;
  notes: string;
}

interface ExpenseEntryFormProps {
  section: ExpenseSection;
  initial?: ExpenseEntry;
  requireCategory?: boolean;
  showDueDay?: boolean;
  title: string;
  onSave: (values: ExpenseFormValues) => Promise<void>;
  onClose: () => void;
}

export function ExpenseEntryForm({
  section,
  initial,
  requireCategory = true,
  showDueDay = false,
  title,
  onSave,
  onClose,
}: ExpenseEntryFormProps) {
  const { household } = useAppData();
  void section;
  const [name, setName] = useState(initial?.name ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [amountCents, setAmountCents] = useState(initial?.amountCents ?? 0);
  const [owner, setOwner] = useState<Owner>(initial?.owner ?? 'both');
  const [split, setSplit] = useState<Split>(
    initial?.split ?? defaultSplitFor(household.defaultSplitMethod)
  );
  const [recurring, setRecurring] = useState(initial?.recurring ?? true);
  const [dueDay, setDueDay] = useState<number | null>(initial?.dueDay ?? null);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nameCheck = validateName(name);
    const amountCheck = validateAmountCents(amountCents);
    const dueDayCheck = showDueDay ? validateDueDay(dueDay) : { valid: true };
    const categoryCheck =
      requireCategory && !categoryId ? { valid: false, error: 'Please select a category.' } : { valid: true };

    const found = [nameCheck, amountCheck, dueDayCheck, categoryCheck].filter((r) => !r.valid);
    if (found.length > 0) {
      setErrors(found.map((r) => r.error!).filter(Boolean));
      return;
    }

    setSaving(true);
    try {
      await onSave({ name: name.trim(), categoryId, amountCents, owner, split, recurring, dueDay, notes });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="expense-form-title">
      <h2 id="expense-form-title">{title}</h2>
      {errors.length > 0 && (
        <ul className="form-errors" role="alert">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="entry-form">
        <label className="field">
          <span className="field__label">Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>

        {requireCategory && (
          <label className="field">
            <span className="field__label">Category</span>
            <CategorySelect value={categoryId} onChange={setCategoryId} required />
          </label>
        )}
        {!requireCategory && (
          <label className="field">
            <span className="field__label">Category (optional)</span>
            <CategorySelect value={categoryId} onChange={setCategoryId} />
          </label>
        )}

        <label className="field">
          <span className="field__label">Amount</span>
          <CurrencyInput cents={amountCents} onChange={setAmountCents} />
        </label>

        {showDueDay && (
          <label className="field field--inline">
            <span className="field__label">Due day of month (optional)</span>
            <input
              type="number"
              min={1}
              max={31}
              value={dueDay ?? ''}
              onChange={(e) => setDueDay(e.target.value ? Number(e.target.value) : null)}
            />
          </label>
        )}

        <SplitEditor owner={owner} onOwnerChange={setOwner} split={split} onSplitChange={setSplit} amountCents={amountCents} />

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

import { FormEvent, useState } from 'react';
import { Modal } from '../../components/shared/Modal';
import { CurrencyInput } from '../../components/shared/CurrencyInput';
import { CategorySelect } from '../../components/shared/CategorySelect';
import { SplitEditor } from '../../components/shared/SplitEditor';
import { ExpenseSection, ExpenseTemplate } from '../../domain/expenses/types';
import { Owner, Split, defaultSplitFor } from '../../domain/splits/types';
import { useAppData } from '../../context/AppDataContext';
import { validateAmountCents, validateDueDay, validateName } from '../../domain/calculations/validation';

export type ExpenseTemplateValues = Omit<ExpenseTemplate, 'id' | 'archived' | 'section'>;

interface ExpenseTemplateFormProps {
  section: ExpenseSection;
  initial?: ExpenseTemplate;
  requireCategory?: boolean;
  showDueDay?: boolean;
  onSave: (values: ExpenseTemplateValues) => Promise<void>;
  onClose: () => void;
}

export function ExpenseTemplateForm({
  section,
  initial,
  requireCategory = false,
  showDueDay = false,
  onSave,
  onClose,
}: ExpenseTemplateFormProps) {
  const { household } = useAppData();
  void section;
  const [name, setName] = useState(initial?.name ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [amountCents, setAmountCents] = useState(initial?.defaultAmountCents ?? 0);
  const [owner, setOwner] = useState<Owner>(initial?.owner ?? 'both');
  const [split, setSplit] = useState<Split>(initial?.split ?? defaultSplitFor(household.defaultSplitMethod));
  const [dueDay, setDueDay] = useState<number | null>(initial?.dueDay ?? null);
  const [recurring, setRecurring] = useState(initial?.recurring ?? true);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found: string[] = [];
    const nameCheck = validateName(name);
    if (!nameCheck.valid) found.push(nameCheck.error!);
    const amountCheck = validateAmountCents(amountCents);
    if (!amountCheck.valid) found.push(amountCheck.error!);
    if (showDueDay) {
      const dueDayCheck = validateDueDay(dueDay);
      if (!dueDayCheck.valid) found.push(dueDayCheck.error!);
    }
    if (requireCategory && !categoryId) found.push('Please select a category.');
    if (found.length > 0) {
      setErrors(found);
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        categoryId,
        defaultAmountCents: amountCents,
        owner,
        split,
        recurring,
        dueDay,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="expense-template-form-title">
      <h2 id="expense-template-form-title">{initial ? 'Edit template' : 'New template'}</h2>
      {errors.length > 0 && (
        <ul className="form-errors" role="alert">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}
      <form className="entry-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="field">
          <span className="field__label">{requireCategory ? 'Category' : 'Category (optional)'}</span>
          <CategorySelect value={categoryId} onChange={setCategoryId} required={requireCategory} />
        </label>
        <label className="field">
          <span className="field__label">Default amount</span>
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
          <span>Recurring by default</span>
        </label>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

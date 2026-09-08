import { FormEvent, useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { Modal } from '../../components/shared/Modal';
import { CurrencyInput } from '../../components/shared/CurrencyInput';
import { PaycheckScheduleFields } from '../income/PaycheckScheduleFields';
import { IncomeTemplate, IncomeType } from '../../domain/income/types';
import { PersonId } from '../../domain/splits/types';
import { defaultPaycheckSchedule, PaycheckSchedule } from '../../domain/income/payFrequency';
import { paycheckScheduleIsComplete } from '../../domain/income/incomeCalculations';
import { validateAmountCents, validateName } from '../../domain/calculations/validation';

export type IncomeTemplateValues = Omit<IncomeTemplate, 'id' | 'archived'>;

const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  paycheck: 'Paycheck',
  otherRecurring: 'Other Recurring Income',
  oneTime: 'One-Time Income',
  irregular: 'Irregular / Custom Income',
};

interface IncomeTemplateFormProps {
  initial?: IncomeTemplate;
  onSave: (values: IncomeTemplateValues) => Promise<void>;
  onClose: () => void;
}

export function IncomeTemplateForm({ initial, onSave, onClose }: IncomeTemplateFormProps) {
  const { household } = useAppData();
  const [description, setDescription] = useState(initial?.description ?? '');
  const [person, setPerson] = useState<PersonId>(initial?.person ?? 'person1');
  const [incomeType, setIncomeType] = useState<IncomeType>(initial?.incomeType ?? 'irregular');
  const [amountCents, setAmountCents] = useState(initial?.defaultAmountCents ?? 0);
  const [schedule, setSchedule] = useState<PaycheckSchedule>(
    initial?.paycheck ?? defaultPaycheckSchedule('biweekly')
  );
  const [recurring, setRecurring] = useState(initial?.recurring ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found: string[] = [];
    const nameCheck = validateName(description);
    if (!nameCheck.valid) found.push(nameCheck.error!);
    if (incomeType === 'paycheck') {
      if (!paycheckScheduleIsComplete(schedule)) found.push('Please complete the paycheck schedule.');
      const amountCheck = validateAmountCents(schedule.perPaycheckCents);
      if (!amountCheck.valid) found.push(`Take-home per paycheck: ${amountCheck.error}`);
    } else {
      const amountCheck = validateAmountCents(amountCents);
      if (!amountCheck.valid) found.push(amountCheck.error!);
    }
    if (found.length > 0) {
      setErrors(found);
      return;
    }
    setSaving(true);
    try {
      await onSave({
        description: description.trim(),
        person,
        incomeType,
        defaultAmountCents: incomeType === 'paycheck' ? schedule.perPaycheckCents : amountCents,
        paycheck: incomeType === 'paycheck' ? schedule : null,
        recurring,
        notes,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="income-template-form-title">
      <h2 id="income-template-form-title">{initial ? 'Edit income template' : 'New income template'}</h2>
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
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required />
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
          <span className="field__label">Income type</span>
          <select value={incomeType} onChange={(e) => setIncomeType(e.target.value as IncomeType)}>
            {(Object.keys(INCOME_TYPE_LABELS) as IncomeType[]).map((t) => (
              <option key={t} value={t}>
                {INCOME_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        {incomeType === 'paycheck' ? (
          <>
            <label className="field">
              <span className="field__label">Take-home amount per paycheck</span>
              <CurrencyInput
                cents={schedule.perPaycheckCents}
                onChange={(cents) => setSchedule({ ...schedule, perPaycheckCents: cents })}
              />
            </label>
            <PaycheckScheduleFields schedule={schedule} onChange={setSchedule} />
          </>
        ) : (
          <label className="field">
            <span className="field__label">Default amount</span>
            <CurrencyInput cents={amountCents} onChange={setAmountCents} />
          </label>
        )}

        <label className="field field--checkbox">
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
          <span>Recurring by default</span>
        </label>

        <label className="field">
          <span className="field__label">Default notes (optional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
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

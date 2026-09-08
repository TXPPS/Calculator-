import { FormEvent, useMemo, useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { Modal } from '../../components/shared/Modal';
import { CurrencyInput } from '../../components/shared/CurrencyInput';
import { Money } from '../../components/shared/Money';
import { PaycheckScheduleFields } from './PaycheckScheduleFields';
import { IncomeEntry, IncomeType } from '../../domain/income/types';
import { PersonId } from '../../domain/splits/types';
import { MonthKey } from '../../domain/monthly-plan/types';
import { defaultPaycheckSchedule, formatPayDateShort, PaycheckSchedule } from '../../domain/income/payFrequency';
import { calculateScheduleForMonth } from '../../domain/income/payFrequency';
import { paycheckScheduleIsComplete } from '../../domain/income/incomeCalculations';
import { validateAmountCents, validateName } from '../../domain/calculations/validation';

export type IncomeFormValues = Omit<IncomeEntry, 'id' | 'monthId' | 'templateId'>;

const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  paycheck: 'Paycheck',
  otherRecurring: 'Other Recurring Income',
  oneTime: 'One-Time Income',
  irregular: 'Irregular / Custom Income',
};

interface IncomeFormProps {
  initial?: IncomeEntry;
  defaultPerson?: PersonId;
  monthKey: MonthKey;
  onSave: (values: IncomeFormValues) => Promise<void>;
  onClose: () => void;
}

export function IncomeForm({ initial, defaultPerson, monthKey, onSave, onClose }: IncomeFormProps) {
  const { household } = useAppData();
  const [description, setDescription] = useState(initial?.description ?? '');
  const [person, setPerson] = useState<PersonId>(initial?.person ?? defaultPerson ?? 'person1');
  const [incomeType, setIncomeType] = useState<IncomeType>(initial?.incomeType ?? 'irregular');

  // Non-paycheck amount (otherRecurring / oneTime / irregular).
  const [amountCents, setAmountCents] = useState(initial && initial.incomeType !== 'paycheck' ? initial.amountCents : 0);

  // Paycheck schedule state.
  const [schedule, setSchedule] = useState<PaycheckSchedule>(
    initial?.paycheck ?? defaultPaycheckSchedule('biweekly')
  );
  const [isManualOverride, setIsManualOverride] = useState(initial?.isManualOverride ?? false);
  const [overrideOccurrences, setOverrideOccurrences] = useState(initial?.expectedOccurrences ?? 0);
  const [overrideAmountCents, setOverrideAmountCents] = useState(initial?.amountCents ?? 0);

  const [recurring, setRecurring] = useState(initial?.recurring ?? incomeType !== 'oneTime');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const scheduleCalc = useMemo(() => {
    if (incomeType !== 'paycheck' || !paycheckScheduleIsComplete(schedule)) return null;
    return calculateScheduleForMonth(schedule, monthKey);
  }, [incomeType, schedule, monthKey]);

  const handleTypeChange = (next: IncomeType) => {
    setIncomeType(next);
    if (next === 'oneTime') setRecurring(false);
    if (next !== 'oneTime' && incomeType === 'oneTime') setRecurring(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found: string[] = [];
    const nameCheck = validateName(description);
    if (!nameCheck.valid) found.push(nameCheck.error!);

    if (incomeType === 'paycheck') {
      if (!paycheckScheduleIsComplete(schedule)) {
        found.push('Please complete the paycheck schedule (a payday, or semi-monthly/monthly day).');
      }
      const amountCheck = validateAmountCents(schedule.perPaycheckCents);
      if (!amountCheck.valid) found.push(`Take-home per paycheck: ${amountCheck.error}`);
      if (isManualOverride) {
        const overrideCheck = validateAmountCents(overrideAmountCents);
        if (!overrideCheck.valid) found.push(`Selected-month total: ${overrideCheck.error}`);
        if (!Number.isFinite(overrideOccurrences) || overrideOccurrences < 0) {
          found.push('Expected paychecks this month must be zero or more.');
        }
      }
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
      let values: IncomeFormValues;
      if (incomeType === 'paycheck') {
        const calc = scheduleCalc ?? { payDates: [], occurrences: 0, calculatedAmountCents: 0 };
        values = {
          description: description.trim(),
          person,
          incomeType,
          amountCents: isManualOverride ? overrideAmountCents : calc.calculatedAmountCents,
          paycheck: schedule,
          isManualOverride,
          calculatedAmountCents: calc.calculatedAmountCents,
          expectedOccurrences: isManualOverride ? overrideOccurrences : calc.occurrences,
          payDates: calc.payDates,
          recurring,
          notes,
        };
      } else {
        values = {
          description: description.trim(),
          person,
          incomeType,
          amountCents,
          paycheck: null,
          isManualOverride: false,
          calculatedAmountCents: null,
          expectedOccurrences: null,
          payDates: [],
          recurring,
          notes,
        };
      }
      await onSave(values);
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
            placeholder="e.g. Main Job"
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
          <span className="field__label">Income type</span>
          <select value={incomeType} onChange={(e) => handleTypeChange(e.target.value as IncomeType)}>
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

            <div className="paycheck-preview">
              {scheduleCalc ? (
                <>
                  <p>
                    <strong>{scheduleCalc.occurrences}</strong>{' '}
                    {scheduleCalc.occurrences === 1 ? 'paycheck' : 'paychecks'} expected this month
                    {scheduleCalc.payDates.length > 0 && <> ({scheduleCalc.payDates.map(formatPayDateShort).join(', ')})</>}
                  </p>
                  <p>
                    Calculated total: <Money cents={scheduleCalc.calculatedAmountCents} />
                  </p>
                </>
              ) : (
                <p className="field__hint">Complete the schedule above to calculate this month's total.</p>
              )}
            </div>

            <label className="field field--checkbox">
              <input
                type="checkbox"
                checked={isManualOverride}
                onChange={(e) => {
                  setIsManualOverride(e.target.checked);
                  if (e.target.checked && scheduleCalc) {
                    setOverrideOccurrences(scheduleCalc.occurrences);
                    setOverrideAmountCents(scheduleCalc.calculatedAmountCents);
                  }
                }}
              />
              <span>Override the calculated count/total for this month</span>
            </label>

            {isManualOverride && (
              <div className="split-config">
                <p className="field__hint">Manually overridden — this month will not use the automatic calculation.</p>
                <div className="split-percentage-row">
                  <label className="field field--inline">
                    <span className="field__label">Expected paychecks this month</span>
                    <input
                      type="number"
                      min={0}
                      value={overrideOccurrences}
                      onChange={(e) => setOverrideOccurrences(Number(e.target.value))}
                    />
                  </label>
                  <label className="field field--inline">
                    <span className="field__label">Selected-month total</span>
                    <CurrencyInput cents={overrideAmountCents} onChange={setOverrideAmountCents} />
                  </label>
                </div>
                <button
                  type="button"
                  className="btn btn--small"
                  onClick={() => {
                    setIsManualOverride(false);
                  }}
                >
                  Return to automatic calculation
                </button>
              </div>
            )}
          </>
        ) : (
          <label className="field">
            <span className="field__label">
              {incomeType === 'oneTime' ? 'Expected amount' : 'Expected amount this month'}
            </span>
            <CurrencyInput cents={amountCents} onChange={setAmountCents} />
          </label>
        )}

        {incomeType !== 'oneTime' && (
          <label className="field field--checkbox">
            <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
            <span>Recurring — carry forward when copying to a new month</span>
          </label>
        )}

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

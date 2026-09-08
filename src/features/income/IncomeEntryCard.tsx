import { IncomeEntry } from '../../domain/income/types';
import { Money } from '../../components/shared/Money';
import { formatPayDateShort } from '../../domain/income/payFrequency';

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  semiMonthly: 'Semi-Monthly',
  monthly: 'Monthly',
};

interface IncomeEntryCardProps {
  entry: IncomeEntry;
  onEdit: () => void;
  onDelete: () => void;
}

export function IncomeEntryCard({ entry, onEdit, onDelete }: IncomeEntryCardProps) {
  const isPaycheck = entry.incomeType === 'paycheck' && entry.paycheck;
  const isThreeCheckMonth = isPaycheck && (entry.expectedOccurrences ?? 0) >= 3;
  const changedFromCalculated =
    isPaycheck && entry.isManualOverride && entry.calculatedAmountCents !== null && entry.calculatedAmountCents !== entry.amountCents;

  return (
    <li className="entry-card income-entry-card">
      <div className="entry-card__main">
        <div className="entry-card__title-row">
          <span className="entry-card__name">{entry.description}</span>
          <Money cents={entry.amountCents} className="entry-card__amount" />
        </div>

        <div className="entry-card__meta">
          {entry.incomeType === 'paycheck' && entry.paycheck && (
            <span className="chip chip--muted">
              <Money cents={entry.paycheck.perPaycheckCents} /> / paycheck · {FREQUENCY_LABELS[entry.paycheck.frequency]}
            </span>
          )}
          {entry.incomeType === 'otherRecurring' && <span className="chip chip--muted">Other recurring</span>}
          {entry.incomeType === 'oneTime' && <span className="chip chip--muted">One-time</span>}
          {entry.incomeType === 'irregular' && <span className="chip chip--muted">Irregular</span>}
          {entry.recurring && entry.incomeType !== 'oneTime' && <span className="chip chip--muted">Recurring</span>}
          {entry.isManualOverride && <span className="chip chip--warning">Manually overridden</span>}
          {isThreeCheckMonth && <span className="chip chip--accent">3 paychecks this month</span>}
        </div>

        {isPaycheck && (
          <div className="income-entry-card__schedule">
            {entry.payDates.length > 0 && (
              <p className="income-entry-card__paydates">
                Expected pay dates: {entry.payDates.map(formatPayDateShort).join(', ')}
              </p>
            )}
            <p>
              {entry.expectedOccurrences ?? 0} {(entry.expectedOccurrences ?? 0) === 1 ? 'paycheck' : 'paychecks'} ·{' '}
              <Money cents={entry.amountCents} /> expected this month
              {changedFromCalculated && entry.calculatedAmountCents !== null && (
                <span className="field__hint">
                  {' '}
                  (calculated would be <Money cents={entry.calculatedAmountCents} />)
                </span>
              )}
            </p>
          </div>
        )}

        {entry.notes && <p className="entry-card__notes">{entry.notes}</p>}
      </div>
      <div className="entry-card__actions">
        <button type="button" className="btn btn--small" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="btn btn--small btn--danger-ghost" onClick={onDelete}>
          Delete
        </button>
      </div>
    </li>
  );
}

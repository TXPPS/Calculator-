import { Owner, Split, SplitMethod, defaultSplitFor } from '../../domain/splits/types';
import { calculateSplit } from '../../domain/splits/calculateSplit';
import { useAppData } from '../../context/AppDataContext';
import { CurrencyInput } from './CurrencyInput';
import { Money } from './Money';

interface SplitEditorProps {
  owner: Owner;
  onOwnerChange: (owner: Owner) => void;
  split: Split;
  onSplitChange: (split: Split) => void;
  amountCents: number;
}

const SPLIT_LABELS: Record<SplitMethod, string> = {
  even: '50 / 50',
  percentage: 'Custom percentage',
  exact: 'Exact dollar amount',
  incomeProportional: 'Proportional to income',
};

export function SplitEditor({ owner, onOwnerChange, split, onSplitChange, amountCents }: SplitEditorProps) {
  const { household, summary } = useAppData();
  const p1Name = household.personNames.person1;
  const p2Name = household.personNames.person2;

  const splitCtx = {
    person1IncomeCents: summary.income.person1Cents,
    person2IncomeCents: summary.income.person2Cents,
  };
  const result = owner === 'both' ? calculateSplit(amountCents, split, splitCtx) : null;

  return (
    <div className="split-editor">
      <fieldset className="owner-fieldset">
        <legend>Responsibility</legend>
        <div className="owner-options">
          <label className="owner-option">
            <input
              type="radio"
              name="owner"
              checked={owner === 'person1'}
              onChange={() => onOwnerChange('person1')}
            />
            {p1Name}
          </label>
          <label className="owner-option">
            <input
              type="radio"
              name="owner"
              checked={owner === 'person2'}
              onChange={() => onOwnerChange('person2')}
            />
            {p2Name}
          </label>
          <label className="owner-option">
            <input
              type="radio"
              name="owner"
              checked={owner === 'both'}
              onChange={() => onOwnerChange('both')}
            />
            Both
          </label>
        </div>
      </fieldset>

      {owner === 'both' && (
        <div className="split-config">
          <label className="field">
            <span className="field__label">Split method</span>
            <select
              value={split.method}
              onChange={(e) => onSplitChange(defaultSplitFor(e.target.value as SplitMethod))}
            >
              {(Object.keys(SPLIT_LABELS) as SplitMethod[]).map((m) => (
                <option key={m} value={m}>
                  {SPLIT_LABELS[m]}
                </option>
              ))}
            </select>
          </label>

          {split.method === 'percentage' && (
            <div className="split-percentage-row">
              <label className="field field--inline">
                <span className="field__label">{p1Name} %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={split.person1Percent}
                  onChange={(e) =>
                    onSplitChange({ method: 'percentage', person1Percent: Number(e.target.value) })
                  }
                />
              </label>
              <label className="field field--inline">
                <span className="field__label">{p2Name} %</span>
                <input type="number" value={Math.max(0, 100 - split.person1Percent)} disabled />
              </label>
            </div>
          )}

          {split.method === 'exact' && (
            <div className="split-percentage-row">
              <label className="field field--inline">
                <span className="field__label">{p1Name}</span>
                <CurrencyInput
                  cents={split.person1Cents}
                  onChange={(cents) => onSplitChange({ method: 'exact', person1Cents: cents })}
                />
              </label>
              <label className="field field--inline">
                <span className="field__label">{p2Name}</span>
                <CurrencyInput cents={amountCents - split.person1Cents} onChange={() => {}} />
              </label>
            </div>
          )}

          {result && (
            <p className="split-preview">
              {result.error ? (
                <span className="split-preview__error" role="alert">
                  {result.error}
                </span>
              ) : (
                <>
                  {p1Name} <Money cents={result.person1Cents} /> · {p2Name}{' '}
                  <Money cents={result.person2Cents} />
                </>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

import { FormEvent, useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { householdRepository } from '../../data/repositories/householdRepository';
import { validateName } from '../../domain/calculations/validation';

const CURRENCIES = [
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'CAD', label: 'Canadian Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'AUD', label: 'Australian Dollar ($)' },
];

export function HouseholdSettings() {
  const { household, refreshHousehold } = useAppData();
  const [person1Name, setPerson1Name] = useState(household.personNames.person1);
  const [person2Name, setPerson2Name] = useState(household.personNames.person2);
  const [appName, setAppName] = useState(household.appName);
  const [currency, setCurrency] = useState(household.currency);
  const [defaultSplitMethod, setDefaultSplitMethod] = useState(household.defaultSplitMethod);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const check1 = validateName(person1Name);
    const check2 = validateName(person2Name);
    if (!check1.valid || !check2.valid) {
      setError((check1.error ?? check2.error)!);
      return;
    }
    setError(null);
    await householdRepository.save({
      ...household,
      personNames: { person1: person1Name.trim(), person2: person2Name.trim() },
      appName: appName.trim() || 'Household Plan',
      currency,
      defaultSplitMethod,
    });
    await refreshHousehold();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <h2>Household</h2>
      {error && (
        <ul className="form-errors" role="alert">
          <li>{error}</li>
        </ul>
      )}
      <label className="field">
        <span className="field__label">Person 1 display name</span>
        <input type="text" value={person1Name} onChange={(e) => setPerson1Name(e.target.value)} required />
      </label>
      <label className="field">
        <span className="field__label">Person 2 display name</span>
        <input type="text" value={person2Name} onChange={(e) => setPerson2Name(e.target.value)} required />
      </label>
      <label className="field">
        <span className="field__label">App display name</span>
        <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)} />
      </label>
      <label className="field">
        <span className="field__label">Currency</span>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field__label">Default shared split method</span>
        <select
          value={defaultSplitMethod}
          onChange={(e) => setDefaultSplitMethod(e.target.value as typeof defaultSplitMethod)}
        >
          <option value="even">50 / 50</option>
          <option value="percentage">Custom percentage</option>
          <option value="incomeProportional">Proportional to income</option>
        </select>
        <span className="field__hint">Used as the starting point for new shared entries. Individual entries can override it.</span>
      </label>
      <div className="modal__actions modal__actions--inline">
        <button type="submit" className="btn btn--primary">
          Save household settings
        </button>
        {saved && <span className="save-confirmation">Saved.</span>}
      </div>
    </form>
  );
}

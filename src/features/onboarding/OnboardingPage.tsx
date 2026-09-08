import { FormEvent, useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { useTheme } from '../../context/ThemeContext';
import { householdRepository } from '../../data/repositories/householdRepository';
import { validateName, validateMonthKey } from '../../domain/calculations/validation';
import { currentMonthKey } from '../../domain/monthly-plan/types';
import { ThemePreference } from '../../data/database/schema';

export function OnboardingPage({ onComplete }: { onComplete: () => void }) {
  const { household, refreshHousehold, createNewMonth } = useAppData();
  const { theme, setTheme } = useTheme();
  const [person1Name, setPerson1Name] = useState('');
  const [person2Name, setPerson2Name] = useState('');
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const checks = [validateName(person1Name), validateName(person2Name), validateMonthKey(monthKey)];
    const failed = checks.filter((c) => !c.valid);
    if (failed.length > 0) {
      setErrors(failed.map((c) => c.error!).filter(Boolean));
      return;
    }
    setSaving(true);
    try {
      await householdRepository.save({
        ...household,
        personNames: { person1: person1Name.trim(), person2: person2Name.trim() },
        onboardingComplete: true,
      });
      await refreshHousehold();
      await createNewMonth(monthKey, null);
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="onboarding">
      <div className="card onboarding__card">
        <h1>Welcome</h1>
        <p className="page__description">
          Let's set up your household plan. You can change any of this later in Admin.
        </p>
        {errors.length > 0 && (
          <ul className="form-errors" role="alert">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}
        <form className="entry-form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">Person 1 name</span>
            <input type="text" value={person1Name} onChange={(e) => setPerson1Name(e.target.value)} required />
          </label>
          <label className="field">
            <span className="field__label">Person 2 name</span>
            <input type="text" value={person2Name} onChange={(e) => setPerson2Name(e.target.value)} required />
          </label>
          <label className="field">
            <span className="field__label">First month to plan</span>
            <input type="month" value={monthKey} onChange={(e) => setMonthKey(e.target.value)} required />
          </label>
          <fieldset className="owner-fieldset">
            <legend>Theme</legend>
            <div className="owner-options">
              {(['light', 'dark', 'system'] as ThemePreference[]).map((opt) => (
                <label className="owner-option" key={opt}>
                  <input type="radio" checked={theme === opt} onChange={() => setTheme(opt)} />
                  {opt[0]!.toUpperCase() + opt.slice(1)}
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Setting up…' : 'Get started'}
          </button>
        </form>
      </div>
    </div>
  );
}

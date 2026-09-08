import { FormEvent, useEffect, useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { incomeTemplateRepository } from '../../data/repositories/incomeRepository';
import { expenseTemplateRepository } from '../../data/repositories/expenseRepository';
import { IncomeTemplate } from '../../domain/income/types';
import { ExpenseSection, ExpenseTemplate } from '../../domain/expenses/types';
import { PersonId, Owner, defaultSplitFor } from '../../domain/splits/types';
import { CurrencyInput } from '../../components/shared/CurrencyInput';
import { validateName } from '../../domain/calculations/validation';

function IncomeTemplateEditor() {
  const { household } = useAppData();
  const [templates, setTemplates] = useState<IncomeTemplate[]>([]);
  const [description, setDescription] = useState('');
  const [person, setPerson] = useState<PersonId>('person1');
  const [amountCents, setAmountCents] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = async () => setTemplates(await incomeTemplateRepository.getAll());
  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const check = validateName(description);
    if (!check.valid) {
      setError(check.error!);
      return;
    }
    setError(null);
    await incomeTemplateRepository.create({ description: description.trim(), person, defaultAmountCents: amountCents, archived: false });
    setDescription('');
    setAmountCents(0);
    await load();
  };

  return (
    <div>
      <h3>Income templates</h3>
      <p className="field__hint">Recurring income sources you can quickly add to any month.</p>
      <form className="entry-form" onSubmit={handleAdd}>
        {error && (
          <ul className="form-errors" role="alert">
            <li>{error}</li>
          </ul>
        )}
        <label className="field">
          <span className="field__label">Description</span>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
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
          <span className="field__label">Default amount</span>
          <CurrencyInput cents={amountCents} onChange={setAmountCents} />
        </label>
        <button type="submit" className="btn btn--secondary">
          Add template
        </button>
      </form>
      <ul className="admin-list">
        {templates.map((t) => (
          <li key={t.id} className={`admin-list__item ${t.archived ? 'is-archived' : ''}`}>
            <span className="admin-list__name">
              {t.description} ({t.person === 'person1' ? household.personNames.person1 : household.personNames.person2})
            </span>
            <button
              type="button"
              className="btn btn--small"
              onClick={async () => {
                await incomeTemplateRepository.archive(t.id, !t.archived);
                await load();
              }}
            >
              {t.archived ? 'Restore' : 'Archive'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SECTION_LABELS: Record<ExpenseSection, string> = {
  bill: 'Bill templates',
  planned: 'Planned spending defaults',
  familyFun: 'Family Fun defaults',
  savings: 'Savings defaults',
};

function ExpenseTemplateEditor({ section }: { section: ExpenseSection }) {
  const { household } = useAppData();
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [name, setName] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [owner, setOwner] = useState<Owner>('both');
  const [error, setError] = useState<string | null>(null);

  const load = async () => setTemplates(await expenseTemplateRepository.getBySection(section));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const check = validateName(name);
    if (!check.valid) {
      setError(check.error!);
      return;
    }
    setError(null);
    await expenseTemplateRepository.create({
      section,
      name: name.trim(),
      categoryId: null,
      defaultAmountCents: amountCents,
      owner,
      split: defaultSplitFor(household.defaultSplitMethod),
      recurring: true,
      dueDay: null,
      archived: false,
    });
    setName('');
    setAmountCents(0);
    await load();
  };

  return (
    <div>
      <h3>{SECTION_LABELS[section]}</h3>
      <form className="entry-form" onSubmit={handleAdd}>
        {error && (
          <ul className="form-errors" role="alert">
            <li>{error}</li>
          </ul>
        )}
        <label className="field">
          <span className="field__label">Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="field">
          <span className="field__label">Default amount</span>
          <CurrencyInput cents={amountCents} onChange={setAmountCents} />
        </label>
        <fieldset className="owner-fieldset">
          <legend>Default responsibility</legend>
          <div className="owner-options">
            <label className="owner-option">
              <input type="radio" checked={owner === 'person1'} onChange={() => setOwner('person1')} />
              {household.personNames.person1}
            </label>
            <label className="owner-option">
              <input type="radio" checked={owner === 'person2'} onChange={() => setOwner('person2')} />
              {household.personNames.person2}
            </label>
            <label className="owner-option">
              <input type="radio" checked={owner === 'both'} onChange={() => setOwner('both')} />
              Both
            </label>
          </div>
        </fieldset>
        <button type="submit" className="btn btn--secondary">
          Add template
        </button>
      </form>
      <ul className="admin-list">
        {templates.map((t) => (
          <li key={t.id} className={`admin-list__item ${t.archived ? 'is-archived' : ''}`}>
            <span className="admin-list__name">{t.name}</span>
            <button
              type="button"
              className="btn btn--small"
              onClick={async () => {
                await expenseTemplateRepository.archive(t.id, !t.archived);
                await load();
              }}
            >
              {t.archived ? 'Restore' : 'Archive'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TemplateSettings() {
  return (
    <div className="template-settings">
      <h2>Templates &amp; defaults</h2>
      <p className="field__hint">
        Templates are reference lists you can build from over time; each month's entries are
        created independently, so editing a template never changes past months.
      </p>
      <IncomeTemplateEditor />
      <ExpenseTemplateEditor section="bill" />
      <ExpenseTemplateEditor section="planned" />
      <ExpenseTemplateEditor section="familyFun" />
      <ExpenseTemplateEditor section="savings" />
    </div>
  );
}

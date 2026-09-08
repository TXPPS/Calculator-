import { useEffect, useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { incomeTemplateRepository } from '../../data/repositories/incomeRepository';
import { expenseTemplateRepository } from '../../data/repositories/expenseRepository';
import { IncomeTemplate } from '../../domain/income/types';
import { ExpenseSection, ExpenseTemplate } from '../../domain/expenses/types';
import { IncomeTemplateForm } from './IncomeTemplateForm';
import { ExpenseTemplateForm } from './ExpenseTemplateForm';
import { Money } from '../../components/shared/Money';

function IncomeTemplateEditor() {
  const { household } = useAppData();
  const [templates, setTemplates] = useState<IncomeTemplate[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeTemplate | undefined>(undefined);

  const load = async () => setTemplates(await incomeTemplateRepository.getAll());
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="admin-section__header">
        <h3>Income templates</h3>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          New income template
        </button>
      </div>
      <p className="field__hint">
        Recurring paychecks and other income sources you can quickly add to any month via Income →
        Add from template.
      </p>
      <ul className="admin-list">
        {templates.map((t) => (
          <li key={t.id} className={`admin-list__item ${t.archived ? 'is-archived' : ''}`}>
            <span className="admin-list__name">
              {t.description} ({household.personNames[t.person]})
              {t.incomeType === 'paycheck' && t.paycheck && (
                <span className="field__hint">
                  {' '}
                  · <Money cents={t.paycheck.perPaycheckCents} /> / paycheck · {t.paycheck.frequency}
                </span>
              )}
            </span>
            <div className="admin-list__actions">
              <button
                type="button"
                className="btn btn--small"
                onClick={() => {
                  setEditing(t);
                  setFormOpen(true);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn--small"
                onClick={async () => {
                  await incomeTemplateRepository.duplicate(t.id);
                  await load();
                }}
              >
                Duplicate
              </button>
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
            </div>
          </li>
        ))}
      </ul>

      {formOpen && (
        <IncomeTemplateForm
          initial={editing}
          onSave={async (values) => {
            if (editing) {
              await incomeTemplateRepository.save({ ...editing, ...values });
            } else {
              await incomeTemplateRepository.create({ ...values, archived: false });
            }
            await load();
          }}
          onClose={() => setFormOpen(false)}
        />
      )}
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
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseTemplate | undefined>(undefined);
  const requireCategory = section === 'bill' || section === 'planned';
  const showDueDay = section === 'bill';

  const load = async () => setTemplates(await expenseTemplateRepository.getBySection(section));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  return (
    <div>
      <div className="admin-section__header">
        <h3>{SECTION_LABELS[section]}</h3>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          New template
        </button>
      </div>
      <ul className="admin-list">
        {templates.map((t) => (
          <li key={t.id} className={`admin-list__item ${t.archived ? 'is-archived' : ''}`}>
            <span className="admin-list__name">
              {t.name} · <Money cents={t.defaultAmountCents} />
            </span>
            <div className="admin-list__actions">
              <button
                type="button"
                className="btn btn--small"
                onClick={() => {
                  setEditing(t);
                  setFormOpen(true);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="btn btn--small"
                onClick={async () => {
                  await expenseTemplateRepository.duplicate(t.id);
                  await load();
                }}
              >
                Duplicate
              </button>
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
            </div>
          </li>
        ))}
      </ul>

      {formOpen && (
        <ExpenseTemplateForm
          section={section}
          initial={editing}
          requireCategory={requireCategory}
          showDueDay={showDueDay}
          onSave={async (values) => {
            if (editing) {
              await expenseTemplateRepository.save({ ...editing, ...values });
            } else {
              await expenseTemplateRepository.create({ ...values, section, archived: false });
            }
            await load();
          }}
          onClose={() => setFormOpen(false)}
        />
      )}
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

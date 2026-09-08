import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { EmptyState } from './EmptyState';
import { Money } from './Money';
import { expenseTemplateRepository } from '../../data/repositories/expenseRepository';
import { ExpenseSection, ExpenseTemplate } from '../../domain/expenses/types';

interface QuickAddExpenseModalProps {
  section: ExpenseSection;
  onAdd: (template: ExpenseTemplate) => Promise<void>;
  onClose: () => void;
}

export function QuickAddExpenseModal({ section, onAdd, onClose }: QuickAddExpenseModalProps) {
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    expenseTemplateRepository.getBySection(section).then((all) => {
      setTemplates(all.filter((t) => !t.archived));
      setLoading(false);
    });
  }, [section]);

  return (
    <Modal onClose={onClose} labelledBy="quick-add-expense-title">
      <h2 id="quick-add-expense-title">Add from template</h2>
      {loading ? (
        <p>Loading templates…</p>
      ) : templates.length === 0 ? (
        <EmptyState
          title="No templates yet"
          message="Create templates in Admin → Templates & Defaults to quickly add recurring items here."
        />
      ) : (
        <ul className="admin-list">
          {templates.map((t) => (
            <li key={t.id} className="admin-list__item">
              <span className="admin-list__name">
                {t.name} <span className="field__hint">· <Money cents={t.defaultAmountCents} /></span>
              </span>
              <button
                type="button"
                className="btn btn--small btn--primary"
                disabled={addingId === t.id}
                onClick={async () => {
                  setAddingId(t.id);
                  try {
                    await onAdd(t);
                    onClose();
                  } finally {
                    setAddingId(null);
                  }
                }}
              >
                {addingId === t.id ? 'Adding…' : 'Add'}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="modal__actions">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

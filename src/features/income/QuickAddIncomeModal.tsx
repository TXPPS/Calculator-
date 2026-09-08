import { useEffect, useState } from 'react';
import { Modal } from '../../components/shared/Modal';
import { EmptyState } from '../../components/shared/EmptyState';
import { Money } from '../../components/shared/Money';
import { incomeTemplateRepository } from '../../data/repositories/incomeRepository';
import { IncomeTemplate } from '../../domain/income/types';
import { useAppData } from '../../context/AppDataContext';
import { MonthKey } from '../../domain/monthly-plan/types';
import { calculateScheduleForMonth } from '../../domain/income/payFrequency';

interface QuickAddIncomeModalProps {
  monthKey: MonthKey;
  onAdd: (template: IncomeTemplate) => Promise<void>;
  onClose: () => void;
}

export function QuickAddIncomeModal({ monthKey, onAdd, onClose }: QuickAddIncomeModalProps) {
  const { household } = useAppData();
  const [templates, setTemplates] = useState<IncomeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    incomeTemplateRepository.getAll().then((all) => {
      setTemplates(all.filter((t) => !t.archived));
      setLoading(false);
    });
  }, []);

  return (
    <Modal onClose={onClose} labelledBy="quick-add-income-title">
      <h2 id="quick-add-income-title">Add from template</h2>
      {loading ? (
        <p>Loading templates…</p>
      ) : templates.length === 0 ? (
        <EmptyState
          title="No income templates yet"
          message="Create income templates in Admin → Templates & Defaults to quickly add recurring paychecks and other income."
        />
      ) : (
        <ul className="admin-list">
          {templates.map((t) => {
            const preview =
              t.incomeType === 'paycheck' && t.paycheck ? calculateScheduleForMonth(t.paycheck, monthKey) : null;
            return (
              <li key={t.id} className="admin-list__item">
                <span className="admin-list__name">
                  {t.description} — {household.personNames[t.person]}
                  {preview && (
                    <span className="field__hint">
                      {' '}
                      · {preview.occurrences} {preview.occurrences === 1 ? 'paycheck' : 'paychecks'} ·{' '}
                      <Money cents={preview.calculatedAmountCents} />
                    </span>
                  )}
                  {!preview && (
                    <span className="field__hint">
                      {' '}
                      · <Money cents={t.defaultAmountCents} />
                    </span>
                  )}
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
            );
          })}
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

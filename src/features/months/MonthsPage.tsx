import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { monthKeyLabel, currentMonthKey } from '../../domain/monthly-plan/types';
import { validateMonthKey } from '../../domain/calculations/validation';
import { Modal } from '../../components/shared/Modal';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { Money } from '../../components/shared/Money';
import { calculatePlanSummary } from '../../domain/calculations/planCalculations';
import { incomeRepository } from '../../data/repositories/incomeRepository';
import { expenseRepository } from '../../data/repositories/expenseRepository';
import { monthRepository } from '../../data/repositories/monthRepository';
import { MonthlyPlan } from '../../domain/monthly-plan/types';

function CreateMonthModal({ onClose }: { onClose: () => void }) {
  const { months, createNewMonth, selectMonth } = useAppData();
  const [monthKey, setMonthKey] = useState(currentMonthKey());
  const [copyFrom, setCopyFrom] = useState<string>('blank');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sortedMonths = [...months].sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const check = validateMonthKey(monthKey);
    if (!check.valid) {
      setError(check.error!);
      return;
    }
    if (months.some((m) => m.monthKey === monthKey)) {
      setError(`A plan for ${monthKeyLabel(monthKey)} already exists.`);
      return;
    }
    setSaving(true);
    try {
      const plan = await createNewMonth(monthKey, copyFrom === 'blank' ? null : copyFrom);
      selectMonth(plan.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create month.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} labelledBy="create-month-title">
      <h2 id="create-month-title">Create a new month</h2>
      {error && (
        <ul className="form-errors" role="alert">
          <li>{error}</li>
        </ul>
      )}
      <form className="entry-form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">Month</span>
          <input
            type="month"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            required
          />
        </label>
        <fieldset className="owner-fieldset">
          <legend>Starting point</legend>
          <div className="owner-options owner-options--stacked">
            <label className="owner-option">
              <input type="radio" checked={copyFrom === 'blank'} onChange={() => setCopyFrom('blank')} />
              Start blank
            </label>
            {sortedMonths.map((m) => (
              <label className="owner-option" key={m.id}>
                <input
                  type="radio"
                  checked={copyFrom === m.id}
                  onChange={() => setCopyFrom(m.id)}
                />
                Copy recurring items from {monthKeyLabel(m.monthKey)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create month'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MonthRow({ plan }: { plan: MonthlyPlan }) {
  const { selectedMonth, selectMonth, deleteMonth } = useAppData();
  const [pendingDelete, setPendingDelete] = useState(false);
  const [totals, setTotals] = useState<{ income: number; remaining: number } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [income, expenses] = await Promise.all([
        incomeRepository.getForMonth(plan.id),
        expenseRepository.getForMonth(plan.id),
      ]);
      if (cancelled) return;
      const summary = calculatePlanSummary(income, expenses);
      setTotals({ income: summary.income.householdCents, remaining: summary.remaining.householdCents });
    })();
    return () => {
      cancelled = true;
    };
  }, [plan.id]);

  const isSelected = selectedMonth?.id === plan.id;

  return (
    <li className={`month-row ${isSelected ? 'is-selected' : ''}`}>
      <button
        type="button"
        className="month-row__main"
        onClick={() => {
          selectMonth(plan.id);
          navigate('/');
        }}
      >
        <span className="month-row__label">{monthKeyLabel(plan.monthKey)}</span>
        {totals && (
          <span className="month-row__meta">
            Income <Money cents={totals.income} /> · Remaining{' '}
            <Money cents={totals.remaining} colorize />
          </span>
        )}
      </button>
      <button type="button" className="btn btn--small btn--danger-ghost" onClick={() => setPendingDelete(true)}>
        Delete
      </button>
      <ConfirmDialog
        open={pendingDelete}
        title={`Delete ${monthKeyLabel(plan.monthKey)}?`}
        message="This permanently deletes this month's plan and all its income and expense entries. This cannot be undone."
        confirmLabel="Delete month"
        danger
        onCancel={() => setPendingDelete(false)}
        onConfirm={async () => {
          await deleteMonth(plan.id);
          setPendingDelete(false);
        }}
      />
    </li>
  );
}

export function MonthsPage() {
  const { months, selectedMonth } = useAppData();
  const [createOpen, setCreateOpen] = useState(false);
  const [notes, setNotes] = useState(selectedMonth?.notes ?? '');

  const sortedMonths = [...months].sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  const saveNotes = async () => {
    if (!selectedMonth) return;
    await monthRepository.save({ ...selectedMonth, notes });
  };

  return (
    <section className="page">
      <header className="page__header">
        <div>
          <h1>Months</h1>
          <p className="page__description">Manage your monthly plans — create, switch, or delete.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setCreateOpen(true)}>
          New month
        </button>
      </header>

      {sortedMonths.length === 0 ? (
        <p>No monthly plans yet. Create your first one to get started.</p>
      ) : (
        <ul className="month-list">
          {sortedMonths.map((plan) => (
            <MonthRow key={plan.id} plan={plan} />
          ))}
        </ul>
      )}

      {selectedMonth && (
        <div className="card">
          <h2>Notes for {monthKeyLabel(selectedMonth.monthKey)}</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            rows={4}
            placeholder="e.g. three-paycheck month, annual registration due, planned vacation…"
          />
        </div>
      )}

      {createOpen && <CreateMonthModal onClose={() => setCreateOpen(false)} />}
    </section>
  );
}

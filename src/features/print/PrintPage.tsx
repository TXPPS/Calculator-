import { useEffect } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { EmptyState } from '../../components/shared/EmptyState';
import { monthKeyLabel } from '../../domain/monthly-plan/types';
import { formatCents } from '../../domain/money/money';
import { ExpenseEntry, ExpenseSection } from '../../domain/expenses/types';
import { IncomeEntry } from '../../domain/income/types';
import { calculateSplit } from '../../domain/splits/calculateSplit';
import { formatPayDateShort } from '../../domain/income/payFrequency';
import { isHouseholdOverallocated } from '../../domain/calculations/planCalculations';
import { REVIEW_SECTION_ORDER, ReviewSectionKey } from '../../domain/monthly-plan/review';

const REVIEW_LABELS: Record<ReviewSectionKey, string> = {
  income: 'Income',
  bills: 'Required Bills',
  planned: 'Planned Spending',
  familyFun: 'Family Fun',
  savings: 'Savings',
};

const SPLIT_LABELS: Record<string, string> = {
  even: '50 / 50',
  percentage: 'Percentage',
  exact: 'Exact dollar',
  incomeProportional: 'Proportional to income',
};

function ownerLabel(owner: string, p1: string, p2: string): string {
  if (owner === 'person1') return p1;
  if (owner === 'person2') return p2;
  return 'Both';
}

function splitLabel(entry: ExpenseEntry): string {
  if (entry.owner !== 'both') return '—';
  if (entry.split.method === 'percentage') return `${entry.split.person1Percent}% / ${100 - entry.split.person1Percent}%`;
  return SPLIT_LABELS[entry.split.method] ?? entry.split.method;
}

export function PrintPage() {
  const { household, selectedMonth, summary, incomeEntries, expenseEntries, categories } = useAppData();

  useEffect(() => {
    if (!selectedMonth) return;
    const previousTitle = document.title;
    document.title = `Household-Plan-${selectedMonth.monthKey}`;
    return () => {
      document.title = previousTitle;
    };
  }, [selectedMonth]);

  if (!selectedMonth) {
    return <EmptyState title="No month selected" message="Select a monthly plan first." />;
  }

  const householdOver = isHouseholdOverallocated(summary);
  const splitCtx = {
    person1IncomeCents: summary.income.person1Cents,
    person2IncomeCents: summary.income.person2Cents,
  };

  const incomeByPerson = (person: 'person1' | 'person2'): IncomeEntry[] =>
    incomeEntries.filter((e) => e.person === person).sort((a, b) => a.description.localeCompare(b.description));

  const expensesBySection = (section: ExpenseSection): ExpenseEntry[] =>
    expenseEntries.filter((e) => e.section === section).sort((a, b) => a.name.localeCompare(b.name));

  const renderIncomeRow = (entry: IncomeEntry) => {
    const isPaycheck = entry.incomeType === 'paycheck' && entry.paycheck;
    return (
      <tr key={entry.id}>
        <td>{entry.description}</td>
        <td>
          {entry.incomeType === 'paycheck'
            ? 'Paycheck'
            : entry.incomeType === 'otherRecurring'
            ? 'Other recurring'
            : entry.incomeType === 'oneTime'
            ? 'One-time'
            : 'Irregular'}
        </td>
        <td>{isPaycheck ? entry.paycheck!.frequency : '—'}</td>
        <td className="is-numeric">{isPaycheck ? formatCents(entry.paycheck!.perPaycheckCents) : '—'}</td>
        <td className="is-numeric">{isPaycheck ? entry.expectedOccurrences ?? 0 : '—'}</td>
        <td>{isPaycheck && entry.payDates.length > 0 ? entry.payDates.map(formatPayDateShort).join(', ') : '—'}</td>
        <td className="is-numeric">{formatCents(entry.amountCents)}</td>
      </tr>
    );
  };

  const renderExpenseTable = (section: ExpenseSection, title: string, showDue: boolean) => {
    const entries = expensesBySection(section);
    if (entries.length === 0) return null;
    const total = entries.reduce((sum, e) => sum + e.amountCents, 0);
    return (
      <div className="report-section" key={section}>
        <h2>{title}</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              {showDue && <th>Due</th>}
              <th>Responsibility</th>
              <th>Split</th>
              <th className="is-numeric">Total</th>
              <th className="is-numeric">{household.personNames.person1} share</th>
              <th className="is-numeric">{household.personNames.person2} share</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const result =
                entry.owner === 'both'
                  ? calculateSplit(entry.amountCents, entry.split, splitCtx)
                  : { person1Cents: entry.owner === 'person1' ? entry.amountCents : 0, person2Cents: entry.owner === 'person2' ? entry.amountCents : 0 };
              return (
                <tr key={entry.id}>
                  <td>{entry.name}</td>
                  <td>{categories.find((c) => c.id === entry.categoryId)?.name ?? '—'}</td>
                  {showDue && <td>{entry.dueDay ? `Day ${entry.dueDay}` : '—'}</td>}
                  <td>{ownerLabel(entry.owner, household.personNames.person1, household.personNames.person2)}</td>
                  <td>{splitLabel(entry)}</td>
                  <td className="is-numeric">{formatCents(entry.amountCents)}</td>
                  <td className="is-numeric">{formatCents(result.person1Cents)}</td>
                  <td className="is-numeric">{formatCents(result.person2Cents)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={showDue ? 4 : 3}>Total</td>
              <td />
              <td className="is-numeric">{formatCents(total)}</td>
              <td className="is-numeric">
                {formatCents(
                  entries.reduce((sum, e) => {
                    const r =
                      e.owner === 'both'
                        ? calculateSplit(e.amountCents, e.split, splitCtx)
                        : { person1Cents: e.owner === 'person1' ? e.amountCents : 0 };
                    return sum + r.person1Cents;
                  }, 0)
                )}
              </td>
              <td className="is-numeric">
                {formatCents(
                  entries.reduce((sum, e) => {
                    const r =
                      e.owner === 'both'
                        ? calculateSplit(e.amountCents, e.split, splitCtx)
                        : { person2Cents: e.owner === 'person2' ? e.amountCents : 0 };
                    return sum + (r.person2Cents ?? 0);
                  }, 0)
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const reviewSummary = REVIEW_SECTION_ORDER.map((key) => ({
    key,
    label: REVIEW_LABELS[key],
    reviewed: selectedMonth.review[key].reviewed,
  }));
  const allReviewed = reviewSummary.every((r) => r.reviewed);

  return (
    <section className="page print-summary">
      <div className="no-print" style={{ marginBottom: 16 }}>
        <button type="button" className="btn btn--primary" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      <header className="report-header">
        <div>
          <p className="report-header__title">{household.appName}</p>
          <p className="report-header__subtitle">Monthly Plan Report — {monthKeyLabel(selectedMonth.monthKey)}</p>
        </div>
        <div className="report-header__meta">
          <p>{household.personNames.person1} &amp; {household.personNames.person2}</p>
          <p>Report generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </header>

      {/* Section 1 — Executive Monthly Summary */}
      <div className="report-section">
        <h2>Executive Monthly Summary</h2>
        <table className="report-table">
          <thead>
            <tr>
              <th></th>
              <th className="is-numeric">{household.personNames.person1}</th>
              <th className="is-numeric">{household.personNames.person2}</th>
              <th className="is-numeric">Household</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Expected income</td>
              <td className="is-numeric">{formatCents(summary.income.person1Cents)}</td>
              <td className="is-numeric">{formatCents(summary.income.person2Cents)}</td>
              <td className="is-numeric">{formatCents(summary.income.householdCents)}</td>
            </tr>
            <tr>
              <td>Required bills</td>
              <td className="is-numeric">{formatCents(summary.bills.person1Cents)}</td>
              <td className="is-numeric">{formatCents(summary.bills.person2Cents)}</td>
              <td className="is-numeric">{formatCents(summary.bills.householdCents)}</td>
            </tr>
            <tr>
              <td>Planned spending</td>
              <td className="is-numeric">{formatCents(summary.planned.person1Cents)}</td>
              <td className="is-numeric">{formatCents(summary.planned.person2Cents)}</td>
              <td className="is-numeric">{formatCents(summary.planned.householdCents)}</td>
            </tr>
            <tr>
              <td>Family Fun</td>
              <td className="is-numeric">{formatCents(summary.familyFun.person1Cents)}</td>
              <td className="is-numeric">{formatCents(summary.familyFun.person2Cents)}</td>
              <td className="is-numeric">{formatCents(summary.familyFun.householdCents)}</td>
            </tr>
            <tr>
              <td>Savings</td>
              <td className="is-numeric">{formatCents(summary.savings.person1Cents)}</td>
              <td className="is-numeric">{formatCents(summary.savings.person2Cents)}</td>
              <td className="is-numeric">{formatCents(summary.savings.householdCents)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>Total allocated</td>
              <td className="is-numeric">{formatCents(summary.totalAllocated.person1Cents)}</td>
              <td className="is-numeric">{formatCents(summary.totalAllocated.person2Cents)}</td>
              <td className="is-numeric">{formatCents(summary.totalAllocated.householdCents)}</td>
            </tr>
            <tr>
              <td>Remaining</td>
              <td className="is-numeric">{formatCents(summary.remaining.person1Cents)}</td>
              <td className="is-numeric">{formatCents(summary.remaining.person2Cents)}</td>
              <td className="is-numeric">{formatCents(summary.remaining.householdCents)}</td>
            </tr>
          </tfoot>
        </table>
        <div className={`report-hero ${householdOver ? 'is-negative' : 'is-positive'}`}>
          <div className={`report-hero__row report-hero__row--emphasis ${householdOver ? 'is-negative' : 'is-positive'}`}>
            <span>{householdOver ? 'Household Shortfall' : 'Household Remaining / Unallocated'}</span>
            <span>{formatCents(summary.remaining.householdCents)}</span>
          </div>
          {householdOver && (
            <p className="report-notice">
              This plan currently exceeds expected household income by {formatCents(Math.abs(summary.remaining.householdCents))}.
            </p>
          )}
        </div>
      </div>

      {/* Section 2 — Income / Paychecks */}
      <div className="report-section">
        <h2>Income / Paychecks</h2>
        {(['person1', 'person2'] as const).map((personId) => {
          const entries = incomeByPerson(personId);
          if (entries.length === 0) return null;
          const total = personId === 'person1' ? summary.income.person1Cents : summary.income.person2Cents;
          return (
            <div className="report-person-block" key={personId}>
              <h3>{household.personNames[personId]}</h3>
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Type</th>
                    <th>Frequency</th>
                    <th className="is-numeric">Per paycheck</th>
                    <th className="is-numeric">Checks</th>
                    <th>Pay dates</th>
                    <th className="is-numeric">Total</th>
                  </tr>
                </thead>
                <tbody>{entries.map(renderIncomeRow)}</tbody>
              </table>
              <div className="report-person-block__total">
                <span>{household.personNames[personId]} total</span>
                <span>{formatCents(total)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {renderExpenseTable('bill', 'Required Bills', true)}
      {renderExpenseTable('planned', 'Planned Spending', false)}
      {renderExpenseTable('familyFun', 'Family Fun', false)}
      {renderExpenseTable('savings', 'Savings', false)}

      {/* Section 7 — Contribution Summary */}
      <div className="report-section">
        <h2>Contribution Summary</h2>
        <p className="field__hint">Informational only.</p>
        <table className="report-table">
          <thead>
            <tr>
              <th></th>
              <th className="is-numeric">% of household income</th>
              <th className="is-numeric">% of household allocations</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{household.personNames.person1}</td>
              <td className="is-numeric">{summary.incomeSharePercent.person1.toFixed(0)}%</td>
              <td className="is-numeric">{summary.allocationSharePercent.person1.toFixed(0)}%</td>
            </tr>
            <tr>
              <td>{household.personNames.person2}</td>
              <td className="is-numeric">{summary.incomeSharePercent.person2.toFixed(0)}%</td>
              <td className="is-numeric">{summary.allocationSharePercent.person2.toFixed(0)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 8 — Monthly Notes */}
      {selectedMonth.notes && (
        <div className="report-section">
          <h2>Monthly Notes</h2>
          <p className="report-notes">{selectedMonth.notes}</p>
        </div>
      )}

      {/* Section 9 — Final Plan Status */}
      <div className="report-section report-hero">
        <h2>Final Plan Status</h2>
        <div className="report-hero__row">
          <span>Expected household income</span>
          <span>{formatCents(summary.income.householdCents)}</span>
        </div>
        <div className="report-hero__row">
          <span>Total allocated</span>
          <span>{formatCents(summary.totalAllocated.householdCents)}</span>
        </div>
        <div className={`report-hero__row report-hero__row--emphasis ${householdOver ? 'is-negative' : 'is-positive'}`}>
          <span>{householdOver ? 'Household Shortfall' : 'Household Remaining / Unallocated'}</span>
          <span>{formatCents(summary.remaining.householdCents)}</span>
        </div>
        <div className="report-hero__row">
          <span>{household.personNames.person1} remaining</span>
          <span>{formatCents(summary.remaining.person1Cents)}</span>
        </div>
        <div className="report-hero__row">
          <span>{household.personNames.person2} remaining</span>
          <span>{formatCents(summary.remaining.person2Cents)}</span>
        </div>
        <p className="field__hint" style={{ marginTop: 8 }}>
          Monthly Review: {allReviewed ? 'All sections reviewed' : reviewSummary.filter((r) => r.reviewed).map((r) => r.label).join(', ') || 'Not started'}
        </p>
      </div>

      <div className="report-footer">
        <span>
          {household.appName} · {monthKeyLabel(selectedMonth.monthKey)}
        </span>
        <span>Generated {new Date().toLocaleString('en-US')}</span>
      </div>
    </section>
  );
}

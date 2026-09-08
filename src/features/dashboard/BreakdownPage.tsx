import { useMemo } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { Money } from '../../components/shared/Money';
import { EmptyState } from '../../components/shared/EmptyState';
import { comparePlanSummaries } from '../../domain/calculations/comparePlans';
import { monthKeyLabel } from '../../domain/monthly-plan/types';
import { isHouseholdOverallocated, isPersonOverallocated } from '../../domain/calculations/planCalculations';

function DeltaLabel({ cents }: { cents: number }) {
  if (cents === 0) return <span className="delta delta--flat">No change</span>;
  const sign = cents > 0 ? '+' : '−';
  return (
    <span className={`delta ${cents > 0 ? 'delta--up' : 'delta--down'}`}>
      {sign}
      <Money cents={Math.abs(cents)} />
    </span>
  );
}

export function BreakdownPage() {
  const { household, selectedMonth, previousMonth, summary, previousSummary, expenseEntries, categories } =
    useAppData();

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const entry of expenseEntries) {
      const key = entry.categoryId ?? '__uncategorized';
      totals.set(key, (totals.get(key) ?? 0) + entry.amountCents);
    }
    return [...totals.entries()]
      .map(([categoryId, cents]) => ({
        categoryId,
        name:
          categoryId === '__uncategorized'
            ? 'Uncategorized'
            : categories.find((c) => c.id === categoryId)?.name ?? 'Unknown',
        cents,
      }))
      .sort((a, b) => b.cents - a.cents);
  }, [expenseEntries, categories]);

  const maxCategoryCents = Math.max(1, ...categoryTotals.map((c) => c.cents));

  if (!selectedMonth) {
    return <EmptyState title="No month selected" message="Create or select a monthly plan first." />;
  }

  const householdOver = isHouseholdOverallocated(summary);
  const comparison = previousSummary ? comparePlanSummaries(summary, previousSummary) : null;

  return (
    <section className="page">
      <header className="page__header">
        <h1>Plan Check &amp; Breakdown</h1>
      </header>

      <div className="card">
        <h2>Plan check</h2>
        <div className="plan-check">
          <div className="plan-check__row">
            <span>Expected income</span>
            <Money cents={summary.income.householdCents} />
          </div>
          <div className="plan-check__row">
            <span>Allocated</span>
            <Money cents={summary.totalAllocated.householdCents} />
          </div>
          <div className="plan-check__row plan-check__row--total">
            <span>{householdOver ? 'Shortfall' : 'Unallocated'}</span>
            <Money cents={summary.remaining.householdCents} colorize />
          </div>
        </div>
        <ul className="plan-check__flags">
          {isPersonOverallocated(summary, 'person1') && (
            <li role="alert">{household.personNames.person1} is overallocated this month.</li>
          )}
          {isPersonOverallocated(summary, 'person2') && (
            <li role="alert">{household.personNames.person2} is overallocated this month.</li>
          )}
          {householdOver && <li role="alert">The household plan is overallocated this month.</li>}
          {!householdOver &&
            !isPersonOverallocated(summary, 'person1') &&
            !isPersonOverallocated(summary, 'person2') && <li className="is-positive">This plan is fully within expected income.</li>}
        </ul>
      </div>

      <div className="card">
        <h2>Contribution breakdown</h2>
        <p className="page__description">Informational only — not a judgment of fairness.</p>
        <div className="two-column">
          <div>
            <h3>{household.personNames.person1}</h3>
            <p>{summary.incomeSharePercent.person1.toFixed(0)}% of household income</p>
            <p>{summary.allocationSharePercent.person1.toFixed(0)}% of household allocations</p>
          </div>
          <div>
            <h3>{household.personNames.person2}</h3>
            <p>{summary.incomeSharePercent.person2.toFixed(0)}% of household income</p>
            <p>{summary.allocationSharePercent.person2.toFixed(0)}% of household allocations</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Category breakdown</h2>
        {categoryTotals.length === 0 ? (
          <p>No entries yet this month.</p>
        ) : (
          <ul className="category-bars">
            {categoryTotals.map((c) => (
              <li key={c.categoryId} className="category-bar">
                <div className="category-bar__label">
                  <span>{c.name}</span>
                  <Money cents={c.cents} />
                </div>
                <div className="category-bar__track">
                  <div
                    className="category-bar__fill"
                    style={{ width: `${(c.cents / maxCategoryCents) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2>Month-to-month comparison</h2>
        {!previousMonth || !comparison ? (
          <p>No previous month is available to compare against yet.</p>
        ) : (
          <>
            <p className="page__description">
              Compared to {monthKeyLabel(previousMonth.monthKey)}
            </p>
            <div className="comparison-grid">
              <div className="comparison-grid__row">
                <span>Income</span>
                <DeltaLabel cents={comparison.incomeDeltaCents} />
              </div>
              <div className="comparison-grid__row">
                <span>Bills</span>
                <DeltaLabel cents={comparison.billsDeltaCents} />
              </div>
              <div className="comparison-grid__row">
                <span>Planned spending</span>
                <DeltaLabel cents={comparison.plannedDeltaCents} />
              </div>
              <div className="comparison-grid__row">
                <span>Family Fun</span>
                <DeltaLabel cents={comparison.familyFunDeltaCents} />
              </div>
              <div className="comparison-grid__row">
                <span>Savings</span>
                <DeltaLabel cents={comparison.savingsDeltaCents} />
              </div>
              <div className="comparison-grid__row comparison-grid__row--total">
                <span>Remaining</span>
                <DeltaLabel cents={comparison.remainingDeltaCents} />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

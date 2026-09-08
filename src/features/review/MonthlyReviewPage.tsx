import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { monthRepository } from '../../data/repositories/monthRepository';
import { EmptyState } from '../../components/shared/EmptyState';
import { Money } from '../../components/shared/Money';
import { monthKeyLabel } from '../../domain/monthly-plan/types';
import { REVIEW_SECTION_ORDER, ReviewSectionKey } from '../../domain/monthly-plan/review';
import { computeMonthSignatures } from '../../domain/calculations/reviewSignatures';
import { isHouseholdOverallocated, isPersonOverallocated } from '../../domain/calculations/planCalculations';

const SECTION_META: Record<ReviewSectionKey, { title: string; description: string; link: string; linkLabel: string }> = {
  income: {
    title: 'Income',
    description: 'Expected income for both people this month.',
    link: '/income',
    linkLabel: 'Review income',
  },
  bills: {
    title: 'Required Bills',
    description: 'Fixed, must-pay bills and who is responsible for each.',
    link: '/bills',
    linkLabel: 'Review bills',
  },
  planned: {
    title: 'Planned Spending',
    description: 'Expected variable spending like groceries and fuel.',
    link: '/planned-spending',
    linkLabel: 'Review planned spending',
  },
  familyFun: {
    title: 'Family Fun',
    description: 'Money set aside for enjoying life together.',
    link: '/family-fun',
    linkLabel: 'Review Family Fun',
  },
  savings: {
    title: 'Savings',
    description: 'Contributions toward savings goals this month.',
    link: '/savings',
    linkLabel: 'Review savings',
  },
};

function sectionTotal(section: ReviewSectionKey, incomeCents: number, sums: Record<string, number>): number {
  if (section === 'income') return incomeCents;
  return sums[section] ?? 0;
}

export function MonthlyReviewPage() {
  const { household, selectedMonth, incomeEntries, expenseEntries, summary, refreshMonths } = useAppData();

  const signatures = useMemo(
    () => computeMonthSignatures(incomeEntries, expenseEntries),
    [incomeEntries, expenseEntries]
  );

  const sectionSums = useMemo(
    () => ({
      bills: summary.bills.householdCents,
      planned: summary.planned.householdCents,
      familyFun: summary.familyFun.householdCents,
      savings: summary.savings.householdCents,
    }),
    [summary]
  );

  if (!selectedMonth) {
    return <EmptyState title="No month selected" message="Create or select a monthly plan first." />;
  }

  const review = selectedMonth.review;
  const reviewedCount = REVIEW_SECTION_ORDER.filter((key) => review[key].reviewed && review[key].signature === signatures[key]).length;
  const allReviewed = reviewedCount === REVIEW_SECTION_ORDER.length;
  const householdOver = isHouseholdOverallocated(summary);

  const markReviewed = async (key: ReviewSectionKey) => {
    await monthRepository.save({
      ...selectedMonth,
      review: {
        ...review,
        [key]: { reviewed: true, reviewedAt: new Date().toISOString(), signature: signatures[key] },
      },
    });
    await refreshMonths();
  };

  return (
    <section className="page">
      <header className="page__header">
        <div>
          <h1>Monthly Review — {monthKeyLabel(selectedMonth.monthKey)}</h1>
          <p className="page__description">
            Walk through this month together, section by section. Nothing here is required —
            marking a section reviewed just tracks that you've both looked it over.
          </p>
        </div>
      </header>

      <div className="card review-progress">
        <span>
          {reviewedCount} of {REVIEW_SECTION_ORDER.length} sections reviewed
        </span>
        <div className="review-progress__track">
          <div
            className="review-progress__fill"
            style={{ width: `${(reviewedCount / REVIEW_SECTION_ORDER.length) * 100}%` }}
          />
        </div>
      </div>

      <ul className="review-list">
        {REVIEW_SECTION_ORDER.map((key) => {
          const meta = SECTION_META[key];
          const state = review[key];
          const stale = state.reviewed && state.signature !== signatures[key];
          const reviewed = state.reviewed && !stale;
          const total = sectionTotal(key, summary.income.householdCents, sectionSums);
          return (
            <li key={key} className={`card review-card ${reviewed ? 'is-reviewed' : ''}`}>
              <div className="review-card__main">
                <div className="review-card__title-row">
                  <h2>{meta.title}</h2>
                  <Money cents={total} />
                </div>
                <p className="page__description">{meta.description}</p>
                <div className="review-card__status">
                  {reviewed && <span className="chip chip--positive">Reviewed</span>}
                  {stale && <span className="chip chip--warning">Changed since review</span>}
                  {!state.reviewed && <span className="chip chip--muted">Not yet reviewed</span>}
                </div>
              </div>
              <div className="review-card__actions">
                <Link to={meta.link} className="btn btn--secondary">
                  {meta.linkLabel}
                </Link>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => markReviewed(key)}
                  disabled={reviewed}
                >
                  {reviewed ? 'Reviewed ✓' : stale ? 'Mark reviewed again' : 'Mark reviewed'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className={`card monthly-review-summary ${householdOver ? 'is-negative' : 'is-positive'}`}>
        <h2>Monthly Plan Review</h2>
        <p className="field__hint">
          {allReviewed ? 'All sections reviewed.' : `${REVIEW_SECTION_ORDER.length - reviewedCount} section(s) still need review.`}
        </p>
        <div className="plan-check">
          <div className="plan-check__row">
            <span>Expected household income</span>
            <Money cents={summary.income.householdCents} />
          </div>
          <div className="plan-check__row">
            <span>Total allocated</span>
            <Money cents={summary.totalAllocated.householdCents} />
          </div>
          <div className="plan-check__row plan-check__row--total">
            <span>{householdOver ? 'Household shortfall' : 'Remaining / unallocated'}</span>
            <Money cents={summary.remaining.householdCents} colorize />
          </div>
        </div>
        <div className="two-column">
          <div className="review-person-remaining">
            <div className="plan-check__row">
              <span>{household.personNames.person1} remaining</span>
              <Money cents={summary.remaining.person1Cents} colorize />
            </div>
            {isPersonOverallocated(summary, 'person1') && (
              <p className="warning-text">{household.personNames.person1} is overallocated this month.</p>
            )}
          </div>
          <div className="review-person-remaining">
            <div className="plan-check__row">
              <span>{household.personNames.person2} remaining</span>
              <Money cents={summary.remaining.person2Cents} colorize />
            </div>
            {isPersonOverallocated(summary, 'person2') && (
              <p className="warning-text">{household.personNames.person2} is overallocated this month.</p>
            )}
          </div>
        </div>
        <Link to="/print" className="btn btn--secondary">
          View printable report
        </Link>
      </div>
    </section>
  );
}

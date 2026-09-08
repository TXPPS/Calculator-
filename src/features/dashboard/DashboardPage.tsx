import { Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { Money } from '../../components/shared/Money';
import { EmptyState } from '../../components/shared/EmptyState';
import { monthKeyLabel } from '../../domain/monthly-plan/types';
import { isHouseholdOverallocated, isPersonOverallocated } from '../../domain/calculations/planCalculations';

function PersonCard({
  name,
  incomeCents,
  billsCents,
  plannedCents,
  familyFunCents,
  savingsCents,
  allocatedCents,
  remainingCents,
  overallocated,
  accentClass,
}: {
  name: string;
  incomeCents: number;
  billsCents: number;
  plannedCents: number;
  familyFunCents: number;
  savingsCents: number;
  allocatedCents: number;
  remainingCents: number;
  overallocated: boolean;
  accentClass: string;
}) {
  return (
    <div className={`card person-card ${accentClass}`}>
      <h2>{name}</h2>
      <dl className="person-card__rows">
        <div className="person-card__row">
          <dt>Income</dt>
          <dd>
            <Money cents={incomeCents} />
          </dd>
        </div>
        <div className="person-card__row">
          <dt>Bills</dt>
          <dd>
            <Money cents={billsCents} />
          </dd>
        </div>
        <div className="person-card__row">
          <dt>Planned spending</dt>
          <dd>
            <Money cents={plannedCents} />
          </dd>
        </div>
        <div className="person-card__row">
          <dt>Family Fun</dt>
          <dd>
            <Money cents={familyFunCents} />
          </dd>
        </div>
        <div className="person-card__row">
          <dt>Savings</dt>
          <dd>
            <Money cents={savingsCents} />
          </dd>
        </div>
        <div className="person-card__row person-card__row--total">
          <dt>Total allocated</dt>
          <dd>
            <Money cents={allocatedCents} />
          </dd>
        </div>
      </dl>
      <div className={`person-card__remaining ${overallocated ? 'is-negative' : 'is-positive'}`}>
        <span>{overallocated ? 'Shortfall' : 'Remaining'}</span>
        <Money cents={remainingCents} colorize className="person-card__remaining-amount" />
      </div>
      {overallocated && (
        <p className="warning-text" role="alert">
          {name} is allocated <Money cents={Math.abs(remainingCents)} /> more than expected income.
        </p>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { household, selectedMonth, summary, months } = useAppData();

  if (!selectedMonth) {
    return (
      <EmptyState
        title="Welcome to your household plan"
        message="Create your first monthly plan to get started."
        action={
          <Link to="/months" className="btn btn--primary">
            Create a month
          </Link>
        }
      />
    );
  }

  if (months.length === 0) return null;

  const householdOver = isHouseholdOverallocated(summary);

  return (
    <section className="page">
      <header className="page__header">
        <div>
          <h1>{monthKeyLabel(selectedMonth.monthKey)}</h1>
          <p className="page__description">Your household spending plan at a glance.</p>
        </div>
      </header>

      <div className={`card household-summary ${householdOver ? 'is-negative' : 'is-positive'}`}>
        <div className="household-summary__row">
          <span className="household-summary__label">Household income</span>
          <Money cents={summary.income.householdCents} className="household-summary__value" />
        </div>
        <div className="household-summary__row">
          <span className="household-summary__label">Total allocated</span>
          <Money cents={summary.totalAllocated.householdCents} className="household-summary__value" />
        </div>
        <div className="household-summary__row household-summary__row--hero">
          <span className="household-summary__label">
            {householdOver ? 'Household shortfall' : 'Household remaining'}
          </span>
          <Money
            cents={summary.remaining.householdCents}
            colorize
            className="household-summary__value household-summary__value--hero"
          />
        </div>
        {householdOver && (
          <p className="warning-text" role="alert">
            The current household plan exceeds expected income by{' '}
            <Money cents={Math.abs(summary.remaining.householdCents)} />.
          </p>
        )}
      </div>

      <div className="two-column">
        <PersonCard
          name={household.personNames.person1}
          incomeCents={summary.income.person1Cents}
          billsCents={summary.bills.person1Cents}
          plannedCents={summary.planned.person1Cents}
          familyFunCents={summary.familyFun.person1Cents}
          savingsCents={summary.savings.person1Cents}
          allocatedCents={summary.totalAllocated.person1Cents}
          remainingCents={summary.remaining.person1Cents}
          overallocated={isPersonOverallocated(summary, 'person1')}
          accentClass="person-card--p1"
        />
        <PersonCard
          name={household.personNames.person2}
          incomeCents={summary.income.person2Cents}
          billsCents={summary.bills.person2Cents}
          plannedCents={summary.planned.person2Cents}
          familyFunCents={summary.familyFun.person2Cents}
          savingsCents={summary.savings.person2Cents}
          allocatedCents={summary.totalAllocated.person2Cents}
          remainingCents={summary.remaining.person2Cents}
          overallocated={isPersonOverallocated(summary, 'person2')}
          accentClass="person-card--p2"
        />
      </div>

      <div className="dashboard-links">
        <Link to="/breakdown" className="btn btn--secondary">
          View breakdown &amp; plan check
        </Link>
        <Link to="/print" className="btn btn--ghost">
          Printable summary
        </Link>
      </div>
    </section>
  );
}

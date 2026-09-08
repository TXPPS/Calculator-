import { Link } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { monthKeyLabel } from '../../domain/monthly-plan/types';

export function MonthManagement() {
  const { months } = useAppData();
  const sorted = [...months].sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  return (
    <div>
      <h2>Month management</h2>
      <p className="field__hint">
        Totals are always calculated live from each month's income and expense entries — there is
        nothing to manually recalculate. Use the Months page to create, copy, or delete plans.
      </p>
      {sorted.length === 0 ? (
        <p>No monthly plans yet.</p>
      ) : (
        <ul className="admin-list">
          {sorted.map((m) => (
            <li key={m.id} className="admin-list__item">
              <span className="admin-list__name">{monthKeyLabel(m.monthKey)}</span>
              {m.copiedFromMonthKey && (
                <span className="chip chip--muted">Copied from {monthKeyLabel(m.copiedFromMonthKey)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <Link to="/months" className="btn btn--secondary">
        Go to Months page
      </Link>
    </div>
  );
}

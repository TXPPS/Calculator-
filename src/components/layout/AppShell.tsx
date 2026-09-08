import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { monthKeyLabel } from '../../domain/monthly-plan/types';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/income', label: 'Income' },
  { to: '/bills', label: 'Bills' },
  { to: '/planned-spending', label: 'Planned Spending' },
  { to: '/family-fun', label: 'Family Fun' },
  { to: '/savings', label: 'Savings' },
  { to: '/breakdown', label: 'Breakdown' },
  { to: '/months', label: 'Months' },
  { to: '/admin', label: 'Admin' },
];

export function AppShell() {
  const { household, months, selectedMonth, selectMonth } = useAppData();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const sortedMonths = [...months].sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner container">
          <button
            type="button"
            className="app-header__menu-btn no-print"
            aria-expanded={menuOpen}
            aria-controls="app-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="visually-hidden">Toggle navigation</span>
            <span aria-hidden="true">☰</span>
          </button>
          <span className="app-header__title">{household.appName}</span>
          {months.length > 0 && (
            <label className="app-header__month-select no-print">
              <span className="visually-hidden">Selected month</span>
              <select
                value={selectedMonth?.id ?? ''}
                onChange={(e) => {
                  selectMonth(e.target.value);
                  navigate('/');
                }}
              >
                {sortedMonths.map((m) => (
                  <option key={m.id} value={m.id}>
                    {monthKeyLabel(m.monthKey)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </header>

      <div className="app-body">
        <nav
          id="app-nav"
          className={`app-nav no-print ${menuOpen ? 'is-open' : ''}`}
          aria-label="Primary"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `app-nav__link ${isActive ? 'is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <main className="app-main container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

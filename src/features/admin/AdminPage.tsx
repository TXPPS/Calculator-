import { useState } from 'react';
import { HouseholdSettings } from './HouseholdSettings';
import { CategorySettings } from './CategorySettings';
import { TemplateSettings } from './TemplateSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { MonthManagement } from './MonthManagement';
import { DataManagement } from './DataManagement';
import { DataHealthPanel } from './DataHealthPanel';

type Tab = 'household' | 'categories' | 'templates' | 'appearance' | 'months' | 'data' | 'health';

const TABS: { id: Tab; label: string }[] = [
  { id: 'household', label: 'Household' },
  { id: 'categories', label: 'Categories' },
  { id: 'templates', label: 'Templates & Defaults' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'months', label: 'Months' },
  { id: 'data', label: 'Data' },
  { id: 'health', label: 'Data Health' },
];

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('household');

  return (
    <section className="page">
      <header className="page__header">
        <div>
          <h1>Admin / Settings</h1>
          <p className="page__description">Configure your household plan without touching code.</p>
        </div>
      </header>

      <div className="admin-tabs" role="tablist" aria-label="Admin sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`admin-tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card admin-panel" role="tabpanel">
        {tab === 'household' && <HouseholdSettings />}
        {tab === 'categories' && <CategorySettings />}
        {tab === 'templates' && <TemplateSettings />}
        {tab === 'appearance' && <AppearanceSettings />}
        {tab === 'months' && <MonthManagement />}
        {tab === 'data' && <DataManagement />}
        {tab === 'health' && <DataHealthPanel />}
      </div>
    </section>
  );
}

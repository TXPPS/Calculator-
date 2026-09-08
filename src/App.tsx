import { Route, Routes } from 'react-router-dom';
import { useAppData } from './context/AppDataContext';
import { AppShell } from './components/layout/AppShell';
import { OnboardingPage } from './features/onboarding/OnboardingPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { BreakdownPage } from './features/dashboard/BreakdownPage';
import { IncomePage } from './features/income/IncomePage';
import { BillsPage } from './features/bills/BillsPage';
import { PlannedSpendingPage } from './features/planned-spending/PlannedSpendingPage';
import { FamilyFunPage } from './features/family-fun/FamilyFunPage';
import { SavingsPage } from './features/savings/SavingsPage';
import { MonthsPage } from './features/months/MonthsPage';
import { AdminPage } from './features/admin/AdminPage';
import { PrintPage } from './features/print/PrintPage';

export function App() {
  const { loading, household, refreshHousehold } = useAppData();

  if (loading) {
    return <div className="app-loading">Loading…</div>;
  }

  if (!household.onboardingComplete) {
    return <OnboardingPage onComplete={refreshHousehold} />;
  }

  return (
    <Routes>
      <Route path="/print" element={<PrintPage />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/income" element={<IncomePage />} />
        <Route path="/bills" element={<BillsPage />} />
        <Route path="/planned-spending" element={<PlannedSpendingPage />} />
        <Route path="/family-fun" element={<FamilyFunPage />} />
        <Route path="/savings" element={<SavingsPage />} />
        <Route path="/breakdown" element={<BreakdownPage />} />
        <Route path="/months" element={<MonthsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>
    </Routes>
  );
}

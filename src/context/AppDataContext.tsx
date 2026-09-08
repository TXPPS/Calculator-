import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { HouseholdConfig, DEFAULT_HOUSEHOLD } from '../domain/household/types';
import { Category } from '../domain/categories/types';
import { MonthKey, MonthlyPlan, currentMonthKey } from '../domain/monthly-plan/types';
import { IncomeEntry } from '../domain/income/types';
import { ExpenseEntry } from '../domain/expenses/types';
import { householdRepository } from '../data/repositories/householdRepository';
import { categoryRepository } from '../data/repositories/categoryRepository';
import { monthRepository } from '../data/repositories/monthRepository';
import { incomeRepository } from '../data/repositories/incomeRepository';
import { expenseRepository } from '../data/repositories/expenseRepository';
import { preferencesRepository } from '../data/repositories/preferencesRepository';
import { createMonth as createMonthService } from '../data/repositories/monthCopyService';
import { calculatePlanSummary, PlanSummary } from '../domain/calculations/planCalculations';

interface AppDataContextValue {
  loading: boolean;
  household: HouseholdConfig;
  categories: Category[];
  activeCategories: Category[];
  months: MonthlyPlan[];
  selectedMonth: MonthlyPlan | null;
  selectMonth: (monthId: string) => void;
  incomeEntries: IncomeEntry[];
  expenseEntries: ExpenseEntry[];
  summary: PlanSummary;
  previousMonth: MonthlyPlan | null;
  previousSummary: PlanSummary | null;

  refreshHousehold: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshMonths: () => Promise<void>;
  refreshEntries: () => Promise<void>;

  createNewMonth: (monthKey: MonthKey, copyFromMonthId: string | null) => Promise<MonthlyPlan>;
  deleteMonth: (monthId: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

const EMPTY_SUMMARY = calculatePlanSummary([], []);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<HouseholdConfig>(DEFAULT_HOUSEHOLD);
  const [categories, setCategories] = useState<Category[]>([]);
  const [months, setMonths] = useState<MonthlyPlan[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState<string | null>(null);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
  const [previousIncomeEntries, setPreviousIncomeEntries] = useState<IncomeEntry[]>([]);
  const [previousExpenseEntries, setPreviousExpenseEntries] = useState<ExpenseEntry[]>([]);

  const refreshHousehold = useCallback(async () => {
    const h = await householdRepository.get();
    setHousehold(h);
  }, []);

  const refreshCategories = useCallback(async () => {
    const c = await categoryRepository.getAll();
    setCategories(c);
  }, []);

  const refreshMonths = useCallback(async () => {
    const m = await monthRepository.getAll();
    setMonths(m);
    return m;
  }, []);

  useEffect(() => {
    (async () => {
      const [h, c, m, prefs] = await Promise.all([
        householdRepository.get(),
        categoryRepository.getAll(),
        monthRepository.getAll(),
        preferencesRepository.get(),
      ]);
      setHousehold(h);
      setCategories(c);
      setMonths(m);

      let initial: MonthlyPlan | undefined;
      if (prefs.lastSelectedMonthKey) {
        initial = m.find((mo) => mo.monthKey === prefs.lastSelectedMonthKey);
      }
      if (!initial) {
        const key = currentMonthKey();
        initial = m.find((mo) => mo.monthKey === key);
      }
      if (!initial && m.length > 0) {
        initial = m[m.length - 1];
      }
      if (initial) setSelectedMonthId(initial.id);
      setLoading(false);
    })();
  }, []);

  const selectedMonth = useMemo(
    () => months.find((m) => m.id === selectedMonthId) ?? null,
    [months, selectedMonthId]
  );

  const previousMonth = useMemo(() => {
    if (!selectedMonth) return null;
    const sorted = [...months].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
    const idx = sorted.findIndex((m) => m.id === selectedMonth.id);
    if (idx <= 0) return null;
    return sorted[idx - 1] ?? null;
  }, [months, selectedMonth]);

  const refreshEntries = useCallback(async () => {
    if (!selectedMonth) {
      setIncomeEntries([]);
      setExpenseEntries([]);
      return;
    }
    const [income, expenses] = await Promise.all([
      incomeRepository.getForMonth(selectedMonth.id),
      expenseRepository.getForMonth(selectedMonth.id),
    ]);
    setIncomeEntries(income);
    setExpenseEntries(expenses);
  }, [selectedMonth]);

  useEffect(() => {
    refreshEntries();
  }, [refreshEntries]);

  useEffect(() => {
    (async () => {
      if (!previousMonth) {
        setPreviousIncomeEntries([]);
        setPreviousExpenseEntries([]);
        return;
      }
      const [income, expenses] = await Promise.all([
        incomeRepository.getForMonth(previousMonth.id),
        expenseRepository.getForMonth(previousMonth.id),
      ]);
      setPreviousIncomeEntries(income);
      setPreviousExpenseEntries(expenses);
    })();
  }, [previousMonth]);

  const selectMonth = useCallback((monthId: string) => {
    setSelectedMonthId(monthId);
    const month = months.find((m) => m.id === monthId);
    if (month) {
      preferencesRepository.get().then((prefs) => {
        preferencesRepository.save({ ...prefs, lastSelectedMonthKey: month.monthKey });
      });
    }
  }, [months]);

  const createNewMonth = useCallback(
    async (monthKey: MonthKey, copyFromMonthId: string | null) => {
      const plan = await createMonthService(monthKey, copyFromMonthId);
      const updated = await refreshMonths();
      setSelectedMonthId(plan.id);
      const prefs = await preferencesRepository.get();
      await preferencesRepository.save({ ...prefs, lastSelectedMonthKey: plan.monthKey });
      void updated;
      return plan;
    },
    [refreshMonths]
  );

  const deleteMonth = useCallback(
    async (monthId: string) => {
      await monthRepository.delete(monthId);
      const updated = await refreshMonths();
      if (selectedMonthId === monthId) {
        setSelectedMonthId(updated.length > 0 ? updated[updated.length - 1]!.id : null);
      }
    },
    [refreshMonths, selectedMonthId]
  );

  const activeCategories = useMemo(() => categories.filter((c) => !c.archived), [categories]);

  const summary = useMemo(
    () => calculatePlanSummary(incomeEntries, expenseEntries),
    [incomeEntries, expenseEntries]
  );

  const previousSummary = useMemo(
    () =>
      previousMonth ? calculatePlanSummary(previousIncomeEntries, previousExpenseEntries) : null,
    [previousMonth, previousIncomeEntries, previousExpenseEntries]
  );

  const value: AppDataContextValue = {
    loading,
    household,
    categories,
    activeCategories,
    months,
    selectedMonth,
    selectMonth,
    incomeEntries,
    expenseEntries,
    summary: selectedMonth ? summary : EMPTY_SUMMARY,
    previousMonth,
    previousSummary,
    refreshHousehold,
    refreshCategories,
    refreshMonths: async () => {
      await refreshMonths();
    },
    refreshEntries,
    createNewMonth,
    deleteMonth,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}

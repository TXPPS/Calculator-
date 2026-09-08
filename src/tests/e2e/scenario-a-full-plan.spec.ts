import { test, expect } from '@playwright/test';
import { completeOnboarding, goTo, addIncome, addExpense } from './fixtures';

test('creates a complete monthly plan from blank and dashboard totals match', async ({ page }) => {
  await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-09' });

  // Income for both people.
  await addIncome(page, { personLabel: 'Alex', description: 'Alex Paycheck', amount: '4000' });
  await addIncome(page, { personLabel: 'Sam', description: 'Sam Paycheck', amount: '3000' });

  // A bill for each owner type: person1-owned, person2-owned, shared.
  await addExpense(page, {
    navLabel: 'Bills',
    addButtonLabel: 'Add bill',
    name: 'Car Payment',
    category: 'Transportation',
    amount: '300',
    owner: 'person1',
    dueDay: 5,
  });
  await addExpense(page, {
    navLabel: 'Bills',
    addButtonLabel: 'Add bill',
    name: 'Phone Plan',
    category: 'Subscriptions',
    amount: '100',
    owner: 'person2',
  });
  await addExpense(page, {
    navLabel: 'Bills',
    addButtonLabel: 'Add bill',
    name: 'Rent',
    category: 'Housing',
    amount: '2000',
    owner: 'both',
    splitMethod: 'even',
    dueDay: 1,
  });

  // Planned spending.
  await addExpense(page, {
    navLabel: 'Planned Spending',
    addButtonLabel: 'Add planned spending',
    name: 'Groceries',
    category: 'Groceries',
    amount: '600',
    owner: 'both',
    splitMethod: 'even',
  });

  // Family fun.
  await addExpense(page, {
    navLabel: 'Family Fun',
    addButtonLabel: 'Add fun fund item',
    name: 'Date Night',
    amount: '150',
    owner: 'both',
    splitMethod: 'even',
  });

  // Savings.
  await addExpense(page, {
    navLabel: 'Savings',
    addButtonLabel: 'Add savings goal',
    name: 'Emergency Fund',
    amount: '500',
    owner: 'both',
    splitMethod: 'even',
  });

  await goTo(page, 'Dashboard');

  // Household income = 4000 + 3000 = 7000
  await expect(page.locator('.household-summary__value').first()).toContainText('$7,000.00');

  // Total allocated = 300 + 100 + 2000 + 600 + 150 + 500 = 3650
  const allocatedRow = page.locator('.household-summary__row', { hasText: 'Total allocated' });
  await expect(allocatedRow.locator('.household-summary__value')).toContainText('$3,650.00');

  // Remaining = 7000 - 3650 = 3350
  const remainingRow = page.locator('.household-summary__row--hero');
  await expect(remainingRow).toContainText('$3,350.00');
  await expect(remainingRow).not.toContainText('shortfall', { ignoreCase: true });

  // No overallocation warning.
  await expect(page.getByRole('alert')).toHaveCount(0);
});

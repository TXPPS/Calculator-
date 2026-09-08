import { test, expect } from '@playwright/test';
import { completeOnboarding, goTo, addIncome, addExpense } from './fixtures';

test('household shortfall message appears when overallocated and disappears once resolved', async ({ page }) => {
  await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-09' });

  await addIncome(page, { personLabel: 'Alex', description: 'Alex Paycheck', amount: '1000' });

  await addExpense(page, {
    navLabel: 'Bills',
    addButtonLabel: 'Add bill',
    name: 'Big Rent',
    category: 'Housing',
    amount: '1500',
    owner: 'person1',
  });

  await goTo(page, 'Dashboard');
  await expect(page.getByText(/exceeds expected income/)).toBeVisible();
  await expect(page.locator('.household-summary')).toHaveClass(/is-negative/);

  // Resolve the shortfall by reducing the bill.
  await goTo(page, 'Bills');
  await page.locator('.entry-card', { hasText: 'Big Rent' }).getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Amount').fill('500');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await dialog.waitFor({ state: 'detached' });

  await goTo(page, 'Dashboard');
  await expect(page.getByText(/exceeds expected income/)).toHaveCount(0);
  await expect(page.locator('.household-summary')).toHaveClass(/is-positive/);
});

import { test, expect } from '@playwright/test';
import { completeOnboarding, goTo, addIncome, addExpense } from './fixtures';

test('copying a month carries only recurring items, never one-time items or notes', async ({ page }) => {
  await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-09' });

  // Recurring income + a one-time bonus.
  await addIncome(page, { personLabel: 'Alex', description: 'Recurring Paycheck', amount: '4000', recurring: true });
  await addIncome(page, { personLabel: 'Alex', description: 'One-time Bonus', amount: '500', recurring: false });

  // Recurring bill + a one-time repair.
  await addExpense(page, {
    navLabel: 'Bills',
    addButtonLabel: 'Add bill',
    name: 'Recurring Rent',
    category: 'Housing',
    amount: '2000',
    owner: 'person1',
    recurring: true,
  });
  await addExpense(page, {
    navLabel: 'Bills',
    addButtonLabel: 'Add bill',
    name: 'One-time Repair',
    category: 'Household',
    amount: '250',
    owner: 'person1',
    recurring: false,
  });

  // Add a note to month 1.
  await goTo(page, 'Months');
  const month1Notes = page.locator('.card', { hasText: 'Notes for' }).getByRole('textbox');
  await month1Notes.fill('three-paycheck month');
  await month1Notes.blur();

  // Create month 2, copying from month 1.
  await page.getByRole('button', { name: 'New month' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Month').fill('2026-10');
  await dialog.getByRole('radio', { name: /Copy recurring items from/ }).check();
  await dialog.getByRole('button', { name: 'Create month' }).click();
  await dialog.waitFor({ state: 'detached' });

  // We should now be on month 2 with no notes carried over.
  await expect(page.getByRole('heading', { name: 'Months' })).toBeVisible();
  const notesArea = page.locator('.card', { hasText: 'Notes for' }).getByRole('textbox');
  await expect(notesArea).toHaveValue('');

  // Only the recurring income entry carried over.
  await goTo(page, 'Income');
  await expect(page.getByText('Recurring Paycheck')).toBeVisible();
  await expect(page.getByText('One-time Bonus')).toHaveCount(0);

  // Only the recurring bill carried over.
  await goTo(page, 'Bills');
  await expect(page.getByText('Recurring Rent')).toBeVisible();
  await expect(page.getByText('One-time Repair')).toHaveCount(0);
});

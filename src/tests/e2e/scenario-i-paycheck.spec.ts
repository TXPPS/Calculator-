import { test, expect } from '@playwright/test';
import { completeOnboarding, goTo, addExpense } from './fixtures';

/**
 * End-to-end coverage for paycheck-frequency income: adding a biweekly
 * paycheck whose anchor date produces a 3-paycheck month, confirming the
 * calculated count/pay dates/total show up on Income, Dashboard, and
 * Breakdown, then exercising the manual override + "return to automatic"
 * flow.
 */
test('paycheck income calculates a 3-paycheck month and supports manual override', async ({ page }) => {
  // Biweekly anchor 2026-01-02 produces 3 paychecks in January 2026
  // (Jan 2, Jan 16, Jan 30) and 2 in every neighboring month.
  await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-01' });

  await goTo(page, 'Income');
  await page.getByRole('button', { name: 'Add income for Alex' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Description').fill('Alex Biweekly Job');
  await dialog.getByLabel('Income type').selectOption({ label: 'Paycheck' });
  await dialog.locator('.currency-input__field').first().fill('1000');
  await dialog.getByLabel('Known payday (schedule anchor)').fill('2026-01-02');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await dialog.waitFor({ state: 'detached' });

  // Income page shows the calculated occurrence count, pay dates, and total.
  const card = page.locator('.entry-card', { hasText: 'Alex Biweekly Job' });
  await expect(card).toContainText('3 paychecks');
  await expect(card).toContainText('Jan 2');
  await expect(card).toContainText('Jan 16');
  await expect(card).toContainText('Jan 30');
  await expect(card).toContainText('$3,000.00');
  await expect(card).toContainText('3 paychecks this month');

  // Dashboard totals reflect the calculated $3,000.
  await goTo(page, 'Dashboard');
  await expect(page.locator('.household-summary__value').first()).toContainText('$3,000.00');

  // Breakdown / plan check should also reflect it.
  await goTo(page, 'Breakdown');
  const expectedIncomeRow = page.locator('.plan-check__row', { hasText: 'Expected income' });
  await expect(expectedIncomeRow).toContainText('$3,000.00');

  // Edit the entry and trigger a manual override.
  await goTo(page, 'Income');
  await page.locator('.entry-card', { hasText: 'Alex Biweekly Job' }).getByRole('button', { name: 'Edit' }).click();
  const editDialog = page.getByRole('dialog');
  await editDialog.getByLabel('Override the calculated count/total for this month').check();
  const overrideTotal = editDialog.locator('.split-percentage-row .currency-input__field');
  await overrideTotal.fill('2500');
  await editDialog.getByRole('button', { name: 'Save' }).click();
  await editDialog.waitFor({ state: 'detached' });

  const overriddenCard = page.locator('.entry-card', { hasText: 'Alex Biweekly Job' });
  await expect(overriddenCard).toContainText('Manually overridden');
  await expect(overriddenCard).toContainText('$2,500.00');
  await expect(overriddenCard).toContainText('calculated would be');
  await expect(overriddenCard).toContainText('$3,000.00');

  // Household total on Dashboard now reflects the override.
  await goTo(page, 'Dashboard');
  await expect(page.locator('.household-summary__value').first()).toContainText('$2,500.00');

  // "Return to automatic calculation" restores the schedule-calculated value.
  await goTo(page, 'Income');
  await page.locator('.entry-card', { hasText: 'Alex Biweekly Job' }).getByRole('button', { name: 'Edit' }).click();
  const editDialog2 = page.getByRole('dialog');
  await editDialog2.getByRole('button', { name: 'Return to automatic calculation' }).click();
  await editDialog2.getByRole('button', { name: 'Save' }).click();
  await editDialog2.waitFor({ state: 'detached' });

  const restoredCard = page.locator('.entry-card', { hasText: 'Alex Biweekly Job' });
  await expect(restoredCard).not.toContainText('Manually overridden');
  await expect(restoredCard).toContainText('$3,000.00');

  await goTo(page, 'Dashboard');
  await expect(page.locator('.household-summary__value').first()).toContainText('$3,000.00');

  // Sanity: adding an unrelated expense doesn't disturb the income math above.
  await addExpense(page, {
    navLabel: 'Bills',
    addButtonLabel: 'Add bill',
    name: 'Rent',
    category: 'Housing',
    amount: '500',
    owner: 'person1',
  });
});

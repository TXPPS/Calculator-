import { test, expect } from '@playwright/test';
import { completeOnboarding, goTo, addExpense } from './fixtures';

/**
 * The rewritten print/PDF report: verify it renders real data end-to-end
 * (paycheck income table, bill split shares, executive summary, final plan
 * status) rather than being empty or showing stale numbers.
 */
test('print report renders paycheck income, bill splits, and plan status', async ({ page }) => {
  await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-01' });

  // Paycheck income for Alex: biweekly, 3 checks in Jan 2026, $3,000 total.
  await goTo(page, 'Income');
  await page.getByRole('button', { name: 'Add income for Alex' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Description').fill('Report Paycheck');
  await dialog.getByLabel('Income type').selectOption({ label: 'Paycheck' });
  await dialog.locator('.currency-input__field').first().fill('1000');
  await dialog.getByLabel('Known payday (schedule anchor)').fill('2026-01-02');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await dialog.waitFor({ state: 'detached' });

  // A shared bill with an explicit percentage split.
  await addExpense(page, {
    navLabel: 'Bills',
    addButtonLabel: 'Add bill',
    name: 'Report Rent',
    category: 'Housing',
    amount: '1000',
    owner: 'both',
    splitMethod: 'percentage',
    person1Percent: 70,
  });

  await page.goto('/#/print');

  // Executive summary reflects real totals (income and allocated).
  await expect(page.getByRole('heading', { name: 'Executive Monthly Summary' })).toBeVisible();
  await expect(page.getByText('$3,000.00').first()).toBeVisible();

  // Income / Paychecks section shows the paycheck's frequency, per-check
  // amount, occurrence count, pay dates, and total.
  await expect(page.getByRole('heading', { name: 'Income / Paychecks' })).toBeVisible();
  await expect(page.getByText('Report Paycheck')).toBeVisible();
  await expect(page.getByText('Biweekly').first()).toBeVisible();
  await expect(page.getByText('Jan 2', { exact: false })).toBeVisible();

  // Bills table shows the split shares (70/30 of $1,000 -> $700 / $300).
  await expect(page.getByRole('heading', { name: 'Required Bills' })).toBeVisible();
  await expect(page.getByText('Report Rent')).toBeVisible();
  await expect(page.getByText('70% / 30%')).toBeVisible();
  await expect(page.getByText('$700.00').first()).toBeVisible();
  await expect(page.getByText('$300.00').first()).toBeVisible();

  // Final Plan Status section is present and shows household income.
  await expect(page.getByRole('heading', { name: 'Final Plan Status' })).toBeVisible();
  const finalStatus = page.locator('.report-hero', { hasText: 'Final Plan Status' });
  await expect(finalStatus).toContainText('$3,000.00');
});

import { test, expect } from '@playwright/test';
import { completeOnboarding, goTo, addIncome, addExpense } from './fixtures';

test('monthly review tracks reviewed sections and detects changes since review', async ({ page }) => {
  await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-09' });

  await addIncome(page, { personLabel: 'Alex', description: 'Alex Paycheck', amount: '4000' });
  await addExpense(page, {
    navLabel: 'Bills',
    addButtonLabel: 'Add bill',
    name: 'Rent',
    category: 'Housing',
    amount: '1000',
    owner: 'person1',
  });

  // Navigate to /review via the Dashboard "Review this month" button.
  await goTo(page, 'Dashboard');
  await page.getByRole('link', { name: 'Review this month' }).click();
  await expect(page.getByRole('heading', { name: /Monthly Review/ })).toBeVisible();

  // Mark the Income section reviewed.
  const incomeCard = page.locator('.review-card', { hasText: 'Income' }).first();
  await expect(incomeCard.locator('.chip')).toContainText('Not yet reviewed');
  await incomeCard.getByRole('button', { name: 'Mark reviewed' }).click();
  await expect(incomeCard.locator('.chip')).toContainText('Reviewed');

  // Edit an amount in that section (income), then return to /review.
  await goTo(page, 'Income');
  await page.locator('.entry-card', { hasText: 'Alex Paycheck' }).getByRole('button', { name: 'Edit' }).click();
  const editDialog = page.getByRole('dialog');
  await editDialog.locator('.currency-input__field').first().fill('4500');
  await editDialog.getByRole('button', { name: 'Save' }).click();
  await editDialog.waitFor({ state: 'detached' });

  await goTo(page, 'Dashboard');
  await page.getByRole('link', { name: 'Review this month' }).click();
  const incomeCardAfterEdit = page.locator('.review-card', { hasText: 'Income' }).first();
  await expect(incomeCardAfterEdit.locator('.chip')).toContainText('Changed since review');

  // Mark it reviewed again.
  await incomeCardAfterEdit.getByRole('button', { name: 'Mark reviewed again' }).click();
  await expect(incomeCardAfterEdit.locator('.chip')).toContainText('Reviewed');

  // Mark the remaining sections reviewed too.
  for (const title of ['Required Bills', 'Planned Spending', 'Family Fun', 'Savings']) {
    const card = page.locator('.review-card', { hasText: title }).first();
    const btn = card.getByRole('button', { name: /Mark reviewed/ });
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
    }
  }

  // Monthly Plan Review summary matches Dashboard numbers.
  await expect(page.locator('.monthly-review-summary')).toContainText('All sections reviewed.');
  const summaryIncomeRow = page.locator('.monthly-review-summary .plan-check__row', { hasText: 'Expected household income' });
  await expect(summaryIncomeRow).toContainText('$4,500.00');

  await goTo(page, 'Dashboard');
  await expect(page.locator('.household-summary__value').first()).toContainText('$4,500.00');
});

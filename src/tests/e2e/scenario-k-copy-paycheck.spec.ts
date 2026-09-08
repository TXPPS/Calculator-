import { test, expect } from '@playwright/test';
import { completeOnboarding, goTo } from './fixtures';

/**
 * Copying a month with a recurring paycheck must recalculate the schedule
 * against the destination month's real calendar, not carry the source
 * month's static occurrence count/total forward.
 *
 * Biweekly anchor 2026-01-02: June 2026 has 2 paychecks, July 2026 has 3.
 */
test('month copy recalculates paycheck occurrences/total for the destination month', async ({ page }) => {
  await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-06' });

  await goTo(page, 'Income');
  await page.getByRole('button', { name: 'Add income for Alex' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Description').fill('Biweekly Job');
  await dialog.getByLabel('Income type').selectOption({ label: 'Paycheck' });
  await dialog.locator('.currency-input__field').first().fill('1000');
  await dialog.getByLabel('Known payday (schedule anchor)').fill('2026-01-02');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await dialog.waitFor({ state: 'detached' });

  const sourceCard = page.locator('.entry-card', { hasText: 'Biweekly Job' });
  await expect(sourceCard).toContainText('2 paychecks');
  await expect(sourceCard).toContainText('$2,000.00');

  // Copy June -> July.
  await goTo(page, 'Months');
  await page.getByRole('button', { name: 'New month' }).click();
  const monthDialog = page.getByRole('dialog');
  await monthDialog.getByLabel('Month').fill('2026-07');
  await monthDialog.getByRole('radio', { name: /Copy recurring items from/ }).check();
  await monthDialog.getByRole('button', { name: 'Create month' }).click();
  await monthDialog.waitFor({ state: 'detached' });

  await goTo(page, 'Income');
  const copiedCard = page.locator('.entry-card', { hasText: 'Biweekly Job' });
  await expect(copiedCard).toContainText('3 paychecks');
  await expect(copiedCard).toContainText('$3,000.00');
  await expect(copiedCard).not.toContainText('$2,000.00');

  await goTo(page, 'Dashboard');
  await expect(page.locator('.household-summary__value').first()).toContainText('$3,000.00');
});

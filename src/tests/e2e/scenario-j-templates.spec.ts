import { test, expect } from '@playwright/test';
import { completeOnboarding, goTo } from './fixtures';

/**
 * Templates & Defaults: creating an income template (with a paycheck
 * schedule) and a bill template, then using each section's "Add from
 * template" quick-add to pull them into the current month.
 */
test('add from template works for income (paycheck) and bill templates', async ({ page }) => {
  await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-01' });

  // --- Create an income template with a paycheck schedule. ---
  await goTo(page, 'Admin');
  await page.getByRole('tab', { name: 'Templates & Defaults' }).click();
  await page.getByRole('button', { name: 'New income template' }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Description').fill('Template Paycheck');
  await dialog.getByLabel('Income type').selectOption({ label: 'Paycheck' });
  await dialog.locator('.currency-input__field').first().fill('1000');
  await dialog.getByLabel('Known payday (schedule anchor)').fill('2026-01-02');
  await dialog.getByRole('button', { name: 'Save template' }).click();
  await dialog.waitFor({ state: 'detached' });

  await expect(page.locator('.admin-list__item', { hasText: 'Template Paycheck' })).toBeVisible();

  // --- Create a bill template. ---
  const billHeader = page.locator('.admin-section__header', { has: page.getByRole('heading', { name: 'Bill templates' }) });
  await billHeader.getByRole('button', { name: 'New template' }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill('Template Rent');
  await dialog.locator('select').first().selectOption({ label: 'Housing' });
  await dialog.locator('.currency-input__field').first().fill('800');
  await dialog.getByRole('radio', { name: 'Both' }).check();
  await dialog.getByRole('button', { name: 'Save template' }).click();
  await dialog.waitFor({ state: 'detached' });

  await expect(page.locator('.admin-list__item', { hasText: 'Template Rent' })).toBeVisible();

  // --- Use "Add from template" on the Income page. ---
  await goTo(page, 'Income');
  await page.getByRole('button', { name: 'Add from template' }).click();
  const quickAdd = page.getByRole('dialog');
  await expect(quickAdd).toContainText('Template Paycheck');
  // Biweekly anchor 2026-01-02 produces 3 paychecks / $3,000 in January 2026.
  await expect(quickAdd).toContainText('3 paychecks');
  await quickAdd.locator('.admin-list__item', { hasText: 'Template Paycheck' }).getByRole('button', { name: 'Add' }).click();
  await quickAdd.waitFor({ state: 'detached' }).catch(() => {});

  const addedCard = page.locator('.entry-card', { hasText: 'Template Paycheck' });
  await expect(addedCard).toBeVisible();
  await expect(addedCard).toContainText('3 paychecks');
  await expect(addedCard).toContainText('$3,000.00');

  // --- Use "Add from template" on the Bills page. ---
  await goTo(page, 'Bills');
  await page.getByRole('button', { name: 'Add from template' }).click();
  const billQuickAdd = page.getByRole('dialog');
  await expect(billQuickAdd).toContainText('Template Rent');
  await billQuickAdd.locator('.admin-list__item', { hasText: 'Template Rent' }).getByRole('button', { name: 'Add' }).click();
  await billQuickAdd.waitFor({ state: 'detached' }).catch(() => {});

  const addedBillCard = page.locator('.entry-card', { hasText: 'Template Rent' });
  await expect(addedBillCard).toBeVisible();
  await expect(addedBillCard).toContainText('$800.00');
});

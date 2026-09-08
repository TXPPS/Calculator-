import { test, expect } from '@playwright/test';
import { completeOnboarding, goTo, addIncome } from './fixtures';

test('changing household names from Admin propagates everywhere', async ({ page }) => {
  await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-09' });

  // Add an income entry under the old names so we can confirm the dashboard/forms relabel it.
  await addIncome(page, { personLabel: 'Alex', description: 'Paycheck', amount: '1000' });

  await goTo(page, 'Admin');
  await page.getByRole('tab', { name: 'Household' }).click();
  const form = page.locator('form', { hasText: 'Household' });
  await form.getByLabel('Person 1 display name').fill('Jordan');
  await form.getByLabel('Person 2 display name').fill('Riley');
  await form.getByLabel('App display name').fill('Our Budget');
  await form.getByRole('button', { name: 'Save household settings' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();

  // Nav header title updates.
  await expect(page.locator('.app-header__title')).toHaveText('Our Budget');

  // Dashboard person cards relabel.
  await goTo(page, 'Dashboard');
  await expect(page.getByRole('heading', { name: 'Jordan' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Riley' })).toBeVisible();

  // Income form relabels too.
  await goTo(page, 'Income');
  await expect(page.getByRole('heading', { name: 'Jordan' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add income for Jordan' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add income for Riley' })).toBeVisible();
});

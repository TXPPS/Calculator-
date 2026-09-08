import { test, expect } from '@playwright/test';
import { completeOnboarding, goTo } from './fixtures';

async function openAppearanceTab(page: import('@playwright/test').Page) {
  await goTo(page, 'Admin');
  await page.getByRole('tab', { name: 'Appearance' }).click();
}

test('theme choice persists across a page reload', async ({ page }) => {
  await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-09' });

  await openAppearanceTab(page);

  // Switch to Dark.
  await page.getByRole('radio', { name: /^Dark/ }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // The preference write to IndexedDB is fire-and-forget from the UI's
  // perspective (there's no "Saved" indicator to wait on for a plain radio
  // toggle) — give it a moment to land before reloading, the way a real
  // user's reaction time would rather than Playwright's instant reload.
  await page.waitForTimeout(200);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  // The admin tab selection itself is local UI state and resets on reload;
  // re-open Appearance to confirm the persisted preference is reflected there too.
  await openAppearanceTab(page);
  await expect(page.getByRole('radio', { name: /^Dark/ })).toBeChecked();

  // Switch to Light.
  await page.getByRole('radio', { name: /^Light/ }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.waitForTimeout(200);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await openAppearanceTab(page);
  await expect(page.getByRole('radio', { name: /^Light/ })).toBeChecked();

  // Switch to System — should remove the explicit attribute entirely.
  await page.getByRole('radio', { name: /^System/ }).check();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  await page.waitForTimeout(200);
  await page.reload();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');
  await openAppearanceTab(page);
  await expect(page.getByRole('radio', { name: /^System/ })).toBeChecked();
});

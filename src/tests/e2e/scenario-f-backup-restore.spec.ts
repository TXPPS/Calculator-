import { test, expect } from '@playwright/test';
import path from 'path';
import os from 'os';
import { completeOnboarding, goTo, addIncome } from './fixtures';

test('exporting, modifying, then importing a backup restores the original data', async ({ page }) => {
  await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-09' });
  await addIncome(page, { personLabel: 'Alex', description: 'Original Paycheck', amount: '4000' });

  await goTo(page, 'Admin');
  await page.getByRole('tab', { name: 'Data', exact: true }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const download = await downloadPromise;
  const backupPath = path.join(os.tmpdir(), `backup-${test.info().testId}.json`);
  await download.saveAs(backupPath);

  // Change data: add another income entry that should disappear after restore.
  await addIncome(page, { personLabel: 'Sam', description: 'Extra Income To Be Reverted', amount: '9999' });
  await goTo(page, 'Income');
  await expect(page.getByText('Extra Income To Be Reverted')).toBeVisible();

  // Import the backup back.
  await goTo(page, 'Admin');
  await page.getByRole('tab', { name: 'Data', exact: true }).click();
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import backup' }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(backupPath);

  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Replace data' }).click();
  await page.waitForEvent('load', { timeout: 15000 });
  await page.waitForLoadState('networkidle');

  await goTo(page, 'Income');
  await expect(page.getByText('Original Paycheck')).toBeVisible();
  await expect(page.getByText('Extra Income To Be Reverted')).toHaveCount(0);
});

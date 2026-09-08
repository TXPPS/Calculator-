import { test, expect } from '@playwright/test';
import { completeOnboarding, goTo } from './fixtures';

test.describe('regression spot-checks for paycheck/template/review changes', () => {
  test('deleting a paycheck-type income entry requires confirmation and works', async ({ page }) => {
    await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-01' });

    await goTo(page, 'Income');
    await page.getByRole('button', { name: 'Add income for Alex' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Description').fill('Paycheck To Delete');
    await dialog.getByLabel('Income type').selectOption({ label: 'Paycheck' });
    await dialog.locator('.currency-input__field').first().fill('1000');
    await dialog.getByLabel('Known payday (schedule anchor)').fill('2026-01-02');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await dialog.waitFor({ state: 'detached' });

    await expect(page.locator('.entry-card', { hasText: 'Paycheck To Delete' })).toBeVisible();

    await page.locator('.entry-card', { hasText: 'Paycheck To Delete' }).getByRole('button', { name: 'Delete' }).click();
    const confirm = page.getByRole('dialog');
    await expect(confirm).toBeVisible();

    // Cancel first: the paycheck entry must survive.
    await confirm.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Paycheck To Delete')).toBeVisible();

    // Now actually confirm deletion.
    await page.locator('.entry-card', { hasText: 'Paycheck To Delete' }).getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Paycheck To Delete')).toHaveCount(0);
  });

  test('duplicating and archiving income and expense templates works after the form rewrite', async ({ page }) => {
    await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-01' });

    await goTo(page, 'Admin');
    await page.getByRole('tab', { name: 'Templates & Defaults' }).click();

    // --- Income template: duplicate + archive/restore. ---
    await page.getByRole('button', { name: 'New income template' }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel('Description').fill('Regress Income Template');
    await dialog.locator('.currency-input__field').first().fill('500');
    await dialog.getByRole('button', { name: 'Save template' }).click();
    await dialog.waitFor({ state: 'detached' });

    const incomeItem = page.locator('.admin-list__item', { hasText: 'Regress Income Template' });
    await incomeItem.getByRole('button', { name: 'Duplicate' }).click();
    const incomeCopy = page.locator('.admin-list__item', { hasText: 'Regress Income Template (copy)' });
    await expect(incomeCopy).toBeVisible();

    await incomeCopy.getByRole('button', { name: 'Archive' }).click();
    await expect(incomeCopy).toHaveClass(/is-archived/);
    await incomeCopy.getByRole('button', { name: 'Restore' }).click();
    await expect(incomeCopy).not.toHaveClass(/is-archived/);

    // --- Expense (bill) template: duplicate + archive/restore. ---
    const billHeader = page.locator('.admin-section__header', { has: page.getByRole('heading', { name: 'Bill templates' }) });
    await billHeader.getByRole('button', { name: 'New template' }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name').fill('Regress Bill Template');
    await dialog.locator('select').first().selectOption({ label: 'Housing' });
    await dialog.locator('.currency-input__field').first().fill('250');
    await dialog.getByRole('radio', { name: 'Both' }).check();
    await dialog.getByRole('button', { name: 'Save template' }).click();
    await dialog.waitFor({ state: 'detached' });

    const billItem = page.locator('.admin-list__item', { hasText: 'Regress Bill Template' });
    await billItem.getByRole('button', { name: 'Duplicate' }).click();
    const billCopy = page.locator('.admin-list__item', { hasText: 'Regress Bill Template (copy)' });
    await expect(billCopy).toBeVisible();

    await billCopy.getByRole('button', { name: 'Archive' }).click();
    await expect(billCopy).toHaveClass(/is-archived/);
    await billCopy.getByRole('button', { name: 'Restore' }).click();
    await expect(billCopy).not.toHaveClass(/is-archived/);
  });

  test('onboarding creates exactly one month with the new review field intact', async ({ page }) => {
    await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-01' });

    await goTo(page, 'Months');
    await expect(page.locator('.month-row')).toHaveCount(1);

    // The review page loads without error for a brand-new month (proves
    // MonthlyPlan.review was initialized, not undefined/crashing).
    await goTo(page, 'Dashboard');
    await page.getByRole('link', { name: 'Review this month' }).click();
    await expect(page.getByRole('heading', { name: /Monthly Review/ })).toBeVisible();
    await expect(page.getByText('0 of 5 sections reviewed')).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';
import { completeOnboarding, goTo, addIncome, addExpense } from './fixtures';

test.describe('functional correctness checks', () => {
  test('deleting a month cascades and removes its entries', async ({ page }) => {
    await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-09' });
    await addIncome(page, { personLabel: 'Alex', description: 'Paycheck', amount: '1000' });

    // Create a second month so the app still has a month to fall back to after deleting.
    await goTo(page, 'Months');
    await page.getByRole('button', { name: 'New month' }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByLabel('Month').fill('2026-10');
    await dialog.getByRole('button', { name: 'Create month' }).click();
    await dialog.waitFor({ state: 'detached' });

    await goTo(page, 'Months');
    const row = page.locator('.month-row', { hasText: 'September 2026' });
    await row.getByRole('button', { name: 'Delete' }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('permanently deletes');
    await dialog.getByRole('button', { name: 'Delete month' }).click();
    await dialog.waitFor({ state: 'detached' });

    await expect(page.locator('.month-row', { hasText: 'September 2026' })).toHaveCount(0);

    // App is now on October (the only remaining month) and did not crash;
    // the deleted month's data (verified at the repository layer in
    // monthWorkflow.test.ts) is unreachable through the UI entirely.
    await goTo(page, 'Income');
    await expect(page.getByText('No income sources yet.')).toHaveCount(2);
  });

  test('deleting an income entry requires confirmation', async ({ page }) => {
    await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-09' });
    await addIncome(page, { personLabel: 'Alex', description: 'Paycheck To Delete', amount: '1000' });

    await goTo(page, 'Income');
    await page
      .locator('.entry-card', { hasText: 'Paycheck To Delete' })
      .getByRole('button', { name: 'Delete' })
      .click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Cancel first: the entry must survive.
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Paycheck To Delete')).toBeVisible();

    // Now actually confirm deletion.
    await page
      .locator('.entry-card', { hasText: 'Paycheck To Delete' })
      .getByRole('button', { name: 'Delete' })
      .click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Paycheck To Delete')).toHaveCount(0);
  });

  test('deleting an expense entry requires confirmation', async ({ page }) => {
    await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-09' });
    await addExpense(page, {
      navLabel: 'Bills',
      addButtonLabel: 'Add bill',
      name: 'Bill To Delete',
      category: 'Housing',
      amount: '100',
      owner: 'person1',
    });

    await goTo(page, 'Bills');
    await page.locator('.entry-card', { hasText: 'Bill To Delete' }).getByRole('button', { name: 'Delete' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Bill To Delete')).toBeVisible();

    await page.locator('.entry-card', { hasText: 'Bill To Delete' }).getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Bill To Delete')).toHaveCount(0);
  });

  test('duplicating a bill produces an independently editable copy', async ({ page }) => {
    await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-09' });
    await addExpense(page, {
      navLabel: 'Bills',
      addButtonLabel: 'Add bill',
      name: 'Original Bill',
      category: 'Housing',
      amount: '200',
      owner: 'person1',
    });

    await goTo(page, 'Bills');
    await page.locator('.entry-card', { hasText: 'Original Bill' }).getByRole('button', { name: 'Duplicate' }).click();

    const copyCard = page.locator('.entry-card', { hasText: 'Original Bill (copy)' });
    await expect(copyCard).toBeVisible();

    // Edit the copy and confirm the original is untouched.
    await copyCard.getByRole('button', { name: 'Edit' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('.currency-input__field').first().fill('999');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await dialog.waitFor({ state: 'detached' });

    await expect(page.locator('.entry-card', { hasText: 'Original Bill (copy)' })).toContainText('$999.00');
    await expect(
      page.locator('.entry-card').filter({ hasText: 'Original Bill' }).filter({ hasNotText: 'copy' })
    ).toContainText('$200.00');
  });

  test('creating a duplicate month for the same key is blocked with a clear error', async ({ page }) => {
    await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-09' });

    await goTo(page, 'Months');
    await page.getByRole('button', { name: 'New month' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Month').fill('2026-09');
    await dialog.getByRole('button', { name: 'Create month' }).click();

    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('alert')).toContainText('already exists');
  });

  test('onboarding cannot be bypassed and creates exactly one month', async ({ page }) => {
    await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-09' });

    // Reloading (or navigating directly) never re-shows onboarding once complete.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Welcome' })).toHaveCount(0);
    await expect(page.locator('.app-header__title')).toBeVisible();

    await goTo(page, 'Months');
    await expect(page.locator('.month-row')).toHaveCount(1);
  });

  test('print view renders real data for the selected month', async ({ page }) => {
    await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-09' });
    await addIncome(page, { personLabel: 'Alex', description: 'Print Test Paycheck', amount: '1234' });
    await addExpense(page, {
      navLabel: 'Bills',
      addButtonLabel: 'Add bill',
      name: 'Print Test Bill',
      category: 'Housing',
      amount: '567',
      owner: 'person1',
    });

    // HashRouter: the route lives in the hash, not the path.
    await page.goto('/#/print');
    await expect(page.getByText('Print Test Paycheck')).toBeVisible();
    await expect(page.getByText('Print Test Bill')).toBeVisible();
    await expect(page.getByText('$1,234.00').first()).toBeVisible();
  });

  test('archiving a category does not remove it from historical entries', async ({ page }) => {
    await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-09' });
    await addExpense(page, {
      navLabel: 'Bills',
      addButtonLabel: 'Add bill',
      name: 'Archived Category Bill',
      category: 'Housing',
      amount: '300',
      owner: 'person1',
    });

    await goTo(page, 'Admin');
    await page.getByRole('tab', { name: 'Categories' }).click();
    const housingRow = page.locator('.admin-list__item', { hasText: 'Housing' });
    await housingRow.getByRole('button', { name: 'Archive' }).click();
    await expect(housingRow).toHaveClass(/is-archived/);

    // The historical bill still shows its category, not orphaned.
    await goTo(page, 'Bills');
    await expect(page.locator('.entry-card', { hasText: 'Archived Category Bill' })).toContainText('Housing');

    // But the archived category no longer offers itself for new entries.
    await page.getByRole('button', { name: 'Add bill', exact: true }).first().click();
    const dialog = page.getByRole('dialog');
    const options = await dialog.getByLabel('Category').locator('option').allTextContents();
    expect(options).not.toContain('Housing');
  });
});

import { test, expect } from '@playwright/test';
import { completeOnboarding, goTo, addIncome, addExpense } from './fixtures';

test.use({ viewport: { width: 390, height: 844 } });

test('core workflow works on a mobile viewport', async ({ page }) => {
  await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-09' });

  await addIncome(page, { personLabel: 'Alex', description: 'Mobile Paycheck', amount: '2000' });

  await addExpense(page, {
    navLabel: 'Bills',
    addButtonLabel: 'Add bill',
    name: 'Mobile Rent',
    category: 'Housing',
    amount: '800',
    owner: 'person1',
  });

  await goTo(page, 'Dashboard');
  await expect(page.locator('.household-summary__value').first()).toContainText('$2,000.00');
  const remainingRow = page.locator('.household-summary__row--hero');
  await expect(remainingRow).toContainText('$1,200.00');

  // Nav is reachable via the hamburger menu and no horizontal scroll is introduced.
  const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const viewportWidth = await page.evaluate(() => window.innerWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
});

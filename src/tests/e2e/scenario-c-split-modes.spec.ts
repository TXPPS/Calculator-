import { test, expect } from '@playwright/test';
import { completeOnboarding, goTo, addIncome, addExpense } from './fixtures';

test('every shared split mode reconciles to the bill total', async ({ page }) => {
  await completeOnboarding(page, { person1: 'Alex', person2: 'Sam', monthKey: '2026-09' });

  // Income needed for income-proportional split: Alex 6000, Sam 3000 (2:1 ratio).
  await addIncome(page, { personLabel: 'Alex', description: 'Alex Paycheck', amount: '6000' });
  await addIncome(page, { personLabel: 'Sam', description: 'Sam Paycheck', amount: '3000' });

  await addExpense(page, {
    navLabel: 'Bills',
    addButtonLabel: 'Add bill',
    name: 'Even Split Bill',
    category: 'Utilities',
    amount: '100',
    owner: 'both',
    splitMethod: 'even',
  });
  await addExpense(page, {
    navLabel: 'Bills',
    addButtonLabel: 'Add bill',
    name: 'Percentage Split Bill',
    category: 'Utilities',
    amount: '100',
    owner: 'both',
    splitMethod: 'percentage',
    person1Percent: 70,
  });
  await addExpense(page, {
    navLabel: 'Bills',
    addButtonLabel: 'Add bill',
    name: 'Exact Split Bill',
    category: 'Utilities',
    amount: '100',
    owner: 'both',
    splitMethod: 'exact',
    person1Amount: '30',
  });
  await addExpense(page, {
    navLabel: 'Bills',
    addButtonLabel: 'Add bill',
    name: 'Proportional Split Bill',
    category: 'Utilities',
    amount: '90',
    owner: 'both',
    splitMethod: 'incomeProportional',
  });

  await goTo(page, 'Bills');

  const checkSplit = async (name: string, totalCents: number, p1Cents: number, p2Cents: number) => {
    const card = page.locator('.entry-card', { hasText: name });
    const splitText = await card.locator('.entry-card__split').innerText();
    // Extract the two dollar figures from the split preview text.
    const amounts = splitText.match(/\$[\d,]+\.\d{2}/g) ?? [];
    expect(amounts).toHaveLength(2);
    const parsed = amounts.map((a) => Math.round(parseFloat(a.replace(/[$,]/g, '')) * 100));
    expect(parsed[0]).toBe(p1Cents);
    expect(parsed[1]).toBe(p2Cents);
    expect(parsed[0]! + parsed[1]!).toBe(totalCents);
  };

  await checkSplit('Even Split Bill', 10000, 5000, 5000);
  await checkSplit('Percentage Split Bill', 10000, 7000, 3000);
  await checkSplit('Exact Split Bill', 10000, 3000, 7000);
  // Income-proportional: 6000:3000 ratio == 2:1 of a 9000-cent total -> 6000/3000.
  await checkSplit('Proportional Split Bill', 9000, 6000, 3000);
});

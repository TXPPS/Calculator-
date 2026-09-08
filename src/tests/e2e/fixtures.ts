import { Page } from '@playwright/test';

export async function completeOnboarding(
  page: Page,
  opts: { person1?: string; person2?: string; monthKey?: string } = {}
) {
  const { person1 = 'Alex', person2 = 'Sam', monthKey } = opts;
  await page.goto('/');
  await page.getByLabel('Person 1 name').fill(person1);
  await page.getByLabel('Person 2 name').fill(person2);
  if (monthKey) {
    await page.getByLabel('First month to plan').fill(monthKey);
  }
  await page.getByRole('button', { name: 'Get started' }).click();
  await page.waitForSelector('text=Dashboard', { timeout: 10000 }).catch(() => {});
}

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

/** Opens the mobile/tablet hamburger nav if it's the only way to reach the links. No-op on wide viewports where nav is always visible. */
export async function openNav(page: Page) {
  const toggle = page.getByRole('button', { name: 'Toggle navigation' });
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
  }
}

/** Navigates via the primary nav, opening the mobile menu first if needed. */
export async function goTo(page: Page, label: string) {
  await openNav(page);
  await page.getByRole('link', { name: label, exact: true }).click();
}

export interface IncomeOpts {
  personLabel: string;
  description: string;
  amount: string;
  recurring?: boolean;
}

export async function addIncome(page: Page, opts: IncomeOpts) {
  await goTo(page, 'Income');
  await page.getByRole('button', { name: `Add income for ${opts.personLabel}` }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Description').fill(opts.description);
  await dialog.getByLabel('Expected amount this month').fill(opts.amount);
  if (opts.recurring === false) {
    await dialog.getByLabel(/Recurring/).uncheck();
  }
  await dialog.getByRole('button', { name: 'Save' }).click();
  await dialog.waitFor({ state: 'detached' });
}

export interface ExpenseOpts {
  navLabel: 'Bills' | 'Planned Spending' | 'Family Fun' | 'Savings';
  addButtonLabel: string;
  name: string;
  category?: string;
  amount: string;
  owner?: 'person1' | 'person2' | 'both';
  ownerPersonLabel?: string;
  splitMethod?: 'even' | 'percentage' | 'exact' | 'incomeProportional';
  person1Percent?: number;
  person1Amount?: string;
  recurring?: boolean;
  dueDay?: number;
  notes?: string;
}

export async function addExpense(page: Page, opts: ExpenseOpts) {
  await goTo(page, opts.navLabel);
  // The same "Add ..." label appears both in the page header and (when the
  // section is empty) in the empty-state action — always use the header one.
  await page.getByRole('button', { name: opts.addButtonLabel, exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill(opts.name);

  if (opts.category) {
    await dialog.locator('select').first().selectOption({ label: opts.category });
  }

  // NOTE: dialog.getByLabel('Amount') is unreliable here — Playwright's
  // implicit-label resolution occasionally also matches the unrelated
  // "Split method" <select> further down the form even though their
  // accessible names are distinct (confirmed via ariaSnapshot). The Amount
  // currency input is always the first ".currency-input__field" in the form.
  await dialog.locator('.currency-input__field').first().fill(opts.amount);

  const owner = opts.owner ?? 'both';
  if (owner === 'both') {
    await dialog.getByRole('radio', { name: 'Both' }).check();
  } else if (opts.ownerPersonLabel) {
    await dialog.getByRole('radio', { name: opts.ownerPersonLabel, exact: true }).check();
  }

  if (owner === 'both' && opts.splitMethod) {
    await dialog.getByLabel('Split method').selectOption({
      label:
        opts.splitMethod === 'even'
          ? '50 / 50'
          : opts.splitMethod === 'percentage'
          ? 'Custom percentage'
          : opts.splitMethod === 'exact'
          ? 'Exact dollar amount'
          : 'Proportional to income',
    });
    if (opts.splitMethod === 'percentage' && opts.person1Percent !== undefined) {
      await dialog.locator('.split-percentage-row input[type="number"]').first().fill(String(opts.person1Percent));
    }
    if (opts.splitMethod === 'exact' && opts.person1Amount !== undefined) {
      await dialog.locator('.split-percentage-row .currency-input__field').first().fill(opts.person1Amount);
    }
  }

  if (opts.dueDay !== undefined) {
    await dialog.getByLabel(/Due day/).fill(String(opts.dueDay));
  }

  if (opts.recurring === false) {
    await dialog.getByLabel(/Recurring/).uncheck();
  }

  if (opts.notes) {
    await dialog.getByLabel(/Notes/).fill(opts.notes);
  }

  await dialog.getByRole('button', { name: 'Save' }).click();
  await dialog.waitFor({ state: 'detached' });
}

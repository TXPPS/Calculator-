# Household Spending Plan Calculator

A local-first monthly household spending plan calculator for two people. Built
to be used together, once a month, to plan expected income, required bills,
flexible spending, savings, and shared responsibilities — and to see clearly
how much money is left over (or how much the plan is short).

This is a **planning tool**, not a transaction tracker or bank-connected
budgeting app. There is no bank connectivity, no automatic transaction
import, and no rollover of unspent money between months.

## Purpose

Each month, a household answers questions like:

- How much income is each person expecting?
- What bills exist, and who is responsible for each one?
- How should shared bills be split?
- How much is planned for flexible spending, fun, and savings?
- How much money does each person — and the household — have remaining?
- Is anyone (or the household as a whole) allocated more than expected income?

## Architecture

```
src/
  domain/            Pure business logic — no React, no persistence
    money/            Integer-cent currency math, deterministic rounding
    splits/            Split method types + calculateSplit()
    income/            Income entry/template types, paycheck schedule date math
    expenses/           Expense entry/template types (bills, planned, fun, savings)
    household/          Household config types
    categories/         Category types
    monthly-plan/       Month key helpers, Monthly Review state
    calculations/       calculatePlanSummary(), comparePlanSummaries(), validation, review signatures

  data/               Persistence layer
    database/            IndexedDB schema + connection (via `idb`)
    repositories/         CRUD repositories per entity, copy-month service
    import-export/        JSON backup export/import/validation, data health check

  features/           One folder per screen, built on the domain + data layers
  components/         Reusable UI (shared/) and layout (layout/)
  context/            React context: ThemeContext, AppDataContext (household/month state)
  styles/             Design tokens, base styles, component styles, responsive, print
  tests/              unit/, integration/, e2e/
```

Financial logic is fully isolated from the UI: every screen calls
`calculatePlanSummary(incomeEntries, expenseEntries)` from
`src/domain/calculations/planCalculations.ts`, so figures can never drift
between the Dashboard, Breakdown, and print views.

Persistence is behind repository interfaces (`src/data/repositories/`), so a
hosted backend could later replace IndexedDB without touching the domain
layer or UI components.

## Financial calculation engine

- **Money** is stored as integer cents (`Cents = number`), never floats, to
  avoid currency rounding errors. See `src/domain/money/money.ts`.
- **Splitting** a shared amount between two people uses the largest-remainder
  method (`splitByWeights`) so odd-cent totals always reconcile exactly:
  `person1Share + person2Share === totalAmount`, always.
- **Split methods** (`src/domain/splits/`):
  - **50 / 50** — even split.
  - **Custom percentage** — person1's percentage; person2 is `100 - person1%`.
  - **Exact dollar** — person1's exact cents; person2 is the remainder.
  - **Proportional to income** — split by each person's share of combined
    household income for the month. If combined income is $0, the split
    cannot be calculated and the UI shows a clear message instead of
    dividing by zero.
- **Shared items count once** in household totals — never `total + share1 +
  share2`. This is enforced by construction (household total is section
  total, per-person totals derive from it) and covered by tests.
- **Shortfalls are never clamped to zero.** A negative remaining amount is
  shown as-is, with an explanatory message, both per-person and household.

## Paycheck / income frequency system

Income entries have an **income type**:

- **Paycheck** — a recurring wage with a per-paycheck amount and a
  **frequency** (Weekly, Every 2 Weeks/Biweekly, Twice Monthly/Semi-Monthly,
  Monthly). The month's total is the actual number of paydays that fall in
  the **selected calendar month** — never an average like `amount × 26 ÷ 12`.
  A 3-paycheck month (common for biweekly schedules) is calculated correctly
  and flagged with a small indicator, not hidden.
  - Weekly/Biweekly use a known payday **anchor date**; every other paycheck
    date is derived from it, forward and backward across any month/year
    boundary.
  - Semi-Monthly uses two day-of-month positions (e.g. "1st and 15th", or
    "15th and Last Day of month" — leap-year-safe).
  - Monthly uses a single day-of-month position.
  - All date math (`src/domain/income/payFrequency.ts`) works in explicit
    UTC year/month/day integers, never local `Date` getters, so it can't
    drift a payday by a day depending on the runtime's timezone.
  - A **manual override** lets you set the actual expected paycheck count
    and/or total for a month when reality differs from the regular schedule
    (an extra payment, a partial check) — clearly marked as overridden, with
    a one-click "Return to automatic calculation".
- **Other Recurring Income**, **One-Time Income**, **Irregular / Custom
  Income** — behave like a simple "expected amount this month" entry (the
  original income model).

Every income entry — regardless of type — still contributes a single
authoritative `amountCents` that feeds person/household totals and
**income-proportional** shared-expense splits exactly as before; the
paycheck schedule only changes how that number is calculated.

## Monthly planning workflow

1. **Months** page: create a new month, either **blank** or by **copying
   recurring items** from a previous month. Only entries marked *recurring*
   are copied; one-time entries, notes, and month-specific adjustments are
   never carried forward — money is also never rolled over as income. A
   recurring **paycheck** entry copies its schedule, not a static total: its
   occurrences and total are recalculated for the new month's real calendar
   (a manual override from the source month is not carried forward).
2. Fill in **Income**, **Bills**, **Planned Spending**, **Family Fun Fund**,
   and **Savings** for the month — each section supports **Add** and **Add
   from template** (Admin → Templates & Defaults manages the template list).
3. **Dashboard** shows per-person and household income, allocations, and
   remaining money at a glance, with strong visual hierarchy on
   remaining/shortfall.
4. **Breakdown** page adds a plan check (over/under allocated), contribution
   breakdown (% of income vs. % of allocations — informational only),
   category breakdown, and month-to-month comparison.
5. **Monthly Review** (Dashboard → "Review this month"): a lightweight,
   non-blocking walkthrough of Income → Bills → Planned Spending → Family
   Fun → Savings, each with a "Mark reviewed" action, followed by a final
   plan-status summary. Marking a section reviewed records a signature of
   its data; editing an amount, owner, or split afterward shows "Changed
   since review" rather than silently keeping a stale reviewed state (a
   note edit alone doesn't invalidate it).
6. **Print / Save PDF** produces a dedicated, professionally laid-out
   Monthly Plan Report (see below) — separate from the on-screen Dashboard.

## Print / Save PDF report

The `/print` route renders a dedicated **Monthly Plan Report** — it is not a
printout of the Dashboard. It includes, in order: a header (household name,
month, both person names, report generation date), an executive summary
table (income/bills/planned/Family Fun/savings/allocated/remaining ×
person1/person2/household), income & paychecks per person (type, frequency,
per-paycheck amount, pay dates, month total), required bills (category, due
day, responsibility, split, both shares), planned spending, Family Fun,
savings, an informational contribution-percentage summary, the month's
notes, and a final plan status block.

Printing uses the browser's native **Print / Save as PDF** — no server, no
extra dependency. The print stylesheet (`src/styles/print.css`) is
independent of the app's Light/Dark theme: it force-overrides the design
tokens it needs (with `!important`, since a `data-theme="dark"` override
otherwise wins on specificity) so the printed report is always a plain
white, high-contrast page regardless of which theme you were using on
screen. Tables avoid splitting a row across a page break, headers repeat
where the browser supports it, and the page is sized for US Letter with
0.6in margins (still readable on A4). The report view also sets the
document title to `Household-Plan-<month>` while open, so "Save as PDF"
suggests a sensible filename like `Household-Plan-2026-09.pdf`.

## Admin Control Center

Reachable from the **Admin** nav item, organized into tabs:

- **Household** — person display names, app name, currency, default split method.
- **Categories** — add, rename, reorder, archive/restore. Archiving a
  category never destroys historical entries that reference it.
- **Templates & Defaults** — recurring income templates (including full
  paycheck schedules) and per-section (bill/planned/family fun/savings)
  templates, each with full create/edit/duplicate/archive/restore. These
  power the **Add from template** quick-add on the Income and expense
  section pages.
- **Appearance** — Light / Dark / System theme, persisted locally.
- **Months** — read-only overview of all plans (create/delete happens on the
  Months page).
- **Data** — export/import JSON backup, clear all data (all with
  confirmation).
- **Data Health** — a lightweight integrity checker: split reconciliation,
  percentage ranges, orphaned category references, duplicate months, invalid
  currency values, schema version support, and paycheck-specific checks
  (valid income type/frequency/anchor date/semi-monthly schedule, no
  implausible paycheck count, a paycheck missing its schedule flagged as a
  warning rather than a hard error since it just contributes $0 until set).

Admin is a household configuration center, not an authentication boundary —
this is a private, local-first, single-household app. The repository layer
is structured so real authentication could be added later if hosted sync is
introduced.

## Data persistence, backup & restore

- All data lives in **IndexedDB** in the browser (`idb` library), versioned
  via `CURRENT_SCHEMA_VERSION` in `src/data/database/schema.ts`. The
  paycheck-frequency income model and Monthly Review state were added as
  additive fields (no IndexedDB store/index migration needed); a repository
  read normalizes any pre-upgrade record on the fly
  (`normalizeIncomeEntry`/`normalizeMonthlyPlan`) — a legacy income entry's
  amount is preserved exactly as-is under income type "Irregular / Custom",
  never reinterpreted as a per-paycheck amount.
- **Export**: Admin → Data → Export backup downloads a JSON file containing
  schema version, app version, household config, categories, all monthly
  plans, all income/expense entries, templates, and preferences.
- **Import**: choose a backup file → it's parsed and validated
  (`validateBackup`) → a summary is shown → you confirm → data is replaced
  only after validation succeeds. The prior state is fetched before the
  transaction so a recovery backup can always be re-exported from that
  in-memory copy if something goes wrong immediately after.
- **Clear all data** is a separate, explicitly-confirmed destructive action.

## Light / Dark / responsive design

- A semantic design-token system (`src/styles/tokens.css`) defines
  background/surface/card/border/text/accent/positive/warning/danger/focus
  tokens for light mode, redefined for `prefers-color-scheme: dark` and for
  an explicit `data-theme="dark"|"light"` override — so System/Light/Dark all
  work from the same component CSS with no per-component conditional colors.
- Layout is mobile-first: single-column cards and stacked forms on phones,
  two-column grids and a persistent sidebar nav from `900px` up. Dense lists
  render as touch-friendly cards (44px+ targets) rather than shrunk tables.
- `prefers-reduced-motion` is respected; transitions are short and used
  sparingly.

## Known limitations

- No multi-currency plan (one currency per household at a time).
- No bank connectivity or transaction reconciliation, by design.
- No hosted sync yet — data is local to one browser/device unless you export
  and import a backup on another device.
- Category breakdown is by-category only, not cross-filtered by owner in the
  same chart (owner filtering exists per-section on the entry list pages).

## Future hosted-sync path

The `data/repositories/` layer is the only place that talks to IndexedDB.
Swapping it for a remote-backed implementation (e.g. calling a hosted API)
would not require changes to `domain/` (pure calculation logic) or to
`features/`/`components/` beyond how repositories are injected — they are
already called through a stable interface shape per entity.

## Installation & development

```bash
npm install
npm run dev        # start the dev server
```

## Testing

```bash
npm run test       # unit + integration tests (Vitest)
npm run test:e2e   # end-to-end tests (Playwright) — builds and serves the app first
npm run typecheck  # strict TypeScript check
npm run lint       # ESLint
```

## Production build

```bash
npm run build        # tsc -b && vite build → dist/
npm run preview      # preview the production build locally
npm run build:single # → dist-single/index.html, one self-contained file
```

### Single-file build

`npm run build:single` produces `dist-single/index.html` — the entire app
(JS, CSS, everything) inlined into one file, using
[`vite-plugin-singlefile`](https://github.com/richardtallent/vite-plugin-singlefile)
and hash-based routing (`HashRouter`) so it works with no server at all.
Copy that one file to any device and open it directly in a browser
(`file://…/index.html`), or drop it on any static file host. Each
device/browser gets its own local IndexedDB store — use Admin → Data →
Export/Import to move a plan between devices.

## Backing up / restoring your data

From **Admin → Data**:

- **Export backup** downloads a dated `household-plan-backup-YYYY-MM-DD.json` file.
- **Import backup** lets you choose a previously exported file. You'll see a
  summary of what it contains before anything is replaced, and must confirm.
- **Clear all data** wipes everything after a strong confirmation — use this
  only if you want to start over.

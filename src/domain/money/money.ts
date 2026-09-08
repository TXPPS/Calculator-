/**
 * Money is represented as an integer number of cents to avoid floating-point
 * currency errors. Never perform arithmetic on dollar (float) values directly.
 */
export type Cents = number;

export function dollarsToCents(dollars: number): Cents {
  if (!Number.isFinite(dollars)) return 0;
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: Cents): number {
  return cents / 100;
}

/** Formats cents as a locale currency string, e.g. "$1,234.56". Never emits "-$0.00". */
export function formatCents(
  cents: Cents,
  opts: { currency?: string; locale?: string } = {}
): string {
  const { currency = 'USD', locale = 'en-US' } = opts;
  const safeCents = Number.isFinite(cents) ? cents : 0;
  const normalized = safeCents === 0 ? 0 : safeCents;
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(centsToDollars(normalized));
}

export function addCents(...values: Cents[]): Cents {
  return values.reduce((sum, v) => sum + (Number.isFinite(v) ? Math.trunc(v) : 0), 0);
}

export function subtractCents(a: Cents, b: Cents): Cents {
  return Math.trunc(a) - Math.trunc(b);
}

export function isNegative(cents: Cents): boolean {
  return cents < 0;
}

export function clampNonNegative(cents: Cents): Cents {
  return cents < 0 ? 0 : cents;
}

/**
 * Splits a total amount into `count` shares according to relative `weights`,
 * guaranteeing the shares sum exactly to `totalCents` (largest-remainder method).
 * This is the single source of truth for every proportional/percentage split
 * in the app so odd-cent remainders are distributed deterministically.
 */
export function splitByWeights(totalCents: Cents, weights: number[]): Cents[] {
  const total = Math.trunc(totalCents);
  const weightSum = weights.reduce((s, w) => s + w, 0);
  if (weightSum <= 0) {
    return weights.map(() => 0);
  }
  const rawShares = weights.map((w) => (total * w) / weightSum);
  const flooredShares = rawShares.map((s) => Math.floor(s));
  const allocated = flooredShares.reduce((s, v) => s + v, 0);
  let remainder = total - allocated;

  const remainders = rawShares.map((s, i) => ({ i, frac: s - Math.floor(s) }));
  remainders.sort((a, b) => b.frac - a.frac);

  const shares = [...flooredShares];
  let idx = 0;
  while (remainder > 0 && idx < remainders.length) {
    const entry = remainders[idx];
    if (entry) {
      shares[entry.i] = (shares[entry.i] ?? 0) + 1;
      remainder -= 1;
    }
    idx += 1;
  }
  // Handle negative remainder edge case (shouldn't normally happen with floor, but be safe)
  idx = remainders.length - 1;
  while (remainder < 0 && idx >= 0) {
    const entry = remainders[idx];
    if (entry && (shares[entry.i] ?? 0) > 0) {
      shares[entry.i] = (shares[entry.i] ?? 0) - 1;
      remainder += 1;
    }
    idx -= 1;
  }
  return shares;
}

/** Splits a total exactly 50/50, largest remainder goes to the first party. */
export function splitEvenly(totalCents: Cents, parties: number): Cents[] {
  return splitByWeights(totalCents, Array(parties).fill(1));
}

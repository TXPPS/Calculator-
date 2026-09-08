import { Cents, splitByWeights } from '../money/money';
import { Split } from './types';

export interface SplitResult {
  person1Cents: Cents;
  person2Cents: Cents;
  /** Present when the split could not be calculated (e.g. proportional with zero income). */
  error?: string;
}

export interface SplitContext {
  person1IncomeCents: Cents;
  person2IncomeCents: Cents;
}

/**
 * Computes each person's share of `totalCents` for a given split configuration.
 * Always guarantees person1Cents + person2Cents === totalCents (when no error),
 * which is the core anti-double-counting invariant for shared items.
 */
export function calculateSplit(
  totalCents: Cents,
  split: Split,
  ctx: SplitContext
): SplitResult {
  const total = Math.trunc(totalCents);

  switch (split.method) {
    case 'even': {
      const [p1, p2] = splitByWeights(total, [1, 1]);
      return { person1Cents: p1 ?? 0, person2Cents: p2 ?? 0 };
    }
    case 'percentage': {
      const p1Percent = clampPercent(split.person1Percent);
      const [p1, p2] = splitByWeights(total, [p1Percent, 100 - p1Percent]);
      return { person1Cents: p1 ?? 0, person2Cents: p2 ?? 0 };
    }
    case 'exact': {
      const p1 = Math.trunc(split.person1Cents);
      const p2 = total - p1;
      return { person1Cents: p1, person2Cents: p2 };
    }
    case 'incomeProportional': {
      const combined = ctx.person1IncomeCents + ctx.person2IncomeCents;
      if (combined <= 0) {
        return {
          person1Cents: 0,
          person2Cents: 0,
          error:
            'Income-proportional split cannot be calculated because combined household income is $0. Choose another split method.',
        };
      }
      const [p1, p2] = splitByWeights(total, [
        ctx.person1IncomeCents,
        ctx.person2IncomeCents,
      ]);
      return { person1Cents: p1 ?? 0, person2Cents: p2 ?? 0 };
    }
  }
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, value));
}

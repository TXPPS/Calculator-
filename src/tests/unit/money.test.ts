import { describe, expect, it } from 'vitest';
import { formatCents, splitByWeights, splitEvenly, dollarsToCents, addCents } from '../../domain/money/money';

describe('money helpers', () => {
  it('converts dollars to cents without float drift', () => {
    expect(dollarsToCents(12.34)).toBe(1234);
    expect(dollarsToCents(0.1)).toBe(10);
    expect(dollarsToCents(1000000)).toBe(100000000);
  });

  it('never formats negative zero', () => {
    expect(formatCents(0)).not.toContain('-');
    expect(formatCents(-0)).toBe('$0.00');
  });

  it('formats large values correctly', () => {
    expect(formatCents(123456789)).toBe('$1,234,567.89');
  });

  it('splits evenly with largest-remainder rounding for odd cents', () => {
    const [p1, p2] = splitEvenly(101, 2);
    expect(p1! + p2!).toBe(101);
    expect(Math.abs(p1! - p2!)).toBeLessThanOrEqual(1);
  });

  it('splitByWeights always reconciles to the total, including many odd-cent cases', () => {
    for (let total = 1; total < 200; total++) {
      const [p1, p2] = splitByWeights(total, [1, 1]);
      expect(addCents(p1!, p2!)).toBe(total);
    }
  });

  it('splitByWeights handles zero weights without dividing by zero', () => {
    const shares = splitByWeights(1000, [0, 0]);
    expect(shares).toEqual([0, 0]);
  });

  it('splitByWeights handles a single-party split', () => {
    const [only] = splitByWeights(500, [1]);
    expect(only).toBe(500);
  });

  it('splitByWeights handles very large values', () => {
    const total = 100_000_000_00; // $100,000,000.00 in cents
    const [p1, p2] = splitByWeights(total, [60, 40]);
    expect(addCents(p1!, p2!)).toBe(total);
    expect(p1).toBe(Math.round(total * 0.6));
  });
});

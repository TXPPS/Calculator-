import { describe, expect, it } from 'vitest';
import { calculateSplit } from '../../domain/splits/calculateSplit';

const ctx = (p1: number, p2: number) => ({ person1IncomeCents: p1, person2IncomeCents: p2 });

describe('calculateSplit', () => {
  it('splits 50/50 evenly, remainder to person1', () => {
    const result = calculateSplit(10001, { method: 'even' }, ctx(0, 0));
    expect(result.person1Cents + result.person2Cents).toBe(10001);
    expect(result.person1Cents).toBe(5001);
    expect(result.person2Cents).toBe(5000);
  });

  it('splits 60/40 by percentage', () => {
    const result = calculateSplit(100000, { method: 'percentage', person1Percent: 60 }, ctx(0, 0));
    expect(result.person1Cents).toBe(60000);
    expect(result.person2Cents).toBe(40000);
  });

  it('splits 65/35 by percentage with odd cents', () => {
    const result = calculateSplit(10000, { method: 'percentage', person1Percent: 65 }, ctx(0, 0));
    expect(result.person1Cents + result.person2Cents).toBe(10000);
    expect(result.person1Cents).toBe(6500);
    expect(result.person2Cents).toBe(3500);
  });

  it('handles exact-dollar splits that reconcile', () => {
    const result = calculateSplit(100000, { method: 'exact', person1Cents: 65000 }, ctx(0, 0));
    expect(result.person1Cents).toBe(65000);
    expect(result.person2Cents).toBe(35000);
  });

  it('computes income-proportional splits', () => {
    const result = calculateSplit(200000, { method: 'incomeProportional' }, ctx(600000, 400000));
    expect(result.person1Cents).toBe(120000);
    expect(result.person2Cents).toBe(80000);
    expect(result.error).toBeUndefined();
  });

  it('reports an error for income-proportional split with zero combined income', () => {
    const result = calculateSplit(200000, { method: 'incomeProportional' }, ctx(0, 0));
    expect(result.error).toBeDefined();
    expect(result.person1Cents).toBe(0);
    expect(result.person2Cents).toBe(0);
  });

  it('handles zero income for person1 only in proportional split', () => {
    const result = calculateSplit(100000, { method: 'incomeProportional' }, ctx(0, 500000));
    expect(result.person1Cents).toBe(0);
    expect(result.person2Cents).toBe(100000);
  });

  it('handles zero income for person2 only in proportional split', () => {
    const result = calculateSplit(100000, { method: 'incomeProportional' }, ctx(500000, 0));
    expect(result.person1Cents).toBe(100000);
    expect(result.person2Cents).toBe(0);
  });

  it('reconciles odd-cent proportional splits exactly', () => {
    const result = calculateSplit(10001, { method: 'incomeProportional' }, ctx(333, 667));
    expect(result.person1Cents + result.person2Cents).toBe(10001);
  });

  it('handles very large bill amounts without overflow drift', () => {
    const result = calculateSplit(999_999_999, { method: 'even' }, ctx(0, 0));
    expect(result.person1Cents + result.person2Cents).toBe(999_999_999);
  });
});

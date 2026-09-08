import { describe, expect, it } from 'vitest';
import {
  validateAmountCents,
  validateName,
  validatePercent,
  validateExactSplit,
  validateDueDay,
  validateMonthKey,
} from '../../domain/calculations/validation';

describe('validation', () => {
  it('rejects blank names', () => {
    expect(validateName('').valid).toBe(false);
    expect(validateName('   ').valid).toBe(false);
  });

  it('rejects negative and huge amounts', () => {
    expect(validateAmountCents(-1).valid).toBe(false);
    expect(validateAmountCents(100_000_000_00 + 1).valid).toBe(false);
  });

  it('accepts zero amounts', () => {
    expect(validateAmountCents(0).valid).toBe(true);
  });

  it('rejects NaN and Infinity amounts', () => {
    expect(validateAmountCents(NaN).valid).toBe(false);
    expect(validateAmountCents(Infinity).valid).toBe(false);
  });

  it('rejects out-of-range percentages', () => {
    expect(validatePercent(-1).valid).toBe(false);
    expect(validatePercent(101).valid).toBe(false);
    expect(validatePercent(50).valid).toBe(true);
  });

  it('rejects exact splits that exceed the total', () => {
    expect(validateExactSplit(15000, 10000).valid).toBe(false);
    expect(validateExactSplit(-1, 10000).valid).toBe(false);
    expect(validateExactSplit(5000, 10000).valid).toBe(true);
  });

  it('validates due day range', () => {
    expect(validateDueDay(0).valid).toBe(false);
    expect(validateDueDay(32).valid).toBe(false);
    expect(validateDueDay(15).valid).toBe(true);
    expect(validateDueDay(null).valid).toBe(true);
  });

  it('validates month key format', () => {
    expect(validateMonthKey('2026-09').valid).toBe(true);
    expect(validateMonthKey('2026-13').valid).toBe(false);
    expect(validateMonthKey('September 2026').valid).toBe(false);
  });
});

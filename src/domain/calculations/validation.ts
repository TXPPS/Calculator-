export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateName(name: string): ValidationResult {
  if (!name || !name.trim()) return { valid: false, error: 'Name cannot be blank.' };
  if (name.trim().length > 120) return { valid: false, error: 'Name is too long.' };
  return { valid: true };
}

const MAX_CENTS = 100_000_000_00; // $100,000,000.00 ceiling to catch fat-finger entry

export function validateAmountCents(cents: number): ValidationResult {
  if (!Number.isFinite(cents)) return { valid: false, error: 'Amount must be a valid number.' };
  if (Number.isNaN(cents)) return { valid: false, error: 'Amount must be a valid number.' };
  if (cents < 0) return { valid: false, error: 'Amount cannot be negative.' };
  if (cents > MAX_CENTS) return { valid: false, error: 'Amount is unrealistically large.' };
  return { valid: true };
}

export function validatePercent(percent: number): ValidationResult {
  if (!Number.isFinite(percent)) return { valid: false, error: 'Percentage must be a valid number.' };
  if (percent < 0) return { valid: false, error: 'Percentage cannot be below 0%.' };
  if (percent > 100) return { valid: false, error: 'Percentage cannot exceed 100%.' };
  return { valid: true };
}

export function validateExactSplit(
  person1Cents: number,
  totalCents: number
): ValidationResult {
  if (person1Cents < 0) return { valid: false, error: "Person 1's share cannot be negative." };
  if (person1Cents > totalCents)
    return { valid: false, error: "Person 1's share cannot exceed the total amount." };
  return { valid: true };
}

export function validateDueDay(day: number | null): ValidationResult {
  if (day === null) return { valid: true };
  if (!Number.isInteger(day) || day < 1 || day > 31)
    return { valid: false, error: 'Due day must be between 1 and 31.' };
  return { valid: true };
}

export function validateMonthKey(monthKey: string): ValidationResult {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)) {
    return { valid: false, error: 'Month must be a valid year and month.' };
  }
  return { valid: true };
}

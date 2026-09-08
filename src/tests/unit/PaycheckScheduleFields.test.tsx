import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaycheckScheduleFields } from '../../features/income/PaycheckScheduleFields';
import { PaycheckSchedule } from '../../domain/income/payFrequency';

function Harness({ initial }: { initial: PaycheckSchedule }) {
  const [schedule, setSchedule] = useState(initial);
  return (
    <div>
      <div data-testid="amount">{schedule.perPaycheckCents}</div>
      <PaycheckScheduleFields schedule={schedule} onChange={setSchedule} />
    </div>
  );
}

describe('PaycheckScheduleFields', () => {
  it('preserves the already-entered per-paycheck amount when the frequency is changed', () => {
    const initial: PaycheckSchedule = {
      frequency: 'biweekly',
      perPaycheckCents: 190000,
      anchorDate: '2026-09-04',
      semiMonthly: null,
      monthlyDay: null,
    };
    render(<Harness initial={initial} />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'weekly' } });

    // Switching frequency must not silently zero out the amount the user already entered.
    expect(screen.getByTestId('amount').textContent).toBe('190000');
  });
});

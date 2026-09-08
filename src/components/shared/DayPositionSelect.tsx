import { MonthDayPosition } from '../../domain/income/payFrequency';

interface DayPositionSelectProps {
  id?: string;
  value: MonthDayPosition;
  onChange: (value: MonthDayPosition) => void;
  'aria-label'?: string;
}

/** A day-of-month picker: 1st through 31st, plus "Last day of month". */
export function DayPositionSelect({ id, value, onChange, ...aria }: DayPositionSelectProps) {
  return (
    <select
      id={id}
      value={String(value)}
      onChange={(e) => onChange(e.target.value === 'last' ? 'last' : Number(e.target.value))}
      {...aria}
    >
      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
        <option key={day} value={day}>
          {ordinal(day)}
        </option>
      ))}
      <option value="last">Last day of month</option>
    </select>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

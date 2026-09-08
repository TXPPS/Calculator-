import { useAppData } from '../../context/AppDataContext';
import { formatCents } from '../../domain/money/money';

interface MoneyProps {
  cents: number;
  colorize?: boolean;
  className?: string;
}

export function Money({ cents, colorize = false, className = '' }: MoneyProps) {
  const { household } = useAppData();
  const formatted = formatCents(cents, { currency: household.currency, locale: household.locale });
  const colorClass = colorize ? (cents < 0 ? 'money-negative' : 'money-positive') : '';
  return <span className={`money ${colorClass} ${className}`.trim()}>{formatted}</span>;
}

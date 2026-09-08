import { useEffect, useState } from 'react';
import { centsToDollars, dollarsToCents } from '../../domain/money/money';

interface CurrencyInputProps {
  id?: string;
  cents: number;
  onChange: (cents: number) => void;
  placeholder?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

export function CurrencyInput({ id, cents, onChange, placeholder, ...aria }: CurrencyInputProps) {
  const [text, setText] = useState(cents === 0 ? '' : centsToDollars(cents).toFixed(2));

  useEffect(() => {
    const currentAsCents = dollarsToCents(Number(text) || 0);
    if (currentAsCents !== cents) {
      setText(cents === 0 ? '' : centsToDollars(cents).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cents]);

  return (
    <div className="currency-input">
      <span className="currency-input__prefix" aria-hidden="true">
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className="currency-input__field"
        value={text}
        placeholder={placeholder ?? '0.00'}
        onChange={(e) => {
          const raw = e.target.value;
          if (/^\d*\.?\d{0,2}$/.test(raw)) {
            setText(raw);
            onChange(dollarsToCents(Number(raw) || 0));
          }
        }}
        onBlur={() => {
          setText(cents === 0 ? '' : centsToDollars(cents).toFixed(2));
        }}
        {...aria}
      />
    </div>
  );
}

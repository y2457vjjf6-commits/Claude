import { useState } from 'react';
import { normalizeAmount } from '../lib/offers';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Dopisek w polu: „zł”, „%”, „dni” */
  suffix: string;
  testId: string;
  ariaLabel: string;
  placeholder?: string;
  /** Po wyjściu z pola doprowadza kwotę do postaci 1234,56 */
  normalizuj?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Pole liczbowe z jednostką w środku — przy wycenach od razu widać,
 *  że wpisuje się złotówki, a nie sztuki. */
export default function SuffixField({
  value,
  onChange,
  suffix,
  testId,
  ariaLabel,
  placeholder,
  normalizuj,
  disabled,
  className
}: Props) {
  const [wSrodku, setWSrodku] = useState(false);

  const poWyjsciu = () => {
    setWSrodku(false);
    if (!normalizuj) return;
    const uporzadkowana = normalizeAmount(value);
    if (uporzadkowana !== value) onChange(uporzadkowana);
  };

  return (
    <div className={'suffix-field' + (wSrodku ? ' focused' : '') + (className ? ' ' + className : '')}>
      <input
        type="text"
        className="input num"
        inputMode="decimal"
        data-testid={testId}
        aria-label={ariaLabel}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setWSrodku(true)}
        onBlur={poWyjsciu}
      />
      <span className="suffix" aria-hidden="true">
        {suffix}
      </span>
    </div>
  );
}

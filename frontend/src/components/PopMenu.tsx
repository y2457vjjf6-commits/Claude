import { ReactElement, ReactNode, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, MoreHorizontal } from 'lucide-react';
import { useAnchoredPopup } from '../hooks/useAnchoredPopup';

export interface PozycjaMenu {
  key: string;
  label: string;
  ikona?: ReactElement;
  onPick: () => void;
  /** Kreska nad pozycją — oddziela rzeczy nieodwracalne */
  separator?: boolean;
  danger?: boolean;
  checked?: boolean;
  /** Dodatkowa klasa pozycji — np. kolor kropki statusu */
  klasa?: string;
}

interface Props {
  items: PozycjaMenu[];
  /** Zawartość przycisku; domyślnie trzy kropki */
  trigger?: ReactNode;
  label: string;
  testId: string;
  className?: string;
}

/** Menu podręczne przy przycisku — wspólne dla akcji wiersza i statusu oferty. */
export default function PopMenu({ items, trigger, label, testId, className }: Props) {
  const [otwarte, setOtwarte] = useState(false);
  const zamknij = useCallback(() => setOtwarte(false), []);
  const { kotwicaRef, popupRef, pozycja } = useAnchoredPopup(otwarte, zamknij, items.length * 34 + 14);

  const wybierz = (poz: PozycjaMenu) => {
    poz.onPick();
    setOtwarte(false);
  };

  const naKlawisz = (ev: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
    ev.preventDefault();
    const kolejny = ev.key === 'ArrowDown' ? idx + 1 : idx - 1;
    const przyciski = popupRef.current?.querySelectorAll('button');
    (przyciski?.[(kolejny + items.length) % items.length] as HTMLButtonElement | undefined)?.focus();
  };

  return (
    <>
      <button
        ref={kotwicaRef}
        type="button"
        className={className || 'btn btn-small btn-light'}
        data-testid={testId}
        aria-haspopup="menu"
        aria-expanded={otwarte}
        aria-label={label}
        title={label}
        onClick={() => setOtwarte((o) => !o)}
      >
        {trigger || <MoreHorizontal className="icon" />}
      </button>

      {otwarte &&
        createPortal(
          <div
            ref={popupRef}
            className="menu-pop"
            role="menu"
            aria-label={label}
            style={{ top: pozycja.top, left: pozycja.left }}
          >
            {items.map((poz, i) => (
              <button
                key={poz.key}
                type="button"
                className={
                  'menu-item' +
                  (poz.danger ? ' danger' : '') +
                  (poz.separator ? ' with-separator' : '') +
                  (poz.klasa ? ' ' + poz.klasa : '')
                }
                role={poz.checked === undefined ? 'menuitem' : 'menuitemradio'}
                aria-checked={poz.checked}
                data-testid={`${testId}-${poz.key}`}
                autoFocus={i === 0 || poz.checked}
                onClick={() => wybierz(poz)}
                onKeyDown={(e) => naKlawisz(e, i)}
              >
                {poz.ikona}
                {poz.label}
                {poz.checked && <Check className="icon menu-check" aria-hidden="true" />}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

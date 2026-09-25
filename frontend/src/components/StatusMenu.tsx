import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { Offer } from '../types';
import { OFFER_STATUS_LABELS } from '../lib/offers';

const STATUSY = Object.keys(OFFER_STATUS_LABELS) as Offer['status'][];

interface Props {
  status: Offer['status'];
  onChange: (status: Offer['status']) => void;
  testId: string;
}

/** Status oferty jako pastylka z kropką. Menu leci przez portal, bo karta
 *  tabeli ma ucięte przepełnienie i lista rozwijana zostałaby przycięta. */
export default function StatusMenu({ status, onChange, testId }: Props) {
  const [otwarte, setOtwarte] = useState(false);
  const [poz, setPoz] = useState({ top: 0, left: 0 });
  const przyciskRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!otwarte || !przyciskRef.current) return;
    const r = przyciskRef.current.getBoundingClientRect();
    const wysokoscMenu = STATUSY.length * 36 + 12;
    // gdy pod przyciskiem brakuje miejsca, menu otwiera się nad nim
    const nadSpodem = r.bottom + wysokoscMenu > window.innerHeight - 12;
    setPoz({ top: nadSpodem ? r.top - wysokoscMenu - 6 : r.bottom + 6, left: r.left });
  }, [otwarte]);

  useEffect(() => {
    if (!otwarte) return;
    const pozaMenu = (ev: MouseEvent) => {
      const cel = ev.target as Node;
      if (!menuRef.current?.contains(cel) && !przyciskRef.current?.contains(cel)) setOtwarte(false);
    };
    const naKlawisz = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setOtwarte(false);
        przyciskRef.current?.focus();
      }
    };
    const zamknij = () => setOtwarte(false);
    document.addEventListener('mousedown', pozaMenu);
    document.addEventListener('keydown', naKlawisz);
    window.addEventListener('resize', zamknij);
    // przewinięcie listy unieważnia wyliczoną pozycję
    document.querySelector('.content')?.addEventListener('scroll', zamknij);
    return () => {
      document.removeEventListener('mousedown', pozaMenu);
      document.removeEventListener('keydown', naKlawisz);
      window.removeEventListener('resize', zamknij);
      document.querySelector('.content')?.removeEventListener('scroll', zamknij);
    };
  }, [otwarte]);

  const wybierz = (s: Offer['status']) => {
    onChange(s);
    setOtwarte(false);
    przyciskRef.current?.focus();
  };

  const naKlawiszMenu = (ev: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
    ev.preventDefault();
    const kolejny = ev.key === 'ArrowDown' ? idx + 1 : idx - 1;
    const przyciski = menuRef.current?.querySelectorAll('button');
    const cel = przyciski?.[(kolejny + STATUSY.length) % STATUSY.length];
    (cel as HTMLButtonElement | undefined)?.focus();
  };

  return (
    <>
      <button
        ref={przyciskRef}
        type="button"
        className={`status-pill status-${status}`}
        data-testid={testId}
        aria-haspopup="menu"
        aria-expanded={otwarte}
        onClick={() => setOtwarte((o) => !o)}
      >
        <span className="status-dot" aria-hidden="true" />
        {OFFER_STATUS_LABELS[status]}
        <ChevronDown className="icon status-caret" aria-hidden="true" />
      </button>

      {otwarte &&
        createPortal(
          <div
            ref={menuRef}
            className="menu-pop"
            role="menu"
            aria-label="Status oferty"
            style={{ top: poz.top, left: poz.left }}
          >
            {STATUSY.map((s, i) => (
              <button
                key={s}
                type="button"
                className={'menu-item status-' + s}
                role="menuitemradio"
                aria-checked={s === status}
                data-testid={`${testId}-${s}`}
                autoFocus={s === status}
                onClick={() => wybierz(s)}
                onKeyDown={(e) => naKlawiszMenu(e, i)}
              >
                <span className="status-dot" aria-hidden="true" />
                {OFFER_STATUS_LABELS[s]}
                {s === status && <Check className="icon menu-check" aria-hidden="true" />}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

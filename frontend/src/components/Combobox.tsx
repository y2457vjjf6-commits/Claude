import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

export interface ComboItem {
  id: string;
  label: string;
  /** Druga linijka pozycji — np. NIP i adres */
  sub?: string;
  /** Tekst brany pod uwagę przy wyszukiwaniu (domyślnie label + sub) */
  search?: string;
}

interface Props {
  items: ComboItem[];
  /** Zaznaczona pozycja albo pusty ciąg */
  value: string;
  onPick: (id: string) => void;
  placeholder: string;
  testId: string;
  label?: string;
}

/** Pole z wyszukiwaniem zamiast listy rozwijanej: przy kilkudziesięciu
 *  kontrahentach przewijanie zwykłego <select> jest udręką. */
export default function Combobox({ items, value, onPick, placeholder, testId, label }: Props) {
  const wybrany = items.find((i) => i.id === value) || null;
  const [otwarte, setOtwarte] = useState(false);
  const [szukaj, setSzukaj] = useState('');
  const [podswietlony, setPodswietlony] = useState(0);
  const opakowanieRef = useRef<HTMLDivElement>(null);
  const poleRef = useRef<HTMLInputElement>(null);

  const znalezione = useMemo(() => {
    const q = szukaj.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => (i.search || `${i.label} ${i.sub || ''}`).toLowerCase().includes(q));
  }, [items, szukaj]);

  useEffect(() => {
    if (!otwarte) return;
    const pozaPolem = (ev: MouseEvent) => {
      if (!opakowanieRef.current?.contains(ev.target as Node)) setOtwarte(false);
    };
    document.addEventListener('mousedown', pozaPolem);
    return () => document.removeEventListener('mousedown', pozaPolem);
  }, [otwarte]);

  useEffect(() => {
    setPodswietlony(0);
  }, [szukaj, otwarte]);

  const otworz = () => {
    setSzukaj('');
    setOtwarte(true);
    requestAnimationFrame(() => poleRef.current?.select());
  };

  const wybierz = (id: string) => {
    onPick(id);
    setOtwarte(false);
    setSzukaj('');
  };

  const naKlawisz = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      if (!otwarte) return otworz();
      const krok = ev.key === 'ArrowDown' ? 1 : -1;
      setPodswietlony((i) => (i + krok + znalezione.length) % Math.max(1, znalezione.length));
      return;
    }
    if (ev.key === 'Enter' && otwarte) {
      ev.preventDefault();
      const cel = znalezione[podswietlony];
      if (cel) wybierz(cel.id);
      return;
    }
    if (ev.key === 'Escape' && otwarte) {
      ev.preventDefault();
      setOtwarte(false);
      setSzukaj('');
    }
  };

  return (
    <div className="combo" ref={opakowanieRef}>
      <input
        ref={poleRef}
        type="text"
        className="input combo-input"
        data-testid={testId}
        role="combobox"
        aria-expanded={otwarte}
        aria-controls={`${testId}-lista`}
        aria-autocomplete="list"
        aria-label={label}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={otwarte ? szukaj : wybrany?.label || ''}
        onChange={(e) => {
          setSzukaj(e.target.value);
          if (!otwarte) setOtwarte(true);
        }}
        onFocus={otworz}
        onKeyDown={naKlawisz}
      />

      {wybrany && !otwarte ? (
        <button
          type="button"
          className="btn btn-ghost btn-small combo-clear"
          data-testid={`${testId}-clear`}
          aria-label="Wyczyść wybór"
          title="Wyczyść wybór"
          onClick={() => wybierz('')}
        >
          <X className="icon" />
        </button>
      ) : (
        <ChevronDown className="icon combo-caret" aria-hidden="true" />
      )}

      {otwarte && (
        <ul className="combo-list" id={`${testId}-lista`} role="listbox">
          {znalezione.map((i, idx) => (
            <li key={i.id} role="option" aria-selected={idx === podswietlony}>
              <button
                type="button"
                className={'combo-item' + (idx === podswietlony ? ' active' : '')}
                data-testid={`${testId}-item-${i.id}`}
                onMouseEnter={() => setPodswietlony(idx)}
                onClick={() => wybierz(i.id)}
              >
                <span className="combo-label">{i.label}</span>
                {i.sub && <span className="combo-sub">{i.sub}</span>}
              </button>
            </li>
          ))}
          {!znalezione.length && <li className="combo-empty">Nic nie pasuje do „{szukaj.trim()}”.</li>}
        </ul>
      )}
    </div>
  );
}

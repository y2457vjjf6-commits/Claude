import { RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';

interface Wynik {
  /** Element, przy którym otwiera się okienko */
  kotwicaRef: RefObject<HTMLButtonElement | null>;
  /** Samo okienko — potrzebne, żeby klik w nie nie zamykał */
  popupRef: RefObject<HTMLDivElement | null>;
  pozycja: { top: number; left: number };
}

/** Umieszcza okienko przy przycisku i zamyka je, gdy przestaje mieć sens:
 *  po kliknięciu obok, po Escape, po przewinięciu listy albo zmianie okna.
 *  Okienko idzie przez portal, bo karty tabel mają ucięte przepełnienie. */
export function useAnchoredPopup(otwarte: boolean, zamknij: () => void, wysokosc: number, szerokosc = 220): Wynik {
  const kotwicaRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pozycja, setPozycja] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!otwarte || !kotwicaRef.current) return;
    const r = kotwicaRef.current.getBoundingClientRect();
    const nadSpodem = r.bottom + wysokosc > window.innerHeight - 12;
    const zaPrawa = r.left + szerokosc > window.innerWidth - 12;
    setPozycja({
      top: nadSpodem ? Math.max(12, r.top - wysokosc - 6) : r.bottom + 6,
      left: zaPrawa ? Math.max(12, r.right - szerokosc) : r.left
    });
  }, [otwarte, wysokosc, szerokosc]);

  useEffect(() => {
    if (!otwarte) return;
    const poza = (ev: MouseEvent) => {
      const cel = ev.target as Node;
      if (!popupRef.current?.contains(cel) && !kotwicaRef.current?.contains(cel)) zamknij();
    };
    const klawisz = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        zamknij();
        kotwicaRef.current?.focus();
      }
    };
    const przewijanie = document.querySelector('.content');
    document.addEventListener('mousedown', poza);
    document.addEventListener('keydown', klawisz);
    window.addEventListener('resize', zamknij);
    przewijanie?.addEventListener('scroll', zamknij);
    return () => {
      document.removeEventListener('mousedown', poza);
      document.removeEventListener('keydown', klawisz);
      window.removeEventListener('resize', zamknij);
      przewijanie?.removeEventListener('scroll', zamknij);
    };
  }, [otwarte, zamknij]);

  return { kotwicaRef, popupRef, pozycja };
}

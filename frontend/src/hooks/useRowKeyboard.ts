import { KeyboardEvent } from 'react';

interface Opcje {
  /** Enter — główne działanie wiersza (edycja dokumentu) */
  onEnter: () => void;
  /** Spacja — podgląd bez wchodzenia w edycję */
  onSpace?: () => void;
}

/** Obsługa klawiatury na wierszu tabeli: strzałki chodzą po liście,
 *  Enter otwiera, spacja pokazuje podgląd. Wiersze muszą mieć tabIndex. */
export function useRowKeyboard({ onEnter, onSpace }: Opcje) {
  return (ev: KeyboardEvent<HTMLTableRowElement>) => {
    // Nie przechwytujemy klawiszy z pól i przycisków wewnątrz wiersza
    const cel = ev.target as HTMLElement;
    if (cel !== ev.currentTarget && cel.closest('button, input, select, textarea, a')) return;

    const wiersz = ev.currentTarget;
    const wszystkie = Array.from(
      wiersz.closest('tbody')?.querySelectorAll<HTMLTableRowElement>('tr[data-row]') || []
    );
    const idx = wszystkie.indexOf(wiersz);

    const skocz = (docelowy: number) => {
      const el = wszystkie[Math.max(0, Math.min(wszystkie.length - 1, docelowy))];
      if (el) {
        ev.preventDefault();
        el.focus();
      }
    };

    if (ev.key === 'ArrowDown') return skocz(idx + 1);
    if (ev.key === 'ArrowUp') return skocz(idx - 1);
    if (ev.key === 'Home') return skocz(0);
    if (ev.key === 'End') return skocz(wszystkie.length - 1);
    if (ev.key === 'Enter') {
      ev.preventDefault();
      onEnter();
    }
    if (ev.key === ' ' && onSpace) {
      ev.preventDefault();
      onSpace();
    }
  };
}

/** Klik w wiersz ma działać tylko wtedy, gdy nie trafiliśmy w przycisk akcji. */
export function isRowBackgroundClick(ev: { target: EventTarget | null }): boolean {
  const cel = ev.target as HTMLElement | null;
  if (!cel) return false;
  return !cel.closest('button, input, select, textarea, a, [role="menu"]');
}

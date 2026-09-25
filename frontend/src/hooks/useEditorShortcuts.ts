import { useEffect, useRef } from 'react';

interface Options {
  /** Czy w formularzu są zmiany, których nie zapisano */
  dirty: boolean;
  onSave: () => void;
  onPrint?: () => void;
  onBack: () => void;
}

/**
 * Skróty edytora: Ctrl+S zapisuje, Ctrl+P drukuje, Esc wraca do listy.
 * Dodatkowo ostrzega przed zamknięciem okna z niezapisanymi zmianami.
 */
export function useEditorShortcuts({ dirty, onSave, onPrint, onBack }: Options): void {
  const ref = useRef({ dirty, onSave, onPrint, onBack });
  ref.current = { dirty, onSave, onPrint, onBack };

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const { onSave, onPrint, onBack } = ref.current;
      const mod = ev.ctrlKey || ev.metaKey;
      if (mod && ev.key.toLowerCase() === 's') {
        ev.preventDefault();
        onSave();
        return;
      }
      if (mod && ev.key.toLowerCase() === 'p' && onPrint) {
        ev.preventDefault();
        onPrint();
        return;
      }
      if (ev.key === 'Escape') {
        const cel = ev.target as HTMLElement | null;
        // Esc w otwartej liście podpowiedzi ma ją tylko zamknąć
        if (cel && cel.tagName === 'INPUT' && cel.getAttribute('list')) return;
        onBack();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (ev: BeforeUnloadEvent) => {
      ev.preventDefault();
      ev.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);
}

import { useCallback, useMemo, useState } from 'react';

/** Zaznaczanie wierszy z obsługą Shift — zakres od ostatnio klikniętego. */
export function useSelection(widoczneId: string[]) {
  const [zaznaczone, setZaznaczone] = useState<string[]>([]);
  const [ostatni, setOstatni] = useState<string | null>(null);

  // z zaznaczenia znikają wiersze, których nie ma już na liście (filtr, usunięcie)
  const aktualne = useMemo(() => zaznaczone.filter((id) => widoczneId.includes(id)), [zaznaczone, widoczneId]);
  const zbior = useMemo(() => new Set(aktualne), [aktualne]);

  const przelacz = useCallback(
    (id: string, zakres: boolean) => {
      setZaznaczone((biezace) => {
        const teraz = new Set(biezace.filter((x) => widoczneId.includes(x)));
        if (zakres && ostatni) {
          const a = widoczneId.indexOf(ostatni);
          const b = widoczneId.indexOf(id);
          if (a >= 0 && b >= 0) {
            const [od, do_] = a < b ? [a, b] : [b, a];
            for (let i = od; i <= do_; i++) teraz.add(widoczneId[i]);
            return Array.from(teraz);
          }
        }
        if (teraz.has(id)) teraz.delete(id);
        else teraz.add(id);
        return Array.from(teraz);
      });
      setOstatni(id);
    },
    [widoczneId, ostatni]
  );

  const wszystkie = useCallback(() => {
    setZaznaczone((biezace) => (biezace.length === widoczneId.length ? [] : widoczneId.slice()));
  }, [widoczneId]);

  const wyczysc = useCallback(() => {
    setZaznaczone([]);
    setOstatni(null);
  }, []);

  return { zbior, lista: aktualne, przelacz, wszystkie, wyczysc };
}

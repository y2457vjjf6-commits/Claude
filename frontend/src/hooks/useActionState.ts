import { useCallback, useEffect, useRef, useState } from 'react';

type Praca = 'zapis' | 'druk' | 'pdf' | 'mail' | null;

/** Stan przycisków akcji: co teraz pracuje i czy przed chwilą się udało.
 *  Dzięki temu widać, że program coś robi, zamiast pozornej bezczynności. */
export function useActionState() {
  const [pracuje, setPracuje] = useState<Praca>(null);
  const [zapisane, setZapisane] = useState(false);
  const czasomierz = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (czasomierz.current) clearTimeout(czasomierz.current);
  }, []);

  /** Uruchamia działanie, pilnując oznaczenia „w toku”. */
  const wykonaj = useCallback(async <T,>(rodzaj: Exclude<Praca, null>, akcja: () => Promise<T>): Promise<T> => {
    setPracuje(rodzaj);
    try {
      return await akcja();
    } finally {
      setPracuje(null);
    }
  }, []);

  /** Krótkie „Zapisano” przy przycisku — potwierdzenie tuż przy miejscu kliknięcia. */
  const potwierdzZapis = useCallback(() => {
    setZapisane(true);
    if (czasomierz.current) clearTimeout(czasomierz.current);
    czasomierz.current = setTimeout(() => setZapisane(false), 1600);
  }, []);

  return { pracuje, zapisane, wykonaj, potwierdzZapis };
}

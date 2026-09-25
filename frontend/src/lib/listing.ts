/** Sortowanie kolumn i grupowanie długich list — wspólne dla wszystkich tabel. */

export type SortDir = 'asc' | 'desc';

export interface SortState {
  key: string;
  dir: SortDir;
}

/** Kliknięcie w nagłówek: ta sama kolumna odwraca kierunek, nowa zaczyna
 *  od kierunku naturalnego dla danych (daty i kwoty od największych). */
export function nextSort(current: SortState, key: string, startDesc: boolean): SortState {
  if (current.key === key) return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
  return { key, dir: startDesc ? 'desc' : 'asc' };
}

/** Porównanie dwóch wartości: teksty po polsku, liczby liczbowo, puste na końcu. */
export function compareValues(a: unknown, b: unknown, dir: SortDir): number {
  const znak = dir === 'asc' ? 1 : -1;
  const pusteA = a === null || a === undefined || a === '';
  const pusteB = b === null || b === undefined || b === '';
  if (pusteA && pusteB) return 0;
  if (pusteA) return 1; // puste zawsze na dole, niezależnie od kierunku
  if (pusteB) return -1;
  if (typeof a === 'number' && typeof b === 'number') return (a - b) * znak;
  return String(a).localeCompare(String(b), 'pl', { numeric: true }) * znak;
}

/** Posortowana kopia listy według wybranej kolumny. */
export function sortRows<T>(rows: T[], sort: SortState, wartosc: (row: T, key: string) => unknown): T[] {
  return rows
    .slice()
    .sort((a, b) => compareValues(wartosc(a, sort.key), wartosc(b, sort.key), sort.dir));
}

const MIESIACE = [
  'styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec',
  'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'
];

/** „wrzesień 2026” z daty RRRR-MM-DD. */
export function monthLabel(isoDate: string): string {
  const [r, m] = String(isoDate || '').split('-');
  const idx = Number(m) - 1;
  return MIESIACE[idx] ? `${MIESIACE[idx]} ${r}` : '—';
}

export interface MonthGroup<T> {
  klucz: string;
  etykieta: string;
  wiersze: T[];
}

/** Od tylu wierszy dzielimy listę na miesiące — przy krótkiej liście
 *  nagłówki tylko przeszkadzają. */
export const GROUP_THRESHOLD = 12;

/** Podział na miesiące; zachowuje kolejność, w jakiej wiersze przyszły. */
export function groupByMonth<T>(rows: T[], data: (row: T) => string): MonthGroup<T>[] {
  const grupy: MonthGroup<T>[] = [];
  for (const wiersz of rows) {
    const klucz = String(data(wiersz) || '').slice(0, 7);
    const ostatnia = grupy[grupy.length - 1];
    if (ostatnia && ostatnia.klucz === klucz) ostatnia.wiersze.push(wiersz);
    else grupy.push({ klucz, etykieta: monthLabel(data(wiersz)), wiersze: [wiersz] });
  }
  return grupy;
}

/** Czy w tym układzie dzielenie na miesiące ma sens: lista musi być długa
 *  i uporządkowana datą, inaczej nagłówki miesięcy kłamią. */
export function shouldGroup(rows: unknown[], sort: SortState, dateKey: string): boolean {
  return rows.length >= GROUP_THRESHOLD && sort.key === dateKey;
}

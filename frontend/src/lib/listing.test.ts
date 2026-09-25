import {
  compareValues,
  groupByMonth,
  GROUP_THRESHOLD,
  monthLabel,
  nextSort,
  shouldGroup,
  sortRows
} from './listing';

test('klik w tę samą kolumnę odwraca kierunek, w nową — ustawia naturalny', () => {
  const start = { key: 'data', dir: 'desc' as const };
  expect(nextSort(start, 'data', true)).toEqual({ key: 'data', dir: 'asc' });
  expect(nextSort(start, 'klient', false)).toEqual({ key: 'klient', dir: 'asc' });
  // kwoty i daty zaczynają od największych
  expect(nextSort(start, 'wartosc', true)).toEqual({ key: 'wartosc', dir: 'desc' });
});

test('teksty porównywane po polsku, liczby liczbowo', () => {
  expect(compareValues('Łomianki', 'Warszawa', 'asc')).toBeLessThan(0);
  expect(compareValues('Żuraw', 'Zebra', 'asc')).toBeGreaterThan(0);
  expect(compareValues(10, 9, 'asc')).toBeGreaterThan(0);
  expect(compareValues(10, 9, 'desc')).toBeLessThan(0);
});

test('puste wartości zawsze na końcu, niezależnie od kierunku', () => {
  expect(compareValues('', 'Ala', 'asc')).toBeGreaterThan(0);
  expect(compareValues('', 'Ala', 'desc')).toBeGreaterThan(0);
  expect(compareValues(null, 5, 'desc')).toBeGreaterThan(0);
});

test('sortowanie listy według wskazanej kolumny', () => {
  const wiersze = [
    { nazwa: 'Toyota', kwota: 100 },
    { nazwa: 'Akacjowa', kwota: 900 },
    { nazwa: 'Rolety', kwota: 500 }
  ];
  const odczyt = (r: (typeof wiersze)[0], key: string) => (key === 'kwota' ? r.kwota : r.nazwa);
  expect(sortRows(wiersze, { key: 'nazwa', dir: 'asc' }, odczyt).map((r) => r.nazwa)).toEqual([
    'Akacjowa',
    'Rolety',
    'Toyota'
  ]);
  expect(sortRows(wiersze, { key: 'kwota', dir: 'desc' }, odczyt).map((r) => r.kwota)).toEqual([900, 500, 100]);
});

test('nazwa miesiąca po polsku', () => {
  expect(monthLabel('2026-09-25')).toBe('wrzesień 2026');
  expect(monthLabel('2026-01-02')).toBe('styczeń 2026');
  expect(monthLabel('')).toBe('—');
});

test('podział na miesiące zachowuje kolejność wierszy', () => {
  const wiersze = [{ d: '2026-09-25' }, { d: '2026-09-02' }, { d: '2026-08-30' }, { d: '2026-08-01' }];
  const grupy = groupByMonth(wiersze, (r) => r.d);
  expect(grupy.map((g) => g.etykieta)).toEqual(['wrzesień 2026', 'sierpień 2026']);
  expect(grupy.map((g) => g.wiersze.length)).toEqual([2, 2]);
});

test('miesiące pokazujemy dopiero przy długiej liście ułożonej datą', () => {
  const krotka = new Array(GROUP_THRESHOLD - 1).fill({});
  const dluga = new Array(GROUP_THRESHOLD).fill({});
  expect(shouldGroup(krotka, { key: 'data', dir: 'desc' }, 'data')).toBe(false);
  expect(shouldGroup(dluga, { key: 'data', dir: 'desc' }, 'data')).toBe(true);
  // po przesortowaniu inną kolumną nagłówki miesięcy kłamałyby
  expect(shouldGroup(dluga, { key: 'klient', dir: 'asc' }, 'data')).toBe(false);
});

import {
  toCm,
  parseDimensions,
  matchTable,
  lookupPrice,
  priceItem,
  parsePastedTable,
  checkTable,
  checkHeaders,
  pustePola
} from './pricing';
import { PriceTable } from '../types';

/** Wycinek cennika producenta: szerokości 80/100/120, wysokości 100/150/200. */
const TABELA: PriceTable = {
  id: 't1',
  name: 'Rolety wolnowiszące FI32 — grupa 1',
  product: 'FI32',
  materials: ['C101', 'C102'],
  widths: [80, 100, 120],
  heights: [100, 150, 200],
  prices: [
    [100, 120, 140],
    [130, 150, 170],
    [160, 180, 200]
  ],
  updatedAt: '2026-09-25T00:00:00.000Z'
};

const GRUPA2: PriceTable = {
  ...TABELA,
  id: 't2',
  name: 'Rolety wolnowiszące FI32 — grupa 2',
  materials: ['C210'],
  prices: [
    [200, 220, 240],
    [230, 250, 270],
    [260, 280, 300]
  ]
};

describe('sprowadzanie wymiaru do centymetrów', () => {
  test('jednostka podana wprost', () => {
    expect(toCm(186, 'cm')).toBe(186);
    expect(toCm(1.86, 'm')).toBe(186);
    expect(toCm(1860, 'mm')).toBe(186);
  });

  test('bez jednostki zgadujemy po rzędzie wielkości', () => {
    expect(toCm(1.86)).toBe(186); // metry
    expect(toCm(186)).toBe(186); // centymetry
    expect(toCm(1860)).toBe(186); // milimetry
  });
});

describe('odczyt wymiaru z opisu pozycji', () => {
  test('zapis przez „x” z jednostką', () => {
    expect(parseDimensions('Materiał C102 · 186 x 202 cm')).toEqual({ width: 186, height: 202 });
  });

  test('znak mnożenia i brak spacji', () => {
    expect(parseDimensions('C102 · 186×202')).toEqual({ width: 186, height: 202 });
  });

  test('metry z przecinkiem', () => {
    expect(parseDimensions('1,86 x 2,02 m')).toEqual({ width: 186, height: 202 });
  });

  test('wymiar opisany słowami', () => {
    expect(parseDimensions('szer. 186 wys. 202')).toEqual({ width: 186, height: 202 });
  });

  test('wymiar może siedzieć w nazwie, nie w materiale', () => {
    expect(parseDimensions(undefined, 'Roleta 90 x 120 cm')).toEqual({ width: 90, height: 120 });
  });

  test('brak wymiaru to brak zgadywania', () => {
    expect(parseDimensions('Materiał C102')).toBeNull();
  });

  test('kod materiału z cyframi nie udaje wymiaru', () => {
    expect(parseDimensions('Materiał C102')).toBeNull();
  });
});

describe('dobór tabeli do pozycji', () => {
  const tabele = [TABELA, GRUPA2];

  test('kod materiału wskazuje grupę cenową', () => {
    expect(matchTable({ name: 'Roleta', material: 'Materiał C210 · 100 x 100 cm' }, tabele)?.id).toBe('t2');
    expect(matchTable({ name: 'Roleta', material: 'Materiał C102 · 100 x 100 cm' }, tabele)?.id).toBe('t1');
  });

  test('kod musi być osobnym słowem, a nie fragmentem innego', () => {
    expect(matchTable({ name: 'Roleta', material: 'Materiał C1020' }, tabele)).toBeNull();
  });

  test('bez pasującego materiału i produktu nie zgadujemy', () => {
    expect(matchTable({ name: 'Moskitiera', material: 'siatka' }, tabele)).toBeNull();
  });

  test('tabela bez warunków łapie wszystko, ale dopiero gdy nic nie pasuje', () => {
    const uniwersalna: PriceTable = { ...TABELA, id: 't0', product: '', materials: [] };
    expect(matchTable({ name: 'Cokolwiek', material: '' }, [uniwersalna])?.id).toBe('t0');
    expect(matchTable({ name: 'Roleta', material: 'C210' }, [uniwersalna, GRUPA2])?.id).toBe('t2');
  });
});

describe('odczyt ceny z siatki', () => {
  test('wymiar trafiony co do kratki', () => {
    expect(lookupPrice(TABELA, { width: 100, height: 150 })?.cost).toBe(150);
  });

  test('wymiar pośredni zaokrągla się w górę — tak jak w papierowym cenniku', () => {
    const odczyt = lookupPrice(TABELA, { width: 90, height: 120 });
    expect(odczyt?.cost).toBe(150); // kratka 100 × 150
    expect(odczyt?.cellWidth).toBe(100);
    expect(odczyt?.cellHeight).toBe(150);
  });

  test('najmniejszy wymiar płaci najniższą stawkę z tabeli', () => {
    expect(lookupPrice(TABELA, { width: 40, height: 40 })?.cost).toBe(100);
  });

  test('wymiar ponad tabelę nie daje ceny', () => {
    expect(lookupPrice(TABELA, { width: 130, height: 100 })).toBeNull();
    expect(lookupPrice(TABELA, { width: 100, height: 210 })).toBeNull();
  });

  test('pusta komórka nie udaje darmowej rolety', () => {
    const dziurawa: PriceTable = { ...TABELA, prices: [[100, null, 140], [130, 150, 170], [160, 180, 200]] };
    expect(lookupPrice(dziurawa, { width: 100, height: 100 })).toBeNull();
  });
});

describe('wycena pozycji oferty', () => {
  const tabele = [TABELA, GRUPA2];

  test('komplet danych daje koszt i wyjaśnienie, skąd jest', () => {
    const w = priceItem({ name: 'Rolety wolnowiszące FI32', material: 'Materiał C102 · 186 x 202 cm' }, tabele);
    expect(w.status).toBe('poza-tabela'); // 186 × 202 wykracza poza wycinek testowy
  });

  test('wymiar w zasięgu tabeli', () => {
    const w = priceItem({ name: 'Rolety wolnowiszące FI32', material: 'Materiał C102 · 90 x 120 cm' }, tabele);
    expect(w.status).toBe('ok');
    expect(w.cost).toBe(150);
    expect(w.table?.id).toBe('t1');
  });

  test('ten sam wymiar w droższej grupie materiału kosztuje więcej', () => {
    const w = priceItem({ name: 'Roleta FI32', material: 'Materiał C210 · 90 x 120 cm' }, tabele);
    expect(w.cost).toBe(250);
  });

  test('brak wymiaru rozpoznany osobno od braku tabeli', () => {
    expect(priceItem({ name: 'Roleta FI32', material: 'Materiał C102' }, tabele).status).toBe('brak-wymiaru');
    expect(priceItem({ name: 'Moskitiera', material: '90 x 120 cm' }, tabele).status).toBe('brak-tabeli');
    expect(priceItem({ name: 'Roleta', material: '90 x 120' }, []).status).toBe('brak-cennika');
  });
});

describe('wczytanie tabeli wklejonej z cennika', () => {
  test('kolumny rozdzielone tabulatorem', () => {
    const t = parsePastedTable('\t80\t100\t120\n100\t100\t120\t140\n150\t130\t150\t170');
    expect(t.widths).toEqual([80, 100, 120]);
    expect(t.heights).toEqual([100, 150]);
    expect(t.prices[1]).toEqual([130, 150, 170]);
    expect(t.problems).toEqual([]);
  });

  test('kolumny rozdzielone spacjami, ceny z przecinkiem', () => {
    const t = parsePastedTable('szer.   80    100\n100     120,50 140,00\n150     150,50 170,00');
    expect(t.widths).toEqual([80, 100]);
    expect(t.prices[0]).toEqual([120.5, 140]);
  });

  test('spacja w tysiącach nie rozbija liczby', () => {
    const t = parsePastedTable('\t80\t100\n100\t1 234,50\t1 500,00');
    expect(t.prices[0]).toEqual([1234.5, 1500]);
  });

  test('niepełny wiersz zgłasza się zamiast po cichu przesuwać ceny', () => {
    const t = parsePastedTable('\t80\t100\t120\n100\t100\t120');
    expect(t.prices[0]).toEqual([100, 120, null]);
    expect(t.problems.join(' ')).toContain('2 z 3');
  });

  test('puste wklejenie nie tworzy tabeli-widma', () => {
    expect(parsePastedTable('').widths).toEqual([]);
    expect(parsePastedTable('').problems.length).toBe(1);
  });
});

describe('kontrola odczytu cennika', () => {
  test('poprawna tabela nie zgłasza nic', () => {
    expect(checkTable(TABELA)).toEqual([]);
    expect(checkHeaders(TABELA)).toEqual([]);
  });

  test('cena niższa niż przy węższej rolecie to sygnał pomyłki', () => {
    const zbledem = { ...TABELA, prices: [[100, 90, 140], [130, 150, 170], [160, 180, 200]] };
    const usterki = checkTable(zbledem);
    expect(usterki).toHaveLength(1);
    expect(usterki[0]).toMatchObject({ row: 0, col: 1 });
    expect(usterki[0].reason).toContain('węższa');
  });

  test('cena niższa niż przy niższej rolecie też', () => {
    const zbledem = { ...TABELA, prices: [[100, 120, 140], [130, 110, 170], [160, 180, 200]] };
    expect(checkTable(zbledem).map((u) => `${u.row}-${u.col}`)).toContain('1-1');
  });

  test('zero w cenie wyłapane osobno', () => {
    const zbledem = { ...TABELA, prices: [[0, 120, 140], [130, 150, 170], [160, 180, 200]] };
    expect(checkTable(zbledem)[0].reason).toContain('zerowa');
  });

  test('nagłówki muszą rosnąć', () => {
    expect(checkHeaders({ widths: [100, 80], heights: [100, 150] })[0]).toContain('Szerokości');
    expect(checkHeaders({ widths: [80, 100], heights: [150, 100] })[0]).toContain('Wysokości');
  });

  test('liczenie pustych komórek', () => {
    expect(pustePola(TABELA)).toBe(0);
    expect(pustePola({ ...TABELA, prices: [[100, null, null], [130, 150, 170], [160, 180, 200]] })).toBe(2);
  });
});

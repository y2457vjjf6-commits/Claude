import { dimensionConflict, itemDimensions, priceItem, specDimensions } from './pricing';
import { OfferSpecRow, PriceTable } from '../types';

const para = (label: string, value: string): OfferSpecRow => ({ label, value });

test('czyta szerokość i wysokość całkowitą', () => {
  expect(specDimensions([para('Szerokość całkowita', '180'), para('Wysokość całkowita', '250')])).toEqual({
    width: 180,
    height: 250
  });
});

test('rozumie jednostki tak samo jak opis pozycji', () => {
  expect(specDimensions([para('Szerokość całkowita', '1800 mm')])).toEqual({ width: 180 });
  expect(specDimensions([para('Szerokość całkowita', '1,8 m')])).toEqual({ width: 180 });
  expect(specDimensions([para('Szerokość całkowita', '180 cm')])).toEqual({ width: 180 });
  // bez jednostki zgadujemy po rzędzie wielkości, jak wszędzie indziej
  expect(specDimensions([para('Wysokość całkowita', '2500')])).toEqual({ height: 250 });
});

test('skróty i zapis z dwukropkiem też działają', () => {
  expect(specDimensions([para('szer.', '180'), para('WYS:', '250')])).toEqual({ width: 180, height: 250 });
});

test('„Wysokość kasety" to nie wysokość osłony', () => {
  expect(specDimensions([para('Wysokość kasety', '12'), para('Kolor kasety', 'RAL 9005')])).toEqual({});
});

test('wartość opisowa jest pomijana, bo nie wiadomo, co znaczy', () => {
  expect(specDimensions([para('Szerokość całkowita', 'ok. 180')])).toEqual({});
  expect(specDimensions([para('Szerokość całkowita', '180–185')])).toEqual({});
  expect(specDimensions([para('Szerokość całkowita', '')])).toEqual({});
  expect(specDimensions([para('Szerokość całkowita', '0')])).toEqual({});
});

test('liczy się pierwszy wpis, gdy ktoś wpisał parametr dwa razy', () => {
  expect(
    specDimensions([para('Szerokość całkowita', '180'), para('Szerokość', '999')])
  ).toEqual({ width: 180 });
});

test('pola specyfikacji biją wymiar z opisu pozycji', () => {
  expect(
    itemDimensions({
      name: 'Roleta',
      material: 'Grupa E · 140 x 200 cm',
      spec: [para('Szerokość całkowita', '180'), para('Wysokość całkowita', '250')]
    })
  ).toEqual({ width: 180, height: 250 });
});

test('podana jedna strona — drugą dalej bierzemy z opisu', () => {
  expect(
    itemDimensions({ name: '', material: '140 x 200 cm', spec: [para('Szerokość całkowita', '180')] })
  ).toEqual({ width: 180, height: 200 });
});

test('bez specyfikacji wymiar czyta się jak dotąd', () => {
  expect(itemDimensions({ name: 'Roleta 90 x 120 cm', material: '' })).toEqual({ width: 90, height: 120 });
  expect(itemDimensions({ name: 'Roleta', material: 'Grupa A' })).toBeNull();
});

test('sama szerokość bez niczego innego nie wystarczy do wyceny', () => {
  expect(itemDimensions({ name: 'Roleta', material: '', spec: [para('Szerokość całkowita', '180')] })).toBeNull();
});

// --- wycena ---

const TABELA: PriceTable = {
  id: 't1',
  name: 'Roleta testowa',
  product: ['Roleta testowa'],
  materials: [],
  widths: [100, 150, 200],
  heights: [150, 250, 300],
  prices: [
    [10, 20, 30],
    [40, 50, 60],
    [70, 80, 90]
  ],
  updatedAt: '2026-01-01'
};

test('cennik liczy z pól specyfikacji, gdy opis pozycji nie ma wymiaru', () => {
  const w = priceItem(
    {
      name: 'Roleta testowa',
      material: 'Grupa A',
      spec: [para('Szerokość całkowita', '180'), para('Wysokość całkowita', '250')]
    },
    [TABELA]
  );
  expect(w.status).toBe('ok');
  expect(w.wymiar).toEqual({ width: 180, height: 250 });
  // w cenniku wiersze to wysokości, kolumny szerokości: 180 → kolumna 200,
  // 250 → wiersz 250, czyli prices[1][2]
  expect(w.cost).toBe(60);
  expect([w.cellWidth, w.cellHeight]).toEqual([200, 250]);
});

test('bez wymiaru nadal mówi wprost, czego brakuje', () => {
  expect(priceItem({ name: 'Roleta testowa', material: 'Grupa A' }, [TABELA]).status).toBe('brak-wymiaru');
});

// --- niezgodność opisu i specyfikacji ---

test('zgodne wymiary nie są sporem', () => {
  expect(
    dimensionConflict({
      name: '',
      material: '180 x 250 cm',
      spec: [para('Szerokość całkowita', '180'), para('Wysokość całkowita', '250')]
    })
  ).toBeNull();
});

test('rozjazd opisu i specyfikacji jest zgłaszany', () => {
  expect(
    dimensionConflict({
      name: '',
      material: 'Grupa A · 90 x 120 cm',
      spec: [para('Szerokość całkowita', '140'), para('Wysokość całkowita', '240')]
    })
  ).toEqual({ zOpisu: { width: 90, height: 120 }, zPol: { width: 140, height: 240 } });
});

test('bez jednego ze źródeł nie ma o co się spierać', () => {
  expect(dimensionConflict({ name: '', material: '90 x 120 cm' })).toBeNull();
  expect(
    dimensionConflict({ name: '', material: 'Grupa A', spec: [para('Szerokość całkowita', '140')] })
  ).toBeNull();
  // tylko jedna strona w specyfikacji: druga i tak pochodzi z opisu, więc to nie spór
  expect(
    dimensionConflict({ name: '', material: '90 x 120 cm', spec: [para('Szerokość całkowita', '140')] })
  ).toBeNull();
});

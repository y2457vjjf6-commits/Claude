import { priceVertical, VERTICALE } from './verticale';

test('cennik ma wszystkie tkaniny i obie szerokości pasa', () => {
  expect(VERTICALE.tkaniny).toHaveLength(13);
  expect(VERTICALE.tkaniny.every((t) => t['89'] > 0 && t['127'] > 0)).toBe(true);
  expect(VERTICALE.szyna).toBe(85);
});

test('cena składa się z tkaniny za m² i szyny za metr bieżący', () => {
  // Berlin, pas 89 mm: 53 zł/m²; verticale 200 x 150 cm to 3 m² i 2 mb
  const w = priceVertical('Berlin', '89', 200, 150)!;
  expect(w.metry).toBe(3);
  expect(w.mb).toBe(2);
  expect(w.tkanina).toBe(159);
  expect(w.szyna).toBe(170);
  expect(w.razem).toBe(329);
});

test('szerszy pas bywa tańszy, i tak jest w cenniku', () => {
  // Line N: 71 zł/m² przy 89 mm, 52 zł przy 127 mm
  const waski = priceVertical('Line N', '89', 200, 200)!;
  const szeroki = priceVertical('Line N', '127', 200, 200)!;
  expect(szeroki.razem).toBeLessThan(waski.razem);
});

test('mały verticale płaci minimum producenta: 1 m² i 1 mb', () => {
  const w = priceVertical('Berlin', '89', 50, 50)!;
  expect(w.metry).toBe(1);
  expect(w.mb).toBe(1);
  expect(w.razem).toBe(53 + 85);
});

test('nieznana tkanina i bezsensowny wymiar nie dają ceny', () => {
  expect(priceVertical('Nie ma takiej', '89', 100, 100)).toBeNull();
  expect(priceVertical('Berlin', '89', 0, 100)).toBeNull();
  expect(priceVertical('Berlin', '89', NaN, 100)).toBeNull();
});

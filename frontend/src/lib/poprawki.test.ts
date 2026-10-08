import { CENNIK, ilePoprawek } from './cennik';
import { lookupPrice, opiszWycene, priceItem } from './pricing';

/** Kratki, które w cenniku łamią regułę siatki: cena nie może maleć,
 *  gdy roleta czy żaluzja rośnie. */
function malejace(t: (typeof CENNIK)[number]): string[] {
  const zle: string[] = [];
  for (let i = 0; i < t.prices.length; i++) {
    for (let j = 0; j < t.prices[i].length; j++) {
      const c = t.prices[i][j];
      if (typeof c !== 'number') continue;
      const lewo = j ? t.prices[i][j - 1] : null;
      const gora = i ? t.prices[i - 1][j] : null;
      if (typeof lewo === 'number' && c < lewo) zle.push(`${t.id} ${t.widths[j]}x${t.heights[i]}`);
      else if (typeof gora === 'number' && c < gora) zle.push(`${t.id} ${t.widths[j]}x${t.heights[i]}`);
    }
  }
  return zle;
}

test('po poprawkach żadna cena nie maleje, gdy produkt rośnie', () => {
  const zle = CENNIK.flatMap(malejace);
  expect(zle).toEqual([]);
});

test('poprawki w ogóle są i dotyczą wielu produktów', () => {
  expect(ilePoprawek()).toBeGreaterThan(50);
  const zPoprawkami = CENNIK.filter((t) => t.corrected && Object.keys(t.corrected).length);
  expect(zPoprawkami.length).toBeGreaterThan(10);
});

test('odczyt podaje kwotę poprawioną i mówi, co było w cenniku', () => {
  // żaluzja aluminiowa 50 mm, grupa BE, 350 x 330 cm — najcięższa usterka cennika
  const t = CENNIK.find((x) => x.id === 'zaluzje-alu-50-BE')!;
  const w = lookupPrice(t, { width: 350, height: 330 })!;
  expect(w.printed).toBe(6410);
  expect(w.cost).toBe(3089);
});

test('kratka nietknięta nie udaje poprawionej', () => {
  const t = CENNIK.find((x) => x.id === 'zaluzje-alu-50-BE')!;
  const w = lookupPrice(t, { width: 50, height: 50 })!;
  expect(w.printed).toBeUndefined();
});

test('poprawka zmienia tylko swoją kratkę', () => {
  const t = CENNIK.find((x) => x.id === 'zaluzje-drewno-25')!;
  // 190 x 200 poprawione z 2032 na 1663; sąsiadki zostają takie jak w cenniku
  expect(lookupPrice(t, { width: 190, height: 200 })!.cost).toBe(1663);
  expect(lookupPrice(t, { width: 180, height: 200 })!.cost).toBe(1585);
  expect(lookupPrice(t, { width: 200, height: 200 })!.cost).toBe(1740);
});

test('poprawione kratki trzymają się siatki, z której wyszły', () => {
  for (const t of CENNIK) {
    for (const klucz of Object.keys(t.corrected || {})) {
      const [i, j] = klucz.split(':').map(Number);
      expect(t.prices[i]?.[j]).toEqual(expect.any(Number));
      expect(t.heights[i]).toEqual(expect.any(Number));
      expect(t.widths[j]).toEqual(expect.any(Number));
    }
  }
});

test('każda poprawka trafia w istniejącą kratkę', () => {
  // bez tego literówka w identyfikacie produktu po cichu wyłącza poprawkę
  const nalozone = CENNIK.reduce((s, t) => s + Object.keys(t.corrected || {}).length, 0);
  expect(nalozone).toBe(ilePoprawek());
});

test('opis pozycji mówi, że kwota jest poprawiona', () => {
  const w = priceItem(
    { name: 'Żaluzja aluminiowa 50mm', material: 'Grupa BE · 350 x 330 cm' },
    CENNIK
  );
  expect(w.status).toBe('ok');
  expect(w.cost).toBe(3089);
  expect(w.printed).toBe(6410);
  expect(opiszWycene(w)).toContain('poprawione');
  expect(opiszWycene(w)).toContain('6410');
});

test('zwykła kratka nie wspomina o poprawce', () => {
  const w = priceItem({ name: 'Żaluzja aluminiowa 50mm', material: 'Grupa A · 50 x 50 cm' }, CENNIK);
  expect(opiszWycene(w)).not.toContain('poprawione');
});

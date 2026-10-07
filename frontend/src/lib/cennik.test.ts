import { CENNIK, cennikProdukty, priceTablesFor } from './cennik';
import { matchTable, priceItem, surchargeAmount } from './pricing';

test('cennik rozwija się na pięć grup od każdego produktu', () => {
  expect(cennikProdukty()).toHaveLength(6);
  expect(CENNIK).toHaveLength(30);
  expect(CENNIK.every((t) => t.widths.length && t.heights.length)).toBe(true);
});

test('siatka ma tyle wierszy i kolumn, ile nagłówków', () => {
  for (const t of CENNIK) {
    expect(t.prices).toHaveLength(t.heights.length);
    for (const w of t.prices) expect(w).toHaveLength(t.widths.length);
  }
});

test('pozycja z nazwą produktu i grupą dostaje cenę', () => {
  const w = priceItem({ name: 'Roleta wolnowisząca Mini 19mm', material: 'Grupa A · 100 x 150 cm' }, CENNIK);
  expect(w.status).toBe('ok');
  expect(w.table?.id).toBe('rolety-mini-19-A');
  expect(typeof w.cost).toBe('number');
});

test('nazwa tkaniny wskazuje grupę tak samo jak litera', () => {
  const litera = priceItem({ name: 'Roleta Mini 19', material: 'Grupa C · 100 x 150 cm' }, CENNIK);
  const tkanina = priceItem({ name: 'Roleta Mini 19', material: 'Madagaskar · 100 x 150 cm' }, CENNIK);
  expect(tkanina.table?.id).toBe(litera.table?.id);
  expect(tkanina.cost).toBe(litera.cost);
});

test('ten sam materiał w innym produkcie daje inną tabelę', () => {
  const mini = matchTable({ name: 'Roleta Mini 19', material: 'Grupa C' }, CENNIK);
  const rt = matchTable({ name: 'Roleta RT 40/45', material: 'Grupa C' }, CENNIK);
  expect(mini?.id).toBe('rolety-mini-19-C');
  expect(rt?.id).toBe('rolety-rt-40-45-C');
});

test('antracytowy UNI nie dostaje ceny białego', () => {
  const bialy = matchTable({ name: 'Rolety kasetowe System UNI, kaseta biała', material: 'Grupa B' }, CENNIK);
  const antracyt = matchTable(
    { name: 'Rolety kasetowe System UNI, kaseta antracyt', material: 'Grupa B' },
    CENNIK
  );
  expect(bialy?.id).toBe('rolety-kasetowe-uni-B');
  expect(antracyt?.id).toBe('rolety-kasetowe-uni-antracyt-B');
});

test('produkt spoza cennika nie dostaje przypadkowej ceny', () => {
  expect(priceItem({ name: 'Moskitiera ramkowa', material: '100 x 150 cm' }, CENNIK).status).toBe('brak-tabeli');
});

test('wymiar ponad siatkę zgłasza się zamiast milczeć', () => {
  expect(priceItem({ name: 'Roleta Mini 19', material: 'Grupa A · 400 x 400 cm' }, CENNIK).status)
    .toBe('poza-tabela');
});

describe('dopłaty', () => {
  const rt = CENNIK.find((t) => t.id === 'rolety-rt-40-45-A')!;

  test('produkt niesie swoje dopłaty', () => {
    const nazwy = (rt.surcharges || []).map((d) => d.name);
    expect(nazwy).toContain('Dopłata do profilu montażowego');
    expect(nazwy.some((n) => n.includes('Torro'))).toBe(true);
  });

  test('dopłata stała ma kwotę wprost', () => {
    const silnik = (rt.surcharges || []).find((d) => d.name.includes('bez radia'))!;
    expect(surchargeAmount(silnik, { width: 100, height: 100 })).toBe(650);
  });

  test('dopłata od szerokości zaokrągla w górę, jak siatka cen', () => {
    const profil = (rt.surcharges || []).find((d) => d.name === 'Dopłata do profilu montażowego')!;
    // progi co 10 cm od 50; 95 cm płaci stawkę ze 100 cm
    expect(surchargeAmount(profil, { width: 95, height: 100 }))
      .toBe(surchargeAmount(profil, { width: 100, height: 100 }));
    expect(surchargeAmount(profil, { width: 50, height: 100 })).toBe(60);
  });

  test('szerokość ponad ostatni próg nie zgaduje kwoty', () => {
    const profil = (rt.surcharges || []).find((d) => d.name === 'Dopłata do profilu montażowego')!;
    expect(surchargeAmount(profil, { width: 999, height: 100 })).toBeNull();
  });

  test('prowadnice UNI liczą się od wysokości i każdy typ osobno', () => {
    const uni = CENNIK.find((t) => t.id === 'rolety-kasetowe-uni-A')!;
    const typy = (uni.surcharges || []).filter((d) => d.name.startsWith('Prowadnice typ'));
    expect(typy.length).toBeGreaterThan(1);
    expect(typy.every((d) => d.by === 'height')).toBe(true);
    const c = typy.find((d) => d.name === 'Prowadnice typ C')!;
    expect(surchargeAmount(c, { width: 100, height: 50 })).toBe(17);
  });
});

test('własne tabele mają pierwszeństwo przed wbudowanymi', () => {
  const wlasna = { ...CENNIK[0], id: 'moja', name: 'Moja tabela' };
  expect(priceTablesFor([wlasna])[0].id).toBe('moja');
  expect(priceTablesFor(undefined)).toHaveLength(CENNIK.length);
});

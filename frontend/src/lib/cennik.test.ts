import { CENNIK, cennikProdukty, priceTablesFor } from './cennik';
import { matchTable, priceItem, surchargeAmount } from './pricing';

test('każdy produkt rozwija się na tyle tabel, ile ma grup materiału', () => {
  const produkty = cennikProdukty();
  expect(produkty.length).toBeGreaterThan(0);
  // liczymy z danych, a nie z palca — dołożenie produktu nie ma psuć testu
  const oczekiwane = produkty.reduce((s, p) => s + p.grupy.length, 0);
  expect(CENNIK).toHaveLength(oczekiwane);
  expect(CENNIK.every((t) => t.widths.length && t.heights.length)).toBe(true);
  // każda tabela musi dać się odróżnić od pozostałych
  expect(new Set(CENNIK.map((t) => t.id)).size).toBe(CENNIK.length);
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

describe('nowe rodziny produktów', () => {
  it('dzień-noc ma własny podział materiałów, inny niż rolety', () => {
    // „DN 600" to grupa 3 w dzień-nocach; w roletach taka tkanina nie istnieje
    const dn = matchTable({ name: 'Roleta dzień-noc Mini 19', material: 'DN 600' }, CENNIK);
    expect(dn?.id).toBe('dn-mini-19-3');
    const rolety = matchTable({ name: 'Roleta wolnowisząca Mini 19', material: 'DN 600' }, CENNIK);
    expect(rolety).toBeNull();
  });

  it('dzień-noc Midi nie dostaje ceny Mini', () => {
    const mini = matchTable({ name: 'Roleta dzień-noc Mini 19', material: 'Jazz' }, CENNIK);
    const midi = matchTable({ name: 'Roleta dzień-noc Midi 32', material: 'Jazz' }, CENNIK);
    expect(mini?.id).toBe('dn-mini-19-1');
    expect(midi?.id).toBe('dn-midi-32-1');
  });

  it('DECOLUX w sośnie nie dostaje ceny białego', () => {
    const bialy = matchTable({ name: 'Roleta dachowa DECOLUX biała', material: 'Grupa B' }, CENNIK);
    const sosna = matchTable({ name: 'Roleta dachowa DECOLUX, jasna sosna', material: 'Grupa B' }, CENNIK);
    expect(bialy?.id).toBe('decolux-bialy-B');
    expect(sosna?.id).toBe('decolux-drewno-B');
  });

  it('kasetowa UNI drewnopodobna ma swój cennik', () => {
    const t = matchTable(
      { name: 'Roleta kasetowa UNI drewnopodobne', material: 'Grupa C' },
      CENNIK
    );
    expect(t?.id).toBe('rolety-kasetowe-uni-drewno-C');
  });

  it('dopłata za kasetę w dzień-nocy Midi liczy się od szerokości', () => {
    const t = CENNIK.find((x) => x.id === 'dn-midi-32-1')!;
    const kaseta = (t.surcharges || []).find((d) => d.name === 'Dopłata za kasetę')!;
    expect(kaseta.by).toBe('width');
    expect(surchargeAmount(kaseta, { width: 50, height: 100 })).toBe(93);
    expect(surchargeAmount(kaseta, { width: 55, height: 100 })).toBe(112);
  });
});

test('kasetowe dzień-noc nie mieszają się z wolnowiszącymi ani z rolet kasetowych', () => {
  const kaseta = matchTable({ name: 'Roleta kasetowa dzień-noc UNI', material: 'Jazz' }, CENNIK);
  expect(kaseta?.id).toBe('dn-uni-bialy-1');
  // ta sama tkanina w zwykłej rolecie kasetowej nie istnieje — grupy są inne
  expect(matchTable({ name: 'Roleta kasetowa UNI', material: 'Jazz' }, CENNIK)).toBeNull();
});

test('kolor kasetowej dzień-nocy wybiera właściwy cennik', () => {
  const warianty = ['', 'antracyt', 'drewnopodobne'].map(
    (k) => matchTable({ name: `Roleta kasetowa dzień-noc UNI ${k}`, material: 'DN 600' }, CENNIK)?.id
  );
  expect(warianty).toEqual(['dn-uni-bialy-3', 'dn-uni-antracyt-3', 'dn-uni-drewno-3']);
});

describe('produkty bez grup materiałowych', () => {
  it('żaluzje drewniane mają jedną tabelę, dobieraną po samej nazwie', () => {
    const t = matchTable({ name: 'Żaluzja drewniana 25mm', material: 'Turner Oak' }, CENNIK);
    expect(t?.id).toBe('zaluzje-drewno-25');
    // nazwa tabeli nie udaje grupy, której nie ma
    expect(t?.name).not.toContain('grupa');
    expect(t?.materials).toEqual([]);
  });

  it('szerokość lameli rozdziela dwa cenniki żaluzji', () => {
    expect(matchTable({ name: 'Żaluzja drewniana 50mm', material: '' }, CENNIK)?.id)
      .toBe('zaluzje-drewno-50');
  });

  it('dopłata procentowa liczy się od ceny pozycji', () => {
    const t = CENNIK.find((x) => x.id === 'zaluzje-drewno-25')!;
    const drabinka = (t.surcharges || []).find((d) => d.name.startsWith('Drabinka'))!;
    expect(drabinka.percent).toBe(20);
    expect(surchargeAmount(drabinka, { width: 100, height: 100 }, 500)).toBe(100);
    // bez ceny pozycji nie ma z czego liczyć procentu
    expect(surchargeAmount(drabinka, { width: 100, height: 100 })).toBeNull();
  });
});

describe('żaluzje aluminiowe obok drewnianych', () => {
  it('materiał rozstrzyga, który cennik obowiązuje', () => {
    expect(matchTable({ name: 'Żaluzja aluminiowa 25mm', material: 'Grupa A' }, CENNIK)?.id)
      .toBe('zaluzje-alu-25-A');
    expect(matchTable({ name: 'Żaluzja drewniana 25mm', material: '' }, CENNIK)?.id)
      .toBe('zaluzje-drewno-25');
  });

  it('ta sama siatka obsługuje drewno i bambus', () => {
    expect(matchTable({ name: 'Żaluzja bambusowa 50mm', material: '' }, CENNIK)?.id)
      .toBe('zaluzje-drewno-50');
  });

  it('żaluzja bez podanego materiału nie dostaje ceny z sufitu', () => {
    // drewniana kosztuje prawie dwa razy tyle co aluminiowa, więc zgadywanie
    // kończyłoby się zawyżoną albo zaniżoną ofertą
    expect(matchTable({ name: 'Żaluzja 25mm', material: '' }, CENNIK)).toBeNull();
  });

  it('szerokość lameli rozdziela cenniki aluminiowe', () => {
    expect(matchTable({ name: 'Żaluzja aluminiowa 16mm', material: '' }, CENNIK)?.id)
      .toBe('zaluzje-alu-16');
  });
});

describe('VENUS obok zwykłych aluminiowych', () => {
  it('VENUS nie trafia na tańszy cennik aluminiowy', () => {
    // obie rodziny są aluminiowe i obie mają lamelę 25 mm
    expect(matchTable({ name: 'Żaluzja aluminiowa VENUS 25mm', material: 'Grupa B' }, CENNIK)?.id)
      .toBe('venus-25-B');
  });

  it('zwykła aluminiowa nadal dostaje swój cennik', () => {
    expect(matchTable({ name: 'Żaluzja aluminiowa 25mm', material: 'Grupa A' }, CENNIK)?.id)
      .toBe('zaluzje-alu-25-A');
  });

  it('VENUS 16 i 25 mm to osobne cenniki', () => {
    expect(matchTable({ name: 'Żaluzja VENUS 16mm', material: 'Grupa B' }, CENNIK)?.id)
      .toBe('venus-16-B');
  });
});

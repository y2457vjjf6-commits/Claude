import { priceTablesFor } from './cennik';
import {
  groupsFromMeasurement,
  itemFromMeasurement,
  parseMeasurementMail,
  sidesFromLetters,
  withoutPrice
} from './measurementMail';

/** Prawdziwa wiadomość z pomiaru — przepisana znak w znak z pliku .eml,
 *  razem z końcami linii, jakie wstawia klient pocztowy. */
const TEMAT = 'Wislana 11c / 1';
const TRESC = [
  'Żaluzja drewniana 25 kolor do ustalenia',
  'Kuchnia',
  '85,7 x 109 L',
  '95,5 x 120 L',
  '77,7 x 109 P',
  '',
  'Łazienka',
  '59 x 82 P',
  '',
  'Pokój córki',
  '75,7 x 132 P',
  '81,2 x 132 LP',
  '85,5 x 83 L',
  '91 x 83 LP',
  '',
  'Sypialnia',
  '88,7 x 132 P',
  '98,7 x 83 P',
  '',
  'Garderoba',
  '81,7 x 132 L',
  '84,2 x 132 L',
  '91,2 x 142 P',
  '77,7 x 132 L',
  '91,5 x 83 L',
  '94 x 83 L',
  '91,5 x 83 P',
  '87,7 x 83 L',
  '',
  'Łazienka piętro',
  '58,7 x 132',
  '68,7 x 83',
  ''
].join('\r\n');

describe('litery na sztuki i strony', () => {
  test('jedna litera to jedna sztuka', () => {
    expect(sidesFromLetters('L')).toEqual([{ side: 'lewa', qty: 1 }]);
    expect(sidesFromLetters('P')).toEqual([{ side: 'prawa', qty: 1 }]);
  });

  test('LP to dwie sztuki — lewa i prawa', () => {
    expect(sidesFromLetters('LP')).toEqual([
      { side: 'lewa', qty: 1 },
      { side: 'prawa', qty: 1 }
    ]);
  });

  test('LLPP to cztery sztuki: dwie lewe i dwie prawe', () => {
    expect(sidesFromLetters('LLPP')).toEqual([
      { side: 'lewa', qty: 2 },
      { side: 'prawa', qty: 2 }
    ]);
  });

  test('litery zbite w dowolnej kolejności sumują się po stronach', () => {
    expect(sidesFromLetters('LPLP')).toEqual([
      { side: 'lewa', qty: 2 },
      { side: 'prawa', qty: 2 }
    ]);
    expect(sidesFromLetters('ppl')).toEqual([
      { side: 'prawa', qty: 2 },
      { side: 'lewa', qty: 1 }
    ]);
  });

  test('brak liter to jedna sztuka bez strony — do uzupełnienia', () => {
    expect(sidesFromLetters('')).toEqual([{ side: '', qty: 1 }]);
  });

  test('litera spoza L/P nie jest zgadywana', () => {
    expect(sidesFromLetters('X')).toBeNull();
    expect(sidesFromLetters('LX')).toBeNull();
  });
});

describe('rozkładanie prawdziwej wiadomości', () => {
  const p = parseMeasurementMail(TEMAT, TRESC);

  test('klient i produkt', () => {
    expect(p.client).toBe('Wislana 11c / 1');
    expect(p.product).toBe('Żaluzja drewniana 25 kolor do ustalenia');
  });

  test('nie zostaje ani jedna niezrozumiana linia', () => {
    expect(p.unknown).toEqual([]);
  });

  test('wszystkie pomieszczenia, w kolejności z maila', () => {
    const pokoje: string[] = [];
    for (const it of p.items) if (!pokoje.includes(it.room)) pokoje.push(it.room);
    expect(pokoje).toEqual(['Kuchnia', 'Łazienka', 'Pokój córki', 'Sypialnia', 'Garderoba', 'Łazienka piętro']);
  });

  test('20 linii wymiarów daje 22 pozycje, bo dwie są podwójne (LP)', () => {
    expect(p.items).toHaveLength(22);
    expect(p.items.reduce((s, i) => s + i.qty, 0)).toBe(22);
  });

  test('LP rozbija się na lewą i prawą w tym samym wymiarze', () => {
    const lp = p.items.filter((i) => i.source === '81,2 x 132 LP');
    expect(lp).toEqual([
      { room: 'Pokój córki', width: 81.2, height: 132, side: 'lewa', qty: 1, source: '81,2 x 132 LP' },
      { room: 'Pokój córki', width: 81.2, height: 132, side: 'prawa', qty: 1, source: '81,2 x 132 LP' }
    ]);
  });

  test('dwa wymiary bez litery czekają na uzupełnienie, nie na domysł', () => {
    expect(p.missingSide).toBe(2);
    const bezStrony = p.items.filter((i) => !i.side);
    expect(bezStrony.map((i) => i.source)).toEqual(['58,7 x 132', '68,7 x 83']);
    expect(bezStrony.every((i) => i.room === 'Łazienka piętro')).toBe(true);
  });

  test('przecinek dziesiętny czyta się jako centymetry', () => {
    expect(p.items[0]).toEqual({
      room: 'Kuchnia',
      width: 85.7,
      height: 109,
      side: 'lewa',
      qty: 1,
      source: '85,7 x 109 L'
    });
  });
});

describe('pozycja wyceny z pomiaru', () => {
  const p = parseMeasurementMail(TEMAT, TRESC);

  test('wymiar idzie i w opis pozycji, i w pola specyfikacji', () => {
    const poz = itemFromMeasurement(p.items[0], p.product);
    expect(poz.material).toBe('85,7 x 109 cm');
    expect(poz.spec).toEqual([
      { label: 'Szerokość całkowita', value: '85,7 cm' },
      { label: 'Wysokość całkowita', value: '109 cm' },
      { label: 'Strona sterowania', value: 'lewa' }
    ]);
  });

  test('brak strony zostaje pustym polem do wypełnienia', () => {
    const bez = p.items.find((i) => !i.side)!;
    const poz = itemFromMeasurement(bez, p.product);
    expect(poz.spec?.find((w) => w.label === 'Strona sterowania')?.value).toBe('');
  });
});

describe('oferta z pomiaru', () => {
  const p = parseMeasurementMail(TEMAT, TRESC);
  let licznik = 0;
  const grupy = groupsFromMeasurement(p, priceTablesFor(undefined), () => `g${++licznik}`);

  test('jedna tabela na pomieszczenie, z podpisem', () => {
    expect(grupy.map((g) => g.title)).toEqual([
      'Kuchnia',
      'Łazienka',
      'Pokój córki',
      'Sypialnia',
      'Garderoba',
      'Łazienka piętro'
    ]);
    expect(grupy.map((g) => g.items.length)).toEqual([3, 1, 6, 2, 8, 2]);
  });

  test('cennik podstawia cenę każdej pozycji', () => {
    expect(withoutPrice(grupy)).toBe(0);
  });

  test('cena pierwszej pozycji zgadza się z kratką cennika 90 x 110', () => {
    // 85,7 x 109 wpada do kratki 90 x 110 — płaci się za pełną kratkę
    expect(grupy[0].items[0].unitPrice).toBe('593');
    expect(grupy[0].items[0].priceSource).toBe('cennik');
  });

  test('cena pochodzi z wymiaru, a nie z kolejności — ta sama kratka ta sama cena', () => {
    const lp = grupy[2].items.filter((i) => i.material === '81,2 x 132 cm');
    expect(lp).toHaveLength(2);
    expect(lp[0].unitPrice).toBe(lp[1].unitPrice);
  });
});

import {
  autoSpecFor,
  domyslnaSpec,
  matchSpecTemplate,
  nietkniete,
  uzyteczneWiersze,
  zestawy,
  zestawyDla
} from './specTemplates';
import { SpecTemplate } from '../types';

const SZABLONY: SpecTemplate[] = [
  { name: 'roleta', rows: [{ label: 'Sterowanie', value: '' }] },
  {
    name: 'roleta kasetowa uni',
    rows: [
      { label: 'Kolor kasety', value: 'Antracyt RAL 7016' },
      { label: 'Prowadnice', value: 'Typ E' },
      { label: 'Szerokość całkowita', value: '' }
    ]
  },
  { name: 'żaluzja drewniana', rows: [{ label: 'Listwa', value: 'Orzech 50 mm' }] }
];

const poz = (name: string, material = '') => ({ name, material });

test('szablon trafia na pozycję mimo odmiany i dopisków', () => {
  expect(matchSpecTemplate(poz('Rolety kasetowe System UNI, kaseta antracyt'), SZABLONY)?.name).toBe(
    'roleta kasetowa uni'
  );
  expect(matchSpecTemplate(poz('Żaluzje drewniane 50mm, listwa orzech'), SZABLONY)?.name).toBe(
    'żaluzja drewniana'
  );
});

test('wygrywa szablon bardziej szczegółowy', () => {
  expect(matchSpecTemplate(poz('Roleta kasetowa UNI'), SZABLONY)?.name).toBe('roleta kasetowa uni');
  expect(matchSpecTemplate(poz('Roleta wolnowisząca Mini 19'), SZABLONY)?.name).toBe('roleta');
});

test('szablon można przypisać też do kodu tkaniny z wiersza materiału', () => {
  const tkaniny: SpecTemplate[] = [{ name: 'C102', rows: [{ label: 'Tkanina', value: 'C102 beż' }] }];
  expect(matchSpecTemplate(poz('Roleta', 'Materiał C102 · 100 x 150 cm'), tkaniny)?.name).toBe('C102');
  // kod musi zgadzać się co do znaku, inaczej C1020 to byłaby inna cena i inna tkanina
  expect(matchSpecTemplate(poz('Roleta', 'Materiał C1020'), tkaniny)).toBeNull();
});

test('pusty szablon nie przykrywa dobrego', () => {
  const z: SpecTemplate[] = [
    { name: 'roleta kasetowa uni', rows: [] },
    { name: 'roleta', rows: [{ label: 'Sterowanie', value: 'Łańcuszek' }] }
  ];
  expect(matchSpecTemplate(poz('Roleta kasetowa UNI'), z)?.name).toBe('roleta');
});

test('wiersz bez nazwy parametru nie wchodzi do pozycji', () => {
  expect(
    uzyteczneWiersze({ name: 'x', rows: [{ label: ' Kolor ', value: ' Biały ' }, { label: '  ', value: 'coś' }] })
  ).toEqual([{ label: 'Kolor', value: 'Biały' }]);
});

test('pusta wartość zostaje — to miejsce do uzupełnienia', () => {
  expect(uzyteczneWiersze({ name: 'x', rows: [{ label: 'Szerokość całkowita', value: '' }] })).toEqual([
    { label: 'Szerokość całkowita', value: '' }
  ]);
});

// --- podstawianie do pozycji ---

test('pozycja bez specyfikacji dostaje szablon', () => {
  expect(autoSpecFor(poz('Roleta kasetowa UNI'), { specTemplates: SZABLONY })).toEqual([
    { label: 'Kolor kasety', value: 'Antracyt RAL 7016' },
    { label: 'Prowadnice', value: 'Typ E' },
    { label: 'Szerokość całkowita', value: '' }
  ]);
});

test('wypełniona specyfikacja jest nietykalna', () => {
  expect(
    autoSpecFor(
      { name: 'Roleta kasetowa UNI', material: '', spec: [{ label: 'Kolor kasety', value: 'Biały' }] },
      { specTemplates: SZABLONY }
    )
  ).toBeNull();
});

test('same puste wiersze nie liczą się jako własna specyfikacja', () => {
  expect(
    autoSpecFor(
      { name: 'Roleta kasetowa UNI', material: '', spec: [{ label: '', value: '' }] },
      { specTemplates: SZABLONY }
    )
  ).not.toBeNull();
});

test('bez pasującego szablonu nic się nie dzieje', () => {
  expect(autoSpecFor(poz('Markiza tarasowa'), { specTemplates: SZABLONY })).toBeNull();
  expect(autoSpecFor(poz('Roleta kasetowa UNI'), undefined)).toBeNull();
  expect(autoSpecFor(poz(''), { specTemplates: SZABLONY })).toBeNull();
});

test('podstawione wiersze są kopią, nie wspólnym obiektem z ustawieniami', () => {
  const wiersze = autoSpecFor(poz('Żaluzje drewniane'), { specTemplates: SZABLONY })!;
  wiersze[0].value = 'Dąb';
  expect(SZABLONY[2].rows[0].value).toBe('Orzech 50 mm');
});

// --- domyślna specyfikacja ---

const DOMYSLNE = [
  { label: 'Materiał', value: '' },
  { label: 'Strona sterowania', value: '' }
];

test('w zleceniu produkt bez szablonu dostaje wiersze domyślne', () => {
  expect(autoSpecFor(poz('Markiza tarasowa'), { specTemplates: SZABLONY, defaultSpec: DOMYSLNE })).toEqual(
    DOMYSLNE
  );
});

test('oferta domyślnych nie dostaje — idzie do klienta, a puste rubryki wyglądają jak niedokończona robota', () => {
  expect(autoSpecFor(poz('Markiza tarasowa'), { specTemplates: SZABLONY })).toBeNull();
});

test('szablon produktu ma pierwszeństwo przed domyślnym', () => {
  expect(
    autoSpecFor(poz('Roleta kasetowa UNI'), { specTemplates: SZABLONY, defaultSpec: DOMYSLNE })?.[0].label
  ).toBe('Kolor kasety');
});

test('wypełniona specyfikacja jest nietykalna także wobec domyślnych', () => {
  expect(
    autoSpecFor(
      { name: 'Markiza', material: '', spec: [{ label: 'Coś', value: 'swojego' }] },
      { defaultSpec: DOMYSLNE }
    )
  ).toBeNull();
});

test('bez domyślnych i bez szablonu nic nie wstawiamy', () => {
  expect(autoSpecFor(poz('Markiza'), { specTemplates: [], defaultSpec: [] })).toBeNull();
  expect(autoSpecFor(poz('Markiza'), {})).toBeNull();
});

test('domyślne wiersze są kopią, nie wspólnym obiektem z ustawieniami', () => {
  const ustawienia = { defaultSpec: DOMYSLNE };
  const wiersze = autoSpecFor(poz('Markiza'), ustawienia)!;
  wiersze[0].value = 'Drewno';
  expect(ustawienia.defaultSpec[0].value).toBe('');
});

test('wiersz bez nazwy nie wchodzi do domyślnych', () => {
  expect(
    domyslnaSpec(poz('Cokolwiek'), { defaultSpec: [{ label: '  ', value: 'x' }, { label: 'Kolor', value: '' }] })
  ).toEqual([{ label: 'Kolor', value: '' }]);
});

// --- zestawy domyślne przypisane do kategorii ---

const ZESTAWY = [
  {
    id: 'r',
    name: 'Rolety',
    departments: ['rolety'] as const,
    rows: [{ label: 'Kolor kasety', value: '' }, { label: 'Prowadnice', value: '' }]
  },
  {
    id: 'm',
    name: 'Moskitiery',
    departments: ['moskitiery'] as const,
    rows: [{ label: 'Kolor ramki', value: '' }]
  },
  {
    id: 'r2',
    name: 'Rolety — wersja z napędem',
    departments: ['rolety'] as const,
    rows: [{ label: 'Silnik', value: '' }]
  },
  { id: 'all', name: 'Na wszystko', departments: [] as never[], rows: [{ label: 'Uwagi', value: '' }] }
].map((z) => ({ ...z, departments: [...z.departments] as never }));

const ust = { specPresets: ZESTAWY as never };

test('zestaw dobiera się do kategorii produktu', () => {
  expect(domyslnaSpec(poz('Roleta kasetowa UNI'), ust)[0].label).toBe('Kolor kasety');
  expect(domyslnaSpec(poz('Moskitiera ramkowa'), ust)[0].label).toBe('Kolor ramki');
});

test('kilka zestawów w tej samej kategorii — pierwszy wchodzi sam, reszta czeka', () => {
  const pasujace = zestawyDla(poz('Roleta kasetowa UNI'), ust);
  expect(pasujace.map((z) => z.id)).toEqual(['r', 'r2']);
  expect(domyslnaSpec(poz('Roleta kasetowa UNI'), ust)[0].label).toBe('Kolor kasety');
});

test('zestaw bez kategorii wchodzi dopiero, gdy nic lepszego nie pasuje', () => {
  expect(zestawyDla(poz('Markiza tarasowa'), ust).map((z) => z.id)).toEqual(['all']);
  expect(zestawyDla(poz('Roleta'), ust).some((z) => z.id === 'all')).toBe(false);
});

test('zestaw bez wierszy nie liczy się jako pasujący', () => {
  const puste = { specPresets: [{ id: 'x', name: 'Puste', departments: ['rolety'], rows: [] }] as never };
  expect(zestawyDla(poz('Roleta'), puste)).toEqual([]);
  expect(domyslnaSpec(poz('Roleta'), puste)).toEqual([]);
});

test('stara płaska lista zamienia się w zestaw na wszystko', () => {
  const stare = { defaultSpec: [{ label: 'Materiał', value: '' }] };
  expect(zestawy(stare)).toEqual([
    { id: 'domyslna', name: 'Domyślna', departments: [], rows: [{ label: 'Materiał', value: '' }] }
  ]);
  expect(domyslnaSpec(poz('Cokolwiek'), stare)[0].label).toBe('Materiał');
});

test('gdy są zestawy, stara lista już nie przeszkadza', () => {
  const oba = { specPresets: ZESTAWY as never, defaultSpec: [{ label: 'Stare', value: '' }] };
  expect(domyslnaSpec(poz('Roleta'), oba)[0].label).toBe('Kolor kasety');
});

test('zlecenie bierze zestaw kategorii, gdy produkt nie ma własnego szablonu', () => {
  expect(autoSpecFor(poz('Roleta wolnowisząca Mini 19'), { specTemplates: [], ...ust })?.[0].label).toBe(
    'Kolor kasety'
  );
});

// --- podmiana zestawu zapasowego ---

test('zestaw zapasowy ustępuje, gdy nazwa produktu wskaże kategorię', () => {
  const zapasowy = domyslnaSpec(poz(''), ust);
  expect(zapasowy[0].label).toBe('Uwagi');
  const pozycja = { name: 'Roleta kasetowa UNI', material: '', spec: zapasowy };
  expect(autoSpecFor(pozycja, { specTemplates: [], ...ust })?.[0].label).toBe('Kolor kasety');
});

test('to, co człowiek wpisał, zostaje nietknięte', () => {
  const swoje = [{ label: 'Uwagi', value: 'pilne' }];
  expect(autoSpecFor({ name: 'Roleta', material: '', spec: swoje }, { specTemplates: [], ...ust })).toBeNull();
});

test('własne puste wiersze też zostają — nie zgadzają się z żadnym zestawem', () => {
  const swoje = [{ label: 'Coś mojego', value: '' }];
  expect(nietkniete(swoje, ust)).toBe(false);
});

test('pusta specyfikacja jest nietknięta', () => {
  expect(nietkniete(undefined, ust)).toBe(true);
  expect(nietkniete([], ust)).toBe(true);
});

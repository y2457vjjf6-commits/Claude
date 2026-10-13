import { autoSpecFor, matchSpecTemplate, uzyteczneWiersze } from './specTemplates';
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

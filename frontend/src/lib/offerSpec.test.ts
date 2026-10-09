import { buildOfferHtml } from './printingOffer';
import { filledSpec, wierszyOdmiana } from './offers';
import { DEFAULT_STATE } from './storage';
import { Offer, OfferGroup, OfferItem } from '../types';

const SPEC = [
  { label: 'Kolor kasety', value: 'RAL 9005' },
  { label: 'Strona sterowania', value: 'Lewa — od wewnątrz' }
];

const poz = (p: Partial<OfferItem> = {}): OfferItem => ({
  name: 'Roleta kasetowa UNI', material: '', qty: '2', unitPrice: '1000', ...p
});
const grupa = (items: OfferItem[]): OfferGroup => ({ id: 'g1', header: 'material', items });
const oferta = (patch: Partial<Offer> = {}): Offer =>
  ({
    id: 'o1', date: '2026-09-25', place: 'Łomianki', client: 'Akacjowa 12', clientEmail: '',
    groups: [grupa([poz({ spec: SPEC })])], continuousNumbering: true, discountEnabled: false,
    discountPercent: '', deliveryEnabled: false, deliveryPrice: '', installationIncluded: true,
    deadlineDays: '14', validityEnabled: false, validityDays: '30', notes: '',
    issuedBy: 'Sebastian Wajcht', status: 'szkic', createdAt: '', updatedAt: '', ...patch
  } as Offer);

test('specyfikacja trafia pod pozycję, gdy jest włączona', () => {
  const html = buildOfferHtml(oferta({ showSpecs: true }), DEFAULT_STATE.settings);
  expect(html).toContain('of-spec');
  expect(html).toContain('Kolor kasety');
  expect(html).toContain('RAL 9005');
  expect(html).toContain('Strona sterowania');
});

test('wyłączony przełącznik zostawia dokument bez specyfikacji', () => {
  const html = buildOfferHtml(oferta({ showSpecs: false }), DEFAULT_STATE.settings);
  expect(html).not.toContain('of-spec');
  expect(html).not.toContain('RAL 9005');
});

test('oferta sprzed tej zmiany nie ma pola i drukuje się jak dotąd', () => {
  expect(buildOfferHtml(oferta(), DEFAULT_STATE.settings)).not.toContain('of-spec');
});

test('puste wiersze specyfikacji nie trafiają na dokument', () => {
  const html = buildOfferHtml(
    oferta({ showSpecs: true, groups: [grupa([poz({ spec: [{ label: '  ', value: '' }] })])] }),
    DEFAULT_STATE.settings
  );
  expect(html).not.toContain('of-spec');
});

test('specyfikacja opisuje swoją pozycję, a nie sąsiednią', () => {
  const html = buildOfferHtml(
    oferta({
      showSpecs: true,
      groups: [grupa([poz({ name: 'Pierwsza', spec: SPEC }), poz({ name: 'Druga' })])]
    }),
    DEFAULT_STATE.settings
  );
  // tylko jedna pozycja ma specyfikację, więc blok ma być jeden
  expect(html.match(/class="of-spec"/g)).toHaveLength(1);
  expect(html.indexOf('RAL 9005')).toBeLessThan(html.indexOf('Druga'));
});

// --- kopiowanie specyfikacji: wspólne pomocniki edytora i wydruku ---

test('filledSpec wyrzuca puste wiersze i obcina spacje', () => {
  expect(
    filledSpec([
      { label: '  Kolor kasety ', value: ' RAL 9005' },
      { label: '   ', value: '' },
      { label: '', value: 'bez nazwy' },
      { label: 'bez wartości', value: '   ' }
    ])
  ).toEqual([
    { label: 'Kolor kasety', value: 'RAL 9005' },
    { label: '', value: 'bez nazwy' },
    { label: 'bez wartości', value: '' }
  ]);
});

test('filledSpec znosi brak pola', () => {
  expect(filledSpec(undefined)).toEqual([]);
  expect(filledSpec([])).toEqual([]);
});

test('filledSpec zwraca nowe obiekty, więc kopia nie trzyma się źródła', () => {
  const zrodlo = [{ label: 'Kolor', value: 'Biały' }];
  const kopia = filledSpec(zrodlo);
  kopia[0].value = 'Antracyt';
  expect(zrodlo[0].value).toBe('Biały');
});

test('odmiana wierszy po polsku', () => {
  const dla = (n: number) => wierszyOdmiana(n);
  expect(dla(1)).toBe('1 wiersz');
  expect([dla(2), dla(3), dla(4)]).toEqual(['2 wiersze', '3 wiersze', '4 wiersze']);
  expect([dla(5), dla(11), dla(21)]).toEqual(['5 wierszy', '11 wierszy', '21 wierszy']);
  // nastki idą z dopełniaczem mimo końcówki 2–4
  expect([dla(12), dla(13), dla(14)]).toEqual(['12 wierszy', '13 wierszy', '14 wierszy']);
  expect([dla(22), dla(102)]).toEqual(['22 wiersze', '102 wiersze']);
  expect(dla(0)).toBe('0 wierszy');
});

test('wydruk pomija puste wiersze tak samo jak schowek', () => {
  const html = buildOfferHtml(
    oferta({
      showSpecs: true,
      groups: [grupa([poz({ spec: [{ label: 'Kolor', value: 'Biały' }, { label: ' ', value: '' }] })])]
    }),
    DEFAULT_STATE.settings
  );
  expect(html.match(/of-spec-label/g)).toHaveLength(1);
});

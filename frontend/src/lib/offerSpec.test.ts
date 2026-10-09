import { buildOfferHtml } from './printingOffer';
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

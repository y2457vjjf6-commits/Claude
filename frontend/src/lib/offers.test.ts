import {
  formatMoney,
  groupLpNumbers,
  itemTotal,
  offerFileName,
  offerTotals,
  parseNumber,
  validUntil
} from './offers';
import { Offer, OfferGroup, OfferItem } from '../types';

const poz = (name: string, qty: string, unitPrice: string, extra: Partial<OfferItem> = {}): OfferItem => ({
  name,
  material: '',
  qty,
  unitPrice,
  ...extra
});

const grupa = (items: OfferItem[]): OfferGroup => ({ id: 'g' + Math.random(), header: 'material', items });

const oferta = (patch: Partial<Offer> = {}): Offer =>
  ({
    id: 'o1',
    date: '2026-09-25',
    place: 'Łomianki',
    client: 'Akacjowa 12 Koczargi Stare',
    clientEmail: '',
    groups: [grupa([poz('Rolety wolnowiszące FI32', '5', '980'), poz('Rolety wolnowiszące FI32', '1', '950')])],
    continuousNumbering: true,
    discountEnabled: false,
    discountPercent: '',
    deliveryEnabled: false,
    deliveryPrice: '',
    installationIncluded: true,
    deadlineDays: '14',
    validityEnabled: false,
    validityDays: '30',
    notes: '',
    issuedBy: 'Sebastian Wajcht',
    status: 'szkic',
    createdAt: '',
    updatedAt: '',
    ...patch
  } as Offer);

test('kwoty czytane po polsku, z przecinkiem i spacjami', () => {
  expect(parseNumber('3480,00')).toBe(3480);
  expect(parseNumber('1 250,50')).toBe(1250.5);
  expect(parseNumber('')).toBe(0);
  expect(parseNumber('brak')).toBe(0);
});

test('kwota pozycji: ilość razy cena, z możliwością nadpisania', () => {
  expect(itemTotal(poz('x', '6', '580'))).toBe(3480);
  expect(itemTotal(poz('x', '6', '580', { totalOverride: '3000' }))).toBe(3000);
  expect(itemTotal(poz('x', '6', '580', { totalOverride: '  ' }))).toBe(3480);
});

test('suma oferty zgodna z przykładem Akacjowa (4900 + 950 = 5850)', () => {
  const t = offerTotals(oferta());
  expect(t.itemsSum).toBe(5850);
  expect(t.total).toBe(5850);
  expect(formatMoney(t.total)).toBe('5850,00 zł');
});

test('rabat procentowy pomniejsza cenę całkowitą', () => {
  const t = offerTotals(oferta({ discountEnabled: true, discountPercent: '10' }));
  expect(t.discountAmount).toBe(585);
  expect(t.total).toBe(5265);
});

test('wyłączony rabat nie zmienia sumy', () => {
  const t = offerTotals(oferta({ discountEnabled: false, discountPercent: '10' }));
  expect(t.discountAmount).toBe(0);
  expect(t.total).toBe(5850);
});

test('dostawa liczona osobno i tylko gdy włączona', () => {
  expect(offerTotals(oferta({ deliveryEnabled: true, deliveryPrice: '108,33' })).deliveryAmount).toBe(108.33);
  expect(offerTotals(oferta({ deliveryEnabled: false, deliveryPrice: '108,33' })).deliveryAmount).toBe(0);
  // puste pole kwoty: brak dostawy do policzenia, na dokumencie „nie dotyczy”
  expect(offerTotals(oferta({ deliveryEnabled: true, deliveryPrice: '' })).deliveryAmount).toBe(0);
  // dostawa nie wchodzi do ceny całkowitej
  expect(offerTotals(oferta({ deliveryEnabled: true, deliveryPrice: '108,33' })).total).toBe(5850);
});

test('numeracja ciągła biegnie przez wszystkie tabele', () => {
  const grupy = [grupa([poz('a', '1', '1'), poz('b', '1', '1'), poz('c', '1', '1')]), grupa([poz('d', '1', '1')])];
  expect(groupLpNumbers(grupy, true)).toEqual([['1', '2', '3'], ['4']]);
});

test('numeracja osobna zaczyna każdą tabelę od 1', () => {
  const grupy = [grupa([poz('a', '1', '1'), poz('b', '1', '1')]), grupa([poz('c', '1', '1'), poz('d', '1', '1')])];
  expect(groupLpNumbers(grupy, false)).toEqual([
    ['1', '2'],
    ['1', '2']
  ]);
});

test('własny numer Lp. ma pierwszeństwo', () => {
  const grupy = [grupa([poz('a', '1', '1', { lpOverride: '7a' }), poz('b', '1', '1')])];
  expect(groupLpNumbers(grupy, true)).toEqual([['7a', '2']]);
});

test('nazwa pliku w formacie stosowanym przez firmę', () => {
  expect(offerFileName(oferta())).toBe('Oferta_cenowa_25.09.2026_Akacjowa_12_Koczargi_Stare.pdf');
  expect(offerFileName(oferta({ client: 'Toyota Mościska 1' }))).toBe('Oferta_cenowa_25.09.2026_Toyota_Mościska_1.pdf');
});

test('ważność oferty liczona od daty wystawienia', () => {
  expect(validUntil(oferta({ validityEnabled: true, validityDays: '30' }))).toBe('25.10.2026');
  expect(validUntil(oferta({ validityEnabled: false, validityDays: '30' }))).toBe('');
});

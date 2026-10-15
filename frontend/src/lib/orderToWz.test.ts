import { wzPrefillFromOrder } from './offerToWz';
import { Contractor, ProductionOrder } from '../types';

const poz = (name: string, qty = '1', material = '') => ({
  id: name, name, material, qty, stageId: 'gotowe'
});

const zlecenie = (items: ProductionOrder['items'], p: Partial<ProductionOrder> = {}): ProductionOrder => ({
  id: 'z1',
  number: 'ZL-10-0001-2026',
  date: '2026-10-14',
  client: 'Jan Nowak',
  clientAddress: 'ul. Akacjowa 12',
  items,
  createdAt: '',
  updatedAt: '',
  ...p
});

const KONTRAHENCI: Contractor[] = [
  { id: 'k1', name: 'Jan Nowak', address: 'ul. Inna 1', nip: '123', email: 'jan@example.com', code: 'JN' } as Contractor
];

test('pozycje zlecenia trafiają na WZ', () => {
  const w = wzPrefillFromOrder(zlecenie([poz('Roleta UNI', '2', 'Grupa E')]), []);
  expect(w.items).toEqual([{ name: 'Roleta UNI (Grupa E)', unit: 'szt.', qty: '2', order: '' }]);
});

test('sztuki rozbite w warsztacie wracają na WZ jako jedna pozycja', () => {
  const w = wzPrefillFromOrder(
    zlecenie([
      poz('Roleta UNI — szt. 1 z 3'),
      poz('Roleta UNI — szt. 2 z 3'),
      poz('Roleta UNI — szt. 3 z 3')
    ]),
    []
  );
  expect(w.items).toHaveLength(1);
  expect(w.items[0]).toMatchObject({ name: 'Roleta UNI', qty: '3' });
});

test('różne produkty zostają osobno', () => {
  const w = wzPrefillFromOrder(zlecenie([poz('Roleta', '2'), poz('Żaluzja', '1')]), []);
  expect(w.items.map((i) => `${i.name}:${i.qty}`)).toEqual(['Roleta:2', 'Żaluzja:1']);
});

test('klient z kartoteki dociąga adres i NIP', () => {
  const w = wzPrefillFromOrder(zlecenie([poz('Roleta')]), KONTRAHENCI);
  expect(w.contractorId).toBe('k1');
  expect(w.contractor.nip).toBe('123');
  expect(w.contractor.code).toBe('JN');
});

test('klient spoza kartoteki bierze adres ze zlecenia', () => {
  const w = wzPrefillFromOrder(zlecenie([poz('Roleta')]), []);
  expect(w.contractorId).toBeNull();
  expect(w.contractor.name).toBe('Jan Nowak');
  expect(w.contractor.address).toBe('ul. Akacjowa 12');
});

test('uwagi mówią, z czego powstała ta WZ', () => {
  expect(wzPrefillFromOrder(zlecenie([poz('Roleta')], { ownNumber: 'ZAM/2026/44' }), []).notes).toBe(
    'Na podstawie zlecenia ZL-10-0001-2026 · ZAM/2026/44.'
  );
  expect(wzPrefillFromOrder(zlecenie([poz('Roleta')], { number: undefined }), []).notes).toBe(
    'Na podstawie zlecenia produkcyjnego.'
  );
});

test('puste pozycje nie trafiają na dokument', () => {
  expect(wzPrefillFromOrder(zlecenie([poz(''), poz('Roleta')]), []).items).toHaveLength(1);
});

test('zlecenie z oferty niesie ją dalej, żeby dało się wrócić do wyceny', () => {
  expect(wzPrefillFromOrder(zlecenie([poz('Roleta')], { sourceOfferId: 'of9' }), []).sourceOfferId).toBe('of9');
});

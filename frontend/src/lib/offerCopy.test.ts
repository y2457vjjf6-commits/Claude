import { duplicateOffer } from './offerCopy';
import { Offer } from '../types';

const ZRODLO: Offer = {
  id: 'o1',
  number: 'OF-10-0147-2026',
  seq: 147,
  date: '2026-10-07',
  place: 'Łomianki',
  client: 'Jan Nowak',
  clientEmail: 'jan@example.com',
  clientAddress: 'ul. Akacjowa 12',
  clientNip: '118-20-55-301',
  groups: [
    {
      id: 'g1',
      header: 'materialSize',
      title: 'Salon',
      items: [
        {
          name: 'Roleta kasetowa UNI',
          material: 'Grupa E · 180 × 250 cm',
          qty: '2',
          unitPrice: '1143,00',
          spec: [{ label: 'Kolor kasety', value: 'Antracyt' }]
        }
      ]
    }
  ],
  continuousNumbering: true,
  discountEnabled: true,
  discountPercent: '7,5',
  deliveryEnabled: false,
  deliveryPrice: '',
  installationIncluded: true,
  deadlineDays: '35',
  validityEnabled: true,
  validityDays: '14',
  notes: 'Montaż po pracach wykończeniowych.',
  issuedBy: 'Sebastian Wajcht',
  issuedByPhone: '511 697 697',
  status: 'wyslana',
  vatBreakdown: true,
  vatRate: 8,
  showPhotos: true,
  showSpecs: true,
  wzDocumentIds: ['wz1'],
  printedAt: '2026-10-07T10:00:00.000Z',
  emailedAt: '2026-10-07T10:05:00.000Z',
  emailedTo: 'jan@example.com',
  createdAt: '2026-10-07T09:00:00.000Z',
  updatedAt: '2026-10-07T10:05:00.000Z'
};

test('kopia nie dziedziczy numeru ani tożsamości dokumentu', () => {
  const k = duplicateOffer(ZRODLO, '2026-10-13');
  expect(k.id).toBe('');
  expect(k.number).toBeUndefined();
  expect(k.seq).toBeUndefined();
  expect(k.createdAt).toBe('');
  expect(k.updatedAt).toBe('');
});

test('kopia zaczyna jako szkic, bez śladów obiegu tamtej oferty', () => {
  const k = duplicateOffer(ZRODLO, '2026-10-13');
  expect(k.status).toBe('szkic');
  expect(k.printedAt).toBeUndefined();
  expect(k.emailedAt).toBeUndefined();
  expect(k.emailedTo).toBeUndefined();
  expect(k.wzDocumentIds).toBeUndefined();
});

test('wszystko, co stanowi treść oferty, zostaje', () => {
  const k = duplicateOffer(ZRODLO, '2026-10-13');
  expect(k.client).toBe('Jan Nowak');
  expect(k.clientAddress).toBe('ul. Akacjowa 12');
  expect(k.clientNip).toBe('118-20-55-301');
  expect(k.discountPercent).toBe('7,5');
  expect(k.deadlineDays).toBe('35');
  expect(k.notes).toBe('Montaż po pracach wykończeniowych.');
  expect(k.issuedBy).toBe('Sebastian Wajcht');
  expect(k.vatRate).toBe(8);
  expect(k.showSpecs).toBe(true);
  expect(k.groups[0].items[0].spec).toEqual([{ label: 'Kolor kasety', value: 'Antracyt' }]);
});

test('kopia dostaje datę wystawienia, a nie datę źródła', () => {
  expect(duplicateOffer(ZRODLO, '2026-10-13').date).toBe('2026-10-13');
});

test('oferta źródłowa zostaje nietknięta', () => {
  const przed = JSON.stringify(ZRODLO);
  const k = duplicateOffer(ZRODLO, '2026-10-13');
  k.client = 'ktoś inny';
  k.groups[0].items[0].spec![0].value = 'Biały';
  k.groups[0].items.push({ name: 'Dodana', material: '', qty: '1', unitPrice: '' });
  expect(JSON.stringify(ZRODLO)).toBe(przed);
});

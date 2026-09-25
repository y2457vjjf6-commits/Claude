import { wzPrefillFromOffer } from './offerToWz';
import { Contractor, Offer, OfferGroup, OfferItem } from '../types';

const poz = (name: string, material: string, qty: string): OfferItem => ({
  name,
  material,
  qty,
  unitPrice: '100'
});

const grupa = (id: string, items: OfferItem[], patch: Partial<OfferGroup> = {}): OfferGroup => ({
  id,
  header: 'material',
  items,
  ...patch
});

const oferta = (patch: Partial<Offer> = {}): Offer =>
  ({
    id: 'of-1',
    date: '2026-09-25',
    place: 'Łomianki',
    client: 'Rolety Siejka',
    clientEmail: 'biuro@siejka.pl',
    groups: [
      grupa('g1', [poz('Rolety wolnowiszące FI32', 'Materiał C102', '5'), poz('Karnisz', '', '2')])
    ],
    continuousNumbering: true,
    discountEnabled: false,
    discountPercent: '',
    deliveryEnabled: false,
    deliveryPrice: '',
    deliveryNotApplicable: false,
    installationIncluded: true,
    deadlineDays: '14',
    deadlineBasis: 'akceptacji',
    validityEnabled: false,
    validityDays: '30',
    notes: '',
    issuedBy: 'Sebastian Wajcht',
    legalClause: true,
    status: 'zaakceptowana',
    createdAt: '',
    updatedAt: '',
    ...patch
  } as Offer);

test('pozycje oferty przechodzą na WZ razem z materiałem i ilością', () => {
  const p = wzPrefillFromOffer(oferta(), []);
  expect(p.items).toEqual([
    { name: 'Rolety wolnowiszące FI32 (Materiał C102)', unit: 'szt.', qty: '5', order: '' },
    { name: 'Karnisz', unit: 'szt.', qty: '2', order: '' }
  ]);
  expect(p.sourceOfferId).toBe('of-1');
  expect(p.notes).toBe('Na podstawie oferty cenowej z dnia 25.09.2026.');
});

test('odbiorca brany z bazy kontrahentów, gdy nazwa się zgadza', () => {
  const kontrahenci: Contractor[] = [
    { id: 'k1', name: 'rolety siejka', nip: '123', address: 'ul. Leśna 1', email: 'k@siejka.pl', code: 'RS' }
  ];
  const p = wzPrefillFromOffer(oferta(), kontrahenci);
  expect(p.contractorId).toBe('k1');
  expect(p.contractor.nip).toBe('123');
  expect(p.contractor.code).toBe('RS');
});

test('bez kontrahenta w bazie zostaje nazwa i e-mail z oferty', () => {
  const p = wzPrefillFromOffer(oferta(), []);
  expect(p.contractorId).toBeNull();
  expect(p.contractor.name).toBe('Rolety Siejka');
  expect(p.contractor.email).toBe('biuro@siejka.pl');
});

test('warianty alternatywne nie przechodzą automatycznie i są zgłaszane', () => {
  const z = oferta({
    groups: [
      grupa('g1', [poz('Roleta', '', '1')]),
      grupa('w1', [poz('Roleta zaciemniająca', '', '1')], { variant: true })
    ]
  });
  const p = wzPrefillFromOffer(z, []);
  expect(p.items.map((i) => i.name)).toEqual(['Roleta']);
  expect(p.hadVariants).toBe(true);
});

test('puste pozycje są pomijane', () => {
  const z = oferta({ groups: [grupa('g1', [poz('', '', ''), poz('Roleta', '', '1')])] });
  expect(wzPrefillFromOffer(z, []).items).toHaveLength(1);
});

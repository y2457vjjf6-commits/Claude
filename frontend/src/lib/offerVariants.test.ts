import { groupLabel, groupLpNumbers, offerCosts, offersAwaitingReply, offerTotals } from './offers';
import { buildOfferHtml } from './printingOffer';
import { DEFAULT_STATE } from './storage';
import { Offer, OfferGroup, OfferItem } from '../types';

const poz = (name: string, qty: string, unitPrice: string, extra: Partial<OfferItem> = {}): OfferItem => ({
  name,
  material: '',
  qty,
  unitPrice,
  ...extra
});

const grupa = (id: string, items: OfferItem[], patch: Partial<OfferGroup> = {}): OfferGroup => ({
  id,
  header: 'material',
  items,
  ...patch
});

const oferta = (patch: Partial<Offer> = {}): Offer =>
  ({
    id: 'o1',
    date: '2026-09-25',
    place: 'Łomianki',
    client: 'Akacjowa 12',
    clientEmail: '',
    groups: [grupa('g1', [poz('Roleta', '2', '1000')])],
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
    status: 'szkic',
    createdAt: '',
    updatedAt: '',
    ...patch
  } as Offer);

const zWariantem = (patch: Partial<Offer> = {}) =>
  oferta({
    groups: [
      grupa('g1', [poz('Roleta', '2', '1000')]),
      grupa('w1', [poz('Roleta zaciemniająca', '2', '1300')], { variant: true })
    ],
    ...patch
  });

test('wariant alternatywny nie wchodzi do ceny całkowitej', () => {
  const t = offerTotals(zWariantem());
  expect(t.itemsSum).toBe(2000);
  expect(t.total).toBe(2000);
  expect(t.variants).toEqual([{ id: 'w1', label: 'Wariant A', total: 2600 }]);
});

test('rabat obejmuje także wariant', () => {
  const t = offerTotals(zWariantem({ discountEnabled: true, discountPercent: '10' }));
  expect(t.total).toBe(1800);
  expect(t.variants[0].total).toBe(2340);
});

test('warianty dostają kolejne litery, własny podpis ma pierwszeństwo', () => {
  const grupy = [
    grupa('g1', []),
    grupa('w1', [], { variant: true }),
    grupa('w2', [], { variant: true }),
    grupa('w3', [], { variant: true, title: 'Wariant premium' })
  ];
  expect(groupLabel(grupy, 0)).toBe('');
  expect(groupLabel(grupy, 1)).toBe('Wariant A');
  expect(groupLabel(grupy, 2)).toBe('Wariant B');
  expect(groupLabel(grupy, 3)).toBe('Wariant premium');
});

test('wariant numeruje pozycje od 1 i nie psuje numeracji ciągłej', () => {
  const grupy = [
    grupa('g1', [poz('a', '1', '1'), poz('b', '1', '1')]),
    grupa('w1', [poz('c', '1', '1'), poz('d', '1', '1')], { variant: true }),
    grupa('g2', [poz('e', '1', '1')])
  ];
  expect(groupLpNumbers(grupy, true)).toEqual([['1', '2'], ['1', '2'], ['3']]);
});

test('na dokumencie wariant ma własną wycenę, a cena całkowita dotyczy pozycji podstawowych', () => {
  const html = buildOfferHtml(zWariantem(), DEFAULT_STATE.settings);
  expect(html).toContain('Wariant A');
  expect(html).toContain('Cena dla tego wariantu: 2600,00 zł');
  // przy wariantach nazwa ceny mówi wprost, czego dotyczy
  expect(html).toContain('Cena całkowita oferty podstawowej: 2000,00 zł');
});

test('oferta złożona tylko z wariantów nie pokazuje ceny całkowitej', () => {
  const tylkoWarianty = oferta({
    groups: [
      grupa('w1', [poz('Roleta A', '1', '1000')], { variant: true }),
      grupa('w2', [poz('Roleta B', '1', '1200')], { variant: true })
    ]
  });
  const html = buildOfferHtml(tylkoWarianty, DEFAULT_STATE.settings);
  expect(html).not.toContain('Cena całkowita');
  expect(html).toContain('Cena dla tego wariantu: 1000,00 zł');
  expect(html).toContain('Cena dla tego wariantu: 1200,00 zł');
});

/* ---------------- Koszt własny i marża ---------------- */

test('marża liczona od ceny całkowitej, koszt tylko z pozycji podstawowych', () => {
  const z = zWariantem({
    groups: [
      grupa('g1', [poz('Roleta', '2', '1000', { cost: '600' })]),
      grupa('w1', [poz('Roleta zaciemniająca', '2', '1300', { cost: '900' })], { variant: true })
    ]
  });
  const k = offerCosts(z);
  expect(k.hasCosts).toBe(true);
  expect(k.costSum).toBe(1200);
  expect(k.margin).toBe(800);
  expect(Math.round(k.marginPercent)).toBe(40);
});

test('bez wpisanych kosztów marża jest oznaczona jako nieznana', () => {
  expect(offerCosts(oferta()).hasCosts).toBe(false);
});

test('koszt własny nie trafia na dokument dla klienta', () => {
  const z = oferta({ groups: [grupa('g1', [poz('Roleta', '2', '1000', { cost: '613,17' })])] });
  const html = buildOfferHtml(z, DEFAULT_STATE.settings);
  expect(html).not.toContain('613');
  expect(html).not.toMatch(/koszt/i);
  expect(html).not.toMatch(/marż/i);
});

/* ---------------- Przypomnienia o ofertach ---------------- */

const teraz = new Date('2026-09-25T10:00:00Z');

test('przypomnienie po ustalonej liczbie dni od wysyłki', () => {
  const stara = oferta({ id: 'a', status: 'wyslana', emailedAt: '2026-09-10T09:00:00Z' });
  const swieza = oferta({ id: 'b', status: 'wyslana', emailedAt: '2026-09-23T09:00:00Z' });
  const lista = offersAwaitingReply([swieza, stara], 7, teraz);
  expect(lista.map((x) => x.offer.id)).toEqual(['a']);
  expect(lista[0].days).toBe(15);
});

test('szkice oraz oferty z decyzją nie przypominają o sobie', () => {
  const szkic = oferta({ id: 'a', status: 'szkic', emailedAt: '2026-08-01T09:00:00Z' });
  const przyjeta = oferta({ id: 'b', status: 'zaakceptowana', emailedAt: '2026-08-01T09:00:00Z' });
  const odrzucona = oferta({ id: 'c', status: 'odrzucona', emailedAt: '2026-08-01T09:00:00Z' });
  expect(offersAwaitingReply([szkic, przyjeta, odrzucona], 7, teraz)).toEqual([]);
});

test('bez daty wysyłki liczy się data wystawienia; zero dni wyłącza przypomnienia', () => {
  const bezMaila = oferta({ id: 'a', status: 'wyslana', date: '2026-09-01' });
  expect(offersAwaitingReply([bezMaila], 7, teraz)[0].days).toBe(23);
  expect(offersAwaitingReply([bezMaila], 0, teraz)).toEqual([]);
});

test('najdłużej czekające oferty są pierwsze', () => {
  const a = oferta({ id: 'a', status: 'wyslana', emailedAt: '2026-09-15T09:00:00Z' });
  const b = oferta({ id: 'b', status: 'wyslana', emailedAt: '2026-09-01T09:00:00Z' });
  expect(offersAwaitingReply([a, b], 7, teraz).map((x) => x.offer.id)).toEqual(['b', 'a']);
});

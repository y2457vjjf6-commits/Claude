import { groupLabel, groupLpNumbers, issuerPhone, offerCosts, offersAwaitingReply, offerTotals } from './offers';
import { buildOfferEmail } from './offerActions';
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
  expect(html).toContain('Warianty do wyboru');
  expect(html).toContain('nie sumuje się z ceną całkowitą');
  expect(html).toContain('2600,00 zł');
  // przy wariantach nazwa ceny mówi wprost, czego dotyczy
  expect(html).toContain('Cena całkowita oferty podstawowej');
  expect(html).toContain('2000,00 zł');
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
  expect(html).toContain('1000,00 zł');
  expect(html).toContain('1200,00 zł');
  // oba warianty w jednym bloku „do wyboru”, każdy z własną kwotą
  expect(html.match(/Warianty do wyboru/g)).toHaveLength(1);
  expect(html.match(/of-room-sum/g)).toHaveLength(2);
});

/* ---------------- Warunki na dokumencie ---------------- */

test('termin realizacji zawsze liczony od akceptacji zamówienia', () => {
  const html = buildOfferHtml(oferta({ deadlineDays: '21' }), DEFAULT_STATE.settings);
  expect(html).toContain('do 21 dni roboczych od akceptacji zamówienia');
});

test('bez wpisanej liczby dni wiersz o terminie znika', () => {
  const html = buildOfferHtml(oferta({ deadlineDays: '  ' }), DEFAULT_STATE.settings);
  expect(html).not.toContain('Termin realizacji');
});

test('dostawa bez kwoty drukuje się jako „nie dotyczy”', () => {
  const zKwota = buildOfferHtml(oferta({ deliveryEnabled: true, deliveryPrice: '108,33' }), DEFAULT_STATE.settings);
  const bezKwoty = buildOfferHtml(oferta({ deliveryEnabled: true, deliveryPrice: '' }), DEFAULT_STATE.settings);
  const wylaczona = buildOfferHtml(oferta({ deliveryEnabled: false }), DEFAULT_STATE.settings);
  expect(zKwota).toContain('108,33 zł');
  expect(bezKwoty).toContain('nie dotyczy');
  expect(wylaczona).not.toContain('Dostawa');
});

/* ---------------- Uwagi końcowe pod ofertą ---------------- */

test('uwagi końcowe z ustawień trafiają na każdą ofertę', () => {
  const html = buildOfferHtml(oferta(), DEFAULT_STATE.settings);
  expect(html).toContain('Wycena została sporządzona na podstawie dokonanych pomiarów.');
  expect(html).toContain('24 miesięcy gwarancji');
  // wiersz z kropką składa się jak punkt listy, zwykły wiersz jak akapit
  expect(html).toContain('<div class="of-closing-para">Wycena została sporządzona na podstawie dokonanych pomiarów.</div>');
  expect(html).toContain('<div class="of-closing-bullet">• Zamówienie');
});

test('puste uwagi w ustawieniach nie drukują pustej sekcji', () => {
  const html = buildOfferHtml(oferta(), { ...DEFAULT_STATE.settings, offerClosingText: '   ' });
  expect(html).not.toContain('of-closing');
});

test('klauzula o art. 66 § 1 nie pojawia się na dokumencie', () => {
  const html = buildOfferHtml(oferta(), DEFAULT_STATE.settings);
  expect(html).not.toContain('art. 66');
  expect(html).not.toContain('nie stanowi oferty handlowej');
});

/* ---------------- Pagina, kwota u góry, ramka do sprawdzenia ---------------- */

test('dokument deklaruje opis żywej paginy: numer i data', () => {
  const html = buildOfferHtml(oferta({ number: 'OF-10-0147-2026' }), DEFAULT_STATE.settings);
  expect(html).toContain('data-pagina="Oferta OF-10-0147-2026  ·  25.09.2026"');
});

test('bez numeru w paginie zostaje sama data', () => {
  const html = buildOfferHtml(oferta(), DEFAULT_STATE.settings);
  expect(html).toContain('data-pagina="25.09.2026"');
});

test('kwota pojawia się też w nagłówku, nad pozycjami', () => {
  const html = buildOfferHtml(
    oferta({ groups: [grupa('g1', [poz('Roleta', '2', '500')])] }),
    DEFAULT_STATE.settings
  );
  expect(html).toContain('Wartość oferty');
  // nagłówkowa kwota stoi przed tabelą pozycji, a duża — po niej
  expect(html.indexOf('of-value-sum')).toBeLessThan(html.indexOf('of-items'));
  expect(html.indexOf('of-grand-value')).toBeGreaterThan(html.indexOf('of-items'));
});

test('przy wariantach nagłówek mówi, że kwota dotyczy oferty podstawowej', () => {
  const html = buildOfferHtml(zWariantem(), DEFAULT_STATE.settings);
  expect(html).toContain('Oferta podstawowa');
});

test('ramka do sprawdzenia drukuje się z ustawień, puste pole ją wyłącza', () => {
  const z = buildOfferHtml(oferta(), DEFAULT_STATE.settings);
  const bez = buildOfferHtml(oferta(), { ...DEFAULT_STATE.settings, offerCheckText: '   ' });
  expect(z).toContain('of-check');
  expect(z).toContain('Akceptacja oferty oznacza potwierdzenie tych danych');
  // ramka stoi nad podpisem, nie pod nim
  expect(z.indexOf('of-check')).toBeLessThan(z.indexOf('of-sign'));
  expect(bez).not.toContain('of-check');
});

/* ---------------- Telefon osoby wystawiającej ---------------- */

const stanZOsobami = (patch: Record<string, unknown> = {}) => ({
  settings: { ...DEFAULT_STATE.settings, issuerPhones: { 'Sebastian Wajcht': '511 697 697' } },
  contractors: [
    { name: 'ZPHU Lechrol Jacek Wajcht', employees: [{ name: 'Jacek Wajcht', phone: '600 100 200' }] },
    { name: 'Inna firma', employees: [{ name: 'Obcy Ktoś', phone: '700 700 700' }] }
  ],
  ...patch
});

test('numer bierze się najpierw z przypisania w Ustawieniach', () => {
  expect(issuerPhone(stanZOsobami() as never, 'Sebastian Wajcht')).toBe('511 697 697');
});

test('gdy brak przypisania, numer bierze się z kartoteki pracownika Lechrola', () => {
  expect(issuerPhone(stanZOsobami() as never, 'Jacek Wajcht')).toBe('600 100 200');
});

test('pracownik obcej firmy nie podstawia swojego numeru', () => {
  expect(issuerPhone(stanZOsobami() as never, 'Obcy Ktoś')).toBe('');
});

test('przypisanie w Ustawieniach wygrywa z kartoteką pracownika', () => {
  const stan = stanZOsobami({
    settings: { ...DEFAULT_STATE.settings, issuerPhones: { 'Jacek Wajcht': '999 888 777' } }
  });
  expect(issuerPhone(stan as never, 'Jacek Wajcht')).toBe('999 888 777');
});

test('nieznana osoba i pusta nazwa nie dają numeru', () => {
  expect(issuerPhone(stanZOsobami() as never, 'Nikt Taki')).toBe('');
  expect(issuerPhone(stanZOsobami() as never, '  ')).toBe('');
});

test('numer drukuje się pod nazwiskiem, a bez numeru wiersz znika', () => {
  const z = buildOfferHtml(oferta({ issuedByPhone: '511 697 697' }), DEFAULT_STATE.settings);
  const bez = buildOfferHtml(oferta({ issuedByPhone: '  ' }), DEFAULT_STATE.settings);
  expect(z).toContain('tel. 511 697 697');
  expect(z).toContain('of-signer-phone');
  // numer stoi pod nazwiskiem, nie nad nim
  expect(z.indexOf('of-signer-phone')).toBeGreaterThan(z.indexOf('of-signer'));
  expect(bez).not.toContain('of-signer-phone');
});

test('stopka maila bierze numer osoby, a bez niego numer firmowy', () => {
  const z = buildOfferEmail(oferta({ issuedByPhone: '511 697 697' }), DEFAULT_STATE.settings).text;
  const bez = buildOfferEmail(oferta(), DEFAULT_STATE.settings).text;
  expect(z).toContain('tel. 511 697 697');
  expect(bez).toContain('tel. ' + DEFAULT_STATE.settings.seller.phone);
});

/* ---------------- Numer, VAT i kolumny ---------------- */

test('numer oferty trafia do nagłówka dokumentu', () => {
  const html = buildOfferHtml(oferta({ number: 'OF-0014/2026' }), DEFAULT_STATE.settings);
  expect(html).toContain('OF-0014/2026');
  expect(html).toContain('of-number');
});

test('bez numeru nagłówek nie drukuje pustego miejsca', () => {
  expect(buildOfferHtml(oferta(), DEFAULT_STATE.settings)).not.toContain('of-number');
});

test('cena za sztukę liczona z kwoty pozycji i ilości', () => {
  const html = buildOfferHtml(
    oferta({ groups: [grupa('g1', [poz('Roleta', '4', '250')])] }),
    DEFAULT_STATE.settings
  );
  expect(html).toContain('Cena/szt.');
  expect(html).toContain('250,00 zł');   // za sztukę
  expect(html).toContain('1000,00 zł');  // za pozycję
});

test('rozbicie na netto i VAT tylko po włączeniu', () => {
  const bez = buildOfferHtml(oferta({ groups: [grupa('g1', [poz('Roleta', '1', '1230')])] }), DEFAULT_STATE.settings);
  const z = buildOfferHtml(
    oferta({ vatBreakdown: true, groups: [grupa('g1', [poz('Roleta', '1', '1230')])] }),
    DEFAULT_STATE.settings
  );
  expect(bez).not.toContain('VAT');
  expect(z).toContain('VAT 23%');
  expect(z).toContain('1000,00 zł');  // netto
  expect(z).toContain('230,00 zł');   // podatek
});

test('kwota pomieszczenia pokazuje się dopiero przy kilku pomieszczeniach', () => {
  const jedno = buildOfferHtml(
    oferta({ groups: [{ ...grupa('g1', [poz('Roleta', '1', '500')]), title: 'Salon' }] }),
    DEFAULT_STATE.settings
  );
  const dwa = buildOfferHtml(
    oferta({
      groups: [
        { ...grupa('g1', [poz('Roleta', '1', '500')]), title: 'Salon' },
        { ...grupa('g2', [poz('Roleta', '1', '700')]), title: 'Sypialnia' }
      ]
    }),
    DEFAULT_STATE.settings
  );
  expect(jedno).toContain('Salon');
  expect(jedno).not.toContain('of-room-sum');
  expect(dwa).toContain('of-room-sum');
  expect(dwa).toContain('700,00 zł');
});

/* ---------------- Dane firmy i nagłówek ---------------- */

test('dokument nazywa się ofertą, a dane firmy są w stopce', () => {
  const html = buildOfferHtml(oferta(), DEFAULT_STATE.settings);
  expect(html).toContain('Oferta cenowa');
  expect(html).toContain('of-foot');
  const stopka = html.slice(html.indexOf('of-foot'));
  expect(stopka).toContain('ZPHU Lechrol Jacek Wajcht');
  expect(stopka).toContain('NIP 118-135-62-66');
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

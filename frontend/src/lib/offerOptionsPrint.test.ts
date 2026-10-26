import { buildOfferHtml } from './printingOffer';
import { syncOptions } from './offerOptions';
import { DEFAULT_STATE } from './storage';
import { Offer, OfferGroup, OfferItem } from '../types';

const poz = (p: Partial<OfferItem> = {}): OfferItem => ({
  name: 'Roleta',
  material: '',
  qty: '1',
  unitPrice: '',
  ...p
});

const SZKIELET: OfferGroup = syncOptions({
  id: 'go',
  header: 'material',
  title: 'Sypialnia',
  items: [poz({ name: 'Salon', material: '186 x 202 cm', qty: '2' })],
  options: [
    { id: 'a', title: 'dzień-noc', items: [poz({ material: 'DN14', unitPrice: '400' })] },
    { id: 'b', title: 'zaciemniający', items: [poz({ material: 'BL22', unitPrice: '500' })] }
  ]
});

const oferta = (groups: OfferGroup[], p: Partial<Offer> = {}): Offer =>
  ({
    id: 'o1',
    date: '2026-10-23',
    place: 'Łomianki',
    client: 'Klient',
    clientEmail: '',
    groups,
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
    issuedBy: 'Sebastian',
    status: 'szkic',
    createdAt: '',
    updatedAt: '',
    ...p
  } as Offer);

const html = (groups: OfferGroup[], p: Partial<Offer> = {}) =>
  buildOfferHtml(oferta(groups, p), DEFAULT_STATE.settings);

/** Wycina sekcję opcji — żeby asercje nie łapały przypadkiem reszty dokumentu. */
function sekcjaOpcji(doc: string): string {
  const od = doc.indexOf('of-options');
  return od < 0 ? '' : doc.slice(od, doc.indexOf('</section>', od));
}

test('grupa opcji dostaje własną tabelę porównawczą z kolumną na opcję', () => {
  const doc = html([SZKIELET]);
  const sekcja = sekcjaOpcji(doc);
  expect(sekcja).toContain('Opcje do wyboru — Sypialnia');
  expect(sekcja).toContain('dzień-noc');
  expect(sekcja).toContain('zaciemniający');
  // kwoty obu opcji stoją obok siebie w jednym wierszu
  expect(sekcja).toContain('800,00 zł');
  expect(sekcja).toContain('1000,00 zł');
});

test('pozycje opcji nie wchodzą do tabeli pozycji zamówienia', () => {
  // inaczej klient zapłaciłby za wszystkie alternatywy naraz
  const doc = html([
    { id: 'g1', header: 'material', items: [poz({ name: 'Kuchnia', unitPrice: '1000' })] },
    SZKIELET
  ]);
  const tabelaPozycji = doc.slice(doc.indexOf('<table class="of-items">'), doc.indexOf('of-options'));
  expect(tabelaPozycji).toContain('Kuchnia');
  expect(tabelaPozycji).not.toContain('Salon');
});

test('przy każdej opcji stoi cena całkowita całej oferty, nie sama kwota opcji', () => {
  const doc = html([
    { id: 'g1', header: 'material', items: [poz({ name: 'Kuchnia', unitPrice: '1000' })] },
    SZKIELET
  ]);
  const sekcja = sekcjaOpcji(doc);
  expect(sekcja).toContain('Cena całkowita oferty');
  expect(sekcja).toContain('1800,00 zł'); // 1000 + opcja A
  expect(sekcja).toContain('2000,00 zł'); // 1000 + opcja B
});

test('numeracja biegnie dalej przez tabelę opcji', () => {
  const doc = html([
    { id: 'g1', header: 'material', items: [poz({ name: 'Kuchnia', unitPrice: '1000' })] },
    SZKIELET
  ]);
  expect(doc).toContain('<td class="of-lp">1</td>');
  expect(sekcjaOpcji(doc)).toContain('<td class="of-lp">2</td>');
});

test('bez wskazania opcji dokument jej nie zaznacza', () => {
  // liczyć coś musimy, ale udawanie decyzji klienta byłoby kłamstwem
  expect(sekcjaOpcji(html([SZKIELET]))).not.toContain('wybrana');
});

test('wskazana opcja jest oznaczona i nazwana w podsumowaniu', () => {
  const doc = html([{ ...SZKIELET, selectedOptionId: 'b' }]);
  expect(sekcjaOpcji(doc)).toContain('wybrana');
  expect(sekcjaOpcji(doc)).toContain('of-opt-chosen');
  expect(doc).toContain('Cena całkowita z opcją zaciemniający');
});

test('przy kilku grupach opcji podsumowanie mówi o wybranych, bez wskazywania jednej', () => {
  const druga = { ...SZKIELET, id: 'go2', options: SZKIELET.options!.map((o) => ({ ...o, id: o.id + '2' })) };
  expect(html([SZKIELET, druga])).toContain('Cena całkowita z wybranymi opcjami');
});

test('pusta opcja nie zabiera kolumny na dokumencie', () => {
  const zPusta = syncOptions({
    ...SZKIELET,
    options: [...SZKIELET.options!, { id: 'c', title: 'nieuzupełniona', items: [] }]
  });
  expect(sekcjaOpcji(html([zPusta]))).not.toContain('nieuzupełniona');
});

test('brak wypełnionej opcji nie drukuje pustej sekcji', () => {
  const pusta = syncOptions({
    ...SZKIELET,
    options: [{ id: 'a', title: 'a', items: [] }]
  });
  expect(html([pusta])).not.toContain('of-options');
});

test('specyfikacja opcji drukuje się pod tabelą, gdy oferta ją pokazuje', () => {
  const zeSpec = syncOptions({
    ...SZKIELET,
    items: [{ ...SZKIELET.items[0], spec: [{ label: 'Szerokość całkowita', value: '186' }] }],
    options: SZKIELET.options!.map((o) => ({
      ...o,
      items: o.items.map((it) => ({ ...it, spec: [{ label: 'Kolor', value: o.id === 'a' ? 'beż' : 'grafit' }] }))
    }))
  });
  const doc = html([zeSpec], { showSpecs: true });
  expect(doc).toContain('of-opt-specs');
  expect(doc).toContain('beż');
  expect(doc).toContain('grafit');
  // wymiar ze szkieletu powtarza się przy każdej opcji, bo jest jej częścią
  expect(doc.match(/186/g)!.length).toBeGreaterThanOrEqual(2);
});

test('wyłączona specyfikacja nie drukuje bloków opcji', () => {
  const doc = html([SZKIELET], { showSpecs: false });
  expect(doc).not.toContain('of-opt-specs');
});

test('oferta bez opcji wygląda dokładnie jak dotąd', () => {
  const doc = html([{ id: 'g1', header: 'material', items: [poz({ name: 'Kuchnia', unitPrice: '1000' })] }]);
  expect(doc).not.toContain('of-options');
  expect(doc).toContain('Cena całkowita');
  expect(doc).not.toContain('Cena całkowita z opcją');
});

test('opcja bez własnej nazwy nie daje „z opcją Opcja A"', () => {
  const bezNazw = { ...SZKIELET, selectedOptionId: 'a', options: SZKIELET.options!.map((o) => ({ ...o, title: '' })) };
  const doc = html([bezNazw]);
  expect(doc).toContain('Cena całkowita — Opcja A');
  expect(doc).not.toContain('z opcją Opcja');
});

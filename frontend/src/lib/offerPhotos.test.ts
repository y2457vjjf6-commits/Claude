import { buildOfferHtml } from './printingOffer';
import { DEFAULT_STATE } from './storage';
import { Offer, OfferGroup, OfferItem, ProductPhoto, Settings } from '../types';

const ZDJECIE = 'data:image/jpeg;base64,AAAA';
const ZDJECIE2 = 'data:image/jpeg;base64,BBBB';

const poz = (name: string, extra: Partial<OfferItem> = {}): OfferItem => ({
  name,
  material: '',
  qty: '2',
  unitPrice: '1000',
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
    groups: [grupa('g1', [poz('Roleta kasetowa UNI, biała')])],
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

const zBiblioteka = (photos: ProductPhoto[]): Settings => ({
  ...DEFAULT_STATE.settings,
  productPhotos: photos
});

const BIBLIOTEKA = zBiblioteka([{ name: 'roleta kasetowa uni', dataUrl: ZDJECIE }]);

test('zdjęcie trafia na dokument przy pozycji, gdy oferta ma je włączone', () => {
  const html = buildOfferHtml(oferta({ showPhotos: true }), BIBLIOTEKA);
  expect(html).toContain(`<img class="of-photo" src="${ZDJECIE}"`);
  // zdjęcie stoi we własnej kolumnie tabeli, obok numeru pozycji
  expect(html).toContain('of-pic');
});

test('wyłączony przełącznik zostawia dokument bez zdjęć', () => {
  const html = buildOfferHtml(oferta({ showPhotos: false }), BIBLIOTEKA);
  expect(html).not.toContain('of-photo');
  // bez zdjęć tabela nie dostaje też pustej kolumny na nie
  expect(html).not.toContain('of-pic');
});

test('brak przełącznika na starej ofercie to dokument bez zdjęć', () => {
  // oferty wystawione przed tą zmianą nie mają pola showPhotos i mają wyglądać jak dotąd
  const html = buildOfferHtml(oferta(), BIBLIOTEKA);
  expect(html).not.toContain('of-photo');
});

test('bez wgranych zdjęć pozycja dostaje wbudowaną ikonę produktu', () => {
  const html = buildOfferHtml(oferta({ showPhotos: true }), DEFAULT_STATE.settings);
  // rysunek dostaje własną klasę, bo na wydruku jest mniejszy niż fotografia
  expect(html).toContain('<img class="of-photo of-icon" src="data:image/svg+xml;base64,');
  expect(html).toContain('Roleta kasetowa UNI, biała');
});

test('pozycja spoza asortymentu zostaje bez rysunku i nie psuje tabeli', () => {
  const html = buildOfferHtml(
    oferta({ showPhotos: true, groups: [grupa('g1', [poz('Parapet dębowy')])] }),
    DEFAULT_STATE.settings
  );
  expect(html).not.toContain('of-photo');
  expect(html).toContain('Parapet dębowy');
});

test('numer pozycji zostaje na miejscu także ze zdjęciem', () => {
  const html = buildOfferHtml(oferta({ showPhotos: true }), BIBLIOTEKA);
  expect(html).toContain('<td class="of-lp">1</td>');
});

test('pozycja bez dopasowania nie dostaje cudzego zdjęcia', () => {
  const html = buildOfferHtml(
    oferta({ showPhotos: true, groups: [grupa('g1', [poz('Roleta kasetowa UNI'), poz('Parapet dębowy')])] }),
    BIBLIOTEKA
  );
  // zdjęcie firmy idzie tylko do swojej pozycji; parapet nie jest naszym
  // produktem, więc nie ma dla niego ani zdjęcia, ani wbudowanej ikony
  expect(html.match(/of-photo/g)).toHaveLength(1);
  expect(html).toContain(ZDJECIE);
});

test('każda pozycja dostaje swoje zdjęcie', () => {
  const html = buildOfferHtml(
    oferta({ showPhotos: true, groups: [grupa('g1', [poz('Roleta kasetowa UNI'), poz('Plisa VS1')])] }),
    zBiblioteka([
      { name: 'roleta kasetowa uni', dataUrl: ZDJECIE },
      { name: 'plisa', dataUrl: ZDJECIE2 }
    ])
  );
  expect(html).toContain(ZDJECIE);
  expect(html).toContain(ZDJECIE2);
});

test('zdjęcia działają też w tabeli wariantów', () => {
  const html = buildOfferHtml(
    oferta({
      showPhotos: true,
      groups: [
        grupa('g1', [poz('Roleta kasetowa UNI')]),
        grupa('w1', [poz('Roleta kasetowa UNI, zaciemniająca')], { variant: true })
      ]
    }),
    BIBLIOTEKA
  );
  expect(html.match(/of-photo/g)).toHaveLength(2);
});

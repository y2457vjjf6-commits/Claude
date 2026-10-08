import { buildOfferHtml } from './printingOffer';
import { offerVat, offerVatRate, VAT_RATE } from './offers';
import { DEFAULT_STATE } from './storage';
import { Offer, OfferGroup, OfferItem } from '../types';

const poz = (p: Partial<OfferItem> = {}): OfferItem => ({
  name: 'Roleta', material: '', qty: '2', unitPrice: '1000', ...p
});
const grupa = (items: OfferItem[]): OfferGroup => ({ id: 'g1', header: 'material', items });
const oferta = (patch: Partial<Offer> = {}): Offer =>
  ({
    id: 'o1', date: '2026-09-25', place: 'Łomianki', client: 'Jan Kowalski', clientEmail: '',
    groups: [grupa([poz()])], continuousNumbering: true, discountEnabled: false, discountPercent: '',
    deliveryEnabled: false, deliveryPrice: '', installationIncluded: true, deadlineDays: '14',
    validityEnabled: false, validityDays: '30', notes: '', issuedBy: 'Sebastian Wajcht',
    status: 'szkic', createdAt: '', updatedAt: '', ...patch
  } as Offer);

describe('stawka VAT', () => {
  it('bez wyboru obowiązuje stawka podstawowa', () => {
    expect(offerVatRate(oferta())).toBe(VAT_RATE);
    expect(offerVatRate(oferta({ vatRate: 0 }))).toBe(VAT_RATE);
  });

  it('wybrana stawka wchodzi do rozbicia', () => {
    expect(offerVatRate(oferta({ vatRate: 8 }))).toBe(8);
    const html = buildOfferHtml(oferta({ vatBreakdown: true, vatRate: 8 }), DEFAULT_STATE.settings);
    expect(html).toContain('VAT 8%');
    expect(html).not.toContain('VAT 23%');
  });

  it('netto przy 8% jest wyższe niż przy 23% od tej samej kwoty brutto', () => {
    // ta sama cena brutto, inna stawka — klient płaci tyle samo, netto się różni
    expect(offerVat(2000, 8).netto).toBeGreaterThan(offerVat(2000, 23).netto);
    expect(offerVat(2000, 8).brutto).toBe(offerVat(2000, 23).brutto);
  });
});

describe('dane odbiorcy', () => {
  it('adres i NIP drukują się pod nazwą, gdy je podano', () => {
    const html = buildOfferHtml(
      oferta({ client: 'Marysieńka sp. z o.o.', clientAddress: 'ul. Długa 118/4', clientNip: '723-18-44-902' }),
      DEFAULT_STATE.settings
    );
    expect(html).toContain('Marysieńka sp. z o.o.');
    expect(html).toContain('ul. Długa 118/4');
    expect(html).toContain('NIP 723-18-44-902');
  });

  it('oferta na adres budowy zostaje jedną linijką', () => {
    const html = buildOfferHtml(oferta({ client: 'Akacjowa 12' }), DEFAULT_STATE.settings);
    expect(html).toContain('Akacjowa 12');
    expect(html).not.toContain('NIP 7');
  });
});

describe('warunki płatności', () => {
  it('zaliczka z ustawień drukuje się wśród warunków', () => {
    const html = buildOfferHtml(oferta(), { ...DEFAULT_STATE.settings, offerDepositPercent: '30' });
    expect(html).toContain('Płatność');
    expect(html).toContain('Zaliczka 30% przy złożeniu zamówienia, reszta przy odbiorze');
  });

  it('sto procent to płatność z góry, nie zaliczka', () => {
    const html = buildOfferHtml(oferta(), { ...DEFAULT_STATE.settings, offerDepositPercent: '100' });
    expect(html).toContain('Pełna kwota przy złożeniu zamówienia');
  });

  it('puste pole i zero wyłączają wiersz', () => {
    for (const v of ['', '   ', '0']) {
      const html = buildOfferHtml(oferta(), { ...DEFAULT_STATE.settings, offerDepositPercent: v });
      expect(html).not.toContain('Płatność');
    }
  });
});

describe('podpis', () => {
  it('kończy się zwrotem grzecznościowym, nie urwanym wierszem', () => {
    expect(buildOfferHtml(oferta(), DEFAULT_STATE.settings)).toContain('Z poważaniem');
  });

  it('telefon wystawiającego znika, gdy to numer firmowy', () => {
    const s = { ...DEFAULT_STATE.settings, seller: { ...DEFAULT_STATE.settings.seller, phone: '511 697 697' } };
    // ten sam numer, inny zapis — i tak ma się nie powtarzać nad stopką
    const html = buildOfferHtml(oferta({ issuedByPhone: '511-697-697' }), s);
    expect(html).not.toContain('of-signer-phone');
  });

  it('własny numer wystawiającego zostaje', () => {
    const s = { ...DEFAULT_STATE.settings, seller: { ...DEFAULT_STATE.settings.seller, phone: '511 697 697' } };
    const html = buildOfferHtml(oferta({ issuedByPhone: '600 100 200' }), s);
    expect(html).toContain('600 100 200');
  });
});

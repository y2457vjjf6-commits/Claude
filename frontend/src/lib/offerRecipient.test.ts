import { offerFileName, offerRecipient } from './offers';
import { buildOfferEmail, offerPrintable } from './offerActions';
import { buildOfferHtml } from './printingOffer';
import { DEFAULT_STATE } from './storage';
import { Offer } from '../types';

const oferta = (p: Partial<Offer> = {}): Offer =>
  ({
    id: 'o1',
    number: 'OF-0014/2026',
    date: '2026-11-25',
    place: 'Łomianki',
    client: '',
    clientEmail: '',
    groups: [{ id: 'g1', header: 'material', items: [{ name: 'Roleta', material: '', qty: '1', unitPrice: '1000' }] }],
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
    ...p
  } as Offer);

const html = (p: Partial<Offer> = {}) => buildOfferHtml(oferta(p), DEFAULT_STATE.settings);

describe('adresat oferty', () => {
  it('nazwą adresata jest klient, gdy go podano', () => {
    expect(offerRecipient(oferta({ client: 'Akacjowa 12', clientEmail: 'jan@example.com' }))).toBe('Akacjowa 12');
  });

  it('bez klienta adresatem jest adres e-mail', () => {
    // klient napisał i czeka na wycenę — adresu jeszcze nie znamy
    expect(offerRecipient(oferta({ clientEmail: 'jan@example.com' }))).toBe('jan@example.com');
  });

  it('puste pola dają pustego adresata, a nie napis „undefined”', () => {
    expect(offerRecipient(oferta())).toBe('');
  });

  it('oferta wystawiona na sam e-mail ma go w nagłówku dokumentu', () => {
    const doc = html({ clientEmail: 'jan@example.com' });
    expect(doc).toContain('jan@example.com');
    expect(doc).toContain('Oferta dla');
  });
});

describe('e-mail odbiorcy na dokumencie', () => {
  it('drukuje się pod nazwą odbiorcy', () => {
    const doc = html({ client: 'Akacjowa 12', clientEmail: 'jan@example.com' });
    const ramka = doc.slice(doc.indexOf('of-buyer'), doc.indexOf('</section>', doc.indexOf('of-buyer')));
    expect(ramka).toContain('Akacjowa 12');
    expect(ramka).toContain('jan@example.com');
  });

  it('stoi obok adresu i NIP-u', () => {
    const doc = html({
      client: 'Firma',
      clientEmail: 'biuro@firma.pl',
      clientAddress: 'ul. Długa 1',
      clientNip: '1234567890'
    });
    const ramka = doc.slice(doc.indexOf('of-buyer'), doc.indexOf('</section>', doc.indexOf('of-buyer')));
    expect(ramka).toContain('ul. Długa 1');
    expect(ramka).toContain('biuro@firma.pl');
    expect(ramka).toContain('NIP 1234567890');
  });

  it('nie powtarza się, gdy sam jest nazwą adresata', () => {
    const doc = html({ clientEmail: 'jan@example.com' });
    expect(doc.match(/jan@example\.com/g)).toHaveLength(1);
  });

  it('brak e-maila nie zostawia pustego wiersza', () => {
    const doc = html({ client: 'Akacjowa 12' });
    const ramka = doc.slice(doc.indexOf('of-buyer'), doc.indexOf('</section>', doc.indexOf('of-buyer')));
    expect(ramka).not.toContain('of-buyer-sub');
  });

  it('adres e-mail jest escapowany', () => {
    expect(html({ clientEmail: 'a<b>@x.pl' })).not.toContain('a<b>@x.pl');
  });
});

describe('oferta na sam e-mail w nazwie pliku i wiadomości', () => {
  it('nazwa pliku bierze adres e-mail zamiast słowa „oferta”', () => {
    expect(offerFileName(oferta({ clientEmail: 'jan@example.com' }))).toContain('jan@example.com');
  });

  it('temat wiadomości nie kończy się myślnikiem bez adresata', () => {
    expect(buildOfferEmail(oferta(), DEFAULT_STATE.settings).subject).toBe('Oferta cenowa 25.11.2026');
  });

  it('temat niesie adresata, gdy jest', () => {
    const { subject } = buildOfferEmail(oferta({ clientEmail: 'jan@example.com' }), DEFAULT_STATE.settings);
    expect(subject).toContain('jan@example.com');
  });

  it('treść wiadomości nie dopisuje „dla:” bez nazwy obiektu', () => {
    const { text } = buildOfferEmail(oferta({ clientEmail: 'jan@example.com' }), DEFAULT_STATE.settings);
    expect(text).not.toContain('dla:');
  });

  it('wysyłka idzie na adres z oferty', () => {
    const p = offerPrintable(oferta({ clientEmail: 'jan@example.com' }), DEFAULT_STATE.settings);
    expect(p.recipient).toBe('jan@example.com');
    expect(p.label).toContain('jan@example.com');
  });
});

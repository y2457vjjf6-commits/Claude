import { buildOfferHtml } from './printingOffer';
import { DEFAULT_STATE } from './storage';
import { Offer, OfferItem, OfferSpecRow } from '../types';

const spec = (pary: [string, string][]): OfferSpecRow[] =>
  pary.map(([label, value]) => ({ label, value }));

const poz = (s: [string, string][]): OfferItem => ({
  name: 'Rolety wolnowiszące - FI40',
  material: '',
  qty: '1',
  unitPrice: '1000',
  spec: spec(s)
});

const oferta = (items: OfferItem[]): Offer =>
  ({
    id: 'o1',
    date: '2026-10-29',
    place: 'Łomianki',
    client: 'Klient',
    clientEmail: '',
    showSpecs: true,
    groups: [{ id: 'g1', header: 'material', items }],
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
    updatedAt: ''
  } as Offer);

const html = (items: OfferItem[]) => buildOfferHtml(oferta(items), DEFAULT_STATE.settings);

/** Wycina parę o podanej nazwie razem z jej klasami. */
function para(doc: string, etykieta: string): string {
  const i = doc.indexOf(etykieta);
  if (i < 0) return '';
  const od = doc.lastIndexOf('<div class="of-spec-pair', i);
  return doc.slice(od, doc.indexOf('</div>', i) + 6);
}

describe('układ specyfikacji na ofercie', () => {
  it('każdy parametr jest osobnym pudełkiem — nie ma jak nachodzić na sąsiada', () => {
    const doc = html([poz([['Materiał', 'Madagaskar'], ['Szerokość całkowita', '180 cm']])]);
    expect(doc.match(/of-spec-pair/g)).toHaveLength(2);
    expect(doc).toContain('<dl class="of-spec">');
  });

  it('krótki parametr zostaje w swojej kolumnie', () => {
    const doc = html([poz([['Typ montażu', 'Sufit']])]);
    expect(para(doc, 'Typ montażu')).not.toContain('of-spec-wide');
  });

  it('parametr dłuższy niż kolumna zabiera cały wiersz', () => {
    // to właśnie te wartości wychodziły wcześniej na sąsiedni parametr
    const doc = html([
      poz([
        ['Kolor listwy końcowej', 'antracytowoszary'],
        ['Uwaga', 'materiał sprowadzany na zamówienie, termin do 6 tygodni']
      ])
    ]);
    expect(para(doc, 'Kolor listwy końcowej')).toContain('of-spec-wide');
    expect(para(doc, 'Uwaga')).toContain('of-spec-wide');
  });

  it('granica biegnie po długości pary, a nie samej wartości', () => {
    // „Materiał: Len" mieści się, „Szerokość całkowita: Len" już ledwie —
    // liczy się suma, bo etykieta zabiera tyle samo miejsca co wartość
    expect(para(html([poz([['Materiał', 'Len']])]), 'Materiał')).not.toContain('of-spec-wide');
    const dluga = para(html([poz([['Kolor listwy końcowej dolnej', 'Len']])]), 'Kolor listwy');
    expect(dluga).toContain('of-spec-wide');
  });

  it('pusta wartość nie trafia na dokument dla klienta', () => {
    const doc = html([poz([['Materiał', 'Len'], ['Kolor kasety', '']])]);
    expect(doc).toContain('Materiał');
    expect(doc).not.toContain('Kolor kasety');
  });

  it('pozycja bez specyfikacji nie dostaje pustej listy', () => {
    const doc = html([{ ...poz([]), spec: [] }]);
    expect(doc).not.toContain('of-spec');
  });
});

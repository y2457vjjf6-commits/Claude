import { offerTotals } from './offers';
import { syncOptions } from './offerOptions';
import { buildOfferHtml } from './printingOffer';
import { DEFAULT_STATE } from './storage';
import { Offer, OfferGroup, OfferItem, OfferOption } from '../types';

const poz = (unitPrice: string, name = 'Roleta'): OfferItem => ({
  name,
  material: '',
  qty: '1',
  unitPrice
});

const opcja = (id: string, title: string, cena: string): OfferOption => ({
  id,
  title,
  items: [poz(cena)]
});

const grupaOpcji = (id: string, title: string, opcje: OfferOption[]): OfferGroup =>
  syncOptions({ id, header: 'material', title, items: [poz('')], options: opcje });

const oferta = (groups: OfferGroup[], p: Partial<Offer> = {}): Offer =>
  ({
    id: 'o1',
    date: '2026-11-24',
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

/** Dwa pomieszczenia, w każdym tańsza i droższa wersja. */
const DWA_POKOJE = () => [
  grupaOpcji('g1', 'Sypialnia', [opcja('a1', 'dzień-noc', '400'), opcja('b1', 'zaciemniający', '500')]),
  grupaOpcji('g2', 'Kuchnia', [opcja('a2', 'przesuwna', '300'), opcja('b2', 'plisowana', '450')])
];

describe('komplety opcji', () => {
  it('komplet bierze tę samą literę ze wszystkich grup', () => {
    const komplety = offerTotals(oferta(DWA_POKOJE())).optionBundles;
    expect(komplety).toHaveLength(2);
    // komplet A: 400 + 300, komplet B: 500 + 450
    expect(komplety.map((b) => b.total)).toEqual([700, 950]);
  });

  it('komplet mówi, z czego się składa', () => {
    const [a, b] = offerTotals(oferta(DWA_POKOJE())).optionBundles;
    expect(a.picks.map((p) => `${p.groupLabel}: ${p.optionLabel}`)).toEqual([
      'Sypialnia: dzień-noc',
      'Kuchnia: przesuwna'
    ]);
    expect(b.picks.map((p) => p.optionLabel)).toEqual(['zaciemniający', 'plisowana']);
  });

  it('komplet liczy też pozycje wspólne i rabaty', () => {
    const o = oferta(
      [{ id: 'g0', header: 'material', items: [poz('1000', 'Karnisz')] }, ...DWA_POKOJE()],
      { discountEnabled: true, discountPercent: '10' }
    );
    const komplety = offerTotals(o).optionBundles;
    // (1000 + 400 + 300) − 10% = 1530; (1000 + 500 + 450) − 10% = 1755
    expect(komplety.map((b) => b.total)).toEqual([1530, 1755]);
  });

  it('wspólna nazwa opcji wygrywa z literą', () => {
    const komplety = offerTotals(
      oferta([
        grupaOpcji('g1', 'Sypialnia', [opcja('a1', 'dzień-noc', '400'), opcja('b1', 'blackout', '500')]),
        grupaOpcji('g2', 'Kuchnia', [opcja('a2', 'dzień-noc', '300'), opcja('b2', 'blackout', '450')])
      ])
    ).optionBundles;
    expect(komplety.map((b) => b.label)).toEqual(['dzień-noc', 'blackout']);
  });

  it('różne nazwy opcji dostają literę kompletu', () => {
    expect(offerTotals(oferta(DWA_POKOJE())).optionBundles.map((b) => b.label)).toEqual([
      'Wszystkie opcje A',
      'Wszystkie opcje B'
    ]);
  });

  it('grupa z mniejszą liczbą opcji zostaje przy ostatniej', () => {
    const o = oferta([
      grupaOpcji('g1', 'Sypialnia', [
        opcja('a1', 'tania', '400'),
        opcja('b1', 'średnia', '500'),
        opcja('c1', 'droga', '700')
      ]),
      grupaOpcji('g2', 'Kuchnia', [opcja('a2', 'tania', '300'), opcja('b2', 'droga', '450')])
    ]);
    const komplety = offerTotals(o).optionBundles;
    expect(komplety).toHaveLength(3);
    // komplet C: kuchnia nie ma trzeciej opcji, więc zostaje przy „droga"
    expect(komplety[2].picks.map((p) => p.optionLabel)).toEqual(['droga', 'droga']);
    expect(komplety[2].total).toBe(1150);
  });

  it('jedna grupa opcji nie daje kompletów — tabela przy niej mówi to samo', () => {
    const o = oferta([grupaOpcji('g1', 'Sypialnia', [opcja('a', 'tania', '400'), opcja('b', 'droga', '500')])]);
    expect(offerTotals(o).optionBundles).toEqual([]);
  });

  it('po jednej opcji w każdej grupie nie ma czego zestawiać', () => {
    const o = oferta([
      grupaOpcji('g1', 'Sypialnia', [opcja('a1', 'jedyna', '400')]),
      grupaOpcji('g2', 'Kuchnia', [opcja('a2', 'jedyna', '300')])
    ]);
    expect(offerTotals(o).optionBundles).toEqual([]);
  });

  it('oferta bez opcji ma pustą listę kompletów', () => {
    const o = oferta([{ id: 'g0', header: 'material', items: [poz('100')] }]);
    expect(offerTotals(o).optionBundles).toEqual([]);
  });
});

describe('komplety na dokumencie', () => {
  const html = (groups: OfferGroup[], p: Partial<Offer> = {}) =>
    buildOfferHtml(oferta(groups, p), DEFAULT_STATE.settings);

  it('zestawienie stoi pod podsumowaniem, kolumna obok kolumny', () => {
    const doc = html(DWA_POKOJE());
    expect(doc).toContain('of-bundles');
    expect(doc).toContain('Cena całkowita przy wyborze całego kompletu');
    expect(doc).toContain('Wszystkie opcje A');
    expect(doc).toContain('Wszystkie opcje B');
    expect(doc.indexOf('of-bundles')).toBeGreaterThan(doc.indexOf('of-sum'));
  });

  it('pod każdym kompletem widać, co do niego weszło', () => {
    const sekcja = (() => {
      const doc = html(DWA_POKOJE());
      const od = doc.indexOf('of-bundles');
      return doc.slice(od, doc.indexOf('</section>', od));
    })();
    expect(sekcja).toContain('Sypialnia');
    expect(sekcja).toContain('dzień-noc');
    expect(sekcja).toContain('Kuchnia');
    expect(sekcja).toContain('plisowana');
    expect(sekcja).toContain('700,00 zł');
    expect(sekcja).toContain('950,00 zł');
  });

  it('jedna grupa opcji nie drukuje zestawienia kompletów', () => {
    const doc = html([grupaOpcji('g1', 'Sypialnia', [opcja('a', 'tania', '400'), opcja('b', 'droga', '500')])]);
    expect(doc).not.toContain('of-bundles');
  });

  it('nazwa pomieszczenia i opcji jest escapowana', () => {
    const doc = html([
      grupaOpcji('g1', '<b>Sypialnia</b>', [opcja('a1', 'tania', '400'), opcja('b1', 'droga', '500')]),
      grupaOpcji('g2', 'Kuchnia', [opcja('a2', 'tania', '300'), opcja('b2', 'droga', '450')])
    ]);
    expect(doc).not.toContain('<b>Sypialnia</b>');
    expect(doc).toContain('&lt;b&gt;Sypialnia&lt;/b&gt;');
  });
});

import {
  discountLines,
  discountSource,
  discountTotal,
  itemDiscountPercent,
  offerProducts
} from './discounts';
import { offerTotals } from './offers';
import { syncOptions } from './offerOptions';
import { Offer, OfferDiscountRule, OfferGroup, OfferItem } from '../types';

const poz = (name: string, unitPrice: string, p: Partial<OfferItem> = {}): OfferItem => ({
  name,
  material: '',
  qty: '1',
  unitPrice,
  ...p
});

const regula = (name: string, percent: string): OfferDiscountRule => ({ id: name, name, percent });

const oferta = (groups: OfferGroup[], p: Partial<Offer> = {}): Offer =>
  ({
    id: 'o1',
    date: '2026-10-26',
    place: 'Łomianki',
    client: 'Klient',
    clientEmail: '',
    groups,
    continuousNumbering: true,
    discountEnabled: true,
    discountPercent: '10',
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

const tabela = (items: OfferItem[], p: Partial<OfferGroup> = {}): OfferGroup => ({
  id: 'g1',
  header: 'material',
  items,
  ...p
});

/** Zestaw z zadania: rolety −10%, żaluzje drewniane −5%, moskitiery bez rabatu. */
const ASORTYMENT = [
  poz('Rolety materiałowe Mini 19', '1000'),
  poz('Żaluzje drewniane 50 mm', '2000'),
  poz('Moskitiery plisowane', '500')
];
const STAWKI = [regula('rolety materiałowe', '10'), regula('żaluzje drewniane', '5'), regula('moskitiery plisowane', '0')];

describe('stawka rabatu dla pozycji', () => {
  it('bez własnych stawek wszystko idzie po rabacie podstawowym', () => {
    const o = oferta([tabela(ASORTYMENT)]);
    expect(ASORTYMENT.map((it) => itemDiscountPercent(it, o))).toEqual([10, 10, 10]);
  });

  it('stawka produktu wygrywa z podstawową', () => {
    const o = oferta([tabela(ASORTYMENT)], { discountRules: STAWKI });
    expect(ASORTYMENT.map((it) => itemDiscountPercent(it, o))).toEqual([10, 5, 0]);
  });

  it('stawka 0 znaczy „ten produkt bez rabatu", a nie „weź podstawowy"', () => {
    const o = oferta([tabela(ASORTYMENT)], { discountRules: [regula('moskitiery', '0')] });
    expect(itemDiscountPercent(ASORTYMENT[2], o)).toBe(0);
    expect(itemDiscountPercent(ASORTYMENT[0], o)).toBe(10);
  });

  it('nazwa produktu łapie też inną odmianę', () => {
    // reguła wpisana w liczbie mnogiej ma działać na pozycję w pojedynczej
    const o = oferta([tabela(ASORTYMENT)], { discountRules: [regula('żaluzje drewniane', '5')] });
    expect(itemDiscountPercent(poz('Żaluzja drewniana 50 mm', '100'), o)).toBe(5);
  });

  it('wyłączony rabat na ofercie zeruje wszystkie stawki', () => {
    const o = oferta([tabela(ASORTYMENT)], { discountEnabled: false, discountRules: STAWKI });
    expect(ASORTYMENT.map((it) => itemDiscountPercent(it, o))).toEqual([0, 0, 0]);
  });

  it('bezsensowny procent jest sprowadzany do zakresu', () => {
    const ujemny = oferta([tabela(ASORTYMENT)], { discountRules: [regula('rolety materiałowe', '-30')] });
    expect(itemDiscountPercent(ASORTYMENT[0], ujemny)).toBe(0);
    const zaDuzy = oferta([tabela(ASORTYMENT)], { discountRules: [regula('rolety materiałowe', '150')] });
    expect(itemDiscountPercent(ASORTYMENT[0], zaDuzy)).toBe(100);
  });

  it('niedokończona reguła nie odbiera produktowi rabatu', () => {
    const o = oferta([tabela(ASORTYMENT)], { discountRules: [{ id: 'x', name: 'rolety', percent: '' }] });
    expect(itemDiscountPercent(ASORTYMENT[0], o)).toBe(10);
  });

  it('program mówi, skąd wzięła się stawka', () => {
    const o = oferta([tabela(ASORTYMENT)], { discountRules: STAWKI });
    expect(discountSource(ASORTYMENT[0], o)).toBe('produkt');
    expect(discountSource(poz('Parapet', '100'), o)).toBe('podstawowy');
    expect(discountSource(ASORTYMENT[0], { ...o, discountEnabled: false })).toBe('brak');
  });
});

describe('rozbicie rabatu na stawki', () => {
  it('jedna stawka to jedna linia — jak dotąd', () => {
    const o = oferta([tabela(ASORTYMENT)]);
    expect(discountLines(ASORTYMENT, o)).toEqual([{ percent: 10, base: 3500, amount: 350 }]);
  });

  it('różne stawki rozchodzą się na osobne linie, od najwyższej', () => {
    const o = oferta([tabela(ASORTYMENT)], { discountRules: STAWKI });
    expect(discountLines(ASORTYMENT, o)).toEqual([
      { percent: 10, base: 1000, amount: 100 },
      { percent: 5, base: 2000, amount: 100 }
    ]);
    // moskitiery nie mają linii, bo nie mają rabatu
    expect(discountTotal(ASORTYMENT, o)).toBe(200);
  });

  it('brak rabatu to brak linii', () => {
    const o = oferta([tabela(ASORTYMENT)], { discountEnabled: false });
    expect(discountLines(ASORTYMENT, o)).toEqual([]);
  });
});

describe('cena całkowita po rabatach produktowych', () => {
  it('rabat liczy się od pozycji, a nie od jednej sumy', () => {
    const sumy = offerTotals(oferta([tabela(ASORTYMENT)], { discountRules: STAWKI }));
    expect(sumy.itemsSum).toBe(3500);
    expect(sumy.discountAmount).toBe(200);
    expect(sumy.total).toBe(3300);
    expect(sumy.discounts.map((l) => l.percent)).toEqual([10, 5]);
  });

  it('oferta sprzed tej zmiany liczy się co do grosza tak samo', () => {
    // jeden rabat na wszystko: zaokrąglenie raz od całości, nie przy pozycji
    const o = oferta([tabela([poz('A', '33.33'), poz('B', '66.67')])], { discountPercent: '7' });
    const sumy = offerTotals(o);
    expect(sumy.itemsSum).toBe(100);
    expect(sumy.discountAmount).toBe(7);
    expect(sumy.total).toBe(93);
  });

  it('marża bierze cenę po rabatach produktowych', () => {
    const sumy = offerTotals(oferta([tabela(ASORTYMENT)], { discountRules: STAWKI }));
    expect(sumy.total).toBe(3300);
  });
});

describe('rabaty a opcje do wyboru', () => {
  const zOpcjami = syncOptions(
    tabela([poz('', '')], {
      id: 'go',
      options: [
        { id: 'a', items: [poz('Moskitiera przesuwna', '1000')] },
        { id: 'b', items: [poz('Moskitiera plisowana', '1200')] }
      ]
    })
  );

  it('każda opcja dostaje stawkę swojego produktu', () => {
    const o = oferta([zOpcjami], {
      discountPercent: '0',
      discountRules: [regula('moskitiera przesuwna', '10'), regula('moskitiera plisowana', '0')]
    });
    const wyceny = offerTotals(o).optionGroups[0].options;
    // przesuwna: 1000 − 10% = 900; plisowana bez rabatu = 1200
    expect(wyceny.map((w) => w.total)).toEqual([900, 1200]);
  });

  it('lista produktów obejmuje wszystkie opcje, nie tylko wybraną', () => {
    // stawka ma obowiązywać niezależnie od tego, którą opcję klient weźmie
    const produkty = offerProducts(oferta([zOpcjami])).map((p) => p.name);
    expect(produkty).toEqual(['Moskitiera plisowana', 'Moskitiera przesuwna']);
  });
});

describe('produkty z tej wyceny', () => {
  it('pozycje o tej samej nazwie łączą się w jeden produkt', () => {
    const o = oferta([
      tabela([poz('Roleta materiałowa', '100'), poz('Rolety materiałowe', '300')], { title: 'Salon' })
    ]);
    const produkty = offerProducts(o);
    expect(produkty).toHaveLength(2);
    expect(produkty[0]).toMatchObject({ name: 'Rolety materiałowe', count: 1, sum: 300 });
  });

  it('produkt bez kwoty nie trafia na listę rabatów', () => {
    expect(offerProducts(oferta([tabela([poz('Roleta', '')])]))).toEqual([]);
  });

  it('lista mówi, gdzie produkt stoi', () => {
    const o = oferta([tabela([poz('Roleta', '100')], { title: 'Salon' })]);
    expect(offerProducts(o)[0].where).toEqual(['Salon']);
  });

  it('najdroższy produkt jest pierwszy — od niego zwykle zaczyna się rabat', () => {
    const o = oferta([tabela([poz('Tanie', '100'), poz('Drogie', '900')])]);
    expect(offerProducts(o).map((p) => p.name)).toEqual(['Drogie', 'Tanie']);
  });
});

describe('rabaty na dokumencie', () => {
  const html = (p: Partial<Offer>) =>
    require('./printingOffer').buildOfferHtml(
      oferta([tabela(ASORTYMENT)], p),
      require('./storage').DEFAULT_STATE.settings
    ) as string;

  it('jeden rabat drukuje się jak dotąd — bez podstawy w opisie', () => {
    const doc = html({});
    expect(doc).toContain('Rabat 10%');
    expect(doc).not.toContain('Rabat 10% od');
    expect(doc).toContain('−350,00 zł');
  });

  it('przy kilku stawkach każda ma własną linię i podaną podstawę', () => {
    // bez podstawy klient nie sprawdzi, od czego liczony jest który procent
    const doc = html({ discountRules: STAWKI });
    expect(doc).toContain('Rabat 10% od 1000,00 zł');
    expect(doc).toContain('Rabat 5% od 2000,00 zł');
    // moskitiery bez rabatu nie dostają linii
    expect(doc).not.toContain('Rabat 0%');
  });

  it('wyłączony rabat nie drukuje żadnej linii', () => {
    expect(html({ discountEnabled: false })).not.toContain('Rabat');
  });
});

import {
  czyKoncowy,
  DOMYSLNE_ETAPY,
  emptyOrder,
  etapy,
  leastAdvancedStage,
  nastepnyEtap,
  orderFromOffer,
  orderHistory,
  orderProgress,
  orderStatus,
  overdueOrders,
  pierwszyEtap,
  poprzedniEtap,
  splitItem,
  stageEvent,
  stageFromEvents
} from './production';
import { Offer, OrderItem, ProductionOrder, Stage, StageEvent } from '../types';

const OFERTA: Offer = {
  id: 'of1',
  number: 'OF-10-0147-2026',
  date: '2026-10-07',
  place: 'Łomianki',
  client: 'Jan Nowak',
  clientEmail: '',
  clientAddress: 'ul. Akacjowa 12',
  groups: [
    {
      id: 'g1',
      header: 'materialSize',
      title: 'Salon',
      items: [
        {
          name: 'Roleta kasetowa UNI',
          material: 'Grupa E · 180 × 250 cm',
          qty: '2',
          unitPrice: '1143,00',
          spec: [{ label: 'Kolor kasety', value: 'Antracyt' }, { label: '', value: '' }]
        },
        { name: '', material: '', qty: '1', unitPrice: '' }
      ]
    },
    {
      id: 'w1',
      header: 'materialSize',
      title: 'Wariant alternatywny',
      variant: true,
      items: [{ name: 'Roleta droższa', material: '', qty: '1', unitPrice: '2000' }]
    }
  ],
  continuousNumbering: true,
  discountEnabled: false,
  discountPercent: '',
  deliveryEnabled: false,
  deliveryPrice: '',
  installationIncluded: true,
  deadlineDays: '21',
  validityEnabled: false,
  validityDays: '30',
  notes: '',
  issuedBy: 'Sebastian Wajcht',
  status: 'zaakceptowana',
  createdAt: '',
  updatedAt: ''
};

const poz = (p: Partial<OrderItem> = {}): OrderItem => ({
  id: 'i1', name: 'Roleta', material: '', qty: '1', stageId: 'przyjete', ...p
});
const zlecenie = (items: OrderItem[], p: Partial<ProductionOrder> = {}): ProductionOrder => ({
  id: 'z1', date: '2026-10-14', client: 'Jan Nowak', items, createdAt: '', updatedAt: '', ...p
});

// --- etapy ---

test('bez ustawień program ma własną listę etapów', () => {
  expect(etapy(undefined)).toBe(DOMYSLNE_ETAPY);
  expect(etapy([])).toBe(DOMYSLNE_ETAPY);
  expect(pierwszyEtap(undefined)).toBe('przyjete');
});

test('następny etap, a na końcu nic', () => {
  expect(nastepnyEtap(undefined, 'przyjete')?.id).toBe('material-zamowiony');
  expect(nastepnyEtap(undefined, 'wydane')).toBeNull();
  expect(nastepnyEtap(undefined, 'nie-ma-takiego')).toBeNull();
});

test('etap końcowy: oznaczony, a gdy nikt nie oznaczył — ostatni z listy', () => {
  expect(czyKoncowy(undefined, 'wydane')).toBe(true);
  expect(czyKoncowy(undefined, 'gotowe')).toBe(false);
  const wlasne: Stage[] = [
    { id: 'a', name: 'A', color: '#000' },
    { id: 'b', name: 'B', color: '#000' }
  ];
  expect(czyKoncowy(wlasne, 'b')).toBe(true);
  expect(czyKoncowy(wlasne, 'a')).toBe(false);
});

// --- zlecenie z oferty ---

test('zlecenie bierze z oferty to, co trzeba zrobić', () => {
  const z = orderFromOffer(OFERTA, undefined, '2026-10-14');
  expect(z.client).toBe('Jan Nowak');
  expect(z.clientAddress).toBe('ul. Akacjowa 12');
  expect(z.sourceOfferId).toBe('of1');
  expect(z.items).toHaveLength(1);
  expect(z.items[0].qty).toBe('2');
  expect(z.items[0].stageId).toBe('przyjete');
});

test('nazwa pozycji mówi, gdzie to wisi', () => {
  expect(orderFromOffer(OFERTA, undefined, '2026-10-14').items[0].name).toBe('Roleta kasetowa UNI (Salon)');
});

test('wariant alternatywny to propozycja, a nie robota', () => {
  const nazwy = orderFromOffer(OFERTA, undefined, '2026-10-14').items.map((i) => i.name);
  expect(nazwy.join(' ')).not.toMatch(/droższa/);
});

test('puste wiersze oferty nie zaśmiecają zlecenia', () => {
  const z = orderFromOffer(OFERTA, undefined, '2026-10-14');
  expect(z.items.every((i) => i.name.trim())).toBe(true);
  expect(z.items[0].spec).toEqual([{ label: 'Kolor kasety', value: 'Antracyt' }]);
});

test('ceny nie przechodzą do zlecenia', () => {
  const tekst = JSON.stringify(orderFromOffer(OFERTA, undefined, '2026-10-14'));
  expect(tekst).not.toContain('1143');
  expect(tekst).not.toContain('unitPrice');
});

test('puste zlecenie ma jedną pozycję do wypełnienia', () => {
  const z = emptyOrder(undefined, '2026-10-14');
  expect(z.items).toHaveLength(1);
  expect(z.items[0].stageId).toBe('przyjete');
});

// --- rozbijanie ---

test('rozbicie daje tyle pozycji, ile sztuk', () => {
  const części = splitItem(poz({ qty: '3', name: 'Roleta', stageId: 'w-produkcji' }));
  expect(części).toHaveLength(3);
  expect(części.map((c) => c.qty)).toEqual(['1', '1', '1']);
  expect(części.map((c) => c.name)).toEqual([
    'Roleta — szt. 1 z 3',
    'Roleta — szt. 2 z 3',
    'Roleta — szt. 3 z 3'
  ]);
});

test('każda sztuka startuje tam, gdzie była pozycja', () => {
  expect(splitItem(poz({ qty: '2', stageId: 'gotowe' })).every((c) => c.stageId === 'gotowe')).toBe(true);
});

test('pozycja na jedną sztukę nie ma czego rozbijać', () => {
  const jedna = poz({ qty: '1' });
  expect(splitItem(jedna)).toEqual([jedna]);
  expect(splitItem(poz({ qty: '' }))).toHaveLength(1);
});

test('rozbite sztuki pamiętają, z czego wyszły, i mają własne specyfikacje', () => {
  const części = splitItem(poz({ qty: '2', spec: [{ label: 'Kolor', value: 'Biały' }] }));
  expect(części.every((c) => c.splitFrom === 'i1')).toBe(true);
  części[1].spec![0].value = 'Antracyt';
  expect(części[0].spec![0].value).toBe('Biały');
});

// --- dziennik ---

test('etap odtwarza się z najpóźniejszego wpisu', () => {
  const dziennik: StageEvent[] = [
    { id: 'e1', orderId: 'z1', itemId: 'i1', fromStageId: '', toStageId: 'przyjete', at: '2026-10-14T08:00:00Z', by: 'Biuro' },
    { id: 'e2', orderId: 'z1', itemId: 'i1', fromStageId: 'przyjete', toStageId: 'w-produkcji', at: '2026-10-14T12:00:00Z', by: 'Warsztat' },
    { id: 'e3', orderId: 'z1', itemId: 'i2', fromStageId: '', toStageId: 'gotowe', at: '2026-10-14T13:00:00Z', by: 'Warsztat' }
  ];
  expect(stageFromEvents('i1', dziennik)).toBe('w-produkcji');
  expect(stageFromEvents('i2', dziennik)).toBe('gotowe');
  expect(stageFromEvents('i9', dziennik)).toBeNull();
  expect(stageFromEvents('i1', undefined)).toBeNull();
});

test('wpis dziennika zapamiętuje skąd, dokąd i kto', () => {
  const w = stageEvent(zlecenie([poz()]), poz({ stageId: 'przyjete' }), 'w-produkcji', ' Jacek ', '  ');
  expect(w.fromStageId).toBe('przyjete');
  expect(w.toStageId).toBe('w-produkcji');
  expect(w.by).toBe('Jacek');
  expect(w.note).toBeUndefined();
  expect(w.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

test('historia zlecenia idzie od najnowszego i nie miesza się z innym', () => {
  const dziennik: StageEvent[] = [
    { id: 'a', orderId: 'z1', itemId: 'i1', fromStageId: '', toStageId: 'przyjete', at: '2026-10-14T08:00:00Z', by: 'Biuro' },
    { id: 'b', orderId: 'z2', itemId: 'x', fromStageId: '', toStageId: 'przyjete', at: '2026-10-14T09:00:00Z', by: 'Biuro' },
    { id: 'c', orderId: 'z1', itemId: 'i1', fromStageId: 'przyjete', toStageId: 'gotowe', at: '2026-10-14T10:00:00Z', by: 'Warsztat' }
  ];
  expect(orderHistory('z1', dziennik).map((e) => e.id)).toEqual(['c', 'a']);
});

// --- postęp i stan ---

test('postęp liczy pozycje w etapie końcowym', () => {
  const z = zlecenie([poz({ id: 'a', stageId: 'wydane' }), poz({ id: 'b', stageId: 'gotowe' })]);
  expect(orderProgress(z, undefined)).toEqual({ wszystkie: 2, zrobione: 1, procent: 50 });
  expect(orderProgress(zlecenie([]), undefined).procent).toBe(0);
});

test('zlecenie jest tam, gdzie jego najmniej zaawansowana pozycja', () => {
  const z = zlecenie([poz({ id: 'a', stageId: 'wydane' }), poz({ id: 'b', stageId: 'material-zamowiony' })]);
  expect(leastAdvancedStage(z, undefined)?.id).toBe('material-zamowiony');
});

test('stan zlecenia wylicza się z pozycji; ręczne jest tylko wstrzymanie', () => {
  expect(orderStatus(zlecenie([poz({ stageId: 'przyjete' })]), undefined)).toBe('nowe');
  expect(orderStatus(zlecenie([poz({ stageId: 'w-produkcji' })]), undefined)).toBe('w-toku');
  expect(orderStatus(zlecenie([poz({ stageId: 'wydane' })]), undefined)).toBe('wydane');
  expect(orderStatus(zlecenie([poz({ stageId: 'wydane' })], { onHold: true }), undefined)).toBe('wstrzymane');
  expect(
    orderStatus(zlecenie([poz({ id: 'a', stageId: 'wydane' }), poz({ id: 'b', stageId: 'przyjete' })]), undefined)
  ).toBe('w-toku');
});

test('po terminie zbierają się zlecenia niewydane', () => {
  const spóźnione = zlecenie([poz({ stageId: 'w-produkcji' })], { id: 'a', dueDate: '2026-10-10' });
  const naDzis = zlecenie([poz({ stageId: 'w-produkcji' })], { id: 'b', dueDate: '2026-10-14' });
  const skonczone = zlecenie([poz({ stageId: 'wydane' })], { id: 'c', dueDate: '2026-10-01' });
  const bezTerminu = zlecenie([poz()], { id: 'd' });
  const lista = overdueOrders([spóźnione, naDzis, skonczone, bezTerminu], undefined, '2026-10-14');
  expect(lista.map((o) => o.id)).toEqual(['a', 'b']);
});

test('etap poprzedni — żeby dało się cofnąć pomyłkę', () => {
  expect(poprzedniEtap(undefined, 'material-zamowiony')?.id).toBe('przyjete');
  expect(poprzedniEtap(undefined, 'przyjete')).toBeNull();
  expect(poprzedniEtap(undefined, 'nie-ma-takiego')).toBeNull();
});

test('cofnięcie i powrót trafiają w ten sam etap', () => {
  const dalej = nastepnyEtap(undefined, 'w-produkcji')!;
  expect(poprzedniEtap(undefined, dalej.id)?.id).toBe('w-produkcji');
});

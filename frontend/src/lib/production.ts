/** Zlecenia produkcyjne: co trzeba zrobić, na jakim etapie jest każda rzecz
 *  i kto ją tam przestawił.
 *
 *  Dwie zasady, z których wynika reszta tego pliku:
 *
 *  1. **Etap pozycji wylicza się z dziennika**, a nie jest polem do nadpisania.
 *     Dzięki temu dwie osoby klikające w tej samej chwili dokładają po wpisie
 *     zamiast kasować sobie nawzajem pracę — a historia bierze się sama.
 *  2. **Zlecenie nie niesie cen.** Warsztat ma wiedzieć, co zrobić, a nie za ile.
 */
import type {
  Department,
  Offer,
  OrderItem,
  OrderStatus,
  ProductionOrder,
  Settings,
  Stage,
  StageEvent
} from '../types';
import { uid } from './storage';
import { filledSpec } from './offers';
import { selectedItems } from './offerOptions';
import { autoSpecFor, domyslnaSpec } from './specTemplates';

/** Etapy na start. Firma zmieni je w Ustawieniach; te są po to, żeby program
 *  działał od pierwszego uruchomienia, a nie witał pustą tablicą. */
export const DOMYSLNE_ETAPY: Stage[] = [
  { id: 'przyjete', name: 'Przyjęte', color: '#8b94a3' },
  { id: 'material-zamowiony', name: 'Materiał zamówiony', color: '#c2821a' },
  { id: 'material-na-stanie', name: 'Materiał na stanie', color: '#a3a81f' },
  { id: 'w-produkcji', name: 'W produkcji', color: '#2f7fd1' },
  { id: 'gotowe', name: 'Gotowe', color: '#2f9e6e' },
  { id: 'montaz', name: 'Montaż', color: '#7a5cd1' },
  { id: 'wydane', name: 'Wydane', color: '#4a8f4a', final: true }
];

export function etapy(stages: Stage[] | undefined): Stage[] {
  return stages && stages.length ? stages : DOMYSLNE_ETAPY;
}

/* ------------------------- Etapy a podetapy -------------------------
   Etap to przystanek, przez który pozycja przechodzi. Podetap to pozycja
   na liście rzeczy do odhaczenia w ramach etapu — „W produkcji" u żaluzji
   znaczy co innego niż u moskitier, a rozbijanie tego na osobne przystanki
   zrobiłoby z tablicy tasiemiec. */

/** Same przystanki: podetapy odpadają. */
export function etapyGlowne(stages: Stage[] | undefined, dzial?: Department | null): Stage[] {
  return etapy(stages).filter((e) => !e.parentId && dotyczyDzialu(e, dzial));
}

/** Lista do odhaczenia w ramach etapu — przefiltrowana po oddziale pozycji. */
export function podetapy(
  stages: Stage[] | undefined,
  parentId: string,
  dzial?: Department | null
): Stage[] {
  return etapy(stages).filter((e) => e.parentId === parentId && dotyczyDzialu(e, dzial));
}

/** Czy etap dotyczy tego oddziału.
 *
 *  Etap bez zaznaczonych oddziałów dotyczy każdego — tak jest łatwiej zacząć
 *  i trudniej coś zgubić.
 *
 *  Rozróżniamy dwa „braki" oddziału, bo znaczą co innego: `undefined` to
 *  „nie filtruj" (tak pyta ekran ustawień, który ma pokazać wszystko),
 *  a `null` to „próbowaliśmy rozpoznać i nie wyszło" — wtedy zostają same
 *  etapy wspólne, żeby pozycja nieznanego rodzaju nie dostała kroków żaluzji.
 */
export function dotyczyDzialu(etap: Stage, dzial?: Department | null): boolean {
  const lista = etap.departments || [];
  if (!lista.length) return true;
  if (dzial === undefined) return true;
  return !!dzial && lista.includes(dzial);
}

export function etap(stages: Stage[] | undefined, id: string): Stage | null {
  return etapy(stages).find((e) => e.id === id) || null;
}

/** Pierwszy etap listy — tu ląduje każda nowa pozycja. */
export function pierwszyEtap(stages: Stage[] | undefined, dzial?: Department | null): string {
  return etapyGlowne(stages, dzial)[0]?.id || '';
}

/** Następny etap po tym; null, gdy to już ostatni. Stąd bierze się przycisk
 *  „dalej" na karcie — w warsztacie to jedno kliknięcie zamiast wybierania. */
export function nastepnyEtap(
  stages: Stage[] | undefined,
  id: string,
  dzial?: Department | null
): Stage | null {
  const lista = etapyGlowne(stages, dzial);
  const i = lista.findIndex((e) => e.id === id);
  return i >= 0 && i + 1 < lista.length ? lista[i + 1] : null;
}

/** Etap przed tym; null, gdy to już pierwszy. Potrzebne do cofania: coś
 *  przestawionego przez pomyłkę albo odesłanego do poprawki musi mieć drogę
 *  z powrotem, a kasowanie wpisu dziennika byłoby zacieraniem historii. */
export function poprzedniEtap(
  stages: Stage[] | undefined,
  id: string,
  dzial?: Department | null
): Stage | null {
  const lista = etapyGlowne(stages, dzial);
  const i = lista.findIndex((e) => e.id === id);
  return i > 0 ? lista[i - 1] : null;
}

export function czyKoncowy(stages: Stage[] | undefined, id: string): boolean {
  const lista = etapyGlowne(stages);
  const e = lista.find((x) => x.id === id);
  if (!e) return false;
  // Gdy nikt nie oznaczył etapu końcowego, za koniec uznajemy ostatni na liście
  return e.final === true || (!lista.some((x) => x.final) && lista[lista.length - 1].id === id);
}

/* ------------------------- Zlecenie z oferty ------------------------- */

/** Zlecenie z zaakceptowanej oferty. Przenosi to, co trzeba wyprodukować —
 *  bez kwot, bo zlecenie nie jest dokumentem finansowym. */
export function orderFromOffer(
  offer: Offer,
  settings: Pick<Settings, 'stages' | 'specTemplates' | 'defaultSpec'> | undefined,
  dzis: string
): ProductionOrder {
  const stages = settings?.stages;
  const start = pierwszyEtap(stages);
  const items: OrderItem[] = [];
  for (const g of offer.groups || []) {
    // Wariant alternatywny to propozycja dla klienta, a nie rzecz do zrobienia
    if (g.variant) continue;
    // Z grupy opcji do warsztatu idzie opcja zaznaczona w ofercie — reszta
    // była propozycją i nie ma czego z niej robić
    for (const it of selectedItems(g)) {
      if (!String(it.name || '').trim() && !String(it.material || '').trim()) continue;
      const pozycja: OrderItem = {
        id: uid(),
        // Podpis tabeli („Salon") mówi, gdzie to wisi — bez niego warsztat
        // dostaje osiem identycznych rolet bez wskazówki, która gdzie idzie
        name: [String(it.name || '').trim(), g.title ? `(${g.title.trim()})` : ''].filter(Boolean).join(' '),
        material: String(it.material || '').trim(),
        spec: filledSpec(it.spec),
        qty: String(it.qty || '1').trim() || '1',
        stageId: start
      };
      // Pozycja bez własnej specyfikacji dostaje szablon produktu, a gdy go
      // nie ma — domyślne wiersze. Warsztat widzi wtedy od razu, co uzupełnić.
      items.push({ ...pozycja, spec: autoSpecFor(pozycja, settings) || pozycja.spec });
    }
  }
  return {
    id: '',
    date: dzis,
    sourceOfferId: offer.id,
    client: offer.client,
    clientAddress: offer.clientAddress,
    items,
    notes: '',
    createdAt: '',
    updatedAt: ''
  };
}

/** Puste zlecenie — gdy coś trzeba zrobić bez oferty (naprawa, reklamacja). */
export function emptyOrder(
  settings: Pick<Settings, 'stages' | 'specTemplates' | 'defaultSpec'> | undefined,
  dzis: string
): ProductionOrder {
  return {
    id: '',
    date: dzis,
    client: '',
    items: [
      {
        id: uid(),
        name: '',
        material: '',
        qty: '1',
        stageId: pierwszyEtap(settings?.stages),
        spec: domyslnaSpec({ name: '', material: '' }, settings)
      }
    ],
    notes: '',
    createdAt: '',
    updatedAt: ''
  };
}

/* --------------------------- Rozbijanie --------------------------- */

/** Rozbija pozycję na pojedyncze sztuki. Potrzebne, gdy z ośmiu rolet trzy
 *  są gotowe, a pięć czeka na materiał — jeden wspólny etap przestaje wtedy
 *  cokolwiek znaczyć. Każda sztuka startuje z etapu pozycji, z której wyszła. */
export function splitItem(item: OrderItem): OrderItem[] {
  const sztuk = Math.floor(Number(String(item.qty).replace(',', '.')) || 0);
  if (sztuk < 2) return [item];
  return Array.from({ length: sztuk }, (_, i) => ({
    ...item,
    id: i === 0 ? item.id : uid(),
    qty: '1',
    name: `${item.name} — szt. ${i + 1} z ${sztuk}`,
    splitFrom: item.splitFrom || item.id,
    spec: (item.spec || []).map((w) => ({ ...w }))
  }));
}

/* ----------------------------- Dziennik ----------------------------- */

/** Wpis dziennika dla przestawienia etapu. */
export function stageEvent(
  order: ProductionOrder,
  item: OrderItem,
  toStageId: string,
  by: string,
  note?: string
): StageEvent {
  return {
    id: uid(),
    orderId: order.id,
    itemId: item.id,
    fromStageId: item.stageId,
    toStageId,
    at: new Date().toISOString(),
    by: String(by || '').trim(),
    ...(note && note.trim() ? { note: note.trim() } : {})
  };
}

/* ------------------------- Odhaczanie podetapów ------------------------- */

export interface Odhaczenie {
  done: boolean;
  by: string;
  at: string;
}

/** Wpis dziennika dla odhaczenia podetapu. Nie kasujemy poprzedniego —
 *  zdjęcie ptaszka to też zdarzenie i ma zostać w historii. */
export function substepEvent(
  orderId: string,
  itemId: string,
  substageId: string,
  done: boolean,
  by: string
): StageEvent {
  return {
    id: uid(),
    orderId,
    itemId,
    fromStageId: '',
    toStageId: substageId,
    at: new Date().toISOString(),
    by: String(by || '').trim(),
    done
  };
}

/** Stan odhaczeń pozycji: podetap → kto i kiedy. Liczy się ostatni wpis,
 *  więc zdjęcie ptaszka cofa odhaczenie, zamiast je dublować. */
export function substepState(
  itemId: string,
  events: StageEvent[] | undefined
): Record<string, Odhaczenie> {
  const stan: Record<string, Odhaczenie> = {};
  for (const e of events || []) {
    if (e.itemId !== itemId || e.done === undefined) continue;
    const biezace = stan[e.toStageId];
    if (biezace && biezace.at > e.at) continue;
    stan[e.toStageId] = { done: e.done, by: e.by, at: e.at };
  }
  return stan;
}

/** Ile podetapów etapu jest odhaczonych — na kafelek tablicy. */
export function substepProgress(
  itemId: string,
  stages: Stage[] | undefined,
  stageId: string,
  dzial: Department | null,
  events: StageEvent[] | undefined
): { zrobione: number; wszystkie: number } {
  const lista = podetapy(stages, stageId, dzial);
  const stan = substepState(itemId, events);
  return {
    zrobione: lista.filter((p) => stan[p.id]?.done).length,
    wszystkie: lista.length
  };
}

/** Etap pozycji odtworzony z dziennika — najpóźniejszy wpis wygrywa.
 *  Przy równym czasie decyduje kolejność zapisu, żeby wynik był powtarzalny. */
export function stageFromEvents(itemId: string, events: StageEvent[] | undefined): string | null {
  let najnowszy: StageEvent | null = null;
  for (const e of events || []) {
    // Odhaczenie podetapu nie przesuwa pozycji na inny przystanek
    if (e.itemId !== itemId || e.done !== undefined) continue;
    if (!najnowszy || e.at >= najnowszy.at) najnowszy = e;
  }
  return najnowszy ? najnowszy.toStageId : null;
}

/** Dziennik jednego zlecenia, od najnowszego. */
export function orderHistory(orderId: string, events: StageEvent[] | undefined): StageEvent[] {
  return (events || []).filter((e) => e.orderId === orderId).sort((a, b) => (a.at < b.at ? 1 : -1));
}

/** Nazwa etapu albo podetapu — historia pokazuje jedno i drugie. */
export function nazwaEtapu(stages: Stage[] | undefined, id: string): string {
  return etapy(stages).find((e) => e.id === id)?.name || id;
}

/* ---------------------------- Postęp ---------------------------- */

export interface Postep {
  wszystkie: number;
  zrobione: number;
  /** 0–100, do paska postępu */
  procent: number;
}

export function orderProgress(order: ProductionOrder, stages: Stage[] | undefined): Postep {
  const wszystkie = order.items.length;
  const zrobione = order.items.filter((it) => czyKoncowy(stages, it.stageId)).length;
  return { wszystkie, zrobione, procent: wszystkie ? Math.round((zrobione / wszystkie) * 100) : 0 };
}

/** Najmniej zaawansowana pozycja wyznacza, gdzie jest całe zlecenie: zlecenie
 *  jest gotowe dopiero wtedy, gdy gotowa jest ostatnia rzecz. Pokazujemy
 *  nazwę tego etapu, zamiast tłumaczyć ją na osobny słownik statusów, który
 *  rozjechałby się przy pierwszej zmianie listy etapów. */
export function leastAdvancedStage(order: ProductionOrder, stages: Stage[] | undefined): Stage | null {
  const lista = etapy(stages);
  let najgorszy = -1;
  for (const it of order.items) {
    const i = lista.findIndex((e) => e.id === it.stageId);
    if (i < 0) continue;
    if (najgorszy < 0 || i < najgorszy) najgorszy = i;
  }
  return najgorszy >= 0 ? lista[najgorszy] : null;
}

/** Zgrubny stan zlecenia — do filtrowania listy, nie do pokazywania zamiast
 *  etapu. Wylicza się z pozycji; ręczne jest tylko wstrzymanie. */
export function orderStatus(order: ProductionOrder, stages: Stage[] | undefined): OrderStatus {
  if (order.onHold) return 'wstrzymane';
  if (!order.items.length) return 'nowe';
  const { wszystkie, zrobione } = orderProgress(order, stages);
  if (zrobione === wszystkie) return 'wydane';
  const start = etapy(stages)[0]?.id;
  if (order.items.every((it) => it.stageId === start)) return 'nowe';
  return 'w-toku';
}

export const OPISY_STATUSU: Record<OrderStatus, string> = {
  nowe: 'Nowe',
  'w-toku': 'W toku',
  wydane: 'Wydane',
  wstrzymane: 'Wstrzymane'
};

/** Zlecenia po terminie albo na dziś — te mają stać na górze listy. */
export function overdueOrders(orders: ProductionOrder[], stages: Stage[] | undefined, dzis: string): ProductionOrder[] {
  return (orders || []).filter(
    (o) => o.dueDate && o.dueDate <= dzis && orderStatus(o, stages) !== 'wydane'
  );
}

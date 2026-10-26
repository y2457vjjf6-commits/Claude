/** Rabaty liczone od produktu, a nie od całej oferty.
 *
 *  Jeden procent na wszystko rzadko odpowiada rzeczywistości: na roletach
 *  materiałowych marża pozwala zejść o 10%, na żaluzjach drewnianych o 5%,
 *  a moskitiery schodzą bez rabatu. Dlatego stawkę przypisuje się produktowi,
 *  który stoi w tej wycenie, a nie wpisuje w jedno pole dla całości.
 *
 *  Kolejność pytań przy każdej pozycji jest stała:
 *    1. stawka produktu, dopasowana po nazwie,
 *    2. rabat podstawowy oferty.
 *  Wyłączony przełącznik rabatu zeruje wszystko — jest nadrzędny.
 */
import { Offer, OfferDiscountRule, OfferGroup, OfferItem } from '../types';
import { itemTotal, parseNumber } from './offers';
import { isOptionGroup, optionLabel, selectedItems } from './offerOptions';
import { matchByName, normalizujNazwe } from './photos';

/** Ustawienia rabatowe oferty — tyle, ile trzeba do policzenia stawki. */
export type DiscountSettings = Pick<Offer, 'discountEnabled' | 'discountPercent' | 'discountRules'>;

/** Procent doprowadzony do sensownego zakresu. Rabat ujemny to dopłata,
 *  a powyżej 100% oferta robi się ujemna — ani jedno, ani drugie nie jest
 *  tym, co ktoś chciał wpisać. */
function procent(wartosc: unknown): number {
  const n = parseNumber(wartosc);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** Czy reguła niesie stawkę — pusta nie bierze udziału w dopasowaniu,
 *  bo inaczej niedokończony wiersz odbierałby rabat całemu produktowi. */
function pelna(r: OfferDiscountRule): boolean {
  return String(r?.name || '').trim() !== '' && String(r?.percent ?? '').trim() !== '';
}

/** Reguła przypisana tej pozycji, albo nic. */
export function ruleFor(item: OfferItem, offer: DiscountSettings): OfferDiscountRule | null {
  return matchByName(item, offer.discountRules, pelna);
}

/** Stawka rabatu dla pozycji, w procentach. */
export function itemDiscountPercent(item: OfferItem, offer: DiscountSettings): number {
  if (!offer.discountEnabled) return 0;
  const regula = ruleFor(item, offer);
  if (regula) return procent(regula.percent);
  return procent(offer.discountPercent);
}

/** Skąd wzięła się stawka tej pozycji — do pokazania w edytorze. */
export function discountSource(
  item: OfferItem,
  offer: DiscountSettings
): 'produkt' | 'podstawowy' | 'brak' {
  if (!offer.discountEnabled) return 'brak';
  return ruleFor(item, offer) ? 'produkt' : 'podstawowy';
}

export interface DiscountLine {
  /** Stawka tej grupy pozycji */
  percent: number;
  /** Suma pozycji objętych tą stawką, przed rabatem */
  base: number;
  /** Kwota rabatu */
  amount: number;
}

/** Rabat rozbity na stawki — jedna linia na każdy użyty procent.
 *
 *  Zaokrąglamy raz na stawkę, nie przy każdej pozycji. Dzięki temu oferta
 *  z jednym rabatem na wszystko liczy się dokładnie tak samo jak przed
 *  wprowadzeniem stawek produktowych i stare dokumenty nie zmieniają się
 *  o grosz przy ponownym wydruku.
 */
export function discountLines(items: OfferItem[], offer: DiscountSettings): DiscountLine[] {
  const wedlugStawki = new Map<number, number>();
  for (const it of items) {
    const p = itemDiscountPercent(it, offer);
    if (!p) continue;
    wedlugStawki.set(p, (wedlugStawki.get(p) || 0) + itemTotal(it));
  }
  return Array.from(wedlugStawki.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([percent, base]) => ({ percent, base, amount: Math.round(base * percent) / 100 }));
}

/** Łączna kwota rabatu dla podanych pozycji. */
export function discountTotal(items: OfferItem[], offer: DiscountSettings): number {
  return discountLines(items, offer).reduce((s, l) => s + l.amount, 0);
}

/* ------------------------- produkty z tej wyceny ------------------------- */

export interface OfferProduct {
  /** Nazwa produktu tak, jak stoi w ofercie */
  name: string;
  /** Ile pozycji nosi tę nazwę */
  count: number;
  /** Suma tych pozycji przed rabatem */
  sum: number;
  /** Gdzie stoją — podpis tabeli albo nazwa opcji, do rozpoznania na liście */
  where: string[];
}

/** Opis miejsca pozycji: podpis tabeli, a w grupie opcji nazwa opcji. */
function gdzie(g: OfferGroup, i: number, opcja?: string): string {
  const podpis = String(g.title || '').trim();
  return [podpis, opcja].filter(Boolean).join(' · ') || `Tabela ${i + 1}`;
}

/** Produkty, które faktycznie stoją w tej wycenie — po nich ustawia się
 *  rabaty. Liczymy też pozycje wszystkich opcji, nie tylko wybranej: stawka
 *  ma obowiązywać niezależnie od tego, którą opcję klient weźmie. */
export function offerProducts(offer: Pick<Offer, 'groups'>): OfferProduct[] {
  const wg = new Map<string, OfferProduct>();
  const dodaj = (it: OfferItem, skad: string) => {
    const nazwa = String(it.name || '').trim();
    if (!nazwa || !itemTotal(it)) return;
    const klucz = normalizujNazwe(nazwa);
    const byl = wg.get(klucz);
    if (byl) {
      byl.count += 1;
      byl.sum += itemTotal(it);
      if (!byl.where.includes(skad)) byl.where.push(skad);
    } else {
      wg.set(klucz, { name: nazwa, count: 1, sum: itemTotal(it), where: [skad] });
    }
  };

  (offer.groups || []).forEach((g, i) => {
    if (isOptionGroup(g)) {
      (g.options || []).forEach((o, oi) => o.items.forEach((it) => dodaj(it, gdzie(g, i, optionLabel(o, oi)))));
    } else {
      g.items.forEach((it) => dodaj(it, gdzie(g, i)));
    }
  });
  return Array.from(wg.values()).sort((a, b) => b.sum - a.sum);
}

/** Pozycje, od których liczy się cena całkowita oferty: tabele podstawowe
 *  i po jednej — wybranej — opcji z każdej grupy opcji. */
export function countedItems(offer: Pick<Offer, 'groups'>): OfferItem[] {
  return (offer.groups || []).filter((g) => !g.variant).flatMap((g) => selectedItems(g));
}

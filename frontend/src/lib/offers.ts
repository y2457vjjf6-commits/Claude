import { Offer, OfferColumnHeader, OfferGroup, OfferItem } from '../types';

/** Liczba z pola tekstowego — przecinek i spacje jak w polskim zapisie kwot. */
export function parseNumber(value: unknown): number {
  const txt = String(value ?? '').replace(/\s/g, '').replace(',', '.');
  if (!txt) return 0;
  const n = Number(txt);
  return Number.isFinite(n) ? n : 0;
}

/** Kwota wpisana w polu doprowadzona do postaci „1234,56”.
 *  Tekstu, którego nie da się odczytać jako liczby, nie ruszamy. */
export function normalizeAmount(text: string | undefined): string {
  const surowy = String(text ?? '').trim();
  const liczba = Number(surowy.replace(/\s/g, '').replace(',', '.'));
  if (!surowy || !Number.isFinite(liczba)) return surowy;
  return liczba.toFixed(2).replace('.', ',');
}

/** Kwota po polsku, np. 3480 -> „3480,00 zł”. */
export function formatMoney(value: number): string {
  return value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
}

/** Kwota za pozycję: ilość × cena, chyba że wpisano własną kwotę. */
export function itemTotal(item: OfferItem): number {
  const nadpisana = String(item.totalOverride ?? '').trim();
  if (nadpisana) return parseNumber(nadpisana);
  return parseNumber(item.qty) * parseNumber(item.unitPrice);
}

export function isItemEmpty(item: OfferItem): boolean {
  return !String(item.name || '').trim() && !String(item.material || '').trim() && !itemTotal(item);
}

/** Numery Lp. dla każdej grupy — ciągłe albo od nowa w każdej tabeli.
 *  Wariant alternatywny zawsze liczy się od 1 i nie wpływa na numerację
 *  tabel podstawowych: to osobna propozycja, nie kolejne pozycje zamówienia. */
export function groupLpNumbers(groups: OfferGroup[], continuous: boolean): string[][] {
  let licznik = 0;
  return groups.map((g) => {
    if (g.variant) {
      let wariantowy = 0;
      return g.items.map((it) => {
        wariantowy += 1;
        return String(it.lpOverride ?? '').trim() || String(wariantowy);
      });
    }
    if (!continuous) licznik = 0;
    return g.items.map((it) => {
      licznik += 1;
      const wlasny = String(it.lpOverride ?? '').trim();
      return wlasny || String(licznik);
    });
  });
}

/** Suma pozycji jednej tabeli. */
export function groupSum(group: OfferGroup): number {
  return (group.items || []).reduce((s, it) => s + itemTotal(it), 0);
}

/** Kolejna litera wariantu: „Wariant A”, „Wariant B”… (puste dla tabel podstawowych). */
export function variantLetter(groups: OfferGroup[], index: number): string {
  if (!groups[index]?.variant) return '';
  const kolejnosc = groups.slice(0, index + 1).filter((x) => x.variant).length;
  return 'Wariant ' + String.fromCharCode(64 + kolejnosc);
}

/** Podpis nad tabelą: własny albo — dla wariantów — automatyczne „Wariant A”. */
export function groupLabel(groups: OfferGroup[], index: number): string {
  const wlasny = String(groups[index]?.title || '').trim();
  return wlasny || variantLetter(groups, index);
}

export interface OfferVariantTotal {
  id: string;
  label: string;
  /** Kwota wariantu po tym samym rabacie, jaki ma cała oferta */
  total: number;
}

export interface OfferTotals {
  /** Suma pozycji podstawowych (bez wariantów), przed rabatem */
  itemsSum: number;
  discountAmount: number;
  /** Po odjęciu rabatu — kwota pokazywana jako „Cena całkowita” */
  total: number;
  deliveryAmount: number;
  /** Wyceny wariantów alternatywnych — każda osobno, poza ceną całkowitą */
  variants: OfferVariantTotal[];
}

/** Rabat liczony tym samym procentem dla ceny całkowitej i dla wariantów. */
function poRabacie(kwota: number, offer: Offer): { discount: number; net: number } {
  const procent = offer.discountEnabled ? parseNumber(offer.discountPercent) : 0;
  const discount = Math.round(kwota * procent) / 100;
  return { discount, net: kwota - discount };
}

export function offerTotals(offer: Offer): OfferTotals {
  const grupy = offer.groups || [];
  const itemsSum = grupy.filter((g) => !g.variant).reduce((suma, g) => suma + groupSum(g), 0);
  const { discount: discountAmount, net: total } = poRabacie(itemsSum, offer);
  const variants = grupy
    .map((g, i) => ({ g, i }))
    .filter(({ g }) => g.variant)
    .map(({ g, i }) => ({
      id: g.id,
      label: groupLabel(grupy, i),
      total: poRabacie(groupSum(g), offer).net
    }));
  const deliveryAmount =
    offer.deliveryEnabled && !offer.deliveryNotApplicable ? parseNumber(offer.deliveryPrice) : 0;
  return { itemsSum, discountAmount, total, deliveryAmount, variants };
}

/* ---------------- Koszt własny i marża (tylko w programie) ---------------- */

/** Koszt własny pozycji: ilość × koszt za sztukę. */
export function itemCost(item: OfferItem): number {
  const koszt = String(item.cost ?? '').trim();
  if (!koszt) return 0;
  return parseNumber(item.qty) * parseNumber(koszt);
}

export interface OfferCosts {
  /** Koszt własny pozycji podstawowych */
  costSum: number;
  /** Cena całkowita minus koszt własny */
  margin: number;
  /** Marża w procentach ceny całkowitej */
  marginPercent: number;
  /** Czy w ofercie wpisano choć jeden koszt — bez tego marża nic nie znaczy */
  hasCosts: boolean;
}

export function offerCosts(offer: Offer): OfferCosts {
  const podstawowe = (offer.groups || []).filter((g) => !g.variant);
  const costSum = podstawowe.reduce((suma, g) => suma + g.items.reduce((s, it) => s + itemCost(it), 0), 0);
  const hasCosts = podstawowe.some((g) => g.items.some((it) => String(it.cost ?? '').trim() !== ''));
  const { total } = offerTotals(offer);
  const margin = total - costSum;
  const marginPercent = total ? (margin / total) * 100 : 0;
  return { costSum, margin, marginPercent, hasCosts };
}

/* ------------------- Oferty bez odpowiedzi (przypomnienia) ------------------- */

export interface OfferFollowUp {
  offer: Offer;
  /** Ile dni minęło od wysłania (albo od daty wystawienia, gdy nie wysłano mailem) */
  days: number;
}

const DZIEN_MS = 24 * 60 * 60 * 1000;

/** Data, od której liczymy czekanie: wysyłka maila, a gdy jej nie było — data oferty. */
function odKiedyCzeka(offer: Offer): number | null {
  const zrodlo = offer.emailedAt || (offer.date ? offer.date + 'T12:00:00' : '');
  if (!zrodlo) return null;
  const t = new Date(zrodlo).getTime();
  return Number.isFinite(t) ? t : null;
}

/** Wysłane oferty, na które klient nie odpowiedział dłużej niż `afterDays` dni. */
export function offersAwaitingReply(offers: Offer[], afterDays: number, now: Date = new Date()): OfferFollowUp[] {
  if (!(afterDays > 0)) return [];
  const lista: OfferFollowUp[] = [];
  for (const offer of offers || []) {
    if (offer.status !== 'wyslana') continue;
    const od = odKiedyCzeka(offer);
    if (od === null) continue;
    const days = Math.floor((now.getTime() - od) / DZIEN_MS);
    if (days >= afterDays) lista.push({ offer, days });
  }
  return lista.sort((a, b) => b.days - a.days);
}

const NAGLOWKI: Record<OfferColumnHeader, string> = {
  material: 'Produkt (+ Materiał)',
  size: 'Produkt (+ Wymiar)',
  materialSize: 'Produkt (+ Materiał + Wymiar)',
  plain: 'Produkt'
};

export function columnHeaderLabel(header: OfferColumnHeader): string {
  return NAGLOWKI[header] || NAGLOWKI.material;
}

/** Nazwa pliku PDF w formacie stosowanym dotąd przez firmę. */
export function offerFileName(offer: Offer): string {
  const [r, m, d] = (offer.date || '').split('-');
  const data = r && m && d ? `${d}.${m}.${r}` : '';
  const klient = (offer.client || 'oferta')
    .replace(/[\\/:*?"<>|]/g, '-')
    .trim()
    .replace(/\s+/g, '_');
  return `Oferta_cenowa_${data}_${klient}.pdf`;
}

/** Data ważności oferty = data wystawienia + liczba dni. */
export function validUntil(offer: Offer): string {
  if (!offer.validityEnabled) return '';
  const dni = parseNumber(offer.validityDays);
  if (!dni || !offer.date) return '';
  const d = new Date(offer.date + 'T12:00:00');
  d.setDate(d.getDate() + dni);
  const dwie = (n: number) => String(n).padStart(2, '0');
  return `${dwie(d.getDate())}.${dwie(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export const OFFER_STATUS_LABELS: Record<Offer['status'], string> = {
  szkic: 'Szkic',
  wyslana: 'Wysłana',
  zaakceptowana: 'Zaakceptowana',
  odrzucona: 'Odrzucona'
};

/** Osoby, które mogą wystawiać oferty: lista z Ustawień plus pracownicy
 *  kontrahenta „Lechrol”, jeśli taki jest w bazie. */
export function availableIssuers(state: {
  settings: { issuers: string[] };
  contractors: { name: string; employees?: { name: string }[] }[];
}): string[] {
  const zbior = new Set<string>((state.settings.issuers || []).map((n) => n.trim()).filter(Boolean));
  for (const k of state.contractors || []) {
    if (!/lechrol/i.test(k.name || '')) continue;
    for (const p of k.employees || []) {
      const imie = (p.name || '').trim();
      if (imie) zbior.add(imie);
    }
  }
  return Array.from(zbior);
}

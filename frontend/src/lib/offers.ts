import { Offer, OfferColumnHeader, OfferGroup, OfferItem } from '../types';

/** Liczba z pola tekstowego — przecinek i spacje jak w polskim zapisie kwot. */
export function parseNumber(value: unknown): number {
  const txt = String(value ?? '').replace(/\s/g, '').replace(',', '.');
  if (!txt) return 0;
  const n = Number(txt);
  return Number.isFinite(n) ? n : 0;
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

/** Numery Lp. dla każdej grupy — ciągłe albo od nowa w każdej tabeli. */
export function groupLpNumbers(groups: OfferGroup[], continuous: boolean): string[][] {
  let licznik = 0;
  return groups.map((g) => {
    if (!continuous) licznik = 0;
    return g.items.map((it) => {
      licznik += 1;
      const wlasny = String(it.lpOverride ?? '').trim();
      return wlasny || String(licznik);
    });
  });
}

export interface OfferTotals {
  /** Suma wszystkich pozycji, przed rabatem */
  itemsSum: number;
  discountAmount: number;
  /** Po odjęciu rabatu — kwota pokazywana jako „Cena całkowita” */
  total: number;
  deliveryAmount: number;
}

export function offerTotals(offer: Offer): OfferTotals {
  const itemsSum = (offer.groups || []).reduce(
    (suma, g) => suma + g.items.reduce((s, it) => s + itemTotal(it), 0),
    0
  );
  const procent = offer.discountEnabled ? parseNumber(offer.discountPercent) : 0;
  const discountAmount = Math.round(itemsSum * procent) / 100;
  const total = itemsSum - discountAmount;
  const deliveryAmount =
    offer.deliveryEnabled && !offer.deliveryNotApplicable ? parseNumber(offer.deliveryPrice) : 0;
  return { itemsSum, discountAmount, total, deliveryAmount };
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

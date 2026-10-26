import { Offer, OfferColumnHeader, OfferGroup, OfferItem, OfferSpecRow } from '../types';
import { DiscountLine, discountLines, discountTotal } from './discounts';
import {
  groupEffectiveSum,
  isOptionGroup,
  optionChosen,
  optionLabel,
  fullOptionItem,
  optionSum,
  selectedOption,
  selectedItems
} from './offerOptions';

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
/** Suma dopłat doliczonych do jednej sztuki — profil montażowy, prowadnice,
 *  silnik. Kwoty są zapisane przy pozycji, więc stara oferta się nie zmieni,
 *  gdy producent podniesie cennik. */
export function itemSurcharges(item: OfferItem): number {
  return (item.surcharges || []).reduce((s, d) => s + (Number(d.amount) || 0), 0);
}

/** Cena jednej sztuki razem z dopłatami. Na dokumencie klient widzi jedną
 *  kwotę — dopłaty są naszym sposobem jej policzenia, nie jego sprawą. */
export function itemUnitPrice(item: OfferItem): number {
  return parseNumber(item.unitPrice) + itemSurcharges(item);
}

export function itemTotal(item: OfferItem): number {
  const nadpisana = String(item.totalOverride ?? '').trim();
  if (nadpisana) return parseNumber(nadpisana);
  return parseNumber(item.qty) * itemUnitPrice(item);
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

/** Wycena jednej opcji: kwota jej pozycji i cena całkowita całej oferty,
 *  gdyby klient wziął właśnie ją. */
export interface OfferOptionTotal {
  id: string;
  label: string;
  /** Suma pozycji tej opcji, przed rabatem */
  sum: number;
  /** Cena całkowita oferty z tą opcją — pozycje wspólne plus ta opcja, po rabacie */
  total: number;
  /** O ile drożej niż najtańsza opcja w tej grupie */
  diff: number;
  /** Czy to ta opcja jest teraz wliczona w cenę całkowitą oferty */
  selected: boolean;
}

export interface OfferOptionGroupTotals {
  groupId: string;
  label: string;
  /** Czy ktoś świadomie wskazał opcję, czy liczymy domyślnie pierwszą */
  chosen: boolean;
  options: OfferOptionTotal[];
}

export interface OfferTotals {
  /** Suma pozycji podstawowych (bez wariantów), przed rabatem.
   *  Grupa opcji wchodzi tu kwotą swojej wybranej opcji — opcje są
   *  alternatywami, więc nigdy nie sumują się ze sobą. */
  itemsSum: number;
  discountAmount: number;
  /** Po odjęciu rabatu — kwota pokazywana jako „Cena całkowita” */
  total: number;
  deliveryAmount: number;
  /** Wyceny wariantów alternatywnych — każda osobno, poza ceną całkowitą.
   *  Stary mechanizm; nowe oferty używają `optionGroups`. */
  variants: OfferVariantTotal[];
  /** Grupy opcji z pełną ceną oferty policzoną dla każdej opcji */
  optionGroups: OfferOptionGroupTotals[];
  /** Rabat w rozbiciu na stawki — jedna linia na każdy użyty procent.
   *  Przy jednym rabacie na całość jest to jedna linia i dokument wygląda
   *  tak jak dotąd. */
  discounts: DiscountLine[];
}

/** Rabat liczony od pozycji: każdy produkt swoją stawką. Pozycje podajemy
 *  wprost, bo przy opcjach kwota zależy od tego, którą z nich liczymy. */
function poRabacie(items: OfferItem[], offer: Offer): { discount: number; net: number } {
  const kwota = items.reduce((s, it) => s + itemTotal(it), 0);
  const discount = discountTotal(items, offer);
  return { discount, net: kwota - discount };
}

export function offerTotals(offer: Offer): OfferTotals {
  const grupy = offer.groups || [];
  const podstawowe = grupy.filter((g) => !g.variant);
  const liczone = podstawowe.flatMap((g) => selectedItems(g));
  const itemsSum = podstawowe.reduce((suma, g) => suma + groupEffectiveSum(g), 0);
  const discounts = discountLines(liczone, offer);
  const discountAmount = discounts.reduce((s, l) => s + l.amount, 0);
  const total = itemsSum - discountAmount;
  const variants = grupy
    .map((g, i) => ({ g, i }))
    .filter(({ g }) => g.variant)
    .map(({ g, i }) => ({
      id: g.id,
      label: groupLabel(grupy, i),
      total: poRabacie(g.items, offer).net
    }));

  // Cena przy opcji to cena całej oferty, a nie samej opcji: pozycje wspólne
  // zostają, zmienia się tylko ta jedna grupa. Klient porównuje kwoty końcowe
  // i nie musi niczego dodawać w głowie.
  const optionGroups: OfferOptionGroupTotals[] = grupy
    .map((g, i) => ({ g, i }))
    .filter(({ g }) => !g.variant && isOptionGroup(g))
    .map(({ g, i }) => {
      // Pozostałe pozycje oferty zostają bez zmian — podmieniamy tylko tę
      // jedną grupę, żeby kwota odpowiadała na pytanie „ile wyjdzie, jeśli
      // wezmę tę opcję”. Rabat liczy się od nowa, bo każdy produkt ma swoją
      // stawkę i inna opcja może oznaczać inny rabat.
      const bezTejGrupy = podstawowe.filter((x) => x.id !== g.id).flatMap((x) => selectedItems(x));
      const wybrana = selectedOption(g);
      const wyceny = (g.options || []).map((o, oi) => {
        const sum = optionSum(o);
        const zTaOpcja = [...bezTejGrupy, ...o.items.map((it, j) => fullOptionItem(g.items[j] || it, it))];
        return {
          id: o.id,
          label: optionLabel(o, oi),
          sum,
          total: poRabacie(zTaOpcja, offer).net,
          diff: 0,
          selected: !!wybrana && o.id === wybrana.id
        };
      });
      const najtansza = wyceny.length ? Math.min(...wyceny.map((w) => w.total)) : 0;
      return {
        groupId: g.id,
        label: groupLabel(grupy, i),
        chosen: optionChosen(g),
        options: wyceny.map((w) => ({ ...w, diff: w.total - najtansza }))
      };
    });

  const deliveryAmount = offer.deliveryEnabled ? parseNumber(offer.deliveryPrice) : 0;
  return { itemsSum, discountAmount, total, deliveryAmount, variants, optionGroups, discounts };
}

/* ------------------------------ VAT ------------------------------ */

/** Stawka podstawowa. Ceny w cenniku są brutto, więc netto liczymy wstecz. */
export const VAT_RATE = 23;

/** Stawki do wyboru przy ofercie. 8% obowiązuje przy dostawie z montażem
 *  w budownictwie objętym społecznym programem mieszkaniowym — czyli przy
 *  większości montaży w mieszkaniach i domach. Poza nim obowiązuje 23%. */
export const VAT_RATES = [23, 8] as const;

/** Stawka tej oferty — z zapisanej wartości albo podstawowa. */
export function offerVatRate(offer: Pick<Offer, 'vatRate'>): number {
  const r = Number(offer?.vatRate);
  return isFinite(r) && r > 0 ? r : VAT_RATE;
}

export interface OfferVat {
  rate: number;
  netto: number;
  vat: number;
  brutto: number;
}

/** Rozbicie kwoty brutto na netto i VAT — zaokrąglane do groszy. */
export function offerVat(brutto: number, rate: number = VAT_RATE): OfferVat {
  const netto = Math.round((brutto / (1 + rate / 100)) * 100) / 100;
  return { rate, netto, vat: Math.round((brutto - netto) * 100) / 100, brutto };
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
  // Marża ma odpowiadać cenie całkowitej, więc z grupy opcji liczymy koszt tej
  // opcji, która jest w tej cenie — nie wszystkich naraz.
  const podstawowe = (offer.groups || [])
    .filter((g) => !g.variant)
    .map((g) => selectedItems(g));
  const costSum = podstawowe.reduce((suma, items) => suma + items.reduce((s, it) => s + itemCost(it), 0), 0);
  const hasCosts = podstawowe.some((items) => items.some((it) => String(it.cost ?? '').trim() !== ''));
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
  material: 'Produkt i materiał',
  size: 'Produkt i wymiar',
  materialSize: 'Produkt, materiał i wymiar',
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
  // Numer na początku nazwy układa pliki w folderze tak samo, jak w programie
  const numer = (offer.number || '').replace(/[\\/:*?"<>|]/g, '-');
  return `${numer ? numer + '_' : ''}Oferta_cenowa_${data}_${klient}.pdf`;
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
/** Telefon osoby wystawiającej. Najpierw numer przypisany w Ustawieniach,
 *  potem numer z kartoteki pracownika kontrahenta „Lechrol” — żeby nie
 *  trzymać tej samej informacji w dwóch miejscach. */
export function issuerPhone(
  state: {
    settings: { issuerPhones?: Record<string, string> };
    contractors: { name: string; employees?: { name: string; phone?: string }[] }[];
  },
  name: string
): string {
  const imie = (name || '').trim();
  if (!imie) return '';
  const przypisany = (state.settings.issuerPhones || {})[imie];
  if (przypisany && przypisany.trim()) return przypisany.trim();
  for (const k of state.contractors || []) {
    if (!/lechrol/i.test(k.name || '')) continue;
    for (const p of k.employees || []) {
      if ((p.name || '').trim() === imie && (p.phone || '').trim()) return String(p.phone).trim();
    }
  }
  return '';
}

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

/** Wypełnione pary specyfikacji, z obciętymi spacjami. Jedno miejsce dla
 *  wydruku i dla edytora: pusty wiersz, który ktoś dodał i zostawił, nie ma
 *  po co iść ani na dokument, ani do schowka przy kopiowaniu. */
export function filledSpec(spec?: OfferSpecRow[]): OfferSpecRow[] {
  return (spec || [])
    .map((w) => ({ label: String(w.label || '').trim(), value: String(w.value || '').trim() }))
    .filter((w) => w.label || w.value);
}

/** „1 wiersz", „3 wiersze", „5 wierszy" — bez odmiany komunikaty zgrzytają. */
export function wierszyOdmiana(n: number): string {
  const jednosci = n % 10;
  const dziesiatki = n % 100;
  if (n === 1) return '1 wiersz';
  if (jednosci >= 2 && jednosci <= 4 && (dziesiatki < 12 || dziesiatki > 14)) return `${n} wiersze`;
  return `${n} wierszy`;
}

/** Lista z elementem przesuniętym o `krok` miejsc. Poza zakresem oddaje tę
 *  samą listę — przycisk na skraju ma nic nie robić, a nie zawijać wiersza
 *  z góry na dół. */
export function movedBy<T>(lista: T[], i: number, krok: number): T[] {
  const cel = i + krok;
  if (i < 0 || i >= lista.length || cel < 0 || cel >= lista.length || krok === 0) return lista;
  const kopia = lista.slice();
  const [wyjety] = kopia.splice(i, 1);
  kopia.splice(cel, 0, wyjety);
  return kopia;
}

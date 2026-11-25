/** Pomiary przychodzące mailem — rozkładanie wiadomości na pozycje wyceny.
 *
 *  Pomiarowiec pisze z budowy zwykłego maila, zawsze w tym samym układzie:
 *
 *      Żaluzja drewniana 25 kolor do ustalenia   <- produkt, raz na całą wiadomość
 *      Kuchnia                                   <- pomieszczenie
 *      85,7 x 109 L                              <- szerokość x wysokość, strony
 *      95,5 x 120 L
 *
 *  Litery na końcu wymiaru niosą **dwie** rzeczy naraz: ile sztuk i gdzie
 *  mechanizm. „L" to jedna sztuka lewa, „LP" dwie sztuki — lewa i prawa,
 *  „LLPP" cztery sztuki: dwie lewe i dwie prawe. Każda litera to jedna sztuka.
 *
 *  Czego ten moduł nie robi: nie zgaduje. Linia, której nie rozumie, i wymiar
 *  bez liter trafiają na listę rzeczy do uzupełnienia, a nie dostają wartości
 *  domyślnej. Z tej wyceny powstaje towar — zgadnięta strona sterowania to
 *  źle uszyta żaluzja, nie literówka do poprawienia.
 */

import type { OfferGroup, OfferItem, OfferSpecRow, PriceTable } from '../types';
import { priceItem } from './pricing';
import { uid } from './storage';

export type ControlSide = 'lewa' | 'prawa' | '';

export interface MeasuredItem {
  /** Pomieszczenie — staje się podpisem tabeli w ofercie */
  room: string;
  /** Szerokość w centymetrach */
  width: number;
  /** Wysokość w centymetrach */
  height: number;
  side: ControlSide;
  qty: number;
  /** Linia, z której to powstało — do pokazania przy wątpliwości */
  source: string;
}

export interface ParsedMeasurement {
  /** Klient albo obiekt — z tematu wiadomości */
  client: string;
  /** Pierwsza linia: produkt wraz z tym, co pomiarowiec dopisał */
  product: string;
  items: MeasuredItem[];
  /** Linie, których nie rozumiemy — pokazujemy je człowiekowi */
  unknown: string[];
  /** Ile pozycji czeka na uzupełnienie strony sterowania */
  missingSide: number;
}

/** `85,7 x 109 L` — przecinek dziesiętny, dowolny iks, litery nieobowiązkowe. */
const WYMIAR = /^(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*([a-zA-Z]*)$/;

/** Twarde spacje z klienta pocztowego psują wszystkie porównania. */
function oczysc(linia: string): string {
  return linia.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

function naLiczbe(tekst: string): number {
  return Number(tekst.replace(',', '.'));
}

/** Litery na sztuki: „LLPP" to dwie lewe i dwie prawe, w kolejności pojawienia.
 *  Zwraca `null`, gdy trafi się litera spoza L/P — wtedy nie zgadujemy. */
export function sidesFromLetters(litery: string): { side: ControlSide; qty: number }[] | null {
  const znaki = litery.toUpperCase().split('');
  if (!znaki.length) return [{ side: '', qty: 1 }];
  if (znaki.some((z) => z !== 'L' && z !== 'P')) return null;
  const sztuki: { side: ControlSide; qty: number }[] = [];
  for (const z of znaki) {
    const strona: ControlSide = z === 'L' ? 'lewa' : 'prawa';
    const byla = sztuki.find((s) => s.side === strona);
    if (byla) byla.qty += 1;
    else sztuki.push({ side: strona, qty: 1 });
  }
  return sztuki;
}

export function parseMeasurementMail(subject: string, text: string): ParsedMeasurement {
  const wynik: ParsedMeasurement = {
    client: oczysc(subject || ''),
    product: '',
    items: [],
    unknown: [],
    missingSide: 0
  };
  let pokoj = '';

  for (const surowa of String(text || '').split(/\r?\n/)) {
    const linia = oczysc(surowa);
    if (!linia) continue;

    const m = WYMIAR.exec(linia);
    if (m) {
      const sztuki = sidesFromLetters(m[3]);
      if (!sztuki) {
        wynik.unknown.push(linia);
        continue;
      }
      const width = naLiczbe(m[1]);
      const height = naLiczbe(m[2]);
      for (const s of sztuki) {
        if (!s.side) wynik.missingSide += 1;
        wynik.items.push({ room: pokoj, width, height, side: s.side, qty: s.qty, source: linia });
      }
      continue;
    }

    // Pierwsza linia bez wymiaru opisuje produkt — reszta takich linii to
    // pomieszczenia. Nazwy pomieszczeń są krótkie i bez cyfr; dłuższe zdanie
    // albo linia z liczbami to coś, czego nie znamy.
    if (!wynik.product) {
      wynik.product = linia;
    } else if (linia.length <= 40 && !/\d/.test(linia)) {
      pokoj = linia;
    } else {
      wynik.unknown.push(linia);
    }
  }

  return wynik;
}

/** Czy z tej wiadomości da się w ogóle zrobić wycenę. */
export function hasMeasurements(p: ParsedMeasurement): boolean {
  return p.items.length > 0;
}

/* ------------------ Z pomiaru na pozycje wyceny ------------------ */

/** Wymiar w opisie pozycji — tak, jak wpisuje go człowiek. */
function opisWymiaru(it: MeasuredItem): string {
  const liczba = (n: number) => String(n).replace('.', ',');
  return `${liczba(it.width)} x ${liczba(it.height)} cm`;
}

/** Jedna pozycja oferty z jednego pomiaru. Nazwa produktu przychodzi z góry
 *  (jedna na całą wiadomość), bo pomiarowiec pisze ją raz w pierwszej linii. */
export function itemFromMeasurement(m: MeasuredItem, product: string): OfferItem {
  const spec: OfferSpecRow[] = [
    { label: 'Szerokość całkowita', value: `${String(m.width).replace('.', ',')} cm` },
    { label: 'Wysokość całkowita', value: `${String(m.height).replace('.', ',')} cm` },
    // Puste pole zostaje puste: człowiek ma je uzupełnić, zanim oferta pójdzie
    // dalej. Zgadnięta strona sterowania to źle uszyta żaluzja.
    { label: 'Strona sterowania', value: m.side }
  ];
  return {
    name: product,
    material: opisWymiaru(m),
    qty: String(m.qty),
    unitPrice: '',
    spec
  };
}

/** Grupy oferty z pomiaru: jedna tabela na pomieszczenie, w kolejności
 *  z wiadomości. Pozycje bez pomieszczenia trafiają do pierwszej tabeli bez
 *  podpisu — tak, jak stoją w mailu.
 *
 *  `tables` to cennik producenta; gdy go podamy, ceny podstawiają się od razu
 *  dokładnie tak, jak po wpisaniu wymiaru ręcznie w edytorze. Pozycja, dla
 *  której cennik nie ma kratki, zostaje z pustą ceną — do uzupełnienia. */
export function groupsFromMeasurement(
  parsed: ParsedMeasurement,
  tables?: PriceTable[],
  nowyId: () => string = uid
): OfferGroup[] {
  const grupy: OfferGroup[] = [];
  for (const m of parsed.items) {
    let grupa = grupy.find((g) => (g.title || '') === m.room);
    if (!grupa) {
      grupa = { id: nowyId(), header: 'size', title: m.room, items: [] };
      grupy.push(grupa);
    }
    const poz = itemFromMeasurement(m, parsed.product);
    const wycena = tables && tables.length ? priceItem(poz, tables) : null;
    grupa.items.push(
      wycena && wycena.status === 'ok' && typeof wycena.cost === 'number'
        ? { ...poz, unitPrice: String(wycena.cost), priceSource: 'cennik' }
        : poz
    );
  }
  return grupy;
}

/** Ile pozycji nie dostało ceny z cennika — po tym widać, czy wycena jest
 *  gotowa do sprawdzenia, czy trzeba ją jeszcze uzupełnić ręcznie. */
export function withoutPrice(grupy: OfferGroup[]): number {
  return grupy.reduce((s, g) => s + g.items.filter((i) => !String(i.unitPrice || '').trim()).length, 0);
}

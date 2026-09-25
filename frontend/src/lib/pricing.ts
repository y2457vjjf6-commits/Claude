import { OfferItem, PriceTable } from '../types';

/* =======================================================================
   Cennik producenta: tabela krzyżowa szerokość × wysokość.
   Producenci rolet nie podają ceny za sztukę ani za metr — podają siatkę,
   w której szukamy pierwszej szerokości i pierwszej wysokości NIE MNIEJSZEJ
   niż zamówiony wymiar. Tak samo liczy to człowiek z cennikiem na biurku.
   ======================================================================= */

/* ------------------------------ Wymiary ------------------------------ */

/** Sprowadza liczbę do centymetrów. Bez jednostki zgadujemy po rzędzie
 *  wielkości: 1,86 to metry, 1860 to milimetry, 186 to centymetry. */
export function toCm(wartosc: number, jednostka?: string): number {
  const j = (jednostka || '').toLowerCase();
  if (j === 'mm') return wartosc / 10;
  if (j === 'm') return wartosc * 100;
  if (j === 'cm') return wartosc;
  if (wartosc > 0 && wartosc < 10) return wartosc * 100;
  if (wartosc >= 1000) return wartosc / 10;
  return wartosc;
}

function naLiczbe(tekst: string): number {
  return parseFloat(tekst.replace(',', '.'));
}

export interface Wymiar {
  /** Szerokość w cm */
  width: number;
  /** Wysokość w cm */
  height: number;
}

const L = '(\\d+(?:[.,]\\d+)?)';
const PRZEZ = new RegExp(L + '\\s*[x×*]\\s*' + L + '\\s*(mm|cm|m)?\\b', 'i');
const OPISANE = new RegExp('szer\\w*\\.?\\s*:?\\s*' + L + '\\s*(mm|cm|m)?\\D{0,12}?wys\\w*\\.?\\s*:?\\s*' + L + '\\s*(mm|cm|m)?', 'i');

/** Wyciąga wymiar z opisu pozycji. Rozumie „186 x 202 cm”, „1,86×2,02 m”,
 *  „szer. 186 wys. 202”. Przyjęta kolejność to szerokość × wysokość. */
export function parseDimensions(...teksty: (string | undefined)[]): Wymiar | null {
  const tekst = teksty.filter(Boolean).join(' · ');
  if (!tekst) return null;

  const opis = OPISANE.exec(tekst);
  if (opis) {
    return {
      width: toCm(naLiczbe(opis[1]), opis[2]),
      height: toCm(naLiczbe(opis[3]), opis[4])
    };
  }

  const przez = PRZEZ.exec(tekst);
  if (przez) {
    const jednostka = przez[3];
    return {
      width: toCm(naLiczbe(przez[1]), jednostka),
      height: toCm(naLiczbe(przez[2]), jednostka)
    };
  }
  return null;
}

/* --------------------------- Dobór tabeli --------------------------- */

/** Kody materiału wypisane w pozycji — „Materiał C102” daje „C102”. */
function zawieraKod(tekst: string, kod: string): boolean {
  const k = kod.trim();
  if (!k) return false;
  const wzor = new RegExp('(?:^|[^\\p{L}\\p{N}])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}\\p{N}])', 'iu');
  return wzor.test(tekst);
}

/** Dobiera tabelę do pozycji. Dopasowanie po kodzie materiału jest mocniejsze
 *  niż po nazwie produktu — kod jednoznacznie wskazuje grupę cenową. */
export function matchTable(item: Pick<OfferItem, 'name' | 'material'>, tables: PriceTable[]): PriceTable | null {
  const nazwa = item.name || '';
  const material = item.material || '';
  const caly = `${nazwa} · ${material}`;
  let najlepsza: PriceTable | null = null;
  let najlepszyWynik = 0;

  for (const t of tables || []) {
    const kody = (t.materials || []).filter((k) => k.trim());
    const produkt = (t.product || '').trim();
    const pasujeKod = kody.some((k) => zawieraKod(caly, k));
    const pasujeProdukt = produkt ? caly.toLowerCase().includes(produkt.toLowerCase()) : false;

    // Tabela bez żadnego warunku łapie wszystko, ale najsłabiej — to ostatnia deska ratunku
    let wynik = 0;
    if (pasujeKod) wynik += 10;
    if (pasujeProdukt) wynik += 4;
    if (!kody.length && !produkt) wynik = 1;
    if (produkt && !pasujeProdukt && !pasujeKod) continue;
    if (kody.length && !pasujeKod && !pasujeProdukt) continue;

    if (wynik > najlepszyWynik) {
      najlepszyWynik = wynik;
      najlepsza = t;
    }
  }
  return najlepsza;
}

/* ---------------------------- Odczyt ceny ---------------------------- */

/** Pierwsza wartość nagłówka nie mniejsza niż zamówiony wymiar. */
function komorkaDla(naglowki: number[], wymiar: number): number {
  return naglowki.findIndex((w) => w >= wymiar - 0.001);
}

export interface OdczytCeny {
  cost: number;
  /** Szerokość i wysokość komórki, z której wzięto cenę (po zaokrągleniu w górę) */
  cellWidth: number;
  cellHeight: number;
}

/** Cena z tabeli dla podanego wymiaru — z zaokrągleniem w górę do siatki. */
export function lookupPrice(table: PriceTable, wymiar: Wymiar): OdczytCeny | null {
  const kol = komorkaDla(table.widths || [], wymiar.width);
  const wier = komorkaDla(table.heights || [], wymiar.height);
  if (kol < 0 || wier < 0) return null;
  const cena = table.prices?.[wier]?.[kol];
  if (cena === null || cena === undefined || !isFinite(cena)) return null;
  return { cost: cena, cellWidth: table.widths[kol], cellHeight: table.heights[wier] };
}

export type StatusWyceny =
  | 'ok'
  | 'brak-cennika'      // nie ma żadnej tabeli
  | 'brak-tabeli'       // żadna tabela nie pasuje do produktu/materiału
  | 'brak-wymiaru'      // w pozycji nie ma wymiaru
  | 'poza-tabela'       // wymiar większy niż największy w tabeli
  | 'brak-ceny';        // komórka pusta

export interface WycenaPozycji {
  status: StatusWyceny;
  cost?: number;
  wymiar?: Wymiar;
  table?: PriceTable;
  cellWidth?: number;
  cellHeight?: number;
}

/** Ile kosztuje nas ta pozycja według cennika. */
export function priceItem(item: Pick<OfferItem, 'name' | 'material'>, tables: PriceTable[]): WycenaPozycji {
  if (!tables || !tables.length) return { status: 'brak-cennika' };
  const table = matchTable(item, tables);
  if (!table) return { status: 'brak-tabeli' };
  const wymiar = parseDimensions(item.material, item.name);
  if (!wymiar) return { status: 'brak-wymiaru', table };
  const odczyt = lookupPrice(table, wymiar);
  if (!odczyt) {
    const zaDuzy =
      wymiar.width > Math.max(...(table.widths || [0])) || wymiar.height > Math.max(...(table.heights || [0]));
    return { status: zaDuzy ? 'poza-tabela' : 'brak-ceny', wymiar, table };
  }
  return { status: 'ok', cost: odczyt.cost, wymiar, table, cellWidth: odczyt.cellWidth, cellHeight: odczyt.cellHeight };
}

/** Krótkie wyjaśnienie dla człowieka — skąd ta kwota albo czemu jej nie ma. */
export function opiszWycene(w: WycenaPozycji): string {
  switch (w.status) {
    case 'ok':
      return `${w.table?.name || 'Cennik'} · ${formatCm(w.cellWidth)} × ${formatCm(w.cellHeight)} cm`;
    case 'brak-cennika':
      return 'Cennik jest pusty — wczytaj tabele w zakładce Cennik.';
    case 'brak-tabeli':
      return 'Żadna tabela cennika nie pasuje do tego produktu ani materiału.';
    case 'brak-wymiaru':
      return 'Dopisz wymiar w drugiej linijce, np. „186 x 202 cm”.';
    case 'poza-tabela':
      return 'Wymiar wykracza poza tabelę producenta — cenę trzeba ustalić u niego.';
    case 'brak-ceny':
      return 'Producent nie podaje ceny dla tego wymiaru.';
  }
}

export function formatCm(wartosc?: number): string {
  if (wartosc === undefined) return '';
  return Number.isInteger(wartosc) ? String(wartosc) : String(wartosc).replace('.', ',');
}

/* ------------------------- Wczytanie z wklejenia ------------------------- */

/** Rozbija wiersz na komórki. Kopiowanie z PDF-a daje zwykle tabulatory albo
 *  kilka spacji między kolumnami, a pojedyncza spacja bywa wewnątrz liczby
 *  („1 234,50”) — dlatego najpierw próbujemy szerokiego rozdzielenia. */
function komorki(wiersz: string): string[][] {
  const szerokie = wiersz.split(/\t|\s{2,}/).map((c) => c.trim()).filter(Boolean);
  const waskie = wiersz.split(/\s+/).map((c) => c.trim()).filter(Boolean);
  return [szerokie, waskie];
}

const CZYSTA_LICZBA = /^-?\d+(?:[.,]\d+)?$/;

function liczbaZKomorki(tekst: string): number | null {
  const czysty = tekst
    .replace(/ /g, ' ')
    .replace(/(?<=\d)\s+(?=\d{3}\b)/g, '')   // spacja jako separator tysięcy
    .replace(/(zł|pln|,-)/gi, '')
    .trim();
  if (!CZYSTA_LICZBA.test(czysty)) return null;
  const liczba = parseFloat(czysty.replace(',', '.'));
  return isFinite(liczba) ? liczba : null;
}

/** Zamienia wiersz na liczby przy takim podziale, który daje ich najwięcej
 *  (albo dokładnie tyle, ile oczekujemy). */
function liczbyZWiersza(wiersz: string, oczekiwane?: number): (number | null)[] {
  const warianty = komorki(wiersz).map((cz) => cz.map(liczbaZKomorki));
  if (oczekiwane !== undefined) {
    const trafiony = warianty.find((w) => w.filter((v) => v !== null).length === oczekiwane);
    if (trafiony) return trafiony;
  }
  return warianty.reduce((a, b) => (b.filter((v) => v !== null).length > a.filter((v) => v !== null).length ? b : a));
}

export interface WczytanaTabela {
  widths: number[];
  heights: number[];
  prices: (number | null)[][];
  /** Co poszło nie tak — pokazujemy człowiekowi zamiast po cichu zgadywać */
  problems: string[];
}

/** Czyta tabelę wklejoną z cennika: pierwszy wiersz to szerokości,
 *  każdy kolejny zaczyna się od wysokości, a dalej idą ceny. */
export function parsePastedTable(tekst: string): WczytanaTabela {
  const problems: string[] = [];
  const wiersze = (tekst || '').split(/\r?\n/).filter((w) => w.trim());
  if (!wiersze.length) return { widths: [], heights: [], prices: [], problems: ['Nie wkleiłeś nic.'] };

  const naglowek = liczbyZWiersza(wiersze[0]).filter((v): v is number => v !== null);
  if (naglowek.length < 2) {
    return { widths: [], heights: [], prices: [], problems: ['Pierwszy wiersz musi zawierać szerokości z nagłówka tabeli.'] };
  }

  const widths = naglowek;
  const heights: number[] = [];
  const prices: (number | null)[][] = [];

  for (let i = 1; i < wiersze.length; i++) {
    const liczby = liczbyZWiersza(wiersze[i], widths.length + 1);
    const wysokosc = liczby[0];
    if (wysokosc === null || wysokosc === undefined) {
      problems.push(`Wiersz ${i + 1}: nie widzę wysokości na początku — pomijam.`);
      continue;
    }
    const ceny = liczby.slice(1);
    if (ceny.length < widths.length) {
      problems.push(`Wysokość ${wysokosc}: ${ceny.length} z ${widths.length} cen — brakujące zostały puste.`);
    } else if (ceny.length > widths.length) {
      problems.push(`Wysokość ${wysokosc}: ${ceny.length} cen przy ${widths.length} szerokościach — nadmiarowe pominięto.`);
    }
    heights.push(wysokosc);
    prices.push(Array.from({ length: widths.length }, (_, k) => (ceny[k] === undefined ? null : ceny[k])));
  }

  if (!heights.length) problems.push('Nie znalazłem ani jednego wiersza z wysokością i cenami.');
  return { widths, heights, prices, problems };
}

/* --------------------------- Kontrola odczytu --------------------------- */

export interface Usterka {
  row: number;
  col: number;
  /** Co jest nie tak — gotowe zdanie do dymka przy komórce */
  reason: string;
}

/** W cenniku producenta cena nigdy nie maleje, gdy roleta rośnie. Każde
 *  odstępstwo to prawie zawsze błąd przepisania — łatwiej znaleźć go tak niż
 *  czytając tysiąc liczb po kolei. */
export function checkTable(table: Pick<PriceTable, 'widths' | 'heights' | 'prices'>): Usterka[] {
  const usterki: Usterka[] = [];
  const { widths, heights, prices } = table;

  for (let w = 0; w < heights.length; w++) {
    for (let k = 0; k < widths.length; k++) {
      const cena = prices[w]?.[k];
      if (cena === null || cena === undefined) continue;
      if (cena <= 0) {
        usterki.push({ row: w, col: k, reason: 'Cena zerowa albo ujemna.' });
        continue;
      }
      const wLewo = prices[w]?.[k - 1];
      if (k > 0 && wLewo !== null && wLewo !== undefined && cena < wLewo) {
        usterki.push({ row: w, col: k, reason: `Taniej niż węższa roleta (${formatCm(widths[k - 1])} cm) — sprawdź odczyt.` });
        continue;
      }
      const wGore = prices[w - 1]?.[k];
      if (w > 0 && wGore !== null && wGore !== undefined && cena < wGore) {
        usterki.push({ row: w, col: k, reason: `Taniej niż niższa roleta (${formatCm(heights[w - 1])} cm) — sprawdź odczyt.` });
      }
    }
  }
  return usterki;
}

/** Nagłówki muszą rosnąć — inaczej szukanie ceny „w górę” daje bzdury. */
export function checkHeaders(table: Pick<PriceTable, 'widths' | 'heights'>): string[] {
  const uwagi: string[] = [];
  const rosnaco = (t: number[]) => t.every((v, i) => i === 0 || v > t[i - 1]);
  if (!rosnaco(table.widths)) uwagi.push('Szerokości w nagłówku nie rosną po kolei.');
  if (!rosnaco(table.heights)) uwagi.push('Wysokości nie rosną po kolei.');
  return uwagi;
}

/** Ile komórek czeka jeszcze na cenę — widoczne przy tabeli. */
export function pustePola(table: Pick<PriceTable, 'widths' | 'heights' | 'prices'>): number {
  let puste = 0;
  for (let w = 0; w < table.heights.length; w++) {
    for (let k = 0; k < table.widths.length; k++) {
      const c = table.prices[w]?.[k];
      if (c === null || c === undefined) puste++;
    }
  }
  return puste;
}

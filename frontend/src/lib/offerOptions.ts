/** Opcje w ofercie: „pozycja xxx albo yyy albo zzz”.
 *
 *  Grupa opcji ma jeden szkielet pozycji — to, co się nie zmienia: nazwa
 *  produktu, pomieszczenie, wymiar, ilość. Każda opcja podstawia pod ten
 *  szkielet własny materiał i cenę. Dzięki temu tabela porównawcza na
 *  ofercie zawsze ma zgodne wiersze i klient czyta w poprzek: ten sam
 *  salon, trzy materiały, trzy ceny.
 *
 *  Opcja nie jest doliczana obok pozycji podstawowych — jest zamiast siebie
 *  nawzajem. Dlatego liczymy dla każdej pełną cenę całkowitą oferty:
 *  pozycje wspólne plus ta jedna opcja. Klient porównuje kwoty końcowe,
 *  a nie same różnice, i nie musi nic dodawać w głowie.
 */
import { Offer, OfferGroup, OfferItem, OfferOption, OfferSpecRow } from '../types';
import { uid } from './storage';
import { groupSum, isItemEmpty, itemTotal } from './offers';
import { isDimensionField } from './pricing';

/** Czy grupa jest grupą opcji, czy zwykłą tabelą pozycji. */
export function isOptionGroup(g: OfferGroup | undefined): boolean {
  return !!g && Array.isArray(g.options) && g.options.length > 0;
}

/** „Opcja A”, „Opcja B”… — kolejna litera alfabetu. */
export function optionLetter(index: number): string {
  return 'Opcja ' + String.fromCharCode(65 + index);
}

/** Podpis opcji: własna nazwa albo automatyczna litera. */
export function optionLabel(option: OfferOption | undefined, index: number): string {
  return String(option?.title || '').trim() || optionLetter(index);
}

/** Opcja wliczona w cenę całkowitą. Bez wyraźnego wyboru liczymy pierwszą —
 *  trzeba coś policzyć — ale `optionChosen` mówi, że nikt jeszcze nie wybrał,
 *  więc na wydruku nie udajemy decyzji klienta. */
export function selectedOption(g: OfferGroup): OfferOption | null {
  const opcje = g.options || [];
  if (!opcje.length) return null;
  return opcje.find((o) => o.id === g.selectedOptionId) || opcje[0];
}

export function selectedOptionIndex(g: OfferGroup): number {
  const opcje = g.options || [];
  const i = opcje.findIndex((o) => o.id === g.selectedOptionId);
  return i >= 0 ? i : 0;
}

/** Czy ktoś świadomie wskazał opcję, czy to tylko domyślna pierwsza. */
export function optionChosen(g: OfferGroup): boolean {
  return !!g.selectedOptionId && (g.options || []).some((o) => o.id === g.selectedOptionId);
}

/* ----------------------- zgodność szkieletu z opcjami ----------------------- */

/** Czy dwa opisy parametru to ten sam parametr. */
function tenSamParametr(a: OfferSpecRow, b: OfferSpecRow): boolean {
  return String(a.label || '').trim().toLowerCase() === String(b.label || '').trim().toLowerCase();
}

/** Specyfikacja pozycji opcji: wiersze szkieletu plus własne wiersze opcji.
 *
 *  Wypełniony wiersz szkieletu („Szerokość całkowita: 186”) jest wspólny —
 *  z niego liczy się cena, więc musi być w każdej opcji taki sam. Wiersz
 *  szkieletu bez wartości to tylko rubryka do uzupełnienia i każda opcja
 *  wpisuje w nią swoje („Kolor materiału”: w opcji A biały, w B grafitowy).
 */
function scalSpec(szkielet: OfferSpecRow[], wlasne: OfferSpecRow[]): OfferSpecRow[] {
  const zeSzkieletu = szkielet.map((w) => {
    if (String(w.value || '').trim()) return { ...w };
    const swoj = wlasne.find((x) => tenSamParametr(x, w));
    return { label: w.label, value: swoj ? swoj.value : '' };
  });
  const dodatkowe = wlasne.filter((x) => !szkielet.some((w) => tenSamParametr(w, x)));
  return [...zeSzkieletu, ...dodatkowe.map((w) => ({ ...w }))];
}

/** Pozycja opcji doprowadzona do zgody ze szkieletem.
 *
 *  Nazwa produktu należy do opcji, nie do szkieletu: opcje bywają różnymi
 *  produktami („moskitiera przesuwna” kontra „plisowana”), a nie tylko tym
 *  samym w innym materiale. Opcja bez własnej nazwy bierze nazwę wspólną —
 *  dzięki temu wpisanie jej raz wystarcza, dopóki ktoś jej nie zmieni. */
function zgodnaPozycja(szkielet: OfferItem, wlasna: OfferItem | undefined): OfferItem {
  const baza = wlasna || { ...szkielet, material: '', unitPrice: '', priceSource: undefined };
  return {
    ...baza,
    name: String(baza.name || '').trim() ? baza.name : szkielet.name,
    qty: szkielet.qty,
    lpOverride: szkielet.lpOverride,
    spec: scalSpec(szkielet.spec || [], baza.spec || [])
  };
}

/** Nazwa wspólna wiersza: ta, którą noszą wszystkie opcje. Gdy się różnią —
 *  pusta, bo wtedy nazwa przestaje opisywać wiersz i przenosi się do kolumn. */
export function commonName(g: OfferGroup, i: number): string {
  const nazwy = (g.options || [])
    .map((o) => String(o.items[i]?.name || '').trim())
    .filter(Boolean);
  if (!nazwy.length) return String(g.items[i]?.name || '').trim();
  return nazwy.every((n) => n === nazwy[0]) ? nazwy[0] : '';
}

/** Grupa opcji z pozycjami równoległymi do szkieletu: tyle samo wierszy,
 *  w tej samej kolejności, ze wspólnymi polami przepisanymi ze szkieletu.
 *
 *  Wołamy to po każdej zmianie szkieletu — dodaniu wiersza, usunięciu,
 *  przestawieniu — bo tabela porównawcza bez zgodnych wierszy rozjeżdża się
 *  i klient porównuje salon z sypialnią. */
/** Wymiar wpisany w którejkolwiek opcji staje się wspólny.
 *
 *  Bez tego pierwsza opcja miałaby cenę z cennika, a pozostałe zostałyby bez
 *  wymiaru i bez ceny — a przecież to jedno i to samo okno. Szkielet, który
 *  ma już swoją wartość, zostaje nietknięty: on jest źródłem prawdy. */
function podniesWymiary(g: OfferGroup): OfferGroup {
  const opcje = g.options || [];
  if (!opcje.length) return g;
  return {
    ...g,
    items: g.items.map((szkielet, i) => {
      const spec = (szkielet.spec || []).map((w) => ({ ...w }));
      let zmiana = false;
      for (const o of opcje) {
        for (const w of o.items[i]?.spec || []) {
          const wartosc = String(w.value || '').trim();
          if (!wartosc || !isDimensionField(w.label)) continue;
          const istniejacy = spec.find((x) => tenSamParametr(x, w));
          if (istniejacy) {
            if (!String(istniejacy.value || '').trim()) {
              istniejacy.value = wartosc;
              zmiana = true;
            }
          } else {
            spec.push({ label: w.label, value: wartosc });
            zmiana = true;
          }
        }
      }
      return zmiana ? { ...szkielet, spec } : szkielet;
    })
  };
}

/** Specyfikacja szkieletu po zmianie dokonanej w jednej z opcji.
 *
 *  Reguła jest prosta i da się ją powiedzieć jednym zdaniem: wspólne jest to,
 *  co wspólne — wymiar zawsze, a każdy inny parametr wtedy, gdy ma wartość
 *  wpisaną na poziomie szkieletu. Rubryka bez wartości („Kolor materiału:”)
 *  zostaje do wypełnienia osobno w każdej opcji, bo po to tam stoi. */
export function applyOptionSpec(szkielet: OfferItem, nowa: OfferSpecRow[]): OfferSpecRow[] {
  const zostaja = (szkielet.spec || [])
    .filter((w) => nowa.some((x) => tenSamParametr(x, w)))
    .map((w) => {
      const zmieniony = nowa.find((x) => tenSamParametr(x, w))!;
      const bylaWartosc = String(w.value || '').trim() !== '';
      return bylaWartosc || isDimensionField(w.label) ? { ...w, value: zmieniony.value } : { ...w };
    });
  // wymiar dopisany przy opcji od razu staje się wspólny
  for (const x of nowa) {
    if (!isDimensionField(x.label)) continue;
    if (!zostaja.some((w) => tenSamParametr(w, x))) zostaja.push({ ...x });
  }
  return zostaja;
}

export function syncOptions(g: OfferGroup): OfferGroup {
  if (!isOptionGroup(g)) return g;
  g = podniesWymiary(g);
  // Szkielet nosi nazwę tylko wtedy, gdy opcje są zgodne co do produktu.
  // Gdy się różnią, nazwa schodzi do kolumn i wiersz opisuje sam wymiar.
  const items = g.items.map((it, i) => {
    const wspolna = commonName(g, i);
    return String(it.name || '') === wspolna ? it : { ...it, name: wspolna };
  });
  return {
    ...g,
    items,
    options: (g.options || []).map((o) => ({
      ...o,
      items: items.map((szkielet, i) => zgodnaPozycja(szkielet, o.items[i]))
    }))
  };
}

/** Pełny opis pozycji opcji: wymiar ze szkieletu i materiał z opcji w jednym.
 *
 *  Szkielet niesie to, co wspólne („186 x 202 cm”), opcja to, czym się różni
 *  („materiał zaciemniający”). Rozdzielone czytają się dobrze w tabeli
 *  porównawczej, ale na WZ, w zleceniu i w wycenie z cennika potrzebny jest
 *  jeden pełny opis. */
export function fullOptionItem(szkielet: OfferItem, pozycja: OfferItem): OfferItem {
  const opis = [String(szkielet.material || '').trim(), String(pozycja.material || '').trim()]
    .filter(Boolean)
    .join(' · ');
  return { ...pozycja, material: opis };
}

/** Pozycje wybranej opcji, gotowe do przeniesienia dalej (WZ, produkcja). */
export function selectedItems(g: OfferGroup): OfferItem[] {
  if (!isOptionGroup(g)) return g.items;
  const opcja = selectedOption(g);
  if (!opcja) return [];
  return g.items.map((szkielet, i) => fullOptionItem(szkielet, opcja.items[i] || szkielet));
}

/** Kwota jednej opcji. */
export function optionSum(option: OfferOption): number {
  return (option.items || []).reduce((s, it) => s + itemTotal(it), 0);
}

/** Kwota grupy liczona opcją wliczoną w cenę całkowitą. */
export function groupEffectiveSum(g: OfferGroup): number {
  if (!isOptionGroup(g)) return groupSum(g);
  const opcja = selectedOption(g);
  return opcja ? optionSum(opcja) : 0;
}

/** Czy opcja wnosi coś własnego w tym wierszu — materiał albo kwotę.
 *
 *  Opisu ze szkieletu tu nie liczymy, choć pozycja go niesie: wymiar jest
 *  wspólny dla wszystkich opcji i stoi w kolumnie produktu, więc sam z siebie
 *  nie czyni opcji wypełnioną. Inaczej świeżo dodana, pusta opcja zabierałaby
 *  kolumnę na dokumencie tylko dlatego, że odziedziczyła „186 x 202 cm”. */
export function optionCellFilled(item: OfferItem | undefined): boolean {
  if (!item) return false;
  return String(item.material || '').trim() !== '' || itemTotal(item) !== 0;
}

/** Czy opcja ma cokolwiek wypełnionego — pusta nie idzie na dokument. */
export function optionFilled(option: OfferOption): boolean {
  return (option.items || []).some(optionCellFilled);
}

/* --------------------------- zakładanie i zmiany --------------------------- */

const PUSTA_POZYCJA = (): OfferItem => ({ name: '', material: '', qty: '1', unitPrice: '' });

/** Nowa opcja na podstawie szkieletu grupy — bez cen, do uzupełnienia. */
export function newOption(g: OfferGroup, title = ''): OfferOption {
  return {
    id: uid(),
    title,
    items: g.items.map((szkielet) => zgodnaPozycja(szkielet, undefined))
  };
}

/** Zamienia zwykłą tabelę w grupę opcji: pozycje zostają szkieletem, a ich
 *  dotychczasowy materiał i cena wchodzą do pierwszej opcji — żeby wpisana
 *  już robota nie przepadła. */
export function toOptionGroup(g: OfferGroup, ile = 2): OfferGroup {
  if (isOptionGroup(g)) return g;
  const items = g.items.length ? g.items : [PUSTA_POZYCJA()];
  const pierwsza: OfferOption = { id: uid(), title: '', items: items.map((it) => ({ ...it })) };
  const szkielet: OfferGroup = {
    ...g,
    // wymiar zostaje wspólny, materiał i cena schodzą do opcji
    items: items.map((it) => ({ name: it.name, material: '', qty: it.qty, lpOverride: it.lpOverride, unitPrice: '', spec: (it.spec || []).map((w) => ({ ...w })) })),
    options: [pierwsza],
    selectedOptionId: undefined
  };
  const zDopelnieniem = { ...szkielet, options: [...(szkielet.options || [])] };
  while (zDopelnieniem.options!.length < Math.max(1, ile)) {
    zDopelnieniem.options!.push(newOption(zDopelnieniem));
  }
  return syncOptions(zDopelnieniem);
}

/** Grupa opcji zwinięta z powrotem do zwykłej tabeli — zostaje wybrana opcja. */
export function toPlainGroup(g: OfferGroup): OfferGroup {
  if (!isOptionGroup(g)) return g;
  const items = selectedItems(g);
  const { options, selectedOptionId, ...reszta } = g;
  return { ...reszta, items: items.length ? items : [PUSTA_POZYCJA()] };
}

/** Przepisanie starych wariantów alternatywnych na jedną grupę opcji.
 *
 *  Wariant był całą osobną tabelą wycenianą poza ceną całkowitą — klient
 *  widział kwotę wariantu, ale nie to, ile ostatecznie zapłaci. Po zamianie
 *  każdy wariant jest opcją, a przy każdej stoi pełna cena oferty.
 *
 *  Szkielet bierzemy z najdłuższego wariantu, żeby żadna pozycja nie wypadła.
 *  Ofert już wystawionych to nie rusza: zamiana dzieje się tylko wtedy, gdy
 *  ktoś świadomie kliknie ją w edytorze. */
export function optionsFromVariants(offer: Offer): Offer {
  const warianty = (offer.groups || []).filter((g) => g.variant);
  if (warianty.length < 1) return offer;

  const najdluzszy = warianty.reduce((a, b) => (b.items.length > a.items.length ? b : a));
  const szkielet: OfferGroup = {
    id: uid(),
    header: najdluzszy.header,
    title: '',
    items: najdluzszy.items.map((it) => ({
      name: it.name,
      material: '',
      qty: it.qty,
      lpOverride: it.lpOverride,
      unitPrice: '',
      spec: (it.spec || []).map((w) => ({ ...w }))
    })),
    options: warianty.map((w, i) => ({
      id: uid(),
      title: String(w.title || '').trim() || optionLetter(i),
      items: w.items.map((it) => ({ ...it }))
    }))
  };

  const pierwszyWariant = (offer.groups || []).findIndex((g) => g.variant);
  const bezWariantow = (offer.groups || []).filter((g) => !g.variant);
  const gdzie = Math.min(Math.max(pierwszyWariant, 0), bezWariantow.length);
  const groups = [...bezWariantow.slice(0, gdzie), syncOptions(szkielet), ...bezWariantow.slice(gdzie)];
  return { ...offer, groups };
}

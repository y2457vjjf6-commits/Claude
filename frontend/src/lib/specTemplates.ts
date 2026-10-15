/** Szablony specyfikacji przypisane do produktów.
 *
 *  Ten sam produkt wraca na dziesiątkach ofert z tym samym zestawem parametrów:
 *  kaseta, prowadnice, strona sterowania, wymiary. Zamiast wpisywać je za
 *  każdym razem, firma układa szablon raz w ustawieniach, a pozycja dobiera go
 *  po nazwie — dokładnie tą samą drogą co zdjęcia produktów.
 */
import type { Department, OfferItem, OfferSpecRow, Settings, SpecPreset, SpecTemplate } from '../types';
import { matchByName } from './photos';
import { filledSpec } from './offers';
import { departmentForProduct } from './departments';

/** Szablon pasujący do pozycji albo null. Szablon bez wierszy nie liczy się
 *  jako dopasowanie — inaczej pusty wpis o dokładniejszej nazwie przykryłby
 *  ten, który naprawdę ma co wstawić. */
export function matchSpecTemplate(
  item: Pick<OfferItem, 'name' | 'material'>,
  templates: SpecTemplate[] | undefined
): SpecTemplate | null {
  return matchByName(item, templates, (t) => uzyteczneWiersze(t).length > 0);
}

/** Wiersze szablonu gotowe do wstawienia. Pusta wartość zostaje — to miejsce
 *  do uzupełnienia przy pozycji, a nie śmieć; pusta nazwa parametru odpada. */
export function uzyteczneWiersze(t: SpecTemplate | null | undefined): OfferSpecRow[] {
  return (t?.rows || [])
    .map((w) => ({ label: String(w.label || '').trim(), value: String(w.value || '').trim() }))
    .filter((w) => w.label);
}

/** Specyfikacja, którą pozycja powinna dostać sama z siebie.
 *
 *  Podstawiamy tylko do pozycji, która nic swojego nie ma — tak samo jak cena
 *  z cennika nie nadpisuje kwoty wpisanej ręcznie. Dzięki temu zmiana nazwy
 *  produktu w pozycji z wypełnioną specyfikacją niczego nie kasuje.
 */
/** Specyfikacja, którą pozycja ma dostać sama: najpierw szablon przypisany
 *  do produktu, a gdy go nie ma — zestaw domyślny dla kategorii.
 *
 *  Używa tego i zlecenie, i oferta. Różnica jest dopiero na wydruku: dokument
 *  dla klienta pomija wiersze bez wartości, bo „Kolor kasety: —" nic mu nie
 *  mówi, a kartka dla warsztatu je zostawia, bo to rubryki do uzupełnienia.
 */
export function autoSpecFor(
  item: Pick<OfferItem, 'name' | 'material' | 'spec'>,
  settings: Pick<Settings, 'specTemplates' | 'specPresets' | 'defaultSpec'> | undefined
): OfferSpecRow[] | null {
  if (!nietkniete(item.spec, settings)) return null;
  const szablon = matchSpecTemplate(item, settings?.specTemplates);
  const wiersze = szablon ? uzyteczneWiersze(szablon) : domyslnaSpec(item, settings);
  return wiersze.length ? wiersze : null;
}

/** Czy specyfikację wolno jeszcze podmienić.
 *
 *  Nowa pozycja dostaje zestaw zapasowy, zanim ktokolwiek wpisze nazwę
 *  produktu — bez nazwy nie wiadomo przecież, czy to roleta, czy moskitiera.
 *  Gdyby liczyło się samo „coś tu jest", ten zapasowy zestaw zablokowałby
 *  właściwy na zawsze. Dlatego za nietknięte uznajemy to, co nie ma ani jednej
 *  wpisanej wartości i co do joty zgadza się z którymś zestawem albo szablonem
 *  z ustawień. Cokolwiek człowiek zmienił — zostaje jego.
 */
export function nietkniete(
  spec: OfferSpecRow[] | undefined,
  settings: Pick<Settings, 'specTemplates' | 'specPresets' | 'defaultSpec'> | undefined
): boolean {
  const wiersze = filledSpec(spec);
  if (!wiersze.length) return true;
  if (wiersze.some((w) => w.value)) return false;
  const etykiety = wiersze.map((w) => w.label).join('\u0000');
  const gotowe = [
    ...zestawy(settings).map(uzyteczneWierszeZestawu),
    ...(settings?.specTemplates || []).map(uzyteczneWiersze)
  ];
  return gotowe.some((g) => g.map((w) => w.label).join('\u0000') === etykiety);
}

/** Zestawy domyślne po przeniesieniu starych danych. Program zapisywał kiedyś
 *  jedną płaską listę; robimy z niej zestaw „na wszystko", żeby nikomu nic
 *  nie zniknęło po aktualizacji. */
export function zestawy(
  settings: Pick<Settings, 'specPresets' | 'defaultSpec'> | undefined
): SpecPreset[] {
  const lista = settings?.specPresets;
  if (lista && lista.length) return lista;
  const stare = settings?.defaultSpec || [];
  return stare.length
    ? [{ id: 'domyslna', name: 'Domyślna', departments: [], rows: stare }]
    : [];
}

/** Zestawy pasujące do pozycji: najpierw te przypisane do jej kategorii,
 *  a gdy żaden nie pasuje — te „na wszystko". Kolejność jest ta z ustawień,
 *  więc o tym, który wchodzi sam, decyduje firma, a nie przypadek. */
export function zestawyDla(
  item: Pick<OfferItem, 'name' | 'material'>,
  settings: Pick<Settings, 'specPresets' | 'defaultSpec'> | undefined
): SpecPreset[] {
  const wszystkie = zestawy(settings).filter((z) => uzyteczneWierszeZestawu(z).length > 0);
  const dzial: Department | null = departmentForProduct(item);
  const wKategorii = dzial ? wszystkie.filter((z) => z.departments.includes(dzial)) : [];
  if (wKategorii.length) return wKategorii;
  return wszystkie.filter((z) => !z.departments.length);
}

export function uzyteczneWierszeZestawu(z: SpecPreset | null | undefined): OfferSpecRow[] {
  return uzyteczneWiersze({ name: '', rows: z?.rows || [] });
}

/** Wiersze, które pozycja ma dostać sama. */
export function domyslnaSpec(
  item: Pick<OfferItem, 'name' | 'material'>,
  settings: Pick<Settings, 'specPresets' | 'defaultSpec'> | undefined
): OfferSpecRow[] {
  return uzyteczneWierszeZestawu(zestawyDla(item, settings)[0]);
}

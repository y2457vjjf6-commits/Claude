/** Szablony specyfikacji przypisane do produktów.
 *
 *  Ten sam produkt wraca na dziesiątkach ofert z tym samym zestawem parametrów:
 *  kaseta, prowadnice, strona sterowania, wymiary. Zamiast wpisywać je za
 *  każdym razem, firma układa szablon raz w ustawieniach, a pozycja dobiera go
 *  po nazwie — dokładnie tą samą drogą co zdjęcia produktów.
 */
import type { OfferItem, OfferSpecRow, Settings, SpecTemplate } from '../types';
import { matchByName } from './photos';
import { filledSpec } from './offers';

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
export function autoSpecFor(
  item: Pick<OfferItem, 'name' | 'material' | 'spec'>,
  settings: Pick<Settings, 'specTemplates'> | undefined
): OfferSpecRow[] | null {
  if (filledSpec(item.spec).length > 0) return null;
  const szablon = matchSpecTemplate(item, settings?.specTemplates);
  const wiersze = szablon ? uzyteczneWiersze(szablon) : [];
  return wiersze.length ? wiersze : null;
}

/** To samo dla pozycji zlecenia, tyle że bez pasującego szablonu wstawiamy
 *  wiersze domyślne.
 *
 *  Oferta ich nie dostaje celowo: ona idzie do klienta, a pusta rubryka
 *  „Materiał: —" na dokumencie wygląda jak niedokończona robota. W zleceniu
 *  jest odwrotnie — pusta rubryka przypomina warsztatowi, co trzeba uzupełnić.
 */
export function autoSpecForOrder(
  item: Pick<OfferItem, 'name' | 'material' | 'spec'>,
  settings: Pick<Settings, 'specTemplates' | 'defaultSpec'> | undefined
): OfferSpecRow[] | null {
  const zeSzablonu = autoSpecFor(item, settings);
  if (zeSzablonu) return zeSzablonu;
  if (filledSpec(item.spec).length > 0) return null;
  const wiersze = domyslnaSpec(settings);
  return wiersze.length ? wiersze : null;
}

/** Wiersze domyślne — dla produktu, który nie ma własnego szablonu. Lepiej
 *  pokazać pustą listę parametrów do uzupełnienia niż nic: pusta rubryka
 *  przypomina, że coś trzeba wpisać, a brak rubryki nie przypomina o niczym. */
export function domyslnaSpec(
  settings: Pick<Settings, 'defaultSpec'> | undefined
): OfferSpecRow[] {
  return uzyteczneWiersze({ name: '', rows: settings?.defaultSpec || [] });
}

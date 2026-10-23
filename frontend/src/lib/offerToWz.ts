import { Contractor, DocContractor, Item, Offer, ProductionOrder } from '../types';
import { formatDatePl } from './printing';
import { isOptionGroup, optionChosen, selectedItems } from './offerOptions';

/** Dane, którymi wypełniamy nową WZ wystawianą na podstawie oferty. */
export interface WzPrefill {
  sourceOfferId: string;
  contractorId: string | null;
  contractor: DocContractor;
  items: Item[];
  notes: string;
  /** Oferta zawierała warianty alternatywne — nie przenosimy ich automatycznie */
  hadVariants: boolean;
  /** Oferta ma grupy opcji, w których nikt nie wskazał wybranej — przenieśliśmy
   *  pierwszą, więc trzeba to sprawdzić przed wydaniem towaru */
  uncheckedOptions: boolean;
}

/** Nazwa pozycji na WZ: produkt z oferty wraz z materiałem lub wymiarem. */
function itemName(name: string, material: string): string {
  const n = (name || '').trim();
  const m = (material || '').trim();
  if (!n) return m;
  return m ? `${n} (${m})` : n;
}

/** Przepisanie zaakceptowanej oferty na pozycje dokumentu WZ.
 *
 *  Z grupy opcji bierzemy tę opcję, którą zaznaczono w ofercie — po to się ją
 *  zaznacza. Gdy nikt nie zaznaczył, idzie pierwsza, ale mówimy o tym wprost
 *  (`uncheckedOptions`), bo wydanie nie tego towaru wraca jako reklamacja.
 *
 *  Stare warianty alternatywne dalej pomijamy: nie da się odgadnąć, który
 *  z nich klient wybrał, więc dopisuje je człowiek. */
export function wzPrefillFromOffer(offer: Offer, contractors: Contractor[]): WzPrefill {
  const klient = (offer.client || '').trim();
  const zBazy =
    contractors.find((c) => (c.name || '').trim().toLowerCase() === klient.toLowerCase()) || null;

  const contractor: DocContractor = zBazy
    ? {
        name: zBazy.name,
        address: zBazy.address || '',
        nip: zBazy.nip || '',
        email: zBazy.email || offer.clientEmail || '',
        code: zBazy.code || ''
      }
    : { name: klient, address: '', nip: '', email: (offer.clientEmail || '').trim(), code: '' };

  const podstawowe = (offer.groups || []).filter((g) => !g.variant);
  const items: Item[] = [];
  for (const g of podstawowe) {
    for (const it of selectedItems(g)) {
      const nazwa = itemName(it.name, it.material);
      if (!nazwa) continue;
      items.push({ name: nazwa, unit: 'szt.', qty: String(it.qty || '').trim(), order: '' });
    }
  }

  return {
    sourceOfferId: offer.id,
    contractorId: zBazy ? zBazy.id : null,
    contractor,
    items,
    notes: `Na podstawie oferty cenowej z dnia ${formatDatePl(offer.date)}.`,
    hadVariants: (offer.groups || []).some((g) => g.variant),
    uncheckedOptions: (offer.groups || []).some((g) => isOptionGroup(g) && !optionChosen(g))
  };
}

/** Przepisanie zlecenia produkcyjnego na pozycje dokumentu WZ.
 *
 *  Zamyka drogę oferta → zlecenie → WZ. Numer własny i numer zlecenia idą
 *  w uwagi, bo po nich klient i warsztat rozpoznają, czego dotyczy wydanie.
 *  Pozycje zbiorcze, rozbite wcześniej na sztuki, scalamy z powrotem: na WZ
 *  liczy się ile i czego wydajemy, a nie jak to szło przez warsztat.
 */
export function wzPrefillFromOrder(order: ProductionOrder, contractors: Contractor[]): WzPrefill {
  const klient = (order.client || '').trim();
  const zBazy =
    contractors.find((c) => (c.name || '').trim().toLowerCase() === klient.toLowerCase()) || null;

  const contractor: DocContractor = zBazy
    ? {
        name: zBazy.name,
        address: zBazy.address || order.clientAddress || '',
        nip: zBazy.nip || '',
        email: zBazy.email || '',
        code: zBazy.code || ''
      }
    : { name: klient, address: (order.clientAddress || '').trim(), nip: '', email: '', code: '' };

  const scalone = new Map<string, Item>();
  for (const it of order.items || []) {
    // „Roleta — szt. 2 z 3" to ta sama rzecz co „Roleta": wracamy do nazwy
    // sprzed rozbicia, żeby WZ nie wyliczała trzech osobnych pozycji po sztuce
    const nazwa = itemName(String(it.name || '').replace(/\s*—\s*szt\.\s*\d+\s*z\s*\d+\s*$/i, ''), it.material);
    if (!nazwa) continue;
    const ile = Number(String(it.qty || '1').replace(',', '.')) || 0;
    const byla = scalone.get(nazwa);
    if (byla) byla.qty = String((Number(byla.qty) || 0) + ile);
    else scalone.set(nazwa, { name: nazwa, unit: 'szt.', qty: String(ile), order: '' });
  }

  const skad = [order.number, order.ownNumber].filter(Boolean).join(' · ');
  return {
    sourceOfferId: order.sourceOfferId || '',
    contractorId: zBazy ? zBazy.id : null,
    contractor,
    items: Array.from(scalone.values()),
    notes: skad ? `Na podstawie zlecenia ${skad}.` : 'Na podstawie zlecenia produkcyjnego.',
    hadVariants: false,
    uncheckedOptions: false
  };
}

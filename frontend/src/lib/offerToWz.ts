import { Contractor, DocContractor, Item, Offer } from '../types';
import { formatDatePl } from './printing';

/** Dane, którymi wypełniamy nową WZ wystawianą na podstawie oferty. */
export interface WzPrefill {
  sourceOfferId: string;
  contractorId: string | null;
  contractor: DocContractor;
  items: Item[];
  notes: string;
  /** Oferta zawierała warianty alternatywne — nie przenosimy ich automatycznie */
  hadVariants: boolean;
}

/** Nazwa pozycji na WZ: produkt z oferty wraz z materiałem lub wymiarem. */
function itemName(name: string, material: string): string {
  const n = (name || '').trim();
  const m = (material || '').trim();
  if (!n) return m;
  return m ? `${n} (${m})` : n;
}

/** Przepisanie zaakceptowanej oferty na pozycje dokumentu WZ.
 *  Warianty alternatywne pomijamy — o tym, który z nich klient wybrał,
 *  decyduje człowiek, więc dopisuje je ręcznie. */
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
    for (const it of g.items || []) {
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
    hadVariants: (offer.groups || []).some((g) => g.variant)
  };
}

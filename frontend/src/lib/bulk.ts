import { Offer, Settings, WZDocument } from '../types';
import { printPrintable, ToastFn } from './docActions';
import { buildPrintHtml, wzPrintable } from './printing';
import { buildOfferHtml } from './printingOffer';
import { offerPrintable } from './offerActions';
import { emailPrintable } from './docActions';

/** Kilka dokumentów w jednym wydruku — każdy od nowej strony. */
export function sklejDoWydruku(czesci: string[]): string {
  return czesci.join('<div class="page-break"></div>');
}

/** Wydruk zaznaczonych dokumentów WZ: jedno okno drukowania, N stron. */
export async function printManyDocs(docs: WZDocument[], settings: Settings, toast: ToastFn): Promise<boolean> {
  if (!docs.length) return false;
  return printPrintable(
    {
      ...wzPrintable(docs[0], settings),
      html: sklejDoWydruku(docs.map((d) => buildPrintHtml(d, settings))),
      label: `${docs.length} dokumentów`
    },
    toast
  );
}

/** Wydruk zaznaczonych ofert. */
export async function printManyOffers(offers: Offer[], settings: Settings, toast: ToastFn): Promise<boolean> {
  if (!offers.length) return false;
  return printPrintable(
    {
      ...offerPrintable(offers[0], settings),
      html: sklejDoWydruku(offers.map((o) => buildOfferHtml(o, settings))),
      label: `${offers.length} ofert`
    },
    toast
  );
}

export interface WynikWysylki {
  wyslane: number;
  pominiete: string[];
  bledy: string[];
}

/** Wysyłka wielu dokumentów po kolei — każdy ze swoim załącznikiem i adresem.
 *  Po drodze meldujemy postęp, bo przy kilku plikach trwa to kilkanaście sekund. */
export async function emailMany<T>(
  pozycje: T[],
  settings: Settings,
  toast: ToastFn,
  opis: (item: T) => { printable: ReturnType<typeof wzPrintable>; nazwa: string },
  onSent: (item: T) => void
): Promise<WynikWysylki> {
  const wynik: WynikWysylki = { wyslane: 0, pominiete: [], bledy: [] };
  for (let i = 0; i < pozycje.length; i++) {
    const { printable, nazwa } = opis(pozycje[i]);
    if (!printable.recipient) {
      wynik.pominiete.push(nazwa);
      continue;
    }
    toast(`Wysyłanie ${i + 1} z ${pozycje.length}: ${nazwa}…`);
    // potwierdzenie było raz, na całą paczkę
    const ok = await emailPrintable(printable, settings, () => {}, async () => true);
    if (ok) {
      wynik.wyslane += 1;
      onSent(pozycje[i]);
    } else {
      wynik.bledy.push(nazwa);
    }
  }
  return wynik;
}

/** Podsumowanie wysyłki jednym zdaniem. */
export function opiszWysylke(w: WynikWysylki): { tekst: string; blad: boolean } {
  const czesci: string[] = [];
  if (w.wyslane) czesci.push(`wysłano ${w.wyslane}`);
  if (w.pominiete.length) czesci.push(`bez adresu e-mail: ${w.pominiete.join(', ')}`);
  if (w.bledy.length) czesci.push(`nie udało się: ${w.bledy.join(', ')}`);
  const tekst = czesci.length ? czesci.join(' · ') : 'Nie wysłano nic.';
  return { tekst: tekst.charAt(0).toUpperCase() + tekst.slice(1) + '.', blad: !!(w.bledy.length || w.pominiete.length) };
}

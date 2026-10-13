/** Kopiowanie oferty do nowej.
 *
 *  Druga oferta dla tego samego klienta zwykle różni się jedną pozycją albo
 *  ceną — przepisywanie całości od zera to strata czasu i okazja do pomyłki.
 *  Kopia jest osobnym dokumentem: dostaje własny numer przy pierwszym zapisie,
 *  a oferta źródłowa zostaje nietknięta, razem ze swoim numerem, statusem
 *  i śladem wysyłki.
 */
import type { Offer } from '../types';

/** Czego kopia nie dziedziczy: tożsamości dokumentu i śladów jego obiegu. */
export function duplicateOffer(zrodlo: Offer, dataWystawienia: string): Offer {
  const kopia = structuredClone(zrodlo);

  // Pusty id i brak numeru znaczą „nowy dokument" — numer nada się sam przy
  // zapisie, z puli wolnych numerów na dzień wystawienia kopii.
  kopia.id = '';
  delete kopia.number;
  delete kopia.seq;

  // Kopia zaczyna jako szkic: status, wydruk, wysyłka i wystawione WZ-ki
  // opisują tamtą ofertę, nie tę.
  kopia.status = 'szkic';
  delete kopia.printedAt;
  delete kopia.emailedAt;
  delete kopia.emailedTo;
  delete kopia.wzDocumentIds;

  kopia.date = dataWystawienia;
  kopia.createdAt = '';
  kopia.updatedAt = '';
  return kopia;
}

/** Podpis kopii na liście i w komunikacie — numer źródła, gdy już go ma. */
export function opisZrodla(zrodlo: Offer): string {
  return zrodlo.number || zrodlo.client || 'oferty';
}

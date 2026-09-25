import { Offer, Settings } from '../types';
import {
  emailPrintable,
  printPrintable,
  savePdfPrintable,
  PrintableDocument,
  ToastFn
} from './docActions';
import { buildOfferHtml } from './printingOffer';
import { formatMoney, offerFileName, offerTotals } from './offers';
import { formatDatePl } from './printing';

/** Treść wiadomości z ofertą — krótka, z kwotą i datą. */
export function buildOfferEmail(offer: Offer, settings: Settings): { subject: string; text: string } {
  const kwota = formatMoney(offerTotals(offer).total);
  const subject = `Oferta cenowa ${formatDatePl(offer.date)} — ${offer.client}`;
  const text =
    `Dzień dobry,\n\n` +
    `w załączniku przesyłamy ofertę cenową z dnia ${formatDatePl(offer.date)}` +
    `${offer.client ? ` dla: ${offer.client}` : ''}.\n` +
    `Wartość oferty: ${kwota}.\n\n` +
    `Pozdrawiamy,\n${offer.issuedBy || settings.seller.name}\n` +
    `${settings.seller.name}\ntel. ${settings.seller.phone} · ${settings.seller.www}`;
  return { subject, text };
}

/** Oferta w postaci gotowej do wydruku, zapisu i wysyłki. */
export function offerPrintable(offer: Offer, settings: Settings): PrintableDocument {
  const { subject, text } = buildOfferEmail(offer, settings);
  return {
    html: buildOfferHtml(offer, settings),
    fileName: offerFileName(offer),
    recipient: offer.clientEmail || '',
    subject,
    body: text,
    label: `ofertę dla „${offer.client}”`,
    missingRecipientMessage: 'Klient nie ma podanego adresu e-mail. Uzupełnij go w ofercie.'
  };
}

export const printOffer = (offer: Offer, settings: Settings, toast: ToastFn) =>
  printPrintable(offerPrintable(offer, settings), toast);

export const savePdfOffer = (offer: Offer, settings: Settings, toast: ToastFn) =>
  savePdfPrintable(offerPrintable(offer, settings), toast);

export const emailOffer = (
  offer: Offer,
  settings: Settings,
  toast: ToastFn,
  confirm: (message: string) => Promise<boolean>
) => emailPrintable(offerPrintable(offer, settings), settings, toast, confirm);

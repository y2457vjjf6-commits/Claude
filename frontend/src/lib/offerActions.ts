import { Offer, Settings } from '../types';
import { hasApi } from './storage';
import { fillOfferPrintArea } from './printingOffer';
import { formatMoney, offerFileName, offerTotals } from './offers';
import { formatDatePl } from './printing';

type ToastFn = (msg: string, isError?: boolean) => void;

export async function printOffer(offer: Offer, settings: Settings, toast: ToastFn): Promise<boolean> {
  fillOfferPrintArea(offer, settings);
  if (hasApi && window.wzApi) {
    const res = await window.wzApi.printDoc();
    if (!res.ok && res.error && res.error !== 'cancelled') toast('Drukowanie: ' + res.error, true);
    return res.ok;
  }
  window.print();
  return false;
}

export async function savePdfOffer(offer: Offer, settings: Settings, toast: ToastFn): Promise<void> {
  fillOfferPrintArea(offer, settings);
  if (hasApi && window.wzApi) {
    const res = await window.wzApi.savePdf(offerFileName(offer));
    if (res.ok) toast('Zapisano PDF: ' + res.filePath);
    else if (!res.canceled) toast('Błąd zapisu PDF: ' + res.error, true);
    return;
  }
  window.print();
}

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

export async function emailOffer(
  offer: Offer,
  settings: Settings,
  toast: ToastFn,
  confirm: (message: string) => Promise<boolean>
): Promise<boolean> {
  if (!hasApi || !window.wzApi) {
    toast('Wysyłka e-mail dostępna tylko w aplikacji desktopowej.', true);
    return false;
  }
  const to = (offer.clientEmail || '').trim();
  if (!to) {
    toast('Klient nie ma podanego adresu e-mail. Uzupełnij go w ofercie.', true);
    return false;
  }
  const smtp = settings.smtp;
  if (!smtp.host || !smtp.user) {
    toast('Brak konfiguracji poczty — uzupełnij dane SMTP w Ustawieniach.', true);
    return false;
  }
  const copyTo = (settings.emailCopyTo || '').trim();
  const pytanie = copyTo
    ? `Wysłać ofertę dla „${offer.client}” na adres ${to}?\nKopia trafi też na ${copyTo}.`
    : `Wysłać ofertę dla „${offer.client}” na adres ${to}?`;
  if (!(await confirm(pytanie))) return false;

  fillOfferPrintArea(offer, settings);
  toast('Wysyłanie e-maila…');
  const { subject, text } = buildOfferEmail(offer, settings);
  const res = await window.wzApi.sendEmail({
    smtp,
    to,
    bcc: copyTo,
    subject,
    text,
    filename: offerFileName(offer)
  });
  if (res.ok) {
    toast(copyTo ? `Wysłano ofertę na adres ${to} (kopia: ${copyTo}).` : `Wysłano ofertę na adres ${to}.`);
  } else {
    toast('Błąd wysyłki: ' + res.error, true);
  }
  return !!res.ok;
}

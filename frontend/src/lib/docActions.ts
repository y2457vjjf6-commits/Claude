import { Settings } from '../types';
import { hasApi } from './storage';

export interface ToastAction {
  label: string;
  run: () => void;
}

export type ToastFn = (msg: string, isError?: boolean, action?: ToastAction) => void;

/** Wszystko, czego potrzeba, żeby wydrukować, zapisać albo wysłać dokument. */
export interface PrintableDocument {
  /** Gotowy dokument w HTML (szablon wydruku) */
  html: string;
  /** Nazwa pliku PDF */
  fileName: string;
  /** Adres e-mail odbiorcy (pusty = nie ma do kogo wysłać) */
  recipient: string;
  subject: string;
  body: string;
  /** Jak nazwać dokument w komunikatach, np. „dokument 1001/RS/2026” */
  label: string;
  /** Komunikat, gdy brakuje adresu odbiorcy */
  missingRecipientMessage: string;
}

function fillPrintArea(html: string): void {
  const area = document.getElementById('print-area');
  if (area) area.innerHTML = html;
}

export async function printPrintable(doc: PrintableDocument, toast: ToastFn): Promise<boolean> {
  fillPrintArea(doc.html);
  if (hasApi && window.wzApi) {
    const res = await window.wzApi.printDoc();
    if (!res.ok && res.error && res.error !== 'cancelled') toast('Drukowanie: ' + res.error, true);
    return res.ok;
  }
  window.print();
  return false;
}

export async function savePdfPrintable(doc: PrintableDocument, toast: ToastFn): Promise<boolean> {
  fillPrintArea(doc.html);
  if (hasApi && window.wzApi) {
    const res = await window.wzApi.savePdf(doc.fileName);
    if (res.ok) toast('Zapisano PDF: ' + res.filePath);
    else if (!res.canceled) toast('Nie udało się zapisać PDF: ' + res.error, true);
    return !!res.ok;
  }
  window.print();
  return false;
}

export async function emailPrintable(
  doc: PrintableDocument,
  settings: Settings,
  toast: ToastFn,
  confirm: (message: string) => Promise<boolean>
): Promise<boolean> {
  if (!hasApi || !window.wzApi) {
    toast('Wysyłka e-mailem działa tylko w aplikacji na komputerze.', true);
    return false;
  }
  const to = (doc.recipient || '').trim();
  if (!to) {
    toast(doc.missingRecipientMessage, true);
    return false;
  }
  const smtp = settings.smtp;
  if (!smtp.host || !smtp.user) {
    toast('Brak konfiguracji poczty — uzupełnij dane skrzynki w Ustawieniach.', true);
    return false;
  }
  const copyTo = (settings.emailCopyTo || '').trim();
  const pytanie = copyTo
    ? `Wysłać ${doc.label} na adres ${to}?\nKopia trafi też na ${copyTo}.`
    : `Wysłać ${doc.label} na adres ${to}?`;
  if (!(await confirm(pytanie))) return false;

  fillPrintArea(doc.html);
  toast('Wysyłanie wiadomości…');
  const res = await window.wzApi.sendEmail({
    smtp,
    to,
    bcc: copyTo,
    subject: doc.subject,
    text: doc.body,
    filename: doc.fileName
  });
  if (res.ok) {
    toast(copyTo ? `Wysłano ${doc.label} na ${to} (kopia: ${copyTo}).` : `Wysłano ${doc.label} na ${to}.`);
  } else {
    toast('Nie udało się wysłać: ' + res.error, true);
  }
  return !!res.ok;
}

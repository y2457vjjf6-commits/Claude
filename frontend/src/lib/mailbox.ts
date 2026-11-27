/** Skrzynka odbiorcza widziana od strony okna programu.
 *
 *  Samo gadanie z serwerem IMAP dzieje się w procesie głównym (`electron/
 *  main.js`) — tu zostaje to, co trzeba rozstrzygnąć, zanim w ogóle warto
 *  zapytać serwer: czy skrzynka jest ustawiona i czy program chodzi jako
 *  aplikacja, a nie w przeglądarce. Dzięki temu da się to sprawdzić testem,
 *  zamiast klikać przez prawdziwą pocztę.
 */

import { Imap, MailHeader, Settings } from '../types';

export interface MailListResult {
  ok: boolean;
  error?: string;
  messages?: MailHeader[];
  /** Podpowiedź do ustawień — np. że port trzeba poprawić, choć działa */
  hint?: string;
}

export interface MailTextResult {
  ok: boolean;
  error?: string;
  subject?: string;
  text?: string;
  hint?: string;
}

const BRAK_APLIKACJI = 'Pobieranie poczty działa tylko w aplikacji na komputerze.';
const BRAK_USTAWIEN = 'Skrzynkę odbiorczą ustawisz w Ustawieniach → Poczta.';

/** Czy ma sens pokazywać w oknie importu listę wiadomości. */
export function mailboxReady(settings: Settings): boolean {
  const imap = settings.imap;
  return !!(imap && String(imap.host || '').trim() && typeof window !== 'undefined' && window.wzApi);
}

/** Konto do odbioru: login i hasło domyślnie te same, co przy wysyłce, bo
 *  u większości dostawców to jedna skrzynka. */
export function mailboxAccount(settings: Settings): Imap | null {
  const imap = settings.imap;
  if (!imap || !String(imap.host || '').trim()) return null;
  return { ...imap, host: String(imap.host).trim(), port: Number(imap.port) || 993 };
}

export async function listMailbox(settings: Settings, limit = 30): Promise<MailListResult> {
  const konto = mailboxAccount(settings);
  if (!konto) return { ok: false, error: BRAK_USTAWIEN };
  if (typeof window === 'undefined' || !window.wzApi) return { ok: false, error: BRAK_APLIKACJI };
  try {
    const res = await window.wzApi.mailList(konto, settings.smtp, limit);
    if (!res.ok) return { ok: false, error: res.error || 'Nie udało się pobrać listy wiadomości.' };
    return { ok: true, messages: res.messages || [], hint: res.hint };
  } catch (err) {
    return { ok: false, error: String((err as Error)?.message || err) };
  }
}

export async function fetchMailText(settings: Settings, uid: number): Promise<MailTextResult> {
  const konto = mailboxAccount(settings);
  if (!konto) return { ok: false, error: BRAK_USTAWIEN };
  if (typeof window === 'undefined' || !window.wzApi) return { ok: false, error: BRAK_APLIKACJI };
  try {
    const res = await window.wzApi.mailFetch(konto, settings.smtp, uid);
    if (!res.ok) return { ok: false, error: res.error || 'Nie udało się pobrać tej wiadomości.' };
    // Wiadomość bez treści tekstowej to nie błąd serwera, tylko co innego do
    // zrobienia: trzeba ją otworzyć w poczcie i wkleić treść ręcznie.
    if (!String(res.text || '').trim()) {
      return {
        ok: false,
        error: 'Ta wiadomość nie ma treści tekstowej. Otwórz ją w poczcie i wklej treść poniżej.'
      };
    }
    return { ok: true, subject: res.subject || '', text: res.text || '', hint: res.hint };
  } catch (err) {
    return { ok: false, error: String((err as Error)?.message || err) };
  }
}

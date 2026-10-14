/** Logowanie i stanowiska.
 *
 *  UWAGA, i to jest ważne: ten program działa lokalnie, a dane trzyma
 *  w zwykłym pliku JSON na dysku. Logowanie pilnuje, **kto używa programu** —
 *  nie szyfruje danych. Ktoś, kto ma dostęp do komputera i wie, gdzie szukać,
 *  przeczyta zlecenia i oferty wprost z pliku, nie uruchamiając programu.
 *  Przed tym chroni osobne konto Windows albo szyfrowanie dysku, a nie to.
 *
 *  Czego to logowanie pilnuje naprawdę: że warsztat nie zobaczy cen i nie
 *  skasuje oferty, że widać, kto przestawił etap, i że przypadkowa osoba przy
 *  komputerze nie wystawi dokumentu w imieniu firmy.
 *
 *  Hasła zapisujemy jako PBKDF2-SHA256 z solą — w pliku nie ma hasła, tylko
 *  skrót, z którego nie da się go odtworzyć.
 */
import type { AppState, PasswordHash, UserAccount, UserRole } from '../types';
import { uid } from './storage';

/** Liczba obrotów PBKDF2. Tyle, żeby sprawdzenie hasła trwało ułamek sekundy
 *  na zwykłym komputerze, a zgadywanie po kolei było beznadziejnie wolne. */
export const OBROTY = 210000;

const enc = new TextEncoder();

function b64(bajty: ArrayBuffer | Uint8Array): string {
  const u8 = bajty instanceof Uint8Array ? bajty : new Uint8Array(bajty);
  let s = '';
  for (const b of Array.from(u8)) s += String.fromCharCode(b);
  return btoa(s);
}

function zB64(tekst: string): Uint8Array {
  const s = atob(tekst);
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}

async function pbkdf2(haslo: string, salt: Uint8Array, obroty: number): Promise<string> {
  const klucz = await crypto.subtle.importKey('raw', enc.encode(haslo), 'PBKDF2', false, ['deriveBits']);
  const bity = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as unknown as BufferSource, iterations: obroty, hash: 'SHA-256' },
    klucz,
    256
  );
  return b64(bity);
}

export async function hashPassword(haslo: string): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    algo: 'pbkdf2-sha256',
    iterations: OBROTY,
    salt: b64(salt),
    hash: await pbkdf2(haslo, salt, OBROTY)
  };
}

/** Porównanie w stałym czasie — żeby po czasie odpowiedzi nie dało się
 *  wnioskować, ile pierwszych znaków skrótu się zgadza. */
function rowne(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let roznica = 0;
  for (let i = 0; i < a.length; i++) roznica |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return roznica === 0;
}

export async function verifyPassword(haslo: string, zapisane: PasswordHash | undefined): Promise<boolean> {
  if (!zapisane?.hash || !zapisane?.salt) return false;
  const policzony = await pbkdf2(haslo, zB64(zapisane.salt), zapisane.iterations || OBROTY);
  return rowne(policzony, zapisane.hash);
}

/* ----------------------------- Konta ----------------------------- */

export function normalizujLogin(login: string): string {
  return String(login || '').trim().toLowerCase();
}

export async function createUser(dane: {
  login: string;
  name: string;
  role: UserRole;
  haslo: string;
}): Promise<UserAccount> {
  return {
    id: uid(),
    login: normalizujLogin(dane.login),
    name: dane.name.trim(),
    role: dane.role,
    password: await hashPassword(dane.haslo),
    createdAt: new Date().toISOString()
  };
}

export function findUser(users: UserAccount[] | undefined, login: string): UserAccount | null {
  const szukany = normalizujLogin(login);
  return (users || []).find((u) => u.login === szukany) || null;
}

export type WynikLogowania =
  | { ok: true; user: UserAccount }
  | { ok: false; powod: 'brak-konta' | 'zle-haslo' | 'konto-wylaczone' };

export async function login(
  users: UserAccount[] | undefined,
  dane: { login: string; haslo: string }
): Promise<WynikLogowania> {
  const user = findUser(users, dane.login);
  // Ten sam komunikat dla złego loginu i złego hasła — po co podpowiadać,
  // który login istnieje.
  if (!user) return { ok: false, powod: 'brak-konta' };
  if (user.disabled) return { ok: false, powod: 'konto-wylaczone' };
  const pasuje = await verifyPassword(dane.haslo, user.password);
  return pasuje ? { ok: true, user } : { ok: false, powod: 'zle-haslo' };
}

/** Czy program w ogóle wymaga logowania. Instalacja bez kont działa jak dotąd —
 *  nie zamykamy drzwi komuś, kto pracuje sam i nie prosił o zamek. */
export function wymagaLogowania(state: Pick<AppState, 'users'>): boolean {
  return (state.users || []).some((u) => !u.disabled);
}

/* --------------------------- Uprawnienia --------------------------- */

export const OPISY_STANOWISK: Record<UserRole, string> = {
  wlasciciel: 'Właściciel',
  biuro: 'Biuro',
  warsztat: 'Warsztat'
};

export const OPISY_UPRAWNIEN: Record<UserRole, string> = {
  wlasciciel: 'Wszystko, razem z kontami pracowników i ustawieniami programu.',
  biuro: 'Oferty, dokumenty WZ, cennik i zlecenia. Bez zakładania kont.',
  warsztat: 'Tylko zlecenia: podgląd, etapy i notatki. Bez cen i bez ofert.'
};

export type Uprawnienie =
  | 'oferty'
  | 'dokumenty'
  | 'cennik'
  | 'zestawienia'
  | 'ustawienia'
  | 'konta'
  | 'zlecenia-edycja'
  | 'zlecenia-etapy'
  | 'ceny';

const UPRAWNIENIA: Record<UserRole, Uprawnienie[]> = {
  wlasciciel: [
    'oferty', 'dokumenty', 'cennik', 'zestawienia', 'ustawienia', 'konta',
    'zlecenia-edycja', 'zlecenia-etapy', 'ceny'
  ],
  biuro: ['oferty', 'dokumenty', 'cennik', 'zestawienia', 'ustawienia', 'zlecenia-edycja', 'zlecenia-etapy', 'ceny'],
  // Warsztat ma wiedzieć, co zrobić — nie za ile i nie dla kogo jeszcze
  // szykujemy ofertę. Zlecenia tylko do odczytu, poza etapem i notatką.
  warsztat: ['zlecenia-etapy']
};

export function wolno(user: UserAccount | null, co: Uprawnienie): boolean {
  // Brak kont = program bez logowania; wtedy wszystko wolno, jak dotąd.
  if (!user) return true;
  return UPRAWNIENIA[user.role].includes(co);
}

/** Imię, którym podpisują się wpisy w dzienniku etapów. */
export function podpis(user: UserAccount | null, zapas: string): string {
  return (user?.name || user?.login || zapas || '').trim();
}

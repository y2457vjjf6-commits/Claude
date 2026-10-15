/** Oddziały warsztatu.
 *
 *  Rolety robi kto inny niż moskitiery, a plisy kto inny niż zwykłe żaluzje.
 *  Zamiast kazać komuś pamiętać, kto się czym zajmuje, program rozpoznaje
 *  oddział po nazwie produktu i pokazuje do wyboru **tylko** ludzi z tego
 *  oddziału. Jedna osoba bywa w kilku oddziałach, więc przypisanie to lista.
 */
import type { Department, OfferItem, UserAccount } from '../types';
import { normalizujNazwe } from './photos';

export const ODDZIALY: Department[] = ['rolety', 'zaluzje', 'plisy', 'moskitiery'];

export const OPISY_ODDZIALOW: Record<Department, string> = {
  rolety: 'Rolety',
  zaluzje: 'Żaluzje',
  plisy: 'Żaluzje plisowane',
  moskitiery: 'Moskitiery'
};

/* Kolejność ma znaczenie: „żaluzja plisowana" musi trafić do plis, a nie do
   żaluzji, więc bardziej szczegółowe wzorce stoją wyżej. */
const WZORCE: { dzial: Department; slowa: RegExp }[] = [
  { dzial: 'moskitiery', slowa: /\bmoskitier/ },
  { dzial: 'plisy', slowa: /\bplis/ },
  { dzial: 'zaluzje', slowa: /\bzaluzj|\bvertical|\bzaluzi/ },
  { dzial: 'rolety', slowa: /\brolet|\broleta|\bdzien-noc|\bdzien noc/ }
];

/** Oddział rozpoznany z nazwy produktu (i z wiersza materiału, bo kod tkaniny
 *  czasem stoi tylko tam). Null, gdy nic nie pasuje — wtedy nie zgadujemy. */
export function departmentForProduct(
  item: Pick<OfferItem, 'name' | 'material'>
): Department | null {
  const tekst = normalizujNazwe(`${item?.name || ''} ${item?.material || ''}`);
  if (!tekst.trim()) return null;
  for (const w of WZORCE) if (w.slowa.test(tekst)) return w.dzial;
  return null;
}

/** Kto może wziąć pozycję z tego oddziału. Wyłączone konta i biuro pomijamy —
 *  pozycję robi warsztat, a nie osoba, która wystawiła ofertę. */
export function peopleForDepartment(
  users: UserAccount[] | undefined,
  dzial: Department | null
): UserAccount[] {
  const czynni = (users || []).filter((u) => !u.disabled);
  if (!dzial) return czynni.filter((u) => (u.departments || []).length > 0);
  return czynni.filter((u) => (u.departments || []).includes(dzial));
}

/** Osoba, którą program przypisze sam. Robi to tylko wtedy, gdy wybór jest
 *  jednoznaczny — przy dwóch kandydatach decyzja należy do człowieka. */
export function autoAssignee(
  item: Pick<OfferItem, 'name' | 'material'>,
  users: UserAccount[] | undefined
): string | null {
  const dzial = departmentForProduct(item);
  if (!dzial) return null;
  const ludzie = peopleForDepartment(users, dzial);
  return ludzie.length === 1 ? ludzie[0].login : null;
}

/** Imię do pokazania przy pozycji; nieznany login zostaje jak jest, żeby nie
 *  znikał po skasowaniu konta. */
export function nazwaOsoby(users: UserAccount[] | undefined, login: string | undefined): string {
  if (!login) return '';
  const u = (users || []).find((x) => x.login === login);
  return u ? u.name || u.login : login;
}

/* ----------------------- Kto co widzi i co mu wolno ----------------------- */

/** Czy ta osoba odpowiada za tę pozycję.
 *
 *  Dwa wyjątki są celowe i warto je znać:
 *
 *  1. **Warsztatowiec bez przypisanych oddziałów widzi wszystko.** Inaczej
 *     program po aktualizacji pokazałby pustą listę każdemu, komu nikt jeszcze
 *     oddziału nie zaznaczył — a cicha utrata dostępu jest gorsza niż jego brak.
 *  2. **Pozycja, której rodzaju nie rozpoznaliśmy, jest widoczna dla każdego.**
 *     Nikt za nią nie odpowiada; ukrycie jej przed wszystkimi znaczyłoby, że
 *     robota ginie z oczu całego warsztatu.
 */
export function mojaPozycja(
  user: UserAccount | null,
  item: Pick<OfferItem, 'name' | 'material'>
): boolean {
  // Brak kont albo biuro i właściciel — pełny wgląd, bo oni prowadzą zlecenia
  if (!user || user.role !== 'warsztat') return true;
  const moje = user.departments || [];
  if (!moje.length) return true;
  const dzial = departmentForProduct(item);
  if (!dzial) return true;
  return moje.includes(dzial);
}

/** Czy zlecenie ma cokolwiek dla tej osoby. */
export function mojeZlecenie(
  user: UserAccount | null,
  order: { items: Pick<OfferItem, 'name' | 'material'>[] }
): boolean {
  if (!user || user.role !== 'warsztat') return true;
  if (!(user.departments || []).length) return true;
  return (order.items || []).some((it) => mojaPozycja(user, it));
}

/** Czego ta osoba nie może ruszyć — do wyjaśnienia na ekranie. */
export function powodBlokady(
  user: UserAccount | null,
  item: Pick<OfferItem, 'name' | 'material'>
): string {
  if (mojaPozycja(user, item)) return '';
  const dzial = departmentForProduct(item);
  return dzial
    ? `Ta pozycja należy do oddziału ${OPISY_ODDZIALOW[dzial]} — etap zmienia ktoś z tego oddziału.`
    : 'Ta pozycja nie należy do Twojego oddziału.';
}

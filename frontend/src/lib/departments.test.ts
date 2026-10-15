import {
  autoAssignee,
  mojaPozycja,
  mojeZlecenie,
  powodBlokady,
  departmentForProduct,
  nazwaOsoby,
  ODDZIALY,
  OPISY_ODDZIALOW,
  peopleForDepartment
} from './departments';
import { Department, UserAccount } from '../types';

const osoba = (login: string, departments: Department[], p: Partial<UserAccount> = {}): UserAccount =>
  ({ id: login, login, name: login.toUpperCase(), role: 'warsztat', departments, createdAt: '', password: {} as never, ...p });

const ZALOGA = [
  osoba('czarek', ['rolety', 'zaluzje']),
  osoba('marek', ['moskitiery']),
  osoba('ola', ['plisy']),
  osoba('stary', ['rolety'], { disabled: true }),
  osoba('biuro', [])
];

const poz = (name: string, material = '') => ({ name, material });

test('oddział rozpoznaje się z nazwy produktu', () => {
  expect(departmentForProduct(poz('Roleta kasetowa UNI'))).toBe('rolety');
  expect(departmentForProduct(poz('Żaluzje drewniane 50 mm'))).toBe('zaluzje');
  expect(departmentForProduct(poz('Moskitiera ramkowa'))).toBe('moskitiery');
  expect(departmentForProduct(poz('Plisa Cosimo'))).toBe('plisy');
});

test('żaluzja plisowana to plisy, nie żaluzje', () => {
  expect(departmentForProduct(poz('Żaluzja plisowana VS1'))).toBe('plisy');
  expect(departmentForProduct(poz('Żaluzje plisowane dachowe'))).toBe('plisy');
});

test('odmiana i wielkość liter nie przeszkadzają', () => {
  expect(departmentForProduct(poz('ROLETY WOLNOWISZĄCE MINI 19'))).toBe('rolety');
  expect(departmentForProduct(poz('roleta dzień-noc Midi 32'))).toBe('rolety');
  expect(departmentForProduct(poz('Verticale 127 mm'))).toBe('zaluzje');
});

test('oddział można rozpoznać też z wiersza materiału', () => {
  expect(departmentForProduct(poz('Osłona okienna', 'Moskitiera, siatka czarna'))).toBe('moskitiery');
});

test('czego nie znamy, tego nie zgadujemy', () => {
  expect(departmentForProduct(poz('Markiza tarasowa'))).toBeNull();
  expect(departmentForProduct(poz(''))).toBeNull();
});

test('do wyboru stają tylko ludzie z tego oddziału', () => {
  expect(peopleForDepartment(ZALOGA, 'rolety').map((u) => u.login)).toEqual(['czarek']);
  expect(peopleForDepartment(ZALOGA, 'moskitiery').map((u) => u.login)).toEqual(['marek']);
});

test('jedna osoba bywa w kilku oddziałach', () => {
  expect(peopleForDepartment(ZALOGA, 'zaluzje').map((u) => u.login)).toEqual(['czarek']);
});

test('wyłączone konto nie dostaje roboty', () => {
  expect(peopleForDepartment(ZALOGA, 'rolety').some((u) => u.login === 'stary')).toBe(false);
});

test('bez rozpoznanego oddziału pokazujemy wszystkich przypisanych do jakiegoś', () => {
  expect(peopleForDepartment(ZALOGA, null).map((u) => u.login)).toEqual(['czarek', 'marek', 'ola']);
});

test('program przypisuje sam tylko wtedy, gdy wybór jest jednoznaczny', () => {
  expect(autoAssignee(poz('Roleta kasetowa'), ZALOGA)).toBe('czarek');
  const dwoje = [...ZALOGA, osoba('drugi', ['rolety'])];
  expect(autoAssignee(poz('Roleta kasetowa'), dwoje)).toBeNull();
  expect(autoAssignee(poz('Markiza'), ZALOGA)).toBeNull();
  expect(autoAssignee(poz('Roleta'), [])).toBeNull();
});

test('nazwa osoby zostaje nawet po skasowaniu konta', () => {
  expect(nazwaOsoby(ZALOGA, 'czarek')).toBe('CZAREK');
  expect(nazwaOsoby(ZALOGA, 'ktos-kogo-nie-ma')).toBe('ktos-kogo-nie-ma');
  expect(nazwaOsoby(ZALOGA, undefined)).toBe('');
});

test('każdy oddział ma nazwę po polsku', () => {
  expect(ODDZIALY.every((d) => !!OPISY_ODDZIALOW[d])).toBe(true);
  expect(OPISY_ODDZIALOW.plisy).toBe('Żaluzje plisowane');
});

// --- kto co widzi i co mu wolno ---

const zlecenie = (nazwy: string[]) => ({ items: nazwy.map((n) => ({ name: n, material: '' })) });

test('warsztatowiec widzi tylko pozycje ze swoich oddziałów', () => {
  const czarek = osoba('czarek', ['rolety']);
  expect(mojaPozycja(czarek, poz('Roleta kasetowa UNI'))).toBe(true);
  expect(mojaPozycja(czarek, poz('Żaluzja drewniana 50 mm'))).toBe(false);
  expect(mojaPozycja(czarek, poz('Moskitiera ramkowa'))).toBe(false);
});

test('to samo dotyczy każdego oddziału, nie tylko rolet', () => {
  const marek = osoba('marek', ['moskitiery']);
  expect(mojaPozycja(marek, poz('Moskitiera ramkowa'))).toBe(true);
  expect(mojaPozycja(marek, poz('Roleta kasetowa'))).toBe(false);
  const ola = osoba('ola', ['plisy']);
  expect(mojaPozycja(ola, poz('Żaluzja plisowana'))).toBe(true);
  expect(mojaPozycja(ola, poz('Żaluzja drewniana'))).toBe(false);
});

test('osoba w kilku oddziałach widzi pozycje z każdego z nich', () => {
  const duet = osoba('duet', ['rolety', 'moskitiery']);
  expect(mojaPozycja(duet, poz('Roleta'))).toBe(true);
  expect(mojaPozycja(duet, poz('Moskitiera'))).toBe(true);
  expect(mojaPozycja(duet, poz('Żaluzja'))).toBe(false);
});

test('biuro i właściciel widzą wszystko', () => {
  for (const rola of ['biuro', 'wlasciciel'] as const) {
    const u = { ...osoba('x', ['rolety']), role: rola };
    expect(mojaPozycja(u, poz('Moskitiera'))).toBe(true);
  }
});

test('program bez kont nic nie zasłania', () => {
  expect(mojaPozycja(null, poz('Moskitiera'))).toBe(true);
  expect(mojeZlecenie(null, zlecenie(['Moskitiera']))).toBe(true);
});

test('warsztatowiec bez przypisanego oddziału widzi wszystko', () => {
  const nikt = osoba('nikt', []);
  expect(mojaPozycja(nikt, poz('Moskitiera'))).toBe(true);
  expect(mojeZlecenie(nikt, zlecenie(['Moskitiera']))).toBe(true);
});

test('pozycja nierozpoznanego rodzaju nie ginie nikomu z oczu', () => {
  expect(mojaPozycja(osoba('czarek', ['rolety']), poz('Markiza tarasowa'))).toBe(true);
});

test('zlecenie widać, gdy ma choć jedną pozycję dla tej osoby', () => {
  const czarek = osoba('czarek', ['rolety']);
  expect(mojeZlecenie(czarek, zlecenie(['Żaluzja', 'Roleta']))).toBe(true);
  expect(mojeZlecenie(czarek, zlecenie(['Żaluzja', 'Moskitiera']))).toBe(false);
});

test('blokada tłumaczy się po ludzku', () => {
  const czarek = osoba('czarek', ['rolety']);
  expect(powodBlokady(czarek, poz('Roleta'))).toBe('');
  expect(powodBlokady(czarek, poz('Żaluzja drewniana'))).toMatch(/Żaluzje/);
});

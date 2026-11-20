import {
  createUser,
  findUser,
  hashPassword,
  login,
  normalizujLogin,
  OBROTY,
  ostatniLogin,
  podpis,
  podpowiadanyLogin,
  verifyPassword,
  wolno,
  wymagaLogowania,
  zapamietajLogin
} from './auth';
import { UserAccount } from '../types';

jest.setTimeout(30000);

const konto = async (login: string, role: UserAccount['role'], haslo = 'tajne123') =>
  createUser({ login, name: login, role, haslo });

// --- hasła ---

test('hasło nie trafia do danych w postaci jawnej', async () => {
  const h = await hashPassword('Lechrol2026!');
  expect(JSON.stringify(h)).not.toContain('Lechrol2026!');
  expect(h.algo).toBe('pbkdf2-sha256');
  expect(h.iterations).toBe(OBROTY);
});

test('to samo hasło daje inny skrót dla każdego konta', async () => {
  const a = await hashPassword('takie samo');
  const b = await hashPassword('takie samo');
  expect(a.salt).not.toBe(b.salt);
  expect(a.hash).not.toBe(b.hash);
});

test('sprawdzenie hasła działa w obie strony', async () => {
  const h = await hashPassword('Lechrol2026!');
  await expect(verifyPassword('Lechrol2026!', h)).resolves.toBe(true);
  await expect(verifyPassword('lechrol2026!', h)).resolves.toBe(false);
  await expect(verifyPassword('', h)).resolves.toBe(false);
  await expect(verifyPassword('Lechrol2026!', undefined)).resolves.toBe(false);
});

test('podmieniony skrót nie przepuszcza', async () => {
  const h = await hashPassword('Lechrol2026!');
  await expect(verifyPassword('Lechrol2026!', { ...h, hash: 'AAAA' })).resolves.toBe(false);
  await expect(verifyPassword('Lechrol2026!', { ...h, salt: 'AAAA' })).resolves.toBe(false);
});

// --- logowanie ---

test('login nie zważa na wielkość liter ani spacje', async () => {
  const u = await konto('jacek', 'biuro');
  expect(normalizujLogin('  JACEK ')).toBe('jacek');
  expect(findUser([u], 'JACEK')?.id).toBe(u.id);
  await expect(login([u], { login: ' Jacek ', haslo: 'tajne123' })).resolves.toMatchObject({ ok: true });
});

test('złe hasło i nieznany login nie przechodzą', async () => {
  const u = await konto('jacek', 'biuro');
  await expect(login([u], { login: 'jacek', haslo: 'inne' })).resolves.toEqual({ ok: false, powod: 'zle-haslo' });
  await expect(login([u], { login: 'anna', haslo: 'tajne123' })).resolves.toEqual({
    ok: false,
    powod: 'brak-konta'
  });
});

test('wyłączone konto nie wpuszcza, nawet z dobrym hasłem', async () => {
  const u = { ...(await konto('jacek', 'biuro')), disabled: true };
  await expect(login([u], { login: 'jacek', haslo: 'tajne123' })).resolves.toEqual({
    ok: false,
    powod: 'konto-wylaczone'
  });
});

test('program bez kont działa jak dotąd, bez logowania', async () => {
  expect(wymagaLogowania({ users: [] })).toBe(false);
  expect(wymagaLogowania({ users: undefined })).toBe(false);
  expect(wymagaLogowania({ users: [{ ...(await konto('a', 'biuro')), disabled: true }] })).toBe(false);
  expect(wymagaLogowania({ users: [await konto('a', 'biuro')] })).toBe(true);
});

// --- stanowiska ---

test('warsztat widzi zlecenia i etapy, ale nie ceny i nie oferty', async () => {
  const w = await konto('warsztat', 'warsztat');
  expect(wolno(w, 'zlecenia-etapy')).toBe(true);
  expect(wolno(w, 'ceny')).toBe(false);
  expect(wolno(w, 'oferty')).toBe(false);
  expect(wolno(w, 'zlecenia-edycja')).toBe(false);
  expect(wolno(w, 'ustawienia')).toBe(false);
  expect(wolno(w, 'konta')).toBe(false);
});

test('biuro robi wszystko oprócz kont', async () => {
  const b = await konto('biuro', 'biuro');
  expect(wolno(b, 'oferty')).toBe(true);
  expect(wolno(b, 'ceny')).toBe(true);
  expect(wolno(b, 'zlecenia-edycja')).toBe(true);
  expect(wolno(b, 'ustawienia')).toBe(true);
  expect(wolno(b, 'konta')).toBe(false);
});

test('właściciel może wszystko', async () => {
  const w = await konto('szef', 'wlasciciel');
  for (const co of ['oferty', 'dokumenty', 'cennik', 'zestawienia', 'ustawienia', 'konta', 'ceny'] as const) {
    expect(wolno(w, co)).toBe(true);
  }
});

test('bez zalogowanego nic nie blokujemy — to instalacja bez kont', () => {
  expect(wolno(null, 'konta')).toBe(true);
  expect(wolno(null, 'ceny')).toBe(true);
});

test('wpisy w dzienniku podpisuje imię zalogowanego', async () => {
  const u = await createUser({ login: 'jacek', name: 'Jacek Wajcht', role: 'warsztat', haslo: 'x' });
  expect(podpis(u, 'zapasowy')).toBe('Jacek Wajcht');
  expect(podpis(null, 'Sebastian Wajcht')).toBe('Sebastian Wajcht');
  expect(podpis({ ...u, name: '' }, 'zapas')).toBe('jacek');
});

describe('zapamiętany login na tym komputerze', () => {
  const konto = (login: string, p: Partial<UserAccount> = {}): UserAccount =>
    ({
      id: login,
      login,
      name: login,
      role: 'warsztat',
      password: { algo: 'pbkdf2-sha256', iterations: 1, salt: 'x', hash: 'y' },
      createdAt: '',
      ...p
    } as UserAccount);

  beforeEach(() => window.localStorage.clear());

  it('bez wcześniejszego logowania pole zostaje puste', () => {
    expect(ostatniLogin()).toBe('');
    expect(podpowiadanyLogin([konto('czarek')])).toBe('');
  });

  it('zapamiętany login wraca przy następnym uruchomieniu', () => {
    zapamietajLogin('czarek');
    expect(ostatniLogin()).toBe('czarek');
    expect(podpowiadanyLogin([konto('czarek'), konto('sebastian')])).toBe('czarek');
  });

  it('oddaje pisownię z konta, nie z pamięci', () => {
    zapamietajLogin('  CZAREK ');
    expect(podpowiadanyLogin([konto('Czarek')])).toBe('Czarek');
  });

  it('konto wyłączone albo usunięte nie podpowiada się', () => {
    zapamietajLogin('czarek');
    expect(podpowiadanyLogin([konto('czarek', { disabled: true })])).toBe('');
    expect(podpowiadanyLogin([konto('sebastian')])).toBe('');
    expect(podpowiadanyLogin([])).toBe('');
    expect(podpowiadanyLogin(undefined)).toBe('');
  });

  it('pusty login czyści pamięć', () => {
    zapamietajLogin('czarek');
    zapamietajLogin('   ');
    expect(ostatniLogin()).toBe('');
  });

  it('hasła nie zapamiętujemy — w pamięci stoi sam login', () => {
    zapamietajLogin('czarek');
    const wszystko = JSON.stringify(window.localStorage);
    expect(wszystko).toContain('czarek');
    expect(wszystko.toLowerCase()).not.toContain('haslo');
    expect(wszystko.toLowerCase()).not.toContain('password');
  });

  it('niedostępna pamięć nie wywraca logowania', () => {
    const pierwotny = window.localStorage.getItem;
    // tryb prywatny albo zablokowane dane stron potrafią rzucić wyjątkiem
    Object.defineProperty(window.localStorage, 'getItem', {
      configurable: true,
      value: () => {
        throw new Error('zablokowane');
      }
    });
    expect(ostatniLogin()).toBe('');
    expect(() => zapamietajLogin('czarek')).not.toThrow();
    Object.defineProperty(window.localStorage, 'getItem', { configurable: true, value: pierwotny });
  });
});

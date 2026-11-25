import { Settings } from '../types';

const mailList = jest.fn(async () => ({ ok: true, messages: [] as unknown[] }));
const mailFetch = jest.fn(async () => ({ ok: true, subject: '', text: '' }));
(window as any).wzApi = { mailList, mailFetch };

/* eslint-disable @typescript-eslint/no-var-requires */
const { DEFAULT_STATE } = require('./storage');
const { fetchMailText, listMailbox, mailboxAccount, mailboxReady } = require('./mailbox');

/** `undefined` = skrzynka ustawiona domyślnie, `null` = ustawień w ogóle nie ma
 *  (tak wygląda stan zapisany przez starszą wersję programu). */
const ustawienia = (imap?: Record<string, unknown> | null): Settings => ({
  ...JSON.parse(JSON.stringify(DEFAULT_STATE.settings)),
  smtp: { host: 'smtp.example.pl', port: 465, user: 'biuro@example.pl', pass: 'tajne', from: 'biuro@example.pl' },
  imap: imap === undefined ? { host: 'imap.example.pl', port: 993, user: '', pass: '', sameAsSmtp: true } : imap || undefined
});

beforeEach(() => {
  // CRA ustawia resetMocks: true — implementację trzeba nadać przed każdym testem
  mailList.mockImplementation(async () => ({ ok: true, messages: [] }));
  mailFetch.mockImplementation(async () => ({ ok: true, subject: 'Pomiar', text: 'Roleta\nKuchnia\n60 x 90 L' }));
});

describe('czy skrzynka jest gotowa', () => {
  test('bez adresu serwera nie ma czego pokazywać', () => {
    expect(mailboxReady(ustawienia({ host: '', port: 993, user: '', pass: '' }))).toBe(false);
    // stan zapisany starszą wersją programu nie ma pola `imap` w ogóle
    expect(mailboxReady(ustawienia(null))).toBe(false);
    expect(mailboxAccount(ustawienia(null))).toBeNull();
  });

  test('z adresem serwera i aplikacją na komputerze — gotowa', () => {
    expect(mailboxReady(ustawienia())).toBe(true);
  });

  test('same spacje w adresie to brak adresu', () => {
    expect(mailboxReady(ustawienia({ host: '   ', port: 993, user: '', pass: '' }))).toBe(false);
  });
});

describe('konto do odbioru', () => {
  test('port domyślny, gdy nikt go nie podał', () => {
    expect(mailboxAccount(ustawienia({ host: 'imap.example.pl', port: 0, user: '', pass: '' }))?.port).toBe(993);
  });

  test('spacje wokół adresu serwera nie idą do połączenia', () => {
    expect(mailboxAccount(ustawienia({ host: ' imap.example.pl ', port: 993, user: '', pass: '' }))?.host).toBe(
      'imap.example.pl'
    );
  });
});

describe('lista wiadomości', () => {
  test('nieustawiona skrzynka mówi, gdzie ją ustawić', async () => {
    const res = await listMailbox(ustawienia({ host: '', port: 993, user: '', pass: '' }));
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Ustawieniach/);
    expect(mailList).not.toHaveBeenCalled();
  });

  test('dane wysyłki idą razem z zapytaniem — skrzynka bywa ta sama', async () => {
    await listMailbox(ustawienia(), 15);
    const [konto, smtp, limit] = mailList.mock.calls[0] as unknown[];
    expect((konto as { host: string }).host).toBe('imap.example.pl');
    expect((smtp as { user: string }).user).toBe('biuro@example.pl');
    expect(limit).toBe(15);
  });

  test('błąd serwera wraca treścią, nie wyjątkiem', async () => {
    mailList.mockImplementation(async () => ({ ok: false, error: 'Serwer odrzucił hasło.' } as never));
    const res = await listMailbox(ustawienia());
    expect(res).toEqual({ ok: false, error: 'Serwer odrzucił hasło.' });
  });

  test('zerwane połączenie nie wywraca okna', async () => {
    mailList.mockImplementation(async () => {
      throw new Error('socket hang up');
    });
    const res = await listMailbox(ustawienia());
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/socket hang up/);
  });
});

describe('treść wiadomości', () => {
  test('wiadomość z treścią wraca gotowa do rozłożenia', async () => {
    const res = await fetchMailText(ustawienia(), 7);
    expect(res).toEqual({ ok: true, subject: 'Pomiar', text: 'Roleta\nKuchnia\n60 x 90 L' });
    expect((mailFetch.mock.calls[0] as unknown[])[2]).toBe(7);
  });

  test('pusta treść to podpowiedź, co zrobić — nie cisza', async () => {
    mailFetch.mockImplementation(async () => ({ ok: true, subject: 'Pomiar', text: '   ' } as never));
    const res = await fetchMailText(ustawienia(), 7);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/wklej treść/);
  });
});

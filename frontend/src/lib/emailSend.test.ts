import { Settings, WZDocument } from '../types';

// window.wzApi musi istnieć zanim moduł printing.ts policzy hasApi
const sendEmail = jest.fn(async (_payload: Record<string, unknown>) => ({ ok: true }));
(window as any).wzApi = {
  sendEmail,
  savePdf: jest.fn(),
  printDoc: jest.fn(),
  loadData: jest.fn(),
  saveData: jest.fn(),
  dataLocation: jest.fn(),
  testEmail: jest.fn()
};

/* eslint-disable @typescript-eslint/no-var-requires */
// require dopiero po podstawieniu window.wzApi — moduł liczy dostępność API przy starcie
const { DEFAULT_STATE } = require('./storage');
const { emailDocument } = require('./printing');

const doc = {
  number: '1001/RS/2026',
  dateIssued: '2026-01-01',
  place: 'Łomianki',
  orderNo: '',
  contractor: { name: 'Rolety Siejka', address: '', nip: '', email: 'klient@example.com' },
  items: [],
  notes: '',
  receivedBy: 'Jan Kowalski'
} as unknown as WZDocument;

const settings = (): Settings => ({
  ...JSON.parse(JSON.stringify(DEFAULT_STATE.settings)),
  smtp: { host: 'h12.i-host.pl', port: 465, user: 'biuro@lechrol.pl', pass: 'x', from: 'biuro@lechrol.pl' }
});

beforeEach(() => {
  // CRA ustawia resetMocks: true — implementację trzeba nadać przed każdym testem
  sendEmail.mockImplementation(async (_payload: Record<string, unknown>) => ({ ok: true }));
  document.body.innerHTML = '<div id="print-area"></div>';
});

test('kopia trafia w ukrytej kopii i jest zapowiedziana w pytaniu', async () => {
  const zapytania: string[] = [];
  const confirm = async (msg: string) => { zapytania.push(msg); return true; };

  await emailDocument(doc, settings(), () => {}, confirm);

  expect(zapytania[0]).toContain('klient@example.com');
  expect(zapytania[0]).toContain('lechrol@lechrol.pl');
  expect(sendEmail).toHaveBeenCalledTimes(1);
  const payload = sendEmail.mock.calls[0][0] as Record<string, string>;
  expect(payload.to).toBe('klient@example.com');
  expect(payload.bcc).toBe('lechrol@lechrol.pl');
  expect(payload.text).toContain('Towar odebrał: Jan Kowalski');
});

test('pusty adres kopii — wiadomość idzie tylko do klienta', async () => {
  const st = settings();
  st.emailCopyTo = '';
  await emailDocument(doc, st, () => {}, async () => true);
  expect((sendEmail.mock.calls[0][0] as Record<string, string>).bcc).toBe('');
});

test('anulowanie potwierdzenia nie wysyła nic', async () => {
  await emailDocument(doc, settings(), () => {}, async () => false);
  expect(sendEmail).not.toHaveBeenCalled();
});

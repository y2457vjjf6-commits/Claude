import { Offer, Settings } from '../types';

// window.wzApi musi istnieć, zanim moduły policzą dostępność API
const zapisuje = async (nazwa: string, folder?: string) => ({
  ok: true,
  filePath: (folder ? folder + '/' : '/wybrane/') + nazwa,
  auto: !!folder
});
const savePdf = jest.fn(zapisuje);
(window as any).wzApi = {
  savePdf,
  sendEmail: jest.fn(),
  printDoc: jest.fn(),
  loadData: jest.fn(),
  saveData: jest.fn(),
  dataLocation: jest.fn(),
  testEmail: jest.fn(),
  chooseFolder: jest.fn()
};

/* eslint-disable @typescript-eslint/no-var-requires */
const { DEFAULT_STATE } = require('./storage');
const { savePdfOffer } = require('./offerActions');

const oferta = (p: Partial<Offer> = {}): Offer =>
  ({
    id: 'o1',
    number: 'OF-0014/2026',
    date: '2026-11-25',
    place: 'Łomianki',
    client: 'Akacjowa 12',
    clientEmail: '',
    groups: [{ id: 'g1', header: 'material', items: [{ name: 'Roleta', material: '', qty: '1', unitPrice: '1000' }] }],
    continuousNumbering: true,
    discountEnabled: false,
    discountPercent: '',
    deliveryEnabled: false,
    deliveryPrice: '',
    installationIncluded: true,
    deadlineDays: '14',
    validityEnabled: false,
    validityDays: '30',
    notes: '',
    issuedBy: 'Sebastian',
    status: 'szkic',
    createdAt: '',
    updatedAt: '',
    ...p
  } as Offer);

const ustawienia = (folder?: string): Settings => ({ ...DEFAULT_STATE.settings, offerPdfFolder: folder });

// CRA zeruje atrapy przed każdym testem (resetMocks), więc implementację
// podstawiamy od nowa, a nie tylko czyścimy listę wywołań.
beforeEach(() => {
  savePdf.mockReset();
  savePdf.mockImplementation(zapisuje);
});

describe('folder na pliki ofert', () => {
  it('ze wskazanym folderem PDF idzie tam bez pytania', async () => {
    const toast = jest.fn();
    await savePdfOffer(oferta(), ustawienia('D:/Oferty'), toast);
    expect(savePdf).toHaveBeenCalledWith(expect.stringContaining('OF-0014'), 'D:/Oferty');
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('w folderze ofert'));
  });

  it('bez folderu program pyta, gdzie zapisać — jak dotąd', async () => {
    const toast = jest.fn();
    await savePdfOffer(oferta(), ustawienia(), toast);
    expect(savePdf).toHaveBeenCalledWith(expect.any(String), undefined);
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('Zapisano PDF'));
  });

  it('nazwa pliku niesie numer oferty, więc ponowny zapis nadpisuje swój plik', async () => {
    await savePdfOffer(oferta(), ustawienia('D:/Oferty'), jest.fn());
    await savePdfOffer(oferta(), ustawienia('D:/Oferty'), jest.fn());
    const [a, b] = savePdf.mock.calls;
    expect(a[0]).toBe(b[0]);
    expect(a[0]).toContain('OF-0014');
  });

  it('oferta na sam e-mail też ma sensowną nazwę pliku', async () => {
    await savePdfOffer(oferta({ client: '', clientEmail: 'jan@example.com' }), ustawienia('D:/Oferty'), jest.fn());
    expect(savePdf.mock.calls[0][0]).toContain('jan@example.com');
  });
});

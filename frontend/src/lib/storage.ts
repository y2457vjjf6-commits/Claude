import { AppState } from '../types';

export const DEFAULT_STATE: AppState = {
  settings: {
    theme: 'dark',
    seller: {
      name: 'ZPHU Lechrol',
      address: 'ul. Leśna 6, 05-092 Łomianki',
      nip: '118-135-62-66',
      phone: '511 697 697',
      www: 'lechrol.pl'
    },
    place: 'Łomianki',
    smtp: { host: '', port: 587, user: '', pass: '', from: '' },
    emailSubject: 'Dokument WZ {numer} — Lechrol',
    emailCopyTo: 'lechrol@lechrol.pl',
    backupFolder: '',
    issuers: ['Sebastian Wajcht', 'Jacek Wajcht'],
    offerDefaults: {
      deadlineDays: '21',
      validityDays: '30',
      validityEnabled: false,
      installationIncluded: true
    },
    offerClosingText:
      'Wycena została sporządzona na podstawie dokonanych pomiarów.\n' +
      '• Zamówienie przyjmujemy do realizacji po akceptacji oferty przez Zamawiającego.\n' +
      '• Produkty wykonywane są na indywidualne zamówienie, w wymiarach i kolorach wskazanych ' +
      'przez Zamawiającego. Zgodnie z art. 38 ust. 1 pkt 3 ustawy o prawach konsumenta nie ' +
      'podlegają one zwrotowi.\n' +
      '• Kolory materiałów we wzornikach i na zdjęciach mogą nieznacznie różnić się od rzeczywistych.\n' +
      '• Na wykonane produkty udzielamy 24 miesięcy gwarancji. Gwarancja nie obejmuje uszkodzeń ' +
      'mechanicznych ani skutków niewłaściwego użytkowania.\n' +
      '• Podany termin realizacji może ulec wydłużeniu z przyczyn niezależnych od nas, ' +
      'np. z powodu dostępności materiału u producenta.',
    offerCheckText:
      'Przed przyjęciem zamówienia prosimy o sprawdzenie danych w ofercie: liczby sztuk ' +
      'w każdym pomieszczeniu, kolorów materiału i osprzętu oraz strony sterowania. ' +
      'Akceptacja oferty oznacza potwierdzenie tych danych.',
    offerFollowUpDays: '7',
    showCosts: true,
    emailBody:
      'Dzień dobry,\n\nw załączniku przesyłamy dokument WZ {numer} (wydanie zewnętrzne).\nTowar odebrał: {odebral}\n\nPozdrawiamy,\nZPHU Lechrol\ntel. 511 697 697 · lechrol.pl'
  },
  contractors: [],
  documents: [],
  offers: [],
  priceTables: []
};

export const hasApi = typeof window !== 'undefined' && typeof window.wzApi !== 'undefined';

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function deepMerge(base: any, extra: any): any {
  if (extra === null || extra === undefined) return structuredClone(base);
  if (Array.isArray(base) || typeof base !== 'object') return extra;
  const out: Record<string, unknown> = {};
  for (const key of Array.from(new Set([...Object.keys(base), ...Object.keys(extra)]))) {
    out[key] = key in base ? deepMerge(base[key], extra[key]) : extra[key];
  }
  return out;
}

/** Firma skróciła nazwę z „ZPHU Lechrol Jacek Wajcht" na „ZPHU Lechrol".
 *  Sama zmiana domyślnych ustawień nie wystarczy — u kogoś, kto program już
 *  uruchamiał, stara nazwa siedzi w zapisanych danych i dalej drukowałaby się
 *  na dokumentach. Podmieniamy ją przy wczytaniu, ale tylko dokładnie tę jedną
 *  wartość: nazwę wpisaną ręcznie zostawiamy w spokoju. */
const STARA_NAZWA = 'ZPHU Lechrol Jacek Wajcht';
const NOWA_NAZWA = 'ZPHU Lechrol';

function skrocNazweFirmy(stan: AppState): AppState {
  const s = stan.settings;
  if (s?.seller?.name === STARA_NAZWA) s.seller.name = NOWA_NAZWA;
  if (typeof s?.emailBody === 'string' && s.emailBody.includes(STARA_NAZWA)) {
    s.emailBody = s.emailBody.split(STARA_NAZWA).join(NOWA_NAZWA);
  }
  return stan;
}

export async function loadState(): Promise<AppState> {
  let saved: unknown = null;
  if (hasApi && window.wzApi) {
    saved = await window.wzApi.loadData();
  } else {
    try {
      saved = JSON.parse(localStorage.getItem('lechrol-wz-data') || 'null');
    } catch {
      saved = null;
    }
  }
  return skrocNazweFirmy(deepMerge(DEFAULT_STATE, saved) as AppState);
}

export async function persistState(state: AppState): Promise<void> {
  if (hasApi && window.wzApi) {
    await window.wzApi.saveData(state);
  } else {
    localStorage.setItem('lechrol-wz-data', JSON.stringify(state));
  }
}

export async function dataLocation(): Promise<string | null> {
  if (hasApi && window.wzApi) return window.wzApi.dataLocation();
  return null;
}

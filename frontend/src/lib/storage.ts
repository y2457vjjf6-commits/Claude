import { AppState } from '../types';

export const DEFAULT_STATE: AppState = {
  settings: {
    theme: 'dark',
    seller: {
      name: 'ZPHU Lechrol Jacek Wajcht',
      address: 'ul. Leśna 6, 05-092 Łomianki',
      nip: '',
      phone: '511 697 697',
      www: 'lechrol.pl'
    },
    place: 'Łomianki',
    smtp: { host: '', port: 587, user: '', pass: '', from: '' },
    emailSubject: 'Dokument WZ {numer} — Lechrol',
    emailBody:
      'Dzień dobry,\n\nw załączniku przesyłamy dokument WZ {numer} (wydanie zewnętrzne).\n\nPozdrawiamy,\nZPHU Lechrol Jacek Wajcht\ntel. 511 697 697 · lechrol.pl'
  },
  contractors: [],
  documents: []
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
  return deepMerge(DEFAULT_STATE, saved) as AppState;
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

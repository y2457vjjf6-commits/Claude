import { AppState } from '../types';
import { hasApi } from './storage';

export async function chooseBackupFolder(): Promise<string | null> {
  if (!hasApi || !window.wzApi) return null;
  const res = await window.wzApi.chooseBackupFolder();
  return res.ok && res.folder ? res.folder : null;
}

export async function backupNow(state: AppState): Promise<{ ok: boolean; file?: string; error?: string }> {
  const folder = (state.settings.backupFolder || '').trim();
  if (!folder) return { ok: false, error: 'Nie wskazano folderu kopii zapasowych.' };
  if (!hasApi || !window.wzApi) return { ok: false, error: 'Kopie zapasowe działają tylko w aplikacji na komputerze.' };
  return window.wzApi.backupNow({ state, folder });
}

export async function restoreBackup(
  folder: string
): Promise<{ ok: boolean; state?: AppState; canceled?: boolean; error?: string }> {
  if (!hasApi || !window.wzApi) return { ok: false, error: 'Przywracanie działa tylko w aplikacji na komputerze.' };
  return window.wzApi.restoreBackup(folder);
}

// Kopia w tle — po zapisie danych, bez zawracania głowy użytkownikowi.
// Błędy trafiają tylko do konsoli: brak dostępu do pendrive'a nie może
// blokować pracy z dokumentami.
export function backupInBackground(state: AppState): void {
  if (!(state.settings.backupFolder || '').trim()) return;
  backupNow(state).then((res) => {
    if (!res.ok) console.warn('Kopia zapasowa nie powiodła się:', res.error);
  });
}

// Numeracja dokumentów WZ.
// Format: <miesiąc*10><nr kolejny 2-cyfrowy>/<pierwsza i ostatnia litera kontrahenta>/<rok>
// Przykład: pierwsza WZ dla "Rolety Siejka" z 1 stycznia 2026 -> 1001/RA/2026
import { WZDocument } from '../types';

export function parseDate(dateStr: string): { year: number; month: number } {
  const [y, m] = String(dateStr).split('-').map(Number);
  return { year: y, month: m };
}

export function contractorCode(name: string): string {
  const letters = String(name || '').replace(/[^\p{L}]/gu, '');
  if (!letters) return '??';
  return (letters[0] + letters[letters.length - 1]).toUpperCase();
}

export function buildNumber(dateStr: string, seq: number, contractorName: string, codeOverride?: string): string {
  const { year, month } = parseDate(dateStr);
  const prefix = String(month * 10) + String(seq).padStart(2, '0');
  const code = (codeOverride || '').trim() ? String(codeOverride).trim().toUpperCase() : contractorCode(contractorName);
  return prefix + '/' + code + '/' + year;
}

// Kolejny wolny numer w miesiącu i roku daty wystawienia.
export function nextSeq(documents: WZDocument[], dateStr: string, excludeId?: string | null): number {
  const { year, month } = parseDate(dateStr);
  let max = 0;
  for (const doc of documents || []) {
    if (excludeId && doc.id === excludeId) continue;
    const d = parseDate(doc.dateIssued);
    if (d.year === year && d.month === month && Number(doc.seq) > max) {
      max = Number(doc.seq);
    }
  }
  return max + 1;
}

export function computeNumberFor(
  documents: WZDocument[],
  editingDocId: string | null,
  dateStr: string,
  contractorName: string,
  codeOverride?: string
): { seq: number; number: string } {
  const existing = editingDocId ? documents.find((d) => d.id === editingDocId) || null : null;
  let seq: number;
  if (existing) {
    const oldD = parseDate(existing.dateIssued);
    const newD = parseDate(dateStr);
    seq =
      oldD.year === newD.year && oldD.month === newD.month
        ? existing.seq
        : nextSeq(documents, dateStr, editingDocId);
  } else {
    seq = nextSeq(documents, dateStr);
  }
  return { seq, number: buildNumber(dateStr, seq, contractorName, codeOverride) };
}

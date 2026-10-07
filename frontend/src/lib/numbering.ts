// Numeracja dokumentów WZ.
// Format: <miesiąc*10><nr kolejny 2-cyfrowy>/<pierwsza i ostatnia litera kontrahenta>/<rok>
// Przykład: pierwsza WZ dla "Rolety Siejka" z 1 stycznia 2026 -> 1001/RA/2026
import { Offer, WZDocument } from '../types';

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

/* ------------------------------ Oferty ------------------------------ */
// Numer oferty: OF-0014/2026 — numeracja ciągła w roku, z przedrostkiem,
// żeby na pierwszy rzut oka odróżnić ofertę od dokumentu WZ.

export function buildOfferNumber(dateStr: string, seq: number): string {
  const { year } = parseDate(dateStr);
  return 'OF-' + String(seq).padStart(4, '0') + '/' + year;
}

/** Kolejny wolny numer oferty w roku daty wystawienia. */
export function nextOfferSeq(offers: Offer[], dateStr: string, excludeId?: string | null): number {
  const { year } = parseDate(dateStr);
  let max = 0;
  for (const o of offers || []) {
    if (excludeId && o.id === excludeId) continue;
    if (parseDate(o.date).year === year && Number(o.seq) > max) max = Number(o.seq);
  }
  return max + 1;
}

/** Numer dla edytowanej oferty: zapisany zostaje, dopóki nie zmieni się rok. */
export function computeOfferNumberFor(
  offers: Offer[],
  editingOfferId: string | null,
  dateStr: string
): { seq: number; number: string } {
  const istniejaca = editingOfferId ? offers.find((o) => o.id === editingOfferId) || null : null;
  let seq: number;
  if (istniejaca && istniejaca.seq) {
    seq =
      parseDate(istniejaca.date).year === parseDate(dateStr).year
        ? istniejaca.seq
        : nextOfferSeq(offers, dateStr, editingOfferId);
  } else {
    seq = nextOfferSeq(offers, dateStr, editingOfferId);
  }
  return { seq, number: buildOfferNumber(dateStr, seq) };
}

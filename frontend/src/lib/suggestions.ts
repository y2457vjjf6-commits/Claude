import { WZDocument } from '../types';

/** Nazwy towarów wpisane w dotychczasowych dokumentach — od najczęstszych. */
export function itemNameSuggestions(documents: WZDocument[], limit = 200): string[] {
  const licznik = new Map<string, number>();
  for (const doc of documents || []) {
    for (const it of doc.items || []) {
      const nazwa = (it.name || '').trim();
      if (nazwa) licznik.set(nazwa, (licznik.get(nazwa) || 0) + 1);
    }
  }
  return Array.from(licznik.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pl'))
    .slice(0, limit)
    .map(([nazwa]) => nazwa);
}

/** Jednostki użyte wcześniej (szt., kpl., mb. …). */
export function unitSuggestions(documents: WZDocument[]): string[] {
  const zbior = new Set<string>();
  for (const doc of documents || []) {
    for (const it of doc.items || []) {
      const j = (it.unit || '').trim();
      if (j) zbior.add(j);
    }
  }
  return Array.from(zbior).sort((a, b) => a.localeCompare(b, 'pl'));
}

/** Czy dokument pasuje do frazy — razem z nazwami towarów i osobą odbierającą. */
export function documentMatches(doc: WZDocument, fraza: string): boolean {
  const q = fraza.trim().toLowerCase();
  if (!q) return true;
  const pola: unknown[] = [
    doc.number,
    doc.contractor?.name,
    doc.orderNo,
    doc.dateIssued,
    doc.receivedBy,
    doc.notes,
    ...(doc.items || []).flatMap((it) => [it.name, it.order])
  ];
  return pola.some((v) => String(v || '').toLowerCase().includes(q));
}

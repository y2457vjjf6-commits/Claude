// Numeracja dokumentów WZ.
// Format: <miesiąc*10><nr kolejny 2-cyfrowy>/<pierwsza i ostatnia litera kontrahenta>/<rok>
// Przykład: pierwsza WZ dla "Rolety Siejka" z 1 stycznia 2026 -> 1001/RA/2026
(function (global) {
  'use strict';

  function parseDate(dateStr) {
    // dateStr w formacie YYYY-MM-DD
    const [y, m] = String(dateStr).split('-').map(Number);
    return { year: y, month: m };
  }

  function contractorCode(name) {
    const letters = String(name || '').replace(/[^\p{L}]/gu, '');
    if (!letters) return '??';
    return (letters[0] + letters[letters.length - 1]).toUpperCase();
  }

  function buildNumber(dateStr, seq, contractorName) {
    const { year, month } = parseDate(dateStr);
    const prefix = String(month * 10) + String(seq).padStart(2, '0');
    return prefix + '/' + contractorCode(contractorName) + '/' + year;
  }

  // Kolejny wolny numer w miesiącu i roku daty wystawienia.
  // excludeId pozwala pominąć edytowany dokument (żeby zachował swój numer).
  function nextSeq(documents, dateStr, excludeId) {
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

  const api = { parseDate, contractorCode, buildNumber, nextSeq };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Numbering = api;
})(typeof window !== 'undefined' ? window : globalThis);

const assert = require('assert');
const { contractorCode, buildNumber, nextSeq } = require('../renderer/numbering.js');

// Kod kontrahenta: pierwsza i ostatnia litera całej nazwy
assert.strictEqual(contractorCode('Rolety Siejka'), 'RA');
assert.strictEqual(contractorCode('ABC Sp. z o.o.'), 'AO');
assert.strictEqual(contractorCode('Żaluzje Kowalski'), 'ŻI');
assert.strictEqual(contractorCode(''), '??');
assert.strictEqual(contractorCode('X'), 'XX');

// Przykład z wymagań: pierwsza WZ w styczniu 2026 dla "Rolety Siejka"
assert.strictEqual(buildNumber('2026-01-01', 1, 'Rolety Siejka'), '1001/RA/2026');

// Kolejne miesiące: prefiks = miesiąc * 10
assert.strictEqual(buildNumber('2026-02-05', 3, 'Rolety Siejka'), '2003/RA/2026');
assert.strictEqual(buildNumber('2026-09-10', 12, 'Rolety Siejka'), '9012/RA/2026');
assert.strictEqual(buildNumber('2026-10-01', 1, 'Rolety Siejka'), '10001/RA/2026');
assert.strictEqual(buildNumber('2026-11-02', 7, 'Rolety Siejka'), '11007/RA/2026');
assert.strictEqual(buildNumber('2026-12-31', 45, 'Rolety Siejka'), '12045/RA/2026');

// Numer kolejny liczony osobno dla każdego miesiąca i roku
const docs = [
  { id: 'a', dateIssued: '2026-01-05', seq: 1 },
  { id: 'b', dateIssued: '2026-01-20', seq: 2 },
  { id: 'c', dateIssued: '2026-02-01', seq: 1 },
  { id: 'd', dateIssued: '2025-01-15', seq: 9 }
];
assert.strictEqual(nextSeq(docs, '2026-01-25'), 3);
assert.strictEqual(nextSeq(docs, '2026-02-14'), 2);
assert.strictEqual(nextSeq(docs, '2026-03-01'), 1);
assert.strictEqual(nextSeq(docs, '2025-01-30'), 10);
// Edytowany dokument zachowuje swój numer (jest pomijany w rachunku)
assert.strictEqual(nextSeq(docs, '2026-01-25', 'b'), 2);
assert.strictEqual(nextSeq([], '2026-01-01'), 1);

console.log('OK — wszystkie testy numeracji przeszły.');

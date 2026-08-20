import { buildNumber, contractorCode, nextSeq } from './numbering';
import { WZDocument } from '../types';

const doc = (id: string, dateIssued: string, seq: number) =>
  ({ id, dateIssued, seq } as WZDocument);

test('kod kontrahenta: pierwsza i ostatnia litera nazwy', () => {
  expect(contractorCode('Rolety Siejka')).toBe('RA');
  expect(contractorCode('ABC Sp. z o.o.')).toBe('AO');
  expect(contractorCode('Żaluzje Kowalski')).toBe('ŻI');
  expect(contractorCode('')).toBe('??');
  expect(contractorCode('X')).toBe('XX');
});

test('numer wg wzoru z wymagań: 1001/RA/2026', () => {
  expect(buildNumber('2026-01-01', 1, 'Rolety Siejka')).toBe('1001/RA/2026');
  expect(buildNumber('2026-02-05', 3, 'Rolety Siejka')).toBe('2003/RA/2026');
  expect(buildNumber('2026-09-10', 12, 'Rolety Siejka')).toBe('9012/RA/2026');
  expect(buildNumber('2026-10-01', 1, 'Rolety Siejka')).toBe('10001/RA/2026');
  expect(buildNumber('2026-12-31', 45, 'Rolety Siejka')).toBe('12045/RA/2026');
});

test('numer kolejny liczony osobno dla miesiąca i roku', () => {
  const docs = [
    doc('a', '2026-01-05', 1),
    doc('b', '2026-01-20', 2),
    doc('c', '2026-02-01', 1),
    doc('d', '2025-01-15', 9)
  ];
  expect(nextSeq(docs, '2026-01-25')).toBe(3);
  expect(nextSeq(docs, '2026-02-14')).toBe(2);
  expect(nextSeq(docs, '2026-03-01')).toBe(1);
  expect(nextSeq(docs, '2025-01-30')).toBe(10);
  expect(nextSeq(docs, '2026-01-25', 'b')).toBe(2);
  expect(nextSeq([], '2026-01-01')).toBe(1);
});

test('własny kod kontrahenta nadpisuje kod automatyczny', () => {
  expect(buildNumber('2026-01-01', 1, 'Rolety Siejka', 'RS')).toBe('1001/RS/2026');
  expect(buildNumber('2026-01-01', 1, 'Rolety Siejka', 'rs')).toBe('1001/RS/2026');
  expect(buildNumber('2026-01-01', 1, 'Rolety Siejka', '  ')).toBe('1001/RA/2026');
  expect(buildNumber('2026-01-01', 1, 'Rolety Siejka')).toBe('1001/RA/2026');
});

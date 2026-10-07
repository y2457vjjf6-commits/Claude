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

/* ---------------- Numeracja ofert ---------------- */

import { buildOfferNumber, computeOfferNumberFor, nextOfferSeq } from './numbering';
import { Offer } from '../types';

const of = (id: string, date: string, seq?: number): Offer =>
  ({ id, date, seq, client: '', clientEmail: '', place: '', groups: [], continuousNumbering: true,
     discountEnabled: false, discountPercent: '', deliveryEnabled: false, deliveryPrice: '',
     installationIncluded: true, deadlineDays: '', validityEnabled: false, validityDays: '',
     notes: '', issuedBy: '', status: 'szkic', createdAt: '', updatedAt: '' } as Offer);

test('numer oferty: przedrostek, miesiąc, licznik, rok — wszystko równej długości', () => {
  expect(buildOfferNumber('2026-10-07', 14)).toBe('OF-10-0014-2026');
  expect(buildOfferNumber('2026-01-02', 1)).toBe('OF-01-0001-2026');
  expect(buildOfferNumber('2026-12-31', 1234)).toBe('OF-12-1234-2026');
});

test('numery z różnych miesięcy mają tę samą długość', () => {
  const a = buildOfferNumber('2026-01-02', 1);
  const b = buildOfferNumber('2026-10-07', 147);
  expect(a).toHaveLength(b.length);
});

test('numeracja biegnie przez cały rok, nie resetuje się co miesiąc', () => {
  const oferty = [of('a', '2026-01-10', 1), of('b', '2026-07-02', 2)];
  expect(nextOfferSeq(oferty, '2026-10-07')).toBe(3);
});

test('nowy rok zaczyna numerację od początku', () => {
  const oferty = [of('a', '2026-11-10', 7)];
  expect(nextOfferSeq(oferty, '2027-01-03')).toBe(1);
});

test('edytowana oferta zachowuje swój numer', () => {
  const oferty = [of('a', '2026-03-01', 1), of('b', '2026-04-01', 2)];
  expect(computeOfferNumberFor(oferty, 'a', '2026-03-15').number).toBe('OF-03-0001-2026');
});

test('przeniesienie oferty na kolejny rok daje jej nowy numer', () => {
  const oferty = [of('a', '2026-12-20', 9), of('b', '2027-01-05', 1)];
  expect(computeOfferNumberFor(oferty, 'a', '2027-02-01').number).toBe('OF-02-0002-2027');
});

test('oferta bez numeru dostaje kolejny wolny', () => {
  const oferty = [of('a', '2026-05-01', 3), of('nowa', '2026-05-02')];
  expect(computeOfferNumberFor(oferty, 'nowa', '2026-05-02').number).toBe('OF-05-0004-2026');
});

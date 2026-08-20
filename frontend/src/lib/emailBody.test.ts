import { buildEmailBody } from './printing';
import { WZDocument } from '../types';

const doc = (number: string, receivedBy?: string) =>
  ({ number, receivedBy } as WZDocument);

const TEMPLATE_Z_ZNACZNIKIEM =
  'Dzień dobry,\n\nw załączniku przesyłamy dokument WZ {numer} (wydanie zewnętrzne).\nTowar odebrał: {odebral}\n\nPozdrawiamy';

const TEMPLATE_BEZ_ZNACZNIKA =
  'Dzień dobry,\n\nw załączniku przesyłamy dokument WZ {numer} (wydanie zewnętrzne).\n\nPozdrawiamy';

test('znacznik {odebral} zastąpiony nazwiskiem', () => {
  const out = buildEmailBody(TEMPLATE_Z_ZNACZNIKIEM, doc('1001/RS/2026', 'Jan Kowalski'));
  expect(out).toContain('Towar odebrał: Jan Kowalski');
  expect(out).toContain('WZ 1001/RS/2026');
  expect(out).not.toContain('{odebral}');
});

test('brak odbierającego — wiersz ze znacznikiem znika', () => {
  const out = buildEmailBody(TEMPLATE_Z_ZNACZNIKIEM, doc('1001/RS/2026'));
  expect(out).not.toContain('{odebral}');
  expect(out).not.toContain('Towar odebrał');
  expect(out).toContain('Pozdrawiamy');
});

test('stary szablon bez znacznika — informacja dopisana po akapicie o dokumencie', () => {
  const out = buildEmailBody(TEMPLATE_BEZ_ZNACZNIKA, doc('1001/RS/2026', 'Anna Nowak'));
  const akapity = out.split('\n\n');
  expect(akapity[1]).toContain('WZ 1001/RS/2026');
  expect(akapity[2]).toBe('Towar odebrał: Anna Nowak');
  expect(akapity[3]).toContain('Pozdrawiamy');
});

test('stary szablon bez odbierającego pozostaje bez zmian', () => {
  const out = buildEmailBody(TEMPLATE_BEZ_ZNACZNIKA, doc('1001/RS/2026'));
  expect(out).toBe(TEMPLATE_BEZ_ZNACZNIKA.replace('{numer}', '1001/RS/2026'));
});

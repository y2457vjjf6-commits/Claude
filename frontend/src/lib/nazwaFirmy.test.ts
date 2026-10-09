import { DEFAULT_STATE } from './storage';

test('domyślna nazwa firmy jest skrócona', () => {
  expect(DEFAULT_STATE.settings.seller.name).toBe('ZPHU Lechrol');
  expect(DEFAULT_STATE.settings.emailBody).not.toContain('Jacek Wajcht');
});

test('Jacek Wajcht zostaje jako osoba wystawiająca', () => {
  // skrócona została nazwa firmy, a nie nazwisko pracownika
  expect(DEFAULT_STATE.settings.issuers).toContain('Jacek Wajcht');
});

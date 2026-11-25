import { decodeHeaderText, parseEml } from './eml';
import { parseMeasurementMail } from './measurementMail';

/** Plik .eml zbudowany tak, jak go składa Gmail: ta sama treść dwa razy,
 *  tekstem i HTML-em, polskie znaki w quoted-printable. Układ przepisany
 *  z prawdziwej wiadomości z pomiaru, bez jej danych. */
const GMAIL = [
  'Delivered-To: biuro@example.pl',
  'Subject: Wislana 11c / 1',
  'From: Pomiar <pomiar@example.com>',
  'Date: Wed, 25 Nov 2026 09:21:26 +0100',
  'Content-Type: multipart/alternative; boundary="000000000000abc"',
  '',
  '--000000000000abc',
  'Content-Type: text/plain; charset="UTF-8"',
  'Content-Transfer-Encoding: quoted-printable',
  '',
  '=C5=BBaluzja drewniana 25 kolor do ustalenia',
  'Kuchnia',
  '85,7 x 109 L',
  '',
  '--000000000000abc',
  'Content-Type: text/html; charset="UTF-8"',
  'Content-Transfer-Encoding: quoted-printable',
  '',
  '<div dir=3D"ltr">=C5=BBaluzja drewniana 25<br>Kuchnia<br>85,7 x 109 L</div>',
  '',
  '--000000000000abc--',
  ''
].join('\r\n');

function bajty(tekst: string): Uint8Array {
  const out = new Uint8Array(tekst.length);
  for (let i = 0; i < tekst.length; i += 1) out[i] = tekst.charCodeAt(i) & 0xff;
  return out;
}

describe('plik .eml z poczty', () => {
  test('bierze część tekstową, nie HTML, i rozpakowuje polskie znaki', () => {
    const m = parseEml(bajty(GMAIL));
    expect(m.subject).toBe('Wislana 11c / 1');
    expect(m.from).toBe('Pomiar <pomiar@example.com>');
    expect(m.text).toBe('Żaluzja drewniana 25 kolor do ustalenia\r\nKuchnia\r\n85,7 x 109 L');
  });

  test('z takiego pliku wychodzi gotowy pomiar', () => {
    const m = parseEml(bajty(GMAIL));
    const p = parseMeasurementMail(m.subject, m.text);
    expect(p.product).toBe('Żaluzja drewniana 25 kolor do ustalenia');
    expect(p.items).toEqual([
      { room: 'Kuchnia', width: 85.7, height: 109, side: 'lewa', qty: 1, source: '85,7 x 109 L' }
    ]);
    expect(p.unknown).toEqual([]);
  });

  test('ISO-8859-2 z Outlooka daje te same centymetry co UTF-8 z Gmaila', () => {
    // 0xAF = „Ż" w ISO-8859-2; w UTF-8 ten bajt nie znaczy nic sensownego
    const eml = [
      'Subject: Pomiar',
      'Content-Type: text/plain; charset=ISO-8859-2',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      '=AFaluzja drewniana 25',
      'Sypialnia',
      '88,7 x 132 P',
      ''
    ].join('\r\n');
    const p = parseMeasurementMail('Pomiar', parseEml(bajty(eml)).text);
    expect(p.product).toBe('Żaluzja drewniana 25');
    expect(p.items).toEqual([
      { room: 'Sypialnia', width: 88.7, height: 132, side: 'prawa', qty: 1, source: '88,7 x 132 P' }
    ]);
  });

  test('treść w base64 też się otwiera', () => {
    const tresc = 'Żaluzja drewniana 25\nKuchnia\n59 x 82 P';
    const b64 = Buffer.from(tresc, 'utf8').toString('base64');
    const eml = [
      'Subject: Pomiar',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      b64,
      ''
    ].join('\r\n');
    expect(parseEml(bajty(eml)).text).toBe(tresc);
  });

  test('wiadomość tylko w HTML-u nie zostaje pustym oknem', () => {
    const eml = [
      'Subject: Pomiar',
      'Content-Type: text/html; charset=UTF-8',
      '',
      '<div>Roleta Mini 19<br>Kuchnia<br>120 x 150 L</div>',
      ''
    ].join('\r\n');
    const p = parseMeasurementMail('Pomiar', parseEml(bajty(eml)).text);
    expect(p.product).toBe('Roleta Mini 19');
    expect(p.items).toHaveLength(1);
    expect(p.items[0]).toMatchObject({ room: 'Kuchnia', width: 120, height: 150, side: 'lewa' });
  });

  test('temat zakodowany w nagłówku czyta się po polsku', () => {
    expect(decodeHeaderText('=?UTF-8?B?xbtvbMSFZHogLyAy?=')).toBe('Żolądz / 2');
    expect(decodeHeaderText('=?ISO-8859-2?Q?Pomiar_=B3azienka?=')).toBe('Pomiar łazienka');
    expect(decodeHeaderText('Wislana 11c / 1')).toBe('Wislana 11c / 1');
  });
});

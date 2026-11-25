/** Czytanie wiadomości z pliku `.eml` — temat i treść tekstowa.
 *
 *  Plik z poczty nie jest zwykłym tekstem. Prawdziwa wiadomość z pomiaru
 *  przychodzi jako `multipart/alternative`: ta sama treść dwa razy, raz
 *  tekstem, raz HTML-em, a polskie znaki jadą w `quoted-printable`. Bez
 *  rozpakowania zobaczylibyśmy „=C5=BBaluzja" zamiast „Żaluzja".
 *
 *  Dlatego pracujemy na bajtach, a nie na tekście: nagłówki czytamy jako
 *  ASCII (taka jest specyfikacja), ale treść rozkodowujemy dopiero na końcu,
 *  w kodowaniu, które wiadomość sama podaje. Pomiar z Gmaila idzie w UTF-8,
 *  a ten sam pomiar przesłany Outlookiem bywa w ISO-8859-2 — i oba muszą dać
 *  te same centymetry.
 */

export interface MailMessage {
  subject: string;
  from: string;
  date: string;
  /** Treść tekstowa — to, co rozkłada parser pomiarów */
  text: string;
}

/** Bajty na łańcuch 1:1 (bajt = znak). Na tym da się bezpiecznie szukać
 *  nagłówków i granic części, nie psując jeszcze polskich znaków. */
function naBajtowy(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]);
  return s;
}

function naBajty(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

/** Kodowania, których spodziewamy się po polskiej poczcie. Nieznaną nazwę
 *  czytamy jako UTF-8 — dziś tak wysyła niemal każdy klient pocztowy. */
function dekoduj(bytes: Uint8Array, charset: string): string {
  const nazwa = (charset || 'utf-8').toLowerCase().replace(/^"|"$/g, '');
  try {
    return new TextDecoder(nazwa).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

function dekodujQP(tekst: string): string {
  return tekst
    .replace(/=\r?\n/g, '') // złamanie linii wstawione przez pocztę
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function dekodujBase64(tekst: string): string {
  const czysty = tekst.replace(/[^A-Za-z0-9+/=]/g, '');
  try {
    if (typeof atob === 'function') return atob(czysty);
    return naBajtowy(new Uint8Array(Buffer.from(czysty, 'base64')));
  } catch {
    return '';
  }
}

/** Nagłówki rozciągnięte na kilka linii składamy w jedną — tak wymaga RFC,
 *  a bez tego długi `Content-Type` z granicą części urwałby się w pół. */
function naglowki(blok: string): Record<string, string> {
  const wynik: Record<string, string> = {};
  const linie = blok.replace(/\r\n[ \t]+/g, ' ').replace(/\n[ \t]+/g, ' ').split(/\r?\n/);
  for (const linia of linie) {
    const i = linia.indexOf(':');
    if (i <= 0) continue;
    const klucz = linia.slice(0, i).trim().toLowerCase();
    if (!(klucz in wynik)) wynik[klucz] = linia.slice(i + 1).trim();
  }
  return wynik;
}

/** Temat bywa zakodowany: `=?UTF-8?B?...?=` albo `=?ISO-8859-2?Q?...?=`. */
export function decodeHeaderText(wartosc: string): string {
  const scalone = wartosc.replace(/\?=[ \t]+=\?/g, '?==?'); // sąsiednie słowa kodowane
  return scalone.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, tryb, dane) => {
    const bajty = String(tryb).toUpperCase() === 'B' ? dekodujBase64(dane) : dekodujQP(String(dane).replace(/_/g, ' '));
    return dekoduj(naBajty(bajty), charset);
  });
}

function wartoscParametru(naglowek: string, nazwa: string): string {
  const m = new RegExp(nazwa + '\\s*=\\s*("([^"]*)"|[^;\\s]+)', 'i').exec(naglowek || '');
  return m ? (m[2] !== undefined ? m[2] : m[1]) : '';
}

/** Treść tekstowa z jednej części wiadomości; przy `multipart` wchodzimy
 *  w środek i bierzemy pierwszy kawałek `text/plain`. Gdy wiadomość jest
 *  wyłącznie HTML-em, zdejmujemy znaczniki — lepsze to niż puste okno. */
function tekstCzesci(czesc: string, glebokosc = 0): string {
  const podzial = /\r?\n\r?\n/.exec(czesc);
  const blokNaglowkow = podzial ? czesc.slice(0, podzial.index) : '';
  const cialo = podzial ? czesc.slice(podzial.index + podzial[0].length) : czesc;
  const h = naglowki(blokNaglowkow);
  const typ = (h['content-type'] || 'text/plain').toLowerCase();

  if (typ.startsWith('multipart/') && glebokosc < 5) {
    const granica = wartoscParametru(h['content-type'], 'boundary');
    if (!granica) return '';
    const kawalki = cialo.split('--' + granica);
    const tekstowe: string[] = [];
    const html: string[] = [];
    for (const k of kawalki.slice(1)) {
      if (/^--/.test(k)) break; // domknięcie listy części
      const t = tekstCzesci(k.replace(/^\r?\n/, ''), glebokosc + 1);
      if (!t.trim()) continue;
      (/html/i.test(k.slice(0, 400)) ? html : tekstowe).push(t);
    }
    return (tekstowe[0] || html[0] || '').trim();
  }

  if (!typ.startsWith('text/')) return '';

  const kodowanie = (h['content-transfer-encoding'] || '7bit').toLowerCase();
  const surowe =
    kodowanie === 'quoted-printable' ? dekodujQP(cialo) : kodowanie === 'base64' ? dekodujBase64(cialo) : cialo;
  const tekst = dekoduj(naBajty(surowe), wartoscParametru(h['content-type'], 'charset'));
  if (!typ.startsWith('text/html')) return tekst;
  return tekst
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

export function parseEml(bytes: Uint8Array): MailMessage {
  const surowy = naBajtowy(bytes);
  const podzial = /\r?\n\r?\n/.exec(surowy);
  const h = naglowki(podzial ? surowy.slice(0, podzial.index) : surowy);
  return {
    subject: decodeHeaderText(h['subject'] || ''),
    from: decodeHeaderText(h['from'] || ''),
    date: h['date'] || '',
    text: tekstCzesci(surowy)
  };
}

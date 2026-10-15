/** Mały serwer do zdjęć kontroli jakości.
 *
 *  Telefon skanuje kod ze zlecenia, otwiera stronę serwowaną przez sam program
 *  i odsyła zdjęcie. Wszystko dzieje się w sieci lokalnej warsztatu — żadna
 *  chmura, żadne konto, żaden ruch na zewnątrz. Warunek: telefon i komputer
 *  muszą być w tej samej sieci Wi-Fi.
 *
 *  Dostęp chroni token, który siedzi wyłącznie w kodzie QR. Kto nie ma kodu,
 *  nie trafi na stronę zlecenia. To zamek na miarę warsztatu, a nie banku:
 *  ktoś w tej samej sieci, kto zobaczy czyjś kod, zdjęcie dorzucić może.
 */
const http = require('http');
const os = require('os');
const crypto = require('crypto');

/** Zdjęcie z telefonu bywa ciężkie; ponad 12 MB odrzucamy, zamiast zatykać
 *  pamięć programu. Przeglądarka i tak zmniejsza je przed wysłaniem. */
const LIMIT_BAJTOW = 12 * 1024 * 1024;

let serwer = null;
let port = 0;
/** token → { orderId, numer } */
const zlecenia = new Map();
let naZdjecie = () => {};

/** Pierwszy adres w sieci lokalnej. Bez niego kod QR prowadziłby donikąd. */
function adresLokalny() {
  for (const karty of Object.values(os.networkInterfaces())) {
    for (const k of karty || []) {
      if (k.family === 'IPv4' && !k.internal) return k.address;
    }
  }
  return null;
}

function strona(numer, token, komunikat) {
  return `<!doctype html>
<html lang="pl"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kontrola jakości — ${numer}</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; max-width: 520px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .numer { font-size: 15px; color: #666; margin-bottom: 24px; }
  label.btn, button {
    display: block; width: 100%; box-sizing: border-box; padding: 18px;
    font-size: 18px; text-align: center; border-radius: 12px; border: 0;
    background: #2E68DA; color: #fff; margin-bottom: 12px; cursor: pointer;
  }
  button[disabled] { opacity: .5; }
  input[type=file] { display: none; }
  img { width: 100%; border-radius: 12px; margin-bottom: 12px; }
  .ok { color: #0a7; font-size: 17px; }
  .blad { color: #c33; font-size: 17px; }
  .info { color: #666; font-size: 14px; line-height: 1.5; }
</style></head>
<body>
  <h1>Kontrola jakości</h1>
  <div class="numer">Zlecenie ${numer}</div>
  ${komunikat || ''}
  <label class="btn">Zrób zdjęcie<input id="plik" type="file" accept="image/*" capture="environment"></label>
  <img id="podglad" hidden alt="">
  <button id="wyslij" hidden>Wyślij do zlecenia</button>
  <p id="stan" class="info">Zdjęcie trafi prosto do zlecenia w programie.</p>
<script>
  var plik = document.getElementById('plik');
  var podglad = document.getElementById('podglad');
  var wyslij = document.getElementById('wyslij');
  var stan = document.getElementById('stan');
  var dane = null;

  plik.addEventListener('change', function () {
    var f = plik.files && plik.files[0];
    if (!f) return;
    var czytnik = new FileReader();
    czytnik.onload = function () {
      var obraz = new Image();
      obraz.onload = function () {
        // Zmniejszamy w telefonie: po sieci idzie wtedy kilkaset kilobajtów,
        // a nie kilkanaście megabajtów, i program nie puchnie od zdjęć.
        var bok = Math.min(1600, Math.max(obraz.width, obraz.height));
        var skala = bok / Math.max(obraz.width, obraz.height);
        var p = document.createElement('canvas');
        p.width = Math.round(obraz.width * skala);
        p.height = Math.round(obraz.height * skala);
        p.getContext('2d').drawImage(obraz, 0, 0, p.width, p.height);
        dane = p.toDataURL('image/jpeg', 0.85);
        podglad.src = dane;
        podglad.hidden = false;
        wyslij.hidden = false;
        stan.textContent = 'Gotowe do wysłania.';
      };
      obraz.src = czytnik.result;
    };
    czytnik.readAsDataURL(f);
  });

  wyslij.addEventListener('click', function () {
    if (!dane) return;
    wyslij.disabled = true;
    stan.textContent = 'Wysyłam…';
    fetch(location.pathname, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photo: dane })
    })
      .then(function (r) { if (!r.ok) throw new Error('odmowa'); return r.json(); })
      .then(function () {
        stan.className = 'ok';
        stan.textContent = 'Zdjęcie dodane do zlecenia. Można zrobić kolejne.';
        wyslij.hidden = true;
        wyslij.disabled = false;
        dane = null;
      })
      .catch(function () {
        stan.className = 'blad';
        stan.textContent = 'Nie udało się wysłać. Sprawdź, czy telefon jest w tej samej sieci Wi-Fi.';
        wyslij.disabled = false;
      });
  });
<\/script>
</body></html>`;
}

function odczytajTresc(req) {
  return new Promise((spelnij, odrzuc) => {
    let ile = 0;
    const kawalki = [];
    req.on('data', (c) => {
      ile += c.length;
      if (ile > LIMIT_BAJTOW) {
        odrzuc(new Error('za duże'));
        req.destroy();
        return;
      }
      kawalki.push(c);
    });
    req.on('end', () => spelnij(Buffer.concat(kawalki).toString('utf8')));
    req.on('error', odrzuc);
  });
}

function obsluz(req, res) {
  const sciezka = new URL(req.url, 'http://localhost').pathname;
  const token = /^\/q\/([a-f0-9]{32})$/.exec(sciezka)?.[1];
  const zlecenie = token ? zlecenia.get(token) : null;

  if (!zlecenie) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<meta charset="utf-8"><p style="font:16px system-ui">Ten kod już nie działa. Otwórz zlecenie w programie i pokaż kod jeszcze raz.</p>');
    return;
  }

  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(strona(zlecenie.numer, token, ''));
    return;
  }

  if (req.method === 'POST') {
    odczytajTresc(req)
      .then((tekst) => {
        const dane = JSON.parse(tekst);
        const foto = String(dane.photo || '');
        if (!/^data:image\/(jpeg|png|webp);base64,/.test(foto)) throw new Error('to nie obraz');
        naZdjecie({ orderId: zlecenie.orderId, dataUrl: foto });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"ok":true}');
      })
      .catch(() => {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end('{"ok":false}');
      });
    return;
  }

  res.writeHead(405);
  res.end();
}

/** Startuje serwer (jeśli trzeba) i rejestruje zlecenie. Zwraca adres,
 *  który trafia do kodu QR, albo powód, dla którego się nie da. */
function start({ orderId, numer }) {
  const ip = adresLokalny();
  if (!ip) return Promise.resolve({ error: 'Komputer nie jest w żadnej sieci lokalnej.' });

  const token = crypto.randomBytes(16).toString('hex');
  zlecenia.set(token, { orderId, numer: numer || '' });

  if (serwer) return Promise.resolve({ url: `http://${ip}:${port}/q/${token}`, token });

  return new Promise((spelnij) => {
    serwer = http.createServer(obsluz);
    serwer.on('error', (e) => {
      serwer = null;
      spelnij({ error: `Nie udało się uruchomić odbioru zdjęć: ${e.message}` });
    });
    // 0 = system przydziela wolny port; nie walczymy o stały numer
    serwer.listen(0, '0.0.0.0', () => {
      port = serwer.address().port;
      spelnij({ url: `http://${ip}:${port}/q/${token}`, token });
    });
  });
}

/** Zamyka jedno okno na zdjęcia. Serwer zostaje — koszt to jeden port,
 *  a kolejne zlecenie i tak go potrzebuje. */
function stop(token) {
  if (token) zlecenia.delete(token);
}

function zamknij() {
  if (serwer) serwer.close();
  serwer = null;
  zlecenia.clear();
}

module.exports = {
  start,
  stop,
  zamknij,
  naZdjecie: (cb) => {
    naZdjecie = cb;
  }
};

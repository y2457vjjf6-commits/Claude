const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');

// Pola dat i formatowanie liczb mają być polskie niezależnie od ustawień systemu
app.commandLine.appendSwitch('lang', 'pl-PL');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow = null;

// Tło okna (ciemny motyw) wchodzi w marginesy strony przy generowaniu PDF
// i przy drukowaniu — na czas renderowania dokumentu przestawiamy je na białe.
const WINDOW_BG = '#1D1813';

const qcServer = require('./qc-server');

const dataFile = () => path.join(app.getPath('userData'), 'dane-wz.json');
const backupFile = () => path.join(app.getPath('userData'), 'dane-wz.backup.json');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 640,
    title: 'Lechrol WZ',
    backgroundColor: WINDOW_BG,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.setMenuBarVisibility(false);
  const startUrl = process.env.ELECTRON_START_URL;
  if (startUrl) {
    mainWindow.loadURL(startUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'build', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// ---------- Kontrola jakości: zdjęcia z telefonu ----------

ipcMain.handle('qc:start', (_zd, dane) => qcServer.start(dane || {}));
ipcMain.handle('qc:stop', (_zd, token) => {
  qcServer.stop(token);
  return true;
});

// Zdjęcie przyszło z telefonu — przekazujemy je do okna, bo to ono wie,
// jak dopisać je do zlecenia i zapisać dane.
qcServer.naZdjecie((foto) => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('qc:photo', foto);
});

app.on('before-quit', () => qcServer.zamknij());

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------- Dane (plik JSON w katalogu użytkownika) ----------

ipcMain.handle('data:load', async () => {
  try {
    return JSON.parse(fs.readFileSync(dataFile(), 'utf8'));
  } catch (err) {
    // Uszkodzony plik główny — spróbuj kopii zapasowej
    try {
      return JSON.parse(fs.readFileSync(backupFile(), 'utf8'));
    } catch {
      return null;
    }
  }
});

ipcMain.handle('data:save', async (_ev, state) => {
  const target = dataFile();
  const tmp = target + '.tmp';
  const json = JSON.stringify(state, null, 2);
  // Zapis atomowy: najpierw plik tymczasowy, potem podmiana; stara wersja idzie do kopii
  fs.writeFileSync(tmp, json, 'utf8');
  if (fs.existsSync(target)) {
    fs.copyFileSync(target, backupFile());
  }
  fs.renameSync(tmp, target);
  return { ok: true };
});

ipcMain.handle('data:location', async () => dataFile());

// ---------- Kopia zapasowa danych ----------

ipcMain.handle('backup:choose', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Wybierz folder na kopie zapasowe',
    properties: ['openDirectory', 'createDirectory']
  });
  if (canceled || !filePaths.length) return { ok: false, canceled: true };
  return { ok: true, folder: filePaths[0] };
});

// Jedna kopia na dzień — nadpisywana w ciągu dnia, więc w folderze
// zostaje historia dzienna bez zaśmiecania go setkami plików.
ipcMain.handle('backup:now', async (_ev, { state, folder }) => {
  if (!folder) return { ok: false, error: 'Nie wskazano folderu kopii zapasowych.' };
  try {
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    const d = new Date();
    const stamp = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    const file = path.join(folder, `dane-wz-${stamp}.json`);
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmp, file);
    return { ok: true, file };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

ipcMain.handle('backup:restore', async (_ev, folder) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Wybierz plik kopii zapasowej',
    defaultPath: folder && fs.existsSync(folder) ? folder : app.getPath('documents'),
    filters: [{ name: 'Kopia danych', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths.length) return { ok: false, canceled: true };
  try {
    const dane = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'));
    if (!dane || typeof dane !== 'object' || !Array.isArray(dane.documents)) {
      return { ok: false, error: 'Wybrany plik nie wygląda na kopię danych programu.' };
    }
    return { ok: true, state: dane };
  } catch (err) {
    return { ok: false, error: 'Nie udało się odczytać pliku: ' + String(err.message || err) };
  }
});

// ---------- Drukowanie / PDF ----------

// Marginesy pochodzą z reguły @page w print.css (preferCSSPageSize)
const PDF_OPTIONS = {
  pageSize: 'A4',
  printBackground: true,
  preferCSSPageSize: true
};

function bezpieczny(tekst) {
  return String(tekst || '').replace(/[&<>"]/g, (z) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[z]);
}

// Nagłówek i stopka rysują się w marginesie strony i powtarzają na każdej.
// Element przyklejony w treści dokumentu nachodziłby na tekst od drugiej strony,
// a licznik stron da się uzyskać wyłącznie tą drogą — CSS tego nie potrafi.
const STYL_PAGINY = 'font-family:Arial,Helvetica,sans-serif;font-size:7pt;color:#55595e;width:100%;padding:0 18mm;';

function szablonNaglowka(opis) {
  return `<div style="${STYL_PAGINY}">${bezpieczny(opis)}</div>`;
}

const SZABLON_STOPKI =
  `<div style="${STYL_PAGINY}text-align:right;">Strona <span class="pageNumber"></span>` +
  ` z <span class="totalPages"></span></div>`;

/** Opis do żywej paginy deklaruje sam dokument — WZ go nie ma i wtedy
 *  w nagłówku zostaje sama kreska, a numer strony i tak się drukuje. */
async function opisPaginy() {
  try {
    return await mainWindow.webContents.executeJavaScript(
      `(document.querySelector('#print-area [data-pagina]') || {}).dataset?.pagina || ''`
    );
  } catch {
    return '';
  }
}

async function renderDocumentPdf() {
  mainWindow.setBackgroundColor('#ffffff');
  try {
    const opis = await opisPaginy();
    return await mainWindow.webContents.printToPDF({
      ...PDF_OPTIONS,
      displayHeaderFooter: true,
      headerTemplate: szablonNaglowka(opis),
      footerTemplate: SZABLON_STOPKI
    });
  } finally {
    mainWindow.setBackgroundColor(WINDOW_BG);
  }
}

ipcMain.handle('doc:print', async () => {
  mainWindow.setBackgroundColor('#ffffff');
  return new Promise((resolve) => {
    mainWindow.webContents.print({ silent: false, printBackground: true }, (success, reason) => {
      mainWindow.setBackgroundColor(WINDOW_BG);
      resolve(success ? { ok: true } : { ok: false, error: reason || 'Anulowano drukowanie' });
    });
  });
});

ipcMain.handle('folder:choose', async (_ev, tytul) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: tytul || 'Wybierz folder',
    properties: ['openDirectory', 'createDirectory']
  });
  if (canceled || !filePaths.length) return { ok: false, canceled: true };
  return { ok: true, folder: filePaths[0] };
});

/** Zapis PDF-u. Ze wskazanym folderem idzie tam od razu, bez okna wyboru —
 *  to jest ten „wyznaczony folder na oferty”. Bez folderu pyta jak dotąd.
 *
 *  Nie otwieramy Eksploratora przy zapisie do folderu: przy kilku ofertach
 *  pod rząd okno wyskakiwałoby za każdym razem. Przy ręcznym zapisie, gdzie
 *  człowiek sam wskazał miejsce, pokazujemy plik tak jak wcześniej.
 */
ipcMain.handle('doc:savePdf', async (_ev, suggestedName, folder) => {
  let filePath = '';
  const doFolderu = String(folder || '').trim();
  if (doFolderu) {
    try {
      fs.mkdirSync(doFolderu, { recursive: true });
      filePath = path.join(doFolderu, suggestedName);
    } catch (err) {
      // Folder zniknął albo dysk odłączony — nie gubimy dokumentu, tylko
      // pytamy, gdzie go położyć.
      filePath = '';
    }
  }
  if (!filePath) {
    const wybor = await dialog.showSaveDialog(mainWindow, {
      title: 'Zapisz dokument jako PDF',
      defaultPath: path.join(app.getPath('documents'), suggestedName),
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (wybor.canceled || !wybor.filePath) return { ok: false, canceled: true };
    filePath = wybor.filePath;
  }
  try {
    const pdf = await renderDocumentPdf();
    fs.writeFileSync(filePath, pdf);
    if (!doFolderu) shell.showItemInFolder(filePath);
    return { ok: true, filePath, auto: !!doFolderu };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

ipcMain.handle('doc:testEmail', async (_ev, smtp) => {
  if (!smtp || !smtp.host || !smtp.user) {
    return { ok: false, error: 'Uzupełnij serwer SMTP i login.' };
  }
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port) || 587,
      secure: Number(smtp.port) === 465,
      auth: { user: smtp.user, pass: smtp.pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000
    });
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: describeSmtpError(err) };
  }
});

// Techniczne komunikaty nodemailera na podpowiedzi zrozumiałe dla użytkownika
function describeSmtpError(err) {
  const code = err && err.code;
  const msg = String((err && err.message) || err);
  if (code === 'EAUTH') {
    return 'Serwer odrzucił login lub hasło. Sprawdź, czy jako login podajesz pełny adres e-mail.';
  }
  if (code === 'ENOTFOUND' || code === 'EDNS') {
    return 'Nie znaleziono takiego serwera. Sprawdź pisownię adresu serwera SMTP.';
  }
  if (code === 'ETIMEDOUT' || code === 'ECONNECTION' || code === 'ESOCKET') {
    return 'Brak połączenia z serwerem. Sprawdź adres i port (465 albo 587) oraz połączenie z internetem. Port mógł też zostać zablokowany przez zaporę lub antywirus. Szczegóły: ' + msg;
  }
  return msg;
}

/* ----------------------- skrzynka odbiorcza (IMAP) -----------------------
 *
 *  Pomiary przychodzą mailem, więc program umie je stamtąd wziąć sam. Czyta
 *  i tylko czyta: nie kasuje, nie przenosi i nie oznacza wiadomości jako
 *  przeczytanej (`FETCH` idzie w trybie `peek`). Skrzynka pomiarowca ma
 *  wyglądać tak samo przed i po imporcie.
 */

/** Dane logowania do odbioru. Dostawcy zwykle mają jeden login do wysyłki
 *  i odbioru, więc domyślnie bierzemy je z ustawień SMTP — żeby nie wpisywać
 *  tego samego hasła dwa razy i nie pilnować dwóch kopii przy zmianie. */
function daneImap(imap, smtp) {
  const user = imap.sameAsSmtp === false ? imap.user : (smtp && smtp.user) || imap.user;
  const pass = imap.sameAsSmtp === false ? imap.pass : (smtp && smtp.pass) || imap.pass;
  const port = Number(imap.port) || 993;
  return {
    host: String(imap.host || '').trim(),
    port,
    // 993 to połączenie szyfrowane od początku, 143 szyfrowane dopiero po STARTTLS
    secure: port !== 143,
    auth: { user: String(user || '').trim(), pass: String(pass || '') },
    folder: String(imap.folder || '').trim() || 'INBOX'
  };
}

/** Jedno połączenie na jedną operację: program pracuje offline i zagląda do
 *  skrzynki rzadko, więc trzymanie otwartego połączenia tylko mnożyłoby
 *  sposoby, na jakie może się zerwać. */
async function zeSkrzynka(imap, smtp, praca) {
  const d = daneImap(imap, smtp);
  if (!d.host || !d.auth.user) {
    return { ok: false, error: 'Uzupełnij serwer skrzynki odbiorczej i login w Ustawieniach → Poczta.' };
  }
  const { ImapFlow } = require('imapflow');
  const client = new ImapFlow({
    host: d.host,
    port: d.port,
    secure: d.secure,
    auth: d.auth,
    logger: false,
    emitLogs: false,
    socketTimeout: 45000,
    greetingTimeout: 20000
  });
  try {
    await client.connect();
  } catch (err) {
    return { ok: false, error: opiszBladImap(err) };
  }
  let lock = null;
  try {
    lock = await client.getMailboxLock(d.folder);
    return await praca(client);
  } catch (err) {
    return { ok: false, error: opiszBladImap(err) };
  } finally {
    if (lock) { try { lock.release(); } catch {} }
    try { await client.logout(); } catch { try { client.close(); } catch {} }
  }
}

function opiszBladImap(err) {
  const kod = (err && (err.code || err.responseStatus)) || '';
  const tresc = String((err && err.message) || err);
  if (/AUTHENTICATIONFAILED/i.test(tresc) || kod === 'AUTHENTICATIONFAILED') {
    return 'Serwer odrzucił login lub hasło. Sprawdź, czy jako login podajesz pełny adres e-mail, a przy Gmailu — czy używasz hasła do aplikacji.';
  }
  if (kod === 'ENOTFOUND' || kod === 'EDNS') {
    return 'Nie znaleziono takiego serwera. Sprawdź pisownię adresu skrzynki odbiorczej (zwykle zaczyna się od „imap.").';
  }
  if (kod === 'ETIMEDOUT' || kod === 'ECONNECTION' || kod === 'ESOCKET' || kod === 'ECONNREFUSED') {
    return 'Brak połączenia ze skrzynką. Sprawdź adres i port (993 albo 143) oraz połączenie z internetem. Port mógł też zostać zablokowany przez zaporę lub antywirus. Szczegóły: ' + tresc;
  }
  if (/\[NONEXISTENT\]|Mailbox doesn't exist|no such mailbox/i.test(tresc)) {
    return 'Na serwerze nie ma takiego folderu. Zostaw pole puste, żeby czytać ze skrzynki odbiorczej (INBOX).';
  }
  return tresc;
}

/** Nadawca w postaci, jaką widać w poczcie: „Jan Kowalski <jan@...>”. */
function nadawca(koperta) {
  const kto = (koperta && koperta.from && koperta.from[0]) || null;
  if (!kto) return '';
  const adres = kto.address || '';
  const imie = (kto.name || '').trim();
  return imie && imie !== adres ? `${imie} <${adres}>` : adres;
}

ipcMain.handle('mail:test', async (_ev, imap, smtp) => {
  return zeSkrzynka(imap, smtp, async (client) => ({
    ok: true,
    count: (client.mailbox && client.mailbox.exists) || 0
  }));
});

ipcMain.handle('mail:list', async (_ev, imap, smtp, limit) => {
  const ile = Math.min(Math.max(Number(limit) || 30, 1), 200);
  return zeSkrzynka(imap, smtp, async (client) => {
    const wszystkich = (client.mailbox && client.mailbox.exists) || 0;
    if (!wszystkich) return { ok: true, messages: [] };
    // numery porządkowe, nie UID-y: ostatnie `ile` wiadomości w folderze
    const od = Math.max(1, wszystkich - ile + 1);
    const messages = [];
    for await (const m of client.fetch(`${od}:*`, { uid: true, envelope: true, flags: true })) {
      const koperta = m.envelope || {};
      messages.push({
        uid: m.uid,
        subject: koperta.subject || '(bez tematu)',
        from: nadawca(koperta),
        date: koperta.date ? new Date(koperta.date).toISOString() : '',
        seen: !!(m.flags && m.flags.has && m.flags.has('\\Seen'))
      });
    }
    messages.reverse(); // najnowsze na górze
    return { ok: true, messages };
  });
});

ipcMain.handle('mail:fetch', async (_ev, imap, smtp, uid) => {
  return zeSkrzynka(imap, smtp, async (client) => {
    // `source` bez zdejmowania flagi „przeczytane” — zaglądamy, nie czytamy
    const wiadomosc = await client.fetchOne(String(uid), { uid: true, source: true, envelope: true }, { uid: true });
    if (!wiadomosc || !wiadomosc.source) {
      return { ok: false, error: 'Nie udało się pobrać tej wiadomości. Mogła zostać w międzyczasie przeniesiona.' };
    }
    const { simpleParser } = require('mailparser');
    const mail = await simpleParser(wiadomosc.source);
    const tekst = (mail.text || '').trim() || odHtml(mail.html || '');
    return {
      ok: true,
      subject: mail.subject || (wiadomosc.envelope && wiadomosc.envelope.subject) || '',
      from: (mail.from && mail.from.text) || nadawca(wiadomosc.envelope),
      date: mail.date ? new Date(mail.date).toISOString() : '',
      text: tekst
    };
  });
});

/** Wiadomość wysłana wyłącznie w HTML-u też ma oddać wymiary, a nie puste okno. */
function odHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h\d)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

ipcMain.handle('doc:email', async (_ev, payload) => {
  const { smtp, to, bcc, subject, text, filename } = payload;
  if (!smtp || !smtp.host || !smtp.user) {
    return { ok: false, error: 'Brak konfiguracji poczty. Uzupełnij dane SMTP w Ustawieniach.' };
  }
  let tmpPath = null;
  try {
    const nodemailer = require('nodemailer');
    const pdf = await renderDocumentPdf();
    tmpPath = path.join(os.tmpdir(), filename);
    fs.writeFileSync(tmpPath, pdf);

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: Number(smtp.port) || 587,
      secure: Number(smtp.port) === 465,
      auth: { user: smtp.user, pass: smtp.pass }
    });
    await transporter.sendMail({
      from: smtp.from || smtp.user,
      to,
      ...(bcc ? { bcc } : {}),
      subject,
      text,
      attachments: [{ filename, path: tmpPath }]
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: describeSmtpError(err) };
  } finally {
    if (tmpPath) { try { fs.unlinkSync(tmpPath); } catch {} }
  }
});

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow = null;

// Tło okna (ciemny motyw) wchodzi w marginesy strony przy generowaniu PDF
// i przy drukowaniu — na czas renderowania dokumentu przestawiamy je na białe.
const WINDOW_BG = '#1D1813';

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

// ---------- Drukowanie / PDF ----------

// Marginesy pochodzą z reguły @page w print.css (preferCSSPageSize)
const PDF_OPTIONS = {
  pageSize: 'A4',
  printBackground: true,
  preferCSSPageSize: true
};

async function renderDocumentPdf() {
  mainWindow.setBackgroundColor('#ffffff');
  try {
    return await mainWindow.webContents.printToPDF(PDF_OPTIONS);
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

ipcMain.handle('doc:savePdf', async (_ev, suggestedName) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Zapisz dokument WZ jako PDF',
    defaultPath: path.join(app.getPath('documents'), suggestedName),
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (canceled || !filePath) return { ok: false, canceled: true };
  try {
    const pdf = await renderDocumentPdf();
    fs.writeFileSync(filePath, pdf);
    shell.showItemInFolder(filePath);
    return { ok: true, filePath };
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

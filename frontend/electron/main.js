const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow = null;

const dataFile = () => path.join(app.getPath('userData'), 'dane-wz.json');
const backupFile = () => path.join(app.getPath('userData'), 'dane-wz.backup.json');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 640,
    title: 'Lechrol WZ',
    backgroundColor: '#F5F0E8',
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

ipcMain.handle('doc:print', async () => {
  return new Promise((resolve) => {
    mainWindow.webContents.print({ silent: false, printBackground: true }, (success, reason) => {
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
    const pdf = await mainWindow.webContents.printToPDF(PDF_OPTIONS);
    fs.writeFileSync(filePath, pdf);
    shell.showItemInFolder(filePath);
    return { ok: true, filePath };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
});

ipcMain.handle('doc:email', async (_ev, payload) => {
  const { smtp, to, subject, text, filename } = payload;
  if (!smtp || !smtp.host || !smtp.user) {
    return { ok: false, error: 'Brak konfiguracji poczty. Uzupełnij dane SMTP w Ustawieniach.' };
  }
  let tmpPath = null;
  try {
    const nodemailer = require('nodemailer');
    const pdf = await mainWindow.webContents.printToPDF(PDF_OPTIONS);
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
      subject,
      text,
      attachments: [{ filename, path: tmpPath }]
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  } finally {
    if (tmpPath) {
      try {
        fs.unlinkSync(tmpPath);
      } catch (cleanupErr) {
        console.error('Nie udało się usunąć pliku tymczasowego PDF:', tmpPath, cleanupErr);
      }
    }
  }
});

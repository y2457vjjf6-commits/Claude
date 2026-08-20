// Odtworzenie DOKŁADNIE ścieżki z aplikacji: załaduj build/index.html w Electronie,
// wypełnij #print-area i wywołaj printToPDF z tymi samymi opcjami co main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const PDF_OPTIONS = { pageSize: 'A4', printBackground: true, preferCSSPageSize: true };

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280, height: 840, show: false,
    backgroundColor: '#1D1813',
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  await win.loadFile(path.join(__dirname, 'build', 'index.html'));
  await new Promise((r) => setTimeout(r, 1500));

  // ustaw ciemny motyw + dokument testowy, dokładnie jak w aplikacji
  await win.webContents.executeJavaScript(`
    (function () {
      document.documentElement.dataset.theme = 'dark';
      const area = document.getElementById('print-area');
      area.innerHTML = document.querySelector('#print-area') ? area.innerHTML : '';
      return document.documentElement.dataset.theme;
    })();
  `);

  // zbuduj dokument przez UI: użyj localStorage + reload, potem klikamy podgląd?
  // Prościej: wstaw HTML wydruku ręcznie tym samym szablonem co aplikacja (skopiowany z bundla)
  const html = fs.readFileSync(path.join(__dirname, '..', 'wz-sample.html'), 'utf8');
  await win.webContents.executeJavaScript(`
    document.getElementById('print-area').innerHTML = ${JSON.stringify(html)};
    'ok';
  `);

  win.setBackgroundColor('#ffffff');
  const pdf = await win.webContents.printToPDF(PDF_OPTIONS);
  win.setBackgroundColor('#1D1813');
  const out = '/tmp/claude-0/-home-user-Claude/9683487b-1c6b-53a1-a19d-a80fe6c9bb31/scratchpad/electron-wz-final.pdf';
  fs.writeFileSync(out, pdf);
  console.log('PDF zapisany:', out, pdf.length, 'B');
  app.quit();
});

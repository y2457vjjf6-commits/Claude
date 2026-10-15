const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wzApi', {
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (state) => ipcRenderer.invoke('data:save', state),
  dataLocation: () => ipcRenderer.invoke('data:location'),
  printDoc: () => ipcRenderer.invoke('doc:print'),
  savePdf: (suggestedName) => ipcRenderer.invoke('doc:savePdf', suggestedName),
  sendEmail: (payload) => ipcRenderer.invoke('doc:email', payload),
  testEmail: (smtp) => ipcRenderer.invoke('doc:testEmail', smtp),
  chooseBackupFolder: () => ipcRenderer.invoke('backup:choose'),
  backupNow: (payload) => ipcRenderer.invoke('backup:now', payload),
  restoreBackup: (folder) => ipcRenderer.invoke('backup:restore', folder),
  // Kontrola jakości: otwarcie okna na zdjęcia z telefonu i nasłuch na nie
  qcStart: (dane) => ipcRenderer.invoke('qc:start', dane),
  qcStop: (token) => ipcRenderer.invoke('qc:stop', token),
  onQcPhoto: (cb) => {
    const sluchacz = (_zd, foto) => cb(foto);
    ipcRenderer.on('qc:photo', sluchacz);
    return () => ipcRenderer.removeListener('qc:photo', sluchacz);
  }
});

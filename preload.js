const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wzApi', {
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (state) => ipcRenderer.invoke('data:save', state),
  dataLocation: () => ipcRenderer.invoke('data:location'),
  printDoc: () => ipcRenderer.invoke('doc:print'),
  savePdf: (suggestedName) => ipcRenderer.invoke('doc:savePdf', suggestedName),
  sendEmail: (payload) => ipcRenderer.invoke('doc:email', payload)
});

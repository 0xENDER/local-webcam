/**
 * 
 * Enable data fetching and IPC for ElectronJS!
 * 
**/

// Import modules
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nodejsWebcamHost', {
    wsAddress: async () => ipcRenderer.invoke('get-ws-address'),
    closeWS: async () => ipcRenderer.invoke('close-ws-connection'),
    closeApp: async () => ipcRenderer.invoke('close-app')
});
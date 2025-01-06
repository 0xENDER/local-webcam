/**
 * 
 * Enable data fetching and IPC for ElectronJS!
 * 
**/

// Import modules
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nodejsWebcamHost', {
    wsAddress: async () => ipcRenderer.invoke('get-ws-address')
});
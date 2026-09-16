const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI',
{
    startServer: () => ipcRenderer.invoke('start-server'),
    startTunnel: () => ipcRenderer.invoke('start-tunnel'),
    stopAll: () => ipcRenderer.invoke('stop-all')
});
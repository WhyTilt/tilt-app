const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getDockerStatus: () => ipcRenderer.invoke('get-docker-status'),
  startContainers: () => ipcRenderer.invoke('start-containers'),
  stopContainers: () => ipcRenderer.invoke('stop-containers'),
  
  // Platform info
  platform: process.platform,
  
  // Version info
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});
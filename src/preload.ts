// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),
  scanFolder: (folderPath: string) => ipcRenderer.invoke('images:scanFolder', folderPath),
  getImagePreview: (imagePath: string) => ipcRenderer.invoke('images:getPreview', imagePath),
  analyzeImages: (folderPath: string, visionSettings: any) => ipcRenderer.invoke('vision:analyzeImages', folderPath, visionSettings),
  checkBrowserConnection: () => ipcRenderer.invoke('automation:checkBrowser'),
  startBrave: () => ipcRenderer.invoke('automation:startBrave'),
  automateAdCreation: (adContent: any, imagePaths: string[], draftMode: boolean) => ipcRenderer.invoke('automation:createAd', adContent, imagePaths, draftMode),
  onAutomationProgress: (callback: (message: string, level: string) => void) => {
    ipcRenderer.on('automation:progress', (_event, message, level) => callback(message, level));
  }
});

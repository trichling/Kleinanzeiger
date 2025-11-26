import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { registerImageHandlers } from './ui/components/imageSelector/handlers.js';
import { registerVisionHandlers } from './ui/components/vision/handlers.js';

//Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

const createWindow = () => {
  console.log('========= CREATING WINDOW =========');
  console.log('Dev server URL:', MAIN_WINDOW_VITE_DEV_SERVER_URL);
  console.log('Vite name:', MAIN_WINDOW_VITE_NAME);

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: true, // Explicitly show window
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  console.log('Window created successfully');

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    console.log('Loading URL:', MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    const htmlPath = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
    console.log('Loading file:', htmlPath);
    mainWindow.loadFile(htmlPath);
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  console.log('========= WINDOW SETUP COMPLETE =========');

  return mainWindow;
};

console.log('========= ELECTRON MAIN PROCESS STARTED =========');

// Register IPC handlers
registerImageHandlers();
registerVisionHandlers();
console.log('App ready?', app.isReady());

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  console.log('========= APP READY EVENT FIRED =========');
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

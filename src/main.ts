import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import started from 'electron-squirrel-startup';
import { convertHeicToJpeg } from './utils/heicConverter.js';

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

// IPC Handlers
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (result.canceled) {
    return { canceled: true, folderPath: null };
  }

  return { canceled: false, folderPath: result.filePaths[0] };
});

ipcMain.handle('images:getPreview', async (_event, imagePath: string) => {
  try {
    const imageBuffer = await fs.readFile(imagePath);
    const ext = path.extname(imagePath).toLowerCase();

    // Determine MIME type
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
    };

    const mimeType = mimeTypes[ext] || 'image/jpeg';
    const base64 = imageBuffer.toString('base64');

    return { success: true, dataUrl: `data:${mimeType};base64,${base64}` };
  } catch (error) {
    console.error('Error loading image preview:', error);
    return { success: false, error: (error as Error).message };
  }
}); ipcMain.handle('images:scanFolder', async (_event, folderPath: string) => {
  try {
    console.log(`Scanning folder: ${folderPath}`);

    const SUPPORTED_WEB_FORMATS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']);
    const maxImages = 10;

    const stats = await fs.stat(folderPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${folderPath}`);
    }

    const files = await fs.readdir(folderPath);
    const images: { path: string; name: string; isConverted: boolean }[] = [];
    const convertedJpegs = new Set<string>();

    // Sort files for consistent ordering
    const sortedFiles = [...files].sort((a, b) => a.localeCompare(b));

    // First pass: Convert HEIC files to JPEG
    for (const file of sortedFiles) {
      const filePath = path.join(folderPath, file);
      const fileStats = await fs.stat(filePath);

      if (!fileStats.isFile()) {
        continue;
      }

      const ext = path.extname(file).toLowerCase();

      // Convert HEIC/HEIF files to JPEG
      if (['.heic', '.heif'].includes(ext)) {
        try {
          const jpegPath = await convertHeicToJpeg(filePath);
          convertedJpegs.add(path.basename(jpegPath));
          console.log(`HEIC file converted successfully: ${path.basename(jpegPath)}`);
        } catch (error) {
          console.warn(`Skipping HEIC file ${file}: ${error}`);
        }
      }
    }

    // Second pass: Collect all image files (including newly converted JPEGs)
    const allFiles = await fs.readdir(folderPath);
    const sortedAllFiles = [...allFiles].sort((a, b) => a.localeCompare(b));

    for (const file of sortedAllFiles) {
      if (images.length >= maxImages) {
        break;
      }

      const filePath = path.join(folderPath, file);
      const fileStats = await fs.stat(filePath);

      if (!fileStats.isFile()) {
        continue;
      }

      const ext = path.extname(file).toLowerCase();

      // Include web-compatible formats (including converted JPEGs)
      if (SUPPORTED_WEB_FORMATS.has(ext)) {
        images.push({
          path: filePath,
          name: file,
          isConverted: convertedJpegs.has(file),
        });
      }
    }

    if (images.length === 0) {
      throw new Error(
        `No uploadable images found in ${folderPath}. ` +
        `Supported formats: ${Array.from(SUPPORTED_WEB_FORMATS).join(', ')}. ` +
        `HEIC files will be automatically converted to JPEG.`
      );
    }

    console.log(`Found ${images.length} uploadable image(s) in ${folderPath}`);
    return { success: true, images };
  } catch (error) {
    console.error('Error scanning folder:', error);
    return { success: false, error: (error as Error).message };
  }
});

console.log('========= ELECTRON MAIN PROCESS STARTED =========');
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

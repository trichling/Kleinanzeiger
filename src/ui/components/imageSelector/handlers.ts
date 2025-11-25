/**
 * IPC handlers for image-related operations
 */

import { ipcMain, dialog } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { convertHeicToJpeg } from '../../../utils/heicConverter.js';

/**
 * Register all image-related IPC handlers
 */
export function registerImageHandlers(): void {
    // Open folder dialog
    ipcMain.handle('dialog:openFolder', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
        });

        if (result.canceled) {
            return { canceled: true, folderPath: null };
        }

        return { canceled: false, folderPath: result.filePaths[0] };
    });

    // Scan folder for images and convert HEIC files
    ipcMain.handle('images:scanFolder', async (_event, folderPath: string) => {
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

    // Get image preview as base64 data URL
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
    });
}

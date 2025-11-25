/**
 * HEIC to JPEG conversion utility
 * Shared between vision analyzers and electron main process
 */

import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Convert HEIC/HEIF image to JPEG format.
 */
export async function convertHeicToJpeg(heicPath: string): Promise<string> {
    console.log(`Converting HEIC to JPEG: ${path.basename(heicPath)}`);

    // Create output path with .jpg extension
    const jpegPath = heicPath.replace(/\.(heic|heif)$/i, '.jpg');

    // Check if JPEG already exists and is valid
    try {
        const stats = await fs.stat(jpegPath);
        if (stats.size > 0) {
            console.log(`JPEG already exists: ${path.basename(jpegPath)}`);
            return jpegPath;
        }
    } catch (error) {
        // File doesn't exist, proceed with conversion
    }

    // Read HEIC file
    const heicBuffer = await fs.readFile(heicPath);

    // Convert using heic-convert (pure JavaScript, no native dependencies)
    // @ts-expect-error heic-convert has no type definitions
    const convert = (await import('heic-convert')).default;
    const jpegBuffer = await convert({
        buffer: heicBuffer,
        format: 'JPEG',
        quality: 0.95,
    });

    // Write JPEG file
    await fs.writeFile(jpegPath, Buffer.from(jpegBuffer));

    console.log(`Converted HEIC to JPEG: ${path.basename(heicPath)} -> ${path.basename(jpegPath)}`);
    return jpegPath;
}

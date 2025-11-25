/**
 * Base class for vision analyzers.
 */

import fs from 'fs/promises';
import path from 'path';
import { ProductInfo, VisionConfig } from './models.js';
import { createLogger } from '../utils/logger.js';
import { convertHeicToJpeg } from '../utils/heicConverter.js';

const logger = createLogger('VisionAnalyzer');

/**
 * Supported image formats for web upload (excludes HEIC/HEIF).
 */
export const SUPPORTED_WEB_FORMATS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']);

/**
 * Abstract base class for vision analyzers.
 */
export abstract class VisionAnalyzer {
  protected config: VisionConfig;

  constructor(config: VisionConfig) {
    this.config = config;
  }

  /**
   * Analyze images in a folder and extract product information.
   */
  abstract analyzeImages(imageFolder: string): Promise<ProductInfo>;

  /**
   * Get the name of this vision backend.
   */
  abstract get backendName(): string;

  /**
   * Get list of supported image formats.
   */
  abstract getSupportedFormats(): string[];



  /**
   * Find all supported images in a folder.
   * Automatically converts HEIC/HEIF files to JPEG.
   */
  protected async findImages(imageFolder: string, maxImages?: number): Promise<string[]> {
    const max = maxImages || this.config.maxImagesPerAd || 10;
    const stats = await fs.stat(imageFolder);
    if (!stats.isDirectory()) {
      throw new Error(`Image folder not found: ${imageFolder}`);
    }

    const files = await fs.readdir(imageFolder);
    const imagePaths: string[] = [];
    const convertedJpegs = new Set<string>(); // Track converted JPEGs

    // Sort files for consistent ordering
    files.sort();

    // First pass: Convert HEIC files to JPEG
    for (const file of files) {
      const filePath = path.join(imageFolder, file);
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
          logger.info(`HEIC file converted successfully: ${path.basename(jpegPath)}`);
        } catch (error) {
          logger.warn(`Skipping HEIC file ${file}: ${error}`);
        }
      }
    }

    // Second pass: Collect all image files (including newly converted JPEGs)
    const allFiles = await fs.readdir(imageFolder);
    allFiles.sort();

    for (const file of allFiles) {
      if (imagePaths.length >= max) {
        break;
      }

      const filePath = path.join(imageFolder, file);
      const fileStats = await fs.stat(filePath);

      if (!fileStats.isFile()) {
        continue;
      }

      const ext = path.extname(file).toLowerCase();

      // Include web-compatible formats (including converted JPEGs)
      if (SUPPORTED_WEB_FORMATS.has(ext)) {
        imagePaths.push(filePath);
        if (convertedJpegs.has(file)) {
          logger.debug(`Including converted JPEG: ${file}`);
        }
      }
    }

    if (imagePaths.length === 0) {
      throw new Error(
        `No uploadable images found in ${imageFolder}. ` +
        `Supported formats: ${Array.from(SUPPORTED_WEB_FORMATS).join(', ')}. ` +
        `HEIC files will be automatically converted to JPEG.`
      );
    }

    logger.info(`Found ${imagePaths.length} uploadable image(s) in ${imageFolder}`);
    return imagePaths;
  }

  /**
   * Check if image format is supported.
   */
  protected isSupportedImage(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return this.getSupportedFormats().includes(ext);
  }
}

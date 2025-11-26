/**
 * IPC handlers for vision analysis operations
 */

import { ipcMain } from 'electron';
import type { VisionConfig } from '../../../vision/models.js';
import { createLogger } from '../../../utils/logger.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'yaml';

const logger = createLogger('VisionHandlers');

/**
 * Register all vision-related IPC handlers
 */
export function registerVisionHandlers(): void {
    logger.info('Registering vision IPC handlers');

    /**
     * Analyze images in a folder using vision AI
     */
    ipcMain.handle('vision:analyzeImages', async (_event, folderPath: string) => {
        logger.info(`Starting vision analysis for folder: ${folderPath}`);

        try {
            // Load settings
            const settings = await loadSettings();
            const visionSettings = settings.vision as VisionConfig;

            if (!visionSettings) {
                throw new Error('Vision settings not found in configuration');
            }

            // Dynamically import ProductAnalyzer to avoid loading sharp/canvas at startup
            const { ProductAnalyzer } = await import('../../../vision/analyzer.js');

            // Create analyzer
            const analyzer = new ProductAnalyzer(visionSettings);
            logger.info(`Using vision backend: ${analyzer.backendName}`);

            // Run analysis
            const productInfo = await analyzer.analyzeImages(folderPath);

            logger.info(`Analysis complete: ${productInfo.name}`);
            logger.info(`Suggested price: €${productInfo.suggestedPrice}`);

            return {
                success: true,
                productInfo
            };

        } catch (error) {
            logger.error(`Vision analysis failed: ${error}`);
            return {
                success: false,
                error: (error as Error).message
            };
        }
    });
}

/**
 * Load settings from YAML file
 */
async function loadSettings(): Promise<any> {
    const settingsPath = path.join(process.cwd(), 'config', 'settings.yaml');

    try {
        const content = await fs.readFile(settingsPath, 'utf-8');
        const settings = yaml.parse(content);

        // Resolve environment variables in settings
        return resolveEnvVars(settings);
    } catch (error) {
        logger.error(`Failed to load settings: ${error}`);
        throw new Error(`Failed to load settings from ${settingsPath}`);
    }
}

/**
 * Recursively resolve environment variables in settings
 */
function resolveEnvVars(obj: any): any {
    if (typeof obj === 'string') {
        // Replace ${VAR_NAME} with environment variable value
        return obj.replace(/\$\{([^}]+)\}/g, (_, varName) => {
            return process.env[varName] || '';
        });
    }

    if (Array.isArray(obj)) {
        return obj.map(item => resolveEnvVars(item));
    }

    if (typeof obj === 'object' && obj !== null) {
        const resolved: any = {};
        for (const [key, value] of Object.entries(obj)) {
            resolved[key] = resolveEnvVars(value);
        }
        return resolved;
    }

    return obj;
}

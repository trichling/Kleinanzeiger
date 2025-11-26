/**
 * IPC handlers for vision analysis operations
 */

import { ipcMain } from 'electron';
import type { VisionConfig } from '../../../vision/models.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('VisionHandlers');

/**
 * Get default model for a backend
 */
function getDefaultModel(backend: string): string {
    switch (backend) {
        case 'openai':
            return 'gpt-4-vision-preview';
        case 'gemini':
            return 'gemini-pro-vision';
        case 'blip2':
            return 'Salesforce/blip2-opt-2.7b';
        default:
            return '';
    }
}

/**
 * Register all vision-related IPC handlers
 */
export function registerVisionHandlers(): void {
    logger.info('Registering vision IPC handlers');

    /**
     * Analyze images in a folder using vision AI
     * Takes settings from UI localStorage (passed from renderer)
     */
    ipcMain.handle('vision:analyzeImages', async (_event, folderPath: string, uiSettings: { visionBackend: string; apiKey: string }) => {
        logger.info(`Starting vision analysis for folder: ${folderPath}`);

        try {
            const backend = uiSettings.visionBackend?.toLowerCase() || 'gemini';

            // Claude requires sharp (native module) which doesn't work in Electron bundled code
            if (backend === 'claude') {
                throw new Error('Claude backend is not supported in Electron UI due to native module (sharp) dependencies. Please use Gemini, OpenAI, or BLIP2, or use the CLI for Claude support.');
            }

            // Convert UI settings to VisionConfig format
            const visionSettings: VisionConfig = {
                backend: backend,
                [backend]: {
                    apiKey: uiSettings.apiKey || '',
                    model: getDefaultModel(backend),
                    maxTokens: 2000,
                }
            };

            // Dynamically import ProductAnalyzer (uses factory internally)
            const { ProductAnalyzer } = await import('../../../vision/analyzer.js');

            // Create analyzer with dynamic imports
            const analyzer = await ProductAnalyzer.create(visionSettings);
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

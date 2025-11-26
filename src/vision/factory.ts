/**
 * Factory for creating vision analyzer instances.
 */

import { VisionAnalyzer } from './base.js';
import { VisionConfig } from './models.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('VisionAnalyzerFactory');

/**
 * Factory class for creating vision analyzer instances.
 *
 * Supports multiple backends: Gemini, Claude, OpenAI, BLIP-2.
 * Uses dynamic imports to avoid loading native modules at startup.
 */
export class VisionAnalyzerFactory {
  /**
   * Create a vision analyzer instance with dynamic imports.
   */
  static async create(backend: string, config: VisionConfig): Promise<VisionAnalyzer> {
    const backendLower = backend.toLowerCase();

    logger.info(`Creating ${backendLower} vision analyzer`);

    try {
      switch (backendLower) {
        case 'gemini': {
          const { GeminiVisionAnalyzer } = await import('./geminiAnalyzer.js');
          return new GeminiVisionAnalyzer(config);
        }
        case 'claude': {
          const { ClaudeVisionAnalyzer } = await import('./claudeAnalyzer.js');
          return new ClaudeVisionAnalyzer(config);
        }
        case 'openai': {
          const { OpenAIVisionAnalyzer } = await import('./openaiAnalyzer.js');
          return new OpenAIVisionAnalyzer(config);
        }
        case 'blip2': {
          const { BLIP2VisionAnalyzer } = await import('./blip2Analyzer.js');
          return new BLIP2VisionAnalyzer(config);
        }
        default: {
          const available = ['gemini', 'claude', 'openai', 'blip2'];
          throw new Error(`Unsupported vision backend: ${backend}. Available backends: ${available.join(', ')}`);
        }
      }
    } catch (error) {
      logger.error(`Failed to create ${backendLower} analyzer: ${error}`);
      throw error;
    }
  }

  /**
   * Get list of available vision backends.
   */
  static getAvailableBackends(): string[] {
    return ['gemini', 'claude', 'openai', 'blip2'];
  }

  /**
   * Create analyzer from settings object.
   *
   * Expected settings structure:
   * {
   *   vision: {
   *     backend: 'gemini',
   *     gemini: { apiKey: '...', model: '...' },
   *     claude: { apiKey: '...', model: '...' },
   *     openai: { apiKey: '...', model: '...' },
   *     blip2: { modelName: '...', device: '...' }
   *   }
   * }
   */
  static async createFromSettings(settings: { vision: VisionConfig }): Promise<VisionAnalyzer> {
    const visionSettings = settings.vision;
    const backend = visionSettings.backend || 'gemini';

    return this.create(backend, visionSettings);
  }
}

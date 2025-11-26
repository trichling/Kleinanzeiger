/**
 * Factory for creating vision analyzer instances.
 */

import { VisionAnalyzer } from './base.js';
import { VisionConfig } from './models.js';
import type { VisionSettings } from '../settings/models.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('VisionAnalyzerFactory');

/**
 * Normalize VisionSettings to VisionConfig format.
 * VisionSettings has optional apiKey, but VisionConfig requires it.
 * This ensures the config has the required format for analyzers.
 */
function normalizeConfig(config: VisionConfig | VisionSettings): VisionConfig {
  // If it's already VisionConfig (has required apiKey), return as-is
  // Otherwise, cast to VisionConfig - runtime validation happens in analyzers
  return config as VisionConfig;
}

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
  static async create(backend: string, config: VisionConfig | VisionSettings): Promise<VisionAnalyzer> {
    const backendLower = backend.toLowerCase();
    const normalizedConfig = normalizeConfig(config);

    logger.info(`Creating ${backendLower} vision analyzer`);

    try {
      switch (backendLower) {
        case 'gemini': {
          const { GeminiVisionAnalyzer } = await import('./geminiAnalyzer.js');
          return new GeminiVisionAnalyzer(normalizedConfig);
        }
        case 'claude': {
          const { ClaudeVisionAnalyzer } = await import('./claudeAnalyzer.js');
          return new ClaudeVisionAnalyzer(normalizedConfig);
        }
        case 'openai': {
          const { OpenAIVisionAnalyzer } = await import('./openaiAnalyzer.js');
          return new OpenAIVisionAnalyzer(normalizedConfig);
        }
        case 'blip2': {
          const { BLIP2VisionAnalyzer } = await import('./blip2Analyzer.js');
          return new BLIP2VisionAnalyzer(normalizedConfig);
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
  static async createFromSettings(settings: { vision: VisionConfig | VisionSettings }): Promise<VisionAnalyzer> {
    const visionSettings = settings.vision;
    const backend = visionSettings.backend || 'gemini';

    return this.create(backend, visionSettings);
  }
}

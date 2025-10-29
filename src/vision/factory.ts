/**
 * Factory for creating vision analyzer instances.
 */

import { VisionAnalyzer } from './base.js';
import { GeminiVisionAnalyzer } from './geminiAnalyzer.js';
import { ClaudeVisionAnalyzer } from './claudeAnalyzer.js';
import { OpenAIVisionAnalyzer } from './openaiAnalyzer.js';
import { BLIP2VisionAnalyzer } from './blip2Analyzer.js';
import { VisionConfig } from './models.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('VisionAnalyzerFactory');

type AnalyzerConstructor = new (config: VisionConfig) => VisionAnalyzer;

/**
 * Factory class for creating vision analyzer instances.
 *
 * Supports multiple backends: Gemini, Claude, OpenAI, BLIP-2.
 */
export class VisionAnalyzerFactory {
  // Registry of available analyzers
  private static readonly ANALYZERS: Record<string, AnalyzerConstructor> = {
    gemini: GeminiVisionAnalyzer,
    claude: ClaudeVisionAnalyzer,
    openai: OpenAIVisionAnalyzer,
    blip2: BLIP2VisionAnalyzer,
  };

  /**
   * Create a vision analyzer instance.
   */
  static create(backend: string, config: VisionConfig): VisionAnalyzer {
    const backendLower = backend.toLowerCase();

    if (!(backendLower in this.ANALYZERS)) {
      const available = Object.keys(this.ANALYZERS).join(', ');
      throw new Error(`Unsupported vision backend: ${backend}. Available backends: ${available}`);
    }

    const AnalyzerClass = this.ANALYZERS[backendLower];
    logger.info(`Creating ${backendLower} vision analyzer`);

    try {
      return new AnalyzerClass(config);
    } catch (error) {
      logger.error(`Failed to create ${backendLower} analyzer: ${error}`);
      throw error;
    }
  }

  /**
   * Get list of available vision backends.
   */
  static getAvailableBackends(): string[] {
    return Object.keys(this.ANALYZERS);
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
  static createFromSettings(settings: { vision: VisionConfig }): VisionAnalyzer {
    const visionSettings = settings.vision;
    const backend = visionSettings.backend || 'gemini';

    return this.create(backend, visionSettings);
  }
}

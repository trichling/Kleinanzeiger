/**
 * Product image analyzer - main facade for vision analysis.
 */

import { VisionAnalyzer } from './base.js';
import { VisionAnalyzerFactory } from './factory.js';
import { ProductInfo, VisionConfig } from './models.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ProductAnalyzer');

/**
 * Main product analyzer that delegates to specific vision backends.
 *
 * This class acts as a facade, using the Strategy Pattern to
 * support multiple vision backends (Gemini, Claude, OpenAI, BLIP-2).
 */
export class ProductAnalyzer {
  private backend: VisionAnalyzer;

  constructor(visionSettings: VisionConfig) {
    this.backend = VisionAnalyzerFactory.createFromSettings({ vision: visionSettings });
    logger.info(`ProductAnalyzer initialized with backend: ${this.backend.backendName}`);
  }

  /**
   * Analyze all images in a folder and extract product information.
   */
  async analyzeImages(imageFolder: string): Promise<ProductInfo> {
    return await this.backend.analyzeImages(imageFolder);
  }

  /**
   * Get the name of the current vision backend.
   */
  get backendName(): string {
    return this.backend.backendName;
  }
}

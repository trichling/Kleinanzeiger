/**
 * Claude Vision implementation of VisionAnalyzer.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { VisionAnalyzer } from './base.js';
import { ProductInfo, ProductInfoSchema, VisionConfig } from './models.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ClaudeVisionAnalyzer');

/**
 * Vision analyzer using Claude's Vision API.
 */
export class ClaudeVisionAnalyzer extends VisionAnalyzer {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;
  private maxImages: number;
  private maxImageSize: number;

  constructor(config: VisionConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.claude?.apiKey || '',
    });
    this.model = config.claude?.model || 'claude-3-5-sonnet-20241022';
    this.maxTokens = config.claude?.maxTokens || 4096;
    this.maxImages = config.maxImagesPerAd || 10;
    this.maxImageSize = config.claude?.maxImageSize || 5 * 1024 * 1024; // 5MB
  }

  get backendName(): string {
    return 'claude';
  }

  getSupportedFormats(): string[] {
    // Claude supports JPG, PNG, WEBP, GIF
    return ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  }

  /**
   * Resize image if it exceeds max size.
   */
  private async resizeImageIfNeeded(imagePath: string): Promise<Buffer> {
    const stats = fs.statSync(imagePath);

    if (stats.size <= this.maxImageSize) {
      return fs.readFileSync(imagePath);
    }

    logger.debug(`Image ${path.basename(imagePath)} is ${stats.size} bytes, resizing...`);

    // Resize to reduce file size
    const resized = await sharp(imagePath)
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    logger.debug(`Resized to ${resized.length} bytes`);
    return resized;
  }

  /**
   * Encode image to base64.
   */
  private async encodeImage(imagePath: string): Promise<string> {
    const imageBuffer = await this.resizeImageIfNeeded(imagePath);
    return imageBuffer.toString('base64');
  }

  /**
   * Get media type from file extension.
   */
  private getMediaType(imagePath: string): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
    const ext = path.extname(imagePath).toLowerCase();
    switch (ext) {
      case '.png':
        return 'image/png';
      case '.webp':
        return 'image/webp';
      case '.gif':
        return 'image/gif';
      default:
        return 'image/jpeg';
    }
  }

  async analyzeImages(imageFolder: string): Promise<ProductInfo> {
    const imagePaths = await this.findImages(imageFolder, this.maxImages);
    logger.info(`[Claude] Analyzing ${imagePaths.length} images from ${imageFolder}`);

    // Prepare image content blocks
    const imageBlocks: Anthropic.ImageBlockParam[] = [];

    for (const imgPath of imagePaths) {
      try {
        const base64Image = await this.encodeImage(imgPath);
        const mediaType = this.getMediaType(imgPath);

        imageBlocks.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64Image,
          },
        });
      } catch (error) {
        logger.error(`Error encoding image ${imgPath}: ${error}`);
        continue;
      }
    }

    if (imageBlocks.length === 0) {
      throw new Error('No images could be encoded successfully');
    }

    // German prompt for product analysis
    const prompt = `WICHTIG: Alle ${imageBlocks.length} Bilder zeigen DAS GLEICHE PRODUKT aus verschiedenen Perspektiven.

Analysiere diese Produktbilder und extrahiere folgende Informationen auf Deutsch:

1. Produktname (kurz und präzise)
2. Detaillierte Produktbeschreibung (Zustand, Besonderheiten, Funktionen)
3. Zustand (Neu / Wie neu / Gebraucht / Defekt)
4. Kategorie (z.B. Elektronik, Möbel, Kleidung, Sport, Haushalt, Spielzeug)
5. Marke/Hersteller (falls erkennbar)
6. Farbe (falls relevant)
7. Wichtigste Eigenschaften (Liste)
8. Preisvorschlag in EUR (realistisch für deutschen Gebrauchtmarkt)

Antworte mit NUR EINEM JSON-Objekt (kein Array!) im folgenden Format:
{
    "name": "Produktname",
    "description": "Detaillierte Beschreibung...",
    "condition": "Gebraucht",
    "category": "Kategorie",
    "brand": "Marke",
    "color": "Farbe",
    "features": ["Eigenschaft 1", "Eigenschaft 2"],
    "suggested_price": 50.00
}

Sei präzise und beschreibe den Zustand ehrlich basierend auf allen Bildern.`;

    // Prepare content blocks
    const content: Anthropic.MessageParam['content'] = [...imageBlocks, { type: 'text', text: prompt }];

    try {
      // Call Claude API
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      });

      // Extract text from response
      const textBlock = response.content.find((block: Anthropic.ContentBlock) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      const responseText = textBlock.text;
      logger.debug(`Claude response: ${responseText}`);

      // Parse JSON (handle potential markdown code blocks)
      let jsonStr = responseText;
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
      }

      const data = JSON.parse(jsonStr);

      // Validate with Zod schema
      const productInfo = ProductInfoSchema.parse({
        name: data.name || 'Unknown Product',
        description: data.description || '',
        condition: data.condition || 'Gebraucht',
        category: data.category || undefined,
        brand: data.brand || undefined,
        color: data.color || undefined,
        features: data.features || [],
        suggestedPrice: data.suggested_price || undefined,
        imagePaths,
      });

      logger.info(`[Claude] Successfully analyzed product: ${productInfo.name}`);
      return productInfo;
    } catch (error) {
      logger.error(`[Claude] Error calling API: ${error}`);
      throw error;
    }
  }
}

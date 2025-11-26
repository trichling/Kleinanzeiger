/**
 * Gemini Vision API analyzer implementation.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { VisionAnalyzer } from './base.js';
import { ProductInfo, VisionConfig } from './models.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('GeminiAnalyzer');

interface GeminiResponse {
  name: string;
  description: string;
  condition: string;
  category?: string;
  brand?: string;
  color?: string;
  features: string[];
  suggested_price?: number;
}

/**
 * Vision analyzer using Google Gemini API.
 */
export class GeminiVisionAnalyzer extends VisionAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(config: VisionConfig) {
    super(config);
    const apiKey = config.gemini?.apiKey || '';
    let modelName = config.gemini?.model || 'gemini-2.5-flash';

    // Migrate deprecated model names to working ones
    const modelMigrations: Record<string, string> = {
      'gemini-pro-vision': 'gemini-2.5-flash',
      'gemini-1.5-flash': 'gemini-2.5-flash',
      'gemini-1.5-pro': 'gemini-2.5-pro',
      'gemini-1.5-flash-latest': 'gemini-flash-latest',
      'gemini-1.5-pro-latest': 'gemini-pro-latest',
    };

    if (modelMigrations[modelName]) {
      logger.info(`Migrating model ${modelName} to ${modelMigrations[modelName]}`);
      modelName = modelMigrations[modelName];
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: modelName });
  }

  get backendName(): string {
    return 'gemini';
  }

  getSupportedFormats(): string[] {
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  }

  async analyzeImages(imageFolder: string): Promise<ProductInfo> {
    const maxImages = this.config.maxImagesPerAd || 5;
    const imagePaths = await this.findImages(imageFolder, maxImages);
    logger.info(`[Gemini] Analyzing ${imagePaths.length} images from ${imageFolder}`);

    // Load images
    const imageParts = await Promise.all(
      imagePaths.map(async (imgPath) => {
        try {
          const data = await fs.readFile(imgPath);
          const mimeType = this.getMimeType(imgPath);
          return {
            inlineData: {
              data: data.toString('base64'),
              mimeType,
            },
          };
        } catch (error) {
          logger.error(`Error loading image ${imgPath}: ${error}`);
          throw error;
        }
      })
    );

    if (imageParts.length === 0) {
      throw new Error('No images could be loaded successfully');
    }

    // Create prompt in German
    const prompt = `WICHTIG: Alle ${imageParts.length} Bilder zeigen DAS GLEICHE PRODUKT aus verschiedenen Blickwinkeln oder Details.
Analysiere ALLE Bilder zusammen, um dieses EINE Produkt zu beschreiben.

Falls es sich um ein Set handelt (z.B. mehrere Bücher, Spielzeuge, zusammen verkaufte Artikel), behandle das gesamte Set als EIN Produkt.
Manche Bilder zeigen eine Übersicht, andere Details - kombiniere alle Informationen.

Extrahiere die folgenden Informationen über dieses EINE Produkt IN DEUTSCHER SPRACHE:

1. Produktname (kurz und präzise, auf Deutsch)
2. Detaillierte Produktbeschreibung (Zustand, Merkmale, besondere Eigenschaften aus ALLEN Bildern, auf Deutsch)
3. Zustand (Neu, Wie Neu, Gebraucht, oder Defekt)
4. Kategorie (z.B. Elektronik, Möbel, Kleidung, Sport, Haushalt, Spielzeug)
5. Marke/Hersteller (falls erkennbar)
6. Farbe (falls relevant)
7. Wichtige Merkmale (Liste, kombiniere Informationen aus allen Bildern, auf Deutsch)
8. Vorgeschlagener Preis in EUR (realistisch für den deutschen Gebrauchtwarenmarkt)

WICHTIG: Alle Texte müssen auf DEUTSCH sein!

Antworte mit NUR EINEM JSON-Objekt (kein Array) in diesem Format:
{
    "name": "Produktname auf Deutsch",
    "description": "Detaillierte Beschreibung auf Deutsch, die alle Bilder kombiniert...",
    "condition": "Gebraucht",
    "category": "Kategorie",
    "brand": "Marke",
    "color": "Farbe",
    "features": ["Merkmal 1 auf Deutsch", "Merkmal 2 auf Deutsch", "Merkmal 3 auf Deutsch"],
    "suggested_price": 50.00
}

Gib NUR das JSON-Objekt zurück, sonst nichts. Gib KEIN Array von Objekten zurück.`;

    try {
      // Call Gemini API
      const result = await this.model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const responseText = response.text();

      logger.debug(`Gemini response: ${responseText}`);

      // Parse JSON (handle potential markdown code blocks)
      let jsonStr = responseText;
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
      }

      const data = JSON.parse(jsonStr) as GeminiResponse | GeminiResponse[];

      // Handle case where API returns a list instead of dict (despite instructions)
      let finalData: GeminiResponse;
      if (Array.isArray(data)) {
        logger.warn('[Gemini] API returned a list despite prompt instructions.');
        if (data.length === 1 && typeof data[0] === 'object') {
          logger.warn('[Gemini] Extracting single dict from list');
          finalData = data[0];
        } else if (data.length > 1) {
          throw new Error(
            `[Gemini] Returned ${data.length} objects - it seems Gemini analyzed each image separately. ` +
            `Expected one combined analysis. Response: ${JSON.stringify(data.slice(0, 2))}...`
          );
        } else {
          throw new Error(`[Gemini] Unexpected list response: ${JSON.stringify(data)}`);
        }
      } else {
        finalData = data;
      }

      // Ensure data is an object
      if (typeof finalData !== 'object' || finalData === null) {
        throw new Error(`[Gemini] Expected object, got ${typeof finalData}: ${JSON.stringify(finalData)}`);
      }

      // Create ProductInfo
      const productInfo: ProductInfo = {
        name: finalData.name || 'Unknown Product',
        description: finalData.description || '',
        condition: finalData.condition || 'Gebraucht',
        category: finalData.category,
        brand: finalData.brand,
        color: finalData.color,
        features: finalData.features || [],
        suggestedPrice: finalData.suggested_price,
        imagePaths,
      };

      logger.info(`[Gemini] Successfully analyzed product: ${productInfo.name}`);
      return productInfo;
    } catch (error) {
      logger.error(`[Gemini] Error during analysis: ${error}`);
      throw new Error(`Failed to analyze images with Gemini: ${error}`);
    }
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
    };
    return mimeTypes[ext] || 'image/jpeg';
  }
}

// Alias for backwards compatibility
export { GeminiVisionAnalyzer as GeminiAnalyzer };

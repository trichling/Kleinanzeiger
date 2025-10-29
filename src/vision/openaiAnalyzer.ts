/**
 * OpenAI GPT-4 Vision implementation of VisionAnalyzer.
 */

import OpenAI from 'openai';
import fs from 'fs';
import { VisionAnalyzer } from './base.js';
import { ProductInfo, ProductInfoSchema, VisionConfig } from './models.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('OpenAIVisionAnalyzer');

/**
 * Vision analyzer using OpenAI's GPT-4 Vision API.
 */
export class OpenAIVisionAnalyzer extends VisionAnalyzer {
  private client: OpenAI;
  private model: string;
  private maxTokens: number;
  private maxImages: number;

  constructor(config: VisionConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.openai?.apiKey || '',
    });
    this.model = config.openai?.model || 'gpt-4-vision-preview';
    this.maxTokens = config.openai?.maxTokens || 2000;
    this.maxImages = config.maxImagesPerAd || 10;
  }

  get backendName(): string {
    return 'openai';
  }

  getSupportedFormats(): string[] {
    // OpenAI supports JPG, PNG, WEBP, GIF
    return ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  }

  /**
   * Encode image to base64.
   */
  private encodeImage(imagePath: string): string {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
  }

  async analyzeImages(imageFolder: string): Promise<ProductInfo> {
    const imagePaths = await this.findImages(imageFolder, this.maxImages);
    logger.info(`[OpenAI] Analyzing ${imagePaths.length} images from ${imageFolder}`);

    // Prepare messages
    const content: OpenAI.Chat.ChatCompletionContentPart[] = [];

    // Add all images
    for (const imgPath of imagePaths) {
      try {
        const base64Image = this.encodeImage(imgPath);
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`,
          },
        });
      } catch (error) {
        logger.error(`Error encoding image ${imgPath}: ${error}`);
        continue;
      }
    }

    if (content.length === 0) {
      throw new Error('No images could be encoded successfully');
    }

    // Add text prompt
    content.push({
      type: 'text',
      text: `Analyze these product images and extract the following information:

1. Product name (short and precise)
2. Detailed product description (condition, features, notable characteristics)
3. Condition (New, Like New, Used, Defective)
4. Category (e.g., Electronics, Furniture, Clothing, Sports, Household)
5. Brand/Manufacturer (if identifiable)
6. Color (if relevant)
7. Key features (list)
8. Suggested price in EUR (realistic for German second-hand market)

Respond in the following JSON format:
{
    "name": "Product name",
    "description": "Detailed description...",
    "condition": "Used",
    "category": "Category",
    "brand": "Brand",
    "color": "Color",
    "features": ["Feature 1", "Feature 2"],
    "suggested_price": 50.00
}

Be precise and describe the condition honestly based on the images.`,
    });

    // Call OpenAI API
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
        max_tokens: this.maxTokens,
      });

      // Extract JSON from response
      const responseText = response.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from OpenAI');
      }

      logger.debug(`OpenAI response: ${responseText}`);

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
        condition: data.condition || 'Used',
        category: data.category || undefined,
        brand: data.brand || undefined,
        color: data.color || undefined,
        features: data.features || [],
        suggestedPrice: data.suggested_price || undefined,
        imagePaths,
      });

      logger.info(`[OpenAI] Successfully analyzed product: ${productInfo.name}`);
      return productInfo;
    } catch (error) {
      logger.error(`[OpenAI] Error calling API: ${error}`);
      throw error;
    }
  }
}

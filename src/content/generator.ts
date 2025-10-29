/**
 * Content generator for classified ads.
 */

import { ProductInfo, AdContent } from '../vision/models.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ContentGenerator');

/**
 * Generate ad content from product information.
 */
export class ContentGenerator {
  /**
   * Generate complete ad content from product information.
   *
   * Since Gemini now outputs German content, we simply:
   * 1. Use the title directly from vision analysis
   * 2. Use the condition directly from vision analysis
   * 3. Use the suggested price (or override)
   * 4. Format features into a cohesive description
   * 5. Let kleinanzeigen.de auto-detect category from the title
   */
  generateAdContent(
    productInfo: ProductInfo,
    postalCode: string,
    category?: string,
    subcategory?: string,
    priceOverride?: number
  ): AdContent {
    logger.info(`Generating ad content for: ${productInfo.name}`);

    // Use title directly from vision analysis (already in German)
    const title = productInfo.name.slice(0, 65); // Ensure max 65 chars
    logger.info(`Using vision-generated title: ${title}`);

    // Format features into a cohesive description
    const description = this.formatDescriptionFromFeatures(productInfo);

    // Determine price
    const price = priceOverride !== undefined ? priceOverride : productInfo.suggestedPrice || 10.0;

    // Use category from vision analysis, fallback to provided one
    const finalCategory = category || productInfo.category || 'Sonstiges';

    // Create AdContent
    const adContent: AdContent = {
      title,
      description,
      price,
      category: finalCategory,
      subcategory,
      condition: productInfo.condition,
      shippingType: 'PICKUP',
      postalCode,
    };

    logger.info(`Ad content generated: '${adContent.title}' - €${adContent.price}`);
    return adContent;
  }

  /**
   * Format the vision analysis output into a cohesive ad description.
   * Combines the description and features from vision analysis.
   */
  private formatDescriptionFromFeatures(productInfo: ProductInfo): string {
    const descriptionParts: string[] = [productInfo.description];

    // Add features as bullet points if available
    if (productInfo.features && productInfo.features.length > 0) {
      descriptionParts.push('\nMerkmale:');
      for (const feature of productInfo.features) {
        descriptionParts.push(`• ${feature}`);
      }
    }

    // Add brand info if available
    if (productInfo.brand) {
      descriptionParts.push(`\nMarke: ${productInfo.brand}`);
    }

    // Add color if available
    if (productInfo.color) {
      descriptionParts.push(`Farbe: ${productInfo.color}`);
    }

    // Add standard pickup notice
    descriptionParts.push('\nNur Abholung möglich.');

    return descriptionParts.join('\n');
  }
}

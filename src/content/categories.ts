/**
 * Category detection and mapping for kleinanzeigen.de.
 *
 * NOTE: This module is currently not used in the simplified workflow.
 * kleinanzeigen.de automatically detects categories from German titles.
 * This is kept for backwards compatibility and future use.
 */

import fs from 'fs';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('CategoryMapper');

interface CategoryData {
  categories: Record<string, { subcategories: string[] }>;
  keywords: Record<string, string[]>;
}

/**
 * Maps product information to kleinanzeigen.de categories.
 */
export class CategoryMapper {
  private data: CategoryData;
  private categories: Record<string, { subcategories: string[] }>;
  private keywords: Record<string, string[]>;

  constructor(categoriesFile: string) {
    const fileContents = fs.readFileSync(categoriesFile, 'utf8');
    this.data = JSON.parse(fileContents) as CategoryData;
    this.categories = this.data.categories;
    this.keywords = this.data.keywords;
  }

  /**
   * Match text against category keywords.
   */
  private matchKeywords(text: string): string | null {
    const textLower = text.toLowerCase();

    let bestMatch: string | null = null;
    let maxMatches = 0;

    for (const [category, keywords] of Object.entries(this.keywords)) {
      const matches = keywords.filter((keyword) => textLower.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = category;
      }
    }

    return maxMatches > 0 ? bestMatch : null;
  }

  /**
   * Find best matching subcategory within a category.
   */
  private findSubcategory(category: string, text: string): string | null {
    if (!(category in this.categories)) {
      return null;
    }

    const textLower = text.toLowerCase();
    const subcategories = this.categories[category].subcategories;

    for (const subcategory of subcategories) {
      if (textLower.includes(subcategory.toLowerCase())) {
        return subcategory;
      }
    }

    return null;
  }

  /**
   * Map product information to a category and subcategory.
   */
  mapCategory(name: string, description: string, detectedCategory?: string): [string, string | null] {
    logger.debug(`Mapping category for: ${name}`);

    // Combine name and description for matching
    const combinedText = `${name} ${description}`;

    // Try detected category first
    let category = detectedCategory;

    // If no detected category or not in our mapping, use keyword matching
    if (!category || !(category in this.categories)) {
      category = this.matchKeywords(combinedText) || undefined;
    }

    // Default to "Sonstiges" if no match
    if (!category) {
      category = 'Sonstiges';
      logger.info(`No category match found, defaulting to: ${category}`);
      return [category, null];
    }

    // Try to find subcategory
    const subcategory = this.findSubcategory(category, combinedText);

    logger.info(`Mapped to category: ${category}, subcategory: ${subcategory || 'None'}`);
    return [category, subcategory];
  }
}

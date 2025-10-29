/**
 * Type definitions and models for vision analysis and ad content.
 */

import { z } from 'zod';

/**
 * Product information extracted from images.
 */
export const ProductInfoSchema = z.object({
  name: z.string().describe('Product name'),
  description: z.string().describe('Detailed product description'),
  condition: z.string().default('Gebraucht').describe('Product condition'),
  category: z.string().optional().describe('Detected category'),
  subcategory: z.string().optional().describe('Detected subcategory'),
  suggestedPrice: z.number().min(0, 'Price must be non-negative').optional().describe('Suggested price in EUR'),
  brand: z.string().optional().describe('Product brand if detected'),
  color: z.string().optional().describe('Product color if applicable'),
  features: z.array(z.string()).default([]).describe('Key features'),
  imagePaths: z.array(z.string()).default([]).describe('Paths to product images'),
});

export type ProductInfo = z.infer<typeof ProductInfoSchema>;

/**
 * Generated content for a classified ad.
 */
export const AdContentSchema = z.object({
  title: z.string().max(65).describe('Ad title (max 65 chars)'),
  description: z.string().describe('Ad description'),
  price: z.number().min(0).describe('Price in EUR'),
  category: z.string().describe('Category for the ad'),
  subcategory: z.string().optional().describe('Subcategory for the ad'),
  condition: z.string().default('Gebraucht').describe('Product condition'),
  shippingType: z.string().default('PICKUP').describe('Shipping type'),
  postalCode: z.string().length(5).regex(/^\d+$/).describe('Postal code for location'),
});

export type AdContent = z.infer<typeof AdContentSchema>;

/**
 * Browser automation configuration.
 */
export const BrowserConfigSchema = z.object({
  cdpUrl: z.string().default('http://localhost:9222'),
  headless: z.boolean().default(false),
  timeout: z.number().default(30000).describe('Timeout in milliseconds'),
  screenshotOnError: z.boolean().default(true),
});

export type BrowserConfig = z.infer<typeof BrowserConfigSchema>;

/**
 * Delays configuration for human-like behavior.
 */
export const DelaysConfigSchema = z.object({
  typing: z
    .object({
      min: z.number().default(30),
      max: z.number().default(150),
    })
    .default({ min: 30, max: 150 }),
  click: z
    .object({
      min: z.number().default(100),
      max: z.number().default(300),
    })
    .default({ min: 100, max: 300 }),
  pageLoad: z.number().default(2000),
});

export type DelaysConfig = z.infer<typeof DelaysConfigSchema>;

/**
 * Vision configuration.
 */
export interface VisionConfig {
  backend: string;
  maxImagesPerAd?: number;
  gemini?: {
    apiKey: string;
    model?: string;
    maxOutputTokens?: number;
  };
  claude?: {
    apiKey: string;
    model?: string;
    maxTokens?: number;
    maxImageSize?: number;
  };
  openai?: {
    apiKey: string;
    model?: string;
    maxTokens?: number;
  };
  blip2?: {
    modelName?: string;
    device?: string;
    maxNewTokens?: number;
  };
}

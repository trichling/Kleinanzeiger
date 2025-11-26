/**
 * Unified settings models for Kleinanzeiger
 * Used by both CLI and Electron UI
 */

import { z } from 'zod';

/**
 * Vision backend configuration
 */
export interface VisionBackendConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  maxOutputTokens?: number;
  maxImageSize?: number;
  modelName?: string;
  device?: string;
  maxNewTokens?: number;
}

/**
 * Vision configuration
 */
export interface VisionSettings {
  backend: string;
  supportedFormats?: string[];
  maxImagesPerAd?: number;
  resizeThreshold?: number;
  claude?: VisionBackendConfig;
  gemini?: VisionBackendConfig;
  openai?: VisionBackendConfig;
  blip2?: VisionBackendConfig;
}

/**
 * Browser configuration
 */
export interface BrowserSettings {
  cdpUrl: string;
  headless: boolean;
  timeout: number;
  screenshotOnError: boolean;
}

/**
 * Kleinanzeigen platform configuration
 */
export interface KleinanzeigenSettings {
  baseUrl: string;
  shippingType: string;
  draftMode: boolean;
}

/**
 * Content generation settings
 */
export interface ContentSettings {
  maxTitleLength: number;
  defaultCondition: string;
  priceSuggestions: string[];
}

/**
 * Delays for human-like interaction
 */
export interface DelaysSettings {
  minTyping: number;
  maxTyping: number;
  minClick: number;
  maxClick: number;
  pageLoad: number;
  formField: number;
}

/**
 * Logging configuration
 */
export interface LoggingSettings {
  level: string;
  logDir: string;
  screenshotDir: string;
  format: string;
}

/**
 * Anthropic API configuration
 */
export interface AnthropicSettings {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

/**
 * Complete application settings
 * Matches the structure in config/settings.yaml
 */
export interface AppSettings {
  anthropic?: AnthropicSettings;
  browser: BrowserSettings;
  kleinanzeigen: KleinanzeigenSettings;
  content: ContentSettings;
  delays: DelaysSettings;
  logging: LoggingSettings;
  vision: VisionSettings;
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: AppSettings = {
  browser: {
    cdpUrl: 'http://localhost:9222',
    headless: false,
    timeout: 30000,
    screenshotOnError: true,
  },
  kleinanzeigen: {
    baseUrl: 'https://www.kleinanzeigen.de',
    shippingType: 'PICKUP',
    draftMode: true,
  },
  content: {
    maxTitleLength: 65,
    defaultCondition: 'Gebraucht',
    priceSuggestions: ['Verhandlungsbasis', 'Festpreis'],
  },
  delays: {
    minTyping: 50,
    maxTyping: 150,
    minClick: 100,
    maxClick: 300,
    pageLoad: 2000,
    formField: 500,
  },
  logging: {
    level: 'INFO',
    logDir: 'logs',
    screenshotDir: 'logs/screenshots',
    format: '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
  },
  vision: {
    backend: 'openai', // Changed from 'gemini' - use OpenAI as default or 'blip2' for free local option
    supportedFormats: ['.jpg', '.jpeg', '.png', '.webp'],
    maxImagesPerAd: 10,
    resizeThreshold: 5242880, // 5MB
    gemini: {
      apiKey: '',
      model: 'gemini-2.5-flash', // Stable Gemini 2.5 Flash model
      maxOutputTokens: 2000,
    },
    claude: {
      apiKey: '',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 2000,
      maxImageSize: 5242880,
    },
    openai: {
      apiKey: '',
      model: 'gpt-4-vision-preview',
      maxTokens: 2000,
    },
    blip2: {
      modelName: 'Salesforce/blip2-opt-2.7b',
      device: 'auto',
      maxNewTokens: 500,
    },
  },
};

/**
 * Zod schemas for validation
 */

export const VisionBackendConfigSchema = z.object({
  apiKey: z.string().optional(),
  model: z.string().optional(),
  maxTokens: z.number().optional(),
  maxOutputTokens: z.number().optional(),
  maxImageSize: z.number().optional(),
  modelName: z.string().optional(),
  device: z.string().optional(),
  maxNewTokens: z.number().optional(),
});

export const VisionSettingsSchema = z.object({
  backend: z.string().default('gemini'),
  supportedFormats: z.array(z.string()).optional(),
  maxImagesPerAd: z.number().optional(),
  resizeThreshold: z.number().optional(),
  claude: VisionBackendConfigSchema.optional(),
  gemini: VisionBackendConfigSchema.optional(),
  openai: VisionBackendConfigSchema.optional(),
  blip2: VisionBackendConfigSchema.optional(),
});

export const BrowserSettingsSchema = z.object({
  cdpUrl: z.string().default('http://localhost:9222'),
  headless: z.boolean().default(false),
  timeout: z.number().default(30000),
  screenshotOnError: z.boolean().default(true),
});

export const KleinanzeigenSettingsSchema = z.object({
  baseUrl: z.string().default('https://www.kleinanzeigen.de'),
  shippingType: z.string().default('PICKUP'),
  draftMode: z.boolean().default(true),
});

export const ContentSettingsSchema = z.object({
  maxTitleLength: z.number().default(65),
  defaultCondition: z.string().default('Gebraucht'),
  priceSuggestions: z.array(z.string()).default(['Verhandlungsbasis', 'Festpreis']),
});

export const DelaysSettingsSchema = z.object({
  minTyping: z.number().default(50),
  maxTyping: z.number().default(150),
  minClick: z.number().default(100),
  maxClick: z.number().default(300),
  pageLoad: z.number().default(2000),
  formField: z.number().default(500),
});

export const LoggingSettingsSchema = z.object({
  level: z.string().default('INFO'),
  logDir: z.string().default('logs'),
  screenshotDir: z.string().default('logs/screenshots'),
  format: z.string().default('%(asctime)s - %(name)s - %(levelname)s - %(message)s'),
});

export const AnthropicSettingsSchema = z.object({
  apiKey: z.string(),
  model: z.string().default('claude-3-5-sonnet-20241022'),
  maxTokens: z.number().default(2000),
  temperature: z.number().default(0.7),
});

export const AppSettingsSchema = z.object({
  anthropic: AnthropicSettingsSchema.optional(),
  browser: BrowserSettingsSchema,
  kleinanzeigen: KleinanzeigenSettingsSchema,
  content: ContentSettingsSchema,
  delays: DelaysSettingsSchema,
  logging: LoggingSettingsSchema,
  vision: VisionSettingsSchema,
});

/**
 * Helper to get default model for a backend
 */
export function getDefaultModelForBackend(backend: string): string {
  switch (backend.toLowerCase()) {
    case 'openai':
      return 'gpt-4-vision-preview';
    case 'gemini':
      return 'gemini-pro-vision';
    case 'claude':
      return 'claude-3-5-sonnet-20241022';
    case 'blip2':
      return 'Salesforce/blip2-opt-2.7b';
    default:
      return '';
  }
}

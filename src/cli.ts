#!/usr/bin/env node
/**
 * Main CLI application for Kleinanzeiger.
 */

import { Command } from 'commander';
import { config as loadEnv } from 'dotenv';
import fs from 'fs';
import { homedir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { ProductAnalyzer } from './vision/analyzer.js';
import { ContentGenerator } from './content/generator.js';
import { BrowserController } from './automation/browser.js';
import { KleinanzeigenAutomator } from './automation/kleinanzeigen.js';
import { BrowserConfig } from './vision/models.js';
import { setupLogging, createLogger } from './utils/logger.js';

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load environment variables
const envPath = path.join(projectRoot, '.env');
loadEnv({ path: envPath });

/**
 * Load configuration from YAML file.
 */
function loadConfig(configPath: string): any {
  const fileContents = fs.readFileSync(configPath, 'utf8');
  const config = YAML.parse(fileContents);

  // Expand environment variables for vision backends
  const expandEnvVar = (value: any): any => {
    if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
      const envVar = value.slice(2, -1);
      const envValue = process.env[envVar];
      if (!envValue) {
        return null;
      }
      return envValue;
    }
    return value;
  };

  // Get selected backend
  const selectedVisionBackend = config.vision?.backend || 'gemini';

  // Expand environment variables for vision backends
  if (config.vision) {
    for (const backend of ['claude', 'openai', 'gemini']) {
      if (config.vision[backend]?.api_key) {
        const originalValue = config.vision[backend].api_key;
        const expanded = expandEnvVar(originalValue);

        // Convert snake_case to camelCase for TypeScript compatibility
        config.vision[backend].apiKey = expanded;
        delete config.vision[backend].api_key;

        // Only raise error if this is the selected backend and key is missing
        if (backend === selectedVisionBackend && !expanded) {
          const envVarName = typeof originalValue === 'string' && originalValue.startsWith('${')
            ? originalValue.slice(2, -1)
            : originalValue;
          throw new Error(
            `Environment variable '${envVarName}' for vision backend not set.\n` +
            `Please add '${envVarName}=your-key' to your .env file,\n` +
            `or choose a different backend in config/settings.yaml`
          );
        }
      }
    }
  }

  return config;
}

/**
 * Main async function.
 */
async function main() {
  const program = new Command();

  program
    .name('kleinanzeiger')
    .description('Automated Classified Ad Generator for kleinanzeigen.de')
    .version('1.0.0')
    .requiredOption('--image-folder <path>', 'Path to folder containing product images')
    .requiredOption('--postal-code <code>', '5-digit postal code for ad location')
    .option('--price <amount>', 'Override suggested price (in EUR)', parseFloat)
    .option('--category <category>', 'Override category detection (optional)')
    .option('--draft', 'Save as draft instead of publishing (default: true)', true)
    .option('--auto-confirm', 'Skip confirmation prompt before saving draft', false)
    .addHelpText('after', `
Examples:
  kleinanzeiger --image-folder ./products/laptop --postal-code 10115
  kleinanzeiger --image-folder ./products/bike --postal-code 80331 --price 150
  kleinanzeiger --image-folder ./products/sofa --postal-code 20095 --auto-confirm

Before running:
  1. Set GEMINI_API_KEY environment variable
  2. Start Brave browser with: brave --remote-debugging-port=9222
  3. Login to kleinanzeigen.de manually in the browser
    `);

  program.parse();

  const options = program.opts();

  // Validate postal code
  if (!/^\d{5}$/.test(options.postalCode)) {
    console.error('Error: Postal code must be exactly 5 digits');
    process.exit(1);
  }

  // Load configuration
  const configPath = path.join(projectRoot, 'config', 'settings.yaml');
  const config = loadConfig(configPath);

  // Setup logging
  const logDir = path.join(projectRoot, config.logging.log_dir);
  const screenshotDir = path.join(projectRoot, config.logging.screenshot_dir);
  setupLogging(config.logging.level, logDir);

  const logger = createLogger('Main');
  logger.info('='.repeat(80));
  logger.info('Kleinanzeiger - Automated Classified Ad Generator');
  logger.info('='.repeat(80));

  // Parse arguments
  // Expand tilde (~) in image folder path
  let imageFolder = options.imageFolder;
  if (imageFolder.startsWith('~/')) {
    imageFolder = path.join(homedir(), imageFolder.slice(2));
  } else if (imageFolder === '~') {
    imageFolder = homedir();
  }
  imageFolder = path.resolve(imageFolder);

  const postalCode = options.postalCode;
  const priceOverride = options.price;
  const autoConfirm = options.autoConfirm;

  logger.info(`Image folder: ${imageFolder}`);
  logger.info(`Postal code: ${postalCode}`);
  if (priceOverride) {
    logger.info(`Price override: €${priceOverride}`);
  }

  try {
    // Initialize components
    logger.info('Initializing components...');

    const browserConfig: BrowserConfig = {
      cdpUrl: config.browser.cdp_url,
      headless: config.browser.headless,
      timeout: config.browser.timeout,
      screenshotOnError: config.browser.screenshot_on_error,
    };

    // Initialize ProductAnalyzer with vision settings
    const analyzer = new ProductAnalyzer(config.vision);
    logger.info(`Using vision backend: ${analyzer.backendName}`);

    const generator = new ContentGenerator();

    // Step 1: Analyze images
    logger.info('Step 1: Analyzing product images...');
    const productInfo = await analyzer.analyzeImages(imageFolder);
    logger.info(`Product identified: ${productInfo.name}`);
    logger.info(`Suggested price: €${productInfo.suggestedPrice}`);

    // Debug: Output full product analysis as JSON
    logger.debug('='.repeat(80));
    logger.debug('PRODUCT ANALYSIS (Vision Backend)');
    logger.debug('='.repeat(80));
    logger.debug(JSON.stringify({
      name: productInfo.name,
      condition: productInfo.condition,
      category: productInfo.category,
      subcategory: productInfo.subcategory,
      brand: productInfo.brand,
      color: productInfo.color,
      suggestedPrice: productInfo.suggestedPrice,
      features: productInfo.features,
      description: productInfo.description,
      imagePaths: productInfo.imagePaths,
    }, null, 2));
    logger.debug('='.repeat(80));

    // Step 2: Skip category mapping - kleinanzeigen.de auto-detects from title
    logger.info('Step 2: Skipping category mapping - kleinanzeigen.de will auto-detect from title');
    logger.info(`Vision detected category: ${productInfo.category}`);

    // Step 3: Generate ad content
    logger.info('Step 3: Generating ad content...');
    const adContent = generator.generateAdContent(
      productInfo,
      postalCode,
      productInfo.category,
      undefined,
      priceOverride
    );
    logger.info(`Ad title: ${adContent.title}`);
    logger.info(`Ad price: €${adContent.price}`);

    // Debug: Output full ad content as JSON
    logger.debug('='.repeat(80));
    logger.debug('GENERATED AD CONTENT (Full)');
    logger.debug('='.repeat(80));
    logger.debug(JSON.stringify({
      title: adContent.title,
      category: adContent.category,
      subcategory: adContent.subcategory,
      condition: adContent.condition,
      shippingType: adContent.shippingType,
      price: adContent.price,
      postalCode: adContent.postalCode,
      description: adContent.description,
      images: productInfo.imagePaths.map((imgPath, idx) => ({
        index: idx + 1,
        filename: path.basename(imgPath),
        path: imgPath,
      })),
    }, null, 2));
    logger.debug('='.repeat(80));

    // Step 4: Connect to browser
    logger.info('Step 4: Connecting to browser...');
    logger.info('Make sure Brave is running with: brave --remote-debugging-port=9222');

    const browserController = new BrowserController(browserConfig);

    try {
      const page = await browserController.connect();

      // Step 5: Create ad
      logger.info('Step 5: Creating ad on kleinanzeigen.de...');
      const automator = new KleinanzeigenAutomator(page, config.kleinanzeigen.base_url);

      await automator.createAd(
        adContent,
        productInfo.imagePaths,
        config.kleinanzeigen.draft_mode,
        autoConfirm
      );

      // Take success screenshot
      await browserController.takeScreenshot('success.png', screenshotDir);

      logger.info('='.repeat(80));
      logger.info('SUCCESS! Ad created successfully');
      logger.info('='.repeat(80));
    } catch (error) {
      logger.error(`Error during automation: ${error}`);
      await browserController.handleError(error as Error, screenshotDir);
      throw error;
    } finally {
      await browserController.close();
    }
  } catch (error) {
    logger.error(`Fatal error: ${error}`);
    if (error instanceof Error) {
      logger.error(error.stack || '');
    }
    process.exit(1);
  }
}

// Run main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

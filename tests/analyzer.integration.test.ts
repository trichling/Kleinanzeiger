/**
 * Full integration test for ProductAnalyzer with image analysis.
 *
 * Prerequisites:
 * - GEMINI_API_KEY environment variable must be set
 * - Test images should exist in ./tests/products/
 * - Run with: npm test analyzer.integration.test.ts
 */

import { ProductAnalyzer } from '../src/vision/analyzer.js';
import { VisionConfig } from '../src/vision/models.js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs/promises';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('ProductAnalyzer Integration', () => {
  let config: { vision: VisionConfig };

  beforeAll(() => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('⚠️  GEMINI_API_KEY not found - tests will be skipped');
    }

    config = {
      vision: {
        backend: 'gemini',
        maxImagesPerAd: 10,
        gemini: {
          apiKey: apiKey || '',
          model: 'gemini-2.5-flash',
        },
      },
    };
  });

  it('should create ProductAnalyzer', () => {
    const analyzer = new ProductAnalyzer(config.vision);
    expect(analyzer).toBeDefined();
    expect(analyzer.backendName).toBe('gemini');
  });

  it('should have access to vision config', () => {
    const analyzer = new ProductAnalyzer(config.vision);

    expect(analyzer.backendName).toBe('gemini');
    console.log(`✓ Backend: ${analyzer.backendName}`);
  });

  describe('Image Analysis', () => {
    it('should analyze product images', async () => {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.log('⚠️  Skipping test - no API key');
        return;
      }

      // Check if test images exist
      const testImageFolder = path.join(__dirname, '../products/Playmobil 4140 City Life');

      let folderExists = false;
      try {
        const stats = await fs.stat(testImageFolder);
        folderExists = stats.isDirectory();
      } catch (error) {
        // Folder doesn't exist
      }

      if (!folderExists) {
        console.log(`⚠️  Skipping test - test images not found at: ${testImageFolder}`);
        console.log('   Create test images in ./products/Playmobil 4140 City Life/ to run this test');
        return;
      }

      console.log(`\nAnalyzing images from: ${testImageFolder}`);

      const analyzer = new ProductAnalyzer(config.vision);
      const productInfo = await analyzer.analyzeImages(testImageFolder);

      expect(productInfo).toBeDefined();
      expect(productInfo.name).toBeTruthy();
      expect(productInfo.description).toBeTruthy();

      console.log('\n✓ Successfully analyzed product:');
      console.log(`  Name: ${productInfo.name}`);
      console.log(`  Condition: ${productInfo.condition}`);
      console.log(`  Price: €${productInfo.suggestedPrice}`);
      console.log(`  Category: ${productInfo.category || 'Not specified'}`);
      console.log(`  Brand: ${productInfo.brand || 'Not specified'}`);
      console.log(`  Color: ${productInfo.color || 'Not specified'}`);
      console.log(`  Features: ${productInfo.features?.length || 0} items`);
      console.log(`  Images: ${productInfo.imagePaths?.length || 0} files`);
    }, 60000); // 60 second timeout for API call
  });
});

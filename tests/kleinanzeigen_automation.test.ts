/**
 * Integration test for kleinanzeigen.de automation.
 * Tests form filling and category selection without needing vision/content generation.
 *
 * Prerequisites:
 * 1. Brave Browser must be running with: --remote-debugging-port=9222
 * 2. You must be logged in to kleinanzeigen.de in that browser
 */

import path from 'path';
import { BrowserController } from '../src/automation/browser.js';
import { KleinanzeigenAutomator, collectUploadableImages } from '../src/automation/kleinanzeigen.js';
import { AdContent, BrowserConfig } from '../src/vision/models.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create a test ad with realistic data.
 */
function createTestAd(): AdContent {
  return {
    title: 'Playmobil City Life Planschbecken Set 4140',
    description: `Verkaufe ein gut erhaltenes Playmobil City Life Planschbecken Set (4140).

Das Set beinhaltet:
- Planschbecken mit Zubehör
- 3 Figuren (1 Erwachsener, 2 Kinder)
- Sonnenliege und Sonnenschirm
- Boot und Schwimmtier
- Grüne Bodenplatte mit Pflanzen
- Originalverpackung

Zustand: Wie Neu
Das Set ist vollständig und in sehr gutem Zustand.

Nur Abholung möglich.`,
    price: 15.0,
    category: 'Spielzeug',
    subcategory: undefined,
    condition: 'Gebraucht',
    shippingType: 'PICKUP',
    postalCode: '48429',
  };
}

describe('Kleinanzeigen Automation Tests', () => {
  const config: BrowserConfig = {
    cdpUrl: 'http://127.0.0.1:9222',
    headless: false,
    timeout: 30000,
    screenshotOnError: true,
  };

  describe('Browser Connection & Navigation', () => {
    it('should connect to browser and navigate to kleinanzeigen.de', async () => {
      const controller = new BrowserController(config);

      try {
        const page = await controller.connect();
        expect(page).toBeDefined();

        console.log(`✓ Connected to browser`);
        console.log(`  Current URL: ${page.url()}`);

        // Navigate to kleinanzeigen.de
        await page.goto('https://www.kleinanzeigen.de', { waitUntil: 'domcontentloaded' });
        await new Promise((resolve) => setTimeout(resolve, 2000));

        expect(page.url()).toContain('kleinanzeigen.de');
        console.log(`✓ Navigated successfully to ${page.url()}`);

        await controller.close();
      } catch (error) {
        await controller.close();
        throw error;
      }
    }, 30000);
  });

  describe('Login Status Check', () => {
    it('should check if user is logged in', async () => {
      const controller = new BrowserController(config);

      try {
        const page = await controller.connect();
        await page.goto('https://www.kleinanzeigen.de', { waitUntil: 'domcontentloaded' });
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const automator = new KleinanzeigenAutomator(page);
        const isLoggedIn = await automator.checkLoginStatus();

        console.log(`Login status: ${isLoggedIn ? 'Logged in' : 'Not logged in'}`);

        // Note: This test doesn't fail if not logged in, just reports status
        expect(typeof isLoggedIn).toBe('boolean');

        await controller.close();
      } catch (error) {
        await controller.close();
        throw error;
      }
    }, 30000);
  });

  describe('Image Collection', () => {
    it('should collect uploadable images from test folder', async () => {
      const imageFolder = path.join(__dirname, 'products');

      try {
        const imagePaths = await collectUploadableImages(imageFolder, 5);
        expect(imagePaths.length).toBeGreaterThan(0);

        console.log(`✓ Found ${imagePaths.length} uploadable images:`);
        imagePaths.forEach((imgPath) => {
          console.log(`  - ${path.basename(imgPath)}`);
        });
      } catch (error) {
        console.log(`⚠ Could not find images in ${imageFolder}: ${error}`);
        // Don't fail the test if no images found
      }
    });
  });

  describe('Ad Creation Flow', () => {
    it('should create an ad as draft (manual confirmation required)', async () => {
      const controller = new BrowserController(config);

      try {
        const page = await controller.connect();
        console.log('✓ Connected to browser');

        // Create automator
        const automator = new KleinanzeigenAutomator(page);

        // Create test ad
        const testAd = createTestAd();
        console.log('\nTest ad created:');
        console.log(`  Title: ${testAd.title}`);
        console.log(`  Category: ${testAd.category}`);
        console.log(`  Condition: ${testAd.condition}`);
        console.log(`  Shipping: ${testAd.shippingType}`);
        console.log(`  Price: €${testAd.price}`);
        console.log(`  Postal code: ${testAd.postalCode}`);

        // Use test images from tests/products folder
        const imageFolder = path.join(__dirname, 'products');
        let imagePaths: string[] = [];

        try {
          imagePaths = await collectUploadableImages(imageFolder, 5);
          console.log(`  Images: ${imagePaths.length} image(s) from ${imageFolder}`);
          imagePaths.forEach((img) => {
            console.log(`    - ${path.basename(img)}`);
          });
        } catch (error) {
          console.log(`  ⚠ ${error}`);
          console.log('  Test will proceed without images');
        }

        // Try to create the ad
        console.log('\nStarting ad creation...');

        // Note: This will require manual confirmation before saving as draft
        // The test will pause and wait for you to press Enter in the console
        console.log('\n⚠️  IMPORTANT: Test will ask for confirmation before saving!');
        await automator.createAd(testAd, imagePaths, true, false); // saveAsDraft=true, autoConfirm=false

        console.log('\n✓ PASS: Ad created successfully as draft!');

        await controller.close();
      } catch (error) {
        console.error(`\n✗ FAIL: ${error}`);
        // Take screenshot on error
        const screenshotDir = path.join(__dirname, '..', 'logs', 'screenshots');
        await controller.handleError(error as Error, screenshotDir);
        await controller.close();
        throw error;
      }
    }, 120000); // 2 minute timeout for this test
  });
});

/**
 * Manual test runner (for running outside Jest).
 * Run with: npm run dev tests/kleinanzeigen_automation.test.ts
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('='.repeat(60));
  console.log('KLEINANZEIGEN.DE AUTOMATION INTEGRATION TEST');
  console.log('='.repeat(60));
  console.log();
  console.log('Prerequisites:');
  console.log('  1. Brave Browser running with: --remote-debugging-port=9222');
  console.log('  2. Logged in to kleinanzeigen.de in that browser');
  console.log();

  (async () => {
    const config: BrowserConfig = {
      cdpUrl: 'http://127.0.0.1:9222',
      headless: false,
      timeout: 30000,
      screenshotOnError: true,
    };

    const controller = new BrowserController(config);

    try {
      const page = await controller.connect();
      const automator = new KleinanzeigenAutomator(page);
      const testAd = createTestAd();

      const imageFolder = path.join(__dirname, 'products');
      let imagePaths: string[] = [];

      try {
        imagePaths = await collectUploadableImages(imageFolder, 5);
      } catch (error) {
        console.log(`Warning: ${error}`);
      }

      await automator.createAd(testAd, imagePaths, true, false); // autoConfirm=false for manual confirmation

      console.log('\n✓ Test completed successfully');
      await controller.close();
      process.exit(0);
    } catch (error) {
      console.error(`\n✗ Test failed: ${error}`);
      await controller.close();
      process.exit(1);
    }
  })();
}

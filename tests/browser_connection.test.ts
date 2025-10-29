/**
 * Test browser connection to verify CDP is working.
 */

import { BrowserController } from '../src/automation/browser.js';
import { BrowserConfig } from '../src/vision/models.js';

describe('Browser Connection Test', () => {
  const config: BrowserConfig = {
    cdpUrl: 'http://127.0.0.1:9222',
    headless: false,
    timeout: 30000,
    screenshotOnError: true,
  };

  it('should connect to browser via CDP', async () => {
    console.log('='.repeat(60));
    console.log('BROWSER CONNECTION TEST');
    console.log('='.repeat(60));
    console.log('\nPrerequisites:');
    console.log('  1. Brave Browser must be running');
    console.log('  2. Started with: --remote-debugging-port=9222');
    console.log('\nTesting connection...\n');

    const controller = new BrowserController(config);

    try {
      const page = await controller.connect();
      expect(page).toBeDefined();

      console.log('✓ Successfully connected to browser!');
      console.log(`✓ Page title: ${await page.title()}`);
      console.log(`✓ Page URL: ${page.url()}`);

      // Navigate to a test page
      console.log('\nNavigating to example.com...');
      await page.goto('https://example.com');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log(`✓ New page title: ${await page.title()}`);

      await controller.close();
      console.log('\n✓ PASS: Browser connection works!');
    } catch (error) {
      console.error(`\n✗ FAIL: ${error}`);
      console.log('\nTroubleshooting:');
      console.log('  1. Make sure Brave is running');
      console.log('  2. Start Brave with:');
      console.log('     brave --remote-debugging-port=9222');
      console.log('  3. Check if port 9222 is in use: lsof -i :9222');

      await controller.close();
      throw error;
    }
  }, 30000);
});

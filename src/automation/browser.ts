/**
 * Browser controller for automation.
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import path from 'path';
import fs from 'fs';
import { BrowserConfig } from '../vision/models.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('BrowserController');

/**
 * Controller for browser automation using Playwright.
 */
export class BrowserController {
  private config: BrowserConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  constructor(config: BrowserConfig) {
    this.config = config;
  }

  /**
   * Connect to an existing browser instance via CDP.
   */
  async connect(): Promise<Page> {
    try {
      logger.info(`Connecting to browser at ${this.config.cdpUrl}`);

      this.browser = await chromium.connectOverCDP(this.config.cdpUrl);
      const contexts = this.browser.contexts();

      if (contexts.length === 0) {
        throw new Error('No browser context found');
      }

      this.context = contexts[0];
      const pages = this.context.pages();

      if (pages.length === 0) {
        this.page = await this.context.newPage();
      } else {
        this.page = pages[0];
      }

      // Set default timeout
      this.page.setDefaultTimeout(this.config.timeout);

      logger.info('Successfully connected to browser');
      return this.page;
    } catch (error) {
      logger.error(`Failed to connect to browser: ${error}`);
      throw error;
    }
  }

  /**
   * Take a screenshot.
   */
  async takeScreenshot(filename: string, screenshotDir: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not connected');
    }

    // Create screenshot directory if it doesn't exist
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const screenshotPath = path.join(screenshotDir, filename);
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    logger.info(`Screenshot saved: ${screenshotPath}`);
  }

  /**
   * Handle errors by taking a screenshot.
   */
  async handleError(_error: Error, screenshotDir: string): Promise<void> {
    if (this.config.screenshotOnError && this.page) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `error_${timestamp}.png`;
      try {
        await this.takeScreenshot(filename, screenshotDir);
      } catch (screenshotError) {
        logger.error(`Failed to take error screenshot: ${screenshotError}`);
      }
    }
  }

  /**
   * Close the browser connection.
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      logger.info('Browser connection closed');
    }
  }
}

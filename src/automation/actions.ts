/**
 * Human-like UI interaction actions.
 */

import { Page, Locator } from 'playwright';
import { DelaysConfig } from '../vision/models.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('UIActions');

/**
 * Default delays configuration.
 */
const DEFAULT_DELAYS: DelaysConfig = {
  typing: { min: 5, max: 15 },
  click: { min: 100, max: 300 },
  pageLoad: 2000,
};

/**
 * Helper class for human-like UI interactions.
 */
export class UIActions {
  private page: Page;
  private delays: DelaysConfig;

  constructor(page: Page, delays: DelaysConfig = DEFAULT_DELAYS) {
    this.page = page;
    this.delays = delays;
  }

  /**
   * Get a random delay within the specified range.
   */
  private getRandomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Perform a human-like click with random delay.
   */
  async humanClick(element: Locator): Promise<void> {
    const delay = this.getRandomDelay(this.delays.click.min, this.delays.click.max);
    await new Promise((resolve) => setTimeout(resolve, delay));
    await element.click();
    logger.debug(`Clicked element with ${delay}ms delay`);
  }

  /**
   * Type text with human-like delays between characters.
   */
  async humanType(element: Locator, text: string): Promise<void> {
    await element.click(); // Focus the element first
    await element.fill(''); // Clear existing content

    for (const char of text) {
      const delay = this.getRandomDelay(this.delays.typing.min, this.delays.typing.max);
      await element.type(char, { delay });
    }
    logger.debug(`Typed ${text.length} characters with human-like delays`);
  }

  /**
   * Wait for page to load.
   */
  async waitForPageLoad(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.delays.pageLoad));
    await this.page.waitForLoadState('domcontentloaded');
    logger.debug('Waited for page load');
  }

  /**
   * Scroll page randomly to appear human-like.
   */
  async scrollRandomly(): Promise<void> {
    const scrollAmount = Math.floor(Math.random() * 500) + 200;
    await this.page.evaluate((amount: number) => {
      // In browser context, window is available
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).window.scrollBy({ top: amount, behavior: 'smooth' });
    }, scrollAmount);
    await new Promise((resolve) => setTimeout(resolve, 500));
    logger.debug(`Scrolled ${scrollAmount}px`);
  }
}

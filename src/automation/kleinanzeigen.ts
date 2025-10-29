/**
 * Kleinanzeigen.de specific automation logic.
 */

import { Page } from 'playwright';
import fs from 'fs/promises';
import path from 'path';
import { AdContent } from '../vision/models.js';
import { UIActions } from './actions.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('KleinanzeigenAutomator');

/**
 * Supported web image formats (excludes HEIC/HEIF which are not web-compatible).
 */
const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']);

/**
 * Collect all uploadable images from a folder (excludes HEIC files).
 */
export async function collectUploadableImages(imageFolder: string, maxImages: number = 10): Promise<string[]> {
  const stats = await fs.stat(imageFolder);
  if (!stats.isDirectory()) {
    throw new Error(`Image folder not found: ${imageFolder}`);
  }

  const files = await fs.readdir(imageFolder);
  const imagePaths: string[] = [];

  // Sort for consistent ordering
  files.sort();

  for (const file of files) {
    if (imagePaths.length >= maxImages) {
      break;
    }

    const filePath = path.join(imageFolder, file);
    const fileStats = await fs.stat(filePath);

    if (!fileStats.isFile()) {
      continue;
    }

    const ext = path.extname(file).toLowerCase();
    if (SUPPORTED_EXTENSIONS.has(ext)) {
      imagePaths.push(filePath);
    }
  }

  if (imagePaths.length === 0) {
    throw new Error(`No uploadable images found in ${imageFolder}`);
  }

  return imagePaths;
}

/**
 * Automates ad posting on kleinanzeigen.de.
 */
export class KleinanzeigenAutomator {
  private page: Page;
  private baseUrl: string;
  private actions: UIActions;

  constructor(page: Page, baseUrl: string = 'https://www.kleinanzeigen.de') {
    this.page = page;
    this.baseUrl = baseUrl;
    this.actions = new UIActions(page);
  }

  /**
   * Navigate to the 'post ad' page (step 2 - the form).
   */
  async navigateToPostAd(): Promise<void> {
    logger.info('Navigating to post ad page');

    const currentUrl = this.page.url();

    // Check if we're already on step 2 (the form)
    if (currentUrl.includes('p-anzeige-aufgeben-schritt2')) {
      logger.info('Already on step 2 (form page), skipping navigation');
      return;
    }

    // Navigate directly to step 2 (most reliable approach)
    logger.info('Navigating directly to step 2 (form page)');
    await this.page.goto(`${this.baseUrl}/p-anzeige-aufgeben-schritt2.html`);
    await this.actions.waitForPageLoad();

    // Verify we're on the correct page
    if (this.page.url().includes('schritt2')) {
      logger.info('Successfully arrived at step 2 (form page)');
    } else {
      logger.warn(`May not be on correct page. Current URL: ${this.page.url()}`);
    }
  }

  /**
   * Check if user is logged in.
   */
  async checkLoginStatus(): Promise<boolean> {
    try {
      const loginButton = await this.page.locator('text="Einloggen"').count();
      const isLoggedOut = loginButton > 0;
      const isLoggedIn = !isLoggedOut;

      if (isLoggedIn) {
        logger.info('User is logged in');
      } else {
        logger.warn('User is not logged in');
      }

      return isLoggedIn;
    } catch (error) {
      logger.error(`Error checking login status: ${error}`);
      return false;
    }
  }

  /**
   * Select product condition by opening the dialog and choosing the appropriate radio button.
   */
  async selectCondition(condition: string): Promise<void> {
    logger.info(`Selecting condition: ${condition}`);

    try {
      // Map German condition values to radio button indices
      const conditionMapping: Record<string, number> = {
        Neu: 1, // New
        'Wie neu': 2, // Like new
        Gut: 3, // OK/Good
        Gebraucht: 3, // Used -> map to OK/Good
        Akzeptabel: 4, // Alright/Acceptable
        Defekt: 4, // Defective -> map to Alright (closest option)
      };

      // Get the radio button index (default to 3 = OK/Good if not found)
      const buttonIndex = conditionMapping[condition] || 3;
      logger.info(`Mapping '${condition}' to radio button index ${buttonIndex}`);

      // Step 1: Click the button to open the condition dialog
      logger.info('Opening condition selection dialog');
      const dialogTrigger = this.page.locator(
        '//*[@id="j-post-listing-frontend-conditions"]/div/div/div/div[1]/div[2]/div/button'
      );
      await this.actions.humanClick(dialogTrigger);

      // Wait for dialog to appear
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 2: Select the appropriate radio button
      logger.info(`Selecting condition radio button ${buttonIndex}`);
      const conditionRadio = this.page.locator(`//*[@id="condition-selector"]/div/label[${buttonIndex}]`);
      await this.actions.humanClick(conditionRadio);

      // Small delay to let selection register
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Step 3: Confirm selection by clicking the confirmation button
      logger.info('Confirming condition selection');
      const confirmButton = this.page.locator(
        '//*[@id="j-post-listing-frontend-conditions"]/div/div/div/div[1]/div[2]/div/dialog/div/footer/button[2]'
      );
      await this.actions.humanClick(confirmButton);

      // Wait for dialog to close
      await new Promise((resolve) => setTimeout(resolve, 500));

      logger.info(`Condition '${condition}' selected successfully`);
    } catch (error) {
      logger.error(`Error selecting condition: ${error}`);
      throw error;
    }
  }

  /**
   * Select shipping method (pickup or shipping).
   */
  async selectShippingMethod(shippingType: string = 'PICKUP'): Promise<void> {
    logger.info(`Selecting shipping method: ${shippingType}`);

    try {
      // Map shipping types to radio button indices
      const shippingMapping: Record<string, number> = {
        PICKUP: 2, // Pickup only (Abholung)
        SHIPPING: 1, // Shipping (Versand)
        BOTH: 3, // Both options
      };

      // Get the radio button index (default to 2 = PICKUP if not found)
      const buttonIndex = shippingMapping[shippingType] || 2;
      logger.info(`Mapping '${shippingType}' to radio button index ${buttonIndex}`);

      // Select the shipping method radio button
      logger.info('Selecting pickup option');
      const shippingRadio = this.page.locator(`//*[@id="shipping-pickup-selector"]/div/label[${buttonIndex}]`);
      await this.actions.humanClick(shippingRadio);

      // Small delay to let selection register
      await new Promise((resolve) => setTimeout(resolve, 300));

      logger.info(`Shipping method '${shippingType}' selected successfully`);
    } catch (error) {
      logger.error(`Error selecting shipping method: ${error}`);
      throw error;
    }
  }

  /**
   * Fill out the ad creation form.
   */
  async fillAdForm(adContent: AdContent, imagePaths: string[]): Promise<void> {
    logger.info('Filling ad form');

    try {
      // Step 1: Fill title (category auto-selected after leaving field)
      logger.info(`Entering title: ${adContent.title}`);
      const titleInput = this.page.locator('//*[@id="postad-title"]');
      await titleInput.waitFor({ timeout: 10000 });
      await this.actions.humanType(titleInput, adContent.title);

      // Press Tab to trigger category auto-selection
      logger.info('Pressing Tab key to trigger category auto-selection');
      await titleInput.press('Tab');
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for auto-selection
      logger.info('Title entered, category should be auto-selected');

      // Step 2: Select condition
      logger.info(`Selecting condition: ${adContent.condition}`);
      await this.selectCondition(adContent.condition);

      // Step 3: Select shipping method
      logger.info(`Selecting shipping method: ${adContent.shippingType}`);
      await this.selectShippingMethod(adContent.shippingType);

      // Step 4: Fill price
      logger.info(`Entering price: €${adContent.price}`);
      const priceInput = this.page.locator('//*[@id="micro-frontend-price"]');
      await priceInput.waitFor({ timeout: 10000 });
      await this.actions.humanType(priceInput, Math.floor(adContent.price).toString());

      // Step 5: Select VB (Verhandlungsbasis)
      logger.info("Selecting 'Verhandlungsbasis' (VB)");
      const priceTypeSelect = this.page.locator('//*[@id="micro-frontend-price-type"]');
      await priceTypeSelect.waitFor({ timeout: 10000 });
      await priceTypeSelect.selectOption({ value: 'NEGOTIABLE' });

      // Step 6: Fill description
      logger.info('Entering description');
      const descriptionInput = this.page.locator('//*[@id="pstad-descrptn"]');
      await descriptionInput.waitFor({ timeout: 10000 });
      await this.actions.humanType(descriptionInput, adContent.description);

      // Step 7: Upload images if provided
      if (imagePaths.length > 0) {
        logger.info(`Uploading ${imagePaths.length} image(s)`);
        await this.uploadImages(imagePaths);
      }

      logger.info('Form filled successfully');
    } catch (error) {
      logger.error(`Error filling form: ${error}`);
      throw error;
    }
  }

  /**
   * Upload product images.
   */
  async uploadImages(imagePaths: string[]): Promise<void> {
    try {
      // Filter out HEIC files (shouldn't be in the list, but double-check)
      const uploadableImages = imagePaths.filter((p) => {
        const ext = path.extname(p).toLowerCase();
        return !['.heic', '.heif'].includes(ext);
      });

      if (uploadableImages.length === 0) {
        logger.warn('No uploadable images found (HEIC files are not supported)');
        return;
      }

      logger.info(`Preparing to upload ${uploadableImages.length} image(s)`);

      // Find the hidden file input element
      const fileInput = this.page.locator('input[type="file"][accept*="image"]');
      await fileInput.waitFor({ timeout: 10000, state: 'attached' });

      // Upload all images at once
      logger.info(`Uploading images: ${uploadableImages.map((p) => path.basename(p)).join(', ')}`);
      await fileInput.setInputFiles(uploadableImages);

      // Wait for uploads to complete
      const waitTime = Math.min(2 + uploadableImages.length * 0.5, 10); // 2s base + 0.5s per image, max 10s
      logger.info(`Waiting ${waitTime.toFixed(1)}s for upload to complete`);
      await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));

      logger.info(`Successfully uploaded ${uploadableImages.length} image(s)`);
    } catch (error) {
      logger.error(`Error uploading images: ${error}`);
      throw error;
    }
  }

  /**
   * Save the ad as a draft instead of publishing.
   */
  async saveAsDraft(autoConfirm: boolean = false): Promise<boolean> {
    logger.info('Saving ad as draft');

    try {
      // Show current page info
      logger.info(`Current URL: ${this.page.url()}`);
      logger.info('Ad form has been filled and is ready to be saved as draft.');

      // Check if confirmation is needed
      if (!autoConfirm) {
        // Wait for manual confirmation
        logger.info('='.repeat(60));
        logger.info('MANUAL CONFIRMATION REQUIRED');
        logger.info('='.repeat(60));
        logger.info('Please review the ad in your browser.');
        logger.info('The ad will be saved as a DRAFT (not published).');
        logger.info('');

        // Use readline to wait for user input
        const readline = await import('node:readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        await new Promise<void>((resolve) => {
          rl.question('Press Enter to save as draft, or Ctrl+C to cancel: ', () => {
            rl.close();
            resolve();
          });
        });

        logger.info('Confirmation received, proceeding with save...');
      } else {
        logger.info('Auto-confirm enabled, proceeding with save without confirmation...');
      }

      // Click "Entwurf speichern" (Save Draft) button
      logger.info("Clicking 'Entwurf speichern' button");
      const draftButton = this.page.locator(
        '//*[@id="j-post-listing-frontend-draft-button"]/div/div/button'
      );
      await draftButton.waitFor({ timeout: 10000 });
      await this.actions.humanClick(draftButton);

      // Wait for confirmation/redirect
      await new Promise((resolve) => setTimeout(resolve, 3000));

      logger.info('Ad saved as draft successfully');
      logger.info(`Current URL: ${this.page.url()}`);
      return true;
    } catch (error) {
      logger.error(`Error saving draft: ${error}`);
      logger.warn('Could not find draft button at expected location');
      throw error;
    }
  }

  /**
   * Create a complete ad on kleinanzeigen.de.
   */
  async createAd(adContent: AdContent, imagePaths: string[], saveAsDraft: boolean = true, autoConfirm: boolean = false): Promise<void> {
    logger.info('Starting ad creation process');

    // Navigate to post ad page
    await this.navigateToPostAd();

    // Check login status (optional - mainly for debugging)
    try {
      const isLoggedIn = await this.checkLoginStatus();
      if (!isLoggedIn) {
        logger.warn('User may not be logged in - proceeding anyway');
      }
    } catch (error) {
      logger.debug(`Login check failed: ${error}, continuing anyway`);
    }

    // Fill form
    await this.fillAdForm(adContent, imagePaths);

    // Scroll randomly to appear human
    await this.actions.scrollRandomly();

    // Save as draft
    if (saveAsDraft) {
      const saved = await this.saveAsDraft(autoConfirm);
      if (!saved) {
        logger.info('Draft save skipped - ad creation process completed');
        return;
      }
    }

    logger.info('Ad creation completed successfully');
  }
}

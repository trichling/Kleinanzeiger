/**
 * IPC handlers for automation
 */

import { ipcMain, BrowserWindow } from 'electron';
import { chromium } from 'playwright';
import { spawn, ChildProcess } from 'child_process';
import { platform } from 'os';
import { createLogger } from '../../../utils/logger.js';
import { BrowserController } from '../../../automation/browser.js';
import { KleinanzeigenAutomator } from '../../../automation/kleinanzeigen.js';
import type { AdContent } from '../../../vision/models.js';

const logger = createLogger('AutomationHandlers');

let braveProcess: ChildProcess | null = null;
const CDP_URL = 'http://localhost:9222';

/**
 * Register automation IPC handlers
 */
export function registerAutomationHandlers(mainWindow: BrowserWindow): void {
    console.log('========= REGISTERING AUTOMATION HANDLERS =========');
    logger.info('Registering automation IPC handlers');

    // Check if browser is connected
    ipcMain.handle('automation:checkBrowser', async () => {
        logger.info('Checking browser connection to ' + CDP_URL);
        try {
            const browser = await chromium.connectOverCDP(CDP_URL);
            await browser.close();
            logger.info('Browser connected successfully');
            return { connected: true };
        } catch (error) {
            logger.info('Browser not connected: ' + error.message);
            return { connected: false };
        }
    });

    // Start Brave with CDP
    ipcMain.handle('automation:startBrave', async () => {
        try {
            logger.info('Starting Brave browser with CDP');

            const os = platform();
            let bravePath: string;
            let args: string[];

            if (os === 'darwin') {
                // macOS
                bravePath = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
                args = [`--remote-debugging-port=9222`, '--new-window'];
            } else if (os === 'win32') {
                // Windows
                bravePath = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
                args = [`--remote-debugging-port=9222`, '--new-window'];
            } else {
                // Linux
                bravePath = '/usr/bin/brave-browser';
                args = [`--remote-debugging-port=9222`, '--new-window'];
            }

            braveProcess = spawn(bravePath, args, {
                detached: true,
                stdio: 'ignore'
            });

            braveProcess.unref();

            logger.info('Brave started successfully');
            return { success: true };
        } catch (error) {
            logger.error(`Failed to start Brave: ${error}`);
            return { success: false, error: String(error) };
        }
    });

    // Automate ad creation
    ipcMain.handle('automation:createAd', async (_event, adContent: AdContent, imagePaths: string[], draftMode: boolean = true) => {
        let browserController: BrowserController | null = null;

        try {
            logger.info('Starting ad creation automation');
            logger.info('='.repeat(80));
            sendProgress(mainWindow, 'Starting automation...', 'info');

            // Step 1: Connect to browser
            sendProgress(mainWindow, 'Connecting to browser...', 'info');
            browserController = new BrowserController({
                cdpUrl: CDP_URL,
                headless: false,
                timeout: 30000,
                screenshotOnError: true
            });

            const page = await browserController.connect();
            sendProgress(mainWindow, 'Connected to browser successfully', 'success');

            // Step 2: Create automator and create ad
            logger.info('Creating ad on kleinanzeigen.de...');
            sendProgress(mainWindow, 'Creating ad on kleinanzeigen.de...', 'info');

            const automator = new KleinanzeigenAutomator(page);

            // Send key progress updates (createAd method logs these steps internally)
            const progressInterval = setInterval(() => {
                // The logger will continue to log to console
                // We send periodic "still working" updates
            }, 5000);

            try {
                sendProgress(mainWindow, 'Navigating to ad creation form...', 'info');

                // Create ad using the main createAd method (same as CLI)
                // The method will: navigate, fill form, upload images, save draft
                await automator.createAd(
                    adContent,
                    imagePaths,
                    draftMode,
                    true
                );

                sendProgress(mainWindow, 'Ad created successfully!', 'success');
            } finally {
                clearInterval(progressInterval);
            }
            logger.info('='.repeat(80));
            logger.info('SUCCESS! Ad created successfully');
            logger.info('='.repeat(80));

            return { success: true, adUrl: page.url() };

        } catch (error) {
            logger.error(`Error during automation: ${error}`);
            sendProgress(mainWindow, `Error: ${error}`, 'error');

            if (browserController) {
                // Take error screenshot
                try {
                    await browserController.handleError(error as Error, 'logs/screenshots');
                    sendProgress(mainWindow, 'Error screenshot saved to logs/screenshots', 'warning');
                } catch (screenshotError) {
                    logger.error(`Failed to take error screenshot: ${screenshotError}`);
                }
            }

            return { success: false, error: String(error) };
        } finally {
            // Note: Don't close browser in UI mode - keep it open for user to see result
            // User can close Brave manually when done
            if (browserController) {
                logger.info('Keeping browser open for user review');
                sendProgress(mainWindow, 'Browser kept open - you can review the ad', 'info');
            }
        }
    });

    logger.info('Automation handlers registered');
}

/**
 * Send progress update to renderer
 */
function sendProgress(mainWindow: BrowserWindow, message: string, level: string): void {
    logger.info(`[${level}] ${message}`);
    mainWindow.webContents.send('automation:progress', message, level);
}

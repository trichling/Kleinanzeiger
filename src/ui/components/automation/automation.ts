/**
 * Automation component logic
 * Manages browser connection and ad posting automation
 */

import type { AdContent } from '../../../vision/models.js';

let currentAdContent: AdContent | null = null;
let currentImagePaths: string[] = [];
let isConnected = false;

/**
 * Setup automation component
 */
export function setupAutomationPanel(
    onBack: () => void,
    onCreateAd: (adContent: AdContent, imagePaths: string[]) => void
): void {
    const container = document.querySelector('.automation-container');

    // Use event delegation
    container?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const button = target.closest('button');

        if (!button) return;

        if (button.id === 'backFromAutomationButton') {
            onBack();
        }

        if (button.id === 'startBraveButton') {
            handleStartBrave();
        }

        if (button.id === 'refreshStatusButton') {
            handleRefreshStatus();
        }

        if (button.id === 'clearLogButton') {
            clearLog();
        }

        if (button.id === 'createAdButton') {
            if (currentAdContent && currentImagePaths.length > 0) {
                handleCreateAd(onCreateAd);
            }
        }
    });
}

/**
 * Display ad content and prepare for automation
 */
export function prepareAutomation(adContent: AdContent, imagePaths: string[]): void {
    currentAdContent = adContent;
    currentImagePaths = imagePaths;

    // Update summary
    const summaryTitle = document.getElementById('summaryTitle');
    const summaryPrice = document.getElementById('summaryPrice');
    const summaryCategory = document.getElementById('summaryCategory');
    const summaryImages = document.getElementById('summaryImages');

    if (summaryTitle) summaryTitle.textContent = adContent.title;
    if (summaryPrice) summaryPrice.textContent = `€${adContent.price.toFixed(2)}`;
    if (summaryCategory) summaryCategory.textContent = adContent.category || 'Not specified';
    if (summaryImages) summaryImages.textContent = `${imagePaths.length} images`;

    addLog('info', 'Ad content loaded, ready for automation');

    // Auto-check browser status when page opens (small delay to ensure DOM is ready)
    setTimeout(() => checkBrowserStatus(), 100);
}

/**
 * Check if browser is running with CDP enabled
 */
async function checkBrowserStatus(): Promise<void> {
    updateBrowserStatus('checking', 'Checking browser...');

    try {
        // Debug: Check what's available
        console.log('window.electronAPI:', (window as any).electronAPI);
        console.log('electronAPI keys:', (window as any).electronAPI ? Object.keys((window as any).electronAPI) : 'undefined');

        // Check if electronAPI is available
        if (!(window as any).electronAPI?.checkBrowserConnection) {
            console.error('electronAPI.checkBrowserConnection not available');
            addLog('error', 'Browser connection check not available. Please restart the app.');
            handleBrowserDisconnected();
            return;
        }

        // Call IPC to check browser connection
        console.log('Calling checkBrowserConnection...');
        const result = await (window as any).electronAPI.checkBrowserConnection();
        console.log('checkBrowserConnection result:', result);

        if (result.connected) {
            handleBrowserConnected();
        } else {
            handleBrowserDisconnected();
        }
    } catch (error) {
        console.error('Error checking browser status:', error);
        handleBrowserDisconnected();
    }
}

/**
 * Handle browser connected state
 */
function handleBrowserConnected(): void {
    isConnected = true;
    updateBrowserStatus('connected', 'Browser Connected');

    // Hide step 1 content (keep status visible), show step 2
    document.getElementById('step1Content')?.classList.add('hidden');
    document.getElementById('step2Card')?.classList.remove('hidden');

    addLog('success', 'Browser connected successfully - ready to create ad');
}

/**
 * Handle browser disconnected state
 */
function handleBrowserDisconnected(): void {
    isConnected = false;
    updateBrowserStatus('disconnected', 'Browser Not Connected');

    // Show step 1 content, hide step 2
    document.getElementById('step1Content')?.classList.remove('hidden');
    document.getElementById('step2Card')?.classList.add('hidden');

    addLog('warning', 'Browser not connected. Please start Brave with CDP enabled.');
}

/**
 * Update browser status indicator
 */
function updateBrowserStatus(status: 'connected' | 'disconnected' | 'checking', text: string): void {
    const statusText = document.getElementById('statusText');
    const statusIcon = document.getElementById('statusIconContent');
    const statusCard = document.querySelector('.status-card');

    if (statusText) {
        statusText.textContent = text;
    }

    if (statusIcon) {
        if (status === 'connected') {
            statusIcon.textContent = '✓';
            statusCard?.classList.add('status-connected');
            statusCard?.classList.remove('status-disconnected', 'status-checking');
        } else if (status === 'disconnected') {
            statusIcon.textContent = '✕';
            statusCard?.classList.add('status-disconnected');
            statusCard?.classList.remove('status-connected', 'status-checking');
        } else {
            statusIcon.textContent = '⏳';
            statusCard?.classList.add('status-checking');
            statusCard?.classList.remove('status-connected', 'status-disconnected');
        }
    }
}

/**
 * Start Brave browser with CDP
 */
async function handleStartBrave(): Promise<void> {
    addLog('info', 'Starting Brave browser with CDP enabled...');

    try {
        const result = await (window as any).electronAPI.startBrave();

        if (result.success) {
            addLog('success', 'Brave started successfully');
            addLog('info', 'Checking browser connection...');
            // Wait a moment for browser to fully start, then auto-check
            setTimeout(() => checkBrowserStatus(), 2000);
        } else {
            addLog('error', `Failed to start Brave: ${result.error}`);
        }
    } catch (error) {
        addLog('error', `Error starting Brave: ${error}`);
    }
}

/**
 * Refresh browser status
 */
async function handleRefreshStatus(): Promise<void> {
    addLog('info', 'Refreshing browser status...');
    await checkBrowserStatus();
}

/**
 * Handle create ad automation
 */
async function handleCreateAd(onCreateAd: (adContent: AdContent, imagePaths: string[]) => void): Promise<void> {
    if (!currentAdContent || currentImagePaths.length === 0) {
        addLog('error', 'No ad content or images available');
        return;
    }

    if (!isConnected) {
        addLog('error', 'Browser not connected. Please start Brave first.');
        return;
    }

    // Disable button during automation
    const createButton = document.getElementById('createAdButton') as HTMLButtonElement;
    if (createButton) {
        createButton.disabled = true;
        createButton.textContent = 'Creating Ad...';
    }

    addLog('info', 'Starting ad creation automation...');

    try {
        // Call IPC to start automation with image paths directly (like CLI)
        // Draft mode = true (creates draft, doesn't publish immediately)
        const result = await (window as any).electronAPI.automateAdCreation(
            currentAdContent,
            currentImagePaths,
            true // draftMode
        );

        if (result.success) {
            addLog('success', 'Ad created successfully!');
            addLog('info', `Current page: ${result.adUrl || 'N/A'}`);
            addLog('info', 'Browser kept open - you can review the ad');

            // Call the callback
            onCreateAd(currentAdContent, currentImagePaths);
        } else {
            addLog('error', `Ad creation failed: ${result.error}`);
        }
    } catch (error) {
        addLog('error', `Automation error: ${error}`);
    } finally {
        // Re-enable button
        if (createButton) {
            createButton.disabled = false;
            createButton.textContent = 'Create Ad';
        }
    }
}

/**
 * Add log entry
 */
function addLog(level: 'info' | 'success' | 'warning' | 'error', message: string): void {
    const logContent = document.getElementById('logContent');
    if (!logContent) return;

    const entry = document.createElement('div');
    entry.className = `log-entry log-${level}`;

    const time = document.createElement('span');
    time.className = 'log-time';
    time.textContent = new Date().toLocaleTimeString();

    const msg = document.createElement('span');
    msg.className = 'log-message';
    msg.textContent = message;

    entry.appendChild(time);
    entry.appendChild(msg);

    logContent.appendChild(entry);

    // Auto-scroll to bottom
    logContent.scrollTop = logContent.scrollHeight;
}

/**
 * Clear log
 */
function clearLog(): void {
    const logContent = document.getElementById('logContent');
    if (logContent) {
        logContent.innerHTML = '<div class="log-entry log-info"><span class="log-time">Ready</span><span class="log-message">Log cleared</span></div>';
    }
}

/**
 * Listen for automation progress events
 */
export function setupAutomationProgressListener(): void {
    if ((window as any).electronAPI?.onAutomationProgress) {
        (window as any).electronAPI.onAutomationProgress((message: string, level: string) => {
            addLog(level as any, message);
        });
    }
}

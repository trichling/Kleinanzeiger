/**
 * Main screen module
 * Handles main screen functionality
 */

// Setup main screen event listeners
export function setupMainScreen(
    onSettingsClick: () => void,
    onCreateAdClick: () => void,
    onShowImageSelector?: () => void,
    onShowVision?: () => void,
    onShowAdContent?: () => void,
    onShowAutomation?: () => void
): void {
    const container = document.getElementById('mainScreen');

    // Use event delegation for all buttons
    container?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const button = target.closest('button');

        if (!button) return;

        // Main action buttons
        if (button.id === 'settingsButton') {
            onSettingsClick();
        } else if (button.id === 'createAdButton') {
            onCreateAdClick();
        }
        // Quick action buttons - navigate directly to each screen
        else if (button.id === 'quickActionImages') {
            onShowImageSelector?.();
        } else if (button.id === 'quickActionAnalyze') {
            onShowVision?.();
        } else if (button.id === 'quickActionAdContent') {
            onShowAdContent?.();
        } else if (button.id === 'quickActionAutomate') {
            onShowAutomation?.();
        }
    });
}

// Show success message on main screen
export function showStatusMessage(message: string, duration: number = 3000): void {
    const statusText = document.querySelector('.status-text');
    if (!statusText) return;

    const originalText = statusText.textContent;
    const isSuccess = message.includes('✓');

    statusText.textContent = message;
    statusText.parentElement?.style.setProperty(
        'border-left-color',
        isSuccess ? '#10b981' : '#3b82f6'
    );

    if (duration > 0) {
        setTimeout(() => {
            statusText.textContent = originalText || 'Ready to create ads';
            statusText.parentElement?.style.setProperty('border-left-color', '#3b82f6');
        }, duration);
    }
}

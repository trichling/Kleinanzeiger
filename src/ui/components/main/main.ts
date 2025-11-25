/**
 * Main screen module
 * Handles main screen functionality
 */

// Setup main screen event listeners
export function setupMainScreen(
    onSettingsClick: () => void,
    onCreateAdClick: () => void
): void {
    const settingsButton = document.getElementById('settingsButton');
    const createAdButton = document.getElementById('createAdButton');

    settingsButton?.addEventListener('click', onSettingsClick);
    createAdButton?.addEventListener('click', onCreateAdClick);
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

/**
 * Settings management module
 * Handles all settings-related functionality using unified settings models
 */

import { AppSettings } from '../../../settings/models.js';
import { loadSettingsFromStorage, saveSettingsToStorage } from '../../../settings/browser.js';

/**
 * UI-specific settings that extend AppSettings with authentication
 * These are kept separate for security reasons
 */
export interface UISettings {
    username: string;
    password: string;
}

const AUTH_STORAGE_KEY = 'kleinanzeiger-auth';

const DEFAULT_AUTH: UISettings = {
    username: '',
    password: '',
};

// Load auth credentials from localStorage
function loadAuth(): UISettings {
    try {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        return saved ? JSON.parse(saved) : DEFAULT_AUTH;
    } catch (error) {
        console.error('Error loading auth:', error);
        return DEFAULT_AUTH;
    }
}

// Save auth credentials to localStorage
function saveAuth(auth: UISettings): void {
    try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
    } catch (error) {
        console.error('Error saving auth:', error);
        throw error;
    }
}

// Load app settings from localStorage
export function loadSettings(): AppSettings {
    return loadSettingsFromStorage();
}

// Save app settings to localStorage
export function saveSettings(settings: AppSettings): void {
    saveSettingsToStorage(settings);
}

// Populate form with saved settings
export function populateSettingsForm(): void {
    const settings = loadSettings();
    const auth = loadAuth();

    // Vision settings
    (document.getElementById('visionBackend') as HTMLSelectElement).value = settings.vision.backend;

    // Get API key from the selected backend
    const backend = settings.vision.backend;
    const apiKey = settings.vision[backend as keyof typeof settings.vision] as any;
    (document.getElementById('apiKey') as HTMLInputElement).value = apiKey?.apiKey || '';

    // Auth
    (document.getElementById('username') as HTMLInputElement).value = auth.username;
    (document.getElementById('password') as HTMLInputElement).value = auth.password;

    // Browser settings
    const browserPath = settings.browser.cdpUrl === 'http://localhost:9222' ? '' : settings.browser.cdpUrl;
    (document.getElementById('browserPath') as HTMLInputElement).value = browserPath;
    (document.getElementById('headless') as HTMLSelectElement).value = settings.browser.headless ? 'true' : 'false';

    // Defaults (these would need to be added to AppSettings or handled separately)
    (document.getElementById('defaultCategory') as HTMLSelectElement).value = '';
    (document.getElementById('defaultShipping') as HTMLSelectElement).value = settings.kleinanzeigen.shippingType.toLowerCase();
}

// Get settings from form and update AppSettings
export function getSettingsFromForm(): { settings: AppSettings; auth: UISettings } {
    const currentSettings = loadSettings();
    const visionBackend = (document.getElementById('visionBackend') as HTMLSelectElement).value;
    const apiKey = (document.getElementById('apiKey') as HTMLInputElement).value;

    // Update the API key for the selected backend
    const visionSettings = { ...currentSettings.vision };
    visionSettings.backend = visionBackend;

    // Update the backend config with the new API key
    if (visionBackend in visionSettings) {
        const backendConfig = visionSettings[visionBackend as keyof typeof visionSettings] as any;
        if (backendConfig && typeof backendConfig === 'object') {
            backendConfig.apiKey = apiKey;
        }
    }

    const browserPath = (document.getElementById('browserPath') as HTMLInputElement).value;
    const headless = (document.getElementById('headless') as HTMLSelectElement).value === 'true';
    const shippingType = (document.getElementById('defaultShipping') as HTMLSelectElement).value.toUpperCase();

    const settings: AppSettings = {
        ...currentSettings,
        vision: visionSettings,
        browser: {
            ...currentSettings.browser,
            cdpUrl: browserPath || 'http://localhost:9222',
            headless,
        },
        kleinanzeigen: {
            ...currentSettings.kleinanzeigen,
            shippingType,
        },
    };

    const auth: UISettings = {
        username: (document.getElementById('username') as HTMLInputElement).value,
        password: (document.getElementById('password') as HTMLInputElement).value,
    };

    return { settings, auth };
}

// Setup settings panel event listeners
export function setupSettingsPanel(
    onBack: () => void,
    onSave: () => void
): void {
    const backButton = document.getElementById('backButton');
    const saveSettingsButton = document.getElementById('saveSettingsButton');

    backButton?.addEventListener('click', onBack);

    saveSettingsButton?.addEventListener('click', () => {
        try {
            const { settings, auth } = getSettingsFromForm();
            saveSettings(settings);
            saveAuth(auth);
            console.log('Settings saved successfully');
            onSave();
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    });

    // Load and populate settings
    populateSettingsForm();
}

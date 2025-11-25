/**
 * Settings management module
 * Handles all settings-related functionality
 */

export interface Settings {
    visionBackend: string;
    apiKey: string;
    username: string;
    password: string;
    browserPath: string;
    headless: string;
    defaultCategory: string;
    defaultShipping: string;
}

const STORAGE_KEY = 'kleinanzeiger-settings';

const DEFAULT_SETTINGS: Settings = {
    visionBackend: 'openai',
    apiKey: '',
    username: '',
    password: '',
    browserPath: '',
    headless: 'false',
    defaultCategory: '',
    defaultShipping: 'pickup',
};

// Load settings from localStorage
export function loadSettings(): Settings {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch (error) {
        console.error('Error loading settings:', error);
        return DEFAULT_SETTINGS;
    }
}

// Save settings to localStorage
export function saveSettings(settings: Settings): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        console.log('Settings saved successfully');
    } catch (error) {
        console.error('Error saving settings:', error);
        throw error;
    }
}

// Populate form with saved settings
export function populateSettingsForm(settings: Settings): void {
    (document.getElementById('visionBackend') as HTMLSelectElement).value = settings.visionBackend;
    (document.getElementById('apiKey') as HTMLInputElement).value = settings.apiKey;
    (document.getElementById('username') as HTMLInputElement).value = settings.username;
    (document.getElementById('password') as HTMLInputElement).value = settings.password;
    (document.getElementById('browserPath') as HTMLInputElement).value = settings.browserPath;
    (document.getElementById('headless') as HTMLSelectElement).value = settings.headless;
    (document.getElementById('defaultCategory') as HTMLSelectElement).value = settings.defaultCategory;
    (document.getElementById('defaultShipping') as HTMLSelectElement).value = settings.defaultShipping;
}

// Get settings from form
export function getSettingsFromForm(): Settings {
    return {
        visionBackend: (document.getElementById('visionBackend') as HTMLSelectElement).value,
        apiKey: (document.getElementById('apiKey') as HTMLInputElement).value,
        username: (document.getElementById('username') as HTMLInputElement).value,
        password: (document.getElementById('password') as HTMLInputElement).value,
        browserPath: (document.getElementById('browserPath') as HTMLInputElement).value,
        headless: (document.getElementById('headless') as HTMLSelectElement).value,
        defaultCategory: (document.getElementById('defaultCategory') as HTMLSelectElement).value,
        defaultShipping: (document.getElementById('defaultShipping') as HTMLSelectElement).value,
    };
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
            const newSettings = getSettingsFromForm();
            saveSettings(newSettings);
            onSave();
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    });

    // Load and populate settings
    const settings = loadSettings();
    populateSettingsForm(settings);
}

/**
 * Browser-safe settings loader for Electron renderer process
 * This module only uses localStorage and doesn't import Node.js modules like 'fs'
 */

import { AppSettings, AppSettingsSchema, DEFAULT_SETTINGS } from './models.js';

/**
 * Storage key for localStorage
 */
const STORAGE_KEY = 'kleinanzeiger-settings';

/**
 * Load settings from localStorage (Electron renderer usage)
 */
export function loadSettingsFromStorage(): AppSettings {
    if (typeof localStorage === 'undefined') {
        throw new TypeError('localStorage is not available. Use loadSettingsFromFile for CLI.');
    }

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            const merged = mergeWithDefaults(parsed, DEFAULT_SETTINGS);
            return AppSettingsSchema.parse(merged);
        }
    } catch (error) {
        console.error('Error loading settings from localStorage:', error);
    }

    return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage (Electron renderer usage)
 */
export function saveSettingsToStorage(settings: AppSettings): void {
    if (typeof localStorage === 'undefined') {
        throw new TypeError('localStorage is not available. Use saveSettingsToFile for CLI.');
    }

    try {
        const validated = AppSettingsSchema.parse(settings);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
    } catch (error) {
        console.error('Error saving settings to localStorage:', error);
        throw error;
    }
}

/**
 * Deep merge two objects, with source overriding defaults
 */
function mergeWithDefaults(source: any, defaults: any): any {
    const result: any = { ...defaults };

    for (const key in source) {
        if (source[key] === null || source[key] === undefined) {
            continue;
        }

        if (
            typeof source[key] === 'object' &&
            !Array.isArray(source[key]) &&
            typeof defaults[key] === 'object' &&
            !Array.isArray(defaults[key])
        ) {
            result[key] = mergeWithDefaults(source[key], defaults[key]);
        } else {
            result[key] = source[key];
        }
    }

    return result;
}

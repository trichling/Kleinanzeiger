/**
 * Settings loader for both CLI (file-based) and Electron (localStorage-based)
 */

import fs from 'fs';
import YAML from 'yaml';
import { AppSettings, AppSettingsSchema, DEFAULT_SETTINGS } from './models.js';

/**
 * Load settings from YAML file (CLI usage)
 * Supports environment variable expansion ${ENV_VAR}
 */
export function loadSettingsFromFile(configPath: string): AppSettings {
  const fileContents = fs.readFileSync(configPath, 'utf8');
  const rawConfig: any = YAML.parse(fileContents);

  // Expand environment variables
  const expandEnvVar = (value: any): any => {
    if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
      const envVar = value.slice(2, -1);
      const envValue = process.env[envVar];
      return envValue || null;
    }
    return value;
  };

  // Convert snake_case keys to camelCase for TypeScript
  const snakeToCamel = (str: string): string => {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  };

  const convertKeys = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(convertKeys);
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = snakeToCamel(key);
      result[camelKey] = convertKeys(value);
    }
    return result;
  };

  // Convert structure from YAML to TypeScript format
  let config = convertKeys(rawConfig);

  // Expand environment variables in vision backend API keys
  if (config.vision) {
    const selectedBackend = config.vision.backend || 'gemini';

    for (const backend of ['claude', 'openai', 'gemini']) {
      if (config.vision[backend]?.apiKey) {
        const originalValue = rawConfig.vision[backend]?.api_key;
        const expanded = expandEnvVar(originalValue);

        config.vision[backend].apiKey = expanded;

        // Only raise error if this is the selected backend and key is missing
        if (backend === selectedBackend && !expanded) {
          const envVarName =
            typeof originalValue === 'string' && originalValue.startsWith('${')
              ? originalValue.slice(2, -1)
              : originalValue;
          throw new Error(
            `Environment variable '${envVarName}' for vision backend not set.\n` +
            `Please add '${envVarName}=your-key' to your .env file,\n` +
            `or choose a different backend in config/settings.yaml`
          );
        }
      }
    }
  }

  // Expand environment variables in anthropic settings
  if (config.anthropic?.apiKey) {
    const originalValue = rawConfig.anthropic?.api_key;
    config.anthropic.apiKey = expandEnvVar(originalValue);
  }

  // Merge with defaults and validate
  const mergedConfig = mergeWithDefaults(config, DEFAULT_SETTINGS);
  return AppSettingsSchema.parse(mergedConfig);
}

/**
 * Save settings to YAML file (CLI usage)
 */
export function saveSettingsToFile(configPath: string, settings: AppSettings): void {
  // Convert camelCase to snake_case for YAML
  const camelToSnake = (str: string): string => {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  };

  const convertKeys = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(convertKeys);
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = camelToSnake(key);
      result[snakeKey] = convertKeys(value);
    }
    return result;
  };

  const yamlConfig = convertKeys(settings);
  const yamlStr = YAML.stringify(yamlConfig);
  fs.writeFileSync(configPath, yamlStr, 'utf8');
}

/**
 * Storage key for localStorage
 */
const STORAGE_KEY = 'kleinanzeiger-settings';

/**
 * Load settings from localStorage (Electron usage)
 */
export function loadSettingsFromStorage(): AppSettings {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available. Use loadSettingsFromFile for CLI.');
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
 * Save settings to localStorage (Electron usage)
 */
export function saveSettingsToStorage(settings: AppSettings): void {
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available. Use saveSettingsToFile for CLI.');
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

/**
 * Load settings automatically based on environment
 * - In Node.js with file path: loads from file
 * - In browser/renderer: loads from localStorage
 */
export function loadSettings(configPath?: string): AppSettings {
  if (configPath) {
    return loadSettingsFromFile(configPath);
  }

  if (typeof localStorage !== 'undefined') {
    return loadSettingsFromStorage();
  }

  throw new Error('Cannot load settings: no config path provided and localStorage not available');
}

/**
 * Save settings automatically based on environment
 */
export function saveSettings(settings: AppSettings, configPath?: string): void {
  if (configPath) {
    saveSettingsToFile(configPath, settings);
  } else if (typeof localStorage !== 'undefined') {
    saveSettingsToStorage(settings);
  } else {
    throw new Error('Cannot save settings: no config path provided and localStorage not available');
  }
}

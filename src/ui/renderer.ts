/**
 * Renderer process for Kleinanzeiger Electron UI
 * Main coordination logic - delegates to component modules
 */

import { loadAndRenderComponent } from './components';
import { setupMainScreen, showStatusMessage } from './components/main';
import { setupSettingsPanel } from './components/settings';

console.log('Kleinanzeiger renderer process loaded');

// Navigation between screens
function showMainScreen(): void {
  const mainScreen = document.getElementById('mainScreen');
  const settingsPanel = document.getElementById('settingsPanel');

  settingsPanel?.classList.remove('active');
  mainScreen?.classList.add('active');
}

function showSettingsScreen(): void {
  const mainScreen = document.getElementById('mainScreen');
  const settingsPanel = document.getElementById('settingsPanel');

  mainScreen?.classList.remove('active');
  settingsPanel?.classList.add('active');
}

// Event handlers
function handleSettingsClick(): void {
  showSettingsScreen();
}

function handleCreateAdClick(): void {
  showStatusMessage('Ad creation feature coming soon...');
}

function handleBackFromSettings(): void {
  showMainScreen();
}

function handleSettingsSaved(): void {
  showStatusMessage('✓ Settings saved successfully!');
  showMainScreen();
}

// Initialize app
async function init(): Promise<void> {
  try {
    // Load components
    await loadAndRenderComponent('mainScreen', '/components/main.html');
    await loadAndRenderComponent('settingsPanel', '/components/settings.html');

    // Setup component event listeners
    setupMainScreen(handleSettingsClick, handleCreateAdClick);
    setupSettingsPanel(handleBackFromSettings, handleSettingsSaved);

    console.log('App initialized successfully');
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
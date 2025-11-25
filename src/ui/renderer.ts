/**
 * Renderer process for Kleinanzeiger Electron UI
 * Main coordination logic - delegates to component modules
 */

import { loadAndRenderComponent } from './components';
import { setupMainScreen, showStatusMessage } from './components/main';
import { setupSettingsPanel } from './components/settings';
import { setupImageSelector, resetImageSelector, type ImageInfo } from './components/imageSelector';

console.log('Kleinanzeiger renderer process loaded');

// Navigation between screens
function showMainScreen(): void {
  const mainScreen = document.getElementById('mainScreen');
  const settingsPanel = document.getElementById('settingsPanel');
  const imageSelectorPanel = document.getElementById('imageSelectorPanel');

  settingsPanel?.classList.remove('active');
  imageSelectorPanel?.classList.remove('active');
  mainScreen?.classList.add('active');
}

function showSettingsScreen(): void {
  const mainScreen = document.getElementById('mainScreen');
  const settingsPanel = document.getElementById('settingsPanel');
  const imageSelectorPanel = document.getElementById('imageSelectorPanel');

  mainScreen?.classList.remove('active');
  imageSelectorPanel?.classList.remove('active');
  settingsPanel?.classList.add('active');
}

function showImageSelectorScreen(): void {
  const mainScreen = document.getElementById('mainScreen');
  const settingsPanel = document.getElementById('settingsPanel');
  const imageSelectorPanel = document.getElementById('imageSelectorPanel');

  mainScreen?.classList.remove('active');
  settingsPanel?.classList.remove('active');
  imageSelectorPanel?.classList.add('active');

  // Reset image selector state when showing
  resetImageSelector();
}

// Event handlers
function handleSettingsClick(): void {
  showSettingsScreen();
}

function handleCreateAdClick(): void {
  showImageSelectorScreen();
}

function handleBackFromSettings(): void {
  showMainScreen();
}

function handleSettingsSaved(): void {
  showStatusMessage('✓ Settings saved successfully!');
  showMainScreen();
}

function handleBackFromImageSelector(): void {
  showMainScreen();
}

function handleAnalyzeImages(folderPath: string, images: ImageInfo[]): void {
  console.log('Analyzing images from:', folderPath);
  console.log('Images:', images);
  showMainScreen();
  showStatusMessage(`Starting analysis of ${images.length} images...`);
  // TODO: Call backend to analyze images
}

// Initialize app
async function init(): Promise<void> {
  try {
    // Load components
    await loadAndRenderComponent('mainScreen', '/components/main.html');
    await loadAndRenderComponent('settingsPanel', '/components/settings.html');
    await loadAndRenderComponent('imageSelectorPanel', '/components/imageSelector.html');

    // Setup component event listeners
    setupMainScreen(handleSettingsClick, handleCreateAdClick);
    setupSettingsPanel(handleBackFromSettings, handleSettingsSaved);
    setupImageSelector(handleBackFromImageSelector, handleAnalyzeImages);

    // Show main screen by default
    showMainScreen();

    console.log('App initialized successfully');
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
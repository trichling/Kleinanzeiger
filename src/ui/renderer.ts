/**
 * Renderer process for Kleinanzeiger Electron UI
 * Main coordination logic - delegates to component modules
 */

import { loadAndRenderComponent } from './components';
import { setupMainScreen, showStatusMessage } from './components/main/main.js';
import { setupSettingsPanel } from './components/settings/settings.js';
import { setupImageSelector, resetImageSelector, type ImageInfo } from './components/imageSelector/imageSelector.js';
import { setupVisionAnalysis, startAnalysis, resetVisionAnalysis, type ProductInfo } from './components/vision/vision.js';

console.log('Kleinanzeiger renderer process loaded');

// Navigation between screens
function showMainScreen(): void {
  const mainScreen = document.getElementById('mainScreen');
  const settingsPanel = document.getElementById('settingsPanel');
  const imageSelectorPanel = document.getElementById('imageSelectorPanel');
  const visionPanel = document.getElementById('visionPanel');

  settingsPanel?.classList.remove('active');
  imageSelectorPanel?.classList.remove('active');
  visionPanel?.classList.remove('active');
  mainScreen?.classList.add('active');
}

function showSettingsScreen(): void {
  const mainScreen = document.getElementById('mainScreen');
  const settingsPanel = document.getElementById('settingsPanel');
  const imageSelectorPanel = document.getElementById('imageSelectorPanel');
  const visionPanel = document.getElementById('visionPanel');

  mainScreen?.classList.remove('active');
  imageSelectorPanel?.classList.remove('active');
  visionPanel?.classList.remove('active');
  settingsPanel?.classList.add('active');
}

function showImageSelectorScreen(): void {
  const mainScreen = document.getElementById('mainScreen');
  const settingsPanel = document.getElementById('settingsPanel');
  const imageSelectorPanel = document.getElementById('imageSelectorPanel');
  const visionPanel = document.getElementById('visionPanel');

  mainScreen?.classList.remove('active');
  settingsPanel?.classList.remove('active');
  visionPanel?.classList.remove('active');
  imageSelectorPanel?.classList.add('active');

  // Reset image selector state when showing
  resetImageSelector();
}

function showVisionScreen(): void {
  const mainScreen = document.getElementById('mainScreen');
  const settingsPanel = document.getElementById('settingsPanel');
  const imageSelectorPanel = document.getElementById('imageSelectorPanel');
  const visionPanel = document.getElementById('visionPanel');

  mainScreen?.classList.remove('active');
  settingsPanel?.classList.remove('active');
  imageSelectorPanel?.classList.remove('active');
  visionPanel?.classList.add('active');

  // Reset vision state when showing
  resetVisionAnalysis();
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

async function handleAnalyzeImages(folderPath: string, images: ImageInfo[]): Promise<void> {
  console.log('Analyzing images from:', folderPath);
  console.log('Images:', images);

  // Navigate to vision screen
  showVisionScreen();

  // Start analysis
  await startAnalysis(folderPath, images);
}

function handleBackFromVision(): void {
  showImageSelectorScreen();
}

function handleCreateAd(productInfo: ProductInfo): void {
  console.log('Creating ad for:', productInfo);
  showMainScreen();
  showStatusMessage(`Ad ready: ${productInfo.name}`);
  // TODO: Navigate to ad creation/preview screen
}

// Initialize app
async function init(): Promise<void> {
  try {
    // Load components
    await loadAndRenderComponent('mainScreen', '/components/main/main.html');
    await loadAndRenderComponent('settingsPanel', '/components/settings/settings.html');
    await loadAndRenderComponent('imageSelectorPanel', '/components/imageSelector/imageSelector.html');
    await loadAndRenderComponent('visionPanel', '/components/vision/vision.html');

    // Setup component event listeners
    setupMainScreen(handleSettingsClick, handleCreateAdClick);
    setupSettingsPanel(handleBackFromSettings, handleSettingsSaved);
    setupImageSelector(handleBackFromImageSelector, handleAnalyzeImages);
    setupVisionAnalysis(handleBackFromVision, handleCreateAd);

    // Show main screen by default
    showMainScreen();

    console.log('App initialized successfully');
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
/**
 * Vision analysis component logic
 * Handles product image analysis and result display
 */

import type { ImageInfo } from '../imageSelector/imageSelector.js';

export interface ProductInfo {
    name: string;
    description: string;
    condition: string;
    category?: string;
    subcategory?: string;
    suggestedPrice?: number;
    brand?: string;
    color?: string;
    features: string[];
    imagePaths: string[];
}

let currentProductInfo: ProductInfo | null = null;
let currentFolderPath: string = '';
let currentImagePaths: string[] = [];

/**
 * Setup vision analysis component
 */
export function setupVisionAnalysis(
    onBack: () => void,
    onCreate: (productInfo: ProductInfo, imagePaths: string[]) => void
): void {
    const visionContainer = document.querySelector('.vision-container');
    const backButton = document.getElementById('backFromVisionButton');

    console.log('Vision component setup - using event delegation');

    backButton?.addEventListener('click', onBack);

    // Use event delegation on the container which is always in the DOM
    visionContainer?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;

        // Handle Create Ad button
        if (target.id === 'createAdButton') {
            console.log('Create Ad button clicked!');
            console.log('Current product info:', currentProductInfo);
            console.log('Current image paths:', currentImagePaths);

            if (currentProductInfo) {
                // Collect edited values from form
                const title = (document.getElementById('productTitle') as HTMLInputElement)?.value;
                const description = (document.getElementById('productDescription') as HTMLTextAreaElement)?.value;
                const price = Number.parseFloat((document.getElementById('productPrice') as HTMLInputElement)?.value || '0');
                const condition = (document.getElementById('productCondition') as HTMLInputElement)?.value;
                const category = (document.getElementById('productCategory') as HTMLInputElement)?.value;

                const updatedInfo: ProductInfo = {
                    ...currentProductInfo,
                    name: title,
                    description,
                    suggestedPrice: price,
                    condition,
                    category
                };

                console.log('Calling onCreate with:', updatedInfo, currentImagePaths);
                onCreate(updatedInfo, currentImagePaths);
            } else {
                console.error('No product info available');
            }
        }

        // Handle Retry button
        if (target.id === 'retryButton') {
            if (currentFolderPath) {
                startAnalysis(currentFolderPath, []);
            }
        }

        // Handle Back from Error button
        if (target.id === 'backFromErrorButton') {
            onBack();
        }

        // Handle Edit More button
        if (target.id === 'editMoreButton') {
            const inputs = document.querySelectorAll('.result-input, .result-textarea');
            for (const input of inputs) {
                (input as HTMLInputElement | HTMLTextAreaElement).removeAttribute('readonly');
            }
        }
    });

    // Character counter for title
    const titleInput = document.getElementById('productTitle') as HTMLInputElement;
    titleInput?.addEventListener('input', () => {
        updateCharCount();
    });
}

/**
 * Start vision analysis
 */
export async function startAnalysis(folderPath: string, images: ImageInfo[]): Promise<void> {
    currentFolderPath = folderPath;

    showProgress(true, 'Initializing vision analysis...');
    showResults(false);
    showError(false);

    try {
        // Load settings from localStorage using browser-safe loader
        const { loadSettingsFromStorage } = await import('../../../settings/browser.js');
        const settings = loadSettingsFromStorage();

        // Call IPC handler to analyze images with vision settings
        const result = await (window as any).electronAPI.analyzeImages(folderPath, settings.vision);

        if (!result.success) {
            throw new Error(result.error || 'Analysis failed');
        }

        currentProductInfo = result.productInfo;
        currentImagePaths = result.productInfo.imagePaths || [];
        displayResults(result.productInfo);

    } catch (error) {
        console.error('Analysis error:', error);
        displayError((error as Error).message);
    }
}

/**
 * Display analysis results
 */
function displayResults(productInfo: ProductInfo): void {
    // Populate form fields
    const titleInput = document.getElementById('productTitle') as HTMLInputElement;
    const descriptionInput = document.getElementById('productDescription') as HTMLTextAreaElement;
    const priceInput = document.getElementById('productPrice') as HTMLInputElement;
    const conditionInput = document.getElementById('productCondition') as HTMLInputElement;
    const categoryInput = document.getElementById('productCategory') as HTMLInputElement;
    const brandInput = document.getElementById('productBrand') as HTMLInputElement;
    const colorInput = document.getElementById('productColor') as HTMLInputElement;
    const featuresList = document.getElementById('productFeatures');

    if (titleInput) titleInput.value = productInfo.name;
    if (descriptionInput) descriptionInput.value = productInfo.description;
    if (priceInput) priceInput.value = (productInfo.suggestedPrice || 0).toFixed(2);
    if (conditionInput) conditionInput.value = productInfo.condition;
    if (categoryInput) categoryInput.value = productInfo.category || '';

    // Show/hide optional fields
    const brandRow = document.getElementById('brandRow');
    if (productInfo.brand && brandInput) {
        brandInput.value = productInfo.brand;
        brandRow?.style.removeProperty('display');
    } else {
        brandRow?.style.setProperty('display', 'none');
    }

    const colorRow = document.getElementById('colorRow');
    if (productInfo.color && colorInput) {
        colorInput.value = productInfo.color;
        colorRow?.style.removeProperty('display');
    } else {
        colorRow?.style.setProperty('display', 'none');
    }

    // Display features
    const featuresRow = document.getElementById('featuresRow');
    if (productInfo.features && productInfo.features.length > 0 && featuresList) {
        featuresList.innerHTML = '';
        productInfo.features.forEach(feature => {
            const li = document.createElement('li');
            li.textContent = feature;
            featuresList.appendChild(li);
        });
        featuresRow?.style.removeProperty('display');
    } else {
        featuresRow?.style.setProperty('display', 'none');
    }

    updateCharCount();

    showProgress(false);
    showResults(true);
}

/**
 * Display error message
 */
function displayError(message: string): void {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
    }

    showProgress(false);
    showResults(false);
    showError(true);
}

/**
 * Show/hide progress section
 */
function showProgress(show: boolean, status?: string): void {
    const progressSection = document.getElementById('analysisProgress');
    if (progressSection) {
        if (show) {
            progressSection.classList.remove('hidden');
            if (status) {
                const statusText = document.getElementById('analysisStatus');
                if (statusText) {
                    statusText.textContent = status;
                }
            }
        } else {
            progressSection.classList.add('hidden');
        }
    }
}

/**
 * Show/hide results section
 */
function showResults(show: boolean): void {
    const resultsSection = document.getElementById('analysisResults');
    if (resultsSection) {
        if (show) {
            resultsSection.classList.remove('hidden');
        } else {
            resultsSection.classList.add('hidden');
        }
    }
}

/**
 * Show/hide error section
 */
function showError(show: boolean): void {
    const errorSection = document.getElementById('analysisError');
    if (errorSection) {
        if (show) {
            errorSection.classList.remove('hidden');
        } else {
            errorSection.classList.add('hidden');
        }
    }
}

/**
 * Update character count for title
 */
function updateCharCount(): void {
    const titleInput = document.getElementById('productTitle') as HTMLInputElement;
    const charCount = document.getElementById('titleCharCount');

    if (titleInput && charCount) {
        charCount.textContent = titleInput.value.length.toString();
    }
}

/**
 * Reset vision analysis state
 */
export function resetVisionAnalysis(): void {
    currentProductInfo = null;
    currentFolderPath = '';

    showProgress(false);
    showResults(false);
    showError(false);
}

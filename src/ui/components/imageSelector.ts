/**
 * Image Selector component logic
 * Handles folder selection, image discovery, and HEIC conversion
 */

export interface ImageInfo {
    path: string;
    name: string;
    isConverted: boolean;
}

let selectedFolder: string = '';
let discoveredImages: ImageInfo[] = [];

/**
 * Setup image selector event listeners
 */
export function setupImageSelector(
    onBack: () => void,
    onAnalyze: (folderPath: string, images: ImageInfo[]) => void
): void {
    const backButton = document.getElementById('backToMainButton');
    const browseFolderButton = document.getElementById('browseFolderButton');
    const analyzeButton = document.getElementById('analyzeImagesButton');

    backButton?.addEventListener('click', onBack);

    browseFolderButton?.addEventListener('click', async () => {
        await selectImageFolder();
    });

    analyzeButton?.addEventListener('click', () => {
        if (selectedFolder && discoveredImages.length > 0) {
            onAnalyze(selectedFolder, discoveredImages);
        }
    });
}

/**
 * Open folder picker dialog and scan for images
 */
async function selectImageFolder(): Promise<void> {
    try {
        // Use Electron's native folder picker
        const result = await (window as any).electronAPI.openFolderDialog();

        if (result.canceled || !result.folderPath) {
            return; // User cancelled
        }

        const folderPath = result.folderPath;

        // Update UI
        const folderInput = document.getElementById('imageFolderPath') as HTMLInputElement;
        if (folderInput) {
            folderInput.value = folderPath;
        }

        selectedFolder = folderPath;

        // Scan folder for images
        await scanFolder(folderPath);

    } catch (error) {
        console.error('Error selecting folder:', error);
        showError('Failed to select folder. Please try again.');
    }
}

/**
 * Scan folder for images and convert HEIC files
 */
async function scanFolder(folderPath: string): Promise<void> {
    try {
        showConversionProgress(true, 'Scanning folder...');

        // Call main process to scan folder
        const result = await (window as any).electronAPI.scanFolder(folderPath);

        if (!result.success) {
            throw new Error(result.error || 'Failed to scan folder');
        }

        const images: ImageInfo[] = result.images;

        if (images.length === 0) {
            showError('No images found in the selected folder.');
            showConversionProgress(false);
            return;
        }

        discoveredImages = images;

        // Show images in grid
        displayImages(images);

        // Update count
        updateImageCount(images.length);

        // Enable analyze button
        const analyzeButton = document.getElementById('analyzeImagesButton') as HTMLButtonElement;
        if (analyzeButton) {
            analyzeButton.disabled = false;
        }

        showConversionProgress(false);
        showImagePreviewSection(true);

    } catch (error) {
        console.error('Error scanning folder:', error);
        showError(`Failed to scan folder: ${(error as Error).message}`);
        showConversionProgress(false);
    }
}

/**
 * Display images in the grid
 */
function displayImages(images: ImageInfo[]): void {
    const imageGrid = document.getElementById('imageGrid');
    if (!imageGrid) return;

    imageGrid.innerHTML = '';

    images.forEach((img, index) => {
        const imageCard = document.createElement('div');
        imageCard.className = 'image-card';

        const imgElement = document.createElement('img');
        imgElement.src = `file://${img.path}`;
        imgElement.alt = img.name;
        imgElement.onerror = () => {
            // Fallback for image load errors
            imgElement.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23ddd"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23999">Image</text></svg>';
        };

        const nameLabel = document.createElement('p');
        nameLabel.className = 'image-name';
        nameLabel.textContent = img.name;

        if (img.isConverted) {
            const badge = document.createElement('span');
            badge.className = 'converted-badge';
            badge.textContent = 'Converted';
            nameLabel.appendChild(badge);
        }

        imageCard.appendChild(imgElement);
        imageCard.appendChild(nameLabel);
        imageGrid.appendChild(imageCard);
    });
}

/**
 * Update image count display
 */
function updateImageCount(count: number): void {
    const imageCount = document.getElementById('imageCount');
    if (imageCount) {
        imageCount.textContent = `${count} image${count !== 1 ? 's' : ''} found`;
    }
}

/**
 * Show/hide conversion progress
 */
function showConversionProgress(show: boolean, status?: string): void {
    const progressSection = document.getElementById('conversionProgress');
    if (progressSection) {
        if (show) {
            progressSection.classList.remove('hidden');
            if (status) {
                const statusText = document.getElementById('conversionStatus');
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
 * Show/hide image preview section
 */
function showImagePreviewSection(show: boolean): void {
    const previewSection = document.getElementById('imagePreviewSection');
    if (previewSection) {
        if (show) {
            previewSection.classList.remove('hidden');
        } else {
            previewSection.classList.add('hidden');
        }
    }
}

/**
 * Show error message
 */
function showError(message: string): void {
    alert(message); // Will be replaced with better UI feedback
}

/**
 * Reset the image selector state
 */
export function resetImageSelector(): void {
    selectedFolder = '';
    discoveredImages = [];

    const folderInput = document.getElementById('imageFolderPath') as HTMLInputElement;
    if (folderInput) {
        folderInput.value = '';
    }

    const analyzeButton = document.getElementById('analyzeImagesButton') as HTMLButtonElement;
    if (analyzeButton) {
        analyzeButton.disabled = true;
    }

    showImagePreviewSection(false);
    showConversionProgress(false);
}

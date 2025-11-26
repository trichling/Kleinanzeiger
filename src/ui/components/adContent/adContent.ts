/**
 * Ad Content component logic
 * Displays generated ad content and allows publishing
 */

import type { ProductInfo } from '../../components/vision/vision.js';
import type { AdContent } from '../../../vision/models.js';

let currentProductInfo: ProductInfo | null = null;
let currentImagePaths: string[] = [];
let currentAdContent: AdContent | null = null;

/**
 * Initialize ad content component
 */
export function setupAdContentPanel(
    onBack: () => void,
    onPublish: (adContent: AdContent, imagePaths: string[]) => void
): void {
    const adContainer = document.querySelector('.ad-content-container');

    // Use event delegation for buttons
    adContainer?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;

        // Handle back button
        if (target.id === 'backToEditButton' || target.id === 'backFromAdContentButton') {
            onBack();
        }

        // Handle publish button
        if (target.id === 'publishAdButton') {
            handlePublish();
        }
    });

    function handlePublish() {
        if (!currentAdContent) return;

        // Get all edited values from the form
        const title = (document.getElementById('previewTitle') as HTMLInputElement)?.value;
        const price = Number.parseFloat((document.getElementById('previewPrice') as HTMLInputElement)?.value || '0');
        const condition = (document.getElementById('previewCondition') as HTMLInputElement)?.value;
        const category = (document.getElementById('previewCategory') as HTMLInputElement)?.value;
        const description = (document.getElementById('previewDescription') as HTMLTextAreaElement)?.value;
        const postalCode = (document.getElementById('postalCodeInput') as HTMLInputElement)?.value;
        const shippingType = (document.querySelector('input[name="shipping"]:checked') as HTMLInputElement)?.value;

        // Update current ad content with edited values
        currentAdContent.title = title;
        currentAdContent.price = price;
        currentAdContent.condition = condition;
        currentAdContent.category = category;
        currentAdContent.description = description;
        currentAdContent.postalCode = postalCode;
        currentAdContent.shippingType = shippingType;

        onPublish(currentAdContent, currentImagePaths);
    }
}

/**
 * Display ad content from product info
 */
export function displayAdContent(productInfo: ProductInfo, imagePaths: string[]): void {
    currentProductInfo = productInfo;
    currentImagePaths = imagePaths;

    // Generate ad content using the content generator logic
    currentAdContent = generateAdContent(productInfo);

    // Display in preview
    updatePreview(currentAdContent, imagePaths.length);
}

/**
 * Generate ad content from product info (mirrors src/content/generator.ts)
 */
function generateAdContent(productInfo: ProductInfo): AdContent {
    // Use title directly from vision analysis (ensure max 65 chars)
    const title = productInfo.name.slice(0, 65);

    // Format description with features
    const description = formatDescription(productInfo);

    // Use suggested price or default
    const price = productInfo.suggestedPrice || 10.0;

    // Create ad content
    return {
        title,
        description,
        price,
        category: productInfo.category || 'Sonstiges',
        subcategory: productInfo.subcategory,
        condition: productInfo.condition,
        shippingType: 'PICKUP',
        postalCode: '',
    };
}

/**
 * Format description from product info
 */
function formatDescription(productInfo: ProductInfo): string {
    const parts: string[] = [productInfo.description];

    // Add features as bullet points
    if (productInfo.features && productInfo.features.length > 0) {
        parts.push('\nMerkmale:');
        for (const feature of productInfo.features) {
            parts.push(`• ${feature}`);
        }
    }

    // Add brand
    if (productInfo.brand) {
        parts.push(`\nMarke: ${productInfo.brand}`);
    }

    // Add color
    if (productInfo.color) {
        parts.push(`Farbe: ${productInfo.color}`);
    }

    // Add pickup notice
    parts.push('\nNur Abholung möglich.');

    return parts.join('\n');
}

/**
 * Update preview display
 */
function updatePreview(adContent: AdContent, imageCount: number): void {
    // Title
    const titleEl = document.getElementById('previewTitle') as HTMLInputElement;
    if (titleEl) {
        titleEl.value = adContent.title;
        updateCharCount();
    }

    // Price
    const priceEl = document.getElementById('previewPrice') as HTMLInputElement;
    if (priceEl) priceEl.value = adContent.price.toFixed(2);

    // Condition
    const conditionEl = document.getElementById('previewCondition') as HTMLInputElement;
    if (conditionEl) conditionEl.value = adContent.condition;

    // Category
    const categoryEl = document.getElementById('previewCategory') as HTMLInputElement;
    if (categoryEl) categoryEl.value = adContent.category || 'Not specified';

    // Description
    const descriptionEl = document.getElementById('previewDescription') as HTMLTextAreaElement;
    if (descriptionEl) descriptionEl.value = adContent.description;

    // Image count
    const imageCountEl = document.getElementById('imageCount');
    if (imageCountEl) {
        imageCountEl.textContent = `${imageCount} ${imageCount === 1 ? 'image' : 'images'} selected`;
    }

    // Setup title character counter
    titleEl?.addEventListener('input', updateCharCount);

    // Set default postal code if available
    const savedSettings = localStorage.getItem('kleinanzeiger-auth');
    if (savedSettings) {
        try {
            const auth = JSON.parse(savedSettings);
            // Could store postal code in auth or settings
        } catch (e) {
            // Ignore
        }
    }
}

/**
 * Update character count for title
 */
function updateCharCount(): void {
    const titleInput = document.getElementById('previewTitle') as HTMLInputElement;
    const charCount = document.getElementById('titleCharCount');

    if (titleInput && charCount) {
        charCount.textContent = titleInput.value.length.toString();
    }
}

/**
 * Get current ad content
 */
export function getCurrentAdContent(): AdContent | null {
    return currentAdContent;
}

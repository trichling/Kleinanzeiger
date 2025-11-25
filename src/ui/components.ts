/**
 * Component loader utility
 * Loads HTML components dynamically into the page
 */

export async function loadComponent(componentPath: string): Promise<string> {
    try {
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`Failed to load component: ${componentPath}`);
        }
        return await response.text();
    } catch (error) {
        console.error('Error loading component:', error);
        throw error;
    }
}

export function renderComponent(containerId: string, html: string): void {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = html;
    } else {
        console.error(`Container not found: ${containerId}`);
    }
}

export async function loadAndRenderComponent(
    containerId: string,
    componentPath: string
): Promise<void> {
    const html = await loadComponent(componentPath);
    renderComponent(containerId, html);
}

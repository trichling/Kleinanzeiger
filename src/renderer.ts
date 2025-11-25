/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 */

console.log('Kleinanzeiger renderer process loaded');

// Add any renderer-specific logic here
// For example, event listeners for buttons, form handlers, etc.

document.addEventListener('DOMContentLoaded', () => {
  const testButton = document.getElementById('testButton');
  if (testButton) {
    testButton.addEventListener('click', () => {
      const statusText = document.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = 'Button clicked! UI is interactive.';
      }
    });
  }
});

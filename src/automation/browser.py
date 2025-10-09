"""
Browser controller for CDP-based automation.
"""

import logging
from typing import Optional
from pathlib import Path
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

from ..vision.models import BrowserConfig

logger = logging.getLogger(__name__)


class BrowserController:
    """Controls browser via Chrome DevTools Protocol (CDP)."""
    
    def __init__(self, config: Optional[BrowserConfig] = None):
        """
        Initialize the BrowserController.
        
        Args:
            config: Browser configuration
        """
        self.config = config or BrowserConfig()
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
    
    async def connect(self) -> Page:
        """
        Connect to running browser via CDP.
        
        Returns:
            Playwright page instance
        """
        logger.info(f"Connecting to browser at {self.config.cdp_url}")
        
        try:
            self.playwright = await async_playwright().start()
            
            # Connect to existing browser via CDP
            self.browser = await self.playwright.chromium.connect_over_cdp(
                self.config.cdp_url
            )
            
            # Get default context (existing browser context)
            contexts = self.browser.contexts
            if contexts:
                self.context = contexts[0]
                logger.info("Using existing browser context")
            else:
                # Create new context if none exists
                self.context = await self.browser.new_context()
                logger.info("Created new browser context")
            
            # Create new page
            self.page = await self.context.new_page()
            
            # Set timeout
            self.page.set_default_timeout(self.config.timeout)
            
            logger.info("Successfully connected to browser")
            return self.page
            
        except Exception as e:
            logger.error(f"Failed to connect to browser: {e}")
            await self.close()
            raise
    
    async def take_screenshot(self, filename: str, screenshot_dir: Path):
        """
        Take a screenshot of current page.
        
        Args:
            filename: Name of screenshot file
            screenshot_dir: Directory to save screenshot
        """
        if not self.page:
            logger.warning("No page available for screenshot")
            return
        
        screenshot_dir.mkdir(parents=True, exist_ok=True)
        screenshot_path = screenshot_dir / filename
        
        try:
            await self.page.screenshot(path=str(screenshot_path), full_page=True)
            logger.info(f"Screenshot saved: {screenshot_path}")
        except Exception as e:
            logger.error(f"Failed to take screenshot: {e}")
    
    async def handle_error(self, error: Exception, screenshot_dir: Path):
        """
        Handle error with optional screenshot.
        
        Args:
            error: The exception that occurred
            screenshot_dir: Directory to save error screenshot
        """
        logger.error(f"Error occurred: {error}")
        
        if self.config.screenshot_on_error and self.page:
            import datetime
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            await self.take_screenshot(f"error_{timestamp}.png", screenshot_dir)
    
    async def close(self):
        """Close browser connection."""
        try:
            if self.page:
                await self.page.close()
                logger.info("Page closed")
            
            # Note: We don't close context or browser as they belong to the user's session
            # if self.context:
            #     await self.context.close()
            
            # if self.browser:
            #     await self.browser.close()
            
            if self.playwright:
                await self.playwright.stop()
                logger.info("Playwright stopped")
                
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
    
    async def __aenter__(self):
        """Async context manager entry."""
        return await self.connect()
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
